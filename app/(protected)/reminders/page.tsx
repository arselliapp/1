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
import { useLanguage } from "@/contexts/language-context"
import { useTranslations } from "@/lib/translations"

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

export default function RemindersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const defaultTab = searchParams?.get("tab") || "upcoming"
  const { user } = useAuth()
  const { showToast } = useToast()
  const { language } = useLanguage()
  const t = useTranslations(language)
  
  // خيارات التذكير للمواعيد العادية (بالساعات)
  const REMIND_OPTIONS = [
    { value: 1, label: t.remindBefore },
    { value: 3, label: t.remindBefore3 },
    { value: 24, label: t.remindBeforeDay },
    { value: 168, label: t.remindBeforeWeek },
  ]

  // خيارات التذكير للاتصال (بالدقائق - قيم سالبة للتمييز)
  const CALLBACK_REMIND_OPTIONS = [
    { value: -5, label: t.remindAfter5, minutes: 5 },
    { value: -10, label: t.remindAfter10, minutes: 10 },
    { value: -15, label: t.remindAfter15, minutes: 15 },
    { value: -30, label: t.remindAfter30, minutes: 30 },
    { value: -60, label: t.remindAfter60, minutes: 60 },
  ]

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
  const [deletingReminderId, setDeletingReminderId] = useState<string | null>(null)

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
          title: responseDialog.action === "accept" ? `✅ ${t.acceptSuccess}` : `❌ ${t.declineSuccess}`,
          message: responseDialog.action === "accept" ? t.acceptMessage : t.declineMessage,
          type: "success"
        })
        loadReminders()
        setResponseDialog({ show: false, reminder: null, action: "accept", selectedHours: [], message: "" })
      }
    } catch (err) {
      console.error("Error:", err)
      showToast({ title: `❌ ${t.error}`, message: t.unexpectedError, type: "error" })
    } finally {
      setProcessingId(null)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString(language === "ar" ? "ar-SA" : "en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString(language === "ar" ? "ar-SA" : "en-US", {
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  const formatDateTime = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString(language === "ar" ? "ar-SA" : "en-US", {
        dateStyle: "short",
        timeStyle: "short",
      })
    } catch {
      return dateString
    }
  }

  const getTimeRemaining = (dateString: string) => {
    const eventDate = new Date(dateString)
    const now = new Date()
    const diff = eventDate.getTime() - now.getTime()

    if (diff < 0) return t.expired

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

    if (days > 0) return t.afterDays.replace("{days}", days.toString())
    if (hours > 0) return t.afterHours.replace("{hours}", hours.toString())
    return t.soon
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-amber-500/20 text-amber-500"><ClockIcon className={`${language === "ar" ? "ml-1" : "mr-1"} h-3 w-3`} />{t.inWaiting}</Badge>
      case "accepted":
        return <Badge className="bg-green-500"><CheckCircleIcon className={`${language === "ar" ? "ml-1" : "mr-1"} h-3 w-3`} />{t.accepted}</Badge>
      case "declined":
        return <Badge variant="destructive"><XCircleIcon className={`${language === "ar" ? "ml-1" : "mr-1"} h-3 w-3`} />{t.declined}</Badge>
      case "expired":
        return <Badge variant="secondary">{t.expired}</Badge>
      default:
        return null
    }
  }

  // ترتيب حسب التاريخ
  const sortByEventDateAsc = (a: Reminder, b: Reminder) => 
    new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
  const sortByCreatedDesc = (a: Reminder, b: Reminder) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  const sortByRespondedDesc = (a: Reminder, b: Reminder) => {
    const dateA = a.responded_at ? new Date(a.responded_at).getTime() : new Date(a.created_at).getTime()
    const dateB = b.responded_at ? new Date(b.responded_at).getTime() : new Date(b.created_at).getTime()
    return dateB - dateA
  }

  // تنبيهات قادمة (مقبولة + لم تنتهي + واردة) - مرتبة بالأقرب أولاً
  const upcoming = reminders
    .filter(r => !r.is_past && r.status === "accepted" && !r.is_sent)
    .sort(sortByEventDateAsc)
  
  // تنبيهات معلقة (بانتظار الرد + واردة) - مرتبة بالأحدث أولاً (آخر تحديث)
  const pending = reminders
    .filter(r => r.status === "pending" && !r.is_sent)
    .sort(sortByCreatedDesc)
  
  // تنبيهات مرسلة (جميعها) - مرتبة بالأحدث أولاً
  const sent = reminders
    .filter(r => r.is_sent)
    .sort(sortByCreatedDesc)
  
  // السجل: جميع التنبيهات مرتبة بالأحدث
  const history = reminders
    .slice()
    .sort(sortByCreatedDesc)

  // تغيير التبويب
  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    router.push(`/reminders?tab=${tab}`, { scroll: false })
  }

  const handleDeleteReminder = async (reminderId: string) => {
    try {
      setDeletingReminderId(reminderId)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        showToast({ title: "تنبيه", message: "الرجاء تسجيل الدخول", type: "warning" })
        return
      }

      const response = await fetch(`/api/reminders/${reminderId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        showToast({ title: "تم الحذف", message: "تم حذف التنبيه للجميع", type: "success" })
        await loadReminders()
      } else {
        const text = await response.text()
        console.error("Failed to delete reminder:", text)
        showToast({ title: "خطأ", message: "تعذّر حذف التنبيه", type: "error" })
      }
    } catch (err) {
      console.error("Error deleting reminder:", err)
      showToast({ title: "خطأ", message: "حدث خطأ أثناء الحذف", type: "error" })
    } finally {
      setDeletingReminderId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  const ReminderCard = ({ reminder, showActions = false, showDelete = false }: { reminder: Reminder; showActions?: boolean; showDelete?: boolean }) => (
    <Card className={`text-right ${reminder.is_past ? "opacity-60" : ""} ${reminder.status === "pending" && !reminder.is_sent ? "border-amber-500/50 bg-amber-500/5" : ""}`}>
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-row-reverse">
          <div className="flex items-center gap-3 flex-row-reverse">
            <div className="text-4xl">{reminder.type_info.emoji}</div>
            <div className="text-right">
              <h3 className="font-semibold text-lg">{reminder.title}</h3>
              <p className="text-sm text-muted-foreground">
                {reminder.is_sent ? `إلى: ${reminder.recipient?.name}` : `من: ${reminder.sender?.name}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(reminder.status)}
            {showDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => handleDeleteReminder(reminder.id)}
                disabled={deletingReminderId === reminder.id}
              >
                {deletingReminderId === reminder.id ? (
                  <span className="w-4 h-4 border-2 border-destructive border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span className="text-lg">✕</span>
                )}
              </Button>
            )}
          </div>
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
          <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-2 text-right">
            <div className="flex items-center gap-2 text-sm flex-row-reverse">
              <CalendarIcon className="h-4 w-4 text-primary" />
              <span>{formatDate(reminder.event_date)}</span>
              <span className="text-muted-foreground">•</span>
              <span>{formatTime(reminder.event_date)}</span>
            </div>
            {reminder.location && (
              <div className="flex items-center gap-2 text-sm flex-row-reverse">
                <span className="text-lg">📍</span>
                <span>{reminder.location}</span>
              </div>
            )}
            {!reminder.is_past && reminder.status === "accepted" && (
              <div className="flex items-center gap-2 text-sm text-primary font-medium flex-row-reverse">
                <BellIcon className="h-4 w-4" />
                <span>{getTimeRemaining(reminder.event_date)}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-4 p-4 bg-blue-500/10 rounded-lg border border-blue-500/30 text-right">
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

        {/* Timestamps */}
        <div className="mt-3 text-xs text-muted-foreground space-y-1 text-right">
          <div>📤 أُرسِل: {formatDateTime(reminder.created_at)}</div>
          {reminder.responded_at && (
            <div>💬 رُدّ عليه: {formatDateTime(reminder.responded_at)}</div>
          )}
        </div>

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
    <div className={`space-y-6 ${language === "ar" ? "rtl" : "ltr"}`} dir={language === "ar" ? "rtl" : "ltr"}>
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
            📅 {t.remindersTitle}
            {counts.pending > 0 && (
              <Badge variant="destructive">{counts.pending}</Badge>
            )}
          </h1>
          <p className="text-muted-foreground text-sm">{language === "ar" ? "المواعيد والدعوات" : "Appointments and invitations"}</p>
        </div>
        <Link href="/send-reminder">
          <Button>
            <SendIcon className={`${language === "ar" ? "ml-1" : "mr-1"} h-4 h-4`} />
            {t.sendReminder}
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
            <p className="text-xs text-muted-foreground">{t.pending}</p>
          </CardContent>
        </Card>
        <Card 
          className="bg-green-500/10 border-green-500/30 cursor-pointer hover:scale-[1.02] transition-transform"
          onClick={() => handleTabChange("upcoming")}
        >
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-green-500">{counts.upcoming}</p>
            <p className="text-xs text-muted-foreground">{t.upcoming}</p>
          </CardContent>
        </Card>
        <Card 
          className="bg-blue-500/10 border-blue-500/30 cursor-pointer hover:scale-[1.02] transition-transform"
          onClick={() => handleTabChange("sent")}
        >
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-blue-500">{counts.sent}</p>
            <p className="text-xs text-muted-foreground">{t.sent}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-12">
          <TabsTrigger value="upcoming" className="text-xs sm:text-sm">
            🗓️ {t.upcoming}
            {upcoming.length > 0 && <Badge className={`${language === "ar" ? "mr-1" : "ml-1"} h-5 w-5 p-0 justify-center bg-green-500`}>{upcoming.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="pending" className="text-xs sm:text-sm">
            ⏳ {t.pending}
            {pending.length > 0 && <Badge variant="destructive" className={`${language === "ar" ? "mr-1" : "ml-1"} h-5 w-5 p-0 justify-center`}>{pending.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="sent" className="text-xs sm:text-sm">
            📤 {t.sent}
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs sm:text-sm">
            📋 {t.history}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4 mt-6">
          {upcoming.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-12 text-center">
                <CalendarIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-lg font-medium text-muted-foreground">{language === "ar" ? "لا توجد مواعيد قادمة" : "No upcoming appointments"}</p>
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
                <p className="text-lg font-medium text-muted-foreground">{language === "ar" ? "لا توجد دعوات معلقة" : "No pending invitations"}</p>
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
                <p className="text-lg font-medium text-muted-foreground">{language === "ar" ? "لم ترسل أي تنبيهات" : "No reminders sent"}</p>
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
                <p className="text-lg font-medium text-muted-foreground">{language === "ar" ? "لا يوجد سجل" : "No history"}</p>
                <p className="text-sm text-muted-foreground/70 mt-1">{language === "ar" ? "التنبيهات المنتهية أو المرفوضة ستظهر هنا" : "Expired or declined reminders will appear here"}</p>
              </CardContent>
            </Card>
          ) : (
            history.map(r => (
              <ReminderCard key={r.id} reminder={r} showDelete />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
