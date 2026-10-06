"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Popup, Polyline, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { DestinationCoords } from "@/features/orders/coordinates";

/**
 * `divIcon` untuk kedua marker agar tidak bergantung pada berkas gambar statis
 * Leaflet (sering gagal di-bundle pada Next.js).
 */
const DRIVER_ICON = L.divIcon({
  className: "campify-driver-marker",
  html:
    '<span style="display:block;width:20px;height:20px;border-radius:9999px;' +
    "background:#2563eb;border:3px solid #fff;" +
    'box-shadow:0 0 0 4px rgba(37,99,235,.35)"></span>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const DESTINATION_ICON = L.divIcon({
  className: "campify-destination-marker",
  html:
    '<span style="display:block;width:20px;height:20px;border-radius:9999px;' +
    "background:#e11d48;border:3px solid #fff;" +
    'box-shadow:0 0 0 4px rgba(225,29,72,.35)"></span>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

interface RouteMapProps {
  driver: DestinationCoords;
  /**
   * Titik tujuan pelanggan. `null` bila koordinat presisi tidak tersimpan —
   * peta lalu hanya menampilkan posisi mitra (tanpa marker tujuan & tanpa rute),
   * bukan mengarang titik pengganti.
   */
  destination: DestinationCoords | null;
  /** Garis rute biru; bila `null` dipakai garis lurus antar dua titik. */
  route: [number, number][] | null;
}

/**
 * Pasang peta agar memuat KEDUA titik (dan seluruh garis rute) di dalam layar.
 * Bila tujuan `null`, peta cukup memuat posisi mitra.
 */
function FitBounds({
  driver,
  destination,
  route,
}: {
  driver: DestinationCoords;
  destination: DestinationCoords | null;
  route: [number, number][] | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!destination) {
      return;
    }

    const bounds = L.latLngBounds([
      [driver.lat, driver.lng],
      [destination.lat, destination.lng],
    ]);

    if (route && route.length > 1) {
      bounds.extend(L.latLngBounds(route.map(([lat, lng]) => L.latLng(lat, lng))));
    }

    map.fitBounds(bounds, { padding: [28, 28] });
  }, [map, driver.lat, driver.lng, destination, route]);

  return null;
}

function formatCoord(coords: DestinationCoords): string {
  return `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`;
}

/** Peta rute driver → tujuan (Leaflet + OpenStreetMap), hanya dirender di client. */
export default function RouteMap({ driver, destination, route }: RouteMapProps) {
  // Rute hanya digambar bila titik tujuan benar-benar diketahui.
  const line = useMemo<[number, number][] | null>(() => {
    if (!destination) {
      return null;
    }
    return route && route.length > 1 ? route : [[driver.lat, driver.lng], [destination.lat, destination.lng]];
  }, [route, driver.lat, driver.lng, destination]);

  return (
    <MapContainer
      center={[driver.lat, driver.lng]}
      zoom={15}
      scrollWheelZoom={false}
      className="h-72 w-full"
      style={{ height: "18rem", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <FitBounds driver={driver} destination={destination} route={route} />

      <Marker position={[driver.lat, driver.lng]} icon={DRIVER_ICON}>
        <Popup>
          <strong>Mitra / Driver</strong>
          <br />
          {formatCoord(driver)}
        </Popup>
      </Marker>

      {destination ? (
        <Marker position={[destination.lat, destination.lng]} icon={DESTINATION_ICON}>
          <Popup>
            <strong>Lokasi Pelanggan</strong>
            <br />
            {formatCoord(destination)}
          </Popup>
        </Marker>
      ) : null}

      {/* Rute biru — hanya bila ada titik tujuan yang sah. */}
      {line ? <Polyline positions={line} pathOptions={{ color: "#2563eb", weight: 5 }} /> : null}
    </MapContainer>
  );
}