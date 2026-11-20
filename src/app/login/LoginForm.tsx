'use client'

import { useActionState } from "react"
import { Loader2, LogIn } from "lucide-react"
import { ingresar } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function LoginForm({ next }: { next: string }) {
    const [estado, accion, enviando] = useActionState(ingresar, null)

    return (
        <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
            <div className="w-full max-w-sm">
                <div className="mb-6 flex flex-col items-center text-center">
                    <h1 className="sr-only">AgroApp</h1>
                    <img src="/marca/logo-agroapp.png" alt="AgroApp" width={160} height={165} className="h-auto w-40 drop-shadow-md" />
                    <p className="mt-3 text-sm text-muted-foreground">Gestión de palmicultura</p>
                </div>

                <form action={accion} className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
                    <input type="hidden" name="next" value={next} />
                    <div className="space-y-2">
                        <Label htmlFor="celular">Celular</Label>
                        <Input id="celular" name="celular" type="tel" inputMode="numeric" autoComplete="username" placeholder="3001234567" required autoFocus />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Contraseña</Label>
                        <Input id="password" name="password" type="password" autoComplete="current-password" required />
                    </div>
                    {estado?.error && (
                        <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-2.5 text-sm text-destructive">{estado.error}</p>
                    )}
                    <Button type="submit" className="h-11 w-full" disabled={enviando}>
                        {enviando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                        Ingresar
                    </Button>
                </form>
                <p className="mt-4 text-center text-xs text-muted-foreground">¿Olvidó su contraseña? Pídale al administrador que la restablezca.</p>
            </div>
        </main>
    )
}
