"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Plus, Search, MoreHorizontal, Eye, Pencil, Trash2, Download, Loader2, CreditCard } from "lucide-react"
import { useAuth } from "@/components/auth-status"
import { listInvoices, deleteInvoice } from "@/lib/db/invoices"
import type { Invoice } from "@/lib/db/invoices"
import { useRealtimeSubscriptions } from "@/hooks/use-realtime-subscriptions"
import { useToast } from "@/hooks/use-toast"


// Helper function to format date
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date)
}

// Helper function to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount)
}

// Helper function to get status badge variant
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

export default function InvoicesPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [creatingPaymentLink, setCreatingPaymentLink] = useState<string | null>(null)

  // Function to fetch invoices
  const fetchInvoices = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)
      const data = await listInvoices(user)
      setInvoices(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch invoices")
    } finally {
      setLoading(false)
    }
  }, [user])

  // Initial fetch
  useEffect(() => {
    fetchInvoices()
  }, [fetchInvoices])

  // Real-time subscription handlers
  const handleInvoiceInsert = useCallback((payload: any) => {
    const newInvoice = payload.new
    setInvoices(prev => [newInvoice, ...prev])
    toast({
      title: "Invoice Created",
      description: `Invoice ${newInvoice.number} has been created.`,
    })
  }, [toast])

  const handleInvoiceUpdate = useCallback((payload: any) => {
    const updatedInvoice = payload.new
    setInvoices(prev => prev.map(invoice => 
      invoice.id === updatedInvoice.id ? updatedInvoice : invoice
    ))
    toast({
      title: "Invoice Updated",
      description: `Invoice ${updatedInvoice.number} has been updated.`,
    })
  }, [toast])

  const handleInvoiceDelete = useCallback((payload: any) => {
    const deletedInvoice = payload.old
    setInvoices(prev => prev.filter(invoice => invoice.id !== deletedInvoice.id))
    toast({
      title: "Invoice Deleted",
      description: `Invoice ${deletedInvoice.number} has been deleted.`,
    })
  }, [toast])

  // Set up real-time subscriptions
  useRealtimeSubscriptions(user, {
    onInvoiceInsert: handleInvoiceInsert,
    onInvoiceUpdate: handleInvoiceUpdate,
    onInvoiceDelete: handleInvoiceDelete,
  })

  // Handle invoice deletion
  const handleDeleteInvoice = async (id: string) => {
    if (!user) return

    if (!confirm("Are you sure you want to delete this invoice?")) {
      return
    }

    try {
      await deleteInvoice(id, user)
      // The real-time subscription will handle updating the local state
    } catch (err) {
      console.error("Failed to delete invoice:", err)
      toast({
        title: "Error",
        description: "Failed to delete invoice",
        variant: "destructive",
      })
    }
  }

  // Handle payment link creation
  const handleCreatePaymentLink = async (invoiceId: string) => {
    if (!user) return

    try {
      setCreatingPaymentLink(invoiceId)
      
      const response = await fetch('/api/payments/create-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invoice_id: invoiceId }),
      })

      if (!response.ok) {
        throw new Error('Failed to create payment link')
      }

      const { payment_link } = await response.json()
      
      // Open the payment link in a new tab
      window.open(payment_link, '_blank')
      
      // Update the invoice in local state to include the payment link
      setInvoices(invoices.map(invoice => 
        invoice.id === invoiceId 
          ? { ...invoice, stripe_payment_link: payment_link }
          : invoice
      ))

      toast.success('Payment link created successfully!')
    } catch (error) {
      console.error('Error creating payment link:', error)
      toast.error('Failed to create payment link')
    } finally {
      setCreatingPaymentLink(null)
    }
  }

  // Filter invoices based on search term and status
  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.number.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter
    return matchesSearch && matchesStatus
  })

  if (!user) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">Invoices</h1>
          <p className="text-muted-foreground">Please sign in to view your invoices.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Invoices</h1>
        <p className="text-muted-foreground">Manage and track all your client invoices.</p>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full max-w-sm items-center space-x-2">
          <Input
            type="search"
            placeholder="Search invoices..."
            className="h-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex space-x-2">
            <Button 
              variant={statusFilter === "all" ? "default" : "outline"} 
              size="sm" 
              className="h-9"
              onClick={() => setStatusFilter("all")}
            >
              All
            </Button>
            <Button 
              variant={statusFilter === "paid" ? "default" : "outline"} 
              size="sm" 
              className="h-9"
              onClick={() => setStatusFilter("paid")}
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500 mr-1.5"></span>
              Paid
            </Button>
            <Button 
              variant={statusFilter === "sent" ? "default" : "outline"} 
              size="sm" 
              className="h-9"
              onClick={() => setStatusFilter("sent")}
            >
              <span className="h-2 w-2 rounded-full bg-amber-500 mr-1.5"></span>
              Sent
            </Button>
            <Button 
              variant={statusFilter === "overdue" ? "default" : "outline"} 
              size="sm" 
              className="h-9"
              onClick={() => setStatusFilter("overdue")}
            >
              <span className="h-2 w-2 rounded-full bg-red-500 mr-1.5"></span>
              Overdue
            </Button>
          </div>
          <Button className="h-9" size="sm" onClick={() => router.push("/invoices/new")}>
            <Plus className="mr-1.5 h-4 w-4" />
            Create Invoice
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading invoices...</span>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        </div>
      )}

      {/* Invoices Table */}
      {!loading && !error && (
        <>
          {filteredInvoices.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  {invoices.length === 0 ? "No invoices found. Create your first invoice to get started." : "No invoices match your search criteria."}
                </p>
                {invoices.length === 0 && (
                  <Button onClick={() => router.push("/invoices/new")}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Invoice
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Invoice #</TableHead>
                    <TableHead className="hidden md:table-cell">Client</TableHead>
                    <TableHead className="hidden sm:table-cell">Date</TableHead>
                    <TableHead className="hidden lg:table-cell">Due Date</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead className="hidden md:table-cell">Balance Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.number}</TableCell>
                      <TableCell className="hidden md:table-cell">{invoice.client_name}</TableCell>
                      <TableCell className="hidden sm:table-cell">{formatDate(invoice.invoice_date)}</TableCell>
                      <TableCell className="hidden lg:table-cell">{formatDate(invoice.due_date)}</TableCell>
                      <TableCell>{formatCurrency(invoice.total)}</TableCell>
                      <TableCell className="hidden md:table-cell">{formatCurrency(invoice.balance_due)}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={getStatusBadgeVariant(invoice.status)}
                        >
                          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/invoices/${invoice.id}`)}>
                              <Eye className="mr-2 h-4 w-4" />
                              <span>View</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/invoices/edit/${invoice.id}`)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              <span>Edit</span>
                            </DropdownMenuItem>
                            {invoice.balance_due > 0 && (
                              <DropdownMenuItem 
                                onClick={() => handleCreatePaymentLink(invoice.id)}
                                disabled={creatingPaymentLink === invoice.id}
                              >
                                <CreditCard className="mr-2 h-4 w-4" />
                                <span>
                                  {creatingPaymentLink === invoice.id ? 'Creating...' : 'Pay'}
                                </span>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem>
                              <Download className="mr-2 h-4 w-4" />
                              <span>Download PDF</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-red-500 focus:text-red-500"
                              onClick={() => handleDeleteInvoice(invoice.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>Delete</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Mobile View - Only visible on very small screens */}
          <div className="sm:hidden space-y-4 mt-4">
            <h2 className="text-sm font-medium text-muted-foreground">Mobile View</h2>
            {filteredInvoices.map((invoice) => (
              <div key={invoice.id} className="rounded-lg border border-border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{invoice.number}</div>
                  <Badge
                    variant="outline"
                    className={getStatusBadgeVariant(invoice.status)}
                  >
                    {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">{invoice.client_name}</div>
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Date: </span>
                    {formatDate(invoice.invoice_date)}
                  </div>
                  <div className="font-medium">{formatCurrency(invoice.total)}</div>
                </div>
                <div className="text-sm text-muted-foreground">
                  Balance Due: {formatCurrency(invoice.balance_due)}
                </div>
                <div className="flex items-center justify-end space-x-2">
                  <Button variant="outline" size="sm" onClick={() => router.push(`/invoices/${invoice.id}`)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => router.push(`/invoices/edit/${invoice.id}`)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {invoice.balance_due > 0 && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleCreatePaymentLink(invoice.id)}
                      disabled={creatingPaymentLink === invoice.id}
                    >
                      <CreditCard className="h-4 w-4" />
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-red-500"
                    onClick={() => handleDeleteInvoice(invoice.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
