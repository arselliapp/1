"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { TrashIcon, ShieldIcon } from "@/components/icons"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/toast-notification"

// الرقم السري للوحة التحكم
const ADMIN_PIN = "1486"

interface Contact {
  id: string
  owner_id: string
  owner_name: string
  owner_email: string
  owner_phone: string
  contact_id: string
  contact_name: string
  contact_email: string
  contact_phone: string
  contact_avatar?: string
  status: string
  created_at: string
}

interface User {
  id: string
  email: string
  full_name: string
  phone_number: string
  avatar_url?: string
  created_at: string
}

export default function AdminPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { showToast } = useToast()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalContacts: 0,
    totalRequests: 0
  })

  // حالة التحقق من الرقم السري
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [pin, setPin] = useState("")
  const [pinError, setPinError] = useState("")

  // حالة نافذة التأكيد
  const [confirmDialog, setConfirmDialog] = useState<{
    show: boolean
    title: string
    message: string
    onConfirm: () => void
    type: "contact" | "user"
  } | null>(null)

  // التحقق من الـ session المحفوظة
  useEffect(() => {
    const savedAuth = sessionStorage.getItem("admin_authenticated")
    if (savedAuth === "true") {
      setIsAuthenticated(true)
    }
  }, [])

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (pin === ADMIN_PIN) {
      setIsAuthenticated(true)
      sessionStorage.setItem("admin_authenticated", "true")
      setPinError("")
    } else {
      setPinError("الرقم السري غير صحيح")
      setPin("")
    }
  }

  useEffect(() => {
    if (user && isAuthenticated) {
      loadData()
    }
  }, [user, isAuthenticated])

  const loadData = async () => {
    setLoading(true)
    try {
      await Promise.all([loadContacts(), loadUsers(), loadStats()])
    } catch (err) {
      console.error("Error:", err)
    } finally {
      setLoading(false)
    }
  }

  const loadContacts = async () => {
    try {
      const response = await fetch("/api/admin/contacts")
      const data = await response.json()

      if (data.error) {
        console.error("Error loading contacts:", data.error)
        return
      }

      setContacts(data.contacts || [])
    } catch (err) {
      console.error("Error:", err)
    }
  }

  const loadUsers = async () => {
    try {
      const response = await fetch("/api/admin/users")
      const data = await response.json()

      if (data.error) {
        console.error("Error loading users:", data.error)
        return
      }

      setUsers(data.users || [])
    } catch (err) {
      console.error("Error:", err)
    }
  }

  const loadStats = async () => {
    try {
      const [usersResult, contactsResult, requestsResult] = await Promise.all([
        fetch("/api/admin/users").then(r => r.json()),
        fetch("/api/admin/contacts").then(r => r.json()),
        supabase.from("requests").select("id", { count: "exact", head: true })
      ])

      setStats({
        totalUsers: usersResult.users?.length || 0,
        totalContacts: contactsResult.contacts?.length || 0,
        totalRequests: requestsResult.count || 0
      })
    } catch (err) {
      console.error("Error loading stats:", err)
    }
  }

  const handleDeleteContact = async (contactId: string) => {
    setConfirmDialog({
      show: true,
      title: "حذف جهة الاتصال",
      message: "هل أنت متأكد من حذف جهة الاتصال هذه؟",
      type: "contact",
      onConfirm: async () => {
        setConfirmDialog(null)
        try {
          const response = await fetch("/api/admin/contacts", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: contactId })
          })

          const data = await response.json()

          if (data.error) {
            console.error("Error deleting contact:", data.error)
            showToast({
              title: "❌ خطأ",
              message: "حدث خطأ أثناء حذف جهة الاتصال",
              type: "error"
            })
          } else {
            showToast({
              title: "✅ تم الحذف",
              message: "تم حذف جهة الاتصال بنجاح",
              type: "success"
            })
            loadData()
          }
        } catch (err) {
          console.error("Error:", err)
          showToast({
            title: "❌ خطأ",
            message: "حدث خطأ غير متوقع",
            type: "error"
          })
        }
      }
    })
  }

  const handleDeleteUser = async (userId: string) => {
    setConfirmDialog({
      show: true,
      title: "⚠️ تحذير: حذف الحساب",
      message: "سيتم حذف الحساب بالكامل وجميع بياناته (الإضافات والطلبات). هل أنت متأكد؟",
      type: "user",
      onConfirm: async () => {
        setConfirmDialog(null)
        try {
          const response = await fetch("/api/admin/users", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: userId })
          })

          const data = await response.json()

          if (data.error) {
            console.error("Error deleting user:", data.error)
            showToast({
              title: "❌ خطأ",
              message: "حدث خطأ أثناء حذف المستخدم",
              type: "error"
            })
          } else {
            showToast({
              title: "✅ تم الحذف",
              message: "تم حذف المستخدم بنجاح",
              type: "success"
            })
            loadData()
          }
        } catch (err) {
          console.error("Error:", err)
          showToast({
            title: "❌ خطأ",
            message: "حدث خطأ غير متوقع",
            type: "error"
          })
        }
      }
    })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('ar-SA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
      accepted: { label: "مقبول", variant: "default" },
      pending: { label: "معلق", variant: "secondary" },
      blocked: { label: "محظور", variant: "destructive" }
    }
    const s = statusMap[status] || { label: status, variant: "secondary" }
    return <Badge variant={s.variant} className="text-xs">{s.label}</Badge>
  }

  // نافذة التأكيد المخصصة
  const ConfirmDialog = () => {
    if (!confirmDialog?.show) return null
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
          <h3 className="text-lg font-bold text-white mb-2">{confirmDialog.title}</h3>
          <p className="text-slate-300 mb-6">{confirmDialog.message}</p>
          <div className="flex gap-3">
            <Button
              variant="destructive"
              className="flex-1"
              onClick={confirmDialog.onConfirm}
            >
              تأكيد الحذف
            </Button>
            <Button
              variant="outline"
              className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
              onClick={() => setConfirmDialog(null)}
            >
              إلغاء
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // شاشة إدخال الرقم السري
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <Card className="w-full max-w-sm bg-slate-800/50 border-slate-700">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-red-500 to-orange-600 rounded-full flex items-center justify-center mb-4">
              <ShieldIcon className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-xl text-white">لوحة التحكم</CardTitle>
            <p className="text-slate-400 text-sm">أدخل الرقم السري للدخول</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePinSubmit} className="space-y-4">
              <Input
                type="password"
                placeholder="الرقم السري"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="bg-slate-700/50 border-slate-600 text-white text-center text-2xl tracking-widest"
                maxLength={4}
                autoFocus
              />
              {pinError && (
                <p className="text-red-400 text-sm text-center">{pinError}</p>
              )}
              <Button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700"
                disabled={pin.length !== 4}
              >
                دخول
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full text-slate-400"
                onClick={() => router.push("/dashboard")}
              >
                العودة
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <ConfirmDialog />
      
      <div className="flex items-center gap-3 mb-6">
        <ShieldIcon className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">لوحة التحكم</h1>
      </div>

      {/* الإحصائيات */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">إجمالي الإضافات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalContacts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">إجمالي المستخدمين</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">إجمالي الطلبات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRequests}</div>
          </CardContent>
        </Card>
      </div>

      {/* قائمة الإضافات (جهات الاتصال) */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>الإضافات ({contacts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {contacts.map((c) => (
              <div key={c.id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">المالك:</h3>
                    <span>{c.owner_name}</span>
                    <Badge variant="outline" className="text-xs">{c.owner_email}</Badge>
                  </div>
                  {getStatusBadge(c.status)}
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={c.contact_avatar} />
                      <AvatarFallback className="text-lg">
                        {c.contact_name ? c.contact_name[0].toUpperCase() : c.contact_email[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">
                        {c.contact_name && c.contact_name !== "مستخدم" ? c.contact_name : c.contact_email.split('@')[0]}
                      </h3>
                      <div className="flex flex-col gap-1 mt-1">
                        <p className="text-sm text-muted-foreground">📧 {c.contact_email}</p>
                        {c.contact_phone && (
                          <p className="text-sm text-muted-foreground">📱 {c.contact_phone}</p>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        تاريخ الإضافة: {formatDate(c.created_at)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteContact(c.id)}
                  >
                    <TrashIcon className="h-4 w-4 ml-2" />
                    حذف
                  </Button>
                </div>
              </div>
            ))}
            {contacts.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                لا توجد إضافات حالياً
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* قائمة المستخدمين */}
      <Card>
        <CardHeader>
          <CardTitle>المستخدمون ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((u) => (
              <div key={u.id} className="p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={u.avatar_url} />
                    <AvatarFallback className="text-lg">
                      {u.full_name ? u.full_name[0].toUpperCase() : u.email[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">
                      {u.full_name || u.email.split('@')[0]}
                    </h3>
                    <div className="flex flex-col gap-1 mt-1">
                      <p className="text-sm text-muted-foreground">📧 {u.email}</p>
                      {u.phone_number && (
                        <p className="text-sm text-muted-foreground">📱 {u.phone_number}</p>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      تاريخ التسجيل: {formatDate(u.created_at)}
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteUser(u.id)}
                  >
                    <TrashIcon className="h-4 w-4 ml-2" />
                    حذف الحساب
                  </Button>
                </div>
              </div>
            ))}
            {users.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                لا يوجد مستخدمون حالياً
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
