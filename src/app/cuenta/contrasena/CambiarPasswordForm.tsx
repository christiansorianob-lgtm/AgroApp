'use client'

import { useActionState } from "react"
import { KeyRound, Loader2 } from "lucide-react"
import { cambiarPassword } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function CambiarPasswordForm() {
    const [estado, accion, enviando] = useActionState(cambiarPassword, null)

    return (
        <form action={accion} className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="space-y-2">
                <Label htmlFor="actual">Contraseña actual</Label>
                <Input id="actual" name="actual" type="password" autoComplete="current-password" required />
            </div>
            <div className="space-y-2">
                <Label htmlFor="nueva">Nueva contraseña</Label>
                <Input id="nueva" name="nueva" type="password" autoComplete="new-password" minLength={8} required />
                <p className="text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
            </div>
            <div className="space-y-2">
                <Label htmlFor="repetir">Repita la nueva contraseña</Label>
                <Input id="repetir" name="repetir" type="password" autoComplete="new-password" minLength={8} required />
            </div>
            {estado?.error && (
                <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-2.5 text-sm text-destructive">{estado.error}</p>
            )}
            <Button type="submit" className="h-11 w-full" disabled={enviando}>
                {enviando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                Guardar nueva contraseña
            </Button>
        </form>
    )
}
