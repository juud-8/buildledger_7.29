"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

// Define form schema with validation
const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  unit: z.string().min(1, {
    message: "Unit is required.",
  }),
  price: z.coerce.number().min(0, {
    message: "Price must be a positive number.",
  }),
  type: z.enum(["material", "service"], {
    required_error: "You need to select a type.",
  }),
})

type ItemType = {
  id: string
  name: string
  unit: string
  price: number
  type: string
}

interface AddEditItemFormProps {
  item?: ItemType
  onClose: () => void
}

export function AddEditItemForm({ item, onClose }: AddEditItemFormProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Initialize form with default values or existing item values
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: item?.name || "",
      unit: item?.unit || "",
      price: item?.price || 0,
      type: (item?.type as "material" | "service") || "material",
    },
  })

  // Handle form submission
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true)
    
    try {
      // Here you would typically save the data to your backend
      console.log(values)

      toast({
        title: "Success",
        description: item ? "Item updated successfully!" : "Item added successfully!",
      })

      // Close the dialog after submission
      onClose()
    } catch (error) {
      console.error("Failed to save item:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save item",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Common units for construction
  const commonUnits = [
    { value: "each", label: "Each" },
    { value: "hour", label: "Hour" },
    { value: "sq ft", label: "Square Foot" },
    { value: "linear ft", label: "Linear Foot" },
    { value: "yard", label: "Cubic Yard" },
    { value: "gallon", label: "Gallon" },
    { value: "bag", label: "Bag" },
    { value: "sheet", label: "Sheet" },
    { value: "roll", label: "Roll" },
  ]

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Item Type</FormLabel>
              <FormControl>
                <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="material" />
                    </FormControl>
                    <FormLabel className="font-normal cursor-pointer">Material</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="service" />
                    </FormControl>
                    <FormLabel className="font-normal cursor-pointer">Service</FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name/Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Enter item name and description" className="resize-none" {...field} />
              </FormControl>
              <FormDescription>Provide a clear name and description for this item.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="unit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Unit</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a unit" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {commonUnits.map((unit) => (
                    <SelectItem key={unit.value} value={unit.value}>
                      {unit.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>The unit of measurement for this item.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Price</FormLabel>
              <FormControl>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                  <Input type="number" step="0.01" min="0" placeholder="0.00" className="pl-8" {...field} />
                </div>
              </FormControl>
              <FormDescription>The price per unit for this item.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {item ? "Saving..." : "Adding..."}
              </>
            ) : (
              item ? "Save Changes" : "Add Item"
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}
