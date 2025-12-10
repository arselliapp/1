"use client"

import type React from "react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter, usePathname } from "next/navigation"
import { useEffect } from "react"
import { Navigation } from "@/components/navigation"
import { NotificationWatcher } from "@/components/notification-watcher"
import { PendingRequestsBanner } from "@/components/pending-requests-banner"

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // If not loading and user exists but has no phone number, redirect to settings
    if (!loading && user && !user.user_metadata?.phone_number && pathname !== "/settings") {
      router.push("/settings?requirePhone=true")
    }
  }, [user, loading, router, pathname])

  // Show loading spinner while checking auth or redirecting
  if (loading || (user && !user.user_metadata?.phone_number && pathname !== "/settings")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      {/* مكون مراقبة الإشعارات - يعمل في الخلفية */}
      <NotificationWatcher />
      <main className="pb-20 md:pb-0 md:pr-64">
        <div className="max-w-4xl mx-auto p-4 md:p-8">{children}</div>
      </main>
      {/* إشعار الطلبات المعلقة يظهر في كل التبويبات */}
      <PendingRequestsBanner />
    </div>
  )
}

