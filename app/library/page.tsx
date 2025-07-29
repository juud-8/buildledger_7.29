import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PlusCircle, Search } from "lucide-react"
import { ItemTable } from "@/components/library/item-table"
import { AddEditItemDialog } from "@/components/library/add-edit-item-dialog"

export default function LibraryPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Service & Material Library</h1>
        <AddEditItemDialog>
          <Button className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4" />
            Add New Item
          </Button>
        </AddEditItemDialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search items..." className="pl-10 w-full sm:max-w-sm" />
      </div>

      <ItemTable />
    </div>
  )
}
