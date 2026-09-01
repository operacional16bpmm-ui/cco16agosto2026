/**
 * Resolve o alias `@/` do tsconfig quando um módulo do app roda fora do Next.
 *
 * Os scripts de verificação importam `lib/*.ts` direto (ver o cabeçalho de
 * `verificar-tendencia-cop.mjs`). Isso funciona enquanto o módulo importado não
 * usa o alias — mas `lib/cop2026-metricas.ts` importa `@/lib/cop2026`, e aí o
 * Node para com ERR_MODULE_NOT_FOUND, porque `@/` é convenção do bundler e não
 * do runtime.
 *
 * Uso:
 *   node --experimental-strip-types --import ./scripts/alias-loader.mjs <script>
 *
 * `registerHooks` é síncrono e roda na mesma thread — não precisa de worker nem
 * de loader assíncrono, que era o caminho antigo e mais caro.
 */
import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const raiz = dirname(dirname(fileURLToPath(import.meta.url)));

/** O import com alias vem sem extensão (`@/lib/cop2026`), porque quem a
 *  resolvia era o bundler. Aqui a busca é explícita, na ordem em que o projeto
 *  usa: módulo .ts, componente .tsx, pasta com index. */
const CANDIDATOS = [".ts", ".tsx", "/index.ts", "/index.tsx", ""];

registerHooks({
  resolve(especificador, contexto, proximo) {
    if (especificador.startsWith("@/")) {
      const base = resolve(raiz, especificador.slice(2));
      for (const sufixo of CANDIDATOS) {
        if (existsSync(base + sufixo)) {
          return { url: pathToFileURL(base + sufixo).href, shortCircuit: true };
        }
      }
      throw new Error(`alias-loader: não achei ${especificador} a partir de ${raiz}`);
    }
    return proximo(especificador, contexto);
  },
});
