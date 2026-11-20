/** @type {import('next').NextConfig} */
const nextConfig = {
    // Las fotos de evidencia viajan en la acción del servidor (Vercel acepta hasta 4,5 MB por solicitud)
    experimental: { serverActions: { bodySizeLimit: "4mb" } },
    async headers() {
      return [
        {
          source: "/api/:path*",
          headers: [
            { key: "Access-Control-Allow-Credentials", value: "true" },
            { key: "Access-Control-Allow-Origin", value: "*" },
            { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT,OPTIONS" },
            { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version" },
          ]
        }
      ]
    }
};

export default nextConfig;
