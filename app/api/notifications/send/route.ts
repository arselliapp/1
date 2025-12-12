import { createRouteHandlerClient, createAdminClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"
import webpush from "web-push"
import { serializeNotificationData } from "../utils"

// متغير لتتبع إعداد VAPID
let vapidConfigured = false

function setupVapid() {
  if (vapidConfigured) return true
  
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  
  if (!publicKey || !privateKey) {
    console.error("❌ VAPID keys are not configured")
    return false
  }
  
  try {
webpush.setVapidDetails(
  "mailto:support@arselli.app",
      publicKey,
      privateKey
    )
    vapidConfigured = true
    return true
  } catch (error) {
    console.error("❌ Error setting VAPID details:", error)
    return false
  }
}

export async function POST(request: Request) {
  try {
    console.log("🔔 Notification API called")
    
    // إعداد VAPID keys
    if (!setupVapid()) {
      return NextResponse.json({ error: "VAPID keys not configured" }, { status: 500 })
    }

    const supabase = createRouteHandlerClient()
    const adminClient = createAdminClient()
    
    // الحصول على بيانات الإشعار
    const { userId, title, body, url, data } = await request.json()

    if (!userId) {
      console.error("❌ User ID is required")
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    console.log(`📤 Sending notification to user: ${userId}`)
    console.log(`Title: ${title}, Body: ${body}`)

    // الحصول على اشتراكات المستخدم المستهدف (باستخدام Admin للتجاوز RLS)
    const { data: subscriptions, error: fetchError } = await adminClient
      .from("push_subscriptions")
      .select("subscription")
      .eq("user_id", userId)

    if (fetchError) {
      console.error("❌ Error fetching subscriptions:", fetchError)
      console.error("Error details:", fetchError.message, fetchError.code)
    }

    console.log(`✅ Found ${subscriptions?.length || 0} subscription(s) for user: ${userId}`)
    if (subscriptions && subscriptions.length > 0) {
      console.log("First subscription endpoint:", subscriptions[0]?.subscription?.endpoint?.slice(0, 50))
    }

    // تحديد الرابط المناسب بناءً على نوع الإشعار
    const notificationType = data?.type || "general"
    let defaultUrl = "/dashboard"
    if (notificationType === "reminder" || notificationType === "request") {
      defaultUrl = "/reminders"
    } else if (notificationType === "message") {
      defaultUrl = "/chat"
    }

    // إرسال الإشعار لجميع الأجهزة
    // ملاحظة: requireInteraction: false للسماح بالإشعارات في الخلفية
    const payload = JSON.stringify({
      title: title || "إشعار جديد",
      body: body || "لديك إشعار جديد",
      icon: "/icon-192x192.png",
      badge: "/icon-192x192.png",
      tag: data?.requestId || data?.reminderId || "notification",
      requireInteraction: false, // false للسماح بالإشعارات حتى عندما يكون المتصفح مغلقاً
      data: {
        url: url || defaultUrl,
        ...data,
      },
    })
    
    console.log("📦 Payload:", payload)

    let successCount = 0
    let sentToSubscriptions = 0

    // محاولة إرسال إشعارات Push
    if (subscriptions && subscriptions.length > 0) {
      const sendPromises = subscriptions.map(async (sub) => {
        try {
          console.log(`📤 Sending to endpoint: ${sub.subscription.endpoint?.slice(0, 50)}...`)
          const result = await webpush.sendNotification(sub.subscription, payload)
          console.log(`✅ Notification sent successfully to endpoint`)
          sentToSubscriptions++
          return { success: true }
        } catch (error: any) {
          console.error("❌ Error sending notification:", error)
          console.error("Error statusCode:", error.statusCode)
          console.error("Error message:", error.message)
          console.error("Error body:", error.body)
          
          // حذف الاشتراك إذا كان غير صالح
          if (error.statusCode === 410 || error.statusCode === 404) {
            console.log(`🗑️ Deleting invalid subscription: ${sub.subscription.endpoint?.slice(0, 50)}...`)
            await adminClient
              .from("push_subscriptions")
              .delete()
              .eq("endpoint", sub.subscription.endpoint)
            console.log("🗑️ Deleted invalid subscription")
          }
          
          return { success: false, error: error.message }
        }
      })

      const results = await Promise.all(sendPromises)
      successCount = results.filter((r) => r.success).length
      console.log(`📊 Sent ${successCount} of ${subscriptions.length} notifications successfully`)
    }

    // حفظ الإشعار في قاعدة البيانات كـ fallback مع data كـ JSON string
    console.log("[notifications/send] 💾 Saving notification to database...")
    try {
      const notificationData = data || {}
      console.log("[notifications/send] Notification data to serialize:", notificationData)
      
      const insertData = {
        user_id: userId,
        title: title || "إشعار جديد",
        body: body || "لديك إشعار جديد",
        type: data?.type || "general",
        data: serializeNotificationData(notificationData),
        url: url || defaultUrl,
        is_read: false,
      }
      
      console.log("[notifications/send] Insert data (with serialized data):", JSON.stringify({
        ...insertData,
        data: insertData.data // data is already a string
      }))
      
      const { data: insertedNotification, error: dbError } = await adminClient
        .from("notifications")
        .insert(insertData)
        .select()
        .single()
      
      if (dbError) {
        console.error("[notifications/send] ❌ Error saving notification to DB:", dbError)
        console.error("[notifications/send] Error code:", dbError.code)
        console.error("[notifications/send] Error message:", dbError.message)
      } else {
        console.log("[notifications/send] ✅ Notification saved to database:", insertedNotification?.id)
      }
    } catch (err) {
      console.error("[notifications/send] ❌ Error saving notification:", err)
    }

    return NextResponse.json({
      success: true,
      sent: successCount,
      total: subscriptions?.length || 0,
      savedToDb: true,
    })
  } catch (error) {
    console.error("Error in send notification route:", error)
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

