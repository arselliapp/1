"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { UsersIcon, SendIcon, MessageSquareIcon, CalendarIcon, ClockIcon, SettingsIcon, ListTodoIcon, PlusIcon } from "@/components/icons"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase/client"

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    conversations: 0,
    unreadMessages: 0,
    reminders: 0,
    pendingReminders: 0,
    tasks: 0,
    activeTasks: 0
  })
  const [loading, setLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const prevStatsRef = useRef(stats)
  const [changedStats, setChangedStats] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (user) {
      loadStats()

      let isPageVisible = true
      const handleVisibility = () => {
        isPageVisible = !document.hidden
        if (!document.hidden) loadStats(true)
      }
      document.addEventListener("visibilitychange", handleVisibility)

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

    if (!silent) setLoading(true)
    else setIsUpdating(true)

    try {
      // جلب الإحصائيات بالتوازي
      const [conversationsResult, unreadResult, remindersResult, pendingResult, tasksResult, activeTasksResult] = await Promise.all([
        // المحادثات
        supabase
          .from("conversation_participants")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
        // الرسائل غير المقروءة - استخدام unread_count من conversation_participants بدلاً من is_read
        (async () => {
          try {
            const result = await supabase
              .from("conversation_participants")
              .select("unread_count")
              .eq("user_id", user.id)
            
            if (result.error) {
              console.warn("[dashboard] Error fetching unread messages:", result.error)
              return { count: 0, error: result.error }
            }
            
            // حساب مجموع الرسائل غير المقروءة من جميع المحادثات
            const totalUnread = (result.data || []).reduce((sum: number, p: any) => sum + (p.unread_count || 0), 0)
            return { count: totalUnread, error: null }
          } catch (err) {
            console.warn("[dashboard] Error fetching unread messages:", err)
            return { count: 0, error: null }
          }
        })(),
        // التنبيهات
        supabase
          .from("reminders")
          .select("id", { count: "exact", head: true })
          .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`),
        // التنبيهات المعلقة (الواردة)
        supabase
          .from("reminders")
          .select("id", { count: "exact", head: true })
          .eq("recipient_id", user.id)
          .eq("status", "pending"),
        // المهام
        supabase
          .from("task_assignments")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
        // المهام النشطة
        supabase
          .from("task_assignments")
          .select("task_id, tasks!inner(status)")
          .eq("user_id", user.id)
          .eq("tasks.status", "active")
      ])

      // معالجة نتائج الرسائل غير المقروءة
      let unreadCount = 0
      if (unreadResult && !unreadResult.error) {
        unreadCount = unreadResult.count || 0
      }
      
      const newStats = {
        conversations: conversationsResult.count || 0,
        unreadMessages: unreadCount,
        reminders: remindersResult.count || 0,
        pendingReminders: pendingResult.count || 0,
        tasks: tasksResult.count || 0,
        activeTasks: activeTasksResult.data?.length || 0
      }

      // كشف التغييرات
      const changed = new Set<string>()
      if (newStats.conversations !== prevStatsRef.current.conversations) changed.add("conversations")
      if (newStats.unreadMessages !== prevStatsRef.current.unreadMessages) changed.add("conversations")
      if (newStats.reminders !== prevStatsRef.current.reminders) changed.add("reminders")
      if (newStats.pendingReminders !== prevStatsRef.current.pendingReminders) changed.add("reminders")
      if (newStats.tasks !== prevStatsRef.current.tasks) changed.add("tasks")
      if (newStats.activeTasks !== prevStatsRef.current.activeTasks) changed.add("tasks")

      if (changed.size > 0) {
        setChangedStats(changed)
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

  const statsData = [
    { 
      key: "conversations", 
      label: "المحادثات", 
      value: stats.conversations.toString(), 
      icon: MessageSquareIcon, 
      href: "/chat", 
      color: "text-emerald-400", 
      bgColor: "from-emerald-500/20 to-teal-500/20", 
      borderColor: "border-emerald-500/30",
      badge: stats.unreadMessages > 0 ? stats.unreadMessages : null
    },
    { 
      key: "reminders", 
      label: "التنبيهات", 
      value: stats.reminders.toString(), 
      icon: CalendarIcon, 
      href: "/reminders", 
      color: "text-amber-400", 
      bgColor: "from-amber-500/20 to-orange-500/20", 
      borderColor: "border-amber-500/30",
      badge: stats.pendingReminders > 0 ? stats.pendingReminders : null
    },
    { 
      key: "tasks", 
      label: "المهام", 
      value: stats.tasks.toString(), 
      icon: ListTodoIcon, 
      href: "/tasks", 
      color: "text-purple-400", 
      bgColor: "from-purple-500/20 to-pink-500/20", 
      borderColor: "border-purple-500/30",
      badge: stats.activeTasks > 0 ? stats.activeTasks : null
    },
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
    <div className="space-y-8" dir="rtl">
      {/* Welcome Section */}
      <div className="space-y-2 animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              مرحباً، {user?.user_metadata?.full_name?.split(" ")[0] || user?.user_metadata?.name?.split(" ")[0] || "مستخدم"}
            </h1>
            {isUpdating && (
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="جاري التحديث..." />
            )}
          </div>
          <Link
            href="/settings"
            className="p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors"
            title="الإعدادات"
          >
            <SettingsIcon className="w-5 h-5 text-muted-foreground" />
          </Link>
        </div>
        <p className="text-muted-foreground">إليك نظرة عامة على حسابك اليوم</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4">
        {statsData.map((stat, index) => {
          const Icon = stat.icon
          const isChanged = changedStats.has(stat.key)

          return (
            <Link
              key={stat.label}
              href={stat.href}
              className="animate-in fade-in slide-in-from-bottom-4 duration-500"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <Card className={cn(
                "bg-gradient-to-br border transition-all duration-200 cursor-pointer hover:scale-[1.02] hover:shadow-md relative overflow-hidden",
                stat.bgColor,
                stat.borderColor,
                isChanged && "ring-2 ring-primary ring-offset-2 ring-offset-background"
              )}>
                {/* شارة الإشعارات */}
                {stat.badge && (
                  <div className="absolute top-2 left-2 z-10">
                    <span className="flex h-6 w-6 items-center justify-center">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex items-center justify-center h-5 w-5 rounded-full bg-red-500 text-white text-xs font-bold">
                        {stat.badge > 9 ? "9+" : stat.badge}
                      </span>
                    </span>
                  </div>
                )}
                <CardContent className="p-4 md:p-6">
                  <div className="flex flex-col items-center text-center gap-2">
                    <div className={cn(
                      "p-3 rounded-xl bg-secondary/50 transition-transform duration-300",
                      stat.color,
                      isChanged && "scale-110"
                    )}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <p className={cn(
                        "text-3xl font-bold text-foreground transition-all duration-300",
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

      {/* Quick Actions */}
      <Card className="bg-card border-border animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: "400ms" }}>
        <CardHeader>
          <CardTitle className="text-foreground">إجراءات سريعة</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* دردشة جديدة */}
          <Link
            href="/contacts"
            className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-l from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 hover:border-emerald-500/50 hover:scale-[1.02] hover:shadow-lg transition-all duration-300"
          >
            <div className="p-3 rounded-xl bg-emerald-500/20">
              <MessageSquareIcon className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <p className="font-medium text-foreground">دردشة جديدة</p>
              <p className="text-sm text-muted-foreground">ابدأ محادثة مع جهة اتصال</p>
            </div>
          </Link>
          
          {/* إرسال تنبيه */}
          <Link
            href="/send-reminder"
            className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-l from-amber-500/20 to-orange-500/20 border border-amber-500/30 hover:border-amber-500/50 hover:scale-[1.02] hover:shadow-lg transition-all duration-300"
          >
            <div className="p-3 rounded-xl bg-amber-500/20">
              <CalendarIcon className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <p className="font-medium text-foreground">إرسال تنبيه</p>
              <p className="text-sm text-muted-foreground">أرسل دعوة أو تذكير</p>
            </div>
          </Link>
          
          {/* إضافة جهة اتصال */}
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
          
          {/* مهمة جديدة */}
          <Link
            href="/tasks/create"
            className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-l from-purple-500/20 to-pink-500/20 border border-purple-500/30 hover:border-purple-500/50 hover:scale-[1.02] hover:shadow-lg transition-all duration-300"
          >
            <div className="p-3 rounded-xl bg-purple-500/20">
              <ListTodoIcon className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <p className="font-medium text-foreground">مهمة جديدة</p>
              <p className="text-sm text-muted-foreground">
                {stats.activeTasks > 0 ? `لديك ${stats.activeTasks} مهمة نشطة` : "أنشئ مهمة جديدة"}
              </p>
            </div>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
