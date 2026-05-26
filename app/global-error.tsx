'use client'

import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Application Error
          </h1>
          <p className="text-slate-600 mb-6">
            A critical error occurred. Please refresh the page to continue.
          </p>
          {process.env.NODE_ENV === 'development' && error?.message && (
            <div className="mb-6 p-4 bg-slate-100 rounded-lg text-left">
              <p className="text-xs font-mono text-slate-600 break-all">
                {error.message}
              </p>
            </div>
          )}
          <Button 
            onClick={reset} 
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh Page
          </Button>
          <p className="mt-8 text-sm text-slate-500">
            If the problem persists, please contact us on{' '}
            <a 
              href="https://wa.me/302242050008" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              WhatsApp
            </a>
          </p>
        </div>
      </body>
    </html>
  )
}
