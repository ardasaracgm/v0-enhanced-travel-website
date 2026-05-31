/**
 * TravelBeez · Supabase Client + Domain Types
 * ============================================
 * Trip-centric data model.
 *
 * IMPORTANT:
 * Helper functions for booking flow (createBooking, completeBooking, etc.)
 * from the previous schema have been removed. They will be reintroduced as
 * server actions in Kademe 3 (ferry booking flow). Until then, any caller
 * importing those will get a compile-time error pointing to this file.
 *
 * The deprecated functions are kept as stubs at the bottom of this file
 * that throw a clear error, so existing pages won't crash at runtime
 * silently — they'll fail loudly with a helpful message.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// ============================================================
// CLIENT
// ============================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // Don't crash at module load; log clearly so misconfig is obvious in logs.
  // Calls will fail with a clear "no client" error if attempted.
  console.error(
    '[supabase] Missing env vars: NEXT_PUBLIC_SUPABASE_URL and/or NEXT_PUBLIC_SUPABASE_ANON_KEY'
  )
}

export const supabase: SupabaseClient = createClient(
  supabaseUrl ?? '',
  supabaseAnonKey ?? '',
  {
    auth: { persistSession: false },
  }
)


// ============================================================
// DOMAIN ENUMS  (mirror the Postgres enum types exactly)
// ============================================================

export type TripState =
  | 'draft'
  | 'pending_payment'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'failed'

export type TripItemType =
  | 'ferry'
  | 'transfer'
  | 'car_rental'
  | 'tour'
  | 'hotel'
  | 'package_pickup'
  | 'insurance'
  | 'esim'
  | 'visa'
  | 'custom'

export type TripItemState =
  | 'draft'
  | 'reserved'
  | 'confirmed'
  | 'fulfilled'
  | 'cancelled'
  | 'failed'

export type SupplierType =
  | 'internal'
  | 'ferry_operator'
  | 'car_rental'
  | 'hotel_aggregator'
  | 'tour_provider'
  | 'transfer_provider'
  | 'insurance'
  | 'esim'
  | 'visa_service'
  | 'warehouse'

export type PaymentProvider =
  | 'viva_wallet'
  | 'bank_transfer'
  | 'cash'
  | 'internal'

export type PaymentState =
  | 'pending'
  | 'completed'
  | 'failed'
  | 'refunded'
  | 'partially_refunded'

export type PassengerType = 'adult' | 'child' | 'infant'

export type InquiryType =
  | 'tour'
  | 'hotel'
  | 'bundle'
  | 'vip_transfer'
  | 'package_pickup'
  | 'kos_transit'
  | 'custom'

export type InquiryState =
  | 'new'
  | 'in_progress'
  | 'quoted'
  | 'won'
  | 'lost'

export type Locale = 'tr' | 'el' | 'en'

export type Currency = 'EUR' // for now; widen later if needed


// ============================================================
// DOMAIN TYPES  (mirror table columns 1:1)
// ============================================================

export interface Customer {
  id: string
  email: string
  phone: string
  full_name?: string | null
  nationality?: string | null
  preferred_language: Locale
  marketing_consent: boolean
  created_at: string
  updated_at: string
}

export interface Supplier {
  id: string
  name: string
  type: SupplierType
  contact_email?: string | null
  contact_phone?: string | null
  api_endpoint?: string | null
  api_config: Record<string, unknown>
  active: boolean
  notes?: string | null
  created_at: string
  updated_at: string
}

export interface Trip {
  id: string
  customer_id: string
  reference: string
  title?: string | null
  state: TripState
  start_date?: string | null
  end_date?: string | null
  party_size: number
  contact_email: string
  contact_phone: string
  currency: Currency
  total_amount: number
  locale: Locale
  notes_internal?: string | null
  notes_customer?: string | null
  source?: string | null
  created_at: string
  updated_at: string
  confirmed_at?: string | null
  cancelled_at?: string | null
  cancellation_reason?: string | null
  viva_order_code?: string | null
}

/**
 * Item-type-specific metadata schemas.
 * These are documented contracts for what goes in `trip_items.metadata` (jsonb).
 * Application code should validate against these before write.
 */
export interface FerryItemMetadata {
  from_port: string
  to_port: string
  vessel?: string
  operator?: string
  departure_time: string  // ISO time
  arrival_time: string    // ISO time
  duration_minutes?: number
  seat_class?: 'economy' | 'business' | 'vip'
  vehicle?: { type: string; plate?: string } | null
}

export interface TransferItemMetadata {
  pickup_location: string       // address or POI
  dropoff_location: string
  vehicle_class: 'standard' | 'vip' | 'minivan' | 'minibus'
  pickup_at: string             // ISO
  flight_or_ferry_ref?: string
}

export interface CarRentalItemMetadata {
  car_id?: string               // FK to cars table if internal
  model: string
  pickup_location: string
  dropoff_location: string
  pickup_at: string
  dropoff_at: string
  driver_license_country?: string
  insurance_level?: 'basic' | 'full'
}

