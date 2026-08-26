"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, MapPin } from "lucide-react";
import {
  CATEGORIAS,
  type CategoriaEvento,
  type EventoCalendario,
} from "@/lib/dados-calendario-16bpmm";

/* Datas circulam aqui como "AAAA-MM-DD" e as comparações são de texto puro:
   nada de new Date("AAAA-MM-DD"), que o JS interpreta como meia-noite UTC e,
   em São Paulo (UTC-3), recua para o dia anterior. Date só entra com ano, mês
   e dia explícitos, sempre no fuso do navegador. */

function paraISO(ano: number, mesZero: number, dia: number): string {
  return `${ano}-${String(mesZero + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

function deISO(iso: string): Date {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(a, m - 1, d);
}

function cobreDia(evento: EventoCalendario, iso: string): boolean {
  return evento.dataFim
    ? evento.data <= iso && iso <= evento.dataFim
    : evento.data === iso;
}

function rotuloData(evento: EventoCalendario): string {
  const inicio = deISO(evento.data);
  const curta: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit" };
  if (evento.dataFim) {
    const fim = deISO(evento.dataFim);
    return `${inicio.toLocaleDateString("pt-BR", curta)} a ${fim.toLocaleDateString("pt-BR", curta)}`;
  }
  return inicio.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const DIAS_SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];

function CartaoEvento({ evento, hojeISO }: { evento: EventoCalendario; hojeISO: string | null }) {
  const cat = CATEGORIAS[evento.categoria];
  const acontecendo =
    hojeISO !== null && cobreDia(evento, hojeISO);

  return (
    <article className="rounded-xl border border-borda bg-branco p-4 shadow-inst">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cat.selo}`}
        >
          {cat.rotulo}
        </span>
        <span className="tempo text-xs font-semibold text-texto-suave">
          {rotuloData(evento)}
        </span>
        {acontecendo && (
          <span className="rounded-full bg-vermelho px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
            Hoje
          </span>
        )}
      </div>
      <h4 className="mt-2 text-sm font-bold leading-snug text-azul-noite">{evento.titulo}</h4>
      {(evento.hora || evento.local) && (
        <div className="mt-2 space-y-1">
          {evento.hora && (
            <p className="flex items-center gap-1.5 text-xs text-texto-suave">
              <Clock3 size={12} className="shrink-0 text-ouro-velho" /> {evento.hora}
            </p>
          )}
          {evento.local && (
            <p className="flex items-start gap-1.5 text-xs leading-snug text-texto-suave">
              <MapPin size={12} className="mt-0.5 shrink-0 text-ouro-velho" /> {evento.local}
            </p>
          )}
        </div>
      )}
      {evento.descricao && (
        <p className="mt-2 text-xs leading-relaxed text-texto-suave">{evento.descricao}</p>
      )}
    </article>
  );
}

