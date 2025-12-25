import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

export async function createFincaInDb(data: any) {
    return await prisma.finca.create({
        data
    })
}

export async function findLastFinca() {
    return await prisma.finca.findFirst({
        orderBy: { createdAt: 'desc' }
    })
}

export async function getAllFincas() {
    return await prisma.finca.findMany({
        orderBy: { createdAt: 'desc' }
    })
}
