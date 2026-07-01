"use client";

import { Fragment, useEffect, useMemo } from "react";
import L, { LatLngExpression } from "leaflet";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import { Origin, PlannedRoute } from "@/lib/types";

type Props = {
  origin: Origin;
  routes: PlannedRoute[];
};

function makeNumberIcon(number: string, color: string) {
  return L.divIcon({
    className: "",
    html: `<div class="route-marker" style="background:${color};width:32px;height:32px;font-size:13px;">${number}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
}

function makeOriginIcon() {
  return L.divIcon({
    className: "",
    html: `<div class="origin-marker" style="background:#0f172a;width:38px;height:38px;font-size:13px;">H</div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19]
  });
}

function FitBounds({ points }: { points: LatLngExpression[] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length < 2) {
      map.setView(points[0] ?? [-32.9468, -60.6393], 12);
      return;
    }

    const bounds = L.latLngBounds(points as [number, number][]);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }, [map, points]);

  return null;
}

export default function RouteMap({ origin, routes }: Props) {
  const originPoint: LatLngExpression = [origin.lat, origin.lng];

  const allPoints = useMemo(() => {
    const points: LatLngExpression[] = [originPoint];
    routes.forEach((route) => {
      route.stops.forEach((stop) => points.push([stop.customer.lat, stop.customer.lng]));
    });
    return points;
  }, [routes, origin.lat, origin.lng]);

  return (
    <MapContainer center={originPoint} zoom={12} scrollWheelZoom className="z-0">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds points={allPoints} />
      <Marker position={originPoint} icon={makeOriginIcon()}>
        <Popup>
          <strong>{origin.name}</strong>
          <br />
          {origin.address}
        </Popup>
      </Marker>

      {routes.map((route) => {
        const positions: LatLngExpression[] = [
          originPoint,
          ...route.stops.map((stop) => [stop.customer.lat, stop.customer.lng] as LatLngExpression),
          originPoint
        ];

        return (
          <Fragment key={route.truck.id}>
            <Polyline positions={positions} pathOptions={{ color: route.truck.color, weight: 5, opacity: 0.75 }} />
            {route.stops.map((stop, index) => (
              <Marker key={stop.order.id} position={[stop.customer.lat, stop.customer.lng]} icon={makeNumberIcon(String(index + 1), route.truck.color)}>
                <Popup>
                  <div style={{ minWidth: 220 }}>
                    <strong>{index + 1}. {stop.customer.name}</strong>
                    <br />
                    {stop.customer.address}
                    <br />
                    <br />
                    <strong>Tel:</strong> {stop.customer.phone || "Sin cargar"}
                    <br />
                    <strong>Horario:</strong> {stop.order.deliveryWindow || stop.customer.openingHours}
                    <br />
                    <strong>Pedido:</strong> {stop.order.items}
                    <br />
                    <strong>Observación:</strong> {stop.customer.notes || "Sin observaciones"}
                    <br />
                    <strong>Camión:</strong> {route.truck.name}
                  </div>
                </Popup>
              </Marker>
            ))}
          </Fragment>
        );
      })}
    </MapContainer>
  );
}
