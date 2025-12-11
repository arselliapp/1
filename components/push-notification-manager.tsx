"use client"

import { useEffect, useState, useCallback, useRef } from "react"
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
  const initAttempted = useRef(false)

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
  const subscribeToPush = useCallback(async (reg: ServiceWorkerRegistration, retryOnInvalid = true) => {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    
    if (!vapidKey) {
      console.error('❌ VAPID public key not found')
      return null
    }

    try {
      const applicationServerKey = urlBase64ToUint8Array(vapidKey.trim())

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      })

      console.log('✅ Push subscription created:', subscription.endpoint)
      return subscription
    } catch (error: any) {
      console.error('❌ Push subscription failed:', error)

      // إذا المفتاح تغير أو الاشتراك قديم: فك الاشتراك الحالي ثم إعادة المحاولة مرة واحدة
      if (retryOnInvalid && error?.name === 'InvalidAccessError') {
        try {
          const existing = await reg.pushManager.getSubscription()
          if (existing) {
            console.log('↩️ Unsubscribing stale push subscription then retrying...')
            await existing.unsubscribe()
          }
        } catch (e) {
          console.warn('⚠️ Failed to unsubscribe stale subscription', e)
        }

        // محاولة ثانية بدون إعادة الدخول في حلقة
        return await subscribeToPush(reg, false)
      }

      return null
    }
  }, [])

  // حفظ الاشتراك في الخادم
  const saveSubscription = useCallback(async (subscription: PushSubscription) => {
    try {
      // محاولة الحصول على Session مع إعادة المحاولة
      let session = null
      let attempts = 0
      const maxAttempts = 3

      while (!session && attempts < maxAttempts) {
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.warn(`⚠️ Session error (attempt ${attempts + 1}):`, sessionError)
        }
        
        if (currentSession) {
          session = currentSession
          break
        }

        attempts++
        if (attempts < maxAttempts) {
          // انتظار قليل قبل إعادة المحاولة
          await new Promise(resolve => setTimeout(resolve, 1000))
          // محاولة تحديث Session
          await supabase.auth.refreshSession()
        }
      }

      if (!session || !session.access_token) {
        console.error('❌ No valid session found after', maxAttempts, 'attempts')
        // محاولة استخدام localStorage كـ fallback
        // Supabase يحفظ الجلسة في localStorage بمفتاح 'arselli-auth-token'
        const tokenKey = 'arselli-auth-token'
        const tokenData = localStorage.getItem(tokenKey)
        
        if (tokenData) {
          try {
            // Supabase يحفظ الجلسة كـ JSON string
            const sessionData = JSON.parse(tokenData)
            
            // قد يكون التوكن في sessionData.access_token أو sessionData.currentSession.access_token
            let accessToken = null
            
            if (sessionData.access_token) {
              accessToken = sessionData.access_token
            } else if (sessionData.currentSession?.access_token) {
              accessToken = sessionData.currentSession.access_token
            } else if (sessionData.session?.access_token) {
              accessToken = sessionData.session.access_token
            }
            
            if (accessToken) {
              console.log('🔄 Using token from localStorage as fallback')
              session = { access_token: accessToken }
            } else {
              console.warn('⚠️ Token data found but no access_token:', Object.keys(sessionData))
            }
          } catch (e) {
            console.error('❌ Error parsing token from localStorage:', e)
            // محاولة قراءة مباشرة كـ string (إذا كان التوكن محفوظاً كـ string)
            if (tokenData && tokenData.length > 50 && !tokenData.startsWith('{')) {
              console.log('🔄 Trying token as direct string')
              session = { access_token: tokenData }
            }
          }
        } else {
          console.warn('⚠️ No token data found in localStorage with key:', tokenKey)
          // محاولة البحث عن أي مفتاح يحتوي على 'auth' أو 'token'
          const allKeys = Object.keys(localStorage)
          const authKeys = allKeys.filter(k => k.includes('auth') || k.includes('token'))
          console.log('🔍 Found auth-related keys:', authKeys)
          
          for (const key of authKeys) {
            try {
              const data = localStorage.getItem(key)
              if (data) {
                const parsed = JSON.parse(data)
                if (parsed.access_token || parsed.currentSession?.access_token) {
                  const token = parsed.access_token || parsed.currentSession?.access_token
                  console.log(`🔄 Found token in key: ${key}`)
                  session = { access_token: token }
                  break
                }
              }
            } catch (e) {
              // تجاهل الأخطاء
            }
          }
        }
      }

      if (!session || !session.access_token) {
        console.error('❌ No valid access token available')
        return false
      }

      console.log('✅ Valid session found, saving subscription...')

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
        const errorText = await response.text()
        console.error('❌ Failed to save subscription:', response.status, errorText)
        
        // إذا كان الخطأ 401، حاول تحديث Session
        if (response.status === 401) {
          console.log('🔄 Unauthorized, trying to refresh session...')
          const { data: { session: newSession } } = await supabase.auth.refreshSession()
          if (newSession && newSession.access_token) {
            console.log('✅ Session refreshed, retrying...')
            const retryResponse = await fetch('/api/notifications/subscribe', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${newSession.access_token}`
              },
              body: JSON.stringify(subscription.toJSON())
            })
            if (retryResponse.ok) {
              console.log('✅ Subscription saved after retry')
              return true
            }
          }
        }
        
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
    if (initAttempted.current) return
    initAttempted.current = true

    console.log('🔔 Initializing push notifications for user:', user.id)

    // 1. تسجيل Service Worker
    let reg = registration
    if (!reg) {
      reg = await registerServiceWorker()
      if (!reg) {
        console.error('❌ Failed to register service worker')
        return
      }
    }

    // انتظار حتى يكون SW جاهز
    await navigator.serviceWorker.ready
    console.log('✅ Service Worker is ready')

    // 2. التحقق من الاشتراك الحالي
    const existingSubscription = await reg.pushManager.getSubscription()
    if (existingSubscription) {
      console.log('✅ Already subscribed to push:', existingSubscription.endpoint.slice(0, 50))
      setIsSubscribed(true)
      // تحديث الاشتراك في الخادم
      await saveSubscription(existingSubscription)
      return
    }

    // 3. طلب الإذن
    console.log('📢 Requesting notification permission...')
    const hasPermission = await requestPermission()
    if (!hasPermission) {
      console.log('❌ No permission for notifications')
      return
    }
    console.log('✅ Notification permission granted')

    // 4. الاشتراك
    console.log('📱 Subscribing to push...')
    const subscription = await subscribeToPush(reg)
    if (!subscription) {
      console.error('❌ Failed to subscribe to push')
      return
    }

    // 5. حفظ في الخادم
    console.log('💾 Saving subscription to server...')
    const saved = await saveSubscription(subscription)
    if (saved) {
      setIsSubscribed(true)
      console.log('🎉 Push notifications enabled successfully!')
    }
  }, [user, registration, registerServiceWorker, requestPermission, subscribeToPush, saveSubscription])

  // التهيئة عند تحميل المكون
  useEffect(() => {
    if (user && !initAttempted.current) {
      // تأخير قليل للتأكد من تحميل كل شيء
      const timer = setTimeout(() => {
        initializePushNotifications()
      }, 2000)
      return () => clearTimeout(timer)
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

