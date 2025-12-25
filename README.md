# AgroApp - Sistema de Palmicultura

Aplicación web para gestión de fincas, tareas, maquinaria e inventario.
Construido con **Next.js 15**, **Tailwind CSS**, y **Prisma ORM** (PostgreSQL/Neon).

## Requisitos Previos

1. **Node.js**: v18 o superior.
2. **Base de Datos Postgres**: Se recomienda [Neon.tech](https://neon.tech) (Serverless Postgres) o Vercel Postgres.

## Configuración Inicial

1. **Intalación de dependencias**:
   ```bash
   npm install
   ```

2. **Variables de Entorno**:
   Renombrar `.env.example` a `.env` (o crea uno nuevo) y configura la URL de la base de datos:
   ```env
   DATABASE_URL="postgres://usuario:password@host/neondb?sslmode=require"
   ```

3. **Base de Datos (Migraciones)**:
   Ejecutar para crear las tablas en Neon:
   ```bash
   npx prisma migrate dev --name init
   ```
   *Nota: Si es la primera vez, esto crea el esquema completo.*

4. **Ejecutar Localmente**:
   ```bash
   npm run dev
   ```
   Abrir [http://localhost:3000](http://localhost:3000).

## Despliegue en Vercel

1. Subir el código a GitHub.
2. Importar el proyecto en Vercel.
3. En la configuración de Proyecto en Vercel:
   - **Framework Preset**: Next.js
   - **Environment Variables**: Agregar `DATABASE_URL` con la cadena de conexión de Neon/Postgres production.
4. **Build Command**: `prisma generate && next build` (O simplemente dejar default y agregar `prisma generate` en `package.json` postinstall si es necesario, pero Vercel lo detecta usualmente).
   - *Recomendación*: Agregar script `"postinstall": "prisma generate"` en `package.json`.

## Estructura del Proyecto

- `/src/app`: Rutas y Vistas (App Router).
- `/src/app/actions`: Server Actions (Lógica de negocio y BD).
- `/src/components`: Componentes UI reutilizables (Botones, Tablas, Forms).
- `/src/lib`: Utilidades y cliente Prisma (`db.ts`).
- `/prisma`: Esquema de Base de Datos (`schema.prisma`).

## Características

- **Fincas y Lotes**: Gestión maestra de unidades productivas.
- **Tareas**: Planificación de labores (Finca/Lote).
- **Maquinaria**: Catálogo y logs de uso.
- **Insumos**: Inventario y movimientos.
- **Reportes**: Vistas consolidadas.

---
Desarrollado por Antigravity.
