"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { UsersIcon, SendIcon, InboxIcon, ClockIcon } from "@/components/icons"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase/client"
import { usePendingRequests } from "@/hooks/use-pending-requests"

export default function DashboardPage() {
  const { user } = useAuth()
  const { pendingRequests } = usePendingRequests()
  const [stats, setStats] = useState({
    contacts: 0,
    sentRequests: 0,
    receivedRequests: 0,
    pendingRequests: 0
  })
  const [loading, setLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const prevStatsRef = useRef(stats)
  const [changedStats, setChangedStats] = useState<Set<string>>(new Set())

  // تحديث الإحصائيات كل 10 ثواني
  useEffect(() => {
    if (user) {
      loadStats()

      let isPageVisible = true
      const handleVisibility = () => {
        isPageVisible = !document.hidden
        if (!document.hidden) loadStats(true)
      }
      document.addEventListener("visibilitychange", handleVisibility)

      // تحديث تلقائي كل 10 ثواني فقط إذا الصفحة مرئية
      const interval = setInterval(() => {
        if (isPageVisible) loadStats(true)
      }, 10000)

      return () => {
        document.removeEventListener("visibilitychange", handleVisibility)
        clearInterval(interval)
      }
    }
  }, [user])

  const loadStats = async (silent = false) => {
    if (!user) return

    if (!silent) {
      setLoading(true)
    } else {
      setIsUpdating(true)
    }

    try {
      // جلب الإحصائيات بالتوازي لتسريع التحميل
      const [contactsResult, sentResult, receivedResult] = await Promise.all([
        supabase
          .from("contacts")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "accepted"),
        supabase
          .from("requests")
          .select("id", { count: "exact", head: true })
          .eq("sender_id", user.id),
        supabase
          .from("requests")
          .select("id", { count: "exact", head: true })
          .eq("recipient_id", user.id)
      ])

      const contactsCount = contactsResult.count
      const sentCount = sentResult.count
      const receivedCount = receivedResult.count

      // عدد الطلبات المعلقة (الواردة فقط)
      const newStats = {
        contacts: contactsCount || 0,
        sentRequests: sentCount || 0,
        receivedRequests: receivedCount || 0,
        pendingRequests: prevStatsRef.current.pendingRequests
      }

      // كشف التغييرات في الإحصائيات
      const changed = new Set<string>()
      if (newStats.contacts !== prevStatsRef.current.contacts) changed.add("contacts")
      if (newStats.sentRequests !== prevStatsRef.current.sentRequests) changed.add("sentRequests")
      if (newStats.receivedRequests !== prevStatsRef.current.receivedRequests) changed.add("receivedRequests")

      if (changed.size > 0) {
        setChangedStats(changed)
        // إزالة تأثير التغيير بعد ثانية
        setTimeout(() => setChangedStats(new Set()), 1000)
      }

      prevStatsRef.current = newStats
      setStats(newStats)
    } catch (err) {
      console.error("Error loading stats:", err)
    } finally {
      setLoading(false)
      setIsUpdating(false)
    }
  }

  // تحديث عدد الطلبات المعلقة من الهوك الموحد
  useEffect(() => {
    if (pendingRequests === undefined || pendingRequests === null) return

    setStats((prev) => {
      if (prev.pendingRequests === pendingRequests) return prev

      const updated = { ...prev, pendingRequests }

      const changed = new Set<string>(["pendingRequests"])
      setChangedStats(changed)
      setTimeout(() => setChangedStats(new Set()), 1000)

      prevStatsRef.current = updated
      return updated
    })
  }, [pendingRequests])

  const statsData = [
    { key: "contacts", label: "جهات الاتصال", value: stats.contacts.toString(), icon: UsersIcon, href: "/contacts", color: "text-blue-400", bgColor: "from-blue-500/20 to-indigo-500/20", borderColor: "border-blue-500/30" },
    { key: "sentRequests", label: "الطلبات المرسلة", value: stats.sentRequests.toString(), icon: SendIcon, href: "/requests?tab=sent", color: "text-emerald-400", bgColor: "from-emerald-500/20 to-teal-500/20", borderColor: "border-emerald-500/30" },
    { key: "receivedRequests", label: "الطلبات الواردة", value: stats.receivedRequests.toString(), icon: InboxIcon, href: "/requests", color: "text-amber-400", bgColor: "from-amber-500/20 to-orange-500/20", borderColor: "border-amber-500/30" },
    { key: "pendingRequests", label: "في الانتظار", value: stats.pendingRequests.toString(), icon: ClockIcon, href: "/requests", color: "text-purple-400", bgColor: "from-purple-500/20 to-pink-500/20", borderColor: "border-purple-500/30" },
  ]

  if (!user) {
    return <div className="text-center text-red-500">خطأ: لم يتم تحميل بيانات المستخدم.</div>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section with fade-in animation */}
      <div className="space-y-2 animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            مرحباً، {user?.user_metadata?.full_name?.split(" ")[0] || user?.user_metadata?.name?.split(" ")[0] || "مستخدم"}
          </h1>
          {isUpdating && (
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="جاري التحديث..." />
          )}
        </div>
        <p className="text-muted-foreground">إليك نظرة عامة على حسابك اليوم</p>
      </div>

      {/* Stats Grid with staggered animation */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statsData.map((stat, index) => {
          const Icon = stat.icon
          const isChanged = changedStats.has(stat.key)
          const hasPending = stat.key === "pendingRequests" && stats.pendingRequests > 0

          return (
            <Link
              key={stat.label}
              href={stat.href}
              className="animate-in fade-in slide-in-from-bottom-4 duration-500"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <Card className={cn(
                "bg-gradient-to-br border transition-all duration-200 cursor-pointer hover:scale-[1.02] hover:shadow-md",
                stat.bgColor,
                stat.borderColor,
                isChanged && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                hasPending && "ring-2 ring-purple-500/50"
              )}>
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-lg bg-secondary/50 transition-transform duration-300",
                      stat.color,
                      isChanged && "scale-110"
                    )}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className={cn(
                        "text-2xl font-bold text-foreground transition-all duration-300",
                        isChanged && "scale-110 text-primary"
                      )}>
                        {stat.value}
                      </p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      {/* Quick Actions with animation */}
      <Card className="bg-card border-border animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: "400ms" }}>
        <CardHeader>
          <CardTitle className="text-foreground">إجراءات سريعة</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/send-request"
            className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-l from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 hover:border-emerald-500/50 hover:scale-[1.02] hover:shadow-lg transition-all duration-300"
          >
            <div className="p-3 rounded-xl bg-emerald-500/20">
              <SendIcon className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <p className="font-medium text-foreground">إرسال طلب جديد</p>
              <p className="text-sm text-muted-foreground">أرسل طلباً لجهة اتصال</p>
            </div>
          </Link>
          <Link
            href="/contacts"
            className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-l from-blue-500/20 to-indigo-500/20 border border-blue-500/30 hover:border-blue-500/50 hover:scale-[1.02] hover:shadow-lg transition-all duration-300"
          >
            <div className="p-3 rounded-xl bg-blue-500/20">
              <UsersIcon className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="font-medium text-foreground">إضافة جهة اتصال</p>
              <p className="text-sm text-muted-foreground">أضف جهة اتصال جديدة</p>
            </div>
          </Link>
        </CardContent>
      </Card>

    </div>
  )
}

