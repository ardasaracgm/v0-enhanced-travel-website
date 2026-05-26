import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'TravelBeez - Greek Islands Ferry, Car Rental & Tours',
  description: 'Your trusted partner for Greek island travel. Book ferry tickets, car rentals, hotels, and tours to Kos, Rhodes, Samos, Leros, and Patmos.',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/icon.svg',
  },
  openGraph: {
    title: 'TravelBeez - Greek Islands Ferry, Car Rental & Tours',
    description: 'Your trusted partner for Greek island travel from Turkey to Kos, Rhodes, Samos, Leros, and Patmos.',
    type: 'website',
    locale: 'en_US',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background">
      <body className="font-sans antialiased bg-background overflow-x-hidden max-w-full">
        <div className="w-full overflow-x-hidden">
          {children}
        </div>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
