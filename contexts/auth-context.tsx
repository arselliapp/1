"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { supabase, type User, type Session } from "@/lib/supabase/client"

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  sendMagicLink: (email: string, phoneNumber: string) => Promise<{ error: Error | null }>
  updatePhoneNumber: (phoneNumber: string) => Promise<{ error: Error | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session as unknown as Session)
        setUser(session.user as unknown as User)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setSession(session as unknown as Session)
        setUser(session.user as unknown as User)
      } else {
        setSession(null)
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithGoogle = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
    } catch (error) {
      console.error("Google sign in error:", error)
      setLoading(false)
    }
  }

  const signInWithEmail = async (email: string, password: string) => {
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (data.session) {
      setSession(data.session as unknown as Session)
      setUser(data.user as unknown as User)
      
      // حفظ الـ session في الـ cookies عبر API
      try {
        await fetch("/api/auth/session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            accessToken: data.session.access_token,
            refreshToken: data.session.refresh_token,
          }),
        })
      } catch (err) {
        console.error("Error saving session to cookies:", err)
      }
    }
    setLoading(false)
    return { error: error as Error | null }
  }

  const signUp = async (email: string, password: string) => {
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (data.session) {
      setSession(data.session as unknown as Session)
      setUser(data.user as unknown as User)
      
      // حفظ الـ session في الـ cookies عبر API
      try {
        await fetch("/api/auth/session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            accessToken: data.session.access_token,
            refreshToken: data.session.refresh_token,
          }),
        })
      } catch (err) {
        console.error("Error saving session to cookies:", err)
      }
    }
    setLoading(false)
    return { error: error as Error | null }
  }

  const sendMagicLink = async (email: string, phoneNumber: string) => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { phone_number: phoneNumber },
      },
    })
    setLoading(false)
    return { error: error as Error | null }
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
    setLoading(true)
    await supabase.auth.signOut()
    setSession(null)
    setUser(null)
    setLoading(false)
    window.location.href = "/login"
  }

  return (
    <AuthContext.Provider
      value={{ user, session, loading, signInWithGoogle, signInWithEmail, signUp, signOut, sendMagicLink, updatePhoneNumber }}
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
