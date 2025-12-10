"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { ClockIcon } from "@/components/icons"
import { usePendingRequests } from "@/hooks/use-pending-requests"

export function PendingRequestsBanner() {
  const { pendingRequests } = usePendingRequests()

  if (!pendingRequests || pendingRequests <= 0) {
    return null
  }

  return (
    <div className="fixed bottom-24 left-4 md:bottom-4 md:left-auto md:right-72 z-40 animate-in slide-in-from-bottom-4 duration-500">
      <Link href="/requests">
        <Card className="bg-gradient-to-r from-purple-500 to-pink-500 border-0 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200 cursor-pointer">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="relative">
              <ClockIcon className="w-6 h-6 text-white" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-white text-purple-500 rounded-full text-xs flex items-center justify-center font-bold">
                {pendingRequests}
              </span>
            </div>
            <div className="text-white">
              <p className="font-medium text-sm">
                لديك {pendingRequests} طلب{pendingRequests > 1 ? "ات" : ""} في الانتظار
              </p>
              <p className="text-xs text-white/80">اضغط للمراجعة</p>
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  )
}

