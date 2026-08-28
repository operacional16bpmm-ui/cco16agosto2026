import { cn } from "@/lib/utils";

/**
 * Créditos da equipe do projeto.
 *
 * Fonte dos nomes: a lista de liberação da COP 2026
 * (`liberacao-cop2026-completa.tsv`, linha 6) e a assinatura que já existia no
 * rodapé (`components/publico16/cop/rodape-cop.tsx`). Grafia conferida contra
 * esses dois arquivos — não inventar posto, RE ou acento aqui: se o dado mudar,
 * muda na origem e depois aqui.
 *
 * Por que uma constante só: os créditos já haviam divergido uma vez entre a
 * vitrine ("Desenvolvido por"), o DEJEM ("Elaboração:") e o rodapé da COP — um
 * com acento no nome, outro sem. Toda tela que credita a equipe importa daqui.
 */
export const EQUIPE = [
  { papel: "Gerência do projeto", nome: "Maj PM Alvaro Zocchio Júnior" },
  { papel: "Concepção e desenvolvimento", nome: "Sd PM 231.936-5 Fabrício Pires" },
] as const;

/**
 * Faixa de créditos do topo da página.
 *
 * Fica ACIMA do cabeçalho fixo e NÃO é sticky: aparece inteira quando a página
 * abre — que é o momento em que o crédito precisa ser lido, e é o que sai no
 * print que circula na reunião — e sai de cena na primeira rolagem, sem roubar
 * altura da navegação nem do conteúdo.
 *
 * O fundo azul-noite é o mesmo do rodapé institucional: fecha a página em cima
 * e embaixo com a mesma faixa, e é o único fundo em que o ouro e o vermelho do
 * brasão têm contraste. Serve tanto na vitrine (tema claro) quanto nas páginas
 * da COP (tema escuro), sem depender do tema da página hospedeira.
 */
export function FaixaCreditos({ className }: { className?: string }) {
  return (
    <div
      className={cn("nao-imprime w-full bg-azul-noite text-branco", className)}
      /* .tema-institucional/.tema-vitrine redefinem --branco nas páginas da COP;
         o inline garante o valor claro dentro desta faixa escura, mesmo recurso
         usado no RodapeCop. */
      style={{ color: "var(--branco)" }}
    >
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-6 gap-y-1 px-4 py-1.5 md:px-6">
        {EQUIPE.map(({ papel, nome }) => (
          <p key={papel} className="flex items-center gap-2 text-[11px] leading-tight">
            <span
              aria-hidden
              className="h-3 w-[2px] shrink-0 rounded-full"
              style={{ background: "var(--vermelho-pm)" }}
            />
            <span className="uppercase tracking-[0.14em]" style={{ color: "rgb(255 255 255 / 0.45)" }}>
              {papel}
            </span>
            <span className="font-semibold" style={{ color: "rgb(255 255 255 / 0.92)" }}>
              {nome}
            </span>
          </p>
        ))}
      </div>
    </div>
  );
}
