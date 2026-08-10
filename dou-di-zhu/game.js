// dou-di-zhu/game.js

// Constants
const CARD_WIDTH = 80;
const CARD_HEIGHT = 120;
const CARD_SPACING = 25;
const SUITS = ['♠', '♥', '♣', '♦'];
const RANKS = ['3','4','5','6','7','8','9','10','J','Q','K','A','2','SJ','BJ'];
const RANK_VALUES = {
    '3':3, '4':4, '5':5, '6':6, '7':7, '8':8, '9':9, '10':10,
    'J':11, 'Q':12, 'K':13, 'A':14, '2':15, 'SJ':16, 'BJ':17
};
const STATE = {
    INIT: 0,
    DEALING: 1,
    BIDDING: 2,
    PLAYING: 3,
    GAME_OVER: 4
};

// Types of combinations
const COMBO = {
    INVALID: 0,
    SINGLE: 1,
    PAIR: 2,
    TRIPLE: 3,
    TRIPLE_ONE: 4,
    TRIPLE_TWO: 5,
    STRAIGHT: 6,
    STRAIGHT_PAIRS: 7,
    AIRPLANE: 8,
    AIRPLANE_WINGS: 9,
    FOUR_TWO: 10,
    BOMB: 11,
    ROCKET: 12
};

class Card {
    constructor(suit, rank) {
        this.suit = suit; // 0, 1, 2, 3 (Spades, Hearts, Clubs, Diamonds)
        this.rank = rank; // '3', '4' ... 'BJ'
        this.value = RANK_VALUES[rank];
        this.selected = false;
        this.x = 0;
        this.y = 0;
        this.targetX = 0;
        this.targetY = 0;
    }

    draw(ctx, x, y, faceUp = true) {
        this.x = x;
        this.y = y;
        
        ctx.save();
        ctx.translate(x, y);
        
        // Shadow
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 5;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        // Card background
        ctx.fillStyle = faceUp ? '#ffffff' : '#1e3d59';
        ctx.beginPath();
        ctx.roundRect(0, 0, CARD_WIDTH, CARD_HEIGHT, 5);
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.stroke();

        ctx.shadowColor = 'transparent';

        if (faceUp) {
            if (this.rank === 'SJ') {
                ctx.fillStyle = '#222';
                ctx.font = 'bold 16px Arial';
                ctx.fillText('小', 10, 25);
                ctx.fillText('王', 10, 45);
                ctx.font = '24px Arial';
                ctx.fillText('🃏', CARD_WIDTH/2 - 12, CARD_HEIGHT/2);
            } else if (this.rank === 'BJ') {
                ctx.fillStyle = '#cc0000';
                ctx.font = 'bold 16px Arial';
                ctx.fillText('大', 10, 25);
                ctx.fillText('王', 10, 45);
                ctx.font = '24px Arial';
                ctx.fillText('🃏', CARD_WIDTH/2 - 12, CARD_HEIGHT/2);
            } else {
                ctx.fillStyle = (this.suit === 1 || this.suit === 3) ? '#cc0000' : '#222';
                ctx.font = 'bold 20px Arial';
                ctx.fillText(this.rank, 8, 25);
                ctx.font = '24px Arial';
                ctx.fillText(SUITS[this.suit], 8, 50);
                
                // Center large suit
                ctx.font = '40px Arial';
                ctx.globalAlpha = 0.2;
                ctx.fillText(SUITS[this.suit], CARD_WIDTH/2 - 20, CARD_HEIGHT/2 + 15);
                ctx.globalAlpha = 1.0;
            }
            
            if (this.selected) {
                ctx.fillStyle = 'rgba(0,0,0,0.1)';
                ctx.fill();
            }
        } else {
            // Card back pattern
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.rect(5, 5, CARD_WIDTH-10, CARD_HEIGHT-10);
            ctx.stroke();
            
            // Simple pattern
            ctx.fillStyle = '#fff';
            ctx.globalAlpha = 0.1;
            for(let i=10; i<CARD_WIDTH-10; i+=10) {
                for(let j=10; j<CARD_HEIGHT-10; j+=10) {
                    ctx.beginPath();
                    ctx.arc(i, j, 2, 0, Math.PI*2);
                    ctx.fill();
                }
            }
            ctx.globalAlpha = 1.0;
        }

        ctx.restore();
    }
}

