"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SendIcon, SearchIcon, UserIcon, MessageSquareIcon, PhoneIcon, CalendarIcon, HeartIcon, UsersIcon, BellIcon } from "@/components/icons"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/components/toast-notification"

interface Contact {
  id: string
  contact_user_id: string
  name: string
  phone: string
  avatar?: string
}

const requestTypes = [
  { value: "whatsapp", label: "واتساب", icon: MessageSquareIcon, color: "text-green-500" },
  { value: "x", label: "X (تويتر)", icon: MessageSquareIcon, color: "text-blue-400" },
  { value: "snapchat", label: "سناب شات", icon: MessageSquareIcon, color: "text-yellow-400" },
  { value: "marriage", label: "دعوة زواج", icon: HeartIcon, color: "text-pink-500" },
  { value: "meeting", label: "اجتماع", icon: UsersIcon, color: "text-purple-500" },
  { value: "callback", label: "رد على الاتصال", icon: PhoneIcon, color: "text-emerald-500" },
  { value: "reminder", label: "تذكير بموعد", icon: BellIcon, color: "text-orange-500" },
]

export default function SendRequestPage() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedContactId = searchParams.get("contact")
  const { showToast } = useToast()

  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [requestType, setRequestType] = useState<string>("")
  const [message, setMessage] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [showContactsList, setShowContactsList] = useState(false)

  useEffect(() => {
    if (user) {
      loadContacts()
    }
  }, [user])

  const loadContacts = async () => {
    if (!user) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "accepted")

      if (error) {
        console.error("Error loading contacts:", error)
        setLoading(false)
        return
      }

      const contactsWithDetails = await Promise.all(
        (data || []).map(async (contact) => {
          const { data: result } = await supabase
            .rpc('search_user_by_id', { input_user_id: contact.contact_user_id })
          
          const userData = result && result.length > 0 ? result[0] : null
          
          return {
            id: contact.id,
            contact_user_id: contact.contact_user_id,
            name: userData?.full_name || "مستخدم",
            phone: userData?.phone_number || "",
            avatar: userData?.avatar_url
          }
        })
      )

      setContacts(contactsWithDetails)

      // إذا كان هناك جهة اتصال محددة مسبقاً
      if (preselectedContactId) {
        const preselected = contactsWithDetails.find(c => c.contact_user_id === preselectedContactId)
        if (preselected) {
          setSelectedContact(preselected)
        }
      }
    } catch (err) {
      console.error("Error loading contacts:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedContact || !requestType || !message.trim()) return

    setIsSubmitting(true)
    try {
      // الحصول على الـ session والـ token
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        showToast({
          type: "error",
          title: "⚠️ يجب تسجيل الدخول",
          message: "سجل دخولك أولاً لإرسال الطلبات"
        })
        setIsSubmitting(false)
        return
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      }
      
      // إرسال الـ token في header
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`
      }

      // استدعاء API لإرسال الطلب
      const response = await fetch("/api/requests", {
        method: "POST",
        headers,
        credentials: "include", // لإرسال الـ cookies
        body: JSON.stringify({
          recipient_id: selectedContact.contact_user_id,
          message: message.trim(),
          type: requestType,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        console.error("Error sending request:", result.error)
        showToast({
          type: "error",
          title: "❌ فشل إرسال الطلب",
          message: result.error || "حدث خطأ أثناء إرسال الطلب"
        })
        setIsSubmitting(false)
        return
      }

      // رسالة نجاح مخصصة حسب نوع الطلب
      const typeMessages: Record<string, string> = {
        whatsapp: "سيصل إشعار للمستلم بطلب الواتساب",
        x: "سيصل إشعار للمستلم بطلب المتابعة",
        snapchat: "سيصل إشعار للمستلم بطلب الإضافة",
        marriage: "سيصل إشعار للمستلم بدعوة الزواج",
        meeting: "سيصل إشعار للمستلم بطلب الاجتماع",
        callback: "سيصل إشعار للمستلم بطلب رد الاتصال",
        reminder: "سيصل إشعار للمستلم بالتذكير",
      }

      showToast({
        type: "success",
        title: "✅ تم إرسال الطلب بنجاح!",
        message: typeMessages[requestType] || "سيصل إشعار للمستلم قريباً",
        action: {
          label: "عرض الطلبات المرسلة",
          onClick: () => router.push("/requests?tab=sent")
        }
      })

      setMessage("")
      setSelectedContact(null)
      setRequestType("")
      
      // الانتقال بعد 2 ثانية
      setTimeout(() => {
        router.push("/requests?tab=sent")
      }, 2000)
    } catch (err) {
      console.error("Error:", err)
      showToast({
        type: "error",
        title: "❌ خطأ غير متوقع",
        message: "حدث خطأ، حاول مرة أخرى"
      })
      setIsSubmitting(false)
    }
  }

  const filteredContacts = contacts.filter(
    (contact) => contact.name.includes(searchQuery) || contact.phone.includes(searchQuery)
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">إرسال طلب جديد</h1>
        <p className="text-muted-foreground">أرسل طلباً لجهة اتصال من قائمتك</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>تفاصيل الطلب</CardTitle>
          <CardDescription>اختر جهة الاتصال ونوع الطلب واكتب رسالتك</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* اختيار جهة الاتصال */}
            <div className="space-y-2">
              <Label>اختر جهة الاتصال</Label>
              {selectedContact ? (
                <div className="flex items-center justify-between p-4 border rounded-lg bg-secondary/20">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={selectedContact.avatar || "/placeholder.svg"} />
                      <AvatarFallback>{selectedContact.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{selectedContact.name}</p>
                      <p className="text-sm text-muted-foreground" dir="ltr">{selectedContact.phone}</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedContact(null)}
                  >
                    تغيير
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setShowContactsList(!showContactsList)}
                  >
                    <UserIcon className="ml-2 h-4 w-4" />
                    اختر من جهات الاتصال
                  </Button>
                  {showContactsList && (
                    <div className="border rounded-lg p-4 space-y-2 max-h-64 overflow-y-auto">
                      <input
                        type="text"
                        placeholder="البحث..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-3 py-2 border rounded-md"
                      />
                      {filteredContacts.length === 0 ? (
                        <p className="text-center text-muted-foreground py-4">لا توجد جهات اتصال</p>
                      ) : (
                        filteredContacts.map((contact) => (
                          <button
                            key={contact.id}
                            type="button"
                            onClick={() => {
                              setSelectedContact(contact)
                              setShowContactsList(false)
                            }}
                            className="w-full flex items-center gap-3 p-3 hover:bg-secondary/50 rounded-lg transition-colors"
                          >
                            <Avatar>
                              <AvatarImage src={contact.avatar || "/placeholder.svg"} />
                              <AvatarFallback>{contact.name[0]}</AvatarFallback>
                            </Avatar>
                            <div className="text-right">
                              <p className="font-medium">{contact.name}</p>
                              <p className="text-sm text-muted-foreground" dir="ltr">{contact.phone}</p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* نوع الطلب */}
            <div className="space-y-2">
              <Label htmlFor="request-type">نوع الطلب</Label>
              <Select value={requestType} onValueChange={setRequestType}>
                <SelectTrigger id="request-type">
                  <SelectValue placeholder="اختر نوع الطلب" />
                </SelectTrigger>
                <SelectContent>
                  {requestTypes.map((type) => {
                    const Icon = type.icon
                    return (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${type.color}`} />
                          <span>{type.label}</span>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* رسالة الطلب */}
            <div className="space-y-2">
              <Label htmlFor="message">رسالة الطلب</Label>
              <Textarea
                id="message"
                placeholder="اكتب رسالتك هنا..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={!selectedContact || !requestType || !message.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <>جاري الإرسال...</>
              ) : (
                <>
                  <SendIcon className="ml-2 h-4 w-4" />
                  إرسال الطلب
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
