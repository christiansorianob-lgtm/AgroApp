// Catálogo de especies y materiales genéticos de palma de aceite.
// Idempotente: se puede ejecutar varias veces. Uso: node -r dotenv/config prisma/seed_materiales_palma.js
const { PrismaClient } = require('@prisma/client')
const db = new PrismaClient({ log: [] })

const ESPECIES = [
  { nombre: 'Elaeis guineensis', nombreComun: 'Palma africana (Tenera D×P)' },
  { nombre: 'Híbrido OxG', nombreComun: 'E. oleifera × E. guineensis (interespecífico)' },
]

// [especie, variedad/cruce, casa genética]
const MATERIALES = [
  ['Elaeis guineensis', 'Deli x La Mé', 'PalmElit'],
  ['Elaeis guineensis', 'Deli x AVROS', 'Varios proveedores'],
  ['Elaeis guineensis', 'Deli x Ghana', 'ASD Costa Rica'],
  ['Elaeis guineensis', 'Deli x Nigeria', 'ASD Costa Rica'],
  ['Elaeis guineensis', 'Deli x Yangambi', 'Varios proveedores'],
  ['Híbrido OxG', 'Coari x La Mé', 'PalmElit'],
  ['Híbrido OxG', 'Amazon', 'ASD Costa Rica'],
  ['Híbrido OxG', 'Dami Las Flores', 'Dami (Papúa Nueva Guinea)'],
]

// Nombres que antes estaban como "variedad" pero en realidad son la especie
const ERA_ESPECIE = { 'Guineensis': 'Elaeis guineensis', 'Híbrido OxG': 'Híbrido OxG' }

;(async () => {
  const palma = await db.tipoCultivo.upsert({ where: { nombre: 'Palma de Aceite' }, update: {}, create: { nombre: 'Palma de Aceite' } })

  const especies = {}
  for (const e of ESPECIES) {
    especies[e.nombre] = await db.especieCultivo.upsert({
      where: { tipoCultivoId_nombre: { tipoCultivoId: palma.id, nombre: e.nombre } },
      update: { nombreComun: e.nombreComun },
      create: { ...e, tipoCultivoId: palma.id },
    })
  }

  for (const [esp, nombre, casa] of MATERIALES) {
    await db.variedadCultivo.upsert({
      where: { tipoCultivoId_nombre: { tipoCultivoId: palma.id, nombre } },
      update: { especieId: especies[esp].id, casaGenetica: casa },
      create: { nombre, casaGenetica: casa, tipoCultivoId: palma.id, especieId: especies[esp].id },
    })
  }

  // Lotes que tenían la especie guardada como variedad
  for (const [viejo, especie] of Object.entries(ERA_ESPECIE)) {
    const r = await db.lote.updateMany({ where: { tipoCultivo: 'Palma de Aceite', variedad: viejo }, data: { especie, variedad: null } })
    if (r.count) console.log(`Lotes con variedad "${viejo}" → especie "${especie}": ${r.count}`)
    await db.variedadCultivo.deleteMany({ where: { tipoCultivoId: palma.id, nombre: viejo } })
  }

  // Lotes con un material del catálogo: completar especie y casa genética
  for (const [esp, nombre, casa] of MATERIALES) {
    await db.lote.updateMany({ where: { tipoCultivo: 'Palma de Aceite', variedad: nombre }, data: { especie: esp, casaGenetica: casa } })
  }

  const resumen = await db.especieCultivo.findMany({ where: { tipoCultivoId: palma.id }, include: { variedades: true } })
  for (const e of resumen) console.log(e.nombre, '→', e.variedades.map(v => `${v.nombre} (${v.casaGenetica})`).join(', '))
  await db.$disconnect()
})().catch(e => { console.error(e); process.exit(1) })
