'use client'

import * as React from 'react'
import { Link, useRouter } from '@/i18n/routing'
import { useLocale } from 'next-intl'
import {
  Ship,
  Car,
  CheckCircle,
  Mail,
  Phone,
  User,
  Home,
  MessageCircle,
  Copy,
  Check,
  Sparkles,
} from 'lucide-react'
import { motion } from 'framer-motion'
import confetti from 'canvas-confetti'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

import { Header } from '@/components/islandbee/header'
import { Footer } from '@/components/islandbee/footer'
import { FloatingWhatsApp } from '@/components/islandbee/floating-whatsapp'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import {
  useBooking,
  clearBookingStorage,
  selectOutboundFerry,
  selectReturnFerry,
  selectCarRental,
  selectTotalPrice,
  type FerryRoute,
  type CarRentalSelection,
  type Passenger,
  type BookingItem,
} from '@/lib/booking-context'
import { summarizeItem } from '@/lib/trip-items/summary'

// ── localStorage helpers ──────────────────────────────────────────────────────

const LOCAL_STORAGE_KEY = 'travelbeez-confirmation'
const TTL_MS = 24 * 60 * 60 * 1000

interface ConfirmationRecord {
  reference:   string
  whatsappUrl: string
  isCarOnly:   boolean
  timestamp:   number
}

function writeConfirmationRecord(data: Omit<ConfirmationRecord, 'timestamp'>): void {
  try {
    const record: ConfirmationRecord = { ...data, timestamp: Date.now() }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(record))
  } catch {
    // localStorage unavailable (private browsing, quota exceeded) — ignore
  }
}

function readConfirmationRecord(): ConfirmationRecord | null {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (!raw) return null
    const record = JSON.parse(raw) as ConfirmationRecord
    if (Date.now() - record.timestamp > TTL_MS) {
      localStorage.removeItem(LOCAL_STORAGE_KEY)
      return null
    }
    return record
  } catch {
    return null
  }
}

