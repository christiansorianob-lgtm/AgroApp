import { db } from "@/lib/db"
import { NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const formData = await request.formData()
        const file = formData.get("file") as File

        if (!id || !file) {
            return NextResponse.json({ error: "Missing task ID or file" }, { status: 400 })
        }

        // 1. Save File to Disk
        const buffer = Buffer.from(await file.arrayBuffer())
        const fileName = `evidence_${id}_${Date.now()}_${file.name.replace(/\s/g, '_')}`
        const uploadDir = path.join(process.cwd(), "public", "uploads", "tareas")

        try {
            await mkdir(uploadDir, { recursive: true })
        } catch (e) {
            // Ignore if exists
        }

        const filePath = path.join(uploadDir, fileName)
        await writeFile(filePath, buffer)

        const fileUrl = `/uploads/tareas/${fileName}`

        // 2. Update Task in DB (Append URL)
        // We need to read first to append, as Prisma basic update doesn't support append easily for strings in all DBs
        const currentTask = await db.tarea.findUnique({
            where: { id },
            select: { evidencias: true }
        })

        if (!currentTask) {
            return NextResponse.json({ error: "Task not found" }, { status: 404 })
        }

        const currentEvidence = currentTask.evidencias || ""
        // Use newline as separator
        const newEvidence = currentEvidence ? `${currentEvidence}\n${fileUrl}` : fileUrl

        await db.tarea.update({
            where: { id },
            data: { evidencias: newEvidence }
        })

        return NextResponse.json({ success: true, url: fileUrl })

    } catch (error) {
        console.error("Upload Error:", error)
        return NextResponse.json({ error: "Error uploading file" }, { status: 500 })
    }
}
