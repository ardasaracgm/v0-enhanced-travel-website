/**
 * Mock ferry schedules.
 *
 * Single source of truth for ferry data, importable from BOTH client
 * components (the search/results pages) AND server actions (so prices
 * are looked up server-side and not trusted from client submissions).
 *
 * This file has NO 'use client' directive, so it can be imported into
 * server actions. When real ferry APIs come online (Kademe 6+), the
 * implementation here is swapped for actual API calls; the consumer
 * surface (FerryRoute type, getFerriesForRoute, getFerryById) stays
 * the same.
 */

export interface FerryRoute {
  id: string
  from: string
  to: string
  date: string
  departureTime: string
  arrivalTime: string
  duration: string
  /** Per-passenger price in EUR */
  price: number
  operator: string
  vessel: string
  availableSeats: number
}

export const mockFerries: FerryRoute[] = [
  {
    id: 'bk-1',
    from: 'Bodrum',
    to: 'Kos',
    date: '',
    departureTime: '09:00',
    arrivalTime: '10:00',
    duration: '1h 00m',
    price: 35,
    operator: 'Bodrum Express Lines',
    vessel: 'Bodrum Express I',
    availableSeats: 45,
  },
  {
    id: 'bk-2',
    from: 'Bodrum',
    to: 'Kos',
    date: '',
    departureTime: '11:30',
    arrivalTime: '12:30',
    duration: '1h 00m',
    price: 35,
    operator: 'Bodrum Express Lines',
    vessel: 'Bodrum Express II',
    availableSeats: 28,
  },
  {
    id: 'bk-3',
    from: 'Bodrum',
    to: 'Kos',
    date: '',
    departureTime: '16:00',
    arrivalTime: '17:00',
    duration: '1h 00m',
    price: 40,
    operator: 'Bodrum Ferryboat',
    vessel: 'Sea Star',
    availableSeats: 62,
  },
  // Reverse direction — for round-trip returns
  {
    id: 'kb-1',
    from: 'Kos',
    to: 'Bodrum',
    date: '',
    departureTime: '08:00',
    arrivalTime: '09:00',
    duration: '1h 00m',
    price: 35,
    operator: 'Bodrum Express Lines',
    vessel: 'Bodrum Express I',
    availableSeats: 45,
  },
  {
    id: 'kb-2',
    from: 'Kos',
    to: 'Bodrum',
    date: '',
    departureTime: '14:00',
    arrivalTime: '15:00',
    duration: '1h 00m',
    price: 35,
    operator: 'Bodrum Express Lines',
    vessel: 'Bodrum Express II',
    availableSeats: 38,
  },
  {
    id: 'kb-3',
    from: 'Kos',
    to: 'Bodrum',
    date: '',
    departureTime: '18:00',
    arrivalTime: '19:00',
    duration: '1h 00m',
    price: 40,
    operator: 'Bodrum Ferryboat',
    vessel: 'Sea Star',
    availableSeats: 55,
  },
  {
    id: 'tk-1',
    from: 'Turgutreis',
    to: 'Kos',
    date: '',
    departureTime: '08:30',
    arrivalTime: '09:10',
    duration: '40m',
    price: 30,
    operator: 'Turgutreis Lines',
    vessel: 'Turgutreis Express',
    availableSeats: 35,
  },
  {
    id: 'tk-2',
    from: 'Turgutreis',
    to: 'Kos',
    date: '',
    departureTime: '14:00',
    arrivalTime: '14:40',
    duration: '40m',
    price: 30,
    operator: 'Turgutreis Lines',
    vessel: 'Kos Star',
    availableSeats: 52,
  },
  {
    id: 'kt-1',
    from: 'Kos',
    to: 'Turgutreis',
    date: '',
    departureTime: '17:00',
    arrivalTime: '17:40',
    duration: '40m',
    price: 30,
    operator: 'Turgutreis Lines',
    vessel: 'Turgutreis Express',
    availableSeats: 40,
  },
  {
    id: 'mr-1',
    from: 'Marmaris',
    to: 'Rhodes',
    date: '',
    departureTime: '09:00',
    arrivalTime: '09:50',
    duration: '50m',
    price: 45,
    operator: 'Marmaris Ferries',
    vessel: 'Rhodes Dream',
    availableSeats: 78,
  },
  {
    id: 'mr-2',
    from: 'Marmaris',
    to: 'Rhodes',
    date: '',
    departureTime: '17:00',
    arrivalTime: '17:50',
    duration: '50m',
    price: 50,
    operator: 'Marmaris Ferries',
    vessel: 'Aegean Spirit',
    availableSeats: 41,
  },
  {
    id: 'rm-1',
    from: 'Rhodes',
    to: 'Marmaris',
    date: '',
    departureTime: '10:00',
    arrivalTime: '10:50',
    duration: '50m',
    price: 45,
    operator: 'Marmaris Ferries',
    vessel: 'Rhodes Dream',
    availableSeats: 70,
  },
  {
    id: 'ks-1',
    from: 'Kusadasi',
    to: 'Samos',
    date: '',
    departureTime: '08:00',
    arrivalTime: '09:30',
    duration: '1h 30m',
    price: 40,
    operator: 'Meander Travel',
    vessel: 'Samos Star',
    availableSeats: 55,
  },
  {
    id: 'ks-2',
    from: 'Kusadasi',
    to: 'Samos',
    date: '',
    departureTime: '15:30',
    arrivalTime: '17:00',
    duration: '1h 30m',
    price: 40,
    operator: 'Meander Travel',
    vessel: 'Ephesus Princess',
    availableSeats: 38,
  },
  {
    id: 'sk-1',
    from: 'Samos',
    to: 'Kusadasi',
    date: '',
    departureTime: '10:00',
    arrivalTime: '11:30',
    duration: '1h 30m',
    price: 40,
    operator: 'Meander Travel',
    vessel: 'Samos Star',
    availableSeats: 50,
  },
]

/** Find all ferries running a specific from→to route. */
export function getFerriesForRoute(from: string, to: string): FerryRoute[] {
  const f = from.toLowerCase()
  const t = to.toLowerCase()
  return mockFerries.filter(
    (ferry) => ferry.from.toLowerCase() === f && ferry.to.toLowerCase() === t
  )
}

/** Look up a single ferry by ID. Used server-side to verify client submissions. */
export function getFerryById(id: string): FerryRoute | null {
  return mockFerries.find((f) => f.id === id) ?? null
}
