
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Starting reset...');

        // Delete Child Tables first to fix FK Constraints
        try { await prisma.usoMaquinaria.deleteMany({}); console.log('Deleted UsoMaquinaria'); } catch (e) { }
        try { await prisma.consumo.deleteMany({}); console.log('Deleted Consumo'); } catch (e) { }

        // GPS Points (Correct model name is trazabilidad)
        try { await prisma.trazabilidad.deleteMany({}); console.log('Deleted Trazabilidad'); } catch (e) {
            console.warn("Failed to delete Trazabilidad:", e.message);
        }

        // Delete Tareas
        await prisma.tarea.deleteMany({});
        console.log('Deleted Tareas');

        console.log('Reset Complete.');
    } catch (e) {
        console.error('Error during reset:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
