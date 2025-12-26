const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log('Seeding Insumo Suggestions...')

    // Data Structure
    const data = [
        {
            category: "Fertilizante",
            products: ["Urea 46%", "DAP 18-46-0", "KCL Cloruro de Potasio", "Triple 15", "Sulfato de Amonio", "Nitrato de Calcio"]
        },
        {
            category: "Herbicida",
            products: ["Glifosato 480 SL", "Paraquat", "Diuron", "Amina 2,4-D", "Metsulfuron Metil"]
        },
        {
            category: "Fungicida",
            products: ["Mancozeb", "Clorotalonil", "Propiconazol", "Azoxistrobina", "Cobre"]
        },
        {
            category: "Insecticida",
            products: ["Clorpirifos", "Cipermetrina", "Imidacloprid", "Tiametoxam"]
        },
        {
            category: "Enmienda",
            products: ["Cal Dolomita", "Cal Agrícola", "Yeso Agrícola", "Roca Fosfórica"]
        },
        {
            category: "Combustible",
            products: ["Gasolina", "ACPM (Diesel)", "Aceite 2T", "Aceite 4T"]
        },
        {
            category: "Herramienta",
            products: ["Machete", "Lima", "Pala", "Palin", "Tijera de Poda", "Bomba de Espalda"]
        }
    ]

    // 1. Ensure Categories exist and get their IDs
    for (const group of data) {
        let cat = await prisma.categoriaInsumo.findUnique({ where: { nombre: group.category } })
        if (!cat) {
            cat = await prisma.categoriaInsumo.create({ data: { nombre: group.category } })
            console.log(`Created Category: ${group.category}`)
        }

        // 2. Ensure Products exist and link to Category
        for (const prodName of group.products) {
            const existing = await prisma.nombreInsumo.findUnique({ where: { nombre: prodName } })
            if (!existing) {
                await prisma.nombreInsumo.create({
                    data: {
                        nombre: prodName,
                        categoriaId: cat.id
                    }
                })
                console.log(`  -> Created Product: ${prodName}`)
            } else {
                // Update FK if missing
                if (!existing.categoriaId) {
                    await prisma.nombreInsumo.update({
                        where: { id: existing.id },
                        data: { categoriaId: cat.id }
                    })
                    console.log(`  -> Linked Product: ${prodName}`)
                }
            }
        }
    }

    console.log('Seeding completed.')
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
