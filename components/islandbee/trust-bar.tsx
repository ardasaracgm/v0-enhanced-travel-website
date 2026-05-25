import { BadgeCheck, Globe, Lock, MapPin } from 'lucide-react'

export function TrustBar() {
  return (
    <div className="w-full bg-primary/5 border-b border-primary/10 py-2">
      <div className="container flex items-center justify-center gap-6 text-xs md:text-sm">
        <div className="flex items-center gap-2 text-foreground">
          <BadgeCheck className="h-4 w-4 text-primary" />
          <span>Greek Licensed (ΜΗ.Τ.Ε.)</span>
        </div>
        <div className="hidden md:flex items-center gap-2 text-foreground">
          <MapPin className="h-4 w-4 text-primary" />
          <span>Kos Port Office</span>
        </div>
        <div className="hidden md:flex items-center gap-2 text-foreground">
          <Globe className="h-4 w-4 text-primary" />
          <span>Türkçe Destek</span>
        </div>
        <div className="hidden lg:flex items-center gap-2 text-foreground">
          <Lock className="h-4 w-4 text-primary" />
          <span>Secure Payments</span>
        </div>
      </div>
    </div>
  )
}
