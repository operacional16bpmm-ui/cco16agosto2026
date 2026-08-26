"use client";

import { useMemo } from "react";
import Map, { Marker, Source, Layer, NavigationControl } from "react-map-gl/maplibre";
import type { StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export type PontoViatura = {
  id: string;
  prefixo: string;
  lat: number;
  lng: number;
  situacao: "disponivel" | "empenhada" | "indisponivel" | "baixada";
};

export type PontoCamera = {
  id: string;
  identificacao: string;
  lat: number;
  lng: number;
  tem_ocr?: boolean;
};

export type PontoOcorrencia = {
  id: string;
  lat: number;
  lng: number;
  peso?: number;
};

// Basemap escuro (CARTO dark) — raster, sem chave de API. Atribuição obrigatória.
const ESTILO_TATICO: StyleSpecification = {
  version: 8,
  sources: {
    carto: {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
        "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "© OpenStreetMap · © CARTO",
    },
  },
  layers: [{ id: "carto", type: "raster", source: "carto" }],
};

// Centro aproximado da área do 16º BPM/M (região Butantã/Morumbi/Campo Limpo).
const CENTRO = { longitude: -46.73, latitude: -23.6, zoom: 12 };

const CORES_VIATURA: Record<PontoViatura["situacao"], string> = {
  disponivel: "#34d399",
  empenhada: "#fbbf24",
  indisponivel: "#9ca3af",
  baixada: "#6b7280",
};

export function OperationalMap({
  viaturas = [],
  cameras = [],
  ocorrencias = [],
}: {
  viaturas?: PontoViatura[];
  cameras?: PontoCamera[];
  ocorrencias?: PontoOcorrencia[];
}) {
  const heatGeoJson = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: ocorrencias.map((o) => ({
        type: "Feature" as const,
        properties: { peso: o.peso ?? 1 },
        geometry: { type: "Point" as const, coordinates: [o.lng, o.lat] },
      })),
    }),
    [ocorrencias]
  );

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl border border-branco/10">
      <Map
        initialViewState={CENTRO}
        mapStyle={ESTILO_TATICO}
        attributionControl={{ compact: true }}
        style={{ width: "100%", height: "100%" }}
      >
        <NavigationControl position="top-right" showCompass={false} />

        {ocorrencias.length > 0 && (
          <Source id="ocorrencias" type="geojson" data={heatGeoJson}>
            <Layer
              id="heat"
              type="heatmap"
              paint={{
                "heatmap-weight": ["get", "peso"],
                "heatmap-intensity": 0.9,
                "heatmap-radius": 28,
                "heatmap-opacity": 0.75,
                "heatmap-color": [
                  "interpolate",
                  ["linear"],
                  ["heatmap-density"],
                  0, "rgba(48,83,136,0)",
                  0.3, "rgba(48,83,136,0.6)",
                  0.6, "rgba(222,216,69,0.7)",
                  1, "rgba(213,52,65,0.9)",
                ],
              }}
            />
          </Source>
        )}

        {cameras.map((c) => (
          <Marker key={c.id} longitude={c.lng} latitude={c.lat} anchor="center">
            <span
              title={`Câmera ${c.identificacao}${c.tem_ocr ? " · OCR" : ""}`}
              className="block h-2.5 w-2.5 rounded-sm border border-sky-300 bg-sky-400/70"
            />
          </Marker>
        ))}

        {viaturas.map((v) => (
          <Marker key={v.id} longitude={v.lng} latitude={v.lat} anchor="center">
            <span
              title={`VTR ${v.prefixo} · ${v.situacao}`}
              className="block h-3.5 w-3.5 rounded-full border-2 border-tatico-fundo shadow"
              style={{ backgroundColor: CORES_VIATURA[v.situacao] }}
            />
          </Marker>
        ))}
      </Map>

      {/* Legenda */}
      <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg border border-branco/10 bg-tatico-fundo/85 px-3 py-2 text-[11px] text-branco/70 backdrop-blur">
        <p className="mb-1 font-semibold uppercase tracking-wide text-branco/50">Legenda</p>
        <div className="flex flex-col gap-1">
          <span className="flex items-center gap-2">
            <i className="h-3 w-3 rounded-full" style={{ background: "#34d399" }} /> VTR disponível
          </span>
          <span className="flex items-center gap-2">
            <i className="h-3 w-3 rounded-full" style={{ background: "#fbbf24" }} /> VTR empenhada
          </span>
          <span className="flex items-center gap-2">
            <i className="h-2.5 w-2.5 rounded-sm border border-sky-300 bg-sky-400/70" /> Câmera
          </span>
          <span className="flex items-center gap-2">
            <i className="h-3 w-3 rounded-full bg-gradient-to-r from-azul via-ouro to-vermelho" /> Calor de ocorrências
          </span>
        </div>
      </div>
    </div>
  );
}
