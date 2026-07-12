'use client'

import * as React from 'react'

import { useRouter } from '@/i18n/routing'
import { addCar } from '@/lib/actions/add-car'
import { carModelKey, MODEL_KEY_RE } from '@/lib/car-slug'

const CATEGORIES = ['microcar', 'compact', '5-seater', 'suv'] as const
const TRANSMISSIONS = ['Manual', 'Automatic'] as const
const SEAT_OPTIONS = [2, 4, 5, 7] as const

const field = 'h-10 rounded-md border bg-background px-3 text-sm'
const labelCls = 'text-xs uppercase tracking-wide text-muted-foreground'

export function AddCarForm() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)

  const [brand, setBrand] = React.useState('')
  const [model, setModel] = React.useState('')
  const [overrideKey, setOverrideKey] = React.useState(false)
  const [manualKey, setManualKey] = React.useState('')
  const [category, setCategory] = React.useState<(typeof CATEGORIES)[number]>('compact')
  const [pricePerDay, setPricePerDay] = React.useState('')
  const [seats, setSeats] = React.useState<number>(5)
  const [transmission, setTransmission] = React.useState<(typeof TRANSMISSIONS)[number]>('Manual')
  const [plate, setPlate] = React.useState('')

  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [ok, setOk] = React.useState<string | null>(null)

  const autoKey = carModelKey(brand, model)
  const modelKey = overrideKey ? manualKey.trim() : autoKey
  const keyValid = MODEL_KEY_RE.test(modelKey)

  function reset() {
    setBrand('')
    setModel('')
    setOverrideKey(false)
    setManualKey('')
    setCategory('compact')
    setPricePerDay('')
    setSeats(5)
    setTransmission('Manual')
    setPlate('')
  }

  async function onSubmit() {
    setError(null)
    setOk(null)
    setPending(true)
    const res = await addCar({
      brand,
      model,
      modelKey,
      category,
      pricePerDay: Number(pricePerDay),
      seats,
      transmission,
      plate,
    })
    setPending(false)
    if (!res.ok) {
      setError(res.error ?? 'Failed to add car.')
      return
    }
    setOk(`Added ${brand} ${model} · ${plate}.`)
    reset()
    router.refresh()
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted"
      >
        + Add car
      </button>
    )
  }

  const canSubmit =
    !pending && !!brand.trim() && !!model.trim() && !!plate.trim() && keyValid && Number(pricePerDay) > 0

  return (
    <div className="space-y-4 rounded-md border bg-background p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Add car</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-muted-foreground hover:underline"
        >
          Close
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="ac-brand" className={labelCls}>Brand</label>
          <input id="ac-brand" className={field} value={brand}
            onChange={(e) => setBrand(e.target.value)} placeholder="Fiat" />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="ac-model" className={labelCls}>Model</label>
          <input id="ac-model" className={field} value={model}
            onChange={(e) => setModel(e.target.value)} placeholder="Grande Panda" />
        </div>
      </div>

      {/* model_key — brand+model'den canlı türetilir; override ile elle düzenlenir. */}
      <div className="space-y-1 rounded-md border border-dashed bg-muted/30 p-3">
        <div className="flex items-center justify-between gap-3">
          <span className={labelCls}>Model key</span>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <input type="checkbox" checked={overrideKey}
              onChange={(e) => setOverrideKey(e.target.checked)} />
            Override
          </label>
        </div>
        {overrideKey ? (
          <input className={`${field} w-full font-mono`} value={manualKey}
            onChange={(e) => setManualKey(e.target.value)} placeholder="grande-panda" />
        ) : (
          <p className="font-mono text-sm text-foreground">
            {modelKey || <span className="text-muted-foreground">—</span>}
          </p>
        )}
        <p className="text-xs text-amber-600 dark:text-amber-500">
          Add <span className="font-mono">public/cars/{modelKey || '<model-key>'}.webp</span> to the
          repo — the card image is resolved by this key.
        </p>
        {!keyValid && (brand || model || overrideKey) ? (
          <p className="text-xs text-destructive">
            Key must be lowercase letters, numbers and dashes.
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="ac-category" className={labelCls}>Category</label>
          <select id="ac-category" className={field} value={category}
            onChange={(e) => setCategory(e.target.value as (typeof CATEGORIES)[number])}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="ac-price" className={labelCls}>Price / day (€)</label>
          <input id="ac-price" type="number" min="1" step="1" className={field}
            value={pricePerDay} onChange={(e) => setPricePerDay(e.target.value)} placeholder="65" />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="ac-seats" className={labelCls}>Seats</label>
          <select id="ac-seats" className={field} value={seats}
            onChange={(e) => setSeats(Number(e.target.value))}>
            {SEAT_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="ac-transmission" className={labelCls}>Transmission</label>
          <select id="ac-transmission" className={field} value={transmission}
            onChange={(e) => setTransmission(e.target.value as (typeof TRANSMISSIONS)[number])}>
            {TRANSMISSIONS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="ac-plate" className={labelCls}>Plate</label>
          <input id="ac-plate" className={`${field} font-mono`} value={plate}
            onChange={(e) => setPlate(e.target.value)} placeholder="XPY3835" />
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {ok ? <p className="text-sm text-emerald-600 dark:text-emerald-500">{ok}</p> : null}

      <div className="flex items-center gap-3">
        <button type="button" onClick={onSubmit} disabled={!canSubmit}
          className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
          {pending ? 'Adding…' : 'Add car'}
        </button>
        <span className="text-xs text-muted-foreground">
          Adds an active, bookable plate (Kos · owned · priority 1). Coming-soon cars stay in SQL.
        </span>
      </div>
    </div>
  )
}
