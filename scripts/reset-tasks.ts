
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Starting task cleanup...')

    // 1. Delete Traceability (Dependent on Tarea)
    const deletedTraceability = await prisma.trazabilidad.deleteMany({})
    console.log(`Deleted ${deletedTraceability.count} traceability records.`)

    // 2. Delete Machinery Usage (Dependent on Tarea)
    const deletedMachineryUsage = await prisma.usoMaquinaria.deleteMany({})
    console.log(`Deleted ${deletedMachineryUsage.count} machinery usage records.`)

    // 3. Delete Inventory Movements related to Tasks (Dependent on Tarea)
    // We only delete consumption records linked to tasks.
    const deletedMovements = await prisma.movimientoInventario.deleteMany({
        where: {
            tareaId: { not: null }
        }
    })
    console.log(`Deleted ${deletedMovements.count} inventory movements linked to tasks.`)

    // 4. Delete Tasks
    const deletedTasks = await prisma.tarea.deleteMany({})
    console.log(`Deleted ${deletedTasks.count} tasks.`)

    console.log('Cleanup complete.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
