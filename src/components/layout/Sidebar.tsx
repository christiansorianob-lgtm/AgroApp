'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Tractor, Sprout, ClipboardList, Package, Settings, Warehouse } from 'lucide-react'
import clsx from 'clsx'

const tools = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Fincas & Lotes', href: '/fincas', icon: Sprout },
    { name: 'Tareas', href: '/tareas', icon: ClipboardList },
    { name: 'Maquinaria', href: '/maquinaria', icon: Tractor },
    { name: 'Insumos', href: '/insumos', icon: Package },
    { name: 'Reportes', href: '/reportes', icon: Copy }, // Lucide Copy or similar for reports
]
import { FileText as Copy } from 'lucide-react'

export function Sidebar({ className }: { className?: string }) {
    const pathname = usePathname()

    return (
        <aside className={clsx("w-64 bg-card border-r border-border flex flex-col h-screen fixed left-0 top-0 bottom-0 z-40 transition-transform duration-300 md:translate-x-0", className)}>
            <div className="h-16 flex items-center px-6 border-b border-border">
                <h1 className="font-bold text-xl text-primary tracking-tight">AGROVASPALMA</h1>
            </div>

            <nav className="flex-1 overflow-y-auto py-4">
                <ul className="space-y-1 px-3">
                    {tools.map((item) => {
                        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
                        const Icon = item.icon

                        return (
                            <li key={item.name}>
                                <Link
                                    href={item.href}
                                    className={clsx(
                                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                                        isActive
                                            ? "bg-primary/10 text-primary"
                                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                    )}
                                >
                                    <Icon className="w-5 h-5" />
                                    {item.name}
                                </Link>
                            </li>
                        )
                    })}
                </ul>
            </nav>

            <div className="p-4 border-t border-border">
                <div className="flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                        U
                    </div>
                    <div className="flex-1">
                        <p className="font-medium text-foreground">Usuario</p>
                        <p className="text-xs">Admin</p>
                    </div>
                </div>
            </div>
        </aside>
    )
}
