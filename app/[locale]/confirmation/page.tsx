'use client'

import * as React from 'react'
import Link from 'next/link'
import { Ship, CheckCircle, Download, Mail, Phone, MapPin, Calendar, Clock, User, ArrowRight, Home, AlertCircle, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import confetti from 'canvas-confetti'

function parseTotalPrice(value: unknown): number {
  if (typeof value === 'number') return value

  if (typeof value === 'string') {
    const cleaned = value.replace('€', '').replace(',', '.').trim()
    const parsed = Number.parseFloat(cleaned)
    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

import { Header } from '@/components/islandbee/header'
import { Footer } from '@/components/islandbee/footer'
import { FloatingWhatsApp } from '@/components/islandbee/floating-whatsapp'
import { TrustBar } from '@/components/islandbee/trust-bar'
import { useBooking } from '@/lib/booking-context'
import { completeBooking } from '@/lib/supabase'

export default function ConfirmationPage() {
  const { state } = useBooking()
  const [saveStatus, setSaveStatus] = React.useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = React.useState<string>('')
  const hasSaved = React.useRef(false)

  

  React.useEffect(() => {
    // Trigger confetti on page load
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#1e88e5', '#FFD54F', '#4CAF50'],
    })
  }, [])

  // Save booking to Supabase
  React.useEffect(() => {
    async function saveBooking() {
      console.log('[v0] ConfirmationPage: saveBooking effect running')
      console.log('[v0] ConfirmationPage: hasSaved:', hasSaved.current)
      console.log('[v0] ConfirmationPage: state check:', {
        hasSelectedFerry: !!state.selectedFerry,
        hasBookingReference: !!state.bookingReference,
        hasContactEmail: !!state.contactEmail,
        passengersCount: state.passengers?.length
      })
      
      if (hasSaved.current || !state.selectedFerry || !state.bookingReference || !state.contactEmail) {
        console.log('[v0] ConfirmationPage: Skipping save - conditions not met')
        return
      }
      
      hasSaved.current = true
      setSaveStatus('saving')
      console.log('[v0] ConfirmationPage: Starting Supabase save...')

      // Parse total price (remove € symbol and convert to number)
      const totalPriceNum = parseTotalPrice((state as { totalPrice?: unknown }).totalPrice)
      
      console.log('[v0] ConfirmationPage: Total price parsed:', totalPriceNum)

      // Prepare passengers data
      const passengersData = state.passengers.map((p, index) => {
        const nameParts = p.fullName.split(' ')
        const firstName = nameParts[0] || ''
        const lastName = nameParts.slice(1).join(' ') || ''
        
        return {
          firstName,
          lastName,
          birthDate: p.birthDate,
          passportNumber: p.passportNumber,
          nationality: p.nationality,
          isLeadPassenger: index === 0,
        }
      })
      
      console.log('[v0] ConfirmationPage: Passengers prepared:', passengersData)

     const result = {
  success: false,
  error: 'Online booking is being upgraded. Please contact us on WhatsApp to complete your reservation.',
}

      console.log('[v0] ConfirmationPage: completeBooking result:', result)

      if (result.success) {
        console.log('[v0] ConfirmationPage: Save SUCCESS!')
        setSaveStatus('success')
      } else {
        console.error('[v0] ConfirmationPage: Save FAILED:', result.error)
        setSaveStatus('error')
        setErrorMessage(result.error || 'Failed to save booking')
      }
    }

    saveBooking()
  }, [state])

  if (!state.selectedFerry || !state.bookingReference) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Card className="max-w-md mx-auto">
            <CardContent className="p-8 text-center">
              <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-bold text-foreground mb-2">No Booking Found</h2>
              <p className="text-muted-foreground mb-6">Start a new booking to see your confirmation.</p>
              <Link href="/ferry">
                <Button>Search Ferries</Button>
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
        {/* Success Header */}
        <section className="w-full py-12 bg-gradient-to-b from-green-50 to-background">
          <div className="container px-4 md:px-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                {saveStatus === 'saving' ? (
                  <Loader2 className="h-10 w-10 text-green-600 animate-spin" />
                ) : (
                  <CheckCircle className="h-10 w-10 text-green-600" />
                )}
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                {saveStatus === 'saving' ? 'Processing Booking...' : 'Booking Confirmed!'}
              </h1>
              <p className="text-muted-foreground text-lg mb-2">
                Thank you for booking with TravelBeez
              </p>
              <p className="text-sm text-muted-foreground">
                Confirmation email sent to <span className="font-medium text-foreground">{state.contactEmail}</span>
              </p>
              
              {/* Save Status Indicator */}
              {saveStatus === 'saving' && (
                <div className="flex items-center justify-center gap-2 mt-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving booking to database...</span>
                </div>
              )}
            </motion.div>
          </div>
        </section>

        {/* Status Messages */}
        {saveStatus === 'error' && (
          <section className="w-full py-4">
            <div className="container px-4 md:px-6">
              <div className="max-w-3xl mx-auto">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Database Save Failed</AlertTitle>
                  <AlertDescription>
                    {errorMessage}. Your booking reference <strong>{state.bookingReference}</strong> is still valid. 
                    Please contact our support team via WhatsApp with your booking reference.
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          </section>
        )}

        {saveStatus === 'success' && (
          <section className="w-full py-4">
            <div className="container px-4 md:px-6">
              <div className="max-w-3xl mx-auto">
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-800">Booking Saved Successfully</AlertTitle>
                  <AlertDescription className="text-green-700">
                    Your booking has been saved to our system. You will receive a confirmation email shortly.
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          </section>
        )}

        {/* Booking Details */}
        <section className="w-full py-8 md:py-12">
          <div className="container px-4 md:px-6">
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Booking Reference */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Booking Reference</p>
                        <p className="text-3xl font-bold text-primary tracking-wider">{state.bookingReference}</p>
                      </div>
                      <div className="flex gap-3">
                        <Button variant="outline" size="sm" className="gap-2">
                          <Download className="h-4 w-4" />
                          Download PDF
                        </Button>
                        <Button variant="outline" size="sm" className="gap-2">
                          <Mail className="h-4 w-4" />
                          Resend Email
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Trip Details */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="bg-card border-border/50">
                  <CardContent className="p-6">
                    <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                      <Ship className="h-5 w-5 text-primary" />
                      Trip Details
                    </h2>
                    
                    {/* Outbound */}
                    <div className="p-4 bg-secondary/50 rounded-xl mb-4">
                      <div className="flex items-center gap-2 text-sm text-primary font-medium mb-3">
                        <ArrowRight className="h-4 w-4" />
                        Outbound Journey
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span className="text-foreground font-medium">{state.selectedFerry.from} &rarr; {state.selectedFerry.to}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">{state.searchParams.date}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">{state.selectedFerry.departureTime} - {state.selectedFerry.arrivalTime}</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">Operator</p>
                          <p className="font-medium text-foreground">{state.selectedFerry.operator}</p>
                          <p className="text-sm text-muted-foreground">{state.selectedFerry.vessel}</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Return if applicable */}
                    {state.returnFerry && (
                      <div className="p-4 bg-secondary/50 rounded-xl">
                        <div className="flex items-center gap-2 text-sm text-primary font-medium mb-3">
                          <ArrowRight className="h-4 w-4 rotate-180" />
                          Return Journey
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span className="text-foreground font-medium">{state.returnFerry.from} &rarr; {state.returnFerry.to}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">{state.searchParams.returnDate}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">{state.returnFerry.departureTime} - {state.returnFerry.arrivalTime}</span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">Operator</p>
                            <p className="font-medium text-foreground">{state.returnFerry.operator}</p>
                            <p className="text-sm text-muted-foreground">{state.returnFerry.vessel}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Passengers */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="bg-card border-border/50">
                  <CardContent className="p-6">
                    <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                      <User className="h-5 w-5 text-primary" />
                      Passengers
                    </h2>
                    <div className="space-y-4">
                      {state.passengers.map((passenger, index) => (
                        <div key={index} className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
                          <div>
                            <p className="font-medium text-foreground">{passenger.fullName}</p>
                            <p className="text-sm text-muted-foreground">{passenger.nationality} &middot; Passport: {passenger.passportNumber}</p>
                          </div>
                          {index === 0 && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">Lead Passenger</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Payment Summary */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="bg-card border-border/50">
                  <CardContent className="p-6">
                    <h2 className="text-xl font-bold text-foreground mb-6">Payment Summary</h2>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Ferry Tickets ({state.searchParams.passengers} passengers)</span>
                        <span className="text-foreground">&euro;{state.selectedFerry.price * state.searchParams.passengers}</span>
                      </div>
                      {state.returnFerry && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Return Tickets ({state.searchParams.passengers} passengers)</span>
                          <span className="text-foreground">&euro;{state.returnFerry.price * state.searchParams.passengers}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Booking Fee</span>
                        <span className="text-green-600">Free</span>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between text-lg font-bold">
                        <span className="text-foreground">Total Paid</span>
                        <span className="text-primary">{state.totalPrice}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Important Information */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Card className="bg-amber-50 border-amber-200">
                  <CardContent className="p-6">
                    <h2 className="text-lg font-bold text-amber-900 mb-4">Important Information</h2>
                    <ul className="space-y-2 text-sm text-amber-800">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 mt-0.5 text-amber-600" />
                        <span>Arrive at the port at least 30 minutes before departure</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 mt-0.5 text-amber-600" />
                        <span>Bring your passport and printed/digital ticket</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 mt-0.5 text-amber-600" />
                        <span>Check visa requirements for Greek island entry</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 mt-0.5 text-amber-600" />
                        <span>Contact us on WhatsApp for any changes or questions</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Contact & Support */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Card className="bg-card border-border/50">
                  <CardContent className="p-6">
                    <h2 className="text-lg font-bold text-foreground mb-4">Need Help?</h2>
                    <div className="grid md:grid-cols-2 gap-4">
                      <a href="https://wa.me/302242050009" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 bg-secondary/30 rounded-lg hover:bg-secondary/50 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-[#25D366]/10 flex items-center justify-center">
                          <Phone className="h-5 w-5 text-[#25D366]" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">WhatsApp Support</p>
                          <p className="text-sm text-muted-foreground">+30 22420 5009</p>
                        </div>
                      </a>
                      <a href="mailto:support@islandbee.com" className="flex items-center gap-3 p-4 bg-secondary/30 rounded-lg hover:bg-secondary/50 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Mail className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">Email Support</p>
                          <p className="text-sm text-muted-foreground">support@islandbee.com</p>
                        </div>
                      </a>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="flex flex-col sm:flex-row gap-4 justify-center"
              >
                <Link href="/">
                  <Button variant="outline" className="w-full sm:w-auto gap-2">
                    <Home className="h-4 w-4" />
                    Return to Homepage
                  </Button>
                </Link>
                <Link href="/car-rental">
                  <Button className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
                    Rent a Car in {state.selectedFerry.to}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </motion.div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <FloatingWhatsApp />
    </div>
  )
}
