'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Pencil } from "lucide-react"
import { EditLoteDialog } from "@/components/forms/EditLoteDialog"

export function EditLoteButton({ lote }: { lote: any }) {
    const [open, setOpen] = useState(false)

    return (
        <>
            <Button variant="outline" onClick={() => setOpen(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar Lote
            </Button>
            <EditLoteDialog
                lote={lote}
                open={open}
                onOpenChange={setOpen}
            />
        </>
    )
}
