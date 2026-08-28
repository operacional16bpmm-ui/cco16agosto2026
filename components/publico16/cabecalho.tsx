"use client";

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

function EmblemaBpmLogo() {
  return (
    <svg
      viewBox="0 0 260 260"
      role="img"
      aria-label="Emblema 16º BPM/M"
      className="h-[220px] w-auto drop-shadow-[0_12px_24px_rgba(0,0,0,0.38)] md:h-[280px]"
    >
      <defs>
        <linearGradient id="metalSilver" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#f5f7fb" />
          <stop offset="16%" stopColor="#b4bac3" />
          <stop offset="32%" stopColor="#f0f4f7" />
          <stop offset="52%" stopColor="#878f99" />
          <stop offset="72%" stopColor="#edf3f8" />
          <stop offset="100%" stopColor="#69757f" />
        </linearGradient>
        <linearGradient id="metalGold" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#fbeab2" />
          <stop offset="26%" stopColor="#d6aa53" />
          <stop offset="52%" stopColor="#f9efc5" />
          <stop offset="100%" stopColor="#8d6e2d" />
        </linearGradient>
      </defs>

      <g>
        <circle cx="130" cy="130" r="118" fill="url(#metalSilver)" stroke="#2a3038" strokeWidth="11" />
        <circle cx="130" cy="130" r="105" fill="none" stroke="url(#metalGold)" strokeWidth="7" />
        <circle cx="130" cy="130" r="94" fill="none" stroke="#eaeff5" strokeOpacity="0.7" strokeWidth="2" />
      </g>

      <g opacity="0.95">
        <path d="M130 38v24M130 198v24M38 130h24M198 130h24" stroke="#d4be81" strokeWidth="5" strokeLinecap="round" />
      </g>

      <g fill="none" stroke="#d9d5c9" strokeOpacity="0.6" strokeWidth="2">
        <path d="M52 92h156M52 168h156M90 58v145M170 58v145" />
      </g>

      <g transform="translate(58 52)">
        <path d="M45 26 57 6l12 20h18l-15 14 5 18-20-12-20 12 5-18-15-14h18Z" fill="#e0b446" stroke="#f4e1a0" strokeWidth="2" />
        <path d="M12 32h68l-4 54H16L12 32Z" fill="#a21322" stroke="#f4d86b" strokeWidth="2" />
        <path d="M18 34h56v12H18z" fill="#d9b45d" opacity="0.85" />
        <path d="M20 49h52v12H20z" fill="#d9b45d" opacity="0.7" />
        <path d="M28 71h35l-4 14H32l-4-14Z" fill="#d9b45d" opacity="0.9" />
      </g>

      <g transform="translate(16 36)">
        <path d="M74 98c0-30 22-54 56-54 34 0 56 24 56 54v12H74V98Z" fill="#d5dee7" opacity="0.22" />
        <path d="M130 64c20 0 35 15 35 35v27h-70v-27c0-20 15-35 35-35Z" fill="#d8dfe6" opacity="0.9" />
        <path d="M102 104h56v41h-56z" fill="#253042" opacity="0.85" />
        <circle cx="130" cy="78" r="27" fill="#e5edf4" opacity="0.95" />
        <circle cx="130" cy="78" r="22" fill="#1d2530" opacity="0.78" />
        <circle cx="130" cy="76" r="11" fill="#edf4fb" opacity="0.9" />
      </g>

      <g transform="translate(0 0)" fontFamily="Georgia, serif">
        <text x="130" y="118" textAnchor="middle" fill="#ecdfab" fontSize="15" fontWeight="700" letterSpacing="2.2">
          16º BPM/M
        </text>
        <text x="130" y="146" textAnchor="middle" fill="#dfe5ee" fontSize="9" fontWeight="700" letterSpacing="1.2">
          SEMPRE
        </text>
      </g>

      <g transform="translate(0 34)">
        <path d="M70 156h120l-16 18H86l-16-18Z" fill="#b31d2e" stroke="#f3d67a" strokeWidth="3" />
        <text x="130" y="171" textAnchor="middle" fill="#f4e7be" fontSize="16" fontWeight="800" letterSpacing="1.5">
          002
        </text>
      </g>

      <text x="130" y="216" textAnchor="middle" fill="#f1d57d" fontSize="18" fontWeight="800" letterSpacing="2">
        1963
      </text>
    </svg>
  );
}

export function Cabecalho() {
  const [aberto, setAberto] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-branco/10 bg-azul-noite/95 backdrop-blur">
      <div className="faixa-institucional h-1 w-full" />
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-2.5 md:px-6">
        <a href="#inicio" className="flex items-center gap-3.5">
          <div className="flex shrink-0 items-center justify-center rounded-full bg-transparent p-0.5">
            <EmblemaBpmLogo />
          </div>
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
