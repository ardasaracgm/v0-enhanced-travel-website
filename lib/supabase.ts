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

// Types for database tables - matching exact Supabase columns
export interface Customer {
  id?: string
  full_name: string
  email: string
  phone: string
  nationality: string
  created_at?: string
}

export interface Booking {
  id?: string
  booking_reference: string
  customer_id: string
  booking_type: 'ferry' | 'car_rental' | 'tour' | 'hotel'
  status: 'pending' | 'confirmed' | 'cancelled'
  total_amount: number
  currency: string
  created_at?: string
}

export interface Passenger {
  id?: string
  booking_id: string
  full_name: string
  birth_date: string
  passport_number: string
  nationality: string
  created_at?: string
}

export interface Payment {
  id?: string
  booking_id: string
  payment_provider: string
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded'
  amount: number
  currency: string
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

// Car type - matches Supabase cars table with flat columns
export interface Car {
  id: string
  brand?: string
  model: string
  category?: string
  type?: string
  price_per_day: number
  price?: number // Mapped from price_per_day for UI compatibility
  image_url?: string
  image?: string
  fuel_type?: string
  seats?: number
  transmission?: string
  features?: string[]
  specs?: {
    fuel: string
    seats: number | string
    transmission: string
    ac: boolean | string
  }
  badge?: string
  description?: string
  available: boolean
  created_at?: string
}

// Database helper functions

/**
 * Create or get existing customer by email
 */
export async function getOrCreateCustomer(
  fullName: string,
  email: string, 
  phone: string,
  nationality: string
): Promise<{ data: Customer | null; error: Error | null }> {
  const client = getSupabaseClient()
  if (!client) {
    return { data: null, error: new Error('Database not configured. Please contact support.') }
  }

  console.log('[v0] getOrCreateCustomer: Starting with', { fullName, email, phone, nationality })

  try {
    // First try to find existing customer
    const { data: existingCustomer, error: findError } = await client
      .from('customers')
      .select('*')
      .eq('email', email)
      .single()

    console.log('[v0] getOrCreateCustomer: Find result', { existingCustomer, findError: findError?.message })

    if (existingCustomer) {
      // Update if needed
      if (existingCustomer.phone !== phone || existingCustomer.full_name !== fullName) {
        const { data: updatedCustomer, error: updateError } = await client
          .from('customers')
          .update({ phone, full_name: fullName, nationality })
          .eq('id', existingCustomer.id)
          .select()
          .single()
        
        console.log('[v0] getOrCreateCustomer: Update result', { updatedCustomer, updateError: updateError?.message })
        
        if (updateError) {
          console.error('[v0] getOrCreateCustomer: Update error', updateError)
          return { data: null, error: new Error(updateError.message) }
        }
        return { data: updatedCustomer, error: null }
      }
      return { data: existingCustomer, error: null }
    }

    // Create new customer if not found (and not a "no rows" error)
    if (findError && findError.code !== 'PGRST116') {
      console.error('[v0] getOrCreateCustomer: Find error', findError)
      return { data: null, error: new Error(findError.message) }
    }

    console.log('[v0] getOrCreateCustomer: Creating new customer')
    const { data: newCustomer, error: createError } = await client
      .from('customers')
      .insert({ 
        full_name: fullName,
        email, 
        phone,
        nationality
      })
      .select()
      .single()

    console.log('[v0] getOrCreateCustomer: Create result', { newCustomer, createError: createError?.message })

    if (createError) {
      console.error('[v0] getOrCreateCustomer: Create error', createError)
      return { data: null, error: new Error(createError.message) }
    }

    return { data: newCustomer, error: null }
  } catch (err) {
    console.error('[v0] getOrCreateCustomer: Unexpected error', err)
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

  console.log('[v0] createBooking: Starting with', booking)

  try {
    const { data, error } = await client
      .from('bookings')
      .insert(booking)
      .select()
      .single()

    console.log('[v0] createBooking: Result', { data, error: error?.message })

    if (error) {
      console.error('[v0] createBooking: Error', error)
      return { data: null, error: new Error(error.message) }
    }

    return { data, error: null }
  } catch (err) {
    console.error('[v0] createBooking: Unexpected error', err)
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

  console.log('[v0] createPassengers: Starting with', passengers)

  try {
    const { data, error } = await client
      .from('passengers')
      .insert(passengers)
      .select()

    console.log('[v0] createPassengers: Result', { data, error: error?.message })

    if (error) {
      console.error('[v0] createPassengers: Error', error)
      return { data: null, error: new Error(error.message) }
    }

    return { data, error: null }
  } catch (err) {
    console.error('[v0] createPassengers: Unexpected error', err)
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

  console.log('[v0] createPayment: Starting with', payment)

  try {
    const { data, error } = await client
      .from('payments')
      .insert(payment)
      .select()
      .single()

    console.log('[v0] createPayment: Result', { data, error: error?.message })

    if (error) {
      console.error('[v0] createPayment: Error', error)
      return { data: null, error: new Error(error.message) }
    }

    return { data, error: null }
  } catch (err) {
    console.error('[v0] createPayment: Unexpected error', err)
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

/**
 * Complete booking flow - creates customer, booking, passengers, and payment in order
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
  console.log('[v0] completeBooking: Starting with params', params)

  if (!isSupabaseConfigured) {
    console.error('[v0] completeBooking: Supabase not configured')
    return { success: false, error: 'Database not configured. Your booking was received but could not be saved. Please contact support.' }
  }

  try {
    // Get lead passenger for customer record
    const leadPassenger = params.passengers.find(p => p.isLeadPassenger) || params.passengers[0]
    const fullName = `${leadPassenger.firstName} ${leadPassenger.lastName}`
    
    // 1. Create customer
    console.log('[v0] completeBooking: Step 1 - Creating customer')
    const { data: customer, error: customerError } = await getOrCreateCustomer(
      fullName,
      params.email, 
      params.phone,
      leadPassenger.nationality
    )
    if (customerError || !customer) {
      console.error('[v0] completeBooking: Customer creation failed', customerError)
      return { success: false, error: customerError?.message || 'Failed to create customer' }
    }
    console.log('[v0] completeBooking: Customer created', customer)

    // 2. Create booking
    console.log('[v0] completeBooking: Step 2 - Creating booking')
    const { data: booking, error: bookingError } = await createBooking({
      booking_reference: params.bookingReference,
      customer_id: customer.id!,
      booking_type: 'ferry',
      status: 'confirmed',
      total_amount: params.totalPrice,
      currency: 'EUR',
    })
    if (bookingError || !booking) {
      console.error('[v0] completeBooking: Booking creation failed', bookingError)
      return { success: false, error: bookingError?.message || 'Failed to create booking' }
    }
    console.log('[v0] completeBooking: Booking created', booking)

    // 3. Create passengers
    console.log('[v0] completeBooking: Step 3 - Creating passengers')
    const passengerRecords = params.passengers.map((p) => ({
      booking_id: booking.id!,
      full_name: `${p.firstName} ${p.lastName}`,
      birth_date: p.birthDate,
      passport_number: p.passportNumber,
      nationality: p.nationality,
    }))
    const { data: passengers, error: passengersError } = await createPassengers(passengerRecords)
    if (passengersError) {
      console.error('[v0] completeBooking: Passengers creation failed', passengersError)
      return { success: false, error: passengersError.message }
    }
    console.log('[v0] completeBooking: Passengers created', passengers)

    // 4. Create payment record
    console.log('[v0] completeBooking: Step 4 - Creating payment')
    const { data: payment, error: paymentError } = await createPayment({
      booking_id: booking.id!,
      payment_provider: 'viva_wallet',
      payment_status: 'pending',
      amount: params.totalPrice,
      currency: 'EUR',
    })
    if (paymentError) {
      console.error('[v0] completeBooking: Payment creation failed', paymentError)
      return { success: false, error: paymentError.message }
    }
    console.log('[v0] completeBooking: Payment created', payment)

    console.log('[v0] completeBooking: SUCCESS - All records created')
    return { success: true, bookingId: booking.id }
  } catch (err) {
    console.error('[v0] completeBooking: Unexpected error', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error occurred' }
  }
}

/**
 * Save a contact form submission
 */
export async function saveContactRequest(request: Omit<ContactRequest, 'id' | 'created_at' | 'status'>): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient()
  if (!client) {
    console.error('[v0] saveContactRequest: Supabase not configured')
    return { success: false, error: 'Database not configured. Your message was received but could not be saved. Please try WhatsApp instead.' }
  }

  console.log('[v0] saveContactRequest: Starting with', request)

  try {
    const { data, error } = await client
      .from('contact_requests')
      .insert({ ...request, status: 'new' })
      .select()

    console.log('[v0] saveContactRequest: Result', { data, error: error?.message })

    if (error) {
      console.error('[v0] saveContactRequest: Error', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('[v0] saveContactRequest: Unexpected error', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/**
 * Get all available cars - uses price_per_day column
 */
export async function getAvailableCars(): Promise<{ data: Car[] | null; error: Error | null; isEmpty: boolean }> {
  const client = getSupabaseClient()
  if (!client) {
    return { data: null, error: new Error('Database not configured'), isEmpty: true }
  }

  console.log('[v0] getAvailableCars: Fetching cars')

  try {
    const { data, error } = await client
      .from('cars')
      .select('*')
      .eq('available', true)
      .order('price_per_day', { ascending: true })

    console.log('[v0] getAvailableCars: Result', { count: data?.length, error: error?.message })

    if (error) {
      console.error('[v0] getAvailableCars: Error', error)
      return { data: null, error: new Error(error.message), isEmpty: false }
    }

    if (!data || data.length === 0) {
      return { data: [], error: null, isEmpty: true }
    }

    // Map database columns to expected format (price_per_day -> price for UI compatibility)
    const mappedData = data.map(car => ({
      ...car,
      price: car.price_per_day, // Map for backward compatibility with UI
    }))

    return { data: mappedData, error: null, isEmpty: false }
  } catch (err) {
    console.error('[v0] getAvailableCars: Unexpected error', err)
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

    // Map price_per_day to price for UI compatibility
    const mappedData = data ? { ...data, price: data.price_per_day } : null

    return { data: mappedData, error: null }
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

// Event request type
export interface EventRequest {
  id?: string
  full_name: string
  phone: string
  email: string
  event_type: string
  island_preference: string
  group_size: number
  date_range: string
  message?: string
  status?: string
  created_at?: string
}

/**
 * Save an event request submission
 */
export async function saveEventRequest(request: Omit<EventRequest, 'id' | 'created_at' | 'status'>): Promise<{ success: boolean; error?: string }> {
  console.log('[v0] saveEventRequest: Starting with data', request)
  
  const client = getSupabaseClient()
  if (!client) {
    console.error('[v0] saveEventRequest: Supabase not configured')
    return { success: false, error: 'Database not configured. Your request was received but could not be saved. Please contact us on WhatsApp.' }
  }

  try {
    const { error } = await client
      .from('event_requests')
      .insert({
        full_name: request.full_name,
        phone: request.phone,
        email: request.email,
        event_type: request.event_type,
        island_preference: request.island_preference,
        group_size: request.group_size,
        date_range: request.date_range,
        message: request.message || null,
        status: 'new',
      })

    if (error) {
      console.error('[v0] saveEventRequest: Error', error)
      return { success: false, error: error.message }
    }

    console.log('[v0] saveEventRequest: Success')
    return { success: true }
  } catch (err) {
    console.error('[v0] saveEventRequest: Unexpected error', err)
    return { success: false, error: err instanceof Error ? err.message : 'An unexpected error occurred' }
  }
}