// Logic to evaluate combinations
function analyzeHand(cards) {
    if (!cards || cards.length === 0) return { type: COMBO.INVALID, value: 0 };
    
    // Sort cards by value
    const sorted = [...cards].sort((a, b) => a.value - b.value);
    const counts = {};
    sorted.forEach(c => { counts[c.value] = (counts[c.value] || 0) + 1; });
    
    const countArr = Object.entries(counts).map(([v, c]) => ({ value: parseInt(v), count: c }));
    countArr.sort((a, b) => b.count - a.count || b.value - a.value); // Sort by count desc, then value desc

    const len = sorted.length;
    
    // Rocket
    if (len === 2 && sorted[0].value === 16 && sorted[1].value === 17) {
        return { type: COMBO.ROCKET, value: 17 };
    }
    
    // Bomb
    if (len === 4 && countArr[0].count === 4) {
        return { type: COMBO.BOMB, value: countArr[0].value };
    }
    
    // Single
    if (len === 1) return { type: COMBO.SINGLE, value: sorted[0].value };
    
    // Pair
    if (len === 2 && countArr[0].count === 2) return { type: COMBO.PAIR, value: countArr[0].value };
    
    // Triple
    if (len === 3 && countArr[0].count === 3) return { type: COMBO.TRIPLE, value: countArr[0].value };
    
    // Triple + 1
    if (len === 4 && countArr[0].count === 3) return { type: COMBO.TRIPLE_ONE, value: countArr[0].value };
    
    // Triple + 2
    if (len === 5 && countArr[0].count === 3 && countArr[1].count === 2) {
        return { type: COMBO.TRIPLE_TWO, value: countArr[0].value };
    }
    
    // Straight
    if (len >= 5 && countArr.length === len) {
        let isStraight = true;
        for (let i = 0; i < len - 1; i++) {
            if (sorted[i + 1].value - sorted[i].value !== 1 || sorted[i+1].value >= 15) { // No 2s or jokers in straight
                isStraight = false; break;
            }
        }
        if (isStraight) return { type: COMBO.STRAIGHT, value: sorted[len-1].value, length: len };
    }
    
    // Straight Pairs
    if (len >= 6 && len % 2 === 0 && countArr[0].count === 2 && countArr[countArr.length-1].count === 2) {
        let isStraightPairs = true;
        for (let i = 0; i < countArr.length - 1; i++) {
            if (countArr[i].value - countArr[i+1].value !== 1 || countArr[i].value >= 15) {
                isStraightPairs = false; break;
            }
        }
        if (isStraightPairs) return { type: COMBO.STRAIGHT_PAIRS, value: countArr[0].value, length: len };
    }
    
    // Airplane (e.g. 333444)
    if (len >= 6 && len % 3 === 0) {
        const triples = countArr.filter(c => c.count === 3);
        if (triples.length === len / 3) {
            let isAirplane = true;
            for (let i = 0; i < triples.length - 1; i++) {
                if (triples[i].value - triples[i+1].value !== 1 || triples[i].value >= 15) {
                    isAirplane = false; break;
                }
            }
            if (isAirplane) return { type: COMBO.AIRPLANE, value: triples[0].value, length: len };
        }
    }
    
    // Four + 2 singles or 2 pairs
    if ((len === 6 || len === 8) && countArr[0].count === 4) {
        return { type: COMBO.FOUR_TWO, value: countArr[0].value, length: len };
    }
    
    // Simplify Airplane with wings check (basic implementation for 2 wings)
    if (len >= 8) {
        const triples = countArr.filter(c => c.count >= 3);
        if (triples.length >= 2) {
            // Find longest consecutive triples sequence
            // For a simple AI and game, we just support 2 consecutive triples + 2 wings for now (8 cards)
            if (len === 8 && triples.length === 2 && Math.abs(triples[0].value - triples[1].value) === 1 && triples[0].value < 15) {
                return { type: COMBO.AIRPLANE_WINGS, value: Math.max(triples[0].value, triples[1].value), length: 8 };
            }
            // 3 consecutive triples + 3 wings (12 cards)
            if (len === 12 && triples.length === 3 && triples[0].value - triples[1].value === 1 && triples[1].value - triples[2].value === 1) {
                return { type: COMBO.AIRPLANE_WINGS, value: triples[0].value, length: 12 };
            }
            // 2 consecutive triples + 2 pairs (10 cards)
            if (len === 10 && triples.length === 2 && Math.abs(triples[0].value - triples[1].value) === 1) {
                const pairs = countArr.filter(c => c.count === 2 || c.count === 4);
                if (pairs.length >= 2) {
                     return { type: COMBO.AIRPLANE_WINGS, value: Math.max(triples[0].value, triples[1].value), length: 10 };
                }
            }
        }
    }
    
    return { type: COMBO.INVALID, value: 0 };
}

