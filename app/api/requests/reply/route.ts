import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase-server"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: NextRequest) {
    try {
        // الحصول على الـ token من Authorization header
        const authHeader = request.headers.get("authorization")
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const token = authHeader.substring(7)
        
        // إنشاء Supabase client للتحقق من الـ token
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        const { data: userData, error: userError } = await supabase.auth.getUser(token)
        
        if (userError || !userData.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const session = { user: userData.user }

        const { request_id, reply } = await request.json()

        // التحقق من المتطلبات الأساسية
        if (!request_id || !reply) {
            return NextResponse.json(
                { error: "request_id and reply are required" },
                { status: 400 }
            )
        }

        const adminClient = createAdminClient()

        // الحصول على بيانات الطلب الأصلي
        const { data: originalRequest, error: requestError } = await adminClient
            .from("requests")
            .select("*")
            .eq("id", request_id)
            .single()

        if (requestError || !originalRequest) {
            return NextResponse.json({ error: "Request not found" }, { status: 404 })
        }

        // التحقق من أن المستخدم هو المستلم
        if (originalRequest.recipient_id !== session.user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
        }

        // تحديث الرد في الطلب الأصلي
        const { error: updateError } = await adminClient
            .from("requests")
            .update({ reply, updated_at: new Date().toISOString() })
            .eq("id", request_id)

        if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 500 })
        }

        // اسم المجيب
        const responderName = session.user.user_metadata?.full_name ||
            session.user.user_metadata?.name ||
            session.user.email?.split('@')[0] ||
            "مستخدم"

        // إنشاء طلب جديد (رد) يظهر في واردات المرسل الأصلي
        // مع ذكر جزء من الرسالة الأصلية
        const originalMessageExcerpt = originalRequest.message.substring(0, 50) + (originalRequest.message.length > 50 ? '...' : '')

        const replyRequestData = {
            sender_id: session.user.id,
            recipient_id: originalRequest.sender_id,
            message: `📩 رد على طلبك السابق:\n"${originalMessageExcerpt}"\n\n💬 الرد:\n${reply}`,
            request_type: originalRequest.request_type || "whatsapp",
            status: "pending",
            reply: null,
        }

        await adminClient
            .from("requests")
            .insert(replyRequestData)

        // إرسال إشعار للمرسل الأصلي
        const replyExcerpt = reply.length > 50 ? reply.substring(0, 50) + "..." : reply
        
        const notificationData = {
            user_id: originalRequest.sender_id,
            title: `✉️ ${responderName} رد على طلبك`,
            body: `"${replyExcerpt}"`,
            type: "reply",
            url: "/requests?tab=received",
            data: {
                requestId: request_id,
                responderId: session.user.id,
            },
            is_read: false,
        }

        const { error: notifError } = await adminClient
            .from("notifications")
            .insert(notificationData)

        return NextResponse.json({
            success: true,
            notificationSent: !notifError
        })
    } catch (err: any) {
        return NextResponse.json({ error: "Internal server error", details: err?.message }, { status: 500 })
    }
}



