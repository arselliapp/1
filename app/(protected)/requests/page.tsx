"use client"

import { useState, useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { SendIcon, InboxIcon, ClockIcon, CheckCircleIcon, XCircleIcon, MessageSquareIcon, PhoneIcon, HeartIcon, UsersIcon, BellIcon, UserPlusIcon } from "@/components/icons"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/contexts/auth-context"

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

export default function RequestsPage() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const defaultTab = searchParams?.get('tab') === 'sent' ? 'sent' : 'received'
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [processingAll, setProcessingAll] = useState(false)
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({})
  const [openReplyBoxes, setOpenReplyBoxes] = useState<Record<string, boolean>>({})
  const [contactStatus, setContactStatus] = useState<Record<string, boolean>>({})

  // استخدام ref للتحقق من وجود صندوق رد مفتوح (لتجنب إعادة تشغيل useEffect)
  const openReplyBoxesRef = useRef(openReplyBoxes)
  openReplyBoxesRef.current = openReplyBoxes

  // تحديث الطلبات كل 10 ثواني
  useEffect(() => {
    if (user) {
      loadRequests()

      let isPageVisible = true
      const handleVisibility = () => {
        isPageVisible = !document.hidden
        if (!document.hidden) {
          const hasOpenBox = Object.values(openReplyBoxesRef.current).some(v => v)
          if (!hasOpenBox) loadRequests(true)
        }
      }
      document.addEventListener("visibilitychange", handleVisibility)

      // تحديث تلقائي كل 10 ثواني فقط إذا لم يكن هناك صندوق رد مفتوح والصفحة مرئية
      const interval = setInterval(() => {
        const hasOpenBox = Object.values(openReplyBoxesRef.current).some(v => v)
        if (!hasOpenBox && isPageVisible) {
          loadRequests(true) // silent update
        }
      }, 10000)

      return () => {
        document.removeEventListener("visibilitychange", handleVisibility)
        clearInterval(interval)
      }
    }
  }, [user])


  const loadRequests = async (silent = false) => {
    if (!user) return

    if (!silent) {
      setLoading(true)
    }
    try {
      const { data, error } = await supabase
        .from("requests")
        .select("id, sender_id, recipient_id, message, reply, request_type, status, created_at, updated_at")
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order("updated_at", { ascending: false })

      if (error) {
        setLoading(false)
        return
      }

      // جمع كل الـ user IDs الفريدة
      const userIds = new Set<string>()
        ; (data || []).forEach(request => {
          userIds.add(request.sender_id)
          userIds.add(request.recipient_id)
        })

      // جلب بيانات المستخدمين مرة واحدة فقط
      const userDataCache: Record<string, any> = {}
      await Promise.all(
        Array.from(userIds).map(async (userId) => {
          const { data: result } = await supabase.rpc('search_user_by_id', { input_user_id: userId })
          if (result && result.length > 0) {
            userDataCache[userId] = result[0]
          }
        })
      )

      // بناء قائمة الطلبات مع بيانات المستخدمين من الـ cache
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

      // التحقق من حالة جهات الاتصال - جلب الكل مرة واحدة
      const { data: contacts } = await supabase
        .from("contacts")
        .select("contact_user_id")
        .eq("user_id", user.id)

      const contactUserIds = new Set((contacts || []).map(c => c.contact_user_id))
      const contactStatusMap: Record<string, boolean> = {}

      requestsWithUsers.forEach(request => {
        if (request.type === "received") {
          contactStatusMap[request.id] = contactUserIds.has(request.from.id)
        }
      })

      setContactStatus(contactStatusMap)
    } catch (err) {
      // Error handling silently
    } finally {
      setLoading(false)
    }
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('ar-SA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  const handleAddContact = async (userId: string, userName: string) => {
    if (!user) return

    try {
      const { data: existingContacts, error: checkError } = await supabase
        .from("contacts")
        .select("id")
        .eq("user_id", user.id)
        .eq("contact_user_id", userId)

      if (checkError) {
        console.error("Error checking contact:", checkError)
      }

      if (existingContacts && existingContacts.length > 0) {
        alert("هذا الشخص موجود بالفعل في جهات الاتصال")
        return
      }

      const { error } = await supabase.from("contacts").insert({
        user_id: user.id,
        contact_user_id: userId,
        status: "accepted"
      })

      if (error) {
        console.error("Error adding contact:", error)
        alert("حدث خطأ أثناء إضافة جهة الاتصال")
      } else {
        alert(`تم إضافة ${userName} إلى جهات الاتصال بنجاح!`)
        // تحديث حالة جهة الاتصال
        const requestId = requests.find(r => r.from.id === userId)?.id
        if (requestId) {
          setContactStatus(prev => ({ ...prev, [requestId]: true }))
        }
      }
    } catch (err) {
      console.error("Error:", err)
      alert("حدث خطأ غير متوقع")
    }
  }

  const handleAcceptRequest = async (requestId: string, reply?: string) => {
    // منع النقر المتكرر
    if (processingIds.has(requestId)) return
    setProcessingIds(prev => new Set(prev).add(requestId))
    
    try {
      const updateData: Record<string, any> = { status: "accepted", updated_at: new Date().toISOString() }
      if (reply) {
        updateData.reply = reply
      }

      const { error } = await supabase
        .from("requests")
        .update(updateData)
        .eq("id", requestId)

      if (!error) {
        setReplyTexts(prev => ({ ...prev, [requestId]: "" }))
        setOpenReplyBoxes(prev => ({ ...prev, [requestId]: false }))
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

  const handleRejectRequest = async (requestId: string, reply?: string) => {
    // منع النقر المتكرر
    if (processingIds.has(requestId)) return
    setProcessingIds(prev => new Set(prev).add(requestId))
    
    try {
      const updateData: Record<string, any> = { status: "rejected", updated_at: new Date().toISOString() }
      if (reply) {
        updateData.reply = reply
      }

      const { error } = await supabase
        .from("requests")
        .update(updateData)
        .eq("id", requestId)

      if (!error) {
        setReplyTexts(prev => ({ ...prev, [requestId]: "" }))
        setOpenReplyBoxes(prev => ({ ...prev, [requestId]: false }))
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

  // قبول جميع الطلبات المعلقة
  const handleAcceptAll = async () => {
    const pendingRequests = receivedRequests.filter(r => r.status === "pending")
    if (pendingRequests.length === 0) return

    if (!confirm(`هل أنت متأكد من قبول ${pendingRequests.length} طلب؟`)) return

    setProcessingAll(true)
    try {
      await Promise.all(
        pendingRequests.map(request =>
          supabase
            .from("requests")
            .update({ status: "accepted", updated_at: new Date().toISOString() })
            .eq("id", request.id)
        )
      )
      loadRequests()
    } catch (err) {
      console.error("Error accepting all:", err)
      alert("حدث خطأ أثناء قبول الطلبات")
    } finally {
      setProcessingAll(false)
    }
  }

  // رفض جميع الطلبات المعلقة
  const handleRejectAll = async () => {
    const pendingRequests = receivedRequests.filter(r => r.status === "pending")
    if (pendingRequests.length === 0) return

    if (!confirm(`هل أنت متأكد من رفض ${pendingRequests.length} طلب؟`)) return

    setProcessingAll(true)
    try {
      await Promise.all(
        pendingRequests.map(request =>
          supabase
            .from("requests")
            .update({ status: "rejected", updated_at: new Date().toISOString() })
            .eq("id", request.id)
        )
      )
      loadRequests()
    } catch (err) {
      console.error("Error rejecting all:", err)
      alert("حدث خطأ أثناء رفض الطلبات")
    } finally {
      setProcessingAll(false)
    }
  }

  // ترتيب الطلبات حسب آخر تحديث (آخر رد بالأعلى)
  const sortByLatestActivity = (requests: Request[]) => {
    return [...requests].sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.createdAt).getTime()
      const dateB = new Date(b.updatedAt || b.createdAt).getTime()
      return dateB - dateA // الأحدث أولاً
    })
  }

  const sentRequests = sortByLatestActivity(requests.filter((r) => r.type === "sent"))
  const receivedRequests = sortByLatestActivity(requests.filter((r) => r.type === "received"))
  const pendingCount = receivedRequests.filter(r => r.status === "pending").length

  // عدد الطلبات التي لها ردود جديدة (للمرسلة)
  const sentWithReplies = sentRequests.filter(r => r.reply).length
  // عدد الطلبات التي تحتاج رد (للواردة) - مقبولة/مرفوضة بدون رد
  const needsReplyCount = receivedRequests.filter(r => r.status !== "pending" && !r.reply).length

  const detectDirection = (text?: string) => {
    if (!text) return "auto" as const
    const hasArabic = /[\u0600-\u06FF]/.test(text)
    const hasLatin = /[A-Za-z]/.test(text)
    if (hasArabic && !hasLatin) return "rtl" as const
    if (hasLatin && !hasArabic) return "ltr" as const
    return "auto" as const
  }

  const getStatusBadge = (status: Request["status"]) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="bg-amber-500/20 text-amber-600 border-amber-500/30">
            <ClockIcon className="ml-1 h-3 w-3" />
            معلق
          </Badge>
        )
      case "accepted":
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircleIcon className="ml-1 h-3 w-3" />
            مقبول
          </Badge>
        )
      case "rejected":
        return (
          <Badge variant="destructive">
            <XCircleIcon className="ml-1 h-3 w-3" />
            مرفوض
          </Badge>
        )
    }
  }

  const getRequestTypeInfo = (type?: string) => {
    const types: Record<string, { label: string; icon: any; color: string }> = {
      whatsapp: { label: "واتساب", icon: MessageSquareIcon, color: "text-green-500" },
      x: { label: "X (تويتر)", icon: MessageSquareIcon, color: "text-blue-400" },
      snapchat: { label: "سناب شات", icon: MessageSquareIcon, color: "text-yellow-400" },
      marriage: { label: "دعوة زواج", icon: HeartIcon, color: "text-pink-500" },
      meeting: { label: "اجتماع", icon: UsersIcon, color: "text-purple-500" },
      callback: { label: "رد على الاتصال", icon: PhoneIcon, color: "text-emerald-500" },
      reminder: { label: "تذكير بموعد", icon: BellIcon, color: "text-orange-500" },
    }
    return types[type || "whatsapp"] || types.whatsapp
  }

  const RequestCard = ({ request, index }: { request: Request; index: number }) => {
    const isReplyOpen = openReplyBoxes[request.id] || false
    const replyText = replyTexts[request.id] || ""

    return (
      <Card
        className="hover:border-primary/50 hover:shadow-lg transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
        style={{ animationDelay: `${index * 50}ms` }}
      >
        <CardContent className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 flex-row-reverse text-right">
            <div className="flex items-center gap-3 flex-row-reverse text-right">
              <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                <AvatarImage src={request.type === "sent" ? request.to.avatar : request.from.avatar} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                  {request.type === "sent" ? request.to.name[0] : request.from.name[0]}
                </AvatarFallback>
              </Avatar>
              <div className="text-right">
                <p className="font-semibold text-lg">{request.type === "sent" ? request.to.name : request.from.name}</p>
                <p className="text-xs text-muted-foreground">
                  {request.type === "sent" ? "مرسل إلى" : "مستلم من"} • {formatDateTime(request.createdAt)}
                </p>
              </div>
            </div>
            {getStatusBadge(request.status)}
          </div>

          {/* Request Type Badge */}
          {request.requestType && (
            <div className="mt-3 flex items-center gap-2 justify-end flex-row-reverse text-right">
              {(() => {
                const typeInfo = getRequestTypeInfo(request.requestType)
                const Icon = typeInfo.icon
                return (
                  <Badge variant="outline" className="gap-1 px-3 py-1">
                    <Icon className={`h-4 w-4 ${typeInfo.color}`} />
                    <span>{typeInfo.label}</span>
                  </Badge>
                )
              })()}
            </div>
          )}

          {/* Message */}
          <div className="mt-4 p-4 bg-muted/50 rounded-lg border">
            <p className="text-sm leading-relaxed">{request.message}</p>
          </div>

          {/* Reply if exists */}
          {request.reply && (
            <div className="mt-3 p-4 bg-green-500/10 rounded-lg border border-green-500/20">
              <p className="text-xs font-medium text-green-600 mb-2">💬 الرد:</p>
              <p
                className="text-sm"
                dir={detectDirection(request.reply)}
                style={{
                  unicodeBidi: "plaintext",
                  direction: detectDirection(request.reply),
                  textAlign: detectDirection(request.reply) === "rtl" ? "right" : "left",
                }}
              >
                {request.reply}
              </p>
            </div>
          )}

          {/* Status Update Time */}
          {request.status !== "pending" && (
            <p className="mt-3 text-xs text-muted-foreground">
              تم الرد: {formatDateTime(request.updatedAt)}
            </p>
          )}

          {/* Actions for received requests */}
          {request.type === "received" && (
            <div className="mt-4 space-y-3">
              {/* Pending Actions */}
              {request.status === "pending" && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    className="flex-1 bg-green-500 hover:bg-green-600"
                    disabled={processingIds.has(request.id)}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleAcceptRequest(request.id)
                    }}
                  >
                    {processingIds.has(request.id) ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-1" />
                    ) : (
                      <CheckCircleIcon className="ml-1 h-4 w-4" />
                    )}
                    قبول
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    className="flex-1"
                    disabled={processingIds.has(request.id)}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleRejectRequest(request.id)
                    }}
                  >
                    {processingIds.has(request.id) ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-1" />
                    ) : (
                      <XCircleIcon className="ml-1 h-4 w-4" />
                    )}
                    رفض
                  </Button>
                </div>
              )}

              {/* Reply Box for non-pending */}
              {request.status !== "pending" && !request.reply && (
                <>
                  {isReplyOpen ? (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                      <Input
                        placeholder="اكتب ردك هنا..."
                        value={replyText}
                        onChange={(e) => setReplyTexts(prev => ({ ...prev, [request.id]: e.target.value }))}
                        type="text"
                        inputMode="text"
                        dir={detectDirection(replyText)}
                        style={{
                          direction: detectDirection(replyText),
                          unicodeBidi: "plaintext",
                          textAlign: detectDirection(replyText) === "rtl" ? "right" : "left",
                        }}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1"
                          disabled={!replyText.trim()}
                          onClick={async () => {
                            try {
                              const { data: { session } } = await supabase.auth.getSession()
                              if (!session) {
                                alert("يجب تسجيل الدخول أولاً")
                                return
                              }

                              const response = await fetch("/api/requests/reply", {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                  "Authorization": `Bearer ${session.access_token}`,
                                },
                                body: JSON.stringify({
                                  request_id: request.id,
                                  reply: replyText.trim(),
                                }),
                              })

                              const result = await response.json()

                              if (!response.ok) {
                                alert(`خطأ: ${result.error || "حدث خطأ أثناء إرسال الرد"}`)
                              } else {
                                if (result.notificationSent) {
                                  alert(`تم إرسال الرد بنجاح! ✅\nتم إرسال إشعار للمرسل (ID: ${result.notificationId})`)
                                } else {
                                  alert(`تم إرسال الرد ✅ لكن فشل الإشعار ❌\nالخطأ: ${result.notificationError}\nSender ID: ${result.senderId}`)
                                }
                                setOpenReplyBoxes(prev => ({ ...prev, [request.id]: false }))
                                setReplyTexts(prev => ({ ...prev, [request.id]: "" }))
                                loadRequests()
                              }
                            } catch (err) {
                              alert(`خطأ غير متوقع: ${err}`)
                            }
                          }}
                        >
                          <SendIcon className="ml-1 h-4 w-4" />
                          إرسال الرد
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setOpenReplyBoxes(prev => ({ ...prev, [request.id]: false }))
                            setReplyTexts(prev => ({ ...prev, [request.id]: "" }))
                          }}
                        >
                          إلغاء
                        </Button>
                      </div>
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

              {/* Add to contacts */}
              {!contactStatus[request.id] && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full gap-1 hover:bg-primary hover:text-primary-foreground transition-all duration-300"
                  onClick={() => handleAddContact(request.from.id, request.from.name)}
                >
                  <UserPlusIcon className="h-4 w-4" />
                  حفظ في جهات الاتصال
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="space-y-6 animate-in fade-in duration-500 text-right"
      dir="rtl"
      style={{ direction: "rtl", textAlign: "right" }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">الطلبات</h1>
          <p className="text-muted-foreground">إدارة الطلبات المرسلة والواردة</p>
        </div>

        {/* Bulk Actions */}
        {pendingCount > 0 && (
          <div className="flex gap-2 animate-in fade-in slide-in-from-left-4 duration-500">
            <Button
              size="sm"
              className="bg-green-500 hover:bg-green-600"
              onClick={handleAcceptAll}
              disabled={processingAll}
            >
              <CheckCircleIcon className="ml-1 h-4 w-4" />
              قبول الكل ({pendingCount})
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleRejectAll}
              disabled={processingAll}
            >
              <XCircleIcon className="ml-1 h-4 w-4" />
              رفض الكل
            </Button>
          </div>
        )}
      </div>

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-12">
          <TabsTrigger value="received" className="gap-2 text-base">
            <InboxIcon className="h-5 w-5" />
            الواردة ({receivedRequests.length})
            {pendingCount > 0 && (
              <Badge variant="destructive" className="mr-1 h-5 w-5 p-0 justify-center">
                {pendingCount}
              </Badge>
            )}
            {needsReplyCount > 0 && (
              <Badge variant="secondary" className="mr-1 h-5 min-w-5 px-1 justify-center">
                💬 {needsReplyCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="sent" className="gap-2 text-base">
            <SendIcon className="h-5 w-5" />
            المرسلة ({sentRequests.length})
            {sentWithReplies > 0 && (
              <Badge className="mr-1 h-5 min-w-5 px-1 justify-center bg-green-500">
                ✅ {sentWithReplies}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="received" className="space-y-4 mt-6">
          {receivedRequests.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-12 text-center">
                <InboxIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-lg font-medium text-muted-foreground">لا توجد طلبات واردة</p>
                <p className="text-sm text-muted-foreground/70 mt-1">ستظهر الطلبات هنا عندما يرسل لك أحد طلباً</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {receivedRequests.map((request, index) => (
                <RequestCard key={request.id} request={request} index={index} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sent" className="space-y-4 mt-6">
          {sentRequests.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-12 text-center">
                <SendIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-lg font-medium text-muted-foreground">لا توجد طلبات مرسلة</p>
                <p className="text-sm text-muted-foreground/70 mt-1">أرسل طلباً جديداً من صفحة جهات الاتصال</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {sentRequests.map((request, index) => (
                <RequestCard key={request.id} request={request} index={index} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
