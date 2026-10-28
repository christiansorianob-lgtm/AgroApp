'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Tractor, Map, Grid3x3, ClipboardList, Package, Settings, BarChart3, Sprout, X } from 'lucide-react'
import clsx from 'clsx'

const grupos = [
    {
        titulo: 'Operación',
        items: [
            { name: 'Panel general', href: '/', icon: LayoutDashboard },
            { name: 'Fincas', href: '/fincas', icon: Map },
            { name: 'Lotes', href: '/lotes', icon: Grid3x3 },
            { name: 'Tareas', href: '/tareas', icon: ClipboardList },
        ],
    },
    {
        titulo: 'Recursos',
        items: [
            { name: 'Maquinaria', href: '/maquinaria', icon: Tractor },
            { name: 'Almacén', href: '/almacen', icon: Package },
        ],
    },
    {
        titulo: 'Gestión',
        items: [
            { name: 'Reportes', href: '/reportes', icon: BarChart3 },
            { name: 'Configuración', href: '/configuracion', icon: Settings },
        ],
    },
]

export function Sidebar({ className, onClose }: { className?: string; onClose?: () => void }) {
    const pathname = usePathname()

    return (
        <aside className={clsx("fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform duration-300 md:translate-x-0", className)}>
            <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                    <Sprout className="h-5 w-5" />
                </div>
                <div className="flex-1 leading-tight">
                    <div className="text-[15px] font-semibold tracking-tight">AgroApp</div>
                    <div className="text-[11px] text-sidebar-muted">Gestión de palmicultura</div>
                </div>
                {onClose && (
                    <button onClick={onClose} className="rounded-md p-1.5 text-sidebar-muted hover:bg-sidebar-accent md:hidden" aria-label="Cerrar menú">
                        <X className="h-5 w-5" />
                    </button>
                )}
            </div>

            <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
                {grupos.map(g => (
                    <div key={g.titulo}>
                        <div className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-sidebar-muted/80">{g.titulo}</div>
                        <ul className="space-y-0.5">
                            {g.items.map(item => {
                                const active = pathname === item.href || (item.href !== '/' && (pathname?.startsWith(item.href) ?? false))
                                const Icon = item.icon
                                return (
                                    <li key={item.href}>
                                        <Link
                                            href={item.href}
                                            onClick={onClose}
                                            className={clsx(
                                                "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                                                active
                                                    ? "bg-sidebar-accent text-white"
                                                    : "text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                                            )}
                                        >
                                            {active && <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-r bg-emerald-400" />}
                                            <Icon className={clsx("h-[18px] w-[18px]", active ? "text-emerald-400" : "")} />
                                            {item.name}
                                        </Link>
                                    </li>
                                )
                            })}
                        </ul>
                    </div>
                ))}
            </nav>

            <div className="border-t border-sidebar-border p-3">
                <div className="flex items-center gap-3 rounded-lg px-2 py-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-accent text-sm font-semibold text-emerald-300">A</div>
                    <div className="min-w-0 flex-1 leading-tight">
                        <p className="truncate text-sm font-medium">Administrador</p>
                        <p className="text-xs text-sidebar-muted">Sesión local</p>
                    </div>
                </div>
            </div>
        </aside>
    )
}
