"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./Sidebar.module.css";
import { AuthService } from "@/services/auth.service";

// Definimos la estructura de un ítem del menú
interface MenuItem {
  title: string;
  path: string;
  rolesAllowed: string[]; // Qué roles pueden ver este link
}

interface MenuSection {
  section: string;
  items: MenuItem[];
}

// Configuración centralizada de permisos
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
      // Nueva venta es para el que vende y para el supervisor/admin
      {
        title: "Nueva Venta",
        path: "/ventas/nueva",
        rolesAllowed: ["ADMINISTRADOR", "SUPERVISOR_SUCURSAL", "VENDEDOR"],
      },
      // Historial es solo para monitoreo
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
      // Nuevo Módulo de Garantías
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
  const [usuario, setUsuario] = useState<{
    nombre: string;
    rol: string;
  } | null>(null);

  useEffect(() => {
    // Al montar, leemos el usuario del localStorage
    const userString = localStorage.getItem("usuario");
    if (userString) {
      const userData = JSON.parse(userString);
      setUsuario({
        nombre: userData.username, // Asumiendo que el JWT trae esto
        rol: userData.rol,
      });
    }
  }, []);

  const handleLogout = () => {
    AuthService.cerrarSesion();
    router.push("/login");
  };

  if (!usuario) return null; // No renderizar hasta saber quién es

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>REFACCIONARIA FRANCO</div>

      <div className={styles.userInfo}>
        <span className={styles.userName}>{usuario.nombre}</span>
        <span className={styles.userRole}>{usuario.rol}</span>
      </div>

      <nav className={styles.nav}>
        {MENU_CONFIG.map((group, index) => {
          // Filtramos los items de esta sección según el rol del usuario
          const allowedItems = group.items.filter((item) =>
            item.rolesAllowed.includes(usuario.rol),
          );

          // Si el usuario no tiene acceso a ningún item de esta sección, no la mostramos
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
  );
}
