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

        if (!userId) {
          if (isMountedRef.current) {
            setPendingRequests(0)
            setUnreadMessages(0)
          }
          return
        }

        // جلب عدد التنبيهات المعلقة والرسائل غير المقروءة بالتوازي
        const [remindersResult, messagesResult] = await Promise.all([
          // تنبيهات معلقة واردة
          supabase
            .from("reminders")
            .select("id", { count: "exact", head: true })
            .eq("recipient_id", userId)
            .eq("status", "pending"),
          // رسائل غير مقروءة
          supabase
            .from("conversation_participants")
            .select("unread_count")
            .eq("user_id", userId)
        ])

        const pendingCount = remindersResult.count || 0
        const unreadCount = messagesResult.data?.reduce((sum, p) => sum + (p.unread_count || 0), 0) || 0

        if (isMountedRef.current) {
          setPendingRequests(pendingCount)
          setUnreadMessages(unreadCount)
        }
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
