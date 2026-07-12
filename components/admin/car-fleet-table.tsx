'use client'

import * as React from 'react'
import { ChevronDown, ChevronRight, Wrench } from 'lucide-react'

import { Link, useRouter } from '@/i18n/routing'
import { setCarStatus } from '@/lib/actions/set-car-status'
import { updateModelPrice } from '@/lib/actions/update-model-price'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'

export interface PlateRow {
  id: string
  plate: string
  model: string
  priority: number
  status: 'active' | 'maintenance'
  remaining: number // 0/1 for the selected range
}
export interface ModelGroup {
  modelKey: string
  label: string
  category: string
  price: number // havuz günlük fiyatı (page.tsx: havuzdaki min price_per_day)
  plateCount: number
  remaining: number
  plates: PlateRow[]
}

const GREEN = 'border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-500'
const AMBER = 'border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-500'

export function CarFleetTable({
  groups,
  pickup,
  dropoff,
}: {
  groups: ModelGroup[]
  pickup: string
  dropoff: string
}) {
  const router = useRouter()
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>(() =>
    Object.fromEntries(groups.map((g) => [g.modelKey, true])),
  )
  const [pending, setPending] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [editingKey, setEditingKey] = React.useState<string | null>(null)
  const [priceInput, setPriceInput] = React.useState('')
  const [savingKey, setSavingKey] = React.useState<string | null>(null)
  const [priceError, setPriceError] = React.useState<string | null>(null)

  const toggleExpand = (key: string) => setExpanded((e) => ({ ...e, [key]: !e[key] }))

  function startEdit(g: ModelGroup) {
    setPriceError(null)
    setEditingKey(g.modelKey)
    setPriceInput(String(g.price))
  }

  async function onSavePrice(g: ModelGroup) {
    setPriceError(null)
    const val = Number(priceInput)
    if (!Number.isFinite(val) || val <= 0) {
      setPriceError('Price must be greater than 0.')
      return
    }
    setSavingKey(g.modelKey)
    const res = await updateModelPrice(g.modelKey, val)
    setSavingKey(null)
    if (!res.ok) {
      setPriceError(res.error ?? 'Update failed.')
      return
    }
    setEditingKey(null)
    router.refresh()
  }

  async function onToggleStatus(p: PlateRow) {
    setError(null)
    setPending(p.id)
    const res = await setCarStatus(p.id, p.status === 'active' ? 'maintenance' : 'active')
    setPending(null)
    if (!res.ok) {
      setError(res.error ?? 'Update failed.')
      return
    }
    router.refresh()
  }

  if (groups.length === 0) {
    return (
      <div className="rounded-md border bg-background p-8 text-center text-muted-foreground">
        No cars.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {priceError ? <p className="text-sm text-destructive">{priceError}</p> : null}
      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Model / Plate</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Price</TableHead>
              <TableHead className="text-right">Available</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map((g) => {
              const open = expanded[g.modelKey]
              return (
                <React.Fragment key={g.modelKey}>
                  <TableRow
                    className="cursor-pointer bg-muted/40 hover:bg-muted"
                    onClick={() => toggleExpand(g.modelKey)}
                  >
                    <TableCell className="font-semibold text-foreground">
                      <span className="inline-flex items-center gap-2">
                        {open ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        {g.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {g.category} · {g.plateCount} plate{g.plateCount === 1 ? '' : 's'}
                    </TableCell>
                    {/* Fiyat = havuz-seviyesi ayrı hücre. Tıklamalar toggleExpand'i
                        tetiklemesin diye stopPropagation (satır onClick=toggleExpand). */}
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {editingKey === g.modelKey ? (
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">€</span>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={priceInput}
                            onChange={(e) => setPriceInput(e.target.value)}
                            className="h-8 w-20 rounded-md border bg-background px-2 text-sm"
                          />
                          <button
                            type="button"
                            disabled={savingKey === g.modelKey}
                            onClick={() => onSavePrice(g)}
                            className="rounded-md border px-2 py-1 text-xs font-medium hover:bg-muted disabled:opacity-50"
                          >
                            {savingKey === g.modelKey ? '…' : 'Save'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingKey(null)
                              setPriceError(null)
                            }}
                            className="px-1 text-xs text-muted-foreground hover:underline"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-2">
                          <span className="font-medium">€{g.price}/day</span>
                          <button
                            type="button"
                            onClick={() => startEdit(g)}
                            className="text-xs text-primary hover:underline"
                          >
                            edit
                          </button>
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {g.remaining === 0 ? (
                        <Badge variant="destructive">0</Badge>
                      ) : (
                        <span className="font-medium">
                          {g.remaining}/{g.plateCount}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">—</TableCell>
                  </TableRow>

                  {open &&
                    g.plates.map((p) => (
                      <TableRow key={p.id} className="text-sm">
                        <TableCell className="pl-10">
                          <span className="font-mono text-foreground">{p.plate}</span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            {p.model} · P{p.priority}
                          </span>
                        </TableCell>
                        <TableCell>
                          {p.status === 'maintenance' ? (
                            <Badge className={AMBER}>
                              <Wrench className="mr-1 h-3 w-3" /> Maintenance
                            </Badge>
                          ) : p.remaining > 0 ? (
                            <Badge className={GREEN}>Available</Badge>
                          ) : (
                            <Badge variant="destructive">Booked</Badge>
                          )}
                        </TableCell>
                        {/* Fiyat havuz-seviyesi (grup başlığında) — plaka satırında boş. */}
                        <TableCell className="text-muted-foreground">—</TableCell>
                        <TableCell className="text-right">
                          {p.status === 'maintenance' ? (
                            <span className="text-muted-foreground">—</span>
                          ) : p.remaining > 0 ? (
                            <Badge className={GREEN}>1</Badge>
                          ) : (
                            <Badge variant="destructive">0</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-3">
                            {p.status === 'active' && p.remaining > 0 ? (
                              <Link
                                href={`/admin/trips/new?carId=${p.id}&pickup=${pickup}&dropoff=${dropoff}`}
                                className="text-sm font-medium text-primary hover:underline"
                              >
                                Book
                              </Link>
                            ) : null}
                            <button
                              type="button"
                              disabled={pending === p.id}
                              onClick={() => onToggleStatus(p)}
                              className="rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-muted disabled:opacity-50"
                            >
                              {pending === p.id
                                ? '…'
                                : p.status === 'active'
                                  ? 'Set maintenance'
                                  : 'Set active'}
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </React.Fragment>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
