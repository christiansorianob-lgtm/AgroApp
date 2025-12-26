
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const categorias = [
    "Fertilizantes",
    "Herbicidas",
    "Fungicidas",
    "Insecticidas",
    "Coadyuvantes",
    "Combustibles",
    "Lubricantes",
    "Repuestos Maquinaria",
    "Herramientas",
    "EPP (Protección Personal)",
    "Materiales de Construcción",
    "Semillas",
    "Otros"
]

const unidades = [
    "Unidad",
    "Kilogramo (kg)",
    "Gramo (g)",
    "Litro (l)",
    "Mililitro (ml)",
    "Galón (gal)",
    "Bulto 50kg",
    "Bulto 40kg",
    "Saco",
    "Caneca",
    "Metro (m)",
    "Metro Cuadrado (m2)",
    "Metro Cúbico (m3)"
]

const productosPorCategoria = {
    "Fertilizantes": ["Urea", "DAP", "KCL", "Producción", "Borozinco", "Rafos Vicor", "Triple 15", "Agrimins"],
    "Herbicidas": ["Glifosato", "Paraquat", "Diuron", "Metsulfuron", "Atrazina", "Hoyocol", "Tocon"],
    "Fungicidas": ["Mancozeb", "Carbendazim", "Propiconazol", "Azoxistrobina"],
    "Insecticidas": ["Clorpirifos", "Cipermetrina", "Imidacloprid", "Lorsban"],
    "Combustibles": ["Gasolina Corriente", "ACPM (Diesel)", "Mezcla 2T", "Aceite 2T"],
    "Lubricantes": ["Aceite Motor 15W40", "Aceite Hidráulico 68", "Valvulina 85W140", "Grasa Multipropósito", "Líquido de Frenos"],
    "Repuestos Maquinaria": ["Bujía", "Filtro de Aire", "Filtro de Aceite", "Filtro de Combustible", "Correa", "Manguera"],
    "Herramientas": ["Machete", "Lima", "Pala", "Palin", "Azadón", "Martillo", "Llave Inglesa"],
    "EPP (Protección Personal)": ["Guantes de Carnaza", "Guantes de Nitrilo", "Gafas de Seguridad", "Botas de Caucho", "Tapabocas", "Delantal Impermeable"],
    "Semillas": ["Maíz", "Pasto Brachiaria", "Arroz", "Frijol"],
    "Materiales de Construcción": ["Cemento", "Arena", "Gravilla", "Ladrillo", "Varilla", "Alambre de Púas", "Grapa"]
}

async function main() {
    console.log("--- Seeding Almacén Catalogs ---")

    // 1. Seeding Categories and Product Names
    console.log(`\nSeeding Categories and Products...`)
    for (const catName of categorias) {
        try {
            // Create or get Category
            const categoria = await prisma.categoriaProducto.upsert({
                where: { nombre: catName },
                update: {},
                create: { nombre: catName }
            })
            console.log(`  [CAT] ${catName}`)

            // Seed Products for this Category
            const products = productosPorCategoria[catName] || []
            if (products.length > 0) {
                for (const prodName of products) {
                    await prisma.nombreProducto.upsert({
                        where: { nombre: prodName },
                        update: { categoriaId: categoria.id }, // Ensure link is updated
                        create: {
                            nombre: prodName,
                            categoriaId: categoria.id
                        }
                    })
                }
                console.log(`    -> Seeded ${products.length} products`)
            }

        } catch (e) {
            console.log(`  - Error seeding category ${catName}: ${e.message.split('\n')[0]}`)
        }
    }

    // 2. Seeding Units
    console.log(`\nSeeding Units...`)
    for (const nombre of unidades) {
        try {
            await prisma.unidadMedida.upsert({
                where: { nombre },
                update: {},
                create: { nombre }
            })
        } catch (e) {
            // Ignore duplicates silently
        }
    }
    console.log(`  -> Checked ${unidades.length} units`)

    console.log("\n--- Seeding Completed ---")
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
