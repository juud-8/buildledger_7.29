import React from 'react'
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'
import { format } from 'date-fns'

// Register fonts (you may need to adjust paths based on your setup)
Font.register({
  family: 'Inter',
  src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2'
})

// Create styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 40,
    fontFamily: 'Inter',
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 5,
  },
  section: {
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  label: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: 'bold',
  },
  value: {
    fontSize: 12,
    color: '#1f2937',
  },
  table: {
    marginTop: 20,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableCell: {
    fontSize: 10,
    color: '#1f2937',
  },
  description: {
    flex: 2,
  },
  quantity: {
    flex: 1,
    textAlign: 'center',
  },
  price: {
    flex: 1,
    textAlign: 'right',
  },
  total: {
    flex: 1,
    textAlign: 'right',
  },
  totals: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 20,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  totalValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  grandTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  notes: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#f9fafb',
    borderRadius: 5,
  },
  notesTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#1f2937',
  },
  notesText: {
    fontSize: 10,
    color: '#4b5563',
    lineHeight: 1.4,
  },
})

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

export const QuotePDF: React.FC<{ data: PDFData }> = ({ data }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Quote #{data.number}</Text>
        <Text style={styles.subtitle}>Generated on {format(new Date(data.date), 'PPP')}</Text>
      </View>

      {/* Client Information */}
      <View style={styles.section}>
        <View style={styles.row}>
          <Text style={styles.label}>Client:</Text>
          <Text style={styles.value}>{data.client_name}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Email:</Text>
          <Text style={styles.value}>{data.client_email}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Quote Date:</Text>
          <Text style={styles.value}>{format(new Date(data.date), 'PPP')}</Text>
        </View>
        {data.expiry_date && (
          <View style={styles.row}>
            <Text style={styles.label}>Expiry Date:</Text>
            <Text style={styles.value}>{format(new Date(data.expiry_date), 'PPP')}</Text>
          </View>
        )}
      </View>

      {/* Items Table */}
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableCell, styles.description]}>Description</Text>
          <Text style={[styles.tableCell, styles.quantity]}>Qty</Text>
          <Text style={[styles.tableCell, styles.price]}>Unit Price</Text>
          <Text style={[styles.tableCell, styles.total]}>Total</Text>
        </View>
        {data.items.map((item, index) => (
          <View key={index} style={styles.tableRow}>
            <Text style={[styles.tableCell, styles.description]}>{item.description}</Text>
            <Text style={[styles.tableCell, styles.quantity]}>{item.quantity}</Text>
            <Text style={[styles.tableCell, styles.price]}>
              ${item.unit_price.toFixed(2)}
            </Text>
            <Text style={[styles.tableCell, styles.total]}>
              ${item.line_total.toFixed(2)}
            </Text>
          </View>
        ))}
      </View>

      {/* Totals */}
      <View style={styles.totals}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Subtotal:</Text>
          <Text style={styles.totalValue}>${data.subtotal.toFixed(2)}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Tax ({data.tax_rate}%):</Text>
          <Text style={styles.totalValue}>${data.tax_amount.toFixed(2)}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={[styles.totalLabel, styles.grandTotal]}>Total:</Text>
          <Text style={[styles.totalValue, styles.grandTotal]}>${data.total.toFixed(2)}</Text>
        </View>
      </View>

      {/* Notes */}
      {data.notes && (
        <View style={styles.notes}>
          <Text style={styles.notesTitle}>Notes:</Text>
          <Text style={styles.notesText}>{data.notes}</Text>
        </View>
      )}

      {/* Terms and Conditions */}
      {data.terms_and_conditions && (
        <View style={styles.notes}>
          <Text style={styles.notesTitle}>Terms and Conditions:</Text>
          <Text style={styles.notesText}>{data.terms_and_conditions}</Text>
        </View>
      )}
    </Page>
  </Document>
)

export const InvoicePDF: React.FC<{ data: PDFData }> = ({ data }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Invoice #{data.number}</Text>
        <Text style={styles.subtitle}>Generated on {format(new Date(data.date), 'PPP')}</Text>
      </View>

      {/* Client Information */}
      <View style={styles.section}>
        <View style={styles.row}>
          <Text style={styles.label}>Client:</Text>
          <Text style={styles.value}>{data.client_name}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Email:</Text>
          <Text style={styles.value}>{data.client_email}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Invoice Date:</Text>
          <Text style={styles.value}>{format(new Date(data.date), 'PPP')}</Text>
        </View>
        {data.due_date && (
          <View style={styles.row}>
            <Text style={styles.label}>Due Date:</Text>
            <Text style={styles.value}>{format(new Date(data.due_date), 'PPP')}</Text>
          </View>
        )}
      </View>

      {/* Items Table */}
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableCell, styles.description]}>Description</Text>
          <Text style={[styles.tableCell, styles.quantity]}>Qty</Text>
          <Text style={[styles.tableCell, styles.price]}>Unit Price</Text>
          <Text style={[styles.tableCell, styles.total]}>Total</Text>
        </View>
        {data.items.map((item, index) => (
          <View key={index} style={styles.tableRow}>
            <Text style={[styles.tableCell, styles.description]}>{item.description}</Text>
            <Text style={[styles.tableCell, styles.quantity]}>{item.quantity}</Text>
            <Text style={[styles.tableCell, styles.price]}>
              ${item.unit_price.toFixed(2)}
            </Text>
            <Text style={[styles.tableCell, styles.total]}>
              ${item.line_total.toFixed(2)}
            </Text>
          </View>
        ))}
      </View>

      {/* Totals */}
      <View style={styles.totals}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Subtotal:</Text>
          <Text style={styles.totalValue}>${data.subtotal.toFixed(2)}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Tax ({data.tax_rate}%):</Text>
          <Text style={styles.totalValue}>${data.tax_amount.toFixed(2)}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={[styles.totalLabel, styles.grandTotal]}>Total:</Text>
          <Text style={[styles.totalValue, styles.grandTotal]}>${data.total.toFixed(2)}</Text>
        </View>
      </View>

      {/* Notes */}
      {data.notes && (
        <View style={styles.notes}>
          <Text style={styles.notesTitle}>Notes:</Text>
          <Text style={styles.notesText}>{data.notes}</Text>
        </View>
      )}
    </Page>
  </Document>
)