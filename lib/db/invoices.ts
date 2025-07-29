import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

export interface InvoiceItem {
  description: string
  quantity: number
  unit_price: number
  line_total: number
}

export interface Invoice {
  id: string
  number: string
  user_id: string
  client_name: string
  client_email: string
  invoice_date: string
  due_date: string
  status: 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue'
  tax_rate: number
  subtotal: number
  tax_amount: number
  total: number
  balance_due: number
  notes?: string
  payment_methods?: {
    zelle?: boolean
    venmo?: boolean
    paypal?: boolean
    cashapp?: boolean
  }
  created_at: string
  updated_at: string
}

export interface CreateInvoiceInput {
  client_name: string
  client_email: string
  invoice_date: string
  due_date: string
  items: Array<{
    description: string
    quantity: number
    unit_price: number
  }>
  tax_rate: number
  notes?: string
  payment_methods?: {
    zelle?: boolean
    venmo?: boolean
    paypal?: boolean
    cashapp?: boolean
  }
}

export interface UpdateInvoiceInput {
  client_name?: string
  client_email?: string
  invoice_date?: string
  due_date?: string
  items?: Array<{
    description: string
    quantity: number
    unit_price: number
  }>
  tax_rate?: number
  notes?: string
  payment_methods?: {
    zelle?: boolean
    venmo?: boolean
    paypal?: boolean
    cashapp?: boolean
  }
  status?: 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue'
  balance_due?: number
}

export async function createInvoice(input: CreateInvoiceInput, user: User) {
  const supabase = createSupabaseBrowserClient()
  
  // Calculate totals
  const subtotal = input.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
  const tax_amount = subtotal * (input.tax_rate / 100)
  const total = subtotal + tax_amount
  const balance_due = total // Initially, balance due equals total

  // Generate invoice number (you might want to implement a more sophisticated numbering system)
  const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`

  // Insert invoice
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .insert({
      number: invoiceNumber,
      user_id: user.id,
      client_name: input.client_name,
      client_email: input.client_email,
      invoice_date: input.invoice_date,
      due_date: input.due_date,
      status: 'draft',
      tax_rate: input.tax_rate,
      subtotal,
      tax_amount,
      total,
      balance_due,
      notes: input.notes,
      payment_methods: input.payment_methods,
    })
    .select()
    .single()

  if (invoiceError) {
    throw new Error(`Failed to create invoice: ${invoiceError.message}`)
  }

  // Insert invoice items
  const invoiceItems = input.items.map(item => ({
    invoice_id: invoice.id,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unit_price,
    line_total: item.quantity * item.unit_price,
  }))

  const { error: itemsError } = await supabase
    .from('invoice_items')
    .insert(invoiceItems)

  if (itemsError) {
    // If items insertion fails, we should delete the invoice to maintain consistency
    await supabase.from('invoices').delete().eq('id', invoice.id)
    throw new Error(`Failed to create invoice items: ${itemsError.message}`)
  }

  return invoice
}

export async function listInvoices(user: User) {
  const supabase = createSupabaseBrowserClient()
  
  const { data: invoices, error } = await supabase
    .from('invoices')
    .select('id, number, client_name, invoice_date, due_date, status, total, balance_due')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch invoices: ${error.message}`)
  }

  return invoices
}

export async function getInvoice(id: string, user: User) {
  const supabase = createSupabaseBrowserClient()
  
  // Get invoice
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (invoiceError) {
    throw new Error(`Failed to fetch invoice: ${invoiceError.message}`)
  }

  // Get invoice items
  const { data: items, error: itemsError } = await supabase
    .from('invoice_items')
    .select('*')
    .eq('invoice_id', id)
    .order('created_at', { ascending: true })

  if (itemsError) {
    throw new Error(`Failed to fetch invoice items: ${itemsError.message}`)
  }

  return { ...invoice, items }
}

export async function updateInvoice(id: string, input: UpdateInvoiceInput, user: User) {
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

  // Update invoice
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (invoiceError) {
    throw new Error(`Failed to update invoice: ${invoiceError.message}`)
  }

  // If items are being updated, replace all items
  if (input.items) {
    // Delete existing items
    const { error: deleteError } = await supabase
      .from('invoice_items')
      .delete()
      .eq('invoice_id', id)

    if (deleteError) {
      throw new Error(`Failed to delete existing invoice items: ${deleteError.message}`)
    }

    // Insert new items
    const invoiceItems = input.items.map(item => ({
      invoice_id: id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      line_total: item.quantity * item.unit_price,
    }))

    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(invoiceItems)

    if (itemsError) {
      throw new Error(`Failed to update invoice items: ${itemsError.message}`)
    }
  }

  return invoice
}

export async function deleteInvoice(id: string, user: User) {
  const supabase = createSupabaseBrowserClient()
  
  // Delete invoice items first (due to foreign key constraint)
  const { error: itemsError } = await supabase
    .from('invoice_items')
    .delete()
    .eq('invoice_id', id)

  if (itemsError) {
    throw new Error(`Failed to delete invoice items: ${itemsError.message}`)
  }

  // Delete invoice
  const { error: invoiceError } = await supabase
    .from('invoices')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (invoiceError) {
    throw new Error(`Failed to delete invoice: ${invoiceError.message}`)
  }

  return { success: true }
}