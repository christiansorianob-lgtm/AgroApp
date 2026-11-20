/** @type {import('next').NextConfig} */
const nextConfig = {
    // Las fotos de evidencia viajan en la acción del servidor (Vercel acepta hasta 4,5 MB por solicitud)
    experimental: { serverActions: { bodySizeLimit: "4mb" } },
    // Las voces del contador de plantas no cambian: el celular las guarda en caché
    async headers() {
        return [{ source: "/voces/:archivo*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] }]
    },
};

export default nextConfig;
