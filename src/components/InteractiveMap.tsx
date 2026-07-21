import { useEffect, useRef, useState } from "react";

export interface MapMarker {
  id: string | number;
  lat: number;
  lng: number;
  title?: string;
  description?: string;
  iconHtml?: string;
  color?: string;
  pulse?: boolean;
}

interface InteractiveMapProps {
  center: [number, number];
  zoom?: number;
  markers?: MapMarker[];
  className?: string;
  onMapClick?: (coords: { lat: number; lng: number }) => void;
  showUserLocation?: boolean;
  interactive?: boolean;
}

export function InteractiveMap({
  center,
  zoom = 13,
  markers = [],
  className,
  onMapClick,
  showUserLocation = true,
  interactive = true,
}: InteractiveMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersGroupRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  // 1. Live location tracking for centering or user location indicator
  useEffect(() => {
    if (!showUserLocation || !navigator.geolocation) return;

    const onSuccess = (pos: GeolocationPosition) => {
      setUserLocation([pos.coords.latitude, pos.coords.longitude]);
    };

    const onError = (err: GeolocationPositionError) => {
      console.warn("Geolocation access denied or unavailable:", err.message);
    };

    // Fetch initial and then track
    navigator.geolocation.getCurrentPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      timeout: 10000,
    });

    const watchId = navigator.geolocation.watchPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      timeout: 15000,
    });

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [showUserLocation]);

  // 2. Leaflet instance management
  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapRef.current) return;

    // Determine initial center
    const initialCenter = userLocation && showUserLocation ? userLocation : center;

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current, {
        zoomControl: interactive,
        attributionControl: false,
        dragging: interactive,
        touchZoom: interactive,
        doubleClickZoom: interactive,
        scrollWheelZoom: interactive,
      }).setView(initialCenter, zoom);

      // Add CartoDB Dark Matter tile layer for an elegant cyberpunk theme
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
        subdomains: "abcd",
      }).addTo(mapInstanceRef.current);

      markersGroupRef.current = L.layerGroup().addTo(mapInstanceRef.current);

      if (interactive && onMapClick) {
        mapInstanceRef.current.on("click", (e: any) => {
          onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
        });
      }
    } else {
      // Smoothly pan/zoom to center when it changes (or user location changes)
      mapInstanceRef.current.setView(initialCenter, zoom);
    }

    const map = mapInstanceRef.current;
    const markersGroup = markersGroupRef.current;

    // Clear old markers
    markersGroup.clearLayers();

    // Add user marker if we have live tracking
    if (userLocation && showUserLocation) {
      const userIcon = L.divIcon({
        className: "user-location-marker",
        html: `
          <div class="relative flex items-center justify-center">
            <span class="animate-ping absolute inline-flex h-6 w-6 rounded-full bg-cyan-400 opacity-40"></span>
            <div style="
              width: 12px;
              height: 12px;
              background: var(--cyan);
              border: 2px solid #ffffff;
              border-radius: 50%;
              box-shadow: 0 0 12px var(--cyan);
            "></div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng(userLocation);
      } else {
        userMarkerRef.current = L.marker(userLocation, { icon: userIcon })
          .bindPopup(`<div class="text-xs text-black font-semibold">Your Live Location</div>`)
          .addTo(map);
      }
    }

    // Add dynamic markers
    markers.forEach((m) => {
      const markerColor = m.color || "var(--neon)";
      const isPulse = m.pulse !== false;

      const icon = L.divIcon({
        className: "custom-neon-marker",
        html: m.iconHtml || `
          <div class="relative flex items-center justify-center">
            ${isPulse ? `<span class="animate-ping absolute inline-flex h-5 w-5 rounded-full opacity-40" style="background-color: ${markerColor}"></span>` : ""}
            <div style="
              width: 12px;
              height: 12px;
              background: ${markerColor};
              border: 2px solid #ffffff;
              border-radius: 50%;
              box-shadow: 0 0 12px ${markerColor};
            "></div>
          </div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      const leafletMarker = L.marker([m.lat, m.lng], { icon });
      
      if (m.title || m.description) {
        const popupContent = `
          <div class="p-1 font-sans text-xs text-slate-800">
            <strong class="font-bold text-slate-900 block border-b border-slate-100 pb-1 mb-1">${m.title || "Incident Location"}</strong>
            ${m.description ? `<p class="text-slate-600 mt-1">${m.description}</p>` : ""}
          </div>
        `;
        leafletMarker.bindPopup(popupContent, {
          closeButton: false,
          offset: [0, -5],
        });
      }

      leafletMarker.addTo(markersGroup);
    });

    // Handle initial sizing layout issues inside flex/hidden panels
    const resizeObserver = new ResizeObserver(() => {
      if (map) {
        map.invalidateSize();
      }
    });

    if (mapRef.current) {
      resizeObserver.observe(mapRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [center, zoom, markers, userLocation, showUserLocation, interactive]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={mapRef}
      className={`h-full w-full relative ${className || ""}`}
      style={{ minHeight: "150px" }}
    />
  );
}
