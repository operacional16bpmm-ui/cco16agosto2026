// Script único, de uso pontual: cataloga em massa os documentos institucionais
// do 16º BPM/M criados/modificados nos últimos 45 dias na tabela
// documentos_secoes, sem marcar nenhuma seção de visibilidade (checkboxes
// ficam em branco para o usuário decidir o destino depois).
//
// Uso: node --env-file=.env.local scripts/catalogar-documentos-45dias.mjs
import { readFileSync, statSync } from "node:fs";
import { basename, extname } from "node:path";
import { createClient } from "@supabase/supabase-js";

const dryRun = process.argv.includes("--check");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!dryRun && (!url || !serviceRoleKey)) {
  console.error("Faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY em .env.local");
  process.exit(1);
}
const supabase = dryRun ? null : createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
const BUCKET = "documentos-secoes";

const REGEX_MARCAS_DIACRITICAS = new RegExp("[\\u0300-\\u036f]", "g");
function sanitizarNomeParaStorage(nome) {
  const semAcento = nome.normalize("NFD").replace(REGEX_MARCAS_DIACRITICAS, "");
  return semAcento.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/-+/g, "-");
}

function tipoMime(caminho) {
  const ext = extname(caminho).toLowerCase();
  return (
    {
      ".pdf": "application/pdf",
      ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".doc": "application/msword",
      ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      ".md": "text/markdown",
      ".html": "text/html",
    }[ext] ?? "application/octet-stream"
  );
}

