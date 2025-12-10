import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createAdminClient } from "@/lib/supabase-server"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// تحديث حالة الكتابة
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

    const { conversation_id, is_typing } = await request.json()

    if (!conversation_id) {
      return NextResponse.json({ error: "conversation_id is required" }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // تحديث حالة الكتابة
    const { error } = await adminClient
      .from("conversation_participants")
      .update({
        is_typing: is_typing === true,
        typing_updated_at: new Date().toISOString()
      })
      .eq("conversation_id", conversation_id)
      .eq("user_id", userData.user.id)

    if (error) {
      console.error("Error updating typing status:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// جلب حالة الكتابة في محادثة
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

    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get("conversation_id")

    if (!conversationId) {
      return NextResponse.json({ error: "conversation_id is required" }, { status: 400 })
    }

    // جلب حالة الكتابة للمشاركين الآخرين
    const { data: participants, error } = await supabase
      .from("conversation_participants")
      .select("user_id, is_typing, typing_updated_at")
      .eq("conversation_id", conversationId)
      .neq("user_id", userData.user.id)

    if (error) {
      console.error("Error fetching typing status:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // التحقق من أن حالة الكتابة حديثة (أقل من 5 ثواني)
    const typingUsers = participants?.filter(p => {
      if (!p.is_typing || !p.typing_updated_at) return false
      const typingTime = new Date(p.typing_updated_at).getTime()
      return Date.now() - typingTime < 5000 // 5 ثواني
    }).map(p => p.user_id) || []

    return NextResponse.json({ 
      typing_users: typingUsers,
      is_someone_typing: typingUsers.length > 0
    })
  } catch (err) {
    console.error("Error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

