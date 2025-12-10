"use client"

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react"
import { supabase, saveDeviceInfo, getStoredSession, refreshSession, type User, type Session } from "@/lib/supabase/client"

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  updatePhoneNumber: (phoneNumber: string) => Promise<{ error: Error | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  // دالة لتحديث الجلسة تلقائياً
  const handleSessionRefresh = useCallback(async () => {
    try {
      const refreshedSession = await refreshSession()
      if (refreshedSession) {
        setSession(refreshedSession as unknown as Session)
        setUser(refreshedSession.user as unknown as User)
        console.log("✅ Session refreshed successfully")
      }
    } catch (err) {
      console.error("Error refreshing session:", err)
    }
  }, [])

  useEffect(() => {
    let refreshInterval: NodeJS.Timeout | null = null

    // Get initial session
    const initSession = async () => {
      try {
        // محاولة استرجاع الجلسة المحفوظة
        const storedSession = await getStoredSession()
        
        if (storedSession) {
          setSession(storedSession as unknown as Session)
          setUser(storedSession.user as unknown as User)
          
          // حفظ معلومات الجهاز
          saveDeviceInfo()
          
          // تحديث الجلسة إذا كانت قديمة (أكثر من 30 دقيقة)
          const expiresAt = storedSession.expires_at
          if (expiresAt) {
            const expiresTime = new Date(expiresAt * 1000).getTime()
            const now = Date.now()
            const thirtyMinutes = 30 * 60 * 1000
            
            if (expiresTime - now < thirtyMinutes) {
              console.log("🔄 Session expiring soon, refreshing...")
              await handleSessionRefresh()
            }
          }
        }
        
        setLoading(false)
      } catch (err) {
        console.error("Error initializing session:", err)
        setLoading(false)
      }
    }

    initSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("🔐 Auth event:", event)
      
      if (session) {
        setSession(session as unknown as Session)
        setUser(session.user as unknown as User)
        
        // حفظ معلومات الجهاز عند تسجيل الدخول
        if (event === 'SIGNED_IN') {
          saveDeviceInfo()
          console.log("✅ User signed in, device info saved")
        }
      } else {
        setSession(null)
        setUser(null)
      }
      
      setLoading(false)
    })

    // تحديث الجلسة كل 10 دقائق
    refreshInterval = setInterval(() => {
      if (session) {
        handleSessionRefresh()
      }
    }, 10 * 60 * 1000) // 10 دقائق

    return () => {
      subscription.unsubscribe()
      if (refreshInterval) {
        clearInterval(refreshInterval)
      }
    }
  }, [handleSessionRefresh])

  const signInWithGoogle = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          // حفظ الجلسة لفترة طويلة
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        },
      })
      if (error) throw error
    } catch (error) {
      console.error("Google sign in error:", error)
      setLoading(false)
    }
  }

  const updatePhoneNumber = async (phoneNumber: string) => {
    if (!user) return { error: new Error("User not logged in") }

    setLoading(true)
    const { data, error } = await supabase.auth.updateUser({
      data: { phone_number: phoneNumber },
    })

    if (data.user) {
      setUser(data.user as unknown as User)
    }

    setLoading(false)
    return { error: error as Error | null }
  }

  const signOut = async () => {
    try {
      // مسح الحالة أولاً
      setSession(null)
      setUser(null)
      setLoading(false)
      
      // مسح بيانات التخزين (ما عدا بعض الإعدادات)
      const keysToKeep = ['admin_pin'] // الإعدادات التي نريد الاحتفاظ بها
      const allKeys = Object.keys(localStorage)
      allKeys.forEach(key => {
        if (!keysToKeep.includes(key)) {
          localStorage.removeItem(key)
        }
      })
      sessionStorage.clear()
      
      // مسح الـ cache
      if ('caches' in window) {
        const cacheNames = await caches.keys()
        await Promise.all(cacheNames.map(name => caches.delete(name)))
      }
      
      // تسجيل الخروج من Supabase
      await supabase.auth.signOut()
      
      // إعادة التوجيه فوراً
      window.location.replace("/login")
    } catch (error) {
      console.error("Sign out error:", error)
      // حتى لو حدث خطأ، أعد التوجيه
      window.location.replace("/login")
    }
  }

  return (
    <AuthContext.Provider
      value={{ user, session, loading, signInWithGoogle, signOut, updatePhoneNumber }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
