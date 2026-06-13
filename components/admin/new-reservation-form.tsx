'use client'

import { useActionState, useState } from 'react'
import { dateDiffInDays } from '@/lib/normalize-car'
import { createReservation } from '@/lib/actions/admin-create-reservation'

interface CarOption {
  id: string
  name: string
  pricePerDay: number
}

function fmtEuro(v: number): string {
  return Number.isInteger(v) ? `€${v}` : `€${v.toFixed(2)}`
}

export function NewReservationForm({
  cars,
  locale,
  defaultCarId,
  defaultPickup,
  defaultDropoff,
}: {
  cars: CarOption[]
  locale: string
  defaultCarId?: string
  defaultPickup: string
  defaultDropoff: string
}) {
  const [carId, setCarId] = useState(defaultCarId ?? '')
  const [pickup, setPickup] = useState(defaultPickup)
  const [dropoff, setDropoff] = useState(defaultDropoff)
  const [negotiated, setNegotiated] = useState('')
  const [state, formAction, isPending] = useActionState(createReservation, {})

  // Canlı fiyat — SADECE gösterim. Submit'te createReservation server fiyatını
  // yeniden hesaplar (admin-create-reservation.ts:62-69); client rakamı otorite DEĞİL.
  const selectedCar = cars.find((c) => c.id === carId)
  const days = pickup && dropoff ? dateDiffInDays(pickup, dropoff) + 1 : 0
  const validRange = days >= 1
  const base = selectedCar && validRange ? selectedCar.pricePerDay * days : 0

  const trimmed = negotiated.trim()
  const parsed = trimmed !== '' ? Number(trimmed) : null
  const validOverride = parsed !== null && Number.isFinite(parsed) && parsed >= 0

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />

      <div className="flex flex-col gap-1">
        <label htmlFor="carId" className="text-sm font-medium text-foreground">
          Car
        </label>
        <select
          id="carId"
          name="carId"
          value={carId}
          onChange={(e) => setCarId(e.target.value)}
          required
          className="h-10 rounded-md border bg-background px-3 text-sm"
        >
          <option value="" disabled>
            Select a car…
          </option>
          {cars.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} — €{c.pricePerDay}/day
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="pickup" className="text-sm font-medium text-foreground">
            Pickup
          </label>
          <input
            id="pickup"
            name="pickup"
            type="date"
            value={pickup}
            onChange={(e) => setPickup(e.target.value)}
            required
            className="h-10 rounded-md border bg-background px-3 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="dropoff" className="text-sm font-medium text-foreground">
            Dropoff
          </label>
          <input
            id="dropoff"
            name="dropoff"
            type="date"
            value={dropoff}
            onChange={(e) => setDropoff(e.target.value)}
            required
            className="h-10 rounded-md border bg-background px-3 text-sm"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="customerName" className="text-sm font-medium text-foreground">
          Customer name
        </label>
        <input
          id="customerName"
          name="customerName"
          type="text"
          required
          className="h-10 rounded-md border bg-background px-3 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="customerPhone" className="text-sm font-medium text-foreground">
            Phone
          </label>
          <input
            id="customerPhone"
            name="customerPhone"
            type="tel"
            required
            className="h-10 rounded-md border bg-background px-3 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="customerEmail" className="text-sm font-medium text-foreground">
            Email
          </label>
          <input
            id="customerEmail"
            name="customerEmail"
            type="email"
            required
            className="h-10 rounded-md border bg-background px-3 text-sm"
          />
        </div>
      </div>

      {/* Canlı server-fiyat gösterimi (otorite değil — yalnızca admin'e önizleme). */}
      {selectedCar && (
        <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
          {validRange ? (
            <span className="text-foreground">
              {selectedCar.name} × {days} days = <strong>{fmtEuro(base)}</strong>
              {validOverride && (
                <span className="text-muted-foreground">
                  {' '}
                  (override: {fmtEuro(parsed)} → applied total)
                </span>
              )}
            </span>
          ) : (
            <span className="text-destructive">Invalid date range</span>
          )}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="negotiatedRate" className="text-sm font-medium text-foreground">
          Negotiated total <span className="text-muted-foreground">(optional — server price if empty)</span>
        </label>
        <input
          id="negotiatedRate"
          name="negotiatedRate"
          type="number"
          min="0"
          step="0.01"
          value={negotiated}
          onChange={(e) => setNegotiated(e.target.value)}
          className="h-10 rounded-md border bg-background px-3 text-sm"
        />
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? 'Creating…' : 'Create reservation'}
      </button>
    </form>
  )
}
