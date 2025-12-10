"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { InboxIcon, ClockIcon, CheckCircleIcon, XCircleIcon, ArrowRightIcon } from "@/components/icons"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/components/toast-notification"

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

// مكون البطاقة القابلة للسحب
const SwipeCard = ({ 
  request, 
  onAccept, 
  onReject, 
  isTop 
}: { 
  request: Request
  onAccept: () => void
  onReject: () => void
  isTop: boolean
}) => {
  const cardRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [offsetX, setOffsetX] = useState(0)
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null)

  const handleStart = (clientX: number) => {
    if (!isTop) return
    setIsDragging(true)
    setStartX(clientX)
  }

  const handleMove = (clientX: number) => {
    if (!isDragging) return
    const diff = clientX - startX
    setOffsetX(diff)
    
    if (diff > 50) {
      setSwipeDirection("right")
    } else if (diff < -50) {
      setSwipeDirection("left")
    } else {
      setSwipeDirection(null)
    }
  }

  const handleEnd = () => {
    if (!isDragging) return
    setIsDragging(false)
    
    if (offsetX > 100) {
      // سحب لليمين = قبول
      setOffsetX(500)
      setTimeout(() => {
        onAccept()
        setOffsetX(0)
        setSwipeDirection(null)
      }, 300)
    } else if (offsetX < -100) {
      // سحب لليسار = رفض
      setOffsetX(-500)
      setTimeout(() => {
        onReject()
        setOffsetX(0)
        setSwipeDirection(null)
      }, 300)
    } else {
      setOffsetX(0)
      setSwipeDirection(null)
    }
  }

  const rotation = offsetX * 0.05
  const opacity = 1 - Math.abs(offsetX) / 500

  const formatTimeAgo = (dateString: string) => {
    const now = Date.now()
    const diff = now - new Date(dateString).getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days > 0) return `منذ ${days} يوم`
    if (hours > 0) return `منذ ${hours} ساعة`
    if (minutes > 0) return `منذ ${minutes} دقيقة`
    return "الآن"
  }

  return (
    <div
      ref={cardRef}
      className={`absolute w-full transition-transform ${isDragging ? "" : "duration-300"}`}
      style={{
        transform: `translateX(${offsetX}px) rotate(${rotation}deg)`,
        opacity: opacity,
        zIndex: isTop ? 10 : 1,
        cursor: isTop ? "grab" : "default"
      }}
      onMouseDown={(e) => handleStart(e.clientX)}
      onMouseMove={(e) => handleMove(e.clientX)}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={(e) => handleStart(e.touches[0].clientX)}
      onTouchMove={(e) => handleMove(e.touches[0].clientX)}
      onTouchEnd={handleEnd}
    >
      <Card className={`overflow-hidden ${swipeDirection === "right" ? "border-green-500 shadow-green-500/30 shadow-xl" : swipeDirection === "left" ? "border-red-500 shadow-red-500/30 shadow-xl" : ""}`}>
        <CardContent className="p-6">
          {/* Swipe Indicators */}
          <div className="absolute top-4 left-4 right-4 flex justify-between pointer-events-none">
            <div className={`px-4 py-2 rounded-lg border-2 border-red-500 text-red-500 font-bold transform -rotate-12 transition-opacity ${swipeDirection === "left" ? "opacity-100" : "opacity-0"}`}>
              رفض ❌
            </div>
            <div className={`px-4 py-2 rounded-lg border-2 border-green-500 text-green-500 font-bold transform rotate-12 transition-opacity ${swipeDirection === "right" ? "opacity-100" : "opacity-0"}`}>
              قبول ✅
            </div>
          </div>

          {/* Card Content */}
          <div className="pt-8">
            {/* Avatar */}
            <div className="flex justify-center mb-4">
              <Avatar className="h-24 w-24 ring-4 ring-primary/20">
                <AvatarImage src={request.from.avatar} />
                <AvatarFallback className="text-3xl">{request.from.name[0]}</AvatarFallback>
              </Avatar>
            </div>

            {/* Name */}
            <h3 className="text-2xl font-bold text-center mb-1">{request.from.name}</h3>
            <p className="text-center text-muted-foreground text-sm mb-4">{formatTimeAgo(request.createdAt)}</p>

            {/* Request Type */}
            {request.requestType && (
              <div className="flex justify-center mb-4">
                <Badge variant="outline" className="text-lg px-4 py-1">
                  {request.requestType === "whatsapp" && "💬 واتساب"}
                  {request.requestType === "snapchat" && "👻 سناب شات"}
                  {request.requestType === "x" && "🐦 X"}
                  {request.requestType === "meeting" && "📅 اجتماع"}
                  {request.requestType === "callback" && "📞 رد اتصال"}
                  {request.requestType === "marriage" && "💍 دعوة زواج"}
                  {request.requestType === "reminder" && "⏰ تذكير"}
                </Badge>
              </div>
            )}

            {/* Message */}
            <div className="p-4 bg-muted/50 rounded-lg border text-center">
              <p className="text-lg leading-relaxed">{request.message}</p>
            </div>

            {/* Instructions */}
            <div className="mt-6 flex justify-center gap-8 text-sm text-muted-foreground">
              <span>← اسحب للرفض</span>
              <span>اسحب للقبول →</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function SwipePage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [stats, setStats] = useState({ accepted: 0, rejected: 0 })

  useEffect(() => {
    if (user) loadRequests()
  }, [user])

  const loadRequests = async () => {
    if (!user) return
    setLoading(true)
    
    try {
      const { data, error } = await supabase
        .from("requests")
        .select("*")
        .eq("recipient_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })

      if (error) {
        setLoading(false)
        return
      }

      const userIds = new Set<string>()
      ;(data || []).forEach(request => {
        userIds.add(request.sender_id)
      })

      const userDataCache: Record<string, any> = {}
      await Promise.all(
        Array.from(userIds).map(async (userId) => {
          const { data: result } = await supabase.rpc('search_user_by_id', { input_user_id: userId })
          if (result && result.length > 0) userDataCache[userId] = result[0]
        })
      )

      const requestsWithUsers = (data || []).map((request) => {
        const senderData = userDataCache[request.sender_id]
        return {
          id: request.id,
          type: "received" as const,
          from: {
            id: request.sender_id,
            name: senderData?.full_name || "مستخدم",
            email: senderData?.phone_number || "",
            avatar: senderData?.avatar_url
          },
          to: { id: user.id, name: "", email: "" },
          message: request.message,
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

  const handleAccept = async () => {
    const request = pendingRequests[0]
    if (!request) return
    
    await supabase.from("requests").update({ status: "accepted", updated_at: new Date().toISOString() }).eq("id", request.id)
    setStats(prev => ({ ...prev, accepted: prev.accepted + 1 }))
    showToast({ title: "✅ تم القبول", message: `تم قبول طلب ${request.from.name}`, type: "success" })
    loadRequests()
  }

  const handleReject = async () => {
    const request = pendingRequests[0]
    if (!request) return
    
    await supabase.from("requests").update({ status: "rejected", updated_at: new Date().toISOString() }).eq("id", request.id)
    setStats(prev => ({ ...prev, rejected: prev.rejected + 1 }))
    showToast({ title: "❌ تم الرفض", message: `تم رفض طلب ${request.from.name}`, type: "info" })
    loadRequests()
  }

  const handleButtonAccept = () => {
    const request = pendingRequests[0]
    if (!request) return
    handleAccept()
  }

  const handleButtonReject = () => {
    const request = pendingRequests[0]
    if (!request) return
    handleReject()
  }

  const pendingRequests = requests.filter(r => r.status === "pending")

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
            👆 واجهة Swipe
          </h1>
          <p className="text-muted-foreground">اسحب للقبول أو الرفض</p>
        </div>
        <Link href="/requests-demo">
          <Button variant="outline" size="sm">
            <ArrowRightIcon className="ml-1 h-4 w-4" />
            السيناريوهات
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="flex justify-center gap-8">
        <div className="text-center">
          <p className="text-3xl font-bold text-green-500">{stats.accepted}</p>
          <p className="text-xs text-muted-foreground">مقبول ✅</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-muted-foreground">{pendingRequests.length}</p>
          <p className="text-xs text-muted-foreground">متبقي 📥</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-red-500">{stats.rejected}</p>
          <p className="text-xs text-muted-foreground">مرفوض ❌</p>
        </div>
      </div>

      {/* Swipe Area */}
      <div className="relative h-[500px] flex items-center justify-center">
        {pendingRequests.length === 0 ? (
          <Card className="w-full max-w-sm border-dashed">
            <CardContent className="p-12 text-center">
              <CheckCircleIcon className="h-16 w-16 mx-auto mb-4 text-green-500" />
              <p className="text-lg font-medium text-muted-foreground">🎉 انتهيت من جميع الطلبات!</p>
              <p className="text-sm text-muted-foreground/70 mt-2">
                قبلت {stats.accepted} • رفضت {stats.rejected}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="relative w-full max-w-sm h-full">
            {/* Stack of cards (show up to 3) */}
            {pendingRequests.slice(0, 3).reverse().map((request, index) => (
              <SwipeCard
                key={request.id}
                request={request}
                onAccept={handleAccept}
                onReject={handleReject}
                isTop={index === pendingRequests.slice(0, 3).length - 1}
              />
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {pendingRequests.length > 0 && (
        <div className="flex justify-center gap-4">
          <Button
            size="lg"
            variant="outline"
            className="w-20 h-20 rounded-full border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
            onClick={handleButtonReject}
          >
            <XCircleIcon className="h-10 w-10" />
          </Button>
          <Button
            size="lg"
            className="w-20 h-20 rounded-full bg-green-500 hover:bg-green-600"
            onClick={handleButtonAccept}
          >
            <CheckCircleIcon className="h-10 w-10" />
          </Button>
        </div>
      )}

      {/* Instructions */}
      <Card className="bg-muted/50">
        <CardContent className="p-4 text-center">
          <p className="text-sm text-muted-foreground">
            💡 <strong>كيف يعمل:</strong> اسحب البطاقة يميناً للقبول ✅ أو يساراً للرفض ❌ أو استخدم الأزرار
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

