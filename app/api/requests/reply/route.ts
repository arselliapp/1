import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createRouteHandlerClient, createAdminClient } from "@/lib/supabase-server"

export async function POST(request: NextRequest) {
    try {
        const supabase = createRouteHandlerClient()

        // محاولة الحصول على الـ session
        let session = null

        try {
            const { data: sessionData } = await supabase.auth.getSession()
            session = sessionData?.session
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
                    session = { user: data.user } as any
                } catch (err) {
                    // Silent error handling
                }
            }
        }

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

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
        const notificationData = {
            user_id: originalRequest.sender_id,
            title: `💬 رد جديد من ${responderName}`,
            body: `تم الرد على طلبك - افتح صفحة الطلبات الواردة لعرض الرد`,
            type: "request",
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



