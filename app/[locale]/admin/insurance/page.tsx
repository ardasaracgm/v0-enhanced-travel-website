import { listInsuranceTrips } from '@/lib/actions/admin-list-insurance-trips'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Download, FileText } from 'lucide-react'
import type { TripState } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Trip durumu rozet renkleri (TripState union'ı tam kapsanır).
const TRIP_VARIANT: Record<TripState, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'outline',
  pending_payment: 'outline',
  confirmed: 'default',
  in_progress: 'secondary',
  completed: 'default',
  cancelled: 'destructive',
  failed: 'destructive',
}

// Poliçe durumu rozet renkleri ('none' = poliçe henüz oluşturulmamış).
const POLICY_VARIANT: Record<
  'pending' | 'issued' | 'failed' | 'none',
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  issued: 'default',
  pending: 'secondary',
  failed: 'destructive',
  none: 'outline',
}

export default async function AdminInsurancePage() {
  // Gate layout'ta geçildi → burada veri-erişim helper'ı (service-role) ile oku.
  const result = await listInsuranceTrips()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Insurance Policies</h1>

      {!result.ok ? (
        <p className="text-sm text-destructive">Failed to load policies: {result.error}</p>
      ) : (
        <div className="rounded-md border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Trip</TableHead>
                <TableHead>Policy</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    No insurance bookings.
                  </TableCell>
                </TableRow>
              ) : (
                result.rows.map((r) => (
                  <TableRow key={r.tripId}>
                    <TableCell className="whitespace-nowrap">
                      {new Date(r.createdAt).toLocaleDateString('en-GB')}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">{r.reference}</TableCell>
                    <TableCell className="text-muted-foreground">{r.contactEmail}</TableCell>
                    <TableCell>
                      <Badge variant={TRIP_VARIANT[r.tripState] ?? 'outline'}>{r.tripState}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={POLICY_VARIANT[r.policyState]}>{r.policyState}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {r.tariffName ?? '—'}
                      {r.coverageValue != null && ` · €${r.coverageValue.toLocaleString('en-GB')}`}
                      {r.touristCount != null && ` · ${r.touristCount} pax`}
                    </TableCell>
                    <TableCell>
                      {/* Diff 3: koşulsuz disabled. Diff 4'te onAction/href bağlanacak. */}
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" disabled>
                          <Download className="h-3.5 w-3.5 mr-1" />
                          Download PDF
                        </Button>
                        <Button size="sm" variant="outline" disabled>
                          <FileText className="h-3.5 w-3.5 mr-1" />
                          Issue policy
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
