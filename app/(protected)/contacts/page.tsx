"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { UserPlusIcon, SearchIcon, MessageSquareIcon, TrashIcon, SendIcon, CalendarIcon } from "@/components/icons"
import { AddContactModal } from "@/components/add-contact-modal"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/components/toast-notification"
import { useLanguage } from "@/contexts/language-context"
import { useTranslations } from "@/lib/translations"

interface Contact {
  id: string
  name: string
  phone: string
  avatar?: string
  contact_user_id: string
  is_online?: boolean
  last_seen?: string
}

export default function ContactsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { showToast } = useToast()
  const { language } = useLanguage()
  const t = useTranslations(language)
  const [searchQuery, setSearchQuery] = useState("")
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [startingChat, setStartingChat] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      loadContacts()
      const interval = setInterval(() => loadContacts(true), 15000)
      return () => clearInterval(interval)
    }
  }, [user])

  const loadContacts = async (silent = false) => {
    if (!user) return
    if (!silent) setLoading(true)
    
    try {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "accepted")

      if (error) {
        if (!silent) setLoading(false)
        return
      }

      const contactsWithDetails = await Promise.all(
        (data || []).map(async (contact) => {
          const { data: result } = await supabase
            .rpc('search_user_by_id', { input_user_id: contact.contact_user_id })

          const userData = result && result.length > 0 ? result[0] : null

          // جلب حالة الاتصال
          const { data: presence } = await supabase
            .from("user_presence")
            .select("is_online, last_seen")
            .eq("user_id", contact.contact_user_id)
            .single()

          return {
            id: contact.id,
            contact_user_id: contact.contact_user_id,
            name: userData?.full_name || (language === "ar" ? "مستخدم" : "User"),
            phone: userData?.phone_number || "",
            avatar: userData?.avatar_url,
            is_online: presence?.is_online || false,
            last_seen: presence?.last_seen
          }
        })
      )

      setContacts(contactsWithDetails)
    } catch (err) {
      console.error("Error loading contacts:", err)
    } finally {
      if (!silent) setLoading(false)
    }
  }

  const handleDeleteContact = async (contactId: string, contactName: string) => {
    showToast({
      title: `🗑️ ${t.deleteContact}`,
      message: t.deleteContactConfirm.replace("{name}", contactName),
      type: "info",
      action: {
        label: t.delete,
        onClick: async () => {
          const { error } = await supabase
            .from("contacts")
            .delete()
            .eq("id", contactId)

          if (!error) {
            showToast({ title: `✅ ${t.success}`, message: t.contactDeleted, type: "success" })
            loadContacts()
          }
        }
      }
    })
  }

  // بدء محادثة
  const handleStartChat = async (contactUserId: string) => {
    setStartingChat(contactUserId)
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        showToast({ title: `⚠️ ${t.error}`, message: t.loginRequired, type: "error" })
        return
      }

      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ other_user_id: contactUserId })
      })

      if (response.ok) {
        const data = await response.json()
        router.push(`/chat/${data.conversation_id}`)
      } else {
        showToast({ title: `❌ ${t.error}`, message: language === "ar" ? "فشل بدء المحادثة" : "Failed to start chat", type: "error" })
      }
    } catch (err) {
      console.error("Error starting chat:", err)
      showToast({ title: `❌ ${t.error}`, message: t.unexpectedError, type: "error" })
    } finally {
      setStartingChat(null)
    }
  }

  // إرسال تنبيه
  const handleSendReminder = (contactUserId: string) => {
    router.push(`/send-reminder?to=${contactUserId}`)
  }

  const filteredContacts = contacts.filter(
    (contact) => contact.name.includes(searchQuery) || contact.phone.includes(searchQuery)
  )

  // ترتيب: المتصلين أولاً
  const sortedContacts = [...filteredContacts].sort((a, b) => {
    if (a.is_online && !b.is_online) return -1
    if (!a.is_online && b.is_online) return 1
    return 0
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${language === "ar" ? "rtl" : "ltr"}`} dir={language === "ar" ? "rtl" : "ltr"}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">👥 {t.contactsTitle}</h1>
          <p className="text-muted-foreground">{contacts.length} {t.contactsCount}</p>
        </div>
        <AddContactModal />
      </div>

      <div className="relative">
        <SearchIcon className={`absolute ${language === "ar" ? "right-3" : "left-3"} top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground`} />
        <Input
          placeholder={t.searchContacts}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={language === "ar" ? "pr-10" : "pl-10"}
        />
      </div>

      <div className="space-y-4">
        {sortedContacts.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <UserPlusIcon className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                {searchQuery ? t.noResults : t.noContacts}
              </p>
              {!searchQuery && <AddContactModal />}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sortedContacts.map((contact, index) => (
              <Card
                key={contact.id}
                className="group hover:border-primary/50 hover:shadow-lg transition-all duration-300"
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={contact.avatar} />
                        <AvatarFallback className="text-lg">{contact.name[0]}</AvatarFallback>
                      </Avatar>
                      {/* مؤشر الحالة */}
                      <span className={`absolute bottom-0 left-0 w-3.5 h-3.5 rounded-full border-2 border-background ${contact.is_online ? "bg-green-500" : "bg-gray-400"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{contact.name}</p>
                        {contact.is_online && (
                          <Badge className="bg-green-500 text-[10px] px-1.5 py-0">{t.online}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate" dir="ltr">{contact.phone}</p>
                    </div>
                  </div>
                  
                  {/* الأزرار */}
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      className="bg-primary hover:bg-primary/90"
                      onClick={() => handleStartChat(contact.contact_user_id)}
                      disabled={startingChat === contact.contact_user_id}
                    >
                      {startingChat === contact.contact_user_id ? (
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <MessageSquareIcon className={`${language === "ar" ? "ml-1" : "mr-1"} h-4 w-4`} />
                          {t.startChat}
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSendReminder(contact.contact_user_id)}
                    >
                      <CalendarIcon className={`${language === "ar" ? "ml-1" : "mr-1"} h-4 w-4`} />
                      {t.sendReminderBtn}
                    </Button>
                  </div>
                  
                  {/* زر الحذف */}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-full mt-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDeleteContact(contact.id, contact.name)}
                  >
                    <TrashIcon className={`${language === "ar" ? "ml-1" : "mr-1"} h-4 w-4`} />
                    {t.delete}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
