import React, { useState, useEffect, useRef, MouseEvent } from 'react';
import AudioPlayer from 'react-h5-audio-player';
import 'react-h5-audio-player/lib/styles.css';
import 'tailwindcss/tailwind.css';
import './App.css';

interface Target {
  x: number;
  y: number;
  dx: number;
  dy: number;
  id: number;
  color: string;
  rotation: number;
  isBoss?: boolean;
  health?: number;
}

type PowerUpType = 'extra-life' | 'time-freeze' | 'double-points';

interface PowerUp {
  x: number;
  y: number;
  id: number;
  type: PowerUpType;
}

const Game: React.FC = () => {
  const [score, setScore] = useState<number>(0);
  const [lives, setLives] = useState<number>(3);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [targets, setTargets] = useState<Target[]>([]);
  const [powerUps, setPowerUps] = useState<PowerUp[]>([]);
  const [combo, setCombo] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const audioPlayerRef = useRef<any>(null);
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const targetSize: number = 30;
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });
  const targetSpeed: number = 2;
  const targetSpawnInterval: number = 1500;
  const powerUpSpawnInterval: number = 5000;
  const powerUpDuration: number = 5000;
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Boss-related state
  const [bossSpawnRate, setBossSpawnRate] = useState<number>(0.01); // Start at 1%
  const [gameStartTime, setGameStartTime] = useState<number>(0);

  // Calculate responsive dimensions
  useEffect(() => {
    const updateDimensions = () => {
      const maxWidth = 600;
      const maxHeight = 400;
      const aspectRatio = maxWidth / maxHeight;

      const newWidth = Math.min(window.innerWidth * 0.9, maxWidth);
      const newHeight = newWidth / aspectRatio;

      setDimensions({ width: newWidth, height: newHeight });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Boss size calculation
  const getBossSize = () => targetSize * 1.5;

  // Handle target clicks
  const handleTargetClick = (id: number) => {
    if (gameOver) return;

    setTargets((prevTargets) => {
      const targetIndex = prevTargets.findIndex((target) => target.id === id);
      if (targetIndex === -1) return prevTargets;

      const target = prevTargets[targetIndex];

      // Handle boss targets
      if (target.isBoss && target.health && target.health > 1) {
        // Update boss health
        const updatedTargets = [...prevTargets];
        updatedTargets[targetIndex] = {
          ...target,
          health: target.health - 1,
        };
        return updatedTargets;
      }

      // Remove target if it's a dead boss or regular target
      const newTargets = prevTargets.filter((t) => t.id !== id);
      if (target.isBoss) {
        setScore((prev) => prev + 10); // Bonus points for killing boss
      } else {
        setScore((prev) => prev + (combo > 5 ? 2 : 1));
      }
      setCombo((prev) => prev + 1);
      return newTargets;
    });
  };

  // Spawn targets (regular or boss)
  const spawnTarget = () => {
    const shouldSpawnBoss = Math.random() < bossSpawnRate;
    const size = shouldSpawnBoss ? getBossSize() : targetSize;

    const x = Math.random() * (dimensions.width - size);
    const y = Math.random() * (dimensions.height - size);
    const dx = (Math.random() - 0.5) * targetSpeed;
    const dy = (Math.random() - 0.5) * targetSpeed;

    const newTarget: Target = {
      x,
      y,
      dx,
      dy,
      id: Date.now() + Math.random(),
      color: shouldSpawnBoss ? '#FFD700' : randomColor(), // Yellow for boss
      rotation: 0,
      isBoss: shouldSpawnBoss,
      health: shouldSpawnBoss ? 5 : undefined, // Boss has 5 health
    };

    setTargets((prev) => [...prev, newTarget]);
  };

  // Spawn power-ups
  const spawnPowerUp = () => {
    const x = Math.random() * (dimensions.width - targetSize);
    const y = Math.random() * (dimensions.height - targetSize);
    const type: PowerUpType = Math.random() < 0.33 ? 'extra-life' : Math.random() < 0.5 ? 'time-freeze' : 'double-points';
    const newPowerUp: PowerUp = {
      x,
      y,
      id: Date.now() + Math.random(),
      type,
    };
    setPowerUps((prevPowerUps) => [...prevPowerUps, newPowerUp]);

    setTimeout(() => {
      setPowerUps((prevPowerUps) => prevPowerUps.filter((powerUp) => powerUp.id !== newPowerUp.id));
    }, powerUpDuration);
  };

  // Handle mouse movement
  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!gameAreaRef.current) return;
    const rect = gameAreaRef.current.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  // Handle game area clicks
  const handleGameAreaClick = () => {
    if (gameOver) return;
    setLives((prevLives) => {
      const newLives = prevLives - 1;
      if (newLives <= 0) {
        setGameOver(true);
        setGameStarted(false);
        audioPlayerRef.current?.audio.current?.pause();
      }
      return newLives;
    });
  };

  // Start game: Reset state
  const startGame = () => {
    setScore(0);
    setLives(3);
    setGameOver(false);
    setTargets([]);
    setPowerUps([]);
    setCombo(0);
    setGameStarted(true);
    setBossSpawnRate(0.01); // Reset boss spawn rate
    setGameStartTime(Date.now());

    if (audioPlayerRef.current) {
      audioPlayerRef.current.audio.current.play();
    }
  };

  // Difficulty scaling: Increase boss spawn rate over time
  useEffect(() => {
    if (gameStarted && !gameOver) {
      const difficultyInterval = setInterval(() => {
        setBossSpawnRate((prev) => Math.min(prev + 0.015, 0.3)); // Increase by 1.5% every 2 minutes, cap at 30%
      }, 120000); // 2 minutes

      return () => clearInterval(difficultyInterval);
    }
  }, [gameStarted, gameOver]);

  // Game loop for target and power-up spawning
  useEffect(() => {
    if (gameStarted && !gameOver) {
      const spawnIntervalId = setInterval(() => {
        if (!gameOver) spawnTarget();
      }, targetSpawnInterval);

      const powerUpIntervalId = setInterval(() => {
        if (!gameOver) spawnPowerUp();
      }, powerUpSpawnInterval);

      return () => {
        clearInterval(spawnIntervalId);
        clearInterval(powerUpIntervalId);
      };
    }
  }, [gameStarted, gameOver]);

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-gray-900 py-4 px-2 space-y-4">
      <h1 className="text-4xl md:text-5xl font-extrabold text-white">Boss Mode Game</h1>
      <h2 className="text-xl text-gray-400">Created by You</h2>

      <div
        ref={gameAreaRef}
        className="relative bg-gray-800 border-4 border-yellow-500 rounded-lg overflow-hidden cursor-crosshair shadow-lg"
        style={{
          width: dimensions.width,
          height: dimensions.height,
          touchAction: 'none',
        }}
        onMouseMove={handleMouseMove}
        onClick={handleGameAreaClick}
      >
        {targets.map((target) => (
          <div
            key={target.id}
            className={`absolute rounded-full cursor-pointer transition-transform duration-100 ${
              target.isBoss ? 'animate-spin' : 'animate-pulse'
            }`}
            style={{
              width: target.isBoss ? getBossSize() : targetSize,
              height: target.isBoss ? getBossSize() : targetSize,
              left: target.x,
              top: target.y,
              backgroundColor: target.color,
              transform: `rotate(${target.rotation}deg)`,
              boxShadow: `0 0 10px ${target.color}`,
            }}
            onClick={(e) => {
              e.stopPropagation();
              handleTargetClick(target.id);
            }}
          >
            {target.isBoss && target.health && (
              <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-xl">
                {target.health}
              </div>
            )}
          </div>
        ))}

        {powerUps.map((powerUp) => (
          <div
            key={powerUp.id}
            className={`absolute rounded-full cursor-pointer flex items-center justify-center text-white font-bold transition-transform duration-100 animate-bounce ${
              powerUp.type === 'extra-life' ? 'bg-yellow-500' : powerUp.type === 'time-freeze' ? 'bg-blue-500' : 'bg-red-500'
            }`}
            style={{
              width: targetSize,
              height: targetSize,
              left: powerUp.x,
              top: powerUp.y,
              boxShadow: `0 0 10px ${
                powerUp.type === 'extra-life' ? 'yellow' : powerUp.type === 'time-freeze' ? 'blue' : 'red'
              }`,
            }}
            onClick={(e) => {
              e.stopPropagation();
              handleTargetClick(powerUp.id);
            }}
          >
            {powerUp.type === 'extra-life' ? '+' : powerUp.type === 'time-freeze' ? '❄️' : '2x'}
          </div>
        ))}

        <div
          className="absolute bg-green-500 rounded-full animate-ping"
          style={{
            width: 12,
            height: 12,
            left: mousePosition.x - 6,
            top: mousePosition.y - 6,
            pointerEvents: 'none',
          }}
        />
      </div>

      <div className="flex flex-wrap justify-center gap-4 text-xl text-white">
        <div>Score: {score}</div>
        <div>Lives: {lives}</div>
        <div>Combo: x{combo}</div>
        <div>Boss Rate: {Math.round(bossSpawnRate * 100)}%</div>
      </div>

      {!gameStarted && !gameOver && (
        <button
          className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold py-3 px-6 rounded-full shadow-lg transition duration-200"
          onClick={startGame}
        >
          Start Game
        </button>
      )}

      {gameOver && (
        <div className="text-center">
          <p className="text-3xl font-bold text-red-500">Game Over!</p>
          <button
            className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold py-3 px-6 rounded-full shadow-lg transition duration-200 mt-4"
            onClick={startGame}
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  );
};

export default Game;