export function CalendarioEventos({ eventos }: { eventos: EventoCalendario[] }) {
  /* "Hoje" e o mês exibido nascem null e só ganham valor no cliente: o HTML
     pré-renderizado sai neutro (esqueleto) e não há divergência de hidratação
     nem dependência do fuso UTC do build. */
  const [hojeISO, setHojeISO] = useState<string | null>(null);
  const [mesVisivel, setMesVisivel] = useState<{ ano: number; mesZero: number } | null>(null);
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null);

  useEffect(() => {
    const agora = new Date();
    setHojeISO(paraISO(agora.getFullYear(), agora.getMonth(), agora.getDate()));
    setMesVisivel({ ano: agora.getFullYear(), mesZero: agora.getMonth() });
  }, []);

  const eventosOrdenados = useMemo(
    () => [...eventos].sort((a, b) => a.data.localeCompare(b.data)),
    [eventos]
  );

  const proximos = useMemo(() => {
    if (!hojeISO) return [];
    return eventosOrdenados.filter((e) => (e.dataFim ?? e.data) >= hojeISO).slice(0, 6);
  }, [eventosOrdenados, hojeISO]);

  if (!mesVisivel) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-40 rounded-2xl bg-superficie-2" />
        <div className="h-[420px] rounded-2xl bg-superficie-2" />
      </div>
    );
  }

  const { ano, mesZero } = mesVisivel;
  const inicioMesISO = paraISO(ano, mesZero, 1);
  const totalDias = new Date(ano, mesZero + 1, 0).getDate();
  const fimMesISO = paraISO(ano, mesZero, totalDias);
  const deslocamento = new Date(ano, mesZero, 1).getDay();

  const nomeMesBruto = new Date(ano, mesZero, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  const nomeMes = nomeMesBruto.charAt(0).toUpperCase() + nomeMesBruto.slice(1);

  const eventosDoMes = eventosOrdenados.filter(
    (e) => e.data <= fimMesISO && (e.dataFim ?? e.data) >= inicioMesISO
  );
  const eventosListados = diaSelecionado
    ? eventosOrdenados.filter((e) => cobreDia(e, diaSelecionado))
    : eventosDoMes;

  const navegar = (delta: number) => {
    // Functional update: cliques em sequência rápida somam, em vez de todos
    // partirem do mesmo mês ainda não re-renderizado.
    setMesVisivel((prev) => {
      if (!prev) return prev;
      const alvo = new Date(prev.ano, prev.mesZero + delta, 1);
      return { ano: alvo.getFullYear(), mesZero: alvo.getMonth() };
    });
    setDiaSelecionado(null);
  };

  const irParaHoje = () => {
    if (!hojeISO) return;
    const hoje = deISO(hojeISO);
    setMesVisivel({ ano: hoje.getFullYear(), mesZero: hoje.getMonth() });
    setDiaSelecionado(hojeISO);
  };

  return (
    <div className="space-y-10">
      {/* ------------------------------------------------- próximos eventos */}
      {proximos.length > 0 && (
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-vermelho">
            <CalendarDays size={15} /> Próximos eventos
          </h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {proximos.map((e) => (
              <CartaoEvento key={`${e.data}-${e.titulo}`} evento={e} hojeISO={hojeISO} />
            ))}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- grade do mês */}
      <div className="grid items-start gap-6 lg:grid-cols-[1.25fr_1fr]">
        <div className="rounded-2xl border border-borda bg-branco p-5 shadow-inst md:p-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-serif text-xl text-azul-noite md:text-2xl">{nomeMes}</h3>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={irParaHoje}
                className="rounded-lg border border-borda px-3 py-1.5 text-xs font-semibold text-texto-suave transition-colors hover:border-azul/40 hover:text-azul"
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={() => navegar(-1)}
                aria-label="Mês anterior"
                className="rounded-lg border border-borda p-1.5 text-texto-suave transition-colors hover:border-azul/40 hover:text-azul"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => navegar(1)}
                aria-label="Próximo mês"
                className="rounded-lg border border-borda p-1.5 text-texto-suave transition-colors hover:border-azul/40 hover:text-azul"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-7 gap-1 text-center">
            {DIAS_SEMANA.map((d, i) => (
              <span
                key={`${d}-${i}`}
                className="pb-1 text-[11px] font-bold uppercase text-texto-suave"
              >
                {d}
              </span>
            ))}

            {Array.from({ length: deslocamento }).map((_, i) => (
              <span key={`vazio-${i}`} />
            ))}

            {Array.from({ length: totalDias }).map((_, i) => {
              const dia = i + 1;
              const iso = paraISO(ano, mesZero, dia);
              const doDia = eventosOrdenados.filter((e) => cobreDia(e, iso));
              const pontuais = doDia.filter((e) => e.data === iso);
              const emPeriodo = doDia.length > 0 && pontuais.length === 0;
              const ehHoje = hojeISO === iso;
              const selecionado = diaSelecionado === iso;
              const faixa = emPeriodo ? CATEGORIAS[doDia[0].categoria].faixa : "";

              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => setDiaSelecionado(selecionado ? null : iso)}
                  aria-label={`Dia ${dia}${doDia.length ? `, ${doDia.length} evento(s)` : ""}`}
                  className={`relative flex aspect-square flex-col items-center justify-center rounded-lg text-sm transition-colors ${
                    selecionado
                      ? "bg-azul-noite font-bold text-branco"
                      : `${faixa || "hover:bg-superficie"} text-texto`
                  } ${ehHoje && !selecionado ? "ring-2 ring-vermelho" : ""}`}
                >
                  <span className="tempo">{dia}</span>
                  {pontuais.length > 0 && (
                    <span className="absolute bottom-1.5 flex gap-0.5">
                      {pontuais.slice(0, 3).map((e, j) => (
                        <span
                          key={j}
                          className={`h-1.5 w-1.5 rounded-full ${
                            selecionado ? "bg-ouro" : CATEGORIAS[e.categoria].ponto
                          }`}
                        />
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ------------------------------------------------------ legenda */}
          <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 border-t border-borda pt-4">
            {(Object.keys(CATEGORIAS) as CategoriaEvento[]).map((c) => (
              <span key={c} className="flex items-center gap-1.5 text-[11px] text-texto-suave">
                <span className={`h-2 w-2 rounded-full ${CATEGORIAS[c].ponto}`} />
                {CATEGORIAS[c].rotulo}
              </span>
            ))}
          </div>
        </div>

        {/* ------------------------------------------------- lista do mês */}
        <div>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-azul-noite">
              {diaSelecionado
                ? `Dia ${deISO(diaSelecionado).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                  })}`
                : "Eventos do mês"}
            </h3>
            {diaSelecionado && (
              <button
                type="button"
                onClick={() => setDiaSelecionado(null)}
                className="text-xs font-semibold text-azul hover:underline"
              >
                Ver o mês inteiro
              </button>
            )}
          </div>

          <div className="mt-4 space-y-3">
            {eventosListados.length === 0 && (
              <p className="rounded-xl border border-dashed border-borda bg-branco px-4 py-6 text-center text-sm text-texto-suave">
                Nenhum evento lançado {diaSelecionado ? "para este dia" : "neste mês"}. A agenda
                é atualizada pela Sala de Operações do Batalhão.
              </p>
            )}
            {eventosListados.map((e) => (
              <CartaoEvento key={`${e.data}-${e.titulo}`} evento={e} hojeISO={hojeISO} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
