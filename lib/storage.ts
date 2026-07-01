import { AppData } from "./types";

export const STORAGE_KEY = "rutas-himetal-v1";

export const today = () => new Date().toISOString().slice(0, 10);

export const defaultData: AppData = {
  origin: {
    name: "Himetal SA",
    address: "Rosario, Santa Fe",
    lat: -32.9468,
    lng: -60.6393
  },
  customers: [
    {
      id: "cli-1",
      name: "Cliente Zona Sur",
      address: "San Martín 5200, Rosario",
      phone: "3410000001",
      openingHours: "08:00 a 12:00 / 15:00 a 18:00",
      zone: "Rosario Sur",
      notes: "Llamar antes de llegar. Descargar por portón principal.",
      priority: "alta",
      lat: -32.9949,
      lng: -60.6411
    },
    {
      id: "cli-2",
      name: "Cliente Centro",
      address: "Córdoba 1800, Rosario",
      phone: "3410000002",
      openingHours: "09:00 a 13:00",
      zone: "Centro",
      notes: "Entregar por depósito lateral.",
      priority: "normal",
      lat: -32.9442,
      lng: -60.6475
    },
    {
      id: "cli-3",
      name: "Cliente Funes",
      address: "Funes, Santa Fe",
      phone: "3410000003",
      openingHours: "08:00 a 16:00",
      zone: "Funes / Roldán",
      notes: "Tiene autoelevador.",
      priority: "normal",
      lat: -32.9169,
      lng: -60.8096
    }
  ],
  trucks: [
    {
      id: "cam-1",
      name: "Camión 1",
      plate: "AB123CD",
      driver: "Chofer 1",
      driverPhone: "3410000000",
      capacityKg: 1500,
      available: true,
      color: "#2563eb"
    },
    {
      id: "cam-2",
      name: "Camión 2",
      plate: "AC456EF",
      driver: "Chofer 2",
      driverPhone: "3410000000",
      capacityKg: 3000,
      available: true,
      color: "#16a34a"
    }
  ],
  orders: [
    {
      id: "ped-1",
      date: today(),
      customerId: "cli-1",
      items: "Chapas y caños",
      weightKg: 420,
      packages: 4,
      deliveryWindow: "08:00 a 12:00",
      status: "pendiente"
    },
    {
      id: "ped-2",
      date: today(),
      customerId: "cli-2",
      items: "Pedido mostrador",
      weightKg: 180,
      packages: 2,
      deliveryWindow: "09:00 a 13:00",
      status: "pendiente"
    },
    {
      id: "ped-3",
      date: today(),
      customerId: "cli-3",
      items: "Perfiles UPN",
      weightKg: 860,
      packages: 6,
      deliveryWindow: "08:00 a 16:00",
      status: "pendiente"
    }
  ]
};

export function loadData(): AppData {
  if (typeof window === "undefined") return defaultData;

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultData;

  try {
    return JSON.parse(raw) as AppData;
  } catch {
    return defaultData;
  }
}

export function saveData(data: AppData) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
