import React, { useState, useEffect, useRef, MouseEvent } from 'react';
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
  const [lives, setLives] = useState<number>(3);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [targets, setTargets] = useState<Target[]>([]);
  const [powerUps, setPowerUps] = useState<PowerUp[]>([]);
  const [combo, setCombo] = useState<number>(0);
  const [difficulty, setDifficulty] = useState<'gabriel' | 'easy' | 'normal' | 'hard'>('normal');
  const [showInstructions, setShowInstructions] = useState<boolean>(false);
  const [bossSpawnRate, setBossSpawnRate] = useState<number>(0.03);
  const soundCloudRef = useRef<HTMLIFrameElement>(null);
  const gameAreaRef = useRef<HTMLDivElement>(null);

  const songs = [
    { id: 1, name: 'Lo-Fi Chill Beats', src: 'https://soundcloud.com/oxinym/sets/lofi-beats-royalty-free' },
    { id: 2, name: 'Relaxing Music', src: 'https://soundcloud.com/relaxingmusicok' },
    { id: 3, name: 'Royalty Free Ambient Music', src: 'https://soundcloud.com/royalty-free-ambient' },
    { id: 4, name: 'Soothing Relaxation', src: 'https://soundcloud.com/soothingrelaxation' },
    { id: 5, name: 'Royalty Free Meditation Music', src: 'https://soundcloud.com/royaltyfreemeditation' },
  ];

  const [selectedSong, setSelectedSong] = useState(songs[0]);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [laser, setLaser] = useState<{
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    timestamp: number;
  } | null>(null);

  const targetSize: number = 30;
  const [gameWidth, setGameWidth] = useState<number>(600);
  const [gameHeight, setGameHeight] = useState<number>(400);
  const targetSpeed: number = 2;
  const targetSpawnInterval: number = 1500 / 2;
  const powerUpSpawnInterval: number = 5000 / 2;
  const powerUpDuration: number = 3000;
  const targetRotationSpeed: number = 2;

  // Handle game over state
  useEffect(() => {
    if (lives <= 0 && gameStarted) {
      setGameOver(true);
      setGameStarted(false);
      stopMusic();
    }
  }, [lives, gameStarted]);

  // Start music
  const startMusic = () => {
    if (soundCloudRef.current) {
      const widget = (window as any).SC.Widget(soundCloudRef.current);
      widget.play();
    }
  };

  // Stop music
  const stopMusic = () => {
    if (soundCloudRef.current) {
      const widget = (window as any).SC.Widget(soundCloudRef.current);
      widget.pause();
    }
  };

  // Start game
  const startGame = () => {
    const initialLives =
      difficulty === 'gabriel' ? 50 :
      difficulty === 'easy' ? 10 :
      difficulty === 'normal' ? 3 :
      1;

    setScore(0);
    setLives(initialLives);
    setGameOver(false);
    setTargets([]);
    setPowerUps([]);
    setCombo(0);
    setGameStarted(true);
    startMusic();
  };

  // Reset game
  const resetGame = () => {
    stopMusic();
    setGameStarted(false);
    setGameOver(false);
    setScore(0);
    setLives(
      difficulty === 'gabriel' ? 50 :
      difficulty === 'easy' ? 10 :
      difficulty === 'normal' ? 3 :
      1
    );
    setTargets([]);
    setPowerUps([]);
    setCombo(0);
  };

  // Handle mouse click
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
      setLives((prevLives) => Math.max(0, prevLives - 1));
    }

    setLaser({
      startX: mousePosition.x,
      startY: mousePosition.y,
      endX: clickX,
      endY: clickY,
      timestamp: Date.now(),
    });
  };

  // Spawn targets
  const spawnTarget = () => {
    const shouldSpawnBoss = Math.random() < bossSpawnRate;
    if (shouldSpawnBoss) {
      const x = Math.random() * (gameWidth - targetSize * 2);
      const y = Math.random() * (gameHeight - targetSize * 2);
      const dx = (Math.random() - 0.5) * (targetSpeed * 0.75);
      const dy = (Math.random() - 0.5) * (targetSpeed * 0.75);
      const newBoss: Target = {
        x,
        y,
        dx,
        dy,
        id: Date.now() + Math.random(),
        color: '#FFD700',
        rotation: 0,
        spawnTime: Date.now(),
        type: 'boss',
        size: targetSize * 2,
        health: 5,
        isImmune: true,
      };
      setTargets((prevTargets) => [...prevTargets, newBoss]);
      return;
    }

    const x = Math.random() * (gameWidth - targetSize);
    const y = Math.random() * (gameHeight - targetSize);
    const dx = (Math.random() - 0.5) * targetSpeed;
    const dy = (Math.random() - 0.5) * targetSpeed;
    const color = `#${Math.floor(Math.random() * 16777215).toString(16)}`;
    let type: 'normal' | 'slime' | 'mini' = 'normal';
    const random = Math.random();
    if (random < 0.1) {
      type = 'slime';
    } else if (random < 0.2) {
      type = 'mini';
    }
    let size: number;
    switch (type) {
      case 'slime':
        size = targetSize * 1.2;
        break;
      case 'mini':
        size = targetSize / 2;
        break;
      case 'normal':
        size = targetSize;
        break;
      default:
        size = targetSize;
        break;
    }
    const newTarget: Target = {
      x,
      y,
      dx,
      dy,
      id: Date.now() + Math.random(),
      color,
      rotation: 0,
      spawnTime: Date.now(),
      type,
      size,
    };
    setTargets((prevTargets) => [...prevTargets, newTarget]);
  };

  // Handle target clicks
  const handleTargetClick = (id: number, e: MouseEvent<HTMLDivElement>) => {
    if (gameOver) return;

    if (!gameAreaRef.current) return;
    const rect = gameAreaRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    setLaser({
      startX: mousePosition.x,
      startY: mousePosition.y,
      endX: clickX,
      endY: clickY,
      timestamp: Date.now(),
    });

    setTargets((prevTargets) => {
      const clickedTarget = prevTargets.find((target) => target.id === id);

      if (!clickedTarget) return prevTargets;

      // Handle boss targets
      if (clickedTarget.type === 'boss' && clickedTarget.health) {
        const updatedHealth = clickedTarget.health - 1;

        // If boss is defeated
        if (updatedHealth <= 0) {
          return prevTargets
            .map((target) =>
              target.id === id ? { ...target, isPopping: true, health: 0 } : target
            )
            .filter((target) => !(target.id === id && target.isPopping));
        }

        // If boss is hit but not defeated
        return prevTargets.map((target) =>
          target.id === id ? { ...target, health: updatedHealth } : target
        );
      }

      // Handle slime targets
      if (clickedTarget.type === 'slime') {
        const miniTarget1: Target = {
          x: clickedTarget.x,
          y: clickedTarget.y,
          dx: (Math.random() - 0.5) * targetSpeed,
          dy: (Math.random() - 0.5) * targetSpeed,
          id: Date.now() + Math.random(),
          color: '#FF66CC',
          rotation: 0,
          spawnTime: Date.now(),
          type: 'mini',
          size: targetSize / 2,
        };

        const miniTarget2: Target = {
          x: clickedTarget.x,
          y: clickedTarget.y,
          dx: (Math.random() - 0.5) * targetSpeed,
          dy: (Math.random() - 0.5) * targetSpeed,
          id: Date.now() + Math.random(),
          color: '#FF66CC',
          rotation: 0,
          spawnTime: Date.now(),
          type: 'mini',
          size: targetSize / 2,
        };

        return [
          ...prevTargets.filter((target) => target.id !== id),
          miniTarget1,
          miniTarget2,
        ];
      }

      // Handle regular targets
      return prevTargets.map((target) =>
        target.id === id ? { ...target, isPopping: true } : target
      );
    });

    setTimeout(() => {
      setTargets((prevTargets) => {
        const clickedTarget = prevTargets.find((target) => target.id === id);

        if (!clickedTarget) return prevTargets;

        // Add score for boss defeat
        if (clickedTarget.type === 'boss' && clickedTarget.health === 0) {
          setScore((prevScore) => prevScore + 10);
          return prevTargets.filter((target) => target.id !== id);
        }

        // Handle regular target defeat
        if (clickedTarget.isPopping) {
          const updatedTargets = prevTargets.filter((target) => target.id !== id);
          setScore((prevScore) => prevScore + (combo > 5 ? 2 : 1));
          setCombo((prevCombo) => prevCombo + 1);
          return updatedTargets;
        }

        return prevTargets;
      });
    }, 300);
  };

  // Handle power-up clicks
  const handlePowerUpClick = (id: number, e: MouseEvent<HTMLDivElement>) => {
    if (gameOver) return;

    if (!gameAreaRef.current) return;
    const rect = gameAreaRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    setLaser({
      startX: mousePosition.x,
      startY: mousePosition.y,
      endX: clickX,
      endY: clickY,
      timestamp: Date.now(),
    });

    const clickedPowerUp = powerUps.find((pu) => pu.id === id);
    if (!clickedPowerUp) return;
    setPowerUps((prevPowerUps) => prevPowerUps.filter((powerUp) => powerUp.id !== id));

    switch (clickedPowerUp.type) {
      case 'extra-life':
        setLives((prevLives) => prevLives + 1);
        break;
      case 'time-freeze':
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
        }, 5000);
        break;
      case 'double-points':
        setScore((prevScore) => prevScore + 10);
        break;
      case 'skull':
        setLives((prevLives) => Math.max(prevLives - 1, 0));
        break;
      case 'lightning':
        setTargets((currentTargets) =>
          currentTargets.map((target) => ({
            ...target,
            isPopping: target.isImmune ? false : true,
          }))
        );
        setTimeout(() => {
          setTargets((currentTargets) => {
            const nonImmuneTargets = currentTargets.filter((t) => !t.isImmune);
            setScore((prevScore) => prevScore + nonImmuneTargets.length);
            return currentTargets.filter((t) => t.isImmune);
          });
        }, 300);
        break;
      case 'lava-shield':
        const vulnerableTargets = targets.filter((t) => !t.isImmune);
        const halfLength = Math.ceil(vulnerableTargets.length / 2);
        setTargets((prevTargets) =>
          prevTargets.map((target) => {
            if (target.isImmune) return target;
            const targetIndex = vulnerableTargets.indexOf(target);
            return targetIndex < halfLength ? { ...target, isPopping: true } : target;
          })
        );
        setTimeout(() => {
          setTargets((prevTargets) => {
            const remainingTargets = prevTargets.filter((t) => !t.isPopping);
            setScore((prevScore) => prevScore + (prevTargets.length - remainingTargets.length));
            setLives((prevLives) => prevLives + 2);
            return remainingTargets;
          });
        }, 300);
        break;
      default:
        break;
    }
  };

  // Game loop for target and power-up movement
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

              setLives((prevLives) => Math.max(0, prevLives - expiredTargets.length));
            }, 300);
          }

          return updatedTargets;
        });

        setPowerUps((prevPowerUps) => {
          return prevPowerUps
            .map((powerUp) => {
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

              return { ...powerUp, x, y, dx, dy };
            })
            .filter((powerUp) => Date.now() - powerUp.spawnTime <= powerUpDuration);
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
        <iframe
          ref={soundCloudRef}
          width="0"
          height="0"
          scrolling="no"
          frameBorder="no"
          allow="autoplay"
          src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(selectedSong.src)}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true`}
        ></iframe>
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
