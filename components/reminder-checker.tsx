"use client"

import { useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/contexts/auth-context"

/**
 * مكون للتحقق من التنبيهات المجدولة وإرسال إشعارات عند حلول الوقت
 */
export function ReminderChecker() {
  const { user } = useAuth()
  const checkedRemindersRef = useRef<Set<string>>(new Set())
  const lastCheckRef = useRef<string | null>(null)

  // تشغيل صوت الإشعار
  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      
      if (audioContext.state === "suspended") {
        audioContext.resume()
      }

      const now = audioContext.currentTime

      // تشغيل 3 نغمات تنبيه
      for (let i = 0; i < 3; i++) {
        const startTime = now + (i * 0.25)
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()

        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)

        // نغمات تصاعدية
        oscillator.frequency.setValueAtTime(600 + (i * 200), startTime)
        oscillator.type = "sine"

        gainNode.gain.setValueAtTime(0.8, startTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2)

        oscillator.start(startTime)
        oscillator.stop(startTime + 0.2)
      }

      // اهتزاز الجوال
      if (navigator.vibrate) {
        navigator.vibrate([300, 100, 300, 100, 300])
      }
    } catch (err) {
      console.log("Sound playback failed")
    }
  }

  // عرض إشعار تذكير
  const showReminderNotification = (title: string, body: string, eventDate: string) => {
    const notifContainer = document.createElement('div')
    notifContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
      color: white;
      padding: 20px;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.4), 0 0 30px rgba(245, 158, 11, 0.5);
      z-index: 99999;
      max-width: 380px;
      animation: slideInBounce 0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55);
      cursor: pointer;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      direction: rtl;
      border: 2px solid rgba(255,255,255,0.3);
    `

    const eventTime = new Date(eventDate).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })
    const eventDateStr = new Date(eventDate).toLocaleDateString("ar-SA", { weekday: "long", day: "numeric", month: "short" })

    notifContainer.innerHTML = `
      <div style="display: flex; align-items: flex-start; gap: 12px;">
        <div style="font-size: 36px; line-height: 1;">⏰</div>
        <div style="flex: 1;">
          <div style="font-weight: 800; font-size: 16px; margin-bottom: 6px;">🔔 تذكير: ${title}</div>
          <div style="font-size: 13px; opacity: 0.95; line-height: 1.5; margin-bottom: 8px;">${body}</div>
          <div style="font-size: 12px; opacity: 0.85; background: rgba(255,255,255,0.2); padding: 8px 12px; border-radius: 8px;">
            📅 ${eventDateStr} الساعة ${eventTime}
          </div>
        </div>
      </div>
      <div style="margin-top: 12px; display: flex; gap: 8px;">
        <button style="flex: 1; background: white; color: #D97706; border: none; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer;">
          عرض التفاصيل
        </button>
        <button style="padding: 10px 16px; background: rgba(255,255,255,0.2); color: white; border: none; border-radius: 8px; cursor: pointer;">
          ✕
        </button>
      </div>
    `

    const styleEl = document.createElement('style')
    styleEl.textContent = `
      @keyframes slideInBounce {
        from { transform: translateX(120%) scale(0.8); opacity: 0; }
        to { transform: translateX(0) scale(1); opacity: 1; }
      }
      @keyframes slideOut {
        from { transform: translateX(0) scale(1); opacity: 1; }
        to { transform: translateX(120%) scale(0.8); opacity: 0; }
      }
    `
    document.head.appendChild(styleEl)

    document.body.appendChild(notifContainer)

    // زر عرض التفاصيل
    const viewBtn = notifContainer.querySelector('button:first-of-type')
    viewBtn?.addEventListener('click', () => {
      window.location.href = '/reminders?tab=upcoming'
      notifContainer.remove()
    })

    // زر الإغلاق
    const closeBtn = notifContainer.querySelector('button:last-of-type')
    closeBtn?.addEventListener('click', () => {
      notifContainer.style.animation = 'slideOut 0.3s ease-in'
      setTimeout(() => notifContainer.remove(), 300)
    })

    // إغلاق تلقائي بعد 30 ثانية
    setTimeout(() => {
      if (notifContainer.parentNode) {
        notifContainer.style.animation = 'slideOut 0.3s ease-in'
        setTimeout(() => notifContainer.remove(), 300)
      }
    }, 30000)
  }

  useEffect(() => {
    if (!user) return

    const checkReminders = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        // جلب التنبيهات المقبولة التي لم تنته بعد
        const { data: reminders, error } = await supabase
          .from("reminders")
          .select("*")
          .eq("recipient_id", user.id)
          .eq("status", "accepted")
          .gte("event_date", new Date().toISOString())

        if (error || !reminders) return

        const now = new Date()

        for (const reminder of reminders) {
          const eventDate = new Date(reminder.event_date)
          const diffMinutes = (eventDate.getTime() - now.getTime()) / (1000 * 60)
          const remindHours: number[] = reminder.remind_before_hours || []

          // التحقق من كل وقت تذكير
          for (const hours of remindHours) {
            const remindMinutes = hours * 60
            const reminderKey = `${reminder.id}-${hours}`

            // إذا تم التذكير بالفعل، تخطي
            if (checkedRemindersRef.current.has(reminderKey)) continue

            // التحقق من أن الوقت المتبقي يطابق وقت التذكير (± 5 دقائق)
            if (diffMinutes <= remindMinutes && diffMinutes >= remindMinutes - 5) {
              checkedRemindersRef.current.add(reminderKey)

              // حفظ في localStorage لتجنب التكرار بعد إعادة فتح التطبيق
              const savedReminders = JSON.parse(localStorage.getItem("arselli-sent-reminders") || "[]")
              if (!savedReminders.includes(reminderKey)) {
                savedReminders.push(reminderKey)
                localStorage.setItem("arselli-sent-reminders", JSON.stringify(savedReminders))

                // تشغيل الصوت وعرض الإشعار
                playNotificationSound()
                
                const timeText = hours === 1 ? "ساعة" : hours === 24 ? "يوم" : `${hours} ساعات`
                showReminderNotification(
                  reminder.title,
                  `⏰ موعدك بعد ${timeText}`,
                  reminder.event_date
                )

                // تحديث عنوان الصفحة
                document.title = `⏰ تذكير: ${reminder.title}`
              }
            }
          }

          // تذكير عند حلول الموعد بالضبط (± 2 دقيقة)
          const eventKey = `${reminder.id}-event`
          if (!checkedRemindersRef.current.has(eventKey) && diffMinutes <= 2 && diffMinutes >= -2) {
            checkedRemindersRef.current.add(eventKey)

            const savedReminders = JSON.parse(localStorage.getItem("arselli-sent-reminders") || "[]")
            if (!savedReminders.includes(eventKey)) {
              savedReminders.push(eventKey)
              localStorage.setItem("arselli-sent-reminders", JSON.stringify(savedReminders))

              playNotificationSound()
              showReminderNotification(
                reminder.title,
                "🚨 حان الموعد الآن!",
                reminder.event_date
              )

              document.title = `🚨 حان الموعد: ${reminder.title}`
            }
          }
        }
      } catch (err) {
        console.error("Error checking reminders:", err)
      }
    }

    // تحميل التذكيرات المرسلة سابقاً من localStorage
    const savedReminders = JSON.parse(localStorage.getItem("arselli-sent-reminders") || "[]")
    savedReminders.forEach((key: string) => checkedRemindersRef.current.add(key))

    // التحقق فوراً ثم كل دقيقة
    checkReminders()
    const interval = setInterval(checkReminders, 60000) // كل دقيقة

    return () => clearInterval(interval)
  }, [user])

  return null
}

