import { AppData, Customer, Order, Origin, Truck } from "./types";
import { isSupabaseConfigured, supabase } from "./supabase";

export const STORAGE_KEY = "rutas-himetal-v1";
export const today = () => new Date().toISOString().slice(0, 10);

export const defaultData: AppData = {
  origin: { name: "Himetal SA", address: "Rosario, Santa Fe", lat: -32.9468, lng: -60.6393 },
  customers: [],
  trucks: [],
  orders: []
};

function localLoad(): AppData {
  if (typeof window === "undefined") return defaultData;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultData;
  try { return JSON.parse(raw) as AppData; } catch { return defaultData; }
}

function localSave(data: AppData) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function dbCustomer(row: any): Customer {
  return {
    id: row.id,
    name: row.name ?? "",
    address: row.address ?? "",
    phone: row.phone ?? "",
    openingHours: row.opening_hours ?? "",
    zone: row.zone ?? "",
    notes: row.notes ?? "",
    priority: row.priority ?? "normal",
    lat: Number(row.lat ?? -32.9468),
    lng: Number(row.lng ?? -60.6393)
  };
}

function dbTruck(row: any): Truck {
  return {
    id: row.id,
    name: row.name ?? "",
    plate: row.plate ?? "",
    driver: row.driver ?? "",
    driverPhone: row.driver_phone ?? "",
    capacityKg: Number(row.capacity_kg ?? 0),
    available: Boolean(row.available),
    color: row.color ?? "#2563eb"
  };
}

function dbOrder(row: any): Order {
  return {
    id: row.id,
    date: row.date,
    customerId: row.customer_id,
    items: row.items ?? "",
    weightKg: Number(row.weight_kg ?? 0),
    packages: Number(row.packages ?? 1),
    deliveryWindow: row.delivery_window ?? "A coordinar",
    status: row.status ?? "pendiente",
    truckId: row.truck_id ?? undefined
  };
}

export async function loadData(): Promise<AppData> {
  if (!isSupabaseConfigured || !supabase) return localLoad();

  const [originRes, customersRes, trucksRes, ordersRes] = await Promise.all([
    supabase.from("origin_config").select("*").eq("id", "main").maybeSingle(),
    supabase.from("customers").select("*").order("created_at", { ascending: false }),
    supabase.from("trucks").select("*").order("created_at", { ascending: false }),
    supabase.from("orders").select("*").order("created_at", { ascending: false })
  ]);

  if (originRes.error || customersRes.error || trucksRes.error || ordersRes.error) {
    throw new Error(originRes.error?.message || customersRes.error?.message || trucksRes.error?.message || ordersRes.error?.message || "Error leyendo Supabase");
  }

  const originRow = originRes.data;
  const origin: Origin = originRow
    ? { name: originRow.name, address: originRow.address, lat: Number(originRow.lat), lng: Number(originRow.lng) }
    : defaultData.origin;

  return {
    origin,
    customers: (customersRes.data ?? []).map(dbCustomer),
    trucks: (trucksRes.data ?? []).map(dbTruck),
    orders: (ordersRes.data ?? []).map(dbOrder)
  };
}

export async function saveData(data: AppData): Promise<void> {
  localSave(data);
  if (!isSupabaseConfigured || !supabase) return;

  const originPayload = { id: "main", name: data.origin.name, address: data.origin.address, lat: data.origin.lat, lng: data.origin.lng, updated_at: new Date().toISOString() };
  const customerPayload = data.customers.map((c) => ({ id: c.id, name: c.name, address: c.address, phone: c.phone, opening_hours: c.openingHours, zone: c.zone, notes: c.notes, priority: c.priority, lat: c.lat, lng: c.lng }));
  const truckPayload = data.trucks.map((t) => ({ id: t.id, name: t.name, plate: t.plate, driver: t.driver, driver_phone: t.driverPhone, capacity_kg: t.capacityKg, available: t.available, color: t.color }));
  const orderPayload = data.orders.map((o) => ({ id: o.id, date: o.date, customer_id: o.customerId, items: o.items, weight_kg: o.weightKg, packages: o.packages, delivery_window: o.deliveryWindow, status: o.status, truck_id: o.truckId ?? null }));

  const operations: PromiseLike<any>[] = [supabase.from("origin_config").upsert(originPayload)];
  if (customerPayload.length) operations.push(supabase.from("customers").upsert(customerPayload));
  if (truckPayload.length) operations.push(supabase.from("trucks").upsert(truckPayload));
  if (orderPayload.length) operations.push(supabase.from("orders").upsert(orderPayload));

  const results = await Promise.all(operations);
  const error = results.find((r) => r.error)?.error;
  if (error) throw new Error(error.message);
}

export async function deleteCustomerFromDb(id: string) {
  if (!isSupabaseConfigured || !supabase) return;
  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteOrderFromDb(id: string) {
  if (!isSupabaseConfigured || !supabase) return;
  const { error } = await supabase.from("orders").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteTruckFromDb(id: string) {
  if (!isSupabaseConfigured || !supabase) return;
  const { error } = await supabase.from("trucks").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
