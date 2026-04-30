import { prisma } from "../lib/prisma";

async function main() {
  console.log("=== ESTADO ANTES ===");
  const [
    processosAntes,
    prazosAntes,
    andamentosAntes,
    documentosAntes,
    itensAntes,
    sessoesAntes,
    movsAntes,
    pubsAntes,
    monitorAntes,
  ] = await Promise.all([
    prisma.processo.count(),
    prisma.prazo.count(),
    prisma.andamento.count(),
    prisma.documento.count(),
    prisma.itemPautaJudicial.count(),
    prisma.sessaoJudicial.count(),
    prisma.movimentacaoAutomatica.count(),
    prisma.publicacaoDJEN.count(),
    prisma.monitoramentoConfig.count(),
  ]);
  console.log(`Processo:                ${processosAntes}`);
  console.log(`Prazo:                   ${prazosAntes}`);
  console.log(`Andamento:               ${andamentosAntes}`);
  console.log(`Documento:               ${documentosAntes}`);
  console.log(`ItemPautaJudicial:       ${itensAntes}`);
  console.log(`SessaoJudicial:          ${sessoesAntes}`);
  console.log(`MovimentacaoAutomatica:  ${movsAntes}`);
  console.log(`PublicacaoDJEN:          ${pubsAntes}`);
  console.log(`MonitoramentoConfig:     ${monitorAntes}`);

  console.log("\n=== EXECUTANDO LIMPEZA ===");

  // Ordem segura: filhos antes dos pais. As cascatas cobrem a maioria,
  // mas deletamos explicitamente para obter contagens.
  const monitorDel = await prisma.monitoramentoConfig.deleteMany({});
  console.log(`MonitoramentoConfig apagados:    ${monitorDel.count}`);

  const movsDel = await prisma.movimentacaoAutomatica.deleteMany({});
  console.log(`MovimentacaoAutomatica apagados: ${movsDel.count}`);

  const pubsDel = await prisma.publicacaoDJEN.deleteMany({});
  console.log(`PublicacaoDJEN apagados:         ${pubsDel.count}`);

  const itensDel = await prisma.itemPautaJudicial.deleteMany({});
  console.log(`ItemPautaJudicial apagados:      ${itensDel.count}`);

  const sessoesDel = await prisma.sessaoJudicial.deleteMany({});
  console.log(`SessaoJudicial apagadas:         ${sessoesDel.count}`);

  const documentosDel = await prisma.documento.deleteMany({});
  console.log(`Documento apagados:              ${documentosDel.count}`);

  const andamentosDel = await prisma.andamento.deleteMany({});
  console.log(`Andamento apagados:              ${andamentosDel.count}`);

  const prazosDel = await prisma.prazo.deleteMany({});
  console.log(`Prazo apagados:                  ${prazosDel.count}`);

  const processosDel = await prisma.processo.deleteMany({});
  console.log(`Processo apagados:               ${processosDel.count}`);

  console.log("\n=== ESTADO DEPOIS ===");
  const [
    processosDepois,
    prazosDepois,
    andamentosDepois,
    documentosDepois,
    itensDepois,
    sessoesDepois,
    movsDepois,
    pubsDepois,
    monitorDepois,
  ] = await Promise.all([
    prisma.processo.count(),
    prisma.prazo.count(),
    prisma.andamento.count(),
    prisma.documento.count(),
    prisma.itemPautaJudicial.count(),
    prisma.sessaoJudicial.count(),
    prisma.movimentacaoAutomatica.count(),
    prisma.publicacaoDJEN.count(),
    prisma.monitoramentoConfig.count(),
  ]);
  console.log(`Processo:                ${processosDepois}`);
  console.log(`Prazo:                   ${prazosDepois}`);
  console.log(`Andamento:               ${andamentosDepois}`);
  console.log(`Documento:               ${documentosDepois}`);
  console.log(`ItemPautaJudicial:       ${itensDepois}`);
  console.log(`SessaoJudicial:          ${sessoesDepois}`);
  console.log(`MovimentacaoAutomatica:  ${movsDepois}`);
  console.log(`PublicacaoDJEN:          ${pubsDepois}`);
  console.log(`MonitoramentoConfig:     ${monitorDepois}`);

  console.log("\n=== RESUMO ===");
  console.log(`Processos judiciais apagados:        ${processosDel.count}`);
  console.log(`Prazos apagados:                     ${prazosDel.count}`);
  console.log(`Andamentos apagados:                 ${andamentosDel.count}`);
  console.log(`Documentos apagados:                 ${documentosDel.count}`);
  console.log(`Itens de pauta judicial apagados:    ${itensDel.count}`);
  console.log(`Sessoes de pauta judicial apagadas:  ${sessoesDel.count}`);
  console.log(`Movimentacoes Datajud apagadas:      ${movsDel.count}`);
  console.log(`Publicacoes DJEN apagadas:           ${pubsDel.count}`);
  console.log(`Configs de monitoramento apagadas:   ${monitorDel.count}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
