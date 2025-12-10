import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@/lib/supabase-server"

export async function POST(request: Request) {
  try {
    const { accessToken, refreshToken } = await request.json()

    if (!accessToken) {
      return NextResponse.json({ error: "Missing tokens" }, { status: 400 })
    }

    const supabase = createRouteHandlerClient()
    
    // تعيين الـ session في الـ cookies
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken || "",
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, session: data.session })
  } catch (err) {
    console.error("Error setting session:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = createRouteHandlerClient()
    const { data, error } = await supabase.auth.getSession()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ session: data.session })
  } catch (err) {
    console.error("Error getting session:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
