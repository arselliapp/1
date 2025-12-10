"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { 
  ClockIcon, CheckCircleIcon, XCircleIcon, BellIcon, 
  CalendarIcon, SendIcon, InboxIcon, MessageSquareIcon 
} from "@/components/icons"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/components/toast-notification"

interface Reminder {
  id: string
  sender_id: string
  recipient_id: string
  reminder_type: string
  title: string
  description?: string
  event_date: string
  location?: string
  remind_before_hours: number[]
  status: "pending" | "accepted" | "declined" | "expired"
  response_message?: string
  responded_at?: string
  linked_conversation_id?: string
  created_at: string
  type_info: { label: string; emoji: string }
  sender?: { id: string; name: string; avatar?: string }
  recipient?: { id: string; name: string; avatar?: string }
  is_sent: boolean
  is_past: boolean
}

// خيارات التذكير للمواعيد العادية (بالساعات)
const REMIND_OPTIONS = [
  { value: 1, label: "قبل ساعة" },
  { value: 3, label: "قبل 3 ساعات" },
  { value: 24, label: "قبل يوم" },
  { value: 168, label: "قبل أسبوع" },
]

// خيارات التذكير للاتصال (بالدقائق - قيم سالبة للتمييز)
const CALLBACK_REMIND_OPTIONS = [
  { value: -5, label: "بعد 5 دقائق", minutes: 5 },
  { value: -10, label: "بعد 10 دقائق", minutes: 10 },
  { value: -15, label: "بعد ربع ساعة", minutes: 15 },
  { value: -30, label: "بعد نصف ساعة", minutes: 30 },
  { value: -60, label: "بعد ساعة", minutes: 60 },
]

