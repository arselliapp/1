import { createAdminClient } from "@/lib/supabase-server"
import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: Request) {
  try {
    // الحصول على التوكن من الهيدر
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("❌ No authorization header or invalid format")
      return NextResponse.json({ 
        error: "Unauthorized", 
        message: "Missing or invalid authorization header" 
      }, { status: 401 })
    }

    const token = authHeader.substring(7)
    
    if (!token || token.length < 10) {
      console.error("❌ Invalid token format")
      return NextResponse.json({ 
        error: "Unauthorized", 
        message: "Invalid token format" 
      }, { status: 401 })
    }

    console.log("🔐 Verifying token...")
    const { data: userData, error: authError } = await supabase.auth.getUser(token)

    if (authError) {
      console.error("❌ Auth error:", authError.message, authError.status)
      return NextResponse.json({ 
        error: "Unauthorized", 
        message: authError.message || "Invalid or expired token" 
      }, { status: 401 })
    }

    if (!userData || !userData.user) {
      console.error("❌ No user data found")
      return NextResponse.json({ 
        error: "Unauthorized", 
        message: "User not found" 
      }, { status: 401 })
    }

    // الحصول على بيانات الاشتراك
    const subscription = await request.json()
    console.log("📱 Saving push subscription for user:", userData.user.id)

    // حفظ الاشتراك في قاعدة البيانات باستخدام Admin Client
    const adminClient = createAdminClient()
    const { error: insertError } = await adminClient
      .from("push_subscriptions")
      .upsert(
        {
          user_id: userData.user.id,
          subscription: subscription,
          endpoint: subscription.endpoint,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,endpoint",
        }
      )

    if (insertError) {
      console.error("Error saving subscription:", insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    console.log("✅ Push subscription saved successfully")
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in subscribe route:", error)
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}





