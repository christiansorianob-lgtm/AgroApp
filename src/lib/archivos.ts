// Archivos que sube la plataforma (firmas, constancias). En Vercel van a Vercel Blob; sin token
// de Blob (desarrollo local) no se guardan y se devuelve null.

import { put } from "@vercel/blob"

export async function subirArchivo(ruta: string, contenido: Blob | Buffer, contentType: string): Promise<string | null> {
    if (!process.env.BLOB_READ_WRITE_TOKEN) return null
    const r = await put(ruta, contenido, { access: "public", contentType, addRandomSuffix: true })
    return r.url
}

/** "data:image/png;base64,..." → Buffer, solo si es una imagen PNG. */
export function pngDesdeDataUrl(dataUrl: string | null | undefined): Buffer | null {
    const m = dataUrl?.match(/^data:image\/png;base64,([A-Za-z0-9+/=]+)$/)
    return m ? Buffer.from(m[1], "base64") : null
}
