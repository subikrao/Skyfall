import React, { useEffect, useState } from "react";
import Globe from "react-globe.gl";
import "./App.css";

const App = () => {
    const [neos, setNeos] = useState([]);
    const [selected, setSelected] = useState(null);
    const [impactData, setImpactData] = useState(null);
    const [arcsData, setArcsData] = useState([]);
    const [loading, setLoading] = useState(true);

    const API_KEY = "jngYpdLDxinhMuqgCLVYROdKruoh5Ve19x0PJayV";

    useEffect(() => {
        setLoading(true);
        fetch(`https://api.nasa.gov/neo/rest/v1/feed?api_key=${API_KEY}`)
            .then((res) => res.json())
            .then((data) => {
                const allNeos = [];
                Object.keys(data.near_earth_objects).forEach(date => {
                    allNeos.push(...data.near_earth_objects[date]);
                });
                setNeos(allNeos);
                setLoading(false);
            })
            .catch((err) => {
                console.error(err);
                setLoading(false);
            });
    }, []);

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

        // Create trajectory arc
        const startLat = Math.random() * 180 - 90;
        const startLng = Math.random() * 360 - 180;
        const endLat = Math.random() * 180 - 90;
        const endLng = Math.random() * 360 - 180;

        setArcsData([{
            startLat,
            startLng,
            endLat,
            endLng,
            color: missDistance < 12742 ? ['#ff4444', '#ff0000'] : ['#44ff44', '#00ff00'],
            label: asteroid.name
        }]);

        // Energy: Joules and kilotons TNT
        const mass = (4 / 3) * Math.PI * Math.pow(diameter / 2, 3) * 3000; // density ~3000 kg/m3
        const energyJoules = 0.5 * mass * Math.pow(velocity * 1000, 2);
        const energyTNT = energyJoules / 4.184e12; // kilotons TNT
        const crater = Math.pow(energyTNT, 1 / 4) * 100;

        const hit = missDistance < 12742; // Earth diameter (km)
        let severity = "🟢 Safe Flyby";
        let severityDesc = "This asteroid will safely pass by Earth without any risk of impact.";

        if (hit && energyTNT > 1e9) {
            severity = "🔴 Extinction-Level Event";
            severityDesc = "A collision of this magnitude would cause mass extinction, global firestorms, and a nuclear winter lasting years.";
        } else if (hit && energyTNT > 1e7) {
            severity = "🟠 Continental Catastrophe";
            severityDesc = "Impact would devastate an entire continent, triggering massive tsunamis, earthquakes, and climate disruption.";
        } else if (hit && energyTNT > 1e5) {
            severity = "🟡 Regional Devastation";
            severityDesc = "Would obliterate a large metropolitan area and cause widespread destruction across multiple countries.";
        } else if (hit && energyTNT > 1e3) {
            severity = "🟢 Minor Airburst";
            severityDesc = "Would likely explode in the atmosphere, similar to the Chelyabinsk meteor event of 2013.";
        }

        const footballFields = (diameter * 1000 / 91.44).toFixed(1);
        const statueLiberty = (diameter * 1000 / 93).toFixed(1);
        const empireBuildings = (diameter * 1000 / 381).toFixed(2);
        const titanicLengths = (diameter * 1000 / 269).toFixed(2);
        const swimmingPools = (Math.pow(diameter * 1000, 3) / 2500).toFixed(0);

        // Bomb comparisons
        const hiroshimaEquivalent = (energyTNT / 15).toFixed(0);
        const tzarBombaEquivalent = (energyTNT / 50000).toFixed(2);

        setSelected(asteroid);
        setImpactData({
            diameter,
            velocity,
            energyJoules,
            energyTNT,
            crater,
            missDistance,
            severity,
            severityDesc,
            hiroshimaEquivalent,
            tzarBombaEquivalent,
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
            <h1><span style={{ WebkitTextFillColor: 'initial', background: 'none' }}>🌠 </span>Skyfall: Asteroid Impact Visualizer</h1>
            <p className="subtitle">Explore near-Earth objects and visualize their potential impact on our planet</p>
            
            <p className="description">
                {loading 
                    ? "Loading near-Earth asteroids..." 
                    : `Discover ${neos.length} near-Earth objects (NEOs) making close approaches to Earth this week. Select an asteroid below to visualize its trajectory, analyze impact potential, and understand the scale of these cosmic visitors.`
                }
            </p>

            {neos.length > 0 && (
                <select onChange={(e) => handleSelect(e.target.value)}>
                    <option>Select an Asteroid to Analyze</option>
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
                    arcsData={arcsData}
                    arcColor="color"
                    arcDashLength={0.4}
                    arcDashGap={0.2}
                    arcDashAnimateTime={3000}
                    arcStroke={0.5}
                    arcsTransitionDuration={1000}
                    arcLabel="label"
                />
            </div>

            {impactData && (
                <div className="details">
                    <h2 className="asteroid-name">{selected.name}</h2>
                    <p style={{ fontSize: '0.95rem', color: '#a0a0b0', fontStyle: 'italic', marginBottom: '20px' }}>
                        {impactData.severityDesc}
                    </p>

                    <div className="data-block">
                        <p><strong>Diameter:</strong> {impactData.diameter.toFixed(3)} km ({(impactData.diameter * 1000).toFixed(0)} meters)</p>
                        <p><strong>Velocity:</strong> {impactData.velocity.toFixed(3)} km/s ({(impactData.velocity * 3600).toFixed(0)} km/h)</p>
                        <p>
                            <strong>Impact Energy:</strong> {impactData.energyTNT.toLocaleString()} kilotons of TNT
                            {" "}({impactData.energyJoules.toExponential(2)} Joules)
                        </p>
                        {impactData.energyTNT > 15 && (
                            <p style={{ fontSize: '0.9rem', color: '#ffd700', marginLeft: '20px' }}>
                                ≈ {impactData.hiroshimaEquivalent} Hiroshima bombs
                                {impactData.tzarBombaEquivalent >= 0.01 && ` or ${impactData.tzarBombaEquivalent} Tsar Bombas`}
                            </p>
                        )}
                        <p><strong>Estimated Crater Diameter:</strong> {impactData.crater.toFixed(0)} meters</p>
                        <p><strong>Miss Distance:</strong> {impactData.missDistance.toLocaleString()} km ({(impactData.missDistance / 384400).toFixed(2)} lunar distances)</p>
                        <p><strong>Threat Assessment:</strong> {impactData.severity}</p>
                    </div>

                    <div className="comparisons">
                        <h3>Size Comparisons: Putting It Into Perspective</h3>
                        <div className="compare-grid">
                            <div className="compare-box">🏈 {impactData.comparisons.footballFields} football fields long</div>
                            <div className="compare-box">🗽 {impactData.comparisons.statueLiberty} Statues of Liberty tall</div>
                            <div className="compare-box">🏢 {impactData.comparisons.empireBuildings} Empire State Buildings</div>
                            <div className="compare-box">🚢 {impactData.comparisons.titanicLengths} Titanic ships end-to-end</div>
                            <div className="compare-box">🏊 {impactData.comparisons.swimmingPools} Olympic swimming pools (by volume)</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;