'use client'

import { MessageCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { useLocale, useTranslations } from 'next-intl'

import { buildCar2WhatsAppLink } from '@/lib/car2-contact'

export function Car2FloatingWhatsApp() {
  const t = useTranslations('car2')
  const locale = useLocale()
  return (
    <motion.a
      href={buildCar2WhatsAppLink(locale)}
      target="_blank"
      rel="noopener noreferrer"
      className="wa-float fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-full bg-[#25D366] px-5 py-3 text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1 }}
    >
      <MessageCircle className="h-6 w-6" />
      <span className="hidden font-semibold sm:inline">{t('floatLabel')}</span>
    </motion.a>
  )
}
