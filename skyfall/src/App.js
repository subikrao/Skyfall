// src/App.js
import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Circle, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import './App.css';

// Fix for default marker icon in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// --- Constants and Helper Functions ---
const ASTEROID_DENSITY_KG_M3 = 3000;

const calculateImpactEnergy = (diameter, velocity) => {
    const radius = diameter / 2;
    const volume = (4 / 3) * Math.PI * Math.pow(radius, 3);
    const mass = volume * ASTEROID_DENSITY_KG_M3;
    const energyJoules = 0.5 * mass * Math.pow(velocity * 1000, 2);
    const energyMegatons = energyJoules / 4.184e15;
    return energyMegatons;
};

const calculateCraterDiameter = (energy) => {
    const diameterMeters = 1.16 * Math.pow(energy * 4.184e15, 0.28);
    return diameterMeters / 1000;
};

// --- Child Components ---

const Tooltip = ({ text, children }) => (
    <div className="tooltip">
        {children}
        <span className="tooltip-text">{text}</span>
    </div>
);

const Sidebar = ({ asteroids, onSelect, selected, impactData }) => (
    <div className="sidebar">
        <h1>🚀 AstroAlert</h1>
        <div className="control-group">
            <label htmlFor="asteroid-select">1. Select a Near-Earth Asteroid</label>
            <select id="asteroid-select" onChange={e => onSelect(e.target.value)}>
                {/* CHANGE 1: Added value="" to the default option */}
                <option value="">-- Choose an Asteroid --</option>
                {asteroids.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
        </div>

        {selected && (
            <>
                <h2>Asteroid Properties</h2>
                <div className="info-box">
                    <p>Diameter (km): <span>{selected.diameter.toFixed(3)}</span></p>
                    <p>Velocity (km/s): <span>{selected.velocity.toFixed(2)}</span></p>
                    <p>Miss Distance (km): <span>{parseInt(selected.miss_distance).toLocaleString()}</span></p>
                </div>
            </>
        )}

        {impactData && (
            <>
                <h2>Impact Consequences</h2>
                <div className="results-box">
                    <h3>💥 WARNING: IMPACT SIMULATED</h3>
                    <p>Impact Energy (MT):
                        <Tooltip text="Energy released, in megatons of TNT. The Tsar Bomba was ~50 MT.">
                            (?)
                        </Tooltip>
                        <span>{impactData.energy.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    </p>
                    <p>Crater Diameter (km):
                        <Tooltip text="Estimated final crater size based on impact in sedimentary rock.">
                            (?)
                        </Tooltip>
                        <span>{impactData.craterDiameter.toFixed(2)}</span>
                    </p>
                </div>
            </>
        )}
    </div>
);

const MapView = ({ onMapClick, impactLocation, craterDiameter }) => {
    const MapEvents = () => {
        useMapEvents({
            click(e) {
                onMapClick(e.latlng);
            },
        });
        return null;
    };

    return (
        <div className="main-content">
            <MapContainer center={[20, 0]} zoom={2} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <MapEvents />
                {impactLocation && (
                    <>
                        <Marker position={impactLocation} />
                        <Circle
                            center={impactLocation}
                            radius={craterDiameter * 1000 / 2} /* radius in meters */
                            pathOptions={{ color: 'red', fillColor: 'red', fillOpacity: 0.4 }}
                        />
                    </>
                )}
            </MapContainer>
            <div className="impact-instructions">2. Click on the map to simulate impact location</div>
        </div>
    );
};

// --- Main App Component ---

function App() {
    const [asteroids, setAsteroids] = useState([]);
    const [selectedAsteroid, setSelectedAsteroid] = useState(null);
    const [impactLocation, setImpactLocation] = useState(null);
    const [impactData, setImpactData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchAsteroids = async () => {
            const API_KEY = 'jngYpdLDxinhMuqgCLVYROdKruoh5Ve19x0PJayV';
            const API_URL = `https://api.nasa.gov/neo/rest/v1/feed/today?detailed=false&api_key=${API_KEY}`;

            try {
                const response = await fetch(API_URL);
                const data = await response.json();
                const nearEarthObjects = data.near_earth_objects;

                const asteroidList = Object.values(nearEarthObjects)
                    .flat()
                    .map(a => {
                        // Safely get the min and max diameter, defaulting to 0 if not present
                        const minDiameter = a.estimated_diameter?.kilometers?.estimated_diameter_min || 0;
                        const maxDiameter = a.estimated_diameter?.kilometers?.estimated_diameter_max || 0;

                        return {
                            id: a.id,
                            name: a.name,
                            // Calculate the average diameter
                            diameter: (minDiameter + maxDiameter) / 2,
                            velocity: parseFloat(a.close_approach_data?.[0]?.relative_velocity?.kilometers_per_second) || 0,
                            miss_distance: parseFloat(a.close_approach_data?.[0]?.miss_distance?.kilometers) || 0,
                        };
                    })
                    .sort((a, b) => a.miss_distance - b.miss_distance)
                    .slice(0, 20);

                setAsteroids(asteroidList);
            } catch (error) {
                console.error("Failed to fetch asteroid data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAsteroids();
    }, []);

    // CHANGE 2: Updated the handler to reset the state when the default option is selected
    const handleSelectAsteroid = (id) => {
        // If the id is empty (our default option), reset everything
        if (!id) {
            setSelectedAsteroid(null);
            setImpactLocation(null);
            setImpactData(null);
            return;
        }
        const asteroid = asteroids.find(a => a.id === id);
        setSelectedAsteroid(asteroid);
        setImpactLocation(null);
        setImpactData(null);
    };

    const handleMapClick = (latlng) => {
        if (!selectedAsteroid) {
            alert("Please select an asteroid first!");
            return;
        }
        setImpactLocation(latlng);
        const energy = calculateImpactEnergy(selectedAsteroid.diameter, selectedAsteroid.velocity);
        const craterDiameter = calculateCraterDiameter(energy);
        setImpactData({ energy, craterDiameter });
    };

    return (
        <div className="App">
            {isLoading && <div className="loading-overlay">Loading Near-Earth Asteroid Data...</div>}
            <Sidebar
                asteroids={asteroids}
                selected={selectedAsteroid}
                onSelect={handleSelectAsteroid}
                impactData={impactData}
            />
            <MapView
                onMapClick={handleMapClick}
                impactLocation={impactLocation}
                craterDiameter={impactData ? impactData.craterDiameter : 0}
            />
        </div>
    );
}

export default App;