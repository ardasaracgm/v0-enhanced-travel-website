'use client'

import * as React from 'react'
import { Link, useRouter } from '@/i18n/routing'
import { Ship, ChevronLeft, ArrowRight, User, CheckCircle, Shield, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { Header } from '@/components/islandbee/header'
import { Footer } from '@/components/islandbee/footer'
import { FloatingWhatsApp } from '@/components/islandbee/floating-whatsapp'
import { TrustBar } from '@/components/islandbee/trust-bar'
import {
  useBooking,
  selectOutboundFerry,
  selectReturnFerry,
  selectTotalPrice,
  type Passenger,
} from '@/lib/booking-context'

const nationalities = [
  'Turkey',
  'Germany',
  'United Kingdom',
  'Netherlands',
  'France',
  'Belgium',
  'Austria',
  'Switzerland',
  'Italy',
  'Spain',
  'Greece',
  'United States',
  'Other',
]

export default function PassengerDetailsPage() {
  const router = useRouter()
  const { state, dispatch } = useBooking()
  const outbound = selectOutboundFerry(state)
  const returnF = selectReturnFerry(state)
  const [passengers, setPassengers] = React.useState<Passenger[]>([])
  const [contactEmail, setContactEmail] = React.useState('')
  const [contactPhone, setContactPhone] = React.useState('')
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  React.useEffect(() => {
    // Initialize passenger forms based on number of passengers
    const initialPassengers: Passenger[] = Array.from(
      { length: state.searchParams.passengers },
      () => ({
        fullName: '',
        birthDate: '',
        passportNumber: '',
        nationality: '',
        phone: '',
        email: '',
      })
    )
    setPassengers(initialPassengers)
  }, [state.searchParams.passengers])

  const updatePassenger = (index: number, field: keyof Passenger, value: string) => {
    const updated = [...passengers]
    updated[index] = { ...updated[index], [field]: value }
    setPassengers(updated)
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    passengers.forEach((passenger, index) => {
      if (!passenger.fullName.trim()) {
        newErrors[`passenger-${index}-name`] = 'Full name is required'
      }
      if (!passenger.birthDate) {
        newErrors[`passenger-${index}-birthDate`] = 'Birth date is required'
      }
      if (!passenger.passportNumber.trim()) {
        newErrors[`passenger-${index}-passport`] = 'Passport number is required'
      }
      if (!passenger.nationality) {
        newErrors[`passenger-${index}-nationality`] = 'Nationality is required'
      }
    })
    
    if (!contactEmail.trim()) {
      newErrors['contactEmail'] = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      newErrors['contactEmail'] = 'Please enter a valid email'
    }
    
    if (!contactPhone.trim()) {
      newErrors['contactPhone'] = 'Phone number is required'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleContinue = () => {
    if (validateForm()) {
      dispatch({ type: 'SET_PASSENGERS', payload: passengers })
      dispatch({ type: 'SET_CONTACT', payload: { email: contactEmail, phone: contactPhone } })
      router.push('/checkout')
    }
  }

  if (!outbound) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Card className="max-w-md mx-auto">
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-bold text-foreground mb-2">No Ferry Selected</h2>
              <p className="text-muted-foreground mb-6">Please select a ferry before entering passenger details.</p>
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
        {/* Header Bar */}
        <section className="w-full py-6 bg-primary text-primary-foreground">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <Link href="/ferry/results">
                  <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10">
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                </Link>
                <div>
                  <div className="flex items-center gap-2 text-lg font-semibold">
                    <span>{outbound.from}</span>
                    <ArrowRight className="h-4 w-4" />
                    <span>{outbound.to}</span>
                  </div>
                  <p className="text-sm text-primary-foreground/80">
                    {state.searchParams.date} · {outbound.departureTime} - {outbound.arrivalTime}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm text-primary-foreground/80">Total Price</p>
                  <p className="text-2xl font-bold">€{selectTotalPrice(state)}</p>
                </div>
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
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <span className="text-sm font-medium text-primary">Passengers</span>
              </div>
              <div className="w-12 h-0.5 bg-border" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-medium">
                  3
                </div>
                <span className="text-sm text-muted-foreground">Payment</span>
              </div>
            </div>
          </div>
        </section>

        {/* Passenger Forms */}
        <section className="w-full py-8 md:py-12">
          <div className="container px-4 md:px-6">
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Forms */}
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">Passenger Details</h2>
                  <p className="text-muted-foreground">Please enter details exactly as they appear on passports</p>
                </div>
                
                {passengers.map((passenger, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="bg-card border-border/50">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-lg">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          Passenger {index + 1} {index === 0 && '(Lead Passenger)'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`fullName-${index}`}>Full Name (as on passport) *</Label>
                            <Input
                              id={`fullName-${index}`}
                              placeholder="John Doe"
                              value={passenger.fullName}
                              onChange={(e) => updatePassenger(index, 'fullName', e.target.value)}
                              className={errors[`passenger-${index}-name`] ? 'border-destructive' : ''}
                            />
                            {errors[`passenger-${index}-name`] && (
                              <p className="text-sm text-destructive">{errors[`passenger-${index}-name`]}</p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`birthDate-${index}`}>Date of Birth *</Label>
                            <Input
                              id={`birthDate-${index}`}
                              type="date"
                              value={passenger.birthDate}
                              onChange={(e) => updatePassenger(index, 'birthDate', e.target.value)}
                              className={errors[`passenger-${index}-birthDate`] ? 'border-destructive' : ''}
                            />
                            {errors[`passenger-${index}-birthDate`] && (
                              <p className="text-sm text-destructive">{errors[`passenger-${index}-birthDate`]}</p>
                            )}
                          </div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`passport-${index}`}>Passport Number *</Label>
                            <Input
                              id={`passport-${index}`}
                              placeholder="U12345678"
                              value={passenger.passportNumber}
                              onChange={(e) => updatePassenger(index, 'passportNumber', e.target.value)}
                              className={errors[`passenger-${index}-passport`] ? 'border-destructive' : ''}
                            />
                            {errors[`passenger-${index}-passport`] && (
                              <p className="text-sm text-destructive">{errors[`passenger-${index}-passport`]}</p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`nationality-${index}`}>Nationality *</Label>
                            <Select
                              value={passenger.nationality}
                              onValueChange={(value) => updatePassenger(index, 'nationality', value)}
                            >
                              <SelectTrigger className={errors[`passenger-${index}-nationality`] ? 'border-destructive' : ''}>
                                <SelectValue placeholder="Select nationality" />
                              </SelectTrigger>
                              <SelectContent>
                                {nationalities.map((nat) => (
                                  <SelectItem key={nat} value={nat}>{nat}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {errors[`passenger-${index}-nationality`] && (
                              <p className="text-sm text-destructive">{errors[`passenger-${index}-nationality`]}</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}

                {/* Contact Information */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: passengers.length * 0.1 }}
                >
                  <Card className="bg-card border-border/50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3 text-lg">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Shield className="h-5 w-5 text-primary" />
                        </div>
                        Contact Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        We&apos;ll send your tickets and booking confirmation to this contact
                      </p>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="contactEmail">Email Address *</Label>
                          <Input
                            id="contactEmail"
                            type="email"
                            placeholder="your@email.com"
                            value={contactEmail}
                            onChange={(e) => setContactEmail(e.target.value)}
                            className={errors['contactEmail'] ? 'border-destructive' : ''}
                          />
                          {errors['contactEmail'] && (
                            <p className="text-sm text-destructive">{errors['contactEmail']}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="contactPhone">Phone Number *</Label>
                          <Input
                            id="contactPhone"
                            type="tel"
                            placeholder="+90 5XX XXX XX XX"
                            value={contactPhone}
                            onChange={(e) => setContactPhone(e.target.value)}
                            className={errors['contactPhone'] ? 'border-destructive' : ''}
                          />
                          {errors['contactPhone'] && (
                            <p className="text-sm text-destructive">{errors['contactPhone']}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Summary Sidebar */}
              <div className="lg:col-span-1">
                <div className="sticky top-24">
                  <Card className="bg-card border-border/50">
                    <CardContent className="p-6">
                      <h3 className="text-lg font-bold text-foreground mb-6">Booking Summary</h3>
                      
                      <div className="space-y-4">
                        <div className="p-4 bg-secondary/50 rounded-xl">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                            <Ship className="h-4 w-4" />
                            <span>Outbound</span>
                          </div>
                          <p className="font-semibold text-foreground">{outbound.from} → {outbound.to}</p>
                          <p className="text-sm text-muted-foreground">{state.searchParams.date}</p>
                          <p className="text-sm text-muted-foreground">{outbound.departureTime} - {outbound.arrivalTime}</p>
                          <p className="text-sm text-muted-foreground">{outbound.operator}</p>
                        </div>
                        
                        {returnF && (
                          <div className="p-4 bg-secondary/50 rounded-xl">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                              <Ship className="h-4 w-4" />
                              <span>Return</span>
                            </div>
                            <p className="font-semibold text-foreground">{returnF.from} → {returnF.to}</p>
                            <p className="text-sm text-muted-foreground">{state.searchParams.returnDate}</p>
                            <p className="text-sm text-muted-foreground">{returnF.departureTime} - {returnF.arrivalTime}</p>
                            <p className="text-sm text-muted-foreground">{returnF.operator}</p>
                          </div>
                        )}
                        
                        <div className="pt-4 border-t border-border/50">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-muted-foreground">Passengers</span>
                            <span className="text-foreground">{state.searchParams.passengers}</span>
                          </div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-muted-foreground">Ferry Tickets</span>
                            <span className="text-foreground">€{selectTotalPrice(state)}</span>
                          </div>
                          <div className="flex items-center justify-between text-lg font-bold pt-2 border-t border-border/50">
                            <span className="text-foreground">Total</span>
                            <span className="text-primary">€{selectTotalPrice(state)}</span>
                          </div>
                        </div>
                        
                        <Button 
                          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                          onClick={handleContinue}
                        >
                          Continue to Payment
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                      
                      <div className="mt-6 pt-6 border-t border-border/50 space-y-3">
                        <div className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-foreground">Secure Booking</p>
                            <p className="text-xs text-muted-foreground">256-bit SSL encryption</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-foreground">Instant Confirmation</p>
                            <p className="text-xs text-muted-foreground">Tickets sent to your email</p>
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
