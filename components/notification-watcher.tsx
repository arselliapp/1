"use client"

import { useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase/client"

/**
 * مكون لمراقبة الإشعارات في كل صفحات التطبيق
 * يستخدم polling كل ثانيتين ويشغل صوت عند وصول إشعار جديد
 */
export function NotificationWatcher() {
    const knownNotificationIdsRef = useRef<Set<string>>(new Set())
    const isFirstLoadRef = useRef(true)
    const audioContextRef = useRef<AudioContext | null>(null)
    const permissionRequestedRef = useRef(false)

    // تشغيل صوت الإشعار - صوت عالي وواضح
    const playNotificationSound = () => {
        try {
            // إنشاء audio context إذا لم يكن موجوداً
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
            }

            const audioContext = audioContextRef.current

            // التأكد من أن الـ context في حالة running
            if (audioContext.state === "suspended") {
                audioContext.resume()
            }

            const now = audioContext.currentTime

            // تشغيل 3 نغمات قوية متتالية
            for (let i = 0; i < 3; i++) {
                const startTime = now + (i * 0.2)

                // إنشاء oscillator للصوت
                const oscillator = audioContext.createOscillator()
                const gainNode = audioContext.createGain()

                oscillator.connect(gainNode)
                gainNode.connect(audioContext.destination)

                // نغمات إشعار قوية ومتنوعة
                if (i === 0) {
                    oscillator.frequency.setValueAtTime(880, startTime) // A5
                } else if (i === 1) {
                    oscillator.frequency.setValueAtTime(1046, startTime) // C6
                } else {
                    oscillator.frequency.setValueAtTime(1318, startTime) // E6
                }

                oscillator.type = "sine"

                // رفع الصوت للأقصى
                gainNode.gain.setValueAtTime(1.0, startTime)
                gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15)

                oscillator.start(startTime)
                oscillator.stop(startTime + 0.15)
            }
        } catch (err) {
            // Silent error handling
        }
    }

    // عرض إشعار داخل التطبيق - أكثر جمالاً وتفاعلاً
    const showInAppNotification = (title: string, body: string, type: "message" | "reminder" | "general" = "general") => {
        // تحديد اللون والأيقونة حسب النوع
        const typeStyles = {
            message: {
                gradient: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                icon: "💬"
            },
            reminder: {
                gradient: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
                icon: "📅"
            },
            general: {
                gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                icon: "🔔"
            }
        }
        
        const style = typeStyles[type]
        
        // إنشاء عنصر الإشعار
        const notifContainer = document.createElement('div')
        notifContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${style.gradient};
            color: white;
            padding: 16px 20px;
            border-radius: 16px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3), 0 0 20px rgba(102, 126, 234, 0.3);
            z-index: 99999;
            max-width: 350px;
            animation: slideIn 0.4s cubic-bezier(0.68, -0.55, 0.27, 1.55);
            cursor: pointer;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            direction: rtl;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.2);
        `

        notifContainer.innerHTML = `
            <div style="display: flex; align-items: flex-start; gap: 12px;">
                <div style="font-size: 28px; line-height: 1;">${style.icon}</div>
                <div style="flex: 1;">
                    <div style="font-weight: 700; font-size: 14px; margin-bottom: 4px;">${title}</div>
                    <div style="font-size: 13px; opacity: 0.9; line-height: 1.5;">${body}</div>
                </div>
                <div style="font-size: 18px; opacity: 0.7; cursor: pointer; padding: 4px;" onclick="this.parentNode.parentNode.remove()">✕</div>
            </div>
            <div style="height: 3px; background: rgba(255,255,255,0.3); border-radius: 3px; margin-top: 12px; overflow: hidden;">
                <div style="height: 100%; background: white; border-radius: 3px; animation: shrink 5s linear forwards;"></div>
            </div>
        `

        // إضافة الـ CSS animation
        const styleEl = document.createElement('style')
        styleEl.textContent = `
            @keyframes slideIn {
                from { transform: translateX(120%) scale(0.8); opacity: 0; }
                to { transform: translateX(0) scale(1); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0) scale(1); opacity: 1; }
                to { transform: translateX(120%) scale(0.8); opacity: 0; }
            }
            @keyframes shrink {
                from { width: 100%; }
                to { width: 0%; }
            }
        `
        document.head.appendChild(styleEl)

        // إضافة للصفحة
        document.body.appendChild(notifContainer)

        // إغلاق عند الضغط
        notifContainer.onclick = () => {
            notifContainer.style.animation = 'slideOut 0.3s ease-in'
            setTimeout(() => notifContainer.remove(), 300)
        }

        // إغلاق تلقائي بعد 5 ثواني
        setTimeout(() => {
            if (notifContainer.parentNode) {
                notifContainer.style.animation = 'slideOut 0.3s ease-in'
                setTimeout(() => notifContainer.remove(), 300)
            }
        }, 5000)
    }

    // عرض فقاعة الإشعار مع تحديد النوع
    const showNotificationBubble = async (title: string, body: string) => {
        // تحديد نوع الإشعار من العنوان
        let type: "message" | "reminder" | "general" = "general"
        
        if (title.includes("رسالة") || title.includes("محادثة") || title.includes("💬")) {
            type = "message"
        } else if (title.includes("تنبيه") || title.includes("دعوة") || title.includes("موعد") || title.includes("📅")) {
            type = "reminder"
        }
        
        showInAppNotification(title, body, type)
    }

    useEffect(() => {
        let intervalId: NodeJS.Timeout | null = null
        let isPageVisible = true

        const fetchNotifications = async () => {
            // لا تجلب البيانات إذا الصفحة مخفية
            if (!isPageVisible) return
            
            try {
                // الحصول على الـ session والـ token
                const { data: { session }, error: sessionError } = await supabase.auth.getSession()

                if (sessionError || !session?.access_token) {
                    // لا يوجد session - المستخدم غير مسجل دخول
                    return
                }

                const response = await fetch("/api/notifications/list", {
                    method: "GET",
                    headers: {
                        "Authorization": `Bearer ${session.access_token}`,
                    },
                })

                if (!response.ok) {
                    // تجاهل أخطاء 401 - قد تكون الـ session منتهية
                    return
                }

                const data = await response.json()
                const notifications: Array<{ id: string; title: string; body?: string }> = data.notifications || []

                // إذا كان أول تحميل، فقط احفظ الـ IDs ولا تشغل الصوت
                if (isFirstLoadRef.current) {
                    notifications.forEach(notif => {
                        knownNotificationIdsRef.current.add(notif.id)
                    })
                    isFirstLoadRef.current = false
                } else {
                    // كشف الإشعارات الجديدة فعلاً (التي لم نراها من قبل)
                    const trulyNewNotifications = notifications.filter(
                        notif => !knownNotificationIdsRef.current.has(notif.id)
                    )

                    if (trulyNewNotifications.length > 0) {
                        trulyNewNotifications.forEach(notif => {
                            // أضف الـ ID للقائمة المعروفة
                            knownNotificationIdsRef.current.add(notif.id)

                            // تشغيل الصوت وعرض الفقاعة
                            playNotificationSound()
                            showNotificationBubble(notif.title, notif.body || "")

                            // تحديث عنوان الصفحة إذا كانت مخفية
                            if (document.hidden) {
                                document.title = `🔔 ${notif.title}`
                            }
                        })
                    }
                }
            } catch (err) {
                // Silent error handling
            }
        }

        // مراقبة visibility الصفحة
        const handleVisibility = () => {
            isPageVisible = !document.hidden
            if (!document.hidden) {
                fetchNotifications()
            }
        }
        document.addEventListener("visibilitychange", handleVisibility)

        // جلب الإشعارات فوراً
        fetchNotifications()

        // تحديث الإشعارات كل 10 ثواني (10000ms) بدلاً من 2
        intervalId = setInterval(fetchNotifications, 10000)

        // تنظيف عند إزالة المكون
        return () => {
            document.removeEventListener("visibilitychange", handleVisibility)
            if (intervalId) {
                clearInterval(intervalId)
            }
        }
    }, [])

    // هذا المكون لا يعرض شيئاً - فقط يراقب الإشعارات
    return null
}


