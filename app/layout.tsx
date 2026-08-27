import type { Metadata } from "next";
import { Cinzel, IBM_Plex_Mono, Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

// Títulos institucionais da página oficial do 16º BPM/M (rota /16bpmm).
const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
});

// Face de DADOS: indicadores, tabelas numéricas e eixos de gráfico.
const plexMono = IBM_Plex_Mono({
  variable: "--font-dados",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://portal-cco16.vercel.app"),
  title: "SALA DE OPERAÇÕES · 16º BPM/M · Diretriz nº PM3-001/02/23",
  description:
    "Do flagrante na câmera à viatura certa, em segundos. Sala de Operações do 16º BPM/M.",
  applicationName: "Portal do 16º BPM/M",
  authors: [{ name: "16º BPM/M · 1º Ten PM Fernão Gomes Loureiro" }],
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${cinzel.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
        <Toaster richColors position="bottom-right" theme="dark" />
      </body>
    </html>
  );
}
