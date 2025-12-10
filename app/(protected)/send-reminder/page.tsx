"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Label } from "@/components/ui/label"
import { SendIcon, ArrowRightIcon, SearchIcon } from "@/components/icons"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/components/toast-notification"

// أنواع التنبيهات (بدون عيد ميلاد)
const REMINDER_TYPES = [
  { id: "wedding", label: "دعوة زواج", emoji: "💍", description: "دعوة لحضور حفل زواج", needsDetails: true },
  { id: "meeting", label: "اجتماع", emoji: "📅", description: "موعد اجتماع أو لقاء", needsDetails: true },
  { id: "callback", label: "رد على اتصال", emoji: "📞", description: "تذكير برد على مكالمة", needsDetails: false },
  { id: "event", label: "مناسبة", emoji: "🎉", description: "دعوة لمناسبة عامة", needsDetails: true },
  { id: "general", label: "تذكير عام", emoji: "⏰", description: "تذكير بموعد أو مهمة", needsDetails: true },
]

interface Contact {
  id: string
  name: string
  avatar?: string
  phone?: string
}

export default function SendReminderPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedUserId = searchParams?.get("to")
  const { user } = useAuth()
  const { showToast } = useToast()

  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  // حالة النموذج
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [eventDate, setEventDate] = useState("")
  const [eventTime, setEventTime] = useState("")
  const [location, setLocation] = useState("")

  useEffect(() => {
    if (user) loadContacts()
  }, [user])

  useEffect(() => {
    if (preselectedUserId && contacts.length > 0) {
      const contact = contacts.find(c => c.id === preselectedUserId)
      if (contact) setSelectedContact(contact)
    }
  }, [preselectedUserId, contacts])

  // تحديث العنوان تلقائياً عند اختيار نوع callback
  useEffect(() => {
    if (selectedType === "callback" && !title) {
      setTitle("تذكير برد على اتصال")
    }
  }, [selectedType])

  const loadContacts = async () => {
    try {
      const { data, error } = await supabase
        .from("contacts")
        .select("contact_user_id")
        .eq("user_id", user?.id)

      if (error) {
        setLoading(false)
        return
      }

      const contactIds = data?.map(c => c.contact_user_id) || []
      const contactsList: Contact[] = []

      await Promise.all(
        contactIds.map(async (id) => {
          const { data: userData } = await supabase.rpc("search_user_by_id", { input_user_id: id })
          if (userData && userData.length > 0) {
            contactsList.push({
              id,
              name: userData[0].full_name || "مستخدم",
              avatar: userData[0].avatar_url,
              phone: userData[0].phone_number
            })
          }
        })
      )

      setContacts(contactsList)
    } catch (err) {
      console.error("Error:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const typeInfo = REMINDER_TYPES.find(t => t.id === selectedType)
    const needsDetails = typeInfo?.needsDetails !== false

    if (!selectedContact || !selectedType || !title) {
      showToast({ title: "⚠️ تنبيه", message: "يرجى ملء الحقول المطلوبة", type: "error" })
      return
    }

    if (needsDetails && (!eventDate || !eventTime)) {
      showToast({ title: "⚠️ تنبيه", message: "يرجى تحديد التاريخ والوقت", type: "error" })
      return
    }

    setSending(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        showToast({ title: "⚠️ تنبيه", message: "يجب تسجيل الدخول", type: "error" })
        return
      }

      // للاتصال: استخدم الوقت الحالي + ساعة كوقت افتراضي
      let eventDateTime: Date
      if (needsDetails) {
        eventDateTime = new Date(`${eventDate}T${eventTime}`)
      } else {
        eventDateTime = new Date(Date.now() + 60 * 60 * 1000) // بعد ساعة
      }

      const response = await fetch("/api/reminders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          recipient_id: selectedContact.id,
          reminder_type: selectedType,
          title,
          description: needsDetails ? description : undefined,
          event_date: eventDateTime.toISOString(),
          location: needsDetails ? location : undefined,
          remind_before_hours: [] // لا تحديد مسبق
        })
      })

      if (response.ok) {
        showToast({
          title: "✅ تم الإرسال",
          message: `تم إرسال التنبيه لـ ${selectedContact.name}`,
          type: "success",
          action: {
            label: "عرض التنبيهات",
            onClick: () => router.push("/reminders?tab=sent")
          }
        })
        router.push("/reminders?tab=sent")
      } else {
        const data = await response.json()
        showToast({ title: "❌ خطأ", message: data.error || "حدث خطأ", type: "error" })
      }
    } catch (err) {
      console.error("Error:", err)
      showToast({ title: "❌ خطأ", message: "حدث خطأ غير متوقع", type: "error" })
    } finally {
      setSending(false)
    }
  }

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone?.includes(searchQuery)
  )

  const minDate = new Date().toISOString().split("T")[0]
  const selectedTypeInfo = REMINDER_TYPES.find(t => t.id === selectedType)
  const needsDetails = selectedTypeInfo?.needsDetails !== false

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
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowRightIcon className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">📤 إرسال تنبيه</h1>
          <p className="text-muted-foreground text-sm">أرسل دعوة أو تذكير</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Select Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">👤 اختر المستلم</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedContact ? (
              <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={selectedContact.avatar} />
                    <AvatarFallback>{selectedContact.name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{selectedContact.name}</p>
                    <p className="text-xs text-muted-foreground">{selectedContact.phone}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedContact(null)}>
                  تغيير
                </Button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <SearchIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="بحث في جهات الاتصال..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-10"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {filteredContacts.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">لا توجد جهات اتصال</p>
                  ) : (
                    filteredContacts.map(contact => (
                      <div
                        key={contact.id}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                        onClick={() => setSelectedContact(contact)}
                      >
                        <Avatar>
                          <AvatarImage src={contact.avatar} />
                          <AvatarFallback>{contact.name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{contact.name}</p>
                          <p className="text-xs text-muted-foreground">{contact.phone}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Select Type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">📋 نوع التنبيه</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {REMINDER_TYPES.map(type => (
                <div
                  key={type.id}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all text-center ${
                    selectedType === type.id
                      ? "border-primary bg-primary/10"
                      : "border-transparent bg-muted hover:border-muted-foreground/30"
                  }`}
                  onClick={() => {
                    setSelectedType(type.id)
                    // تعيين عنوان افتراضي للاتصال
                    if (type.id === "callback") {
                      setTitle("تذكير برد على اتصال")
                    } else if (title === "تذكير برد على اتصال") {
                      setTitle("")
                    }
                  }}
                >
                  <span className="text-3xl">{type.emoji}</span>
                  <p className="font-medium mt-2 text-sm">{type.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Step 3: Details (only if needed) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">📝 التفاصيل</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">العنوان *</Label>
              <Input
                id="title"
                placeholder={selectedType === "callback" ? "تذكير برد على اتصال" : "مثال: زواج أحمد"}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            {/* تظهر فقط للأنواع التي تحتاج تفاصيل */}
            {needsDetails && (
              <>
                <div>
                  <Label htmlFor="description">الوصف (اختياري)</Label>
                  <Textarea
                    id="description"
                    placeholder="تفاصيل إضافية..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="date">التاريخ *</Label>
                    <Input
                      id="date"
                      type="date"
                      min={minDate}
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      required={needsDetails}
                    />
                  </div>
                  <div>
                    <Label htmlFor="time">الوقت *</Label>
                    <Input
                      id="time"
                      type="time"
                      value={eventTime}
                      onChange={(e) => setEventTime(e.target.value)}
                      required={needsDetails}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="location">المكان (اختياري)</Label>
                  <Input
                    id="location"
                    placeholder="مثال: قاعة النخيل - الرياض"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>
              </>
            )}

            {/* رسالة للاتصال */}
            {selectedType === "callback" && (
              <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
                <p className="text-sm text-blue-600">
                  📞 سيتم إرسال تذكير فوري للمستلم برد على اتصالك
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit */}
        <Button
          type="submit"
          className="w-full h-12 text-lg"
          disabled={!selectedContact || !selectedType || !title || (needsDetails && (!eventDate || !eventTime)) || sending}
        >
          {sending ? (
            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <SendIcon className="ml-2 h-5 w-5" />
              إرسال التنبيه
            </>
          )}
        </Button>
      </form>
    </div>
  )
}
