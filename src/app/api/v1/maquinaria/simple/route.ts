import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const fincaId = searchParams.get("fincaId")

        const whereClause: any = {
            estado: "DISPONIBLE" // Only show available machinery
        }

        if (fincaId) {
            whereClause.fincaId = fincaId
        }

        const maquinaria = await db.maquinaria.findMany({
            where: whereClause,
            select: {
                id: true,
                codigo: true,
                modelo: true,
                marca: { select: { nombre: true } },
                tipo: { select: { nombre: true } }
            },
            orderBy: { codigo: 'asc' }
        })

        // Format for dropdown: "MAQ-001 - Tractor John Deere"
        const formatted = maquinaria.map(m => ({
            id: m.id,
            label: `${m.codigo} - ${m.tipo.nombre} ${m.marca.nombre} ${m.modelo}`
        }))

        return NextResponse.json(formatted)
    } catch (error) {
        console.error("Error fetching maquinaria:", error)
        return NextResponse.json({ error: "Error al cargar maquinaria" }, { status: 500 })
    }
}
