// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Helper para determinar a dónde mandar a un usuario según su rol
function getRutaPorDefecto(rol?: string) {
  switch (rol) {
    case "CAJERO":
      return "/caja";
    case "BODEGUERO":
      return "/bodega";
    case "REPARTIDOR":
      return "/entregas";
    case "ADMINISTRADOR":
    case "GERENTE_REGIONAL":
    case "SUPERVISOR_SUCURSAL":
    case "VENDEDOR":
    default:
      return "/inicio";
  }
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const rol = request.cookies.get("rol")?.value;
  const pathname = request.nextUrl.pathname;

  // 1. Si no hay token y no está en el login, lo mandamos al login
  if (!token && pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 2. Si hay token y va al login o a la raíz, mandarlo a su módulo correspondiente
  if (token && (pathname === "/login" || pathname === "/")) {
    return NextResponse.redirect(new URL(getRutaPorDefecto(rol), request.url));
  }

  // 3. MATRIZ DE PERMISOS PARA PROTEGER RUTAS
  if (token && rol) {
    // Definimos qué roles pueden entrar a cada ruta base
    const accesosPermitidos: Record<string, string[]> = {
      "/inicio": [
        "ADMINISTRADOR",
        "GERENTE_REGIONAL",
        "SUPERVISOR_SUCURSAL",
        "VENDEDOR",
      ],
      "/ventas": [
        "ADMINISTRADOR",
        "GERENTE_REGIONAL",
        "SUPERVISOR_SUCURSAL",
        "VENDEDOR",
      ],
      "/garantias": [
        "ADMINISTRADOR",
        "GERENTE_REGIONAL",
        "SUPERVISOR_SUCURSAL",
        "VENDEDOR",
        "CAJERO",
      ],
      "/caja": ["ADMINISTRADOR", "CAJERO", "SUPERVISOR_SUCURSAL"],
      "/bodega": ["ADMINISTRADOR", "BODEGUERO", "SUPERVISOR_SUCURSAL"],
      "/entregas": ["ADMINISTRADOR", "REPARTIDOR"],
    };

    // Buscamos si la ruta actual está en la matriz de protección
    const rutaProtegida = Object.keys(accesosPermitidos).find((ruta) =>
      pathname.startsWith(ruta),
    );

    if (rutaProtegida) {
      const rolesAutorizados = accesosPermitidos[rutaProtegida];

      // Si el rol del usuario no está en el arreglo de autorizados para esa ruta:
      if (!rolesAutorizados.includes(rol)) {
        // Lo redirigimos a la ruta a la que sí tiene permiso
        return NextResponse.redirect(
          new URL(getRutaPorDefecto(rol), request.url),
        );
      }
    }
  }

  return NextResponse.next();
}

//incluir todas las rutas protegidas de la aplicación
export const config = {
  matcher: [
    "/",
    "/login",
    "/inicio/:path*",
    "/ventas/:path*",
    "/garantias/:path*",
    "/caja/:path*",
    "/bodega/:path*",
    "/entregas/:path*",
  ],
};
