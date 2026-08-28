import Image from "next/image";
import { ClipboardList, Fingerprint, Lock, Scale, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { EQUIPE } from "@/components/publico16/creditos";

/**
 * Rodapé das páginas da Auditoria de COP 2026: identidade, selos técnicos e
 * assinatura do desenvolvimento.
 *
 * As três páginas com footer (dashboard, admin, acesso) repetiam o mesmo molde
 * copiado à mão e a landing não tinha rodapé nenhum. Passou a ser um componente
 * só para a assinatura não divergir entre elas — foi exatamente isso que
 * aconteceu com os créditos que já existiam no portal ("Desenvolvido por" na
 * vitrine, "Elaboração:" no DEJEM, um com acento no nome e o outro sem).
 *
 * Por que a faixa é ESCURA num tema claro: é o mesmo recurso do rodapé da
 * página oficial do Batalhão (`app/(public)/16bpmm/page.tsx`) — o azul-noite
 * fecha a página e é o único fundo em que o vermelho e o ouro do brasão têm
 * contraste para aparecer. Num rodapé branco os dois somem.
 *
 * REGRA DOS SELOS: aqui só entra mecanismo que o código REALMENTE implementa e
 * que dá para conferir. Nada de logotipo de certificadora ou selo de "site
 * seguro" de terceiro — o portal não passou por auditoria externa, e numa
 * página oficial do Batalhão afirmar isso seria mentira. Cada selo abaixo tem
 * o arquivo que o sustenta anotado ao lado. Se um mecanismo sair do código, o
 * selo sai daqui junto.
 */

/** Bumpada à mão a cada entrega relevante. Serve para o Comando saber de qual
 *  versão é o print que está circulando na reunião. */
export const VERSAO_PORTAL = "16.0";


const SELOS = [
  {
    Icone: Lock,
    texto: "OAuth 2.0 · PKCE",
    detalhe:
      "Entrada pela conta Google do usuário, com PKCE (S256): um código interceptado no redirect não vale para quem o pegar.",
    // lib/cop2026-acesso.ts — gerarPkce(), urlAutorizacao()
  },
  {
    Icone: ShieldCheck,
    texto: "Sessão HMAC-SHA256",
    detalhe: "O cookie de acesso é assinado e vence em 12 horas. Adulterá-lo invalida a sessão.",
    // lib/auth-simples.ts — hmacHex(); lib/cop2026-acesso.ts — verificarAssinaturaAcesso()
  },
  {
    Icone: Fingerprint,
    texto: "TLS 1.3",
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
    texto: "LGPD · área restrita",
    detalhe:
      "Nome, RE e justificativa de policial só aparecem atrás do login, para lista nominal de autorizados.",
    // proxy.ts — ROTAS_RESTRITAS_COP; lib/db/cop2026-autorizados.ts — exigirAcessoCop()
  },
];

export function SelosSeguranca({ className }: { className?: string }) {
  return (
    <ul className={cn("flex flex-wrap gap-2", className)}>
      {SELOS.map(({ Icone, texto, detalhe }) => (
        <li
          key={texto}
          title={detalhe}
          className="group inline-flex items-center gap-2 rounded-full border border-branco/12 bg-branco/[0.06] px-3 py-1.5 transition-colors hover:border-ouro/45 hover:bg-branco/12"
        >
          <Icone
            size={12}
            aria-hidden
            className="shrink-0 text-ouro transition-colors group-hover:text-ouro-claro"
          />
          <span className="rotulo-dado text-branco/75">{texto}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Carimbo de autoria. A régua vermelha à esquerda é o mesmo recurso das
 * chamadas do painel: é o que faz o bloco ler como assinatura e não como mais
 * uma linha de rodapé.
 */
export function AssinaturaDesenvolvimento({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-stretch gap-3", className)}>
      <span aria-hidden className="regua-assinatura w-[3px] shrink-0 rounded-full bg-vermelho" />
      <div>
        {EQUIPE.map(({ papel, nome }, i) => (
          <div key={papel} className={i ? "mt-2" : undefined}>
            <p className="rotulo-dado text-branco/40">{papel}</p>
            <p className="mt-1 text-[13px] font-semibold leading-tight text-branco">{nome}</p>
          </div>
        ))}
        <p className="dados mt-2 text-[10.5px] leading-none text-branco/35">
          Portal CCO-16 · versão {VERSAO_PORTAL}
        </p>
      </div>
    </div>
  );
}

export function RodapeCop({
  /** Frase própria da página. */
  nota,
  /** Casa com o max-w do cabeçalho da página. */
  largura = "max-w-[1400px]",
}: {
  nota?: string;
  largura?: string;
}) {
  return (
    /* tema-vitrine: as páginas da COP rodam sob .tema-institucional, que redefine
       --branco para grafite e --ouro para o vermelho PM. Numa faixa azul-noite
       isso deixa o rodapé ilegível — texto escuro sobre fundo escuro. Este
       escopo restaura os valores de :root só aqui dentro, que é exatamente para
       o que ele existe (mesmo recurso usado pela /dejem). */
    <footer
      className="rodape-inst tema-vitrine relative overflow-hidden bg-azul-noite text-branco"
      /* .tema-vitrine declara `color` fora de @layer, então vence o utilitário
         text-branco na cascata. Hoje todo filho tem cor explícita e nada quebra,
         mas o próximo <p> adicionado aqui sairia grafite sobre azul-noite. O
         inline resolve de vez. */
      style={{ color: "var(--branco)" }}
    >
      <div className="faixa-institucional h-1.5" />

      {/* Brilho do vermelho institucional. Decorativo e sutil: dá profundidade
          à faixa sem competir com o dado da página. Some na impressão. */}
      <div
        aria-hidden
        className="nao-imprime pointer-events-none absolute -top-32 left-1/2 h-64 w-[70rem] -translate-x-1/2 rounded-full opacity-70 blur-3xl"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(213,52,65,0.30), rgba(213,52,65,0) 70%)",
        }}
      />

      <div className={cn("relative mx-auto px-5 py-7 sm:py-8", largura)}>
        <div className="grid gap-7 lg:grid-cols-[minmax(240px,0.9fr)_minmax(0,1.55fr)_minmax(240px,0.9fr)] lg:items-center lg:gap-0">
          {/* Identidade do portal */}
          <div className="flex items-center gap-4 lg:pr-8">
            <Image
              src="/brand/16bpmm.png"
              alt=""
              aria-hidden
              width={168}
              height={240}
              className="h-16 w-auto shrink-0 opacity-95"
            />
            <div className="min-w-0">
              <p className="font-serif text-base font-bold uppercase leading-tight tracking-wide text-ouro sm:text-lg">
                Portal CCO-16
              </p>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-branco/70">
                Auditoria de COP 2026 · 16º BPM/M
                <br />
                Uso restrito ao serviço.
              </p>
              {nota && <p className="mt-2 max-w-xs text-[11.5px] leading-relaxed text-branco/45">{nota}</p>}
            </div>
          </div>

          {/* Segurança: bloco central, concentrado e fácil de ler */}
          <div className="border-y border-branco/10 py-5 text-center lg:border-x lg:border-y-0 lg:px-8 lg:py-1">
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
              <p className="rotulo-dado text-ouro/90">Segurança do acesso</p>
              <span aria-hidden className="hidden h-3 w-px bg-branco/20 sm:block" />
              <p className="text-[10.5px] font-semibold text-branco/40">Mecanismos verificáveis no próprio sistema</p>
            </div>
            <SelosSeguranca className="mt-3 justify-center" />
            <p className="mx-auto mt-3 max-w-xl text-[10.5px] leading-relaxed text-branco/40">
              Camadas de autenticação, sessão, criptografia, rastreabilidade e proteção de dados — sem certificações de terceiros.
            </p>
          </div>

          {/* Assinatura e direitos */}
          <div className="flex flex-col gap-4 lg:items-end lg:pl-8">
            <AssinaturaDesenvolvimento className="lg:max-w-[260px]" />
            <p className="border-t border-branco/10 pt-3 text-[10.5px] leading-relaxed text-branco/40 lg:w-full lg:text-right">
              © {new Date().getFullYear()} 16º BPM/M — Polícia Militar do Estado de São Paulo.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
