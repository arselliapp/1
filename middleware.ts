import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { jwtDecode } from "jwt-decode"

export function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // الحفاظ على جميع الـ cookies
  const requestCookies = request.cookies
  requestCookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie.name, cookie.value, {
      maxAge: cookie.maxAge,
      path: "/",
      sameSite: "lax",
    })
  })

  // Add security headers
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-XSS-Protection", "1; mode=block")

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
