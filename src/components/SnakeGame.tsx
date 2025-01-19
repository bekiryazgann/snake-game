import { useEffect, useRef, useState } from 'react';
import styles from './SnakeGame.module.css';

// Game constants
const CANVAS_SIZE = 800;
const GRID_SIZE = 30;
const CELL_SIZE = CANVAS_SIZE / GRID_SIZE;
const INITIAL_SNAKE_LENGTH = 3;
const GAME_SPEED = 100;

// Types
type Position = {
    x: number;
    y: number;
};

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

type PowerUpType = 'SPEED' | 'MAGNET' | 'SHIELD';

type PowerUp = {
    type: PowerUpType;
    position: Position;
    duration: number;
    expiresAt?: number;
};

type Theme = 'default' | 'neon' | 'retro';

const THEMES = {
    default: {
        background: '#1a1a1a',
        grid: '#333',
        snake: ['#4CAF50', '#388E3C'],
        food: '#F44336',
        powerUp: '#FFC107'
    },
    neon: {
        background: '#000000',
        grid: '#1a1a1a',
        snake: ['#00ff00', '#00cc00'],
        food: '#ff00ff',
        powerUp: '#00ffff'
    },
    retro: {
        background: '#2c3e50',
        grid: '#34495e',
        snake: ['#e74c3c', '#c0392b'],
        food: '#f1c40f',
        powerUp: '#9b59b6'
    }
};

