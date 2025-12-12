"use client"

import { useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabase/client"

/**
 * Hook to fetch pending reminders and unread messages count with periodic polling.
 * Returns counts and loading state.
 */
export function usePendingRequests(pollInterval = 10000) {
  const [pendingRequests, setPendingRequests] = useState(0) // تنبيهات معلقة
  const [unreadMessages, setUnreadMessages] = useState(0) // رسائل غير مقروءة
  const [loading, setLoading] = useState(true)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(true)
  const isVisibleRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true

    const fetchData = async (silent = false) => {
      if (!isVisibleRef.current) return
      
      try {
        if (!silent) setLoading(true)

        const { data: { session } } = await supabase.auth.getSession()
        const userId = session?.user?.id

        if (!userId || !session?.access_token) {
          if (isMountedRef.current) {
            setPendingRequests(0)
            setUnreadMessages(0)
          }
          return
        }

        // جلب عدد التنبيهات المعلقة والرسائل غير المقروءة بالتوازي مع معالجة الأخطاء
        const [remindersResult, messagesResult] = await Promise.allSettled([
          // تنبيهات معلقة واردة - استخدام Promise wrapper لمعالجة الأخطاء
          (async () => {
            try {
              const result = await supabase
                .from("reminders")
                .select("id", { count: "exact", head: true })
                .eq("recipient_id", userId)
                .eq("status", "pending")
              return result
            } catch (err) {
              console.warn("[use-pending-requests] Reminders fetch error:", err)
              return { count: 0, error: null, data: null }
            }
          })(),
          // رسائل غير مقروءة - استخدام API route بدلاً من استعلام مباشر
          fetch("/api/conversations", {
            headers: {
              "Authorization": `Bearer ${session.access_token}`
            }
          }).then(res => {
            if (!res.ok) {
              console.warn("[use-pending-requests] Conversations API error:", res.status)
              return { conversations: [] }
            }
            return res.json()
          }).then(data => {
            // حساب مجموع الرسائل غير المقروءة من جميع المحادثات
            const unreadCount = (data.conversations || []).reduce((sum: number, conv: any) => {
              return sum + (conv.unread_count || 0)
            }, 0)
            return { unreadCount }
          }).catch((err) => {
            console.warn("[use-pending-requests] Conversations fetch error:", err)
            return { unreadCount: 0 }
          })
        ])

        // معالجة نتائج reminders
        let pendingCount = 0
        if (remindersResult.status === "fulfilled") {
          const result = remindersResult.value
          if (!result.error && result.count !== undefined) {
            pendingCount = result.count || 0
          }
        }

        // معالجة نتائج الرسائل
        let unreadCount = 0
        if (messagesResult.status === "fulfilled") {
          const data = messagesResult.value
          unreadCount = data?.unreadCount || 0
        }

        if (isMountedRef.current) {
          setPendingRequests(pendingCount)
          setUnreadMessages(unreadCount)
        }
      } catch (err) {
        console.error("[use-pending-requests] Unexpected error:", err)
        // في حالة الخطأ، لا نغير القيم الحالية لتجنب flickering
      } finally {
        if (!silent && isMountedRef.current) {
          setLoading(false)
        }
      }
    }

    const handleVisibility = () => {
      isVisibleRef.current = !document.hidden
      if (!document.hidden) {
        fetchData(true)
      }
    }
    document.addEventListener("visibilitychange", handleVisibility)

    fetchData()
    intervalRef.current = setInterval(() => fetchData(true), pollInterval)

    return () => {
      isMountedRef.current = false
      document.removeEventListener("visibilitychange", handleVisibility)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [pollInterval])

  return { pendingRequests, unreadMessages, loading }
}
