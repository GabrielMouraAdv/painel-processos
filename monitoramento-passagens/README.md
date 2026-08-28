# Monitoramento de passagens — Recife → Belo Horizonte

Rastreia diariamente o preço da viagem **REC → CNF, ida 17/02/2027, volta 21/02/2027**
e avisa quando vale a pena comprar.

## Como funciona

Uma *Routine* do Claude Code roda todo dia de manhã, em sessão nova:

1. Consulta o preço da rota (conector Expedia; se estiver fora, busca web como reserva).
2. Roda `registrar.mjs`, que grava a leitura no histórico e calcula o veredito.
3. Faz commit do histórico neste branch — é assim que os dados sobrevivem entre execuções,
   já que cada sessão roda em container efêmero.
4. Notifica por push/e-mail **apenas** quando o veredito é relevante.

## Quando você é avisado

| Nível | Critério | Ação |
|---|---|---|
| `COMPRAR` | ≤ R$ 750 | Compre — está bem abaixo da média da rota |
| `ATENCAO` | ≤ R$ 900 | Bom preço, avalie |
| `QUEDA_RELEVANTE` | queda ≥ 12% em um dia | Olhe agora |
| `ESTAVEL` / `CARO` | — | Silencioso, só registra |

Referência de mercado (ago/2026): média da rota **R$ 1.033**, boas ofertas a partir de **R$ 602**.

## Ajustar os limites

Edite `config.json` — os valores em `alertas` são por passageiro, ida e volta, em reais.
Baixar `compraImediata` deixa o alerta mais exigente; subir deixa mais sensível.

## Registrar uma leitura manualmente

```bash
node monitoramento-passagens/registrar.mjs --preco 899 --cia Azul --paradas 1 --link "https://..."
node monitoramento-passagens/registrar.mjs --indisponivel "site fora do ar"
```

## Encerrar o monitoramento

Depois de comprar a passagem, peça ao Claude para apagar a Routine
(ou remova em **Routines**, na interface). O monitoramento também para sozinho
7 dias antes da viagem (`diasAntesDaViagemParaPararDeMonitorar`).

## Rede de segurança

A automação não substitui os alertas nativos das plataformas. Vale ter, em paralelo,
um alerta de preço no [Google Flights](https://www.google.com/travel/flights) para a mesma
rota e datas — leva 30 segundos e cobre o caso de a Routine falhar.
