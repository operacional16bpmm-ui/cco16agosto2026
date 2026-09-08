#!/usr/bin/env node
/**
 * Guarda da UNIDADE DECLARADA (Fabricio, 08/09/2026).
 *
 * A regra: no lançamento da COP, a fração que vale é a que o policial declara
 * no formulário — não a que a relação do efetivo (`p4_efetivo`, congelada em
 * 19/07) atribui ao RE dele. Quem foi transferido depois caía na Cia antiga,
 * sem ver e sem poder corrigir.
 *
 * Por que um teste de SÍMBOLO e não de número: a regra anterior (C-4) está
 * escrita em comentário em três arquivos e é a coisa mais natural do mundo
 * "consertar" o formulário devolvendo a derivação pelo RE. Nenhum gate de
 * contagem pegaria isso — o total de evidências continuaria idêntico, só o
 * balde mudaria. Foi exatamente assim que a remoção parcial de UI passou por
 * toda a suíte em 07/09/2026.
 *
 * Rodar: `npm run verificar:unidade-declarada`
 */
import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const ACTION = "app/(public)/cop2026/lancar/actions.ts";
const FORM = "app/(public)/cop2026/lancar/formulario-lancamento.tsx";
const SELETOR = "app/(public)/cop2026/lancar/seletor-unidade.tsx";
const ROTA = "app/api/cop2026/unidades/route.ts";
const PAGINA = "app/(public)/cop2026/lancar/page.tsx";

const ler = (caminho) => readFileSync(caminho, "utf8");

test("a Server Action grava a subunidade DECLARADA, não a do roster", () => {
  const fonte = ler(ACTION);

  assert.match(
    fonte,
    /subunidadeDeclarada/,
    `${ACTION} não lê mais o campo do formulário: a fração voltou a ser derivada em algum lugar.`
  );

  // O padrão exato que existia antes de 08/09/2026 e que não pode voltar.
  assert.doesNotMatch(
    fonte,
    /const\s*\{\s*subunidade\s*\}\s*=\s*await\s+identificarPorRe/,
    `${ACTION} voltou a derivar a subunidade do RE. Vale o que o policial declara; ` +
      `o roster só vai para a trilha (payload_bruto.subunidadeRoster).`
  );

  assert.match(
    fonte,
    /subunidadeRoster/,
    `${ACTION} deixou de registrar a fração do roster na trilha. Ela não decide nada, ` +
      `mas é o que permite ao Comando cruzar declaração × relação depois.`
  );
});

test("o formulário não deixa enviar sem fração declarada", () => {
  const fonte = ler(FORM);
  assert.match(fonte, /<SeletorUnidade/, `${FORM} perdeu o seletor de unidade.`);

  /* Desde 08/09/2026 (fim da tarde) o bloqueio NÃO é mais um botão cinza: o
     botão responde sempre e o que trava é a lista de pendências. A regra que
     este gate guarda é a mesma — sem fração declarada não se chega à revisão —
     só o mecanismo mudou. Por isso as duas metades: a fração PRECISA gerar
     pendência, e pendência PRECISA impedir a revisão. */
  assert.match(
    fonte,
    /!unidadeCompleta[\s\S]{0,160}passo-unidade/,
    `${FORM}: faltar fração não gera mais pendência — o lançamento voltaria a nascer órfão.`
  );
  assert.match(
    fonte,
    /pendencias\.length\s*>\s*0[\s\S]{0,220}return;[\s\S]{0,160}setRevisando\(true\)/,
    `${FORM}: a revisão abre mesmo com pendência aberta. O aviso vira decorativo e a ` +
      `fração deixa de ser obrigatória na prática.`
  );
});

test("o botão de revisar nunca fica cinza sem explicação", () => {
  /* Fabricio, 08/09/2026: no celular, botão apagado sem motivo escrito faz o
     auditor abandonar o lançamento — foi o que aconteceu com o turno em branco,
     que não tinha aviso nenhum. Só `enviando` pode desabilitar (anti-duplicata). */
  const fonte = ler(FORM);
  assert.doesNotMatch(
    fonte,
    /disabled=\{!podeEnviar\}/,
    `${FORM}: o botão de revisar voltou a nascer desabilitado. Ele tem de responder ao ` +
      `toque e DIZER o que falta, piscando no passo pendente.`
  );
  assert.match(
    fonte,
    /pisca-falta/,
    `${FORM} perdeu o pisca do campo pendente: sobra só texto, que quem lança não lê.`
  );
});

test("a fração não vem marcada de fábrica", () => {
  const fonte = ler(SELETOR);
  assert.match(
    fonte,
    /fracao:\s*null/,
    `${SELETOR}: alguma fração passou a vir pré-selecionada. Default errado é pior que ` +
      `default nenhum — é o campo que muda de pessoa para pessoa.`
  );
});

test("a página tem saída quando a árvore de unidades não responde", () => {
  const fonte = ler(PAGINA);
  assert.match(
    fonte,
    /arvoreDeEmergencia/,
    `${PAGINA} perdeu o caminho alternativo. Sem ele, banco de unidades fora do ar = ` +
      `seletor vazio = NINGUÉM lança, porque a fração é obrigatória.`
  );
});

test("a rota de unidades está liberada no proxy", () => {
  // Achado de 08/09/2026, em teste no dev: sem esta linha o proxy devolvia
  // 307 → /login para `/api/cop2026/unidades`. O seletor abria com as frações
  // do 16º BPM/M (que vêm prontas da página) e travava para todo o resto —
  // ninguém de outro batalhão conseguiria escolher a fração, que é obrigatória.
  assert.match(
    ler("proxy.ts"),
    /"\/api\/cop2026\/unidades"/,
    "proxy.ts não libera /api/cop2026/unidades: o seletor de unidade cai no login."
  );
});

test("a rota pública de unidades não toca em pessoa", () => {
  const fonte = ler(ROTA);
  for (const proibido of ["p4_efetivo", "nome_guerra", "cop_auditoria_lancamento"]) {
    assert.ok(
      !fonte.includes(proibido),
      `${ROTA} passou a alcançar "${proibido}". A rota é pública e só pode devolver ` +
        `organograma: nome e código de OPM.`
    );
  }
});
