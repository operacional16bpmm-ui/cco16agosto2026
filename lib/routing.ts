/**
 * Cálculo de "viatura mais próxima" por TEMPO REAL de deslocamento.
 * Usa um servidor OSRM self-hosted (endpoint /table) — nunca uma API de
 * terceiro, para não enviar posição/placa para fora (LGPD). Configure o
 * endereço em OSRM_URL (ex.: http://localhost:5000). Sem OSRM_URL, retorna
 * null e a UI cai para a distância em linha reta (Haversine) como aproximação.
 */

export type Coord = { lat: number; lng: number };

export function osrmConfigurado() {
  return Boolean(process.env.OSRM_URL);
}

/** Distância aproximada em metros (Haversine) — fallback sem OSRM. */
export function haversineM(a: Coord, b: Coord): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

export type ViaturaProxima<T> = {
  viatura: T;
  tempoSeg: number | null;
  distanciaM: number;
};

/**
 * Ordena viaturas pela proximidade à ocorrência. Com OSRM, por tempo de
 * deslocamento (matriz /table, origem única × N destinos); sem OSRM, por
 * distância em linha reta.
 */
export async function viaturaMaisProxima<T extends Coord>(
  ocorrencia: Coord,
  viaturas: T[]
): Promise<ViaturaProxima<T>[]> {
  if (viaturas.length === 0) return [];

  const base = process.env.OSRM_URL;
  if (base) {
    try {
      const coords = [ocorrencia, ...viaturas]
        .map((c) => `${c.lng},${c.lat}`)
        .join(";");
      const destinations = viaturas.map((_, i) => i + 1).join(";");
      const url = `${base}/table/v1/driving/${coords}?sources=0&destinations=${destinations}&annotations=duration,distance`;
      // Sem timeout, um OSRM que aceita a conexão TCP e nunca responde
      // pendurava o render inteiro de /despacho (rota crítica durante uma
      // ocorrência aberta) até o timeout default da plataforma (~min).
      const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const data = (await res.json()) as {
          durations?: number[][];
          distances?: number[][];
        };
        const dur = data.durations?.[0] ?? [];
        const dist = data.distances?.[0] ?? [];
        return viaturas
          .map((v, i) => ({
            viatura: v,
            tempoSeg: dur[i] ?? null,
            distanciaM: Math.round(dist[i] ?? haversineM(ocorrencia, v)),
          }))
          .sort((a, b) => (a.tempoSeg ?? Infinity) - (b.tempoSeg ?? Infinity));
      }
    } catch {
      // Cai para Haversine abaixo.
    }
  }

  return viaturas
    .map((v) => ({
      viatura: v,
      tempoSeg: null,
      distanciaM: Math.round(haversineM(ocorrencia, v)),
    }))
    .sort((a, b) => a.distanciaM - b.distanciaM);
}
