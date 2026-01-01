
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
    console.log('Starting MAQ-002 brand update to Mitsubishi...')

    // 1. Find or Create Mitsubishi Brand
    let mitsubishi = await db.marcaMaquinaria.findFirst({
        where: { nombre: 'Mitsubishi' }
    })

    if (!mitsubishi) {
        console.log('Creating Mitsubishi brand...')
        mitsubishi = await db.marcaMaquinaria.create({
            data: { nombre: 'Mitsubishi' }
        })
    } else {
        console.log('Found Mitsubishi brand:', mitsubishi.id)
    }

    // 2. Update MAQ-002 specifically
    const maq2 = await db.maquinaria.findUnique({
        where: { codigo: 'MAQ-002' }
    })

    if (maq2) {
        console.log('Updating MAQ-002 to Mitsubishi...')
        await db.maquinaria.update({
            where: { id: maq2.id },
            data: { marcaMaquinariaId: mitsubishi.id }
        })
        console.log('MAQ-002 updated successfully.')
    } else {
        console.log('MAQ-002 not found')
    }

    console.log('Update complete.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await db.$disconnect()
    })
