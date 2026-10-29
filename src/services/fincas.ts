import { db } from "@/lib/db"

export async function getAllFincas() {
    return await db.finca.findMany({
        orderBy: { createdAt: 'desc' },
        include: { lotes: { orderBy: { codigo: 'asc' } } }
    })
}

export async function getFincaById(id: string) {
    return await db.finca.findUnique({
        where: { id },
        include: {
            lotes: { orderBy: { codigo: 'asc' }, include: { materialesVivero: { select: { cantidad: true } } } },
            levantamientos: { where: { loteId: null }, orderBy: { createdAt: 'desc' }, take: 10 },
        }
    })
}
