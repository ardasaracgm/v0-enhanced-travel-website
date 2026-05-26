'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Ship, ChevronLeft, ArrowRight, User, CheckCircle, CreditCard, Lock, Shield, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'

import { Header } from '@/components/islandbee/header'
import { Footer } from '@/components/islandbee/footer'
import { FloatingWhatsApp } from '@/components/islandbee/floating-whatsapp'
import { TrustBar } from '@/components/islandbee/trust-bar'
import { useBooking } from '@/lib/booking-context'

export default function CheckoutPage() {
  const router = useRouter()
  const { state, dispatch } = useBooking()
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [acceptTerms, setAcceptTerms] = React.useState(false)

  // Generate a collision-safe booking reference using timestamp + random chars
  const generateBookingReference = () => {
    const timestamp = Date.now().toString(36).toUpperCase() // Base36 timestamp
    const random = Math.random().toString(36).substring(2, 6).toUpperCase()
    return `TB-${timestamp.slice(-4)}${random}`
  }

  const handlePayment = async () => {
    if (!acceptTerms) return
    
    setIsProcessing(true)
    
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const bookingRef = generateBookingReference()
    dispatch({ type: 'SET_BOOKING_REFERENCE', payload: bookingRef })
    
    router.push('/confirmation')
  }

  if (!state.selectedFerry || state.passengers.length === 0) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <TrustBar />
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Card className="max-w-md mx-auto">
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-bold text-foreground mb-2">Booking Incomplete</h2>
              <p className="text-muted-foreground mb-6">Please complete the previous steps before checkout.</p>
              <Link href="/ferry">
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
      <TrustBar />
      <Header />
      
      <main className="flex-1">
        {/* Header Bar */}
        <section className="w-full py-6 bg-primary text-primary-foreground">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <Link href="/ferry/passenger-details">
                  <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10">
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                </Link>
                <div>
                  <h1 className="text-lg font-semibold">Secure Checkout</h1>
                  <p className="text-sm text-primary-foreground/80">Complete your ferry booking</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-primary-foreground/80">
                <Lock className="h-4 w-4" />
                <span>256-bit SSL Secure Payment</span>
              </div>
            </div>
          </div>
        </section>

        {/* Progress Steps */}
        <section className="w-full py-4 border-b border-border/50 bg-card">
          <div className="container px-4 md:px-6">
            <div className="flex items-center justify-center gap-8">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-medium">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <span className="text-sm text-muted-foreground">Select Ferry</span>
              </div>
              <div className="w-12 h-0.5 bg-primary" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-medium">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <span className="text-sm text-muted-foreground">Passengers</span>
              </div>
              <div className="w-12 h-0.5 bg-primary" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                  3
                </div>
                <span className="text-sm font-medium text-primary">Payment</span>
              </div>
            </div>
          </div>
        </section>

        {/* Checkout Content */}
        <section className="w-full py-8 md:py-12">
          <div className="container px-4 md:px-6">
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Payment Section */}
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
                        <p className="font-semibold text-foreground">{state.selectedFerry.from} → {state.selectedFerry.to}</p>
                        <p className="text-sm text-muted-foreground">{state.searchParams.date} · {state.selectedFerry.departureTime} - {state.selectedFerry.arrivalTime}</p>
                      </div>
                      <p className="text-lg font-bold text-primary mt-2 md:mt-0">
                        {state.selectedFerry.price * state.searchParams.passengers}
                      </p>
                    </div>
                    
                    {state.returnFerry && (
                      <div className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-secondary/50 rounded-xl">
                        <div>
                          <p className="text-sm text-muted-foreground">Return</p>
                          <p className="font-semibold text-foreground">{state.returnFerry.from} → {state.returnFerry.to}</p>
                          <p className="text-sm text-muted-foreground">{state.searchParams.returnDate} · {state.returnFerry.departureTime} - {state.returnFerry.arrivalTime}</p>
                        </div>
                        <p className="text-lg font-bold text-primary mt-2 md:mt-0">
                          {state.returnFerry.price * state.searchParams.passengers}
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
                        <div key={index} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                          <div>
                            <p className="font-medium text-foreground">{passenger.fullName}</p>
                            <p className="text-sm text-muted-foreground">{passenger.nationality} · Passport: {passenger.passportNumber}</p>
                          </div>
                          {index === 0 && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">Lead</span>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-border/50">
                      <p className="text-sm text-muted-foreground">Contact: {state.contactEmail} · {state.contactPhone}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Payment Method - Viva Wallet Placeholder */}
                <Card className="bg-card border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-lg">
                      <CreditCard className="h-5 w-5 text-primary" />
                      Payment Method
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Viva Wallet Integration Placeholder */}
                    <div className="p-6 border-2 border-dashed border-primary/30 rounded-xl bg-primary/5">
                      <div className="flex items-center justify-center gap-3 mb-4">
                        <div className="w-32 h-10 bg-gradient-to-r from-[#00A6FF] to-[#00C3FF] rounded-lg flex items-center justify-center">
                          <span className="text-white font-bold text-sm">VIVA WALLET</span>
                        </div>
                      </div>
                      <p className="text-sm text-center text-muted-foreground mb-4">
                        Secure payment powered by Viva Wallet
                      </p>
                      
                      {/* Mock card input fields */}
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="cardNumber">Card Number</Label>
                          <Input
                            id="cardNumber"
                            placeholder="1234 5678 9012 3456"
                            className="bg-background"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="expiry">Expiry Date</Label>
                            <Input
                              id="expiry"
                              placeholder="MM/YY"
                              className="bg-background"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="cvv">CVV</Label>
                            <Input
                              id="cvv"
                              placeholder="123"
                              className="bg-background"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cardName">Name on Card</Label>
                          <Input
                            id="cardName"
                            placeholder="JOHN DOE"
                            className="bg-background"
                          />
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-center gap-4 mt-6 pt-4 border-t border-border/50">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="font-medium">Visa</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="font-medium">Mastercard</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="font-medium">TROY</span>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Terms and Conditions */}
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="terms"
                        checked={acceptTerms}
                        onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
                      />
                      <div className="space-y-1">
                        <Label htmlFor="terms" className="text-sm cursor-pointer">
                          I agree to the{' '}
                          <Link href="#" className="text-primary hover:underline">Terms of Service</Link>
                          {' '}and{' '}
                          <Link href="#" className="text-primary hover:underline">Cancellation Policy</Link>
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          By completing this booking, you agree to the ferry operator&apos;s terms and TravelBeez&apos;s booking conditions.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Order Summary Sidebar */}
              <div className="lg:col-span-1">
                <div className="sticky top-24">
                  <Card className="bg-card border-border/50">
                    <CardContent className="p-6">
                      <h3 className="text-lg font-bold text-foreground mb-6">Order Summary</h3>
                      
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Ferry ({state.searchParams.passengers}x)</span>
                            <span className="text-foreground">{state.selectedFerry.price * state.searchParams.passengers}</span>
                          </div>
                          {state.returnFerry && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Return ({state.searchParams.passengers}x)</span>
                              <span className="text-foreground">{state.returnFerry.price * state.searchParams.passengers}</span>
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
                          <span className="text-primary">{state.totalPrice}</span>
                        </div>
                        
                        <Button 
                          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12"
                          onClick={handlePayment}
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
                              <Lock className="h-4 w-4 mr-2" />
                              Pay {state.totalPrice}
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
                        <div className="flex items-start gap-3">
                          <Shield className="h-5 w-5 text-green-500 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-foreground">Buyer Protection</p>
                            <p className="text-xs text-muted-foreground">Full refund if ferry is cancelled</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Lock className="h-5 w-5 text-green-500 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-foreground">Secure Payment</p>
                            <p className="text-xs text-muted-foreground">Your data is encrypted</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-foreground">Instant Tickets</p>
                            <p className="text-xs text-muted-foreground">E-tickets sent immediately</p>
                          </div>
                        </div>
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