export default function RemindersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const defaultTab = searchParams?.get("tab") || "upcoming"
  const { user } = useAuth()
  const { showToast } = useToast()

  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState(defaultTab)
  const [responseDialog, setResponseDialog] = useState<{
    show: boolean
    reminder: Reminder | null
    action: "accept" | "decline"
    selectedHours: number[]
    message: string
  }>({ show: false, reminder: null, action: "accept", selectedHours: [], message: "" })

  const [counts, setCounts] = useState({ upcoming: 0, pending: 0, sent: 0 })

  useEffect(() => {
    if (user) loadReminders()
  }, [user])

  // تحديث التبويب عند تغيير الرابط
  useEffect(() => {
    const tab = searchParams?.get("tab")
    if (tab) setActiveTab(tab)
  }, [searchParams])

  // الاستماع لحدث إشعار جديد وتحديث البيانات
  useEffect(() => {
    const handleNewNotification = () => {
      loadReminders()
    }
    window.addEventListener('newNotification', handleNewNotification)
    return () => window.removeEventListener('newNotification', handleNewNotification)
  }, [user])

  const loadReminders = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch("/api/reminders", {
        headers: { "Authorization": `Bearer ${session.access_token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setReminders(data.reminders || [])
        setCounts(data.counts || { upcoming: 0, pending: 0, sent: 0 })
      }
    } catch (err) {
      console.error("Error loading reminders:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleResponse = async () => {
    if (!responseDialog.reminder) return
    setProcessingId(responseDialog.reminder.id)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch("/api/reminders", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          reminder_id: responseDialog.reminder.id,
          status: responseDialog.action === "accept" ? "accepted" : "declined",
          response_message: responseDialog.message,
          remind_before_hours: responseDialog.action === "accept" ? responseDialog.selectedHours : undefined
        })
      })

      if (response.ok) {
        showToast({
          title: responseDialog.action === "accept" ? "✅ تم القبول" : "❌ تم الاعتذار",
          message: responseDialog.action === "accept" 
            ? "تم قبول الدعوة وسيتم تذكيرك قبل الموعد" 
            : "تم إرسال اعتذارك",
          type: "success"
        })
        loadReminders()
        setResponseDialog({ show: false, reminder: null, action: "accept", selectedHours: [], message: "" })
      }
    } catch (err) {
      console.error("Error:", err)
      showToast({ title: "❌ خطأ", message: "حدث خطأ أثناء الإرسال", type: "error" })
    } finally {
      setProcessingId(null)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("ar-SA", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("ar-SA", {
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  const getTimeRemaining = (dateString: string) => {
    const eventDate = new Date(dateString)
    const now = new Date()
    const diff = eventDate.getTime() - now.getTime()

    if (diff < 0) return "انتهى"

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

    if (days > 0) return `بعد ${days} يوم`
    if (hours > 0) return `بعد ${hours} ساعة`
    return "قريباً جداً"
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-amber-500/20 text-amber-500"><ClockIcon className="ml-1 h-3 w-3" />في الانتظار</Badge>
      case "accepted":
        return <Badge className="bg-green-500"><CheckCircleIcon className="ml-1 h-3 w-3" />مقبول</Badge>
      case "declined":
        return <Badge variant="destructive"><XCircleIcon className="ml-1 h-3 w-3" />معتذر</Badge>
      case "expired":
        return <Badge variant="secondary">انتهى</Badge>
      default:
        return null
    }
  }

  // ترتيب حسب التاريخ (الأقرب أولاً للقادمة، الأحدث أولاً للباقي)
  const sortByDateAsc = (a: Reminder, b: Reminder) => 
    new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
  const sortByDateDesc = (a: Reminder, b: Reminder) => 
    new Date(b.event_date).getTime() - new Date(a.event_date).getTime()

  // تنبيهات قادمة (مقبولة + لم تنتهي + واردة) - مرتبة بالأقرب أولاً
  const upcoming = reminders
    .filter(r => !r.is_past && r.status === "accepted" && !r.is_sent)
    .sort(sortByDateAsc)
  
  // تنبيهات معلقة (بانتظار الرد + واردة) - مرتبة بالأقرب أولاً
  const pending = reminders
    .filter(r => r.status === "pending" && !r.is_sent)
    .sort(sortByDateAsc)
  
  // تنبيهات مرسلة (جميعها) - مرتبة بالأحدث أولاً
  const sent = reminders
    .filter(r => r.is_sent)
    .sort(sortByDateDesc)
  
  // السجل: التنبيهات الواردة المنتهية أو المرفوضة (بدون المرسلة) - مرتبة بالأحدث أولاً
  const history = reminders
    .filter(r => 
      !r.is_sent && (
        r.is_past ||
        r.status === "declined" ||
        r.status === "expired"
      )
    )
    .sort(sortByDateDesc)

  // تغيير التبويب
  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    router.push(`/reminders?tab=${tab}`, { scroll: false })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  const ReminderCard = ({ reminder, showActions = false }: { reminder: Reminder; showActions?: boolean }) => (
    <Card className={`${reminder.is_past ? "opacity-60" : ""} ${reminder.status === "pending" && !reminder.is_sent ? "border-amber-500/50 bg-amber-500/5" : ""}`}>
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="text-4xl">{reminder.type_info.emoji}</div>
            <div>
              <h3 className="font-semibold text-lg">{reminder.title}</h3>
              <p className="text-sm text-muted-foreground">
                {reminder.is_sent ? `إلى: ${reminder.recipient?.name}` : `من: ${reminder.sender?.name}`}
              </p>
            </div>
          </div>
          {getStatusBadge(reminder.status)}
        </div>

        {/* Description - يظهر كـ "الغرض منه" للاجتماعات */}
        {reminder.description && (
          <div className="mt-3">
            <p className="text-xs text-muted-foreground mb-1">
              {reminder.reminder_type === "meeting" ? "📌 الغرض منه:" : "📝 الوصف:"}
            </p>
            <p className="text-sm text-muted-foreground">{reminder.description}</p>
          </div>
        )}

        {/* Event Details - لا تظهر للاتصال */}
        {reminder.reminder_type !== "callback" ? (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <CalendarIcon className="h-4 w-4 text-primary" />
              <span>{formatDate(reminder.event_date)}</span>
              <span className="text-muted-foreground">•</span>
              <span>{formatTime(reminder.event_date)}</span>
            </div>
            {reminder.location && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-lg">📍</span>
                <span>{reminder.location}</span>
              </div>
            )}
            {!reminder.is_past && reminder.status === "accepted" && (
              <div className="flex items-center gap-2 text-sm text-primary font-medium">
                <BellIcon className="h-4 w-4" />
                <span>{getTimeRemaining(reminder.event_date)}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-4 p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
            <p className="text-sm text-blue-600">📞 تذكير برد على الاتصال</p>
          </div>
        )}

        {/* Response Message */}
        {reminder.response_message && (
          <div className="mt-3 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
            <p className="text-xs text-green-600 mb-1">💬 الرد:</p>
            <p className="text-sm">{reminder.response_message}</p>
          </div>
        )}

        {/* Actions */}
        {showActions && reminder.status === "pending" && !reminder.is_sent && (
          <div className="mt-4 flex gap-2">
            <Button
              className="flex-1 bg-green-500 hover:bg-green-600"
              disabled={processingId === reminder.id}
              onClick={() => setResponseDialog({
                show: true,
                reminder,
                action: "accept",
                selectedHours: [],
                message: ""
              })}
            >
              <CheckCircleIcon className="ml-1 h-4 w-4" />
              قبول + تذكير
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              disabled={processingId === reminder.id}
              onClick={() => setResponseDialog({
                show: true,
                reminder,
                action: "decline",
                selectedHours: [],
                message: ""
              })}
            >
              <XCircleIcon className="ml-1 h-4 w-4" />
              اعتذار
            </Button>
          </div>
        )}

        {/* Go to Chat */}
        {reminder.linked_conversation_id && (
          <Link href={`/chat/${reminder.linked_conversation_id}`}>
            <Button variant="outline" className="w-full mt-3">
              <MessageSquareIcon className="ml-1 h-4 w-4" />
              فتح المحادثة
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6" dir="rtl">
      {/* Response Dialog */}
      {responseDialog.show && responseDialog.reminder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-background border rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-lg font-bold mb-2">
              {responseDialog.action === "accept" ? "✅ قبول الدعوة" : "❌ الاعتذار عن الدعوة"}
            </h3>
            <p className="text-muted-foreground mb-4">{responseDialog.reminder.title}</p>

            {responseDialog.action === "accept" && (
              <div className="mb-4">
                {responseDialog.reminder.reminder_type === "callback" ? (
                  <>
                    <p className="text-sm font-medium mb-2">⏰ ذكرني بعد:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {CALLBACK_REMIND_OPTIONS.map(opt => (
                        <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={responseDialog.selectedHours.includes(opt.value)}
                            onCheckedChange={(checked) => {
                              setResponseDialog(prev => ({
                                ...prev,
                                selectedHours: checked
                                  ? [...prev.selectedHours, opt.value]
                                  : prev.selectedHours.filter(h => h !== opt.value)
                              }))
                            }}
                          />
                          <span className="text-sm">{opt.label}</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      📞 سيتم تذكيرك برد الاتصال بعد الوقت المحدد
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium mb-2">🔔 ذكرني قبل:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {REMIND_OPTIONS.map(opt => (
                        <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={responseDialog.selectedHours.includes(opt.value)}
                            onCheckedChange={(checked) => {
                              setResponseDialog(prev => ({
                                ...prev,
                                selectedHours: checked
                                  ? [...prev.selectedHours, opt.value]
                                  : prev.selectedHours.filter(h => h !== opt.value)
                              }))
                            }}
                          />
                          <span className="text-sm">{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="mb-4">
              <p className="text-sm font-medium mb-2">💬 رسالة (اختياري):</p>
              <Textarea
                placeholder={responseDialog.action === "accept" ? "مبروك! إن شاء الله نحضر 🎉" : "شكراً على الدعوة، للأسف لن أتمكن..."}
                value={responseDialog.message}
                onChange={(e) => setResponseDialog(prev => ({ ...prev, message: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="flex gap-3">
              <Button
                className={`flex-1 ${responseDialog.action === "accept" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}
                onClick={handleResponse}
                disabled={processingId !== null}
              >
                {processingId ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  responseDialog.action === "accept" ? "قبول" : "اعتذار"
                )}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setResponseDialog({ show: false, reminder: null, action: "accept", selectedHours: [], message: "" })}
              >
                إلغاء
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            📅 التنبيهات
            {counts.pending > 0 && (
              <Badge variant="destructive">{counts.pending}</Badge>
            )}
          </h1>
          <p className="text-muted-foreground text-sm">المواعيد والدعوات</p>
        </div>
        <Link href="/send-reminder">
          <Button>
            <SendIcon className="ml-1 h-4 w-4" />
            إرسال تنبيه
          </Button>
        </Link>
      </div>

      {/* Stats - قابلة للضغط */}
      <div className="grid grid-cols-3 gap-3">
        <Card 
          className="bg-amber-500/10 border-amber-500/30 cursor-pointer hover:scale-[1.02] transition-transform"
          onClick={() => handleTabChange("pending")}
        >
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-amber-500">{counts.pending}</p>
            <p className="text-xs text-muted-foreground">بانتظار الرد</p>
          </CardContent>
        </Card>
        <Card 
          className="bg-green-500/10 border-green-500/30 cursor-pointer hover:scale-[1.02] transition-transform"
          onClick={() => handleTabChange("upcoming")}
        >
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-green-500">{counts.upcoming}</p>
            <p className="text-xs text-muted-foreground">مواعيد قادمة</p>
          </CardContent>
        </Card>
        <Card 
          className="bg-blue-500/10 border-blue-500/30 cursor-pointer hover:scale-[1.02] transition-transform"
          onClick={() => handleTabChange("sent")}
        >
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-blue-500">{counts.sent}</p>
            <p className="text-xs text-muted-foreground">مرسلة</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-12">
          <TabsTrigger value="upcoming" className="text-xs sm:text-sm">
            🗓️ القادمة
            {upcoming.length > 0 && <Badge className="mr-1 h-5 w-5 p-0 justify-center bg-green-500">{upcoming.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="pending" className="text-xs sm:text-sm">
            ⏳ معلقة
            {pending.length > 0 && <Badge variant="destructive" className="mr-1 h-5 w-5 p-0 justify-center">{pending.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="sent" className="text-xs sm:text-sm">
            📤 مرسلة
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs sm:text-sm">
            📋 السجل
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4 mt-6">
          {upcoming.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-12 text-center">
                <CalendarIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-lg font-medium text-muted-foreground">لا توجد مواعيد قادمة</p>
              </CardContent>
            </Card>
          ) : (
            upcoming.map(r => <ReminderCard key={r.id} reminder={r} />)
          )}
        </TabsContent>

        <TabsContent value="pending" className="space-y-4 mt-6">
          {pending.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-12 text-center">
                <InboxIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-lg font-medium text-muted-foreground">لا توجد دعوات معلقة</p>
              </CardContent>
            </Card>
          ) : (
            pending.map(r => <ReminderCard key={r.id} reminder={r} showActions />)
          )}
        </TabsContent>

        <TabsContent value="sent" className="space-y-4 mt-6">
          {sent.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-12 text-center">
                <SendIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-lg font-medium text-muted-foreground">لم ترسل أي تنبيهات</p>
              </CardContent>
            </Card>
          ) : (
            sent.map(r => <ReminderCard key={r.id} reminder={r} />)
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4 mt-6">
          {history.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-12 text-center">
                <ClockIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-lg font-medium text-muted-foreground">لا يوجد سجل</p>
                <p className="text-sm text-muted-foreground/70 mt-1">التنبيهات المنتهية أو المرفوضة ستظهر هنا</p>
              </CardContent>
            </Card>
          ) : (
            history.map(r => <ReminderCard key={r.id} reminder={r} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
