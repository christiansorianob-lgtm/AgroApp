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
  // DxP de ASD Costa Rica; ASD-Bakrie la lista entre sus variedades más vendidas
  ['Elaeis guineensis', 'Themba', 'ASD Costa Rica'],
  // Semilla guineensis de genética Dami (Papúa Nueva Guinea) producida por Oleoflores en la Hacienda Las Flores (Codazzi, Cesar)
  ['Elaeis guineensis', 'Dami Las Flores', 'Oleoflores'],
  ['Híbrido OxG', 'Coari x La Mé', 'PalmElit'],
  ['Híbrido OxG', 'Amazon', 'ASD Costa Rica'],
]

// Opciones genéticas de PalmElit (fuente: palmelit.com/es/nuestros-productos, consultado oct. 2026)
const OPCIONES = [
  ['#S', 'Short – crecimiento lento en altura', 'Ciclo de vida', 'Limita el crecimiento vertical a unos 46–50 cm/año sin déficit hídrico; alarga la vida útil cosechable de la plantación.'],
  ['#C', 'Compact – palmas de menor volumen', 'Ciclo de vida', 'Reduce el volumen de la palma para sembrar a mayor densidad.'],
  ['#PC', 'Resistencia a Pudrición del Cogollo', 'Sanidad', 'Resistencia intermedia (GxG) o alta (OxG) frente al complejo PC.'],
  ['#F', 'Alta resistencia a fusariosis', 'Sanidad', 'Resistencia verificada en pruebas de detección temprana en previvero.'],
  ['#G', 'Resistencia intermedia a Ganoderma', 'Sanidad', 'Resistencia comprobada en Indonesia; en América aún por demostrar según el proveedor.'],
  ['#HO', 'High Oleic – más oleína', 'Calidad del aceite', 'Incremento en el contenido de oleína del aceite.'],
  ['#L', 'Low Lipase – menor acidez', 'Calidad del aceite', 'Reducción de la acidez del aceite.'],
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

  for (const [codigo, nombre, grupo, descripcion] of OPCIONES) {
    await db.opcionGenetica.upsert({
      where: { casaGenetica_codigo: { casaGenetica: 'PalmElit', codigo } },
      update: { nombre, grupo, descripcion },
      create: { codigo, nombre, grupo, descripcion, casaGenetica: 'PalmElit' },
    })
  }
  console.log('Opciones genéticas:', OPCIONES.map(o => o[0]).join(' '))

  const resumen = await db.especieCultivo.findMany({ where: { tipoCultivoId: palma.id }, include: { variedades: true } })
  for (const e of resumen) console.log(e.nombre, '→', e.variedades.map(v => `${v.nombre} (${v.casaGenetica})`).join(', '))
  await db.$disconnect()
})().catch(e => { console.error(e); process.exit(1) })
