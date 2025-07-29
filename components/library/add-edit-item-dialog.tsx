"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AddEditItemForm } from "./add-edit-item-form"

type ItemType = {
  id: string
  name: string
  unit: string
  price: number
  type: string
}

interface AddEditItemDialogProps {
  children: React.ReactNode
  item?: ItemType
}

export function AddEditItemDialog({ children, item }: AddEditItemDialogProps) {
  const [open, setOpen] = useState(false)

  const handleClose = () => {
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{item ? "Edit Library Item" : "Add Library Item"}</DialogTitle>
        </DialogHeader>
        <AddEditItemForm item={item} onClose={handleClose} />
      </DialogContent>
    </Dialog>
  )
}
