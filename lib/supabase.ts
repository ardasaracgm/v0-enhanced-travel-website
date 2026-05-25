import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Check if Supabase is properly configured
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

// Create Supabase client only if configured
let supabase: SupabaseClient | null = null

if (isSupabaseConfigured) {
  supabase = createClient(supabaseUrl!, supabaseAnonKey!)
} else if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.warn('[TravelBeez] Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.')
}

// Safe getter for Supabase client
function getSupabaseClient(): SupabaseClient | null {
  return supabase
}

// Types for database tables
export interface Customer {
  id?: string
  email: string
  phone: string
  created_at?: string
}

export interface Booking {
  id?: string
  customer_id: string
  booking_reference: string
  route_from: string
  route_to: string
  departure_date: string
  return_date?: string
  outbound_ferry: string
  return_ferry?: string
  total_price: number
  currency: string
  status: 'pending' | 'confirmed' | 'cancelled'
  created_at?: string
}

export interface Passenger {
  id?: string
  booking_id: string
  first_name: string
  last_name: string
  birth_date: string
  passport_number: string
  nationality: string
  is_lead_passenger: boolean
  created_at?: string
}

export interface Payment {
  id?: string
  booking_id: string
  amount: number
  currency: string
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  payment_method?: string
  transaction_id?: string
  created_at?: string
}

export interface ContactRequest {
  id?: string
  name: string
  email: string
  phone?: string
  subject: string
  message: string
  status: 'new' | 'read' | 'responded'
  created_at?: string
}

export interface Car {
  id: string
  type: string
  model: string
  price: number
  image: string
  features: string[]
  specs: {
    fuel: string
    seats: number
    transmission: string
    ac: boolean
  }
  badge?: string
  description: string
  available: boolean
  created_at?: string
}

// Database helper functions

/**
 * Create or get existing customer by email
 */
