import React, { useState, useEffect, useRef, MouseEvent } from 'react';
import AudioPlayer from 'react-h5-audio-player';
import 'react-h5-audio-player/lib/styles.css';
import './App.css';

interface Target {
  x: number;
  y: number;
  dx: number;
  dy: number;
  id: number;
  color: string;
  rotation: number;
  spawnTime: number;
  type: 'normal' | 'slime' | 'mini' | 'boss';
  size: number;
  isPopping?: boolean;
  health?: number;
  isImmune?: boolean;
}

type PowerUpType = 'extra-life' | 'time-freeze' | 'double-points' | 'skull' | 'lightning' | 'lava-shield';

interface PowerUp {
  x: number;
  y: number;
  dx: number;
  dy: number;
  id: number;
  type: PowerUpType;
  spawnTime: number;
}

const Game: React.FC = () => {
  const [score, setScore] = useState<number>(0);
  const [lives, setLives] = useState<number>(0);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [targets, setTargets] = useState<Target[]>([]);
  const [powerUps, setPowerUps] = useState<PowerUp[]>([]);
  const [combo, setCombo] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [difficulty, setDifficulty] = useState<'gabriel' | 'easy' | 'normal' | 'hard'>('normal');
  const [showInstructions, setShowInstructions] = useState<boolean>(false);
  const [bossSpawnRate, setBossSpawnRate] = useState<number>(0.03); // Initial 3% spawn rate
  const audioPlayerRef = useRef<any>(null);
  const soundCloudRef = useRef<HTMLIFrameElement>(null);
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const targetSize: number = 30;
  const [gameWidth, setGameWidth] = useState<number>(600);
  const [gameHeight, setGameHeight] = useState<number>(400);
  const targetSpeed: number = 2;
  const targetSpawnInterval: number = 1500 / 2;
  const powerUpSpawnInterval: number = 5000 / 2;
  const powerUpDuration: number = 3000; // Decreased to 3 seconds for lightning bolt
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const targetRotationSpeed: number = 2;

  const [laser, setLaser] = useState<{
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    timestamp: number;
  } | null>(null);

  const songs = [
    { id: 1, name: 'Lo-Fi Chill Beats', src: 'https://soundcloud.com/oxinym/sets/lofi-beats-royalty-free' },
    { id: 2, name: 'Song 1', src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
    { id: 3, name: 'Song 2', src: 'https://files.freemusicarchive.org/storage-freemusicarchive-org/music/ccCommunity/Chad_Crouch/Arps/Chad_Crouch_-_Algorithms.mp3' },
    { id: 4, name: 'Song 3', src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3' },
    { id: 5, name: 'Song 4', src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' },
    { id: 6, name: 'Song 5', src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3' },
  ];

  const [selectedSong, setSelectedSong] = useState(songs[0]);

  // Simplified music controls with safety check
  const startMusic = () => {
    if (selectedSong.id === 1 && soundCloudRef.current && (window as any).SC?.Widget) {
      const widget = (window as any).SC.Widget(soundCloudRef.current);
      widget.play();
    } else if (audioPlayerRef.current) {
      audioPlayerRef.current.audio.current.play();
    }
  };

  const stopMusic = () => {
    if (selectedSong.id === 1 && soundCloudRef.current && (window as any).SC?.Widget) {
      const widget = (window as any).SC.Widget(soundCloudRef.current);
      widget.pause();
    } else if (audioPlayerRef.current) {
      audioPlayerRef.current.audio.current.pause();
    }
  };

  // Revert to synchronous game over handling
  const handleGameOver = () => {
    stopMusic();
    setGameStarted(false);
    setGameOver(true);
  };

  // Update click handler to use synchronous game over
  const handleMouseClick = (e: MouseEvent<HTMLDivElement>) => {
    if (gameOver || !gameStarted) return;

    if (!gameAreaRef.current) return;
    const rect = gameAreaRef.current.getBoundingClientRect();

    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const hitTarget = targets.some((target) => {
      const targetCenterX = target.x + target.size / 2;
      const targetCenterY = target.y + target.size / 2;
      const distance = Math.sqrt(
        Math.pow(clickX - targetCenterX, 2) + Math.pow(clickY - targetCenterY, 2)
      );
      return distance <= target.size / 2;
    });

    const hitPowerUp = powerUps.some((powerUp) => {
      const powerUpCenterX = powerUp.x + targetSize / 2;
      const powerUpCenterY = powerUp.y + targetSize / 2;
      const distance = Math.sqrt(
        Math.pow(clickX - powerUpCenterX, 2) + Math.pow(clickY - powerUpCenterY, 2)
      );
      return distance <= targetSize / 2;
    });

    if (!hitTarget && !hitPowerUp) {
      const newLives = lives - 1;
      setLives(newLives);
      if (newLives <= 0) {
        handleGameOver();
      }
    }

    setLaser({
      startX: mousePosition.x,
      startY: mousePosition.y,
      endX: clickX,
      endY: clickY,
      timestamp: Date.now(),
    });
  };

  // Update game loop to use synchronous game over
  useEffect(() => {
    if (gameStarted && !gameOver) {
      const movementInterval = setInterval(() => {
        setTargets((prevTargets) => {
          const updatedTargets = prevTargets.map((target) => {
            let { x, y, dx, dy } = target;

            x += dx;
            y += dy;

            if (x < 0 || x > gameWidth - target.size) {
              dx = -dx;
              x = x < 0 ? 0 : gameWidth - target.size;
            }
            if (y < 0 || y > gameHeight - target.size) {
              dy = -dy;
              y = y < 0 ? 0 : gameHeight - target.size;
            }

            return {
              ...target,
              x,
              y,
              dx,
              dy,
              rotation: (target.rotation + targetRotationSpeed) % 360,
            };
          });

          const expiredTargets = updatedTargets.filter(
            (target) => Date.now() - target.spawnTime > 30000
          );

          if (expiredTargets.length > 0) {
            updatedTargets.forEach((target) => {
              if (expiredTargets.find((et) => et.id === target.id)) {
                target.isPopping = true;
              }
            });

            setTimeout(() => {
              setTargets((current) =>
                current.filter((t) => !expiredTargets.find((et) => et.id === t.id))
              );

              const newLives = lives - expiredTargets.length;
              setLives(newLives);
              if (newLives <= 0) {
                handleGameOver();
              }
            }, 300);
          }

          return updatedTargets;
        });

        setPowerUps((prevPowerUps) => {
          const updatedPowerUps = prevPowerUps.map((powerUp) => {
            let { x, y, dx, dy } = powerUp;

            x += dx;
            y += dy;

            if (x < 0 || x > gameWidth - targetSize) {
              dx = -dx;
              x = x < 0 ? 0 : gameWidth - targetSize;
            }
            if (y < 0 || y > gameHeight - targetSize) {
              dy = -dy;
              y = y < 0 ? 0 : gameHeight - targetSize;
            }

            return { ...powerUp, x, y };
          });

          const filteredPowerUps = updatedPowerUps.filter(
            (powerUp) => Date.now() - powerUp.spawnTime <= powerUpDuration
          );

          return filteredPowerUps;
        });
      }, 20);

      const spawnIntervalId = setInterval(() => {
        if (!gameOver) spawnTarget();
      }, targetSpawnInterval);

      const powerUpIntervalId = setInterval(() => {
        if (!gameOver) spawnPowerUp();
      }, powerUpSpawnInterval);

      return () => {
        clearInterval(movementInterval);
        clearInterval(spawnIntervalId);
        clearInterval(powerUpIntervalId);
      };
    }
  }, [gameStarted, gameOver, lives]);

  // Progressive difficulty: Increase boss spawn rate over time
  useEffect(() => {
    if (gameStarted && !gameOver) {
      const bossRateInterval = setInterval(() => {
        setBossSpawnRate((prev) => Math.min(prev + 0.01, 0.2)); // Increase by 1% up to max 20%
      }, 30000); // Every 30 seconds

      return () => clearInterval(bossRateInterval);
    }
  }, [gameStarted, gameOver]);

  // Render targets
  const renderTarget = (target: Target) => {
    if (target.type === 'boss') {
      return (
        <div
          key={target.id}
          className={`target ${target.isPopping ? 'popping' : ''}`}
          style={{
            position: 'absolute',
            left: `${target.x}px`,
            top: `${target.y}px`,
            width: `${target.size}px`,
            height: `${target.size}px`,
            transform: `rotate(${target.rotation}deg)`,
            cursor: 'pointer',
          }}
          onClick={(e) => {
            e.stopPropagation();
            handleTargetClick(target.id, e);
          }}
        >
          <svg width="100%" height="100%" viewBox="0 0 100 100">
            <path
              d="M50 0 L61 35 L97 35 L68 57 L79 91 L50 70 L21 91 L32 57 L3 35 L39 35 Z"
              fill="#FFD700"
              stroke="#FFA500"
              strokeWidth="2"
            />
            <text
              x="50"
              y="55"
              textAnchor="middle"
              fill="black"
              fontSize="30"
              fontWeight="bold"
              style={{ userSelect: 'none' }}
            >
              {target.health}
            </text>
          </svg>
        </div>
      );
    }

    return (
      <div
        key={target.id}
        className={`target ${target.isPopping ? 'popping' : ''}`}
        style={{
          position: 'absolute',
          left: `${target.x}px`,
          top: `${target.y}px`,
          width: `${target.size}px`,
          height: `${target.size}px`,
          backgroundColor: target.type === 'slime' ? '#66CCFF' : target.type === 'mini' ? '#FF66CC' : target.color,
          borderRadius: target.type === 'slime' || target.type === 'mini' ? '50%' : '10%',
          transform: `rotate(${target.rotation}deg)`,
          boxShadow: `0 0 10px ${target.color}`,
        }}
        onClick={(e) => {
          e.stopPropagation();
          handleTargetClick(target.id, e);
        }}
      />
    );
  };

  return (
    <div className="flex-container" style={{ padding: '20px', maxHeight: '100vh', overflow: 'hidden' }}>
      <h1 className="text-5xl font-extrabold mb-4 text-white">Gabriel's Game</h1>
      <h2 className="text-xl text-gray-400 mb-6">Created by Dakota Lock for Gabriel</h2>

      <button
        className="instructions-button mb-4"
        onClick={() => setShowInstructions(!showInstructions)}
      >
        Instructions
      </button>

      {showInstructions && (
        <div className="instructions-modal">
          <h3>How to Play</h3>
          <ul>
            <li>Click on the moving targets to score points.</li>
            <li>If a target despawns without being clicked, you lose a life.</li>
            <li>Use power-ups to gain advantages or face penalties.</li>
          </ul>
          <h3>Power-Ups</h3>
          <ul>
            <li><strong>+</strong>: Extra life</li>
            <li><strong>❄️</strong>: Freeze targets for 5 seconds</li>
            <li><strong>+10</strong>: Gain 10 points</li>
            <li><strong>⚡️</strong>: Destroy all targets and gain points</li>
            <li><strong>🛡️</strong>: Destroy half the targets, gain points, and gain 2 lives</li>
            <li><strong>🧙‍♀️</strong>: Lose a life</li>
          </ul>
          <button
            className="close-instructions-button"
            onClick={() => setShowInstructions(false)}
          >
            Close
          </button>
        </div>
      )}

      <div className="hidden">
        {selectedSong.id === 1 ? (
          <iframe
            ref={soundCloudRef}
            width="0"
            height="0"
            scrolling="no"
            frameBorder="no"
            allow="autoplay"
            src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(selectedSong.src)}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true`}
          ></iframe>
        ) : (
          <AudioPlayer
            ref={audioPlayerRef}
            src={selectedSong.src}
            autoPlay={false}
            loop={true}
            volume={0.5}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
        )}
      </div>

      <div
        ref={gameAreaRef}
        className="game-area"
        style={{
          width: gameWidth,
          height: gameHeight,
          position: 'relative',
          margin: '0 auto',
          touchAction: 'none', // Prevent default touch behaviors
        }}
        onMouseMove={handleMouseMove}
        onClick={handleMouseClick}
      >
        {targets.map((target) => renderTarget(target))}

        {powerUps.map((powerUp) => (
          <div
            key={powerUp.id}
            className={`power-up power-up-${powerUp.type}`}
            style={{
              position: 'absolute',
              left: `${powerUp.x}px`,
              top: `${powerUp.y}px`,
              backgroundColor: powerUp.type === 'time-freeze' ? 'black' : undefined,
            }}
            onClick={(e) => {
              e.stopPropagation();
              handlePowerUpClick(powerUp.id, e);
            }}
          >
            {powerUp.type === 'extra-life' ? '+' :
             powerUp.type === 'time-freeze' ? '❄️' :
             powerUp.type === 'double-points' ? '+10' :
             powerUp.type === 'skull' ? '🧙‍♀️' :
             powerUp.type === 'lightning' ? '⚡️' : '🛡️'}
          </div>
        ))}

        <div
          className="crosshair"
          style={{
            position: 'absolute',
            left: `${mousePosition.x - 6}px`,
            top: `${mousePosition.y - 6}px`,
          }}
        />
        {renderLaser()}
      </div>

      <div className="score-display mt-4">
        <div className="text-xl text-white">Score: {score}</div>
        <div className="text-xl text-white">Lives: {lives}</div>
        <div className="text-xl text-white">Combo: x{combo}</div>
      </div>

      <div className="mt-4">
        {!gameStarted && !gameOver && (
          <div className="flex flex-col items-center space-y-4">
            <button
              className="game-button"
              onClick={startGame}
            >
              Start Game
            </button>
            <div className="flex space-x-4">
              <button
                className={`difficulty-button ${difficulty === 'gabriel' ? 'active' : ''}`}
                onClick={() => setDifficulty('gabriel')}
              >
                Gabriel Mode
              </button>
              <button
                className={`difficulty-button ${difficulty === 'easy' ? 'active' : ''}`}
                onClick={() => setDifficulty('easy')}
              >
                Easy
              </button>
              <button
                className={`difficulty-button ${difficulty === 'normal' ? 'active' : ''}`}
                onClick={() => setDifficulty('normal')}
              >
                Normal
              </button>
              <button
                className={`difficulty-button ${difficulty === 'hard' ? 'active' : ''}`}
                onClick={() => setDifficulty('hard')}
              >
                Hard
              </button>
            </div>
          </div>
        )}
        {gameOver && (
          <div className="game-over">
            <p className="text-3xl font-bold text-red-500">Game Over!</p>
            <div className="mt-4 flex justify-center space-x-4">
              <button
                className="game-button"
                onClick={startGame}
              >
                Play Again
              </button>
              <button
                className="game-button reset"
                onClick={resetGame}
              >
                Reset Game
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4">
        <select
          value={selectedSong.id.toString()}
          onChange={(e) => {
            const selectedId = parseInt(e.target.value);
            setSelectedSong(songs.find((song) => song.id === selectedId) || songs[0]);
          }}
          className="song-selector"
        >
          {songs.map((song) => (
            <option key={song.id} value={song.id.toString()}>{song.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default Game;
