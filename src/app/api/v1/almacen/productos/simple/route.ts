import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const fincaId = searchParams.get("fincaId")

        const whereClause: any = {
            activo: true,
            stockActual: { gt: 0 } // Only show products with stock
        }

        if (fincaId) {
            whereClause.fincaId = fincaId
        }

        const productos = await db.producto.findMany({
            where: whereClause,
            select: {
                id: true,
                nombre: true,
                unidadMedida: true,
                stockActual: true,
                codigo: true
            },
            orderBy: { nombre: 'asc' }
        })

        return NextResponse.json(productos)
    } catch (error) {
        console.error("Error fetching productos:", error)
        return NextResponse.json({ error: "Error al cargar productos" }, { status: 500 })
    }
}
