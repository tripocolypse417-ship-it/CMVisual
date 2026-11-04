import { useState } from "react";
import { fetchNwsAlerts, fetchUsgsEarthquakes, freshnessOf } from "../lib/worldInformationFeeds";

const panelClass = "glass-panel rounded-2xl p-3 relative corner-decoration";
const textClass = "bg-black/30 border border-white/15 rounded px-2 py-1.5 text-xs text-white min-w-0";
const fmtTime = (value) => value ? new Date(value).toLocaleString() : "Time unavailable";

/**
 * External data panel. Coordinates are intentionally user-entered until the app's
 * existing location permission/consent contract is confirmed. FIRMS is not shown
 * as live until a secure server proxy has been configured.
 */
export default function WorldInformationFeedsPanel({ color = "#00ccff" }) {
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [alerts, setAlerts] = useState([]);
  const [quakes, setQuakes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  async function refresh() {
    setError("");
    const lat = Number(latitude);
    const lon = Number(longitude);
    if (!latitude.trim() || !longitude.trim() || !Number.isFinite(lat) || !Number.isFinite(lon) ||
        lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      setError("Enter valid latitude (−90 to 90) and longitude (−180 to 180).");
      return;
    }
    setLoading(true);
    const results = await Promise.allSettled([
      fetchNwsAlerts(lat, lon),
      fetchUsgsEarthquakes()
    ]);
    if (results[0].status === "fulfilled") setAlerts(results[0].value);
    else setError("NWS alerts unavailable: " + (results[0].reason?.message || "request failed"));
    if (results[1].status === "fulfilled") setQuakes(results[1].value);
    else setError((previous) => [previous, "USGS feed unavailable: " + (results[1].reason?.message || "request failed")].filter(Boolean).join(" "));
    setLastUpdated(new Date());
    setLoading(false);
  }

  const badgeStyle = { color, borderColor: color + "55" };
  return (
    <section className={panelClass} aria-labelledby="world-info-feeds-title">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 id="world-info-feeds-title" className="font-mono text-sm tracking-wider text-white">WORLD INFORMATION STATION · EXTERNAL FEEDS</h2>
          <p className="mt-1 text-xs text-white/55">Official public hazard context. Not device measurements or a life-safety certification.</p>
        </div>
        <span className="font-mono text-[10px] border rounded px-2 py-1" style={badgeStyle}>SOURCE-LABELED</span>
      </div>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
        <label className="text-[11px] text-white/60">Latitude
          <input aria-label="Latitude for weather alerts" className={"mt-1 w-full " + textClass} inputMode="decimal" placeholder="e.g. 38.2" value={latitude} onChange={e => setLatitude(e.target.value)} />
        </label>
        <label className="text-[11px] text-white/60">Longitude
          <input aria-label="Longitude for weather alerts" className={"mt-1 w-full " + textClass} inputMode="decimal" placeholder="e.g. -92.6" value={longitude} onChange={e => setLongitude(e.target.value)} />
        </label>
        <button type="button" onClick={refresh} disabled={loading} className="self-end rounded border px-3 py-2 text-xs font-mono disabled:opacity-50" style={badgeStyle}>
          {loading ? "UPDATING…" : "REFRESH FEEDS"}
        </button>
      </div>
      {error && <p role="alert" className="mt-3 text-xs text-amber-200">{error}</p>}
      {lastUpdated && <p className="mt-2 text-[10px] text-white/45">Retrieved: {fmtTime(lastUpdated.toISOString())}. Feed freshness is advisory.</p>}
      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-lg border border-white/10 p-3">
          <div className="flex justify-between gap-2"><h3 className="font-mono text-xs text-white/85">NWS ACTIVE ALERTS</h3><span className="text-[10px] text-white/45">{alerts.length} records</span></div>
          {alerts.length === 0 ? <p className="mt-2 text-xs text-white/45">No retrieved alerts to display. Refresh with coordinates to query the NWS.</p> :
            <ul className="mt-2 space-y-2">{alerts.slice(0, 8).map(item => <li key={item.id} className="border-l-2 pl-2" style={{borderColor: color}}>
              <div className="text-xs text-white">{item.payload.event} · {item.payload.severity}</div>
              <div className="mt-1 text-[10px] text-white/55">{item.location || "Area unspecified"} · expires {fmtTime(item.payload.expires)}</div>
              <div className="mt-1 text-[10px] text-white/40">Source: NWS · {freshnessOf(item)} · {item.evidenceClass}</div>
            </li>)}</ul>}
        </div>
        <div className="rounded-lg border border-white/10 p-3">
          <div className="flex justify-between gap-2"><h3 className="font-mono text-xs text-white/85">USGS EARTHQUAKES · LAST DAY</h3><span className="text-[10px] text-white/45">{quakes.length} records</span></div>
          {quakes.length === 0 ? <p className="mt-2 text-xs text-white/45">No retrieved events to display. Refresh feeds to query USGS.</p> :
            <ul className="mt-2 space-y-2">{quakes.slice(0, 8).map(item => <li key={item.id} className="border-l-2 pl-2" style={{borderColor: color}}>
              <div className="text-xs text-white">M{item.payload.magnitude ?? "?"} · {item.payload.place || "Location unavailable"}</div>
              <div className="mt-1 text-[10px] text-white/55">{fmtTime(item.observedAt)}{item.location ? " · " + item.location.latitude.toFixed(2) + ", " + item.location.longitude.toFixed(2) : ""}</div>
              <div className="mt-1 text-[10px] text-white/40">Source: USGS · {freshnessOf(item)} · {item.evidenceClass}</div>
            </li>)}</ul>}
        </div>
      </div>
      <p className="mt-3 text-[10px] leading-relaxed text-white/40">NASA FIRMS is not activated here: it requires a secured server-side proxy and API key. OpenStreetMap data may be used with attribution and compliant tile/geocoding services. External feeds can be delayed or revised and must not be the sole basis for emergency decisions.</p>
    </section>
  );
}
