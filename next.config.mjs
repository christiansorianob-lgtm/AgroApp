/** @type {import('next').NextConfig} */
const nextConfig = {
    // Las fotos de evidencia viajan en la acción del servidor (Vercel acepta hasta 4,5 MB por solicitud)
    experimental: { serverActions: { bodySizeLimit: "4mb" } },
};

export default nextConfig;
