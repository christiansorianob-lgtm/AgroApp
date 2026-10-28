
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
})

async function main() {
    console.log('Connecting to database...')
    try {
        await prisma.$connect()
        console.log('Connected successfully.')
        const count = await prisma.tarea.count()
        console.log(`Found ${count} tasks.`)
        const users = await prisma.responsable.findMany()
        console.log('Users:', users.map(u => `${u.nombre}: ${u.celular} / ${u.password}`))
    } catch (e) {
        console.error('Connection failed:', e)
    } finally {
        await prisma.$disconnect()
    }
}

main()
