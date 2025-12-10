"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Loader2 } from "@/components/icons"

// تحويل الأرقام العربية إلى إنجليزية
function normalizePhoneNumber(phone: string): string {
  const arabicNumerals = '٠١٢٣٤٥٦٧٨٩'
  const englishNumerals = '0123456789'
  
  let normalized = phone
  for (let i = 0; i < arabicNumerals.length; i++) {
    normalized = normalized.replace(new RegExp(arabicNumerals[i], 'g'), englishNumerals[i])
  }
  
  return normalized.replace(/[\s\-\(\)]/g, '').trim()
}

export function PhoneNumberModal() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null)

  // Check if user needs to provide phone number
  useEffect(() => {
    if (!loading && user && !user.user_metadata?.phone_number) {
      setIsOpen(true)
    } else if (!loading && user && user.user_metadata?.phone_number) {
      setIsOpen(false)
    }
  }, [user, loading])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setWhatsappUrl(null)
    
    if (!phoneNumber.trim()) {
      setError("الرجاء إدخال رقم الجوال.")
      return
    }

    // تحويل الأرقام العربية إلى إنجليزية
    const normalizedPhone = normalizePhoneNumber(phoneNumber)
    
    // التحقق من صحة الرقم
    if (!/^05\d{8}$/.test(normalizedPhone)) {
      setError("الرجاء إدخال رقم جوال صحيح (مثال: 05xxxxxxxx)")
      return
    }

    setIsSubmitting(true)

    try {
      // التحقق من تكرار رقم الجوال
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
        const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`
        
        setError("⚠️ رقم الجوال مسجل مسبقاً بحساب آخر.")
        setWhatsappUrl(url)
        setIsSubmitting(false)
        return
      }

      // 1. Update user metadata in Supabase
      const { error: updateError } = await supabase.auth.updateUser({
        data: { phone_number: normalizedPhone },
      })

      if (updateError) {
        throw new Error(updateError.message)
      }

      // 2. Force a refresh of the session to get the updated user metadata
      await supabase.auth.refreshSession()

      // 3. Close modal and navigate to dashboard
      setIsOpen(false)
      router.push("/dashboard")
    } catch (err) {
      console.error("Failed to update phone number:", err)
      setError("فشل تحديث رقم الجوال. الرجاء التأكد من صحة الرقم والمحاولة مرة أخرى.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Prevent closing the modal if the phone number is required
  const handleOpenChange = (open: boolean) => {
    if (!user || !user.user_metadata?.phone_number) {
      setIsOpen(true)
    } else {
      setIsOpen(open)
    }
  }

  if (loading || !user || user.user_metadata?.phone_number) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>إضافة رقم الجوال</DialogTitle>
          <DialogDescription>
            الرجاء إدخال رقم جوالك لتتمكن من التواصل مع جهات الاتصال. هذا الحقل إلزامي.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="phone" className="text-right">
              رقم الجوال
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="مثال: 05xxxxxxxx"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="col-span-3"
              dir="ltr"
            />
          </div>
          
          {error && (
            <div className="space-y-2">
              <p className="text-sm text-destructive text-center">{error}</p>
              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors w-full"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  تواصل معنا لتعديل الرقم
                </a>
              )}
            </div>
          )}
          
          <Button type="submit" disabled={isSubmitting || !phoneNumber.trim()}>
            {isSubmitting ? (
              <>
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              "حفظ رقم الجوال"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
