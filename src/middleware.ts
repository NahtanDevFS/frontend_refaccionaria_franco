import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Verificamos si existe la cookie del token
  const token = request.cookies.get("token")?.value;

  // 1. Lógica para la ruta raíz ("/")
  if (request.nextUrl.pathname === "/") {
    if (token) {
      // Si hay token, lo mandamos a su dashboard (puede ser /inicio o /ventas dependiendo de tu app)
      return NextResponse.redirect(new URL("/inicio", request.url));
    } else {
      // Si no hay token, al login
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // 2. Si intentan entrar a cualquier ruta protegida sin token, los mandamos al login
  // Puedes agregar más rutas aquí según crezca tu app, ej: startsWith("/inicio") || startsWith("/bodega")
  if (!token && request.nextUrl.pathname.startsWith("/ventas")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 3. Si ya tienen token y están en el login, los mandamos directo al dashboard
  if (token && request.nextUrl.pathname === "/login") {
    return NextResponse.redirect(new URL("/inicio", request.url)); // o /ventas
  }

  return NextResponse.next();
}

// Definimos en qué rutas se ejecutará este middleware
export const config = {
  // Agregamos "/" al matcher para que el middleware lo intercepte
  matcher: ["/", "/ventas/:path*", "/login", "/inicio/:path*"],
};
