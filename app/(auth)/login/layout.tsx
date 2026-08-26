import type { Metadata } from "next";
import { MapaDoSite } from "@/components/mapa-do-site";

/* ============================================================================
   Layout só de metadata do /login.
   page.tsx é Client Component ("use client" por causa do useActionState e do
   useSearchParams) e Client Component não pode exportar `metadata`. Este layout
   existe unicamente para dar ao /login o cartão de compartilhamento próprio:
   16bpmmcomando.vercel.app é reescrito para cá em proxy.ts, então é este HTML
   que o robô do WhatsApp lê quando o link do Comando é enviado num grupo.
   ============================================================================ */

const HOST = "https://16bpmmcomando.vercel.app";
const TITULO = "Sala de Comando · CCO-16 · 16º BPM/M";
const RESUMO =
  "Acesso restrito ao efetivo do 16º BPM/M. Seções P1 a P4, SPJMD, logística e comunicação social reunidas numa só tela de comando.";

export const metadata: Metadata = {
  title: TITULO,
  description: RESUMO,
  alternates: { canonical: HOST },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "CCO-16 · 16º BPM/M",
    url: HOST,
    title: TITULO,
    description: RESUMO,
    images: [
      {
        url: `${HOST}/og/comando.png`,
        width: 1200,
        height: 630,
        alt: "Brasão do 16º BPM/M sobre fundo azul institucional, com o título Sala de Comando",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITULO,
    description: RESUMO,
    images: [`${HOST}/og/comando.png`],
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <MapaDoSite />
    </>
  );
}
