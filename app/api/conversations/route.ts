import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// جلب جميع المحادثات للمستخدم
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

    // جلب المحادثات مع آخر رسالة والمشارك الآخر
    const { data: conversations, error } = await supabase
      .from("conversation_participants")
      .select(`
        conversation_id,
        unread_count,
        last_read_at,
        conversations (
          id,
          last_message_at,
          last_message_preview,
          is_active
        )
      `)
      .eq("user_id", userId)
      .order("last_read_at", { ascending: false })

    if (error) {
      console.error("Error fetching conversations:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // جلب معلومات المشاركين الآخرين
    const conversationIds = conversations?.map(c => c.conversation_id) || []
    
    if (conversationIds.length === 0) {
      return NextResponse.json({ conversations: [] })
    }

    const { data: allParticipants } = await supabase
      .from("conversation_participants")
      .select("conversation_id, user_id")
      .in("conversation_id", conversationIds)
      .neq("user_id", userId)

    // جلب معلومات المستخدمين
    const otherUserIds = [...new Set(allParticipants?.map(p => p.user_id) || [])]
    
    const userInfoMap: Record<string, any> = {}
    await Promise.all(
      otherUserIds.map(async (uid) => {
        const { data } = await supabase.rpc("search_user_by_id", { input_user_id: uid })
        if (data && data.length > 0) {
          userInfoMap[uid] = data[0]
        }
      })
    )

    // جلب حالة الاتصال
    const { data: presenceData } = await supabase
      .from("user_presence")
      .select("user_id, is_online, last_seen")
      .in("user_id", otherUserIds)

    const presenceMap: Record<string, any> = {}
    presenceData?.forEach(p => {
      presenceMap[p.user_id] = p
    })

    // بناء البيانات النهائية
    const result = conversations?.map(conv => {
      const otherParticipant = allParticipants?.find(p => p.conversation_id === conv.conversation_id)
      const otherUserId = otherParticipant?.user_id
      const otherUser = otherUserId ? userInfoMap[otherUserId] : null
      const presence = otherUserId ? presenceMap[otherUserId] : null

      return {
        id: conv.conversation_id,
        ...(conv.conversations as any),
        unread_count: conv.unread_count,
        other_user: otherUser ? {
          id: otherUserId,
          name: otherUser.full_name || "مستخدم",
          avatar: otherUser.avatar_url,
          phone: otherUser.phone_number,
          is_online: presence?.is_online || false,
          last_seen: presence?.last_seen
        } : null
      }
    }).filter(c => c.other_user !== null)
    .sort((a, b) => new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime())

    return NextResponse.json({ conversations: result })
  } catch (err) {
    console.error("Error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// إنشاء محادثة جديدة أو الحصول على موجودة
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

    const { other_user_id } = await request.json()

    if (!other_user_id) {
      return NextResponse.json({ error: "other_user_id is required" }, { status: 400 })
    }

    // استخدام الدالة المساعدة للحصول على المحادثة أو إنشاء جديدة
    const { data, error } = await supabase.rpc("get_or_create_conversation", {
      user1_id: userData.user.id,
      user2_id: other_user_id
    })

    if (error) {
      console.error("Error creating conversation:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ conversation_id: data })
  } catch (err) {
    console.error("Error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

