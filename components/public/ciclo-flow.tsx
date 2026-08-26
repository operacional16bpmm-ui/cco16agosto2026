"use client";

import { useEffect, useState } from "react";
import { Eye, BellRing, Merge, UserCheck, Radio, Crosshair, type LucideIcon } from "lucide-react";

type Passo = { hora: string; titulo: string; texto: string; icon: LucideIcon };

const PASSOS: Passo[] = [
  {
    hora: "14:32:00",
    titulo: "A câmera vê",
    texto: "Uma câmera de videomonitoramento lê a placa de um veículo roubado na área do Batalhão.",
    icon: Eye,
  },
  {
    hora: "14:32:01",
    titulo: "O alerta chega à Sala de Operações",
    texto: "Local, sentido, foto e histórico da placa entram no painel do Centro de Controle Operacional.",
    icon: BellRing,
  },
  {
    hora: "14:32:03",
    titulo: "A fusão acontece",
    texto: "O sistema cruza quem está de serviço agora com a viatura que cobre aquele setor.",
    icon: Merge,
  },
  {
    hora: "14:32:15",
    titulo: "O operador decide",
    texto: "A IA sugere, o policial valida. A cadeia de comando é acionada: CFP → CGP → equipe do setor.",
    icon: UserCheck,
  },
  {
    hora: "14:32:40",
    titulo: "A equipe recebe tudo",
    texto: "Placa, foto, modus operandi, últimas leituras de radar e sentido de fuga chegam à equipe de Força Tática ou de Rádio Patrulha mais próxima.",
    icon: Radio,
  },
  {
    hora: "14:3X",
    titulo: "Interceptação",
    texto: "Acompanhamento em tempo real pelas câmeras, com a central de emergência informada em paralelo. A Sala de Operações complementa o 190 — não o substitui.",
    icon: Crosshair,
  },
];

const AUTOPLAY_MS = 3800;

export function CicloFlow() {
  const [ativo, setAtivo] = useState(0);
  const [pausado, setPausado] = useState(false);

  useEffect(() => {
    if (pausado) return;
    const id = setInterval(() => {
      setAtivo((i) => (i + 1) % PASSOS.length);
    }, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [pausado]);

  const escolher = (i: number) => {
    setAtivo(i);
    setPausado(true);
  };

  const progresso = (ativo / (PASSOS.length - 1)) * 100;

  return (
    <div onMouseEnter={() => setPausado(true)} onMouseLeave={() => setPausado(false)}>
      {/* Trilho com os nós do fluxograma */}
      <div className="relative">
        <div className="absolute left-0 right-0 top-6 hidden h-0.5 bg-branco/15 sm:block" />
        <div
          className="absolute left-0 top-6 hidden h-0.5 bg-vermelho transition-all duration-700 ease-out sm:block"
          style={{ width: `${progresso}%` }}
        />
        <div className="grid grid-cols-2 gap-y-8 sm:grid-cols-6 sm:gap-y-0">
          {PASSOS.map((passo, i) => {
            const Icon = passo.icon;
            const estado = i === ativo ? "ativo" : i < ativo ? "feito" : "pendente";
            return (
              <button
                key={passo.titulo}
                onClick={() => escolher(i)}
                className="group relative z-10 flex flex-col items-center gap-2 text-center"
                aria-current={estado === "ativo"}
              >
                <span
                  className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                    estado === "ativo"
                      ? "scale-110 border-vermelho bg-vermelho text-branco shadow-lg shadow-vermelho/30"
                      : estado === "feito"
                        ? "border-vermelho/60 bg-branco text-vermelho"
                        : "border-branco/25 bg-azul-noite text-branco/50 group-hover:border-branco/50"
                  }`}
                >
                  <Icon size={18} strokeWidth={2} />
                </span>
                <span className={`tempo text-[11px] font-bold ${estado === "ativo" ? "text-vermelho" : "text-branco/40"}`}>
                  {passo.hora}
                </span>
                <span
                  className={`max-w-[110px] text-xs font-semibold leading-tight ${
                    estado === "ativo" ? "text-branco" : "text-branco/55"
                  }`}
                >
                  {passo.titulo}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Painel de detalhe do passo ativo */}
      <div
        key={ativo}
        className="animar-entrada mt-10 rounded-2xl border border-branco/15 bg-branco/5 p-6"
      >
        <div className="flex items-start gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-vermelho text-branco">
            {(() => {
              const Icon = PASSOS[ativo].icon;
              return <Icon size={18} />;
            })()}
          </span>
          <div>
            <p className="tempo text-sm font-bold text-ouro">{PASSOS[ativo].hora}</p>
            <h3 className="mt-0.5 text-xl font-bold text-branco">{PASSOS[ativo].titulo}</h3>
            <p className="mt-1.5 max-w-2xl text-branco/75">{PASSOS[ativo].texto}</p>
          </div>
        </div>
      </div>

      {/* Indicador de progresso (bolinhas) */}
      <div className="mt-4 flex justify-center gap-1.5">
        {PASSOS.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === ativo ? "w-6 bg-vermelho" : "w-1.5 bg-branco/20"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
