import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const count = await prisma.tipoCultivo.count()
    console.log(`Total TipoCultivo: ${count}`)

    const all = await prisma.tipoCultivo.findMany({ include: { variedades: true } })
    console.log(JSON.stringify(all, null, 2))
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
