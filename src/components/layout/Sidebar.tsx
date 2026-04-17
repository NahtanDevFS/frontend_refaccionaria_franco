"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./Sidebar.module.css";
import { AuthService } from "@/services/auth.service";

interface MenuItem {
  title: string;
  path: string;
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
        rolesAllowed: [
          "ADMINISTRADOR",
          "GERENTE_REGIONAL",
          "SUPERVISOR_SUCURSAL",
        ],
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
        rolesAllowed: [
          "ADMINISTRADOR",
          "SUPERVISOR_SUCURSAL",
          "VENDEDOR",
          "CAJERO",
        ],
      },
      {
        title: "Aprobación de Garantías",
        path: "/garantias/aprobaciones",
        rolesAllowed: ["ADMINISTRADOR", "SUPERVISOR_SUCURSAL"],
      },
      {
        title: "Historial de Garantías",
        path: "/garantias/historial",
        rolesAllowed: [
          "ADMINISTRADOR",
          "GERENTE_REGIONAL",
          "SUPERVISOR_SUCURSAL",
        ],
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
        rolesAllowed: ["ADMINISTRADOR", "BODEGUERO", "SUPERVISOR_SUCURSAL"],
      },
      {
        title: "Entregas a Domicilio",
        path: "/entregas",
        rolesAllowed: ["ADMINISTRADOR", "REPARTIDOR"],
      },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);

  // ── Estado del drawer en mobile ──────────────────────────────────────────
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

  // Cerrar el drawer al cambiar de ruta (navegación en mobile)
  useEffect(() => {
    setAbierto(false);
  }, [pathname]);

  // Bloquear scroll del body cuando el drawer está abierto
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
      {/* ── Botón hamburguesa — solo visible en mobile ──────────────────── */}
      <button
        className={styles.hamburger}
        onClick={() => setAbierto(true)}
        aria-label="Abrir menú"
      >
        <span />
        <span />
        <span />
      </button>

      {/* ── Overlay oscuro — cierra el drawer al hacer click ────────────── */}
      {abierto && (
        <div
          className={styles.overlay}
          onClick={() => setAbierto(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar / Drawer ─────────────────────────────────────────────── */}
      <aside
        className={`${styles.sidebar} ${abierto ? styles.sidebarAbierto : ""}`}
      >
        {/* Botón cerrar — solo visible en mobile cuando está abierto */}
        <button
          className={styles.btnCerrar}
          onClick={() => setAbierto(false)}
          aria-label="Cerrar menú"
        >
          ✕
        </button>

        <div className={styles.brand}>REFACCIONARIA FRANCO</div>

        {/* Bloque de usuario */}
        <div className={styles.userInfo}>
          <div className={styles.userRow}>
            <span className={styles.userIcon}></span>
            <span className={styles.userName}>{usuario.username}</span>
          </div>
          <div className={styles.userRow}>
            <span className={styles.userIcon}></span>
            <span className={styles.userRole}>
              {usuario.rol.replace(/_/g, " ")}
            </span>
          </div>
          <div className={styles.userRow}>
            <span className={styles.userIcon}></span>
            <span className={styles.userSucursal}>
              {usuario.nombre_sucursal}
            </span>
          </div>
        </div>

        <nav className={styles.nav}>
          {MENU_CONFIG.map((group, index) => {
            const allowedItems = group.items.filter((item) =>
              item.rolesAllowed.includes(usuario.rol),
            );
            if (allowedItems.length === 0) return null;

            return (
              <div key={index} className={styles.menuSection}>
                <div className={styles.sectionTitle}>{group.section}</div>
                {allowedItems.map((item) => {
                  const isActive = pathname.startsWith(item.path);
                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      className={`${styles.navItem} ${isActive ? styles.active : ""}`}
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
