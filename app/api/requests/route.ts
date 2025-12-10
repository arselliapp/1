import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createRouteHandlerClient, createAdminClient } from "@/lib/supabase-server"
import { checkRateLimit, detectSpamPatterns } from "@/lib/anti-spam"

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient()

    // محاولة الحصول على الـ session
    let session = null
    let sessionError = null

    try {
      const { data: sessionData, error } = await supabase.auth.getSession()
      session = sessionData?.session
      sessionError = error
    } catch (err) {
      // Silent error handling
    }

    // إذا لم نجد session من cookies، حاول من Authorization header
    if (!session) {
      const authHeader = request.headers.get("authorization")
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7)

        try {
          const { data, error } = await supabase.auth.getUser(token)
          if (error || !data.user) {
            return NextResponse.json({ error: "Unauthorized: Invalid token" }, { status: 401 })
          }
          // استخدم الـ user من الـ token
          session = { user: data.user } as any
        } catch (err) {
          // Silent error handling
        }
      }
    }

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { recipient_id, message, type } = await request.json()

    // التحقق من المتطلبات الأساسية
    if (!recipient_id || !message || !type) {
      return NextResponse.json(
        { error: "recipient_id, message, and type are required" },
        { status: 400 }
      )
    }

    // التحقق من معدل الطلبات (5 طلبات كحد أقصى في الدقيقة)
    const rateLimit = checkRateLimit(session.user.id, 5, 60000)

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "تم تجاوز الحد الأقصى للطلبات. يرجى المحاولة لاحقاً." },
        { status: 429 }
      )
    }

    // كشف محتوى spam
    if (detectSpamPatterns(message)) {
      return NextResponse.json(
        { error: "تم رفض الرسالة. يرجى عدم إرسال محتوى غير لائق." },
        { status: 400 }
      )
    }

    // التحقق من طول الرسالة
    if (message.length < 10 || message.length > 500) {
      return NextResponse.json(
        { error: "يجب أن تكون الرسالة بين 10 و 500 حرف" },
        { status: 400 }
      )
    }

    // التحقق من عدم إرسال طلب لنفسه
    if (session.user.id === recipient_id) {
      return NextResponse.json(
        { error: "لا يمكنك إرسال طلب لنفسك" },
        { status: 400 }
      )
    }

    // التحقق من عدم وجود طلب سابق
    const { data: existingRequest } = await supabase
      .from("requests")
      .select("id")
      .eq("sender_id", session.user.id)
      .eq("recipient_id", recipient_id)
      .eq("status", "pending")
      .single()

    if (existingRequest) {
      return NextResponse.json(
        { error: "لديك طلب معلق بالفعل لهذا المستخدم" },
        { status: 400 }
      )
    }

    // إنشاء الطلب باستخدام admin client لتجاوز RLS policies
    const adminClient = createAdminClient()

    const { data, error } = await adminClient
      .from("requests")
      .insert({
        sender_id: session.user.id,
        recipient_id,
        message,
        request_type: type,
        status: "pending"
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // حفظ الإشعار للمستلم مباشرة في قاعدة البيانات
    try {
      // الحصول على اسم المرسل من user_metadata
      const senderName = session.user.user_metadata?.full_name ||
        session.user.user_metadata?.name ||
        session.user.email?.split('@')[0] ||
        "مستخدم"

      const notificationData = {
        user_id: recipient_id,
        title: `طلب جديد من ${senderName}`,
        body: message.substring(0, 100),
        type: "request",
        url: "/requests",
        data: {
          requestId: data.id,
          senderId: session.user.id,
          requestType: type,
        },
        is_read: false,
      }

      const { data: insertedData, error: notifError } = await adminClient
        .from("notifications")
        .insert(notificationData)
        .select()
        .single()

      if (notifError) {
        // Silent error handling
      } else {
        // Silent success handling
      }
    } catch (notifError) {
      // لا نوقف العملية إذا فشل الإشعار
    }

    return NextResponse.json({ data, remaining: rateLimit.remaining })
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
