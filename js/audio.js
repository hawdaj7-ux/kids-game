/* ============================================
   HAWDAJ GAME — Audio System (Web Audio API)
   ============================================ */

const HawdajAudio = (() => {
    let ctx = null;
    let muted = false;
    let musicMuted = localStorage.getItem('hawdaj_music_muted') === 'true';
    let globalVolume = 0.8;
    let bgMusicNodes = null;

    function getCtx() {
        if (!ctx) {
            ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (ctx.state === 'suspended') ctx.resume();
        return ctx;
    }

    function playTone(freq, duration, type = 'sine', volume = 0.3) {
        if (muted) return;
        try {
            const c = getCtx();
            const osc = c.createOscillator();
            const gain = c.createGain();
            osc.type = type;
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(volume * globalVolume, c.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
            osc.connect(gain);
            gain.connect(c.destination);
            osc.start(c.currentTime);
            osc.stop(c.currentTime + duration);
        } catch (e) { }
    }

    function playNotes(notes, interval = 0.12) {
        if (muted) return;
        notes.forEach((n, i) => {
            setTimeout(() => playTone(n.freq, n.dur || 0.2, n.type || 'sine', n.vol || 0.25), i * interval * 1000);
        });
    }

    // Sound Effects
    let challengeBaseNode = null;
    let challengeGainNode = null;

    function startChallengeBg() {
        if (muted) return;
        stopChallengeBg();
        try {
            const c = getCtx();
            // Smoother synth drone instead of sawtooth
            challengeBaseNode = c.createOscillator();
            challengeBaseNode.type = 'sine';
            challengeBaseNode.frequency.value = 110;

            const lfo = c.createOscillator();
            lfo.type = 'sine';
            lfo.frequency.value = 2; // Pulsing speed

            const lfoGain = c.createGain();
            lfoGain.gain.value = 5;
            lfo.connect(lfoGain);
            lfoGain.connect(challengeBaseNode.frequency);

            challengeGainNode = c.createGain();
            challengeGainNode.gain.setValueAtTime(0.015, c.currentTime);

            challengeBaseNode.connect(challengeGainNode);
            challengeGainNode.connect(c.destination);

            lfo.start();
            challengeBaseNode.start();

            challengeBaseNode.lfo = lfo;
        } catch (e) { }
    }

    function stopChallengeBg() {
        if (challengeBaseNode) {
            try {
                if (challengeBaseNode.lfo) challengeBaseNode.lfo.stop();
                challengeBaseNode.stop();
                challengeBaseNode.disconnect();
                if (challengeGainNode) challengeGainNode.disconnect();
            } catch (e) { }
            challengeBaseNode = null;
            challengeGainNode = null;
        }
    }

    function intenseTick() {
        playTone(1000, 0.05, 'square', 0.1);
        setTimeout(() => playTone(800, 0.05, 'triangle', 0.1), 50);
    }

    // ── Background Music System ──
    let bgMusicScheduler = null;

    function startBgMusic() {
        if (musicMuted) return;
        if (bgMusicNodes) return; // Already playing, don't overlap!
        stopBgMusic();
        try {
            const ac = getCtx();
            if (!ac) return;

            const masterGain = ac.createGain();
            masterGain.gain.value = 0.12;
            masterGain.connect(ac.destination);
            
            const comp = ac.createDynamicsCompressor();
            comp.connect(masterGain);

            bgMusicNodes = { gain: masterGain, comp: comp };

            const tempo = 110;
            const beatDur = 60 / tempo;

            // Musical notes (extended Arabic/Eastern scale for variety)
            const notes = {
                C3: 130.81, D3: 146.83, Eb3: 155.56, E3: 164.81, F3: 174.61, G3: 196.00, Ab3: 207.65, A3: 220.00, Bb3: 233.08, B3: 246.94,
                C4: 261.63, D4: 293.66, Eb4: 311.13, E4: 329.63, F4: 349.23, G4: 392.00, Ab4: 415.30, A4: 440.00, Bb4: 466.16, B4: 493.88,
                C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99
            };

            function playNote(freq, startTime, dur, vol, type = 'triangle', dest = comp) {
                const osc = ac.createOscillator();
                const g = ac.createGain();
                osc.type = type;
                osc.frequency.setValueAtTime(freq, startTime);
                g.gain.setValueAtTime(0.001, startTime);
                g.gain.linearRampToValueAtTime(vol, startTime + 0.02);
                g.gain.linearRampToValueAtTime(vol * 0.7, startTime + dur * 0.6);
                g.gain.linearRampToValueAtTime(0.001, startTime + dur);
                osc.connect(g);
                g.connect(dest);
                osc.start(startTime);
                osc.stop(startTime + dur + 0.05);
            }

            function playPercussion(startTime, type = 'kick') {
                const osc = ac.createOscillator();
                const g = ac.createGain();
                if (type === 'kick') {
                    osc.frequency.setValueAtTime(150, startTime);
                    osc.frequency.exponentialRampToValueAtTime(40, startTime + 0.1);
                    g.gain.setValueAtTime(0.5, startTime);
                    g.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);
                    osc.type = 'sine';
                    osc.connect(g); g.connect(comp);
                    osc.start(startTime); osc.stop(startTime + 0.3);
                } else if (type === 'hihat') {
                    const bufferSize = ac.sampleRate * 0.03;
                    const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
                    const data = buffer.getChannelData(0);
                    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
                    const noise = ac.createBufferSource();
                    noise.buffer = buffer;
                    const hiG = ac.createGain();
                    hiG.gain.setValueAtTime(0.08, startTime);
                    hiG.gain.exponentialRampToValueAtTime(0.001, startTime + 0.05);
                    const hiF = ac.createBiquadFilter();
                    hiF.type = 'highpass'; hiF.frequency.value = 8000;
                    noise.connect(hiF); hiF.connect(hiG); hiG.connect(comp);
                    noise.start(startTime); noise.stop(startTime + 0.06);
                    return;
                } else if (type === 'snare') {
                    const bufferSize2 = ac.sampleRate * 0.08;
                    const buffer2 = ac.createBuffer(1, bufferSize2, ac.sampleRate);
                    const d2 = buffer2.getChannelData(0);
                    for (let i = 0; i < bufferSize2; i++) d2[i] = Math.random() * 2 - 1;
                    const sn = ac.createBufferSource();
                    sn.buffer = buffer2;
                    const snG = ac.createGain();
                    snG.gain.setValueAtTime(0.15, startTime);
                    snG.gain.exponentialRampToValueAtTime(0.001, startTime + 0.12);
                    sn.connect(snG); snG.connect(comp);
                    sn.start(startTime); sn.stop(startTime + 0.15);
                    return;
                }
            }

            // 4 different sections for variety (32 beats total = much longer before repeat)
            function scheduleLoop(loopStart) {
                const bd = beatDur;
                // Section A - Upbeat melody (8 beats)
                const melA = [notes.C4, notes.E4, notes.G4, notes.C5, notes.B4, notes.G4, notes.E4, notes.D4];
                const bassA = [notes.C3, notes.C3, notes.E3, notes.E3, notes.G3, notes.G3, notes.C3, notes.G3];
                for (let i = 0; i < 8; i++) {
                    const t = loopStart + i * bd;
                    playNote(melA[i], t, bd * 0.8, 0.25, 'triangle');
                    playNote(bassA[i], t, bd * 0.9, 0.15, 'sine');
                    if (i % 2 === 0) playPercussion(t, 'kick');
                    if (i % 2 === 1) playPercussion(t, 'snare');
                    playPercussion(t + bd * 0.5, 'hihat');
                }

                // Section B - Eastern flavor (8 beats)
                const melB = [notes.D4, notes.F4, notes.Ab4, notes.Bb4, notes.Ab4, notes.G4, notes.F4, notes.E4];
                const bassB = [notes.D3, notes.D3, notes.F3, notes.F3, notes.Ab3, notes.Ab3, notes.Bb3, notes.Bb3];
                for (let i = 0; i < 8; i++) {
                    const t = loopStart + (8 + i) * bd;
                    playNote(melB[i], t, bd * 0.7, 0.22, 'triangle');
                    playNote(bassB[i], t, bd * 0.9, 0.12, 'sine');
                    if (i % 4 === 0) playPercussion(t, 'kick');
                    if (i % 4 === 2) playPercussion(t, 'snare');
                    if (i % 2 === 0) playPercussion(t + bd * 0.25, 'hihat');
                    playPercussion(t + bd * 0.5, 'hihat');
                }

                // Section C - Playful (8 beats)
                const melC = [notes.G4, notes.A4, notes.B4, notes.C5, notes.D5, notes.C5, notes.A4, notes.G4];
                const bassC = [notes.G3, notes.G3, notes.A3, notes.A3, notes.C3, notes.C3, notes.G3, notes.G3];
                for (let i = 0; i < 8; i++) {
                    const t = loopStart + (16 + i) * bd;
                    playNote(melC[i], t, bd * 0.6, 0.2, 'square');
                    playNote(bassC[i], t, bd * 0.9, 0.1, 'sine');
                    playPercussion(t, i % 2 === 0 ? 'kick' : 'snare');
                    playPercussion(t + bd * 0.5, 'hihat');
                }

                // Section D - Calm resolution (8 beats)
                const melD = [notes.E4, notes.D4, notes.C4, notes.E4, notes.F4, notes.E4, notes.D4, notes.C4];
                const bassD = [notes.C3, notes.C3, notes.E3, notes.E3, notes.F3, notes.F3, notes.C3, notes.C3];
                for (let i = 0; i < 8; i++) {
                    const t = loopStart + (24 + i) * bd;
                    playNote(melD[i], t, bd * 0.85, 0.18, 'triangle');
                    playNote(bassD[i], t, bd * 0.9, 0.1, 'sine');
                    if (i % 4 === 0) playPercussion(t, 'kick');
                    playPercussion(t + bd * 0.5, 'hihat');
                }
            }

            const loopDuration = 32 * beatDur;
            let loopStart = ac.currentTime + 0.1;
            scheduleLoop(loopStart);
            bgMusicScheduler = setInterval(() => {
                const now = ac.currentTime;
                if (now > loopStart + loopDuration - 2) {
                    loopStart += loopDuration;
                    scheduleLoop(loopStart);
                }
            }, 1000);
        } catch (e) { console.warn('BG Music error:', e); }
    }

    function stopBgMusic() {
        if (!bgMusicNodes) return;
        try {
            clearInterval(bgMusicNodes.scheduler || bgMusicScheduler);
            bgMusicScheduler = null;
            // Disconnect IMMEDIATELY — no fade, instant mute
            try { bgMusicNodes.comp.disconnect(); } catch(e) {}
            try { bgMusicNodes.gain.disconnect(); } catch(e) {}
            try { bgMusicNodes.masterGain.disconnect(); } catch(e) {}
        } catch (e) {}
        bgMusicNodes = null;
    }

    function toggleMusic() {
        musicMuted = !musicMuted;
        localStorage.setItem('hawdaj_music_muted', String(musicMuted));
        if (musicMuted) {
            stopBgMusic();
        } else {
            startBgMusic();
        }
        return musicMuted;
    }

    const SFX = {
        tap() {
            playTone(800, 0.08, 'sine', 0.15);
        },

        correct() {
            playNotes([
                { freq: 523, dur: 0.15 },
                { freq: 659, dur: 0.15 },
                { freq: 784, dur: 0.3 }
            ], 0.1);
        },

        wrong() {
            playNotes([
                { freq: 300, dur: 0.2, type: 'square', vol: 0.15 },
                { freq: 250, dur: 0.3, type: 'square', vol: 0.1 }
            ], 0.15);
        },

        streak() {
            playNotes([
                { freq: 523, dur: 0.1 },
                { freq: 659, dur: 0.1 },
                { freq: 784, dur: 0.1 },
                { freq: 1047, dur: 0.25 }
            ], 0.08);
        },

        tick() {
            playTone(1200, 0.03, 'sine', 0.08);
        },

        timeLow() {
            playNotes([
                { freq: 400, dur: 0.1, type: 'square', vol: 0.12 },
                { freq: 350, dur: 0.15, type: 'square', vol: 0.1 }
            ], 0.2);
        },

        timeUp() {
            playNotes([
                { freq: 500, dur: 0.2, type: 'sawtooth', vol: 0.15 },
                { freq: 400, dur: 0.2, type: 'sawtooth', vol: 0.15 },
                { freq: 300, dur: 0.4, type: 'sawtooth', vol: 0.12 }
            ], 0.15);
        },

        victory() {
            playNotes([
                { freq: 523, dur: 0.15 },
                { freq: 587, dur: 0.15 },
                { freq: 659, dur: 0.15 },
                { freq: 784, dur: 0.15 },
                { freq: 1047, dur: 0.4 }
            ], 0.12);
        },

        puzzleSnap() {
            playTone(600, 0.06, 'sine', 0.2);
            setTimeout(() => playTone(900, 0.08, 'sine', 0.15), 60);
        },

        puzzleComplete() {
            playNotes([
                { freq: 392, dur: 0.12 },
                { freq: 523, dur: 0.12 },
                { freq: 659, dur: 0.12 },
                { freq: 784, dur: 0.12 },
                { freq: 1047, dur: 0.12 },
                { freq: 1319, dur: 0.35 }
            ], 0.1);
        },

        mapClick() {
            playNotes([
                { freq: 700, dur: 0.08 },
                { freq: 900, dur: 0.12 }
            ], 0.08);
        },

        levelUp() {
            playNotes([
                { freq: 440, dur: 0.1 },
                { freq: 554, dur: 0.1 },
                { freq: 659, dur: 0.1 },
                { freq: 880, dur: 0.3 }
            ], 0.1);
        },

        error() {
            playTone(200, 0.3, 'sawtooth', 0.1);
        },

        whoosh() {
            if (muted) return;
            try {
                const c = getCtx();
                const osc = c.createOscillator();
                const gain = c.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(400, c.currentTime);
                osc.frequency.exponentialRampToValueAtTime(100, c.currentTime + 0.2);
                gain.gain.setValueAtTime(0.1, c.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.2);
                osc.connect(gain);
                gain.connect(c.destination);
                osc.start(c.currentTime);
                osc.stop(c.currentTime + 0.2);
            } catch (e) { }
        },

        star() {
            playNotes([
                { freq: 1047, dur: 0.15 },
                { freq: 1319, dur: 0.2 }
            ], 0.12);
        },

        applause() {
            if (muted) return;
            // Quick workaround: A synthesized applause using noise buffer
            const c = getCtx();
            const bufferSize = c.sampleRate * 2; // 2 seconds
            const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            const noise = c.createBufferSource();
            noise.buffer = buffer;
            const filter = c.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 1000;
            const gain = c.createGain();
            gain.gain.setValueAtTime(0.5, c.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 2);
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(c.destination);
            noise.start();
        }
    };

    // Playlists for character lines (arrays to allow random variation)
    const characterAudios = {
        'azzam_cheer': [
            encodeURI('assets/char/اصوات عزام/اصوات التشجيع/اجابة رائعة.mp3'),
            encodeURI('assets/char/اصوات عزام/اصوات التشجيع/احسنت يا بطل.mp3'),
            encodeURI('assets/char/اصوات عزام/اصوات التشجيع/انت ذكي جدا.mp3'),
            encodeURI('assets/char/اصوات عزام/اصوات التشجيع/يا سلام عليك.mp3')
        ],
        'azzam_win': [
            encodeURI('assets/char/اصوات عزام/اصوات الفوز/مبروك لقد فزت معنا بهودج رمضان! أنت عبقري!.mp3'),
            encodeURI('assets/char/اصوات عزام/اصوات الفوز/يا لك من بطل، لقد هَزمت اللعبة.mp3')
        ],
        'azzam_sad': [
            encodeURI('assets/char/اصوات عزام/أصوات الحزن/حاول مرة اخرى.mp3'),
            encodeURI('assets/char/اصوات عزام/أصوات الحزن/كادت أن تكون صحيحة، فكر جيداً.mp3'),
            encodeURI('assets/char/اصوات عزام/أصوات الحزن/لا بأس يا بطل، حاول مرة أخرى.mp3')
        ],
        'azzam_lose': [
            encodeURI('assets/char/اصوات عزام/أصوات الحزن/حاول مرة اخرى.mp3'),
            encodeURI('assets/char/اصوات عزام/أصوات الحزن/لا بأس يا بطل، حاول مرة أخرى.mp3')
        ],
        'azzam_timeout': [
            encodeURI('assets/char/اصوات عزام/اصوات انتهاء الوقت/الوقت يداهمنا يا بطل.mp3'),
            encodeURI('assets/char/اصوات عزام/اصوات انتهاء الوقت/بسرعة.mp3'),
            encodeURI('assets/char/اصوات عزام/اصوات انتهاء الوقت/يا إلهي! لقد انتهى الوقت.mp3')
        ],
        'azzam_welcome': [
            encodeURI('assets/char/اصوات عزام/اصوات الترحيب/أهلاً بك يا بطل، هل أنت مستعد للتحدي.mp3')
        ],
        'azzam_powerup': [
            encodeURI('assets/char/اصوات عزام/أصوات استخدام المساعدة/استخدام موفق للمساعدة.mp3'),
            encodeURI('assets/char/اصوات عزام/أصوات استخدام المساعدة/فكرة ذكية، دعني أساعدك!.mp3')
        ],

        // مسارات الجادل
        'jadel_cheer': [
            encodeURI('assets/char/اصوات الجادل/اصوات التشجيع/احسنتي يا بطلة.mp3'),
            encodeURI('assets/char/اصوات الجادل/اصوات التشجيع/رائعة جداً.mp3'),
            encodeURI('assets/char/اصوات الجادل/اصوات التشجيع/ما شاء الله، إجابة صحيحة.mp3')
        ],
        'jadel_win': [
            encodeURI('assets/char/اصوات الجادل/اصوات التشجيع/رائعة جداً.mp3') // fallback
        ],
        'jadel_sad': [
            encodeURI('assets/char/اصوات الجادل/اصوات الخسارة/لا تحزني، حظ أوفر المرة القادمة..mp3'),
            encodeURI('assets/char/اصوات الجادل/اصوات الخسارة/لعبت جيداً، ولكن يمكنك تحقيق نتيجة أفضل في مرة قادمة!.mp3')
        ],
        'jadel_lose': [
            encodeURI('assets/char/اصوات الجادل/اصوات الخسارة/لا تحزني، حظ أوفر المرة القادمة..mp3'),
            encodeURI('assets/char/اصوات الجادل/اصوات الخسارة/لعبت جيداً، ولكن يمكنك تحقيق نتيجة أفضل في مرة قادمة!.mp3')
        ],
        'jadel_timeout': [
            encodeURI('assets/char/اصوات الجادل/اصوات الخسارة/لا تحزني، حظ أوفر المرة القادمة..mp3')
        ],
        'jadel_welcome': [
            encodeURI('assets/char/اصوات الجادل/اصوات الترحيب/مقدمة_لعبة_الاسئلة.mp3'), // placeholder fallback
            encodeURI('assets/char/اصوات الجادل/مرحبا.mp3') // placeholder
        ],
        'jadel_powerup': [
            encodeURI('assets/char/اصوات الجادل/اصوات التشجيع/رائعة جداً.mp3')
        ],

        // مقدمات مخصصة لكل لعبة (Pop-up Intro)
        'jadel_intro_quiz': [
            encodeURI('assets/char/اصوات الجادل/اصوات الترحيب/مقدمة_لعبة_الاسئلة.mp3')
        ],
        'jadel_intro_puzzle': [
            encodeURI('assets/char/اصوات الجادل/اصوات الترحيب/مقدمة_لعبة_التركيب.mp3')
        ],
        'jadel_intro_map': [
            encodeURI('assets/char/اصوات الجادل/اصوات الترحيب/مقدمة_لعبة_الخريطة.mp3')
        ]
    };

    function playCharacter(charName, type) {
        if (muted) return Promise.resolve(false);
        const key = `${charName}_${type}`;
        const audioArray = characterAudios[key];

        if (audioArray && audioArray.length > 0) {
            // Pick a random audio src from the array
            const audioSrc = audioArray[Math.floor(Math.random() * audioArray.length)];
            console.log(`🔊 Playing character audio: ${key}`);
            return new Promise(resolve => {
                const a = new Audio(audioSrc);
                a.volume = 1.0;
                a.onended = () => resolve(true);
                a.onerror = (e) => {
                    console.error('Audio play failed:', e);
                    resolve(false);
                };
                a.play().catch(e => {
                    console.error('Audio play failed:', e);
                    resolve(false);
                });
            });
        } else {
            console.log(`⚠️ No audio found for key: ${key}`);
            return Promise.resolve(false);
        }
    }

    function playUIAudio(key) {
        if (muted) return false;
        const data = window.HawdajData ? window.HawdajData.get() : null;
        if (data && data.devSettings && data.devSettings.audio && data.devSettings.audio[key]) {
            const a = new Audio(data.devSettings.audio[key]);
            a.volume = 0.5;
            a.play().catch(() => { });
            return true;
        }
        return false;
    }

    function setVolume(vol) {
        globalVolume = Math.max(0, Math.min(1, vol));
        // Apply to bg music if playing
        if (bgMusicNodes && bgMusicNodes.gain) {
            try {
                bgMusicNodes.gain.gain.setValueAtTime(0.12 * globalVolume, getCtx().currentTime);
            } catch(e) {}
        }
    }

    function toggleMute() {
        muted = !muted;
        if (muted) stopBgMusic();
        return muted;
    }

    // Vibrate
    function vibrate(pattern = 50) {
        if (navigator.vibrate) navigator.vibrate(pattern);
    }

    function getRandomAudioPath(charName, type) {
        const key = `${charName}_${type}`;
        const audioArray = characterAudios[key];
        if (audioArray && audioArray.length > 0) {
            return audioArray[Math.floor(Math.random() * audioArray.length)];
        }
        return null;
    }

    return {
        SFX, playCharacter, playUIAudio, toggleMute, vibrate, getRandomAudioPath,
        startChallengeBg, stopChallengeBg, intenseTick,
        startBgMusic, stopBgMusic, toggleMusic, setVolume,
        isMuted: () => musicMuted,
        get muted() { return muted; },
        get isMusicMuted() { return musicMuted; }
    };
})();

