import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createAdminClient } from "@/lib/supabase-server"

function resolveSiteUrl(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }

  const host = request.headers.get("host")
  if (host) {
    const protocol = host.includes("localhost") ? "http" : "https"
    return `${protocol}://${host}`
  }

  return ""
}

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
      const siteUrl = resolveSiteUrl(request)

      // حفظ إشعار في قاعدة البيانات
      const notifications = otherMembers.map(uid => ({
        user_id: uid,
        title: "🗑️ تم حذف مهمة",
        body: `قام المنشئ بحذف المهمة: ${task.title}`,
        type: "task_deleted",
        url: "/tasks",
        data: { taskId: params.id }
      }))

      try {
        await admin
          .from("notifications")
          .insert(notifications)
      } catch (e) {
        console.error("Failed to insert delete notifications:", e)
      }

      const payload = {
        title: "🗑️ تم حذف مهمة",
        body: `قام المنشئ بحذف المهمة: ${task.title}`,
        url: "/tasks",
        data: { taskId: params.id, type: "task_deleted" }
      }

      // استدعاء مسار الإشعارات لإرسال Push
      await Promise.all(
        otherMembers.map(async (uid) => {
          try {
            const targetUrl = siteUrl ? `${siteUrl}/api/notifications/send` : "/api/notifications/send"
            await fetch(targetUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId: uid, ...payload })
            })
          } catch (e) {
            console.error("Failed to send delete notification", e)
          }
        })
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Error deleting task:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

