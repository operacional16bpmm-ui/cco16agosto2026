"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { CalendarDays, Menu, X } from "lucide-react";

const SECOES = [
  { id: "inicio", rotulo: "Início" },
  { id: "historico", rotulo: "Histórico" },
  { id: "brasao", rotulo: "Brasão" },
  { id: "patrono", rotulo: "Patrono" },
  { id: "comandante", rotulo: "Comandante" },
  { id: "companhias", rotulo: "Companhias" },
  { id: "destaques", rotulo: "Destaques" },
  { id: "herois", rotulo: "Heróis" },
  { id: "memoria", rotulo: "Memória" },
  { id: "redes", rotulo: "Redes" },
  { id: "contato", rotulo: "Contato" },
];

export function Cabecalho() {
  const [aberto, setAberto] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-branco/10 bg-azul-noite/95 backdrop-blur">
      <div className="faixa-institucional h-1 w-full" />
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-2.5 md:px-6">
        <a href="#inicio" className="flex items-center gap-3.5">
          <Image
            src="/16bpmm/geral/brasao.png"
            alt="Brasão do 16º BPM/M"
            width={64}
            height={90}
            className="h-14 w-auto md:h-16"
            priority
          />
          {/* As duas linhas de subordinação ocupam duas linhas cada no celular e
              inchavam o cabeçalho fixo — só aparecem a partir de sm. */}
          <span className="leading-tight">
            <span className="hidden text-[9px] font-semibold uppercase tracking-[0.16em] text-branco/55 sm:block md:text-[10px]">
              Secretaria da Segurança Pública
            </span>
            <span className="hidden text-[9px] font-semibold uppercase tracking-[0.16em] text-branco/55 sm:block md:text-[10px]">
              Polícia Militar do Estado de São Paulo
            </span>
            <span className="block font-serif text-lg text-ouro sm:mt-1 md:text-2xl">
              16º BPM/M
            </span>
            <span className="block text-[10px] font-medium uppercase tracking-[0.12em] text-branco/70 md:text-xs">
              1º Ten PM Fernão
              <span className="hidden sm:inline"> Gomes Loureiro</span>
            </span>
          </span>
        </a>

        <nav className="hidden items-center gap-5 text-[13px] font-medium text-branco/80 xl:flex">
          {SECOES.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="transition-colors hover:text-ouro">
              {s.rotulo}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          <Link
            href="/16bpmm/calendario"
            className="hidden items-center gap-1.5 rounded-md bg-ouro-velho px-3.5 py-2 text-xs font-bold text-azul-noite shadow-inst transition-colors hover:bg-ouro sm:inline-flex"
          >
            <CalendarDays size={14} /> Calendário
          </Link>
          <span className="hidden h-8 w-px bg-branco/15 sm:block" aria-hidden />
          <Link
            href="/"
            className="hidden rounded-md bg-vermelho px-3.5 py-2 text-xs font-bold text-white shadow-inst transition-colors hover:bg-vermelho-fundo sm:inline-block"
          >
            Sala de Operações →
          </Link>
          <button
            type="button"
            onClick={() => setAberto((v) => !v)}
            aria-label={aberto ? "Fechar menu" : "Abrir menu"}
            aria-expanded={aberto}
            className="rounded-md p-2 text-branco xl:hidden"
          >
            {aberto ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {aberto && (
        <nav className="border-t border-branco/10 bg-azul-noite px-4 pb-4 xl:hidden">
          <ul className="grid grid-cols-2 gap-1 pt-2">
            {SECOES.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  onClick={() => setAberto(false)}
                  className="block rounded-md px-3 py-2.5 text-sm font-medium text-branco/85 hover:bg-branco/10"
                >
                  {s.rotulo}
                </a>
              </li>
            ))}
            <li className="col-span-2 mt-1">
              <Link
                href="/16bpmm/calendario"
                onClick={() => setAberto(false)}
                className="flex items-center justify-center gap-1.5 rounded-md bg-ouro-velho px-3 py-2.5 text-center text-sm font-bold text-azul-noite"
              >
                <CalendarDays size={15} /> Calendário de Eventos
              </Link>
            </li>
            <li className="col-span-2 mt-1">
              <Link
                href="/"
                onClick={() => setAberto(false)}
                className="block rounded-md bg-vermelho px-3 py-2.5 text-center text-sm font-bold text-white"
              >
                Sala de Operações →
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
