"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { UserPlusIcon, Loader2 } from "@/components/icons"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/contexts/auth-context"
import { useLanguage } from "@/contexts/language-context"
import { useTranslations } from "@/lib/translations"

export function AddContactModal() {
  const { user } = useAuth()
  const { language } = useLanguage()
  const t = useTranslations(language)
  const [isOpen, setIsOpen] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState("")
  const [isChecking, setIsChecking] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [checkResult, setCheckResult] = useState<"registered" | "not_registered" | null>(null)
  const [userDetails, setUserDetails] = useState<{ id: string; name: string; phone: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setCheckResult(null)
    setUserDetails(null)

    if (!phoneNumber.trim()) {
      setError(language === "ar" ? "الرجاء إدخال رقم الجوال." : "Please enter a phone number.")
      return
    }

    setIsChecking(true)
    try {
      const { data, error } = await supabase
        .rpc('search_user_by_phone', { input_phone_number: phoneNumber.trim() })

      if (error) {
        console.error("RPC Error:", error)
        setError(error.message || (language === "ar" ? "حدث خطأ أثناء التحقق من الرقم." : "Error checking phone number."))
        setIsChecking(false)
        return
      }

      if (data && data.length > 0) {
        const foundUser = data[0]
        setCheckResult("registered")
        setUserDetails({
          id: foundUser.id,
          name: foundUser.full_name,
          phone: foundUser.phone_number
        })
      } else {
        setCheckResult("not_registered")
      }
    } catch (err) {
      console.error("Error checking phone number:", err)
      setError(language === "ar" ? "حدث خطأ أثناء التحقق من الرقم." : "Error checking phone number.")
    } finally {
      setIsChecking(false)
    }
  }

  const handleAddContact = async () => {
    if (!user || !userDetails) return

    setIsAdding(true)
    try {
      const { error } = await supabase
        .from("contacts")
        .insert({
          user_id: user.id,
          contact_user_id: userDetails.id,
          status: "accepted"
        })

      if (error) {
        if (error.code === "23505") {
          setError(language === "ar" ? "جهة الاتصال موجودة بالفعل." : "Contact already exists.")
        } else {
          console.error("Insert Error:", error)
          setError(language === "ar" ? "حدث خطأ أثناء إضافة جهة الاتصال." : "Error adding contact.")
        }
        setIsAdding(false)
        return
      }

      setIsOpen(false)
      setPhoneNumber("")
      setCheckResult(null)
      setUserDetails(null)
      
      window.location.reload()
    } catch (err) {
      console.error("Error adding contact:", err)
      setError(language === "ar" ? "حدث خطأ غير متوقع." : "An unexpected error occurred.")
    } finally {
      setIsAdding(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      setPhoneNumber("")
      setCheckResult(null)
      setUserDetails(null)
      setError(null)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <UserPlusIcon className={`${language === "ar" ? "ml-2" : "mr-2"} h-4 w-4`} />
          {t.addContact}
        </Button>
      </DialogTrigger>
      <DialogContent className={`sm:max-w-[425px] ${language === "ar" ? "rtl" : "ltr"}`} dir={language === "ar" ? "rtl" : "ltr"}>
        <DialogHeader>
          <DialogTitle>{language === "ar" ? "إضافة جهة اتصال جديدة" : "Add New Contact"}</DialogTitle>
          <DialogDescription>
            {language === "ar" ? "أدخل رقم جوال الشخص الذي تريد إضافته. سيتم التحقق من تسجيله في البرنامج." : "Enter the phone number of the person you want to add. We'll verify if they're registered in the app."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCheck} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="contact-phone">{t.phoneNumber}</Label>
            <Input
              id="contact-phone"
              type="tel"
              placeholder={t.phoneNumberPlaceholder}
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="col-span-3"
              dir="ltr"
              disabled={isChecking || checkResult === "registered"}
            />
          </div>
          
          {error && <p className="text-sm text-destructive text-center">{error}</p>}

          {checkResult === "registered" && userDetails && (
            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <p className="font-medium text-green-400">{language === "ar" ? "الرقم مسجل في البرنامج!" : "Phone number is registered!"}</p>
              <p className="text-sm text-muted-foreground">{language === "ar" ? "الاسم:" : "Name:"} {userDetails.name}</p>
              <p className="text-sm text-muted-foreground">{language === "ar" ? "الجوال:" : "Phone:"} {userDetails.phone}</p>
            </div>
          )}

          {checkResult === "not_registered" && (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="font-medium text-yellow-400">{language === "ar" ? "الرقم غير مسجل في البرنامج." : "Phone number is not registered."}</p>
              <p className="text-sm text-muted-foreground">{language === "ar" ? "لا يمكن مراسلة هذا الرقم حالياً." : "Cannot message this number currently."}</p>
            </div>
          )}

          <div className="flex gap-2">
            <Button 
              type="submit" 
              disabled={isChecking || !phoneNumber.trim() || checkResult === "registered"} 
              className="flex-1"
            >
              {isChecking ? (
                <>
                  <Loader2 className={`${language === "ar" ? "ml-2" : "mr-2"} h-4 w-4 animate-spin`} />
                  {language === "ar" ? "جاري التحقق..." : "Checking..."}
                </>
              ) : (
                language === "ar" ? "تحقق من الرقم" : "Verify Number"
              )}
            </Button>
            
            {checkResult === "registered" && (
              <Button 
                type="button" 
                onClick={handleAddContact}
                disabled={isAdding}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {isAdding ? (
                  <>
                    <Loader2 className={`${language === "ar" ? "ml-2" : "mr-2"} h-4 w-4 animate-spin`} />
                    {language === "ar" ? "جاري الإضافة..." : "Adding..."}
                  </>
                ) : (
                  t.addContact
                )}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
