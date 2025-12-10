import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createAdminClient } from "@/lib/supabase-server"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// أنواع التنبيهات
const REMINDER_TYPES = {
  wedding: { label: "دعوة زواج", emoji: "💍" },
  meeting: { label: "اجتماع", emoji: "📅" },
  callback: { label: "رد على اتصال", emoji: "📞" },
  general: { label: "تذكير عام", emoji: "⏰" },
  birthday: { label: "عيد ميلاد", emoji: "🎂" },
  event: { label: "مناسبة", emoji: "🎉" }
}

// جلب التنبيهات
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
    const type = searchParams.get("type") // sent, received, upcoming
    const status = searchParams.get("status") // pending, accepted, declined, all

    const userId = userData.user.id
    let query = supabase.from("reminders").select("*")

    if (type === "sent") {
      query = query.eq("sender_id", userId)
    } else if (type === "received") {
      query = query.eq("recipient_id", userId)
    } else {
      // الكل
      query = query.or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
    }

    if (status && status !== "all") {
      query = query.eq("status", status)
    }

    query = query.order("event_date", { ascending: true })

    const { data: reminders, error } = await query

    if (error) {
      console.error("Error fetching reminders:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // جلب معلومات المستخدمين
    const userIds = new Set<string>()
    reminders?.forEach(r => {
      if (r.sender_id) userIds.add(r.sender_id)
      if (r.recipient_id) userIds.add(r.recipient_id)
    })

    const userInfoMap: Record<string, any> = {}
    await Promise.all(
      Array.from(userIds).map(async (uid) => {
        const { data } = await supabase.rpc("search_user_by_id", { input_user_id: uid })
        if (data && data.length > 0) {
          userInfoMap[uid] = data[0]
        }
      })
    )

    // بناء البيانات النهائية
    const result = reminders?.map(r => ({
      ...r,
      type_info: REMINDER_TYPES[r.reminder_type as keyof typeof REMINDER_TYPES] || REMINDER_TYPES.general,
      sender: r.sender_id ? {
        id: r.sender_id,
        name: userInfoMap[r.sender_id]?.full_name || "مستخدم",
        avatar: userInfoMap[r.sender_id]?.avatar_url
      } : null,
      recipient: r.recipient_id ? {
        id: r.recipient_id,
        name: userInfoMap[r.recipient_id]?.full_name || "مستخدم",
        avatar: userInfoMap[r.recipient_id]?.avatar_url
      } : null,
      is_sent: r.sender_id === userId,
      is_past: new Date(r.event_date) < new Date()
    }))

    // تصنيف التنبيهات
    const upcoming = result?.filter(r => !r.is_past && r.status === "accepted") || []
    const pending = result?.filter(r => r.status === "pending" && !r.is_sent) || []
    const sent = result?.filter(r => r.is_sent) || []

    return NextResponse.json({ 
      reminders: result,
      upcoming,
      pending,
      sent,
      counts: {
        upcoming: upcoming.length,
        pending: pending.length,
        sent: sent.length
      }
    })
  } catch (err) {
    console.error("Error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// إنشاء تنبيه جديد
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
      recipient_id, 
      reminder_type, 
      title, 
      description, 
      event_date, 
      location,
      remind_before_hours = [1, 24] // افتراضي: ساعة ويوم
    } = await request.json()

    // التحقق من المدخلات
    if (!recipient_id || !reminder_type || !title || !event_date) {
      return NextResponse.json({ 
        error: "recipient_id, reminder_type, title, and event_date are required" 
      }, { status: 400 })
    }

    if (!REMINDER_TYPES[reminder_type as keyof typeof REMINDER_TYPES]) {
      return NextResponse.json({ error: "Invalid reminder_type" }, { status: 400 })
    }

    // التحقق من أن التاريخ في المستقبل
    if (new Date(event_date) <= new Date()) {
      return NextResponse.json({ error: "event_date must be in the future" }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // إنشاء التنبيه
    const { data: reminder, error } = await adminClient
      .from("reminders")
      .insert({
        sender_id: userData.user.id,
        recipient_id,
        reminder_type,
        title,
        description,
        event_date,
        location,
        remind_before_hours,
        status: "pending"
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating reminder:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // إنشاء الإشعارات المجدولة
    const eventTime = new Date(event_date).getTime()
    const scheduledNotifications = remind_before_hours.map((hours: number) => ({
      reminder_id: reminder.id,
      user_id: recipient_id,
      scheduled_for: new Date(eventTime - hours * 60 * 60 * 1000).toISOString(),
      notification_type: "reminder"
    }))

    await adminClient.from("scheduled_notifications").insert(scheduledNotifications)

    // إرسال إشعار فوري للمستلم
    const senderName = userData.user.user_metadata?.full_name || 
                      userData.user.user_metadata?.name || 
                      "مستخدم"
    const typeInfo = REMINDER_TYPES[reminder_type as keyof typeof REMINDER_TYPES]

    await adminClient.from("notifications").insert({
      user_id: recipient_id,
      title: `${typeInfo.emoji} ${typeInfo.label} من ${senderName}`,
      body: title,
      type: "reminder",
      url: "/reminders",
      data: { reminderId: reminder.id, reminderType: reminder_type },
      is_read: false
    })

    return NextResponse.json({ reminder })
  } catch (err) {
    console.error("Error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// تحديث حالة التنبيه (قبول/رفض)
export async function PATCH(request: NextRequest) {
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

    const { reminder_id, status, response_message, remind_before_hours } = await request.json()

    if (!reminder_id || !status) {
      return NextResponse.json({ error: "reminder_id and status are required" }, { status: 400 })
    }

    if (!["accepted", "declined"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }

    // التحقق من أن المستخدم هو المستلم
    const { data: reminder } = await supabase
      .from("reminders")
      .select("*")
      .eq("id", reminder_id)
      .eq("recipient_id", userData.user.id)
      .single()

    if (!reminder) {
      return NextResponse.json({ error: "Reminder not found" }, { status: 404 })
    }

    const adminClient = createAdminClient()

    // تحديث التنبيه
    const updateData: any = {
      status,
      response_message,
      responded_at: new Date().toISOString()
    }

    // إذا قبل وحدد أوقات تذكير
    if (status === "accepted" && remind_before_hours) {
      updateData.remind_before_hours = remind_before_hours

      // إعادة جدولة الإشعارات
      await adminClient
        .from("scheduled_notifications")
        .delete()
        .eq("reminder_id", reminder_id)

      const now = Date.now()
      const eventTime = new Date(reminder.event_date).getTime()
      const isCallback = reminder.reminder_type === "callback"
      
      const newNotifications = remind_before_hours.map((hours: number) => {
        let scheduledFor: string
        
        if (hours < 0) {
          // للاتصال: القيم السالبة = دقائق بعد القبول
          const minutesAfter = Math.abs(hours)
          scheduledFor = new Date(now + minutesAfter * 60 * 1000).toISOString()
        } else {
          // للمواعيد العادية: ساعات قبل الموعد
          scheduledFor = new Date(eventTime - hours * 60 * 60 * 1000).toISOString()
        }
        
        return {
          reminder_id,
          user_id: userData.user.id,
          scheduled_for: scheduledFor,
          notification_type: isCallback ? "callback_reminder" : "reminder"
        }
      })

      await adminClient.from("scheduled_notifications").insert(newNotifications)
    }

    // إذا رفض، حذف الإشعارات المجدولة
    if (status === "declined") {
      await adminClient
        .from("scheduled_notifications")
        .delete()
        .eq("reminder_id", reminder_id)
    }

    const { data: updatedReminder, error } = await adminClient
      .from("reminders")
      .update(updateData)
      .eq("id", reminder_id)
      .select()
      .single()

    if (error) {
      console.error("Error updating reminder:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // إرسال إشعار للمرسل
    const recipientName = userData.user.user_metadata?.full_name || 
                         userData.user.user_metadata?.name || 
                         "مستخدم"

    await adminClient.from("notifications").insert({
      user_id: reminder.sender_id,
      title: status === "accepted" 
        ? `✅ ${recipientName} قبل دعوتك`
        : `❌ ${recipientName} اعتذر عن دعوتك`,
      body: reminder.title,
      type: "reminder_response",
      url: "/reminders?tab=sent",
      data: { reminderId: reminder_id, status },
      is_read: false
    })

    // إذا قبل، فتح محادثة تلقائياً (اختياري)
    if (status === "accepted") {
      const { data: conversationId } = await adminClient.rpc("get_or_create_conversation", {
        user1_id: userData.user.id,
        user2_id: reminder.sender_id
      })

      if (conversationId) {
        // إرسال رسالة تلقائية
        const autoMessage = response_message || 
          (reminder.reminder_type === "wedding" 
            ? "مبروك! إن شاء الله نحضر 🎉" 
            : "تم القبول، إن شاء الله ✅")

        await adminClient.from("messages").insert({
          conversation_id: conversationId,
          sender_id: userData.user.id,
          content: autoMessage,
          message_type: "system"
        })

        // ربط المحادثة بالتنبيه
        await adminClient
          .from("reminders")
          .update({ linked_conversation_id: conversationId })
          .eq("id", reminder_id)
      }
    }

    return NextResponse.json({ reminder: updatedReminder })
  } catch (err) {
    console.error("Error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