const SnakeGame: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [score, setScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [theme, setTheme] = useState<Theme>('default');
    const [activePowerUp, setActivePowerUp] = useState<PowerUp | null>(null);
    const [powerUp, setPowerUp] = useState<PowerUp | null>(null);
    const [gameSpeed, setGameSpeed] = useState(GAME_SPEED);
    const [snake, setSnake] = useState<Position[]>(() => {
        const initialSnake: Position[] = [];
        for (let i = 0; i < INITIAL_SNAKE_LENGTH; i++) {
            initialSnake.push({ x: Math.floor(GRID_SIZE / 2), y: Math.floor(GRID_SIZE / 2) + i });
        }
        return initialSnake;
    });
    const [food, setFood] = useState<Position>(() => ({
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
    }));
    const [direction, setDirection] = useState<Direction>('UP');
    const [isPaused, setIsPaused] = useState(false);

    // Generate new food position
    const generateFood = (): Position => {
        let newFood: Position;
        do {
            newFood = {
                x: Math.floor(Math.random() * GRID_SIZE),
                y: Math.floor(Math.random() * GRID_SIZE),
            };
        } while (snake.some(segment => segment.x === newFood.x && segment.y === newFood.y));
        return newFood;
    };

    // Generate new power-up
    const generatePowerUp = (): PowerUp => {
        const types: PowerUpType[] = ['SPEED', 'MAGNET', 'SHIELD'];
        const randomType = types[Math.floor(Math.random() * types.length)];
        let newPosition: Position;
        do {
            newPosition = {
                x: Math.floor(Math.random() * GRID_SIZE),
                y: Math.floor(Math.random() * GRID_SIZE),
            };
        } while (
            snake.some(segment => segment.x === newPosition.x && segment.y === newPosition.y) ||
            (food.x === newPosition.x && food.y === newPosition.y)
        );

        return {
            type: randomType,
            position: newPosition,
            duration: 5000, // 5 seconds
        };
    };

    // Apply power-up effects
    const applyPowerUp = (type: PowerUpType) => {
        const now = Date.now();
        switch (type) {
            case 'SPEED':
                setGameSpeed(GAME_SPEED / 2);
                break;
            case 'MAGNET':
                // Magnet logic will be handled in moveFood
                break;
            case 'SHIELD':
                // Shield logic will be handled in collision detection
                break;
        }
        setActivePowerUp({
            type,
            position: { x: 0, y: 0 },
            duration: 5000,
            expiresAt: now + 5000
        });
    };

    // Move food towards snake when magnet is active
    const moveFood = () => {
        if (activePowerUp?.type === 'MAGNET') {
            const head = snake[0];
            const newFood = { ...food };
            if (head.x > food.x) newFood.x++;
            if (head.x < food.x) newFood.x--;
            if (head.y > food.y) newFood.y++;
            if (head.y < food.y) newFood.y--;
            setFood(newFood);
        }
    };

    // Check and remove expired power-ups
    useEffect(() => {
        if (activePowerUp && activePowerUp.expiresAt && Date.now() > activePowerUp.expiresAt) {
            setGameSpeed(GAME_SPEED);
            setActivePowerUp(null);
        }
    }, [activePowerUp]);

    // Randomly spawn power-ups
    useEffect(() => {
        if (!powerUp && Math.random() < 0.01 && !gameOver && !isPaused) { // 1% chance each frame
            setPowerUp(generatePowerUp());
        }
    }, [snake, powerUp, gameOver, isPaused]);

    // Handle keyboard controls
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (gameOver) return;

            switch (e.key) {
                case 'ArrowUp':
                    if (direction !== 'DOWN') setDirection('UP');
                    break;
                case 'ArrowDown':
                    if (direction !== 'UP') setDirection('DOWN');
                    break;
                case 'ArrowLeft':
                    if (direction !== 'RIGHT') setDirection('LEFT');
                    break;
                case 'ArrowRight':
                    if (direction !== 'LEFT') setDirection('RIGHT');
                    break;
                case ' ':
                    setIsPaused(prev => !prev);
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [direction, gameOver]);

    // Update game loop
    useEffect(() => {
        if (gameOver || isPaused) return;

        const moveSnake = () => {
            const head = snake[0];
            const newHead: Position = { ...head };

            switch (direction) {
                case 'UP':
                    newHead.y = (newHead.y - 1 + GRID_SIZE) % GRID_SIZE;
                    break;
                case 'DOWN':
                    newHead.y = (newHead.y + 1) % GRID_SIZE;
                    break;
                case 'LEFT':
                    newHead.x = (newHead.x - 1 + GRID_SIZE) % GRID_SIZE;
                    break;
                case 'RIGHT':
                    newHead.x = (newHead.x + 1) % GRID_SIZE;
                    break;
            }

            // Check collision with self (ignore if shield is active)
            if (activePowerUp?.type !== 'SHIELD' &&
                snake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
                setGameOver(true);
                return;
            }

            const newSnake = [newHead];

            // Check if snake ate food
            if (newHead.x === food.x && newHead.y === food.y) {
                setScore(prev => prev + 10);
                setFood(generateFood());
                newSnake.push(...snake);
                moveFood();
            } else {
                newSnake.push(...snake.slice(0, -1));
            }

            // Check if snake ate power-up
            if (powerUp && newHead.x === powerUp.position.x && newHead.y === powerUp.position.y) {
                applyPowerUp(powerUp.type);
                setPowerUp(null);
            }

            setSnake(newSnake);
        };

        const gameInterval = setInterval(moveSnake, gameSpeed);
        return () => clearInterval(gameInterval);
    }, [snake, direction, food, gameOver, isPaused, gameSpeed, powerUp, activePowerUp]);

    // Update draw function
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const currentTheme = THEMES[theme];

        // Clear canvas
        ctx.fillStyle = currentTheme.background;
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        // Draw grid with rounded corners
        ctx.strokeStyle = currentTheme.grid;
        for (let i = 0; i <= GRID_SIZE; i++) {
            ctx.beginPath();
            ctx.moveTo(i * CELL_SIZE, 0);
            ctx.lineTo(i * CELL_SIZE, CANVAS_SIZE);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(0, i * CELL_SIZE);
            ctx.lineTo(CANVAS_SIZE, i * CELL_SIZE);
            ctx.stroke();
        }

        // Draw snake with rounded corners
        snake.forEach((segment, index) => {
            ctx.fillStyle = currentTheme.snake[index === 0 ? 0 : 1];
            ctx.beginPath();
            ctx.roundRect(
                segment.x * CELL_SIZE + 1,
                segment.y * CELL_SIZE + 1,
                CELL_SIZE - 2,
                CELL_SIZE - 2,
                5
            );
            ctx.fill();
        });

        // Draw food
        ctx.fillStyle = currentTheme.food;
        ctx.beginPath();
        ctx.arc(
            food.x * CELL_SIZE + CELL_SIZE / 2,
            food.y * CELL_SIZE + CELL_SIZE / 2,
            CELL_SIZE / 2 - 2,
            0,
            Math.PI * 2
        );
        ctx.fill();

        // Draw power-up if exists
        if (powerUp) {
            ctx.fillStyle = currentTheme.powerUp;
            ctx.beginPath();
            const x = powerUp.position.x * CELL_SIZE + CELL_SIZE / 2;
            const y = powerUp.position.y * CELL_SIZE + CELL_SIZE / 2;
            const size = CELL_SIZE / 2 - 2;

            // Draw star shape for power-up
            for (let i = 0; i < 5; i++) {
                const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
                const x1 = x + Math.cos(angle) * size;
                const y1 = y + Math.sin(angle) * size;
                if (i === 0) {
                    ctx.moveTo(x1, y1);
                } else {
                    ctx.lineTo(x1, y1);
                }
            }
            ctx.closePath();
            ctx.fill();
        }
    }, [snake, food, powerUp, theme]);

    // Add theme change handler
    const handleThemeChange = () => {
        const themes: Theme[] = ['default', 'neon', 'retro'];
        const currentIndex = themes.indexOf(theme);
        const nextIndex = (currentIndex + 1) % themes.length;
        setTheme(themes[nextIndex]);
    };

    const resetGame = () => {
        setSnake(() => {
            const initialSnake: Position[] = [];
            for (let i = 0; i < INITIAL_SNAKE_LENGTH; i++) {
                initialSnake.push({ x: Math.floor(GRID_SIZE / 2), y: Math.floor(GRID_SIZE / 2) + i });
            }
            return initialSnake;
        });
        setFood(generateFood());
        setDirection('UP');
        setScore(0);
        setGameOver(false);
        setIsPaused(false);
    };

    return (
        <div className={styles.gameContainer}>
            <div className={styles.scoreBoard}>
                <span>Skor: {score}</span>
                <button onClick={handleThemeChange} className={styles.themeButton}>
                    Tema Değiştir
                </button>
                {isPaused && <span className={styles.pausedText}>Oyun Duraklatıldı</span>}
                {activePowerUp && (
                    <span className={styles.powerUpText}>
                        {activePowerUp.type === 'SPEED' && '⚡ Hızlı!'}
                        {activePowerUp.type === 'MAGNET' && '🧲 Mıknatıs!'}
                        {activePowerUp.type === 'SHIELD' && '🛡️ Kalkan!'}
                    </span>
                )}
            </div>
            <canvas
                ref={canvasRef}
                width={CANVAS_SIZE}
                height={CANVAS_SIZE}
                className={`${styles.gameCanvas} ${styles[theme]}`}
            />
            {gameOver && (
                <div className={styles.gameOver}>
                    <h2>Oyun Bitti!</h2>
                    <p>Skorunuz: {score}</p>
                    <button onClick={resetGame}>Tekrar Oyna</button>
                </div>
            )}
            <div className={styles.controls}>
                <p>Kontroller:</p>
                <ul>
                    <li>Yön tuşları ile yılanı yönlendirin</li>
                    <li>Boşluk tuşu ile oyunu duraklatın</li>
                    <li>Güçlendirmeleri toplayarak avantaj kazanın!</li>
                </ul>
            </div>
        </div>
    );
};

export default SnakeGame; 