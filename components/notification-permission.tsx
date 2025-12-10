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

    const checkPermission = () => {
      const currentPermission = Notification.permission
      setPermission(currentPermission)

      // عرض الطلب إذا لم يتم السماح (إجباري)
      if (currentPermission !== "granted") {
        setShowPrompt(true)
      } else {
        setShowPrompt(false)
      }
    }

    // التحقق فوراً
    checkPermission()

    // التحقق كل 5 ثواني إذا تم إلغاء الإشعارات
    const interval = setInterval(checkPermission, 5000)

    return () => clearInterval(interval)
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

  if (!showPrompt) {
    return null
  }

  const isDenied = permission === "denied"

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="bg-slate-800 border-slate-700 p-6 shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-300">
        <div className="text-center">
          {/* الأيقونة */}
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center">
            <BellIcon className="w-10 h-10 text-white" />
          </div>

          {/* العنوان */}
          <h3 className="text-white text-xl font-bold mb-2">
            {isDenied ? "⚠️ الإشعارات مطلوبة" : "🔔 فعّل الإشعارات"}
          </h3>

          {/* الوصف */}
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            {isDenied 
              ? "لقد قمت بحظر الإشعارات. يجب تفعيلها من إعدادات المتصفح للاستمرار في استخدام التطبيق."
              : "الإشعارات ضرورية لتلقي الطلبات والردود. فعّلها الآن للحصول على تجربة كاملة."
            }
          </p>

          {/* الأزرار */}
          {isDenied ? (
            <div className="space-y-3">
              <p className="text-yellow-400 text-xs">
                📱 اذهب إلى إعدادات المتصفح → الموقع → السماح بالإشعارات
              </p>
              <Button
                onClick={() => window.location.reload()}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3"
              >
                🔄 تحديث بعد التفعيل
              </Button>
            </div>
          ) : (
            <Button
              onClick={requestPermission}
              className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white py-3 text-lg font-medium"
            >
              ✅ تفعيل الإشعارات
            </Button>
          )}

          {/* ملاحظة */}
          <p className="text-slate-500 text-xs mt-4">
            لن تتمكن من استلام الطلبات بدون تفعيل الإشعارات
          </p>
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
