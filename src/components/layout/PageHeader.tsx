import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

export interface Breadcrumb { label: string; href?: string }

/** Encabezado estándar de página: migas de pan, título, descripción y acciones. */
export function PageHeader({ title, description, breadcrumbs, actions, badge, className }: {
    title: React.ReactNode
    description?: React.ReactNode
    breadcrumbs?: Breadcrumb[]
    actions?: React.ReactNode
    badge?: React.ReactNode
    className?: string
}) {
    return (
        <div className={cn("space-y-3", className)}>
            {breadcrumbs && breadcrumbs.length > 0 && (
                <nav aria-label="Ruta" className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                    {breadcrumbs.map((b, i) => (
                        <span key={i} className="flex items-center gap-1">
                            {i > 0 && <ChevronRight className="h-3.5 w-3.5 opacity-60" />}
                            {b.href ? <Link href={b.href} className="hover:text-foreground">{b.label}</Link> : <span className="text-foreground">{b.label}</span>}
                        </span>
                    ))}
                </nav>
            )}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                    <h1 className="flex flex-wrap items-center gap-3 text-2xl font-semibold tracking-tight text-foreground md:text-[1.75rem]">
                        {title}
                        {badge}
                    </h1>
                    {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
                </div>
                {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
            </div>
        </div>
    )
}

/** Bloque de formulario con título y descripción a la izquierda (en escritorio). */
export function FormSection({ title, description, children, className }: {
    title: string
    description?: string
    children: React.ReactNode
    className?: string
}) {
    return (
        <section className={cn("grid gap-x-8 gap-y-4 border-b border-border py-8 first:pt-2 last:border-b-0 lg:grid-cols-[260px_1fr]", className)}>
            <div>
                <h2 className="text-sm font-semibold text-foreground">{title}</h2>
                {description && <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>}
            </div>
            <div className="min-w-0 space-y-4">{children}</div>
        </section>
    )
}

/** Valor con etiqueta para fichas de detalle. */
export function StatItem({ label, value, hint, icon: Icon }: { label: string; value: React.ReactNode; hint?: React.ReactNode; icon?: any }) {
    return (
        <div className="flex items-start gap-3">
            {Icon && (
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                </div>
            )}
            <div className="min-w-0">
                <div className="text-xs text-muted-foreground">{label}</div>
                <div className="break-words text-sm font-medium text-foreground">{value}</div>
                {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
            </div>
        </div>
    )
}
