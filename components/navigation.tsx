"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { HomeIcon, UsersIcon, SendIcon, InboxIcon, SettingsIcon, LogOutIcon, ShieldIcon, MessageSquareIcon, BellIcon, CalendarIcon } from "@/components/icons"
import { useAuth } from "@/contexts/auth-context"

const navItems = [
  { href: "/dashboard", label: "الرئيسية", icon: HomeIcon },
  { href: "/chat", label: "المحادثات", icon: MessageSquareIcon },
  { href: "/reminders", label: "التنبيهات", icon: CalendarIcon },
  { href: "/contacts", label: "جهات الاتصال", icon: UsersIcon },
  { href: "/settings", label: "الإعدادات", icon: SettingsIcon },
]

const adminNavItems = [
  { href: "/admin", label: "لوحة التحكم", icon: ShieldIcon },
]

export function Navigation() {
  const pathname = usePathname()
  const { user, signOut } = useAuth()

  const avatarUrl = user?.user_metadata?.avatar_url
  const initials = user?.email?.charAt(0).toUpperCase() || "م"
  const displayName =
    user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split("@")[0] || "مستخدم"

  return (
    <nav className="fixed bottom-0 right-0 left-0 md:top-0 md:right-0 md:bottom-0 md:left-auto md:w-64 bg-card border-t md:border-t-0 md:border-l border-border z-50">
      {/* Desktop Header */}
      <div className="hidden md:flex items-center gap-3 p-6 border-b border-border">
        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
          <SendIcon className="w-5 h-5 text-white" />
        </div>
        <span className="text-xl font-bold text-foreground">ارسل لي</span>
      </div>

      {/* Navigation Items */}
      <div className="flex md:flex-col justify-around md:justify-start md:p-4 md:gap-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col md:flex-row items-center gap-1 md:gap-3 p-3 md:px-4 md:py-3 rounded-xl transition-colors",
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary",
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs md:text-sm font-medium">{item.label}</span>
            </Link>
          )
        })}
        {user && adminNavItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "hidden md:flex flex-col md:flex-row items-center gap-1 md:gap-3 p-3 md:px-4 md:py-3 rounded-xl transition-colors",
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary",
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs md:text-sm font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>

      {/* User Profile - Desktop */}
      <div className="hidden md:flex flex-col mt-auto p-4 border-t border-border absolute bottom-0 right-0 left-0">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-primary/20 flex items-center justify-center">
            {avatarUrl ? (
              <img src={avatarUrl || "/placeholder.svg"} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-primary font-medium">{initials}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
          <button onClick={signOut} className="p-2 text-muted-foreground hover:text-destructive transition-colors">
            <LogOutIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </nav>
  )
}
