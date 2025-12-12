import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createAdminClient } from "@/lib/supabase-server"

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

    // تحقق من أن المستخدم هو المرسل أو المستقبل
    const { data: reminder, error: fetchError } = await admin
      .from("reminders")
      .select("id, sender_id, recipient_id, title, reminder_type")
      .eq("id", params.id)
      .single()

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }
    if (!reminder) {
      return NextResponse.json({ error: "Reminder not found" }, { status: 404 })
    }

    if (reminder.sender_id !== userData.user.id && reminder.recipient_id !== userData.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // احذف التنبيه
    const { error: deleteError } = await admin
      .from("reminders")
      .delete()
      .eq("id", params.id)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Error deleting reminder:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

