"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Plus, Search, MoreHorizontal, Eye, Pencil, Trash2, Download } from "lucide-react"

// Mock data for invoices
const invoices = [
  {
    id: "INV-001",
    client: "Acme Corporation",
    date: "2023-04-15",
    dueDate: "2023-05-15",
    amount: 2500.0,
    status: "paid",
  },
  {
    id: "INV-002",
    client: "Globex Industries",
    date: "2023-04-20",
    dueDate: "2023-05-20",
    amount: 1750.5,
    status: "outstanding",
  },
  {
    id: "INV-003",
    client: "Stark Enterprises",
    date: "2023-04-25",
    dueDate: "2023-05-25",
    amount: 3200.75,
    status: "paid",
  },
  {
    id: "INV-004",
    client: "Wayne Industries",
    date: "2023-04-28",
    dueDate: "2023-05-28",
    amount: 4500.0,
    status: "overdue",
  },
  {
    id: "INV-005",
    client: "Oscorp",
    date: "2023-05-01",
    dueDate: "2023-06-01",
    amount: 1850.25,
    status: "outstanding",
  },
  {
    id: "INV-006",
    client: "Umbrella Corporation",
    date: "2023-05-05",
    dueDate: "2023-06-05",
    amount: 3750.0,
    status: "paid",
  },
  {
    id: "INV-007",
    client: "LexCorp",
    date: "2023-05-10",
    dueDate: "2023-06-10",
    amount: 2100.5,
    status: "overdue",
  },
]

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

export default function InvoicesPage() {
  const router = useRouter()

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
            prefix={<Search className="h-4 w-4 text-muted-foreground" />}
          />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" className="h-9">
              All
            </Button>
            <Button variant="outline" size="sm" className="h-9">
              <span className="h-2 w-2 rounded-full bg-emerald-500 mr-1.5"></span>
              Paid
            </Button>
            <Button variant="outline" size="sm" className="h-9">
              <span className="h-2 w-2 rounded-full bg-amber-500 mr-1.5"></span>
              Outstanding
            </Button>
            <Button variant="outline" size="sm" className="h-9">
              <span className="h-2 w-2 rounded-full bg-red-500 mr-1.5"></span>
              Overdue
            </Button>
          </div>
          <Button className="h-9" size="sm" onClick={() => router.push("/invoices/create")}>
            <Plus className="mr-1.5 h-4 w-4" />
            Create Invoice
          </Button>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Invoice #</TableHead>
              <TableHead className="hidden md:table-cell">Client</TableHead>
              <TableHead className="hidden sm:table-cell">Date</TableHead>
              <TableHead className="hidden lg:table-cell">Due Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell className="font-medium">{invoice.id}</TableCell>
                <TableCell className="hidden md:table-cell">{invoice.client}</TableCell>
                <TableCell className="hidden sm:table-cell">{formatDate(invoice.date)}</TableCell>
                <TableCell className="hidden lg:table-cell">{formatDate(invoice.dueDate)}</TableCell>
                <TableCell>{formatCurrency(invoice.amount)}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={`
                      ${invoice.status === "paid" ? "border-emerald-500 bg-emerald-500/10 text-emerald-500" : ""}
                      ${invoice.status === "outstanding" ? "border-amber-500 bg-amber-500/10 text-amber-500" : ""}
                      ${invoice.status === "overdue" ? "border-red-500 bg-red-500/10 text-red-500" : ""}
                    `}
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
                      <DropdownMenuItem onClick={() => router.push(`/invoice/${invoice.id}`)}>
                        <Eye className="mr-2 h-4 w-4" />
                        <span>View</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push(`/invoices/edit/${invoice.id}`)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        <span>Edit</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Download className="mr-2 h-4 w-4" />
                        <span>Download PDF</span>
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

      {/* Mobile View - Only visible on very small screens */}
      <div className="sm:hidden space-y-4 mt-4">
        <h2 className="text-sm font-medium text-muted-foreground">Mobile View</h2>
        {invoices.map((invoice) => (
          <div key={invoice.id} className="rounded-lg border border-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-medium">{invoice.id}</div>
              <Badge
                variant="outline"
                className={`
                  ${invoice.status === "paid" ? "border-emerald-500 bg-emerald-500/10 text-emerald-500" : ""}
                  ${invoice.status === "outstanding" ? "border-amber-500 bg-amber-500/10 text-amber-500" : ""}
                  ${invoice.status === "overdue" ? "border-red-500 bg-red-500/10 text-red-500" : ""}
                `}
              >
                {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">{invoice.client}</div>
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <span className="text-muted-foreground">Date: </span>
                {formatDate(invoice.date)}
              </div>
              <div className="font-medium">{formatCurrency(invoice.amount)}</div>
            </div>
            <div className="flex items-center justify-end space-x-2">
              <Button variant="outline" size="sm" onClick={() => router.push(`/invoice/${invoice.id}`)}>
                <Eye className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => router.push(`/invoices/edit/${invoice.id}`)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" className="text-red-500">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
