import type { ReactNode } from "react";

/**
 * COMO LER — o manual de cada quadro do painel, em português de quem não é da
 * área.
 *
 * Pedido do Fabrício em 08/09/2026: "um texto explicativo debaixo de cada
 * quadro de gráficos e demonstrativos, explicando a lógica daquele índice,
 * bem claro e objetivo, fácil de um leigo entender". E, no mesmo fôlego, a
 * regra que vale para o portal inteiro: **entra em tudo sempre** — tela,
 * briefing PNG, PDF e impressão.
 *
 * Por que um registro central e não uma prop por chamada:
 *
 * 1. O painel tem 15 cartões, o briefing e os relatórios reaproveitam vários
 *    deles. Texto escrito na chamada nasce dessincronizado — o mesmo quadro
 *    explicado de dois jeitos em duas telas é pior que não explicar.
 * 2. `Cartao` consulta este mapa PELO TÍTULO quando a chamada não passa
 *    `comoLer`. Cartão novo em qualquer tela já nasce coberto, sem ninguém
 *    lembrar de repassar a prop.
 * 3. Revisar a linguagem — que é o que mais vai mudar — se faz num arquivo só.
 *
 * Regras de escrita, para quem for mexer:
 * - `resumo` responde "o que este quadro está me dizendo", em no máximo três
 *   frases curtas, sem jargão estatístico. É o que aparece SEMPRE.
 * - `calculo` responde "de onde sai esse número". Pode usar o termo técnico,
 *   desde que explique. Fica recolhido na tela e aberto no papel.
 * - Nada de "vide", "conforme supra", "outrossim". Quem lê é o policial que
 *   abriu o link no celular, não o autor da Diretriz.
 */
export interface Explicacao {
  /** Sempre visível, em todos os meios. */
  resumo: ReactNode;
  /** A conta por trás. Recolhida na tela, aberta no briefing e na impressão. */
  calculo?: ReactNode;
}

const L = ({ children }: { children: ReactNode }) => (
  <ul className="list-disc space-y-1 pl-4">{children}</ul>
);

