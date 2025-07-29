"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Edit, Trash2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { AddEditItemDialog } from "./add-edit-item-dialog"

// Mock data for the table
const initialItems = [
  {
    id: "1",
    name: "Drywall Installation",
    unit: "sq ft",
    price: 2.75,
    type: "service",
  },
  {
    id: "2",
    name: "Lumber - 2x4 Stud",
    unit: "each",
    price: 5.99,
    type: "material",
  },
  {
    id: "3",
    name: "Electrical Wiring",
    unit: "hour",
    price: 85.0,
    type: "service",
  },
  {
    id: "4",
    name: "Concrete Mix",
    unit: "bag",
    price: 12.5,
    type: "material",
  },
  {
    id: "5",
    name: "Plumbing Repair",
    unit: "hour",
    price: 95.0,
    type: "service",
  },
]

export function ItemTable() {
  const [items, setItems] = useState(initialItems)

  const handleDelete = (id: string) => {
    setItems(items.filter((item) => item.id !== id))
  }

  // Format price as currency
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price)
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40%]">Name/Description</TableHead>
            <TableHead className="w-[20%]">Unit</TableHead>
            <TableHead className="w-[20%]">Price</TableHead>
            <TableHead className="w-[20%] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center">
                No items found.
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">
                  <div>
                    {item.name}
                    <span className="ml-2 inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-slate-800 text-slate-300">
                      {item.type}
                    </span>
                  </div>
                </TableCell>
                <TableCell>{item.unit}</TableCell>
                <TableCell>{formatPrice(item.price)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <AddEditItemDialog item={item}>
                      <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                    </AddEditItemDialog>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4 text-destructive" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Item</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{item.name}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(item.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
