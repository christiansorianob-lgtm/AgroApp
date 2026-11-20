import type { Metadata } from "next";
import { Inter } from "next/font/google"; // Using Inter as requested/standard
import "./globals.css";
import { AppLayout } from "@/components/layout/AppLayout";
import { getSesion } from "@/lib/auth";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AgroApp · Gestión de palmicultura",
  description: "Gestión operativa y georreferenciación de fincas palmeras",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const sesion = await getSesion();
  return (
    <html lang="es">
      <body className={inter.className}>
        <AppLayout sesion={sesion ? { nombre: sesion.nombre, rol: sesion.rol } : null}>
          {children}
        </AppLayout>
      </body>
    </html>
  );
}
