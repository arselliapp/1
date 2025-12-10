"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { supabase, type User, type Session } from "@/lib/supabase/client"

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
