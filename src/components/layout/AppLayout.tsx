'use client'

import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import clsx from 'clsx'

export function AppLayout({ children }: { children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false)

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

            <Sidebar className={clsx(sidebarOpen ? "translate-x-0" : "-translate-x-full")} onClose={() => setSidebarOpen(false)} />

            <div className="flex min-h-screen flex-col md:pl-64">
                <Header onMenuClick={() => setSidebarOpen(true)} />
                <main className="flex-1 overflow-x-hidden px-4 py-6 md:px-8 md:py-8">
                    {children}
                </main>
            </div>
        </div>
    )
}
