"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { UserPlusIcon, SearchIcon, MessageSquareIcon, TrashIcon } from "@/components/icons"
import { AddContactModal } from "@/components/add-contact-modal"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/contexts/auth-context"

interface Contact {
  id: string
  name: string
  phone: string
  avatar?: string
  contact_user_id: string
}

export default function ContactsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)

  // تحديث جهات الاتصال كل 15 ثانية
  useEffect(() => {
    if (user) {
      loadContacts()

      let isPageVisible = true
      const handleVisibility = () => {
        isPageVisible = !document.hidden
        if (!document.hidden) loadContacts(true)
      }
      document.addEventListener("visibilitychange", handleVisibility)

      // تحديث تلقائي كل 15 ثانية فقط إذا الصفحة مرئية
      const interval = setInterval(() => {
        if (isPageVisible) loadContacts(true)
      }, 15000)

      return () => {
        document.removeEventListener("visibilitychange", handleVisibility)
        clearInterval(interval)
      }
    }
  }, [user])

  const loadContacts = async (silent = false) => {
    if (!user) return

    if (!silent) {
      setLoading(true)
    }
    try {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "accepted")

      if (error) {
        console.error("Error loading contacts:", error)
        if (!silent) setLoading(false)
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
    } catch (err) {
      console.error("Error loading contacts:", err)
    } finally {
      if (!silent) {
        setLoading(false)
      }
    }
  }

  const handleDeleteContact = async (contactId: string) => {
    if (!confirm("هل أنت متأكد من حذف جهة الاتصال هذه؟")) return

    const { error } = await supabase
      .from("contacts")
      .delete()
      .eq("id", contactId)

    if (!error) {
      loadContacts()
    }
  }

  const handleSendRequest = (contactUserId: string) => {
    router.push(`/send-request?contact=${contactUserId}`)
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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-in fade-in slide-in-from-top-4 duration-500">
        <div>
          <h1 className="text-2xl font-bold">جهات الاتصال</h1>
          <p className="text-muted-foreground">إدارة جهات الاتصال الخاصة بك</p>
        </div>
        <AddContactModal />
      </div>

      <div className="relative animate-in fade-in slide-in-from-top-4 duration-500" style={{ animationDelay: "100ms" }}>
        <SearchIcon className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="البحث في جهات الاتصال..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pr-10"
        />
      </div>

      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: "200ms" }}>
        <h2 className="text-lg font-semibold">جهات الاتصال ({filteredContacts.length})</h2>
        {filteredContacts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <UserPlusIcon className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">لا توجد جهات اتصال بعد</p>
              <AddContactModal />
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredContacts.map((contact, index) => (
              <Card
                key={contact.id}
                className="group hover:border-primary/50 hover:scale-[1.02] hover:shadow-lg transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="transition-transform duration-300 group-hover:scale-110">
                      <AvatarImage src={contact.avatar || "/placeholder.svg"} />
                      <AvatarFallback>{contact.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{contact.name}</p>
                      <p className="text-sm text-muted-foreground truncate" dir="ltr">{contact.phone}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 bg-transparent hover:bg-primary hover:text-primary-foreground transition-all duration-300"
                      onClick={() => handleSendRequest(contact.contact_user_id)}
                    >
                      <MessageSquareIcon className="ml-1 h-4 w-4" />
                      إرسال طلب
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 transition-all duration-300"
                      onClick={() => handleDeleteContact(contact.id)}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

