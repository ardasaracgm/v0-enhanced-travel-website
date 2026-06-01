import { CheckCircle, Lock, CreditCard, BadgeCheck, Headphones, Clock, Shield } from 'lucide-react'

export function TrustIndicators() {
  return (
    <section className="w-full py-12 bg-card border-y border-border/30">
      <div className="container px-4 md:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-xl">
              <BadgeCheck className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm">Greek Licensed</h3>
              <p className="text-xs text-muted-foreground">ΜΗ.Τ.Ε. Registered</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm">Secure Payment</h3>
              <p className="text-xs text-muted-foreground">256-bit SSL</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Headphones className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm">Türkçe Destek</h3>
              <p className="text-xs text-muted-foreground">24/7 Available</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm">Insured Trips</h3>
              <p className="text-xs text-muted-foreground">Full Protection</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export function SecurePaymentBanner() {
  return (
    <section className="w-full py-8 bg-muted/30 border-y border-border/30">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Lock className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-lg">Secure Payments</h3>
              <p className="text-sm text-muted-foreground">256-bit SSL encryption. Your data is always protected.</p>
            </div>
          </div>
          <div className="flex items-center gap-6 flex-wrap justify-center">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CreditCard className="h-6 w-6" />
              <span className="text-sm font-medium">Visa</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <CreditCard className="h-6 w-6" />
              <span className="text-sm font-medium">Mastercard</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="text-sm font-medium">Bank Transfer (TL/EUR)</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
