import { Component, ReactNode } from "react"

interface ErrorBoundaryState {
  hasError: boolean
  message: string
}

interface ErrorBoundaryProps {
  children: ReactNode
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    message: "",
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || "應用程式發生未知錯誤",
    }
  }

  public componentDidCatch(error: Error): void {
    console.error("Renderer crashed:", error)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="app-container">
          <div className="error-boundary">
            <h2>發生錯誤</h2>
            <p>{this.state.message}</p>
            <button className="confirm-btn" type="button" onClick={() => window.location.reload()}>
              重新載入
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
