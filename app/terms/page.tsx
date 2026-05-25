'use client'

import { Header } from '@/components/islandbee/header'
import { Footer } from '@/components/islandbee/footer'
import { FloatingWhatsApp } from '@/components/islandbee/floating-whatsapp'

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      
      <main className="flex-1 py-12 md:py-16">
        <div className="container px-4 md:px-6 max-w-4xl">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-8">Terms of Service</h1>
          
          <div className="prose prose-gray max-w-none space-y-6 text-muted-foreground">
            <p className="text-sm">Last updated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            
            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">1. Introduction</h2>
              <p>
                These Terms of Service govern your use of the TravelBeez website and services operated by FerryBee Travel IKE, 
                a licensed Greek travel agency (MH.T.E. 1471E60000074600) with offices at G Averos 4, Kos, Greece.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">2. Services</h2>
              <p>
                TravelBeez provides travel booking services including ferry tickets, car rentals, tours, visa support, 
                and package pickup/storage services. We act as an intermediary between you and third-party service providers.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">3. Booking and Payment</h2>
              <p>
                All bookings are subject to availability and confirmation. Prices are displayed in Euros and include applicable taxes 
                unless otherwise stated. Payment must be completed at the time of booking.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">4. Cancellation Policy</h2>
              <p>
                Cancellation policies vary depending on the service provider. Please review the specific cancellation terms 
                for each booking before confirming. TravelBeez service fees may be non-refundable.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">5. Package Pickup Service</h2>
              <p>
                For our package pickup and storage service, customers are responsible for customs duties, taxes, 
                product legality, and all import/export regulations. TravelBeez provides address, storage, and handover services only.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">6. Limitation of Liability</h2>
              <p>
                TravelBeez acts as an intermediary and is not liable for services provided by third parties including 
                ferry operators, car rental companies, hotels, or tour operators. Our liability is limited to the fees 
                we directly charge for our services.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">7. Contact</h2>
              <p>
                For questions about these terms, please contact us at info@travelbeez.com or visit our office at Kos Port.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
      <FloatingWhatsApp />
    </div>
  )
}
