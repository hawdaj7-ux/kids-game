/* ============================================
   HAWDAJ GAME — Quiz Game Logic
   ============================================ */

const QuizGame = (() => {
    let questions = [];
    let currentIdx = 0;
    let score = 0;
    let streak = 0;
    let bestStreak = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let timer = null;
    let timeLeft = 15;
    let answered = false;
    let category = 'general';
    let episodeNum = null;
    let currentSpeaker = 'jadel';
    let lastShownRoundIndex = -1;

    function getNextSpeaker() {
        currentSpeaker = currentSpeaker === 'azzam' ? 'jadel' : 'azzam';
        return currentSpeaker;
    }

    // Lifelines
    let lifelines = { fiftyFifty: 2, skip: 1, hint: 1 };

    let TIMER_TOTAL = 15;
    const CIRCUMFERENCE = 2 * Math.PI * 25; // radius=25

    // DOM references
    const els = {};

    function cacheDom() {
        els.progressText = document.getElementById('quiz-progress-text');
        els.progressFill = document.getElementById('quiz-progress-fill');
        els.timerText = document.getElementById('quiz-timer-text');
        els.timerCircle = document.getElementById('quiz-timer-circle');
        els.scoreVal = document.getElementById('quiz-score-val');
        els.questionText = document.getElementById('quiz-question-text');
        els.questionImg = document.getElementById('quiz-question-img');
        els.options = document.getElementById('quiz-options');
        els.streakEl = document.getElementById('quiz-streak');
        els.streakCount = document.getElementById('streak-count');
        els.charAzzam = document.getElementById('quiz-char-azzam');
        els.charJadel = document.getElementById('quiz-char-jadel');
        els.characters = document.getElementById('quiz-characters');

        // Lifelines
        els.lifeline5050 = document.getElementById('lifeline-5050');
        els.lifelineSkip = document.getElementById('lifeline-skip');
        els.lifelineHint = document.getElementById('lifeline-hint');
        els.count5050 = document.getElementById('lifeline-5050-count');
        els.countSkip = document.getElementById('lifeline-skip-count');
        els.countHint = document.getElementById('lifeline-hint-count');
    }

    function startGame(cat, ep) {
        cacheDom();
        category = cat;
        episodeNum = ep;

        const data = HawdajData.get();
        TIMER_TOTAL = 15;
        let c = null;
        if (data.player.activeCompetitionId) {
            c = data.competitions.find(x => x.id === data.player.activeCompetitionId);
            if (c && c.quizTime) TIMER_TOTAL = parseInt(c.quizTime) || 15;
        }

        const randomize = data.devSettings?.quizRandomize !== false;

        if (cat === 'general') {
            questions = [...data.quizGeneral];
            if (randomize) questions = shuffleArray(questions);
        } else if (cat === 'episode' && ep) {
            questions = [...(data.quizEpisodes[ep] || [])];
            if (randomize) questions = shuffleArray(questions);
        }

        // Limit questions: from devSettings or competition setting
        let questionLimit = data.devSettings?.quizQuestionLimit;
        if (questionLimit === undefined || questionLimit === null) questionLimit = 10; // default 10
        if (c && c.questionCount) questionLimit = parseInt(c.questionCount) || questionLimit;
        if (questionLimit > 0) questions = questions.slice(0, questionLimit);
        // if 0 = use all available questions

        if (questions.length === 0) {
            HawdajApp.showToast('لا توجد أسئلة متاحة!', 'error');
            HawdajApp.navigate('quiz-category');
            return;
        }

        currentIdx = 0;
        lastShownRoundIndex = -1;
        score = 0;
        streak = 0;
        bestStreak = 0;
        correctCount = 0;
        wrongCount = 0;
        const pts = data.player.powerups || {};
        lifelines = { fiftyFifty: pts['5050'] || 0, skip: pts.skip || 0, hint: pts.hint || 0 };

        updateLifelineUI();

        // Show game screen first
        HawdajApp.navigate('quiz-game');

        // Set characters to talking/happy initially for the intro
        els.charAzzam.src = HawdajData.getCharacterPose('azzam', 'happy') || 'assets/char/azzam.jpeg';
        els.charJadel.src = HawdajData.getCharacterPose('jadel', 'talking') || 'assets/char/El jadel.jpeg';

        // Play Intro Dialogue
        const introAudio = HawdajAudio.getRandomAudioPath('jadel', 'intro_quiz');
        HawdajDialogue.showIntro(
            "أهلاً بك يا بطل في تحدي الأسئلة! جاوب بسرعة قبل ما الوقت يخلص عشان تكسب نقاط أكتر مستعد؟",
            introAudio,
            () => {
                els.charAzzam.src = HawdajData.getCharacterPose('azzam', 'thinking') || 'assets/char/azzam.jpeg';
                els.charJadel.src = HawdajData.getCharacterPose('jadel', 'thinking') || 'assets/char/El jadel.jpeg';
                showQuestion();
            }
        );
    }

    function showQuestion() {
        if (currentIdx >= questions.length) {
            endGame();
            return;
        }

        // Round transition check (every 5 questions: index 0, 5, 10, ...)
        const roundIndex = Math.floor(currentIdx / 5);
        const isRoundStart = (currentIdx % 5 === 0);
        if (isRoundStart && lastShownRoundIndex !== roundIndex) {
            lastShownRoundIndex = roundIndex;
            showRoundOverlay(roundIndex + 1, () => {
                continueShowQuestion();
            });
            return;
        }

        continueShowQuestion();
    }

    function continueShowQuestion() {
        const existingHint = document.getElementById('persistent-hint');
        if (existingHint) existingHint.remove();

        answered = false;
        const q = questions[currentIdx];

        // Update progress
        els.progressText.textContent = `${currentIdx + 1}/${questions.length}`;
        els.progressFill.style.width = `${((currentIdx + 1) / questions.length) * 100}%`;
        els.scoreVal.textContent = score;

        // Show question
        els.questionText.textContent = q.question;

        if (q.image) {
            els.questionImg.src = q.image;
            els.questionImg.classList.remove('hidden');
        } else {
            els.questionImg.classList.add('hidden');
        }

        // Show streak
        if (streak >= 3) {
            els.streakEl.classList.remove('hidden');
            els.streakCount.textContent = streak >= 5 ? '3' : '2';
        } else {
            els.streakEl.classList.add('hidden');
        }

        // Determine how many options to show
        const optionsCount = (HawdajData.get().devSettings?.quizOptionsCount) || 4;

        // Build shuffled indices only for the options we will show
        // Make sure the correct answer index is remapped within the visible range
        const correctIdx = q.correct;
        let visibleIndices = [0, 1, 2, 3].slice(0, optionsCount);
        // If correct option is outside visible range, swap it in
        if (!visibleIndices.includes(correctIdx)) {
            visibleIndices[optionsCount - 1] = correctIdx;
        }
        shuffleArrayInPlace(visibleIndices);
        const optionIndices = visibleIndices;

        // Show options with animation
        const optBtns = els.options.querySelectorAll('.quiz-option');
        optBtns.forEach((btn, i) => {
            if (i < optionsCount) {
                const mappedIdx = optionIndices[i];
                btn.textContent = q.options[mappedIdx] || '';
                btn.dataset.idx = mappedIdx;
                btn.className = 'quiz-option';
                btn.style.cssText = '';
                btn.style.display = '';
                btn.style.animationDelay = `${0.1 + i * 0.05}s`;
                btn.style.animation = 'none';
                btn.offsetHeight;
                btn.style.animation = '';
            } else {
                btn.style.display = 'none';
                btn.className = 'quiz-option disabled';
            }
        });

        // Reset characters
        els.characters.className = 'game-characters';
        els.charAzzam.className = 'game-char-img azzam';
        els.charJadel.className = 'game-char-img jadel';

        els.charAzzam.src = HawdajData.getCharacterPose('azzam', 'thinking') || 'assets/char/azzam.jpeg';
        els.charJadel.src = HawdajData.getCharacterPose('jadel', 'thinking') || 'assets/char/El jadel.jpeg';

        // Start timer
        startTimer();
    }

    function startTimer() {
        timeLeft = TIMER_TOTAL;
        updateTimerDisplay();

        clearInterval(timer);
        HawdajAudio.startChallengeBg();

        timer = setInterval(() => {
            timeLeft--;
            updateTimerDisplay();

            if (timeLeft <= 5 && timeLeft > 0) {
                HawdajAudio.intenseTick();
                els.timerCircle.classList.add('warning');
                // Show time warning popup at exactly 5 seconds
                if (timeLeft === 5 && window.HawdajCelebration) {
                    HawdajCelebration.show('timeWarning');
                }
            }

            if (timeLeft <= 0) {
                clearInterval(timer);
                HawdajAudio.stopChallengeBg();
                HawdajAudio.SFX.timeUp();
                handleTimeout();
            }
        }, 1000);
    }

    function updateTimerDisplay() {
        els.timerText.textContent = timeLeft;
        const offset = CIRCUMFERENCE * (1 - timeLeft / TIMER_TOTAL);
        els.timerCircle.style.strokeDasharray = CIRCUMFERENCE;
        els.timerCircle.style.strokeDashoffset = offset;
        els.timerCircle.classList.toggle('warning', timeLeft <= 5);
    }

    function handleTimeout() {
        answered = true;
        wrongCount++;
        streak = 0;
        els.streakEl.classList.add('hidden');

        // Show correct answer
        // Check if shield protects from timeout
        if (window.PowerupInventory && PowerupInventory.hasShield()) {
            PowerupInventory.consumeShield();
            timeLeft = 10; // Give 10 extra seconds
            startTimer();
            HawdajApp.showToast('🛡️ درع الحماية حماك! +10 ثواني', 'success');
            return;
        }

        const q = questions[currentIdx];
        const optBtns = els.options.querySelectorAll('.quiz-option');
        optBtns.forEach(btn => {
            const idx = parseInt(btn.dataset.idx);
            if (idx === q.correct) {
                btn.classList.add('highlight-correct');
            }
            btn.classList.add('disabled');
        });

        // === DRAMATIC TIMEOUT EFFECTS ===
        if (window.HawdajEffects) {
            HawdajEffects.redFlash();
            HawdajEffects.show3DClock();
            HawdajEffects.emojiRain(['⏰', '⏳', '💨'], 15);
            HawdajEffects.shake(document.getElementById('quiz-game'), 12, 600);
        }

        // 4. Sound + vibration
        HawdajAudio.SFX.timeUp();
        HawdajAudio.vibrate([100, 50, 100, 50, 200]);

        // 5. Both characters sad reaction
        els.charAzzam.className = 'game-char-img azzam sad';
        els.charJadel.className = 'game-char-img jadel sad';
        els.charAzzam.src = HawdajData.getCharacterPose('azzam', 'sad') || 'assets/char/azzam.jpeg';
        els.charJadel.src = HawdajData.getCharacterPose('jadel', 'sad') || 'assets/char/El jadel.jpeg';

        // Character audio — playfully choose alternate character
        const speaker = getNextSpeaker();
        HawdajAudio.playCharacter(speaker, 'timeout').then(played => {
            if (!played) HawdajAudio.playCharacter(speaker, 'sad');
        });

        setTimeout(() => {
            els.charAzzam.className = 'game-char-img azzam';
            els.charJadel.className = 'game-char-img jadel';

            const data = HawdajData.get();
            if (data.player.activeCompetitionId) {
                clearInterval(timer);
                HawdajApp.eliminateFromCompetition('timeout');
            } else {
                currentIdx++;
                showQuestion();
            }
        }, 2500);
    }

    function selectAnswer(optionIdx) {
        if (answered) return;
        answered = true;
        clearInterval(timer);
        HawdajAudio.stopChallengeBg();

        const q = questions[currentIdx];
        const isCorrect = optionIdx === q.correct;
        const optBtns = els.options.querySelectorAll('.quiz-option');

        // Check for Shield first if incorrect
        if (!isCorrect && window.PowerupInventory && PowerupInventory.hasShield()) {
            PowerupInventory.consumeShield();

            // Give a visual effect to wrong choice and grey it out
            optBtns.forEach(btn => {
                const idx = parseInt(btn.dataset.idx);
                if (idx === optionIdx) {
                    btn.classList.add('wrong', 'disabled');
                    btn.style.opacity = '0.5';
                    HawdajEffects.shake(btn, 3, 300);
                }
            });

            // Re-enable and restart timer
            answered = false;
            startTimer();
            HawdajApp.showToast('🛡️ درع الحماية أعطاك فرصة أخرى!', 'success');
            return;
        }

        // Disable all options
        optBtns.forEach(btn => {
            const idx = parseInt(btn.dataset.idx);
            if (idx === optionIdx) {
                btn.classList.add(isCorrect ? 'correct' : 'wrong');
            }
            if (idx === q.correct && !isCorrect) {
                setTimeout(() => btn.classList.add('highlight-correct'), 300);
            }
            btn.classList.add('disabled');
        });

        if (isCorrect) {
            correctCount++;
            streak++;
            if (streak > bestStreak) bestStreak = streak;

            // Calculate points — base + speed bonus only
            const data = HawdajData.get();
            let pts = data.points.correct; // e.g. 10
            // Speed bonus: 0 to data.points.speed (e.g. 0-5) based on time remaining
            const speedRatio = timeLeft / TIMER_TOTAL;
            pts += Math.round(speedRatio * data.points.speed);
            // Streak multiplier (additive, not multiplicative, to keep numbers sane)
            if (streak >= 5) pts += 10;
            else if (streak >= 3) pts += 5;
            else if (streak >= 2) pts += 2;

            // Apply powerup score multiplier
            if (window.PowerupInventory) {
                pts = Math.floor(pts * PowerupInventory.getScoreMultiplier());
            }

            HawdajData.addScore(pts, 'quiz'); // <--- ADDED THIS LINE
            if (window.HawdajApp && HawdajApp.updatePlayerDisplay) {
                HawdajApp.updatePlayerDisplay();
            }
            score += pts;
            // Animate score display
            const scoreValEl = els.scoreVal;
            scoreValEl.textContent = score;
            scoreValEl.style.animation = 'none'; scoreValEl.offsetHeight;
            scoreValEl.style.animation = 'scorePopIn 0.4s cubic-bezier(0.175,0.885,0.32,1.275)';

            // Character audio — perfectly alternate character to cheer
            const speaker = getNextSpeaker();
            HawdajAudio.playCharacter(speaker, 'cheer');
            HawdajAudio.SFX.correct();

            // Show celebration popup (alternates Azzam/Jadel)
            if (window.HawdajCelebration) {
                HawdajCelebration.show('correct', { points: pts, streak: streak });
            }
            if (streak >= 3) HawdajAudio.SFX.streak();

            const rect = els.options.getBoundingClientRect();
            HawdajEffects.sparkle(rect.left + rect.width / 2, rect.top);
            if (window.HawdajEffects) {
                HawdajEffects.greenFlash();
                HawdajEffects.celebrationBurst();
                HawdajEffects.shake(els.question, 6, 400);
                HawdajEffects.scoreFloat(
                    window.innerWidth / 2, window.innerHeight / 2,
                    `+${pts}`, '#008C45'
                );
            }

            els.charAzzam.className = 'game-char-img azzam celebrate';
            els.charJadel.className = 'game-char-img jadel celebrate';
            els.charAzzam.src = HawdajData.getCharacterPose('azzam', 'happy') || 'assets/char/azzam.jpeg';
            els.charJadel.src = HawdajData.getCharacterPose('jadel', 'happy') || 'assets/char/El jadel.jpeg';
            HawdajAudio.vibrate(50);
        } else {
            wrongCount++;
            streak = 0;
            els.streakEl.classList.add('hidden');

            // Character audio — alternate one to be sad
            const speaker = getNextSpeaker();
            HawdajAudio.playCharacter(speaker, 'sad');
            HawdajAudio.SFX.wrong();
            if (window.HawdajEffects) {
                HawdajEffects.shake('#quiz-game', 10, 500);
                HawdajEffects.redFlash();
                HawdajEffects.emojiRain(['💔', '❌', '😢'], 15);
            }
            els.charAzzam.className = 'game-char-img azzam sad';
            els.charJadel.className = 'game-char-img jadel sad';
            els.charAzzam.src = HawdajData.getCharacterPose('azzam', 'sad') || 'assets/char/azzam.jpeg';
            els.charJadel.src = HawdajData.getCharacterPose('jadel', 'sad') || 'assets/char/El jadel.jpeg';
            HawdajAudio.vibrate([100, 50, 100]);

            // Show wrong answer popup
            if (window.HawdajCelebration) {
                HawdajCelebration.show('wrong');
            }
        }

        setTimeout(() => {
            const data = HawdajData.get();
            if (!isCorrect && data.player.activeCompetitionId) {
                clearInterval(timer);
                HawdajApp.eliminateFromCompetition('wrong_answer');
            } else {
                currentIdx++;
                showQuestion();
            }
        }, 1800);
    }

    function endGame() {
        clearInterval(timer);

        // Score was already added per-question — just update leaderboard now
        HawdajData.updateLeaderboard();
        // Track competition progress
        if (window.HawdajApp && HawdajApp.trackCompetitionGameCompletion) {
            HawdajApp.trackCompetitionGameCompletion('quiz');
        }
        // Update main menu display immediately
        if (window.HawdajApp && HawdajApp.updatePlayerDisplay) {
            HawdajApp.updatePlayerDisplay();
        }
        const data = HawdajData.get();
        if (bestStreak > data.player.bestStreak) {
            data.player.bestStreak = bestStreak;
            HawdajData.save();
        }

        // Daily task triggers
        if (window.completeDailyTask) {
            window.completeDailyTask('quiz_play');
            if (bestStreak >= 3) window.completeDailyTask('quiz_streak3');
            if (score >= 50) window.completeDailyTask('score_50');
        }

        // Update results screen
        document.getElementById('results-score').textContent = score;
        document.getElementById('stat-correct').textContent = correctCount;
        document.getElementById('stat-wrong').textContent = wrongCount;
        document.getElementById('stat-streak').textContent = bestStreak;

        // Stars
        const starRatio = correctCount / questions.length;
        const starsEarned = starRatio >= 0.9 ? 3 : starRatio >= 0.6 ? 2 : starRatio >= 0.3 ? 1 : 0;
        const stars = document.querySelectorAll('#result-stars .star');
        stars.forEach((star, i) => {
            star.className = 'star';
            if (i < starsEarned) {
                setTimeout(() => {
                    star.classList.add('earned');
                    HawdajAudio.SFX.star();
                }, 500 + i * 400);
            }
        });

        // Title
        const titles = ['حاول مرة أخرى!', 'لا بأس!', 'جيد! 👍', 'أحسنت! 🌟', 'ممتاز! 🏆'];
        const titleIdx = starsEarned === 0 ? (correctCount > 0 ? 1 : 0) : starsEarned + 1;
        document.getElementById('results-title').textContent = titles[titleIdx];

        // Navigate and celebrate
        const dataCore = HawdajData.get();
        const savedCompId = dataCore.player.activeCompetitionId;
        if (savedCompId) {
            setTimeout(() => {
                HawdajApp.navigate('main-menu');
                // Re-read fresh data and pass ID — showCompTasksModal handles both
                setTimeout(() => {
                    if (window.showCompTasksModal) window.showCompTasksModal(savedCompId);
                }, 300);
            }, 3000);
        } else {
            HawdajApp.navigate('quiz-results');
        }

        // Final game audio reaction
        const speaker = getNextSpeaker();
        if (starsEarned >= 2) {
            HawdajAudio.SFX.victory();
            if (HawdajAudio.SFX.applause) HawdajAudio.SFX.applause();
            HawdajAudio.playCharacter(speaker, 'win').then(played => {
                if (!played) HawdajAudio.playCharacter(speaker, 'cheer');
            });
            if (window.HawdajEffects) {
                setTimeout(() => HawdajEffects.celebrationBurst(), 300);
                setTimeout(() => HawdajEffects.confetti(window.innerWidth / 2, window.innerHeight / 2, 60), 600);
                setTimeout(() => HawdajEffects.emojiRain(['🏆', '⭐', '✨', '👑', '🌴'], 25), 400);
                setTimeout(() => HawdajEffects.greenFlash(), 200);
                setTimeout(() => HawdajEffects.greenFlash(), 800);
            }
        } else {
            HawdajAudio.SFX.wrong();
            HawdajAudio.playCharacter(speaker, 'lose').then(played => {
                if (!played) HawdajAudio.playCharacter(speaker, 'sad');
            });
            if (window.HawdajEffects) {
                HawdajEffects.redFlash();
                HawdajEffects.emojiRain(['😢', '💔', '👎'], 15);
            }
        }
    }

    // Lifelines
    function useFiftyFifty() {
        if (answered) return; const activeOpts = els.options.querySelectorAll('.quiz-option:not(.disabled)'); if (activeOpts.length <= 2) return; if (!HawdajData.get().player.powerups || (HawdajData.get().player.powerups['5050'] || 0) <= 0) return;

        const data = HawdajData.get();
        if (data.player.powerups && data.player.powerups['5050'] > 0) {
            data.player.powerups['5050']--;
            HawdajData.save();
        }
        updateLifelineUI();

        const q = questions[currentIdx];
        const optBtns = els.options.querySelectorAll('.quiz-option');
        const wrongOptions = [];

        optBtns.forEach(btn => {
            const idx = parseInt(btn.dataset.idx);
            if (idx !== q.correct) wrongOptions.push(btn);
        });

        shuffleArrayInPlace(wrongOptions);
        wrongOptions.slice(0, 2).forEach(btn => {
            btn.classList.add('disabled');
            btn.style.opacity = '0.2';
        });

        HawdajAudio.SFX.whoosh();
        // Show powerup popup
        if (window.HawdajCelebration) {
            HawdajCelebration.show('powerup');
        }
    }

    function useSkip() {
        if (answered) return; if (!HawdajData.get().player.powerups || (HawdajData.get().player.powerups.skip || 0) <= 0) return;

        const data = HawdajData.get();
        if (data.player.powerups && data.player.powerups.skip > 0) {
            data.player.powerups.skip--;
            HawdajData.save();
        }
        updateLifelineUI();

        answered = true;
        clearInterval(timer);
        HawdajAudio.SFX.whoosh();
        const speaker = getNextSpeaker();
        HawdajAudio.playCharacter(speaker, 'powerup');

        currentIdx++;
        setTimeout(() => showQuestion(), 300);
    }

    function useHint() {
        if (answered) return; if (!HawdajData.get().player.powerups || (HawdajData.get().player.powerups.hint || 0) <= 0) return;

        const data = HawdajData.get();
        if (data.player.powerups && data.player.powerups.hint > 0) {
            data.player.powerups.hint--;
            HawdajData.save();
        }
        updateLifelineUI();

        const q = questions[currentIdx];
        if (q.hint) {
            HawdajApp.showToast(`💡 ${q.hint}`, 'info');
        } else {
            HawdajApp.showToast('💡 لا يوجد تلميح لهذا السؤال', 'info');
        }
        HawdajAudio.SFX.tap();
        const speaker = getNextSpeaker();
        HawdajAudio.playCharacter(speaker, 'powerup');
    }

    function updateLifelineUI() {
        els.count5050 && (els.count5050.textContent = lifelines.fiftyFifty);
        els.countSkip && (els.countSkip.textContent = lifelines.skip);
        els.countHint && (els.countHint.textContent = lifelines.hint);

        if (els.lifeline5050) els.lifeline5050.classList.toggle('used', lifelines.fiftyFifty <= 0);
        if (els.lifelineSkip) els.lifelineSkip.classList.toggle('used', lifelines.skip <= 0);
        if (els.lifelineHint) els.lifelineHint.classList.toggle('used', lifelines.hint <= 0);
    }

    function cleanup() {
        clearInterval(timer);
        answered = true;
    }

    // Utility
    function shuffleArray(arr) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    function shuffleArrayInPlace(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    }

    function endGame() {
        clearInterval(timer);

        // Save score
        HawdajData.addScore(score, 'quiz');
        // Track competition progress
        if (window.HawdajApp && HawdajApp.trackCompetitionGameCompletion) {
            HawdajApp.trackCompetitionGameCompletion('quiz');
        }
        const data = HawdajData.get();
        if (bestStreak > data.player.bestStreak) {
            data.player.bestStreak = bestStreak;
            HawdajData.save();
        }

        // Daily task triggers
        if (window.completeDailyTask) {
            window.completeDailyTask('quiz_play');
            if (bestStreak >= 3) window.completeDailyTask('quiz_streak3');
            if (score >= 50) window.completeDailyTask('score_50');
        }

        // Update results screen
        document.getElementById('results-score').textContent = score;
        document.getElementById('stat-correct').textContent = correctCount;
        document.getElementById('stat-wrong').textContent = wrongCount;
        document.getElementById('stat-streak').textContent = bestStreak;

        // Stars
        const starRatio = correctCount / questions.length;
        const starsEarned = starRatio >= 0.9 ? 3 : starRatio >= 0.6 ? 2 : starRatio >= 0.3 ? 1 : 0;
        const stars = document.querySelectorAll('#result-stars .star');
        stars.forEach((star, i) => {
            star.className = 'star';
            if (i < starsEarned) {
                setTimeout(() => {
                    star.classList.add('earned');
                    HawdajAudio.SFX.star();
                }, 500 + i * 400);
            }
        });

        // Title
        const titles = ['حاول مرة أخرى!', 'لا بأس!', 'جيد! 👍', 'أحسنت! 🌟', 'ممتاز! 🏆'];
        const titleIdx = starsEarned === 0 ? (correctCount > 0 ? 1 : 0) : starsEarned + 1;
        document.getElementById('results-title').textContent = titles[titleIdx];

        // Navigate and celebrate
        HawdajApp.navigate('quiz-results');

        // Final game audio reaction
        const speaker = getNextSpeaker();
        if (starsEarned >= 2) {
            HawdajAudio.SFX.victory();
            if (HawdajAudio.SFX.applause) HawdajAudio.SFX.applause();
            HawdajAudio.playCharacter(speaker, 'win').then(played => {
                if (!played) HawdajAudio.playCharacter(speaker, 'cheer');
            });
            setTimeout(() => HawdajEffects.celebrationBurst(), 300);
            setTimeout(() => HawdajEffects.confetti(window.innerWidth / 2, window.innerHeight / 2), 600); // More effects
        } else {
            HawdajAudio.SFX.wrong();
            HawdajAudio.playCharacter(speaker, 'lose').then(played => {
                if (!played) HawdajAudio.playCharacter(speaker, 'sad');
            });
        }
    }

    // Lifelines
    function useFiftyFifty() {
        if (answered) return; const activeOpts = els.options.querySelectorAll('.quiz-option:not(.disabled)'); if (activeOpts.length <= 2) return; if (!HawdajData.get().player.powerups || (HawdajData.get().player.powerups['5050'] || 0) <= 0) return;

        const data = HawdajData.get();
        if (data.player.powerups && data.player.powerups['5050'] > 0) {
            data.player.powerups['5050']--;
            HawdajData.save();
        }
        updateLifelineUI();

        const q = questions[currentIdx];
        const optBtns = els.options.querySelectorAll('.quiz-option');
        const wrongOptions = [];

        optBtns.forEach(btn => {
            const idx = parseInt(btn.dataset.idx);
            if (idx !== q.correct) wrongOptions.push(btn);
        });

        shuffleArrayInPlace(wrongOptions);
        wrongOptions.slice(0, 2).forEach(btn => {
            btn.classList.add('disabled', 'wrong');
            btn.style.transition = 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            setTimeout(() => {
                btn.style.transform = 'scale(0) rotate(-15deg)';
                btn.style.opacity = '0';
            }, 600);
        });

        HawdajAudio.SFX.whoosh();
        // Show powerup popup
        if (window.HawdajCelebration) {
            HawdajCelebration.show('powerup');
        }
    }

    function useSkip() {
        if (answered) return; if (!HawdajData.get().player.powerups || (HawdajData.get().player.powerups.skip || 0) <= 0) return;

        const data = HawdajData.get();
        if (data.player.powerups && data.player.powerups.skip > 0) {
            data.player.powerups.skip--;
            HawdajData.save();
        }
        updateLifelineUI();

        answered = true;
        clearInterval(timer);
        HawdajAudio.SFX.whoosh();
        const speaker = getNextSpeaker();
        HawdajAudio.playCharacter(speaker, 'powerup');

        currentIdx++;
        setTimeout(() => showQuestion(), 300);
    }

    function useHint() {
        if (answered) return; if (!HawdajData.get().player.powerups || (HawdajData.get().player.powerups.hint || 0) <= 0) return;

        const data = HawdajData.get();
        if (data.player.powerups && data.player.powerups.hint > 0) {
            data.player.powerups.hint--;
            HawdajData.save();
        }
        updateLifelineUI();

        const q = questions[currentIdx];
        if (q.hint) {
            HawdajApp.showToast(`💡 ${q.hint}`, 'info');
        } else {
            HawdajApp.showToast('💡 لا يوجد تلميح لهذا السؤال', 'info');
        }
        HawdajAudio.SFX.tap();
        const speaker = getNextSpeaker();
        HawdajAudio.playCharacter(speaker, 'powerup');
    }

    function updateLifelineUI() {
        els.count5050 && (els.count5050.textContent = lifelines.fiftyFifty);
        els.countSkip && (els.countSkip.textContent = lifelines.skip);
        els.countHint && (els.countHint.textContent = lifelines.hint);

        if (els.lifeline5050) els.lifeline5050.classList.toggle('used', lifelines.fiftyFifty <= 0);
        if (els.lifelineSkip) els.lifelineSkip.classList.toggle('used', lifelines.skip <= 0);
        if (els.lifelineHint) els.lifelineHint.classList.toggle('used', lifelines.hint <= 0);
    }

    function cleanup() {
        clearInterval(timer);
        answered = true;
    }

    // Utility
    function shuffleArray(arr) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    function shuffleArrayInPlace(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    function addTime(seconds) {
        timeLeft += seconds;
        updateTimerDisplay();
    }

    function stopTimer() { clearInterval(timer); }
    function resumeTimer() {
        timer = setInterval(() => {
            timeLeft--;
            updateTimerDisplay();
            if (timeLeft <= 5 && timeLeft > 0) {
                HawdajAudio.intenseTick();
                els.timerCircle.classList.add('warning');
            }
            if (timeLeft <= 0) {
                clearInterval(timer);
                HawdajAudio.stopChallengeBg();
                HawdajAudio.SFX.timeUp();
                handleTimeout();
            }
        }, 1000);
    }

    function startCustomQuiz(customQuestionsArray) {
        cacheDom();
        category = 'custom';
        episodeNum = null;

        questions = shuffleArray([...customQuestionsArray]);

        if (questions.length === 0) {
            HawdajApp.showToast('لا توجد أسئلة متاحة!', 'error');
            HawdajApp.navigate('main-menu');
            return;
        }

        currentIdx = 0;
        score = 0;
        streak = 0;
        bestStreak = 0;
        correctCount = 0;
        wrongCount = 0;

        const data = HawdajData.get();
        TIMER_TOTAL = 15;
        if (data.player.activeCompetitionId) {
            const c = data.competitions.find(x => x.id === data.player.activeCompetitionId);
            if (c && c.quizTime) TIMER_TOTAL = parseInt(c.quizTime) || 15;
        }
        const pts = data.player.powerups || {};
        lifelines = { fiftyFifty: pts['5050'] || 0, skip: pts.skip || 0, hint: pts.hint || 0 };

        updateLifelineUI();

        HawdajApp.navigate('quiz-game');

        els.charAzzam.src = HawdajData.getCharacterPose('azzam', 'happy') || 'assets/char/azzam.jpeg';
        els.charJadel.src = HawdajData.getCharacterPose('jadel', 'talking') || 'assets/char/El jadel.jpeg';

        const introAudio = HawdajAudio.getRandomAudioPath('jadel', 'intro_quiz');
        HawdajDialogue.showIntro(
            "أهلاً بك في التحدي المخصص! أجب بسرعة لتكسب النقاط!",
            introAudio,
            () => {
                els.charAzzam.src = HawdajData.getCharacterPose('azzam', 'thinking') || 'assets/char/azzam.jpeg';
                els.charJadel.src = HawdajData.getCharacterPose('jadel', 'thinking') || 'assets/char/El jadel.jpeg';
                showQuestion();
            }
        );
    }

    function showRoundOverlay(roundNum, onComplete) {
        // Play round sound
        if (window.HawdajAudio && HawdajAudio.SFX.levelUp) {
            HawdajAudio.SFX.levelUp();
        }

        // Create overlay element
        const overlay = document.createElement('div');
        overlay.id = 'round-start-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: linear-gradient(135deg, rgba(7, 59, 48, 0.95), rgba(11, 110, 79, 0.97));
            z-index: 10002;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: opacity 0.5s ease;
            backdrop-filter: blur(15px);
            -webkit-backdrop-filter: blur(15px);
        `;

        overlay.innerHTML = `
            <div style="
                text-align: center;
                padding: 30px;
                border-radius: 28px;
                border: 4px solid #F4A623;
                background: #FFFEF7;
                box-shadow: 0 15px 40px rgba(0,0,0,0.5), 0 0 60px rgba(244, 166, 35, 0.2);
                max-width: 85vw;
                width: 320px;
                position: relative;
                animation: celebCardIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.5) both;
            ">
                <!-- Inner dashed border for premium look -->
                <div style="
                    position: absolute;
                    inset: 6px;
                    border: 2px dashed rgba(244, 166, 35, 0.5);
                    border-radius: 22px;
                    pointer-events: none;
                "></div>

                <!-- Animated sparkles -->
                <div style="font-size: 3rem; margin-bottom: 12px; animation: pulse 1.5s infinite;">🏆</div>

                <h2 style="
                    font-family: 'Lalezar', cursive;
                    font-size: 2.8rem;
                    color: #0B6E4F;
                    margin: 0 0 8px 0;
                    text-shadow: 0 2px 4px rgba(0,0,0,0.1);
                ">الجولة ${roundNum === 1 ? 'الأولى' : roundNum === 2 ? 'الثانية' : roundNum === 3 ? 'الثالثة' : roundNum}</h2>
                
                <p style="
                    font-family: 'Changa', sans-serif;
                    font-size: 1.1rem;
                    color: #FF8F00;
                    margin: 0;
                    font-weight: 700;
                ">استعد للأسئلة! 🎯</p>
                
                <!-- Countdown or quick text -->
                <div id="round-countdown" style="
                    font-size: 3.5rem;
                    font-weight: 900;
                    color: #0B6E4F;
                    margin-top: 15px;
                    animation: pulse 1s infinite;
                    text-shadow: 0 0 10px rgba(11, 110, 79, 0.2);
                ">3</div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Fade in
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
        });

        // Simple countdown logic: 3 -> 2 -> 1 -> انطلق! -> Go
        let count = 3;
        const countdownEl = overlay.querySelector('#round-countdown');
        const interval = setInterval(() => {
            count--;
            if (count === 2) {
                countdownEl.textContent = '2';
                if (window.HawdajAudio) HawdajAudio.SFX.tick();
            } else if (count === 1) {
                countdownEl.textContent = '1';
                if (window.HawdajAudio) HawdajAudio.SFX.tick();
            } else if (count === 0) {
                countdownEl.textContent = 'انطلق! 🚀';
                if (window.HawdajAudio) HawdajAudio.SFX.correct();
                clearInterval(interval);
                
                // Fade out after a short pause
                setTimeout(() => {
                    overlay.style.opacity = '0';
                    setTimeout(() => {
                        overlay.remove();
                        onComplete();
                    }, 500);
                }, 800);
            }
        }, 800);
    }

    return {
        startGame, startCustomQuiz, selectAnswer, cleanup,
        useFiftyFifty, useSkip, useHint,
        addTime, stopTimer, resumeTimer
    };
})();

window.QuizGame = QuizGame;
