import { ClipboardList, Fingerprint, Lock, Scale, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Rodapé das páginas da Auditoria de COP 2026: nota da página, selos técnicos
 * e assinatura do desenvolvimento.
 *
 * As três páginas com footer (dashboard, admin, acesso) repetiam o mesmo molde
 * copiado à mão; a landing não tinha rodapé nenhum. Passou a ser um componente
 * só para a assinatura não divergir entre elas — foi exatamente isso que
 * aconteceu com os créditos que já existiam no portal ("Desenvolvido por" na
 * vitrine, "Elaboração:" no DEJEM, um com acento no nome e o outro sem).
 *
 * REGRA DOS SELOS: aqui só entra mecanismo que o código REALMENTE implementa e
 * que dá para conferir. Nada de logotipo de certificadora ou selo de "site
 * seguro" de terceiro — o portal não passou por auditoria externa, e numa
 * página oficial do Batalhão afirmar isso seria mentira. Cada selo abaixo tem
 * o arquivo que o sustenta anotado ao lado. Se um mecanismo sair do código, o
 * selo sai daqui junto.
 */

/** Bumpado à mão a cada entrega relevante. Serve para o Comando saber de qual
 *  versão é o print que está circulando na reunião. */
export const VERSAO_PORTAL = "2026.08";

const ASSINATURA = "Sd PM 231.936-5 Fabrício Pires";

const SELOS = [
  {
    Icone: Lock,
    texto: "Google OAuth 2.0 · PKCE",
    detalhe:
      "Entrada pela conta Google do usuário, com PKCE (S256): um código interceptado no redirect não vale para quem o pegar.",
    // lib/cop2026-acesso.ts — gerarPkce(), urlAutorizacao()
  },
  {
    Icone: ShieldCheck,
    texto: "Sessão assinada HMAC-SHA256",
    detalhe: "O cookie de acesso é assinado e vence em 12 horas. Adulterá-lo invalida a sessão.",
    // lib/auth-simples.ts — hmacHex(); lib/cop2026-acesso.ts — verificarAssinaturaAcesso()
  },
  {
    Icone: Fingerprint,
    texto: "TLS 1.3 · HTTPS",
    detalhe: "Todo o tráfego é cifrado fim a fim entre o navegador e o servidor.",
    // Verificado em 26/08/2026: openssl s_client -tls1_3 negocia TLS_AES_128_GCM_SHA256.
  },
  {
    Icone: ClipboardList,
    texto: "Trilha de auditoria",
    detalhe: "Toda inclusão e revogação de acesso fica registrada com autor, alvo e horário.",
    // lib/db/usuarios.ts — registrarAuditoria(); tabela audit_events
  },
  {
    Icone: Scale,
    texto: "LGPD · dado pessoal em área restrita",
    detalhe:
      "Nome, RE e justificativa de policial só aparecem atrás do login, para lista nominal de autorizados.",
    // proxy.ts — ROTAS_RESTRITAS_COP; lib/db/cop2026-autorizados.ts — exigirAcessoCop()
  },
];

export function SelosSeguranca({ tom = "claro" }: { tom?: "claro" | "escuro" }) {
  return (
    <ul
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-2",
        tom === "escuro" ? "text-white/45" : "text-texto-suave"
      )}
    >
      {SELOS.map(({ Icone, texto, detalhe }) => (
        <li key={texto} className="inline-flex items-center gap-1.5" title={detalhe}>
          <Icone size={12} aria-hidden className="shrink-0" />
          <span className="rotulo-dado">{texto}</span>
        </li>
      ))}
    </ul>
  );
}

/** Carimbo de versão + autoria. Monoespaçada de propósito: é metadado de
 *  entrega, não texto de leitura. */
export function AssinaturaDesenvolvimento({ tom = "claro" }: { tom?: "claro" | "escuro" }) {
  return (
    <p
      className={cn(
        "dados text-[11px] leading-relaxed",
        tom === "escuro" ? "text-white/35" : "text-texto-suave/75"
      )}
    >
      Portal CCO-16 · versão {VERSAO_PORTAL}
      <span className="mx-1.5 opacity-40">|</span>
      Concepção e desenvolvimento · {ASSINATURA}
    </p>
  );
}

export function RodapeCop({
  /** Frase própria da página, à direita da linha institucional. */
  nota,
  /** Casa com o max-w do cabeçalho da página. */
  largura = "max-w-[1400px]",
}: {
  nota?: string;
  largura?: string;
}) {
  return (
    <footer className="border-t border-borda bg-tatico-super">
      <div className="faixa-institucional h-1" />
      <div className={cn("mx-auto space-y-4 px-5 py-5", largura)}>
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-texto-suave">
          <span>Portal CCO-16 · 16º BPM/M · uso restrito</span>
          {nota && <span>{nota}</span>}
        </div>
        <SelosSeguranca />
        <AssinaturaDesenvolvimento />
      </div>
    </footer>
  );
}
