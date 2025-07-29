import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

export interface Payment {
  id: string
  user_id: string
  invoice_id: string
  amount: number
  method: 'stripe' | 'zelle' | 'venmo' | 'paypal' | 'cashapp' | 'cash'
  external_id?: string // Stripe payment intent ID or other external reference
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  created_at: string
  updated_at: string
}

export interface CreatePaymentInput {
  user_id: string
  invoice_id: string
  amount: number
  method: 'stripe' | 'zelle' | 'venmo' | 'paypal' | 'cashapp' | 'cash'
  external_id?: string
  status?: 'pending' | 'completed' | 'failed' | 'refunded'
}

export async function createPayment(input: CreatePaymentInput) {
  const supabase = createSupabaseBrowserClient()
  
  const { data: payment, error } = await supabase
    .from('payments')
    .insert({
      user_id: input.user_id,
      invoice_id: input.invoice_id,
      amount: input.amount,
      method: input.method,
      external_id: input.external_id,
      status: input.status || 'pending'
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create payment: ${error.message}`)
  }

  return payment
}

export async function getPaymentsByInvoice(invoiceId: string, user: User) {
  const supabase = createSupabaseBrowserClient()
  
  const { data: payments, error } = await supabase
    .from('payments')
    .select('*')
    .eq('invoice_id', invoiceId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch payments: ${error.message}`)
  }

  return payments || []
}

export async function getPaymentByExternalId(externalId: string) {
  const supabase = createSupabaseBrowserClient()
  
  const { data: payment, error } = await supabase
    .from('payments')
    .select('*')
    .eq('external_id', externalId)
    .single()

  if (error) {
    return null
  }

  return payment
}

export async function updatePaymentStatus(id: string, status: Payment['status']) {
  const supabase = createSupabaseBrowserClient()
  
  const { data: payment, error } = await supabase
    .from('payments')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update payment status: ${error.message}`)
  }

  return payment
}