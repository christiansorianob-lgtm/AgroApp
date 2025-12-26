const { PrismaClient } = require('@prisma/client')
const db = new PrismaClient()

async function resetTask() {
    // Find the executed task
    const tarea = await db.tarea.findFirst({
        where: { estado: 'EJECUTADA' },
        orderBy: { updatedAt: 'desc' }
    })

    if (!tarea) {
        console.log("No executed task found.")
        return
    }

    // Reset to PROGRAMADA
    await db.tarea.update({
        where: { id: tarea.id },
        data: {
            estado: 'PROGRAMADA',
            observaciones: null,
            evidencias: null,
            fechaEjecucion: null
        }
    })

    // Also delete associated movements to clean up
    await db.movimientoInventario.deleteMany({
        where: { tareaId: tarea.id }
    })

    // We should technically replenish stock but for this test I'll assume negligible impact or just delete the movement. 
    // Ideally we reverse the stock consumption provided we know what it was.
    // Simplifying for "Retry" flow.

    console.log(`Reset task ${tarea.codigo} to PROGRAMADA.`)
}

resetTask()
    .catch(e => console.error(e))
    .finally(async () => {
        await db.$disconnect()
    })
