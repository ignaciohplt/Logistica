import { Customer, Order, Origin, PlannedRoute, RouteOption, Stop, Truck } from "./types";

const AVG_SPEED_KMH = 28;
const SERVICE_MINUTES_PER_STOP = 10;

type Coordinate = { lat: number; lng: number };

export function distanceKm(a: Coordinate, b: Coordinate) {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function toRad(value: number) {
  return (value * Math.PI) / 180;
}

function parseWindowStart(windowText: string) {
  const match = windowText.match(/(\d{1,2})(?::(\d{2}))?/);
  if (!match) return 99;
  const hour = Number(match[1]);
  const minute = Number(match[2] ?? 0);
  return hour + minute / 60;
}

function priorityScore(priority: Customer["priority"]) {
  if (priority === "alta") return 0;
  if (priority === "normal") return 1;
  return 2;
}

function nearestNeighbor(stops: Stop[], origin: Origin) {
  const pending = [...stops];
  const ordered: Stop[] = [];
  let current: Coordinate = origin;

  while (pending.length) {
    pending.sort((a, b) => distanceKm(current, a.customer) - distanceKm(current, b.customer));
    const next = pending.shift();
    if (next) {
      ordered.push(next);
      current = next.customer;
    }
  }

  return ordered;
}

function routeStats(stops: Stop[], origin: Origin) {
  if (!stops.length) return { distanceKm: 0, minutes: 0 };

  let current: Coordinate = origin;
  let total = 0;

  for (const stop of stops) {
    total += distanceKm(current, stop.customer);
    current = stop.customer;
  }

  total += distanceKm(current, origin);
  const drivingMinutes = (total / AVG_SPEED_KMH) * 60;
  return {
    distanceKm: round(total),
    minutes: Math.round(drivingMinutes + stops.length * SERVICE_MINUTES_PER_STOP)
  };
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

function buildStops(orders: Order[], customers: Customer[]) {
  return orders
    .map((order) => {
      const customer = customers.find((item) => item.id === order.customerId);
      if (!customer) return undefined;
      return { order, customer } satisfies Stop;
    })
    .filter(Boolean) as Stop[];
}

function assignStops(stops: Stop[], trucks: Truck[], origin: Origin) {
  const availableTrucks = trucks.filter((truck) => truck.available);
  const buckets = availableTrucks.map((truck) => ({ truck, stops: [] as Stop[], load: 0 }));

  if (!buckets.length) return [];

  for (const stop of stops) {
    const candidates = buckets
      .filter((bucket) => bucket.load + stop.order.weightKg <= bucket.truck.capacityKg)
      .sort((a, b) => a.load - b.load);

    const target = candidates[0] ?? buckets.sort((a, b) => a.load - b.load)[0];
    target.stops.push(stop);
    target.load += stop.order.weightKg;
  }

  return buckets.map((bucket) => {
    const ordered = nearestNeighbor(bucket.stops, origin);
    const stats = routeStats(ordered, origin);
    return {
      truck: bucket.truck,
      stops: ordered,
      distanceKm: stats.distanceKm,
      estimatedMinutes: stats.minutes,
      totalWeightKg: bucket.load
    } satisfies PlannedRoute;
  });
}

function optionTotals(routes: PlannedRoute[]) {
  return {
    totalKm: round(routes.reduce((acc, route) => acc + route.distanceKm, 0)),
    totalMinutes: routes.reduce((acc, route) => acc + route.estimatedMinutes, 0)
  };
}

function createOption(id: string, name: string, description: string, sortedStops: Stop[], trucks: Truck[], origin: Origin): RouteOption {
  const routes = assignStops(sortedStops, trucks, origin).filter((route) => route.stops.length > 0);
  const totals = optionTotals(routes);

  return {
    id,
    name,
    description,
    routes,
    totalKm: totals.totalKm,
    totalMinutes: totals.totalMinutes
  };
}

export function generateRouteOptions(args: {
  date: string;
  origin: Origin;
  customers: Customer[];
  trucks: Truck[];
  orders: Order[];
}): RouteOption[] {
  const { date, origin, customers, trucks, orders } = args;
  const todaysOrders = orders.filter((order) => order.date === date && order.status !== "entregado");
  const stops = buildStops(todaysOrders, customers);

  const byDistance = nearestNeighbor(stops, origin);
  const bySchedule = [...stops].sort((a, b) => {
    const timeDiff = parseWindowStart(a.order.deliveryWindow) - parseWindowStart(b.order.deliveryWindow);
    if (timeDiff !== 0) return timeDiff;
    return priorityScore(a.customer.priority) - priorityScore(b.customer.priority);
  });
  const byZone = [...stops].sort((a, b) => {
    const zoneDiff = a.customer.zone.localeCompare(b.customer.zone);
    if (zoneDiff !== 0) return zoneDiff;
    return distanceKm(origin, a.customer) - distanceKm(origin, b.customer);
  });

  return [
    createOption(
      "distance",
      "Menos distancia",
      "Ordena las entregas buscando reducir kilómetros desde la salida hasta el regreso.",
      byDistance,
      trucks,
      origin
    ),
    createOption(
      "schedule",
      "Por horarios y prioridad",
      "Prioriza clientes que abren o cierran antes y luego respeta prioridad alta, normal o baja.",
      bySchedule,
      trucks,
      origin
    ),
    createOption(
      "zone",
      "Por zonas",
      "Agrupa pedidos por zona para que cada camión haga un recorrido más ordenado.",
      byZone,
      trucks,
      origin
    )
  ];
}

export function minutesToText(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h <= 0) return `${m} min`;
  return `${h} h ${m} min`;
}

export function googleMapsUrl(route: PlannedRoute, origin: Origin) {
  const stops = route.stops;
  if (!stops.length) return "https://www.google.com/maps";

  const first = stops[0].customer;
  const last = stops[stops.length - 1].customer;
  const middle = stops.slice(1, -1).map((stop) => `${stop.customer.lat},${stop.customer.lng}`).join("|");
  const url = new URL("https://www.google.com/maps/dir/");
  url.searchParams.set("api", "1");
  url.searchParams.set("origin", `${origin.lat},${origin.lng}`);
  url.searchParams.set("destination", `${last.lat},${last.lng}`);
  url.searchParams.set("travelmode", "driving");
  if (middle) url.searchParams.set("waypoints", middle);
  if (stops.length === 1) url.searchParams.set("destination", `${first.lat},${first.lng}`);
  return url.toString();
}

export function whatsappRouteText(route: PlannedRoute, origin: Origin) {
  const lines = [
    `Recorrido ${route.truck.name} - ${route.truck.driver}`,
    `Salida: ${origin.name} - ${origin.address}`,
    "",
    ...route.stops.map((stop, index) => {
      const c = stop.customer;
      return `${index + 1}. ${c.name}\nDirección: ${c.address}\nTel: ${c.phone}\nHorario: ${stop.order.deliveryWindow || c.openingHours}\nPedido: ${stop.order.items}\nObservación: ${c.notes || "Sin observaciones"}`;
    }),
    "",
    `Km estimados: ${route.distanceKm} km`,
    `Tiempo estimado: ${minutesToText(route.estimatedMinutes)}`,
    googleMapsUrl(route, origin)
  ];

  return lines.join("\n");
}