export interface TourItemMetadata {
  tour_slug: string
  tour_date: string             // ISO date
  start_time?: string
  meeting_point?: string
  duration_hours?: number
  participants?: { adults: number; children?: number }
}

export interface HotelItemMetadata {
  hotel_id?: string
  hotel_name: string
  city: string
  check_in: string              // ISO date
  check_out: string             // ISO date
  room_type: string
  num_rooms?: number
  guests?: { adults: number; children?: number }
  meal_plan?: 'room_only' | 'breakfast' | 'half_board' | 'full_board' | 'all_inclusive'
}

export interface PackagePickupItemMetadata {
  package_count: number
  expected_arrival_date: string
  package_description?: string
  delivery_location: string
  delivery_window?: { from: string; to: string }
}

export interface InsuranceItemMetadata {
  policy_type: 'travel' | 'health' | 'cancellation' | 'comprehensive'
  coverage_amount?: number
  starts_at: string
  ends_at: string
  insurer?: string
}

export interface ESIMItemMetadata {
  data_gb: number | 'unlimited'
  validity_days: number
  region: string  // e.g. 'GR', 'EU'
  delivery_method?: 'qr_email' | 'physical'
}

export interface VisaItemMetadata {
  visa_type: 'schengen' | 'door_visa' | 'other'
  applicant_count: number
  urgency?: 'standard' | 'expedited'
  appointment_required?: boolean
}

export interface CustomItemMetadata {
  description: string
  [key: string]: unknown
}

export type TripItemMetadata =
  | FerryItemMetadata
  | TransferItemMetadata
  | CarRentalItemMetadata
  | TourItemMetadata
  | HotelItemMetadata
  | PackagePickupItemMetadata
  | InsuranceItemMetadata
  | ESIMItemMetadata
  | VisaItemMetadata
  | CustomItemMetadata

export interface TripItem {
  id: string
  trip_id: string
  item_type: TripItemType
  sequence: number
  supplier_id?: string | null
  supplier_ref?: string | null
  title: string
  description?: string | null
  scheduled_at?: string | null
  ends_at?: string | null
  passenger_count: number
  price_amount: number
  price_currency: Currency
  cancellation_policy: Record<string, unknown>
  state: TripItemState
  metadata: TripItemMetadata | Record<string, unknown>
  internal_notes?: string | null
  created_at: string
  updated_at: string
}

export interface Passenger {
  id: string
  trip_id: string
  first_name: string
  last_name: string
  birth_date?: string | null
  gender?: 'male' | 'female' | 'unspecified' | null
  passport_number?: string | null
  passport_country?: string | null
  passport_expiry?: string | null   // ISO date (YYYY-MM-DD); Dentur optional field
  nationality?: string | null
  type: PassengerType
  is_lead: boolean
  email?: string | null
  phone?: string | null
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  trip_id: string
  amount: number
  currency: Currency
  provider: PaymentProvider
  provider_ref?: string | null
  state: PaymentState
  payment_method?: string | null
  idempotency_key: string
  metadata: Record<string, unknown>
  failure_reason?: string | null
  created_at: string
  updated_at: string
  completed_at?: string | null
}

export interface PaymentAllocation {
  id: string
  payment_id: string
  trip_item_id: string
  amount: number
  currency: Currency
  created_at: string
}

export interface SupplierBooking {
  id: string
  trip_item_id?: string | null
  supplier_id?: string | null
  operation: 'create' | 'update' | 'cancel' | 'status_check'
  request_payload?: Record<string, unknown> | null
  response_payload?: Record<string, unknown> | null
  status_code?: number | null
  success: boolean
  error_message?: string | null
  attempted_at: string
}

export interface Inquiry {
  id: string
  inquiry_type: InquiryType
  customer_email: string
  customer_phone?: string | null
  customer_name?: string | null
  party_size?: number | null
  preferred_dates: Record<string, unknown>
  requirements?: string | null
  locale: Locale
  state: InquiryState
  assigned_to?: string | null
  internal_notes?: string | null
  trip_id?: string | null
  source?: string | null
  created_at: string
  updated_at: string
}

export interface ContactRequest {
  id: string
  name: string
  email: string
  phone?: string | null
  subject: string
  message: string
  state: 'new' | 'read' | 'responded' | 'archived'
  locale: Locale
  created_at: string
}

// `cars` table is preserved as-is from the existing schema
export interface Car {
  id: string
  available: boolean
  price: number
  image: string

  // Optional fields — Supabase rows may have either nested specs object
  // OR flat columns, depending on when they were inserted.
  // The car-rental page's normalizeCar() handles both shapes.
  type?: string
  model?: string
  brand?: string
  category?: string
  description?: string
  badge?: string
  features?: string[]
  specs?:
    | {
        fuel?: string
        seats?: number
        transmission?: string
        ac?: boolean
      }
    | string

