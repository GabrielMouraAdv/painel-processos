import { prisma } from "../lib/prisma";

async function main() {
  console.log("=== ESTADO ANTES ===");
  const [
    totalProcessos,
    prazosAntes,
    andamentosAntes,
    documentosAntes,
    itensPautaAntes,
  ] = await Promise.all([
    prisma.processoTce.count(),
    prisma.prazoTce.count(),
    prisma.andamentoTce.count(),
    prisma.documentoTce.count(),
    prisma.itemPauta.count(),
  ]);
  console.log(`ProcessoTce:   ${totalProcessos}`);
  console.log(`PrazoTce:      ${prazosAntes}`);
  console.log(`AndamentoTce:  ${andamentosAntes}`);
  console.log(`DocumentoTce:  ${documentosAntes}`);
  console.log(`ItemPauta:     ${itensPautaAntes}`);

  console.log("\n=== EXECUTANDO LIMPEZA ===");

  // 1) Reset dos campos de pendencia/status em TODOS os ProcessoTce
  const reset = await prisma.processoTce.updateMany({
    data: {
      notaTecnica: false,
      parecerMpco: false,
      contrarrazoesNtApresentadas: false,
      contrarrazoesMpcoApresentadas: false,
      memorialPronto: false,
      memorialDispensado: false,
      memorialDispensadoPor: null,
      memorialDispensadoEm: null,
      memorialDispensadoMotivo: null,
      memorialAgendadoData: null,
      memorialAgendadoAdvogadoId: null,
      despachadoComRelator: false,
      despachoDispensado: false,
      despachoDispensadoPor: null,
      despachoDispensadoEm: null,
      despachoDispensadoMotivo: null,
      despachoAgendadoData: null,
      despachoAgendadoAdvogadoId: null,
      retornoDespacho: null,
      dataDespacho: null,
    },
  });
  console.log(`ProcessoTce resetados: ${reset.count}`);

  // 2-5) Apagar coleccoes
  const prazosDel = await prisma.prazoTce.deleteMany({});
  console.log(`PrazoTce apagados: ${prazosDel.count}`);

  const andamentosDel = await prisma.andamentoTce.deleteMany({});
  console.log(`AndamentoTce apagados: ${andamentosDel.count}`);

  const documentosDel = await prisma.documentoTce.deleteMany({});
  console.log(`DocumentoTce apagados: ${documentosDel.count}`);

  const itensDel = await prisma.itemPauta.deleteMany({});
  console.log(`ItemPauta apagados: ${itensDel.count}`);

  console.log("\n=== ESTADO DEPOIS ===");
  const [
    totalDepois,
    prazosDepois,
    andamentosDepois,
    documentosDepois,
    itensDepois,
    sessoesDepois,
  ] = await Promise.all([
    prisma.processoTce.count(),
    prisma.prazoTce.count(),
    prisma.andamentoTce.count(),
    prisma.documentoTce.count(),
    prisma.itemPauta.count(),
    prisma.sessaoPauta.count(),
  ]);
  console.log(`ProcessoTce mantidos:   ${totalDepois}`);
  console.log(`PrazoTce restantes:     ${prazosDepois}`);
  console.log(`AndamentoTce restantes: ${andamentosDepois}`);
  console.log(`DocumentoTce restantes: ${documentosDepois}`);
  console.log(`ItemPauta restantes:    ${itensDepois}`);
  console.log(`SessaoPauta mantidas:   ${sessoesDepois}`);

  console.log("\n=== RESUMO ===");
  console.log(`Processos resetados:      ${reset.count}`);
  console.log(`Prazos apagados:          ${prazosDel.count}`);
  console.log(`Andamentos apagados:      ${andamentosDel.count}`);
  console.log(`Documentos apagados:      ${documentosDel.count}`);
  console.log(`Itens de pauta apagados:  ${itensDel.count}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
