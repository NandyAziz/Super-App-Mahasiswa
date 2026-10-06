"use client";

import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { OrderTracking } from "../types";

/**
 * Ikon kurir dibuat lewat `divIcon` sehingga tidak bergantung pada berkas gambar
 * statis Leaflet (yang sering gagal di-bundle pada bundler Next.js).
 */
const COURIER_ICON = L.divIcon({
  className: "campify-courier-marker",
  html:
    '<span style="display:block;width:20px;height:20px;border-radius:9999px;' +
    "background:#0ea5e9;border:3px solid #fff;" +
    'box-shadow:0 0 0 4px rgba(14,165,233,.35)"></span>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

/** Ikuti pergerakan kurir: geser peta ke posisi terbaru tanpa zoom-reset. */
function PanToPosition({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();

  useEffect(() => {
    map.setView([lat, lng], map.getZoom(), { animate: true });
  }, [map, lat, lng]);

  return null;
}

interface TrackingMapProps {
  tracking: OrderTracking;
}

/** Peta live tracking (Leaflet + OpenStreetMap). Hanya dirender di client. */
export default function TrackingMap({ tracking }: TrackingMapProps) {
  return (
    <MapContainer
      center={[tracking.lat, tracking.lng]}
      zoom={16}
      scrollWheelZoom={false}
      className="h-64 w-full rounded-2xl"
      style={{ height: "16rem", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <PanToPosition lat={tracking.lat} lng={tracking.lng} />

      <Marker
        position={[tracking.lat, tracking.lng]}
        icon={COURIER_ICON}
        key={`${tracking.lat}-${tracking.lng}`}
      >
        <Popup>
          <strong>Posisi kurir</strong>
          <br />
          {tracking.lat.toFixed(5)}, {tracking.lng.toFixed(5)}
          {tracking.note ? (
            <>
              <br />
              {tracking.note}
            </>
          ) : null}
        </Popup>
      </Marker>
    </MapContainer>
  );
}
