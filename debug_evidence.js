const { PrismaClient } = require('@prisma/client')
const db = new PrismaClient()

async function checkEvidence() {
    const tarea = await db.tarea.findFirst({
        where: { estado: 'EJECUTADA' },
        orderBy: { updatedAt: 'desc' }
    })

    console.log("Tarea encontrada:", tarea ? tarea.codigo : "Ninguna")
    console.log("Evidencias:", tarea ? tarea.evidencias : "N/A")
}

checkEvidence()
    .catch(e => console.error(e))
    .finally(async () => {
        await db.$disconnect()
    })
