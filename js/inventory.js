/* ============================================
   HAWDAJ GAME — Powerup Inventory System
   Shows & manages powerups across all games
   ============================================ */

const PowerupInventory = (() => {
    // Powerup definitions with icons and effects
    const POWERUP_DEFS = {
        // Quiz Powerups
        '5050': { name: 'حذف إجابتين', icon: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Symbols/Keycap%20Digit%20Two.png', games: ['quiz'] },
        'skip': { name: 'تخطي سؤال', icon: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Symbols/Fast-Forward%20Button.png', games: ['quiz'] },
        'hint': { name: 'تلميح سحري', icon: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Light%20Bulb.png', games: ['quiz'] },
        'shield': { name: 'درع الحماية', icon: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Shield.png', games: ['quiz'] },
        'doublexp': { name: 'نقاط مضاعفة', icon: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Travel%20and%20places/High%20Voltage.png', games: ['quiz'] },

        // Puzzle Powerups
        'puzzle_time': { name: 'زيادة الوقت', icon: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Travel%20and%20places/Alarm%20Clock.png', games: ['puzzle'] },
        'magic_piece': { name: 'ترتيب قطعة', icon: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Activities/Puzzle%20Piece.png', games: ['puzzle'] },
        'show_image': { name: 'توضيح الصورة', icon: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Telescope.png', games: ['puzzle'] },
        'freeze': { name: 'تجميد الوقت', icon: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Travel%20and%20places/Snowflake.png', games: ['puzzle'] }
    };

    // Active powerups for current game session
    let activePowerups = {};
    let currentGame = null;
    let inventoryEl = null;

    function init() {
        // Create the inventory bar element (once)
        if (!document.getElementById('powerup-inventory-bar')) {
            inventoryEl = document.createElement('div');
            inventoryEl.id = 'powerup-inventory-bar';
            inventoryEl.className = 'powerup-inventory hidden';
            document.body.appendChild(inventoryEl);
        } else {
            inventoryEl = document.getElementById('powerup-inventory-bar');
        }
    }

    // Show inventory for a specific game
    function show(gameType) {
        if (!inventoryEl) init();
        currentGame = gameType;
        activePowerups = {};
        render();
        inventoryEl.classList.remove('hidden');
    }

    // Hide inventory
    function hide() {
        if (inventoryEl) {
            inventoryEl.classList.add('hidden');
        }
        activePowerups = {};
        currentGame = null;
    }

    // Render the inventory bar
    function render() {
        if (!inventoryEl) return;
        const data = HawdajData.get();
        const powerups = data.player.powerups || {};

        // Filter powerups for current game
        const available = Object.entries(POWERUP_DEFS).filter(([type, def]) => {
            return def.games.includes(currentGame) && (powerups[type] || 0) > 0;
        });

        let html = '';
        if (available.length === 0) {
            html += '<span class="inv-empty">🛍️ اشترِ قدرات!</span>';
        } else {
            html += '<span class="inv-label">⚡</span>';
        }

        available.forEach(([type, def]) => {
            const count = powerups[type] || 0;
            const isActive = activePowerups[type];
            html += `
                <div class="powerup-slot ${isActive ? 'active-powerup' : ''} ${count <= 0 ? 'disabled' : ''}" 
                     onclick="PowerupInventory.use('${type}')" 
                     title="${def.name}">
                    <img src="${def.icon}" class="slot-icon" alt="${def.name}">
                    <span class="slot-name">${def.name}</span>
                    <span class="slot-count">${count}</span>
                </div>
            `;
        });

        if (available.length > 0) {
            html += `<div style="width:1.5px;background:rgba(255,255,255,0.15);margin:0 4px;border-radius:2px;"></div>`;
        }
        html += `
            <div class="powerup-slot" onclick="PowerupInventory.openStoreFromGame()" style="background:rgba(255,215,0,0.15);border-color:rgba(255,215,0,0.4);" title="المتجر">
                <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Shopping%20Cart.png" class="slot-icon" alt="المتجر" style="width:24px;height:24px;margin-bottom:2px;">
                <span class="slot-name" style="color:#FFD700;">المتجر</span>
            </div>
        `;

        inventoryEl.innerHTML = html;
    }

    // Use a powerup
    function use(type) {
        const data = HawdajData.get();
        if (!data.player.powerups || !data.player.powerups[type] || data.player.powerups[type] <= 0) {
            HawdajApp.showToast('لا تملك هذه القدرة! اشترِ من المتجر ⚡', 'error');
            return false;
        }

        const def = POWERUP_DEFS[type];
        if (!def) return false;

        // Handle different powerup types
        switch (type) {
            case '5050':
                if (currentGame === 'quiz' && window.QuizGame && QuizGame.useFiftyFifty) {
                    QuizGame.useFiftyFifty();
                } else {
                    return applyGenericPowerup(type, def);
                }
                break;

            case 'skip':
                if (currentGame === 'quiz' && window.QuizGame && QuizGame.useSkip) {
                    QuizGame.useSkip();
                } else {
                    return applyGenericPowerup(type, def);
                }
                break;

            case 'hint':
                if (currentGame === 'quiz' && window.QuizGame && QuizGame.useHint) {
                    QuizGame.useHint();
                } else {
                    return applyGenericPowerup(type, def);
                }
                break;

            case 'doublexp':
                return applyTogglePowerup(type, def, 'نقاط مضاعفة x2 مفعّلة! ⚡');

            case 'shield':
                return applyTogglePowerup(type, def, 'درع الحماية مفعّل! 🛡️');

            // Puzzle specific
            case 'puzzle_time':
                return applyTimePowerup(type, def, 20, '+20 ثانية إضافية! ⏰');

            case 'magic_piece':
                if (currentGame === 'puzzle' && window.PuzzleGame && PuzzleGame.useMagicPiece) {
                    PuzzleGame.useMagicPiece();
                } else {
                    return applyGenericPowerup(type, def);
                }
                break;

            case 'show_image':
                if (currentGame === 'puzzle' && window.PuzzleGame && PuzzleGame.useShowImage) {
                    PuzzleGame.useShowImage();
                } else {
                    return applyGenericPowerup(type, def);
                }
                break;

            case 'freeze':
                if (currentGame === 'puzzle' && window.PuzzleGame && PuzzleGame.useFreeze) {
                    PuzzleGame.useFreeze();
                } else {
                    return applyGenericPowerup(type, def);
                }
                break;

            default:
                return applyGenericPowerup(type, def);
        }

        render();
        return true;
    }

    // Apply a generic single-use powerup
    function applyGenericPowerup(type, def) {
        const data = HawdajData.get();
        data.player.powerups[type]--;
        HawdajData.save();
        showPowerupToast(def.name + ' مفعّلة! ✨');
        HawdajAudio.SFX.correct();
        render();
        return true;
    }

    // Apply a toggle powerup (stays active for the round)
    function applyTogglePowerup(type, def, message) {
        if (activePowerups[type]) {
            HawdajApp.showToast('هذه القدرة مفعّلة بالفعل!', 'info');
            return false;
        }

        const data = HawdajData.get();
        data.player.powerups[type]--;
        HawdajData.save();
        activePowerups[type] = true;
        showPowerupToast(message);
        HawdajAudio.SFX.correct();
        render();
        return true;
    }

    // Apply a time-based powerup
    function applyTimePowerup(type, def, seconds, message) {
        const data = HawdajData.get();
        data.player.powerups[type]--;
        HawdajData.save();
        activePowerups[type] = true;

        // Try to add time to current game
        if (currentGame === 'quiz' && window.QuizGame && QuizGame.addTime) {
            QuizGame.addTime(seconds);
        } else if (currentGame === 'puzzle' && window.PuzzleGame && PuzzleGame.addTime) {
            PuzzleGame.addTime(seconds);
        }

        showPowerupToast(message);
        HawdajAudio.SFX.correct();
        render();
        return true;
    }

    // Check if a powerup is active
    function isActive(type) {
        return !!activePowerups[type];
    }

    // Get score multiplier
    function getScoreMultiplier() {
        let mult = 1;
        if (activePowerups.doublexp) mult *= 2;
        if (activePowerups.magnet) mult *= 1.5;
        return mult;
    }

    // Has shield active?
    function hasShield() {
        return !!activePowerups.shield;
    }

    // Consume shield (one-time use per activation)
    function consumeShield() {
        if (activePowerups.shield) {
            activePowerups.shield = false;
            render();
            showPowerupToast('🛡️ درع الحماية حماك!');
            return true;
        }
        return false;
    }

    // Show a big powerup activation toast
    function showPowerupToast(message) {
        const existing = document.querySelector('.powerup-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'powerup-toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 1300);
    }

    // Open Store as a modal overlay on top of the game
    function openStoreFromGame() {
        if (!window.renderStore) return;
        const store = document.getElementById('store-screen');
        if (!store) return;

        HawdajAudio.SFX.tap();

        // Pause Game Timers
        if (currentGame === 'quiz' && window.QuizGame && QuizGame.stopTimer) {
            QuizGame.stopTimer();
        } else if (currentGame === 'puzzle' && window.PuzzleGame && PuzzleGame.stopTimer) {
            PuzzleGame.stopTimer();
        }

        const oldState = {
            display: store.style.display,
            position: store.style.position,
            top: store.style.top,
            left: store.style.left,
            right: store.style.right,
            bottom: store.style.bottom,
            zIndex: store.style.zIndex,
            background: store.style.background,
            opacity: store.style.opacity,
            pointerEvents: store.style.pointerEvents,
            transform: store.style.transform,
            width: store.style.width, maxWidth: store.style.maxWidth,
            height: store.style.height,
            borderRadius: store.style.borderRadius,
            boxShadow: store.style.boxShadow,
            margin: store.style.margin,
            overflowY: store.style.overflowY
        };

        // Create a backdrop for the popup
        const backdrop = document.createElement('div');
        backdrop.id = 'store-popup-backdrop';
        backdrop.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.7); backdrop-filter:blur(8px); z-index:9998; animation:fadeIn 0.3s ease;';
        document.body.appendChild(backdrop);

        // Make the store act like a popup
        store.style.display = 'flex';
        store.style.position = 'fixed';
        store.style.top = '50%';
        store.style.left = '50%';
        store.style.transform = 'translate(-50%, -50%) scale(1)';
        store.style.zIndex = '9999';
        store.style.background = 'var(--bg-gradient)';
        store.style.opacity = '1';
        store.style.pointerEvents = 'all';
        store.style.width = oldState.width; store.style.maxWidth = oldState.maxWidth;
        store.style.maxWidth = '600px';
        store.style.height = '85vh';
        store.style.borderRadius = '24px';
        store.style.boxShadow = '0 20px 60px rgba(0,0,0,0.6)';
        store.style.overflowY = 'auto';

        window.renderStore();

        const backBtn = store.querySelector('.back-btn');
        const origTarget = backBtn.dataset.back;
        backBtn.dataset.back = '';
        backBtn.innerHTML = '✕';
        backBtn.style.background = 'rgba(255,255,255,0.1)';

        const closeStore = (e) => {
            HawdajAudio.SFX.tap();
            backdrop.remove();

            store.style.display = oldState.display;
            store.style.position = oldState.position;
            store.style.top = oldState.top;
            store.style.left = oldState.left;
            store.style.right = oldState.right;
            store.style.bottom = oldState.bottom;
            store.style.zIndex = oldState.zIndex;
            store.style.background = oldState.background;
            store.style.opacity = oldState.opacity;
            store.style.pointerEvents = oldState.pointerEvents;
            store.style.transform = oldState.transform;
            store.style.width = oldState.width;
            store.style.height = oldState.height;
            store.style.borderRadius = oldState.borderRadius;
            store.style.boxShadow = oldState.boxShadow;
            store.style.margin = oldState.margin;
            store.style.overflowY = oldState.overflowY;

            backBtn.dataset.back = origTarget;
            backBtn.innerHTML = '';
            backBtn.style.background = '';
            backBtn.removeEventListener('click', closeStore);

            render(); // Refresh inventory

            // Resume Game Timers
            if (currentGame === 'quiz' && window.QuizGame && QuizGame.resumeTimer) {
                QuizGame.resumeTimer();
            } else if (currentGame === 'puzzle' && window.PuzzleGame && PuzzleGame.resumeTimer) {
                PuzzleGame.resumeTimer();
            }
        };

        backBtn.addEventListener('click', closeStore);
    }

    return {
        init,
        show,
        hide,
        render,
        use,
        isActive,
        getScoreMultiplier,
        hasShield,
        consumeShield,
        POWERUP_DEFS,
        openStoreFromGame
    };
})();

// Expose to window explicitly
window.PowerupInventory = PowerupInventory;
