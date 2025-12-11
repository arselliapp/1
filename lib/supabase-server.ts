import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://avvyoojhtzpmikozytgl.supabase.co"
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2dnlvb2podHpwbWlrb3p5dGdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3MDgxMjksImV4cCI6MjA4MDI4NDEyOX0.LUh7u-uZ1OyqKHGdJdLSLnBcZOa8WVGXVRxKsuEZL5c"
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

/**
 * إنشاء Supabase client للاستخدام في Server Components و API Routes
 */
export function createRouteHandlerClient() {
  const cookieStore = cookies()
  
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      storage: {
        getItem: (key: string) => {
          try {
            const value = cookieStore.get(key)?.value
            return value || null
          } catch (err) {
            console.error(`Error getting cookie ${key}:`, err)
            return null
          }
        },
        setItem: (key: string, value: string) => {
          try {
            // محاولة تعيين الـ cookie
            cookieStore.set(key, value, {
              maxAge: 60 * 60 * 24 * 365, // سنة واحدة
              path: "/",
              sameSite: "lax",
              secure: process.env.NODE_ENV === "production",
            })
          } catch (err) {
            // في بعض حالات الـ API Routes، قد لا يكون من الممكن تعيين cookies
            console.warn(`Could not set cookie ${key}:`, err)
          }
        },
        removeItem: (key: string) => {
          try {
            cookieStore.delete(key)
          } catch (err) {
            console.warn(`Could not remove cookie ${key}:`, err)
          }
        },
      },
    },
  })
}

/**
 * إنشاء Supabase admin client للعمليات التي تحتاج صلاحيات عالية
 */
export function createAdminClient() {
  if (!SUPABASE_SERVICE_KEY) {
    // استخدام anon key هنا سيؤدي إلى فشل RLS بصمت، لذا نوقف التنفيذ برسالة واضحة
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set. Admin client requires the service role key.")
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}





