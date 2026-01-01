
import { db } from "./src/lib/db";

async function main() {
    const taskCode = "TAR-001"; // Or whatever ID the user implies, likely the Code.

    // 1. Find Task ID from Code
    const task = await db.tarea.findFirst({
        where: {
            OR: [
                { id: taskCode }, // In case it's the UUID
                // If there's a readable code field, check that too. Assuming 'id' for now or we list all.
            ]
        },
        include: { trazabilidad: true }
    });

    if (!task) {
        console.log(`Task ${taskCode} not found (as UUID). Listing recent tasks to find it...`);
        const recent = await db.tarea.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: { id: true, tipo: true, estado: true, trazabilidad: { select: { id: true } } }
        });
        console.log("Recent tasks:", JSON.stringify(recent, null, 2));
        return;
    }

    console.log(`Task found: ${task.id} (${task.estado})`);
    console.log(`Tracking Points count: ${task.trazabilidad.length}`);
    if (task.trazabilidad.length > 0) {
        console.log("First point:", task.trazabilidad[0]);
        console.log("Last point:", task.trazabilidad[task.trazabilidad.length - 1]);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await db.$disconnect();
    });
