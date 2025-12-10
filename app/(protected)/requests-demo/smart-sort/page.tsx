"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { InboxIcon, ClockIcon, CheckCircleIcon, XCircleIcon, MessageSquareIcon, PhoneIcon, HeartIcon, UsersIcon, BellIcon, ArrowRightIcon } from "@/components/icons"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/components/toast-notification"

// 🎯 تصنيف الطلبات حسب الأولوية
const getPriority = (requestType?: string, createdAt?: string) => {
  // عاجل: اجتماعات ومواعيد
  if (requestType === "meeting" || requestType === "callback" || requestType === "reminder") {
    return { level: "high", label: "عاجل", color: "bg-red-500", icon: "🔴" }
  }
  // عادي: تواصل اجتماعي
  if (requestType === "whatsapp" || requestType === "snapchat" || requestType === "x") {
    return { level: "medium", label: "عادي", color: "bg-amber-500", icon: "🟡" }
  }
  // منخفض: باقي الطلبات
  return { level: "low", label: "منخفض", color: "bg-green-500", icon: "🟢" }
}

const REQUEST_TYPES = [
  { id: "all", label: "الكل", icon: "📋" },
  { id: "whatsapp", label: "واتساب", icon: "💬" },
  { id: "snapchat", label: "سناب شات", icon: "👻" },
  { id: "x", label: "X", icon: "🐦" },
  { id: "meeting", label: "اجتماع", icon: "📅" },
  { id: "callback", label: "رد اتصال", icon: "📞" },
  { id: "marriage", label: "زواج", icon: "💍" },
  { id: "reminder", label: "تذكير", icon: "⏰" },
]

interface Request {
  id: string
  type: "sent" | "received"
  from: { id: string; name: string; email: string; avatar?: string }
  to: { id: string; name: string; email: string; avatar?: string }
  message: string
  reply?: string
  requestType?: string
  status: "pending" | "accepted" | "rejected"
  createdAt: string
  updatedAt: string
}

