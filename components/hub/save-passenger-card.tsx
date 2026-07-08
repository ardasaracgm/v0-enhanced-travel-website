'use client'

import { useActionState } from 'react'
import { UserPlus, Check } from 'lucide-react'

import { saveTripPassengerAsCompanionAction } from '@/lib/actions/save-trip-passenger-companion'

interface SavePassengerLabels {
  emailPlaceholder: string
  cta: string
  saving: string
  saved: string
  duplicate: string
  invalid: string
  error: string
  tripLabel: string
}

/**
 * One saveable passenger → its own <form> + useActionState, so each row's result
 * is isolated (one save never touches another's state). On saved/duplicate the
 * row collapses to a done state — the server list still contains the passenger
 * (dedup is name/passport-based, not "is-companion"), so client-side collapse is
 * what prevents "saved but still listed" confusion within the session. The saved
 * badge claims only "saved" (never "invited") — the invite is non-fatal server-side.
 */
export function SavePassengerCard({
  passengerId,
  name,
  tripReference,
  locale,
  labels,
}: {
  passengerId: string
  name: string
  tripReference: string
  locale: string
  labels: SavePassengerLabels
}) {
  const [state, formAction, isPending] = useActionState(saveTripPassengerAsCompanionAction, null)
  const done = state?.status === 'saved' || state?.status === 'duplicate'

  if (done) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border bg-background p-3">
        <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-foreground">
          <Check className="h-4 w-4 flex-shrink-0 text-green-600" />
          <span className="truncate">{name}</span>
        </span>
        <span className="whitespace-nowrap text-xs text-green-700">
          {state?.status === 'saved' ? labels.saved : labels.duplicate}
        </span>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-background p-3">
      <form action={formAction} className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="passengerId" value={passengerId} />
        <div className="min-w-0 sm:flex-1">
          <p className="flex items-center gap-2 text-sm font-medium text-foreground">
            <UserPlus className="h-4 w-4 flex-shrink-0 text-primary" />
            <span className="truncate">{name}</span>
          </p>
          {tripReference && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {labels.tripLabel}: {tripReference}
            </p>
          )}
        </div>
        <input
          name="email"
          type="email"
          required
          placeholder={labels.emailPlaceholder}
          className="h-9 w-full rounded-md border px-3 text-sm sm:w-56"
        />
        <button
          type="submit"
          disabled={isPending}
          className="h-9 whitespace-nowrap rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white disabled:opacity-60"
        >
          {isPending ? labels.saving : labels.cta}
        </button>
      </form>
      {(state?.status === 'invalid' || state?.status === 'error') && (
        <p className="mt-1.5 text-xs text-destructive">
          {state.status === 'invalid' ? labels.invalid : labels.error}
        </p>
      )}
    </div>
  )
}
