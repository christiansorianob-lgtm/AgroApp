import { PrismaClient } from "@prisma/client"

export async function createFincaInDb(data: any) {
    const prisma = new PrismaClient()
    try {
        return await prisma.finca.create({
            data
        })
    } finally {
        await prisma.$disconnect()
    }
}

export async function findLastFinca() {
    const prisma = new PrismaClient()
    try {
        return await prisma.finca.findFirst({
            orderBy: { createdAt: 'desc' }
        })
    } finally {
        await prisma.$disconnect()
    }
}

export async function getAllFincas() {
    const prisma = new PrismaClient()
    try {
        return await prisma.finca.findMany({
            orderBy: { createdAt: 'desc' }
        })
    } finally {
        await prisma.$disconnect()
    }
}

export async function getFincaById(id: string) {
    const prisma = new PrismaClient()
    try {
        return await prisma.finca.findUnique({
            where: { id }
        })
    } finally {
        await prisma.$disconnect()
    }
}
