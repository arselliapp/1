"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"

export default function AuthCallbackPage() {
  const [status, setStatus] = useState("جاري تسجيل الدخول...")

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Extract tokens from URL hash
        const hash = window.location.hash.substring(1)
        const params = new URLSearchParams(hash)
        const accessToken = params.get("access_token")
        const refreshToken = params.get("refresh_token")

        if (accessToken && refreshToken) {
          // Set session with tokens
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (error) {
            console.error("setSession error:", error.message)
            setStatus("خطأ: " + error.message)
            setTimeout(() => {
              window.location.href = "/login"
            }, 2000)
            return
          }

          if (data?.session) {
            const user = data.session.user
            const phoneNumber = user?.user_metadata?.phone_number

            // Check if user has phone number
            if (phoneNumber) {
              setStatus("تم تسجيل الدخول بنجاح!")
              window.location.href = "/dashboard"
            } else {
              // Redirect to settings to link phone number
              setStatus("يرجى ربط رقم الجوال لإكمال تسجيل الدخول.")
              window.location.href = "/settings?requirePhone=true"
            }
            return
          }
        }

        // No tokens in hash, check existing session
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session) {
          const user = session.user
          const phoneNumber = user?.user_metadata?.phone_number

          // Check if user has phone number
          if (phoneNumber) {
            window.location.href = "/dashboard"
          } else {
            // Redirect to settings to link phone number
            window.location.href = "/settings?requirePhone=true"
          }
        } else {
          setStatus("لم يتم العثور على جلسة")
          setTimeout(() => {
            window.location.href = "/login"
          }, 1500)
        }
      } catch (err) {
        console.error("Callback error:", err)
        setStatus("حدث خطأ غير متوقع")
        setTimeout(() => {
          window.location.href = "/login"
        }, 2000)
      }
    }

    handleCallback()
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-muted-foreground">{status}</p>
      </div>
    </div>
  )
}
