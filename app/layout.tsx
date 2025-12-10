import type { ReactNode } from "react"

import type { Metadata, Viewport } from "next"

import { Noto_Sans_Arabic } from "next/font/google"

import { AuthProvider } from "@/contexts/auth-context"

import { ErrorBoundary } from "@/components/error-boundary"

import { ToastProvider } from "@/components/toast-notification"

import { PhoneNumberModal } from "@/components/phone-number-modal"

import { PWAInstallPrompt } from "@/components/pwa-install-prompt"

import { PWAUpdateNotifier } from "@/components/pwa-update-notifier"

import { NetworkStatus } from "@/components/network-status"

import { NotificationPermission } from "@/components/notification-permission"

import { Footer } from "@/components/footer"

import "./globals.css"



const notoArabic = Noto_Sans_Arabic({ subsets: ["arabic"] })



export const metadata: Metadata = {

  title: "ارسل لي",

  description: "تواصل مع من تحب بطريقة أسهل",

  generator: 'v0.app',

  manifest: '/manifest.json',

  appleWebApp: {

    capable: true,

    statusBarStyle: 'default',

    title: 'أرسل لي'

  },

  icons: {

    icon: [

      { url: '/icon-16x16.png', sizes: '16x16', type: 'image/png' },

      { url: '/icon-32x32.png', sizes: '32x32', type: 'image/png' },

      { url: '/icon-48x48.png', sizes: '48x48', type: 'image/png' },

      { url: '/favicon.ico', sizes: 'any' }

    ],

    apple: [

      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' }

    ]

  }

}

export const viewport: Viewport = {

  width: 'device-width',

  initialScale: 1,

  maximumScale: 1,

  userScalable: false,

  themeColor: '#10b981'

}



export default function RootLayout({

  children,

}: Readonly<{

  children: ReactNode

}>) {

  return (

    <html lang="ar" dir="rtl">

      <head>

        <link rel="manifest" href="/manifest.json" />

        <link rel="icon" href="/favicon.ico" sizes="any" />

        <link rel="icon" type="image/png" sizes="16x16" href="/icon-16x16.png" />

        <link rel="icon" type="image/png" sizes="32x32" href="/icon-32x32.png" />

        <link rel="icon" type="image/png" sizes="48x48" href="/icon-48x48.png" />

        <link rel="apple-touch-icon" href="/icon-192x192.png" />

        <meta name="theme-color" content="#10b981" />

        <meta name="mobile-web-app-capable" content="yes" />

        <meta name="apple-mobile-web-app-capable" content="yes" />

        <meta name="apple-mobile-web-app-status-bar-style" content="default" />

        <meta name="apple-mobile-web-app-title" content="أرسل لي" />

        {/* سكربت لإصلاح مشاكل التخزين المؤقت */}
        <script dangerouslySetInnerHTML={{
          __html: `
            // مسح Service Workers القديمة
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.getRegistrations().then(function(registrations) {
                for (let registration of registrations) {
                  if (registration.active && registration.active.scriptURL.includes('sw.js')) {
                    // إعادة تسجيل SW إذا كان قديماً
                    registration.update();
                  }
                }
              });
            }
            
            // إعادة تحميل الصفحة إذا كانت عالقة
            window.addEventListener('load', function() {
              setTimeout(function() {
                var content = document.body.innerHTML;
                if (!content || content.trim().length < 100) {
                  // الصفحة فارغة - أعد التحميل
                  if (!sessionStorage.getItem('reloaded')) {
                    sessionStorage.setItem('reloaded', 'true');
                    window.location.reload();
                  }
                } else {
                  sessionStorage.removeItem('reloaded');
                }
              }, 3000);
            });
          `
        }} />

      </head>

      <body className={`${notoArabic.className} antialiased`}>

        <ErrorBoundary>

          <AuthProvider>

            <ToastProvider>

              {children}

              <PhoneNumberModal />

              <PWAInstallPrompt />

              <PWAUpdateNotifier />

              <NetworkStatus />

              <NotificationPermission />

              <Footer />

            </ToastProvider>

          </AuthProvider>

        </ErrorBoundary>

      </body>

    </html>

  )

}