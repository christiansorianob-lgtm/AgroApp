import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, AlertTriangle, Calendar, Tractor, Package, ArrowRight } from "lucide-react"
import { db } from "@/lib/db"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export const revalidate = 0; // Ensure dynamic data fetching

export default async function Home() {
  try {
    // 1. Fetch Key Metrics
    const pendingTasks = await db.tarea.count({
      where: {
        estado: { in: ['PROGRAMADA', 'EN_PROCESO'] }
      }
    })

    const highPriorityTasks = await db.tarea.count({
      where: {
        estado: 'PROGRAMADA',
        prioridad: 'ALTA'
      }
    })

    const delayedTasks = await db.tarea.count({
      where: {
        estado: 'PROGRAMADA',
        fechaProgramada: {
          lt: new Date()
        }
      }
    })

    const maintenanceMachines = await db.maquinaria.count({
      where: {
        estado: 'EN_MANTENIMIENTO'
      }
    })

    // Specific machine name example or generic text
    const maintenanceText = maintenanceMachines > 0
      ? `${maintenanceMachines} equipos detenidos`
      : "Flota 100% operativa"

    const totalProductos = await db.producto.count({
      where: { activo: true }
    })

    // 2. Fetch Recent Activity (Last 5 created/updated tasks, EXCLUDING executed)
    const recentActivity = await db.tarea.findMany({
      where: {
        estado: {
          not: 'EJECUTADA'
        }
      },
      take: 5,
      orderBy: { updatedAt: 'desc' },
      include: { finca: true, lote: true }
    })

    const stats = [
      {
        title: "Tareas Pendientes",
        value: pendingTasks.toString(),
        description: `${highPriorityTasks} de prioridad alta`,
        icon: Calendar,
        color: "text-blue-500",
        href: "/tareas?status=PROGRAMADA,EN_PROCESO"
      },
      {
        title: "Tareas Atrasadas",
        value: delayedTasks.toString(),
        description: "Requieren atención inmediata",
        icon: AlertTriangle,
        color: "text-red-500",
        href: "/tareas?delayed=true"
      },
      {
        title: "Maquinaria en Taller",
        value: maintenanceMachines.toString(),
        description: maintenanceText,
        icon: Tractor,
        color: "text-yellow-500",
        href: "/maquinaria?status=EN_MANTENIMIENTO"
      },
      {
        title: "Catálogo de Productos",
        value: totalProductos.toString(),
        description: "Productos registrados",
        icon: Package,
        color: "text-green-500",
        href: "/almacen"
      }
    ]

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-primary">Panel de Control</h2>
          <p className="text-muted-foreground">Resumen operativo de AgroApp</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <Link key={stat.title} href={stat.href} className="block h-full">
                <Card className="hover:bg-accent/50 transition-colors h-full cursor-pointer">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {stat.title}
                    </CardTitle>
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <p className="text-xs text-muted-foreground">
                      {stat.description}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>

        <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-6">
          <h3 className="font-semibold text-lg mb-4">Actividad Reciente (Pendientes)</h3>

          {recentActivity.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No hay tareas pendientes recientes.</p>
              <Link href="/tareas/new" className="text-primary hover:underline text-sm font-medium mt-2 inline-block">
                + Crear nueva tarea
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {recentActivity.map(item => (
                <div key={item.id} className="flex items-center justify-between border-b border-border/50 pb-4 last:border-0 last:pb-0 hover:bg-muted/50 p-2 rounded transition-colors">
                  <div className="grid gap-1">
                    <p className="text-sm font-medium leading-none">
                      {item.tipo} - <span className="text-muted-foreground">{item.codigo}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.finca.nombre} {item.lote && `• Lote ${item.lote.nombre}`} • {new Date(item.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.estado === 'PROGRAMADA' ? 'bg-blue-100 text-blue-800' :
                      item.estado === 'EN_PROCESO' ? 'bg-yellow-100 text-yellow-800' :
                        item.estado === 'EJECUTADA' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                      }`}>
                      {item.estado.replace('_', ' ')}
                    </span>

                    <Link href={`/tareas/${item.id}/execute`} className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1">
                      Gestionar <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  } catch (error: any) {
    console.error("Dashboard Error:", error)
    return (
      <div className="p-8 text-center bg-background min-h-[50vh] flex flex-col items-center justify-center">
        <div className="inline-flex items-center justify-center p-4 bg-red-100 rounded-full mb-4">
          <AlertTriangle className="h-8 w-8 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-red-700 mb-2">Error cargando el panel</h2>
        <p className="text-muted-foreground mb-4 max-w-lg mx-auto">
          Ocurrió un problema al cargar los datos. Esto puede deberse a problemas de conexión o base de datos.
        </p>
        <div className="bg-slate-100 p-4 rounded text-left text-xs font-mono overflow-auto max-w-lg w-full mb-6 border border-slate-200">
          <p className="font-bold mb-1">Detalles técnicos:</p>
          {error.message || JSON.stringify(error)}
        </div>
        <div className="flex gap-4">
          <Button asChild variant="outline">
            <a href="/">Recargar</a>
          </Button>
        </div>
      </div>
    )
  }
}