function clearConfirmationRecord(): void {
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY)
  } catch {
    // ignore
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

type ConfirmationMode = 'loading' | 'fresh' | 'refresh' | 'empty'

interface BookingSnapshot {
  bookingReference:   string
  contactEmail:       string
  contactPhone:       string
  paymentWhatsAppUrl: string
  outbound:           FerryRoute | null
  returnFerry:        FerryRoute | null
  car:                CarRentalSelection | null
  passengers:         Passenger[]
  searchDate:         string
  returnDate:         string
  passengerCount:     number
  ferryTotal:         number
  returnTotal:        number
  carTotal:           number
  grandTotal:         number
  items:              BookingItem[]
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ConfirmationPage() {
  const { state, dispatch } = useBooking()
  const router = useRouter()
  const locale = useLocale()

  const [mode, setMode]                 = React.useState<ConfirmationMode>('loading')
  const [snapshot, setSnapshot]         = React.useState<BookingSnapshot | null>(null)
  const [storedRecord, setStoredRecord] = React.useState<ConfirmationRecord | null>(null)
  const [copied, setCopied]             = React.useState(false)
  const modeDetectedRef                 = React.useRef(false)

  // Fires confetti only when the fresh booking lands — not on refresh/empty.
  React.useEffect(() => {
    if (mode === 'fresh') {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#1e88e5', '#FFD54F', '#4CAF50'],
      })
    }
  }, [mode])

  // Mode-detection — fires once, after BookingProvider has hydrated.
  // INVARIANT: initialState sets idempotencyKey to ''. BookingProvider then either
  // restores a UUID from sessionStorage or generates a fresh one via newIdempotencyKey().
  // Both paths produce a truthy string, so the '' → truthy transition is the hydration
  // signal. Do NOT change initialState.idempotencyKey to null or to a lazily-initialised
  // form without updating this gate — doing so would make mode detection fire before
  // context is fully hydrated, always falling through to the localStorage/empty path.
  //
  // modeDetectedRef blocks re-entry: the RESET dispatch regenerates idempotencyKey,
  // which would otherwise trigger a second detection pass that overwrites 'fresh' with
  // 'empty'.
  React.useEffect(() => {
    if (!state.idempotencyKey) return
    if (modeDetectedRef.current) return
    modeDetectedRef.current = true

    const outbound = selectOutboundFerry(state)
    const car      = selectCarRental(state)

    // Car-only standalone bookings have no ferry leg — accept either a ferry
    // or a car item so they reach 'fresh' mode (and write a record) instead
    // of falling through to 'empty' on the very first visit.
    if (state.bookingReference && (outbound || car)) {
      const returnFerry    = selectReturnFerry(state)
      const passengerCount = state.searchParams.passengers

      setSnapshot({
        bookingReference:   state.bookingReference,
        contactEmail:       state.contactEmail,
        contactPhone:       state.contactPhone,
        paymentWhatsAppUrl: state.paymentWhatsAppUrl,
        outbound,
        returnFerry,
        car,
        passengers:  state.passengers,
        searchDate:  state.searchParams.date,
        returnDate:  state.searchParams.returnDate ?? '',
        passengerCount,
        ferryTotal:  outbound ? outbound.price * passengerCount : 0,
        returnTotal: returnFerry ? returnFerry.price * passengerCount : 0,
        carTotal:    car ? car.pricePerDay * car.days : 0,
        grandTotal:  selectTotalPrice(state),
        items:       state.items,
      })

      writeConfirmationRecord({
        reference:   state.bookingReference,
        whatsappUrl: state.paymentWhatsAppUrl,
        isCarOnly:   isCarOnly(state.items),
      })

      clearBookingStorage()
      dispatch({ type: 'RESET' })
      setMode('fresh')
      return
    }

    const record = readConfirmationRecord()
    if (record) {
      setStoredRecord(record)
      setMode('refresh')
    } else {
      setMode('empty')
    }
  }, [state.idempotencyKey]) // eslint-disable-line react-hooks/exhaustive-deps -- intentional: run once after first hydration; including state/dispatch would re-fire on every state change

  const activeReference = snapshot?.bookingReference ?? storedRecord?.reference ?? ''

  const handleCopyReference = async () => {
    try {
      await navigator.clipboard.writeText(activeReference)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard unavailable, ignore
    }
  }

  /**
   * Clears booking state then navigates imperatively.
   *
   * Why not <Button asChild><Link>? The asChild pattern merges onClick onto
   * the Link child, but React's persistence useEffect (which writes reset
   * state to sessionStorage) is not guaranteed to flush before Next.js
   * initiates the route transition. Using router.push() after the synchronous
   * side-effects ensures sessionStorage is cleared and the in-memory RESET has
   * been dispatched before the new page's BookingProvider can hydrate.
   */
  // Car-only booking (a car item, no ferry) → "new booking" returns to the
  // car-rental fleet rather than the ferry search.
  const isCarOnly = (its: BookingItem[]) => its.length > 0 && !its.some((i) => i.type === 'ferry')

  const handleNewBooking = (href: '/' | '/ferry' | '/car-rental') => {
    clearConfirmationRecord()
    clearBookingStorage()
    dispatch({ type: 'RESET' })
    router.push(href)
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  // 'loading': return null suppresses the empty-state flash between first paint
  // and BookingProvider hydration — the component mounts before its parent's effect runs.
  if (mode === 'loading') return null

  if (mode === 'empty') {
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
              {/* Empty mode carries no item info — type is unknown, so route to
                  a neutral home rather than assuming a ferry search. */}
              <Link href="/">
                <Button>
                  <Home className="h-4 w-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    )
  }

  if (mode === 'refresh' && storedRecord) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex-1">
          <section className="w-full py-12 bg-gradient-to-b from-green-50 to-background">
            <div className="container px-4 md:px-6">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="h-10 w-10 text-green-600" />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                  Booking Reserved!
                </h1>
              </div>
            </div>
          </section>

          <section className="w-full py-8">
            <div className="container px-4 md:px-6 max-w-3xl mx-auto">
              <Card className="border-primary/30 mb-6">
                <CardContent className="p-6 text-center">
                  <p className="text-sm text-muted-foreground uppercase tracking-wide mb-2">
                    Your Booking Reference
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <p className="text-3xl md:text-4xl font-mono font-bold text-primary">
                      {storedRecord.reference}
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
                        Trip details have been sent to your email — contact us via WhatsApp
                        to complete your payment.
                      </p>
                      <a
                        href={storedRecord.whatsappUrl || 'https://wa.me/302242050008'}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button className="bg-[#25D366] hover:bg-[#25D366]/90 text-white">
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Open WhatsApp
                        </Button>
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Hub erişim CTA — email saklanmadığı için input ile */}
              <HubAccessCard />

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button type="button" variant="outline" onClick={() => handleNewBooking('/')}>
                  <Home className="h-4 w-4 mr-2" />
                  Back to Home
                </Button>
                {/* ConfirmationRecord now carries isCarOnly, so route car-only
                    bookings back to the fleet instead of the ferry search. */}
                <Button type="button" variant="outline" onClick={() => handleNewBooking(storedRecord.isCarOnly ? '/car-rental' : '/ferry')}>
                  Start New Booking
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

  // 'fresh' mode — full detail from in-memory snapshot; never null at this point
  if (!snapshot) return null

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
                <span className="font-medium text-foreground">{snapshot.contactEmail}</span>
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
                    {snapshot.bookingReference}
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
                    {snapshot.paymentWhatsAppUrl ? (
                      <a
                        href={snapshot.paymentWhatsAppUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button className="bg-[#25D366] hover:bg-[#25D366]/90 text-white">
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Pay €{snapshot.grandTotal} on WhatsApp
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
                  {snapshot.outbound ? (
                    <Ship className="h-5 w-5 text-primary" />
                  ) : (
                    <Car className="h-5 w-5 text-primary" />
                  )}
                  Trip Details
                </h3>

                <div className="space-y-4">
                  {/* All line items from the same source as the total (snapshot.items,
                      captured pre-RESET) — registry covers ferry/car/luggage/insurance. */}
                  {snapshot.items.map((item, i) => {
                    const row = summarizeItem(item, locale)
                    return (
                      <div key={i} className="p-4 bg-secondary/50 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                            {row.label}
                          </span>
                          <span className="text-sm font-semibold text-primary">€{row.amount}</span>
                        </div>
                        <p className="font-semibold text-foreground">{row.title}</p>
                        {row.detail && (
                          <p className="text-sm text-muted-foreground mt-1">{row.detail}</p>
                        )}
                      </div>
                    )
                  })}
                </div>

                <Separator className="my-4" />

                <div className="flex justify-between items-center">
                  <span className="font-bold text-foreground">Total</span>
                  <span className="text-2xl font-bold text-primary">€{snapshot.grandTotal}</span>
                </div>
              </CardContent>
            </Card>

            {/* Passengers */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Passengers ({snapshot.passengers.length})
                </h3>
                <div className="space-y-3">
                  {snapshot.passengers.map((p, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                    >
                      <div>
                        <p className="font-medium text-foreground">{p.firstName} {p.lastName}</p>
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
                      <strong>{snapshot.contactEmail}</strong>.
                    </span>
                  </li>
                </ol>

                <Separator />

                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4 text-primary" />
                    <span>{snapshot.contactEmail}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4 text-primary" />
                    <span>{snapshot.contactPhone}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Hub erişim CTA — email zaten elimizde */}
            <HubAccessCard presetEmail={snapshot.contactEmail} />

            {/* New booking CTA */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button type="button" variant="outline" onClick={() => handleNewBooking('/')}>
                <Home className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
              <Button type="button" variant="outline" onClick={() => handleNewBooking(isCarOnly(snapshot.items) ? '/car-rental' : '/ferry')}>
                Start New Booking
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

// ── Hub access (lazy-reg, OTP) ─────────────────────────────────────────────────
// Üyelik CHECKOUT'ta zorlanmaz; booking sonrası opt-in. signInWithOtp magic-link
// gönderir, link /hub'a döner (middleware locale prefix'ini ekler). Misafir akışı
// bundan etkilenmez — buton tıklanmazsa hiçbir auth çağrısı olmaz.
function HubAccessCard({ presetEmail }: { presetEmail?: string }) {
  const locale = useLocale()
  const [email, setEmail] = React.useState(presetEmail ?? '')
  const [status, setStatus] =
    React.useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  const handleSend = async () => {
    if (!email || status === 'sending') return
    setStatus('sending')
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${siteUrl}/api/auth/callback?next=/${locale}/hub`,
      },
    })
    setStatus(error ? 'error' : 'sent')
  }

  return (
    <Card className="border-primary/30 mb-6">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-foreground mb-1">
              Track everything in your Hub
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Get a one-tap link to manage this booking, visa and more — no password.
            </p>

            {status === 'sent' ? (
              <p className="text-sm font-medium text-green-700">
                Link sent to {email}. Check your inbox.
              </p>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2">
                {!presetEmail && (
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                )}
                <Button type="button" onClick={handleSend} disabled={status === 'sending'}>
                  {status === 'sending' ? 'Sending…' : 'Access Hub'}
                </Button>
              </div>
            )}
            {status === 'error' && (
              <p className="text-sm text-destructive mt-2">
                Couldn&apos;t send the link. Please try again.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
