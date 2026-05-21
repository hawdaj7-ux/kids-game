/* ============================================
   HAWDAJ GAME — Main App Controller
   ============================================ */

const HawdajApp = (() => {
    let currentScreen = 'splash-screen';
    let toastTimeout = null;

    function init() {
        // Portrait mode supported — no orientation lock needed

        // Load data
        // Ensure data is loaded, if not present in memory, load from storage
        if (!HawdajData.get()) {
            HawdajData.load();
        }
        const data = HawdajData.get(); // Get the loaded data

        // Setup Firebase Listeners
        const initFirebaseListeners = () => {
            if (window.HawdajFirebase) {
                window.HawdajFirebase.listenToGlobalData((d) => {
                    HawdajData.loadGlobalData(d);
                });
                window.HawdajFirebase.listenToLeaderboard((lb) => {
                    HawdajData.loadLeaderboardData(lb);
                });
            }
        };

        if (window.HawdajFirebase && window.HawdajFirebase.isReady) {
            initFirebaseListeners();
        } else {
            window.addEventListener('HawdajFirebaseReady', initFirebaseListeners);
        }

        // Initialize modules
        // HawdajAudio doesn't need init called

        // Force the normal (Emerald & Gold) theme on load and clear any legacy saved theme
        if (data.theme !== 'normal') {
            data.theme = 'normal';
            if (window.HawdajData && typeof HawdajData.save === 'function') {
                HawdajData.save(true);
            }
        }
        document.body.className = 'normal';

        // Init effects
        HawdajEffects.init();

        // Init powerup inventory
        if (window.PowerupInventory) PowerupInventory.init();

        // Setup splash stars
        createSplashStars();

        // Event listeners
        setupNavigation();
        setupSplash();
        setupMainMenu();
        setupQuizCategory();
        setupQuizGame();
        setupPuzzle();
        setupMap();
        setupLeaderboard();
        setupAdmin();
        setupNameModal();

        // Check if player has name
        if (data.player.name) {
            updatePlayerDisplay();
        }

        // Apply dev UI settings
        applyGlobalDevSettings();

        // ── Live score update listener ──
        // Fires every time addScore() is called from any game
        window.addEventListener('HawdajScoreUpdated', (e) => {
            const total = e.detail.total;
            // Main menu counter
            const menuEl = document.getElementById('total-score-val');
            if (menuEl) {
                menuEl.textContent = total;
                menuEl.style.animation = 'none'; menuEl.offsetHeight;
                menuEl.style.animation = 'scorePopIn 0.5s cubic-bezier(0.175,0.885,0.32,1.275)';
            }
            // Store counter
            const storeEl = document.getElementById('store-score-val');
            if (storeEl) storeEl.textContent = total;
            // Results screen
            const resultsEl = document.getElementById('results-total-score');
            if (resultsEl) resultsEl.textContent = total;
        });

        // Periodic floating stars/sparkles to make the game magical for kids
        setInterval(() => {
            HawdajEffects.floatingStars(2);
        }, 3000);
    }

    // ── Global Customizations ──
    function applyGlobalDevSettings() {
        const data = HawdajData.get();
        if (!data || !data.devSettings || !data.devSettings.icons) return;
        const icons = data.devSettings.icons;

        if (icons.ui_settings) document.getElementById('menu-settings-btn').innerHTML = `<img src="${icons.ui_settings}" style="width:70%; height:70%; object-fit:contain;">`;
        if (icons.ui_leaderboard) document.getElementById('menu-lb-btn').innerHTML = `<img src="${icons.ui_leaderboard}" style="width:70%; height:70%; object-fit:contain;">`;
        if (icons.ui_store) document.getElementById('menu-store-btn').innerHTML = `<img src="${icons.ui_store}" style="width:70%; height:70%; object-fit:contain;">`;

        if (icons.bg_store) {
            const storeScreen = document.getElementById('store-screen');
            if (storeScreen) {
                storeScreen.style.backgroundImage = `url(${icons.bg_store})`;
                storeScreen.style.backgroundSize = 'cover';
                storeScreen.style.backgroundPosition = 'center';
            }
        }

        if (icons && icons.ui_currency) {
            document.querySelectorAll('.coin-icon, .star').forEach(el => {
                el.innerHTML = `<img src="${icons.ui_currency}" style="width:100%; height:100%; object-fit:contain; border-radius:50%;">`;
                el.style.background = 'transparent';
                el.style.boxShadow = 'none';
                el.style.border = 'none';
            });
            document.querySelectorAll('#menu-total-score .coin-icon, #store-screen .coin-icon').forEach(el => {
                el.style.width = '30px';
                el.style.height = '30px';
                el.style.padding = '0';
            });
        }

        const azzamImg = document.getElementById('menu-azzam');
        const jadelImg = document.getElementById('menu-jadel');
        if (azzamImg) azzamImg.src = HawdajData.getCharacterPose('azzam', 'idle') || 'assets/char/azzam.jpeg';
        if (jadelImg) jadelImg.src = HawdajData.getCharacterPose('jadel', 'idle') || 'assets/char/El jadel.jpeg';

        const splashAzzam = document.getElementById('splash-azzam');
        const splashJadel = document.getElementById('splash-jadel');
        if (splashAzzam) splashAzzam.src = HawdajData.getCharacterPose('azzam', 'welcome') || HawdajData.getCharacterPose('azzam', 'idle') || 'assets/char/azzam.jpeg';
        if (splashJadel) splashJadel.src = HawdajData.getCharacterPose('jadel', 'welcome') || HawdajData.getCharacterPose('jadel', 'idle') || 'assets/char/El jadel.jpeg';

        updatePlayerDisplay();
    }

    // Refresh when firebase data updates
    window.addEventListener('HawdajDataUpdated', () => {
        applyGlobalDevSettings();
        refreshNameModalEmojis();
        if (currentScreen === 'main-menu') {
            renderHomeCompetitions();
        }

        // Check if current user was deleted by admin
        const data = HawdajData.get();
        if (data.player.name && (!window.AdminPanel || !window.AdminPanel.isLoggedIn)) {
            const userStillExists = (data.allUsers || []).some(u => u.name === data.player.name);
            if (!userStillExists) {
                // Grace period: only log out if the player has been registered for more than 5 minutes.
                // New registrations take time to propagate to Firebase — we must not log them out
                // before their data has synced (appendUserToGlobal is async).
                const registeredAt = data.player.registeredAt || 0;
                const minutesSinceRegistration = (Date.now() - registeredAt) / 60000;
                if (minutesSinceRegistration > 5) {
                    console.log('User deleted from Admin, logging out...');
                    data.player.name = '';
                    data.player.totalScore = 0;
                    data.player.quizScore = 0;
                    data.player.puzzleScore = 0;
                    data.player.gamesPlayed = 0;
                    HawdajData.save();
                    window.location.reload();
                }
            }
        }
    });

    // ── Navigation ──
    function navigate(screenId) {
        const oldScreen = document.getElementById(currentScreen);
        const newScreen = document.getElementById(screenId);
        if (!newScreen || screenId === currentScreen) return;

        if (oldScreen) {
            oldScreen.classList.remove('active');
            oldScreen.classList.add('exiting');
            setTimeout(() => oldScreen.classList.remove('exiting'), 400);
        }

        setTimeout(() => {
            if (['main-menu'].includes(screenId)) {
                const data = HawdajData.get();
                if (data && data.player && data.player.activeCompetitionId) {
                    data.player.activeCompetitionId = null;
                    HawdajData.save(true);
                }
            }

            newScreen.classList.add('active');
            currentScreen = screenId;
            HawdajAudio.SFX.whoosh();

            const globalButtons = document.querySelector('.global-floating-buttons');
            if (globalButtons) {
                if (screenId === 'splash-screen' || screenId === 'admin-panel' || screenId === 'developer') {
                    globalButtons.style.display = 'none';
                } else {
                    globalButtons.style.display = 'flex';
                }
            }

            // Trigger screen-specific inits
            if (screenId === 'main-menu') {
                updatePlayerDisplay();
                renderHomeCompetitions();
                renderDailyQuestion();
                HawdajEffects.floatingStars(10);
                // Restart background music on main menu
                HawdajAudio.startBgMusic();
            }
            if (screenId === 'daily-tasks') renderDailyTasks();
            if (screenId === 'leaderboard') LeaderboardManager.init();
            if (screenId === 'puzzle-select') PuzzleGame.renderPuzzleList();
            if (screenId === 'map-game') MapGame.init();
            if (screenId === 'quiz-results' || screenId === 'store') updatePlayerDisplay();

            // Show/hide powerup inventory based on game screen
            if (window.PowerupInventory) {
                if (screenId === 'quiz-game') {
                    PowerupInventory.show('quiz');
                } else if (screenId === 'puzzle-game') {
                    PowerupInventory.show('puzzle');
                } else if (screenId === 'map-game') {
                    PowerupInventory.show('map');
                } else {
                    PowerupInventory.hide();
                }
            }

            // Update character poses based on screen
            updateCharacterPoses(screenId);
        }, 150);
    }

    function updateCharacterPoses(screenId) {
        const azzamEl = document.getElementById('menu-azzam');
        const jadelEl = document.getElementById('menu-jadel');
        if (!azzamEl || !jadelEl) return;

        let azzamPose = 'idle', jadelPose = 'idle';
        switch (screenId) {
            case 'main-menu':
                azzamPose = 'welcome'; jadelPose = 'welcome'; break;
            case 'quiz-category':
            case 'quiz-game':
                azzamPose = 'thinking'; jadelPose = 'thinking'; break;
            case 'puzzle-select':
            case 'puzzle-play':
                azzamPose = 'happy'; jadelPose = 'happy'; break;
            case 'map-game':
                azzamPose = 'talking'; jadelPose = 'happy'; break;
            case 'leaderboard':
                azzamPose = 'happy'; jadelPose = 'happy'; break;
        }
        azzamEl.src = HawdajData.getCharacterPose('azzam', azzamPose);
        jadelEl.src = HawdajData.getCharacterPose('jadel', jadelPose);
    }

    // ── Toast ──
    function showToast(msg, type = 'info') {
        const toast = document.getElementById('toast');
        if (!toast) return;
        toast.textContent = msg;
        toast.className = `toast ${type} show`;
        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            toast.classList.remove('show');
        }, 2800);
    }

    // ── Task Completed Popup ──
    function showTaskCompletedPopup(taskName) {
        if (window.HawdajAudio) HawdajAudio.SFX.victory();
        if (window.HawdajEffects) HawdajEffects.celebrationBurst();
        const modal = document.createElement('div');
        modal.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.8);backdrop-filter:blur(8px);animation:fadeIn 0.3s ease;';
        modal.innerHTML = '<div style="background:var(--card-bg, #1a1a2e); border:2px solid #2ecc71; border-radius:24px; padding:30px; text-align:center; max-width:350px; width:90%; box-shadow:0 10px 40px rgba(46,204,113,0.3); transform:scale(0); animation:popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;">' +
            '<div style="font-size:4rem; margin-bottom:10px; animation:bounce 2s infinite;">🎉</div>' +
            '<h2 style="color:#2ecc71; font-weight:900; margin-bottom:10px; font-size:1.5rem;">عمل رائع!</h2>' +
            '<p style="color:var(--text-primary); font-size:1.1rem; margin-bottom:20px; font-weight:bold;">لقد أكملت مهمة:<br><span style="color:#FFD700; font-size:1.3rem;">' + taskName + '</span><br>بنجاح!</p>' +
            '<button onclick="this.parentElement.parentElement.remove(); if(window.HawdajAudio) HawdajAudio.SFX.tap();" style="background:linear-gradient(135deg,#2ecc71,#27ae60); color:white; border:none; padding:10px 24px; border-radius:20px; font-weight:800; font-size:1rem; cursor:pointer; box-shadow:0 5px 15px rgba(46,204,113,0.4); transition:transform 0.2s;">متابعة</button>' +
            '</div>';
        document.body.appendChild(modal);
    }

    // ── Elimination Effect (Game Over Style) ──
    function showEliminationEffect(compName) {
        // Multiple dramatic sounds
        if (window.HawdajAudio) {
            HawdajAudio.SFX.wrong();
            HawdajAudio.stopChallengeBg && HawdajAudio.stopChallengeBg();
            HawdajAudio.vibrate && HawdajAudio.vibrate([200, 100, 200, 100, 400]);
        }
        // Screen shake
        document.body.style.animation = 'none';
        document.body.offsetHeight;
        document.body.style.animation = 'screenShake 0.6s ease-in-out';

        const overlay = document.createElement('div');
        overlay.id = 'elimination-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0);pointer-events:all;';
        document.body.appendChild(overlay);

        // Red flash
        const flash = document.createElement('div');
        flash.style.cssText = 'position:fixed;inset:0;z-index:99998;background:rgba(231,76,60,0.6);animation:redFlash 0.8s ease-out forwards;pointer-events:none;';
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 800);

        // Animate background to dark
        setTimeout(() => {
            overlay.style.transition = 'background 0.8s ease';
            overlay.style.background = 'rgba(0,0,0,0.92)';
        }, 300);

        // Create content with delay
        setTimeout(() => {
            // Play a second dramatic sound effect
            if (window.HawdajAudio) {
                HawdajAudio.SFX.timeUp && HawdajAudio.SFX.timeUp();
            }
            overlay.innerHTML = `
            <div style="text-align:center;max-width:380px;width:90%;">
                <div style="position:relative;width:130px;height:130px;margin:0 auto 20px;">
                    <div style="width:130px;height:130px;border-radius:50%;background:linear-gradient(135deg,#c0392b,#e74c3c);display:flex;align-items:center;justify-content:center;box-shadow:0 0 60px rgba(231,76,60,0.6),0 0 120px rgba(231,76,60,0.3);animation:pulseGlow 2s ease-in-out infinite;">
                        <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Angry%20Face%20with%20Horns.png" style="width:70px;height:70px;filter:drop-shadow(0 4px 12px rgba(0,0,0,0.5));animation:skullBounce 1s ease-out;">
                    </div>
                    <div style="position:absolute;inset:-12px;border-radius:50%;border:3px solid rgba(231,76,60,0.4);animation:ringPulse 2s ease-in-out infinite;"></div>
                    <div style="position:absolute;inset:-24px;border-radius:50%;border:2px solid rgba(231,76,60,0.2);animation:ringPulse 2s ease-in-out 0.5s infinite;"></div>
                </div>

                <h1 style="color:#e74c3c;font-weight:900;font-size:2.2rem;margin-bottom:8px;text-shadow:0 0 30px rgba(231,76,60,0.5);animation:fadeInUp 0.5s ease 0.3s both;letter-spacing:2px;">تم استبعادك!</h1>
                <p style="color:#ff6b6b;font-size:1.3rem;font-weight:900;margin-bottom:6px;animation:fadeInUp 0.5s ease 0.5s both;letter-spacing:4px;text-transform:uppercase;">ELIMINATED</p>
                <div style="width:80px;height:3px;background:linear-gradient(90deg,transparent,#e74c3c,transparent);margin:16px auto;animation:fadeInUp 0.5s ease 0.6s both;"></div>
                <p style="color:rgba(255,255,255,0.7);font-size:1rem;margin-bottom:8px;animation:fadeInUp 0.5s ease 0.7s both;font-weight:600;">لقد أخطأت في الإجابة</p>
                <p style="color:rgba(255,255,255,0.5);font-size:0.85rem;margin-bottom:28px;animation:fadeInUp 0.5s ease 0.8s both;">تم استبعادك من مسابقة <span style="color:#FFD700;font-weight:800;">${compName || 'المسابقة'}</span></p>

                <div style="display:flex;gap:10px;justify-content:center;animation:fadeInUp 0.5s ease 1s both;">
                    <button id="elimination-close-btn" style="padding:14px 36px;border-radius:16px;border:2px solid rgba(231,76,60,0.5);background:linear-gradient(135deg,rgba(231,76,60,0.2),rgba(192,57,43,0.3));color:white;font-weight:900;font-size:1.05rem;cursor:pointer;transition:all 0.3s;font-family:inherit;display:flex;align-items:center;gap:8px;">
                        <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Pensive%20Face.png" style="width:1.3em;height:1.3em;"> حسناً
                    </button>
                </div>

                <div style="margin-top:24px;padding:14px;border-radius:14px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);animation:fadeInUp 0.5s ease 1.2s both;">
                    <p style="color:rgba(255,255,255,0.4);font-size:0.72rem;display:flex;align-items:center;gap:6px;justify-content:center;">
                        <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Light%20Bulb.png" style="width:1.2em;height:1.2em;"> في المسابقة، الخطأ الواحد يعني الاستبعاد. حاول التركيز أكثر في المرات القادمة!
                    </p>
                </div>
            </div>`;

            overlay.querySelector('#elimination-close-btn').addEventListener('click', () => {
                overlay.style.transition = 'opacity 0.5s ease';
                overlay.style.opacity = '0';
                setTimeout(() => overlay.remove(), 500);
                navigate('main-menu');
            });
        }, 800);
    }

    // ── Eliminate student from competition ──
    function eliminateFromCompetition(reason) {
        const data = HawdajData.get();
        const compId = data.player.activeCompetitionId;
        if (!compId) return;
        const comp = data.competitions.find(x => x.id === compId);
        if (!comp) return;
        if (!comp.eliminated) comp.eliminated = [];
        if (!comp.eliminated.includes(data.player.name)) {
            comp.eliminated.push(data.player.name);
        }
        if (!comp.progress) comp.progress = {};
        if (!comp.progress[data.player.name]) comp.progress[data.player.name] = { quizDone: 0, puzzleDone: 0, tasks: [] };
        comp.progress[data.player.name].eliminatedAt = Date.now();
        comp.progress[data.player.name].eliminationReason = reason || 'wrong_answer';
        HawdajData.save(true);
        showEliminationEffect(comp.name);
    }

    // ── Live Progress Modal (for students to see all participants) ──
    function showLiveProgressModal(comp) {
        const old = document.getElementById('live-progress-modal');
        if (old) old.remove();
        const data = HawdajData.get();
        const participants = comp.participants || [];
        const eliminated = comp.eliminated || [];
        const totalTasks = (comp.games || ['quiz']).length + (comp.socialTasks || []).length + (comp.shareTask ? 1 : 0);

        const sortedP = [...participants].sort((a, b) => {
            const pa = comp.progress?.[a] || {};
            const pb = comp.progress?.[b] || {};
            const ta = (pa.tasks || []).length;
            const tb = (pb.tasks || []).length;
            if (tb !== ta) return tb - ta;
            return (pa.lastUpdate || Infinity) - (pb.lastUpdate || Infinity);
        });

        let listHTML = sortedP.map((name, i) => {
            const progress = comp.progress?.[name] || {};
            const tasksDone = (progress.tasks || []).length;
            const isElim = eliminated.includes(name);
            const isMe = name === data.player.name;
            const pct = totalTasks > 0 ? Math.round((tasksDone / totalTasks) * 100) : 0;
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1);

            return `<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:12px;
                background:${isElim ? 'rgba(231,76,60,0.1)' : isMe ? 'rgba(46,204,113,0.1)' : 'rgba(255,255,255,0.05)'};
                border:1px solid ${isElim ? 'rgba(231,76,60,0.3)' : isMe ? 'rgba(46,204,113,0.3)' : 'rgba(255,255,255,0.08)'};
                ${isElim ? 'opacity:0.6;' : ''}">
                <span style="font-size:1.2rem;min-width:28px;text-align:center;">${isElim ? '💀' : medal}</span>
                <div style="flex:1;min-width:0;">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <span style="font-weight:800;color:${isElim ? '#e74c3c' : isMe ? '#2ecc71' : 'var(--text-heading)'};font-size:0.85rem;${isElim ? 'text-decoration:line-through;' : ''}">${name}${isMe ? ' (أنت)' : ''}</span>
                        <span style="font-size:0.7rem;color:${isElim ? '#e74c3c' : 'var(--text-secondary)'};
                            font-weight:700;">${isElim ? 'مستبعد' : pct + '%'}</span>
                    </div>
                    <div style="height:4px;border-radius:4px;background:rgba(255,255,255,0.1);margin-top:4px;overflow:hidden;">
                        <div style="height:100%;width:${isElim ? 100 : pct}%;background:${isElim ? '#e74c3c' : 'linear-gradient(90deg,#FFD700,#F59E0B)'};border-radius:4px;transition:width 0.3s;"></div>
                    </div>
                </div>
            </div>`;
        }).join('');

        const activeCount = participants.length - eliminated.length;

        const modal = document.createElement('div');
        modal.id = 'live-progress-modal';
        modal.style.cssText = 'position:fixed;inset:0;z-index:998;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.7);backdrop-filter:blur(8px);animation:fadeIn 0.3s ease;';
        modal.innerHTML = `<div style="background:var(--card-bg);border-radius:24px;max-width:420px;width:90%;max-height:85vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.5);border:1px solid var(--card-border);">
            <div style="padding:20px 24px 16px;border-bottom:1px solid rgba(255,255,255,0.1);">
                <div style="display:flex;align-items:center;justify-content:space-between;">
                    <div style="display:flex;align-items:center;gap:10px;">
                        <span style="font-size:1.5rem;">📊</span>
                        <div>
                            <h3 style="font-size:1rem;font-weight:900;color:var(--text-heading);margin:0;">المتسابقون لايف 🔴</h3>
                            <p style="font-size:0.7rem;color:var(--text-secondary);margin:0;">${activeCount} نشط · ${eliminated.length} مستبعد · ${participants.length} إجمالي</p>
                        </div>
                    </div>
                    <button id="close-live-progress" style="width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,0.1);border:none;color:var(--text-primary);font-size:1.1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;">✕</button>
                </div>
                <div style="display:flex;gap:8px;margin-top:12px;">
                    <div style="flex:1;text-align:center;padding:8px;border-radius:10px;background:rgba(46,204,113,0.1);border:1px solid rgba(46,204,113,0.3);">
                        <div style="font-size:1.3rem;font-weight:900;color:#2ecc71;">${activeCount}</div>
                        <div style="font-size:0.65rem;color:var(--text-secondary);">🏃 نشط</div>
                    </div>
                    <div style="flex:1;text-align:center;padding:8px;border-radius:10px;background:rgba(231,76,60,0.1);border:1px solid rgba(231,76,60,0.3);">
                        <div style="font-size:1.3rem;font-weight:900;color:#e74c3c;">${eliminated.length}</div>
                        <div style="font-size:0.65rem;color:var(--text-secondary);">💀 مستبعد</div>
                    </div>
                    <div style="flex:1;text-align:center;padding:8px;border-radius:10px;background:rgba(255,215,0,0.1);border:1px solid rgba(255,215,0,0.3);">
                        <div style="font-size:1.3rem;font-weight:900;color:#FFD700;">${participants.length}</div>
                        <div style="font-size:0.65rem;color:var(--text-secondary);">👥 إجمالي</div>
                    </div>
                </div>
            </div>
            <div style="padding:16px 20px;display:flex;flex-direction:column;gap:8px;">
                ${listHTML || '<p style="text-align:center;color:var(--text-secondary);padding:20px;">لا يوجد مشتركين بعد</p>'}
            </div>
        </div>`;

        document.body.appendChild(modal);
        modal.querySelector('#close-live-progress').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    }

    // ── Splash Screen ──
    function createSplashStars() {
        const container = document.getElementById('splash-stars');
        if (!container) return;
        for (let i = 0; i < 30; i++) {
            const star = document.createElement('div');
            star.className = 'splash-star';
            star.style.cssText = `
        left:${Math.random() * 100}%;
        top:${Math.random() * 100}%;
        animation-delay:${Math.random() * 3}s;
        animation-duration:${2 + Math.random() * 3}s;
      `;
            container.appendChild(star);
        }
    }

    function setupSplash() {
        // Track whether we've received the first Firebase data sync.
        // We MUST start false and wait for the event, because localStorage 
        // might have old default questions (length > 0) which would bypass the wait.
        let firebaseReady = false;

        // As soon as Firebase sends its first update, mark as ready
        window.addEventListener('HawdajDataUpdated', () => {
            firebaseReady = true;
            // Remove the loading indicator if present
            const loadingEl = document.getElementById('splash-loading-indicator');
            if (loadingEl) loadingEl.style.display = 'none';
            const playBtn = document.getElementById('splash-play-btn');
            if (playBtn) playBtn.disabled = false;
        }, { once: false });

        document.getElementById('splash-play-btn')?.addEventListener('click', () => {
            // If Firebase hasn't responded yet, show a brief loading state
            if (!firebaseReady) {
                const loadingEl = document.getElementById('splash-loading-indicator');
                if (loadingEl) {
                    loadingEl.style.display = 'block';
                    loadingEl.textContent = '⏳ جاري الاتصال بالخادم...';
                }
                // Try again after 2 seconds
                setTimeout(() => {
                    firebaseReady = true; // fallback: proceed anyway after 2s
                    document.getElementById('splash-play-btn')?.click();
                }, 2000);
                return;
            }

            HawdajAudio.SFX.tap();
            // Play welcome audio at game start for ALL users
            HawdajAudio.playCharacter('azzam', 'welcome');

            const data = HawdajData.get();
            if (!data.player.name) {
                // Show name modal
                document.getElementById('name-modal').classList.add('active');
            } else {
                navigate('main-menu');
                startNotificationPolling();
                // Welcome from characters!
                setTimeout(() => { if (window.HawdajCelebration) HawdajCelebration.show('welcome'); }, 800);
            }
        });
    }

    function refreshNameModalEmojis() {
        const data = HawdajData.get();
        const picker = document.getElementById('emoji-picker');
        if (!picker) return;

        // If developer added custom avatars, replace emojis
        if (data.devSettings && data.devSettings.avatars && Object.keys(data.devSettings.avatars).length > 0) {
            picker.innerHTML = '';
            for (let i = 0; i < 8; i++) {
                if (data.devSettings.avatars[i]) {
                    const btn = document.createElement('button');
                    btn.className = 'emoji-option' + (picker.children.length === 0 ? ' selected' : '');
                    btn.dataset.emoji = 'avatar_' + i;
                    btn.innerHTML = `<img src="${data.devSettings.avatars[i]}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
                    picker.appendChild(btn);
                }
            }
            // Re-apply listeners
            document.querySelectorAll('#emoji-picker .emoji-option').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('#emoji-picker .emoji-option').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    HawdajAudio.SFX.tap();
                });
            });
        }
    }

    // ── Name Modal ──
    function setupNameModal() {
        refreshNameModalEmojis();

        // Emoji picker logic
        document.querySelectorAll('#emoji-picker .emoji-option').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#emoji-picker .emoji-option').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                HawdajAudio.SFX.tap();
            });
        });

        // Save name
        document.getElementById('save-name-btn')?.addEventListener('click', () => {
            const name = document.getElementById('player-name-input')?.value.trim();
            if (!name) {
                showToast('اكتب اسمك أولاً', 'error');
                return;
            }

            const emoji = document.querySelector('#emoji-picker .emoji-option.selected')?.dataset.emoji || '⭐';
            const data = HawdajData.get();
            data.player.name = name;
            data.player.emoji = emoji;
            data.player.registeredAt = Date.now(); // for grace-period check

            // Save referral code if entered
            const referralCode = document.getElementById('referral-code-input')?.value.trim().toUpperCase();
            if (referralCode && !data.player.referralApplied) {
                data.player.referredBy = referralCode;
                data.player.referralApplied = true;
                data.player.totalScore = (data.player.totalScore || 0) + 500;

                if (!data.allUsers) data.allUsers = [];
                const existing = data.allUsers.find(u => u.name === name);
                if (existing) {
                    existing.referredBy = referralCode;
                } else {
                    data.allUsers.push({ name: name, referredBy: referralCode, joinedAt: new Date().toISOString() });
                }
                setTimeout(() => showToast('🎉 اكتسبت 500 نقطة لقبولك دعوة صديق!', 'success'), 1500);
            } else {
                if (!data.allUsers) data.allUsers = [];
                if (!data.allUsers.find(u => u.name === name)) {
                    data.allUsers.push({ name: name, referredBy: null, joinedAt: new Date().toISOString() });
                }
            }

            HawdajData.save(false);
            if (window.HawdajFirebase && window.HawdajFirebase.isReady) {
                const newUserObj = data.allUsers.find(u => u.name === name);
                if (newUserObj) window.HawdajFirebase.appendUserToGlobal(newUserObj);
            }
            HawdajData.updateLeaderboard();

            document.getElementById('name-modal').classList.remove('active');
            HawdajAudio.SFX.victory();
            navigate('main-menu');

            setTimeout(() => {
                HawdajEffects.confetti(window.innerWidth / 2, window.innerHeight / 2);
                showToast(`أهلاً ${emoji} ${name}!`, 'success');
            }, 500);
        });
    }

    function updatePlayerDisplay() {
        const data = HawdajData.get();
        const totalScoreEl = document.getElementById('total-score-val');
        const nameEl = document.getElementById('player-name-display');
        if (totalScoreEl) totalScoreEl.textContent = data.player.totalScore;
        if (nameEl) {
            if (data.player.name) {
                // Show avatar icon (URL) if set
                let avatarHTML = HawdajData.getAvatarHTML(data.player.emoji, 20);
                const avatarUrl = getPlayerAvatarUrl();
                if (avatarUrl) {
                    avatarHTML = `<img src="${avatarUrl}" style="width:22px;height:22px;border-radius:50%;object-fit:cover;display:inline-block;vertical-align:middle;margin-left:4px;">`;
                }
                nameEl.innerHTML = `${avatarHTML} ${data.player.name}`;
            } else {
                nameEl.innerHTML = '';
            }
        }
    }

    // Helper: get the actual URL of the player's avatar
    function getPlayerAvatarUrl() {
        const data = HawdajData.get();
        if (!data.player.avatar || data.player.avatar === 'default') return null;
        // If avatarIcon is set and is a URL, use it
        if (data.player.avatarIcon && (data.player.avatarIcon.startsWith('http') || data.player.avatarIcon.startsWith('data:'))) {
            return data.player.avatarIcon;
        }
        // Try to find avatar in storeItems by ID
        const item = (data.storeItems || []).find(i => i.id === data.player.avatar);
        if (item && item.icon) return item.icon;
        // If avatar itself is a URL
        if (data.player.avatar.startsWith('http') || data.player.avatar.startsWith('data:')) return data.player.avatar;
        return null;
    }

    function renderHomeCompetitions() {
        const data = HawdajData.get();
        const banner = document.getElementById('home-competitions-banner');
        const listContainer = document.getElementById('home-competitions-list');
        if (!banner || !listContainer) return;

        const now = new Date();
        // Fix: treat undefined `active` as true (for backward compat)
        const activeComps = data.competitions.filter(c => {
            const isActive = c.active !== false; // default true
            const notExpired = new Date(c.endDate) > now;
            return isActive && notExpired;
        });

        console.log('[Competitions]', data.competitions.length, 'total,', activeComps.length, 'active');

        if (activeComps.length === 0) {
            banner.style.display = 'none';
            return;
        }

        banner.style.display = 'block';
        listContainer.innerHTML = '';

        activeComps.forEach((c, idx) => {
            const isJoined = c.participants && c.participants.includes(data.player.name);
            const isEliminated = (c.eliminated || []).includes(data.player.name);
            const daysLeft = Math.ceil((new Date(c.endDate) - now) / (1000 * 60 * 60 * 24));
            const pCount = (c.participants || []).length;
            const elimCount = (c.eliminated || []).length;
            const item = document.createElement('div');
            item.className = 'comp-banner-card';
            item.style.cssText = `
                background: ${isEliminated ? 'linear-gradient(135deg, rgba(231,76,60,0.12), rgba(192,57,43,0.18))' : 'linear-gradient(135deg, rgba(255,215,0,0.12), rgba(255,140,0,0.18))'};
                border: 2px solid ${isEliminated ? 'rgba(231,76,60,0.45)' : 'rgba(255,215,0,0.45)'};
                border-radius: 14px;
                padding: 10px 14px;
                display: flex;
                align-items: center;
                gap: 10px;
                box-shadow: 0 4px 16px ${isEliminated ? 'rgba(231,76,60,0.15)' : 'rgba(255,215,0,0.15)'};
                animation: slideUp 0.4s ease-out ${idx * 0.1}s both;
                cursor: pointer;
            `;

            let statusBtn = '';
            if (isEliminated) {
                statusBtn = `<span style="padding:5px 12px;border-radius:20px;font-weight:900;font-size:var(--fs-xs);background:linear-gradient(135deg,#e74c3c,#c0392b);color:white;flex-shrink:0;display:flex;align-items:center;gap:4px;"><img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Angry%20Face%20with%20Horns.png" style="width:1.1em;height:1.1em;"> مستبعد</span>`;
            } else if (isJoined) {
                statusBtn = `<button class="comp-join-btn" data-comp-id="${c.id || idx}" style="padding:7px 16px;border-radius:20px;border:none;font-weight:900;font-size:var(--fs-xs);cursor:pointer;flex-shrink:0;transition:all 0.2s ease;background:linear-gradient(135deg,#2ecc71,#27ae60);color:white;">✓ مشترك</button>`;
            } else {
                statusBtn = `<button class="comp-join-btn" data-comp-id="${c.id || idx}" style="padding:7px 16px;border-radius:20px;border:none;font-weight:900;font-size:var(--fs-xs);cursor:pointer;flex-shrink:0;transition:all 0.2s ease;background:linear-gradient(135deg,#FFD700,#F59E0B);color:#4A2800;animation:heartbeat 2s ease-in-out infinite;">انضم!</button>`;
            }

            item.innerHTML = `
                <div style="font-size:1.6rem; flex-shrink:0;">
                    <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Activities/Trophy.png" class="ui-anim-icon" style="width:1.6em;height:1.6em; animation:pulse 2s ease-in-out infinite;">
                </div>
                <div style="flex:1; min-width:0; overflow:hidden;">
                    <div style="font-weight:900; color:${isEliminated ? '#e74c3c' : '#FFD700'}; font-size:var(--fs-sm); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${c.name}</div>
                    <div style="font-size:var(--fs-xs); color:var(--text-secondary);">
                        🎁 ${c.prize} &nbsp;|&nbsp; ⏰ ${daysLeft} يوم
                    </div>
                </div>
                <div style="display:flex;gap:6px;align-items:center;flex-shrink:0;">
                    <button class="comp-live-btn" data-comp-idx="${idx}" style="width:34px;height:34px;border-radius:50%;border:1px solid rgba(255,215,0,0.3);background:linear-gradient(135deg,rgba(255,215,0,0.15),rgba(255,140,0,0.1));cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s;position:relative;box-shadow:0 2px 8px rgba(255,215,0,0.15);" title="تقدم المتسابقين">
                        <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Bar%20Chart.png" style="width:18px;height:18px;">
                        <span style="position:absolute;top:-5px;right:-5px;background:linear-gradient(135deg,#FFD700,#F59E0B);color:#000;border-radius:50%;width:18px;height:18px;font-size:0.6rem;display:flex;align-items:center;justify-content:center;font-weight:900;box-shadow:0 2px 4px rgba(0,0,0,0.3);">${pCount}</span>
                    </button>
                    ${statusBtn}
                </div>
            `;
            listContainer.appendChild(item);

            // Live progress button
            const liveBtn = item.querySelector('.comp-live-btn');
            liveBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                showLiveProgressModal(c);
            });

            // Join button logic
            const joinBtn = item.querySelector('.comp-join-btn');
            if (joinBtn) {
                joinBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (isEliminated) {
                        showToast('💀 تم استبعادك من هذه المسابقة', 'error');
                        return;
                    }
                    if (isJoined) {
                        showCompTasksModal(c);
                        return;
                    }
                    if (!data.player.name) {
                        showToast('سجل اسمك أولاً!', 'warning');
                        return;
                    }
                    if (!c.participants) c.participants = [];
                    c.participants.push(data.player.name);
                    HawdajData.save(true);
                    HawdajAudio.SFX.correct();
                    HawdajEffects.celebrationBurst();
                    showToast('🎉 تم تسجيلك في المسابقة بنجاح!', 'success');
                    renderHomeCompetitions();
                });
            }
        });
    }

    // ── Competition Tasks Modal (Student) ──
    function showCompTasksModal(compOrId) {
        // Remove any existing modal
        const old = document.getElementById('comp-tasks-modal');
        if (old) old.remove();

        // Always read fresh data
        const data = HawdajData.get();

        // Accept both object and string ID
        let comp;
        if (typeof compOrId === 'string') {
            comp = data.competitions.find(c => c.id === compOrId);
        } else if (compOrId && compOrId.id) {
            // Re-read from data to get latest progress
            comp = data.competitions.find(c => c.id === compOrId.id) || compOrId;
        } else {
            comp = compOrId;
        }
        if (!comp || !comp.name) {
            console.warn('[showCompTasksModal] Invalid comp:', comp);
            return;
        }
        console.log('[showCompTasksModal] Opening for comp:', comp.id, comp.name, 'progress:', JSON.stringify(comp.progress));

        const playerName = data.player.name;

        // Build tasks HTML
        const gameIcons = { quiz: '❓', puzzle: '🧩' };
        // Get player progress for this competition
        const playerProgress = comp.progress?.[playerName] || { quizDone: 0, puzzleDone: 0, tasks: [] };
        const completedTasks = playerProgress.tasks || [];

        const doneBadgeHTML = '<div style="background:linear-gradient(135deg, #2ecc71, #27ae60); color:white; font-weight:900; font-size:0.8rem; padding:6px 14px; border-radius:20px; display:flex; align-items:center; gap:6px; box-shadow:0 4px 10px rgba(46,204,113,0.4); border:1px solid #2ecc71;"><img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Hand%20gestures/Clapping%20Hands.png" style="width:1.4em; height:1.4em;"> اكتملت</div>';

        const gamesHTML = (comp.games || ['quiz']).map(g => {
            const gameScreen = g === 'quiz' ? 'quiz-category' : 'puzzle-select';
            const isGameDone = completedTasks.includes(g);
            const progressCount = g === 'quiz' ? (playerProgress.quizDone || 0) : (playerProgress.puzzleDone || 0);
            const neededCount = g === 'quiz' ? (comp.questionCount || 10) : 1;
            const progressPct = Math.min(100, (progressCount / neededCount) * 100);

            const rowBg = isGameDone ? 'background:linear-gradient(135deg, rgba(46,204,113,0.1), rgba(39,174,96,0.15)); border:2px solid rgba(46,204,113,0.5);' : 'background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.1);';

            return '<div style="padding:10px 14px;border-radius:12px;' + rowBg + ' transition:all 0.3s ease;">' +
                '<div style="display:flex;align-items:center;gap:8px;">' +
                '<span style="font-size:1.4rem;">' + (gameIcons[g] || '🎮') + '</span>' +
                '<div style="flex:1;"><div style="font-weight:700; color:' + (isGameDone ? '#2ecc71' : 'var(--text-heading)') + ';">' + (g === 'quiz' ? 'أجب على ' + neededCount + ' سؤال' : 'أكمل تحدي البازل') + '</div>' +
                '<div style="font-size:0.68rem;color:var(--text-secondary);">التقدم: ' + progressCount + '/' + neededCount + '</div></div>' +
                (isGameDone
                    ? doneBadgeHTML
                    : '<button class="comp-play-btn" data-screen="' + gameScreen + '" data-game="' + g + '" style="padding:6px 16px;border-radius:20px;border:none;background:linear-gradient(135deg,#2ecc71,#27ae60);color:white;font-weight:800;cursor:pointer;font-size:var(--fs-xs); box-shadow:0 4px 10px rgba(46,204,113,0.4);">ابدأ ▶</button>'
                ) + '</div>' +
                '<div style="margin-top:8px;height:6px;border-radius:6px;background:rgba(255,255,255,0.1);overflow:hidden;"><div style="height:100%;width:' + progressPct + '%;background:linear-gradient(90deg,#2ecc71,#27ae60);border-radius:6px;transition:width 0.3s;"></div></div>' +
                '</div>';
        }).join('');

        // Social tasks
        const platformNames = { youtube: '📺 YouTube', tiktok: '🎵 TikTok', twitter: '🐦 Twitter/X', instagram: '📸 Instagram', telegram: '✈️ Telegram', other: '🔗 رابط' };
        const socialHTML = (comp.socialTasks || []).map((t, i) => {
            const completedKey = 'social_' + comp.id + '_' + i;
            const isCompleted = data.player.dailyTasksCompleted?.includes(completedKey);
            const rowBg = isCompleted ? 'background:linear-gradient(135deg, rgba(46,204,113,0.1), rgba(39,174,96,0.15)); border:2px solid rgba(46,204,113,0.5);' : 'background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.1);';

            return '<div style="display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:12px;' + rowBg + ' transition:all 0.3s ease;">' +
                '<span style="font-size:1.2rem;">' + (platformNames[t.platform] || '🔗') + '</span>' +
                '<span style="flex:1;font-weight:600; color:' + (isCompleted ? '#2ecc71' : 'var(--text-heading)') + ';">اشترك في ' + (platformNames[t.platform] || t.platform) + '</span>' +
                (isCompleted
                    ? doneBadgeHTML
                    : '<button class="comp-social-btn" data-url="' + t.url + '" data-key="' + completedKey + '" style="padding:6px 14px;border-radius:20px;border:none;background:linear-gradient(135deg,#3498db,#2980b9);color:white;font-weight:800;cursor:pointer;font-size:var(--fs-xs); box-shadow:0 4px 10px rgba(52,152,219,0.4);">اشترك</button>'
                ) + '</div>';
        }).join('');

        // Share task
        let shareHTML = '';
        if (comp.shareTask) {
            const shareCompleted = data.player.dailyTasksCompleted?.includes('share_' + comp.id);
            // Count referral signups
            const refCode = data.player.referralCodes?.[comp.id] || '';
            const targetCount = comp.shareTask.targetCount || 5;
            const referralCount = (data.allUsers || []).filter(u => u.referredBy === refCode).length;
            const shareComplete = refCode && referralCount >= targetCount;
            const rowBg = shareComplete ? 'background:linear-gradient(135deg, rgba(46,204,113,0.1), rgba(39,174,96,0.15)); border:2px solid rgba(46,204,113,0.5);' : 'background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.1);';

            shareHTML = '<div style="display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:12px;' + rowBg + ' transition:all 0.3s ease;">' +
                '<span style="font-size:1.2rem;">🔗</span>' +
                '<div style="flex:1;"><div style="font-weight:600; color:' + (shareComplete ? '#2ecc71' : 'var(--text-heading)') + ';">شارك اللعبة مع ' + targetCount + ' أصدقاء</div>' +
                (refCode ? '<div style="font-size:0.7rem;color:#FFD700;margin-top:2px;">👥 ' + referralCount + '/' + targetCount + ' سجلوا بالكود</div>' : '') +
                '</div>' +
                (shareComplete
                    ? doneBadgeHTML
                    : '<button class="comp-share-btn" style="padding:6px 14px;border-radius:20px;border:none;background:linear-gradient(135deg,#9b59b6,#8e44ad);color:white;font-weight:800;cursor:pointer;font-size:var(--fs-xs); box-shadow:0 4px 10px rgba(155,89,182,0.4);">شارك 🔗</button>'
                ) + '</div>';
        }

        const daysLeft = Math.ceil((new Date(comp.endDate) - new Date()) / (1000 * 60 * 60 * 24));
        // Compute overall progress bar
        const totalTaskCount = (comp.games || ['quiz']).length + (comp.socialTasks || []).length + (comp.shareTask ? 1 : 0);
        let doneTaskCount = completedTasks.length;
        (comp.socialTasks || []).forEach((t, i) => {
            if (data.player.dailyTasksCompleted?.includes('social_' + comp.id + '_' + i)) doneTaskCount++;
        });
        const pRefCode = data.player.referralCodes?.[comp.id] || '';
        const pRefCount = (data.allUsers || []).filter(u => u.referredBy === pRefCode).length;
        if (comp.shareTask && pRefCode && pRefCount >= (comp.shareTask.targetCount || 5)) doneTaskCount++;
        const progressPct = totalTaskCount > 0 ? Math.round((doneTaskCount / totalTaskCount) * 100) : 0;
        const progressBarHTML = '<div style="margin-bottom:12px;"><div style="display:flex;justify-content:space-between;font-size:0.72rem;color:var(--text-secondary);margin-bottom:4px;"><span>التقدم الكلي</span><span>' + doneTaskCount + '/' + totalTaskCount + ' مهام</span></div>' +
            '<div style="height:8px;border-radius:8px;background:rgba(255,255,255,0.1);overflow:hidden;"><div style="height:100%;width:' + progressPct + '%;background:linear-gradient(90deg,#FFD700,#F59E0B);border-radius:8px;transition:width 0.3s;"></div></div></div>';

        let completedBannerHTML = '';
        if (totalTaskCount > 0 && doneTaskCount === totalTaskCount) {
            completedBannerHTML = '<div style="background:linear-gradient(135deg, #2ecc71, #27ae60); padding:20px; border-radius:16px; margin-bottom:15px; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; color:white; box-shadow:0 8px 24px rgba(46,204,113,0.4); min-height:130px; border:2px solid #2ecc71;">' +
                '<div style="font-size:3.5rem; margin-bottom:10px; animation:bounce 2s infinite;">🎉</div>' +
                '<h3 style="margin:0 0 8px 0; font-size:1.2rem; font-weight:900;">مبروك! لقد أكملت جميع المهام</h3>' +
                '<p style="margin:0; font-size:0.85rem; opacity:0.9;">انتظر إعلان النتيجة.. بالتوفيق!</p>' +
                '<div style="margin-top:12px; font-weight:bold; background:rgba(0,0,0,0.2); padding:6px 16px; border-radius:20px; font-size:0.8rem;">تاريخ انتهاء المسابقة: ' + new Date(comp.endDate).toLocaleDateString("ar-SA") + '</div>' +
                '</div>';

            setTimeout(() => {
                if (window.HawdajEffects) HawdajEffects.celebrationBurst();
                if (window.HawdajAudio && window.HawdajAudio.SFX) HawdajAudio.SFX.victory();
            }, 500);
        }


        const modal = document.createElement('div');
        modal.id = 'comp-tasks-modal';
        modal.style.cssText = 'position:fixed;inset:0;z-index:999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.7);backdrop-filter:blur(8px);animation:fadeIn 0.3s ease;';
        modal.innerHTML = '<div style="background:var(--card-bg);border-radius:24px;max-width:420px;width:90%;max-height:85vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.5);border:1px solid var(--card-border);">' +
            '<div style="padding:20px 24px 16px;border-bottom:1px solid rgba(255,255,255,0.1);display:flex;align-items:center;gap:12px;position:relative;">' +
            '<div style="font-size:2rem;">🏆</div>' +
            '<div><h3 style="font-size:1.1rem;font-weight:900;color:var(--text-heading);margin:0;">' + comp.name + '</h3>' +
            '<p style="font-size:0.75rem;color:var(--text-secondary);margin:0;">🎁 ' + comp.prize + ' — ⏰ ' + daysLeft + ' يوم متبقي</p></div>' +
            '<button id="close-comp-tasks" style="position:absolute;left:16px;top:16px;width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,0.1);border:none;color:var(--text-primary);font-size:1.1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;">✕</button>' +
            '</div>' +
            '<div style="padding:20px 24px;display:flex;flex-direction:column;gap:10px;">' +
            completedBannerHTML +
            '<h4 style="color:var(--text-heading);font-weight:800;font-size:0.9rem;margin:0 0 8px 0;">📋 المهام المطلوبة</h4>' +
            progressBarHTML +

            gamesHTML + socialHTML + shareHTML +
            '</div></div>';

        document.body.appendChild(modal);

        // Close button
        modal.querySelector('#close-comp-tasks').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

        // Play game buttons
        modal.querySelectorAll('.comp-play-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const screen = btn.dataset.screen;
                const gameName = btn.dataset.game;

                const data = HawdajData.get();
                data.player.activeCompetitionId = comp.id;
                HawdajData.save(true);

                modal.remove();
                if (gameName === 'puzzle') {
                    const mode = comp.puzzleLevel === 'hard' ? 'slide' : 'swap';
                    if (window.PuzzleGame && PuzzleGame.startSequentialPlay) {
                        PuzzleGame.startSequentialPlay(mode);
                    } else {
                        navigate(screen);
                    }
                } else if (gameName === 'quiz' && comp.qSource === 'custom' && comp.customQuestions && comp.customQuestions.length > 0) {
                    if (window.QuizGame && QuizGame.startCustomQuiz) {
                        QuizGame.startCustomQuiz(comp.customQuestions);
                    } else {
                        navigate(screen);
                    }
                } else {
                    navigate(screen);
                }
            });
        });


        // Social task buttons - with verification code
        modal.querySelectorAll('.comp-social-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                // Generate a random verification code
                const code = 'H' + Math.random().toString(36).substring(2, 6).toUpperCase();

                // Open the URL
                window.open(btn.dataset.url, '_blank');

                // Show verification dialog after short delay
                setTimeout(() => {
                    const verifyDiv = document.createElement('div');
                    verifyDiv.style.cssText = 'position:fixed;inset:0;z-index:1100;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.8);backdrop-filter:blur(8px);animation:fadeIn 0.2s ease;';
                    verifyDiv.innerHTML = '<div style="background:var(--card-bg,#1a1a2e);border-radius:24px;max-width:380px;width:90%;padding:28px;text-align:center;border:1px solid rgba(255,255,255,0.1);box-shadow:0 20px 60px rgba(0,0,0,0.5);">' +
                        '<div style="font-size:2.5rem;margin-bottom:12px;">🔐</div>' +
                        '<h3 style="color:var(--text-heading);font-weight:900;margin-bottom:8px;">تأكيد الاشتراك</h3>' +
                        '<p style="color:var(--text-secondary);font-size:0.8rem;margin-bottom:16px;">بعد الاشتراك في القناة، أدخل الكود التالي للتأكيد:</p>' +
                        '<div style="background:rgba(255,215,0,0.1);border:2px dashed rgba(255,215,0,0.5);border-radius:12px;padding:12px;margin-bottom:16px;"><span style="font-size:1.5rem;font-weight:900;color:#FFD700;letter-spacing:4px;">' + code + '</span></div>' +
                        '<input type="text" id="verify-code-input" placeholder="أدخل الكود هنا" style="width:100%;padding:12px;border-radius:12px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.08);color:var(--text-primary);font-size:1rem;text-align:center;font-family:inherit;letter-spacing:3px;margin-bottom:12px;outline:none;">' +
                        '<div style="display:flex;gap:8px;"><button id="verify-cancel" style="flex:1;padding:10px;border-radius:12px;border:1px solid rgba(255,255,255,0.15);background:transparent;color:var(--text-secondary);cursor:pointer;font-family:inherit;font-weight:700;">إلغاء</button>' +
                        '<button id="verify-confirm" style="flex:1;padding:10px;border-radius:12px;border:none;background:linear-gradient(135deg,#2ecc71,#27ae60);color:white;cursor:pointer;font-family:inherit;font-weight:900;">تأكيد ✓</button></div>' +
                        '</div>';

                    document.body.appendChild(verifyDiv);

                    verifyDiv.querySelector('#verify-cancel').addEventListener('click', () => verifyDiv.remove());
                    verifyDiv.querySelector('#verify-confirm').addEventListener('click', () => {
                        const input = verifyDiv.querySelector('#verify-code-input').value.trim().toUpperCase();
                        if (input === code) {
                            if (!data.player.dailyTasksCompleted) data.player.dailyTasksCompleted = [];
                            data.player.dailyTasksCompleted.push(btn.dataset.key);
                            if (!comp.progress) comp.progress = {};
                            if (!comp.progress[data.player.name]) comp.progress[data.player.name] = { tasks: [] };
                            comp.progress[data.player.name].lastUpdate = Date.now();
                            HawdajData.save(true);
                            verifyDiv.remove();
                            modal.remove();
                            let platIdx = parseInt(btn.dataset.key.split('_').pop());
                            let platName = comp.socialTasks[platIdx] ? platformNames[comp.socialTasks[platIdx].platform] : null;
                            showTaskCompletedPopup('متابعة ' + (platName || 'الحساب'));
                            showCompTasksModal(comp);
                        } else {
                            showToast('❌ الكود غير صحيح، تأكد من الاشتراك وحاول مرة أخرى', 'error');
                        }
                    });

                    verifyDiv.querySelector('#verify-code-input').focus();
                }, 3000);
            });
        });

        // Share button - Referral code system
        const shareBtn = modal.querySelector('.comp-share-btn');
        if (shareBtn && comp.shareTask) {
            shareBtn.addEventListener('click', () => {
                // Generate or retrieve referral code for this player+competition
                if (!data.player.referralCodes) data.player.referralCodes = {};
                if (!data.player.referralCodes[comp.id]) {
                    data.player.referralCodes[comp.id] = 'HWD' + Math.random().toString(36).substring(2, 6).toUpperCase();
                    HawdajData.save(true);
                }
                const refCode = data.player.referralCodes[comp.id];
                const shareUrl = (comp.shareTask.url || window.location.href);
                const targetCount = comp.shareTask.targetCount || 5;

                // Count how many friends registered with this code
                const registeredCount = (data.allUsers || []).filter(u => u.referredBy === refCode).length;

                // Show referral modal
                const refModal = document.createElement('div');
                refModal.style.cssText = 'position:fixed;inset:0;z-index:1100;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.8);backdrop-filter:blur(8px);animation:fadeIn 0.2s ease;';
                refModal.innerHTML = '<div style="background:var(--card-bg,#1a1a2e);border-radius:24px;max-width:400px;width:92%;padding:28px;text-align:center;border:1px solid rgba(255,255,255,0.1);box-shadow:0 20px 60px rgba(0,0,0,0.5);">' +
                    '<div style="font-size:2.5rem;margin-bottom:8px;">🔗</div>' +
                    '<h3 style="color:var(--text-heading);font-weight:900;margin-bottom:6px;">شارك اللعبة مع أصدقائك!</h3>' +
                    '<p style="color:var(--text-secondary);font-size:0.8rem;margin-bottom:16px;">أرسل الرابط وكود الدعوة لأصدقائك. لما يسجلوا بالكود، هتاخد نقاط! 🎁</p>' +
                    '<div style="background:rgba(255,215,0,0.1);border:2px dashed rgba(255,215,0,0.5);border-radius:16px;padding:16px;margin-bottom:12px;">' +
                    '<div style="font-size:0.7rem;color:var(--text-secondary);margin-bottom:4px;">كود الدعوة الخاص بك:</div>' +
                    '<div style="font-size:1.8rem;font-weight:900;color:#FFD700;letter-spacing:5px;">' + refCode + '</div>' +
                    '</div>' +
                    '<div style="background:rgba(255,255,255,0.06);border-radius:12px;padding:12px;margin-bottom:16px;text-align:right;">' +
                    '<div style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:6px;">📋 الخطوات:</div>' +
                    '<div style="font-size:0.72rem;color:var(--text-primary);line-height:1.8;">1️⃣ شارك رابط اللعبة مع أصدقائك<br>2️⃣ أرسل لهم كود الدعوة: <b style=\"color:#FFD700\">' + refCode + '</b><br>3️⃣ صديقك يدخل الكود عند التسجيل<br>4️⃣ كل ما صديق يسجل بالكود، هتاخد نقاط! 🌟</div>' +
                    '</div>' +
                    '<div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:16px;padding:10px;background:rgba(46,204,113,0.1);border-radius:12px;border:1px solid rgba(46,204,113,0.3);">' +
                    '<span style="font-size:1.2rem;">👥</span>' +
                    '<span style="font-weight:800;color:#2ecc71;">' + registeredCount + ' / ' + targetCount + '</span>' +
                    '<span style="font-size:0.75rem;color:var(--text-secondary);">أصدقاء سجلوا</span>' +
                    '</div>' +
                    '<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;">' +
                    '<button class="ref-platform-btn" data-platform="whatsapp" style="padding:10px 16px;border-radius:14px;border:none;background:#25D366;color:white;font-weight:800;cursor:pointer;font-family:inherit;font-size:0.78rem;display:flex;align-items:center;gap:4px;">📱 واتساب</button>' +
                    '<button class="ref-platform-btn" data-platform="telegram" style="padding:10px 16px;border-radius:14px;border:none;background:#0088cc;color:white;font-weight:800;cursor:pointer;font-family:inherit;font-size:0.78rem;display:flex;align-items:center;gap:4px;">✈️ تليجرام</button>' +
                    '<button class="ref-platform-btn" data-platform="twitter" style="padding:10px 16px;border-radius:14px;border:none;background:#1DA1F2;color:white;font-weight:800;cursor:pointer;font-family:inherit;font-size:0.78rem;display:flex;align-items:center;gap:4px;">🐦 تويتر</button>' +
                    '<button id="ref-copy-link" style="padding:10px 16px;border-radius:14px;border:none;background:linear-gradient(135deg,#8e44ad,#9b59b6);color:white;font-weight:800;cursor:pointer;font-family:inherit;font-size:0.78rem;display:flex;align-items:center;gap:4px;">📋 نسخ</button>' +
                    '</div>' +
                    '<button id="ref-close" style="margin-top:12px;padding:8px;background:transparent;border:none;color:var(--text-secondary);cursor:pointer;font-family:inherit;font-size:0.8rem;">إغلاق</button>' +
                    '</div>';

                document.body.appendChild(refModal);

                refModal.querySelector('#ref-close').addEventListener('click', () => refModal.remove());

                const shareText = encodeURIComponent('🎮 العب معي في هودج! 🏆\nاستخدم كود الدعوة: ' + refCode + '\n' + shareUrl);
                const shareTextRaw = '🎮 العب معي في هودج! 🏆\nاستخدم كود الدعوة: ' + refCode + '\n' + shareUrl;

                refModal.querySelectorAll('.ref-platform-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const platform = btn.dataset.platform;
                        let url = '';
                        if (platform === 'whatsapp') {
                            url = 'https://api.whatsapp.com/send?text=' + shareText;
                        } else if (platform === 'telegram') {
                            url = 'https://t.me/share/url?url=' + encodeURIComponent(shareUrl) + '&text=' + encodeURIComponent('🎮 العب معي في هودج! كود الدعوة: ' + refCode);
                        } else if (platform === 'twitter') {
                            url = 'https://twitter.com/intent/tweet?text=' + shareText;
                        }
                        if (url) window.open(url, '_blank');
                        showToast('✓ تم فتح المشاركة!', 'success');
                    });
                });

                refModal.querySelector('#ref-copy-link').addEventListener('click', () => {
                    navigator.clipboard.writeText(shareTextRaw).then(() => {
                        showToast('✓ تم نسخ الرابط والكود!', 'success');
                    }).catch(() => {
                        // Fallback for older browsers
                        const ta = document.createElement('textarea');
                        ta.value = shareTextRaw;
                        document.body.appendChild(ta);
                        ta.select();
                        document.execCommand('copy');
                        ta.remove();
                        showToast('✓ تم نسخ الرابط والكود!', 'success');
                    });
                });
            });
        }
    }

    // ── Notification System ──
    let lastUnreadStudent = 0;
    let lastUnreadAdmin = 0;

    function startNotificationPolling() {
        setInterval(() => { checkChatNotifications(); }, 5000);
        checkChatNotifications();
    }

    function checkChatNotifications() {
        if (!window.HawdajChat) return;
        const data = HawdajData.get();
        const playerName = data?.player?.name;

        // Student Notifs
        if (playerName) {
            const unread = HawdajChat.getTotalUnreadForStudent(playerName);
            const badge = document.getElementById('student-notif-badge');
            const studentNotifBtn = document.getElementById('btn-student-notif');

            if (badge && studentNotifBtn) {
                // Always show the student chat button
                studentNotifBtn.style.display = 'flex';
                if (unread > 0) {
                    badge.textContent = unread;
                    badge.style.display = 'flex';
                    if (unread > lastUnreadStudent) {
                        HawdajAudio.SFX.correct(); // Play sound
                        showToast('💬 لديك رسالة جديدة من المشرف!', 'info');
                    }
                } else {
                    badge.style.display = 'none';
                }
            }
            lastUnreadStudent = unread;
        }

        // Admin Notifs
        const unreadAdmin = HawdajChat.getAllAdminUnreadCount();
        const adminBadge = document.getElementById('admin-notif-badge');
        const adminNotifBtn = document.getElementById('admin-notif-btn');

        if (adminBadge && adminNotifBtn) {
            // Always show the admin chat button
            adminNotifBtn.style.display = 'flex';
            if (unreadAdmin > 0) {
                adminBadge.textContent = unreadAdmin;
                adminBadge.style.display = 'flex';
                if (unreadAdmin > lastUnreadAdmin) {
                    HawdajAudio.SFX.correct(); // Play sound
                    showToast('💬 هناك رسالة جديدة للمشرف!', 'info');
                }
            } else {
                adminBadge.style.display = 'none';
            }
        }
        lastUnreadAdmin = unreadAdmin;
    }


    // ── Track Competition Game Progress ──
    function trackCompetitionGameCompletion(gameType) {
        const data = HawdajData.get();
        const playerName = data.player.name;
        if (!playerName) {
            return;
        }

        const activeId = data.player.activeCompetitionId;
        console.log('[CompTrack]', gameType, 'activeCompId:', activeId, 'player:', playerName);

        if (!activeId) {
            HawdajData.save(true);
            return;
        }

        const comp = data.competitions.find(c => c.id === activeId);
        if (!comp) {
            HawdajData.save(true);
            return;
        }

        if (!comp.participants || !comp.participants.includes(playerName)) {
            HawdajData.save(true);
            return;
        }

        if (comp.active === false || new Date(comp.endDate) < new Date()) {
            HawdajData.save(true);
            return;
        }

        const games = comp.games || ['quiz'];
        if (!games.includes(gameType)) {
            HawdajData.save(true);
            return;
        }

        // Track completion
        if (!comp.progress) comp.progress = {};
        if (!comp.progress[playerName]) comp.progress[playerName] = { quizDone: 0, puzzleDone: 0, tasks: [] };
        if (!comp.progress[playerName].tasks) comp.progress[playerName].tasks = [];

        if (gameType === 'quiz') {
            const needed = comp.questionCount || 10;
            comp.progress[playerName].quizDone = needed;
            if (!comp.progress[playerName].tasks.includes('quiz')) {
                comp.progress[playerName].tasks.push('quiz');
                showTaskCompletedPopup('الأسئلة');
            }
        } else if (gameType === 'puzzle') {
            comp.progress[playerName].puzzleDone = 1;
            if (!comp.progress[playerName].tasks.includes('puzzle')) {
                comp.progress[playerName].tasks.push('puzzle');
                showTaskCompletedPopup('تحدي البازل');
            }
        }
        comp.progress[playerName].lastUpdate = Date.now();

        // Update score 
        if (!comp.scores) comp.scores = {};
        comp.scores[playerName] = (comp.progress[playerName].tasks.length * 100) +
            (comp.progress[playerName].quizDone || 0) * 10 +
            (comp.progress[playerName].puzzleDone || 0) * 15;

        console.log('[CompTrack] SUCCESS! comp:', comp.id, 'tasks:', comp.progress[playerName].tasks, 'score:', comp.scores[playerName]);

        // Auto-show celebration if all tasks completed now
        const totalTaskCount = (comp.games || ['quiz']).length + (comp.socialTasks || []).length + (comp.shareTask ? 1 : 0);
        let doneTaskCount = comp.progress[playerName].tasks.length;
        (comp.socialTasks || []).forEach((t, i) => {
            if (data.player.dailyTasksCompleted?.includes('social_' + comp.id + '_' + i)) doneTaskCount++;
        });
        const pRefCode = data.player.referralCodes?.[comp.id] || '';
        const pRefCount = (data.allUsers || []).filter(u => u.referredBy === pRefCode).length;
        if (comp.shareTask && pRefCode && pRefCount >= (comp.shareTask.targetCount || 5)) doneTaskCount++;

        if (totalTaskCount > 0 && doneTaskCount === totalTaskCount && !comp.progress[playerName].allCompletedAnnounced) {
            comp.progress[playerName].allCompletedAnnounced = true;
            setTimeout(() => { showCompTasksModal(comp.id); }, 2500);
        }

        HawdajData.save(true);
    }

    // ── Main Menu ──
    function setupMainMenu() {
        // Game cards
        document.querySelectorAll('.menu-game-card').forEach(card => {
            card.addEventListener('click', () => {
                const game = card.dataset.game;
                HawdajAudio.SFX.tap();

                const rect = card.getBoundingClientRect();
                HawdajEffects.sparkle(rect.left + rect.width / 2, rect.top + rect.height / 2, 8);

                const proceed = () => {
                    switch (game) {
                        case 'quiz': navigate('quiz-category'); break;
                        case 'puzzle': navigate('puzzle-select'); break;
                        case 'map': navigate('map-game'); break;
                    }
                };

                let playedBefore = sessionStorage.getItem(`dialogue_${game}`);
                if (!playedBefore && window.HawdajDialogue) {
                    sessionStorage.setItem(`dialogue_${game}`, 'true');
                    let sequence = [];
                    const data = HawdajData.get();
                    let audio = data?.devSettings?.audio;

                    if (game === 'quiz') {
                        sequence.push({ character: 'azzam', pose: 'happy', text: 'أهلاً بك في تحديات الأسئلة! هل أنت مستعد؟', audio: audio ? audio['azzam_welcome'] : null });
                        sequence.push({ character: 'jadel', pose: 'happy', text: 'هيا نختبر معلوماتك الممتعة يا بطل!', audio: audio ? audio['jadel_welcome'] : null });
                    } else if (game === 'puzzle') {
                        sequence.push({ character: 'jadel', pose: 'thinking', text: 'أمامنا بازل رائع لمعالم المملكة، دعنا نجمعها!', audio: audio ? audio['jadel_welcome'] : null });
                        sequence.push({ character: 'azzam', pose: 'idle', text: 'جاهز للتحدي؟ انطلق!', audio: audio ? audio['azzam_cheer'] : null });
                    } else if (game === 'map') {
                        sequence.push({ character: 'azzam', pose: 'happy', text: 'رحلة رائعة ومشوقة حول مناطق السعودية بانتظارنا!', audio: audio ? audio['azzam_welcome'] : null });
                    }

                    if (sequence.length > 0) {
                        return HawdajDialogue.play(sequence, proceed);
                    }
                }

                proceed();
            });
        });

        // Bottom buttons
        document.getElementById('btn-leaderboard')?.addEventListener('click', () => {
            HawdajAudio.SFX.tap();
            navigate('leaderboard');
        });

        document.getElementById('btn-store')?.addEventListener('click', () => {
            HawdajAudio.SFX.tap();
            navigate('store-screen');
            renderStore();
        });

        document.getElementById('btn-daily')?.addEventListener('click', () => {
            HawdajAudio.SFX.tap();
            navigate('daily-tasks');
        });

        // Admin gear
        document.getElementById('btn-admin')?.addEventListener('click', () => {
            HawdajAudio.SFX.tap();
            navigate('admin-login');
        });

        // Music toggle — wire GLOBAL button (fixed, always visible)
        function applyMusicState(isMuted) {
            const btns = [
                document.getElementById('btn-music-toggle'),
                document.getElementById('btn-music-toggle-global')
            ];
            const icon = document.getElementById('music-toggle-icon');
            btns.forEach(btn => {
                if (!btn) return;
                if (isMuted) {
                    btn.classList.add('muted');
                    const lbl = btn.querySelector('.music-label');
                    if (lbl) lbl.textContent = '';
                } else {
                    btn.classList.remove('muted');
                    const lbl = btn.querySelector('.music-label');
                    if (lbl) lbl.textContent = '🎵';
                }
            });
            if (icon) icon.src = isMuted
                ? 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Muted%20Speaker.png'
                : 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Speaker%20High%20Volume.png';
        }
        ['btn-music-toggle', 'btn-music-toggle-global'].forEach(id => {
            document.getElementById(id)?.addEventListener('click', () => {
                HawdajAudio.SFX.tap();
                const isMuted = HawdajAudio.toggleMusic();
                applyMusicState(isMuted);
            });
        });

        // ── User Settings Modal ──
        function openUserSettings() {
            const data = HawdajData.get();
            const modal = document.getElementById('user-settings-modal');
            if (!modal) return;

            // Populate name
            const nameInput = document.getElementById('settings-name-input');
            if (nameInput) nameInput.value = data.player.name || '';
            const nameBadge = document.getElementById('settings-player-name-badge');
            if (nameBadge) nameBadge.textContent = data.player.name || 'اللاعب';

            // Populate avatar display
            const avatarImg = document.getElementById('settings-avatar-img');
            if (avatarImg) {
                const avUrl = getPlayerAvatarUrl();
                if (avUrl) {
                    avatarImg.src = avUrl;
                } else {
                    avatarImg.src = 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Star-Struck.png';
                }
            }

            // Populate avatar grid from purchased store items
            const grid = document.getElementById('settings-avatar-grid');
            if (grid) {
                const owned = data.player.inventory || [];
                const storeItems = data.storeItems || [];
                const avatarItems = owned.filter(id => {
                    const item = storeItems.find(i => i.id === id);
                    return item && item.type === 'avatar';
                });
                grid.innerHTML = '';

                // Default option
                const defaultBtn = document.createElement('button');
                defaultBtn.style.cssText = `width:100%;aspect-ratio:1;border-radius:50%;border:2px solid ${(!data.player.avatar || data.player.avatar === 'default') ? '#FFD700' : 'rgba(255,215,0,0.3)'};background:rgba(255,255,255,0.08);cursor:pointer;overflow:hidden;padding:4px;transition:all 0.2s;`;
                defaultBtn.innerHTML = HawdajData.getAvatarHTML(data.player.emoji, '100%');
                defaultBtn.onclick = () => {
                    grid.querySelectorAll('button').forEach(b => b.style.borderColor = 'rgba(255,215,0,0.3)');
                    defaultBtn.style.borderColor = '#FFD700';
                    const avUrl = HawdajData.getAvatarHTML(data.player.emoji, 30).match(/src="([^"]+)"/)?.[1] || 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Star-Struck.png';
                    if (avatarImg) avatarImg.src = avUrl;
                    const d2 = HawdajData.get();
                    d2.player.avatar = 'default';
                    d2.player.avatarIcon = null;
                    HawdajData.save();
                    updatePlayerDisplay(); // Update main UI immediately
                };
                grid.appendChild(defaultBtn);

                if (avatarItems.length > 0) {
                    avatarItems.forEach(id => {
                        const item = storeItems.find(i => i.id === id);
                        if (!item || !item.icon) return;
                        const btn = document.createElement('button');
                        btn.style.cssText = `width:100%;aspect-ratio:1;border-radius:50%;border:2px solid ${(data.player.avatar === item.id) ? '#FFD700' : 'rgba(255,215,0,0.3)'};background:rgba(255,255,255,0.08);cursor:pointer;overflow:hidden;padding:2px;transition:all 0.2s;`;
                        btn.innerHTML = `<img src="${item.icon}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
                        btn.onclick = () => {
                            grid.querySelectorAll('button').forEach(b => b.style.borderColor = 'rgba(255,215,0,0.3)');
                            btn.style.borderColor = '#FFD700';
                            if (avatarImg) avatarImg.src = item.icon;
                            const d2 = HawdajData.get();
                            d2.player.avatar = item.id;
                            d2.player.avatarIcon = item.icon;
                            HawdajData.save();
                            updatePlayerDisplay(); // Update main UI immediately
                        };
                        grid.appendChild(btn);
                    });
                } else {
                    const hint = document.createElement('div');
                    hint.style.cssText = 'text-align:center;color:var(--text-secondary);font-size:0.8rem;grid-column:1/-1;padding:10px;';
                    hint.textContent = '🛍️ اشترِ شخصيات من المتجر لتظهر هنا!';
                    grid.appendChild(hint);
                }
            }

            // Volume slider sync
            const slider = document.getElementById('settings-volume-slider');
            const volVal = document.getElementById('settings-volume-val');
            const muteBtn = document.getElementById('settings-mute-btn');
            const muteIcon = document.getElementById('settings-mute-icon');
            const isMuted = HawdajAudio.isMusicMuted ?? (HawdajAudio.isMuted?.() || false);

            const updateMuteIcon = (muted) => {
                if (!muteIcon) return;
                muteIcon.src = muted
                    ? 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Muted%20Speaker.png'
                    : 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Speaker%20High%20Volume.png';
                if (muteBtn) muteBtn.style.background = muted ? 'linear-gradient(145deg,#8a7060,#6b5040)' : 'linear-gradient(145deg,#f5c842,#e8a020)';
            };
            updateMuteIcon(isMuted);

            if (slider && volVal) {
                const vol = data.settings?.volume ?? 80;
                slider.value = vol;
                volVal.textContent = vol + '%';
                // Remove old listeners by cloning
                const newSlider = slider.cloneNode(true);
                slider.parentNode.replaceChild(newSlider, slider);
                newSlider.addEventListener('input', () => {
                    volVal.textContent = newSlider.value + '%';
                    const d2 = HawdajData.get();
                    if (!d2.settings) d2.settings = {};
                    d2.settings.volume = parseInt(newSlider.value);
                    HawdajData.save();
                });
            }

            if (muteBtn) {
                const newMuteBtn = muteBtn.cloneNode(true);
                const newMuteIcon = newMuteBtn.querySelector('#settings-mute-icon');
                muteBtn.parentNode.replaceChild(newMuteBtn, muteBtn);
                updateMuteIcon(isMuted);
                newMuteBtn.onclick = () => {
                    HawdajAudio.SFX.tap();
                    const nowMuted = HawdajAudio.toggleMusic();
                    if (newMuteIcon) newMuteIcon.src = nowMuted
                        ? 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Muted%20Speaker.png'
                        : 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Speaker%20High%20Volume.png';
                    newMuteBtn.style.background = nowMuted ? 'linear-gradient(145deg,#8a7060,#6b5040)' : 'linear-gradient(145deg,#f5c842,#e8a020)';
                    applyMusicState(nowMuted);
                };
            }

            modal.classList.add('active');
        }

        // Student Chat Notifs
        const studentNotifBtn = document.getElementById('btn-student-notif');
        if (studentNotifBtn) {
            studentNotifBtn.addEventListener('click', () => {
                HawdajAudio.SFX.tap();
                if (window.HawdajChat) HawdajChat.openStudentNotifications();
            });
        }

        document.getElementById('btn-user-settings')?.addEventListener('click', () => {
            HawdajAudio.SFX.tap();
            openUserSettings();
        });

        document.getElementById('close-user-settings')?.addEventListener('click', () => {
            HawdajAudio.SFX.tap();
            document.getElementById('user-settings-modal')?.classList.remove('active');
        });

        document.getElementById('user-settings-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'user-settings-modal') {
                e.target.classList.remove('active');
            }
        });

        document.getElementById('settings-save-name')?.addEventListener('click', () => {
            const input = document.getElementById('settings-name-input');
            const newName = input?.value.trim();
            if (!newName) { showToast('أدخل اسمك أولاً!', 'error'); return; }
            const data = HawdajData.get();
            data.player.name = newName;
            // Handle referral code
            const refCodeInput = document.getElementById('referral-code-input');
            if (refCodeInput && refCodeInput.value.trim() && !data.player.referralApplied) {
                const enteredCode = refCodeInput.value.trim().toUpperCase();
                data.player.referredBy = enteredCode;
                data.player.referralApplied = true;
                data.player.totalScore = (data.player.totalScore || 0) + 500; // Reward points

                if (!data.allUsers) data.allUsers = [];
                const existing = data.allUsers.find(u => u.name === newName);
                if (existing) { existing.referredBy = enteredCode; }
                else { data.allUsers.push({ name: newName, referredBy: enteredCode, joinedAt: new Date().toISOString() }); }
                refCodeInput.value = '';
                showToast('🎉 اكتسبت 500 نقطة لقبولك دعوة صديق!', 'success');
            } else {
                if (!data.allUsers) data.allUsers = [];
                if (!data.allUsers.find(u => u.name === newName)) {
                    data.allUsers.push({ name: newName, referredBy: null, joinedAt: new Date().toISOString() });
                }
            }
            HawdajData.save(true);
            const badge = document.getElementById('settings-player-name-badge');
            if (badge) badge.textContent = newName;
            updatePlayerDisplay();
            HawdajAudio.SFX.correct();
            showToast('✅ تم حفظ الاسم!', 'success');
        });

    }

    // ── Quiz Category ──
    function setupQuizCategory() {
        // General quiz
        document.querySelector('[data-cat="general"]')?.addEventListener('click', () => {
            HawdajAudio.SFX.tap();
            QuizGame.startGame('general');
        });

        // Episode quiz - show episodes list
        document.querySelector('[data-cat="episodes"]')?.addEventListener('click', () => {
            HawdajAudio.SFX.tap();
            document.getElementById('quiz-cat-list').classList.add('hidden');
            document.getElementById('episodes-list').classList.remove('hidden');
            renderEpisodesList();
        });

        // Back to categories
        document.getElementById('back-to-cats')?.addEventListener('click', () => {
            HawdajAudio.SFX.tap();
            document.getElementById('quiz-cat-list').classList.remove('hidden');
            document.getElementById('episodes-list').classList.add('hidden');
        });
    }

    function renderEpisodesList() {
        const chapters = {
            1: { container: 'ch1-episodes', episodes: [1, 2, 3, 4, 5] },
            2: { container: 'ch2-episodes', episodes: [6, 7, 8, 9, 10] },
            3: { container: 'ch3-episodes', episodes: [11, 12, 13, 14, 15] },
            4: { container: 'ch4-episodes', episodes: [16, 17, 18, 19, 20] }
        };

        const data = HawdajData.get();
        Object.values(chapters).forEach(ch => {
            const grid = document.getElementById(ch.container);
            if (!grid) return;
            grid.innerHTML = '';
            ch.episodes.forEach(ep => {
                const card = document.createElement('button');
                card.className = 'episode-card';
                const qCount = (data.quizEpisodes[ep] || []).length;
                card.innerHTML = `
          <span class="ep-num">${ep}</span>
          <span class="ep-name">${HawdajData.EPISODE_NAMES[ep]}</span>
          <span class="ep-count">${qCount} أسئلة</span>
        `;
                card.addEventListener('click', () => {
                    HawdajAudio.SFX.tap();
                    if (qCount === 0) {
                        showToast('لا توجد أسئلة لهذه الحلقة بعد', 'info');
                        return;
                    }
                    QuizGame.startGame('episode', ep);
                });
                grid.appendChild(card);
            });
        });
    }

    // ── Quiz Game ──
    function setupQuizGame() {
        // Options click
        document.getElementById('quiz-options')?.addEventListener('click', (e) => {
            const btn = e.target.closest('.quiz-option');
            if (!btn || btn.classList.contains('disabled')) return;
            QuizGame.selectAnswer(parseInt(btn.dataset.idx));
        });

        // Lifelines
        document.getElementById('lifeline-5050')?.addEventListener('click', () => QuizGame.useFiftyFifty());
        document.getElementById('lifeline-skip')?.addEventListener('click', () => QuizGame.useSkip());
        document.getElementById('lifeline-hint')?.addEventListener('click', () => QuizGame.useHint());

        // Results
        document.getElementById('quiz-retry')?.addEventListener('click', () => {
            HawdajAudio.SFX.tap();
            navigate('quiz-category');
        });
        document.getElementById('quiz-home')?.addEventListener('click', () => {
            HawdajAudio.SFX.tap();
            navigate('main-menu');
        });
    }

    // ── Puzzle ──
    function setupPuzzle() {
        // Initialize PuzzleGame (sets up mode card click listeners and shuffle button)
        PuzzleGame.init();
    }

    // ── Map ──
    function setupMap() {
        document.getElementById('close-region')?.addEventListener('click', () => {
            // Find which region was being viewed from the modal
            const regionName = document.getElementById('region-name')?.textContent;
            const data = HawdajData.get();
            let regionId = null;
            for (const [id, region] of Object.entries(data.regions)) {
                if (region.name === regionName) {
                    regionId = id;
                    break;
                }
            }
            MapGame.closeRegionModal(regionId);
            HawdajAudio.SFX.tap();
        });
    }

    // ── Leaderboard ──
    function setupLeaderboard() {
        // Handled by LeaderboardManager.init()
    }

    // ── Admin ──
    function setupAdmin() {
        AdminPanel.init();

        // Login
        document.getElementById('admin-login-btn')?.addEventListener('click', () => AdminPanel.login());
        document.getElementById('admin-password')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') AdminPanel.login();
        });

        // Logout
        document.getElementById('admin-logout')?.addEventListener('click', () => AdminPanel.logout());

        // Admin Chat Notifs
        const adminNotifBtn = document.getElementById('admin-notif-btn');
        if (adminNotifBtn) {
            adminNotifBtn.addEventListener('click', () => {
                HawdajAudio.SFX.tap();
                if (window.HawdajChat) HawdajChat.openAdminNotifications();
            });
            // Polling is now handled in checkChatNotifications globally
        }
        // Add question buttons
        document.getElementById('add-general-q')?.addEventListener('click', () => AdminPanel.openAddQuestion('general'));
        document.getElementById('add-episode-q')?.addEventListener('click', () => {
            const ep = parseInt(document.getElementById('episode-select')?.value);
            if (ep) AdminPanel.openAddQuestion(ep);
        });

        // Save question
        document.getElementById('save-question')?.addEventListener('click', () => AdminPanel.saveQuestion());

        // Puzzle management
        document.getElementById('add-puzzle-btn')?.addEventListener('click', () => AdminPanel.addPuzzle());

        // Puzzle image upload
        document.getElementById('puzzle-img-upload')?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const maxSize = 600; // Larger for puzzle quality
                    let w = img.width, h = img.height;
                    if (w > maxSize || h > maxSize) {
                        if (w > h) { h = (h / w) * maxSize; w = maxSize; }
                        else { w = (w / h) * maxSize; h = maxSize; }
                    }
                    canvas.width = w;
                    canvas.height = h;
                    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                    const base64 = canvas.toDataURL('image/jpeg', 0.75);
                    document.getElementById('puzzle-img-data').value = base64;
                    document.getElementById('puzzle-img-preview').src = base64;
                    document.getElementById('puzzle-img-preview').style.display = 'block';
                    document.getElementById('puzzle-img-clear').style.display = 'inline-flex';
                };
                img.src = ev.target.result;
            };
            reader.readAsDataURL(file);
            e.target.value = '';
        });

        // Map management
        document.getElementById('save-region-facts')?.addEventListener('click', () => AdminPanel.saveRegionFacts());
        document.getElementById('add-region-q')?.addEventListener('click', () => AdminPanel.addRegionQuestion());

        // Clothing image upload
        document.getElementById('region-clothing-upload')?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const maxSize = 300;
                    let w = img.width, h = img.height;
                    if (w > maxSize || h > maxSize) {
                        if (w > h) { h = (h / w) * maxSize; w = maxSize; }
                        else { w = (w / h) * maxSize; h = maxSize; }
                    }
                    canvas.width = w;
                    canvas.height = h;
                    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                    const base64 = canvas.toDataURL('image/jpeg', 0.7);
                    document.getElementById('region-clothing-img').value = base64;
                    document.getElementById('region-clothing-preview').src = base64;
                    document.getElementById('region-clothing-preview').style.display = 'block';
                    document.getElementById('region-clothing-clear').style.display = 'inline-flex';
                };
                img.src = ev.target.result;
            };
            reader.readAsDataURL(file);
            e.target.value = '';
        });

        // Theme switch
        document.getElementById('theme-switch')?.addEventListener('click', () => AdminPanel.toggleTheme());

        // Points
        document.getElementById('save-points')?.addEventListener('click', () => AdminPanel.savePoints());

        // Competitions
        document.getElementById('create-comp')?.addEventListener('click', () => AdminPanel.createCompetition());

        // Import/Export
        document.getElementById('import-json-btn')?.addEventListener('click', () => AdminPanel.importJSON());
        document.getElementById('export-json-btn')?.addEventListener('click', () => AdminPanel.exportJSON());

        // Settings Panel
        document.getElementById('change-password')?.addEventListener('click', () => AdminPanel.changePassword());
        document.getElementById('reset-data')?.addEventListener('click', () => AdminPanel.resetData());

        // Store & Dev
        document.getElementById('add-store-item')?.addEventListener('click', () => {
            if (AdminPanel.addStoreItem) AdminPanel.addStoreItem();
        });
        document.getElementById('save-dev-settings')?.addEventListener('click', () => {
            if (AdminPanel.saveDevSettings) AdminPanel.saveDevSettings();
        });
    }

    // ── Store Logic ──
    window.renderStore = function () {
        const data = HawdajData.get();
        const scoreEl = document.getElementById('store-score-val');
        if (scoreEl) scoreEl.textContent = data.player.totalScore || 0;
        const grid = document.getElementById('store-items-grid');
        if (!grid) return;
        grid.innerHTML = '';
        if (!data.storeItems || data.storeItems.length === 0) return;

        // Rarity config matching the premium bright kids theme
        const rarityConfig = {
            common: { border: '#8BC34A', bg: 'linear-gradient(180deg, #f0f7e6 0%, #d4e8b0 100%)', ribbon: '#8BC34A', ribbonText: 'عادي', glow: '0 6px 0 #689F38' },
            rare: { border: '#42A5F5', bg: 'linear-gradient(180deg, #e3f2fd 0%, #a8d4f7 100%)', ribbon: '#42A5F5', ribbonText: '💎 نادر', glow: '0 6px 0 #1976D2' },
            epic: { border: '#CE93D8', bg: 'linear-gradient(180deg, #f3e5f5 0%, #d5a8e0 100%)', ribbon: '#9C27B0', ribbonText: '✨ أسطوري', glow: '0 6px 0 #7B1FA2' },
            legendary: { border: '#FFB74D', bg: 'linear-gradient(180deg, #fff8e1 0%, #ffcc80 100%)', ribbon: '#FF6F00', ribbonText: '🔥 خرافي', glow: '0 6px 0 #F57C00' }
        };

        // Sort order setup
        const rarOrder = { legendary: 0, epic: 1, rare: 2, common: 3 };
        const getSubType = (item) => {
            if (item.type === 'avatar') return 'avatar';
            if (['skip', '5050', 'hint', 'doublexp', 'shield'].includes(item.powerupType)) return 'powerup_quiz';
            if (['puzzle_time', 'magic_piece', 'show_image', 'freeze'].includes(item.powerupType)) return 'powerup_puzzle';
            return 'powerup';
        };

        const sorted = [...data.storeItems].sort((a, b) => {
            const typeOrder = { 'powerup_quiz': 0, 'powerup_puzzle': 1, 'avatar': 2, 'powerup': 3 };
            const ta = typeOrder[getSubType(a)] ?? 4, tb = typeOrder[getSubType(b)] ?? 4;
            if (ta !== tb) return ta - tb;
            return (rarOrder[a.rarity] ?? 4) - (rarOrder[b.rarity] ?? 4) || b.price - a.price;
        });

        let lastType = '';
        sorted.forEach(item => {
            const isAvatar = item.type === 'avatar';
            const isPowerup = item.type === 'powerup';
            const subType = getSubType(item);
            const isOwned = isAvatar && data.player.inventory && data.player.inventory.includes(item.id);
            const isEquipped = isAvatar && data.player.avatar === item.id;
            const ownedCount = isPowerup && data.player.powerups ? (data.player.powerups[item.powerupType] || 0) : 0;
            const canBuy = (data.player.totalScore >= item.price) && (!isOwned || isPowerup);
            const r = rarityConfig[item.rarity] || rarityConfig.common;
            const isImg = item.icon && (item.icon.startsWith('http') || item.icon.startsWith('data:'));

            // Section header
            if (subType !== lastType) {
                lastType = subType;
                const hdr = document.createElement('div');
                hdr.style.cssText = 'grid-column:1/-1; text-align:center; padding:10px 0 2px; margin-top:5px;';

                let sectionTitle = '';
                if (subType === 'avatar') sectionTitle = '🎭 الأفاتارات';
                else if (subType === 'powerup_quiz') sectionTitle = '⚡ مساعدات الأسئلة';
                else if (subType === 'powerup_puzzle') sectionTitle = '🧩 مساعدات البازل';
                else sectionTitle = '✨ عناصر أخرى';

                hdr.innerHTML = '<span style="font-weight:900; font-size:1rem; color:#FFD700; text-shadow:0 1px 4px rgba(0,0,0,0.5); background:rgba(0,0,0,0.2); padding: 5px 15px; border-radius: 20px;">' + sectionTitle + '</span>';
                grid.appendChild(hdr);
            }

            // Card element - warm style like reference image
            const card = document.createElement('div');
            card.style.cssText = [
                'border-radius:12px',
                'border:2px solid ' + r.border,
                'background:' + r.bg,
                'display:flex',
                'flex-direction:column',
                'align-items:center',
                'position:relative',
                'transition:all 0.3s cubic-bezier(0.175,0.885,0.32,1.275)',
                'cursor:pointer',
                'box-shadow:' + r.glow,
                'padding-bottom:0'
            ].join(';') + ';';

            if (isOwned && !isEquipped) card.style.opacity = '0.55';

            // Build card HTML
            let cardHTML = '';

            // Rarity ribbon (diagonal) for avatars
            if (isAvatar && item.rarity !== 'common') {
                cardHTML += '<div style="position:absolute;top:0;left:0;right:0;background:' + r.ribbon + ';color:white;text-align:center;font-size:0.5rem;font-weight:900;padding:2px 0;letter-spacing:0.3px;">' + r.ribbonText + '</div>';
            }

            // Equipped badge
            if (isEquipped) {
                cardHTML += '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:5;background:rgba(46,204,113,0.92);color:white;padding:3px 10px;border-radius:12px;font-weight:900;font-size:0.6rem;box-shadow:0 4px 12px rgba(46,204,113,0.4);">✓ مُفعّل</div>';
            }

            // Icon area — cream/light bg with centered image
            const padTop = (isAvatar && item.rarity !== 'common') ? '20px' : '8px';
            const iconSize = isAvatar ? '38px' : '30px';
            if (isImg) {
                cardHTML += '<div style="padding:' + padTop + ' 4px 2px;display:flex;align-items:center;justify-content:center;">' +
                    '<img src="' + item.icon + '" style="width:' + iconSize + ';height:' + iconSize + ';object-fit:contain;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.15));" onerror="this.style.display=\'none\'">' +
                    '</div>';
            } else {
                cardHTML += '<div style="padding:' + padTop + ' 4px 2px;display:flex;align-items:center;justify-content:center;">' +
                    '<span style="font-size:1.5rem;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.1));">' + item.icon + '</span></div>';
            }

            // Name
            cardHTML += '<div style="padding:0 6px;text-align:center;"><div style="font-weight:900;font-size:0.6rem;color:#4E342E;margin-bottom:1px;line-height:1.2;">' + item.name + '</div></div>';

            // Price bar (show owned count for powerups)
            if (isPowerup && ownedCount > 0) {
                cardHTML += '<div style="padding:2px 6px;display:flex;align-items:center;justify-content:center;gap:2px;background:rgba(46,204,113,0.2);margin:2px 6px;border-radius:10px;">' +
                    '<span style="font-weight:900;color:#27ae60;font-size:0.6rem;">لديك: ' + ownedCount + '</span></div>';
            }
            cardHTML += '<div style="padding:2px 6px;display:flex;align-items:center;justify-content:center;gap:2px;background:rgba(255,255,255,0.5);margin:2px 6px;border-radius:10px;">' +
                '<img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Travel%20and%20places/Star.png" style="width:12px;height:12px;">' +
                '<span style="font-weight:900;color:#E65100;font-size:0.65rem;">' + item.price + '</span></div>';

            // Buy button — green like reference
            let btnText, btnBg, btnColor, btnClick;
            if (isEquipped) {
                btnText = '✓ مُفعّل'; btnBg = 'linear-gradient(180deg,#FFD54F,#FFB300)'; btnColor = '#4A2800'; btnClick = '';
            } else if (isOwned && isAvatar) {
                btnText = '🎭 تفعيل'; btnBg = 'linear-gradient(180deg,#64B5F6,#1E88E5)'; btnColor = 'white'; btnClick = "equipAvatar('" + item.id + "')";
            } else if (canBuy) {
                btnText = 'شراء'; btnBg = 'linear-gradient(180deg,#66BB6A,#43A047)'; btnColor = 'white'; btnClick = "buyStoreItem('" + item.id + "')";
            } else {
                btnText = '🔒 ' + item.price; btnBg = 'rgba(0,0,0,0.08)'; btnColor = 'rgba(0,0,0,0.35)'; btnClick = '';
            }

            cardHTML += '<button style="width:100%;padding:5px;border:none;font-weight:900;font-family:inherit;font-size:0.6rem;cursor:pointer;border-radius:0 0 10px 10px;background:' + btnBg + ';color:' + btnColor + ';transition:all 0.2s;margin-top:auto;' + (!canBuy && !isOwned && !isPowerup ? 'pointer-events:none;' : '') + '" onclick="' + btnClick + '">' + btnText + '</button>';

            card.innerHTML = cardHTML;
            card.onmouseenter = function () { card.style.transform = 'translateY(-6px) scale(1.04)'; card.style.boxShadow = '0 12px 28px rgba(0,0,0,0.2)'; };
            card.onmouseleave = function () { card.style.transform = ''; card.style.boxShadow = r.glow; };
            grid.appendChild(card);
        });
    }

    window.equipAvatar = function (avatarId) {
        const data = HawdajData.get();
        const item = data.storeItems.find(i => i.id === avatarId);
        data.player.avatar = avatarId;
        if (item) data.player.avatarIcon = item.icon;
        HawdajData.save(true);
        HawdajApp.showToast('\uD83C\uDFAD \u062A\u0645 \u062A\u0641\u0639\u064A\u0644 \u0627\u0644\u0623\u0641\u0627\u062A\u0627\u0631!', 'success');
        HawdajAudio.SFX.tap();
        renderStore();
        updatePlayerDisplay();
    }

    window.buyStoreItem = function (itemId) {
        const data = HawdajData.get();
        const item = data.storeItems.find(i => i.id === itemId);
        if (!item) return;
        if (data.player.totalScore < item.price) {
            HawdajApp.showToast('\u0644\u0627 \u062A\u0645\u0644\u0643 \u0646\u0642\u0627\u0637 \u0643\u0627\u0641\u064A\u0629! \u062A\u062D\u062A\u0627\u062C ' + item.price + ' \u2B50', 'error');
            return;
        }
        data.player.totalScore -= item.price;
        if (item.type === 'powerup') {
            if (!data.player.powerups) data.player.powerups = {};
            data.player.powerups[item.powerupType] = (data.player.powerups[item.powerupType] || 0) + 1;
            HawdajApp.showToast('\u062A\u0645 \u0634\u0631\u0627\u0621 ' + item.name + ' \u0628\u0646\u062C\u0627\u062D! \u26A1', 'success');
        } else if (item.type === 'avatar') {
            if (!data.player.inventory) data.player.inventory = [];
            data.player.inventory.push(item.id);
            data.player.avatar = item.id;
            data.player.avatarIcon = item.icon;
            HawdajApp.showToast('\uD83C\uDFAD \u062A\u0645 \u0634\u0631\u0627\u0621 \u0648\u062A\u0641\u0639\u064A\u0644 ' + item.name + '!', 'success');
        } else {
            if (!data.player.inventory) data.player.inventory = [];
            data.player.inventory.push(item.id);
            HawdajApp.showToast('\u062A\u0645 \u0634\u0631\u0627\u0621 ' + item.name + '!', 'success');
        }
        HawdajData.save(true);
        HawdajAudio.SFX.correct();
        HawdajEffects.coinBurst && HawdajEffects.coinBurst(5);
        renderStore();
        updatePlayerDisplay();
    }

    // ── Daily Tasks System ──
    const DAILY_TASKS_TEMPLATES = [
        { id: 'quiz_play', title: 'لعب جولة أسئلة', desc: 'العب جولة أسئلة واحدة على الأقل', icon: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Light%20Bulb.png', reward: 15, game: 'quiz' },
        { id: 'puzzle_play', title: 'حل بازل', desc: 'حل بازل واحد على الأقل', icon: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Activities/Puzzle%20Piece.png', reward: 20, game: 'puzzle' },
        { id: 'map_explore', title: 'استكشف منطقة', desc: 'استكشف منطقة واحدة في الخريطة', icon: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Travel%20and%20places/Compass.png', reward: 15, game: 'map' },
        { id: 'quiz_streak3', title: 'سلسلة 3 صحيحة', desc: 'اجب 3 إجابات صحيحة متتالية', icon: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Travel%20and%20places/Fire.png', reward: 25, game: 'quiz' },
        { id: 'score_50', title: 'اجمع 50 نقطة', desc: 'اجمع 50 نقطة من أي لعبة', icon: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Travel%20and%20places/Star.png', reward: 20, game: 'any' },
    ];

    function getTodayStr() {
        return new Date().toISOString().split('T')[0];
    }

    function getDailyTasks() {
        const data = HawdajData.get();
        const today = getTodayStr();
        // Reset tasks if it's a new day
        if (data.player.dailyTasksDate !== today) {
            data.player.dailyTasksDate = today;
            data.player.dailyTasksCompleted = [];
            data.player.dailyLastPlayed = null;
            HawdajData.save();
        }
        // Generate 3 random tasks for today using a date-based seed
        const seed = today.split('-').reduce((a, b) => a + parseInt(b), 0);
        const shuffled = [...DAILY_TASKS_TEMPLATES].sort((a, b) => {
            const ha = ((seed * 31 + a.id.charCodeAt(0)) % 100);
            const hb = ((seed * 31 + b.id.charCodeAt(0)) % 100);
            return ha - hb;
        });
        return shuffled.slice(0, 3);
    }

    function renderDailyTasks() {
        const data = HawdajData.get();
        const tasks = getDailyTasks();
        const completed = data.player.dailyTasksCompleted || [];
        const listEl = document.getElementById('daily-tasks-list');
        const progressFill = document.getElementById('daily-progress-fill');
        const progressText = document.getElementById('daily-progress-text');
        const bonusSection = document.getElementById('daily-bonus-section');
        if (!listEl) return;

        const doneCount = completed.length;
        if (progressFill) progressFill.style.width = `${(doneCount / tasks.length) * 100}%`;
        if (progressText) progressText.textContent = `${doneCount}/${tasks.length}`;

        listEl.innerHTML = '';
        tasks.forEach((task, idx) => {
            const isDone = completed.includes(task.id);
            const card = document.createElement('div');
            card.style.cssText = `
                display:flex; align-items:center; gap:14px; padding:16px 20px;
                border-radius:16px; border:2px solid ${isDone ? 'rgba(46,204,113,0.5)' : 'var(--card-border)'};
                background:${isDone ? 'linear-gradient(135deg, rgba(46,204,113,0.1), rgba(39,174,96,0.15))' : 'var(--card-bg)'};
                box-shadow:var(--shadow-sm); transition:all 0.3s ease;
                animation: slideUp 0.4s ease ${idx * 0.1}s both;
                ${isDone ? 'opacity:0.7;' : 'cursor:pointer;'}
            `;
            card.innerHTML = `
                <div style="width:48px; height:48px; border-radius:14px; display:flex; align-items:center; justify-content:center; flex-shrink:0;
                    background:${isDone ? 'rgba(46,204,113,0.2)' : 'rgba(155,89,182,0.15)'}; font-size:1.5rem;">
                    ${isDone ? '<img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Hand%20gestures/Clapping%20Hands.png" class="ui-anim-icon" style="width:1.5em;height:1.5em;">' : `<img src="${task.icon}" class="ui-anim-icon" style="width:1.5em;height:1.5em;">`}
                </div>
                <div style="flex:1; min-width:0;">
                    <div style="font-weight:900; color:var(--text-heading); font-size:var(--fs-md); margin-bottom:2px;">${task.title}</div>
                    <div style="font-size:var(--fs-xs); color:var(--text-secondary);">${task.desc}</div>
                </div>
                <div style="padding:6px 14px; border-radius:20px; font-weight:900; font-size:var(--fs-sm); white-space:nowrap;
                    background:${isDone ? 'rgba(46,204,113,0.2)' : 'rgba(255,215,0,0.15)'};
                    color:${isDone ? '#2ecc71' : '#FFD700'};">
                    ${isDone ? '<img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Hand%20gestures/Clapping%20Hands.png" class="ui-anim-icon" style="width:1.2em;height:1.2em;"> تم' : `+${task.reward} ⭐`}
                </div>
            `;
            if (!isDone) {
                card.addEventListener('click', () => {
                    HawdajAudio.SFX.tap();
                    // Navigate to the relevant game
                    if (task.game === 'quiz') navigate('quiz-category');
                    else if (task.game === 'puzzle') navigate('puzzle-select');
                    else if (task.game === 'map') navigate('map-game');
                    else navigate('quiz-category');
                });
            }
            listEl.appendChild(card);
        });

        // Show bonus if all done
        if (bonusSection) {
            if (doneCount >= tasks.length) {
                bonusSection.classList.remove('hidden');
            } else {
                bonusSection.classList.add('hidden');
            }
        }
    }

    // Call this from game end screens to mark daily tasks
    window.completeDailyTask = function (taskId) {
        const data = HawdajData.get();
        const today = getTodayStr();
        if (data.player.dailyTasksDate !== today) {
            data.player.dailyTasksDate = today;
            data.player.dailyTasksCompleted = [];
        }
        if (!data.player.dailyTasksCompleted) data.player.dailyTasksCompleted = [];
        if (data.player.dailyTasksCompleted.includes(taskId)) return;

        const tasks = getDailyTasks();
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        data.player.dailyTasksCompleted.push(taskId);
        HawdajData.addScore(task.reward, 'quiz');
        HawdajData.save();
        showToast(`✅ مهمة يومية مكتملة! +${task.reward} نقطة`, 'success');

        // Bonus for completing all
        if (data.player.dailyTasksCompleted.length >= tasks.length) {
            setTimeout(() => {
                HawdajData.addScore(50, 'quiz');
                HawdajData.save();
                HawdajEffects.celebrationBurst();
                HawdajAudio.SFX.victory();
                showToast('🎊 أكملت جميع المهام اليومية! +50 نقطة مكافأة!', 'success');
            }, 1500);
        }
    };

    // ── Daily Question System ──
    function renderDailyQuestion() {
        const data = HawdajData.get();
        const today = getTodayStr();
        const card = document.getElementById('daily-question-card');
        const statusEl = document.getElementById('daily-q-status');
        if (!card) return;

        // Check if already answered today
        if (data.player.dailyLastPlayed === today) {
            card.classList.remove('hidden');
            if (statusEl) {
                statusEl.textContent = '✓ أجبت اليوم';
                statusEl.parentElement.style.background = 'linear-gradient(135deg, #2ecc71, #27ae60)';
                statusEl.style.color = '#FFFFFF';
                statusEl.parentElement.style.boxShadow = '0 4px 0 #1e8449, 0 8px 15px rgba(39,174,96,0.4)';
            }
            card.style.cursor = 'default';
            card.onclick = null;
            return;
        }

        // Show card with click handler
        if (data.quizGeneral && data.quizGeneral.length > 0) {
            card.classList.remove('hidden');
            if (statusEl) {
                statusEl.textContent = '×2 نقاط';
                statusEl.parentElement.style.background = 'linear-gradient(135deg, #FFB74D, #FF9800)';
                statusEl.style.color = '#FFFFFF';
                statusEl.parentElement.style.boxShadow = '0 4px 0 #E65100, 0 8px 15px rgba(255,152,0,0.4)';
            }
            card.style.cursor = 'pointer';
            card.onclick = () => {
                HawdajAudio.SFX.tap();
                openDailyQuestion();
            };
        }
    }

    function openDailyQuestion() {
        const data = HawdajData.get();
        // Pick a deterministic question based on date
        const today = getTodayStr();
        const seed = today.split('-').reduce((a, b) => a + parseInt(b), 0);
        const qIdx = seed % data.quizGeneral.length;
        const q = data.quizGeneral[qIdx];

        const modal = document.getElementById('daily-q-modal');
        const qText = document.getElementById('daily-q-text');
        const qOptions = document.getElementById('daily-q-options');
        const qResult = document.getElementById('daily-q-result');
        const qClose = document.getElementById('daily-q-close');

        if (!modal || !q) return;

        qText.textContent = q.question;
        qResult.classList.add('hidden');
        qClose.classList.add('hidden');
        qOptions.innerHTML = '';

        q.options.forEach((opt, idx) => {
            const btn = document.createElement('button');
            btn.className = 'btn btn-glass';
            btn.style.cssText = 'padding:12px; font-weight:700; font-size:var(--fs-md); transition:all 0.3s ease; border:2px solid var(--card-border);';
            btn.textContent = opt;
            btn.addEventListener('click', () => {
                // Disable all options
                qOptions.querySelectorAll('button').forEach(b => {
                    b.disabled = true;
                    b.style.opacity = '0.5';
                    b.style.pointerEvents = 'none';
                });

                const isCorrect = idx === q.correct;
                if (isCorrect) {
                    btn.style.background = 'linear-gradient(135deg, #2ecc71, #27ae60)';
                    btn.style.color = 'white';
                    btn.style.opacity = '1';
                    btn.style.borderColor = '#2ecc71';
                    const pts = (data.points.correct || 10) * 2;
                    HawdajData.addScore(pts, 'quiz');
                    HawdajAudio.SFX.correct();
                    HawdajEffects.celebrationBurst();
                    qResult.innerHTML = `<div style="color:#2ecc71; font-weight:900; font-size:var(--fs-lg);">🎉 إجابة رائعة! +${pts} نقطة!</div>`;
                } else {
                    btn.style.background = 'linear-gradient(135deg, #e74c3c, #c0392b)';
                    btn.style.color = 'white';
                    btn.style.opacity = '1';
                    btn.style.borderColor = '#e74c3c';
                    // Highlight correct answer
                    qOptions.querySelectorAll('button')[q.correct].style.background = 'linear-gradient(135deg, #2ecc71, #27ae60)';
                    qOptions.querySelectorAll('button')[q.correct].style.color = 'white';
                    qOptions.querySelectorAll('button')[q.correct].style.opacity = '1';
                    qOptions.querySelectorAll('button')[q.correct].style.borderColor = '#2ecc71';
                    HawdajAudio.SFX.wrong();
                    qResult.innerHTML = `<div style="color:#e74c3c; font-weight:900; font-size:var(--fs-lg);">😔 للأسف، الإجابة الصحيحة: ${q.options[q.correct]}</div>`;
                }

                qResult.classList.remove('hidden');
                qResult.style.background = isCorrect ? 'rgba(46,204,113,0.1)' : 'rgba(231,76,60,0.1)';
                qClose.classList.remove('hidden');

                // Mark as played today
                data.player.dailyLastPlayed = today;
                HawdajData.save();
            });
            qOptions.appendChild(btn);
        });

        // Close button
        qClose.onclick = () => {
            modal.classList.remove('active');
            renderDailyQuestion();
            updatePlayerDisplay();
        };

        modal.classList.add('active');
    }

    // ── Back Navigation ──
    function setupNavigation() {
        document.querySelectorAll('.back-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.dataset.back;
                if (target) {
                    // Cleanup running games
                    QuizGame.cleanup();
                    PuzzleGame.cleanup();

                    HawdajAudio.SFX.tap();
                    navigate(target);

                    // Reset episodes view if going back to quiz-category
                    if (target === 'quiz-category') {
                        document.getElementById('quiz-cat-list')?.classList.remove('hidden');
                        document.getElementById('episodes-list')?.classList.add('hidden');
                    }
                }
            });
        });

        // Close modals on overlay click
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.classList.remove('active');
                }
            });
        });
    }

    // Initialize when DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }


    // ── Notification System ──
    function addNotification(title, body, icon) {
        const data = HawdajData.get();
        if (!data.player.notifications) data.player.notifications = [];
        data.player.notifications.unshift({
            id: 'n_' + Date.now(),
            title: title,
            body: body,
            icon: icon || '🔔',
            time: new Date().toISOString(),
            read: false
        });
        // Keep max 50 notifications
        if (data.player.notifications.length > 50) data.player.notifications.pop();
        HawdajData.save();
        updateNotifBadge();
    }

    function updateNotifBadge() {
        const data = HawdajData.get();
        const unread = (data.player.notifications || []).filter(n => !n.read).length;
        const badge = document.getElementById('notif-badge');
        if (badge) {
            badge.textContent = unread;
            badge.style.display = unread > 0 ? 'flex' : 'none';
        }
    }

    function showNotifications() {
        const modal = document.getElementById('notifications-modal');
        if (!modal) return;
        modal.style.display = 'block';

        const data = HawdajData.get();
        const notifs = data.player.notifications || [];
        const list = document.getElementById('notif-inbox-list');
        if (!list) return;

        if (notifs.length === 0) {
            list.innerHTML = '<div style="text-align:center; padding:40px; color:var(--text-secondary);"><div style="font-size:3rem; margin-bottom:12px;">📭</div><p>لا توجد إشعارات حالياً</p></div>';
            return;
        }

        list.innerHTML = notifs.map(n => {
            const timeAgo = getTimeAgo(n.time);
            return '<div class="notif-item ' + (n.read ? '' : 'unread') + '" onclick="HawdajApp.markNotifRead(\'' + n.id + '\')">' +
                '<div class="notif-icon">' + n.icon + '</div>' +
                '<div class="notif-content">' +
                '<div class="notif-title">' + n.title + '</div>' +
                '<div class="notif-body">' + n.body + '</div>' +
                '<div class="notif-time">' + timeAgo + '</div>' +
                '</div></div>';
        }).join('');

        // Mark all as read after viewing
        notifs.forEach(n => n.read = true);
        HawdajData.save();
        updateNotifBadge();
    }

    function markNotifRead(id) {
        const data = HawdajData.get();
        const n = (data.player.notifications || []).find(x => x.id === id);
        if (n) { n.read = true; HawdajData.save(); updateNotifBadge(); }
    }

    function getTimeAgo(dateStr) {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'الآن';
        if (mins < 60) return 'منذ ' + mins + ' دقيقة';
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return 'منذ ' + hrs + ' ساعة';
        const days = Math.floor(hrs / 24);
        return 'منذ ' + days + ' يوم';
    }

    // Expose to window for quiz/puzzle return
    window.showCompTasksModal = showCompTasksModal;

    return {
        trackCompetitionGameCompletion, updatePlayerDisplay,
        navigate, showToast, showNotifications, markNotifRead, addNotification, updateNotifBadge,
        showCompTasksModal, eliminateFromCompetition, showEliminationEffect, showLiveProgressModal
    };
})();

window.HawdajApp = HawdajApp;
