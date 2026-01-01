
import { NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const prisma = new PrismaClient();
    try {
        const { searchParams } = new URL(request.url);
        const taskId = searchParams.get('taskId');

        const tasks = await prisma.tarea.findMany({
            take: 20,
            orderBy: { updatedAt: 'desc' },
            include: { trackingPoints: true }
        });

        const report = tasks.map(t => ({
            id: t.id,
            tipo: t.tipo,
            estado: t.estado,
            pointsCount: t.trackingPoints.length,
            // Sample
            sample: t.trackingPoints.length > 0 ? t.trackingPoints[0] : null
        }));

        await prisma.$disconnect();

        return NextResponse.json({
            success: true,
            report
        });
    } catch (error: any) {
        await prisma.$disconnect();
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
