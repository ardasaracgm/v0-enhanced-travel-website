'use client'

import * as React from 'react'
import { Phone, Mail, MapPin, Clock, MessageCircle } from 'lucide-react'
import { motion } from 'framer-motion'

import { Card, CardContent } from '@/components/ui/card'

import { Header } from '@/components/islandbee/header'
import { Footer } from '@/components/islandbee/footer'
import { FloatingWhatsApp } from '@/components/islandbee/floating-whatsapp'
import { TrustBar } from '@/components/islandbee/trust-bar'
import { ContactForm } from '@/components/islandbee/contact-form'

export default function ContactPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-16 md:py-24 bg-gradient-to-br from-primary/5 via-background to-accent/5">
          <div className="container px-4 md:px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center max-w-2xl mx-auto"
            >
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 text-balance">
                Contact Us
              </h1>
              <p className="text-muted-foreground text-lg">
                Have questions about your Greek island trip? Our Turkish-speaking team is here to help.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Contact Section */}
        <section className="w-full py-12 md:py-16">
          <div className="container px-4 md:px-6">
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Contact Info */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="space-y-6"
              >
                <Card className="border-border/50">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-[#25D366]/10 rounded-xl">
                        <MessageCircle className="h-6 w-6 text-[#25D366]" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground mb-1">WhatsApp</h3>
                        <p className="text-muted-foreground text-sm mb-2">Fastest way to reach us</p>
                        <a 
                          href="https://wa.me/302242050009" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary font-medium hover:underline"
                        >
                          +30 22420 5009
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/50">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-primary/10 rounded-xl">
                        <Phone className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground mb-1">Phone</h3>
                        <p className="text-muted-foreground text-sm mb-2">Call our Kos office</p>
                        <a 
                          href="tel:+302242050008" 
                          className="text-primary font-medium hover:underline"
                        >
                          +30 22420 5008
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/50">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-primary/10 rounded-xl">
                        <Mail className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground mb-1">Email</h3>
                        <p className="text-muted-foreground text-sm mb-2">We reply within 24 hours</p>
                        <a 
                          href="mailto:info@islandbee.com" 
                          className="text-primary font-medium hover:underline"
                        >
                          info@islandbee.com
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/50">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-primary/10 rounded-xl">
                        <MapPin className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground mb-1">Kos Port Office</h3>
                        <p className="text-muted-foreground text-sm mb-2">Visit us in person</p>
                        <p className="text-foreground text-sm">
                          G Averos 4, Kos, Greece<br />
                          <span className="text-muted-foreground">Under Achilleas Hotel, at port exit</span>
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/50">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-primary/10 rounded-xl">
                        <Clock className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground mb-1">Office Hours</h3>
                        <p className="text-muted-foreground text-sm mb-2">Peak Season (Apr-Oct)</p>
                        <p className="text-foreground text-sm">
                          Daily: 08:00 - 20:00
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Contact Form */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="lg:col-span-2"
              >
                <Card className="border-border/50">
                  <CardContent className="p-6 md:p-8">
                    <h2 className="text-2xl font-bold text-foreground mb-2">Send us a Message</h2>
                    <p className="text-muted-foreground mb-6">
                      Fill out the form below and we will get back to you as soon as possible.
                    </p>
                    <ContactForm />
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Map Section */}
        <section className="w-full py-12 bg-secondary/30">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">Find Us at Kos Port</h2>
              <p className="text-muted-foreground">Located at the first shop after the port exit, under Achilleas Hotel</p>
            </div>
            <div className="rounded-2xl overflow-hidden shadow-lg">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3190.8892!2d27.0917!3d36.8936!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzbCsDUzJzM3LjAiTiAyN8KwMDUnMzAuMSJF!5e0!3m2!1sen!2sgr!4v1234567890"
                width="100%"
                height="400"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="TravelBeez Kos Office Location"
              />
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <FloatingWhatsApp />
    </div>
  )
}
