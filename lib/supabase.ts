import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Debug: Log Supabase configuration on initialization
console.log('[v0] Supabase URL configured:', supabaseUrl ? 'Yes' : 'No - MISSING!')
console.log('[v0] Supabase Anon Key configured:', supabaseAnonKey ? 'Yes' : 'No - MISSING!')

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[v0] CRITICAL: Supabase environment variables are not configured!')
  console.error('[v0] NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl || 'undefined')
  console.error('[v0] NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '[REDACTED]' : 'undefined')
}

export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || ''
)

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
  console.log('[v0] getOrCreateCustomer called with:', { email, phone })
  
  // First try to find existing customer
  const { data: existingCustomer, error: findError } = await supabase
    .from('customers')
    .select('*')
    .eq('email', email)
    .single()

  console.log('[v0] Find customer result:', { existingCustomer, findError: findError?.message })

  if (existingCustomer) {
    // Update phone if different
    if (existingCustomer.phone !== phone) {
      console.log('[v0] Updating customer phone number')
      const { data: updatedCustomer, error: updateError } = await supabase
        .from('customers')
        .update({ phone })
        .eq('id', existingCustomer.id)
        .select()
        .single()
      
      if (updateError) {
        console.error('[v0] Customer update error:', updateError.message)
        return { data: null, error: new Error(updateError.message) }
      }
      console.log('[v0] Customer updated successfully:', updatedCustomer)
      return { data: updatedCustomer, error: null }
    }
    console.log('[v0] Returning existing customer:', existingCustomer)
    return { data: existingCustomer, error: null }
  }

  // Create new customer if not found (and not a "no rows" error)
  if (findError && findError.code !== 'PGRST116') {
    console.error('[v0] Unexpected find error:', findError)
    return { data: null, error: new Error(findError.message) }
  }

  console.log('[v0] Creating new customer...')
  const { data: newCustomer, error: createError } = await supabase
    .from('customers')
    .insert({ email, phone })
    .select()
    .single()

  if (createError) {
    console.error('[v0] Customer create error:', createError.message, createError)
    return { data: null, error: new Error(createError.message) }
  }

  console.log('[v0] New customer created successfully:', newCustomer)
  return { data: newCustomer, error: null }
}

/**
 * Create a new booking
 */
export async function createBooking(booking: Omit<Booking, 'id' | 'created_at'>): Promise<{ data: Booking | null; error: Error | null }> {
  console.log('[v0] createBooking called with:', booking)
  
  const { data, error } = await supabase
    .from('bookings')
    .insert(booking)
    .select()
    .single()

  if (error) {
    console.error('[v0] Booking create error:', error.message, error)
    return { data: null, error: new Error(error.message) }
  }

  console.log('[v0] Booking created successfully:', data)
  return { data, error: null }
}

/**
 * Create passengers for a booking
 */
export async function createPassengers(passengers: Omit<Passenger, 'id' | 'created_at'>[]): Promise<{ data: Passenger[] | null; error: Error | null }> {
  console.log('[v0] createPassengers called with:', passengers.length, 'passengers')
  
  const { data, error } = await supabase
    .from('passengers')
    .insert(passengers)
    .select()

  if (error) {
    console.error('[v0] Passengers create error:', error.message, error)
    return { data: null, error: new Error(error.message) }
  }

  console.log('[v0] Passengers created successfully:', data)
  return { data, error: null }
}

/**
 * Create a payment record
 */
