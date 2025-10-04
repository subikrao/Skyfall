import React, { useEffect, useState } from "react";
import Globe from "react-globe.gl";
import "./App.css";

const App = () => {
  const [apiKey, setApiKey] = useState("");
  const [neos, setNeos] = useState([]);
  const [selected, setSelected] = useState(null);
  const [impactData, setImpactData] = useState(null);

  useEffect(() => {
    if (!apiKey) return;
    fetch(`https://api.nasa.gov/neo/rest/v1/feed?api_key=${apiKey}`)
      .then((res) => res.json())
      .then((data) => {
        const today = Object.keys(data.near_earth_objects)[0];
        setNeos(data.near_earth_objects[today] || []);
      })
      .catch((err) => console.error(err));
  }, [apiKey]);

  const handleSelect = (id) => {
    const asteroid = neos.find((a) => a.id === id);
    if (!asteroid) return;

    const diameter = asteroid.estimated_diameter.kilometers.estimated_diameter_max;
    const velocity = parseFloat(
      asteroid.close_approach_data?.[0]?.relative_velocity?.kilometers_per_second || 0
    );
    const missDistance = parseFloat(
      asteroid.close_approach_data?.[0]?.miss_distance?.kilometers || 0
    );

    // Energy: Joules and kilotons TNT
    const mass = (4 / 3) * Math.PI * Math.pow(diameter / 2, 3) * 3000; // density ~3000 kg/m3
    const energyJoules = 0.5 * mass * Math.pow(velocity * 1000, 2);
    const energyTNT = energyJoules / 4.184e12; // kilotons TNT
    const crater = Math.pow(energyTNT, 1 / 4) * 100;

    const hit = missDistance < 12742; // Earth diameter (km)
    let severity = "🟢 Miss - Safe flyby";
    if (hit && energyTNT > 1e9) severity = "🔴 Extinction-level event";
    else if (hit && energyTNT > 1e7) severity = "🟠 Continental catastrophe";
    else if (hit && energyTNT > 1e5) severity = "🟡 Regional devastation";
    else if (hit && energyTNT > 1e3) severity = "🟢 Minor airburst";

    const footballFields = (diameter * 1000 / 91.44).toFixed(1);
    const statueLiberty = (diameter * 1000 / 93).toFixed(1);
    const empireBuildings = (diameter * 1000 / 381).toFixed(2);
    const titanicLengths = (diameter * 1000 / 269).toFixed(2);
    const swimmingPools = (Math.pow(diameter * 1000, 3) / 2500).toFixed(0);

    setSelected(asteroid);
    setImpactData({
      diameter,
      velocity,
      energyJoules,
      energyTNT,
      crater,
      missDistance,
      severity,
      comparisons: {
        footballFields,
        statueLiberty,
        empireBuildings,
        titanicLengths,
        swimmingPools,
      },
    });
  };

  return (
    <div className="app">
      <h1>🌠 Skyfall: Asteroid Impact Visualizer</h1>

      <input
        className="api-input"
        placeholder="Enter NASA API Key (e.g., DEMO_KEY)"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
      />

      {neos.length > 0 && (
        <select onChange={(e) => handleSelect(e.target.value)}>
          <option>Select Asteroid</option>
          {neos.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      )}

      <div className="globe-container">
        <Globe
          width={500}
          height={500}
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        />
      </div>

      {impactData && (
        <div className="details">
          <h2 className="asteroid-name">{selected.name}</h2>

          <div className="data-block">
            <p><strong>Diameter:</strong> {impactData.diameter.toFixed(3)} km</p>
            <p><strong>Velocity:</strong> {impactData.velocity.toFixed(3)} km/s</p>
            <p>
              <strong>Energy:</strong> {impactData.energyTNT.toLocaleString()} kilotons TNT
              {" "}({impactData.energyJoules.toExponential(2)} J)
            </p>
            <p><strong>Crater:</strong> {impactData.crater.toFixed(0)} m</p>
            <p><strong>Miss Distance:</strong> {impactData.missDistance.toLocaleString()} km</p>
            <p><strong>Severity:</strong> {impactData.severity}</p>
          </div>

          <div className="comparisons">
            <h3>To help visualize the scale, here’s how big it really is:</h3>
            <div className="compare-grid">
              <div className="compare-box">🏈 {impactData.comparisons.footballFields} football fields</div>
              <div className="compare-box">🗽 {impactData.comparisons.statueLiberty} Statues of Liberty</div>
              <div className="compare-box">🏢 {impactData.comparisons.empireBuildings} Empire State Buildings</div>
              <div className="compare-box">🚢 {impactData.comparisons.titanicLengths} Titanics</div>
              <div className="compare-box">🏟️ {impactData.comparisons.swimmingPools} Olympic pools (vol.)</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
