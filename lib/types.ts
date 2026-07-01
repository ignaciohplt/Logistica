export type Priority = "alta" | "normal" | "baja";
export type OrderStatus = "pendiente" | "en-camino" | "entregado" | "no-entregado";

export type Origin = {
  name: string;
  address: string;
  lat: number;
  lng: number;
};

export type Customer = {
  id: string;
  name: string;
  address: string;
  phone: string;
  openingHours: string;
  zone: string;
  notes: string;
  priority: Priority;
  lat: number;
  lng: number;
};

export type Truck = {
  id: string;
  name: string;
  plate: string;
  driver: string;
  driverPhone: string;
  capacityKg: number;
  available: boolean;
  color: string;
};

export type Order = {
  id: string;
  date: string;
  customerId: string;
  items: string;
  weightKg: number;
  packages: number;
  deliveryWindow: string;
  status: OrderStatus;
  truckId?: string;
};

export type Stop = {
  order: Order;
  customer: Customer;
};

export type PlannedRoute = {
  truck: Truck;
  stops: Stop[];
  distanceKm: number;
  estimatedMinutes: number;
  totalWeightKg: number;
};

export type RouteOption = {
  id: string;
  name: string;
  description: string;
  routes: PlannedRoute[];
  totalKm: number;
  totalMinutes: number;
};

export type AppData = {
  origin: Origin;
  customers: Customer[];
  trucks: Truck[];
  orders: Order[];
};
