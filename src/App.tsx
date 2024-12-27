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
  const gameWidth: number = 600;
  const gameHeight: number = 400;
  const targetSpeed: number = 2;
  const targetSpawnInterval: number = 1500;
  const powerUpSpawnInterval: number = 5000;
  const powerUpDuration: number = 5000; // Power-ups last for 5 seconds
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const targetRotationSpeed: number = 2;

  // Inline random color generator
  const getRandomColor = (): string => {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  };

  const handleTargetClick = (id: number) => {
    if (gameOver) return;
    setTargets((prevTargets) => prevTargets.filter((target) => target.id !== id));
    setScore((prevScore) => prevScore + (combo > 5 ? 2 : 1));
    setCombo((prevCombo) => prevCombo + 1);
  };

  const handlePowerUpClick = (id: number) => {
    if (gameOver) return;
    const clickedPowerUp = powerUps.find((pu) => pu.id === id);
    if (!clickedPowerUp) return;
    setPowerUps((prevPowerUps) => prevPowerUps.filter((powerUp) => powerUp.id !== id));
    if (clickedPowerUp.type === 'extra-life') {
      setLives((prevLives) => prevLives + 1);
    }
    if (clickedPowerUp.type === 'time-freeze') {
      setCombo(0);
      setTargets((prevTargets) =>
        prevTargets.map((target) => ({
          ...target,
          dx: 0,
          dy: 0,
        }))
      );
      setTimeout(() => {
        setTargets((prevTargets) =>
          prevTargets.map((target) => ({
            ...target,
            dx: (Math.random() - 0.5) * targetSpeed,
            dy: (Math.random() - 0.5) * targetSpeed,
          }))
        );
      }, 3000);
    }
    if (clickedPowerUp.type === 'double-points') {
      setScore((prevScore) => prevScore + 10); // Bonus points
    }
  };

  const spawnTarget = () => {
    const x = Math.random() * (gameWidth - targetSize);
    const y = Math.random() * (gameHeight - targetSize);
    const dx = (Math.random() - 0.5) * targetSpeed;
    const dy = (Math.random() - 0.5) * targetSpeed;
    const color = getRandomColor(); // Use inline random color generator
    const newTarget: Target = {
      x,
      y,
      dx,
      dy,
      id: Date.now() + Math.random(),
      color,
      rotation: 0,
    };
    setTargets((prevTargets) => [...prevTargets, newTarget]);
  };

  const spawnPowerUp = () => {
    const x = Math.random() * (gameWidth - targetSize);
    const y = Math.random() * (gameHeight - targetSize);
    const type: PowerUpType = Math.random() < 0.33 ? 'extra-life' : Math.random() < 0.5 ? 'time-freeze' : 'double-points';
    const newPowerUp: PowerUp = {
      x,
      y,
      id: Date.now() + Math.random(),
      type,
    };
    setPowerUps((prevPowerUps) => [...prevPowerUps, newPowerUp]);

    // Remove power-up after a duration
    setTimeout(() => {
      setPowerUps((prevPowerUps) => prevPowerUps.filter((powerUp) => powerUp.id !== newPowerUp.id));
    }, powerUpDuration);
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!gameAreaRef.current) return;
    const rect = gameAreaRef.current.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

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

  const startGame = () => {
    setScore(0);
    setLives(3);
    setGameOver(false);
    setTargets([]);
    setPowerUps([]);
    setCombo(0);
    setGameStarted(true);

    // Start playing music
    if (audioPlayerRef.current) {
      audioPlayerRef.current.audio.current.play();
    }
  };

  const resetGame = () => {
    setGameStarted(false);
    setScore(0);
    setLives(3);
    setGameOver(false);
    setTargets([]);
    setPowerUps([]);
    setCombo(0);

    // Stop music
    if (audioPlayerRef.current) {
      audioPlayerRef.current.audio.current.pause();
      audioPlayerRef.current.audio.current.currentTime = 0;
    }
  };

  useEffect(() => {
    if (gameStarted && !gameOver) {
      const movementInterval = setInterval(() => {
        setTargets((prevTargets) => {
          const updatedTargets = prevTargets.map((target) => ({
            ...target,
            x: target.x + target.dx,
            y: target.y + target.dy,
            rotation: (target.rotation + targetRotationSpeed) % 360,
          }));

          const filteredTargets = updatedTargets.filter(
            (target) =>
              target.x > -targetSize &&
              target.x < gameWidth &&
              target.y > -targetSize &&
              target.y < gameHeight
          );

          return filteredTargets;
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
  }, [gameStarted, gameOver]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-4">
      <h1 className="text-5xl font-extrabold mb-8 text-white">Gabe's Game</h1>
      <h2 className="text-xl text-gray-400 mt-4">Created by Dakota Lock for Gabriel</h2>

      {/* Invisible Audio Player */}
      <div className="hidden">
        <AudioPlayer
          ref={audioPlayerRef}
          src="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
          autoPlay={false}
          loop={true}
          volume={0.5}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
      </div>

      <div
        ref={gameAreaRef}
        className="relative bg-gray-800 border-4 border-yellow-500 rounded-lg overflow-hidden cursor-crosshair shadow-lg"
        style={{ width: gameWidth, height: gameHeight }}
        onMouseMove={handleMouseMove}
        onClick={handleGameAreaClick}
      >
        {targets.map((target) => (
          <div
            key={target.id}
            className="absolute rounded-full cursor-pointer transition-transform duration-100 animate-pulse"
            style={{
              width: targetSize,
              height: targetSize,
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
          />
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
              handlePowerUpClick(powerUp.id);
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

      <div className="mt-4 flex space-x-8">
        <div className="text-xl text-white">Score: {score}</div>
        <div className="text-xl text-white">Lives: {lives}</div>
        <div className="text-xl text-white">Combo: x{combo}</div>
      </div>

      <div className="mt-6">
        {!gameStarted && !gameOver && (
          <button
            className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold py-3 px-6 rounded-full shadow-lg transition duration-200"
            onClick={startGame}
          >
            Start Game
          </button>
        )}
        {gameOver && (
          <div className="text-center mt-6">
            <p className="text-3xl font-bold text-red-500">Game Over!</p>
            <div className="mt-4 flex justify-center space-x-4">
              <button
                className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold py-3 px-6 rounded-full shadow-lg transition duration-200"
                onClick={startGame}
              >
                Play Again
              </button>
              <button
                className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-full shadow-lg transition duration-200"
                onClick={resetGame}
              >
                Reset Game
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Game;
