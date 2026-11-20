'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import clsx from 'clsx'
import type { Rol } from '@/lib/sesion'

export interface UsuarioActual {
    nombre: string
    rol: Rol
}

export function AppLayout({ children, sesion }: { children: React.ReactNode; sesion: UsuarioActual | null }) {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const pathname = usePathname()

    // Los informes imprimibles y el contador de plantas ocupan toda la pantalla, sin menú; sin sesión solo se ve el ingreso
    if (pathname?.endsWith('/informe') || pathname?.endsWith('/contador') || !sesion || pathname === '/login') return <>{children}</>

    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* Fondo al abrir el menú en móvil */}
            <div
                className={clsx(
                    "fixed inset-0 z-30 bg-black/50 transition-opacity md:hidden",
                    sidebarOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
                )}
                onClick={() => setSidebarOpen(false)}
            />

            <Sidebar usuario={sesion} className={clsx(sidebarOpen ? "translate-x-0" : "-translate-x-full")} onClose={() => setSidebarOpen(false)} />

            <div className="flex min-h-screen flex-col md:pl-64">
                <Header onMenuClick={() => setSidebarOpen(true)} />
                <main className="flex-1 overflow-x-hidden px-4 py-6 md:px-8 md:py-8">
                    {children}
                </main>
            </div>
        </div>
    )
}
