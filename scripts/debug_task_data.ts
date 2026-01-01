
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Debugging Task Data ---');

    // Find tasks executed recently
    const recentTasks = await prisma.tarea.findMany({
        where: {
            estado: 'EJECUTADA',
            fechaEjecucion: {
                gte: new Date('2025-12-29') // Look for recent tasks
            }
        },
        include: {
            trazabilidad: true
        },
        orderBy: {
            fechaEjecucion: 'desc'
        }
    });

    console.log(`Found ${recentTasks.length} executed tasks since Dec 29th.`);

    recentTasks.forEach(task => {
        console.log(`\nTask ID: ${task.id}`);
        console.log(`Description: ${task.descripcion || task.tipo.nombre}`);
        console.log(`Executed: ${task.fechaEjecucion}`);
        console.log(`GPS Points: ${task.trazabilidad.length}`);

        const evidences = task.evidencias ? task.evidencias.split('\n').filter(Boolean) : [];
        console.log(`Evidences Count: ${evidences.length}`);
        evidences.forEach((e, i) => console.log(` - Photo ${i + 1}: ${e}`));
    });

    console.log('\n--- End of Debug ---');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