export async function getOrCreateCustomer(email: string, phone: string): Promise<{ data: Customer | null; error: Error | null }> {
  const client = getSupabaseClient()
  if (!client) {
    return { data: null, error: new Error('Database not configured. Please contact support.') }
  }

  try {
    // First try to find existing customer
    const { data: existingCustomer, error: findError } = await client
      .from('customers')
      .select('*')
      .eq('email', email)
      .single()

    if (existingCustomer) {
      // Update phone if different
      if (existingCustomer.phone !== phone) {
        const { data: updatedCustomer, error: updateError } = await client
          .from('customers')
          .update({ phone })
          .eq('id', existingCustomer.id)
          .select()
          .single()
        
        if (updateError) {
          console.error('Customer update error:', updateError.message)
          return { data: null, error: new Error(updateError.message) }
        }
        return { data: updatedCustomer, error: null }
      }
      return { data: existingCustomer, error: null }
    }

    // Create new customer if not found (and not a "no rows" error)
    if (findError && findError.code !== 'PGRST116') {
      console.error('Customer find error:', findError.message)
      return { data: null, error: new Error(findError.message) }
    }

    const { data: newCustomer, error: createError } = await client
      .from('customers')
      .insert({ email, phone })
      .select()
      .single()

    if (createError) {
      console.error('Customer create error:', createError.message)
      return { data: null, error: new Error(createError.message) }
    }

    return { data: newCustomer, error: null }
  } catch (err) {
    console.error('Unexpected customer error:', err)
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

/**
 * Create a new booking
 */
export async function createBooking(booking: Omit<Booking, 'id' | 'created_at'>): Promise<{ data: Booking | null; error: Error | null }> {
  const client = getSupabaseClient()
  if (!client) {
    return { data: null, error: new Error('Database not configured. Please contact support.') }
  }

  try {
    const { data, error } = await client
      .from('bookings')
      .insert(booking)
      .select()
      .single()

    if (error) {
      console.error('Booking create error:', error.message)
      return { data: null, error: new Error(error.message) }
    }

    return { data, error: null }
  } catch (err) {
    console.error('Unexpected booking error:', err)
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

/**
 * Create passengers for a booking
 */
export async function createPassengers(passengers: Omit<Passenger, 'id' | 'created_at'>[]): Promise<{ data: Passenger[] | null; error: Error | null }> {
  const client = getSupabaseClient()
  if (!client) {
    return { data: null, error: new Error('Database not configured. Please contact support.') }
  }

  try {
    const { data, error } = await client
      .from('passengers')
      .insert(passengers)
      .select()

    if (error) {
      console.error('Passengers create error:', error.message)
      return { data: null, error: new Error(error.message) }
    }

    return { data, error: null }
  } catch (err) {
    console.error('Unexpected passengers error:', err)
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

/**
 * Create a payment record
 */
export async function createPayment(payment: Omit<Payment, 'id' | 'created_at'>): Promise<{ data: Payment | null; error: Error | null }> {
  const client = getSupabaseClient()
  if (!client) {
    return { data: null, error: new Error('Database not configured. Please contact support.') }
  }

  try {
    const { data, error } = await client
      .from('payments')
      .insert(payment)
      .select()
      .single()

    if (error) {
      console.error('Payment create error:', error.message)
      return { data: null, error: new Error(error.message) }
    }

    return { data, error: null }
  } catch (err) {
    console.error('Unexpected payment error:', err)
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

/**
 * Complete booking flow - creates customer, booking, passengers, and payment in a transaction-like manner
 */
export async function completeBooking(params: {
  email: string
  phone: string
  bookingReference: string
  routeFrom: string
  routeTo: string
  departureDate: string
  returnDate?: string
  outboundFerry: string
  returnFerry?: string
  totalPrice: number
  passengers: Array<{
    firstName: string
    lastName: string
    birthDate: string
    passportNumber: string
    nationality: string
    isLeadPassenger: boolean
  }>
}): Promise<{ success: boolean; bookingId?: string; error?: string }> {
  if (!isSupabaseConfigured) {
    console.error('Supabase not configured - booking will not be saved to database')
    return { success: false, error: 'Database not configured. Your booking was received but could not be saved. Please contact support.' }
  }

  try {
    // 1. Get or create customer
    const { data: customer, error: customerError } = await getOrCreateCustomer(params.email, params.phone)
    if (customerError || !customer) {
      return { success: false, error: customerError?.message || 'Failed to create customer' }
    }

    // 2. Create booking
    const { data: booking, error: bookingError } = await createBooking({
      customer_id: customer.id!,
      booking_reference: params.bookingReference,
      route_from: params.routeFrom,
      route_to: params.routeTo,
      departure_date: params.departureDate,
      return_date: params.returnDate,
      outbound_ferry: params.outboundFerry,
      return_ferry: params.returnFerry,
      total_price: params.totalPrice,
      currency: 'EUR',
      status: 'confirmed',
    })
    if (bookingError || !booking) {
      return { success: false, error: bookingError?.message || 'Failed to create booking' }
    }

    // 3. Create passengers
    const passengerRecords = params.passengers.map((p) => ({
      booking_id: booking.id!,
      first_name: p.firstName,
      last_name: p.lastName,
      birth_date: p.birthDate,
      passport_number: p.passportNumber,
      nationality: p.nationality,
      is_lead_passenger: p.isLeadPassenger,
    }))
    const { error: passengersError } = await createPassengers(passengerRecords)
    if (passengersError) {
      return { success: false, error: passengersError.message }
    }

    // 4. Create payment placeholder
    const { error: paymentError } = await createPayment({
      booking_id: booking.id!,
      amount: params.totalPrice,
      currency: 'EUR',
      status: 'pending',
      payment_method: 'viva_wallet',
    })
    if (paymentError) {
      return { success: false, error: paymentError.message }
    }

    return { success: true, bookingId: booking.id }
  } catch (err) {
    console.error('Complete booking error:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error occurred' }
  }
}

/**
 * Save a contact form submission
 */
export async function saveContactRequest(request: Omit<ContactRequest, 'id' | 'created_at' | 'status'>): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient()
  if (!client) {
    console.error('Supabase not configured - contact request will not be saved')
    return { success: false, error: 'Database not configured. Your message was received but could not be saved. Please try WhatsApp instead.' }
  }

  try {
    const { error } = await client
      .from('contact_requests')
      .insert({ ...request, status: 'new' })

    if (error) {
      console.error('Contact request save error:', error.message)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('Unexpected contact request error:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/**
 * Get all available cars
 */
export async function getAvailableCars(): Promise<{ data: Car[] | null; error: Error | null; isEmpty: boolean }> {
  const client = getSupabaseClient()
  if (!client) {
    // Return gracefully - will use fallback data
    return { data: null, error: new Error('Database not configured'), isEmpty: true }
  }

  try {
    const { data, error } = await client
      .from('cars')
      .select('*')
      .eq('available', true)
      .order('price', { ascending: true })

    if (error) {
      console.error('Cars fetch error:', error.message)
      return { data: null, error: new Error(error.message), isEmpty: false }
    }

    if (!data || data.length === 0) {
      return { data: [], error: null, isEmpty: true }
    }

    return { data, error: null, isEmpty: false }
  } catch (err) {
    console.error('Unexpected cars fetch error:', err)
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error'), isEmpty: false }
  }
}

/**
 * Get a single car by ID
 */
export async function getCarById(id: string): Promise<{ data: Car | null; error: Error | null }> {
  const client = getSupabaseClient()
  if (!client) {
    return { data: null, error: new Error('Database not configured') }
  }

  try {
    const { data, error } = await client
      .from('cars')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      return { data: null, error: new Error(error.message) }
    }

    return { data, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

/**
 * Get booking by reference
 */
export async function getBookingByReference(reference: string): Promise<{ data: (Booking & { passengers: Passenger[] }) | null; error: Error | null }> {
  const client = getSupabaseClient()
  if (!client) {
    return { data: null, error: new Error('Database not configured') }
  }

  try {
    const { data, error } = await client
      .from('bookings')
      .select(`
        *,
        passengers (*)
      `)
      .eq('booking_reference', reference)
      .single()

    if (error) {
      return { data: null, error: new Error(error.message) }
    }

    return { data, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}
