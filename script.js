class GameComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.sequence = [];
    this.playerSequence = [];
    this.round = 0;
    this.isPlaying = false;
    this.buttonsLocked = true;
    this.highScore = localStorage.getItem('simonHighScore') || 0;
    this.difficulty = 'normal'; // Options: easy, normal, hard
    this.sounds = {};
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
    this.preloadSounds();
  }

  preloadSounds() {
    const frequencies = {
      green: 261.6, // C4
      red: 329.6,   // E4
      yellow: 392,  // G4
      blue: 523.2   // C5
    };

    // Initialize AudioContext
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

    // Create and cache oscillators for each color
    Object.entries(frequencies).forEach(([color, frequency]) => {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gainNode.gain.value = 0;

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.start();

      this.sounds[color] = {
        oscillator,
        gainNode
      };
    });

    // Create error sound
    const errorOscillator = this.audioContext.createOscillator();
    const errorGainNode = this.audioContext.createGain();

    errorOscillator.type = 'sawtooth';
    errorOscillator.frequency.value = 150;
    errorGainNode.gain.value = 0;

    errorOscillator.connect(errorGainNode);
    errorGainNode.connect(this.audioContext.destination);

    errorOscillator.start();

    this.sounds.error = {
      oscillator: errorOscillator,
      gainNode: errorGainNode
    };
  }

  render() {
    this.shadowRoot.innerHTML = `
        <style>
          :host {
              display: flex;
              justify-content: center;
              align-items: center;
              font-family: 'Arial', sans-serif;
          }

          .game-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 20px;
          }
          
          .simon-board {
            display: grid;
            grid-template-columns: 7rem 7rem;
            grid-template-rows: 7rem 7rem;
            gap: 0.6rem;
            border-radius: 50%;
            background-color: #333;
            padding: 1rem;
            position: relative;
            box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
            transform: scale(1);
            transition: transform 0.2s;
          }
          
          .simon-board:hover {
            transform: scale(1.02);
          }
          
          .simon-button {
            width: 100%;
            height: 100%;
            opacity: 0.6;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.3);
          }
          
          .simon-button:hover {
            opacity: 0.8;
          }
          
          .simon-button.active {
            opacity: 1;
            box-shadow: 0 0 20px rgba(255, 255, 255, 0.7);
          }
          
          .green {
            background-color: #00c853;
            border-top-left-radius: 100%;
          }
          
          .red {
            background-color: #ff1744;
            border-top-right-radius: 100%;
          }
          
          .yellow {
            background-color: #ffeb3b;
            border-bottom-left-radius: 100%;
          }
          
          .blue {
            background-color: #2979ff;
            border-bottom-right-radius: 100%;
          }
          
          .controls {
            display: flex;
            flex-direction: column;
            gap: 15px;
            align-items: center;
            background-color: #f5f5f5;
            padding: 15px 25px;
            border-radius: 10px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          }
          
          .start-button {
            padding: 10px 25px;
            background-color: #333;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            transition: background-color 0.3s;
            font-weight: bold;
            letter-spacing: 1px;
          }
          
          .start-button:hover {
            background-color: #555;
          }
          
          .start-button:active {
            transform: translateY(2px);
          }
          
          .round-display {
            font-size: 18px;
            font-weight: bold;
            color: #333;
          }
          
          .high-score {
            font-size: 16px;
            color: #555;
          }
          
          .center-circle {
            position: absolute;
            width: 90px;
            height: 90px;
            background-color: #333;
            border-radius: 50%;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            display: flex;
            justify-content: center;
            align-items: center;
            color: white;
            font-weight: bold;
            font-size: 14px;
            box-shadow: inset 0 0 5px rgba(255, 255, 255, 0.2);
            border: 2px solid #222;
            text-align: center;
          }
          
          .game-info {
            display: flex;
            justify-content: space-between;
            width: 100%;
            margin-top: 10px;
          }
          
          .difficulty-select {
            margin-top: 10px;
            padding: 5px;
            border-radius: 5px;
            border: 1px solid #ccc;
          }
          
          .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.7);
            justify-content: center;
            align-items: center;
            z-index: 1000;
          }
          
          .modal-content {
            background-color: white;
            padding: 25px;
            border-radius: 10px;
            text-align: center;
            max-width: 400px;
            width: 90%;
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
          }
          
          .modal h2 {
            margin-top: 0;
            color: #333;
          }
          
          .modal p {
            margin: 15px 0;
            font-size: 18px;
          }
          
          .play-again {
            padding: 10px 20px;
            background-color: #333;
            color: white;
            border: none;
            border-radius: 5px;
            font-size: 16px;
            cursor: pointer;
            transition: background-color 0.3s;
          }
          
          .play-again:hover {
            background-color: #555;
          }
          
          @media (max-width: 500px) {
            .simon-board {
              grid-template-columns: 5rem 5rem;
              grid-template-rows: 5rem 5rem;
            }
            
            .center-circle {
              width: 70px;
              height: 70px;
              font-size: 12px;
            }
          }
        </style>
        
        <div class="game-container">
          <div class="simon-board">
            <div class="simon-button green" data-color="green"></div>
            <div class="simon-button red" data-color="red"></div>
            <div class="simon-button yellow" data-color="yellow"></div>
            <div class="simon-button blue" data-color="blue"></div>
            <div class="center-circle">SIMON</div>
          </div>
          
          <div class="controls">
            <div class="round-display">Round: 0</div>
            <div class="high-score">High Score: ${this.highScore}</div>
            
            <select class="difficulty-select">
              <option value="easy">Easy</option>
              <option value="normal" selected>Normal</option>
              <option value="hard">Hard</option>
            </select>
            
            <button class="start-button">Start Game</button>
          </div>
        </div>
        
        <div class="modal">
          <div class="modal-content">
            <h2>Game Over!</h2>
            <p>You reached Round <span class="final-score">0</span></p>
            <p class="high-score-message"></p>
            <button class="play-again">Play Again</button>
          </div>
        </div>
      `;
  }

  setupEventListeners() {
    const startButton = this.shadowRoot.querySelector('.start-button');
    const buttons = this.shadowRoot.querySelectorAll('.simon-button');
    const difficultySelect = this.shadowRoot.querySelector('.difficulty-select');
    const playAgainButton = this.shadowRoot.querySelector('.play-again');
    const modal = this.shadowRoot.querySelector('.modal');

    startButton.addEventListener('click', () => this.startGame());

    difficultySelect.addEventListener('change', (e) => {
      this.difficulty = e.target.value;
    });

    playAgainButton.addEventListener('click', () => {
      modal.style.display = 'none';
      this.startGame();
    });

    // Add keyboard controls
    document.addEventListener('keydown', (e) => {
      if (!this.buttonsLocked) {
        let color = null;

        switch (e.key.toLowerCase()) {
          case 'q':
          case 'arrowleft':
            color = 'green';
            break;
          case 'w':
          case 'arrowup':
            color = 'red';
            break;
          case 'a':
          case 'arrowdown':
            color = 'yellow';
            break;
          case 's':
          case 'arrowright':
            color = 'blue';
            break;
        }

        if (color) {
          this.playerInput(color);
          this.lightUpButton(color);
          this.playSound(color);
        }
      }

      // Start game with space bar
      if (e.key === ' ' && !this.isPlaying) {
        this.startGame();
      }
    });

    buttons.forEach(button => {
      button.addEventListener('click', () => {
        if (!this.buttonsLocked) {
          const color = button.dataset.color;
          this.playerInput(color);
          this.lightUpButton(color);
          this.playSound(color);
        }
      });

      // Add touch feedback for mobile
      button.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (!this.buttonsLocked) {
          const color = button.dataset.color;
          button.classList.add('active');
        }
      });

      button.addEventListener('touchend', (e) => {
        e.preventDefault();
        if (!this.buttonsLocked) {
          const color = button.dataset.color;
          button.classList.remove('active');
          this.playerInput(color);
          this.playSound(color);
        }
      });
    });
  }

  startGame() {
    // Reset game and wake up AudioContext if suspended
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    this.sequence = [];
    this.round = 0;
    this.isPlaying = true;
    this.nextRound();

    // Update button text
    const startButton = this.shadowRoot.querySelector('.start-button');
    startButton.textContent = 'Restart Game';
  }

  nextRound() {
    this.round++;
    this.updateRoundDisplay();
    this.playerSequence = [];
    this.addToSequence();
    this.playSequence();
  }

  addToSequence() {
    const colors = ['green', 'red', 'yellow', 'blue'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    this.sequence.push(randomColor);
  }

  async playSequence() {
    this.buttonsLocked = true;

    const centerCircle = this.shadowRoot.querySelector('.center-circle');
    centerCircle.textContent = 'WATCH';

    // Wait before starting the sequence
    await this.delay(500);

    // Play sequence at different speeds based on difficulty
    const speedMap = {
      easy: { pause: 600, light: 400 },
      normal: { pause: 400, light: 300 },
      hard: { pause: 300, light: 200 }
    };

    const speed = speedMap[this.difficulty];

    for (const color of this.sequence) {
      await this.delay(speed.pause - 100);
      this.lightUpButton(color);
      this.playSound(color);
      await this.delay(speed.light);
    }

    centerCircle.textContent = 'YOUR TURN';
    this.buttonsLocked = false;
  }

  lightUpButton(color) {
    const button = this.shadowRoot.querySelector(`.simon-button.${color}`);
    button.classList.add('active');

    setTimeout(() => {
      button.classList.remove('active');
    }, 300);
  }

  playSound(color) {
    if (color === 'error') {
      const gainNode = this.sounds.error.gainNode;
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.01);
      gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.5);
      return;
    }

    const sound = this.sounds[color];
    if (sound) {
      const gainNode = sound.gainNode;
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.01);
      gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.2);
    }
  }

  playerInput(color) {
    this.playerSequence.push(color);

    const currentIndex = this.playerSequence.length - 1;

    if (this.playerSequence[currentIndex] !== this.sequence[currentIndex]) {
      this.gameOver();
      return;
    }

    if (this.playerSequence.length === this.sequence.length) {
      this.buttonsLocked = true;
      const centerCircle = this.shadowRoot.querySelector('.center-circle');
      centerCircle.textContent = 'CORRECT!';

      // Visual feedback for completing the round
      setTimeout(() => {
        this.animateSuccess();
        setTimeout(() => this.nextRound(), 1000);
      }, 300);
    }
  }

  animateSuccess() {
    const buttons = this.shadowRoot.querySelectorAll('.simon-button');
    const colors = ['green', 'red', 'yellow', 'blue'];

    // Flash all buttons in sequence
    colors.forEach((color, index) => {
      setTimeout(() => {
        this.lightUpButton(color);
        this.playSound(color);
      }, index * 100);
    });
  }

  gameOver() {
    this.isPlaying = false;
    this.buttonsLocked = true;

    // Play error sound
    this.playSound('error');

    // Update high score if needed
    if (this.round > this.highScore) {
      this.highScore = this.round;
      localStorage.setItem('simonHighScore', this.highScore);
      this.updateHighScoreDisplay();
    }

    // Show game over modal
    const modal = this.shadowRoot.querySelector('.modal');
    const finalScore = this.shadowRoot.querySelector('.final-score');
    const highScoreMessage = this.shadowRoot.querySelector('.high-score-message');

    finalScore.textContent = this.round;

    if (this.round > this.highScore - 1) {
      highScoreMessage.textContent = 'Congratulations! New High Score!';
    } else {
      highScoreMessage.textContent = `High Score: ${this.highScore}`;
    }

    // Center text in the middle circle
    const centerCircle = this.shadowRoot.querySelector('.center-circle');
    centerCircle.textContent = 'GAME OVER';

    // Show modal with a slight delay
    setTimeout(() => {
      modal.style.display = 'flex';
    }, 500);
  }

  updateRoundDisplay() {
    const roundDisplay = this.shadowRoot.querySelector('.round-display');
    roundDisplay.textContent = `Round: ${this.round}`;
  }

  updateHighScoreDisplay() {
    const highScoreDisplay = this.shadowRoot.querySelector('.high-score');
    highScoreDisplay.textContent = `High Score: ${this.highScore}`;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Clean up when element is removed
  disconnectedCallback() {
    // Close AudioContext and clean up oscillators
    if (this.audioContext) {
      Object.values(this.sounds).forEach(sound => {
        try {
          sound.oscillator.stop();
        } catch (e) {
          // Oscillator might have already been stopped
        }
      });
      this.audioContext.close();
    }
  }
}

// Define the custom element
customElements.define('game-component', GameComponent);
