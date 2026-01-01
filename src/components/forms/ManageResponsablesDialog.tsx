"use client"

import { useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Settings } from "lucide-react"
import { ResponsablesManager } from "@/components/forms/ResponsablesManager"

interface Responsable {
    id: string
    nombre: string
    email?: string | null
    celular?: string | null
    cargo?: string | null
    cargoId?: string | null
    cargoRef?: { id: string, nombre: string } | null
}

interface ManageResponsablesDialogProps {
    responsables: Responsable[]
    cargos: { id: string, nombre: string }[]
    createAction: (nombre: string, email?: string, cargoId?: string, celular?: string) => Promise<{ success?: boolean; error?: string }>
    updateAction: (id: string, nombre: string, email?: string, cargoId?: string, celular?: string) => Promise<{ success?: boolean; error?: string }>
    deleteAction: (id: string) => Promise<{ success?: boolean; error?: string }>
    createCargoAction: (nombre: string) => Promise<{ success?: boolean; error?: string }>
    deleteCargoAction: (id: string) => Promise<{ success?: boolean; error?: string }>
    onRefreshCargos: () => void
    onSuccess: () => void
}

export function ManageResponsablesDialog(props: ManageResponsablesDialogProps) {
    const [open, setOpen] = useState(false)

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <span className="text-xs text-primary hover:underline cursor-pointer flex items-center gap-1">
                    <Settings className="w-3 h-3" /> Administrar
                </span>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Administrar Responsables</DialogTitle>
                    <DialogDescription>
                        Gestione la lista de personas responsables.
                    </DialogDescription>
                </DialogHeader>
                <ResponsablesManager {...props} onSuccess={() => { props.onSuccess(); /* Optional: close dialog on success if desired, but maybe user wants to manage multiple */ }} />
            </DialogContent>
        </Dialog>
    )
}
