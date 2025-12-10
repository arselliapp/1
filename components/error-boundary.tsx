"use client"

import React, { Component, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  }

  public static getDerivedStateFromError(_: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true }
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // You can also log the error to an error reporting service
    console.error("Uncaught error:", error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return <ErrorFallback />
    }

    return this.props.children
  }
}

function ErrorFallback() {
  const router = useRouter()

  const handleGoHome = () => {
    router.push("/")
    // Force a full reload to clear the bad state
    window.location.reload()
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
      <h1 className="text-3xl font-bold text-destructive mb-4">حدث خطأ غير متوقع</h1>
      <p className="text-muted-foreground mb-8">
        نعتذر، حدث خطأ أثناء تحميل هذه الصفحة. يرجى المحاولة مرة أخرى.
      </p>
      <Button onClick={handleGoHome}>العودة إلى الصفحة الرئيسية</Button>
    </div>
  )
}
