import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

export interface QuoteItem {
  description: string
  quantity: number
  unit_price: number
  line_total: number
}

export interface Quote {
  id: string
  number: string
  user_id: string
  client_name: string
  client_email: string
  quote_date: string
  expiry_date: string
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected'
  tax_rate: number
  subtotal: number
  tax_amount: number
  total: number
  notes?: string
  terms_and_conditions?: string
  created_at: string
  updated_at: string
}

export interface CreateQuoteInput {
  client_name: string
  client_email: string
  quote_date: string
  expiry_date: string
  items: Array<{
    description: string
    quantity: number
    unit_price: number
  }>
  tax_rate: number
  notes?: string
  terms_and_conditions?: string
}

export interface UpdateQuoteInput {
  client_name?: string
  client_email?: string
  quote_date?: string
  expiry_date?: string
  items?: Array<{
    description: string
    quantity: number
    unit_price: number
  }>
  tax_rate?: number
  notes?: string
  terms_and_conditions?: string
  status?: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected'
}

export async function createQuote(input: CreateQuoteInput, user: User) {
  const supabase = createSupabaseBrowserClient()
  
  // Calculate totals
  const subtotal = input.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
  const tax_amount = subtotal * (input.tax_rate / 100)
  const total = subtotal + tax_amount

  // Generate quote number using RPC function
  const { data: quoteNumber, error: numberError } = await supabase
    .rpc('next_quote_number', { p_user_id: user.id })
  
  if (numberError) {
    throw new Error(`Failed to generate quote number: ${numberError.message}`)
  }
  
  const formattedNumber = `QT-${quoteNumber}`

  // Insert quote
  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .insert({
      number: formattedNumber,
      user_id: user.id,
      client_name: input.client_name,
      client_email: input.client_email,
      quote_date: input.quote_date,
      expiry_date: input.expiry_date,
      status: 'draft',
      tax_rate: input.tax_rate,
      subtotal,
      tax_amount,
      total,
      notes: input.notes,
      terms_and_conditions: input.terms_and_conditions,
    })
    .select()
    .single()

  if (quoteError) {
    throw new Error(`Failed to create quote: ${quoteError.message}`)
  }

  // Insert quote items
  const quoteItems = input.items.map(item => ({
    quote_id: quote.id,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unit_price,
    line_total: item.quantity * item.unit_price,
  }))

  const { error: itemsError } = await supabase
    .from('quote_items')
    .insert(quoteItems)

  if (itemsError) {
    // If items insertion fails, we should delete the quote to maintain consistency
    await supabase.from('quotes').delete().eq('id', quote.id)
    throw new Error(`Failed to create quote items: ${itemsError.message}`)
  }

  return quote
}

export async function listQuotes(user: User) {
  const supabase = createSupabaseBrowserClient()
  
  const { data: quotes, error } = await supabase
    .from('quotes')
    .select('id, number, quote_date, status, total')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch quotes: ${error.message}`)
  }

  return quotes
}

export async function getQuote(id: string, user: User) {
  const supabase = createSupabaseBrowserClient()
  
  // Get quote
  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (quoteError) {
    throw new Error(`Failed to fetch quote: ${quoteError.message}`)
  }

  // Get quote items
  const { data: items, error: itemsError } = await supabase
    .from('quote_items')
    .select('*')
    .eq('quote_id', id)
    .order('created_at', { ascending: true })

  if (itemsError) {
    throw new Error(`Failed to fetch quote items: ${itemsError.message}`)
  }

  return { ...quote, items }
}

export async function updateQuote(id: string, input: UpdateQuoteInput, user: User) {
  const supabase = createSupabaseBrowserClient()
  
  // If items are being updated, recalculate totals
  let updateData: any = { ...input }
  
  if (input.items) {
    const subtotal = input.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
    const tax_rate = input.tax_rate || 0
    const tax_amount = subtotal * (tax_rate / 100)
    const total = subtotal + tax_amount
    
    updateData = {
      ...updateData,
      subtotal,
      tax_amount,
      total,
    }
  }

  // Update quote
  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (quoteError) {
    throw new Error(`Failed to update quote: ${quoteError.message}`)
  }

  // If items are being updated, replace all items
  if (input.items) {
    // Delete existing items
    const { error: deleteError } = await supabase
      .from('quote_items')
      .delete()
      .eq('quote_id', id)

    if (deleteError) {
      throw new Error(`Failed to delete existing quote items: ${deleteError.message}`)
    }

    // Insert new items
    const quoteItems = input.items.map(item => ({
      quote_id: id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      line_total: item.quantity * item.unit_price,
    }))

    const { error: itemsError } = await supabase
      .from('quote_items')
      .insert(quoteItems)

    if (itemsError) {
      throw new Error(`Failed to update quote items: ${itemsError.message}`)
    }
  }

  return quote
}

export async function deleteQuote(id: string, user: User) {
  const supabase = createSupabaseBrowserClient()
  
  // Delete quote items first (due to foreign key constraint)
  const { error: itemsError } = await supabase
    .from('quote_items')
    .delete()
    .eq('quote_id', id)

  if (itemsError) {
    throw new Error(`Failed to delete quote items: ${itemsError.message}`)
  }

  // Delete quote
  const { error: quoteError } = await supabase
    .from('quotes')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (quoteError) {
    throw new Error(`Failed to delete quote: ${quoteError.message}`)
  }

  return { success: true }
}