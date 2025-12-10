import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase-server"

export async function GET(request: NextRequest) {
  try {
    const adminClient = createAdminClient()

    // محاولة الحصول على الـ user_id من Authorization header
    let userId: string | null = null

    const authHeader = request.headers.get("authorization")
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7)

      try {
        const { data, error } = await adminClient.auth.getUser(token)
        if (!error && data.user?.id) {
          userId = data.user.id
        }
      } catch (err) {
        // Silent error handling
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // سحب الإشعارات للمستخدم الحالي مباشرة (بدون RLS)
    const { data: notifications, error } = await adminClient
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      notifications: notifications || [],
      count: notifications?.length || 0
    })
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

