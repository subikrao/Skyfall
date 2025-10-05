import React, { useEffect, useState, useRef } from "react";
import Globe from "react-globe.gl";
import "./App.css";

const App = () => {
    const [neos, setNeos] = useState([]);
    const [selected, setSelected] = useState(null);
    const [impactData, setImpactData] = useState(null);
    const [arcsData, setArcsData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showGame, setShowGame] = useState(false);

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
            <button className="game-button" onClick={() => setShowGame(true)}>
                🎮 Play Astro Dodge
            </button>

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

            {showGame && <AstroDodgeGame onClose={() => setShowGame(false)} />}
        </div>
    );
};

// Astro Dodge Game Component
const AstroDodgeGame = ({ onClose }) => {
    const [gameState, setGameState] = useState('ready'); // ready, playing, gameover
    const [score, setScore] = useState(0);
    const [health, setHealth] = useState(100);
    const [asteroids, setAsteroids] = useState([]);
    const [explosions, setExplosions] = useState([]);
    const [highScore, setHighScore] = useState(0);
    const gameAreaRef = useRef(null);
    const animationFrameRef = useRef(null);
    const asteroidIdRef = useRef(0);

    const startGame = () => {
        setGameState('playing');
        setScore(0);
        setHealth(100);
        setAsteroids([]);
        setExplosions([]);
    };

    const endGame = () => {
        setGameState('gameover');
        if (score > highScore) {
            setHighScore(score);
        }
        setAsteroids([]);
    };

    useEffect(() => {
        if (gameState !== 'playing') return;

        const spawnAsteroid = () => {
            if (gameState !== 'playing') return;

            const size = Math.random() > 0.7 ? 'small' : Math.random() > 0.4 ? 'medium' : 'large';
            const sizeMap = { small: 30, medium: 50, large: 70 };
            const speedMap = { small: 3 + score / 100, medium: 2 + score / 150, large: 1.5 + score / 200 };
            const pointsMap = { small: 15, medium: 10, large: 5 };

            const newAsteroid = {
                id: asteroidIdRef.current++,
                x: Math.random() * 90 + 5,
                y: -10,
                size: sizeMap[size],
                speed: speedMap[size],
                points: pointsMap[size],
                type: size
            };

            setAsteroids(prev => [...prev, newAsteroid]);
        };

        const spawnInterval = setInterval(spawnAsteroid, Math.max(800 - score * 2, 300));

        return () => clearInterval(spawnInterval);
    }, [gameState, score]);

    useEffect(() => {
        if (gameState !== 'playing') return;

        const updateGame = () => {
            setAsteroids(prev => {
                const updated = prev.map(ast => ({
                    ...ast,
                    y: ast.y + ast.speed
                })).filter(ast => {
                    if (ast.y > 100) {
                        setHealth(h => {
                            const newHealth = Math.max(0, h - 20);
                            if (newHealth === 0) {
                                endGame();
                            }
                            return newHealth;
                        });
                        return false;
                    }
                    return true;
                });
                return updated;
            });

            animationFrameRef.current = requestAnimationFrame(updateGame);
        };

        animationFrameRef.current = requestAnimationFrame(updateGame);

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [gameState]);

    const handleAsteroidClick = (asteroid) => {
        setAsteroids(prev => prev.filter(a => a.id !== asteroid.id));
        setScore(s => s + asteroid.points);
        
        setExplosions(prev => [...prev, {
            id: asteroid.id,
            x: asteroid.x,
            y: asteroid.y
        }]);

        setTimeout(() => {
            setExplosions(prev => prev.filter(e => e.id !== asteroid.id));
        }, 500);
    };

    return (
        <div className="game-overlay">
            <div className="game-modal">
                <button className="game-close" onClick={onClose}>✕</button>
                
                <div className="game-header">
                    <h2>🌠 Astro Dodge</h2>
                    <div className="game-stats">
                        <div className="stat">
                            <span className="stat-label">Score:</span>
                            <span className="stat-value">{score}</span>
                        </div>
                        <div className="stat">
                            <span className="stat-label">High Score:</span>
                            <span className="stat-value">{highScore}</span>
                        </div>
                    </div>
                </div>

                <div className="health-bar-container">
                    <div className="health-label">Earth Health: {health}%</div>
                    <div className="health-bar">
                        <div 
                            className="health-fill" 
                            style={{ 
                                width: `${health}%`,
                                backgroundColor: health > 60 ? '#4ade80' : health > 30 ? '#facc15' : '#ef4444'
                            }}
                        />
                    </div>
                </div>

                <div className="game-area" ref={gameAreaRef}>
                    {gameState === 'ready' && (
                        <div className="game-message">
                            <h3>Defend Earth!</h3>
                            <p>Click asteroids before they hit Earth</p>
                            <p className="game-instructions">
                                • Small asteroids = 15 points<br/>
                                • Medium asteroids = 10 points<br/>
                                • Large asteroids = 5 points<br/>
                                • Missing an asteroid costs 20% health
                            </p>
                            <button className="game-start-btn" onClick={startGame}>
                                Start Game
                            </button>
                        </div>
                    )}

                    {gameState === 'gameover' && (
                        <div className="game-message">
                            <h3>Game Over!</h3>
                            <p className="final-score">Final Score: {score}</p>
                            {score === highScore && score > 0 && (
                                <p className="new-record">🎉 New High Score!</p>
                            )}
                            <button className="game-start-btn" onClick={startGame}>
                                Play Again
                            </button>
                        </div>
                    )}

                    {gameState === 'playing' && (
                        <>
                            {asteroids.map(asteroid => (
                                <div
                                    key={asteroid.id}
                                    className={`asteroid asteroid-${asteroid.type}`}
                                    style={{
                                        left: `${asteroid.x}%`,
                                        top: `${asteroid.y}%`,
                                        width: `${asteroid.size}px`,
                                        height: `${asteroid.size}px`
                                    }}
                                    onClick={() => handleAsteroidClick(asteroid)}
                                >
                                    ☄️
                                </div>
                            ))}

                            {explosions.map(explosion => (
                                <div
                                    key={explosion.id}
                                    className="explosion"
                                    style={{
                                        left: `${explosion.x}%`,
                                        top: `${explosion.y}%`
                                    }}
                                >
                                    💥
                                </div>
                            ))}

                            <div className="earth-defender">🌍</div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default App;