export async function createPayment(payment: Omit<Payment, 'id' | 'created_at'>): Promise<{ data: Payment | null; error: Error | null }> {
  console.log('[v0] createPayment called with:', payment)
  
  const { data, error } = await supabase
    .from('payments')
    .insert(payment)
    .select()
    .single()

  if (error) {
    console.error('[v0] Payment create error:', error.message, error)
    return { data: null, error: new Error(error.message) }
  }

  console.log('[v0] Payment created successfully:', data)
  return { data, error: null }
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
  console.log('[v0] completeBooking called with:', {
    email: params.email,
    bookingReference: params.bookingReference,
    routeFrom: params.routeFrom,
    routeTo: params.routeTo,
    totalPrice: params.totalPrice,
    passengerCount: params.passengers.length
  })
  
  try {
    // 1. Get or create customer
    console.log('[v0] Step 1: Creating/getting customer...')
    const { data: customer, error: customerError } = await getOrCreateCustomer(params.email, params.phone)
    if (customerError || !customer) {
      console.error('[v0] Customer step failed:', customerError?.message)
      return { success: false, error: customerError?.message || 'Failed to create customer' }
    }
    console.log('[v0] Customer step succeeded, ID:', customer.id)

    // 2. Create booking
    console.log('[v0] Step 2: Creating booking...')
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
      console.error('[v0] Booking step failed:', bookingError?.message)
      return { success: false, error: bookingError?.message || 'Failed to create booking' }
    }
    console.log('[v0] Booking step succeeded, ID:', booking.id)

    // 3. Create passengers
    console.log('[v0] Step 3: Creating passengers...')
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
      console.error('[v0] Passengers step failed:', passengersError.message)
      return { success: false, error: passengersError.message }
    }
    console.log('[v0] Passengers step succeeded')

    // 4. Create payment placeholder
    console.log('[v0] Step 4: Creating payment...')
    const { error: paymentError } = await createPayment({
      booking_id: booking.id!,
      amount: params.totalPrice,
      currency: 'EUR',
      status: 'pending',
      payment_method: 'viva_wallet',
    })
    if (paymentError) {
      console.error('[v0] Payment step failed:', paymentError.message)
      return { success: false, error: paymentError.message }
    }
    console.log('[v0] Payment step succeeded')

    console.log('[v0] completeBooking FULLY SUCCEEDED! Booking ID:', booking.id)
    return { success: true, bookingId: booking.id }
  } catch (err) {
    console.error('[v0] completeBooking unexpected error:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error occurred' }
  }
}

/**
 * Save a contact form submission
 */
export async function saveContactRequest(request: Omit<ContactRequest, 'id' | 'created_at' | 'status'>): Promise<{ success: boolean; error?: string }> {
  console.log('[v0] saveContactRequest called with:', request)
  
  const { error } = await supabase
    .from('contact_requests')
    .insert({ ...request, status: 'new' })

  if (error) {
    console.error('[v0] Contact request save error:', error.message, error)
    return { success: false, error: error.message }
  }

  console.log('[v0] Contact request saved successfully')
  return { success: true }
}

/**
 * Get all available cars
 */
export async function getAvailableCars(): Promise<{ data: Car[] | null; error: Error | null; isEmpty: boolean }> {
  console.log('[v0] getAvailableCars called')
  console.log('[v0] Supabase URL check:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'configured' : 'MISSING')
  
  const { data, error } = await supabase
    .from('cars')
    .select('*')
    .eq('available', true)
    .order('price', { ascending: true })

  console.log('[v0] getAvailableCars result:', { 
    dataCount: data?.length ?? 0, 
    error: error?.message,
    errorCode: error?.code,
    errorDetails: error?.details
  })

  if (error) {
    console.error('[v0] Cars fetch error:', error.message, error)
    return { data: null, error: new Error(error.message), isEmpty: false }
  }

  if (!data || data.length === 0) {
    console.log('[v0] Cars table is empty or no available cars found')
    return { data: [], error: null, isEmpty: true }
  }

  console.log('[v0] Cars fetched successfully:', data.length, 'cars')
  return { data, error: null, isEmpty: false }
}

/**
 * Get a single car by ID
 */
export async function getCarById(id: string): Promise<{ data: Car | null; error: Error | null }> {
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
 * Get booking by reference
 */
export async function getBookingByReference(reference: string): Promise<{ data: (Booking & { passengers: Passenger[] }) | null; error: Error | null }> {
  const { data, error } = await supabase
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
}
