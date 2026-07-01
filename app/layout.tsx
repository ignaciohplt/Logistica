import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rutas Himetal",
  description: "App para organizar recorridos de camiones, pedidos, clientes y mapas."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
