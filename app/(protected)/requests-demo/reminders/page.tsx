"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { InboxIcon, ClockIcon, CheckCircleIcon, XCircleIcon, BellIcon, ArrowRightIcon, RefreshCcwIcon } from "@/components/icons"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/components/toast-notification"

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

// حساب الوقت المتبقي
const getTimeRemaining = (createdAt: string) => {
  const created = new Date(createdAt).getTime()
  const now = Date.now()
  const diff = now - created
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const deadline = 24 // ساعة
  const remaining = deadline - hours
  const progress = Math.min((hours / deadline) * 100, 100)
  
  return {
    hours,
    remaining: Math.max(remaining, 0),
    progress,
    isOverdue: hours >= deadline,
    isUrgent: remaining <= 6 && remaining > 0
  }
}

const formatTimeAgo = (dateString: string) => {
  const now = Date.now()
  const diff = now - new Date(dateString).getTime()
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (days > 0) return `منذ ${days} يوم`
  if (hours > 0) return `منذ ${hours} ساعة`
  if (minutes > 0) return `منذ ${minutes} دقيقة`
  return "الآن"
}

export default function RemindersPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (user) loadRequests()
  }, [user])

  // تحديث المؤقتات كل دقيقة
  useEffect(() => {
    const interval = setInterval(() => {
      setRequests(prev => [...prev]) // Force re-render
    }, 60000)
    return () => clearInterval(interval)
  }, [])

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

  const handleRemindSender = (request: Request) => {
    showToast({
      title: "🔔 تم إرسال تذكير",
      message: `سيصل إشعار لـ ${request.from.name} بأنك لم ترد بعد`,
      type: "success"
    })
  }

  const handleResend = (request: Request) => {
    showToast({
      title: "📤 تم إعادة الإرسال",
      message: `تم إعادة إرسال الطلب لـ ${request.to.name}`,
      type: "success"
    })
  }

  const getStatusBadge = (status: Request["status"]) => {
    switch (status) {
      case "pending": return <Badge className="bg-amber-500/20 text-amber-500"><ClockIcon className="ml-1 h-3 w-3" />معلق</Badge>
      case "accepted": return <Badge className="bg-green-500"><CheckCircleIcon className="ml-1 h-3 w-3" />مقبول</Badge>
      case "rejected": return <Badge variant="destructive"><XCircleIcon className="ml-1 h-3 w-3" />مرفوض</Badge>
    }
  }

  const receivedRequests = requests.filter(r => r.type === "received")
  const sentRequests = requests.filter(r => r.type === "sent")
  
  // الطلبات المعلقة التي تحتاج رد
  const pendingReceived = receivedRequests.filter(r => r.status === "pending")
  const overdueReceived = pendingReceived.filter(r => getTimeRemaining(r.createdAt).isOverdue)
  const urgentReceived = pendingReceived.filter(r => getTimeRemaining(r.createdAt).isUrgent)
  
  // الطلبات المرسلة التي لم يرد عليها
  const pendingSent = sentRequests.filter(r => r.status === "pending")

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
            🔔 التذكيرات
          </h1>
          <p className="text-muted-foreground">تتبع الطلبات التي لم ترد عليها</p>
        </div>
        <Link href="/requests-demo">
          <Button variant="outline" size="sm">
            <ArrowRightIcon className="ml-1 h-4 w-4" />
            السيناريوهات
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className={`${overdueReceived.length > 0 ? "bg-red-500/10 border-red-500/30 animate-pulse" : "bg-muted/50"}`}>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-red-500">{overdueReceived.length}</p>
            <p className="text-xs text-muted-foreground">⏰ متأخر (24+ ساعة)</p>
          </CardContent>
        </Card>
        <Card className={`${urgentReceived.length > 0 ? "bg-amber-500/10 border-amber-500/30" : "bg-muted/50"}`}>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-amber-500">{urgentReceived.length}</p>
            <p className="text-xs text-muted-foreground">⚠️ عاجل (أقل من 6 ساعات)</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/10 border-blue-500/30">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-blue-500">{pendingSent.length}</p>
            <p className="text-xs text-muted-foreground">📤 بانتظار الرد</p>
          </CardContent>
        </Card>
      </div>

      {/* Overdue Requests Alert */}
      {overdueReceived.length > 0 && (
        <Card className="bg-red-500/10 border-red-500/50 animate-in fade-in">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <BellIcon className="h-5 w-5 text-red-500 animate-bounce" />
              <p className="font-bold text-red-500">لديك {overdueReceived.length} طلب متأخر!</p>
            </div>
            <p className="text-sm text-muted-foreground">هذه الطلبات تجاوزت 24 ساعة بدون رد</p>
          </CardContent>
        </Card>
      )}

      {/* Received Requests with Timer */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">📥 طلبات تحتاج ردك</h2>
        <div className="space-y-4">
          {pendingReceived.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <CheckCircleIcon className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <p className="text-muted-foreground">🎉 لا توجد طلبات معلقة!</p>
              </CardContent>
            </Card>
          ) : (
            pendingReceived.map((request, index) => {
              const time = getTimeRemaining(request.createdAt)
              return (
                <Card
                  key={request.id}
                  className={`animate-in fade-in slide-in-from-bottom-4 ${time.isOverdue ? "border-red-500/50 bg-red-500/5" : time.isUrgent ? "border-amber-500/50 bg-amber-500/5" : ""}`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <CardContent className="p-5">
                    {/* Timer Progress */}
                    <div className="mb-4">
                      <div className="flex justify-between text-xs mb-1">
                        <span className={time.isOverdue ? "text-red-500 font-bold" : time.isUrgent ? "text-amber-500 font-bold" : "text-muted-foreground"}>
                          {time.isOverdue ? "⏰ متأخر!" : `⏳ متبقي ${time.remaining} ساعة`}
                        </span>
                        <span className="text-muted-foreground">{formatTimeAgo(request.createdAt)}</span>
                      </div>
                      <Progress
                        value={time.progress}
                        className={`h-2 ${time.isOverdue ? "[&>div]:bg-red-500" : time.isUrgent ? "[&>div]:bg-amber-500" : "[&>div]:bg-green-500"}`}
                      />
                    </div>

                    {/* Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                          <AvatarImage src={request.from.avatar} />
                          <AvatarFallback>{request.from.name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-lg">{request.from.name}</p>
                          <p className="text-xs text-muted-foreground">{formatTimeAgo(request.createdAt)}</p>
                        </div>
                      </div>
                      {getStatusBadge(request.status)}
                    </div>

                    {/* Message */}
                    <div className="mt-4 p-4 bg-muted/50 rounded-lg border">
                      <p className="text-sm">{request.message}</p>
                    </div>

                    {/* Actions */}
                    <div className="mt-4 flex gap-2">
                      <Button size="sm" className="flex-1 bg-green-500 hover:bg-green-600" disabled={processingIds.has(request.id)} onClick={() => handleAccept(request.id)}>
                        <CheckCircleIcon className="ml-1 h-4 w-4" />قبول
                      </Button>
                      <Button size="sm" variant="destructive" className="flex-1" disabled={processingIds.has(request.id)} onClick={() => handleReject(request.id)}>
                        <XCircleIcon className="ml-1 h-4 w-4" />رفض
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </div>

      {/* Sent Requests Waiting for Reply */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">📤 طلباتك بانتظار الرد</h2>
        <div className="space-y-4">
          {pendingSent.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <InboxIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">لا توجد طلبات مرسلة بانتظار الرد</p>
              </CardContent>
            </Card>
          ) : (
            pendingSent.map((request, index) => {
              const time = getTimeRemaining(request.createdAt)
              return (
                <Card key={request.id} className="animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${index * 50}ms` }}>
                  <CardContent className="p-5">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                          <AvatarImage src={request.to.avatar} />
                          <AvatarFallback>{request.to.name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-lg">{request.to.name}</p>
                          <p className="text-xs text-muted-foreground">أُرسل {formatTimeAgo(request.createdAt)}</p>
                        </div>
                      </div>
                      <Badge className="bg-blue-500/20 text-blue-500">
                        <ClockIcon className="ml-1 h-3 w-3" />
                        بانتظار الرد
                      </Badge>
                    </div>

                    {/* Message */}
                    <div className="mt-4 p-4 bg-muted/50 rounded-lg border">
                      <p className="text-sm">{request.message}</p>
                    </div>

                    {/* Actions */}
                    <div className="mt-4 flex gap-2">
                      {time.isOverdue && (
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => handleRemindSender(request)}>
                          <BellIcon className="ml-1 h-4 w-4" />
                          تذكير المستلم
                        </Button>
                      )}
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => handleResend(request)}>
                        <RefreshCcwIcon className="ml-1 h-4 w-4" />
                        إعادة الإرسال
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

