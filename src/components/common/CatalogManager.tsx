'use client'

import { useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Plus, Trash2, X } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"

interface CatalogItem {
    id: string
    nombre: string
}

interface CatalogManagerProps {
    triggerLabel: string
    title: string
    description: string
    placeholder: string
    items: CatalogItem[]
    onDelete: (id: string) => Promise<{ success?: boolean; error?: string }>
    onCreate: (name: string) => Promise<{ success?: boolean; error?: string }>
    onRefresh: () => void
}

export function CatalogManager({
    triggerLabel,
    title,
    description,
    placeholder,
    items,
    onDelete,
    onCreate,
    onRefresh
}: CatalogManagerProps) {
    const [open, setOpen] = useState(false)
    const [newItemName, setNewItemName] = useState("")
    const [isCreating, setIsCreating] = useState(false)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [error, setError] = useState("")

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newItemName.trim()) return

        setIsCreating(true)
        setError("")
        try {
            const res = await onCreate(newItemName)
            if (res.success) {
                setNewItemName("")
                onRefresh()
            } else {
                setError(res.error || "Error al crear")
            }
        } catch (e) {
            setError("Error inesperado")
        } finally {
            setIsCreating(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("¿Está seguro de eliminar este elemento?")) return

        setDeletingId(id)
        try {
            const res = await onDelete(id)
            if (res.success) {
                onRefresh()
            } else {
                alert(res.error || "Error al eliminar")
            }
        } catch (e) {
            alert("Error inesperado")
        } finally {
            setDeletingId(null)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 text-xs text-primary hover:text-primary/80 px-2">
                    <Plus className="w-3 h-3 mr-1" /> {triggerLabel}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>
                        {description}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
                    {/* Create Section */}
                    <form onSubmit={handleCreate} className="flex gap-2 items-end">
                        <div className="grid w-full gap-1.5">
                            <Label htmlFor="newItem" className="text-xs">Nuevo nombre</Label>
                            <Input
                                id="newItem"
                                placeholder={placeholder}
                                value={newItemName}
                                onChange={(e) => setNewItemName(e.target.value)}
                                disabled={isCreating}
                                className="h-9"
                            />
                        </div>
                        <Button type="submit" size="sm" disabled={isCreating || !newItemName.trim()} className="mb-[2px]">
                            {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        </Button>
                    </form>

                    {error && <p className="text-xs text-destructive">{error}</p>}

                    <Separator />

                    {/* List Section */}
                    <div className="flex-1 min-h-[200px]">
                        <p className="text-sm font-medium mb-2 text-muted-foreground">Existentes ({items.length})</p>
                        <ScrollArea className="h-[250px] pr-4 border rounded-md p-2">
                            {items.length === 0 ? (
                                <div className="text-center text-sm text-muted-foreground py-8">
                                    No hay elementos registrados.
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {items.map((item) => (
                                        <div key={item.id} className="flex items-center justify-between text-sm group p-2 hover:bg-muted/50 rounded-md transition-colors">
                                            <span>{item.nombre}</span>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => handleDelete(item.id)}
                                                disabled={deletingId === item.id}
                                            >
                                                {deletingId === item.id ? (
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                ) : (
                                                    <Trash2 className="w-3 h-3" />
                                                )}
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
