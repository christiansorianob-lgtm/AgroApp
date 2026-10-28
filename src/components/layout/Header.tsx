'use client'

import { Menu, Sprout } from 'lucide-react'

interface HeaderProps {
    onMenuClick: () => void
}

/** Barra superior. En escritorio solo muestra la fecha; en móvil da acceso al menú. */
export function Header({ onMenuClick }: HeaderProps) {
    const hoy = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

    return (
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur md:px-8">
            <div className="flex items-center gap-2 md:hidden">
                <button onClick={onMenuClick} className="-ml-2 rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Abrir menú">
                    <Menu className="h-5 w-5" />
                </button>
                <Sprout className="h-5 w-5 text-primary" />
                <span className="font-semibold">AgroApp</span>
            </div>
            <p className="hidden text-sm text-muted-foreground first-letter:uppercase md:block" suppressHydrationWarning>{hoy}</p>
        </header>
    )
}
