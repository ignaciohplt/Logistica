"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Download,
  MapPinned,
  PackagePlus,
  RefreshCcw,
  Route,
  Save,
  Send,
  Settings,
  Truck as TruckIcon,
  Users
} from "lucide-react";
import { AppData, Customer, Order, PlannedRoute, Priority, RouteOption, Truck } from "@/lib/types";
import { defaultData, deleteCustomerFromDb, deleteOrderFromDb, deleteTruckFromDb, loadData, saveData, today } from "@/lib/storage";
import { generateRouteOptions, googleMapsUrl, minutesToText, whatsappRouteText } from "@/lib/route";

const RouteMap = dynamic(() => import("@/components/RouteMap"), { ssr: false });

type Tab = "pedidos" | "clientes" | "camiones" | "mapa" | "config";

const blankCustomer: Omit<Customer, "id"> = {
  name: "",
  address: "",
  phone: "",
  openingHours: "08:00 a 12:00 / 15:00 a 18:00",
  zone: "Rosario",
  notes: "",
  priority: "normal",
  lat: -32.9468,
  lng: -60.6393
};

const truckColors = ["#2563eb", "#16a34a", "#f97316", "#9333ea", "#dc2626", "#0891b2"];

export default function Dashboard() {
  const [data, setData] = useState<AppData>(defaultData);
  const [activeTab, setActiveTab] = useState<Tab>("pedidos");
  const [selectedDate, setSelectedDate] = useState(today());
  const [selectedOptionId, setSelectedOptionId] = useState("distance");
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [geocodingCustomerId, setGeocodingCustomerId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function start() {
      try {
        const saved = await loadData();
        setData(saved);
        setLoaded(true);
      } catch (error) {
        flash(error instanceof Error ? error.message : "No se pudieron cargar los datos.");
      } finally {
        setLoading(false);
      }
    }

    start();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    saveData(data).catch((error) => {
      flash(error instanceof Error ? error.message : "No se pudieron guardar los datos.");
    });
  }, [data, loaded]);

  const routeOptions = useMemo(
    () =>
      generateRouteOptions({
        date: selectedDate,
        origin: data.origin,
        customers: data.customers,
        trucks: data.trucks,
        orders: data.orders
      }),
    [data, selectedDate]
  );

  const selectedOption = routeOptions.find((option) => option.id === selectedOptionId) ?? routeOptions[0];
  const todaysOrders = data.orders.filter((order) => order.date === selectedDate);
  const pendingOrders = todaysOrders.filter((order) => order.status !== "entregado");
  const totalWeight = pendingOrders.reduce((acc, order) => acc + Number(order.weightKg || 0), 0);

  function flash(text: string) {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 2600);
  }

  function updateData(next: AppData) {
    setData(next);
  }

  function addCustomer(customer: Omit<Customer, "id">) {
    const next: Customer = { ...customer, id: `cli-${Date.now()}` };
    updateData({ ...data, customers: [next, ...data.customers] });
    flash("Cliente cargado correctamente.");
  }

  function updateCustomer(customer: Customer) {
    updateData({ ...data, customers: data.customers.map((item) => (item.id === customer.id ? customer : item)) });
    setEditingCustomer(null);
    flash("Cliente actualizado.");
  }

  async function removeCustomer(customerId: string) {
    try {
      await deleteCustomerFromDb(customerId);
      updateData({
        ...data,
        customers: data.customers.filter((customer) => customer.id !== customerId),
        orders: data.orders.filter((order) => order.customerId !== customerId)
      });
      flash("Cliente eliminado junto con sus pedidos.");
    } catch (error) {
      flash(error instanceof Error ? error.message : "No se pudo eliminar el cliente.");
    }
  }

  function addOrder(formData: FormData) {
    const customerId = String(formData.get("customerId") || "");
    if (!customerId) return flash("Primero elegí un cliente.");

    const next: Order = {
      id: `ped-${Date.now()}`,
      date: String(formData.get("date") || selectedDate),
      customerId,
      items: String(formData.get("items") || "Pedido sin detalle"),
      weightKg: Number(formData.get("weightKg") || 0),
      packages: Number(formData.get("packages") || 1),
      deliveryWindow: String(formData.get("deliveryWindow") || "A coordinar"),
      status: "pendiente"
    };

    updateData({ ...data, orders: [next, ...data.orders] });
    flash("Pedido agregado.");
  }

  function updateOrderStatus(orderId: string, status: Order["status"]) {
    updateData({
      ...data,
      orders: data.orders.map((order) => (order.id === orderId ? { ...order, status } : order))
    });
  }

  async function removeOrder(orderId: string) {
    try {
      await deleteOrderFromDb(orderId);
      updateData({ ...data, orders: data.orders.filter((order) => order.id !== orderId) });
      flash("Pedido eliminado.");
    } catch (error) {
      flash(error instanceof Error ? error.message : "No se pudo eliminar el pedido.");
    }
  }

  function addTruck(formData: FormData) {
    const next: Truck = {
      id: `cam-${Date.now()}`,
      name: String(formData.get("name") || `Camión ${data.trucks.length + 1}`),
      plate: String(formData.get("plate") || ""),
      driver: String(formData.get("driver") || ""),
      driverPhone: String(formData.get("driverPhone") || ""),
      capacityKg: Number(formData.get("capacityKg") || 1500),
      available: true,
      color: truckColors[data.trucks.length % truckColors.length]
    };

    updateData({ ...data, trucks: [next, ...data.trucks] });
    flash("Camión cargado.");
  }

  function toggleTruck(truckId: string) {
    updateData({
      ...data,
      trucks: data.trucks.map((truck) => (truck.id === truckId ? { ...truck, available: !truck.available } : truck))
    });
  }

  async function removeTruck(truckId: string) {
    try {
      await deleteTruckFromDb(truckId);
      updateData({ ...data, trucks: data.trucks.filter((truck) => truck.id !== truckId) });
      flash("Camión eliminado.");
    } catch (error) {
      flash(error instanceof Error ? error.message : "No se pudo eliminar el camión.");
    }
  }

  function resetDemo() {
    updateData(defaultData);
    setSelectedDate(today());
    flash("Se restauraron los datos de ejemplo.");
  }

  async function geocodeCustomer(customer: Customer) {
    if (!customer.address.trim()) return flash("Cargá una dirección para buscar coordenadas.");
    setGeocodingCustomerId(customer.id);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(customer.address)}`);
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "No se encontró la dirección");
      updateCustomer({ ...customer, lat: payload.lat, lng: payload.lng, address: payload.displayName || customer.address });
      flash("Coordenadas encontradas y guardadas.");
    } catch (error) {
      flash(error instanceof Error ? error.message : "No se pudo buscar esa dirección.");
    } finally {
      setGeocodingCustomerId(null);
    }
  }

  function exportCsv() {
    const rows = [
      ["Camión", "Chofer", "Orden", "Cliente", "Dirección", "Teléfono", "Horario", "Pedido", "Peso kg", "Observaciones"],
      ...(selectedOption?.routes ?? []).flatMap((route) =>
        route.stops.map((stop, index) => [
          route.truck.name,
          route.truck.driver,
          String(index + 1),
          stop.customer.name,
          stop.customer.address,
          stop.customer.phone,
          stop.order.deliveryWindow,
          stop.order.items,
          String(stop.order.weightKg),
          stop.customer.notes
        ])
      )
    ];

    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `recorridos-${selectedDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6 text-slate-950">
        <div className="rounded-3xl bg-white p-8 text-center shadow-soft">
          <p className="text-lg font-black">Cargando datos...</p>
          <p className="mt-2 text-sm text-slate-500">Conectando con Supabase.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 overflow-hidden rounded-[2rem] bg-slate-950 p-6 text-white shadow-soft">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-300">Logística de reparto</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">Rutas Himetal</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">
                Cargá pedidos, clientes y camiones. La app arma opciones de recorridos, los muestra en mapa y te permite abrirlos en Google Maps o compartirlos por WhatsApp.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
              <Stat title="Pedidos hoy" value={todaysOrders.length} />
              <Stat title="Pendientes" value={pendingOrders.length} />
              <Stat title="Camiones" value={data.trucks.filter((truck) => truck.available).length} />
              <Stat title="Kg pendientes" value={totalWeight.toLocaleString("es-AR")} />
            </div>
          </div>
        </header>

        {message && <div className="mb-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">{message}</div>}

        <div className="mb-5 flex flex-wrap gap-2">
          <TabButton active={activeTab === "pedidos"} icon={<PackagePlus size={18} />} onClick={() => setActiveTab("pedidos")}>Pedidos</TabButton>
          <TabButton active={activeTab === "clientes"} icon={<Users size={18} />} onClick={() => setActiveTab("clientes")}>Clientes</TabButton>
          <TabButton active={activeTab === "camiones"} icon={<TruckIcon size={18} />} onClick={() => setActiveTab("camiones")}>Camiones</TabButton>
          <TabButton active={activeTab === "mapa"} icon={<MapPinned size={18} />} onClick={() => setActiveTab("mapa")}>Mapa</TabButton>
          <TabButton active={activeTab === "config"} icon={<Settings size={18} />} onClick={() => setActiveTab("config")}>Configuración</TabButton>
        </div>

        <section className="grid gap-5 lg:grid-cols-[360px_1fr]">
          <aside className="space-y-5">
            <Panel title="Día de reparto" icon={<CalendarDays size={18} />}>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Fecha</label>
              <input value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} type="date" className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500" />
              <button onClick={() => setActiveTab("mapa")} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700">
                <Route size={18} /> Ver recorridos
              </button>
            </Panel>

            <Panel title="Opciones generadas" icon={<Route size={18} />}>
              <div className="space-y-2">
                {routeOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setSelectedOptionId(option.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${selectedOptionId === option.id ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white hover:border-slate-300"}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-black text-slate-950">{option.name}</p>
                      <span className="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-bold text-white">{option.totalKm} km</span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{option.description}</p>
                    <p className="mt-2 text-xs font-bold text-slate-700">Tiempo estimado: {minutesToText(option.totalMinutes)}</p>
                  </button>
                ))}
              </div>
              <button onClick={exportCsv} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 hover:bg-slate-50">
                <Download size={17} /> Exportar recorrido CSV
              </button>
            </Panel>
          </aside>

          <section>
            {activeTab === "pedidos" && <OrdersView data={data} selectedDate={selectedDate} addOrder={addOrder} updateOrderStatus={updateOrderStatus} removeOrder={removeOrder} />}
            {activeTab === "clientes" && (
              <CustomersView
                data={data}
                addCustomer={addCustomer}
                updateCustomer={updateCustomer}
                removeCustomer={removeCustomer}
                editingCustomer={editingCustomer}
                setEditingCustomer={setEditingCustomer}
                geocodeCustomer={geocodeCustomer}
                geocodingCustomerId={geocodingCustomerId}
              />
            )}
            {activeTab === "camiones" && <TrucksView data={data} addTruck={addTruck} toggleTruck={toggleTruck} removeTruck={removeTruck} />}
            {activeTab === "mapa" && <MapView option={selectedOption} origin={data.origin} />}
            {activeTab === "config" && <ConfigView data={data} setData={updateData} resetDemo={resetDemo} />}
          </section>
        </section>
      </section>
    </main>
  );
}

