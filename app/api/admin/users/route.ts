import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!url || !key) {
    throw new Error("Missing Supabase environment variables")
  }
  
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { data: authUsers, error } = await supabaseAdmin.auth.admin.listUsers()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const users = (authUsers.users || []).map((u) => ({
      id: u.id,
      email: u.email || "",
      full_name: u.user_metadata?.full_name || u.user_metadata?.name || "مستخدم",
      phone_number: u.user_metadata?.phone_number || "",
      avatar_url: u.user_metadata?.avatar_url,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at
    }))

    return NextResponse.json({ users })
  } catch (err) {
    console.error("Error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { id } = await request.json()

    if (!id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // حذف المستخدم من auth.users
    // سيتم حذف جميع البيانات المرتبطة تلقائياً بسبب ON DELETE CASCADE
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
