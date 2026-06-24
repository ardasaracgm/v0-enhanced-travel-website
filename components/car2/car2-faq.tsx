import { useTranslations } from 'next-intl'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

const FAQ_COUNT = 8

export function Car2Faq() {
  const t = useTranslations('car2')
  return (
    <section className="w-full bg-secondary/30 py-16 md:py-24">
      <div className="container px-4 md:px-6">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-12 text-center text-sm font-semibold uppercase tracking-[0.2em] text-blue-950">{t('faqTitle')}</h2>
          <Accordion type="single" collapsible className="w-full">
            {Array.from({ length: FAQ_COUNT }, (_, i) => i + 1).map((n) => (
              <AccordionItem key={n} value={`item-${n}`} className="border-border/50">
                <AccordionTrigger className="text-left text-foreground hover:text-primary">
                  {t(`faq${n}Q`)}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{t(`faq${n}A`)}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  )
}
