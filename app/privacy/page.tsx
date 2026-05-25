'use client'

import { Header } from '@/components/islandbee/header'
import { Footer } from '@/components/islandbee/footer'
import { FloatingWhatsApp } from '@/components/islandbee/floating-whatsapp'

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      
      <main className="flex-1 py-12 md:py-16">
        <div className="container px-4 md:px-6 max-w-4xl">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-8">Privacy Policy</h1>
          
          <div className="prose prose-gray max-w-none space-y-6 text-muted-foreground">
            <p className="text-sm">Last updated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            
            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">1. Information We Collect</h2>
              <p>
                We collect information you provide directly to us, including name, email address, phone number, 
                passport details (for ferry bookings), and payment information. We also collect data about your 
                interactions with our website.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">2. How We Use Your Information</h2>
              <p>We use your information to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Process and manage your bookings</li>
                <li>Communicate with you about your reservations</li>
                <li>Send WhatsApp notifications about your packages</li>
                <li>Improve our services and website</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">3. Information Sharing</h2>
              <p>
                We share your information with third-party service providers (ferry operators, car rental companies, etc.) 
                as necessary to fulfill your bookings. We do not sell your personal information to third parties.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">4. Data Security</h2>
              <p>
                We implement appropriate security measures to protect your personal information. 
                All payment transactions are encrypted using SSL technology.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">5. Your Rights</h2>
              <p>
                Under GDPR, you have the right to access, correct, or delete your personal data. 
                Contact us at info@travelbeez.com to exercise these rights.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">6. Cookies</h2>
              <p>
                We use cookies to improve your browsing experience and analyze website traffic. 
                You can control cookie settings through your browser preferences.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">7. Contact</h2>
              <p>
                For privacy-related inquiries, contact us at info@travelbeez.com or visit our office at 
                G Averos 4, Kos, Greece.
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
