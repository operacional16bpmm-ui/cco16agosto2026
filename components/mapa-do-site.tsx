
/**
 * Mapa do site — rodapé comum a todo o portal, pedido do titular após a
 * migração para o servidor local: cada "site" do 16º BPM/M aparece pelo nome
 * e o hyperlink leva ao endereço correspondente, formando a malha de
 * navegação entre eles.
 *
 * Em 25/08/2026 a lista foi reduzida às quatro páginas abertas ao público:
 * Sala de Operações, Página Oficial, Calendário e Núcleo de Análise Criminal.
 * Auditoria de COP, Inventário, Boletins, Painel e Sala de Comando saíram — são
 * áreas com credencial e não devem ser anunciadas ao público — quem tem acesso
 * tem o endereço.
 *
 * Os hrefs são relativos de propósito: o mesmo build responde por
 * http://10.43.83.95:3000 e http://DESKTOP-71ALG45:3000, e um href absoluto
 * amarrado ao IP quebraria o acesso pelo nome da máquina (e vice-versa).
 *
 * Server component sem consulta a banco; entra nos três layouts (vitrine,
 * login e Sala de Comando), sempre DENTRO do scrollport de cada um — no
 * layout da Sala de Comando o wrapper é h-screen e o <main> é quem rola,
 * então um rodapé fora dele nunca apareceria.
 */

const SITES: { nome: string; endereco: string }[] = [
  { nome: "Sala de Operações", endereco: "/" },
  { nome: "Página Oficial do 16º BPM/M", endereco: "/16bpmm" },
  { nome: "Calendário de Eventos", endereco: "/16bpmm/calendario" },
];

export function MapaDoSite() {
  return (
    <nav
      aria-label="Mapa do site"
      className="border-t border-white/10 bg-[#0d1730] px-5 py-6 text-slate-400"
    >
      <div className="mx-auto max-w-6xl">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
          Mapa do site · 16º BPM/M
        </p>
        <ul className="flex flex-wrap gap-x-6 gap-y-2">
          {SITES.map(({ nome, endereco }) => (
            <li key={endereco}>
              {/* Só texto: o titular pediu o rodapé sem caminho para outras
                  páginas — quem precisa de uma delas recebe o endereço. */}
              <span className="text-[13px] text-slate-300">{nome}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
          Servidor local do 16º BPM/M · acesso somente pela rede interna · uso
          restrito
        </p>
      </div>
    </nav>
  );
}
