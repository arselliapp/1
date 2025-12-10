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
        setError("⚠️ رقم الجوال مسجل مسبقاً بحساب آخر. الرجاء استخدام رقم مختلف.")
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
          {error && <p className="text-sm text-destructive text-center">{error}</p>}
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
