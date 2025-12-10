"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { InboxIcon, ClockIcon, CheckCircleIcon, XCircleIcon, SendIcon, ArrowRightIcon, ArchiveIcon } from "@/components/icons"
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

export default function BulkActionsPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkReply, setBulkReply] = useState("")
  const [showBulkReply, setShowBulkReply] = useState(false)

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

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const selectAll = () => {
    const pendingIds = receivedRequests.filter(r => r.status === "pending").map(r => r.id)
    setSelectedIds(new Set(pendingIds))
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
  }

  const handleBulkAccept = async () => {
    if (selectedIds.size === 0) return
    setProcessing(true)
    
    try {
      await Promise.all(
        Array.from(selectedIds).map(id =>
          supabase.from("requests").update({ status: "accepted", updated_at: new Date().toISOString() }).eq("id", id)
        )
      )
      showToast({ title: "✅ تم القبول", message: `تم قبول ${selectedIds.size} طلب بنجاح`, type: "success" })
      setSelectedIds(new Set())
      loadRequests()
    } finally {
      setProcessing(false)
    }
  }

  const handleBulkReject = async () => {
    if (selectedIds.size === 0) return
    setProcessing(true)
    
    try {
      await Promise.all(
        Array.from(selectedIds).map(id =>
          supabase.from("requests").update({ status: "rejected", updated_at: new Date().toISOString() }).eq("id", id)
        )
      )
      showToast({ title: "✅ تم الرفض", message: `تم رفض ${selectedIds.size} طلب`, type: "success" })
      setSelectedIds(new Set())
      loadRequests()
    } finally {
      setProcessing(false)
    }
  }

  const handleBulkReply = async () => {
    if (selectedIds.size === 0 || !bulkReply.trim()) return
    setProcessing(true)
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        showToast({ title: "⚠️ تنبيه", message: "يجب تسجيل الدخول", type: "error" })
        return
      }

      await Promise.all(
        Array.from(selectedIds).map(id =>
          fetch("/api/requests/reply", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ request_id: id, reply: bulkReply.trim() }),
          })
        )
      )
      showToast({ title: "✅ تم الإرسال", message: `تم إرسال الرد لـ ${selectedIds.size} طلب`, type: "success" })
      setSelectedIds(new Set())
      setBulkReply("")
      setShowBulkReply(false)
      loadRequests()
    } finally {
      setProcessing(false)
    }
  }

  const handleArchive = async () => {
    // في الواقع سنحذف الطلبات القديمة (أكثر من 30 يوم)
    const oldRequests = receivedRequests.filter(r => {
      const daysDiff = (Date.now() - new Date(r.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      return daysDiff > 30 && r.status !== "pending"
    })
    
    if (oldRequests.length === 0) {
      showToast({ title: "📦 لا يوجد", message: "لا توجد طلبات قديمة للأرشفة", type: "info" })
      return
    }
    
    showToast({ title: "📦 أرشفة", message: `سيتم أرشفة ${oldRequests.length} طلب قديم`, type: "success" })
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

  const receivedRequests = requests.filter(r => r.type === "received")
  const pendingCount = receivedRequests.filter(r => r.status === "pending").length

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
            📦 الإجراءات المجمعة
          </h1>
          <p className="text-muted-foreground">حدد عدة طلبات وتعامل معها دفعة واحدة</p>
        </div>
        <Link href="/requests-demo">
          <Button variant="outline" size="sm">
            <ArrowRightIcon className="ml-1 h-4 w-4" />
            السيناريوهات
          </Button>
        </Link>
      </div>

      {/* Info Card */}
      <Card className="bg-orange-500/10 border-orange-500/30">
        <CardContent className="p-4">
          <p className="text-sm">
            💡 <strong>كيف يعمل:</strong> اضغط على المربع بجانب كل طلب لتحديده، ثم استخدم الأزرار أدناه للتعامل مع الطلبات المحددة
          </p>
        </CardContent>
      </Card>

      {/* Bulk Actions Bar */}
      <Card className="sticky top-0 z-10 bg-background/95 backdrop-blur">
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="text-lg px-3 py-1">
                {selectedIds.size} محدد
              </Badge>
              <Button variant="ghost" size="sm" onClick={selectAll} disabled={pendingCount === 0}>
                تحديد الكل ({pendingCount})
              </Button>
              <Button variant="ghost" size="sm" onClick={clearSelection} disabled={selectedIds.size === 0}>
                إلغاء التحديد
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="bg-green-500 hover:bg-green-600"
                disabled={selectedIds.size === 0 || processing}
                onClick={handleBulkAccept}
              >
                <CheckCircleIcon className="ml-1 h-4 w-4" />
                قبول المحدد
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={selectedIds.size === 0 || processing}
                onClick={handleBulkReject}
              >
                <XCircleIcon className="ml-1 h-4 w-4" />
                رفض المحدد
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={selectedIds.size === 0 || processing}
                onClick={() => setShowBulkReply(!showBulkReply)}
              >
                <SendIcon className="ml-1 h-4 w-4" />
                رد موحد
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleArchive}
              >
                <ArchiveIcon className="ml-1 h-4 w-4" />
                أرشفة القديم
              </Button>
            </div>
          </div>

          {/* Bulk Reply Input */}
          {showBulkReply && (
            <div className="mt-4 flex gap-2 animate-in fade-in slide-in-from-top-2">
              <Input
                placeholder="اكتب الرد الموحد للطلبات المحددة..."
                value={bulkReply}
                onChange={(e) => setBulkReply(e.target.value)}
                className="flex-1"
              />
              <Button
                disabled={!bulkReply.trim() || processing}
                onClick={handleBulkReply}
              >
                إرسال للكل
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Requests */}
      <div className="space-y-4">
        {receivedRequests.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center">
              <InboxIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-lg font-medium text-muted-foreground">لا توجد طلبات واردة</p>
            </CardContent>
          </Card>
        ) : (
          receivedRequests.map((request, index) => (
            <Card
              key={request.id}
              className={`animate-in fade-in slide-in-from-bottom-4 transition-all ${selectedIds.has(request.id) ? "border-primary ring-2 ring-primary/20" : ""}`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  {/* Checkbox */}
                  <div className="pt-1">
                    <Checkbox
                      checked={selectedIds.has(request.id)}
                      onCheckedChange={() => toggleSelect(request.id)}
                      disabled={request.status !== "pending"}
                    />
                  </div>

                  <div className="flex-1">
                    {/* Header */}
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
                      {getStatusBadge(request.status)}
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
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

