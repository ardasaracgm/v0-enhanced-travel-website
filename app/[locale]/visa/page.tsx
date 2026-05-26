'use client'

import * as React from 'react'
import Image from 'next/image'
import { FileText, CheckCircle, Clock, Calendar, AlertCircle, Shield, Users, Star, Phone, Mail, Building2 } from 'lucide-react'
import { motion } from 'framer-motion'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

import { Header } from '@/components/islandbee/header'
import { Footer } from '@/components/islandbee/footer'
import { FloatingWhatsApp } from '@/components/islandbee/floating-whatsapp'
import { TrustBar } from '@/components/islandbee/trust-bar'
import { WhatsAppCTA } from '@/components/islandbee/whatsapp-cta'
import { TrustIndicators, SecurePaymentBanner } from '@/components/islandbee/trust-indicators'

const services = [
  {
    title: 'Document Preparation',
    price: '€49',
    description: 'Complete checklist and review of all required documents for your Schengen visa application.',
    includes: [
      'Document checklist tailored to your situation',
      'Review and feedback on all documents',
      'Application form assistance',
      'Cover letter template',
    ],
    popular: false,
  },
  {
    title: 'Full Visa Package',
    price: '€99',
    description: 'Comprehensive support including travel itinerary, hotel reservations, and all documentation.',
    includes: [
      'Everything in Document Preparation',
      'Confirmed hotel reservation letter',
      'Detailed travel itinerary',
      'Ferry ticket confirmation',
      'Travel insurance assistance',
      'Interview preparation tips',
    ],
    popular: true,
  },
  {
    title: 'VIP Concierge',
    price: '€199',
    description: 'Premium end-to-end support with personal assistance throughout the entire process.',
    includes: [
      'Everything in Full Package',
      'Appointment scheduling assistance',
      'Personal visa consultant',
      'Priority WhatsApp support',
      'Embassy interview coaching',
      'Status tracking and updates',
    ],
    popular: false,
  },
]

const steps = [
  {
    number: '01',
    title: 'Contact Us',
    description: 'Reach out via WhatsApp or email with your travel plans and passport details.',
  },
  {
    number: '02',
    title: 'Document Review',
    description: 'We review your situation and provide a personalized checklist of required documents.',
  },
  {
    number: '03',
    title: 'Preparation',
    description: 'We help prepare your travel itinerary, hotel confirmations, and supporting letters.',
  },
  {
    number: '04',
    title: 'Application',
    description: 'Submit your application with confidence. We provide interview tips and ongoing support.',
  },
]

const faqs = [
  {
    question: 'Do Turkish citizens need a visa for Greece?',
    answer: 'Yes, Turkish citizens need a Schengen visa to visit Greece. The visa allows stays of up to 90 days within a 180-day period. Greece processes visas through its consulates in Turkey (Istanbul, Ankara, Izmir).',
  },
  {
    question: 'What documents do I need for a Schengen visa?',
    answer: 'Required documents typically include: valid passport (6+ months validity), completed application form, passport photos, travel insurance (min. 30,000 coverage), proof of accommodation, flight/ferry tickets, bank statements (last 3-6 months), employment letter or business registration, and proof of ties to Turkey.',
  },
  {
    question: 'How long does the visa process take?',
    answer: 'The standard processing time is 15 calendar days from submission. During peak season (May-August), it may take up to 30 days. We recommend applying at least 4-6 weeks before your planned travel date.',
  },
  {
    question: 'Can you guarantee visa approval?',
    answer: 'No service can guarantee visa approval as the final decision rests with the consulate. However, our expertise significantly increases approval chances by ensuring your application is complete, professional, and addresses common rejection reasons.',
  },
  {
    question: 'What if my visa is rejected?',
    answer: 'If your visa is rejected, you can appeal the decision or reapply. We offer a discounted rate for reapplication assistance and can help identify what went wrong. Keep in mind that honest, complete applications have higher success rates.',
  },
  {
    question: 'Do you help with appointment scheduling?',
    answer: 'Yes, our VIP Concierge package includes appointment scheduling assistance. We monitor availability and help you secure an appointment at your preferred consulate. Note that appointment availability varies and early planning is essential.',
  },
]

const stats = [
  { number: '2,400+', label: 'Travelers Assisted' },
  { number: '95%', label: 'Approval Rate' },
  { number: '6+', label: 'Years Experience' },
  { number: '24/7', label: 'Turkish Support' },
]

