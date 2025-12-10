"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { InboxIcon, SendIcon, CheckCircleIcon, XCircleIcon, ClockIcon, ArrowRightIcon, UsersIcon, CalendarIcon, StarIcon, ZapIcon } from "@/components/icons"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/contexts/auth-context"

interface Request {
  id: string
  type: "sent" | "received"
  from: { id: string; name: string; avatar?: string }
  to: { id: string; name: string; avatar?: string }
  message: string
  reply?: string
  requestType?: string
  status: "pending" | "accepted" | "rejected"
  createdAt: string
  updatedAt: string
}

// ألوان حسب نوع الطلب
const REQUEST_TYPE_COLORS: Record<string, string> = {
  whatsapp: "#25D366",
  snapchat: "#FFFC00",
  x: "#1DA1F2",
  meeting: "#9333EA",
  callback: "#10B981",
  marriage: "#EC4899",
  reminder: "#F59E0B",
}

export default function StatsPage() {
  const { user } = useAuth()
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<"week" | "month" | "all">("week")

  useEffect(() => {
    if (user) loadRequests()
  }, [user])

  const loadRequests = async () => {
    if (!user) return
    setLoading(true)
    
    try {
      const { data, error } = await supabase
        .from("requests")
        .select("*")
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order("created_at", { ascending: false })

      if (error) {
        setLoading(false)
        return
      }

      const userIds = new Set<string>()
      ;(data || []).forEach(request => {
        userIds.add(request.sender_id)
        userIds.add(request.recipient_id)
      })

      const userDataCache: Record<string, any> = {}
      await Promise.all(
        Array.from(userIds).map(async (userId) => {
          const { data: result } = await supabase.rpc('search_user_by_id', { input_user_id: userId })
          if (result && result.length > 0) userDataCache[userId] = result[0]
        })
      )

      const requestsWithUsers = (data || []).map((request) => {
        const isSent = request.sender_id === user.id
        const senderData = userDataCache[request.sender_id]
        const recipientData = userDataCache[request.recipient_id]

        return {
          id: request.id,
          type: isSent ? "sent" as const : "received" as const,
          from: {
            id: request.sender_id,
            name: senderData?.full_name || "مستخدم",
            avatar: senderData?.avatar_url
          },
          to: {
            id: request.recipient_id,
            name: recipientData?.full_name || "مستخدم",
            avatar: recipientData?.avatar_url
          },
          message: request.message,
          reply: request.reply,
          requestType: request.request_type,
          status: request.status as "pending" | "accepted" | "rejected",
          createdAt: request.created_at,
          updatedAt: request.updated_at
        }
      })

      setRequests(requestsWithUsers)
    } finally {
      setLoading(false)
    }
  }

  // تصفية حسب الفترة
  const filterByPeriod = (items: Request[]) => {
    const now = Date.now()
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000
    
    if (period === "week") {
      return items.filter(r => new Date(r.createdAt).getTime() > weekAgo)
    }
    if (period === "month") {
      return items.filter(r => new Date(r.createdAt).getTime() > monthAgo)
    }
    return items
  }

  const filteredRequests = filterByPeriod(requests)
  const sentRequests = filteredRequests.filter(r => r.type === "sent")
  const receivedRequests = filteredRequests.filter(r => r.type === "received")

  // الإحصائيات
  const stats = {
    totalSent: sentRequests.length,
    totalReceived: receivedRequests.length,
    
    sentAccepted: sentRequests.filter(r => r.status === "accepted").length,
    sentRejected: sentRequests.filter(r => r.status === "rejected").length,
    sentPending: sentRequests.filter(r => r.status === "pending").length,
    
    receivedAccepted: receivedRequests.filter(r => r.status === "accepted").length,
    receivedRejected: receivedRequests.filter(r => r.status === "rejected").length,
    receivedPending: receivedRequests.filter(r => r.status === "pending").length,
    
    acceptanceRate: receivedRequests.length > 0 
      ? Math.round((receivedRequests.filter(r => r.status === "accepted").length / receivedRequests.filter(r => r.status !== "pending").length) * 100) || 0
      : 0,
    
    responseRate: sentRequests.length > 0
      ? Math.round((sentRequests.filter(r => r.status !== "pending").length / sentRequests.length) * 100)
      : 0,
  }

  // حساب متوسط وقت الرد
  const calculateAvgResponseTime = () => {
    const respondedRequests = filteredRequests.filter(r => r.status !== "pending" && r.updatedAt !== r.createdAt)
    if (respondedRequests.length === 0) return "غير متاح"
    
    const totalTime = respondedRequests.reduce((sum, r) => {
      const diff = new Date(r.updatedAt).getTime() - new Date(r.createdAt).getTime()
      return sum + diff
    }, 0)
    
    const avgMs = totalTime / respondedRequests.length
    const avgHours = Math.round(avgMs / (1000 * 60 * 60))
    
    if (avgHours < 1) return "أقل من ساعة"
    if (avgHours < 24) return `${avgHours} ساعة`
    return `${Math.round(avgHours / 24)} يوم`
  }

  // إحصائيات حسب النوع
  const typeStats = () => {
    const types: Record<string, { sent: number; received: number }> = {}
    filteredRequests.forEach(r => {
      const type = r.requestType || "other"
      if (!types[type]) types[type] = { sent: 0, received: 0 }
      if (r.type === "sent") types[type].sent++
      else types[type].received++
    })
    return Object.entries(types).sort((a, b) => (b[1].sent + b[1].received) - (a[1].sent + a[1].received))
  }

  // أكثر من تواصل معه
  const topContacts = () => {
    const contacts: Record<string, { name: string; avatar?: string; count: number }> = {}
    filteredRequests.forEach(r => {
      const contactId = r.type === "sent" ? r.to.id : r.from.id
      const contactName = r.type === "sent" ? r.to.name : r.from.name
      const contactAvatar = r.type === "sent" ? r.to.avatar : r.from.avatar
      
      if (!contacts[contactId]) {
        contacts[contactId] = { name: contactName, avatar: contactAvatar, count: 0 }
      }
      contacts[contactId].count++
    })
    return Object.values(contacts).sort((a, b) => b.count - a.count).slice(0, 5)
  }

  const TYPE_LABELS: Record<string, string> = {
    whatsapp: "💬 واتساب",
    snapchat: "👻 سناب شات",
    x: "🐦 X",
    meeting: "📅 اجتماع",
    callback: "📞 رد اتصال",
    marriage: "💍 زواج",
    reminder: "⏰ تذكير",
    other: "📋 أخرى"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            📊 الإحصائيات
          </h1>
          <p className="text-muted-foreground">تحليل نشاطك وتفاعلاتك</p>
        </div>
        <Link href="/requests-demo">
          <Button variant="outline" size="sm">
            <ArrowRightIcon className="ml-1 h-4 w-4" />
            السيناريوهات
          </Button>
        </Link>
      </div>

      {/* Period Filter */}
      <div className="flex gap-2">
        <Button
          variant={period === "week" ? "default" : "outline"}
          size="sm"
          onClick={() => setPeriod("week")}
        >
          هذا الأسبوع
        </Button>
        <Button
          variant={period === "month" ? "default" : "outline"}
          size="sm"
          onClick={() => setPeriod("month")}
        >
          هذا الشهر
        </Button>
        <Button
          variant={period === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setPeriod("all")}
        >
          الكل
        </Button>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <SendIcon className="h-8 w-8 mx-auto mb-2 text-blue-500" />
            <p className="text-3xl font-bold">{stats.totalSent}</p>
            <p className="text-xs text-muted-foreground">طلب مرسل</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <InboxIcon className="h-8 w-8 mx-auto mb-2 text-purple-500" />
            <p className="text-3xl font-bold">{stats.totalReceived}</p>
            <p className="text-xs text-muted-foreground">طلب وارد</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <ZapIcon className="h-8 w-8 mx-auto mb-2 text-amber-500" />
            <p className="text-3xl font-bold">{calculateAvgResponseTime()}</p>
            <p className="text-xs text-muted-foreground">متوسط وقت الرد</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <StarIcon className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p className="text-3xl font-bold">{stats.acceptanceRate}%</p>
            <p className="text-xs text-muted-foreground">نسبة القبول</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Sent Requests Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SendIcon className="h-5 w-5 text-blue-500" />
              الطلبات المرسلة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm">
              <span>مقبولة</span>
              <span className="text-green-500 font-bold">{stats.sentAccepted}</span>
            </div>
            <Progress value={(stats.sentAccepted / (stats.totalSent || 1)) * 100} className="h-2 [&>div]:bg-green-500" />
            
            <div className="flex justify-between text-sm">
              <span>مرفوضة</span>
              <span className="text-red-500 font-bold">{stats.sentRejected}</span>
            </div>
            <Progress value={(stats.sentRejected / (stats.totalSent || 1)) * 100} className="h-2 [&>div]:bg-red-500" />
            
            <div className="flex justify-between text-sm">
              <span>معلقة</span>
              <span className="text-amber-500 font-bold">{stats.sentPending}</span>
            </div>
            <Progress value={(stats.sentPending / (stats.totalSent || 1)) * 100} className="h-2 [&>div]:bg-amber-500" />
            
            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground">
                نسبة الرد على طلباتك: <span className="font-bold text-primary">{stats.responseRate}%</span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Received Requests Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <InboxIcon className="h-5 w-5 text-purple-500" />
              الطلبات الواردة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm">
              <span>قبلتها</span>
              <span className="text-green-500 font-bold">{stats.receivedAccepted}</span>
            </div>
            <Progress value={(stats.receivedAccepted / (stats.totalReceived || 1)) * 100} className="h-2 [&>div]:bg-green-500" />
            
            <div className="flex justify-between text-sm">
              <span>رفضتها</span>
              <span className="text-red-500 font-bold">{stats.receivedRejected}</span>
            </div>
            <Progress value={(stats.receivedRejected / (stats.totalReceived || 1)) * 100} className="h-2 [&>div]:bg-red-500" />
            
            <div className="flex justify-between text-sm">
              <span>معلقة</span>
              <span className="text-amber-500 font-bold">{stats.receivedPending}</span>
            </div>
            <Progress value={(stats.receivedPending / (stats.totalReceived || 1)) * 100} className="h-2 [&>div]:bg-amber-500" />
            
            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground">
                نسبة قبولك للطلبات: <span className="font-bold text-primary">{stats.acceptanceRate}%</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Type Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            توزيع حسب النوع
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {typeStats().map(([type, counts]) => (
              <div
                key={type}
                className="p-4 rounded-lg border text-center"
                style={{ borderColor: REQUEST_TYPE_COLORS[type] || "#6B7280" }}
              >
                <p className="text-lg font-bold mb-1">{TYPE_LABELS[type] || type}</p>
                <div className="flex justify-center gap-4 text-sm">
                  <span className="text-blue-500">↑ {counts.sent}</span>
                  <span className="text-purple-500">↓ {counts.received}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Contacts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersIcon className="h-5 w-5" />
            أكثر من تواصلت معه
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topContacts().length === 0 ? (
            <p className="text-center text-muted-foreground py-4">لا توجد بيانات</p>
          ) : (
            <div className="space-y-3">
              {topContacts().map((contact, index) => (
                <div key={index} className="flex items-center gap-3">
                  <span className="text-lg font-bold text-muted-foreground w-6">#{index + 1}</span>
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={contact.avatar} />
                    <AvatarFallback>{contact.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{contact.name}</p>
                  </div>
                  <Badge variant="secondary">{contact.count} طلب</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

