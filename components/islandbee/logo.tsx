import Image from 'next/image'
import { cn } from '@/lib/utils'

/** Paylaşılan marka logosu — yatay lockup (hexagon + wordmark).
 *  Asset gerçek boyutu 684×206; oran korunur, görünen boyut className ile. */
export function Logo({
  className,
  priority = false,
}: {
  className?: string
  priority?: boolean
}) {
  return (
    <Image
      src="/travelbeez-logo.webp"
      alt="TravelBeez"
      width={684}
      height={206}
      priority={priority}
      className={cn('h-9 w-auto', className)}
    />
  )
}
