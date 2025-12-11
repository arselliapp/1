"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase/client"

/**
 * مكون لإدارة اشتراك الإشعارات Push
 * يسجل المستخدم تلقائياً لاستقبال الإشعارات حتى والتطبيق مغلق
 */
export function PushNotificationManager() {
  const { user } = useAuth()
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)

  // تسجيل Service Worker
  const registerServiceWorker = useCallback(async () => {
    if (!('serviceWorker' in navigator)) {
      console.log('❌ Service Worker not supported')
      return null
    }

    try {
      // تسجيل Service Worker للإشعارات
      const reg = await navigator.serviceWorker.register('/push-sw.js', {
        scope: '/'
      })
      
      console.log('✅ Push Service Worker registered')
      setRegistration(reg)
      
      // انتظار التفعيل
      if (reg.installing) {
        await new Promise<void>((resolve) => {
          reg.installing!.addEventListener('statechange', function() {
            if (this.state === 'activated') {
              resolve()
            }
          })
        })
      }
      
      return reg
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error)
      return null
    }
  }, [])

  // طلب إذن الإشعارات
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.log('❌ Notifications not supported')
      return false
    }

    if (Notification.permission === 'granted') {
      return true
    }

    if (Notification.permission === 'denied') {
      console.log('❌ Notifications denied by user')
      return false
    }

    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }, [])

  // الاشتراك في Push Notifications
  const subscribeToPush = useCallback(async (reg: ServiceWorkerRegistration) => {
    try {
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      
      if (!vapidKey) {
        console.error('❌ VAPID public key not found')
        return null
      }

      // تحويل VAPID key
      const applicationServerKey = urlBase64ToUint8Array(vapidKey)

      // الاشتراك
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      })

      console.log('✅ Push subscription created:', subscription.endpoint)
      return subscription
    } catch (error) {
      console.error('❌ Push subscription failed:', error)
      return null
    }
  }, [])

  // حفظ الاشتراك في الخادم
  const saveSubscription = useCallback(async (subscription: PushSubscription) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return false

      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(subscription.toJSON())
      })

      if (response.ok) {
        console.log('✅ Subscription saved to server')
        return true
      } else {
        console.error('❌ Failed to save subscription')
        return false
      }
    } catch (error) {
      console.error('❌ Error saving subscription:', error)
      return false
    }
  }, [])

  // التهيئة الكاملة
  const initializePushNotifications = useCallback(async () => {
    if (!user) return

    // 1. تسجيل Service Worker
    let reg = registration
    if (!reg) {
      reg = await registerServiceWorker()
      if (!reg) return
    }

    // 2. التحقق من الاشتراك الحالي
    const existingSubscription = await reg.pushManager.getSubscription()
    if (existingSubscription) {
      console.log('✅ Already subscribed to push')
      setIsSubscribed(true)
      // تحديث الاشتراك في الخادم
      await saveSubscription(existingSubscription)
      return
    }

    // 3. طلب الإذن
    const hasPermission = await requestPermission()
    if (!hasPermission) {
      console.log('❌ No permission for notifications')
      return
    }

    // 4. الاشتراك
    const subscription = await subscribeToPush(reg)
    if (!subscription) return

    // 5. حفظ في الخادم
    const saved = await saveSubscription(subscription)
    if (saved) {
      setIsSubscribed(true)
    }
  }, [user, registration, registerServiceWorker, requestPermission, subscribeToPush, saveSubscription])

  // التهيئة عند تحميل المكون
  useEffect(() => {
    if (user) {
      initializePushNotifications()
    }
  }, [user, initializePushNotifications])

  // الاستماع لرسائل من Service Worker
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NOTIFICATION_CLICKED') {
        // التنقل للرابط المطلوب
        const url = event.data.url
        if (url) {
          window.location.href = url
        }
      }
    }

    navigator.serviceWorker?.addEventListener('message', handleMessage)
    
    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleMessage)
    }
  }, [])

  return null // هذا المكون لا يعرض شيء
}

// دالة مساعدة لتحويل VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

