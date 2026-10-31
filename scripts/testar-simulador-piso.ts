// Confere o motor do simulador do piso (rodar: npx tsx scripts/testar-simulador-piso.ts).
import assert from "node:assert/strict";
import { calcularPiso, fatorCorrecao, fmtBRL } from "../lib/simulador/calculo-piso";

const base = {
  horasMensais: 150,
  ajuizamento: "2026-10",
  reflexos13Ferias: true,
  pagou13: true,
  pagouTerco: true,
  feriasNaoGozadas: false,
  fgts: false,
};

// 1) Ano de 2025 inteiro, 30h (150h mensais), vencimento de R$ 2.500.
const r = calcularPiso({
  ...base,
  periodos: [{ inicio: "2025-01", fim: "2025-12" }],
  vencimentoPorAno: { 2025: 2500 },
});
const a = r.anos[0];
assert.equal(a.meses, 12);
assert.equal(a.diferenca, 13809.93); // (4867,77 x 0,75 - 2500) x 12, sem arredondar o mes
assert.equal(a.decimoTerceiro, 1150.83);
assert.equal(a.ferias, 383.61);
assert.equal(a.principal, 15344.37);
console.log(
  "2025, 30h, R$ 2.500:",
  fmtBRL(a.principal),
  "nominal;",
  fmtBRL(a.atualizado),
  "atualizado",
);

// 2) Prescricao: contrato desde 2019, ajuizamento em 10/2026 -> so a partir de 10/2021.
const p = calcularPiso({
  ...base,
  periodos: [{ inicio: "2019-02", fim: "2026-09" }],
  vencimentoPorAno: {
    2019: 1800,
    2020: 1800,
    2021: 2000,
    2022: 2200,
    2023: 2400,
    2024: 2500,
    2025: 2600,
    2026: 2700,
  },
});
assert.equal(p.inicioPrescricao, "2021-10");
assert.equal(p.linhas[0].mes, "2021-10");
assert.ok(p.mesesPrescritos > 0);
console.log(
  "Contrato 2019-2026:",
  fmtBRL(p.totais.principal),
  "nominal;",
  fmtBRL(p.totais.atualizado),
  "atualizado",
);
console.log(p.avisos);

// 3) Sem diferenca quando paga acima do piso.
const z = calcularPiso({
  ...base,
  periodos: [{ inicio: "2024-01", fim: "2024-12" }],
  vencimentoPorAno: { 2024: 9000 },
});
assert.equal(z.totais.principal, 0);

// 4) Correcao: ultimo mes do indice -> fator 1; dez/2021 -> SELIC acumulada a partir de jan/2022.
assert.equal(fatorCorrecao("2026-09"), 1);
assert.ok(fatorCorrecao("2021-12") > 1.7 && fatorCorrecao("2021-12") < 1.8);

// 5) Periodos sobrepostos nao duplicam meses.
const s = calcularPiso({
  ...base,
  periodos: [
    { inicio: "2024-01", fim: "2024-06" },
    { inicio: "2024-04", fim: "2024-12" },
  ],
  vencimentoPorAno: { 2024: 2000 },
});
assert.equal(s.totais.meses, 12);

console.log("OK");