function canBeat(play1, play2) {
    if (play1.type === COMBO.INVALID) return false;
    
    if (play2 == null) return true; // first to play
    
    if (play1.type === COMBO.ROCKET) return true;
    if (play2.type === COMBO.ROCKET) return false;
    
    if (play1.type === COMBO.BOMB && play2.type !== COMBO.BOMB) return true;
    
    if (play1.type === play2.type) {
        if (play1.length === play2.length) {
            return play1.value > play2.value;
        }
    }
    
    return false;
}

class Game {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        this.state = STATE.INIT;
        this.players = [[], [], []]; // 0: User, 1: AI (Right), 2: AI (Left)
        this.roles = [0, 0, 0]; // 0: Farmer, 1: Landlord
        this.deck = [];
        this.dizhuCards = [];
        this.currentPlayer = 0;
        this.landlord = -1;
        
        this.lastPlay = null; // { player: 0, cards: [], combo: {} }
        this.passCount = 0;
        this.history = []; // Cards played on table
        
        this.bindEvents();
        this.hideUI();
        
        // Remove loading
        document.getElementById('loadingOverlay').classList.add('hidden');
        
        this.initGame();
        
        // Render loop
        this.lastTime = performance.now();
        this.animationLoop();
    }
    
    initGame() {
        this.state = STATE.INIT;
        this.deck = [];
        this.dizhuCards = [];
        this.players = [[], [], []];
        this.roles = [0, 0, 0];
        this.lastPlay = null;
        this.passCount = 0;
        this.history = [];
        this.landlord = -1;
        this.currentPlayer = -1;
        this.hideUI();
        document.getElementById('gameOverPanel').classList.add('hidden');
        
        // Create Deck
        for (let suit = 0; suit < 4; suit++) {
            for (let i = 0; i < 13; i++) {
                this.deck.push(new Card(suit, RANKS[i]));
            }
        }
        this.deck.push(new Card(0, 'SJ'));
        this.deck.push(new Card(0, 'BJ'));
        
        // Shuffle
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
        
        this.dealCards();
    }
    
    dealCards() {
        this.state = STATE.DEALING;
        // 17 cards each
        for (let i = 0; i < 17; i++) {
            this.players[0].push(this.deck.pop());
            this.players[1].push(this.deck.pop());
            this.players[2].push(this.deck.pop());
        }
        // 3 dizhu cards
        this.dizhuCards = [this.deck.pop(), this.deck.pop(), this.deck.pop()];
        
        this.sortHand(0);
        this.sortHand(1);
        this.sortHand(2);
        
        setTimeout(() => {
            this.startBidding();
        }, 1000);
    }
    
    sortHand(playerIdx) {
        this.players[playerIdx].sort((a, b) => b.value - a.value);
    }
    
    startBidding() {
        this.state = STATE.BIDDING;
        this.currentPlayer = 0; // Human bids first for simplicity
        document.getElementById('bidButtons').classList.remove('hidden');
    }
    
    handleBid(bid) {
        if (this.state !== STATE.BIDDING) return;
        document.getElementById('bidButtons').classList.add('hidden');
        
        if (bid) {
            this.setLandlord(0);
        } else {
            // AI Bidding (simple logic)
            setTimeout(() => {
                let p1score = this.evaluateHandStrength(this.players[1]);
                if (p1score > 5) {
                    this.setLandlord(1);
                } else {
                    let p2score = this.evaluateHandStrength(this.players[2]);
                    if (p2score > 5) {
                        this.setLandlord(2);
                    } else {
                        // Redeal
                        this.initGame();
                    }
                }
            }, 800);
        }
    }
    
    evaluateHandStrength(hand) {
        let score = 0;
        hand.forEach(c => {
            if (c.value === 17) score += 4;
            if (c.value === 16) score += 3;
            if (c.value === 15) score += 2;
        });
        // Count bombs
        let counts = {};
        hand.forEach(c => { counts[c.value] = (counts[c.value] || 0) + 1; });
        Object.values(counts).forEach(count => {
            if (count === 4) score += 4;
        });
        return score;
    }
    
    setLandlord(playerIdx) {
        this.landlord = playerIdx;
        this.roles[playerIdx] = 1; // 1 = Landlord
        this.currentPlayer = playerIdx;
        this.state = STATE.PLAYING;
        
        // Give 3 cards
        this.players[playerIdx].push(...this.dizhuCards);
        this.sortHand(playerIdx);
        
        this.nextTurn();
    }
    
    nextTurn() {
        if (this.state !== STATE.PLAYING) return;
        
        // Check win
        for (let i = 0; i < 3; i++) {
            if (this.players[i].length === 0) {
                this.gameOver(i);
                return;
            }
        }
        
        this.hideUI();
        
        if (this.currentPlayer === 0) {
            // Human Turn
            document.getElementById('actionButtons').classList.remove('hidden');
            document.getElementById('btnPass').disabled = (this.lastPlay === null || this.lastPlay.player === 0);
            
            // Auto deselect
            this.players[0].forEach(c => c.selected = false);
        } else {
            // AI Turn
            setTimeout(() => {
                this.playAI();
            }, 1000);
        }
    }
    
    playCards(cards) {
        const combo = analyzeHand(cards);
        if (combo.type === COMBO.INVALID) return false;
        
        let targetCombo = (this.lastPlay && this.lastPlay.player !== this.currentPlayer) ? this.lastPlay.combo : null;
        
        if (canBeat(combo, targetCombo)) {
            // Remove cards from hand
            cards.forEach(c => {
                const idx = this.players[this.currentPlayer].indexOf(c);
                if (idx !== -1) {
                    this.players[this.currentPlayer].splice(idx, 1);
                }
            });
            
            this.history = cards; // For display on table
            this.lastPlay = {
                player: this.currentPlayer,
                cards: [...cards],
                combo: combo
            };
            this.passCount = 0;
            
            this.currentPlayer = (this.currentPlayer + 1) % 3;
            this.nextTurn();
            return true;
        }
        return false;
    }
    
    pass() {
        if (this.lastPlay && this.lastPlay.player !== this.currentPlayer) {
            this.passCount++;
            
            // Clear history display for pass
            this.history = [];
            
            if (this.passCount >= 2) {
                // Everyone passed, next person can play anything
                this.lastPlay = null;
                this.passCount = 0;
                this.history = [];
            }
            this.currentPlayer = (this.currentPlayer + 1) % 3;
            this.nextTurn();
        }
    }
    
    playAI() {
        if (this.state !== STATE.PLAYING) return;
        
        let hand = this.players[this.currentPlayer];
        let targetCombo = (this.lastPlay && this.lastPlay.player !== this.currentPlayer) ? this.lastPlay.combo : null;
        
        // VERY basic AI
        let played = false;
        
        // Find single
        if (!targetCombo) {
            // Play lowest single
            this.playCards([hand[hand.length-1]]);
            played = true;
        } else {
            // Try to beat
            if (targetCombo.type === COMBO.SINGLE) {
                for (let i = hand.length - 1; i >= 0; i--) {
                    if (hand[i].value > targetCombo.value) {
                        this.playCards([hand[i]]);
                        played = true;
                        break;
                    }
                }
            } else if (targetCombo.type === COMBO.PAIR) {
                // Find pair
                let counts = {};
                hand.forEach(c => { counts[c.value] = (counts[c.value] || 0) + 1; });
                
                let sortedValues = Object.keys(counts).map(Number).sort((a,b)=>a-b);
                for(let v of sortedValues) {
                    if (counts[v] >= 2 && v > targetCombo.value) {
                        let toPlay = hand.filter(c => c.value === v).slice(0, 2);
                        this.playCards(toPlay);
                        played = true;
                        break;
                    }
                }
            }
            
            // If didn't play and have bomb
            if (!played && targetCombo.type !== COMBO.ROCKET) {
                 let counts = {};
                 hand.forEach(c => { counts[c.value] = (counts[c.value] || 0) + 1; });
                 let sortedValues = Object.keys(counts).map(Number).sort((a,b)=>a-b);
                 for(let v of sortedValues) {
                     if (counts[v] === 4 && (targetCombo.type !== COMBO.BOMB || v > targetCombo.value)) {
                         let toPlay = hand.filter(c => c.value === v);
                         this.playCards(toPlay);
                         played = true;
                         break;
                     }
                 }
            }
            
            if (!played && targetCombo.type !== COMBO.ROCKET) {
                let sj = hand.find(c => c.value === 16);
                let bj = hand.find(c => c.value === 17);
                if (sj && bj) {
                    this.playCards([sj, bj]);
                    played = true;
                }
            }
        }
        
        if (!played) {
            this.pass();
        }
    }
    
    gameOver(winnerIdx) {
        this.state = STATE.GAME_OVER;
        this.hideUI();
        
        const isLandlordWin = this.roles[winnerIdx] === 1;
        const playerIsLandlord = this.roles[0] === 1;
        
        const playerWin = (isLandlordWin && playerIsLandlord) || (!isLandlordWin && !playerIsLandlord);
        
        document.getElementById('gameOverPanel').classList.remove('hidden');
        document.getElementById('gameOverTitle').innerText = playerWin ? "胜利！" : "失败！";
        document.getElementById('gameOverMsg').innerText = isLandlordWin ? "地主获得了胜利" : "农民获得了胜利";
    }
    
    hideUI() {
        document.getElementById('actionButtons').classList.add('hidden');
        document.getElementById('bidButtons').classList.add('hidden');
    }
    
    bindEvents() {
        this.canvas.addEventListener('mousedown', (e) => {
            if (this.state !== STATE.PLAYING || this.currentPlayer !== 0) return;
            
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Handle card selection
            let hand = this.players[0];
            let startX = (this.canvas.width - (hand.length * CARD_SPACING + (CARD_WIDTH - CARD_SPACING))) / 2;
            let startY = 480;
            
            // Check in reverse order (top card first)
            for (let i = hand.length - 1; i >= 0; i--) {
                let cx = startX + i * CARD_SPACING;
                let cy = startY - (hand[i].selected ? 20 : 0);
                
                // For cards not at the end, only the visible sliver is clickable, unless it's the last card
                let cw = (i === hand.length - 1) ? CARD_WIDTH : CARD_SPACING;
                
                if (x >= cx && x <= cx + cw && y >= cy && y <= cy + CARD_HEIGHT) {
                    if (e.button === 2) {
                        hand[i].selected = false;
                    } else {
                        hand[i].selected = !hand[i].selected;
                    }
                    break; // Only click top card
                }
            }
        });
        
        // Prevent context menu
        this.canvas.addEventListener('contextmenu', e => e.preventDefault());
        
        document.getElementById('btnPlay').addEventListener('click', () => {
            const selected = this.players[0].filter(c => c.selected);
            if (selected.length > 0) {
                if (!this.playCards(selected)) {
                    // Invalid play
                    selected.forEach(c => c.selected = false);
                    alert("不符合规则的牌型或大不过上家！");
                }
            }
        });
        
        document.getElementById('btnPass').addEventListener('click', () => {
            this.pass();
        });
        
        document.getElementById('btnBid').addEventListener('click', () => {
            this.handleBid(true);
        });
        
        document.getElementById('btnBidPass').addEventListener('click', () => {
            this.handleBid(false);
        });
        
        document.getElementById('btnRestart').addEventListener('click', () => {
            this.initGame();
        });
        
        document.getElementById('btnReset').addEventListener('click', () => {
            this.initGame();
        });
        
        document.getElementById('btnFullscreen').addEventListener('click', () => {
            if (!document.fullscreenElement) {
                this.canvas.parentElement.requestFullscreen().catch(err => {
                    console.log(`Error attempting to enable fullscreen: ${err.message}`);
                });
            } else {
                document.exitFullscreen();
            }
        });
    }
    
    drawTable() {
        // Green gradient table
        const grad = this.ctx.createRadialGradient(
            this.canvas.width/2, this.canvas.height/2, 10,
            this.canvas.width/2, this.canvas.height/2, this.canvas.width/2
        );
        grad.addColorStop(0, '#157c3d');
        grad.addColorStop(1, '#0a5c2a');
        
        this.ctx.fillStyle = grad;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw simple table border inner
        this.ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(20, 20, this.canvas.width-40, this.canvas.height-40);
        
        // Draw center logo
        this.ctx.fillStyle = 'rgba(255,255,255,0.1)';
        this.ctx.font = 'bold 80px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('斗地主', this.canvas.width/2, this.canvas.height/2);
    }
    
    drawDizhuCards() {
        let x = (this.canvas.width - (3 * 60 + 20)) / 2;
        let y = 20;
        
        this.ctx.fillStyle = 'white';
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('底牌', this.canvas.width/2, y - 5);
        
        for (let i = 0; i < 3; i++) {
            if (this.dizhuCards.length > i) {
                this.ctx.save();
                this.ctx.translate(x + i * 70, y);
                this.ctx.scale(0.6, 0.6);
                this.dizhuCards[i].draw(this.ctx, 0, 0, this.state === STATE.PLAYING);
                this.ctx.restore();
            }
        }
    }
    
    drawPlayerInfo(x, y, name, role, isCurrentTurn, cardCount = 0) {
        this.ctx.save();
        this.ctx.translate(x, y);
        
        // Avatar bg
        this.ctx.fillStyle = isCurrentTurn ? '#ffcc00' : 'rgba(0,0,0,0.5)';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 40, 0, Math.PI*2);
        this.ctx.fill();
        
        // Inner avatar
        this.ctx.fillStyle = role === 1 ? '#cc0000' : '#444';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 35, 0, Math.PI*2);
        this.ctx.fill();
        
        this.ctx.fillStyle = 'white';
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(name, 0, 5);
        
        // Role text
        this.ctx.fillStyle = role === 1 ? '#ffcc00' : '#ccc';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.fillText(role === 1 ? '地主' : '农民', 0, 25);
        
        // Card count
        if (cardCount > 0) {
            this.ctx.fillStyle = 'white';
            this.ctx.beginPath();
            this.ctx.arc(30, -25, 15, 0, Math.PI*2);
            this.ctx.fill();
            
            this.ctx.fillStyle = 'black';
            this.ctx.font = 'bold 14px Arial';
            this.ctx.fillText(cardCount, 30, -20);
        }
        
        this.ctx.restore();
    }
    
    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.drawTable();
        this.drawDizhuCards();
        
        // Draw info
        this.drawPlayerInfo(100, 500, "我", this.roles[0], this.currentPlayer === 0);
        this.drawPlayerInfo(this.canvas.width - 80, 250, "玩家2", this.roles[1], this.currentPlayer === 1, this.players[1].length);
        this.drawPlayerInfo(80, 250, "玩家3", this.roles[2], this.currentPlayer === 2, this.players[2].length);
        
        // Draw played cards in center
        if (this.history.length > 0) {
            let startX = (this.canvas.width - (this.history.length * 30 + 50)) / 2;
            let startY = 250;
            this.history.forEach((card, i) => {
                this.ctx.save();
                this.ctx.scale(0.8, 0.8);
                card.draw(this.ctx, (startX + i * 30)/0.8, startY/0.8, true);
                this.ctx.restore();
            });
        } else if (this.passCount > 0 && this.state === STATE.PLAYING) {
            this.ctx.fillStyle = 'white';
            this.ctx.font = 'bold 24px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('不出', this.canvas.width/2, 300);
        }
        
        // Draw human hand
        let hand = this.players[0];
        let startX = (this.canvas.width - (hand.length * CARD_SPACING + (CARD_WIDTH - CARD_SPACING))) / 2;
        let startY = 480;
        
        hand.forEach((card, i) => {
            let y = startY - (card.selected ? 20 : 0);
            card.draw(this.ctx, startX + i * CARD_SPACING, y, true);
        });
        
        // Draw AI cards (face down representation)
        // Right AI
        let rHand = this.players[1];
        for (let i = 0; i < rHand.length; i++) {
            this.ctx.save();
            this.ctx.scale(0.4, 0.4);
            rHand[i].draw(this.ctx, (this.canvas.width - 80)/0.4, (100 + i * 15)/0.4, false);
            this.ctx.restore();
        }
        
        // Left AI
        let lHand = this.players[2];
        for (let i = 0; i < lHand.length; i++) {
            this.ctx.save();
            this.ctx.scale(0.4, 0.4);
            lHand[i].draw(this.ctx, (40)/0.4, (100 + i * 15)/0.4, false);
            this.ctx.restore();
        }
    }
    
    animationLoop() {
        const now = performance.now();
        const dt = now - this.lastTime;
        this.lastTime = now;
        
        this.draw();
        
        requestAnimationFrame(() => this.animationLoop());
    }
}

// Init game when DOM ready
window.addEventListener('DOMContentLoaded', () => {
    const game = new Game('gameCanvas');
});
