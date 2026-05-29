"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./Sidebar.module.css";
import { AuthService } from "@/services/auth.service";

interface MenuItem {
  title: string;
  path: string;
  externalUrl?: string;
  rolesAllowed: string[];
}

interface MenuSection {
  section: string;
  items: MenuItem[];
}

interface UsuarioSesion {
  username: string;
  rol: string;
  nombre_sucursal: string;
}

const MENU_CONFIG: MenuSection[] = [
  {
    section: "Panel Principal",
    items: [
      {
        title: "Inicio (Rendimiento)",
        path: "/inicio",
        rolesAllowed: [
          "ADMINISTRADOR",
          "GERENTE_REGIONAL",
          "SUPERVISOR_SUCURSAL",
          "VENDEDOR",
        ],
      },
    ],
  },
  {
    section: "Ventas",
    items: [
      {
        title: "Nueva Venta",
        path: "/ventas/nueva",
        rolesAllowed: ["ADMINISTRADOR", "SUPERVISOR_SUCURSAL", "VENDEDOR"],
      },
      {
        title: "Historial de Ventas",
        path: "/ventas/historial",
        rolesAllowed: ["ADMINISTRADOR", "SUPERVISOR_SUCURSAL"],
      },
      {
        title: "Aprobación de Descuentos",
        path: "/ventas/aprobaciones",
        rolesAllowed: ["ADMINISTRADOR", "SUPERVISOR_SUCURSAL"],
      },
    ],
  },
  {
    section: "Garantías",
    items: [
      {
        title: "Reclamar Garantía",
        path: "/garantias/nueva",
        rolesAllowed: ["ADMINISTRADOR", "SUPERVISOR_SUCURSAL", "VENDEDOR"],
      },
      {
        title: "Aprobación de Garantías",
        path: "/garantias/aprobaciones",
        rolesAllowed: ["ADMINISTRADOR", "SUPERVISOR_SUCURSAL"],
      },
      {
        title: "Historial de Garantías",
        path: "/garantias/historial",
        rolesAllowed: ["ADMINISTRADOR", "SUPERVISOR_SUCURSAL"],
      },
    ],
  },
  {
    section: "Operaciones",
    items: [
      {
        title: "Caja y Arqueos",
        path: "/caja",
        rolesAllowed: ["ADMINISTRADOR", "CAJERO", "SUPERVISOR_SUCURSAL"],
      },
      {
        title: "Bodega e Inventario",
        path: "/bodega",
        rolesAllowed: ["ADMINISTRADOR", "BODEGUERO"],
      },
      {
        title: "Entregas a Domicilio",
        path: "/entregas",
        rolesAllowed: ["ADMINISTRADOR", "REPARTIDOR"],
      },
    ],
  },
  {
    section: "Reportes",
    items: [
      {
        title: "Dashboard Power BI",
        path: "/reportes/powerbi",
        externalUrl:
          "https://app.powerbi.com/view?r=eyJrIjoiNmMwN2MwNjYtYWM1ZC00NTljLWI4MTAtNmE3NWU3MTNkYmZmIiwidCI6IjVmNTNiNGNlLTYzZDQtNGVlOC04OGQyLTIyZjBiMmQ0YjI3YSIsImMiOjR9",
        rolesAllowed: ["ADMINISTRADOR", "GERENTE_REGIONAL"],
      },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);

  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    const userString = localStorage.getItem("usuario");
    if (userString) {
      const userData = JSON.parse(userString);
      setUsuario({
        username: userData.username ?? "—",
        rol: userData.rol ?? "—",
        nombre_sucursal: userData.nombre_sucursal ?? "—",
      });
    }
  }, []);

  useEffect(() => {
    setAbierto(false);
  }, [pathname]);

  useEffect(() => {
    if (abierto) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [abierto]);

  const handleLogout = () => {
    AuthService.cerrarSesion();
    router.push("/login");
  };

  if (!usuario) return null;

  return (
    <>
      <button
        className={styles.hamburger}
        onClick={() => setAbierto(true)}
        aria-label="Abrir menú"
      >
        <span />
        <span />
        <span />
      </button>

      {abierto && (
        <div
          className={styles.overlay}
          onClick={() => setAbierto(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`${styles.sidebar} ${abierto ? styles.sidebarAbierto : ""}`}
      >
        <button
          className={styles.btnCerrar}
          onClick={() => setAbierto(false)}
          aria-label="Cerrar menú"
        >
          ✕
        </button>

        <div className={styles.brand}>REFACCIONARIA FRANCO</div>

        <div className={styles.userInfo}>
          <div className={styles.userRow}>
            <span className={styles.userName}>{usuario.username}</span>
          </div>
          <div className={styles.userRow}>
            <span className={styles.userRole}>
              {usuario.rol.replace(/_/g, " ")}
            </span>
          </div>
          <div className={styles.userRow}>
            <span className={styles.userSucursal}>
              {usuario.nombre_sucursal}
            </span>
          </div>
        </div>

        <nav className={styles.nav}>
          {MENU_CONFIG.map((group, index) => {
            const itemsPermitidos = group.items.filter((item) =>
              item.rolesAllowed.includes(usuario.rol),
            );
            if (itemsPermitidos.length === 0) return null;

            return (
              <div key={index} className={styles.menuSection}>
                <div className={styles.sectionTitle}>{group.section}</div>
                {itemsPermitidos.map((item) => {
                  if (item.externalUrl) {
                    return (
                      <a
                        key={item.path}
                        href={item.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.navItem}
                      >
                        {item.title}
                      </a>
                    );
                  }

                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      className={`${styles.navItem} ${
                        pathname.startsWith(item.path) ? styles.active : ""
                      }`}
                    >
                      {item.title}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <button className={styles.logoutBtn} onClick={handleLogout}>
          Cerrar Sesión
        </button>
      </aside>
    </>
  );
}
