import { cn } from "@/lib/utils";
import { IconeSair } from "@/components/publico16/cop/icones-cop";

/**
 * BOTÃO "SAIR" — encerrar a sessão da COP, um componente só.
 *
 * Determinação do Major Zochio em 09/09/2026: *"tem que ter uma aba de sair,
 * para desligar; pois depois de logado sempre que clica ele retoma"* e, na
 * sequência, *"inclua o botão de sair em vários lugares, bem evidente"*.
 *
 * O QUE ESTAVA ERRADO ANTES: o Sair existia, mas em três marcações copiadas à
 * mão (o cabeçalho de consulta, o da administração e a barra do briefing), em
 * 11px cinza, e **escondido no celular** (`hidden sm:flex`). Num computador
 * compartilhado do Batalhão, sessão que não se encerra é sessão que o próximo
 * herda — e a maior parte da tropa abre o portal pelo telefone, justamente onde
 * o botão não existia.
 *
 * REGRAS DESTE BOTÃO, para ele não voltar a sumir:
 * - o rótulo "Sair" aparece em TODAS as larguras (nada de `hidden sm:inline`);
 * - alvo de 44px de altura, o mínimo tocável;
 * - vermelho de contorno: é ação de encerrar, tem que ser achado na varredura,
 *   sem competir com o vermelho CHEIO do relato de problema;
 * - é `<a>`, e não `<Link>`: o destino é a rota de API que apaga o cookie e
 *   redireciona. `next/link` faria prefetch — o mouse passando por cima
 *   derrubaria a sessão de quem não clicou.
 */
export function BotaoSair({
  email,
  className,
  /** "escuro" nas superfícies táticas (barra, briefing); "claro" nos
   *  cabeçalhos de fundo claro. */
  variante = "escuro",
  /** Mostra a conta aberta ao lado — em telas largas, onde há espaço. */
  mostrarConta = false,
}: {
  email?: string;
  className?: string;
  variante?: "claro" | "escuro";
  mostrarConta?: boolean;
}) {
  const botao = (
    <a
      href="/api/cop2026/acesso/sair"
      title={email ? `Encerrar a sessão de ${email}` : "Encerrar a sessão"}
      /* Borda em `style` pelo mesmo motivo do cartão de ação: a regra sem
         camada `* { border-color: var(--borda) }` de globals.css atropela
         qualquer `border-*` de utilitário no Tailwind v4. Com ela, este botão
         saía com contorno cinza-transparente — exatamente o "passa batido"
         que o Major apontou. */
      style={{ borderColor: variante === "escuro" ? "#f0787f" : "#ca0202" }}
      className={cn(
        "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 sm:border-2 sm:px-3",
        "text-[11px] font-bold uppercase tracking-[0.07em] transition-all sm:text-[12px] sm:font-black sm:tracking-[0.08em]",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current",
        variante === "escuro"
          ? "text-[#ffc9cc] hover:bg-[#c0121c] hover:text-white"
          : "text-[#ca0202] hover:bg-[#ca0202] hover:text-white",
        mostrarConta ? "" : className
      )}
    >
      <IconeSair size={15} className="shrink-0 sm:size-[16px]" />
      Sair
    </a>
  );

  if (!mostrarConta) return botao;

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {email && (
        <span
          className={cn(
            "dados hidden max-w-[22ch] truncate text-[11px] lg:inline",
            variante === "escuro" ? "text-white/55" : "text-[#15304c]/60"
          )}
          title={email}
        >
          {email}
        </span>
      )}
      {botao}
    </span>
  );
}
