class GameComponent extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.sequence = [];
        this.playerSequence = [];
        this.round = 0;
        this.isPlaying = false;
        this.buttonsLocked = true;
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
    }

    render() {
        this.shadowRoot.innerHTML = `
          <style>
            :host {
                display: flex;
                justify-content: center;
                align-items: center;
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
            }
            
            .simon-button {
              width: 100%;
              height: 100%;
              opacity: 0.5;
              cursor: pointer;
              transition: opacity 0.2s;
            }
            
            .simon-button.active {
              opacity: 1;
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
              gap: 10px;
              align-items: center;
            }
            
            .start-button {
              padding: 10px 20px;
              background-color: #333;
              color: white;
              border: none;
              border-radius: 5px;
              cursor: pointer;
              font-size: 16px;
            }
            
            .round-display {
              font-size: 18px;
              font-weight: bold;
              color: #333;
            }
            
            .center-circle {
              position: absolute;
              width: 80px;
              height: 80px;
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
              font-size: 18px;
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
              <button class="start-button">Start Game</button>
            </div>
          </div>
        `;
    }

    setupEventListeners() {
        const startButton = this.shadowRoot.querySelector('.start-button');
        const buttons = this.shadowRoot.querySelectorAll('.simon-button');

        startButton.addEventListener('click', () => this.startGame());

        buttons.forEach(button => {
            button.addEventListener('click', () => {
                if (!this.buttonsLocked) {
                    const color = button.dataset.color;
                    this.playerInput(color);
                    this.lightUpButton(color);
                    this.playSound(color);
                }
            });
        });
    }

    startGame() {
        this.sequence = [];
        this.round = 0;
        this.isPlaying = true;
        this.nextRound();
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

        // Wait before starting the sequence
        await this.delay(500);

        for (const color of this.sequence) {
            await this.delay(300);
            this.lightUpButton(color);
            this.playSound(color);
            await this.delay(500);
        }

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
        const frequencies = {
            green: 261.6, // C4
            red: 329.6,   // E4
            yellow: 392,  // G4
            blue: 523.2   // C5
        };

        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.value = frequencies[color];
        gainNode.gain.value = 0.3;

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.start();

        setTimeout(() => {
            oscillator.stop();
            audioContext.close();
        }, 200);
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
            setTimeout(() => this.nextRound(), 1000);
        }
    }

    gameOver() {
        this.isPlaying = false;
        this.buttonsLocked = true;

        // Play error sound
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.type = 'sawtooth';
        oscillator.frequency.value = 150;
        gainNode.gain.value = 0.3;

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.start();

        setTimeout(() => {
            oscillator.stop();
            audioContext.close();
            alert(`Game Over! You reached round ${this.round}`);
            this.round = 0;
            this.updateRoundDisplay();
        }, 500);
    }

    updateRoundDisplay() {
        const roundDisplay = this.shadowRoot.querySelector('.round-display');
        roundDisplay.textContent = `Round: ${this.round}`;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Define the custom element
customElements.define('game-component', GameComponent);
