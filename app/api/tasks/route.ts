import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createAdminClient } from "@/lib/supabase-server"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// أنواع المهام
const TASK_TYPES = {
  daily: { label: "يومية", emoji: "📅", color: "blue" },
  weekly: { label: "أسبوعية", emoji: "📆", color: "green" },
  monthly: { label: "شهرية", emoji: "🗓️", color: "purple" }
}

// جلب المهام
export async function GET(request: NextRequest) {
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

    const userId = userData.user.id
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") // daily, weekly, monthly, all
    const status = searchParams.get("status") // active, completed, all

    // جلب المهام التي المستخدم مشارك فيها
    let query = supabase
      .from("task_assignments")
      .select(`
        task_id,
        role,
        tasks (
          id,
          creator_id,
          title,
          description,
          task_type,
          is_group_task,
          completion_type,
          status,
          due_date,
          completed_at,
          created_at
        )
      `)
      .eq("user_id", userId)

    const { data: assignments, error } = await query

    if (error) {
      console.error("Error fetching tasks:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // استخراج المهام
    let tasks = assignments?.map(a => ({
      ...a.tasks,
      role: a.role,
      type_info: TASK_TYPES[(a.tasks as any)?.task_type as keyof typeof TASK_TYPES] || TASK_TYPES.daily
    })).filter(t => t.id) || []

    // فلترة حسب النوع
    if (type && type !== "all") {
      tasks = tasks.filter(t => t.task_type === type)
    }

    // فلترة حسب الحالة
    if (status && status !== "all") {
      tasks = tasks.filter(t => t.status === status)
    }

    // جلب عناصر كل مهمة والمشاركين
    const tasksWithDetails = await Promise.all(
      tasks.map(async (task) => {
        // جلب العناصر
        const { data: items } = await supabase
          .from("task_items")
          .select("*")
          .eq("task_id", task.id)
          .order("order_index", { ascending: true })

        // جلب المشاركين
        const { data: members } = await supabase
          .from("task_assignments")
          .select("user_id, role")
          .eq("task_id", task.id)

        // جلب معلومات المشاركين
        const memberIds = members?.map(m => m.user_id) || []
        const memberInfoMap: Record<string, any> = {}
        
        await Promise.all(
          memberIds.map(async (uid) => {
            const { data } = await supabase.rpc("search_user_by_id", { input_user_id: uid })
            if (data && data.length > 0) {
              memberInfoMap[uid] = data[0]
            }
          })
        )

        const membersWithInfo = members?.map(m => ({
          ...m,
          name: memberInfoMap[m.user_id]?.full_name || "مستخدم",
          avatar: memberInfoMap[m.user_id]?.avatar_url
        })) || []

        // جلب حالة إكمال العناصر
        const itemsWithCompletion = await Promise.all(
          (items || []).map(async (item) => {
            const { data: completions } = await supabase
              .from("task_item_completions")
              .select("user_id, completed_at")
              .eq("task_item_id", item.id)

            return {
              ...item,
              completions: completions || [],
              my_completion: completions?.find(c => c.user_id === userId)
            }
          })
        )

        // حساب التقدم
        const totalItems = itemsWithCompletion.length
        let completedItems = 0
        const completionType = task.completion_type || "all"
        
        if (task.is_group_task) {
          // للمهام الجماعية
          const totalMembers = membersWithInfo.length
          
          if (completionType === "any") {
            // أي شخص: يكفي شخص واحد لكل عنصر
            completedItems = itemsWithCompletion.filter(
              item => item.completions.length >= 1
            ).length
          } else {
            // الجميع: نحسب العناصر التي أكملها الجميع
            completedItems = itemsWithCompletion.filter(
              item => item.completions.length >= totalMembers
            ).length
          }
        } else {
          completedItems = itemsWithCompletion.filter(item => item.is_completed).length
        }

        const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

        return {
          ...task,
          items: itemsWithCompletion,
          members: membersWithInfo,
          progress,
          total_items: totalItems,
          completed_items: completedItems
        }
      })
    )

    // تصنيف المهام
    const active = tasksWithDetails.filter(t => t.status === "active")
    const completed = tasksWithDetails.filter(t => t.status === "completed")

    return NextResponse.json({
      tasks: tasksWithDetails,
      active,
      completed,
      counts: {
        total: tasksWithDetails.length,
        active: active.length,
        completed: completed.length,
        daily: tasksWithDetails.filter(t => t.task_type === "daily").length,
        weekly: tasksWithDetails.filter(t => t.task_type === "weekly").length,
        monthly: tasksWithDetails.filter(t => t.task_type === "monthly").length
      }
    })
  } catch (err) {
    console.error("Error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// إنشاء مهمة جديدة
export async function POST(request: NextRequest) {
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

    const { 
      title, 
      description, 
      task_type, 
      is_group_task,
      completion_type = "all", // "all" = الجميع، "any" = أي شخص
      member_ids = [],
      items = [],
      due_date
    } = await request.json()

    if (!title || !task_type) {
      return NextResponse.json({ error: "title and task_type are required" }, { status: 400 })
    }

    if (!["daily", "weekly", "monthly"].includes(task_type)) {
      return NextResponse.json({ error: "Invalid task_type" }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // إنشاء المهمة
    const { data: task, error } = await adminClient
      .from("tasks")
      .insert({
        creator_id: userData.user.id,
        title,
        description,
        task_type,
        is_group_task: is_group_task && member_ids.length > 0,
        completion_type: is_group_task ? completion_type : "all",
        due_date,
        status: "active"
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating task:", error)
      // التحقق من أن الجدول موجود
      if (error.code === "42P01" || error.message.includes("does not exist")) {
        return NextResponse.json({ 
          error: "جداول المهام غير موجودة. يرجى تشغيل SQL في Supabase أولاً",
          details: "Run database/tasks_schema.sql in Supabase SQL Editor"
        }, { status: 500 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // إضافة المنشئ كمالك
    await adminClient.from("task_assignments").insert({
      task_id: task.id,
      user_id: userData.user.id,
      role: "owner"
    })

    // إضافة المشاركين الآخرين
    if (is_group_task && member_ids.length > 0) {
      const memberAssignments = member_ids
        .filter((id: string) => id !== userData.user.id)
        .map((user_id: string) => ({
          task_id: task.id,
          user_id,
          role: "member"
        }))

      if (memberAssignments.length > 0) {
        await adminClient.from("task_assignments").insert(memberAssignments)
      }

      // إرسال إشعارات للمشاركين
      const creatorName = userData.user.user_metadata?.full_name || "مستخدم"
      const notifications = member_ids
        .filter((id: string) => id !== userData.user.id)
        .map((user_id: string) => ({
          user_id,
          title: `📋 مهمة جماعية جديدة`,
          body: `${creatorName} أضافك لمهمة: ${title}`,
          type: "task",
          url: `/tasks/${task.id}`,
          data: { taskId: task.id },
          is_read: false
        }))

      if (notifications.length > 0) {
        await adminClient.from("notifications").insert(notifications)
      }
    }

    // إضافة العناصر/الطلبات
    if (items.length > 0) {
      const taskItems = items.map((item: any, index: number) => ({
        task_id: task.id,
        title: item.title,
        description: item.description,
        assigned_to: item.assigned_to,
        order_index: index
      }))

      await adminClient.from("task_items").insert(taskItems)
    }

    return NextResponse.json({ task })
  } catch (err) {
    console.error("Error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

