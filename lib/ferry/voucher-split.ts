import { groupFerryLegs, type GroupableLeg } from './group-legs'
import { expeditionIdFromFerryId } from './reconcile'

/**
 * ferryVoucherSections — a trip's ferry legs → Dentur-style voucher sections.
 * ONE section per leg (Voucher No repeated per route), PNRs assigned to their leg
 * by expeditionId (the leg-match key reconcile uses — NOT ticketDirection, which
 * collapses on open-jaw where both one-ways read "outbound"). Fallback when a PNR
 * can't be matched: all PNRs under the anchor leg — never a PNR on the wrong route.
 *
 * Only RESERVED groups (anchor has reservation_id) yield sections. Round-trip is
 * ONE reservation whose PNRs all live on the outbound anchor → split back per leg;
 * open-jaw → each one-way group its own reservation_id.
 *
 * Shared by the paid confirmation email and the trip-detail page (3rd consumer of
 * this split → extracted here). The ferry LIST helper keeps its own grouped-card
 * shape (legs carry dates/times too) and is a candidate to migrate onto this later.
 */
export interface VoucherSection {
  voucherNo: string
  route: string
  pnrs: Array<{ pnr: number; passengerName?: string }>
}

const safeExpId = (ferryId?: string): number | undefined => {
  try {
    return expeditionIdFromFerryId(ferryId)
  } catch {
    return undefined
  }
}

export function ferryVoucherSections<T extends GroupableLeg>(legs: T[]): VoucherSection[] {
  return groupFerryLegs(legs).flatMap((group) => {
    const anchor = group.anchor.meta
    if (typeof anchor.reservation_id !== 'number') return []
    const voucherNo = String(anchor.reservation_id)
    const all = anchor.vouchers ?? []
    const line = (v: { pnr: number; passengerName?: string }) => ({
      pnr: v.pnr,
      passengerName: v.passengerName || undefined,
    })

    const perLeg = group.legs.map((leg) => {
      const legExp = safeExpId(leg.meta.ferry_id)
      return {
        route: `${leg.meta.from_port} → ${leg.meta.to_port}`,
        pnrs: all.filter((v) => v.expeditionId != null && v.expeditionId === legExp).map(line),
      }
    })
    const matched = perLeg.reduce((n, l) => n + l.pnrs.length, 0)
    if (all.length > 0 && matched === all.length) {
      return perLeg.map((l) => ({ voucherNo, route: l.route, pnrs: l.pnrs }))
    }
    // Fallback: one section, all PNRs under the anchor's route.
    return [
      {
        voucherNo,
        route: anchor.from_port && anchor.to_port ? `${anchor.from_port} → ${anchor.to_port}` : '',
        pnrs: all.map(line),
      },
    ]
  })
}
