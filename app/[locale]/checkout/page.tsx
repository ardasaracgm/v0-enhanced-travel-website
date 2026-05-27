'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import {
  Ship,
  ChevronLeft,
  User,
  CheckCircle,
  Lock,
  Shield,
  AlertCircle,
  MessageCircle,
} from 'lucide-react'
import { motion } from 'framer-motion'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

import { Header } from '@/components/islandbee/header'
import { Footer } from '@/components/islandbee/footer'
import { FloatingWhatsApp } from '@/components/islandbee/floating-whatsapp'
import { useBooking } from '@/lib/booking-context'
import { submitBooking } from '@/lib/actions/submit-booking'
import type { Locale } from '@/lib/notifications/whatsapp-link'

export default function CheckoutPage() {
  const router = useRouter()
  const locale = useLocale() as Locale
  const { state, dispatch } = useBooking()
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [acceptTerms, setAcceptTerms] = React.useState(false)

  const handleConfirm = async () => {
    if (!acceptTerms || isProcessing) return
    if (!state.selectedFerry) return

    setIsProcessing(true)
    dispatch({ type: 'SET_SUBMIT_ERROR', payload: null })

    try {
      const result = await submitBooking({
        idempotencyKey: state.idempotencyKey,
        locale,
        outboundFerryId: state.selectedFerry.id,
        returnFerryId: state.returnFerry?.id,
        carRentalId: state.carRental?.carId,
        carRentalDays: state.carRental?.days,
        carPickupAt: state.carRental?.pickupAt,
        carDropoffAt: state.carRental?.dropoffAt,
        departDate: state.searchParams.date,
        returnDate: state.searchParams.returnDate,
        passengerCount: state.searchParams.passengers,
        passengers: state.passengers.map((p, idx) => ({
          fullName: p.fullName,
          birthDate: p.birthDate,
          passportNumber: p.passportNumber,
          nationality: p.nationality,
          isLead: idx === 0,
        })),
        contactEmail: state.contactEmail,
        contactPhone: state.contactPhone,
      })

      if (!result.ok) {
        dispatch({ type: 'SET_SUBMIT_ERROR', payload: result.error })
        setIsProcessing(false)
        return
      }

      // Success — persist reference + payment link, navigate to confirmation
      dispatch({ type: 'SET_BOOKING_REFERENCE', payload: result.reference })
      dispatch({ type: 'SET_PAYMENT_LINK', payload: result.paymentWhatsAppUrl })
      router.push(`/${locale}/confirmation`)
    } catch (err) {
      console.error('[checkout] submit threw:', err)
      dispatch({
        type: 'SET_SUBMIT_ERROR',
        payload: 'Unexpected error. Please try again or contact us on WhatsApp.',
      })
      setIsProcessing(false)
    }
  }

  // Guard: must have ferry + passengers before reaching this page
  if (!state.selectedFerry || state.passengers.length === 0) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Card className="max-w-md mx-auto">
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-bold text-foreground mb-2">Booking Incomplete</h2>
              <p className="text-muted-foreground mb-6">
                Please complete the previous steps before checkout.
              </p>
              <Link href={`/${locale}/ferry`}>
                <Button>Start New Booking</Button>
              </Link>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1">
        {/* Header Bar */}
        <section className="w-full py-6 bg-primary text-primary-foreground">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <Link href={`/${locale}/ferry/passenger-details`}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-primary-foreground hover:bg-primary-foreground/10"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                </Link>
                <div>
                  <h1 className="text-lg font-semibold">Review & Confirm</h1>
                  <p className="text-sm text-primary-foreground/80">
                    Review your booking. Payment via WhatsApp after confirmation.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-primary-foreground/80">
                <Lock className="h-4 w-4" />
                <span>Secure booking</span>
              </div>
            </div>
          </div>
        </section>

        {/* Progress Steps */}
        <section className="w-full py-4 border-b border-border/50 bg-card">
          <div className="container px-4 md:px-6">
            <div className="flex items-center justify-center gap-4 md:gap-8 text-xs md:text-sm">
              <Step done label="Select Ferry" />
              <Divider />
              <Step done label="Passengers" />
              <Divider />
              <Step current label="Confirm" />
            </div>
          </div>
        </section>

        {/* Checkout Content */}
        <section className="w-full py-8 md:py-12">
          <div className="container px-4 md:px-6">
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Summary */}
              <div className="lg:col-span-2 space-y-6">
                {/* Booking Overview */}
                <Card className="bg-card border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-lg">
                      <Ship className="h-5 w-5 text-primary" />
                      Your Trip
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-secondary/50 rounded-xl">
                      <div>
                        <p className="text-sm text-muted-foreground">Outbound</p>
                        <p className="font-semibold text-foreground">
                          {state.selectedFerry.from} → {state.selectedFerry.to}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {state.searchParams.date} · {state.selectedFerry.departureTime} -{' '}
                          {state.selectedFerry.arrivalTime}
                        </p>
                      </div>
                      <p className="text-lg font-bold text-primary mt-2 md:mt-0">
                        €{state.selectedFerry.price * state.searchParams.passengers}
                      </p>
                    </div>

                    {state.returnFerry && (
                      <div className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-secondary/50 rounded-xl">
                        <div>
                          <p className="text-sm text-muted-foreground">Return</p>
                          <p className="font-semibold text-foreground">
                            {state.returnFerry.from} → {state.returnFerry.to}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {state.searchParams.returnDate} ·{' '}
                            {state.returnFerry.departureTime} -{' '}
                            {state.returnFerry.arrivalTime}
                          </p>
                        </div>
                        <p className="text-lg font-bold text-primary mt-2 md:mt-0">
                          €{state.returnFerry.price * state.searchParams.passengers}
                        </p>
                      </div>
                    )}

                    {state.carRental && (
                      <div className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-secondary/50 rounded-xl">
                        <div>
                          <p className="text-sm text-muted-foreground">Car Rental</p>
                          <p className="font-semibold text-foreground">
                            {state.carRental.brand
                              ? `${state.carRental.brand} ${state.carRental.model}`
                              : state.carRental.model}{' '}
                            · {state.carRental.days}{' '}
                            {state.carRental.days === 1 ? 'day' : 'days'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Pickup: {state.carRental.pickupLocation}
                          </p>
                        </div>
                        <p className="text-lg font-bold text-primary mt-2 md:mt-0">
                          €{state.carRental.pricePerDay * state.carRental.days}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Passengers Summary */}
                <Card className="bg-card border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-lg">
                      <User className="h-5 w-5 text-primary" />
                      Passengers ({state.passengers.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {state.passengers.map((passenger, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                        >
                          <div>
                            <p className="font-medium text-foreground">{passenger.fullName}</p>
                            <p className="text-sm text-muted-foreground">
                              {passenger.nationality} · Passport: {passenger.passportNumber}
                            </p>
                          </div>
                          {index === 0 && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                              Lead
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-border/50">
                      <p className="text-sm text-muted-foreground">
                        Contact: {state.contactEmail} · {state.contactPhone}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Payment Info — explains the WhatsApp-based flow */}
                <Card className="bg-card border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-lg">
                      <MessageCircle className="h-5 w-5 text-[#25D366]" />
                      Payment
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-[#25D366]/10 border border-[#25D366]/30 rounded-xl">
                      <p className="text-sm text-foreground leading-relaxed">
                        After confirming your booking, we&apos;ll send a secure payment link
                        on WhatsApp. Your seats are reserved while we coordinate payment.
                        Online card payment (Viva Wallet) is launching soon.
                      </p>
                    </div>

                    <Separator />

                    {/* Terms & Conditions */}
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="terms"
                        checked={acceptTerms}
                        onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
                      />
                      <div className="space-y-1">
                        <Label htmlFor="terms" className="text-sm cursor-pointer">
                          I agree to the{' '}
                          <Link href={`/${locale}/terms`} className="text-primary hover:underline">
                            Terms of Service
                          </Link>{' '}
                          and{' '}
                          <Link
                            href={`/${locale}/privacy`}
                            className="text-primary hover:underline"
                          >
                            Privacy Policy
                          </Link>
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          By confirming this booking, you agree to the ferry operator&apos;s
                          terms and TravelBeez&apos;s booking conditions.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Submit error display */}
                {state.submitError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Booking could not be completed</AlertTitle>
                    <AlertDescription>{state.submitError}</AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1">
                <div className="sticky top-24">
                  <Card className="bg-card border-border/50">
                    <CardContent className="p-6">
                      <h3 className="text-lg font-bold text-foreground mb-6">Order Summary</h3>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              Outbound ({state.searchParams.passengers}×)
                            </span>
                            <span className="text-foreground">
                              €{state.selectedFerry.price * state.searchParams.passengers}
                            </span>
                          </div>
                          {state.returnFerry && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">
                                Return ({state.searchParams.passengers}×)
                              </span>
                              <span className="text-foreground">
                                €{state.returnFerry.price * state.searchParams.passengers}
                              </span>
                            </div>
                          )}
                          {state.carRental && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">
                                Car ({state.carRental.days}d)
                              </span>
                              <span className="text-foreground">
                                €{state.carRental.pricePerDay * state.carRental.days}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Booking Fee</span>
                            <span className="text-green-600">Free</span>
                          </div>
                        </div>

                        <Separator />

                        <div className="flex items-center justify-between text-lg font-bold">
                          <span className="text-foreground">Total</span>
                          <span className="text-primary">
                            €
                            {(state.selectedFerry.price * state.searchParams.passengers) +
                              (state.returnFerry
                                ? state.returnFerry.price * state.searchParams.passengers
                                : 0) +
                              (state.carRental
                                ? state.carRental.pricePerDay * state.carRental.days
                                : 0)}
                          </span>
                        </div>

                        <Button
                          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12"
                          onClick={handleConfirm}
                          disabled={!acceptTerms || isProcessing}
                        >
                          {isProcessing ? (
                            <>
                              <motion.div
                                className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full mr-2"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                              />
                              Processing...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Confirm Booking
                            </>
                          )}
                        </Button>

                        {!acceptTerms && (
                          <p className="text-sm text-muted-foreground text-center">
                            Please accept the terms to continue
                          </p>
                        )}
                      </div>

                      <div className="mt-6 pt-6 border-t border-border/50 space-y-3">
                        <TrustItem icon={Shield} title="Buyer Protection" desc="Full refund if cancelled" />
                        <TrustItem icon={MessageCircle} title="WhatsApp Support" desc="Talk to us anytime" />
                        <TrustItem icon={CheckCircle} title="Instant Confirmation" desc="Reference sent immediately" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <FloatingWhatsApp />
    </div>
  )
}

// ============================================================
// Subcomponents
// ============================================================

function Step({ done, current, label }: { done?: boolean; current?: boolean; label: string }) {
  const circleClass = done
    ? 'bg-primary/20 text-primary'
    : current
      ? 'bg-primary text-primary-foreground'
      : 'bg-muted text-muted-foreground'
  const labelClass = done || current ? 'text-primary font-medium' : 'text-muted-foreground'

  return (
    <div className="flex items-center gap-2">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${circleClass}`}>
        {done ? <CheckCircle className="h-5 w-5" /> : current ? '3' : ''}
      </div>
      <span className={`text-sm ${labelClass}`}>{label}</span>
    </div>
  )
}

function Divider() {
  return <div className="w-8 md:w-12 h-0.5 bg-primary" />
}

function TrustItem({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  desc: string
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-5 w-5 text-green-500 mt-0.5" />
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
  )
}
