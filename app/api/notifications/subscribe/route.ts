import { createRouteHandlerClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient()
    
    // الحصول على المستخدم الحالي
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // الحصول على بيانات الاشتراك
    const subscription = await request.json()

    // حفظ الاشتراك في قاعدة البيانات
    const { error: insertError } = await supabase
      .from("push_subscriptions")
      .upsert(
        {
          user_id: user.id,
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

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in subscribe route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}





