import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = "https://avvyoojhtzpmikozytgl.supabase.co"
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2dnlvb2podHpwbWlrb3p5dGdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3MDgxMjksImV4cCI6MjA4MDI4NDEyOX0.LUh7u-uZ1OyqKHGdJdLSLnBcZOa8WVGXVRxKsuEZL5c"

// إعدادات متقدمة لحفظ الجلسة
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // حفظ الجلسة تلقائياً
    persistSession: true,
    // تخزين الجلسة في localStorage
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    // اسم مفتاح التخزين
    storageKey: 'arselli-auth-token',
    // تحديث الجلسة تلقائياً قبل انتهائها
    autoRefreshToken: true,
    // اكتشاف الجلسة من URL (للـ OAuth)
    detectSessionInUrl: true,
    // مدة صلاحية الجلسة (30 يوم بالثواني)
    // flowType: 'pkce' // أكثر أماناً
  },
  global: {
    headers: {
      'x-client-info': 'arselli-app'
    }
  }
})

// دالة للتحقق من وجود جلسة محفوظة
export async function getStoredSession() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) {
      console.error('Error getting stored session:', error)
      return null
    }
    return session
  } catch (err) {
    console.error('Error:', err)
    return null
  }
}

// دالة لتحديث الجلسة
export async function refreshSession() {
  try {
    const { data: { session }, error } = await supabase.auth.refreshSession()
    if (error) {
      console.error('Error refreshing session:', error)
      return null
    }
    return session
  } catch (err) {
    console.error('Error:', err)
    return null
  }
}

// دالة لحفظ معلومات الجهاز
export function saveDeviceInfo() {
  if (typeof window === 'undefined') return
  
  const deviceInfo = {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    lastLogin: new Date().toISOString()
  }
  
  localStorage.setItem('arselli-device-info', JSON.stringify(deviceInfo))
}

// دالة للحصول على معلومات الجهاز
export function getDeviceInfo() {
  if (typeof window === 'undefined') return null
  
  const stored = localStorage.getItem('arselli-device-info')
  return stored ? JSON.parse(stored) : null
}

export type User = {
  id: string
  email?: string
  user_metadata?: {
    full_name?: string
    avatar_url?: string
    name?: string
    phone_number?: string
  }
}

export type Session = {
  access_token: string
  refresh_token: string
  user: User
}
