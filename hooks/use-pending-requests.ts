"use client"

import { useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabase/client"

/**
 * Hook to fetch pending requests count with periodic polling.
 * Returns count and loading state.
 */
export function usePendingRequests(pollInterval = 10000) {
  const [pendingRequests, setPendingRequests] = useState(0)
  const [loading, setLoading] = useState(true)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(true)
  const isVisibleRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true

    const fetchPendingRequests = async (silent = false) => {
      // لا تجلب البيانات إذا الصفحة مخفية
      if (!isVisibleRef.current) return
      
      try {
        if (!silent) setLoading(true)

        const { data: { session } } = await supabase.auth.getSession()
        const userId = session?.user?.id

        if (!userId) {
          if (isMountedRef.current) {
            setPendingRequests(0)
          }
          return
        }

        const { count, error } = await supabase
          .from("requests")
          .select("id", { count: "exact", head: true })
          .eq("recipient_id", userId)
          .eq("status", "pending")

        if (error) {
          return
        }

        if (isMountedRef.current) {
          setPendingRequests(count || 0)
        }
      } finally {
        if (!silent && isMountedRef.current) {
          setLoading(false)
        }
      }
    }

    // مراقبة visibility الصفحة
    const handleVisibility = () => {
      isVisibleRef.current = !document.hidden
      if (!document.hidden) {
        fetchPendingRequests(true)
      }
    }
    document.addEventListener("visibilitychange", handleVisibility)

    fetchPendingRequests()
    intervalRef.current = setInterval(() => fetchPendingRequests(true), pollInterval)

    return () => {
      isMountedRef.current = false
      document.removeEventListener("visibilitychange", handleVisibility)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [pollInterval])

  return { pendingRequests, loading }
}

