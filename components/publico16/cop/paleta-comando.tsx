"use client";

import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { Search, Shield, Users, Calendar, Filter, Download } from "lucide-react";
import { ROTULO_SUBUNIDADE, ORDEM_SUBUNIDADES, type LancamentoCop } from "@/lib/cop2026";

export function PaletaComando({
  lancamentos,
  onSelecionarFracao,
  onSelecionarSemana,
  onExportarCsv,
}: {
  lancamentos: LancamentoCop[];
  onSelecionarFracao: (fracao: string) => void;
  onSelecionarSemana: (semana: string) => void;
  onExportarCsv: () => void;
}) {
  const [aberto, setAberto] = useState(false);

  // Ativação por Ctrl+K ou Cmd+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName))) {
        e.preventDefault();
        setAberto((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Extrai policiais únicos para busca
  const policiais = Array.from(
    new Map(
      lancamentos
        .filter((l) => l.re || l.nomeGuerra)
        .map((l) => [
          l.re || l.nomeGuerra,
          {
            re: l.re,
            nome: l.nomeGuerra,
            posto: l.posto,
            subunidade: l.subunidade,
            videos: l.videos,
          },
        ])
    ).values()
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="card-interativo flex items-center gap-2 rounded-lg border border-borda bg-tatico-super px-3 py-1.5 text-xs text-texto-suave shadow-xs transition-colors hover:border-vermelho/50 hover:text-branco"
        title="Busca rápida (Ctrl + K)"
      >
        <Search className="h-3.5 w-3.5 text-vermelho" />
        <span className="font-medium">Buscar RE, Auditor ou Fração...</span>
        <kbd className="dados rounded bg-branco/10 px-1.5 py-0.5 text-[10px] font-bold text-branco/70">
          Ctrl K
        </kbd>
      </button>

      {aberto && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-preto-inst/80 p-4 pt-20 backdrop-blur-xs"
          onClick={() => setAberto(false)}
        >
          <div
            className="w-full max-w-xl overflow-hidden rounded-xl border border-borda bg-tatico-super shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Command
              className="w-full bg-transparent"
              label="Paleta de Comando Tático CCO16"
            >
              <div className="flex items-center border-b border-borda px-3">
                <Search className="h-4 w-4 text-vermelho" />
                <Command.Input
                  placeholder="Digite o RE, nome de guerra, fração ou ação..."
                  className="w-full bg-transparent p-3 text-sm text-branco placeholder:text-texto-suave focus:outline-hidden"
                  autoFocus
                />
              </div>

              <Command.List className="max-h-80 overflow-y-auto p-2 text-sm text-texto-suave">
                <Command.Empty className="p-4 text-center text-xs text-texto-suave">
                  Nenhum policial, fração ou comando correspondente encontrado.
                </Command.Empty>

                {/* Frações do Batalhão */}
                <Command.Group heading="Frações do 16º BPM/M" className="px-2 py-1 text-[11px] font-bold text-ouro uppercase">
                  {ORDEM_SUBUNIDADES.map((sub) => (
                    <Command.Item
                      key={sub}
                      onSelect={() => {
                        onSelecionarFracao(sub);
                        setAberto(false);
                      }}
                      className="flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-xs text-branco hover:bg-branco/10 aria-selected:bg-branco/15"
                    >
                      <div className="flex items-center gap-2">
                        <Shield className="h-3.5 w-3.5 text-vermelho" />
                        <span>{ROTULO_SUBUNIDADE[sub] ?? sub}</span>
                      </div>
                      <span className="text-[10px] text-texto-suave">Filtrar fração</span>
                    </Command.Item>
                  ))}
                </Command.Group>

                {/* Semanas Operacionais */}
                <Command.Group heading="Semanas Operacionais" className="mt-2 px-2 py-1 text-[11px] font-bold text-ouro uppercase">
                  {[1, 2, 3, 4].map((sem) => (
                    <Command.Item
                      key={sem}
                      onSelect={() => {
                        onSelecionarSemana(String(sem));
                        setAberto(false);
                      }}
                      className="flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-xs text-branco hover:bg-branco/10 aria-selected:bg-branco/15"
                    >
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-sinal-conforme" />
                        <span>Semana {sem} (240 evidências Btl)</span>
                      </div>
                      <span className="text-[10px] text-texto-suave">Isolar semana</span>
                    </Command.Item>
                  ))}
                </Command.Group>

                {/* Policiais / Auditores */}
                {policiais.length > 0 && (
                  <Command.Group heading="Auditores e Policiais" className="mt-2 px-2 py-1 text-[11px] font-bold text-ouro uppercase">
                    {policiais.slice(0, 15).map((p) => (
                      <Command.Item
                        key={`${p.re}-${p.nome}`}
                        onSelect={() => {
                          onSelecionarFracao(p.subunidade);
                          setAberto(false);
                        }}
                        className="flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-xs text-branco hover:bg-branco/10 aria-selected:bg-branco/15"
                      >
                        <div className="flex items-center gap-2">
                          <Users className="h-3.5 w-3.5 text-texto-suave" />
                          <span>
                            {p.posto ? `${p.posto} ` : ""}
                            <strong>{p.nome || p.re}</strong>
                          </span>
                          {p.re && (
                            <span className="dados text-[11px] text-texto-suave">
                              (RE {p.re})
                            </span>
                          )}
                        </div>
                        <span className="dados text-[11px] text-texto-suave">
                          {ROTULO_SUBUNIDADE[p.subunidade] ?? p.subunidade}
                        </span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                {/* Ações Rápidas */}
                <Command.Group heading="Ações Executivas" className="mt-2 px-2 py-1 text-[11px] font-bold text-ouro uppercase">
                  <Command.Item
                    onSelect={() => {
                      onExportarCsv();
                      setAberto(false);
                    }}
                    className="flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-xs text-branco hover:bg-branco/10 aria-selected:bg-branco/15"
                  >
                    <div className="flex items-center gap-2">
                      <Download className="h-3.5 w-3.5 text-ouro" />
                      <span>Exportar Dados Completos em CSV</span>
                    </div>
                    <span className="text-[10px] text-texto-suave">Download imediato</span>
                  </Command.Item>
                  <Command.Item
                    onSelect={() => {
                      onSelecionarFracao("todas");
                      onSelecionarSemana("todas");
                      setAberto(false);
                    }}
                    className="flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-xs text-branco hover:bg-branco/10 aria-selected:bg-branco/15"
                  >
                    <div className="flex items-center gap-2">
                      <Filter className="h-3.5 w-3.5 text-vermelho" />
                      <span>Limpar Todos os Filtros (Visão Geral do Batalhão)</span>
                    </div>
                    <span className="text-[10px] text-texto-suave">Reset</span>
                  </Command.Item>
                </Command.Group>
              </Command.List>
            </Command>
          </div>
        </div>
      )}
    </>
  );
}