export default function VisaSupportPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TrustBar />
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative w-full py-20 md:py-32 overflow-hidden">
          <div className="absolute inset-0">
            <Image
              src="https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1920&q=80"
              alt="Travel documents and passport"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-r from-foreground/90 via-foreground/70 to-foreground/40" />
          </div>
          <div className="container relative px-4 md:px-6">
            <div className="max-w-2xl">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 text-primary-foreground text-sm font-medium mb-6"
              >
                <FileText className="h-4 w-4" />
                Schengen Visa Assistance
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 text-balance"
              >
                Visa Support for Turkish Travelers
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-white/90 text-lg md:text-xl mb-8 text-pretty"
              >
                Expert assistance for your Schengen visa application. Document preparation, travel itineraries, and personalized support in Turkish.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-wrap gap-4 text-sm text-white/80"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <span>95% Approval Rate</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <span>Turkish Speaking Team</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <span>6+ Years Experience</span>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="w-full py-12 -mt-8 relative z-10">
          <div className="container px-4 md:px-6">
            <Card className="border-0 shadow-2xl bg-card">
              <CardContent className="p-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                  {stats.map((stat) => (
                    <div key={stat.label} className="text-center">
                      <p className="text-3xl md:text-4xl font-bold text-primary mb-1">{stat.number}</p>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Services */}
        <section className="w-full py-16 md:py-24">
          <div className="container px-4 md:px-6">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Visa Support Packages</h2>
              <p className="text-muted-foreground text-lg">Choose the level of assistance that fits your needs</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {services.map((service, index) => (
                <motion.div
                  key={service.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className={`overflow-hidden h-full ${service.popular ? 'border-primary border-2 shadow-xl' : 'border-border/50'}`}>
                    <CardContent className="p-0 flex flex-col h-full">
                      {service.popular && (
                        <div className="bg-primary text-primary-foreground text-center py-2 text-sm font-medium">
                          Most Popular
                        </div>
                      )}
                      <div className="p-6 flex flex-col flex-1">
                        <h3 className="font-bold text-xl text-foreground mb-2">{service.title}</h3>
                        <div className="mb-4">
                          <span className="text-4xl font-bold text-primary">{service.price}</span>
                          <span className="text-muted-foreground">/application</span>
                        </div>
                        <p className="text-muted-foreground text-sm mb-6">{service.description}</p>
                        
                        <div className="space-y-3 mb-6 flex-1">
                          {service.includes.map((item) => (
                            <div key={item} className="flex items-start gap-2">
                              <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                              <span className="text-sm text-foreground">{item}</span>
                            </div>
                          ))}
                        </div>
                        
                        <Button 
                          className={`w-full mt-auto ${service.popular ? 'bg-primary hover:bg-primary/90 text-primary-foreground' : ''}`}
                          variant={service.popular ? 'default' : 'outline'}
                        >
                          Get Started
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="w-full py-16 md:py-24 bg-secondary/30">
          <div className="container px-4 md:px-6">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">How It Works</h2>
              <p className="text-muted-foreground text-lg">Simple 4-step process to your Greek island adventure</p>
            </div>
            <div className="grid md:grid-cols-4 gap-8">
              {steps.map((step, index) => (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="relative"
                >
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl font-bold text-primary">{step.number}</span>
                    </div>
                    <h3 className="font-semibold text-lg text-foreground mb-2">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="hidden md:block absolute top-8 left-[60%] w-[40%] h-px bg-border" />
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <TrustIndicators />

        {/* Important Notice */}
        <section className="w-full py-12">
          <div className="container px-4 md:px-6">
            <Card className="bg-accent/10 border-accent/30">
              <CardContent className="p-6">
                <div className="flex gap-4">
                  <AlertCircle className="h-6 w-6 text-accent shrink-0" />
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Important Information</h3>
                    <p className="text-muted-foreground text-sm">
                      TravelBeez provides visa application assistance and document preparation services. We are not a government agency and cannot guarantee visa approval. The final decision on visa applications rests solely with the relevant consulate or embassy. Our services are designed to help you submit a complete and professional application to maximize your chances of approval.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Why Choose Us */}
        <section className="w-full py-16 md:py-24">
          <div className="container px-4 md:px-6">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">Why Choose TravelBeez for Visa Support?</h2>
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="p-3 bg-primary/10 rounded-xl h-fit">
                      <Star className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">95% Success Rate</h3>
                      <p className="text-muted-foreground">Our clients have an exceptionally high approval rate thanks to thorough preparation and attention to detail.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="p-3 bg-primary/10 rounded-xl h-fit">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">Turkish Speaking Team</h3>
                      <p className="text-muted-foreground">Our entire team speaks Turkish fluently. No language barriers, no misunderstandings.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="p-3 bg-primary/10 rounded-xl h-fit">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">Greek Licensed Company</h3>
                      <p className="text-muted-foreground">We are a registered Greek tourism company (ΜΗ.Τ.Ε.) with an office at Kos Port. Legitimate and trustworthy.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="p-3 bg-primary/10 rounded-xl h-fit">
                      <Shield className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">Complete Travel Planning</h3>
                      <p className="text-muted-foreground">Beyond visa support, we handle your entire trip: ferry tickets, car rental, hotels, and tours.</p>
                    </div>
                  </div>
                </div>
              </div>
              <Card className="bg-card border-border/50">
                <CardContent className="p-8">
                  <h3 className="font-bold text-xl text-foreground mb-6">Contact Our Visa Team</h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                      <Phone className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">WhatsApp / Phone</p>
                        <p className="font-medium text-foreground">+90 532 XXX XX XX</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                      <Mail className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-medium text-foreground">visa@islandbee.com</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                      <Clock className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Response Time</p>
                        <p className="font-medium text-foreground">Within 2 hours (9AM-9PM)</p>
                      </div>
                    </div>
                  </div>
                  <Button className="w-full mt-6 bg-primary hover:bg-primary/90 text-primary-foreground">
                    Start Visa Application
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="w-full py-16 md:py-24 bg-secondary/30">
          <div className="container px-4 md:px-6">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Frequently Asked Questions</h2>
                <p className="text-muted-foreground text-lg">Common questions about Schengen visa for Greek islands</p>
              </div>
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, index) => (
                  <AccordionItem key={index} value={`item-${index}`} className="border-border/50">
                    <AccordionTrigger className="text-left text-foreground hover:text-primary">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>

        <SecurePaymentBanner />
        
        <WhatsAppCTA 
          title="Questions About Your Visa Application?"
          description="Our Turkish-speaking visa experts are ready to help. Get personalized advice for your situation."
        />
      </main>

      <Footer />
      <FloatingWhatsApp />
    </div>
  )
}
