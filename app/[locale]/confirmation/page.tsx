'use client'

import * as React from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import {
  Ship,
  CheckCircle,
  Mail,
  Phone,
  Calendar,
  Clock,
  User,
  Home,
  MessageCircle,
  Copy,
  Check,
} from 'lucide-react'
import { motion } from 'framer-motion'
import confetti from 'canvas-confetti'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

import { Header } from '@/components/islandbee/header'
import { Footer } from '@/components/islandbee/footer'
import { FloatingWhatsApp } from '@/components/islandbee/floating-whatsapp'
import { useBooking, clearBookingStorage } from '@/lib/booking-context'

export default function ConfirmationPage() {
  const locale = useLocale()
  const { state, dispatch } = useBooking()
  const [copied, setCopied] = React.useState(false)

  // Confetti on mount (only when a real booking exists)
  React.useEffect(() => {
    if (state.bookingReference && state.selectedFerry) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#1e88e5', '#FFD54F', '#4CAF50'],
      })
    }
  }, [state.bookingReference, state.selectedFerry])

  const handleCopyReference = async () => {
    try {
      await navigator.clipboard.writeText(state.bookingReference)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard may be unavailable, ignore
    }
  }

  // No active booking — show empty state
  if (!state.selectedFerry || !state.bookingReference) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Card className="max-w-md mx-auto">
            <CardContent className="p-8 text-center">
              <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-bold text-foreground mb-2">No Booking Found</h2>
              <p className="text-muted-foreground mb-6">
                Start a new booking to see your confirmation.
              </p>
              <Link href={`/${locale}/ferry`}>
                <Button>Search Ferries</Button>
              </Link>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    )
  }

  // Compute totals
  const ferryTotal = state.selectedFerry.price * state.searchParams.passengers
  const returnTotal = state.returnFerry
    ? state.returnFerry.price * state.searchParams.passengers
    : 0
  const carTotal = state.carRental
    ? state.carRental.pricePerDay * state.carRental.days
    : 0
  const grandTotal = ferryTotal + returnTotal + carTotal

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1">
        {/* Success Header */}
        <section className="w-full py-12 bg-gradient-to-b from-green-50 to-background">
          <div className="container px-4 md:px-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Booking Reserved!
              </h1>
              <p className="text-muted-foreground text-lg mb-2">
                Thank you for choosing TravelBeez
              </p>
              <p className="text-sm text-muted-foreground">
                Confirmation sent to{' '}
                <span className="font-medium text-foreground">{state.contactEmail}</span>
              </p>
            </motion.div>
          </div>
        </section>

        {/* Reference + Payment CTA */}
        <section className="w-full py-8">
          <div className="container px-4 md:px-6 max-w-3xl mx-auto">
            <Card className="border-primary/30 mb-6">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground uppercase tracking-wide mb-2">
                  Your Booking Reference
                </p>
                <div className="flex items-center justify-center gap-3">
                  <p className="text-3xl md:text-4xl font-mono font-bold text-primary">
                    {state.bookingReference}
                  </p>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={handleCopyReference}
                    aria-label="Copy reference"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Save this code. You&apos;ll need it for payment and support.
                </p>
              </CardContent>
            </Card>

            {/* Payment CTA — the prominent action */}
            <Card className="bg-[#25D366]/5 border-[#25D366]/40 mb-6">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#25D366] flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-foreground mb-1">
                      Next: Confirm Payment on WhatsApp
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Tap below to open WhatsApp. We&apos;ll send a secure payment link and
                      finalize your booking immediately.
                    </p>
                    {state.paymentWhatsAppUrl ? (
                      <a
                        href={state.paymentWhatsAppUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button className="bg-[#25D366] hover:bg-[#25D366]/90 text-white">
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Pay €{grandTotal} on WhatsApp
                        </Button>
                      </a>
                    ) : (
                      <a
                        href="https://wa.me/302242050008"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button className="bg-[#25D366] hover:bg-[#25D366]/90 text-white">
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Open WhatsApp
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Trip details */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <Ship className="h-5 w-5 text-primary" />
                  Trip Details
                </h3>

                <div className="space-y-4">
                  {/* Outbound */}
                  <div className="p-4 bg-secondary/50 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                        Outbound
                      </span>
                      <span className="text-sm font-semibold text-primary">€{ferryTotal}</span>
                    </div>
                    <p className="font-semibold text-foreground">
                      {state.selectedFerry.from} → {state.selectedFerry.to}
                    </p>
                    <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                      <Calendar className="h-4 w-4" />
                      {state.searchParams.date}
                      <Clock className="h-4 w-4 ml-2" />
                      {state.selectedFerry.departureTime} - {state.selectedFerry.arrivalTime}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {state.selectedFerry.operator} · {state.selectedFerry.vessel}
                    </p>
                  </div>

                  {/* Return */}
                  {state.returnFerry && (
                    <div className="p-4 bg-secondary/50 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                          Return
                        </span>
                        <span className="text-sm font-semibold text-primary">€{returnTotal}</span>
                      </div>
                      <p className="font-semibold text-foreground">
                        {state.returnFerry.from} → {state.returnFerry.to}
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                        <Calendar className="h-4 w-4" />
                        {state.searchParams.returnDate}
                        <Clock className="h-4 w-4 ml-2" />
                        {state.returnFerry.departureTime} - {state.returnFerry.arrivalTime}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {state.returnFerry.operator} · {state.returnFerry.vessel}
                      </p>
                    </div>
                  )}

                  {/* Car rental */}
                  {state.carRental && (
                    <div className="p-4 bg-secondary/50 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                          Car Rental
                        </span>
                        <span className="text-sm font-semibold text-primary">€{carTotal}</span>
                      </div>
                      <p className="font-semibold text-foreground">
                        {state.carRental.brand
                          ? `${state.carRental.brand} ${state.carRental.model}`
                          : state.carRental.model}{' '}
                        ({state.carRental.days}{' '}
                        {state.carRental.days === 1 ? 'day' : 'days'})
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Pickup: {state.carRental.pickupLocation}
                      </p>
                    </div>
                  )}
                </div>

                <Separator className="my-4" />

                <div className="flex justify-between items-center">
                  <span className="font-bold text-foreground">Total</span>
                  <span className="text-2xl font-bold text-primary">€{grandTotal}</span>
                </div>
              </CardContent>
            </Card>

            {/* Passengers */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Passengers ({state.passengers.length})
                </h3>
                <div className="space-y-3">
                  {state.passengers.map((p, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                    >
                      <div>
                        <p className="font-medium text-foreground">{p.fullName}</p>
                        <p className="text-sm text-muted-foreground">
                          {p.nationality} · Passport: {p.passportNumber}
                        </p>
                      </div>
                      {i === 0 && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                          Lead
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Contact + next steps */}
            <Card className="mb-6">
              <CardContent className="p-6 space-y-4">
                <h3 className="text-lg font-bold text-foreground">What happens next?</h3>
                <ol className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">
                      1
                    </span>
                    <span>
                      Tap the WhatsApp button above to message us with your reference.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">
                      2
                    </span>
                    <span>
                      We send a secure payment link. Pay by card or bank transfer (EUR).
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">
                      3
                    </span>
                    <span>
                      Once payment clears, your tickets are issued and emailed to{' '}
                      <strong>{state.contactEmail}</strong>.
                    </span>
                  </li>
                </ol>

                <Separator />

                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4 text-primary" />
                    <span>{state.contactEmail}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4 text-primary" />
                    <span>{state.contactPhone}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* New booking CTA */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href={`/${locale}`}>
                <Button variant="outline">
                  <Home className="h-4 w-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
              <Button
                variant="outline"
                onClick={() => {
                  clearBookingStorage()
                  dispatch({ type: 'RESET' })
                }}
                asChild
              >
                <Link href={`/${locale}/ferry`}>Start New Booking</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <FloatingWhatsApp />
    </div>
  )
}
