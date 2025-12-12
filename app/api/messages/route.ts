import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createAdminClient } from "@/lib/supabase-server"
import { getNotificationsSendUrl, serializeNotificationData } from "@/app/api/notifications/utils"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// جلب رسائل محادثة معينة
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
    const limit = parseInt(searchParams.get("limit") || "50")
    const before = searchParams.get("before") // للـ pagination

    if (!conversationId) {
      return NextResponse.json({ error: "conversation_id is required" }, { status: 400 })
    }

    // التحقق من أن المستخدم مشارك في المحادثة
    const { data: participant } = await supabase
      .from("conversation_participants")
      .select("id")
      .eq("conversation_id", conversationId)
      .eq("user_id", userData.user.id)
      .single()

    if (!participant) {
      return NextResponse.json({ error: "Not a participant" }, { status: 403 })
    }

    // جلب الرسائل
    let query = supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (before) {
      query = query.lt("created_at", before)
    }

    const { data: messages, error } = await query

    if (error) {
      console.error("Error fetching messages:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // جلب حالة القراءة لكل رسالة
    const messageIds = messages?.map(m => m.id) || []
    const { data: reads } = await supabase
      .from("message_reads")
      .select("message_id, user_id, read_at")
      .in("message_id", messageIds)

    // تجميع حالة القراءة
    const readsMap: Record<string, any[]> = {}
    reads?.forEach(r => {
      if (!readsMap[r.message_id]) readsMap[r.message_id] = []
      readsMap[r.message_id].push(r)
    })

    // جلب الرسائل المُرد عليها
    const replyToIds = messages?.filter(m => m.reply_to_id).map(m => m.reply_to_id) || []
    let repliesMap: Record<string, any> = {}
    
    if (replyToIds.length > 0) {
      const { data: replies } = await supabase
        .from("messages")
        .select("id, content, sender_id")
        .in("id", replyToIds)
      
      replies?.forEach(r => {
        repliesMap[r.id] = r
      })
    }

    // إضافة حالة القراءة والرد للرسائل
    const messagesWithReads = messages?.map(m => ({
      ...m,
      reads: readsMap[m.id] || [],
      is_read: (readsMap[m.id] || []).length > 0,
      reply_to: m.reply_to_id ? repliesMap[m.reply_to_id] : null
    })).reverse() // عكس الترتيب للعرض

    // تحديث حالة القراءة
    await supabase.rpc("mark_messages_as_read", {
      p_conversation_id: conversationId,
      p_user_id: userData.user.id
    })

    return NextResponse.json({ messages: messagesWithReads })
  } catch (err) {
    console.error("Error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// إرسال رسالة جديدة
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

    const { conversation_id, content, message_type = "text", reply_to_id = null } = await request.json()

    if (!conversation_id || !content) {
      return NextResponse.json({ error: "conversation_id and content are required" }, { status: 400 })
    }

    if (content.length > 2000) {
      return NextResponse.json({ error: "الرسالة طويلة جداً (الحد الأقصى 2000 حرف)" }, { status: 400 })
    }

    // التحقق من المشاركة
    const { data: participant } = await supabase
      .from("conversation_participants")
      .select("id")
      .eq("conversation_id", conversation_id)
      .eq("user_id", userData.user.id)
      .single()

    if (!participant) {
      return NextResponse.json({ error: "Not a participant" }, { status: 403 })
    }

    // إرسال الرسالة
    const adminClient = createAdminClient()
    const messageData: any = {
      conversation_id,
      sender_id: userData.user.id,
      content,
      message_type
    }
    
    // إضافة reply_to_id إذا كان موجوداً
    if (reply_to_id) {
      messageData.reply_to_id = reply_to_id
    }
    
    const { data: message, error } = await adminClient
      .from("messages")
      .insert(messageData)
      .select()
      .single()

    if (error) {
      console.error("Error sending message:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // جلب المشارك الآخر لإرسال إشعار
    const { data: otherParticipant } = await supabase
      .from("conversation_participants")
      .select("user_id")
      .eq("conversation_id", conversation_id)
      .neq("user_id", userData.user.id)
      .single()

    if (otherParticipant) {
      // إرسال إشعار للمستلم
      const senderName = userData.user.user_metadata?.full_name || 
                        userData.user.user_metadata?.name || 
                        "مستخدم"
      
      const notificationData = {
        type: "message",
        conversationId: conversation_id,
        senderId: userData.user.id
      }

      console.log("[messages/route] Preparing notification for user:", otherParticipant.user_id)
      console.log("[messages/route] Notification data:", notificationData)

      // حفظ في قاعدة البيانات مع data كـ JSON string
      await adminClient.from("notifications").insert({
        user_id: otherParticipant.user_id,
        title: `💬 رسالة جديدة من ${senderName}`,
        body: content.length > 50 ? content.substring(0, 50) + "..." : content,
        type: "message",
        url: `/chat/${conversation_id}`,
        data: serializeNotificationData(notificationData),
        is_read: false
      })

      // إرسال Push Notification باستخدام URL مطلق
      try {
        const targetUrl = getNotificationsSendUrl(request)
        if (!targetUrl) {
          console.warn("[messages/route] Cannot resolve site URL, skipping push notification")
        } else {
          console.log("[messages/route] Sending push notification to:", targetUrl)
          await fetch(targetUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: otherParticipant.user_id,
              title: `💬 ${senderName}`,
              body: content.length > 100 ? content.substring(0, 100) + "..." : content,
              url: `/chat/${conversation_id}`,
              data: notificationData
            })
          })
          console.log("[messages/route] ✅ Push notification sent for message")
        }
      } catch (pushError) {
        console.error("[messages/route] Push notification failed:", pushError)
      }
    }

    return NextResponse.json({ message })
  } catch (err) {
    console.error("Error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

