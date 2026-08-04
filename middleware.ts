import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";

const DOMINIO_ELEITORAL = "@eleitoral2026.com";

function isEleitoral(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.toLowerCase().trim().endsWith(DOMINIO_ELEITORAL);
}

export default withAuth(
  function middleware(req) {
    const email = req.nextauth.token?.email;
    const path = req.nextUrl.pathname;
    const eleitoral = isEleitoral(email);

    // Usuarios do dominio eleitoral so acessam o modulo eleitoral (e o
    // proprio perfil, para trocar senha).
    const permitidoParaEleitoral =
      path.startsWith("/app/eleitoral") || path.startsWith("/app/perfil");

    if (eleitoral && !permitidoParaEleitoral) {
      return NextResponse.redirect(new URL("/app/eleitoral", req.url));
    }
    if (!eleitoral && path.startsWith("/app/eleitoral")) {
      return NextResponse.redirect(new URL("/app", req.url));
    }
    return NextResponse.next();
  },
  {
    pages: {
      signIn: "/login",
    },
  },
);

export const config = {
  matcher: ["/app/:path*"],
};
