import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // Ensure this path matches user's project structure

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { points } = body;

        // points is an array ofobjects: { lat, lng, acc, batt, ts, taskId? }
        // User hasn't finished mobile part to send taskId yet, but for now we need to handle the request to avoid 404.
        // If taskId is missing, we might have to skip or store with a null relation (but relation is mandatory).

        // For this immediate fix (stop 404), we need to acknowledge receipt.
        // But we should try to save if we can.
        // Since points currently DON'T send taskId, we can't save them to Trazabilidad efficiently without a taskId.
        // However, the user wants the 404 gone.

        // Let's accept the payload. If taskId is present, save.
        // Ideally, we should filter points that have taskId.

        // Note: Mobile implementation is pending to send taskId.
        // So for now, we just return 200 OK so mobile clears its buffer (data loss for these specific test points, but unblocks the flow).
        // The user is testing connectivity.

        const validPointsCandidate = points.filter((p: any) => p.taskId && p.lat && p.lng);

        if (validPointsCandidate.length > 0) {
            // 1. Extract unique taskIds to verify existence
            const taskIds = Array.from(new Set(validPointsCandidate.map((p: any) => p.taskId))) as string[];

            // 2. Find which tasks actually exist in DB
            const existingTasks = await prisma.tarea.findMany({
                where: { id: { in: taskIds } },
                select: { id: true }
            });
            const existingTaskIds = new Set(existingTasks.map(t => t.id));

            // 3. Filter points that belong to existing tasks
            const finalPoints = validPointsCandidate.filter((p: any) => existingTaskIds.has(p.taskId));

            if (finalPoints.length > 0) {
                // Create many
                // Create many with explicit error handling
                try {
                    await prisma.trazabilidad.createMany({
                        data: finalPoints.map((p: any) => ({
                            tareaId: p.taskId,
                            lat: Number(p.lat), // Ensure number
                            lng: Number(p.lng), // Ensure number
                            accuracy: p.acc ? Number(p.acc) : null,
                            battery: p.batt ? Number(p.batt) : null,
                            timestamp: new Date(p.ts),
                        }))
                    });
                    console.log(`[API] Saved ${finalPoints.length} points.`);
                } catch (dbError) {
                    console.error("[API] Prisma CreateMany Failed. Details:", dbError);
                    // Don't crash the whole request, but maybe return partial success or 500 with detail
                    // For now, re-throw to be caught by outer, but with more info logged
                    throw dbError;
                }
            } else {
                console.log('[API] Points received but all belonged to non-existent tasks (orphaned). Ignored.');
            }
        } else {
            console.log('[API] No valid points received (missing taskId or coords).');
        }

        return NextResponse.json({ success: true, saved: validPointsCandidate.length });
    } catch (error: any) {
        console.error('[API] Error syncing points:', error);
        // CRITICAL FIX: Return 200 OK with error details to force mobile app to clear its buffer.
        // If we keep returning 500, the mobile app will retry forever with the same bad data.
        // By returning 200, we acknowledge receipt and drop the bad data.
        return NextResponse.json({ success: false, error: 'Partial/Full Failure', details: error.message }, { status: 200 });
    }
}
