import React, { useEffect, useState, useRef } from "react";
import Globe from "react-globe.gl";
import { formatDistanceToNow, parseISO } from "date-fns";
import "./App.css";

const NASA_API_BASE = "https://api.nasa.gov/neo/rest/v1";
const DEFAULT_DENSITY = 3000; // kg/m³
const TNT_JOULES = 4.184e9; // 1 ton TNT in joules

function cacheFetch(key, fetcher, ttlMs = 5 * 60 * 1000) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const obj = JSON.parse(raw);
      if (Date.now() - obj.t < ttlMs) return Promise.resolve(obj.v);
    }
  } catch {}
  return fetcher().then((v) => {
    try {
      localStorage.setItem(key, JSON.stringify({ t: Date.now(), v }));
    } catch {}
    return v;
  });
}

function metersFromKilometers(km) {
  return km * 1000;
}
function footballFields(d) {
  return d / 91.44;
}
function statueOfLibertyHeights(d) {
  return d / 93;
}
function empireState(d) {
  return d / 381;
}
function titanicLengths(d) {
  return d / 269;
}
function olympicPoolsVolume(vol_m3) {
  const poolVol = 50 * 25 * 2;
  return vol_m3 / poolVol;
}

function sphereVolume(r) {
  return (4 / 3) * Math.PI * Math.pow(r, 3);
}
function kineticEnergyJ(mass, v) {
  return 0.5 * mass * v * v;
}
function tntEquivalentJoules(E) {
  const megatons = E / 4.184e15;
  return { megatons, kilotons: E / 4.184e12 };
}
function estimateMass(d_km, density = DEFAULT_DENSITY) {
  const r = metersFromKilometers(d_km) / 2;
  return sphereVolume(r) * density;
}
function craterDiameterMetersApprox(E) {
  return 0.07 * Math.pow(E, 0.3);
}
function severityCategory(megatons) {
  if (megatons < 0.001) return { color: "🟢", text: "Spectacular light show, no damage" };
  if (megatons < 1) return { color: "🟡", text: "Local / regional damage possible" };
  if (megatons < 100) return { color: "🟠", text: "Continental catastrophe" };
  return { color: "🔴", text: "Extinction-level event" };
}

export default function App() {
  const [apiKey, setApiKey] = useState(localStorage.getItem("NASA_API_KEY") || "");
  const [neos, setNeos] = useState([]);
  const [selected, setSelected] = useState(null);
  const globeEl = useRef();
  const [arcs, setArcs] = useState([]);
  const [userLoc, setUserLoc] = useState(null);
  const [geocodeStatus, setGeocodeStatus] = useState("");

  useEffect(() => {
    if (apiKey) localStorage.setItem("NASA_API_KEY", apiKey);
  }, [apiKey]);

  useEffect(() => {
    if (!apiKey) return;
    cacheFetch(
      "nasa_neows_browse",
      () => fetch(`${NASA_API_BASE}/neo/browse?api_key=${apiKey}`).then((r) => r.json())
    )
      .then((data) => setNeos(data.near_earth_objects || []))
      .catch(() => setNeos([]));
  }, [apiKey]);

  useEffect(() => {
    if (!selected) return;
    const cad = selected.close_approach_data?.[0];
    if (!cad) return;

    const missKm = parseFloat(cad.miss_distance.kilometers);
    const willHit = cad.orbiting_body === "Earth" && missKm < 6371;
    const seed = selected.id.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
    const lat = ((seed * 37) % 180) - 90;
    const lng = ((seed * 97) % 360) - 180;

    const arc = {
      startLat: lat + 40,
      startLng: lng - 80,
      endLat: lat,
      endLng: lng,
      color: willHit ? "red" : "green",
    };
    setArcs([arc]);
    globeEl.current?.pointOfView({ lat: arc.endLat, lng: arc.endLng, altitude: 1.5 }, 1500);
  }, [selected]);

  const handleSelectChange = (e) => {
    const id = e.target.value;
    const neo = neos.find((n) => n.id === id);
    if (!neo) return;
    cacheFetch(`nasa_neo_${id}`, () =>
      fetch(`${NASA_API_BASE}/neo/${id}?api_key=${apiKey}`).then((r) => r.json())
    ).then(setSelected);
  };

  const geocodeCity = (q) => {
    setGeocodeStatus("Looking up city...");
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`)
      .then((r) => r.json())
      .then((res) => {
        if (res && res[0]) {
          const { lat, lon, display_name } = res[0];
          setUserLoc({ lat: parseFloat(lat), lon: parseFloat(lon), name: display_name });
          setGeocodeStatus("Found: " + display_name);
        } else setGeocodeStatus("Not found");
      })
      .catch(() => setGeocodeStatus("Error"));
  };

  function renderAstroDetails() {
    if (!selected) return <div className="card">Choose an asteroid to see details</div>;
    const est_d_km = selected.estimated_diameter.kilometers.estimated_diameter_max;
    const v_kms = parseFloat(selected.close_approach_data?.[0]?.relative_velocity.kilometers_per_second || 20);
    const v_ms = v_kms * 1000;
    const mass = estimateMass(est_d_km);
    const E = kineticEnergyJ(mass, v_ms);
    const tnt = tntEquivalentJoules(E);
    const crater_m = craterDiameterMetersApprox(E);
    const sev = severityCategory(tnt.megatons);

    return (
      <div className="card">
        <h2>{selected.name}</h2>
        <p>Diameter: {est_d_km.toFixed(3)} km</p>
        <p>Velocity: {v_kms} km/s</p>
        <p>Energy: {tnt.kilotons.toFixed(2)} kilotons TNT</p>
        <p>Crater: {crater_m.toFixed(0)} m</p>
        <p>
          Severity: {sev.color} {sev.text}
        </p>
      </div>
    );
  }

  return (
    <div className="App">
      <h1>🚀 Skyfall: Asteroid Impact Visualizer</h1>

      <div className="panel">
        <label>NASA API Key:</label>
        <input
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Get from api.nasa.gov (use DEMO_KEY)"
        />

        <label>Select Asteroid:</label>
        <select onChange={handleSelectChange}>
          <option value="">-- choose asteroid --</option>
          {neos.map((n) => (
            <option key={n.id} value={n.id}>
              {n.name} ({n.id})
            </option>
          ))}
        </select>

        {renderAstroDetails()}
      </div>

      <div className="globe-container">
        <Globe ref={globeEl} arcsData={arcs} globeImageUrl="https://unpkg.com/three-globe/example/img/earth-dark.jpg" />
      </div>
    </div>
  );
}
