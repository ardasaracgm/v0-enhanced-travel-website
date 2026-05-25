import { MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface WhatsAppCTAProps {
  title?: string
  description?: string
}

export function WhatsAppCTA({ 
  title = "Ready to Plan Your Trip?",
  description = "Chat with us on WhatsApp for instant booking and personalized travel assistance. We reply in Turkish!"
}: WhatsAppCTAProps) {
  return (
    <section className="w-full py-16 md:py-24 bg-gradient-to-r from-primary to-primary/80">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-center md:text-left">
            <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">{title}</h2>
            <p className="text-primary-foreground/90 text-lg max-w-xl">
              {description}
            </p>
          </div>
          <a href="https://wa.me/302242050009?text=Merhaba,%20bilgi%20almak%20istiyorum" target="_blank" rel="noopener noreferrer">
            <Button size="lg" variant="secondary" className="gap-2 text-lg px-8 bg-card text-foreground hover:bg-card/90 shadow-lg">
              <MessageCircle className="h-5 w-5" />
              WhatsApp ile Yazın
            </Button>
          </a>
        </div>
      </div>
    </section>
  )
}
