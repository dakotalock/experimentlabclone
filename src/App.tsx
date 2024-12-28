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
  spawnTime: number; // Added for despawn logic
}

type PowerUpType = 'extra-life' | 'time-freeze' | 'double-points' | 'skull' | 'lightning' | 'lava-shield';

interface PowerUp {
  x: number;
  y: number;
  dx: number;
  dy: number;
  id: number;
  type: PowerUpType;
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
  const [difficulty, setDifficulty] = useState<'easy' | 'normal' | 'hard'>('normal');
  const [showInstructions, setShowInstructions] = useState<boolean>(false); // Added for instructions
  const audioPlayerRef = useRef<any>(null);
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const targetSize: number = 30;
  const gameWidth: number = 600;
  const gameHeight: number = 400;
  const targetSpeed: number = 2;
  const targetSpawnInterval: number = 1500 / 2;
  const powerUpSpawnInterval: number = 5000 / 2;
  const powerUpDuration: number = 5000;
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const targetRotationSpeed: number = 2;

  // Updated songs array with reliable and tested URLs
  const songs = [
    { id: 1, name: 'Song 1', src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
    { id: 2, name: 'Song 2', src: 'https://files.freemusicarchive.org/storage-freemusicarchive-org/music/ccCommunity/Chad_Crouch/Arps/Chad_Crouch_-_Algorithms.mp3' },
    { id: 3, name: 'Song 3', src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3' },
    { id: 4, name: 'Song 4', src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' }, // SoundHelix for reliability
    { id: 5, name: 'Song 5', src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3' },
  ];

  const [selectedSong, setSelectedSong] = useState(songs[0]);

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
    } else if (clickedPowerUp.type === 'time-freeze') {
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
    } else if (clickedPowerUp.type === 'double-points') {
      setScore((prevScore) => prevScore + 10);
    } else if (clickedPowerUp.type === 'skull') {
      setLives((prevLives) => Math.max(prevLives - 1, 0));
    } else if (clickedPowerUp.type === 'lightning') {
      const pointsToAdd = targets.length;
      setTargets([]);
      setScore((prevScore) => prevScore + pointsToAdd);
    } else if (clickedPowerUp.type === 'lava-shield') {
      const halfLength = Math.ceil(targets.length / 2);
      const pointsToAdd = halfLength;
      setTargets((prevTargets) => prevTargets.slice(halfLength));
      setScore((prevScore) => prevScore + pointsToAdd);
      setLives((prevLives) => prevLives + 2);
    }
  };

  const spawnTarget = () => {
    const x = Math.random() * (gameWidth - targetSize);
    const y = Math.random() * (gameHeight - targetSize);
    const dx = (Math.random() - 0.5) * targetSpeed;
    const dy = (Math.random() - 0.5) * targetSpeed;
    const color = getRandomColor();
    const newTarget: Target = {
      x,
      y,
      dx,
      dy,
      id: Date.now() + Math.random(),
      color,
      rotation: 0,
      spawnTime: Date.now(), // Added for despawn logic
    };
    setTargets((prevTargets) => [...prevTargets, newTarget]);
  };

  const spawnPowerUp = () => {
    const x = Math.random() * (gameWidth - targetSize);
    const y = Math.random() * (gameHeight - targetSize);
    const dx = (Math.random() - 0.5) * targetSpeed; // Added movement
    const dy = (Math.random() - 0.5) * targetSpeed; // Added movement
    const powerUpTypes: PowerUpType[] = ['extra-life', 'time-freeze', 'double-points', 'skull', 'lightning', 'lava-shield'];
    const type: PowerUpType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
    const newPowerUp: PowerUp = {
      x,
      y,
      dx,
      dy,
      id: Date.now() + Math.random(),
      type,
    };
    setPowerUps((prevPowerUps) => [...prevPowerUps, newPowerUp]);

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
    setLives(difficulty === 'easy' ? 5 : difficulty === 'normal' ? 3 : 1);
    setGameOver(false);
    setTargets([]);
    setPowerUps([]);
    setCombo(0);
    setGameStarted(true);

    if (audioPlayerRef.current) {
      audioPlayerRef.current.audio.current.play();
    }
  };

  const resetGame = () => {
    setGameStarted(false);
    setScore(0);
    setLives(5);
    setGameOver(false);
    setTargets([]);
    setPowerUps([]);
    setCombo(0);

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

          // Check for expired targets (45 seconds)
          const expiredTargets = updatedTargets.filter(
            (target) => Date.now() - target.spawnTime > 45000
          );
          if (expiredTargets.length > 0) {
            setLives((prevLives) => Math.max(prevLives - expiredTargets.length, 0));
          }

          const filteredTargets = updatedTargets.filter(
            (target) =>
              target.x > -targetSize &&
              target.x < gameWidth &&
              target.y > -targetSize &&
              target.y < gameHeight &&
              Date.now() - target.spawnTime <= 45000 // Keep only non-expired targets
          );

          return filteredTargets;
        });

        // Add movement for power-ups
        setPowerUps((prevPowerUps) => {
          const updatedPowerUps = prevPowerUps.map((powerUp) => ({
            ...powerUp,
            x: powerUp.x + powerUp.dx,
            y: powerUp.y + powerUp.dy,
          }));

          const filteredPowerUps = updatedPowerUps.filter(
            (powerUp) =>
              powerUp.x > -targetSize &&
              powerUp.x < gameWidth &&
              powerUp.y > -targetSize &&
              powerUp.y < gameHeight
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
  }, [gameStarted, gameOver]);

  return (
    <div className="flex-container">
      <h1 className="text-5xl font-extrabold mb-8 text-white">Gabriel's Game</h1>
      <h2 className="text-xl text-gray-400 mt-4">Created by Dakota Lock for Gabriel</h2>

      <button
        className="instructions-button"
        onClick={() => setShowInstructions(!showInstructions)}
      >
        Instructions
      </button>

      {showInstructions && (
        <div className="instructions-modal">
          <h3>How to Play</h3>
          <ul>
            <li>Click on the moving targets to score points.</li>
            <li>If a target isn't clicked with 45 seconds, you lose a life.</li>
            <li>If you miss the target, you lose a life</li>
            <li>Use power-ups to gain advantages or face penalties.</li>
          </ul>
          <h3>Power-Ups</h3>
          <ul>
            <li><strong>+ Extra Life</strong>: Gives Extra life</li>
            <li><strong>❄️ Freeze Power-up</strong>: Freezes targets for 3 seconds</li>
            <li><strong>+10 +10 Power-up</strong>: Gain 10 points</li>
            <li><strong>⚡️Lightning Power-up</strong>: Destroy all targets and gain points</li>
            <li><strong>🛡️Lava Shield Power-up</strong>: Destroy half the targets, gain points, and gain 2 lives</li>
            <li><strong>🧙‍♀️Witch Trap</strong>: Lose a life</li>
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
        <AudioPlayer
          ref={audioPlayerRef}
          src={selectedSong.src}
          autoPlay={false}
          loop={true}
          volume={0.5}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
      </div>

      <div
        ref={gameAreaRef}
        className="game-area"
        style={{
          width: gameWidth,
          height: gameHeight,
        }}
        onMouseMove={handleMouseMove}
        onClick={handleGameAreaClick}
      >
        {targets.map((target) => (
          <div
            key={target.id}
            className="target"
            style={{
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
            className={`power-up power-up-${powerUp.type}`}
            style={{
              left: powerUp.x,
              top: powerUp.y,
            }}
            onClick={(e) => {
              e.stopPropagation();
              handlePowerUpClick(powerUp.id);
            }}
          >
            {powerUp.type === 'extra-life' ? '+' :
             powerUp.type === 'time-freeze' ? '❄️' :
             powerUp.type === 'double-points' ? '+10' :
             powerUp.type === 'lightning' ? '⚡️' :
             powerUp.type === 'lava-shield' ? '🛡️' : '🧙‍♀️'}
          </div>
        ))}

        <div
          className="crosshair"
          style={{
            left: mousePosition.x - 6,
            top: mousePosition.y - 6,
          }}
        />
      </div>

      <div className="score-display">
        <div className="text-xl text-white">Score: {score}</div>
        <div className="text-xl text-white">Lives: {lives}</div>
        <div className="text-xl text-white">Combo: x{combo}</div>
      </div>

      <div className="mt-6">
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

      <select
        value={selectedSong.id}
        onChange={(e) => {
          const selectedId = parseInt(e.target.value);
          setSelectedSong(songs.find(song => song.id === selectedId) || songs[0]);
        }}
        className="song-selector"
      >
        {songs.map(song => (
          <option key={song.id} value={song.id}>{song.name}</option>
        ))}
      </select>
    </div>
  );
};

export default Game;
