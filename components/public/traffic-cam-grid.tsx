"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

/**
 * Feeds públicos reais da CET (Companhia de Engenharia de Tráfego) — as mesmas
 * câmeras usadas no painel interno da Sala de Operações. Nenhuma fica dentro da
 * circunscrição do 16º BPM/M; servem como leitura de acesso/fluxo de entrada
 * na região (Iguatemi/Faria Lima, Cidade Jardim/Nove de Julho etc.).
 * Sem autenticação — dado público, servido por cameras.cetsp.com.br.
 */
const CAMERAS = [
  { p: 200, t: "Iguatemi x Av. Brig. Faria Lima", n: 50 },
  { p: 220, t: "Cidade Jardim x Nove de Julho (Túnel Max Feffer)", n: 50 },
  { p: 195, t: "Av. Brasil x Henrique Schaumann x Rebouças", n: 50 },
  { p: 222, t: "Helio Pellegrino x R. Diogo Jácome", n: 50 },
  { p: 224, t: "Ibirapuera x R. Ipê", n: 50 },
  { p: 210, t: "Brig. Luís Antônio x Al. Santos", n: 50 },
];


const CAM_MS = 8000;
// Época fixa só para manter todos os visitantes sincronizados no mesmo frame do
// buffer circular da CET — não é o instante exato, é uma janela de ~6-7 min.
const CAM_FASE = Date.UTC(2026, 6, 18, 22, 33, 11);

function indiceAtual(n: number) {
  const d = Math.floor((Date.now() - CAM_FASE) / CAM_MS);
  return (((d % n) + n) % n) + 1;
}

function urlFrame(p: number, i: number, tick: number) {
  return `https://cameras.cetsp.com.br/Cams/${p}/${i}.jpg?t=${tick}`;
}

function CameraFeed({ cam }: { cam: (typeof CAMERAS)[number] }) {
  const [src, setSrc] = useState(() => urlFrame(cam.p, indiceAtual(cam.n), 0));
  const [erro, setErro] = useState(false);
  const tick = useRef(0);

  useEffect(() => {
    const id = setInterval(() => {
      tick.current += 1;
      setSrc(urlFrame(cam.p, indiceAtual(cam.n), tick.current));
    }, CAM_MS);
    return () => clearInterval(id);
  }, [cam.p, cam.n]);

  return (
    <div className="relative aspect-video overflow-hidden rounded-xl border border-branco/10 bg-preto">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={`Câmera CET — ${cam.t}`}
        className="h-full w-full object-cover"
        style={{ opacity: erro ? 0.15 : 1 }}
        onError={() => setErro(true)}
        onLoad={() => setErro(false)}
      />
      <div className="absolute right-2.5 top-2.5 flex items-center gap-1.5 rounded-md bg-preto/60 px-2 py-1 backdrop-blur-sm">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animar-ao-vivo absolute inline-flex h-full w-full rounded-full bg-vermelho" />
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-branco">Ao vivo</span>
      </div>
      <div className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-md bg-preto/55 px-1.5 py-1 backdrop-blur-sm">
        <Image
          src="/brand/16bpmm.png"
          alt="16º BPM/M"
          width={18}
          height={25}
          className="h-4 w-auto opacity-90"
        />
      </div>
      {erro && (
        <div className="absolute inset-0 flex items-center justify-center text-[11px] text-branco/50">
          feed indisponível
        </div>
      )}
    </div>
  );
}

export function TrafficCamGrid() {
  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-3">
        {CAMERAS.map((cam) => (
          <CameraFeed key={cam.p} cam={cam} />
        ))}
      </div>

    </div>
  );
}
