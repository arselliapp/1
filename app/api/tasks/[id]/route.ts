import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createAdminClient } from "@/lib/supabase-server"
import { getNotificationsSendUrl, serializeNotificationData } from "@/app/api/notifications/utils"

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !anonKey) {
      return NextResponse.json({ error: "Supabase env vars missing" }, { status: 500 })
    }

    const supabase = createClient(url, anonKey)
    const { data: userData, error: userError } = await supabase.auth.getUser(token)
    if (userError || !userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const admin = createAdminClient()

    const { data: task, error: taskError } = await admin
      .from("tasks")
      .select("id, creator_id, is_group_task, title")
      .eq("id", params.id)
      .single()

    if (taskError) {
      return NextResponse.json({ error: taskError.message }, { status: 500 })
    }
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    // السماح بالتحكم فقط لمنشئ المهمة
    if (task.creator_id !== userData.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // جلب التعيينات لإشعار الأعضاء الآخرين
    const { data: assignments } = await admin
      .from("task_assignments")
      .select("user_id")
      .eq("task_id", params.id)

    // حذف الإكمالات والعناصر والتعيينات
    const { data: items } = await admin
      .from("task_items")
      .select("id")
      .eq("task_id", params.id)

    const itemIds = (items || []).map(i => i.id)
    if (itemIds.length > 0) {
      await admin.from("task_item_completions").delete().in("task_item_id", itemIds)
      await admin.from("task_items").delete().in("id", itemIds)
    }

    await admin.from("task_assignments").delete().eq("task_id", params.id)

    const { error: deleteError } = await admin.from("tasks").delete().eq("id", params.id)
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    // إرسال إشعار حذف لباقي الأعضاء (إن وجدوا)
    const otherMembers = (assignments || [])
      .map(a => a.user_id)
      .filter(uid => uid && uid !== userData.user.id)

    if (otherMembers.length > 0) {
      const deleteNotificationData = { taskId: params.id, type: "task_deleted" }
      console.log("[tasks/[id]/route] Creating delete notifications for members:", otherMembers.length)
      console.log("[tasks/[id]/route] Delete notification data:", deleteNotificationData)

      // حفظ إشعار في قاعدة البيانات (استخدام "system" لأن constraint يسمح فقط بـ request, message, contact, system)
      const notifications = otherMembers.map(uid => ({
        user_id: uid,
        title: "🗑️ تم حذف مهمة",
        body: `قام المنشئ بحذف المهمة: ${task.title}`,
        type: "system", // استخدام "system" بدلاً من "task_deleted" لتتوافق مع constraint
        url: "/tasks",
        data: serializeNotificationData(deleteNotificationData)
      }))

      try {
        await admin
          .from("notifications")
          .insert(notifications)
        console.log("[tasks/[id]/route] ✅ Delete notifications saved to database")
      } catch (e) {
        console.error("[tasks/[id]/route] Failed to insert delete notifications:", e)
      }

      const payload = {
        title: "🗑️ تم حذف مهمة",
        body: `قام المنشئ بحذف المهمة: ${task.title}`,
        url: "/tasks",
        data: deleteNotificationData
      }

      // استدعاء مسار الإشعارات لإرسال Push باستخدام URL مطلق
      const targetUrl = getNotificationsSendUrl(request)
      if (!targetUrl) {
        console.warn("[tasks/[id]/route] Cannot resolve site URL, skipping push notifications")
      } else {
        console.log("[tasks/[id]/route] Sending push notifications to:", targetUrl)
        await Promise.all(
          otherMembers.map(async (uid) => {
            try {
              await fetch(targetUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: uid, ...payload })
              })
              console.log("[tasks/[id]/route] ✅ Push notification sent to user:", uid)
            } catch (e) {
              console.error("[tasks/[id]/route] Failed to send delete notification for user:", uid, e)
            }
          })
        )
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Error deleting task:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

