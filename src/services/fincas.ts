import { db } from "@/lib/db"

export async function createFincaInDb(data: any) {
    return await db.finca.create({
        data
    })
}

export async function findLastFinca() {
    return await db.finca.findFirst({
        orderBy: { createdAt: 'desc' }
    })
}

export async function getAllFincas() {
    return await db.finca.findMany({
        orderBy: { createdAt: 'desc' },
        include: { lotes: true }
    })
}

export async function getFincaById(id: string) {
    return await db.finca.findUnique({
        where: { id },
        include: { lotes: true }
    })
}
