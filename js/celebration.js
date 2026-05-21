/* ============================================
   HAWDAJ — Character Reaction System v3
   Direct file paths for reliable pose loading
   ============================================ */

const HawdajCelebration = (() => {
    let lastCharacter = 'jadel';

    function getNextChar() {
        lastCharacter = lastCharacter === 'azzam' ? 'jadel' : 'azzam';
        return lastCharacter;
    }

    // Direct file paths for each pose
    const charPoses = {
        azzam: {
            happy:    encodeURI('assets/char/وضعيات عزام/حماس.jpeg'),
            sad:      encodeURI('assets/char/وضعيات عزام/حزين.jpeg'),
            thinking: encodeURI('assets/char/وضعيات عزام/تفكير.jpeg'),
            talking:  encodeURI('assets/char/وضعيات عزام/يتكلم.jpeg'),
            welcome:  encodeURI('assets/char/وضعيات عزام/ترحيب.jpeg'),
        },
        jadel: {
            happy:    encodeURI('assets/char/وضعيات الجادل/حماس.jpeg'),
            sad:      encodeURI('assets/char/وضعيات الجادل/حزين.jpeg'),
            thinking: encodeURI('assets/char/وضعيات الجادل/تفكير.jpeg'),
            talking:  encodeURI('assets/char/وضعيات الجادل/تتكلم.jpeg'),
            welcome:  encodeURI('assets/char/وضعيات الجادل/ترحيب.jpeg'),
        }
    };

    function getCharImg(charName, pose) {
        return charPoses[charName]?.[pose] || charPoses[charName]?.welcome || '';
    }

    const messages = {
        correct: [
            'يا بطل! إجابة صحيحة! 🔥',
            'ممتاز! أنت عبقري! 🧠✨',
            'أحسنت! كمّل كده! 💪',
            'رهيب!! كده صح! 🎯',
            'برافو عليك! 🌟',
            'يا سلام! مظبوطة! 🏆',
            'واو! أنت فنان! 🎨',
            'ما شاء الله عليك! 🌙',
        ],
        streak: [
            '🔥🔥 سلسلة انتصارات! مافيش زيّك!',
            '💥 ما شاء الله! إجابات صح ورا بعض!',
            '🌟 خرافي! كمّل ولا تقف!',
            '🏆 أنت على نار! يا بطل!',
        ],
        wrong: [
            'لا تقلق! المرة الجاية هتجيبها! 💪',
            'حاول تاني يا بطل! 🌟',
            'مش مشكلة! كل واحد بيغلط! 😊',
            'ركّز شوية! أنت تقدر! 🎯',
        ],
        timeout: [
            '⏰ الوقت خلص! لازم نسرّع!',
            '⏰ يلّا بسرعة المرة الجاية!',
            '⏰ الوقت بيجري! ركّز!',
        ],
        timeWarning: [
            '⏰ بسرعة! الوقت بيخلص!',
            '🏃 يلّا يلّا! فاضل وقت قليل!',
            '⚡ أسرع يا بطل!',
        ],
        powerup: [
            'فكرة ذكية! خلّيني أساعدك! 💡',
            'خطوة موفقة يا بطل! 🎯',
            'استخدام ذكي للمساعدة! ⚡',
        ],
        welcome: [
            'أهلاً يا بطل! مستعد للتحدي؟ 🌟',
            'مرحباً! يلّا نلعب ونتعلم! 🎮',
            'أهلاً بيك! وحشتنا! 🌙',
        ],
        map: [
            '🗺️ برافو! اكتشفت منطقة جديدة!',
            '📍 ممتاز! تعرف جغرافيا!',
            '🌍 كمّل اكتشاف الخريطة!',
        ],
        puzzle: [
            '🧩 حلّيت البازل! شاطر!',
            '🎯 ممتاز! البازل خلص!',
            '✨ احلى حل! برافو!',
        ]
    };

    // Which pose for which event
    const poseForType = {
        correct:     'happy',   // حماس
        streak:      'happy',   // حماس
        wrong:       'sad',     // حزين
        timeout:     'sad',     // حزين
        timeWarning: 'thinking',// تفكير
        powerup:     'happy',   // حماس
        welcome:     'welcome', // ترحيب
        map:         'happy',   // حماس
        puzzle:      'happy',   // حماس
    };

    const colorSchemes = {
        correct:     { bg1: '#2ecc71', bg2: '#27ae60', glow: 'rgba(46,204,113,0.4)' },
        streak:      { bg1: '#f39c12', bg2: '#e67e22', glow: 'rgba(243,156,18,0.4)' },
        wrong:       { bg1: '#e74c3c', bg2: '#c0392b', glow: 'rgba(231,76,60,0.4)' },
        timeout:     { bg1: '#e74c3c', bg2: '#c0392b', glow: 'rgba(231,76,60,0.4)' },
        timeWarning: { bg1: '#f39c12', bg2: '#e67e22', glow: 'rgba(243,156,18,0.4)' },
        powerup:     { bg1: '#3498db', bg2: '#2980b9', glow: 'rgba(52,152,219,0.4)' },
        welcome:     { bg1: '#9b59b6', bg2: '#8e44ad', glow: 'rgba(155,89,182,0.4)' },
        map:         { bg1: '#1abc9c', bg2: '#16a085', glow: 'rgba(26,188,156,0.4)' },
        puzzle:      { bg1: '#e67e22', bg2: '#d35400', glow: 'rgba(230,126,34,0.4)' },
    };

    const durations = {
        correct: 1800, streak: 2500, wrong: 2000,
        timeout: 2000, timeWarning: 2000, powerup: 2800,
        welcome: 2800, map: 2200, puzzle: 2200,
    };

    function show(type = 'correct', extraInfo = {}) {
        const charName = extraInfo.forceChar || getNextChar();
        let effectiveType = type;
        
        // Streak override
        let msgPool = messages[type] || messages.correct;
        if (type === 'correct' && extraInfo.streak >= 3) {
            msgPool = messages.streak;
            effectiveType = 'streak';
        }
        
        const pose = poseForType[effectiveType] || 'happy';
        const msg = msgPool[Math.floor(Math.random() * msgPool.length)];
        const charSrc = getCharImg(charName, pose);
        const colors = colorSchemes[effectiveType] || colorSchemes.correct;
        const duration = durations[effectiveType] || 1800;

        // Remove existing
        document.querySelectorAll('.celeb-overlay').forEach(el => el.remove());

        const overlay = document.createElement('div');
        overlay.className = 'celeb-overlay';
        overlay.innerHTML = `
            <div class="celeb-card" style="background: linear-gradient(145deg, ${colors.bg1}f0, ${colors.bg2}f5); box-shadow: 0 15px 50px rgba(0,0,0,0.4), 0 0 60px ${colors.glow};">
                <div class="celeb-sparkles"></div>
                <div class="celeb-char-wrapper">
                    <img src="${charSrc}" alt="${charName}" class="celeb-char-img"
                         onerror="this.src='assets/char/${charName === 'azzam' ? 'azzam' : 'El jadel'}.jpeg'">
                    <div class="celeb-char-ring"></div>
                </div>
                <div class="celeb-text-area">
                    <div class="celeb-msg">${msg}</div>
                    ${extraInfo.points ? `<div class="celeb-points">+${extraInfo.points} نقطة ⭐</div>` : ''}
                    ${extraInfo.streak >= 3 ? `<div class="celeb-streak">🔥 سلسلة ×${extraInfo.streak}</div>` : ''}
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Character audio
        if (window.HawdajAudio && HawdajAudio.playCharacter) {
            const audioType = (effectiveType === 'correct' || effectiveType === 'streak' || effectiveType === 'map' || effectiveType === 'puzzle' || effectiveType === 'powerup') 
                ? 'cheer' 
                : (effectiveType === 'wrong' || effectiveType === 'timeout') 
                    ? 'sad' 
                    : (effectiveType === 'timeWarning') ? 'timeout' : 'welcome';
            HawdajAudio.playCharacter(charName, audioType);
        }

        // Auto dismiss
        setTimeout(() => {
            overlay.style.opacity = '0';
            overlay.style.transition = 'opacity 0.4s ease';
            setTimeout(() => overlay.remove(), 450);
        }, duration);
    }

    return { show, getNextChar };
})();

window.HawdajCelebration = HawdajCelebration;
