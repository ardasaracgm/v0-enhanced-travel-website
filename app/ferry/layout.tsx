'use client'

import { BookingProvider } from '@/lib/booking-context'

export default function FerryLayout({ children }: { children: React.ReactNode }) {
  return <BookingProvider>{children}</BookingProvider>
}
