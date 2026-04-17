// src/services/cliente.service.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

function getToken() {
  if (typeof document === "undefined") return "";
  return document.cookie.match(new RegExp("(^| )token=([^;]+)"))?.[2] ?? "";
}

export const ClienteService = {
  // Búsqueda exacta por NIT (ya existía)
  async buscarPorNit(nit: string) {
    const res = await fetch(`${API_URL}/clientes/buscar?nit=${nit}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error("Error buscando cliente");
    return res.json();
  },

  // ─── NUEVO: búsqueda libre por nombre, NIT o teléfono ────────────────────
  async buscarClientes(criterio: string): Promise<
    {
      id_cliente: number;
      nombre_razon_social: string;
      nit: string;
      telefono: string | null;
      direccion: string | null;
      tipo_cliente: string;
      email: string | null;
      id_municipio: number | null;
      notas_internas: string | null;
    }[]
  > {
    if (criterio.trim().length < 2) return [];
    const res = await fetch(
      `${API_URL}/clientes?query=${encodeURIComponent(criterio.trim())}`,
      { headers: { Authorization: `Bearer ${getToken()}` } },
    );
    const data = await res.json();
    if (!res.ok || !data.success) return [];
    return data.data ?? [];
  },
};
