/**
 * Estado do formulário de lançamento — fora do módulo de server actions.
 *
 * `actions.ts` é um módulo `"use server"`, e nele TODO export precisa ser uma
 * função async: o bundler troca cada export por uma referência remota. Uma
 * constante exportada de lá não chega ao cliente como objeto — chega como
 * referência, e o `useActionState` inicia com um estado que não tem `erros`
 * nem `avisos`. Em produção isso derrubou /cop2026/lancar com 500 no SSR
 * (`Cannot read properties of undefined (reading 'length')`).
 *
 * O tipo e a semente moram aqui, num módulo comum ao servidor e ao cliente.
 */

export type LancamentoState = {
  ok: boolean;
  protocolo: string | null;
  erros: string[];
  avisos: string[];
  /** Reenvio da MESMA submissão: a tela mostra o protocolo original em vez de
   *  um segundo registro. */
  duplicado: boolean;
};

export const ESTADO_INICIAL: LancamentoState = {
  ok: false,
  protocolo: null,
  erros: [],
  avisos: [],
  duplicado: false,
};
