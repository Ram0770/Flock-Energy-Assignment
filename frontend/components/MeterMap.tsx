"use client";

import React, { useEffect, useRef, useState } from "react";
import { Meter } from "../lib/api";

interface MeterMapProps {
  meters: Meter[];
  onSelectMeter: (id: string) => void;
}

export default function MeterMap({ meters, onSelectMeter }: MeterMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // Check client environment
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Load Leaflet CSS dynamically to prevent SSR compile crashes
  useEffect(() => {
    if (!isClient) return;
    
    // Inject Leaflet CSS
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    link.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
    link.crossOrigin = "";
    document.head.appendChild(link);
    
    return () => {
      document.head.removeChild(link);
    };
  }, [isClient]);

  // Render Leaflet Map
  useEffect(() => {
    if (!isClient || !mapContainerRef.current) return;

    // Dynamically import Leaflet client-side
    import("leaflet").then((L) => {
      // Fix leaflet icon default marker asset resolution issues
      // @ts-ignore
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      // Initialize map instance centered on Bangalore
      const map = L.map(mapContainerRef.current!).setView([12.96, 77.63], 12);
      mapInstanceRef.current = map;

      // Add modern premium dark tile overlay
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 20,
      }).addTo(map);

      // Add markers for all meters
      meters.forEach((meter) => {
        // Create colored status marker html
        const color = meter.status === "Active" ? "#10b981" : meter.status === "Faulty" ? "#ef4444" : "#9ca3af";
        const customMarkerIcon = L.divIcon({
          html: `<div style="background-color: ${color}; width: 14px; height: 14px; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 10px ${color};"></div>`,
          className: "custom-div-icon",
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });

        // Add marker to map
        const marker = L.marker([meter.latitude, meter.longitude], { icon: customMarkerIcon }).addTo(map);
        
        // Add popup specs
        const popupContent = `
          <div style="font-family: sans-serif; color: #1f2937; padding: 5px;">
            <strong style="font-size: 13px;">${meter.serial_number}</strong><br>
            <span style="font-size: 11px; color: #6b7280;">${meter.location}</span><br>
            <div style="margin-top: 5px; font-size: 11px;">
              Phase: ${meter.phase}<br>
              Status: <strong style="color: ${color};">${meter.status}</strong>
            </div>
            <button id="btn-popup-${meter.id}" style="margin-top: 8px; width: 100%; border: none; padding: 4px 8px; background-color: #6366f1; color: white; border-radius: 4px; font-size: 10px; font-weight: bold; cursor: pointer;">
              Inspect Spec Sheet
            </button>
          </div>
        `;
        marker.bindPopup(popupContent);

        // Capture popup click actions inside react
        marker.on("popupopen", () => {
          const button = document.getElementById(`btn-popup-${meter.id}`);
          if (button) {
            button.addEventListener("click", () => {
              onSelectMeter(meter.id);
            });
          }
        });

        markersRef.current.push(marker);
      });
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      markersRef.current = [];
    };
  }, [isClient, meters]);

  if (!isClient) {
    return (
      <div className="h-[500px] w-full rounded-xl flex items-center justify-center bg-slate-200/5 dark:bg-zinc-950/20 border border-slate-200/10 dark:border-white/10 backdrop-blur-xl animate-pulse text-zinc-500">
        Loading interactive map modules...
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200/10 dark:border-white/10 bg-white/5 dark:bg-zinc-950/20 backdrop-blur-xl p-6 shadow-xl relative">
      <div className="mb-4">
        <h3 className="text-lg font-bold">Grid Geo-Spatial Distribution Map</h3>
        <p className="text-xs text-slate-400 dark:text-zinc-500">Real-time meter spatial placement. Tap status pins to view current metrics.</p>
      </div>

      <div 
        ref={mapContainerRef} 
        className="h-[500px] w-full rounded-lg overflow-hidden border border-slate-200/20 dark:border-white/5 shadow-inner"
        style={{ zIndex: 1 }}
      />
    </div>
  );
}
