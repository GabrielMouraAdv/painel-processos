#!/usr/bin/env node
// Registra uma leitura diaria de preco e devolve o veredito do monitoramento.
//
//   node registrar.mjs --preco 899 --cia Azul --paradas 1 --link "https://..."
//   node registrar.mjs --indisponivel "conector Expedia fora do ar"
//
// A saida e um JSON com o veredito. O historico fica em historico.json.

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const base = dirname(fileURLToPath(import.meta.url))
const config = JSON.parse(readFileSync(join(base, 'config.json'), 'utf8'))
const historicoPath = join(base, 'historico.json')
const historico = JSON.parse(readFileSync(historicoPath, 'utf8'))

const args = {}
for (let i = 2; i < process.argv.length; i += 2) {
  args[process.argv[i].replace(/^--/, '')] = process.argv[i + 1]
}

const hoje = new Date().toISOString().slice(0, 10)
const { compraImediata, fiqueAtento, quedaRelevantePercentual, tetoAceitavel } = config.alertas

const anteriores = historico.leituras.filter((l) => typeof l.preco === 'number')
const precosAnteriores = anteriores.map((l) => l.preco)
const minimoAnterior = precosAnteriores.length ? Math.min(...precosAnteriores) : null
const ultimoAnterior = anteriores.length ? anteriores[anteriores.length - 1].preco : null

let leitura
let veredito

if (args.indisponivel) {
  leitura = { data: hoje, preco: null, motivo: args.indisponivel }
  veredito = {
    nivel: 'SEM_DADO',
    notificar: false,
    resumo: `Nao foi possivel ler o preco em ${hoje}: ${args.indisponivel}`,
  }
} else {
  const preco = Number(args.preco)
  if (!Number.isFinite(preco) || preco <= 0) {
    console.error('Informe --preco <numero> ou --indisponivel "<motivo>"')
    process.exit(1)
  }

  leitura = {
    data: hoje,
    preco,
    moeda: config.viagem.moeda,
    cia: args.cia ?? null,
    paradas: args.paradas != null ? Number(args.paradas) : null,
    link: args.link ?? null,
  }

  const variacao =
    ultimoAnterior != null ? ((preco - ultimoAnterior) / ultimoAnterior) * 100 : null
  const vsMinimo = minimoAnterior != null ? ((preco - minimoAnterior) / minimoAnterior) * 100 : null
  const novoMinimo = minimoAnterior == null || preco < minimoAnterior

  let nivel
  if (preco <= compraImediata) nivel = 'COMPRAR'
  else if (preco <= fiqueAtento) nivel = 'ATENCAO'
  else if (variacao != null && variacao <= -quedaRelevantePercentual) nivel = 'QUEDA_RELEVANTE'
  else if (preco > tetoAceitavel) nivel = 'CARO'
  else nivel = 'ESTAVEL'

  const notificar =
    !config.execucao.notificarSomenteSeRelevante ||
    ['COMPRAR', 'ATENCAO', 'QUEDA_RELEVANTE'].includes(nivel) ||
    (novoMinimo && anteriores.length > 0)

  const partes = [
    `${config.viagem.origem}->${config.viagem.destino} ${config.viagem.ida} / volta ${config.viagem.volta}`,
    `R$ ${preco.toFixed(2)}${leitura.cia ? ` (${leitura.cia})` : ''}`,
  ]
  if (variacao != null) partes.push(`${variacao >= 0 ? '+' : ''}${variacao.toFixed(1)}% vs ontem`)
  if (vsMinimo != null) partes.push(`minimo historico R$ ${minimoAnterior.toFixed(2)}`)
  if (novoMinimo && anteriores.length > 0) partes.push('NOVO MINIMO')

  veredito = {
    nivel,
    notificar,
    novoMinimo,
    variacaoPercentualVsUltima: variacao != null ? Number(variacao.toFixed(2)) : null,
    variacaoPercentualVsMinimo: vsMinimo != null ? Number(vsMinimo.toFixed(2)) : null,
    minimoAnterior,
    resumo: partes.join(' | '),
  }
}

historico.leituras = historico.leituras.filter((l) => l.data !== hoje)
historico.leituras.push(leitura)
historico.leituras.sort((a, b) => a.data.localeCompare(b.data))
historico.atualizadoEm = new Date().toISOString()
writeFileSync(historicoPath, `${JSON.stringify(historico, null, 2)}\n`)

const diasParaViagem = Math.round(
  (new Date(`${config.viagem.ida}T00:00:00Z`) - new Date(`${hoje}T00:00:00Z`)) / 86400000,
)
veredito.diasParaViagem = diasParaViagem
veredito.encerrarMonitoramento =
  diasParaViagem <= config.execucao.diasAntesDaViagemParaPararDeMonitorar

console.log(JSON.stringify(veredito, null, 2))
