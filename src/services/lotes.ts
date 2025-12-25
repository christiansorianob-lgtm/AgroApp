import { PrismaClient } from "@prisma/client"

export async function createLoteInDb(data: any) {
    const prisma = new PrismaClient()
    try {
        return await prisma.lote.create({
            data
        })
    } finally {
        await prisma.$disconnect()
    }
}

export async function findLastLote(fincaId: string) {
    const prisma = new PrismaClient()
    try {
        return await prisma.lote.findFirst({
            where: { fincaId },
            orderBy: { createdAt: 'desc' }
        })
    } finally {
        await prisma.$disconnect()
    }
}

export async function getLotesByFinca(fincaId: string) {
    const prisma = new PrismaClient()
    try {
        return await prisma.lote.findMany({
            where: { fincaId },
            orderBy: { createdAt: 'desc' },
            include: { finca: true }
        })
    } finally {
        await prisma.$disconnect()
    }
}
