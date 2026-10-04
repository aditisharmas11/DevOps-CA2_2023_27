import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ReportSeverity } from "@/lib/constants";
import { getSeverity, getCategory } from "@/lib/constants";

import MarkerClusterGroup from "react-leaflet-cluster";
import "react-leaflet-cluster/dist/assets/MarkerCluster.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.Default.css";

export interface MapPoint {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  severity: ReportSeverity;
  category: string;
  status: string;
  city?: string | null;
  province?: string | null;
}

interface MapViewProps {
  points: MapPoint[];
  center?: [number, number];
  zoom?: number;
  height?: string;
  onMarkerClick?: (id: string) => void;
  onMapClick?: (lat: number, lng: number) => void;
  selectedLatLng?: [number, number] | null;
  interactive?: boolean;
}

/**
 * Carte Leaflet avec clustering des signalements.
 *
 * Le rendu est effectué uniquement côté client.
 */
export function MapView({
  points,
  center = [15.4, 18.7],
  zoom = 6,
  height = "100%",
  onMarkerClick,
  onMapClick,
  selectedLatLng,
  interactive = true,
}: MapViewProps) {
    const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);

  const [Mod, setMod] =
    useState<typeof import("react-leaflet") | null>(null);

  const [L, setL] =
    useState<typeof import("leaflet") | null>(null);

  useEffect(() => {
    setMounted(true);

    Promise.all([
      import("react-leaflet"),
      import("leaflet"),
    ]).then(([reactLeaflet, leaflet]) => {
      setMod(reactLeaflet);
      setL(leaflet.default ?? leaflet);
    });
  }, []);

  if (!mounted || !Mod || !L) {
    return (
      <div
        className="flex w-full items-center justify-center rounded-lg bg-muted"
        style={{ height }}
      >
        <div className="text-sm text-muted-foreground">
          Chargement de la carte…
        </div>
      </div>
    );
  }

  const {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    useMapEvents,
  } = Mod;

  /**
   * Création du marqueur.
   */
  function makeIcon(
    severity: ReportSeverity,
    selected = false
  ) {
    const { hex } = getSeverity(severity);

    const size = selected ? 36 : 28;

    return L!.divIcon({
      className: "",

      html: `
        <div style="
          width:${size}px;
          height:${size}px;
          border-radius:50%;
          background:${hex};
          border:3px solid white;
          box-shadow:0 2px 8px rgba(0,0,0,0.35);
          display:flex;
          align-items:center;
          justify-content:center;
          font-size:${size * 0.5}px;
        ">📍</div>
      `,

      iconSize: [size, size],

      iconAnchor: [
        size / 2,
        size / 2,
      ],
    });
  }

  /**
   * Gestion du clic sur la carte.
   */
  function ClickHandler() {
    useMapEvents({
      click(event) {
        onMapClick?.(
          event.latlng.lat,
          event.latlng.lng
        );
      },
    });

    return null;
  }

  /**
   * Traduction du statut.
   */


  /**
   * Première lettre en majuscule.
   *
   * Exemple :
   * ader → Ader
   * sila → Sila
   */
  function capitalize(
    value: string | null | undefined
  ) {
    if (!value) return "";

    return (
      value.charAt(0).toUpperCase() +
      value.slice(1)
    );
  }

  return (
    <div
      style={{
        height,
        width: "100%",
      }}
      className="overflow-hidden rounded-lg"
    >
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={interactive}
        style={{
          height: "100%",
          width: "100%",
        }}
      >
        {/* =========================
            OPENSTREETMAP
        ========================== */}
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {/* =========================
            CLIC SUR LA CARTE
        ========================== */}
        {onMapClick && <ClickHandler />}

        {/* =========================
            CLUSTERING DES SIGNALEMENTS
        ==========================

            Les signalements proches sont
            automatiquement regroupés.

            Exemple :
            12 signalements proches
            → un seul cercle "12"

            En zoomant :
            → le cluster se sépare
            → les marqueurs individuels apparaissent
        */}
        <MarkerClusterGroup
          chunkedLoading
          showCoverageOnHover={false}
          spiderfyOnMaxZoom={true}
          removeOutsideVisibleBounds={true}
          maxClusterRadius={50}
        >
          {points.map((point) => (
            <Marker
              key={point.id}
              position={[
                point.latitude,
                point.longitude,
              ]}
              icon={makeIcon(point.severity)}
              eventHandlers={{
                click: () =>
                  onMarkerClick?.(point.id),
              }}
            >
              <Popup>
                <div className="min-w-[230px] text-sm">

                  {/* =========================
                      TITRE
                  ========================== */}
                  <div className="mb-3 text-base font-bold text-gray-900">
                    📍 {point.title}
                  </div>

                  <div className="space-y-2">

                    {/* =========================
                        CATÉGORIE
                    ========================== */}
                    <div>
                      <span className="font-medium text-gray-500">
                        {t("dashboard.modal.category")}:
                      </span>{" "}

                      <span className="text-gray-800">
                        {t(`categories.${point.category}`)}
                      </span>
                    </div>

                    {/* =========================
                        PRIORITÉ
                    ========================== */}
                    <div>
                      <span className="font-medium text-gray-500">
                        {t("dashboard.modal.priority")}:
                      </span>{" "}

                      <span
                        className={`font-semibold ${
                          point.severity === "rouge"
                            ? "text-red-600"
                            : point.severity === "orange"
                            ? "text-orange-600"
                            : "text-yellow-600"
                        }`}
                      >
                        {t(`severities.${point.severity}`)}
                      </span>
                    </div>

                    {/* =========================
                        STATUT
                    ========================== */}
                    <div>
                      <span className="font-medium text-gray-500">
                        {t("dashboard.modal.newStatusLabel")}:
                      </span>{" "}

                      <span className="font-semibold text-gray-800">
                        {t(`statuses.${point.status}`)}
                      </span>
                    </div>

                    {/* =========================
                        VILLE
                    ========================== */}
                    {point.city && (
                      <div>
                        <span className="font-medium text-gray-500">
                          {t("map.city")}:
                        </span>{" "}

                        <span className="text-gray-800">
                          {capitalize(
                            point.city
                          )}
                        </span>
                      </div>
                    )}

                    {/* =========================
                        PROVINCE
                    ========================== */}
                    {point.province && (
                      <div>
                        <span className="font-medium text-gray-500">
                          {t("map.province")}:
                        </span>{" "}

                        <span className="text-gray-800">
                          {capitalize(
                            point.province
                          )}
                        </span>
                      </div>
                    )}

                    {/* =========================
                        COORDONNÉES
                    ========================== */}
                    <div>
                      <span className="font-medium text-gray-500">
                        {t("dashboard.mapCoordinates")}:
                      </span>

                      <div className="mt-1 text-xs text-gray-500">
                        {point.latitude.toFixed(6)}
                        {", "}
                        {point.longitude.toFixed(6)}
                      </div>
                    </div>

                  </div>

                  {/* =========================
                      GOOGLE MAPS
                  ========================== */}
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${point.latitude},${point.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 block rounded-lg bg-[#0B2A6F] px-3 py-2 text-center text-xs font-semibold !text-white hover:bg-[#09235C]"
                  >
                    📍 {t("dashboard.openGoogleMaps")}
                  </a>

                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>

        {/* =========================
            POSITION SÉLECTIONNÉE
        ========================== */}
        {selectedLatLng && (
          <Marker
            position={selectedLatLng}
            icon={makeIcon(
              "rouge",
              true
            )}
          >
            <Popup>
              Position sélectionnée
            </Popup>
          </Marker>
        )}

      </MapContainer>
    </div>
  );
}