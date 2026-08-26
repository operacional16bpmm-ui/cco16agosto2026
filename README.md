# Portal CCO-16 · 16º BPM/M

**Classificação: USO RESTRITO, 16º BPM/M.**

Portal do Centro de Controle Operacional do 16º Batalhão de Polícia Militar Metropolitano. Consolida dados das seções do Estado-Maior (P1 a P4), SPJMD, logística e comunicação social numa Sala de Comando protegida por login, mais uma vitrine pública institucional.

Manual do operador (usuário final): [`docs/MANUAL_OPERACAO.md`](docs/MANUAL_OPERACAO.md).

## Arquitetura

| Camada | Tecnologia |
|---|---|
| Frontend/backend | Next.js 16 (App Router), React 19, Tailwind 4 |
| Banco | Supabase (Postgres), acessado no servidor via service role |
| Autenticação | Login simples fail-closed (`lib/auth-simples.ts`): cookie de sessão assinado com HMAC-SHA256, 12 h de validade; `proxy.ts` bloqueia por padrão toda rota que não esteja na lista pública |
| Ingestão | Scripts Python em `ingest/` (framework de seções, migration 007) e `scripts/` (P4, fotos, reserva de armas) |
| Hospedagem | Vercel |

Grupos de rota:

- `app/(public)`: página inicial, `/16bpmm` (página institucional) e `/estudos` (Núcleo de Análise Criminal). Sem login, por decisão documentada em `proxy.ts`.
- `app/(command)`: Sala de Comando inteira, protegida. Página nova aqui nasce protegida automaticamente (fail-closed).
- `app/(auth)`: `/login`.

## Variáveis de ambiente

Copie `.env.example` para `.env.local` (dev) e configure as mesmas no painel da Vercel (produção). Sem valor padrão em nenhuma delas: ausência = login sempre falha.

| Variável | Uso |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Consultas server-side (`lib/db.ts`) e scripts de ingestão. **Nunca** expor no cliente |
| `CCO16_USUARIO` / `CCO16_SENHA` | Credencial única do portal |
| `CCO16_SESSAO_SEGREDO` | String aleatória forte que assina o cookie de sessão |

## Desenvolvimento

```bash
npm install
npm run dev
```

## Deploy

O deploy automático por git está **bloqueado** na Vercel (fica em BLOCKED). Publicar sempre por CLI:

```bash
npx vercel deploy --prod --yes
```

## Rotina de ingestão de dados

A ingestão é executada manualmente pelo administrador, no computador com acesso à rede interna (unidades `Z:\16BPMM` e planilhas das seções). Frequência recomendada: **semanal**, ou sob demanda quando uma seção entrega planilha nova.

1. Ambiente: `pip install -r ingest/requirements.txt` (uma vez). As credenciais são lidas do `.env.local` da raiz: não existe segundo arquivo de segredos.
2. Cada seção tem um módulo em `ingest/secoes/` (`p1_qse.py`, `p3_rac.py`, `spjmd.py`, `forca_tatica.py` etc.). Rodar o módulo da seção cuja planilha foi atualizada:

   ```bash
   python -m ingest.secoes.p1_qse
   ```

3. O framework comum (`ingest/common/carga.py`) abre um lote em `ingest_batches`, faz upsert em `fato_secao`/`agregado_dimensional`/`arquivos_fonte` (com SHA-256 do arquivo de origem) e fecha o lote. Isso alimenta a view `source_freshness`, exibida em `/fontes` e no rodapé global da Sala de Comando.
4. P4/Logística tem pipeline próprio em `scripts/`: `ingest_p4.py` (registros), `thumbs_p4.py` (miniaturas da galeria), `reserva_armas_from_p4.py`.
5. Regra das planilhas: **ler todas as abas** de cada `.xlsx`: cada aba é um dado diferente; nunca descartar o arquivo pela primeira aba.
6. Conferência pós-ingestão: abrir `/fontes` e verificar que a fonte ficou "online" com "atualizado há instantes".

## Banco e migrations

Schema em `supabase/schema.sql`; evolução em `supabase/migrations/00X_*.sql` (aplicar em ordem no SQL Editor do Supabase ou via MCP). Backup: exportar dump pelo painel do Supabase (Database → Backups) antes de migration destrutiva; backups diários automáticos do plano também se aplicam.

## Segurança: resumo

- Fail-closed em duas camadas: `proxy.ts` (rota) e `lib/auth-simples.ts` (credencial ausente = login impossível).
- Tarja "uso restrito" visível em todas as páginas da Sala de Comando (layout do grupo `(command)`).
- `robots: noindex` no layout raiz.
- Dados pessoais tratados sob LGPD, finalidade de segurança pública; auditoria de ações do operador na migration 006.
