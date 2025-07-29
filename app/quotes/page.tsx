"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Plus, Search, MoreHorizontal, Eye, Pencil, Trash2, Send, FileText, Loader2 } from "lucide-react"
import { useAuth } from "@/components/auth-status"
import { listQuotes } from "@/lib/db/quotes"
import { useToast } from "@/hooks/use-toast"

// Types for quotes from database
interface QuoteListItem {
  id: string
  number: string
  quote_date: string
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected'
  total: number
}

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

export default function QuotesPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const [quotes, setQuotes] = useState<QuoteListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchQuotes() {
      if (!user) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)
        const quotesData = await listQuotes(user)
        setQuotes(quotesData)
      } catch (err) {
        console.error("Failed to fetch quotes:", err)
        setError(err instanceof Error ? err.message : "Failed to fetch quotes")
        toast({
          title: "Error",
          description: "Failed to load quotes",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchQuotes()
  }, [user, toast])

  if (!user) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">Quotes</h1>
          <p className="text-muted-foreground">Please log in to view your quotes.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Quotes</h1>
        <p className="text-muted-foreground">Create and manage quotes for your clients.</p>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full max-w-sm items-center space-x-2">
          <Input
            type="search"
            placeholder="Search quotes..."
            className="h-9"
            prefix={<Search className="h-4 w-4 text-muted-foreground" />}
          />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="h-9">
              All
            </Button>
            <Button variant="outline" size="sm" className="h-9">
              <span className="h-2 w-2 rounded-full bg-blue-500 mr-1.5"></span>
              Sent
            </Button>
            <Button variant="outline" size="sm" className="h-9">
              <span className="h-2 w-2 rounded-full bg-purple-500 mr-1.5"></span>
              Viewed
            </Button>
            <Button variant="outline" size="sm" className="h-9">
              <span className="h-2 w-2 rounded-full bg-emerald-500 mr-1.5"></span>
              Accepted
            </Button>
            <Button variant="outline" size="sm" className="h-9">
              <span className="h-2 w-2 rounded-full bg-red-500 mr-1.5"></span>
              Rejected
            </Button>
          </div>
          <Button className="h-9" size="sm" onClick={() => router.push("/quotes/new")}>
            <Plus className="mr-1.5 h-4 w-4" />
            Create Quote
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading quotes...</span>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && quotes.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">No quotes found. Create your first quote to get started.</p>
            <Button onClick={() => router.push("/quotes/new")}>
              <Plus className="mr-2 h-4 w-4" />
              Create Quote
            </Button>
          </div>
        </div>
      )}

      {/* Quotes Table */}
      {!isLoading && !error && quotes.length > 0 && (
        <div className="rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Quote #</TableHead>
                <TableHead className="hidden sm:table-cell">Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotes.map((quote) => (
                <TableRow key={quote.id}>
                  <TableCell className="font-medium">{quote.number}</TableCell>
                  <TableCell className="hidden sm:table-cell">{formatDate(quote.quote_date)}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`
                        ${quote.status === "draft" ? "border-gray-500 bg-gray-500/10 text-gray-500" : ""}
                        ${quote.status === "sent" ? "border-blue-500 bg-blue-500/10 text-blue-500" : ""}
                        ${quote.status === "viewed" ? "border-purple-500 bg-purple-500/10 text-purple-500" : ""}
                        ${quote.status === "accepted" ? "border-emerald-500 bg-emerald-500/10 text-emerald-500" : ""}
                        ${quote.status === "rejected" ? "border-red-500 bg-red-500/10 text-red-500" : ""}
                      `}
                    >
                      {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatCurrency(quote.total)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/quotes/${quote.id}`)}>
                          <Eye className="mr-2 h-4 w-4" />
                          <span>View</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push(`/quotes/edit/${quote.id}`)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          <span>Edit</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <FileText className="mr-2 h-4 w-4" />
                          <span>Convert to Invoice</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Send className="mr-2 h-4 w-4" />
                          <span>Resend</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-500 focus:text-red-500">
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
      {!isLoading && !error && quotes.length > 0 && (
        <div className="sm:hidden space-y-4 mt-4">
          <h2 className="text-sm font-medium text-muted-foreground">Mobile View</h2>
          {quotes.map((quote) => (
            <div key={quote.id} className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-medium">{quote.number}</div>
                <Badge
                  variant="outline"
                  className={`
                    ${quote.status === "draft" ? "border-gray-500 bg-gray-500/10 text-gray-500" : ""}
                    ${quote.status === "sent" ? "border-blue-500 bg-blue-500/10 text-blue-500" : ""}
                    ${quote.status === "viewed" ? "border-purple-500 bg-purple-500/10 text-purple-500" : ""}
                    ${quote.status === "accepted" ? "border-emerald-500 bg-emerald-500/10 text-emerald-500" : ""}
                    ${quote.status === "rejected" ? "border-red-500 bg-red-500/10 text-red-500" : ""}
                  `}
                >
                  {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <span className="text-muted-foreground">Date: </span>
                  {formatDate(quote.quote_date)}
                </div>
                <div className="font-medium">{formatCurrency(quote.total)}</div>
              </div>
              <div className="flex items-center justify-end space-x-2">
                <Button variant="outline" size="sm" onClick={() => router.push(`/quotes/${quote.id}`)}>
                  <Eye className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => router.push(`/quotes/edit/${quote.id}`)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <FileText className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" className="text-red-500">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
