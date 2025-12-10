"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { UserPlusIcon, Loader2 } from "@/components/icons"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/contexts/auth-context"

export function AddContactModal() {
  const { user } = useAuth()
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
      setError("الرجاء إدخال رقم الجوال.")
      return
    }

    setIsChecking(true)
    try {
      const { data, error } = await supabase
        .rpc('search_user_by_phone', { input_phone_number: phoneNumber.trim() })

      if (error) {
        console.error("RPC Error:", error)
        setError(error.message || "حدث خطأ أثناء التحقق من الرقم.")
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
      setError("حدث خطأ أثناء التحقق من الرقم.")
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
          setError("جهة الاتصال موجودة بالفعل.")
        } else {
          console.error("Insert Error:", error)
          setError("حدث خطأ أثناء إضافة جهة الاتصال.")
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
      setError("حدث خطأ غير متوقع.")
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
          <UserPlusIcon className="ml-2 h-4 w-4" />
          إضافة جهة اتصال
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>إضافة جهة اتصال جديدة</DialogTitle>
          <DialogDescription>
            أدخل رقم جوال الشخص الذي تريد إضافته. سيتم التحقق من تسجيله في البرنامج.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCheck} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="contact-phone">رقم الجوال</Label>
            <Input
              id="contact-phone"
              type="tel"
              placeholder="مثال: 0555123456"
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
              <p className="font-medium text-green-400">الرقم مسجل في البرنامج!</p>
              <p className="text-sm text-muted-foreground">الاسم: {userDetails.name}</p>
              <p className="text-sm text-muted-foreground">الجوال: {userDetails.phone}</p>
            </div>
          )}

          {checkResult === "not_registered" && (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="font-medium text-yellow-400">الرقم غير مسجل في البرنامج.</p>
              <p className="text-sm text-muted-foreground">لا يمكن مراسلة هذا الرقم حالياً.</p>
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
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري التحقق...
                </>
              ) : (
                "تحقق من الرقم"
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
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    جاري الإضافة...
                  </>
                ) : (
                  "إضافة جهة اتصال"
                )}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
