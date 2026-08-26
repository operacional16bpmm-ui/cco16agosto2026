// Seed de HOMOLOGAÇÃO — dados de exemplo na área do 16º BPM/M para as telas
// mostrarem conteúdo real do banco. Idempotente: limpa e reinsere as tabelas
// operacionais de demonstração. Rodar: node scripts/seed-homologacao.mjs
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const URL_BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_BASE || !KEY) throw new Error("Faltam URL/service key no .env.local");

const H = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
};

async function req(method, path, body, prefer) {
  const res = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    method,
    headers: prefer ? { ...H, Prefer: prefer } : H,
    body: body ? JSON.stringify(body) : undefined,
  });
  const txt = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${txt}`);
  return txt ? JSON.parse(txt) : null;
}

async function limpar(tabela) {
  // deleta tudo (id não nulo) — tabelas de demonstração
  await fetch(`${URL_BASE}/rest/v1/${tabela}?id=not.is.null`, { method: "DELETE", headers: H });
}

async function main() {
  for (const t of ["viatura_posicoes", "alertas_placa", "ocorrencias", "cameras", "reserva_armas", "operacoes_especiais", "viaturas"]) {
    await limpar(t);
  }

  const viaturas = await req(
    "POST",
    "viaturas",
    [
      { prefixo: "M-16010", tipo: "radiopatrulha", cia_id: 1, situacao: "disponivel" },
      { prefixo: "M-16022", tipo: "radiopatrulha", cia_id: 2, situacao: "empenhada" },
      { prefixo: "M-16031", tipo: "radiopatrulha", cia_id: 3, situacao: "disponivel" },
      { prefixo: "FT-1601", tipo: "forca_tatica", situacao: "disponivel" },
    ],
    "return=representation"
  );
  const pos = { "M-16010": [-23.598, -46.72], "M-16022": [-23.61, -46.745], "M-16031": [-23.585, -46.71], "FT-1601": [-23.62, -46.73] };
  await req(
    "POST",
    "viatura_posicoes",
    viaturas.map((v) => ({ viatura_id: v.id, lat: pos[v.prefixo][0], lng: pos[v.prefixo][1] }))
  );

  await req("POST", "cameras", [
    { identificacao: "Av. Giovanni Gronchi, 1400", origem: "comercio", natureza: "privada", endereco: "Av. Giovanni Gronchi, 1400 - Morumbi", lat: -23.616, lng: -46.727, tem_ocr: true, cia_id: 1, status: "homologada" },
    { identificacao: "Ponte do Morumbi", origem: "muralha", natureza: "publica", endereco: "Ponte Eng. Roberto Rossi Zuccolo", lat: -23.595, lng: -46.715, tem_ocr: true, status: "homologada" },
    { identificacao: "Terminal Campo Limpo", origem: "smart_sampa", natureza: "publica", endereco: "Terminal Campo Limpo", lat: -23.638, lng: -46.758, tem_ocr: false, status: "homologada" },
    { identificacao: "Condomínio Portal do Morumbi", origem: "condominio", natureza: "privada", endereco: "R. Dr. Laerte Setúbal", lat: -23.606, lng: -46.722, tem_ocr: false, cia_id: 1, status: "em_analise" },
  ]);

  await req("POST", "ocorrencias", [
    { titulo: "Veículo roubado — placa MOR-2A18", origem: "muralha_ocr", natureza: "Roubo de veículo", endereco: "Av. Giovanni Gronchi, 1400", lat: -23.616, lng: -46.727, cia_id: 1, placa: "MOR2A18", status: "aberta" },
    { titulo: "Perturbação do sossego (pancadão)", origem: "denuncia", natureza: "Perturbação", endereco: "Vila Sônia", lat: -23.6, lng: -46.72, cia_id: 2, status: "aberta" },
    { titulo: "Disparos de arma de fogo", origem: "copom", natureza: "Disparo", endereco: "Jd. Colombo", lat: -23.611, lng: -46.746, cia_id: 3, status: "em_despacho" },
  ]);

  await req("POST", "reserva_armas", [
    { categoria: "Pistola .40", total: 120, disponiveis: 96, retidas: 4, data_referencia: "2026-07-17" },
    { categoria: "Espingarda cal. 12", total: 20, disponiveis: 18, retidas: 0, data_referencia: "2026-07-17" },
    { categoria: "Carabina .40", total: 16, disponiveis: 12, retidas: 2, data_referencia: "2026-07-17" },
  ]);

  await req("POST", "operacoes_especiais", [
    { nome: "Jogo no Morumbi", tipo: "evento_esportivo", local: "Estádio do Morumbi", cia_id: 1, efetivo_reforco: 60, inicio: "2026-07-19T20:00:00-03:00", status: "planejada" },
    { nome: "Ato na USP", tipo: "manifestacao", local: "Cidade Universitária", cia_id: 2, efetivo_reforco: 24, inicio: "2026-07-17T15:00:00-03:00", status: "ativa" },
  ]);

  await req("POST", "alertas_placa", [
    { placa: "MOR2A18", motivo: "roubo_furto", confianca_ocr: 92, status: "pendente" },
    { placa: "DTF7K05", motivo: "mandado", confianca_ocr: 78, status: "pendente" },
  ]);

  console.log("Seed de homologação concluído.");
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
