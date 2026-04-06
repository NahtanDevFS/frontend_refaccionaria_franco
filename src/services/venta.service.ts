import { CrearVentaDTO, VentaResumen } from "../types/venta.types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

// Función auxiliar sencilla para leer cookies en el cliente
function obtenerToken(): string {
  const match = document.cookie.match(new RegExp("(^| )token=([^;]+)"));
  if (match) return match[2];
  return "";
}

export const VentaService = {
  async obtenerVentas(): Promise<VentaResumen[]> {
    const token = obtenerToken();
    const response = await fetch(`${API_URL}/ventas`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error("Error al obtener las ventas");
    return response.json();
  },

  async crearVenta(data: CrearVentaDTO): Promise<void> {
    const token = obtenerToken();
    // OJO: Tu backend espera la creación en /ventas/mostrador, no en /ventas
    const response = await fetch(`${API_URL}/ventas/mostrador`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Error al procesar la venta");
    }
  },

  async crearOrdenVenta(payload: any): Promise<void> {
    const token = document.cookie.match(new RegExp("(^| )token=([^;]+)"))?.[2];
    const response = await fetch(`${API_URL}/ventas/orden`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Error al crear la orden");
    }
  },
};
