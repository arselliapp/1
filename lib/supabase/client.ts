import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = "https://avvyoojhtzpmikozytgl.supabase.co"
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2dnlvb2podHpwbWlrb3p5dGdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3MDgxMjksImV4cCI6MjA4MDI4NDEyOX0.LUh7u-uZ1OyqKHGdJdLSLnBcZOa8WVGXVRxKsuEZL5c"

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

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