// Manifesto: cada entrada é { arquivo, nome, data }.
// "data" é a data real do documento (usada em criado_em, para ordenar/catalogar por dia).
// Links (páginas já publicadas em /estudos) usam { link, nome, data } em vez de "arquivo".
const HOME = process.env.USERPROFILE ?? "C:\\Users\\13934852785";
const manifesto = [
  // --- Dossiê CCO-16 002/2026 (Everton) ---
  { arquivo: `${HOME}\\Desktop\\DOSSIE_CCO16_002-2026_EVERTON\\06_DOCUMENTO\\RELATORIO_TECNICO_INTELIGENCIA_002-2026.docx`, nome: "[2026-08-03] Dossiê 002/2026 (Everton) — Relatório Técnico de Inteligência.docx" },
  { arquivo: `${HOME}\\Desktop\\DOSSIE_CCO16_002-2026_EVERTON\\06_DOCUMENTO\\RELATORIO_TECNICO_INTELIGENCIA_002-2026.pdf`, nome: "[2026-08-03] Dossiê 002/2026 (Everton) — Relatório Técnico de Inteligência.pdf" },
  { arquivo: `${HOME}\\Desktop\\DOSSIE_CCO16_002-2026_EVERTON\\06_DOCUMENTO\\ERRATA_TECNICA_RELATORIO_ANTERIOR.docx`, nome: "[2026-08-03] Dossiê 002/2026 (Everton) — Errata Técnica ao Relatório Anterior.docx" },
  { arquivo: `${HOME}\\Desktop\\DOSSIE_CCO16_002-2026_EVERTON\\06_DOCUMENTO\\NOTA_TECNICA_IMAGEM_E_LEITURA_DE_PLACA.docx`, nome: "[2026-08-03] Dossiê 002/2026 (Everton) — Nota Técnica: Imagem e Leitura de Placa.docx" },
  { arquivo: `${HOME}\\Desktop\\DOSSIE_CCO16_002-2026_EVERTON\\06_DOCUMENTO\\CARTILHA_P2_COMO_ENXERGAR_UMA_FOTO.docx`, nome: "[2026-08-03] Dossiê 002/2026 (Everton) — Cartilha P2: Como Enxergar uma Foto.docx" },

  // --- Dossiê CCO-16 001/2026 ---
  { arquivo: `${HOME}\\Desktop\\Arquivos\\DOSSIE_CCO16_001-2026\\DOSSIE_CCO16_RESERVADO.html`, nome: "[2026-07-18] Dossiê CCO-16 001/2026 — Reservado.html" },
  { arquivo: `${HOME}\\Desktop\\Arquivos\\DOSSIE_CCO16_001-2026\\mandado_alex_terto_de_souza.pdf`, nome: "[2026-07-18] Dossiê CCO-16 001/2026 — Mandado Alex Terto de Souza.pdf" },

  // --- Apostila / Organograma / Dossiê PCC ---
  { arquivo: `${HOME}\\Desktop\\Arquivos\\Documentos\\Apostila PCC - 16BPMM.docx`, nome: "[2026-07-18] Apostila PCC - 16BPMM.docx" },
  { arquivo: `${HOME}\\Desktop\\Arquivos\\Documentos\\Organograma PCC - Sintonias - 16BPMM.docx`, nome: "[2026-07-19] Organograma PCC - Sintonias - 16BPMM.docx" },
  { arquivo: `${HOME}\\Desktop\\Arquivos\\Documentos\\DOSSIE_PCC_PMESP.docx`, nome: "[2026-07-18] Dossiê PCC PMESP.docx" },

  // --- Investigação MIND7 ---
  { arquivo: `${HOME}\\Desktop\\Arquivos\\Investigacao-MIND7-2026-07-18\\01-Dossie-Consolidado.md`, nome: "[2026-08-03] Investigação MIND7 — Dossiê Consolidado.md" },
  { arquivo: `${HOME}\\Desktop\\Arquivos\\Investigacao-MIND7-2026-07-18\\02-Relatorio-Infraestrutura-OSINT.md`, nome: "[2026-07-21] Investigação MIND7 — Relatório de Infraestrutura OSINT.md" },
  { arquivo: `${HOME}\\Desktop\\Arquivos\\Investigacao-MIND7-2026-07-18\\03-Memorando-Origem-dos-Dados.md`, nome: "[2026-07-21] Investigação MIND7 — Memorando de Origem dos Dados.md" },
  { arquivo: `${HOME}\\Desktop\\Arquivos\\Investigacao-MIND7-2026-07-18\\05-Metodologia-e-Limites.md`, nome: "[2026-07-21] Investigação MIND7 — Metodologia e Limites.md" },
  { arquivo: `${HOME}\\Desktop\\Arquivos\\Investigacao-MIND7-2026-07-18\\06-Reforco-e-Correcoes-2026-08-03.md`, nome: "[2026-08-03] Investigação MIND7 — Reforço e Correções.md" },

  // --- DEJEM ---
  { arquivo: `${HOME}\\Desktop\\Relatórios DEjem\\Relatorio gerencial maio 2026 (estadual).pdf`, nome: "[2026-07-30] DEJEM — Relatório Gerencial Maio 2026 (Estadual).pdf" },
  { arquivo: `${HOME}\\Desktop\\Relatórios DEjem\\Relatorio dejem janeiro até junho.pdf`, nome: "[2026-07-30] DEJEM — Relatório Janeiro a Junho 2026.pdf" },

  // --- Comunicação Social ---
  { arquivo: `${HOME}\\Desktop\\Dashboard_Data\\comunicacao-social\\RELATORIO_REDES_SOCIAIS_MIDIA_16BPMM_2026-07-17.docx`, nome: "[2026-07-17] Comunicação Social — Relatório Redes Sociais e Mídia 16BPM/M.docx" },

  // --- Briefing / consolidação / geral ---
  { arquivo: `${HOME}\\Desktop\\Arquivos\\Documentos\\Briefing_Executivo_16BPMM_2026-07-04_v1.pdf`, nome: "[2026-07-16] Briefing Executivo 16BPM/M v1.pdf" },
  { arquivo: `${HOME}\\Desktop\\RELATORIO_GERAL_TRABALHOS_2026-07-31.md`, nome: "[2026-07-31] Relatório Geral de Trabalhos — Consolidação Jul/2026.md" },

  // --- Armas apreendidas ---
  { arquivo: `${HOME}\\Desktop\\RELATORIO_ARMAS_APREENDIDAS_16BPMM_2021-2026.pdf`, nome: "[2026-08-03] Relatório Armas Apreendidas 16BPM/M (2021-2026).pdf" },
  { arquivo: `${HOME}\\Desktop\\ANEXO_FONTES_ARMAS_APREENDIDAS_16BPMM.pdf`, nome: "[2026-08-03] Anexo — Fontes Armas Apreendidas 16BPM/M.pdf" },

  // --- Sala de Operações ---
  { arquivo: `${HOME}\\Desktop\\Arquivos\\Documentos\\Sala de Operações do 16º BPM_M - Estudo técnico normas e diretrizes.pdf`, nome: "[2026-07-22] Sala de Operações 16º BPM/M — Estudo Técnico, Normas e Diretrizes.pdf" },
  { arquivo: `${HOME}\\Desktop\\Arquivos\\Documentos\\OS_003.pdf`, nome: "[2026-07-22] Sala de Operações 16º BPM/M — OS 003.pdf" },

  // --- Descarga de material (OS/Despacho) ---
  { arquivo: `${HOME}\\Desktop\\Arquivos\\Documentos\\Fluxo_Descarga_Material_16BPMM.pdf`, nome: "[2026-07-17] Fluxo de Descarga de Material 16BPM/M.pdf" },

  // --- Termos de sigilo ---
  { arquivo: `${HOME}\\Desktop\\TERMO MURALHA PAULISTA - Sd PM 231936-5 FABRICIO.docx`, nome: "[2026-08-04] Termo de Confidencialidade — Muralha Paulista.docx" },
  { arquivo: `${HOME}\\Desktop\\TERMO DE CONFIDENCIALIDADE E SIGILO COPOM ONLINE.docx`, nome: "[2026-08-04] Termo de Confidencialidade e Sigilo — COPOM Online.docx" },
  { arquivo: `${HOME}\\Desktop\\TERMO DE CONFIDENCIALIDADE E SIGILO SIOPMWEB ONLINE.docx`, nome: "[2026-08-04] Termo de Confidencialidade e Sigilo — SIOPMWEB Online.docx" },
  { arquivo: `${HOME}\\Desktop\\TERMO DE CONFIDENCIALIDADE E SIGILO DISQUE - DENÚNCIA.docx`, nome: "[2026-08-04] Termo de Confidencialidade e Sigilo — Disque-Denúncia.docx" },

  // --- Cruzamento de placas ---
  { arquivo: `${HOME}\\Desktop\\Cruzamento_Placas_Relatório.pdf`, nome: "[2026-08-03] Cruzamento de Placas — Relatório.pdf" },
  { arquivo: `${HOME}\\Desktop\\Cruzamento_Placas_2026-08-03.xlsx`, nome: "[2026-08-03] Cruzamento de Placas — Planilha.xlsx" },
  { arquivo: `${HOME}\\Desktop\\Analise_Placas_2026-08-03.pdf`, nome: "[2026-08-03] Análise de Placas.pdf" },
  { arquivo: `${HOME}\\Desktop\\Mapa_Calor_Placas.html`, nome: "[2026-08-03] Mapa de Calor de Placas.html" },
  { arquivo: `${HOME}\\Desktop\\Mapa_Calor_Placas_Procurados_16BPMM.html`, nome: "[2026-08-03] Mapa de Calor — Placas Procuradas 16BPM/M.html" },

  // --- Documento mestre / arquitetura CCO-16 ---
  { arquivo: `${HOME}\\Desktop\\Arquivos\\Pasta_Mestre_Sync\\Projeto_CCO_16BPMM\\DOCUMENTO_MESTRE_CCO16.md`, nome: "[2026-07-17] Documento Mestre — Projeto CCO-16.md" },
  { arquivo: `${HOME}\\Desktop\\Arquivos\\Pasta_Mestre_Sync\\Projeto_CCO_16BPMM\\ARQUITETURA_PORTAL_CCO16.md`, nome: "[2026-07-17] Arquitetura do Portal CCO-16.md" },
  { arquivo: `${HOME}\\Desktop\\Arquivos\\Pasta_Mestre_Sync\\Projeto_CCO_16BPMM\\RELATORIO_ADVOGADO_DIABO_E_MELHORIAS.md`, nome: "[2026-07-17] Relatório Advogado do Diabo e Melhorias — CCO-16.md" },

  // --- Organogramas ---
  { arquivo: `${HOME}\\Desktop\\Arquivos\\Dados_e_Codigo\\organograma_soic_16bpm.html`, nome: "[2026-07-15] Organograma SOIC 16º BPM/M.html" },

  // --- Controle de material / escalas / planos ---
  { arquivo: `${HOME}\\Desktop\\Arquivos\\Planilhas\\Controle_Unico_Material_16BPMM.xlsx`, nome: "[2026-07-16] Controle Único de Material 16BPM/M.xlsx" },
  { arquivo: `${HOME}\\Desktop\\Arquivos\\Documentos\\Escala Nova 20JUL a 26JUL.xlsx`, nome: "[2026-07-17] Escala de Serviço 20 a 26/JUL/2026.xlsx" },
  { arquivo: `${HOME}\\Desktop\\Arquivos\\Documentos\\Plano-de-Comando-2024-2031-v1.1.pdf`, nome: "[2026-07-16] Plano de Comando 2024-2031 v1.1.pdf" },

  // --- Notas de reunião ---
  { arquivo: `${HOME}\\Desktop\\Arquivos\\Documentos\\Major_transcricao_organizada.md`, nome: "[2026-07-15] Notas de Reunião — Transcrição Organizada (Major).md" },
];

