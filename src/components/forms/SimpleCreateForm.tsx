"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Plus, Save } from "lucide-react"

interface SimpleCreateFormProps {
    onSuccess: () => void
    action: (name: string) => Promise<{ success?: boolean; error?: string }>
    title: string
    placeholder: string
}

export function SimpleCreateForm({ onSuccess, action, title, placeholder }: SimpleCreateFormProps) {
    const [value, setValue] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!value.trim()) return

        setLoading(true)
        setError("")

        try {
            const result = await action(value)
            if (result.success) {
                setValue("")
                onSuccess()
            } else {
                setError(result.error || "Error al guardar")
            }
        } catch (err) {
            setError("Error inesperado")
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="scf-input">{title}</Label>
                <Input
                    id="scf-input"
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    disabled={loading}
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <div className="flex justify-end">
                <Button type="submit" disabled={loading || !value.trim()}>
                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Guardar
                </Button>
            </div>
        </form>
    )
}
