import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, onValue, set, get } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-analytics.js";

const firebaseConfig = {
    apiKey: "AIzaSyDRG1ymUUpNR5wIs9Oxu64okfBndIAvFko",
    authDomain: "hawdaj-kids-71c91.firebaseapp.com",
    projectId: "hawdaj-kids-71c91",
    storageBucket: "hawdaj-kids-71c91.firebasestorage.app",
    messagingSenderId: "842981532941",
    appId: "1:842981532941:web:1ef4c7e68862c0e2547c44",
    databaseURL: "https://hawdaj-kids-71c91-default-rtdb.firebaseio.com",
    measurementId: "G-YKNCZEF5LZ"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getDatabase(app);

window.HawdajFirebase = {
    db,
    isReady: true,

    // Listen to all public global game data (admin settings)
    listenToGlobalData(onDataUpdate) {
        const gameRef = ref(db, 'global_game_data');
        onValue(gameRef, (snapshot) => {
            const val = snapshot.val();
            if (val) onDataUpdate(val);
        });
    },

    // Listen to leaderboard changes (since anyone can update it)
    listenToLeaderboard(onLeaderboardUpdate) {
        const lbRef = ref(db, 'leaderboard');
        onValue(lbRef, (snapshot) => {
            const val = snapshot.val();
            // Always update — even if null (empty leaderboard)
            onLeaderboardUpdate(val || []);
        });
    },

    // Push global settings (Admin only)
    // NOTE: Audio files are stored separately to avoid size limits
    pushGlobalData(data) {
        const gameRef = ref(db, 'global_game_data');

        // Separate audio from devSettings to avoid size issues
        const devSettingsClean = { ...(data.devSettings || {}) };
        delete devSettingsClean.audio;

        // Push main data WITHOUT allUsers — users are managed separately via
        // appendUserToGlobal to avoid wiping newly registered players on every admin save.
        return set(gameRef, {
            quizGeneral: data.quizGeneral || [],
            quizEpisodes: data.quizEpisodes || {},
            puzzles: data.puzzles || [],
            regions: data.regions || {},
            competitions: data.competitions || [],
            storeItems: data.storeItems || [],
            devSettings: devSettingsClean,
            points: data.points || {},
            dataVersion: data.dataVersion || Date.now()
            // allUsers is intentionally excluded — managed via appendUserToGlobal
        }).then(() => {
            // Push audio files separately (each under its own key)
            if (data.devSettings && data.devSettings.audio) {
                const audioRef = ref(db, 'global_game_data/devSettings/audio');
                return set(audioRef, data.devSettings.audio);
            }
        }).catch(err => {
            console.error('Firebase push failed:', err);
        });
    },

    // Append a newly registered user to Firebase without overwriting the entire global game data
    appendUserToGlobal(userObj) {
        if (!userObj || !userObj.name) return;
        const usersRef = ref(db, 'global_game_data/allUsers');
        get(usersRef).then(snapshot => {
            let users = snapshot.val() || [];
            if (!users.find(u => u.name === userObj.name)) {
                users.push(userObj);
                set(usersRef, users);
            }
        }).catch(err => {
            console.error('Firebase append user failed:', err);
        });
    },

    // Update player score in global leaderboard
    updatePlayerScore(playerName, playerEmoji, newScore) {
        if (!playerName) return;
        const lbRef = ref(db, 'leaderboard');
        get(lbRef).then(snapshot => {
            let lb = snapshot.val() || [];

            // Allow arrays initially
            if (!Array.isArray(lb)) {
                lb = Object.values(lb);
            }

            const existingIdx = lb.findIndex(p => p.name === playerName);
            if (existingIdx >= 0) {
                // Always update score (not just higher — to handle name changes etc.)
                lb[existingIdx].score = newScore;
                lb[existingIdx].emoji = playerEmoji;
            } else {
                lb.push({ name: playerName, emoji: playerEmoji, score: newScore });
            }

            // Sort and take top 50
            lb.sort((a, b) => b.score - a.score);
            lb = lb.slice(0, 50);

            set(lbRef, lb);
        }).catch(err => {
            console.error('Firebase leaderboard update failed:', err);
        });
    },

    // Delete a specific user from Firebase leaderboard
    deleteUserFromLeaderboard(playerName) {
        const lbRef = ref(db, 'leaderboard');
        get(lbRef).then(snapshot => {
            let lb = snapshot.val() || [];
            if (!Array.isArray(lb)) lb = Object.values(lb);
            lb = lb.filter(p => p.name !== playerName);
            set(lbRef, lb);
        });
    },

    // Clear entire leaderboard on Firebase
    clearLeaderboard() {
        const lbRef = ref(db, 'leaderboard');
        set(lbRef, []);
    }
};

// Dispatch event so other scripts know firebase is ready
window.dispatchEvent(new Event('HawdajFirebaseReady'));

// Sync leaderboard score after a short delay to let data.js load first
setTimeout(() => {
    const data = window.HawdajData ? window.HawdajData.get() : null;
    // Only sync if we have a registered player with actual points
    if (data && data.player.name && data.player.totalScore > 0) {
        window.HawdajFirebase.updatePlayerScore(
            data.player.name,
            data.player.emoji,
            data.player.totalScore
        );
    }
}, 2000);
