-- CreateEnum
CREATE TYPE "EstadoFinca" AS ENUM ('ACTIVO', 'INACTIVO');

-- CreateEnum
CREATE TYPE "EstadoLote" AS ENUM ('ACTIVO', 'INACTIVO', 'EN_RENOVACION');

-- CreateEnum
CREATE TYPE "NivelTarea" AS ENUM ('FINCA', 'LOTE');

-- CreateEnum
CREATE TYPE "EstadoTarea" AS ENUM ('PROGRAMADA', 'EN_PROCESO', 'EJECUTADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "PrioridadTarea" AS ENUM ('BAJA', 'MEDIA', 'ALTA');

-- CreateEnum
CREATE TYPE "EstadoMaquinaria" AS ENUM ('DISPONIBLE', 'EN_USO', 'EN_MANTENIMIENTO', 'FUERA_DE_SERVICIO', 'PRESTADA', 'EN_TRASLADO');

-- CreateEnum
CREATE TYPE "TipoMovimiento" AS ENUM ('ENTRADA', 'SALIDA', 'AJUSTE');

-- CreateTable
CREATE TABLE "Finca" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "departamento" TEXT NOT NULL,
    "municipio" TEXT NOT NULL,
    "veredaSector" TEXT NOT NULL,
    "responsable" TEXT NOT NULL,
    "areaTotalHa" DOUBLE PRECISION NOT NULL,
    "estado" "EstadoFinca" NOT NULL DEFAULT 'ACTIVO',
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Finca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lote" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "fincaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "areaHa" DOUBLE PRECISION NOT NULL,
    "tipoCultivo" TEXT NOT NULL,
    "variedad" TEXT,
    "fechaSiembra" TIMESTAMP(3),
    "estado" "EstadoLote" NOT NULL DEFAULT 'ACTIVO',
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tarea" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "fincaId" TEXT NOT NULL,
    "loteId" TEXT,
    "nivel" "NivelTarea" NOT NULL,
    "fechaProgramada" TIMESTAMP(3) NOT NULL,
    "fechaEjecucion" TIMESTAMP(3),
    "tipo" TEXT NOT NULL,
    "descripcion" TEXT,
    "responsable" TEXT NOT NULL,
    "duracionEstimadaHoras" DOUBLE PRECISION,
    "duracionRealHoras" DOUBLE PRECISION,
    "estado" "EstadoTarea" NOT NULL DEFAULT 'PROGRAMADA',
    "prioridad" "PrioridadTarea" NOT NULL DEFAULT 'MEDIA',
    "evidencias" TEXT,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tarea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Maquinaria" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "fincaId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "marca" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "serialPlaca" TEXT NOT NULL,
    "fechaCompra" TIMESTAMP(3),
    "estado" "EstadoMaquinaria" NOT NULL DEFAULT 'DISPONIBLE',
    "horometroActual" DOUBLE PRECISION,
    "ultimoMantenimiento" TIMESTAMP(3),
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Maquinaria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsoMaquinaria" (
    "id" TEXT NOT NULL,
    "maquinaId" TEXT NOT NULL,
    "tareaId" TEXT NOT NULL,
    "fincaId" TEXT NOT NULL,
    "loteId" TEXT,
    "operador" TEXT NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "horasUso" DOUBLE PRECISION NOT NULL,
    "horometroInicio" DOUBLE PRECISION,
    "horometroFin" DOUBLE PRECISION,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsoMaquinaria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Insumo" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "unidadMedida" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Insumo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimientoInventario" (
    "id" TEXT NOT NULL,
    "fincaId" TEXT NOT NULL,
    "insumoId" TEXT NOT NULL,
    "tipoMovimiento" "TipoMovimiento" NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "costoUnitario" DOUBLE PRECISION,
    "referencia" TEXT NOT NULL,
    "tareaId" TEXT,
    "loteId" TEXT,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimientoInventario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Finca_codigo_key" ON "Finca"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Lote_fincaId_codigo_key" ON "Lote"("fincaId", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Tarea_codigo_key" ON "Tarea"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Maquinaria_codigo_key" ON "Maquinaria"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Insumo_codigo_key" ON "Insumo"("codigo");

-- AddForeignKey
ALTER TABLE "Lote" ADD CONSTRAINT "Lote_fincaId_fkey" FOREIGN KEY ("fincaId") REFERENCES "Finca"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tarea" ADD CONSTRAINT "Tarea_fincaId_fkey" FOREIGN KEY ("fincaId") REFERENCES "Finca"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tarea" ADD CONSTRAINT "Tarea_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsoMaquinaria" ADD CONSTRAINT "UsoMaquinaria_maquinaId_fkey" FOREIGN KEY ("maquinaId") REFERENCES "Maquinaria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsoMaquinaria" ADD CONSTRAINT "UsoMaquinaria_tareaId_fkey" FOREIGN KEY ("tareaId") REFERENCES "Tarea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsoMaquinaria" ADD CONSTRAINT "UsoMaquinaria_fincaId_fkey" FOREIGN KEY ("fincaId") REFERENCES "Finca"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsoMaquinaria" ADD CONSTRAINT "UsoMaquinaria_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoInventario" ADD CONSTRAINT "MovimientoInventario_fincaId_fkey" FOREIGN KEY ("fincaId") REFERENCES "Finca"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoInventario" ADD CONSTRAINT "MovimientoInventario_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "Insumo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoInventario" ADD CONSTRAINT "MovimientoInventario_tareaId_fkey" FOREIGN KEY ("tareaId") REFERENCES "Tarea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoInventario" ADD CONSTRAINT "MovimientoInventario_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote"("id") ON DELETE SET NULL ON UPDATE CASCADE;
