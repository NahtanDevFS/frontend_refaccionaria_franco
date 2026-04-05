import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Verificamos si existe la cookie del token
  const token = request.cookies.get("token")?.value;

  // Si intentan entrar a cualquier ruta protegida sin token, los mandamos al login
  if (!token && request.nextUrl.pathname.startsWith("/ventas")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Si ya tienen token y están en el login, los mandamos directo a ventas
  if (token && request.nextUrl.pathname === "/login") {
    return NextResponse.redirect(new URL("/ventas", request.url));
  }

  return NextResponse.next();
}

// Definimos en qué rutas se ejecutará este middleware
export const config = {
  matcher: ["/ventas/:path*", "/login"],
};
