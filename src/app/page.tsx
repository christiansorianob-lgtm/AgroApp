import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, AlertTriangle, Calendar, Tractor } from "lucide-react"

// Mock Data for UI demonstration
const stats = [
  {
    title: "Tareas Pendientes",
    value: "12",
    description: "4 de prioridad alta",
    icon: Calendar,
    color: "text-blue-500"
  },
  {
    title: "Tareas Atrasadas",
    value: "2",
    description: "Requieren atención inmediata",
    icon: AlertTriangle,
    color: "text-red-500"
  },
  {
    title: "Maquinaria en Mantenimiento",
    value: "1",
    description: "Tractor John Deere",
    icon: Tractor,
    color: "text-yellow-500"
  },
  {
    title: "Alertas de Stock",
    value: "3",
    description: "Insumos bajo mínimo",
    icon: Activity, // Using Activity generic
    color: "text-orange-500"
  }
]

export default function Home() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-primary">Panel de Control</h2>
        <p className="text-muted-foreground">Resumen operativo de Agrovaspalma</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.title} className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
              <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="tracking-tight text-sm font-medium">{stat.title}</h3>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <div className="p-6 pt-0">
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Todo: Add recent activity table or charts (textual) */}
      <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-6">
        <h3 className="font-semibold text-lg mb-4">Actividad Reciente</h3>
        <p className="text-muted-foreground text-sm">No hay actividad reciente registrada en el sistema.</p>
      </div>
    </div>
  )
}
