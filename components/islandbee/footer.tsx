import Link from 'next/link'
import { Ship, Car, Compass, FileText, Phone, Mail, MapPin } from 'lucide-react'

export function Footer() {
  return (
    <footer className="w-full bg-foreground text-background py-16">
      <div className="container px-4 md:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">B</span>
              </div>
              <span className="text-xl font-bold">Island<span className="text-primary">Bee</span></span>
            </div>
            <p className="text-background/70 text-sm mb-4">
              Your trusted partner for Greek island travel. Licensed and operating since 2018.
            </p>
            <div className="flex flex-col gap-2 text-sm text-background/70">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <span>Kos Port, Greece</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" />
                <span>+90 532 XXX XX XX</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                <span>info@islandbee.com</span>
              </div>
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Ship className="h-4 w-4 text-primary" />
              Services
            </h3>
            <ul className="space-y-2 text-sm text-background/70">
              <li><Link href="/ferry" className="hover:text-primary transition-colors">Ferry Tickets</Link></li>
              <li><Link href="/car-rental" className="hover:text-primary transition-colors">Car Rental</Link></li>
              <li><Link href="/tours" className="hover:text-primary transition-colors">Island Tours</Link></li>
              <li><Link href="/visa" className="hover:text-primary transition-colors">Visa Support</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Travel Insurance</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Compass className="h-4 w-4 text-primary" />
              Islands
            </h3>
            <ul className="space-y-2 text-sm text-background/70">
              <li><Link href="#" className="hover:text-primary transition-colors">Kos Island</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Rhodes Island</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Samos Island</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Leros Island</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Patmos Island</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Support
            </h3>
            <ul className="space-y-2 text-sm text-background/70">
              <li><Link href="#" className="hover:text-primary transition-colors">Contact Us</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">FAQ</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Terms of Service</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Cancellation Policy</Link></li>
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-background/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-background/50">
            2024 IslandBee Travel. All rights reserved. Greek Tourism License: EOT 0000000
          </p>
          <div className="flex items-center gap-4 text-sm text-background/50">
            <span>Secure Payments:</span>
            <span>Visa</span>
            <span>Mastercard</span>
            <span>TROY</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
