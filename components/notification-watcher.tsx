"use client"

import { useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase/client"

/**
 * مكون لمراقبة الإشعارات في كل صفحات التطبيق
 * يستخدم polling ويشغل صوت عند وصول إشعار جديد
 */
export function NotificationWatcher() {
    const knownNotificationIdsRef = useRef<Set<string>>(new Set())
    const isFirstLoadRef = useRef(true)
    const audioContextRef = useRef<AudioContext | null>(null)

    // تشغيل صوت الإشعار
    const playNotificationSound = () => {
        // استخدام AudioContext
        playAudioContextSound()
        
        // اهتزاز للجوال
        if (navigator.vibrate) {
            navigator.vibrate([200, 100, 200])
        }
    }

    // الصوت باستخدام AudioContext
    const playAudioContextSound = () => {
        try {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
            }

            const audioContext = audioContextRef.current

            if (audioContext.state === "suspended") {
                audioContext.resume()
            }

            const now = audioContext.currentTime

            for (let i = 0; i < 3; i++) {
                const startTime = now + (i * 0.2)
                const oscillator = audioContext.createOscillator()
                const gainNode = audioContext.createGain()

                oscillator.connect(gainNode)
                gainNode.connect(audioContext.destination)

                if (i === 0) {
                    oscillator.frequency.setValueAtTime(880, startTime)
                } else if (i === 1) {
                    oscillator.frequency.setValueAtTime(1046, startTime)
                } else {
                    oscillator.frequency.setValueAtTime(1318, startTime)
                }

                oscillator.type = "sine"
                gainNode.gain.setValueAtTime(1.0, startTime)
                gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15)

                oscillator.start(startTime)
                oscillator.stop(startTime + 0.15)
            }
        } catch (err) {
            console.log("Sound playback failed")
        }
    }

    // محاولة فتح/تفعيل AudioContext بعد أول تفاعل من المستخدم (مطلوب من المتصفح)
    const primeAudioContext = () => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
        }
        if (audioContextRef.current.state === "suspended") {
            audioContextRef.current.resume().catch(() => {
                /* ignore */
            })
        }
    }

    // عرض إشعار داخل التطبيق مع رابط التنقل
    const showInAppNotification = (title: string, body: string, type: "message" | "reminder" | "general" = "general", url?: string) => {
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
                <div class="close-btn" style="font-size: 18px; opacity: 0.7; cursor: pointer; padding: 4px;">✕</div>
            </div>
            <div style="height: 3px; background: rgba(255,255,255,0.3); border-radius: 3px; margin-top: 12px; overflow: hidden;">
                <div style="height: 100%; background: white; border-radius: 3px; animation: shrink 5s linear forwards;"></div>
            </div>
        `

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

        document.body.appendChild(notifContainer)

        // الضغط على الإشعار للانتقال
        notifContainer.onclick = (e) => {
            const target = e.target as HTMLElement
            // إذا ضغط على زر الإغلاق
            if (target.classList.contains('close-btn')) {
                notifContainer.style.animation = 'slideOut 0.3s ease-in'
                setTimeout(() => notifContainer.remove(), 300)
                return
            }
            
            // الانتقال للصفحة المطلوبة مع إعادة تحميل كاملة
            notifContainer.style.animation = 'slideOut 0.3s ease-in'
            setTimeout(() => {
                notifContainer.remove()
                if (url) {
                    // استخدام window.location للتأكد من تحديث البيانات
                    window.location.href = url
                }
            }, 300)
        }

        // إغلاق تلقائي بعد 5 ثواني
        setTimeout(() => {
            if (notifContainer.parentNode) {
                notifContainer.style.animation = 'slideOut 0.3s ease-in'
                setTimeout(() => notifContainer.remove(), 300)
            }
        }, 5000)
    }

    // عرض فقاعة الإشعار مع تحديد النوع والرابط
    const showNotificationBubble = async (title: string, body: string, url?: string) => {
        let type: "message" | "reminder" | "general" = "general"
        
        if (title.includes("رسالة") || title.includes("محادثة") || title.includes("💬")) {
            type = "message"
        } else if (title.includes("تنبيه") || title.includes("دعوة") || title.includes("موعد") || title.includes("📅")) {
            type = "reminder"
        }
        
        showInAppNotification(title, body, type, url)
    }

    useEffect(() => {
        let intervalId: NodeJS.Timeout | null = null
        let isPageVisible = true

        const fetchNotifications = async () => {
            if (!isPageVisible) return
            
            try {
                const { data: { session }, error: sessionError } = await supabase.auth.getSession()

                if (sessionError || !session?.access_token) {
                    return
                }

                const response = await fetch("/api/notifications/list", {
                    method: "GET",
                    headers: {
                        "Authorization": `Bearer ${session.access_token}`,
                    },
                })

                if (!response.ok) {
                    return
                }

                const data = await response.json()
                const notifications: Array<{ id: string; title: string; body?: string; url?: string }> = data.notifications || []

                if (isFirstLoadRef.current) {
                    notifications.forEach(notif => {
                        knownNotificationIdsRef.current.add(notif.id)
                    })
                    isFirstLoadRef.current = false
                } else {
                    const trulyNewNotifications = notifications.filter(
                        notif => !knownNotificationIdsRef.current.has(notif.id)
                    )

                    if (trulyNewNotifications.length > 0) {
                        // 1. أولاً: إطلاق حدث لتحديث الصفحة
                        window.dispatchEvent(new CustomEvent('newNotification'))
                        
                        // 2. انتظر قليلاً حتى تتحدث الصفحة
                        await new Promise(resolve => setTimeout(resolve, 500))
                        
                        // 3. ثم اعرض الإشعارات
                        trulyNewNotifications.forEach(notif => {
                            knownNotificationIdsRef.current.add(notif.id)

                            playNotificationSound()
                            showNotificationBubble(notif.title, notif.body || "", notif.url || "/reminders?tab=pending")

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

        const handleVisibility = () => {
            isPageVisible = !document.hidden
            if (!document.hidden) {
                fetchNotifications()
            }
        }
        document.addEventListener("visibilitychange", handleVisibility)

        fetchNotifications()
        intervalId = setInterval(fetchNotifications, 10000)

        // تفعيل الصوت بعد أول تفاعل (لمتطلبات أمان المتصفح)
        const unlock = () => primeAudioContext()
        document.addEventListener("click", unlock, { once: true })
        document.addEventListener("touchstart", unlock, { once: true })
        document.addEventListener("keydown", unlock, { once: true })

        return () => {
            document.removeEventListener("visibilitychange", handleVisibility)
            document.removeEventListener("click", unlock)
            document.removeEventListener("touchstart", unlock)
            document.removeEventListener("keydown", unlock)
            if (intervalId) {
                clearInterval(intervalId)
            }
        }
    }, [])

    return null
}
