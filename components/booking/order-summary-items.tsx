'use client'

// Shared order-summary breakdown — one removable line per cart item.
// ============================================================
// The genuinely-duplicated piece across the booking steps is the per-item
// price breakdown plus its remove ("X") affordance. Each step keeps its own
// title / Total / footer (those differ and are tightly coupled to the page);
// this component owns only the rows + remove wiring so the logic lives once.
//
// Used by: passenger-details (extras only — ferry shown as detail cards) and
// checkout (all items incl. ferry, as compact rows). NOT extras: that sidebar
// renders localized item strings, and summarizeItem is English-only today —
// merging it would regress TR/EL. See lib/trip-items/summary.ts header.

import * as React from 'react'
import { X } from 'lucide-react'
import { useLocale } from 'next-intl'

import { useBooking, type BookingItem } from '@/lib/booking-context'
import { summarizeItem } from '@/lib/trip-items/summary'
import { assertNever } from '@/lib/trip-items/types'

// Only the outbound ferry leg is permanent. Everything else — return ferry,
// car, luggage, insurance, transfer — can be removed straight from the summary.
function isRemovable(item: BookingItem): boolean {
  return !(item.type === 'ferry' && item.leg === 'outbound')
}

/**
 * Maps a cart item to its existing, tested remove action (Option B — no new
 * generic REMOVE_ITEM, no second source of truth). Outbound ferry is never
 * removable, so it has no branch. Exposed as a hook so the passenger page can
 * reuse the exact same logic for the X on its return-ferry detail card.
 */
export function useRemoveBookingItem(): (item: BookingItem) => void {
  const { dispatch } = useBooking()
  return React.useCallback(
    (item: BookingItem) => {
      switch (item.type) {
        case 'ferry':
          // Only the return leg reaches here. Dropping it makes the trip
          // one-way; reset searchParams too so a back-nav to results/extras
          // doesn't show a stale round-trip gate (continue-disabled, car-day
          // default). The server is already items-driven and one-way safe.
          dispatch({ type: 'CLEAR_RETURN_FERRY' })
          dispatch({
            type: 'SET_SEARCH_PARAMS',
            payload: { tripType: 'one-way', returnDate: undefined },
          })
          return
        case 'car_rental':
          dispatch({ type: 'SET_CAR_RENTAL', payload: null })
          return
        case 'luggage':
          dispatch({ type: 'REMOVE_LUGGAGE' })
          return
        case 'insurance':
          dispatch({ type: 'REMOVE_INSURANCE' })
          return
        case 'transfer':
          dispatch({ type: 'REMOVE_TRANSFER' })
          return
        default:
          assertNever(item, 'order summary remove')
      }
    },
    [dispatch],
  )
}

interface OrderSummaryItemsProps {
  /**
   * When false, ferry legs are omitted — the page renders them as detail cards
   * above (passenger). Checkout includes them as compact rows (default).
   */
  includeFerry?: boolean
}

/**
 * Renders the price breakdown rows (a React fragment — drop it inside the
 * page's existing `space-y-*` container). Each removable row carries an X; a
 * fixed-width spacer keeps the € column aligned for non-removable rows.
 */
export function OrderSummaryItems({ includeFerry = true }: OrderSummaryItemsProps) {
  const { state } = useBooking()
  const locale = useLocale()
  const removeItem = useRemoveBookingItem()

  const rows = includeFerry
    ? state.items
    : state.items.filter((i) => i.type !== 'ferry')

  return (
    <>
      {rows.map((item, i) => {
        const row = summarizeItem(item, locale)
        return (
          <div key={i} className="flex items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">{row.breakdownLabel}</span>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-foreground">€{row.amount}</span>
              {isRemovable(item) ? (
                <button
                  type="button"
                  aria-label={`Remove ${row.breakdownLabel}`}
                  onClick={() => removeItem(item)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : (
                <span className="w-4" aria-hidden />
              )}
            </div>
          </div>
        )
      })}
    </>
  )
}
