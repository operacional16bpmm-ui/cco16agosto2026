const { combineBarSizeList } = require("recharts/lib/state/selectors/combiners/combineBarSizeList");
const { combineAllBarPositions } = require("recharts/lib/state/selectors/combiners/combineAllBarPositions");

const barGap = 4, barCategoryGap = "10%";
const antes = [{ stackId: undefined, dataKey: "feito", barSize: 7 }];
const depois = [
  { stackId: undefined, dataKey: "parado", barSize: 11 },
  { stackId: undefined, dataKey: "feito", barSize: 7 },
];

for (const [rot, plotW] of [["Batalhao desktop", 1148], ["Fracao lg:2col", 589], ["Celular ~390", 290]]) {
  const bandSize = plotW / 30;
  console.log(`\n=== ${rot} · plot=${plotW}px · banda(1 dia)=${bandSize.toFixed(2)}px · centro=${(bandSize/2).toFixed(2)} ===`);
  for (const [nome, bars] of [["ANTES (só feito)", antes], ["DEPOIS (parado+feito)", depois]]) {
    const sizeList = combineBarSizeList(bars, undefined, plotW);
    const pos = combineAllBarPositions(sizeList, undefined, barGap, barCategoryGap, bandSize, bandSize, undefined);
    console.log(`  ${nome}`);
    for (const p of pos) {
      const c = p.position.offset + p.position.size / 2;
      console.log(`    ${p.dataKeys[0]}: x=${p.position.offset.toFixed(2)} larg=${p.position.size.toFixed(2)} centro=${c.toFixed(2)} desvio_do_tick=${(c - bandSize/2).toFixed(2)}px`);
    }
  }
}
