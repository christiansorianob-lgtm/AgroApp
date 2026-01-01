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
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { SimpleCreateForm } from "@/components/forms/SimpleCreateForm"

interface QuickCreateDialogProps {
    triggerLabel: string
    title: string
    description: string
    placeholder: string
    action: (name: string) => Promise<{ success?: boolean; error?: string }>
    onSuccess: () => void
}

export function QuickCreateDialog({
    triggerLabel,
    title,
    description,
    placeholder,
    action,
    onSuccess
}: QuickCreateDialogProps) {
    const [open, setOpen] = useState(false)

    const handleSuccess = () => {
        setOpen(false)
        onSuccess()
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <span className="text-xs text-primary hover:underline cursor-pointer flex items-center gap-1">
                    <Plus className="w-3 h-3" /> {triggerLabel}
                </span>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>
                        {description}
                    </DialogDescription>
                </DialogHeader>
                <SimpleCreateForm
                    title={title}
                    placeholder={placeholder}
                    action={action}
                    onSuccess={handleSuccess}
                />
            </DialogContent>
        </Dialog>
    )
}
