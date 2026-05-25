'use client'

import { BookingProvider } from '@/lib/booking-context'

export default function ConfirmationLayout({ children }: { children: React.ReactNode }) {
  return <BookingProvider>{children}</BookingProvider>
}
