// Dados de referencia do simulador de direitos de servidores.
//
// Piso salarial profissional nacional do magisterio (Lei 11.738/2008),
// jornada de 40 horas semanais (200 horas mensais), por ano de vigencia.
// Fonte: portarias anuais do MEC. 2026: R$ 5.130,63 (MEC, jan/2026; MP 1.334/2026).
// CONFERIR com as portarias antes de usar em peca: aqui servem de estimativa.
export const PISO_MAGISTERIO: Record<number, number> = {
  2019: 2557.74,
  2020: 2886.24,
  2021: 2886.24, // sem reajuste em 2021
  2022: 3845.63,
  2023: 4420.55,
  2024: 4580.57,
  2025: 4867.77,
  2026: 5130.63,
};

export const PISO_FONTE = "Portarias do MEC (Lei 11.738/2008, art. 5º). Valores para 40h semanais.";

// Variacao mensal (%) dos indices de correcao. Fonte: Banco Central (SGS),
// consultado em 31/10/2026. IPCA-E = serie 10764; SELIC acumulada no mes = serie 4390.
// Regra usada (Fazenda Publica): IPCA-E ate 11/2021; a partir de 12/2021, SELIC
// uma unica vez (EC 113/2021, art. 3º), que ja engloba correcao e juros.
export const IPCA_E: Record<string, number> = {
  "2020-01": 0.71,
  "2020-02": 0.22,
  "2020-03": 0.02,
  "2020-04": -0.01,
  "2020-05": -0.59,
  "2020-06": 0.02,
  "2020-07": 0.3,
  "2020-08": 0.23,
  "2020-09": 0.45,
  "2020-10": 0.94,
  "2020-11": 0.81,
  "2020-12": 1.06,
  "2021-01": 0.78,
  "2021-02": 0.48,
  "2021-03": 0.93,
  "2021-04": 0.6,
  "2021-05": 0.44,
  "2021-06": 0.83,
  "2021-07": 0.72,
  "2021-08": 0.89,
  "2021-09": 1.14,
  "2021-10": 1.2,
  "2021-11": 1.17,
};

export const SELIC: Record<string, number> = {
  "2021-12": 0.77,
  "2022-01": 0.73,
  "2022-02": 0.76,
  "2022-03": 0.93,
  "2022-04": 0.83,
  "2022-05": 1.03,
  "2022-06": 1.02,
  "2022-07": 1.03,
  "2022-08": 1.17,
  "2022-09": 1.07,
  "2022-10": 1.02,
  "2022-11": 1.02,
  "2022-12": 1.12,
  "2023-01": 1.12,
  "2023-02": 0.92,
  "2023-03": 1.17,
  "2023-04": 0.92,
  "2023-05": 1.12,
  "2023-06": 1.07,
  "2023-07": 1.07,
  "2023-08": 1.14,
  "2023-09": 0.97,
  "2023-10": 1.0,
  "2023-11": 0.92,
  "2023-12": 0.89,
  "2024-01": 0.97,
  "2024-02": 0.8,
  "2024-03": 0.83,
  "2024-04": 0.89,
  "2024-05": 0.83,
  "2024-06": 0.79,
  "2024-07": 0.91,
  "2024-08": 0.87,
  "2024-09": 0.84,
  "2024-10": 0.93,
  "2024-11": 0.79,
  "2024-12": 0.93,
  "2025-01": 1.01,
  "2025-02": 0.99,
  "2025-03": 0.96,
  "2025-04": 1.06,
  "2025-05": 1.14,
  "2025-06": 1.1,
  "2025-07": 1.28,
  "2025-08": 1.16,
  "2025-09": 1.22,
  "2025-10": 1.28,
  "2025-11": 1.05,
  "2025-12": 1.22,
  "2026-01": 1.16,
  "2026-02": 1.0,
  "2026-03": 1.21,
  "2026-04": 1.09,
  "2026-05": 1.07,
  "2026-06": 1.12,
  "2026-07": 1.22,
  "2026-08": 1.09,
  "2026-09": 1.08,
};

// Ultimo mes com indice publicado: a correcao vai ate aqui.
export const ULTIMO_MES_INDICE = "2026-09";
export const INICIO_SELIC = "2021-12";
