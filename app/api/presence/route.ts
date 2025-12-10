import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createAdminClient } from "@/lib/supabase-server"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// تحديث حالة الاتصال
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

    const { is_online, current_conversation_id } = await request.json()

    const adminClient = createAdminClient()

    // upsert حالة الاتصال
    const { error } = await adminClient
      .from("user_presence")
      .upsert({
        user_id: userData.user.id,
        is_online: is_online !== false,
        last_seen: new Date().toISOString(),
        current_conversation_id: current_conversation_id || null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: "user_id"
      })

    if (error) {
      console.error("Error updating presence:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// جلب حالة مستخدمين معينين
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
    const userIds = searchParams.get("user_ids")?.split(",") || []

    if (userIds.length === 0) {
      return NextResponse.json({ presence: {} })
    }

    const { data: presence, error } = await supabase
      .from("user_presence")
      .select("user_id, is_online, last_seen, current_conversation_id")
      .in("user_id", userIds)

    if (error) {
      console.error("Error fetching presence:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // تحويل إلى map
    const presenceMap: Record<string, any> = {}
    presence?.forEach(p => {
      // اعتبر المستخدم غير متصل إذا لم يحدث last_seen منذ أكثر من 5 دقائق
      const lastSeenTime = new Date(p.last_seen).getTime()
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
      const isReallyOnline = p.is_online && lastSeenTime > fiveMinutesAgo

      presenceMap[p.user_id] = {
        is_online: isReallyOnline,
        last_seen: p.last_seen,
        current_conversation_id: p.current_conversation_id,
        status: isReallyOnline ? "online" : getStatusText(p.last_seen)
      }
    })

    return NextResponse.json({ presence: presenceMap })
  } catch (err) {
    console.error("Error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// دالة مساعدة لتحديد نص الحالة
function getStatusText(lastSeen: string): string {
  const now = Date.now()
  const lastSeenTime = new Date(lastSeen).getTime()
  const diff = now - lastSeenTime

  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (minutes < 5) return "متصل الآن"
  if (minutes < 60) return `كان متصل منذ ${minutes} دقيقة`
  if (hours < 24) return `كان متصل منذ ${hours} ساعة`
  if (days === 1) return "كان متصل أمس"
  return `كان متصل منذ ${days} يوم`
}

