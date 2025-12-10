"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { SendIcon, InboxIcon, ClockIcon, CheckCircleIcon, XCircleIcon, MessageSquareIcon, PhoneIcon, HeartIcon, UsersIcon, BellIcon, UserPlusIcon, ArrowRightIcon } from "@/components/icons"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/components/toast-notification"

// ⚡ الردود السريعة الجاهزة
const QUICK_REPLIES = [
  { id: 1, text: "شكراً، تم الإضافة ✅", emoji: "✅", color: "bg-green-500/20 text-green-500 hover:bg-green-500/30" },
  { id: 2, text: "راح أرد لك لاحقاً ⏰", emoji: "⏰", color: "bg-amber-500/20 text-amber-500 hover:bg-amber-500/30" },
  { id: 3, text: "آسف، مشغول حالياً 🙏", emoji: "🙏", color: "bg-blue-500/20 text-blue-500 hover:bg-blue-500/30" },
  { id: 4, text: "تم، تواصل معي 📱", emoji: "📱", color: "bg-purple-500/20 text-purple-500 hover:bg-purple-500/30" },
  { id: 5, text: "شكراً على التواصل 💙", emoji: "💙", color: "bg-cyan-500/20 text-cyan-500 hover:bg-cyan-500/30" },
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

export default function QuickRepliesPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({})
  const [openReplyBoxes, setOpenReplyBoxes] = useState<Record<string, boolean>>({})
  const [showCustomInput, setShowCustomInput] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (user) loadRequests()
  }, [user])

  const loadRequests = async (silent = false) => {
    if (!user) return
    if (!silent) setLoading(true)
    
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

  const sendReply = async (requestId: string, replyText: string) => {
    if (processingIds.has(requestId)) return
    setProcessingIds(prev => new Set(prev).add(requestId))

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        showToast({ title: "⚠️ تنبيه", message: "يجب تسجيل الدخول أولاً", type: "error" })
        return
      }

      const response = await fetch("/api/requests/reply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ request_id: requestId, reply: replyText }),
      })

      if (!response.ok) {
        showToast({ title: "❌ خطأ", message: "حدث خطأ أثناء إرسال الرد", type: "error" })
      } else {
        showToast({ title: "✅ تم إرسال الرد", message: "تم إرسال ردك بنجاح", type: "success" })
        setOpenReplyBoxes(prev => ({ ...prev, [requestId]: false }))
        setShowCustomInput(prev => ({ ...prev, [requestId]: false }))
        setReplyTexts(prev => ({ ...prev, [requestId]: "" }))
        loadRequests()
      }
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev)
        next.delete(requestId)
        return next
      })
    }
  }

  const handleAccept = async (requestId: string) => {
    if (processingIds.has(requestId)) return
    setProcessingIds(prev => new Set(prev).add(requestId))
    
    try {
      await supabase.from("requests").update({ status: "accepted", updated_at: new Date().toISOString() }).eq("id", requestId)
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
      loadRequests()
    } finally {
      setProcessingIds(prev => { const next = new Set(prev); next.delete(requestId); return next })
    }
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('ar-SA', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: true
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
            ⚡ الردود السريعة
          </h1>
          <p className="text-muted-foreground">رد بنقرة واحدة بدون كتابة</p>
        </div>
        <Link href="/requests-demo">
          <Button variant="outline" size="sm">
            <ArrowRightIcon className="ml-1 h-4 w-4" />
            السيناريوهات
          </Button>
        </Link>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-500/10 border-blue-500/30">
        <CardContent className="p-4">
          <p className="text-sm">
            💡 <strong>كيف يعمل:</strong> بدلاً من كتابة رد كل مرة، اختر من الردود الجاهزة أو اكتب رد مخصص
          </p>
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
            <Card key={request.id} className="animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${index * 50}ms` }}>
              <CardContent className="p-5">
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

                {/* Reply if exists */}
                {request.reply && (
                  <div className="mt-3 p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                    <p className="text-xs font-medium text-green-600 mb-2">💬 الرد:</p>
                    <p className="text-sm">{request.reply}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="mt-4 space-y-3">
                  {/* Pending Actions */}
                  {request.status === "pending" && (
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1 bg-green-500 hover:bg-green-600" disabled={processingIds.has(request.id)} onClick={() => handleAccept(request.id)}>
                        <CheckCircleIcon className="ml-1 h-4 w-4" />قبول
                      </Button>
                      <Button size="sm" variant="destructive" className="flex-1" disabled={processingIds.has(request.id)} onClick={() => handleReject(request.id)}>
                        <XCircleIcon className="ml-1 h-4 w-4" />رفض
                      </Button>
                    </div>
                  )}

                  {/* ⚡ Quick Replies Section */}
                  {request.status !== "pending" && !request.reply && (
                    <>
                      {openReplyBoxes[request.id] ? (
                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                          {/* Quick Reply Buttons */}
                          {!showCustomInput[request.id] && (
                            <>
                              <p className="text-sm font-medium text-muted-foreground">⚡ اختر رد سريع:</p>
                              <div className="grid grid-cols-2 gap-2">
                                {QUICK_REPLIES.map((reply) => (
                                  <Button
                                    key={reply.id}
                                    variant="outline"
                                    size="sm"
                                    className={`justify-start ${reply.color} border-0`}
                                    disabled={processingIds.has(request.id)}
                                    onClick={() => sendReply(request.id, reply.text)}
                                  >
                                    <span className="ml-2">{reply.emoji}</span>
                                    <span className="truncate text-xs">{reply.text.replace(reply.emoji, "").trim()}</span>
                                  </Button>
                                ))}
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-px bg-border" />
                                <span className="text-xs text-muted-foreground">أو</span>
                                <div className="flex-1 h-px bg-border" />
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onClick={() => setShowCustomInput(prev => ({ ...prev, [request.id]: true }))}
                              >
                                ✏️ كتابة رد مخصص
                              </Button>
                            </>
                          )}

                          {/* Custom Input */}
                          {showCustomInput[request.id] && (
                            <div className="space-y-2">
                              <Input
                                placeholder="اكتب ردك هنا..."
                                value={replyTexts[request.id] || ""}
                                onChange={(e) => setReplyTexts(prev => ({ ...prev, [request.id]: e.target.value }))}
                                autoFocus
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  className="flex-1"
                                  disabled={!replyTexts[request.id]?.trim() || processingIds.has(request.id)}
                                  onClick={() => sendReply(request.id, replyTexts[request.id])}
                                >
                                  <SendIcon className="ml-1 h-4 w-4" />
                                  إرسال
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setShowCustomInput(prev => ({ ...prev, [request.id]: false }))}
                                >
                                  الردود السريعة
                                </Button>
                              </div>
                            </div>
                          )}

                          <Button
                            size="sm"
                            variant="ghost"
                            className="w-full text-muted-foreground"
                            onClick={() => {
                              setOpenReplyBoxes(prev => ({ ...prev, [request.id]: false }))
                              setShowCustomInput(prev => ({ ...prev, [request.id]: false }))
                            }}
                          >
                            إلغاء
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={() => setOpenReplyBoxes(prev => ({ ...prev, [request.id]: true }))}
                        >
                          <MessageSquareIcon className="ml-1 h-4 w-4" />
                          إضافة رد
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

