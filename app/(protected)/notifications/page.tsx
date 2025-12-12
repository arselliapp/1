"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase/client"
import { useToast } from "@/components/toast-notification"

type Notification = {
  id: string
  title: string
  body?: string
  url?: string
  type?: string
  created_at: string
}

export default function NotificationsPage() {
  const { showToast } = useToast()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [clearing, setClearing] = useState(false)

  useEffect(() => {
    loadNotifications()

    const handleNewNotification = () => loadNotifications()
    window.addEventListener("newNotification", handleNewNotification)
    return () => window.removeEventListener("newNotification", handleNewNotification)
  }, [])

  const loadNotifications = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch("/api/notifications/list", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
      }
    } catch (err) {
      console.error("Error loading notifications:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleClear = async () => {
    try {
      setClearing(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        showToast({ title: "تنبيه", message: "الرجاء تسجيل الدخول", type: "warning" })
        return
      }

      const response = await fetch("/api/notifications/clear", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      if (response.ok) {
        showToast({ title: "تم الحذف", message: "تم حذف جميع الإشعارات", type: "success" })
        await loadNotifications()
      } else {
        showToast({ title: "خطأ", message: "تعذّر حذف الإشعارات", type: "error" })
      }
    } catch (err) {
      console.error("Error clearing notifications:", err)
      showToast({ title: "خطأ", message: "حدث خطأ أثناء الحذف", type: "error" })
    } finally {
      setClearing(false)
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString("ar-SA")
    } catch {
      return dateString
    }
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            🔔 الإشعارات
            {notifications.length > 0 && (
              <Badge variant="secondary">{notifications.length}</Badge>
            )}
          </h1>
          <p className="text-muted-foreground text-sm">عرض آخر الإشعارات وإدارتها</p>
        </div>
        <Button
          variant="outline"
          className="text-destructive border-destructive/30 hover:bg-destructive/10"
          onClick={handleClear}
          disabled={clearing || notifications.length === 0}
        >
          {clearing ? "جاري الحذف..." : "حذف الإشعارات"}
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            جار التحميل...
          </CardContent>
        </Card>
      ) : notifications.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-10 text-center text-muted-foreground">
            لا توجد إشعارات حالياً
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif) => (
            <Card key={notif.id} className="hover:shadow-sm transition">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-lg">{notif.title || "إشعار"}</CardTitle>
                  {notif.type && <Badge variant="outline">{notif.type}</Badge>}
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0 text-sm text-muted-foreground space-y-2">
                {notif.body && <p>{notif.body}</p>}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{formatDate(notif.created_at)}</span>
                  {notif.url && (
                    <a href={notif.url} className="text-primary hover:underline">
                      فتح الرابط
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

