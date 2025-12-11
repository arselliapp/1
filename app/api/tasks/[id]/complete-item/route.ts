import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createAdminClient } from "@/lib/supabase-server"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// تحديد عنصر كمكتمل
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const { data: userData, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const taskId = params.id
    const { item_id, completed } = await request.json()

    if (!item_id) {
      return NextResponse.json({ error: "item_id is required" }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // التحقق من أن المستخدم مشارك في المهمة
    const { data: assignment } = await supabase
      .from("task_assignments")
      .select("*")
      .eq("task_id", taskId)
      .eq("user_id", userData.user.id)
      .single()

    if (!assignment) {
      return NextResponse.json({ error: "Not a member of this task" }, { status: 403 })
    }

    // جلب المهمة والعنصر
    const { data: task } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .single()

    const { data: item } = await supabase
      .from("task_items")
      .select("*")
      .eq("id", item_id)
      .single()

    if (!task || !item) {
      return NextResponse.json({ error: "Task or item not found" }, { status: 404 })
    }

    if (task.is_group_task) {
      // للمهام الجماعية: إضافة/إزالة إكمال للمستخدم الحالي
      if (completed) {
        await adminClient.from("task_item_completions").upsert({
          task_item_id: item_id,
          user_id: userData.user.id
        }, { onConflict: "task_item_id,user_id" })
      } else {
        await adminClient
          .from("task_item_completions")
          .delete()
          .eq("task_item_id", item_id)
          .eq("user_id", userData.user.id)
      }

      // التحقق من اكتمال العنصر
      const { data: members } = await supabase
        .from("task_assignments")
        .select("user_id")
        .eq("task_id", taskId)

      const { data: completions } = await supabase
        .from("task_item_completions")
        .select("user_id")
        .eq("task_item_id", item_id)

      // تحديد اكتمال العنصر بناءً على نوع الإنجاز
      const completionType = task.completion_type || "all"
      let itemCompleted = false
      
      if (completionType === "any") {
        // أي شخص: يكفي شخص واحد
        itemCompleted = (completions?.length || 0) >= 1
      } else {
        // الجميع: يجب أن يكمله كل المشاركين
        itemCompleted = members?.length === completions?.length
      }

      // تحديث حالة العنصر
      if (itemCompleted) {
        await adminClient
          .from("task_items")
          .update({
            is_completed: true,
            completed_by: userData.user.id,
            completed_at: new Date().toISOString()
          })
          .eq("id", item_id)
      } else {
        await adminClient
          .from("task_items")
          .update({
            is_completed: false,
            completed_by: null,
            completed_at: null
          })
          .eq("id", item_id)
      }

      // إرسال إشعار للآخرين
      const completerName = userData.user.user_metadata?.full_name || "مستخدم"
      const otherMembers = members?.filter(m => m.user_id !== userData.user.id) || []
      
      if (completed && otherMembers.length > 0) {
        const notifications = otherMembers.map(m => ({
          user_id: m.user_id,
          title: `✅ تم إنجاز طلب`,
          body: `${completerName} أنجز: ${item.title}`,
          type: "task_update",
          url: `/tasks/${taskId}`,
          data: { taskId, itemId: item_id, realtime: true },
          is_read: false
        }))

        await adminClient.from("notifications").insert(notifications)

        // إرسال إشعار push فوري
        for (const m of otherMembers) {
          try {
            await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || ""}/api/notifications/send`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userId: m.user_id,
                title: `✅ تم إنجاز طلب`,
                body: `${completerName} أنجز: ${item.title}`,
                url: `/tasks/${taskId}`,
                data: { taskId, itemId: item_id }
              })
            })
          } catch (e) { /* تجاهل أخطاء الإشعارات */ }
        }
      }
    } else {
      // للمهام الفردية: تحديث مباشر
      await adminClient
        .from("task_items")
        .update({
          is_completed: completed,
          completed_by: completed ? userData.user.id : null,
          completed_at: completed ? new Date().toISOString() : null
        })
        .eq("id", item_id)
    }

    // التحقق من اكتمال المهمة بالكامل
    const { data: allItems } = await supabase
      .from("task_items")
      .select("*")
      .eq("task_id", taskId)

    const { data: allMembers } = await supabase
      .from("task_assignments")
      .select("user_id")
      .eq("task_id", taskId)

    let taskCompleted = false

    if (task.is_group_task) {
      // للمهام الجماعية
      const totalMembers = allMembers?.length || 0
      const completionType = task.completion_type || "all"
      let allItemsCompleted = true

      for (const i of allItems || []) {
        const { count } = await supabase
          .from("task_item_completions")
          .select("*", { count: "exact", head: true })
          .eq("task_item_id", i.id)

        if (completionType === "any") {
          // أي شخص: يكفي شخص واحد لكل عنصر
          if ((count || 0) < 1) {
            allItemsCompleted = false
            break
          }
        } else {
          // الجميع: يجب أن يكمله كل المشاركين
          if ((count || 0) < totalMembers) {
            allItemsCompleted = false
            break
          }
        }
      }

      taskCompleted = allItemsCompleted && (allItems?.length || 0) > 0
    } else {
      taskCompleted = allItems?.every(i => i.is_completed) && (allItems?.length || 0) > 0
    }

    // تحديث حالة المهمة
    if (taskCompleted && task.status !== "completed") {
      await adminClient
        .from("tasks")
        .update({
          status: "completed",
          completed_at: new Date().toISOString()
        })
        .eq("id", taskId)

      // إرسال إشعار لجميع المشاركين
      const celebrationNotifications = allMembers?.map(m => ({
        user_id: m.user_id,
        title: `🎉 مبروك! تم إنجاز المهمة`,
        body: `تم إكمال جميع طلبات مهمة: ${task.title}`,
        type: "task_completed",
        url: `/tasks/${taskId}`,
        data: { taskId, completed: true, celebration: true },
        is_read: false
      })) || []

      await adminClient.from("notifications").insert(celebrationNotifications)

      // إرسال إشعار push للجميع
      for (const m of allMembers || []) {
        try {
          await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || ""}/api/notifications/send`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: m.user_id,
              title: `🎉 مبروك! تم إنجاز المهمة`,
              body: `تم إكمال جميع طلبات مهمة: ${task.title}`,
              url: `/tasks/${taskId}`,
              data: { taskId, completed: true, celebration: true }
            })
          })
        } catch (e) { /* تجاهل أخطاء الإشعارات */ }
      }

      return NextResponse.json({ 
        success: true, 
        task_completed: true,
        message: "🎉 مبروك! تم إنجاز المهمة بنجاح"
      })
    }

    return NextResponse.json({ success: true, task_completed: false })
  } catch (err) {
    console.error("Error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

