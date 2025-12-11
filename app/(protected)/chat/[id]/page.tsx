"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { SendIcon, ArrowRightIcon, CheckCircleIcon } from "@/components/icons"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/contexts/auth-context"

interface Message {
  id: string
  sender_id: string
  content: string
  message_type: string
  created_at: string
  is_read: boolean
  reads: { user_id: string; read_at: string }[]
  reply_to_id?: string
  reply_to?: {
    id: string
    content: string
    sender_id: string
  }
}

interface OtherUser {
  id: string
  name: string
  avatar?: string
  is_online: boolean
  last_seen?: string
}

// ردود سريعة
const QUICK_REPLIES = [
  { text: "تم 👍", emoji: "👍" },
  { text: "إن شاء الله ✅", emoji: "✅" },
  { text: "شكراً 🙏", emoji: "🙏" },
  { text: "لحظة ⏰", emoji: "⏰" },
]

export default function ChatRoomPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const conversationId = params?.id as string

  const [messages, setMessages] = useState<Message[]>([])
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null)
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [otherIsTyping, setOtherIsTyping] = useState(false)
  const [replyTo, setReplyTo] = useState<Message | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // تحميل المحادثة والرسائل
  useEffect(() => {
    if (user && conversationId) {
      loadMessages()
      loadOtherUser()
      updatePresence(true, conversationId)

      // تحديث كل 3 ثواني
      const interval = setInterval(() => {
        loadMessages()
        checkTypingStatus()
      }, 3000)

      return () => {
        clearInterval(interval)
        updatePresence(true, null)
      }
    }
  }, [user, conversationId])

  // التمرير لآخر رسالة
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const updatePresence = async (isOnline: boolean, currentConv: string | null) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      await fetch("/api/presence", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ 
          is_online: isOnline,
          current_conversation_id: currentConv
        })
      })
    } catch (err) {
      console.error("Error updating presence:", err)
    }
  }

  const loadOtherUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // جلب المشارك الآخر
      const { data: participants } = await supabase
        .from("conversation_participants")
        .select("user_id")
        .eq("conversation_id", conversationId)
        .neq("user_id", user?.id)

      if (participants && participants.length > 0) {
        const otherUserId = participants[0].user_id

        // جلب معلومات المستخدم
        const { data: userData } = await supabase.rpc("search_user_by_id", { input_user_id: otherUserId })

        // جلب حالة الاتصال
        const presenceRes = await fetch(`/api/presence?user_ids=${otherUserId}`, {
          headers: { "Authorization": `Bearer ${session.access_token}` }
        })
        const presenceData = await presenceRes.json()

        if (userData && userData.length > 0) {
          const presence = presenceData.presence?.[otherUserId]
          setOtherUser({
            id: otherUserId,
            name: userData[0].full_name || "مستخدم",
            avatar: userData[0].avatar_url,
            is_online: presence?.is_online || false,
            last_seen: presence?.last_seen
          })
        }
      }
    } catch (err) {
      console.error("Error loading other user:", err)
    }
  }

  const loadMessages = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`/api/messages?conversation_id=${conversationId}`, {
        headers: { "Authorization": `Bearer ${session.access_token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages || [])
      }
    } catch (err) {
      console.error("Error loading messages:", err)
    } finally {
      setLoading(false)
    }
  }

  const checkTypingStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`/api/typing?conversation_id=${conversationId}`, {
        headers: { "Authorization": `Bearer ${session.access_token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setOtherIsTyping(data.is_someone_typing)
      }
    } catch (err) {
      console.error("Error checking typing:", err)
    }
  }

  const updateTypingStatus = async (typing: boolean) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      await fetch("/api/typing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ conversation_id: conversationId, is_typing: typing })
      })
    } catch (err) {
      console.error("Error updating typing:", err)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value)

    // تحديث حالة الكتابة
    if (!isTyping) {
      setIsTyping(true)
      updateTypingStatus(true)
    }

    // إلغاء المؤقت السابق
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // مؤقت لإيقاف حالة الكتابة بعد 2 ثانية
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
      updateTypingStatus(false)
    }, 2000)
  }

  const sendMessage = async (text: string = newMessage) => {
    if (!text.trim() || sending) return

    setSending(true)
    setIsTyping(false)
    updateTypingStatus(false)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          conversation_id: conversationId,
          content: text.trim(),
          reply_to_id: replyTo?.id || null
        })
      })

      if (response.ok) {
        setNewMessage("")
        setReplyTo(null) // إلغاء الرد بعد الإرسال
        loadMessages()
        inputRef.current?.focus()
      }
    } catch (err) {
      console.error("Error sending message:", err)
    } finally {
      setSending(false)
    }
  }

  // دالة للرد على رسالة
  const handleReply = (message: Message) => {
    setReplyTo(message)
    inputRef.current?.focus()
  }

  // إلغاء الرد
  const cancelReply = () => {
    setReplyTo(null)
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("ar-SA", {
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return "اليوم"
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "أمس"
    } else {
      return date.toLocaleDateString("ar-SA", { weekday: "long", month: "short", day: "numeric" })
    }
  }

  const getPresenceText = () => {
    if (!otherUser) return ""
    
    // متصل الآن
    if (otherUser.is_online) {
      return "متصل الآن 🟢"
    }
    
    // آخر ظهور
    if (otherUser.last_seen) {
      const lastSeen = new Date(otherUser.last_seen)
      const now = new Date()
      const diff = now.getTime() - lastSeen.getTime()
      const minutes = Math.floor(diff / (1000 * 60))
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))

      // حالات أكثر واقعية
      if (minutes < 2) return "متصل الآن 🟢"
      if (minutes < 5) return "متصل منذ قليل 🟡"
      if (minutes < 15) return `آخر ظهور منذ ${minutes} دقيقة`
      if (minutes < 30) return "آخر ظهور منذ ربع ساعة"
      if (minutes < 60) return "آخر ظهور منذ نصف ساعة"
      if (hours === 1) return "آخر ظهور منذ ساعة"
      if (hours < 6) return `آخر ظهور منذ ${hours} ساعات`
      if (hours < 12) return "آخر ظهور اليوم صباحاً"
      if (hours < 24) return "آخر ظهور اليوم"
      if (days === 1) return "آخر ظهور أمس"
      if (days < 7) return `آخر ظهور منذ ${days} أيام`
      return `آخر ظهور ${formatDate(otherUser.last_seen)}`
    }
    return "غير متصل"
  }

  // تجميع الرسائل حسب التاريخ
  const groupedMessages = messages.reduce((groups: Record<string, Message[]>, msg) => {
    const date = new Date(msg.created_at).toDateString()
    if (!groups[date]) groups[date] = []
    groups[date].push(msg)
    return groups
  }, {})

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] -mx-4 -mt-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-background/95 backdrop-blur sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => router.push("/chat")}>
          <ArrowRightIcon className="h-5 w-5" />
        </Button>
        
        <div className="relative">
          <Avatar className="h-10 w-10">
            <AvatarImage src={otherUser?.avatar} />
            <AvatarFallback>{otherUser?.name?.[0] || "؟"}</AvatarFallback>
          </Avatar>
          {otherUser?.is_online && (
            <span className="absolute bottom-0 left-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
          )}
        </div>

        <div className="flex-1">
          <h2 className="font-semibold">{otherUser?.name || "محادثة"}</h2>
          <p className="text-xs text-muted-foreground">
            {otherIsTyping ? (
              <span className="text-primary animate-pulse">يكتب...</span>
            ) : (
              getPresenceText()
            )}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {Object.entries(groupedMessages).map(([date, msgs]) => (
          <div key={date}>
            {/* Date separator */}
            <div className="flex items-center justify-center my-4">
              <Badge variant="secondary" className="text-xs">
                {formatDate(msgs[0].created_at)}
              </Badge>
            </div>

            {/* Messages for this date */}
            {msgs.map((msg, index) => {
              const isMe = msg.sender_id === user?.id
              const showAvatar = !isMe && (index === 0 || msgs[index - 1].sender_id !== msg.sender_id)
              const replyToMessage = msg.reply_to || (msg.reply_to_id ? messages.find(m => m.id === msg.reply_to_id) : null)

              return (
                <div
                  key={msg.id}
                  className={`flex items-end gap-2 group ${isMe ? "flex-row-reverse" : ""}`}
                >
                  {/* Avatar for other user */}
                  {!isMe && (
                    <div className="w-8">
                      {showAvatar && (
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={otherUser?.avatar} />
                          <AvatarFallback className="text-xs">{otherUser?.name?.[0]}</AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  )}

                  {/* Message bubble */}
                  <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                    {/* زر الرد */}
                    {msg.message_type !== "system" && (
                      <button
                        onClick={() => handleReply(msg)}
                        className={`opacity-0 group-hover:opacity-100 transition-opacity text-xs text-muted-foreground hover:text-primary mb-1 ${isMe ? "mr-2" : "ml-2"}`}
                      >
                        ↩️ رد
                      </button>
                    )}
                    
                    <div
                      className={`rounded-2xl px-4 py-2 ${
                        isMe
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-muted rounded-bl-sm"
                      } ${msg.message_type === "system" ? "bg-green-500/20 text-green-700 text-center max-w-full" : ""}`}
                    >
                      {/* عرض الرسالة المُرد عليها */}
                      {replyToMessage && (
                        <div 
                          className={`mb-2 p-2 rounded-lg border-r-2 ${
                            isMe 
                              ? "bg-primary-foreground/10 border-primary-foreground/50" 
                              : "bg-background/50 border-primary"
                          }`}
                        >
                          <p className={`text-[10px] font-medium ${isMe ? "text-primary-foreground/70" : "text-primary"}`}>
                            {replyToMessage.sender_id === user?.id ? "أنت" : otherUser?.name}
                          </p>
                          <p className={`text-xs truncate ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                            {replyToMessage.content.substring(0, 50)}{replyToMessage.content.length > 50 ? "..." : ""}
                          </p>
                        </div>
                      )}
                      
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                      <div className={`flex items-center gap-1 mt-1 ${isMe ? "justify-start" : "justify-end"}`}>
                        <span className={`text-[10px] ${isMe ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                          {formatTime(msg.created_at)}
                        </span>
                        {isMe && (
                          <span className={`text-xs font-bold ${msg.is_read ? "text-cyan-300 drop-shadow-[0_0_3px_rgba(0,200,255,0.8)]" : "text-primary-foreground/60"}`}>
                            {msg.is_read ? "✓✓" : "✓"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ))}

        {/* Typing indicator */}
        {otherIsTyping && (
          <div className="flex items-end gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={otherUser?.avatar} />
              <AvatarFallback className="text-xs">{otherUser?.name?.[0]}</AvatarFallback>
            </Avatar>
            <div className="bg-muted rounded-2xl px-4 py-3 rounded-bl-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Replies */}
      <div className="flex gap-2 px-4 py-2 overflow-x-auto">
        {QUICK_REPLIES.map((reply) => (
          <Button
            key={reply.text}
            variant="outline"
            size="sm"
            className="whitespace-nowrap text-xs"
            onClick={() => sendMessage(reply.text)}
            disabled={sending}
          >
            {reply.emoji} {reply.text.replace(reply.emoji, "").trim()}
          </Button>
        ))}
      </div>

      {/* شريط الرد */}
      {replyTo && (
        <div className="px-4 py-2 border-t bg-muted/50 flex items-center gap-3">
          <div className="flex-1 border-r-2 border-primary pr-3">
            <p className="text-xs text-primary font-medium">
              رد على {replyTo.sender_id === user?.id ? "نفسك" : otherUser?.name}
            </p>
            <p className="text-sm text-muted-foreground truncate">
              {replyTo.content.substring(0, 60)}{replyTo.content.length > 60 ? "..." : ""}
            </p>
          </div>
          <button
            onClick={cancelReply}
            className="p-1 hover:bg-destructive/20 rounded-full transition-colors"
          >
            <span className="text-destructive text-lg">✕</span>
          </button>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t bg-background">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            sendMessage()
          }}
          className="flex gap-2"
        >
          <Input
            ref={inputRef}
            placeholder={replyTo ? "اكتب ردك..." : "اكتب رسالة..."}
            value={newMessage}
            onChange={handleInputChange}
            disabled={sending}
            className="flex-1"
            autoComplete="off"
          />
          <Button type="submit" disabled={!newMessage.trim() || sending}>
            {sending ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <SendIcon className="h-5 w-5" />
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}

