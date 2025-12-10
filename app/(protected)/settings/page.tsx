"use client"

import { useState, useEffect, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { UserIcon, LogOutIcon, CameraIcon } from "@/components/icons"
import { supabase } from "@/lib/supabase/client"

export default function SettingsPage() {
  const { user, signOut, updatePhoneNumber } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const requirePhone = searchParams.get("requirePhone") === "true"
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      setName(user.user_metadata?.full_name || user.user_metadata?.name || "")
      setPhoneNumber(user.user_metadata?.phone_number || "")
      setAvatarUrl(user.user_metadata?.avatar_url || "")
    }
  }, [user])

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("الرجاء اختيار صورة صحيحة")
      return
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError("حجم الصورة يجب أن يكون أقل من 2 ميجابايت")
      return
    }

    setIsUploadingAvatar(true)
    setError(null)

    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split(".").pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from("public")
        .upload(filePath, file, { upsert: true })

      if (uploadError) {
        console.error("Upload error:", uploadError)
        setError("حدث خطأ أثناء رفع الصورة")
        setIsUploadingAvatar(false)
        return
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("public")
        .getPublicUrl(filePath)

      const publicUrl = urlData.publicUrl

      // Update user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          avatar_url: publicUrl
        }
      })

      if (updateError) {
        console.error("Update error:", updateError)
        setError("حدث خطأ أثناء حفظ الصورة")
        setIsUploadingAvatar(false)
        return
      }

      setAvatarUrl(publicUrl)
      setSuccess("تم تحديث الصورة الشخصية بنجاح!")
      setIsUploadingAvatar(false)
    } catch (err) {
      console.error("Error:", err)
      setError("حدث خطأ غير متوقع")
      setIsUploadingAvatar(false)
    }
  }

  // تحويل الأرقام العربية إلى إنجليزية
  const normalizePhoneNumber = (phone: string): string => {
    const arabicNumerals = '٠١٢٣٤٥٦٧٨٩'
    const englishNumerals = '0123456789'
    
    let normalized = phone
    for (let i = 0; i < arabicNumerals.length; i++) {
      normalized = normalized.replace(new RegExp(arabicNumerals[i], 'g'), englishNumerals[i])
    }
    
    return normalized.replace(/[\s\-\(\)]/g, '').trim()
  }

  const handleSaveProfile = async () => {
    setIsSaving(true)
    setError(null)
    setSuccess(null)

    // تحويل رقم الجوال للإنجليزية
    const normalizedPhone = normalizePhoneNumber(phoneNumber)

    if (requirePhone && !normalizedPhone) {
      setError("رقم الجوال مطلوب لإكمال تسجيل الدخول.")
      setIsSaving(false)
      return
    }

    if (normalizedPhone && !/^05\d{8}$/.test(normalizedPhone)) {
      setError("الرجاء إدخال رقم جوال صحيح (مثال: 05xxxxxxxx)")
      setIsSaving(false)
      return
    }

    try {
      let hasChanges = false

      // Update name if changed
      if (name && name !== user?.user_metadata?.full_name) {
        const { error: nameError } = await supabase.auth.updateUser({
          data: { full_name: name.trim() }
        })
        
        if (nameError) {
          setError("حدث خطأ أثناء حفظ الاسم. الرجاء المحاولة مرة أخرى.")
          setIsSaving(false)
          return
        }
        hasChanges = true
      }

      // Update phone if changed
      if (normalizedPhone) {
        console.log("📱 Checking phone number:", normalizedPhone)
        console.log("📱 Current user phone:", user?.user_metadata?.phone_number)
        
        // التحقق من تكرار رقم الجوال دائماً (حتى لو لم يتغير الرقم ظاهرياً)
        const checkResponse = await fetch("/api/check-phone", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone_number: normalizedPhone,
            user_id: user?.id
          })
        })

        const checkResult = await checkResponse.json()
        console.log("📱 Check result:", checkResult)

        if (checkResult.exists) {
          const whatsappNumber = "966533221164"
          const whatsappMessage = `مرحباً، رقمي ${normalizedPhone} يستخدمه حساب آخر، الرجاء ربطه بحسابي. بريدي: ${user?.email || "غير محدد"}`
          const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`
          
          setError(`⚠️ رقم الجوال مسجل مسبقاً بحساب آخر.|WHATSAPP|${whatsappUrl}`)
          setPhoneNumber(user?.user_metadata?.phone_number || "") // إرجاع الرقم الأصلي
          setIsSaving(false)
          return
        }

        if (checkResult.error) {
          console.error("❌ Error checking phone:", checkResult.error)
          setError("حدث خطأ أثناء التحقق من رقم الجوال")
          setIsSaving(false)
          return
        }

        // إذا الرقم لم يتغير، لا تحدّث
        if (normalizedPhone !== normalizePhoneNumber(user?.user_metadata?.phone_number || "")) {
          const { error: updateError } = await updatePhoneNumber(normalizedPhone)
          
          if (updateError) {
            setError("حدث خطأ أثناء حفظ رقم الجوال. الرجاء المحاولة مرة أخرى.")
            setIsSaving(false)
            return
          }
          hasChanges = true
        }
      }

      if (hasChanges) {
        setSuccess("تم حفظ التغييرات بنجاح!")

        if (requirePhone) {
          setTimeout(() => {
            router.push("/dashboard")
          }, 1000)
        }
      } else {
        setSuccess("لا توجد تغييرات لحفظها.")
      }
    } catch (err) {
      console.error("Error saving profile:", err)
      setError("حدث خطأ غير متوقع. الرجاء المحاولة مرة أخرى.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    router.push("/login")
  }

  if (!user) {
    return <div className="text-center text-red-500">خطأ: لم يتم تحميل بيانات المستخدم.</div>
  }

  const hasPhoneNumber = !!user.user_metadata?.phone_number

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">الإعدادات</h1>
        <p className="text-muted-foreground">إدارة معلومات حسابك وتفضيلاتك</p>
      </div>

      {requirePhone && !hasPhoneNumber && (
        <Card className="border-amber-500/50 bg-amber-500/10">
          <CardContent className="pt-6">
            <p className="text-sm text-amber-600 dark:text-amber-400">
              ⚠️ يجب ربط رقم جوالك لإكمال تسجيل الدخول والوصول إلى التطبيق.
            </p>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-red-500/50 bg-red-500/10">
          <CardContent className="pt-6">
            {error.includes("|WHATSAPP|") ? (
              <div className="space-y-3">
                <p className="text-sm text-red-600 dark:text-red-400">
                  {error.split("|WHATSAPP|")[0]}
                </p>
                <a
                  href={error.split("|WHATSAPP|")[1]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  تواصل معنا عبر واتساب لتعديل الرقم
                </a>
              </div>
            ) : (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
          </CardContent>
        </Card>
      )}

      {success && (
        <Card className="border-green-500/50 bg-green-500/10">
          <CardContent className="pt-6">
            <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
          </CardContent>
        </Card>
      )}

      {/* الصورة الشخصية */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="h-5 w-5" />
            الصورة الشخصية
          </CardTitle>
          <CardDescription>قم بتحديث صورتك الشخصية</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={avatarUrl || "/placeholder.svg"} />
                <AvatarFallback>{name[0] || user.email?.[0] || "U"}</AvatarFallback>
              </Avatar>
              <button
                onClick={handleAvatarClick}
                disabled={isUploadingAvatar}
                className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <CameraIcon className="h-4 w-4" />
              </button>
            </div>
            <div>
              <p className="text-sm font-medium">تغيير الصورة</p>
              <p className="text-xs text-muted-foreground">JPG, PNG (حد أقصى 2MB)</p>
              {isUploadingAvatar && <p className="text-xs text-primary mt-1">جاري الرفع...</p>}
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
          />
        </CardContent>
      </Card>

      {/* المعلومات الشخصية */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="h-5 w-5" />
            المعلومات الشخصية
          </CardTitle>
          <CardDescription>قم بتحديث معلومات حسابك الأساسية</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">الاسم الكامل</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="أدخل اسمك الكامل"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">البريد الإلكتروني</Label>
            <Input id="email" type="email" value={user.email || ""} disabled />
            <p className="text-xs text-muted-foreground">لا يمكن تعديل البريد الإلكتروني</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">رقم الجوال {requirePhone && <span className="text-red-500">*</span>}</Label>
            <Input
              id="phone"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="05xxxxxxxx"
              dir="ltr"
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">مثال: 0512345678</p>
              {hasPhoneNumber && (
                <p className="text-xs text-green-600 dark:text-green-400">✓ مربوط</p>
              )}
            </div>
          </div>

          <Button
            onClick={handleSaveProfile}
            disabled={isSaving || (!phoneNumber.trim() && requirePhone)}
            className="w-full"
          >
            {isSaving ? "جاري الحفظ..." : requirePhone && !hasPhoneNumber ? "ربط رقم الجوال والمتابعة" : "حفظ التغييرات"}
          </Button>
        </CardContent>
      </Card>

      <Separator />

      {/* تسجيل الخروج */}
      <Card className="border-red-500/20">
        <CardHeader>
          <CardTitle className="text-red-500">تسجيل الخروج</CardTitle>
          <CardDescription>الخروج من حسابك على هذا الجهاز</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={handleSignOut} className="w-full">
            <LogOutIcon className="ml-2 h-4 w-4" />
            تسجيل الخروج
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
