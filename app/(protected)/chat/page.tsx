"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { SearchIcon, MessageSquareIcon, UserPlusIcon } from "@/components/icons"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/contexts/auth-context"
import { useLanguage } from "@/contexts/language-context"
import { useTranslations } from "@/lib/translations"

interface Conversation {
  id: string
  last_message_at: string
  last_message_preview: string
  unread_count: number
  other_user: {
    id: string
    name: string
    avatar?: string
    phone?: string
    is_online: boolean
    last_seen?: string
  }
}

export default function ChatPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { language } = useLanguage()
  const t = useTranslations(language)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    if (user) {
      loadConversations()
      updatePresence(true)

      // تحديث كل 30 ثانية
      const interval = setInterval(() => {
        loadConversations()
        updatePresence(true)
      }, 30000)

      // عند مغادرة الصفحة
      const handleVisibilityChange = () => {
        updatePresence(!document.hidden)
      }
      document.addEventListener("visibilitychange", handleVisibilityChange)

      // الاستماع لحدث إشعار جديد
      const handleNewNotification = () => {
        loadConversations()
      }
      window.addEventListener('newNotification', handleNewNotification)

      return () => {
        clearInterval(interval)
        document.removeEventListener("visibilitychange", handleVisibilityChange)
        window.removeEventListener('newNotification', handleNewNotification)
        updatePresence(false)
      }
    }
  }, [user])

  const updatePresence = async (isOnline: boolean) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      await fetch("/api/presence", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ is_online: isOnline })
      })
    } catch (err) {
      console.error("Error updating presence:", err)
    }
  }

  const loadConversations = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch("/api/conversations", {
        headers: {
          "Authorization": `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setConversations(data.conversations || [])
      }
    } catch (err) {
      console.error("Error loading conversations:", err)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (dateString: string) => {
    if (!dateString) return ""
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      return date.toLocaleTimeString(language === "ar" ? "ar-SA" : "en-US", { hour: "2-digit", minute: "2-digit" })
    } else if (days === 1) {
      return t.yesterday
    } else if (days < 7) {
      return date.toLocaleDateString(language === "ar" ? "ar-SA" : "en-US", { weekday: "long" })
    } else {
      return date.toLocaleDateString(language === "ar" ? "ar-SA" : "en-US", { month: "short", day: "numeric" })
    }
  }

  const getPresenceStatus = (conv: Conversation) => {
    if (conv.other_user.is_online) {
      return { color: "bg-green-500 animate-pulse", text: t.online }
    }
    
    // حساب آخر ظهور
    if (conv.other_user.last_seen) {
      const lastSeen = new Date(conv.other_user.last_seen)
      const now = new Date()
      const diff = now.getTime() - lastSeen.getTime()
      const minutes = Math.floor(diff / (1000 * 60))
      
      if (minutes < 2) {
        return { color: "bg-green-500 animate-pulse", text: t.online }
      }
      if (minutes < 10) {
        return { color: "bg-yellow-500", text: t.onlineRecently }
      }
    }
    
    return { color: "bg-gray-400", text: "" }
  }

  const filteredConversations = conversations.filter(conv =>
    conv.other_user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.other_user.phone?.includes(searchQuery)
  )

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${language === "ar" ? "rtl" : "ltr"}`} dir={language === "ar" ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            💬 {t.chatTitle}
            {totalUnread > 0 && (
              <Badge variant="destructive" className="text-sm">
                {totalUnread}
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground text-sm">{conversations.length} {t.conversation}</p>
        </div>
        <Link href="/contacts">
          <Button size="sm">
            <UserPlusIcon className={`${language === "ar" ? "ml-1" : "mr-1"} h-4 w-4`} />
            {t.newChatBtn}
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <SearchIcon className={`absolute ${language === "ar" ? "right-3" : "left-3"} top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground`} />
        <Input
          placeholder={t.searchChats}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={language === "ar" ? "pr-10" : "pl-10"}
        />
      </div>

      {/* Conversations List */}
      {filteredConversations.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <MessageSquareIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-lg font-medium text-muted-foreground">
              {searchQuery ? t.noResults : (language === "ar" ? "لا توجد محادثات" : "No conversations")}
            </p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              {!searchQuery && (language === "ar" ? "ابدأ محادثة جديدة من جهات الاتصال" : "Start a new conversation from contacts")}
            </p>
            {!searchQuery && (
              <Link href="/contacts">
                <Button className="mt-4">
                  <UserPlusIcon className={`${language === "ar" ? "ml-1" : "mr-1"} h-4 w-4`} />
                  {language === "ar" ? "ابدأ محادثة" : "Start Chat"}
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredConversations.map((conv, index) => {
            const presence = getPresenceStatus(conv)
            return (
              <Card
                key={conv.id}
                className={`cursor-pointer hover:bg-muted/50 transition-all ${conv.unread_count > 0 ? "border-primary/50 bg-primary/5" : ""}`}
                onClick={() => router.push(`/chat/${conv.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    {/* Avatar with presence indicator */}
                    <div className="relative">
                      <Avatar className="h-14 w-14">
                        <AvatarImage src={conv.other_user.avatar} />
                        <AvatarFallback className="text-lg font-bold bg-primary/10">
                          {conv.other_user.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className={`absolute bottom-0 left-0 w-4 h-4 rounded-full border-2 border-background ${presence.color}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className={`font-semibold truncate ${conv.unread_count > 0 ? "text-primary" : ""}`}>
                          {conv.other_user.name}
                        </h3>
                        <span className={`text-xs ${conv.unread_count > 0 ? "text-primary font-bold" : "text-muted-foreground"}`}>
                          {formatTime(conv.last_message_at)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className={`text-sm truncate max-w-[200px] ${conv.unread_count > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                          {conv.last_message_preview || (language === "ar" ? "لا توجد رسائل" : "No messages")}
                        </p>
                        {conv.unread_count > 0 && (
                          <Badge className="bg-primary text-primary-foreground min-w-[24px] h-6 justify-center">
                            {conv.unread_count}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

