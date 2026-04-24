// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

//Helper para determinar a dónde mandar a un usuario según su rol
function getRutaPorDefecto(rol?: string) {
  switch (rol) {
    case "VENDEDOR":
      return "/ventas/nueva";
    case "CAJERO":
      return "/caja";
    case "BODEGUERO":
      return "/bodega";
    case "REPARTIDOR":
      return "/entregas";
    case "ADMINISTRADOR":
    case "GERENTE_REGIONAL":
    case "SUPERVISOR_SUCURSAL":
    default:
      return "/inicio";
  }
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const rol = request.cookies.get("rol")?.value;
  const pathname = request.nextUrl.pathname;

  //Si no hay token y no está en el login, lo mandamos al login
  if (!token && pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  //Si hay token y va al login o a la raíz, mandarlo a su módulo correspondiente
  if (token && (pathname === "/login" || pathname === "/")) {
    return NextResponse.redirect(new URL(getRutaPorDefecto(rol), request.url));
  }

  //MATRIZ DE PERMISOS PARA PROTEGER RUTAS
  //Las rutas más específicas deben ir PRIMERO para que el find() las priorice
  if (token && rol) {
    const accesosPermitidos: Record<string, string[]> = {
      //Módulo de Rendimiento
      "/inicio": [
        "ADMINISTRADOR",
        "GERENTE_REGIONAL",
        "SUPERVISOR_SUCURSAL",
        "VENDEDOR",
      ],

      //  Módulo de Ventas (subrutas específicas)
      "/ventas/nueva": ["ADMINISTRADOR", "SUPERVISOR_SUCURSAL", "VENDEDOR"],
      "/ventas/historial": ["ADMINISTRADOR", "SUPERVISOR_SUCURSAL"],
      "/ventas/aprobaciones": ["ADMINISTRADOR", "SUPERVISOR_SUCURSAL"],

      //  Módulo de Garantías (subrutas específicas)
      "/garantias/nueva": ["ADMINISTRADOR", "SUPERVISOR_SUCURSAL", "VENDEDOR"],
      "/garantias/aprobaciones": ["ADMINISTRADOR", "SUPERVISOR_SUCURSAL"],
      "/garantias/historial": ["ADMINISTRADOR", "SUPERVISOR_SUCURSAL"],

      //  Módulo de Operaciones
      "/caja": ["ADMINISTRADOR", "SUPERVISOR_SUCURSAL", "CAJERO"],
      "/bodega": ["ADMINISTRADOR", "BODEGUERO"],
      "/entregas": ["ADMINISTRADOR", "REPARTIDOR"],
    };

    // Buscamos la ruta más específica que coincida con el pathname actual.
    // Se ordena por longitud descendente para priorizar rutas más largas
    // (ej: "/ventas/nueva" antes que un hipotético "/ventas").
    const rutaProtegida = Object.keys(accesosPermitidos)
      .sort((a, b) => b.length - a.length)
      .find((ruta) => pathname.startsWith(ruta));

    if (rutaProtegida) {
      const rolesAutorizados = accesosPermitidos[rutaProtegida];

      if (!rolesAutorizados.includes(rol)) {
        return NextResponse.redirect(
          new URL(getRutaPorDefecto(rol), request.url),
        );
      }
    }
  }

  return NextResponse.next();
}

// Incluir todas las rutas protegidas de la aplicación
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
