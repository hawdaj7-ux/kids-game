/* ============================================
   HAWDAJ GAME — Intro Dialogue System
   ============================================ */

const HawdajDialogue = (() => {
    let container = null;
    let jadelImgEl = null;
    let azzamImgEl = null;
    let textEl = null;
    let nextBtn = null;
    let audioObj = null;
    let onCompleteCallback = null;

    function init() {
        if (document.getElementById('dialogue-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'dialogue-overlay';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0,0,0,0.6); z-index: 10000;
            display: none; align-items: center; justify-content: center;
            transition: opacity 0.3s;
        `;

        const wrapper = document.createElement('div');
        wrapper.style.cssText = `
            position: relative; width: 90%; max-width: 800px;
            display: flex; flex-direction: column; align-items: center; justify-content: flex-end;
            height: auto; max-height: 75vh; pointer-events: none;
        `;
        overlay.appendChild(wrapper);

        // Speech Bubble (Cloud style)
        const bubble = document.createElement('div');
        bubble.style.cssText = `
            background: #fff; border: 4px solid var(--accent-primary); border-radius: 40px;
            padding: clamp(14px, 3vw, 30px); box-shadow: 0 10px 30px rgba(0,0,0,0.4); margin-bottom: 20px;
            position: relative; text-align: center; width: clamp(260px, 75%, 500px); pointer-events: auto;
            transform: scale(0.8); opacity: 0; transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        `;
        // Bubble tail (pointing to Jadel on the left side in RTL)
        const tail = document.createElement('div');
        tail.style.cssText = `
            content: ''; position: absolute; bottom: -24px; left: 25%; right: auto;
            border-width: 25px 25px 0; border-style: solid;
            border-color: #fff transparent transparent transparent;
            display: block; width: 0; filter: drop-shadow(0px 5px 0px var(--accent-primary));
        `;
        bubble.appendChild(tail);

        textEl = document.createElement('p');
        textEl.style.cssText = 'color: #1a202c; font-size: clamp(0.85rem, 2.5vw, 1.15rem); font-weight: 800; line-height: 1.5; margin:0;';
        bubble.appendChild(textEl);

        nextBtn = document.createElement('button');
        nextBtn.textContent = 'يلا نبدأ! ▶';
        nextBtn.className = 'btn btn-primary';
        nextBtn.style.cssText = 'margin-top: 20px; font-size: var(--fs-md); padding: 10px 30px;';
        nextBtn.onclick = close;
        bubble.appendChild(nextBtn);

        wrapper.appendChild(bubble);

        // Characters container
        const charsContainer = document.createElement('div');
        charsContainer.style.cssText = `
            display: flex; justify-content: space-around; width: 100%; align-items: flex-end;
            transform: translateY(100%); transition: transform 0.5s ease-out;
        `;

        azzamImgEl = document.createElement('img');
        azzamImgEl.style.cssText = `width: clamp(120px, 35vw, 250px); max-width: 250px; object-fit: contain; filter: drop-shadow(0 10px 20px rgba(0,0,0,0.5));`;

        jadelImgEl = document.createElement('img');
        jadelImgEl.style.cssText = `width: clamp(130px, 38vw, 280px); max-width: 280px; object-fit: contain; filter: drop-shadow(0 10px 20px rgba(0,0,0,0.5));`;

        charsContainer.appendChild(azzamImgEl);
        charsContainer.appendChild(jadelImgEl);

        wrapper.appendChild(charsContainer);
        document.body.appendChild(overlay);
        container = overlay;
    }

    /**
     * Show game intro dialogue
     * @param {string} text The text Jadel will say
     * @param {string} audioPath The audio file path
     * @param {Function} onComplete Callback when user clicks "Start"
     */
    function showIntro(text, audioPath, onComplete = null) {
        if (!container) init();
        onCompleteCallback = onComplete;

        // Set Images
        jadelImgEl.src = HawdajData.getCharacterPose('jadel', 'talking') || 'assets/char/El jadel.jpeg';
        azzamImgEl.src = HawdajData.getCharacterPose('azzam', 'happy') || 'assets/char/azzam.jpeg';

        container.style.display = 'flex';
        // forced reflow
        container.offsetHeight;
        container.style.opacity = '1';

        // Animate in
        const wrapper = container.children[0];
        const bubble = wrapper.children[0];
        const charsContainer = wrapper.children[1];

        charsContainer.style.transform = 'translateY(0)';
        setTimeout(() => {
            bubble.style.transform = 'scale(1)';
            bubble.style.opacity = '1';
            typeText(text);

            if (audioPath) {
                audioObj = new Audio(audioPath);
                audioObj.play().catch(e => console.warn('Intro audio failed', e));
            }
        }, 300);
    }

    function typeText(text) {
        textEl.textContent = '';
        let i = 0;
        nextBtn.style.display = 'none';

        const typeInterval = setInterval(() => {
            textEl.textContent += text.charAt(i);
            i++;
            if (i >= text.length) {
                clearInterval(typeInterval);
                nextBtn.style.display = 'inline-block';
            }
        }, 40);
    }

    function close() {
        if (!container) return;
        if (audioObj) {
            audioObj.pause();
            audioObj = null;
        }
        HawdajAudio.SFX.tap();

        const wrapper = container.children[0];
        const bubble = wrapper.children[0];
        const charsContainer = wrapper.children[1];

        bubble.style.transform = 'scale(0.8)';
        bubble.style.opacity = '0';
        charsContainer.style.transform = 'translateY(100%)';
        container.style.opacity = '0';

        setTimeout(() => {
            container.style.display = 'none';
            if (onCompleteCallback) onCompleteCallback();
        }, 400);
    }

    return {
        init,
        showIntro,
        close
    };
})();

window.addEventListener('load', () => HawdajDialogue.init());
