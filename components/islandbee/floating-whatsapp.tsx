'use client'

import { MessageCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { useLocale } from 'next-intl'
import { buildWhatsAppLink } from '@/lib/contact'

export function FloatingWhatsApp() {
  const locale = useLocale()
  return (
    <motion.a
      href={buildWhatsAppLink(locale, 'Merhaba, Yunan adaları hakkında bilgi almak istiyorum')}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-[#25D366] text-white px-5 py-3 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1 }}
    >
      <MessageCircle className="h-6 w-6" />
      <span className="font-semibold hidden sm:inline">WhatsApp ile Yazın</span>
    </motion.a>
  )
}
