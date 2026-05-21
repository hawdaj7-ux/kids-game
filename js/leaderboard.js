/* ============================================
   HAWDAJ GAME — Leaderboard & Competitions
   (Real-time Firebase Leaderboard)
   ============================================ */

const LeaderboardManager = (() => {
    let currentTab = 'overall';

    function init() {
        setupTabs();
        renderLeaderboard('overall');
        renderCompetition();

        // Listen for real-time Firebase leaderboard updates
        window.addEventListener('HawdajDataUpdated', () => {
            renderLeaderboard(currentTab);
        });
    }

    function setupTabs() {
        document.querySelectorAll('#lb-tabs .tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('#lb-tabs .tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                currentTab = tab.dataset.lb;
                renderLeaderboard(currentTab);
            });
        });
    }

    function getWinnerBadgeHTML(name) {
        const data = HawdajData.get();
        if (!data.competitions) return '';
        const won = data.competitions.some(c => c.winner === name);
        if (!won) return '';
        return '<span class="winner-badge" title="فائز بمسابقة!" style="display:inline-flex; align-items:center; justify-content:center; animation:pulse 2s infinite;"><img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Activities/Party%20Popper.png" style="width:18px;height:18px;margin-right:4px;"></span>';
    }

    function renderLeaderboard(type) {
        currentTab = type;
        const data = HawdajData.get();
        let entries = [...(data.leaderboard || [])];

        // Sort by total score (all types use the same global score from Firebase)
        entries.sort((a, b) => b.score - a.score);

        // Top 3 Podium
        const top3Container = document.getElementById('lb-top3');
        top3Container.innerHTML = '';

        if (entries.length >= 1) {
            // Show in order: 2nd, 1st, 3rd
            const order = entries.length >= 3 ? [1, 0, 2] : entries.length >= 2 ? [1, 0] : [0];
            const classes = ['second', 'first', 'third'];
            const medals = [
                '<img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Activities/2nd%20Place%20Medal.png" class="ui-anim-icon">',
                '<img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Activities/1st%20Place%20Medal.png" class="ui-anim-icon">',
                '<img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Activities/3rd%20Place%20Medal.png" class="ui-anim-icon">'
            ];

            order.forEach((idx, i) => {
                if (!entries[idx]) return;
                const e = entries[idx];
                const isCurrentPlayer = e.name === data.player.name;
                const podium = document.createElement('div');
                podium.className = `lb-podium ${classes[i]}${isCurrentPlayer ? ' is-me' : ''}`;
                podium.style.animation = `fadeInUp 0.5s ease ${0.2 + i * 0.15}s both`;
                let avatarContent = HawdajData.getAvatarHTML(e.emoji, classes[i] === 'first' ? 48 : 36);
                if (isCurrentPlayer) {
                    const avUrl = data.player.avatarIcon;
                    if (avUrl && avUrl.startsWith('http')) {
                        const sz = classes[i] === 'first' ? 48 : 36;
                        avatarContent = `<img src="${avUrl}" style="width:${sz}px;height:${sz}px;border-radius:50%;object-fit:cover;">`;
                    }
                }
                podium.innerHTML = `
                    <div class="lb-avatar" style="display:flex; justify-content:center; align-items:center;">${avatarContent}</div>
                    <span class="lb-name" style="display:flex; align-items:center; gap:4px; justify-content:center;">
                        ${isCurrentPlayer ? '⭐ ' + e.name : e.name} 
                        ${getWinnerBadgeHTML(e.name)}
                    </span>
                    <span class="lb-pts">${e.score.toLocaleString()} نقطة</span>
                    <div class="lb-pedestal">${medals[i]}</div>
                `;
                top3Container.appendChild(podium);
            });
        }

        // Rest of list (4th onwards)
        const listContainer = document.getElementById('lb-list');
        listContainer.innerHTML = '';

        // Find current player rank
        const playerRank = entries.findIndex(e => e.name === data.player.name);

        entries.slice(3, 20).forEach((e, i) => {
            const isCurrentPlayer = e.name === data.player.name;
            const row = document.createElement('div');
            row.className = `lb-row${isCurrentPlayer ? ' is-me' : ''}`;
            row.style.animation = `fadeInUp 0.4s ease ${0.5 + i * 0.06}s both`;
            let avContent = HawdajData.getAvatarHTML(e.emoji, 28);
            if (isCurrentPlayer && data.player.avatarIcon && data.player.avatarIcon.startsWith('http')) {
                avContent = `<img src="${data.player.avatarIcon}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;">`;
            }
            row.innerHTML = `
                <span class="lb-rank">${i + 4}</span>
                <div class="lb-row-avatar" style="display:flex; justify-content:center; align-items:center;">${avContent}</div>
                <span class="lb-row-name" style="display:flex; align-items:center; gap:4px;">
                    ${isCurrentPlayer ? '⭐ ' + e.name : e.name}
                    ${getWinnerBadgeHTML(e.name)}
                </span>
                <span class="lb-row-pts">${e.score.toLocaleString()} ${HawdajData.getCurrencyHTML(16)}</span>
            `;
            listContainer.appendChild(row);
        });

        // Show current player position if not in top 20
        if (playerRank >= 20 && data.player.name) {
            const myRow = document.createElement('div');
            myRow.className = 'lb-row is-me lb-separator';
            let myAvContent = HawdajData.getAvatarHTML(data.player.emoji, 28);
            if (data.player.avatarIcon && data.player.avatarIcon.startsWith('http')) {
                myAvContent = `<img src="${data.player.avatarIcon}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;">`;
            }
            myRow.innerHTML = `
                <span class="lb-rank">${playerRank + 1}</span>
                <div class="lb-row-avatar" style="display:flex; justify-content:center; align-items:center;">${myAvContent}</div>
                <span class="lb-row-name" style="display:flex; align-items:center; gap:4px;">
                    ⭐ ${data.player.name} (أنت)
                    ${getWinnerBadgeHTML(data.player.name)}
                </span>
                <span class="lb-row-pts">${data.player.totalScore.toLocaleString()} ${HawdajData.getCurrencyHTML(16)}</span>
            `;
            listContainer.appendChild(myRow);
        }

        if (entries.length === 0) {
            listContainer.innerHTML = `
                <div style="text-align:center; padding:40px; color:var(--text-secondary);">
                    <div style="font-size:3rem; margin-bottom:12px;">
                        <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Activities/Trophy.png" style="width:1em; height:1em; display:inline-block;">
                    </div>
                    <p>لا يوجد لاعبين بعد. كن أول متصدر!</p>
                </div>
            `;
        }

        // Update total players count
        const countEl = document.getElementById('lb-player-count');
        if (countEl) countEl.textContent = entries.length;
    }

    function renderCompetition() {
        const data = HawdajData.get();
        const container = document.getElementById('competitions-section');
        if (!container) return;

        const comps = data.competitions || [];
        if (comps.length === 0) {
            container.innerHTML = '';
            return;
        }

        let html = '<h3 style="color:#FFD700; margin-bottom:12px; font-size:1.1rem;"><img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Activities/Trophy.png" style="width:24px;vertical-align:middle;"> المسابقات</h3>';
        html += '<div style="display:flex; flex-direction:column; gap:12px;">';

        comps.forEach(c => {
            const isActive = new Date(c.endDate) > new Date() && c.active !== false;
            let statusHtml = '';
            if (c.winner) {
                statusHtml = `<div style="margin-top:8px; padding:8px 12px; background:rgba(255,215,0,0.15); border-radius:12px; border:1px solid rgba(255,215,0,0.4); font-weight:900; color:#FFD700; display:flex; align-items:center; justify-content:center; gap:8px; animation: glow 2s infinite alternate;">
                    <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Activities/Party%20Popper.png" style="width:24px;height:24px;">
                    <span>الفائز بالمسابقة: ${c.winner}</span>
                    <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Activities/Party%20Popper.png" style="width:24px;height:24px; transform:scaleX(-1);">
                </div>`;
            } else if (isActive) {
                // Find countdown string
                const diff = new Date(c.endDate) - new Date();
                let timeStr = 'انتهت';
                if (diff > 0) {
                    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
                    timeStr = `متبقي ${days} يوم و ${hours} ساعة`;
                }

                statusHtml = `<div style="margin-top:8px; font-size:0.85rem; color:#2ecc71; font-weight:800; display:flex; align-items:center; justify-content:space-between; padding:8px; background:rgba(46,204,113,0.1); border-radius:8px; border:1px dashed rgba(46,204,113,0.3);">
                    <div style="display:flex; align-items:center; gap:6px;">
                        <span style="display:inline-block;width:8px;height:8px;background:#2ecc71;border-radius:50%;animation:pulse 1.5s infinite;"></span>
                        مسابقة نشطة
                    </div>
                    <div style="color:var(--text-secondary); font-size:0.75rem;">⏰ ${timeStr}</div>
                </div>`;
            } else {
                statusHtml = `<div style="margin-top:8px; font-size:0.8rem; color:var(--text-secondary); text-align:center; padding:6px; background:rgba(255,255,255,0.05); border-radius:8px;">مسابقة منتهية</div>`;
            }

            html += `
                <div style="background:linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02)); border:1px solid rgba(255,255,255,0.1); border-radius:20px; padding:16px; position:relative; overflow:hidden; box-shadow:0 8px 32px rgba(0,0,0,0.1);">
                    ${c.winner ? '<div style="position:absolute; inset:0; pointer-events:none; background:radial-gradient(circle at top right, rgba(255,215,0,0.15), transparent 60%);"></div>' : ''}
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <div>
                            <div style="font-weight:900; color:var(--text-heading); font-size:1.15rem; margin-bottom:4px;">${c.name}</div>
                            <div style="font-size:0.85rem; color:var(--text-secondary); line-height:1.5; max-width:85%;">${c.description || 'شارك واربح!'}</div>
                        </div>
                        <div style="background:rgba(255,215,0,0.15); padding:6px 12px; border-radius:12px; color:#FFD700; font-weight:900; font-size:0.85rem; border:1px solid rgba(255,215,0,0.3); white-space:nowrap;">
                            🎁 ${c.prize}
                        </div>
                    </div>
                    ${statusHtml}
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    }

    return { init, renderLeaderboard, renderCompetition };
})();
