# Imagens de timbre dos escritorios emissores

Cada escritorio tem uma pasta com seu slug. Coloque aqui as imagens de timbre
que serao usadas em PDFs e .docx (aditivo, relatorios, etc.):

- `cabecalho.png` — logo no cabecalho do .docx (recomendado: 1300x250 px, 96 DPI)
- `rodape.png`   — logo/contato no rodape do .docx (recomendado: 1300x130 px, 96 DPI)
- `marca-dagua.png` — opcional, marca d'agua de PDFs

Aliases aceitos pelo gerador: `header.png` e `footer.png` tambem funcionam.

Slugs disponiveis (ver `lib/escritorios-emissores.ts`):

- gabriel-moura
- filipe-campos
- porto-rodrigues

Se uma imagem nao existir, o gerador continua sem ela e loga um aviso no
console do servidor com o caminho esperado.