  // Flat column variants (legacy / direct Supabase rows)
  fuel_type?: string
  seats?: number
  transmission?: string

  created_at?: string
}


// ============================================================
// COMPOSITE TYPES  (for reads with joined data)
// ============================================================

export interface TripWithItems extends Trip {
  items: TripItem[]
  passengers: Passenger[]
}

export interface TripFull extends Trip {
  customer: Customer
  items: TripItem[]
  passengers: Passenger[]
  payments: Payment[]
}


// ============================================================
// PUBLIC HELPER FUNCTIONS  (read-only, anon-safe)
// ============================================================

/**
 * Fetch all available cars from the catalog.
 * Read-only, suitable for the public car-rental page.
 */
export async function getAvailableCars(): Promise<{
  data: Car[] | null
  error: Error | null
  isEmpty: boolean
}> {
  const { data, error } = await supabase
    .from('cars')
    .select('*')
    .eq('available', true)
    .order('price_per_day', { ascending: true })

  if (error) {
    return { data: null, error: new Error(error.message), isEmpty: false }
  }

  return { data: data ?? [], error: null, isEmpty: !data || data.length === 0 }
}

/**
 * Fetch a single car by id. Used on car detail pages.
 */
export async function getCarById(id: string): Promise<{
  data: Car | null
  error: Error | null
}> {
  const { data, error } = await supabase
    .from('cars')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    return { data: null, error: new Error(error.message) }
  }
  return { data, error: null }
}

/**
 * Submit a generic contact form message.
 * Used by /contact page. Anon-allowed insert.
 */
export async function submitContactRequest(input: {
  name: string
  email: string
  phone?: string
  subject: string
  message: string
  locale?: Locale
}): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from('contact_requests').insert({
    name: input.name,
    email: input.email,
    phone: input.phone ?? null,
    subject: input.subject,
    message: input.message,
    locale: input.locale ?? 'en',
  })

  if (error) {
    console.error('[supabase] contact_requests insert failed:', error.message)
    return { success: false, error: error.message }
  }
  return { success: true }
}

/**
 * Submit an inquiry / lead for products not yet on automated checkout
 * (tours, hotels, bundle packages, VIP transfer, package pickup, multi-leg).
 * Used by the various "Request a Quote" forms.
 */
export async function submitInquiry(input: {
  inquiry_type: InquiryType
  customer_email: string
  customer_phone?: string
  customer_name?: string
  party_size?: number
  preferred_dates?: Record<string, unknown>
  requirements?: string
  locale?: Locale
  source?: string
}): Promise<{ success: boolean; inquiry_id?: string; error?: string }> {
  const { data, error } = await supabase
    .from('inquiries')
    .insert({
      inquiry_type: input.inquiry_type,
      customer_email: input.customer_email,
      customer_phone: input.customer_phone ?? null,
      customer_name: input.customer_name ?? null,
      party_size: input.party_size ?? null,
      preferred_dates: input.preferred_dates ?? {},
      requirements: input.requirements ?? null,
      locale: input.locale ?? 'en',
      source: input.source ?? null,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[supabase] inquiries insert failed:', error.message)
    return { success: false, error: error.message }
  }
  return { success: true, inquiry_id: data.id }
}


// ============================================================
// DEPRECATED STUBS
// ============================================================
// The following functions existed in the previous schema and are
// imported by some legacy pages. They are stubbed so the app still
// compiles, but calling them throws a loud error.
//
// They will be replaced by proper server actions in Kademe 3.

const DEPRECATED_MSG =
  'This function was removed in the Kademe 1 migration. The new trip-centric booking flow lands in Kademe 3.'

export async function getOrCreateCustomer(): Promise<never> {
  throw new Error(`getOrCreateCustomer: ${DEPRECATED_MSG}`)
}

export async function createBooking(): Promise<never> {
  throw new Error(`createBooking: ${DEPRECATED_MSG}`)
}

export async function createPassengers(): Promise<never> {
  throw new Error(`createPassengers: ${DEPRECATED_MSG}`)
}

export async function createPayment(): Promise<never> {
  throw new Error(`createPayment: ${DEPRECATED_MSG}`)
}

export async function completeBooking(): Promise<never> {
  throw new Error(`completeBooking: ${DEPRECATED_MSG}`)
}

export async function saveContactRequest(input: {
  name: string
  email: string
  phone?: string
  subject: string
  message: string
}): Promise<{ success: boolean; error?: string }> {
  // Forward to the new function so legacy callers still work transparently.
  return submitContactRequest(input)
}

export async function getBookingByReference(): Promise<never> {
  throw new Error(`getBookingByReference: ${DEPRECATED_MSG}`)
}

export async function saveEventRequest(data: any) {
  console.warn("saveEventRequest is temporarily disabled in Kademe 2", data)

  return {
    success: false,
    error: "Event requests will be enabled soon. Please contact us on WhatsApp.",
  }
}
