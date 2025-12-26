
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log("--- Checking Tables ---")
    try {
        const tables = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema='public';`
        console.log("Tables found:", tables.map(t => t.table_name))
    } catch (e) {
        console.error("Error listing tables:", e.message)
    }

    console.log("\n--- Checking 'Producto' Table ---")
    try {
        const productos = await prisma.$queryRaw`SELECT * FROM "Producto";`
        console.log("Productos count:", productos.length)
        console.log("Productos sample:", productos.slice(0, 3))
    } catch (e) {
        console.log("'Producto' table queries failed (might not exist):", e.message.split('\n')[0])
    }

    console.log("\n--- Checking 'Insumo' Table ---")
    try {
        const insumos = await prisma.$queryRaw`SELECT * FROM "Insumo";`
        console.log("Insumos count:", insumos.length)
        console.log("Insumos sample:", insumos.slice(0, 3))
    } catch (e) {
        console.log("'Insumo' table queries failed (might not exist):", e.message.split('\n')[0])
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