export const EXPLICACOES: Record<string, Explicacao> = {
  "Onde agir · frações": {
    resumo: (
      <>
        Põe as companhias em ordem de <strong>quem precisa de cobrança agora</strong>. Cada
        fração tem uma meta própria, do tamanho do efetivo dela — por isso não dá para comparar
        só o número bruto de evidências: uma Cia grande produzir mais que uma pequena é o
        esperado.
      </>
    ),
    calculo: (
      <L>
        <li>
          A meta do Batalhão é dividida entre as frações pela{" "}
          <strong>Matriz Proporcional</strong> — quem tem mais gente recebe cota maior.
        </li>
        <li>
          A porcentagem de cada linha é <strong>o que a fração já fez ÷ a cota dela</strong>, e
          não sobre o total do Batalhão.
        </li>
        <li>
          A ordem é por urgência, não por nome nem por tamanho: no topo fica quem está mais
          distante da própria cota nesta altura do mês.
        </li>
      </L>
    ),
  },

  "Plano × realizado · dia a dia": {
    resumo: (
      <>
        Mostra, dia a dia, <strong>o que era para ter sido feito</strong> (linha tracejada) e{" "}
        <strong>o que foi feito de verdade</strong> (linha grossa). Enquanto a linha grossa
        estiver embaixo da tracejada, a fração está devendo; o espaço entre as duas é o tamanho
        da dívida.
      </>
    ),
    calculo: (
      <L>
        <li>
          A tracejada sobe em passo constante: a meta do mês repartida pelos dias do mês.
        </li>
        <li>
          A linha grossa é a soma do que foi auditado até cada dia. Ela para no dia de hoje —
          adiante disso não há dado, e inventar continuação seria previsão, não medição.
        </li>
        <li>
          A cor muda sozinha: vermelha enquanto está abaixo do previsto, verde quando alcança.
        </li>
        <li>
          As barras ao fundo são as evidências de cada dia, lidas no eixo da direita. A dívida
          diminui sozinha em todo dia que a barra passa da cota.
        </li>
      </L>
    ),
  },

  Exceções: {
    resumo: (
      <>
        Junta num lugar só os casos que <strong>fogem da regra</strong>: quem não auditou no
        turno e quem auditou menos que o mínimo. Clicar num número leva aos nomes na tabela
        analítica.
      </>
    ),
    calculo: (
      <L>
        <li>
          A unidade é o <strong>turno de serviço</strong>, não o envio do formulário: dois
          envios no mesmo turno contam como um turno só.
        </li>
        <li>
          Auditar abaixo do mínimo <strong>não é irregularidade automática</strong> — é
          aceitável desde que o auditor registre a justificativa. Sem justificativa é que vira
          cobrança.
        </li>
      </L>
    ),
  },

  "Pontos de atenção": {
    resumo: (
      <>
        O que a Diretriz manda olhar de perto. Aparecer aqui <strong>não é punição</strong>: é
        aviso para conferir antes que vire problema.
      </>
    ),
  },

  "Produção por dia": {
    resumo: (
      <>
        Quantas evidências foram auditadas em cada dia do período. A faixa clara ao fundo é a{" "}
        <strong>variação normal</strong> do Batalhão — barra dentro dela é dia comum; barra
        muito fora, para cima ou para baixo, é dia atípico e vale entender o porquê.
      </>
    ),
    calculo: (
      <L>
        <li>
          A linha reta é a cota diária: meta do período ÷ dias do período.
        </li>
        <li>
          A faixa é a média dos dias mais ou menos três desvios (±3σ). Em processo estável,
          praticamente todo dia cai dentro dela — por isso o que sai da faixa merece explicação,
          e não bronca automática.
        </li>
      </L>
    ),
  },

  "Evidências por turno de serviço": {
    resumo: (
      <>
        De cada turno auditado, <strong>quantas evidências vieram</strong>. Tudo o que está à
        esquerda do mínimo é turno que ficou abaixo da regra.
      </>
    ),
    calculo: (
      <L>
        <li>
          Cada coluna é uma quantidade (0, 1, 2, 3…) e a altura é quantos turnos entregaram
          aquela quantidade.
        </li>
        <li>
          Concentração exatamente no mínimo é sinal de cumprimento formal: entrega-se o
          necessário para não ficar irregular, e nada além.
        </li>
      </L>
    ),
  },

  "Funil de conformidade": {
    resumo: (
      <>
        Acompanha o lançamento do começo ao fim, degrau por degrau. Cada degrau que{" "}
        <strong>encolhe muito</strong> aponta onde a informação se perde no caminho.
      </>
    ),
  },

  "Dispersão por fração": {
    resumo: (
      <>
        Mostra se, <strong>dentro</strong> da companhia, todo mundo audita parecido ou se um
        punhado carrega o resultado. Duas frações podem ter a mesma média com realidades
        opostas: uma com todos produzindo igual, outra com três pessoas segurando o número.
      </>
    ),
    calculo: (
      <L>
        <li>
          A caixa cobre a metade do meio dos lançamentos; o risco dentro dela é a{" "}
          <strong>mediana</strong> — o valor do meio, que não se deixa puxar por um dia
          excepcional como a média se deixa.
        </li>
        <li>
          Caixa curta é fração homogênea. Caixa comprida é fração desigual — e é ela que quebra
          quando o auditor mais produtivo sai de férias.
        </li>
      </L>
    ),
  },

  "Matriz dia × horário": {
    resumo: (
      <>
        Em que dia da semana e em que horário a auditoria de fato acontece. Quanto mais escuro o
        quadrado, mais auditoria naquele momento — e os claros mostram as janelas descobertas.
      </>
    ),
  },

  "Pareto de auditores": {
    resumo: (
      <>
        Ordena os auditores do que mais produz para o que menos produz. Se{" "}
        <strong>poucos nomes fazem quase tudo</strong>, o controle está apoiado em pouca gente e
        cai junto com elas.
      </>
    ),
    calculo: (
      <L>
        <li>
          A linha que sobe é o acumulado. Se ela chega perto de 100% já nos primeiros nomes, a
          produção está concentrada.
        </li>
        <li>
          Clicar numa barra joga o nome na busca e filtra o painel inteiro por ele.
        </li>
      </L>
    ),
  },

  "Turno e função": {
    resumo: (
      <>
        Em qual turno e em qual atribuição a auditoria está sendo feita — serve para ver se
        algum turno ficou sem cobertura nenhuma.
      </>
    ),
  },

  "Por posto e graduação": {
    resumo: (
      <>
        Em qual nível hierárquico a auditoria acontece. É por aqui que se enxerga se a
        supervisão está participando ou se o controle foi todo empurrado para a ponta.
      </>
    ),
  },

  "Tabela analítica": {
    resumo: (
      <>
        A lista nome a nome, com o que cada auditor produziu no recorte selecionado. É a fonte
        para conferir qualquer número dos gráficos acima.
      </>
    ),
  },

  Lançamentos: {
    resumo: (
      <>
        Cada linha é <strong>um envio do formulário</strong>, do jeito que chegou. Serve para
        conferir o caso concreto quando um número do painel parecer estranho.
      </>
    ),
  },
};

/** Consulta pelo título do cartão. Título fora do mapa devolve `undefined` e o
 *  cartão simplesmente não ganha o bloco — nunca quebra a tela. */
export function explicacaoDe(titulo: string): Explicacao | undefined {
  return EXPLICACOES[titulo];
}
