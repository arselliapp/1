"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { CalendarIcon, MessageSquareIcon } from "@/components/icons"
import { usePendingRequests } from "@/hooks/use-pending-requests"

export function PendingRequestsBanner() {
  const { pendingRequests, unreadMessages } = usePendingRequests()

  // إذا لا يوجد تنبيهات أو رسائل
  if ((!pendingRequests || pendingRequests <= 0) && (!unreadMessages || unreadMessages <= 0)) {
    return null
  }

  return (
    <div className="fixed bottom-24 left-4 md:bottom-4 md:left-auto md:right-72 z-40 space-y-2 animate-in slide-in-from-bottom-4 duration-500">
      {/* بانر التنبيهات المعلقة */}
      {pendingRequests > 0 && (
        <Link href="/reminders?tab=pending">
          <Card className="bg-gradient-to-r from-amber-500 to-orange-500 border-0 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200 cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="relative">
                <CalendarIcon className="w-6 h-6 text-white" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-white text-amber-500 rounded-full text-xs flex items-center justify-center font-bold">
                  {pendingRequests}
                </span>
              </div>
              <div className="text-white">
                <p className="font-medium text-sm">
                  لديك {pendingRequests} تنبيه{pendingRequests > 1 ? "ات" : ""} في الانتظار
                </p>
                <p className="text-xs text-white/80">اضغط للمراجعة</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      )}

      {/* بانر الرسائل غير المقروءة */}
      {unreadMessages > 0 && (
        <Link href="/chat">
          <Card className="bg-gradient-to-r from-emerald-500 to-teal-500 border-0 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200 cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="relative">
                <MessageSquareIcon className="w-6 h-6 text-white" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-white text-emerald-500 rounded-full text-xs flex items-center justify-center font-bold">
                  {unreadMessages}
                </span>
              </div>
              <div className="text-white">
                <p className="font-medium text-sm">
                  لديك {unreadMessages} رسالة{unreadMessages > 1 ? "" : ""} جديدة
                </p>
                <p className="text-xs text-white/80">اضغط للقراءة</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      )}
    </div>
  )
}