export default function SmartSortPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState<"priority" | "date" | "type">("priority")
  const [filterType, setFilterType] = useState("all")

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
        .order("updated_at", { ascending: false })

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
            email: senderData?.phone_number || "",
            avatar: senderData?.avatar_url
          },
          to: {
            id: request.recipient_id,
            name: recipientData?.full_name || "مستخدم",
            email: recipientData?.phone_number || "",
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

  const handleAccept = async (requestId: string) => {
    if (processingIds.has(requestId)) return
    setProcessingIds(prev => new Set(prev).add(requestId))
    
    try {
      await supabase.from("requests").update({ status: "accepted", updated_at: new Date().toISOString() }).eq("id", requestId)
      showToast({ title: "✅ تم القبول", message: "تم قبول الطلب بنجاح", type: "success" })
      loadRequests()
    } finally {
      setProcessingIds(prev => { const next = new Set(prev); next.delete(requestId); return next })
    }
  }

  const handleReject = async (requestId: string) => {
    if (processingIds.has(requestId)) return
    setProcessingIds(prev => new Set(prev).add(requestId))
    
    try {
      await supabase.from("requests").update({ status: "rejected", updated_at: new Date().toISOString() }).eq("id", requestId)
      showToast({ title: "✅ تم الرفض", message: "تم رفض الطلب", type: "success" })
      loadRequests()
    } finally {
      setProcessingIds(prev => { const next = new Set(prev); next.delete(requestId); return next })
    }
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('ar-SA', {
      month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true
    })
  }

  const getStatusBadge = (status: Request["status"]) => {
    switch (status) {
      case "pending": return <Badge className="bg-amber-500/20 text-amber-500"><ClockIcon className="ml-1 h-3 w-3" />معلق</Badge>
      case "accepted": return <Badge className="bg-green-500"><CheckCircleIcon className="ml-1 h-3 w-3" />مقبول</Badge>
      case "rejected": return <Badge variant="destructive"><XCircleIcon className="ml-1 h-3 w-3" />مرفوض</Badge>
    }
  }

  // 🎯 فرز وتصفية الطلبات
  const receivedRequests = requests.filter(r => r.type === "received")
  
  const filteredRequests = filterType === "all" 
    ? receivedRequests 
    : receivedRequests.filter(r => r.requestType === filterType)

  const sortedRequests = [...filteredRequests].sort((a, b) => {
    if (sortBy === "priority") {
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      const aPriority = getPriority(a.requestType).level
      const bPriority = getPriority(b.requestType).level
      return priorityOrder[aPriority] - priorityOrder[bPriority]
    }
    if (sortBy === "type") {
      return (a.requestType || "").localeCompare(b.requestType || "")
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  // إحصائيات سريعة
  const stats = {
    high: receivedRequests.filter(r => getPriority(r.requestType).level === "high" && r.status === "pending").length,
    medium: receivedRequests.filter(r => getPriority(r.requestType).level === "medium" && r.status === "pending").length,
    low: receivedRequests.filter(r => getPriority(r.requestType).level === "low" && r.status === "pending").length,
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
            🎯 التصنيف الذكي
          </h1>
          <p className="text-muted-foreground">فرز وتصفية الطلبات حسب الأولوية</p>
        </div>
        <Link href="/requests-demo">
          <Button variant="outline" size="sm">
            <ArrowRightIcon className="ml-1 h-4 w-4" />
            السيناريوهات
          </Button>
        </Link>
      </div>

      {/* Priority Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-red-500">{stats.high}</p>
            <p className="text-xs text-muted-foreground">🔴 عاجل</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-500/10 border-amber-500/30">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-amber-500">{stats.medium}</p>
            <p className="text-xs text-muted-foreground">🟡 عادي</p>
          </CardContent>
        </Card>
        <Card className="bg-green-500/10 border-green-500/30">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-green-500">{stats.low}</p>
            <p className="text-xs text-muted-foreground">🟢 منخفض</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="ترتيب حسب" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="priority">🎯 الأولوية</SelectItem>
            <SelectItem value="date">📅 التاريخ</SelectItem>
            <SelectItem value="type">📋 النوع</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex gap-2 flex-wrap">
          {REQUEST_TYPES.map(type => (
            <Button
              key={type.id}
              variant={filterType === type.id ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType(type.id)}
            >
              {type.icon} {type.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Requests */}
      <div className="space-y-4">
        {sortedRequests.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center">
              <InboxIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-lg font-medium text-muted-foreground">لا توجد طلبات</p>
            </CardContent>
          </Card>
        ) : (
          sortedRequests.map((request, index) => {
            const priority = getPriority(request.requestType)
            return (
              <Card key={request.id} className={`animate-in fade-in slide-in-from-bottom-4 border-r-4`} style={{ animationDelay: `${index * 50}ms`, borderRightColor: priority.level === "high" ? "#ef4444" : priority.level === "medium" ? "#f59e0b" : "#22c55e" }}>
                <CardContent className="p-5">
                  {/* Header with Priority */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                        <AvatarImage src={request.from.avatar} />
                        <AvatarFallback>{request.from.name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-lg">{request.from.name}</p>
                        <p className="text-xs text-muted-foreground">{formatDateTime(request.createdAt)}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {getStatusBadge(request.status)}
                      <Badge className={`${priority.color} text-white text-xs`}>
                        {priority.icon} {priority.label}
                      </Badge>
                    </div>
                  </div>

                  {/* Message */}
                  <div className="mt-4 p-4 bg-muted/50 rounded-lg border">
                    <p className="text-sm">{request.message}</p>
                  </div>

                  {/* Reply */}
                  {request.reply && (
                    <div className="mt-3 p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                      <p className="text-xs font-medium text-green-600 mb-2">💬 الرد:</p>
                      <p className="text-sm">{request.reply}</p>
                    </div>
                  )}

                  {/* Actions */}
                  {request.status === "pending" && (
                    <div className="mt-4 flex gap-2">
                      <Button size="sm" className="flex-1 bg-green-500 hover:bg-green-600" disabled={processingIds.has(request.id)} onClick={() => handleAccept(request.id)}>
                        <CheckCircleIcon className="ml-1 h-4 w-4" />قبول
                      </Button>
                      <Button size="sm" variant="destructive" className="flex-1" disabled={processingIds.has(request.id)} onClick={() => handleReject(request.id)}>
                        <XCircleIcon className="ml-1 h-4 w-4" />رفض
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}

