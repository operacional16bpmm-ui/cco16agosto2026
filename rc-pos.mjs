import { combineBarSizeList } from "recharts/es6/state/selectors/combiners/combineBarSizeList.js";
import { combineAllBarPositions } from "recharts/es6/state/selectors/combiners/combineAllBarPositions.js";

const barGap = 4, barCategoryGap = "10%";
const antes = [{ stackId: undefined, dataKey: "feito", barSize: 7, type: "bar", hide: false }];
const depois = [
  { stackId: undefined, dataKey: "parado", barSize: 11, type: "bar", hide: false },
  { stackId: undefined, dataKey: "feito", barSize: 7, type: "bar", hide: false },
];

function calc(bars, plotW) {
  const bandSize = plotW / 30;
  const sizeList = combineBarSizeList(bars, undefined, plotW);
  const pos = combineAllBarPositions(sizeList, undefined, barGap, barCategoryGap, bandSize, bandSize, undefined);
  return { bandSize, pos };
}

for (const [rot, plotW] of [["Batalhao desktop", 1148], ["Fracao lg:2col", 589], ["Celular 390px", 290]]) {
  console.log(`\n=== ${rot} · plot=${plotW}px · banda=${(plotW / 30).toFixed(2)}px (1 dia) ===`);
  for (const [nome, bars] of [["ANTES (só feito)", antes], ["DEPOIS (parado+feito)", depois]]) {
    const { bandSize, pos } = calc(bars, plotW);
    const centroBanda = bandSize / 2;
    const linha = pos.map((p) => {
      const centroBarra = p.position.offset + p.position.size / 2;
      return `${p.dataKeys[0]}: x=${p.position.offset.toFixed(2)} larg=${p.position.size.toFixed(2)} centro=${centroBarra.toFixed(2)} desvio=${(centroBarra - centroBanda).toFixed(2)}px`;
    });
    console.log(` ${nome}  [centro da banda = ${centroBanda.toFixed(2)}]`);
    linha.forEach((l) => console.log("   " + l));
  }
}
