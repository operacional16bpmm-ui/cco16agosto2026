# Manual de Operação: Portal CCO-16

**Classificação: USO RESTRITO, 16º BPM/M. Proibida a divulgação externa.**

Este manual destina-se ao operador de serviço no Centro de Controle Operacional do 16º BPM/M. Ele cobre o uso do portal web e do Painel de Tempo Real (Muralha Paulista + WhatsApp). Para a parte técnica (deploy, ingestão, credenciais), consulte o `README.md` na raiz do repositório.

---

## 1. Acesso ao portal

1. Abra `https://portal-cco16.vercel.app/` em qualquer navegador.
2. As áreas públicas dispensam login: página inicial, `/16bpmm` (página institucional do Batalhão) e `/estudos` (Núcleo de Análise Criminal, dados agregados de fonte aberta).
3. Toda a **Sala de Comando** (P1 a P4, SPJMD, KPIs, logística, reserva de armas etc.) exige login. Ao acessar qualquer rota protegida sem sessão, o portal redireciona para `/login` e retorna à página desejada após autenticar.
4. Credenciais: usuário e senha institucionais definidos pelo administrador do sistema (não há autocadastro). A sessão dura **12 horas** (um turno) e expira sozinha; basta logar de novo.
5. Ao encerrar o serviço em computador compartilhado, clique em **Sair** no canto superior direito.

## 2. Navegação na Sala de Comando

- A barra lateral esquerda lista todas as seções. Destaques:
  - **Overview**: visão geral do Batalhão.
  - **P2**: produção de inteligência (dados sensíveis; trate como reservado).
  - **P4 / Logística / Reserva de armas**: material, frota, armamento, galeria de fotos.
  - **SPJMD**: procedimentos de justiça e disciplina.
  - **Frescor das Fontes** (`/fontes`): mostra, para cada fonte de dados, quando foi a última atualização e se está online, atrasada ou sem sinal. **Consulte antes de tomar decisão com base em número do portal.**
- O rodapé de todas as páginas mostra "Dados atualizados há X". Se o valor estiver alto (dias), acione o administrador antes de usar os dados em relatório.

## 3. Painel de Tempo Real (bookmarklet Muralha + WhatsApp)

O painel de alertas em tempo real **não fica no portal**: ele roda por cima do Muralha Paulista, no navegador do operador, usando a sessão que o próprio operador já tem. Ritual de ativação:

1. Abra o **Muralha Paulista/Detecta** e faça login normalmente (SSO institucional).
2. Com a página do Muralha aberta, clique no favorito **"CCO-16 Painel"** na barra de favoritos do navegador (é o bookmarklet instalado pelo administrador).
3. O painel cobre a tela com fundo escuro e passa a atualizar sozinho **a cada 60 segundos**, consultando as áreas de Vila Andrade, Campo Limpo e Morumbi (janela de 6 horas).
4. Coluna esquerda: mensagens dos grupos de WhatsApp monitorados (integração Evolution API). Área principal: cartões de alerta agrupados por natureza, do mais grave para o menos grave.
5. Um **beep** soa quando entra alerta crítico novo (roubo, procurado, homicídio, sequestro). O toggle "som" liga/desliga.
6. Botões úteis:
   - **Imprimir** em cada cartão: gera documento A4 com cabeçalho institucional, pronto para PDF (permita pop-ups no navegador).
   - **Excel**: baixa CSV com todos os alertas enriquecidos (placa, chassi, leitor, coordenadas).
   - **Atualizar**: força consulta imediata.
   - **Fechar**: encerra o painel (o Muralha continua aberto por baixo).

### Solução de problemas do painel

| Sintoma | Causa provável | Ação |
|---|---|---|
| "sem resposta" no canto superior | Sessão do Muralha expirou | Feche o painel, recarregue o Muralha, logue de novo e clique no favorito outra vez |
| "WKT ausente" | Favorito instalado errado (polígonos não gravados) | Reinstale o bookmarklet completo fornecido pelo administrador |
| Sem mensagens de WhatsApp | Webhook/Evolution API parado | Verifique o serviço no computador do CCO (pasta `Desktop\CCO16-Whatsapp`) |
| Cartões sem foto/detalhe | Enriquecimento ainda em andamento | Aguarde; os detalhes chegam em segundo plano |
| Impressão não abre | Pop-up bloqueado | Permita pop-ups para o domínio do Muralha |

## 4. Regras de uso dos dados

1. Todo conteúdo da Sala de Comando é de **uso restrito**: não fotografe a tela, não repasse prints em grupos não institucionais, não exporte dados para equipamento particular.
2. Dados pessoais (nomes, CPFs, placas, fotos) são tratados sob a LGPD para finalidade de segurança pública; use somente no estrito interesse do serviço.
3. Relatórios impressos pelo painel carregam a marcação "documento operacional: uso restrito"; arquive ou destrua conforme as normas da Unidade.
4. Divergência entre o portal e o sistema de origem (SIOPM, Muralha, SEI): **prevalece o sistema de origem**. O portal é ferramenta de apoio à decisão, não fonte primária.

## 5. Suporte

Responsável técnico: administrador do CCO-16 (P3/CCO do 16º BPM/M). Registre a hora, a página e o print do erro ao reportar.
