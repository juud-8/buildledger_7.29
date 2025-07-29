"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CheckCircle, Clock, Download, ExternalLink, CreditCard, ArrowLeft, Loader2 } from "lucide-react"
import { useAuth } from "@/components/auth-status"
import { getInvoice } from "@/lib/db/invoices"
import { getPaymentsByInvoice } from "@/lib/db/payments"
import type { Invoice } from "@/lib/db/invoices"
import type { Payment } from "@/lib/db/payments"
import { toast } from "sonner"

// Helper functions
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date)
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount)
}

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case "paid":
      return "border-emerald-500 bg-emerald-500/10 text-emerald-500"
    case "sent":
    case "viewed":
      return "border-amber-500 bg-amber-500/10 text-amber-500"
    case "overdue":
      return "border-red-500 bg-red-500/10 text-red-500"
    case "draft":
    default:
      return "border-gray-500 bg-gray-500/10 text-gray-500"
  }
}

export default function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creatingPaymentLink, setCreatingPaymentLink] = useState(false)

  // Check for payment success parameter
  const paymentSuccess = searchParams.get('payment') === 'success'

  useEffect(() => {
    if (paymentSuccess) {
      toast.success('Payment completed successfully!')
    }
  }, [paymentSuccess])

  // Fetch invoice and payments
  useEffect(() => {
    async function fetchInvoiceData() {
      if (!user) return

      try {
        setLoading(true)
        setError(null)
        
        const [invoiceData, paymentsData] = await Promise.all([
          getInvoice(params.id, user),
          getPaymentsByInvoice(params.id, user)
        ])
        
        setInvoice(invoiceData)
        setPayments(paymentsData)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch invoice")
      } finally {
        setLoading(false)
      }
    }

    fetchInvoiceData()
  }, [params.id, user])

  // Handle payment link creation
  const handleCreatePaymentLink = async () => {
    if (!user || !invoice) return

    try {
      setCreatingPaymentLink(true)
      
      const response = await fetch('/api/payments/create-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invoice_id: invoice.id }),
      })

      if (!response.ok) {
        throw new Error('Failed to create payment link')
      }

      const { payment_link } = await response.json()
      
      // Update the invoice in local state to include the payment link
      setInvoice({ ...invoice, stripe_payment_link: payment_link })
      
      // Open the payment link in a new tab
      window.open(payment_link, '_blank')
      
      toast.success('Payment link created successfully!')
    } catch (error) {
      console.error('Error creating payment link:', error)
      toast.error('Failed to create payment link')
    } finally {
      setCreatingPaymentLink(false)
    }
  }

  if (!user) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">Invoice</h1>
          <p className="text-muted-foreground">Please sign in to view this invoice.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading invoice...</span>
        </div>
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">Invoice</h1>
          <p className="text-red-500">{error || "Invoice not found"}</p>
          <Button onClick={() => router.push("/invoices")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Invoices
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Invoice Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <Button 
              variant="ghost" 
              onClick={() => router.push("/invoices")}
              className="mb-2"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Invoices
            </Button>
            <h1 className="text-3xl font-bold text-foreground">Invoice</h1>
            <p className="text-xl text-muted-foreground mt-1">{invoice.number}</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className={getStatusBadgeVariant(invoice.status)}
            >
              {invoice.status === "paid" ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-1.5" />
                  Paid
                </>
              ) : invoice.status === "sent" || invoice.status === "viewed" ? (
                <>
                  <Clock className="w-4 h-4 mr-1.5" />
                  Outstanding
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4 mr-1.5" />
                  {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                </>
              )}
            </Badge>
            <Button variant="outline" size="sm" className="h-9">
              <Download className="w-4 h-4 mr-1.5" />
              Download PDF
            </Button>
          </div>
        </div>

        {/* Invoice Content */}
        <Card className="bg-white text-black">
          <CardContent className="p-6 space-y-8">
            {/* Invoice Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Bill To:</h3>
                <p className="font-medium">{invoice.client_name}</p>
                <p className="text-gray-600">{invoice.client_email}</p>
              </div>
              <div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Invoice Date:</h3>
                    <p>{formatDate(invoice.invoice_date)}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Due Date:</h3>
                    <p>{formatDate(invoice.due_date)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Invoice Totals */}
            <div className="space-y-2 border-t border-gray-200 pt-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span>{formatCurrency(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax ({invoice.tax_rate}%):</span>
                <span>{formatCurrency(invoice.tax_amount)}</span>
              </div>
              <Separator className="my-2 bg-gray-200" />
              <div className="flex justify-between">
                <span className="font-medium text-lg">Total:</span>
                <span className="font-bold text-xl">{formatCurrency(invoice.total)}</span>
              </div>
              {invoice.balance_due < invoice.total && (
                <>
                  <Separator className="my-2 bg-gray-200" />
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount Paid:</span>
                    <span className="text-emerald-600">{formatCurrency(invoice.total - invoice.balance_due)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-lg">Balance Due:</span>
                    <span className="font-bold text-xl">{formatCurrency(invoice.balance_due)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Notes */}
            {invoice.notes && (
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Notes:</h3>
                <p className="text-gray-600">{invoice.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Section */}
        {invoice.balance_due > 0 && (
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Payment</CardTitle>
              <CardDescription>Pay the remaining balance of {formatCurrency(invoice.balance_due)}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Pay Now Button */}
              <div className="flex flex-col items-center justify-center py-4">
                <Button 
                  size="lg" 
                  className="w-full sm:w-auto px-8"
                  onClick={handleCreatePaymentLink}
                  disabled={creatingPaymentLink}
                >
                  {creatingPaymentLink ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Payment Link...
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Pay Now
                    </>
                  )}
                </Button>
                <p className="mt-4 text-sm text-muted-foreground">Secure payment powered by Stripe</p>
              </div>

              <Separator />

              {/* Alternative Payment Methods */}
              {invoice.payment_methods && (
                <div className="space-y-4">
                  <h3 className="font-medium">Alternative Payment Methods</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {invoice.payment_methods.zelle && (
                      <div className="p-3 rounded-lg border border-border bg-card">
                        <p className="font-medium">Zelle</p>
                        <p className="text-sm text-muted-foreground">payments@tradetab.com</p>
                      </div>
                    )}
                    {invoice.payment_methods.venmo && (
                      <div className="p-3 rounded-lg border border-border bg-card">
                        <p className="font-medium">Venmo</p>
                        <p className="text-sm text-muted-foreground">@trade-tab</p>
                      </div>
                    )}
                    {invoice.payment_methods.paypal && (
                      <div className="p-3 rounded-lg border border-border bg-card">
                        <p className="font-medium">PayPal</p>
                        <p className="text-sm text-muted-foreground">payments@tradetab.com</p>
                      </div>
                    )}
                    {invoice.payment_methods.cashapp && (
                      <div className="p-3 rounded-lg border border-border bg-card">
                        <p className="font-medium">CashApp</p>
                        <p className="text-sm text-muted-foreground">$tradetab</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Payment History */}
        {payments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>Recent payments for this invoice</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {payments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium">{formatCurrency(payment.amount)}</p>
                      <p className="text-sm text-muted-foreground">
                        {payment.method.charAt(0).toUpperCase() + payment.method.slice(1)} • {formatDate(payment.created_at)}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        payment.status === 'completed' 
                          ? "border-emerald-500 bg-emerald-500/10 text-emerald-500"
                          : payment.status === 'failed'
                          ? "border-red-500 bg-red-500/10 text-red-500"
                          : "border-gray-500 bg-gray-500/10 text-gray-500"
                      }
                    >
                      {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}