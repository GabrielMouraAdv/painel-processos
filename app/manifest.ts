import type { MetadataRoute } from "next";

// Manifesto do aplicativo instalavel (PWA). No iPhone: Safari > Compartilhar >
// "Adicionar a Tela de Inicio"; abre em tela cheia direto na pagina Hoje.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Painel Jurídico",
    short_name: "Painel",
    description: "Pauta do escritório: prazos, pauta do TCE-PE e processos prioritários.",
    lang: "pt-BR",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f4f6f8",
    theme_color: "#1e3a5f",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
