import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createAdminClient } from "@/lib/supabase-server"

export async function POST(request: NextRequest) {
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

    // احصل على المهام التي أنشأها المستخدم
    const { data: tasks, error: tasksError } = await admin
      .from("tasks")
      .select("id")
      .eq("creator_id", userData.user.id)

    if (tasksError) {
      return NextResponse.json({ error: tasksError.message }, { status: 500 })
    }

    const taskIds = (tasks || []).map(t => t.id).filter(Boolean)
    if (taskIds.length === 0) {
      return NextResponse.json({ success: true, deleted: 0 })
    }

    // جلب عناصر المهام لحذف الإكمالات
    const { data: items } = await admin
      .from("task_items")
      .select("id")
      .in("task_id", taskIds)

    const itemIds = (items || []).map(i => i.id).filter(Boolean)

    // حذف الإكمالات
    if (itemIds.length > 0) {
      await admin.from("task_item_completions").delete().in("task_item_id", itemIds)
    }

    // حذف العناصر
    if (itemIds.length > 0) {
      await admin.from("task_items").delete().in("id", itemIds)
    }

    // حذف التعيينات
    await admin.from("task_assignments").delete().in("task_id", taskIds)

    // حذف المهام نفسها
    const { error: deleteError } = await admin.from("tasks").delete().in("id", taskIds)
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, deleted: taskIds.length })
  } catch (err) {
    console.error("Error clearing tasks:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
