import { renderToBuffer } from '@react-pdf/renderer'
import { QuotePDF, InvoicePDF } from './pdf-components'

interface PDFItem {
  description: string
  quantity: number
  unit_price: number
  line_total: number
}

interface PDFData {
  number: string
  client_name: string
  client_email: string
  date: string
  due_date?: string
  expiry_date?: string
  items: PDFItem[]
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
  notes?: string
  terms_and_conditions?: string
}

export const generateQuotePDF = async (data: PDFData) => {
  return await renderToBuffer(<QuotePDF data={data} />)
}

export const generateInvoicePDF = async (data: PDFData) => {
  return await renderToBuffer(<InvoicePDF data={data} />)
}