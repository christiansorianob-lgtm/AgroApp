
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
    console.log('Starting MAQ-002 model update...')

    // Update MAQ-002 specifically
    const maq2 = await db.maquinaria.findUnique({
        where: { codigo: 'MAQ-002' }
    })

    if (maq2) {
        console.log(`Found MAQ-002. Current model: ${maq2.modelo}`)
        console.log('Updating model to TB43...')

        await db.maquinaria.update({
            where: { id: maq2.id },
            data: { modelo: 'TB43' }
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
