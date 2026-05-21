/* ============================================
   HAWDAJ GAME — Puzzle Game Logic
   Auto-play sequential, image-based puzzles
   ============================================ */

const PuzzleGame = (() => {
    let pieces = [];
    let gridSize = 3;
    let puzzleMode = 'slide'; // 'slide' or 'swap'
    let selectedPiece = null;
    let moves = 0;
    let timerInterval = null;
    let seconds = 0;
    let currentPuzzle = null;
    let completed = false;
    let lastPlacedJigsaw = -1;
    let puzzleQueue = [];
    let currentIndex = 0;
    let totalScore = 0;

    const els = {};

    function cacheDom() {
        els.board = document.getElementById('puzzle-board');
        els.timer = document.getElementById('puzzle-timer');
        els.moves = document.getElementById('puzzle-moves');
        els.name = document.getElementById('puzzle-name');
        els.refImg = document.getElementById('puzzle-ref-img');
        els.shuffleBtn = document.getElementById('puzzle-shuffle');
        els.nextBtn = document.getElementById('puzzle-next-btn');
    }

    function init() {
        cacheDom();
        if (els.shuffleBtn) {
            els.shuffleBtn.addEventListener('click', () => {
                if (!completed) {
                    moves = 0;
                    if (els.moves) els.moves.textContent = '0';
                    do { shufflePieces(); } while (!isSolvable() || isSolved());
                    HawdajAudio.SFX.puzzleSnap();
                    renderBoard();
                }
            });
        }

        if (els.nextBtn) {
            els.nextBtn.addEventListener('click', () => {
                HawdajAudio.SFX.tap();
                currentIndex++;
                playNextPuzzle();
            });
        }

        // Attach click listener to mode cards
        const modeCards = document.querySelectorAll('.puzzle-mode-card');
        modeCards.forEach(card => {
            card.addEventListener('click', () => {
                const mode = card.dataset.mode || 'slide';
                startSequentialPlay(mode);
            });
        });

        // renderPuzzleList is no longer needed since mode cards start the game
    }

    // Shuffle array randomly
    function shuffleArray(arr) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    function startSequentialPlay(mode) {
        const data = HawdajData.get();
        if (data.puzzles.length === 0) {
            HawdajApp.showToast('لا توجد بازلات متاحة!', 'error');
            return;
        }
        puzzleMode = mode;
        gridSize = 3; // Forces a 3x3 grid size for both modes to keep it simple but fun
        puzzleQueue = shuffleArray(data.puzzles);
        currentIndex = 0;
        totalScore = 0;

        HawdajApp.navigate('puzzle-game');
        playNextPuzzle();
    }

    function playNextPuzzle() {
        if (currentIndex >= puzzleQueue.length) {
            // All puzzles done!
            showFinalResults();
            return;
        }
        startPuzzle(puzzleQueue[currentIndex]);
    }

    function startPuzzle(puzzle) {
        cacheDom();
        currentPuzzle = puzzle;
        completed = false;
        moves = 0;
        seconds = 0;
        selectedPiece = null;
        lastPlacedJigsaw = -1;

        els.name.textContent = `${puzzle.name} (${currentIndex + 1}/${puzzleQueue.length})`;
        els.moves.textContent = '0';
        if (els.nextBtn) els.nextBtn.style.display = 'none';
        if (els.shuffleBtn) els.shuffleBtn.style.display = 'block';
        els.timer.textContent = '0:00';

        // Reset puzzle score display
        const scoreEl = document.getElementById('puzzle-score-val');
        if (scoreEl) scoreEl.textContent = totalScore;

        // Show reference image
        if (els.refImg) {
            if (puzzle.image) {
                els.refImg.src = puzzle.image;
                els.refImg.style.display = 'block';
            } else {
                els.refImg.style.display = 'none';
            }
        }

        // Add progress bar
        let progressBar = document.getElementById('puzzle-progress-bar');
        if (!progressBar) {
            progressBar = document.createElement('div');
            progressBar.id = 'puzzle-progress-bar';
            progressBar.style.cssText = 'width:100%;height:6px;background:rgba(255,255,255,0.1);border-radius:3px;overflow:hidden;margin-bottom:12px;';
            const inner = document.createElement('div');
            inner.id = 'puzzle-progress-inner';
            inner.style.cssText = 'height:100%;background:linear-gradient(90deg,var(--accent-primary),var(--accent-secondary));border-radius:3px;transition:width 0.5s ease;';
            progressBar.appendChild(inner);
            els.board?.parentNode?.insertBefore(progressBar, els.board);
        }
        const inner = document.getElementById('puzzle-progress-inner');
        if (inner) {
            inner.style.width = `${((currentIndex) / puzzleQueue.length) * 100}%`;
        }

        const az = document.getElementById('puzzle-char-azzam');
        const jd = document.getElementById('puzzle-char-jadel');
        if (az) { az.className = 'game-char-img azzam'; az.src = HawdajData.getCharacterPose('azzam', 'happy') || 'assets/char/azzam.jpeg'; }
        if (jd) { jd.className = 'game-char-img jadel'; jd.src = HawdajData.getCharacterPose('jadel', 'talking') || 'assets/char/El jadel.jpeg'; }

        generatePuzzle();
        HawdajApp.navigate('puzzle-game');

        // Show Intro Popup if playing the first puzzle in queue
        if (currentIndex === 0) {
            const introAudio = HawdajAudio.getRandomAudioPath('jadel', 'intro_puzzle');
            HawdajDialogue.showIntro(
                "هيا يا بطل، رتب قطع الصورة المبعثرة لتحصل على الصورة الكاملة. لا تنسَ الوقت!",
                introAudio,
                () => {
                    if (az) az.src = HawdajData.getCharacterPose('azzam', 'thinking') || 'assets/char/azzam.jpeg';
                    if (jd) jd.src = HawdajData.getCharacterPose('jadel', 'thinking') || 'assets/char/El jadel.jpeg';
                    startTimer();
                    HawdajAudio.SFX.tap();
                }
            );
        } else {
            if (az) az.src = HawdajData.getCharacterPose('azzam', 'thinking') || 'assets/char/azzam.jpeg';
            if (jd) jd.src = HawdajData.getCharacterPose('jadel', 'thinking') || 'assets/char/El jadel.jpeg';
            startTimer();
            HawdajAudio.SFX.tap();
        }
    }

    function generatePuzzle() {
        const total = gridSize * gridSize;
        els.board.style.direction = 'ltr';

        if (puzzleMode === 'swap') {
            // Jigsaw mode: prepare board and tray data
            pieces = []; // tracks which piece is placed at each slot (-1 = empty)
            for (let i = 0; i < total; i++) pieces.push(-1); // all slots empty

            // Create shuffled tray pieces
            let trayPieces = [];
            for (let i = 0; i < total; i++) trayPieces.push(i);
            do {
                for (let i = trayPieces.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [trayPieces[i], trayPieces[j]] = [trayPieces[j], trayPieces[i]];
                }
            } while (trayPieces.every((v, i) => v === i));

            // Store tray in a separate array
            window._puzzleTray = trayPieces;
            selectedPiece = null; // this will hold the piece INDEX from the tray
            renderJigsawBoard();
        } else {
            // Slide mode
            els.board.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
            els.board.style.gridTemplateRows = `repeat(${gridSize}, 1fr)`;
            pieces = [];
            for (let i = 0; i < total; i++) pieces.push(i);
            do { shufflePieces(); } while (!isSolvable() || isSolved());
            renderBoard();
        }
    }

    // ==========================================
    //  JIGSAW MODE — clip-path pieces + drag/drop
    // ==========================================
    function jigsawPath(row, col, gs, cw, ch) {
        const t = cw * 0.13, nt = cw * 0.15;
        const s = t, ex = t + cw, ey = t + ch, mx = t + cw / 2, my = t + ch / 2;
        const hasT = row > 0, hasR = col < gs - 1, hasB = row < gs - 1, hasL = col > 0;
        let d = `M ${s} ${s} `;
        if (!hasT) d += `L ${ex} ${s} `;
        else d += `L ${mx - nt} ${s} C ${mx - nt * 0.5} ${s}, ${mx - nt * 0.5} ${s + t}, ${mx} ${s + t} C ${mx + nt * 0.5} ${s + t}, ${mx + nt * 0.5} ${s}, ${mx + nt} ${s} L ${ex} ${s} `;
        if (!hasR) d += `L ${ex} ${ey} `;
        else d += `L ${ex} ${my - nt} C ${ex} ${my - nt * 0.5}, ${ex + t} ${my - nt * 0.5}, ${ex + t} ${my} C ${ex + t} ${my + nt * 0.5}, ${ex} ${my + nt * 0.5}, ${ex} ${my + nt} L ${ex} ${ey} `;
        if (!hasB) d += `L ${s} ${ey} `;
        else d += `L ${mx + nt} ${ey} C ${mx + nt * 0.5} ${ey}, ${mx + nt * 0.5} ${ey + t}, ${mx} ${ey + t} C ${mx - nt * 0.5} ${ey + t}, ${mx - nt * 0.5} ${ey}, ${mx - nt} ${ey} L ${s} ${ey} `;
        if (!hasL) d += `L ${s} ${s} `;
        else d += `L ${s} ${my + nt} C ${s} ${my + nt * 0.5}, ${s + t} ${my + nt * 0.5}, ${s + t} ${my} C ${s + t} ${my - nt * 0.5}, ${s} ${my - nt * 0.5}, ${s} ${my - nt} L ${s} ${s} `;
        return d + 'Z';
    }

    function renderJigsawBoard() {
        const total = gridSize * gridSize;
        const hasImage = currentPuzzle && currentPuzzle.image;
        els.board.innerHTML = '';
        els.board.style.cssText = 'display:flex;flex-direction:column;gap:12px;width:100%;max-width:min(90vw,42vh,380px);aspect-ratio:auto;direction:ltr;flex-shrink:0;padding:24px 16px !important;box-sizing:border-box;align-items:center;justify-content:center;overflow:visible;';
        const bw = Math.min(window.innerWidth * 0.8, window.innerHeight * 0.35, 290);
        const cellSize = Math.floor(bw / gridSize);
        const tabR = Math.round(cellSize * 0.13);
        const pieceW = cellSize + 2 * tabR;
        // Board grid
        const boardGrid = document.createElement('div');
        boardGrid.id = 'jigsaw-grid';
        boardGrid.style.cssText = `display:grid;grid-template-columns:repeat(${gridSize},${cellSize}px);grid-template-rows:repeat(${gridSize},${cellSize}px);gap:0;width:${cellSize * gridSize}px;height:${cellSize * gridSize}px;border-radius:14px;border:3px solid rgba(255,215,0,0.35);position:relative;margin:0 auto;overflow:visible;`;
        for (let slot = 0; slot < total; slot++) {
            const slotEl = document.createElement('div');
            slotEl.className = 'jigsaw-slot';
            slotEl.dataset.slot = slot;
            slotEl.style.cssText = 'border:1px dashed rgba(255,255,255,0.15);position:relative;overflow:visible;box-sizing:border-box;';
            if (pieces[slot] !== -1) {
                const pi = pieces[slot], pr = Math.floor(pi / gridSize), pc = pi % gridSize;
                const placed = document.createElement('div');
                if (pi === lastPlacedJigsaw) {
                    placed.className = 'jigsaw-placed';
                    setTimeout(() => lastPlacedJigsaw = -1, 400); // clear after animation
                }
                placed.style.cssText = `position:absolute;top:${-tabR}px;left:${-tabR}px;width:${pieceW}px;height:${pieceW}px;clip-path:path("${jigsawPath(pr, pc, gridSize, cellSize, cellSize)}");z-index:2;pointer-events:none;transform-origin:center;`;
                if (hasImage) { placed.style.backgroundImage = `url(${currentPuzzle.image})`; placed.style.backgroundSize = `${gridSize * cellSize}px ${gridSize * cellSize}px`; placed.style.backgroundPosition = `${-pc * cellSize + tabR}px ${-pr * cellSize + tabR}px`; }
                slotEl.appendChild(placed);
            } else {
                const hint = document.createElement('span');
                hint.textContent = slot + 1;
                hint.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:0.85rem;font-weight:900;color:rgba(255,255,255,0.15);pointer-events:none;';
                slotEl.appendChild(hint);
                slotEl.addEventListener('click', () => handleSlotClick(slot));
            }
            boardGrid.appendChild(slotEl);
        }
        els.board.appendChild(boardGrid);
        // Tray
        const tray = document.createElement('div');
        tray.id = 'jigsaw-tray';
        tray.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;justify-content:center;padding:8px;background:rgba(0,0,0,0.25);border-radius:14px;border:2px solid rgba(255,255,255,0.08);min-height:40px;max-height:min(25vh,180px);overflow-y:auto;direction:ltr;';
        const trayPieces = window._puzzleTray || [];
        if (trayPieces.length === 0) tray.innerHTML = '<div style="color:rgba(255,255,255,0.5);font-size:0.8rem;padding:8px;">✅ تم وضع كل القطع!</div>';
        const trayCell = Math.min(65, Math.floor(cellSize * 0.75));
        const trayTab = Math.round(trayCell * 0.13);
        const trayPW = trayCell + 2 * trayTab;
        trayPieces.forEach(pieceIdx => {
            const pr = Math.floor(pieceIdx / gridSize), pc = pieceIdx % gridSize;
            const el = document.createElement('div');
            el.className = 'jigsaw-tray-piece';
            el.dataset.piece = pieceIdx;
            el.style.cssText = `animation:popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) ${Math.random() * 0.15}s both;width:${trayPW}px;height:${trayPW}px;cursor:grab;position:relative;flex-shrink:0;touch-action:none;clip-path:path("${jigsawPath(pr, pc, gridSize, trayCell, trayCell)}");filter:drop-shadow(0 3px 6px rgba(0,0,0,0.5));transition:filter 0.2s;`;
            if (hasImage) { el.style.backgroundImage = `url(${currentPuzzle.image})`; el.style.backgroundSize = `${gridSize * trayCell}px ${gridSize * trayCell}px`; el.style.backgroundPosition = `${-pc * trayCell + trayTab}px ${-pr * trayCell + trayTab}px`; }
            else { const hue = (pieceIdx * (360 / (total - 1))) % 360; el.style.background = `linear-gradient(135deg,hsl(${hue},55%,50%),hsl(${(hue + 30) % 360},55%,40%))`; }
            if (selectedPiece === pieceIdx) { el.style.filter = 'drop-shadow(0 0 12px rgba(255,215,0,0.8)) drop-shadow(0 0 25px rgba(255,215,0,0.4))'; el.style.transform = 'scale(1.1)'; el.style.zIndex = '10'; }
            el.addEventListener('click', () => { if (el._dragged) { el._dragged = false; return; } selectedPiece = selectedPiece === pieceIdx ? null : pieceIdx; HawdajAudio.SFX.tap(); renderJigsawBoard(); });
            setupJigsawDrag(el, pieceIdx, cellSize, tabR, pieceW);
            tray.appendChild(el);
        });
        els.board.appendChild(tray);
    }

    let _dragGhost = null;
    function setupJigsawDrag(el, pieceIdx, cellSize, tabR, pieceW) {
        const hasImage = currentPuzzle && currentPuzzle.image;
        const pr = Math.floor(pieceIdx / gridSize), pc = pieceIdx % gridSize;
        let startX, startY, moved;
        el.addEventListener('pointerdown', (e) => {
            e.preventDefault(); el.setPointerCapture(e.pointerId); startX = e.clientX; startY = e.clientY; moved = false;
            const ghost = document.createElement('div'); ghost.id = 'drag-ghost';
            ghost.style.cssText = `position:fixed;z-index:9999;pointer-events:none;width:${pieceW}px;height:${pieceW}px;opacity:0.9;clip-path:path("${jigsawPath(pr, pc, gridSize, cellSize, cellSize)}");filter:drop-shadow(0 8px 20px rgba(0,0,0,0.6));left:${e.clientX - pieceW / 2}px;top:${e.clientY - pieceW / 2}px;`;
            if (hasImage) { ghost.style.backgroundImage = `url(${currentPuzzle.image})`; ghost.style.backgroundSize = `${gridSize * cellSize}px ${gridSize * cellSize}px`; ghost.style.backgroundPosition = `${-pc * cellSize + tabR}px ${-pr * cellSize + tabR}px`; }
            document.body.appendChild(ghost); _dragGhost = ghost; el.style.opacity = '0.3';
        });
        el.addEventListener('pointermove', (e) => { if (!_dragGhost) return; e.preventDefault(); if (Math.abs(e.clientX - startX) > 5 || Math.abs(e.clientY - startY) > 5) moved = true; _dragGhost.style.left = (e.clientX - pieceW / 2) + 'px'; _dragGhost.style.top = (e.clientY - pieceW / 2) + 'px'; });
        el.addEventListener('pointerup', (e) => {
            if (!_dragGhost) return; _dragGhost.remove(); _dragGhost = null; el.style.opacity = '1';
            if (!moved) { el._dragged = false; return; } el._dragged = true;
            const grid = document.getElementById('jigsaw-grid'); if (!grid) return;
            for (let i = 0; i < grid.children.length; i++) {
                const sr = grid.children[i].getBoundingClientRect();
                if (e.clientX >= sr.left && e.clientX <= sr.right && e.clientY >= sr.top && e.clientY <= sr.bottom) {
                    if (i === pieceIdx && pieces[i] === -1) { lastPlacedJigsaw = pieceIdx; pieces[i] = pieceIdx; const ti = window._puzzleTray.indexOf(pieceIdx); if (ti !== -1) window._puzzleTray.splice(ti, 1); selectedPiece = null; moves++; els.moves.textContent = moves; HawdajAudio.SFX.correct(); renderJigsawBoard(); if (window._puzzleTray.length === 0) completePuzzle(); return; }
                    else if (pieces[i] === -1) { HawdajAudio.SFX.wrong(); moves++; els.moves.textContent = moves; grid.children[i].style.animation = 'none'; grid.children[i].offsetHeight; grid.children[i].style.animation = 'shake 0.4s ease'; grid.children[i].style.background = 'rgba(231,76,60,0.35)'; setTimeout(() => { grid.children[i].style.background = ''; grid.children[i].style.animation = ''; }, 500); renderJigsawBoard(); return; }
                    break;
                }
            }
            renderJigsawBoard();
        });
        el.addEventListener('pointercancel', () => { if (_dragGhost) { _dragGhost.remove(); _dragGhost = null; } el.style.opacity = '1'; });
    }

    function handleSlotClick(slot) {
        if (completed) return;
        if (selectedPiece === null) { HawdajApp.showToast('اختر قطعة من الأسفل أولاً! 👇', 'info'); return; }
        if (selectedPiece === slot) {
            lastPlacedJigsaw = selectedPiece;
            pieces[slot] = selectedPiece; const ti = window._puzzleTray.indexOf(selectedPiece); if (ti !== -1) window._puzzleTray.splice(ti, 1);
            selectedPiece = null; moves++; els.moves.textContent = moves; HawdajAudio.SFX.correct(); renderJigsawBoard();
            if (window._puzzleTray.length === 0) completePuzzle();
        } else {
            HawdajAudio.SFX.wrong(); moves++; els.moves.textContent = moves;
            const grid = document.getElementById('jigsaw-grid'), slotEl = grid?.children[slot];
            if (slotEl) { slotEl.style.animation = 'none'; slotEl.offsetHeight; slotEl.style.animation = 'shake 0.4s ease'; slotEl.style.background = 'rgba(231,76,60,0.35)'; setTimeout(() => { slotEl.style.background = ''; slotEl.style.animation = ''; }, 500); }
        }
    }

    function shufflePieces() {
        for (let i = pieces.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
        }
    }

    function isSolvable() {
        const total = gridSize * gridSize;
        let inversions = 0;
        const flat = pieces.filter(p => p !== total - 1);
        for (let i = 0; i < flat.length; i++) {
            for (let j = i + 1; j < flat.length; j++) {
                if (flat[i] > flat[j]) inversions++;
            }
        }
        if (gridSize % 2 === 1) {
            return inversions % 2 === 0;
        } else {
            const emptyRow = Math.floor(pieces.indexOf(total - 1) / gridSize);
            const rowFromBottom = gridSize - emptyRow;
            return (rowFromBottom % 2 === 1) === (inversions % 2 === 0);
        }
    }

    function isSolved() {
        if (puzzleMode === 'swap') {
            return window._puzzleTray && window._puzzleTray.length === 0;
        }
        for (let i = 0; i < pieces.length; i++) {
            if (pieces[i] !== i) return false;
        }
        return true;
    }

    // ==========================================
    //  SLIDE MODE — Original board
    // ==========================================
    function renderBoard() {
        const total = gridSize * gridSize;
        els.board.innerHTML = '';
        els.board.style.cssText = ''; // Clear inline styles left from jigsaw mode
        els.board.style.direction = 'ltr';
        els.board.style.display = 'grid';
        els.board.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
        els.board.style.gridTemplateRows = `repeat(${gridSize}, 1fr)`;
        els.board.style.aspectRatio = '1';
        els.board.style.gap = '3px';
        els.board.style.padding = '0';
        els.board.style.backgroundImage = 'none';
        els.board.style.overflow = 'hidden';

        const hueStep = 360 / (total - 1);
        const hasImage = currentPuzzle && currentPuzzle.image;

        pieces.forEach((pieceIdx, pos) => {
            const piece = document.createElement('div');
            piece.className = 'puzzle-piece';
            piece.dataset.pos = pos;
            piece.dataset.piece = pieceIdx;

            if (pieceIdx === total - 1) {
                piece.classList.add('empty');
            } else {
                const row = Math.floor(pieceIdx / gridSize);
                const col = pieceIdx % gridSize;
                if (hasImage) {
                    piece.style.backgroundImage = `url(${currentPuzzle.image})`;
                    piece.style.backgroundSize = `${gridSize * 100}% ${gridSize * 100}% `;
                    piece.style.backgroundPosition = `${(col / (gridSize - 1)) * 100}% ${(row / (gridSize - 1)) * 100}% `;
                } else {
                    const hue = (pieceIdx * hueStep) % 360;
                    const isThemed = document.body.classList.contains('ramadan');
                    const baseSat = isThemed ? '60%' : '50%';
                    const baseLight = isThemed ? '35%' : '60%';
                    piece.style.background = `linear-gradient(135deg, hsl(${hue}, ${baseSat}, ${baseLight}), hsl(${(hue + 30) % 360}, ${baseSat}, ${parseInt(baseLight) - 10}%))`;
                }
                const num = document.createElement('span');
                num.textContent = pieceIdx + 1;
                num.style.cssText = `
position: absolute; top: 4px; right: 4px;
font-size:${hasImage ? '0.65rem' : '1.5rem'};
font-weight: 900; color: white; text-shadow: 0 1px 3px rgba(0, 0, 0, 0.7);
pointer-events: none;
                    ${hasImage ? 'background:rgba(0,0,0,0.5); border-radius:50%; width:20px; height:20px; display:flex; align-items:center; justify-content:center; top:2px; right:2px;' : 'left:50%; top:50%; transform:translate(-50%,-50%); right:auto;'}
`;
                piece.appendChild(num);
                if (pieceIdx === pos) piece.classList.add('correct');
            }

            piece.addEventListener('click', () => handlePieceClick(pos));
            piece.addEventListener('touchstart', () => piece.style.transform = 'scale(0.95)', { passive: true });
            piece.addEventListener('touchend', () => piece.style.transform = '', { passive: true });
            els.board.appendChild(piece);
        });
    }

    function handlePieceClick(pos) {
        if (completed) return;
        const total = gridSize * gridSize;
        // Slide Mode only (jigsaw has its own handlers)
        const emptyPos = pieces.indexOf(total - 1);
        if (isAdjacent(pos, emptyPos)) {
            [pieces[pos], pieces[emptyPos]] = [pieces[emptyPos], pieces[pos]];
            moves++;
            els.moves.textContent = moves;
            HawdajAudio.SFX.puzzleSnap();
            renderBoard();
            if (isSolved()) completePuzzle();
        } else {
            HawdajAudio.SFX.tap();
        }
    }

    function isAdjacent(pos1, pos2) {
        const row1 = Math.floor(pos1 / gridSize);
        const col1 = pos1 % gridSize;
        const row2 = Math.floor(pos2 / gridSize);
        const col2 = pos2 % gridSize;

        return (Math.abs(row1 - row2) + Math.abs(col1 - col2)) === 1;
    }

    function completePuzzle() {
        completed = true;
        clearInterval(timerInterval);

        // Smart scoring: base pts + speed bonus + accuracy bonus
        const data = HawdajData.get();
        const basePoints = data.points?.puzzle || 50;
        const maxTime = 120; // max time cap for full bonus
        const speedBonus = Math.max(0, Math.floor((maxTime - seconds) / 10)); // up to 12 bonus pts
        const accuracyBonus = Math.max(0, 10 - Math.floor(moves / 3)); // fewer moves = more bonus
        let pts = Math.max(5, basePoints + speedBonus + accuracyBonus - Math.floor(moves / 5));

        // Apply powerup score multiplier
        if (window.PowerupInventory) {
            pts = Math.floor(pts * PowerupInventory.getScoreMultiplier());
        }
        HawdajData.addScore(pts, 'puzzle');
        if (window.HawdajApp && HawdajApp.updatePlayerDisplay) {
            HawdajApp.updatePlayerDisplay();
        }
        totalScore += pts;

        // Update live score display
        const scoreEl = document.getElementById('puzzle-score-val');
        if (scoreEl) {
            scoreEl.textContent = totalScore;
            scoreEl.style.animation = 'none'; scoreEl.offsetHeight;
            scoreEl.style.animation = 'scorePopIn 0.4s cubic-bezier(0.175,0.885,0.32,1.275)';
        }

        // Show floating score
        if (window.HawdajEffects?.scoreFloat) {
            HawdajEffects.scoreFloat(pts, scoreEl);
        }

        // Update main menu counter immediately
        if (window.HawdajApp && HawdajApp.updatePlayerDisplay) {
            HawdajApp.updatePlayerDisplay();
        }

        // Track competition progress
        if (window.HawdajApp && HawdajApp.trackCompetitionGameCompletion) {
            HawdajApp.trackCompetitionGameCompletion('puzzle');
        }

        // Daily task triggers
        if (window.completeDailyTask) {
            window.completeDailyTask('puzzle_play');
            if (totalScore >= 50) window.completeDailyTask('score_50');
        }

        HawdajAudio.SFX.puzzleComplete();
        if (window.HawdajCelebration) HawdajCelebration.show('puzzle');
        // For jigsaw mode, show completed image cleanly on the board
        if (puzzleMode === 'swap' && currentPuzzle && currentPuzzle.image) {
            els.board.innerHTML = '';
            els.board.style.cssText = 'display:flex;align-items:center;justify-content:center;width:100%;max-width:340px;border:none;background:none;';
            const img = document.createElement('img');
            img.src = currentPuzzle.image;
            img.style.cssText = 'width:100%;max-width:280px;border-radius:16px;box-shadow:0 8px 30px rgba(0,0,0,0.4);border:3px solid rgba(46,204,113,0.6);';
            els.board.appendChild(img);
        }
        HawdajAudio.vibrate(200);

        const azzam = document.getElementById('puzzle-char-azzam');
        const jadel = document.getElementById('puzzle-char-jadel');
        if (azzam) { azzam.className = 'game-char-img azzam celebrate'; azzam.src = HawdajData.getCharacterPose('azzam', 'happy') || 'assets/char/azzam.jpeg'; }
        if (jadel) { jadel.className = 'game-char-img jadel celebrate'; jadel.src = HawdajData.getCharacterPose('jadel', 'happy') || 'assets/char/El jadel.jpeg'; }
        const charId = HawdajData.get().theme === 'normal' ? 'jadel' : 'azzam';
        HawdajAudio.playCharacter(charId, 'cheer');

        // Update progress bar
        const inner = document.getElementById('puzzle-progress-inner');
        if (inner) {
            inner.style.width = `${((currentIndex + 1) / puzzleQueue.length) * 100}% `;
        }

        setTimeout(() => {
            HawdajEffects.celebrationBurst();
            const remaining = puzzleQueue.length - currentIndex - 1;
            if (remaining > 0) {
                HawdajApp.showToast(`🎉 أحسنت! + ${pts} نقطة — باقي ${remaining} بازل`, 'success');
            } else {
                HawdajApp.showToast(`🎉 ممتاز! + ${pts} نقطة — أنهيت الكل!`, 'success');
            }
        }, 300);

        // Show Next button, hide Shuffle button to allow manual progression
        if (els.nextBtn) {
            const isLast = (currentIndex >= puzzleQueue.length - 1);
            els.nextBtn.textContent = isLast ? 'عرض النتائج 🏆' : 'البازل التالي ➡️';
            els.nextBtn.style.display = 'block';
        }
        if (els.shuffleBtn) els.shuffleBtn.style.display = 'none';
    }

    function showFinalResults() {
        // Track competition puzzle completion
        if (window.HawdajApp && HawdajApp.trackCompetitionGameCompletion) {
            HawdajApp.trackCompetitionGameCompletion('puzzle');
        }

        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;animation:fadeIn 0.5s ease;';
        overlay.innerHTML = `
        <div style="background:var(--card-bg);border-radius:24px;padding:32px;max-width:340px;width:90%;text-align:center;box-shadow:0 16px 48px rgba(0,0,0,0.5);animation:slideUp 0.5s ease;">
            <div style="font-size:5rem;margin-bottom:12px;"><img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Activities/Trophy.png" class="ui-anim-icon" style="width:1em;height:1em;"></div>
            <h2 style="color:var(--text-heading);font-weight:900;font-size:1.5rem;margin-bottom:8px;">تحدي البازل مكتمل!</h2>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:20px 0;padding:16px;background:rgba(255,255,255,0.05);border-radius:16px;">
                <div>
                    <div style="font-size:2rem;"><img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Activities/Puzzle%20Piece.png" class="ui-anim-icon" style="width:1em;height:1em;"></div>
                    <div style="color:var(--text-secondary);font-size:var(--fs-xs);">البازلات</div>
                    <div style="color:var(--accent-primary);font-weight:900;font-size:1.2rem;">${puzzleQueue.length}</div>
                </div>
                <div>
                    <div style="font-size:2rem;"><img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Travel%20and%20places/Star.png" class="ui-anim-icon" style="width:1em;height:1em;"></div>
                    <div style="color:var(--text-secondary);font-size:var(--fs-xs);">النقاط</div>
                    <div style="color:var(--accent-primary);font-weight:900;font-size:1.2rem;">${totalScore}</div>
                </div>
            </div>
            <button class="btn btn-primary w-full" id="puzzle-results-close" style="margin-top:8px;font-size:var(--fs-md);padding:12px;">🏠 العودة</button>
        </div>
    `;
        document.body.appendChild(overlay);

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay || e.target.id === 'puzzle-results-close') {
                overlay.remove();
                handleReturnNavigation();
            }
        });

        document.getElementById('puzzle-results-close')?.addEventListener('click', () => {
            overlay.remove();
            handleReturnNavigation();
        });
    }

    function handleReturnNavigation() {
        const dataCore = HawdajData.get();
        const savedCompId = dataCore.player.activeCompetitionId;
        if (savedCompId) {
            HawdajApp.navigate('main-menu');
            setTimeout(() => {
                if (window.showCompTasksModal) window.showCompTasksModal(savedCompId);
            }, 300);
        } else {
            HawdajApp.navigate('menu');
        }
    }

    let maxTime = 0;
    function startTimer() {
        clearInterval(timerInterval);
        const data = HawdajData.get();
        maxTime = 0;
        if (data.player.activeCompetitionId) {
            const comp = data.competitions.find(x => x.id === data.player.activeCompetitionId);
            if (comp && comp.puzzleTime) maxTime = parseInt(comp.puzzleTime) || 0;
        }

        if (els.timer) els.timer.style.color = '';

        timerInterval = setInterval(() => {
            seconds++;
            if (maxTime > 0) {
                const left = maxTime - seconds;
                if (left <= 0) {
                    clearInterval(timerInterval);
                    completed = true;
                    HawdajApp.showToast('❌ انتهى وقت البازل!', 'error');
                    HawdajAudio.SFX.wrong();
                    setTimeout(() => handleReturnNavigation(), 2000);
                    return;
                }
                const m = Math.floor(left / 60);
                const s = left % 60;
                els.timer.textContent = `${m}:${s.toString().padStart(2, '0')}`;
                if (left <= 10 && els.timer) els.timer.style.color = '#e74c3c';
            } else {
                const m = Math.floor(seconds / 60);
                const s = seconds % 60;
                els.timer.textContent = `${m}:${s.toString().padStart(2, '0')}`;
            }
        }, 1000);
    }

    function shuffleBoard() {
        if (completed) return;
        do {
            shufflePieces();
        } while (!isSolvable() || isSolved());
        moves = 0;
        els.moves.textContent = '0';
        renderBoard();
        HawdajAudio.SFX.whoosh();
    }

    function cleanup() {
        clearInterval(timerInterval);
        completed = true;
    }

    // Add time (for use by PowerupInventory — reduce elapsed puzzle time)
    function addTime(sec) {
        seconds = Math.max(0, seconds - sec);
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        if (els.timer) els.timer.textContent = `${m}:${s.toString().padStart(2, '0')} `;
    }

    // Hint functionality for puzzle specific powerups
    function useShowImage() {
        if (completed) return;

        const data = HawdajData.get();
        data.player.powerups['show_image']--;
        HawdajData.save();

        const container = puzzleMode === 'swap' ? document.getElementById('jigsaw-grid') : els.board;
        if (!container) return;

        // Show overlay image on top of the board
        let overlay = document.getElementById('puzzle-image-overlay');
        if (!overlay && currentPuzzle && currentPuzzle.image) {
            overlay = document.createElement('div');
            overlay.id = 'puzzle-image-overlay';
            overlay.style.cssText = `
                position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                background-image: url(${currentPuzzle.image});
                background-size: 100% 100%;
                opacity: 0.5; pointer-events: none; z-index: 10;
                border-radius: 12px;
                transition: opacity 0.5s;
            `;
            container.style.position = 'relative';
            container.appendChild(overlay);
        } else if (overlay) {
            overlay.style.opacity = '0.5';
        }

        // Show the reference image more clearly
        if (els.refImg) {
            els.refImg.style.transform = 'scale(1.5)';
            els.refImg.style.zIndex = '100';
            els.refImg.style.boxShadow = '0 0 20px rgba(255,215,0,0.8)';
        }

        setTimeout(() => {
            if (overlay) overlay.style.opacity = '0';
            if (els.refImg) {
                els.refImg.style.transform = '';
                els.refImg.style.zIndex = '';
                els.refImg.style.boxShadow = '';
            }
            setTimeout(() => { if (overlay) overlay.remove(); }, 500);
        }, 15000); // 15 seconds

        HawdajAudio.SFX.correct();
        HawdajApp.showToast('🖼️ تم إظهار خيال الصورة الأصلية لمدة 15 ثانية!', 'success');
        if (window.PowerupInventory) window.PowerupInventory.render();
    }

    function useMagicPiece() {
        if (completed) return;

        const total = gridSize * gridSize;
        let fixedCount = 0;

        if (puzzleMode === 'swap') {
            // Jigsaw / Swap Mode Auto-place
            const tray = window._puzzleTray || [];
            const toPlace = [];
            for (let i = 0; i < tray.length && toPlace.length < 3; i++) {
                toPlace.push(tray[i]);
            }

            toPlace.forEach(pieceIdx => {
                pieces[pieceIdx] = pieceIdx;
                const ti = tray.indexOf(pieceIdx);
                if (ti !== -1) tray.splice(ti, 1);
                lastPlacedJigsaw = pieceIdx;
                fixedCount++;
            });

            if (fixedCount > 0) {
                const data = HawdajData.get();
                data.player.powerups['magic_piece']--;
                HawdajData.save();

                HawdajAudio.SFX.correct();
                HawdajApp.showToast(`✨ قدرة مذهلة! تم تركيب ${fixedCount} قطع في أماكنها الصحيحة بشكل تلقائي!`, 'success');
                renderJigsawBoard();

                if (isSolved()) {
                    setTimeout(() => completePuzzle(), 300);
                }
                if (window.PowerupInventory) window.PowerupInventory.render();
            } else {
                HawdajApp.showToast('كل القطع في مكانها الصحيح بالفعل! 🎉', 'info');
            }
        } else {
            // Slide Mode Auto-place
            const empty = total - 1;
            for (let targetPos = 0; targetPos < total - 1 && fixedCount < 3; targetPos++) {
                if (pieces[targetPos] !== targetPos) {
                    let currentPos = pieces.indexOf(targetPos);
                    if (currentPos !== -1) {
                        let temp = pieces[targetPos];
                        pieces[targetPos] = pieces[currentPos];
                        pieces[currentPos] = temp;
                        fixedCount++;
                    }
                }
            }

            if (fixedCount > 0) {
                const data = HawdajData.get();
                data.player.powerups['magic_piece']--;
                HawdajData.save();

                // Fix parity
                if (!isSolvable() && !isSolved()) {
                    let swapA = -1, swapB = -1;
                    for (let i = total - 1; i >= 0; i--) {
                        if (pieces[i] !== empty && pieces[i] !== i) {
                            if (swapA === -1) swapA = i;
                            else if (swapB === -1) { swapB = i; break; }
                        }
                    }
                    if (swapA !== -1 && swapB !== -1) {
                        let t = pieces[swapA];
                        pieces[swapA] = pieces[swapB];
                        pieces[swapB] = t;
                    }
                }

                HawdajAudio.SFX.correct();
                HawdajApp.showToast(`✨ قدرة مذهلة! تم تركيب ${fixedCount} قطع في أماكنها الصحيحة بشكل تلقائي!`, 'success');
                renderBoard();

                // Highlight correct pieces briefly
                const domPieces = els.board.querySelectorAll('.puzzle-piece');
                domPieces.forEach(p => {
                    if (p.classList.contains('correct')) {
                        p.style.boxShadow = 'inset 0 0 20px rgba(241, 196, 15, 0.8), 0 0 15px rgba(241, 196, 15, 0.5)';
                        p.style.zIndex = '5';
                        setTimeout(() => { p.style.boxShadow = ''; p.style.zIndex = ''; }, 2000);
                    }
                });

                if (isSolved()) {
                    setTimeout(() => completePuzzle(), 300);
                }
                if (window.PowerupInventory) window.PowerupInventory.render();
            } else {
                HawdajApp.showToast('كل القطع في مكانها الصحيح تقريباً!', 'info');
            }
        }
    }

    function useFreeze() {
        if (completed) return;

        const data = HawdajData.get();
        data.player.powerups['freeze']--;
        HawdajData.save();

        stopTimer();
        els.timer.style.color = '#3498db';
        els.timer.style.textShadow = '0 0 10px #3498db';
        els.timer.textContent += ' ❄️';

        setTimeout(() => {
            if (!completed) {
                els.timer.style.color = '';
                els.timer.style.textShadow = '';
                els.timer.textContent = els.timer.textContent.replace(' ❄️', '');
                resumeTimer();
            }
        }, 15000); // Freeze for 15 seconds

        HawdajAudio.SFX.whoosh();
        HawdajApp.showToast('❄️ تم تجميد الوقت لمدة 15 ثانية!', 'success');
        if (window.PowerupInventory) window.PowerupInventory.render();
    }

    function stopTimer() { clearInterval(timerInterval); }
    function resumeTimer() {
        timerInterval = setInterval(() => {
            if (!completed) {
                seconds++;
                if (maxTime > 0) {
                    const left = maxTime - seconds;
                    if (left <= 0) {
                        clearInterval(timerInterval);
                        completed = true;
                        HawdajApp.showToast('❌ انتهى وقت البازل!', 'error');
                        HawdajAudio.SFX.wrong();
                        setTimeout(() => handleReturnNavigation(), 2000);
                        return;
                    }
                    const m = Math.floor(left / 60);
                    const s = left % 60;
                    els.timer.textContent = `${m}:${s.toString().padStart(2, '0')}`;
                    if (left <= 10 && els.timer) els.timer.style.color = '#e74c3c';
                } else {
                    const mins = Math.floor(seconds / 60);
                    const secs = seconds % 60;
                    els.timer.textContent = `${mins}:${secs.toString().padStart(2, '0')} `;
                }
            }
        }, 1000);
    }

    // Backward compat — renderPuzzleList is no longer needed but app.js calls it
    function renderPuzzleList() { /* no-op, mode cards handle this */ }
    function cleanup() { clearInterval(timerInterval); completed = true; }

    return { init, startPuzzle, renderPuzzleList, cleanup, addTime, useShowImage, useMagicPiece, useFreeze, stopTimer, resumeTimer, startSequentialPlay };
})();

window.PuzzleGame = PuzzleGame;