function Stat({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-3xl bg-white/10 p-4 backdrop-blur">
      <p className="text-xs font-bold uppercase tracking-wide text-blue-200">{title}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  );
}

function TabButton({ children, active, onClick, icon }: { children: React.ReactNode; active: boolean; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition ${active ? "bg-slate-950 text-white shadow-soft" : "bg-white text-slate-700 hover:bg-slate-50"}`}>
      {icon}
      {children}
    </button>
  );
}

function Panel({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-soft">
      <div className="mb-4 flex items-center gap-2 text-slate-950">
        {icon}
        <h2 className="text-lg font-black">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

const inputClass = "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

function OrdersView({ data, selectedDate, addOrder, updateOrderStatus, removeOrder }: {
  data: AppData;
  selectedDate: string;
  addOrder: (formData: FormData) => void;
  updateOrderStatus: (orderId: string, status: Order["status"]) => void;
  removeOrder: (orderId: string) => void;
}) {
  const orders = data.orders.filter((order) => order.date === selectedDate);

  return (
    <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
      <Panel title="Cargar pedido" icon={<PackagePlus size={18} />}>
        <form onSubmit={(e) => { e.preventDefault(); addOrder(new FormData(e.currentTarget)); e.currentTarget.reset(); }} className="space-y-3">
          <input type="hidden" name="date" value={selectedDate} />
          <Field label="Cliente">
            <select name="customerId" className={inputClass} defaultValue="">
              <option value="" disabled>Seleccionar cliente</option>
              {data.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} - {customer.zone}</option>)}
            </select>
          </Field>
          <Field label="Detalle del pedido">
            <textarea name="items" className={inputClass} rows={3} placeholder="Ej: 3 chapas, 10 caños, pedido láser..." />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Peso kg">
              <input name="weightKg" type="number" min="0" step="1" className={inputClass} placeholder="250" />
            </Field>
            <Field label="Bultos">
              <input name="packages" type="number" min="1" step="1" className={inputClass} placeholder="3" />
            </Field>
          </div>
          <Field label="Horario de entrega">
            <input name="deliveryWindow" className={inputClass} placeholder="08:00 a 12:00" />
          </Field>
          <button className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white hover:bg-slate-800">
            <Save size={17} /> Guardar pedido
          </button>
        </form>
      </Panel>

      <Panel title={`Pedidos del ${selectedDate}`}>
        <div className="space-y-3">
          {orders.length === 0 && <Empty text="Todavía no hay pedidos para esta fecha." />}
          {orders.map((order) => {
            const customer = data.customers.find((item) => item.id === order.customerId);
            return (
              <div key={order.id} className="rounded-3xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-black text-slate-950">{customer?.name ?? "Cliente eliminado"}</p>
                    <p className="text-sm text-slate-500">{customer?.address}</p>
                  </div>
                  <select value={order.status} onChange={(e) => updateOrderStatus(order.id, e.target.value as Order["status"])} className="rounded-full border border-slate-200 px-3 py-2 text-xs font-bold">
                    <option value="pendiente">Pendiente</option>
                    <option value="en-camino">En camino</option>
                    <option value="entregado">Entregado</option>
                    <option value="no-entregado">No entregado</option>
                  </select>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-4">
                  <Info label="Pedido" value={order.items} />
                  <Info label="Peso" value={`${order.weightKg} kg`} />
                  <Info label="Bultos" value={String(order.packages)} />
                  <Info label="Horario" value={order.deliveryWindow} />
                </div>
                <button onClick={() => removeOrder(order.id)} className="mt-3 text-xs font-bold text-red-600 hover:text-red-700">Eliminar pedido</button>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

function CustomersView({ data, addCustomer, updateCustomer, removeCustomer, editingCustomer, setEditingCustomer, geocodeCustomer, geocodingCustomerId }: {
  data: AppData;
  addCustomer: (customer: Omit<Customer, "id">) => void;
  updateCustomer: (customer: Customer) => void;
  removeCustomer: (customerId: string) => void;
  editingCustomer: Customer | null;
  setEditingCustomer: (customer: Customer | null) => void;
  geocodeCustomer: (customer: Customer) => void;
  geocodingCustomerId: string | null;
}) {
  const [form, setForm] = useState<Omit<Customer, "id">>(blankCustomer);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.name.trim() || !form.address.trim()) return;
    addCustomer(form);
    setForm(blankCustomer);
  }

  function startEdit(customer: Customer) {
    setEditingCustomer(customer);
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
      <Panel title="Cargar cliente" icon={<Users size={18} />}>
        <CustomerForm value={form} setValue={setForm} onSubmit={submit} submitText="Guardar cliente" />
        <p className="mt-3 text-xs leading-5 text-slate-500">Tip: si no sabés latitud y longitud, guardá el cliente y después tocá “Buscar coordenadas”.</p>
      </Panel>

      <Panel title="Clientes guardados">
        <div className="space-y-3">
          {data.customers.map((customer) => (
            <div key={customer.id} className="rounded-3xl border border-slate-200 bg-white p-4">
              {editingCustomer?.id === customer.id ? (
                <EditCustomerForm customer={editingCustomer} setEditingCustomer={setEditingCustomer} updateCustomer={updateCustomer} />
              ) : (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-black">{customer.name}</p>
                      <p className="text-sm text-slate-500">{customer.address}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase text-slate-700">{customer.priority}</span>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                    <Info label="Teléfono" value={customer.phone || "Sin cargar"} />
                    <Info label="Horario" value={customer.openingHours} />
                    <Info label="Zona" value={customer.zone} />
                  </div>
                  <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">{customer.notes || "Sin observaciones."}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button onClick={() => startEdit(customer)} className="rounded-full bg-slate-950 px-3 py-2 text-xs font-bold text-white">Editar</button>
                    <button onClick={() => geocodeCustomer(customer)} className="rounded-full border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700">
                      {geocodingCustomerId === customer.id ? "Buscando..." : "Buscar coordenadas"}
                    </button>
                    <button onClick={() => removeCustomer(customer.id)} className="rounded-full border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">Eliminar</button>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">Coordenadas: {customer.lat}, {customer.lng}</p>
                </>
              )}
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function CustomerForm({ value, setValue, onSubmit, submitText }: {
  value: Omit<Customer, "id">;
  setValue: (value: Omit<Customer, "id">) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  submitText: string;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Field label="Nombre del cliente">
        <input value={value.name} onChange={(e) => setValue({ ...value, name: e.target.value })} className={inputClass} placeholder="Ej: Metalúrgica Pérez" />
      </Field>
      <Field label="Dirección">
        <input value={value.address} onChange={(e) => setValue({ ...value, address: e.target.value })} className={inputClass} placeholder="Av. San Martín 1234, Rosario" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Teléfono / WhatsApp">
          <input value={value.phone} onChange={(e) => setValue({ ...value, phone: e.target.value })} className={inputClass} placeholder="341..." />
        </Field>
        <Field label="Zona">
          <input value={value.zone} onChange={(e) => setValue({ ...value, zone: e.target.value })} className={inputClass} placeholder="Rosario Sur" />
        </Field>
      </div>
      <Field label="Horario de atención">
        <input value={value.openingHours} onChange={(e) => setValue({ ...value, openingHours: e.target.value })} className={inputClass} />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Prioridad">
          <select value={value.priority} onChange={(e) => setValue({ ...value, priority: e.target.value as Priority })} className={inputClass}>
            <option value="alta">Alta</option>
            <option value="normal">Normal</option>
            <option value="baja">Baja</option>
          </select>
        </Field>
        <Field label="Latitud">
          <input value={value.lat} onChange={(e) => setValue({ ...value, lat: Number(e.target.value) })} type="number" step="0.000001" className={inputClass} />
        </Field>
        <Field label="Longitud">
          <input value={value.lng} onChange={(e) => setValue({ ...value, lng: Number(e.target.value) })} type="number" step="0.000001" className={inputClass} />
        </Field>
      </div>
      <Field label="Observaciones">
        <textarea value={value.notes} onChange={(e) => setValue({ ...value, notes: e.target.value })} className={inputClass} rows={3} placeholder="Ej: llamar antes, portón azul, no entregar al mediodía..." />
      </Field>
      <button className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white hover:bg-slate-800">
        <Save size={17} /> {submitText}
      </button>
    </form>
  );
}

function EditCustomerForm({ customer, setEditingCustomer, updateCustomer }: {
  customer: Customer;
  setEditingCustomer: (customer: Customer | null) => void;
  updateCustomer: (customer: Customer) => void;
}) {
  const [form, setForm] = useState<Customer>(customer);
  return (
    <div className="space-y-3">
      <CustomerForm value={form} setValue={(value) => setForm({ ...value, id: form.id })} onSubmit={(e) => { e.preventDefault(); updateCustomer(form); }} submitText="Actualizar cliente" />
      <button type="button" onClick={() => setEditingCustomer(null)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700">Cancelar</button>
    </div>
  );
}

function TrucksView({ data, addTruck, toggleTruck, removeTruck }: {
  data: AppData;
  addTruck: (formData: FormData) => void;
  toggleTruck: (truckId: string) => void;
  removeTruck: (truckId: string) => void;
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
      <Panel title="Cargar camión" icon={<TruckIcon size={18} />}>
        <form onSubmit={(e) => { e.preventDefault(); addTruck(new FormData(e.currentTarget)); e.currentTarget.reset(); }} className="space-y-3">
          <Field label="Nombre">
            <input name="name" className={inputClass} placeholder="Camión 1" />
          </Field>
          <Field label="Patente">
            <input name="plate" className={inputClass} placeholder="AB123CD" />
          </Field>
          <Field label="Chofer">
            <input name="driver" className={inputClass} placeholder="Nombre del chofer" />
          </Field>
          <Field label="WhatsApp chofer">
            <input name="driverPhone" className={inputClass} placeholder="341..." />
          </Field>
          <Field label="Capacidad kg">
            <input name="capacityKg" type="number" min="0" className={inputClass} placeholder="1500" />
          </Field>
          <button className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white hover:bg-slate-800">
            <Save size={17} /> Guardar camión
          </button>
        </form>
      </Panel>

      <Panel title="Camiones disponibles">
        <div className="grid gap-3 md:grid-cols-2">
          {data.trucks.map((truck) => (
            <div key={truck.id} className="rounded-3xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-black">{truck.name}</p>
                  <p className="text-sm text-slate-500">{truck.plate || "Sin patente"}</p>
                </div>
                <span style={{ background: truck.color }} className="h-5 w-5 rounded-full" />
              </div>
              <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <Info label="Chofer" value={truck.driver || "Sin cargar"} />
                <Info label="Capacidad" value={`${truck.capacityKg} kg`} />
                <Info label="WhatsApp" value={truck.driverPhone || "Sin cargar"} />
                <Info label="Estado" value={truck.available ? "Disponible" : "No disponible"} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => toggleTruck(truck.id)} className="rounded-full bg-slate-950 px-3 py-2 text-xs font-bold text-white">{truck.available ? "Marcar no disponible" : "Marcar disponible"}</button>
                <button onClick={() => removeTruck(truck.id)} className="rounded-full border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function MapView({ option, origin }: { option?: RouteOption; origin: AppData["origin"] }) {
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const routes = option?.routes ?? [];
  const selectedRoutes = selectedRouteId ? routes.filter((route) => route.truck.id === selectedRouteId) : routes;

  return (
    <div className="space-y-5">
      <Panel title="Mapa de recorridos" icon={<MapPinned size={18} />}>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button onClick={() => setSelectedRouteId(null)} className={`rounded-full px-3 py-2 text-xs font-bold ${selectedRouteId === null ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700"}`}>Todos</button>
          {routes.map((route) => (
            <button key={route.truck.id} onClick={() => setSelectedRouteId(route.truck.id)} className={`rounded-full px-3 py-2 text-xs font-bold ${selectedRouteId === route.truck.id ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700"}`}>{route.truck.name}</button>
          ))}
        </div>
        <div className="h-[520px] rounded-[1.5rem] border border-slate-200 bg-slate-200">
          <RouteMap origin={origin} routes={selectedRoutes} />
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        {routes.length === 0 && <Empty text="No hay recorridos para mostrar. Cargá pedidos y camiones disponibles." />}
        {routes.map((route) => <RouteCard key={route.truck.id} route={route} origin={origin} />)}
      </div>
    </div>
  );
}

function RouteCard({ route, origin }: { route: PlannedRoute; origin: AppData["origin"] }) {
  const mapsUrl = googleMapsUrl(route, origin);
  const whatsText = encodeURIComponent(whatsappRouteText(route, origin));
  const phone = route.truck.driverPhone.replace(/\D/g, "");
  const whatsappUrl = phone ? `https://wa.me/${phone}?text=${whatsText}` : `https://wa.me/?text=${whatsText}`;

  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xl font-black">{route.truck.name}</p>
          <p className="text-sm text-slate-500">Chofer: {route.truck.driver || "Sin cargar"}</p>
        </div>
        <span style={{ background: route.truck.color }} className="h-6 w-6 rounded-full" />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
        <Info label="Paradas" value={String(route.stops.length)} />
        <Info label="Km" value={`${route.distanceKm} km`} />
        <Info label="Tiempo" value={minutesToText(route.estimatedMinutes)} />
      </div>
      <ol className="mt-4 space-y-3">
        {route.stops.map((stop, index) => (
          <li key={stop.order.id} className="rounded-2xl bg-slate-50 p-3">
            <p className="font-black"><span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-950 text-xs text-white">{index + 1}</span>{stop.customer.name}</p>
            <p className="mt-1 text-sm text-slate-600">{stop.customer.address}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">{stop.order.deliveryWindow} · {stop.order.items}</p>
          </li>
        ))}
      </ol>
      <div className="mt-4 flex flex-wrap gap-2">
        <a href={mapsUrl} target="_blank" rel="noreferrer" className="rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">Abrir en Google Maps</a>
        <a href={whatsappUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-full bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700"><Send size={16} /> Enviar WhatsApp</a>
      </div>
    </div>
  );
}

function ConfigView({ data, setData, resetDemo }: { data: AppData; setData: (data: AppData) => void; resetDemo: () => void }) {
  const [origin, setOrigin] = useState(data.origin);

  useEffect(() => {
    setOrigin(data.origin);
  }, [data.origin]);

  async function geocodeOrigin() {
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(origin.address)}`);
    const payload = await res.json();
    if (res.ok) {
      const next = { ...origin, lat: payload.lat, lng: payload.lng, address: payload.displayName || origin.address };
      setOrigin(next);
      setData({ ...data, origin: next });
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
      <Panel title="Punto de salida" icon={<Settings size={18} />}>
        <div className="space-y-3">
          <Field label="Nombre de la empresa / depósito">
            <input value={origin.name} onChange={(e) => setOrigin({ ...origin, name: e.target.value })} className={inputClass} />
          </Field>
          <Field label="Dirección de salida">
            <input value={origin.address} onChange={(e) => setOrigin({ ...origin, address: e.target.value })} className={inputClass} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Latitud">
              <input value={origin.lat} onChange={(e) => setOrigin({ ...origin, lat: Number(e.target.value) })} type="number" step="0.000001" className={inputClass} />
            </Field>
            <Field label="Longitud">
              <input value={origin.lng} onChange={(e) => setOrigin({ ...origin, lng: Number(e.target.value) })} type="number" step="0.000001" className={inputClass} />
            </Field>
          </div>
          <button onClick={() => setData({ ...data, origin })} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white hover:bg-slate-800"><Save size={17} /> Guardar salida</button>
          <button onClick={geocodeOrigin} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-black text-blue-700"><MapPinned size={17} /> Buscar coordenadas</button>
        </div>
      </Panel>

      <Panel title="Datos y mantenimiento">
        <div className="space-y-4">
          <div className="rounded-3xl bg-slate-50 p-4">
            <p className="font-black">Versión inicial sin base de datos</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">Esta versión guarda datos en el navegador usando localStorage. Sirve para probar el flujo en Vercel. Cuando quieras varios usuarios o guardar en la nube, se conecta a Supabase.</p>
          </div>
          <button onClick={resetDemo} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-800 hover:bg-slate-50"><RefreshCcw size={17} /> Restaurar datos de ejemplo</button>
        </div>
      </Panel>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 font-bold text-slate-800">{value}</p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-semibold text-slate-500">{text}</div>;
}
