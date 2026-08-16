"use client"

import React, { Component, ErrorInfo, ReactNode } from "react"

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ArenaErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in Arena Canvas:", error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-[550px] bg-red-950/20 border-2 border-red-500/50 rounded-lg flex flex-col items-center justify-center p-6 text-center select-none shadow-2xl relative overflow-hidden backdrop-blur-sm">
          <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-4 border border-red-500/20 shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-xl font-black text-red-400 uppercase tracking-wider mb-2">Arena Crashed</h3>
          <p className="text-zinc-300 text-sm max-w-md mb-4 bg-black/40 p-3 rounded border border-red-500/10 font-mono text-left break-all max-h-32 overflow-y-auto">
            {this.state.error?.toString() || "Unknown WebGL/R3F Error"}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase rounded transition-all shadow-lg shadow-red-600/20 pointer-events-auto cursor-pointer"
          >
            Attempt Reconnect / Reload
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
