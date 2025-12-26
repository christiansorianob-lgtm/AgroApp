
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const tipos = await prisma.tipoActividad.count()
    const responsables = await prisma.responsable.count()
    try {
        const productos = await prisma.producto.count()
        console.log({ tipos, responsables, productos })
    } catch (e) {
        console.error("Error accessing Producto table:", e.message)
    }

    if (tipos === 0) {
        console.log("Seeding default activities...")
        const defaults = [
            "Fertilización", "Poda", "Riego", "Control de Plagas",
            "Control de Malezas", "Cosecha", "Siembra", "Mantenimiento General"
        ]
        for (const nombre of defaults) {
            await prisma.tipoActividad.create({ data: { nombre } })
        }
        console.log("Seeded " + defaults.length + " activities.")
    }
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
