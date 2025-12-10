"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { BellIcon } from "@/components/icons"

export function NotificationPermission() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>("default")

  useEffect(() => {
    // التحقق من دعم الإشعارات
    if (!("Notification" in window)) {
      console.log("This browser does not support notifications")
      return
    }

    const currentPermission = Notification.permission
    setPermission(currentPermission)

    // عرض الطلب إذا لم يتم السماح أو الرفض
    if (currentPermission === "default") {
      // الانتظار 3 ثوانٍ قبل عرض الطلب
      const timer = setTimeout(() => {
        setShowPrompt(true)
      }, 3000)

      return () => clearTimeout(timer)
    }
  }, [])

  const requestPermission = async () => {
    try {
      const result = await Notification.requestPermission()
      setPermission(result)

      if (result === "granted") {
        setShowPrompt(false)
        
        // حفظ subscription في قاعدة البيانات
        await subscribeUserToPush()
        
        // إرسال إشعار تجريبي
        new Notification("مرحباً بك في أرسل لي! 🎉", {
          body: "سنرسل لك إشعارات عند وصول طلبات جديدة",
          icon: "/icon-192x192.png",
          badge: "/icon-192x192.png",
          tag: "welcome",
          requireInteraction: false,
        })
      }
    } catch (error) {
      console.error("Error requesting notification permission:", error)
    }
  }

  const subscribeUserToPush = async () => {
    try {
      // التحقق من دعم Service Worker
      if (!("serviceWorker" in navigator)) {
        console.error("❌ Service Worker not supported")
        alert("المتصفح لا يدعم Service Worker. يرجى استخدام متصفح حديث.")
        return
      }

      // التحقق من وجود VAPID key
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey || vapidKey === "YOUR_PUBLIC_KEY_HERE") {
        console.error("❌ VAPID public key is not configured")
        alert("خطأ في إعدادات الإشعارات. يرجى التحقق من VAPID keys في ملف .env.local")
        return
      }

      // تسجيل Service Worker إذا لم يكن مسجل
      let registration = await navigator.serviceWorker.getRegistration()
      if (!registration) {
        console.log("📝 Registering Service Worker...")
        registration = await navigator.serviceWorker.register('/sw.js')
        console.log("✅ Service Worker registered")
      }

      // انتظار Service Worker حتى يكون جاهزاً
      await navigator.serviceWorker.ready
      console.log("✅ Service Worker is ready")

      // التحقق من دعم Push API
      if (!("PushManager" in window)) {
        console.error("❌ Push API not supported")
        alert("المتصفح لا يدعم Push Notifications")
        return
      }

      // الاشتراك في Push Notifications
      console.log("📱 Subscribing to push notifications...")
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })

      console.log("✅ Push subscription created:", subscription)

      // حفظ الاشتراك في قاعدة البيانات
      const response = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(subscription),
      })

      if (!response.ok) {
        const error = await response.json()
        console.error("❌ Error saving subscription:", error)
        alert("فشل في حفظ الاشتراك: " + (error.error || "خطأ غير معروف"))
        return
      }

      console.log("✅ User subscribed to push notifications successfully")
    } catch (error) {
      console.error("❌ Error subscribing to push:", error)
      alert("حدث خطأ أثناء تفعيل الإشعارات: " + (error instanceof Error ? error.message : "خطأ غير معروف"))
    }
  }

  if (!showPrompt || permission !== "default") {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-slide-up">
      <Card className="bg-slate-800 border-slate-700 p-4 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
            <BellIcon className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-white font-semibold mb-1">تفعيل الإشعارات</h3>
            <p className="text-slate-400 text-sm mb-3">
              احصل على إشعارات فورية عند وصول طلبات جديدة
            </p>
            <div className="flex gap-2">
              <Button
                onClick={requestPermission}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                تفعيل
              </Button>
              <Button
                onClick={() => setShowPrompt(false)}
                size="sm"
                variant="ghost"
                className="text-slate-400 hover:text-white"
              >
                لاحقاً
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

// تحويل VAPID key من base64 إلى Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
