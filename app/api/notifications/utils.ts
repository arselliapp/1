import type { NextRequest } from "next/server"

export function resolveSiteUrl(request: NextRequest): string {
  const envSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "")
  if (envSiteUrl) {
    console.log("[resolveSiteUrl] Using NEXT_PUBLIC_SITE_URL:", envSiteUrl)
    return envSiteUrl
  }

  const vercelUrl = process.env.VERCEL_URL
  if (vercelUrl) {
    const resolved = `https://${vercelUrl.replace(/\/$/, "")}`
    console.log("[resolveSiteUrl] Using VERCEL_URL:", resolved)
    return resolved
  }

  const host = request.headers.get("host")
  if (host) {
    const protoHeader = request.headers.get("x-forwarded-proto")
    const protocol = protoHeader || (host.includes("localhost") ? "http" : "https")
    const resolved = `${protocol}://${host}`
    console.log("[resolveSiteUrl] Using host header:", resolved)
    return resolved
  }

  console.warn("[resolveSiteUrl] Unable to resolve site URL from request headers")
  return ""
}

export function getNotificationsSendUrl(request: NextRequest): string {
  const siteUrl = resolveSiteUrl(request)
  if (!siteUrl) {
    console.warn("[resolveSiteUrl] Missing site URL. Push notification endpoint unavailable.")
    return ""
  }
  const endpoint = `${siteUrl}/api/notifications/send`
  console.log("[resolveSiteUrl] Using notifications endpoint:", endpoint)
  return endpoint
}

export function serializeNotificationData(data: any): string {
  try {
    if (typeof data === "string") {
      return data
    }
    return JSON.stringify(data ?? {})
  } catch (error) {
    console.error("[serializeNotificationData] Failed to serialize data", error)
    return "{}"
  }
}

