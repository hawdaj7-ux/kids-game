/* ============================================
   HAWDAJ GAME — Chat System
   (Admin ↔ Student messaging)
   ============================================ */

const HawdajChat = (() => {
    let currentChatUser = null;
    let currentCompId = null;
    let chatPollInterval = null;

    // ── Get chat messages for a competition + user ──
    function getMessages(compId, userName) {
        const data = HawdajData.get();
        const comp = data.competitions.find(c => c.id === compId);
        if (!comp) return [];
        if (!comp.chat) comp.chat = {};
        if (!comp.chat[userName]) comp.chat[userName] = [];
        return comp.chat[userName];
    }

    // ── Send a message ──
    function sendMessage(compId, userName, text, fromAdmin = false) {
        console.log('[Chat] sendMessage:', { compId, userName, text: text?.substring(0, 20), fromAdmin });
        const data = HawdajData.get();
        if (!data.competitions || !Array.isArray(data.competitions)) {
            console.error('[Chat] No competitions array!');
            return;
        }
        const comp = data.competitions.find(c => c.id === compId);
        if (!comp) {
            console.error('[Chat] Competition not found:', compId, 'available:', data.competitions.map(c => c.id));
            return;
        }
        if (!comp.chat) comp.chat = {};
        if (!comp.chat[userName]) comp.chat[userName] = [];

        comp.chat[userName].push({
            id: 'msg_' + Date.now(),
            text: text.trim(),
            from: fromAdmin ? 'admin' : 'student',
            timestamp: new Date().toISOString(),
            read: false
        });

        console.log('[Chat] Message sent! Total msgs for', userName, ':', comp.chat[userName].length);
        HawdajData.save(true);
    }

    // ── Count unread messages ──
    function getUnreadCount(compId, userName, forAdmin = false) {
        const msgs = getMessages(compId, userName);
        return msgs.filter(m => !m.read && (forAdmin ? m.from === 'student' : m.from === 'admin')).length;
    }

    // ── Mark messages as read ──
    function markAsRead(compId, userName, forAdmin = false) {
        const msgs = getMessages(compId, userName);
        msgs.forEach(m => {
            if (forAdmin && m.from === 'student') m.read = true;
            if (!forAdmin && m.from === 'admin') m.read = true;
        });
        HawdajData.save();
    }

    // ── Get total unread for student across all competitions ──
    function getTotalUnreadForStudent(playerName) {
        const data = HawdajData.get();
        let total = 0;
        data.competitions.forEach(comp => {
            if (comp.chat && comp.chat[playerName]) {
                total += comp.chat[playerName].filter(m => !m.read && m.from === 'admin').length;
            }
        });
        return total;
    }

    // ── Get total unread for admin across all users in a competition ──
    function getTotalUnreadForAdmin(compId) {
        const data = HawdajData.get();
        const comp = data.competitions.find(c => c.id === compId);
        if (!comp || !comp.chat) return 0;
        let total = 0;
        Object.keys(comp.chat).forEach(user => {
            total += comp.chat[user].filter(m => !m.read && m.from === 'student').length;
        });
        return total;
    }

    // ── Get total unread for admin across ALL competitions ──
    function getAllAdminUnreadCount() {
        const data = HawdajData.get();
        let total = 0;
        data.competitions.forEach(comp => {
            if (comp.chat) {
                Object.keys(comp.chat).forEach(user => {
                    total += comp.chat[user].filter(m => !m.read && m.from === 'student').length;
                });
            }
        });
        return total;
    }

    // ═══════════════════════════════════════
    // ADMIN NOTIFICATIONS UI
    // ═══════════════════════════════════════

    function openAdminNotifications() {
        const data = HawdajData.get();
        const old = document.getElementById('chat-modal');
        if (old) old.remove();

        // Gather all chats
        let chatsList = [];
        data.competitions.forEach(comp => {
            if (comp.chat) {
                Object.keys(comp.chat).forEach(user => {
                    const msgs = comp.chat[user];
                    if (msgs.length > 0) {
                        const unreadCount = msgs.filter(m => !m.read && m.from === 'student').length;
                        const lastMsg = msgs[msgs.length - 1];
                        chatsList.push({
                            compName: comp.name,
                            compId: comp.id,
                            userName: user,
                            unread: unreadCount,
                            lastMsg: lastMsg,
                            time: new Date(lastMsg.timestamp)
                        });
                    }
                });
            }
        });

        // Sort by unread first, then by date desc
        chatsList.sort((a, b) => {
            if (a.unread > 0 && b.unread === 0) return -1;
            if (a.unread === 0 && b.unread > 0) return 1;
            return b.time - a.time;
        });

        const modal = document.createElement('div');
        modal.id = 'chat-modal';
        modal.style.cssText = 'position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.7);backdrop-filter:blur(8px);animation:fadeIn 0.3s ease;';

        let html = `
            <div style="background:var(--card-bg, #1a1a2e);border-radius:24px;max-width:450px;width:92%;height:70vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.1);overflow:hidden;">
                <div style="padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.1);display:flex;align-items:center;gap:12px;background:linear-gradient(135deg,rgba(255,215,0,0.1),rgba(255,140,0,0.08));">
                    <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#FFD700,#F59E0B);display:flex;align-items:center;justify-content:center;font-size:1.2rem;">🔔</div>
                    <div style="flex:1;">
                        <div style="font-weight:900;color:var(--text-heading, #FFD700);font-size:0.95rem;">إشعارات الرسائل (المشرف)</div>
                    </div>
                    <button id="close-chat-modal" style="width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,0.1);border:none;color:var(--text-primary, white);font-size:1.1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;">✕</button>
                </div>
                <div style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:8px;">
        `;

        if (chatsList.length === 0) {
            html += `<div style="text-align:center;color:var(--text-secondary);padding:40px;">لا توجد رسائل حالية.</div>`;
        } else {
            chatsList.forEach(chat => {
                const timeStr = chat.time.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
                html += `
                    <div class="chat-list-item" style="padding:12px;border-radius:12px;background:rgba(255,255,255,0.05);border:1px solid ${chat.unread > 0 ? 'rgba(255,215,0,0.4)' : 'rgba(255,255,255,0.1)'};cursor:pointer;display:flex;gap:10px;align-items:center;"
                         onclick="HawdajChat.openAdminChat('${chat.compId}', '${chat.userName}')">
                        <div style="flex:1;">
                            <div style="font-weight:900;color:var(--text-heading);display:flex;justify-content:space-between;">
                                <span>👤 ${chat.userName}</span>
                                <span style="font-size:0.65rem;color:var(--text-secondary);">${timeStr}</span>
                            </div>
                            <div style="font-size:0.7rem;color:var(--text-secondary);margin:2px 0;">🏆 ${chat.compName}</div>
                            <div style="font-size:0.8rem;color:${chat.unread > 0 ? 'white' : 'var(--text-secondary)'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:280px;">
                                ${chat.lastMsg.from === 'admin' ? 'أنت: ' : ''}${chat.lastMsg.text}
                            </div>
                        </div>
                        ${chat.unread > 0 ? `<div style="background:#e74c3c;color:white;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:900;">${chat.unread}</div>` : ''}
                    </div>
                `;
            });
        }

        html += `</div></div>`;
        modal.innerHTML = html;
        document.body.appendChild(modal);

        modal.querySelector('#close-chat-modal').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    }

    // ═══════════════════════════════════════
    // STUDENT NOTIFICATIONS UI
    // ═══════════════════════════════════════

    function openStudentNotifications() {
        const data = HawdajData.get();
        const playerName = data.player.name;
        if (!playerName) return;

        const old = document.getElementById('chat-modal');
        if (old) old.remove();

        let chatsList = [];
        data.competitions.forEach(comp => {
            if (comp.chat && comp.chat[playerName] && comp.chat[playerName].length > 0) {
                const msgs = comp.chat[playerName];
                const unreadCount = msgs.filter(m => !m.read && m.from === 'admin').length;
                const lastMsg = msgs[msgs.length - 1];
                chatsList.push({
                    compName: comp.name,
                    compId: comp.id,
                    unread: unreadCount,
                    lastMsg: lastMsg,
                    time: new Date(lastMsg.timestamp)
                });
            }
        });

        chatsList.sort((a, b) => {
            if (a.unread > 0 && b.unread === 0) return -1;
            if (a.unread === 0 && b.unread > 0) return 1;
            return b.time - a.time;
        });

        const modal = document.createElement('div');
        modal.id = 'chat-modal';
        modal.style.cssText = 'position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.7);backdrop-filter:blur(8px);animation:fadeIn 0.3s ease;';

        let html = `
            <div style="background:var(--card-bg, #1a1a2e);border-radius:24px;max-width:450px;width:92%;height:70vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.1);overflow:hidden;">
                <div style="padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.1);display:flex;align-items:center;gap:12px;background:linear-gradient(135deg,rgba(155,89,182,0.1),rgba(142,68,173,0.08));">
                    <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#9b59b6,#8e44ad);display:flex;align-items:center;justify-content:center;font-size:1.2rem;">🔔</div>
                    <div style="flex:1;">
                        <div style="font-weight:900;color:var(--text-heading, #d4a5f5);font-size:0.95rem;">إشعارات المشرف</div>
                    </div>
                    <button id="close-chat-modal" style="width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,0.1);border:none;color:var(--text-primary, white);font-size:1.1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;">✕</button>
                </div>
                <div style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:8px;">
        `;

        if (chatsList.length === 0) {
            html += `<div style="text-align:center;color:var(--text-secondary);padding:40px;">لا توجد رسائل من المشرف حالياً.</div>`;
        } else {
            chatsList.forEach(chat => {
                const timeStr = chat.time.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
                html += `
                    <div class="chat-list-item" style="padding:12px;border-radius:12px;background:rgba(255,255,255,0.05);border:1px solid ${chat.unread > 0 ? 'rgba(155,89,182,0.4)' : 'rgba(255,255,255,0.1)'};cursor:pointer;display:flex;gap:10px;align-items:center;"
                         onclick="HawdajChat.openStudentChat('${chat.compId}')">
                        <div style="flex:1;">
                            <div style="font-weight:900;color:var(--text-heading);display:flex;justify-content:space-between;">
                                <span>👨‍💼 المشرف</span>
                                <span style="font-size:0.65rem;color:var(--text-secondary);">${timeStr}</span>
                            </div>
                            <div style="font-size:0.7rem;color:var(--text-secondary);margin:2px 0;">🏆 ${chat.compName}</div>
                            <div style="font-size:0.8rem;color:${chat.unread > 0 ? 'white' : 'var(--text-secondary)'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:280px;">
                                ${chat.lastMsg.from === 'student' ? 'أنت: ' : ''}${chat.lastMsg.text}
                            </div>
                        </div>
                        ${chat.unread > 0 ? `<div style="background:#e74c3c;color:white;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:900;">${chat.unread}</div>` : ''}
                    </div>
                `;
            });
        }

        html += `</div></div>`;
        modal.innerHTML = html;
        document.body.appendChild(modal);

        modal.querySelector('#close-chat-modal').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    }

    // ═══════════════════════════════════════
    // ADMIN CHAT UI
    // ═══════════════════════════════════════

    function openAdminChat(compId, userName) {
        currentChatUser = userName;
        currentCompId = compId;

        // Mark messages as read
        markAsRead(compId, userName, true);

        // Remove existing modal
        const old = document.getElementById('chat-modal');
        if (old) old.remove();

        const modal = document.createElement('div');
        modal.id = 'chat-modal';
        modal.style.cssText = 'position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.7);backdrop-filter:blur(8px);animation:fadeIn 0.3s ease;';
        modal.innerHTML = `
            <div style="background:var(--card-bg, #1a1a2e);border-radius:24px;max-width:450px;width:92%;height:70vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.1);overflow:hidden;">
                <!-- Header -->
                <div style="padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.1);display:flex;align-items:center;gap:12px;background:linear-gradient(135deg,rgba(255,215,0,0.1),rgba(255,140,0,0.08));">
                    <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#FFD700,#F59E0B);display:flex;align-items:center;justify-content:center;font-size:1.2rem;">💬</div>
                    <div style="flex:1;">
                        <div style="font-weight:900;color:var(--text-heading, #FFD700);font-size:0.95rem;">محادثة مع ${userName}</div>
                        <div style="font-size:0.7rem;color:var(--text-secondary, #aaa);">مسابقة — رسائل مباشرة</div>
                    </div>
                    <button id="close-chat-modal" style="width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,0.1);border:none;color:var(--text-primary, white);font-size:1.1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;">✕</button>
                </div>

                <!-- Messages -->
                <div id="chat-messages" style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:8px;">
                </div>

                <!-- Input -->
                <div style="padding:12px 16px;border-top:1px solid rgba(255,255,255,0.1);display:flex;gap:8px;align-items:center;">
                    <input type="text" id="chat-input" placeholder="اكتب رسالتك..." style="flex:1;padding:10px 16px;border-radius:20px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.08);color:var(--text-primary, white);font-size:0.85rem;font-family:inherit;outline:none;">
                    <button id="chat-send-btn" style="width:40px;height:40px;border-radius:50%;border:none;background:linear-gradient(135deg,#FFD700,#F59E0B);color:#4A2800;font-size:1.1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;font-weight:900;transition:transform 0.2s;">➤</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Render messages
        renderChatMessages(compId, userName, true);

        // Close handlers
        modal.querySelector('#close-chat-modal').addEventListener('click', () => {
            clearInterval(chatPollInterval);
            modal.remove();
        });
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                clearInterval(chatPollInterval);
                modal.remove();
            }
        });

        // Send handler
        const input = modal.querySelector('#chat-input');
        const sendBtn = modal.querySelector('#chat-send-btn');

        const doSend = () => {
            const text = input.value.trim();
            if (!text) return;
            sendMessage(compId, userName, text, true);
            input.value = '';
            renderChatMessages(compId, userName, true);
            if (window.HawdajAudio?.SFX?.tap) HawdajAudio.SFX.tap();
        };

        sendBtn.addEventListener('click', doSend);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') doSend();
        });
        input.focus();

        // Poll for new messages
        chatPollInterval = setInterval(() => {
            renderChatMessages(compId, userName, true);
        }, 5000);
    }

    // ═══════════════════════════════════════
    // STUDENT CHAT UI
    // ═══════════════════════════════════════

    function openStudentChat(compId) {
        const data = HawdajData.get();
        const playerName = data.player.name;
        if (!playerName) {
            if (window.HawdajApp) HawdajApp.showToast('سجل اسمك أولاً!', 'warning');
            return;
        }

        currentChatUser = playerName;
        currentCompId = compId;

        markAsRead(compId, playerName, false);

        const old = document.getElementById('chat-modal');
        if (old) old.remove();

        const comp = data.competitions.find(c => c.id === compId);
        const compName = comp ? comp.name : 'المسابقة';

        const modal = document.createElement('div');
        modal.id = 'chat-modal';
        modal.style.cssText = 'position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.7);backdrop-filter:blur(8px);animation:fadeIn 0.3s ease;';
        modal.innerHTML = `
            <div style="background:var(--card-bg, #1a1a2e);border-radius:24px;max-width:450px;width:92%;height:70vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.1);overflow:hidden;">
                <div style="padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.1);display:flex;align-items:center;gap:12px;background:linear-gradient(135deg,rgba(155,89,182,0.1),rgba(142,68,173,0.08));">
                    <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#9b59b6,#8e44ad);display:flex;align-items:center;justify-content:center;font-size:1.2rem;">💬</div>
                    <div style="flex:1;">
                        <div style="font-weight:900;color:var(--text-heading, #d4a5f5);font-size:0.95rem;">رسالة للمشرف</div>
                        <div style="font-size:0.7rem;color:var(--text-secondary, #aaa);">${compName}</div>
                    </div>
                    <button id="close-chat-modal" style="width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,0.1);border:none;color:var(--text-primary, white);font-size:1.1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;">✕</button>
                </div>
                <div id="chat-messages" style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:8px;"></div>
                <div style="padding:12px 16px;border-top:1px solid rgba(255,255,255,0.1);display:flex;gap:8px;align-items:center;">
                    <input type="text" id="chat-input" placeholder="اكتب رسالتك للمشرف..." style="flex:1;padding:10px 16px;border-radius:20px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.08);color:var(--text-primary, white);font-size:0.85rem;font-family:inherit;outline:none;">
                    <button id="chat-send-btn" style="width:40px;height:40px;border-radius:50%;border:none;background:linear-gradient(135deg,#9b59b6,#8e44ad);color:white;font-size:1.1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;font-weight:900;">➤</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        renderChatMessages(compId, playerName, false);

        modal.querySelector('#close-chat-modal').addEventListener('click', () => {
            clearInterval(chatPollInterval);
            modal.remove();
        });
        modal.addEventListener('click', (e) => {
            if (e.target === modal) { clearInterval(chatPollInterval); modal.remove(); }
        });

        const input = modal.querySelector('#chat-input');
        const sendBtn = modal.querySelector('#chat-send-btn');

        const doSend = () => {
            const text = input.value.trim();
            if (!text) return;
            sendMessage(compId, playerName, text, false);
            input.value = '';
            renderChatMessages(compId, playerName, false);
            if (window.HawdajAudio?.SFX?.tap) HawdajAudio.SFX.tap();
        };

        sendBtn.addEventListener('click', doSend);
        input.addEventListener('keypress', (e) => { if (e.key === 'Enter') doSend(); });
        input.focus();

        chatPollInterval = setInterval(() => {
            renderChatMessages(compId, playerName, false);
        }, 5000);
    }

    // ═══════════════════════════════════════
    // RENDER MESSAGES
    // ═══════════════════════════════════════

    function renderChatMessages(compId, userName, isAdmin) {
        const container = document.getElementById('chat-messages');
        if (!container) return;

        const msgs = getMessages(compId, userName);

        if (msgs.length === 0) {
            container.innerHTML = `
                <div style="text-align:center;padding:40px 20px;color:var(--text-secondary, #888);">
                    <div style="font-size:2.5rem;margin-bottom:12px;">💬</div>
                    <p style="font-weight:600;">لا توجد رسائل بعد</p>
                    <p style="font-size:0.75rem;">ابدأ المحادثة بإرسال رسالة!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = msgs.map(m => {
            const isMine = (isAdmin && m.from === 'admin') || (!isAdmin && m.from === 'student');
            const time = new Date(m.timestamp);
            const timeStr = time.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

            return `
                <div style="display:flex;justify-content:${isMine ? 'flex-start' : 'flex-end'};animation:fadeIn 0.2s ease;">
                    <div style="
                        max-width:80%;
                        padding:10px 14px;
                        border-radius:${isMine ? '4px 16px 16px 16px' : '16px 4px 16px 16px'};
                        background:${isMine
                    ? 'linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,140,0,0.15))'
                    : 'rgba(255,255,255,0.08)'};
                        border:1px solid ${isMine ? 'rgba(255,215,0,0.3)' : 'rgba(255,255,255,0.1)'};
                    ">
                        <div style="font-size:0.85rem;color:var(--text-primary, white);line-height:1.5;word-break:break-word;">${m.text}</div>
                        <div style="font-size:0.65rem;color:var(--text-secondary, #888);margin-top:4px;text-align:${isMine ? 'left' : 'right'};">
                            ${m.from === 'admin' ? '👨‍💼' : '🎮'} ${timeStr}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Scroll to bottom
        container.scrollTop = container.scrollHeight;
    }

    return {
        getMessages,
        sendMessage,
        getUnreadCount,
        markAsRead,
        getTotalUnreadForStudent,
        getTotalUnreadForAdmin,
        getAllAdminUnreadCount,
        openAdminNotifications,
        openStudentNotifications,
        openAdminChat,
        openStudentChat,
        renderChatMessages
    };
})();

// Make globally accessible
window.HawdajChat = HawdajChat;