// Links já publicados publicamente em /estudos — cadastrados como link, sem duplicar arquivo.
const linksExistentes = [
  { url: "https://16bpmm-pmesp.vercel.app/estudos/alvo-farmacia.html", nome: "[2026-07-31] Estudo de Área — Alvo Farmácia.html", data: "2026-07-31" },
  { url: "https://16bpmm-pmesp.vercel.app/estudos/precos-das-drogas.html", nome: "[2026-07-20] Estudo de Área — Preços das Drogas.html", data: "2026-07-20" },
  { url: "https://16bpmm-pmesp.vercel.app/estudos/cadeia-do-trafico.html", nome: "[2026-07-20] Estudo de Área — Cadeia do Tráfico.html", data: "2026-07-20" },
  { url: "https://16bpmm-pmesp.vercel.app/estudos/paraisopolis-territorio.html", nome: "[2026-07-20] Estudo de Área — Território Paraisópolis.html", data: "2026-07-20" },
];

function extrairDataDoNome(nome) {
  const m = nome.match(/^\[(\d{4}-\d{2}-\d{2})\]/);
  return m ? new Date(`${m[1]}T12:00:00-03:00`).toISOString() : new Date().toISOString();
}

let ok = 0;
let falhas = [];

for (const item of manifesto) {
  try {
    const stat = statSync(item.arquivo);
    if (!stat.isFile()) throw new Error("não é um arquivo");
    if (dryRun) {
      console.log(`OK  ${item.arquivo}`);
      ok++;
      continue;
    }
    const bytes = readFileSync(item.arquivo);
    const nomeOriginal = basename(item.arquivo);
    const storagePath = `${crypto.randomUUID()}-${sanitizarNomeParaStorage(nomeOriginal)}`;
    const mime = tipoMime(item.arquivo);

    const { error: erroUpload } = await supabase.storage.from(BUCKET).upload(storagePath, bytes, {
      contentType: mime,
      upsert: false,
    });
    if (erroUpload) throw new Error(`upload: ${erroUpload.message}`);

    const { error: erroInsert } = await supabase.from("documentos_secoes").insert({
      nome_exibicao: item.nome,
      nome_arquivo_original: nomeOriginal,
      storage_path: storagePath,
      tipo_mime: mime,
      tamanho_bytes: stat.size,
      enviado_por: "catalogação automática — últimos 45 dias",
      tipo: "arquivo",
      criado_em: extrairDataDoNome(item.nome),
    });
    if (erroInsert) {
      await supabase.storage.from(BUCKET).remove([storagePath]);
      throw new Error(`insert: ${erroInsert.message}`);
    }
    ok++;
    console.log(`OK  ${item.nome}`);
  } catch (e) {
    falhas.push({ arquivo: item.arquivo, erro: e.message });
    console.log(`FAIL ${item.arquivo} — ${e.message}`);
  }
}

for (const link of dryRun ? [] : linksExistentes) {
  try {
    const { error } = await supabase.from("documentos_secoes").insert({
      nome_exibicao: link.nome,
      nome_arquivo_original: link.nome,
      tipo: "link",
      url_externa: link.url,
      enviado_por: "catalogação automática — últimos 45 dias",
      criado_em: new Date(`${link.data}T12:00:00-03:00`).toISOString(),
    });
    if (error) throw new Error(error.message);
    ok++;
    console.log(`OK  (link) ${link.nome}`);
  } catch (e) {
    falhas.push({ arquivo: link.url, erro: e.message });
    console.log(`FAIL (link) ${link.url} — ${e.message}`);
  }
}

console.log(`\n${ok} documento(s) catalogado(s) com sucesso.`);
if (falhas.length) {
  console.log(`${falhas.length} falha(s):`);
  for (const f of falhas) console.log(` - ${f.arquivo}: ${f.erro}`);
}
