import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json(
      { message: "تم تسجيل الخروج بنجاح" },
      { status: 200 }
    )

    // Clear auth cookies if any
    response.cookies.delete("auth-token")
    response.cookies.delete("sb-access-token")
    response.cookies.delete("sb-refresh-token")

    return response
  } catch (error) {
    return NextResponse.json(
      { error: "فشل تسجيل الخروج" },
      { status: 500 }
    )
  }
}
