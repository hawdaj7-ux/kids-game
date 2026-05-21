/* ============================================
   HAWDAJ GAME — Admin Panel Logic
   ============================================ */

const AdminPanel = (() => {
    let isLoggedIn = false;
    let editingQuestion = null;
    let editingCategory = null;

    function init() {
        document.getElementById('save-store-item')?.addEventListener('click', addStoreItem);

        const deleteGenQBtn = document.getElementById('delete-selected-general-q');
        if (deleteGenQBtn) deleteGenQBtn.addEventListener('click', () => deleteSelectedQuestions('general'));
        
        const deleteEpQBtn = document.getElementById('delete-selected-episode-q');
        if (deleteEpQBtn) deleteEpQBtn.addEventListener('click', () => deleteSelectedQuestions('episode'));

        const randSetting = document.getElementById('quiz-randomize-setting');
        if (randSetting) {
            randSetting.addEventListener('change', (e) => {
                const data = HawdajData.get();
                if (!data.devSettings) data.devSettings = {};
                data.devSettings.quizRandomize = e.target.checked;
                HawdajData.save(true);
            });
        }

        const optionsCountSetting = document.getElementById('quiz-options-count');
        if (optionsCountSetting) {
            optionsCountSetting.addEventListener('change', (e) => {
                const data = HawdajData.get();
                if (!data.devSettings) data.devSettings = {};
                data.devSettings.quizOptionsCount = parseInt(e.target.value);
                HawdajData.save(true);
                HawdajApp.showToast('تم حفظ عدد الخيارات ✅', 'success');
            });
        }

        const questionLimitSetting = document.getElementById('quiz-question-limit');
        if (questionLimitSetting) {
            questionLimitSetting.addEventListener('change', (e) => {
                const data = HawdajData.get();
                if (!data.devSettings) data.devSettings = {};
                data.devSettings.quizQuestionLimit = parseInt(e.target.value);
                HawdajData.save(true);
                HawdajApp.showToast('تم حفظ عدد الأسئلة ✅', 'success');
            });
        }

        const selectAllGenBtn = document.getElementById('select-all-general-q');
        if (selectAllGenBtn) selectAllGenBtn.addEventListener('click', () => {
            const checkboxes = document.querySelectorAll('#general-q-list .q-select-checkbox');
            const allChecked = Array.from(checkboxes).every(cb => cb.checked);
            checkboxes.forEach(cb => cb.checked = !allChecked);
        });

        const selectAllEpBtn = document.getElementById('select-all-episode-q');
        if (selectAllEpBtn) selectAllEpBtn.addEventListener('click', () => {
            const checkboxes = document.querySelectorAll('#episode-q-list .q-select-checkbox');
            const allChecked = Array.from(checkboxes).every(cb => cb.checked);
            checkboxes.forEach(cb => cb.checked = !allChecked);
        });

        setupTabs();
        setupQuestionModal();
        setupUserManagement();
        setupCompetitionForm();
    }

    function setupCompetitionForm() {
        // Social task add button
        const addSocialBtn = document.getElementById('add-social-task-btn');
        if (addSocialBtn) {
            addSocialBtn.addEventListener('click', () => {
                const container = document.getElementById('comp-social-tasks');
                if (!container) return;
                const row = document.createElement('div');
                row.className = 'social-task-row';
                row.style.cssText = 'display:flex; gap:6px; align-items:center;';
                row.innerHTML = '<select class="input-field social-platform" style="width:auto; padding:6px; font-size:var(--fs-xs);">'
                    + '<option value="youtube">YouTube</option>'
                    + '<option value="tiktok">TikTok</option>'
                    + '<option value="twitter">Twitter/X</option>'
                    + '<option value="instagram">Instagram</option>'
                    + '<option value="telegram">Telegram</option>'
                    + '<option value="other">أخرى</option>'
                    + '</select>'
                    + '<input type="text" class="input-field social-url" placeholder="رابط الحساب/القناة" style="flex:1; padding:6px; font-size:var(--fs-xs);">'
                    + '<button type="button" style="background:#e74c3c; color:white; border:none; border-radius:8px; padding:4px 8px; cursor:pointer; font-size:var(--fs-xs);" onclick="this.parentElement.remove();">✕</button>';
                container.appendChild(row);
                HawdajAudio.SFX.tap();
            });
        }

        // Question source toggle
        document.querySelectorAll('input[name="comp-q-source"]').forEach(radio => {
            radio.addEventListener('change', () => {
                const customDiv = document.getElementById('comp-custom-questions');
                if (customDiv) customDiv.style.display = radio.value === 'custom' && radio.checked ? 'block' : 'none';
            });
        });

        // Share task toggle
        const shareCheck = document.getElementById('comp-share-enabled');
        const shareFields = document.getElementById('comp-share-fields');
        if (shareCheck && shareFields) {
            shareFields.style.display = 'none';
            shareCheck.addEventListener('change', () => {
                shareFields.style.display = shareCheck.checked ? 'flex' : 'none';
            });
        }

        // Custom question add button
        const addQBtn = document.getElementById('comp-add-q-btn');
        if (addQBtn) {
            addQBtn.addEventListener('click', () => {
                const qText = document.getElementById('comp-q-text')?.value?.trim();
                const opt0 = document.getElementById('comp-q-opt0')?.value?.trim();
                const opt1 = document.getElementById('comp-q-opt1')?.value?.trim();
                const opt2 = document.getElementById('comp-q-opt2')?.value?.trim();
                const opt3 = document.getElementById('comp-q-opt3')?.value?.trim();
                const correct = parseInt(document.getElementById('comp-q-correct')?.value || '0');

                if (!qText || !opt0 || !opt1 || !opt2 || !opt3) {
                    HawdajApp.showToast('يرجى ملء جميع الحقول!', 'error');
                    return;
                }

                // Store question in a temp array on the form
                if (!window._compCustomQuestions) window._compCustomQuestions = [];
                window._compCustomQuestions.push({
                    question: qText,
                    options: [opt0, opt1, opt2, opt3],
                    correct: correct
                });

                // Show in list
                const list = document.getElementById('comp-added-questions-list');
                if (list) {
                    const qItem = document.createElement('div');
                    qItem.style.cssText = 'background:rgba(46,204,113,0.15); border:1px solid rgba(46,204,113,0.3); border-radius:10px; padding:8px 12px; display:flex; align-items:center; justify-content:space-between;';
                    const qIdx = window._compCustomQuestions.length;
                    qItem.innerHTML = '<div style="flex:1;"><span style="color:#2ecc71; font-weight:900; font-size:0.75rem;">سؤال ' + qIdx + ':</span> <span style="color:var(--text-primary); font-size:0.8rem;">' + qText + '</span></div>' +
                        '<button type="button" style="background:#e74c3c; color:white; border:none; border-radius:6px; padding:3px 8px; cursor:pointer; font-size:0.7rem;" onclick="window._compCustomQuestions.splice(' + (qIdx - 1) + ',1); this.parentElement.remove();">✕</button>';
                    list.appendChild(qItem);
                }

                // Clear inputs
                document.getElementById('comp-q-text').value = '';
                document.getElementById('comp-q-opt0').value = '';
                document.getElementById('comp-q-opt1').value = '';
                document.getElementById('comp-q-opt2').value = '';
                document.getElementById('comp-q-opt3').value = '';
                document.getElementById('comp-q-correct').value = '0';

                HawdajApp.showToast('✅ تم إضافة السؤال بنجاح!', 'success');
                HawdajAudio.SFX.correct();
            });
        }
    }

    function setupTabs() {
        document.querySelectorAll('#admin-tabs .tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('#admin-tabs .tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const section = tab.dataset.adminTab;
                document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
                const target = document.querySelector(`[data-admin-section="${section}"]`);
                if (target) target.classList.add('active');

                // Refresh content
                if (section === 'quiz') { refreshQuizAdmin(); loadQuizSettings(); }
                if (section === 'puzzle') refreshPuzzleAdmin();
                if (section === 'map') refreshMapAdmin();
                if (section === 'competitions') refreshCompAdmin();
                if (section === 'points') loadPointsConfig();
                if (section === 'store') refreshStoreAdmin();
                if (section === 'dev') loadDevSettings();
                if (section === 'users') renderUsers();

                HawdajAudio.SFX.tap();
            });
        });
    }

    function login() {
        const pw = document.getElementById('admin-password').value;
        const data = HawdajData.get();

        if (pw === data.adminPassword) {
            isLoggedIn = true;
            HawdajApp.navigate('admin-panel');
            HawdajAudio.SFX.correct();
            refreshQuizAdmin();
            loadPointsConfig();
            populateEpisodeSelect();
            populateRegionSelect();
            updateThemeUI();


        } else {
            HawdajAudio.SFX.wrong();
            HawdajApp.showToast('كلمة المرور خاطئة', 'error');
            HawdajEffects.shake('.admin-login-card');
        }
        document.getElementById('admin-password').value = '';
    }

    function logout() {
        isLoggedIn = false;
        HawdajApp.navigate('main-menu');
        HawdajAudio.SFX.tap();
    }

    // ── Quiz Management ──
    function populateEpisodeSelect() {
        const select = document.getElementById('episode-select');
        if (!select) return;
        select.innerHTML = '';
        for (let ep = 1; ep <= 20; ep++) {
            const opt = document.createElement('option');
            opt.value = ep;
            opt.textContent = `حلقة ${ep}: ${HawdajData.EPISODE_NAMES[ep]}`;
            select.appendChild(opt);
        }
        select.addEventListener('change', () => refreshEpisodeQuestions());
        refreshEpisodeQuestions();
    }

    function refreshQuizAdmin() {
        const data = HawdajData.get();
        const list = document.getElementById('general-q-list');
        const randSetting = document.getElementById('quiz-randomize-setting');
        
        if (randSetting) {
            // Default to true if unassigned
            randSetting.checked = data.devSettings?.quizRandomize !== false;
        }

        if (!list) return;

        list.innerHTML = '';
        data.quizGeneral.forEach((q, i) => {
            list.appendChild(createQuestionItem(q, 'general', i, data.quizGeneral.length));
        });

        if (data.quizGeneral.length === 0) {
            list.innerHTML = '<p style="text-align:center;color:var(--text-secondary);padding:20px;">لا توجد أسئلة</p>';
        }
    }

    function refreshEpisodeQuestions() {
        const ep = parseInt(document.getElementById('episode-select')?.value);
        if (!ep) return;

        const data = HawdajData.get();
        const questions = data.quizEpisodes[ep] || [];
        const list = document.getElementById('episode-q-list');
        if (!list) return;

        list.innerHTML = '';
        questions.forEach((q, i) => {
            list.appendChild(createQuestionItem(q, ep, i, questions.length));
        });

        if (questions.length === 0) {
            list.innerHTML = '<p style="text-align:center;color:var(--text-secondary);padding:20px;">لا توجد أسئلة لهذه الحلقة</p>';
        }
    }

    function createQuestionItem(q, category, index, totalCount) {
        const item = document.createElement('div');
        item.className = 'question-item';
        item.innerHTML = `
      <div style="display:flex; align-items:center; gap:12px; flex:1;">
          <input type="checkbox" class="q-select-checkbox" data-id="${q.id}" style="width:20px;height:20px;cursor:pointer;flex-shrink:0;accent-color:var(--accent-primary);">
          <span class="q-text" style="flex:1; margin:0;"><strong style="color:var(--accent-primary);margin-left:4px;">${index + 1}.</strong> ${q.question}</span>
      </div>
      <div class="q-actions">
        <button class="q-action-btn move-up" title="رفع ⬆" style="background:rgba(46,204,113,0.2);color:#2ecc71;${index === 0 ? 'opacity:0.3;pointer-events:none;' : ''}">⬆</button>
        <button class="q-action-btn move-down" title="نزول ⬇" style="background:rgba(52,152,219,0.2);color:#3498db;${index === totalCount - 1 ? 'opacity:0.3;pointer-events:none;' : ''}">⬇</button>
        <button class="q-action-btn edit" data-id="${q.id}" title="تعديل">✏️</button>
        <button class="q-action-btn delete" data-id="${q.id}" title="حذف">🗑️</button>
      </div>
    `;

        item.querySelector('.move-up').addEventListener('click', () => {
            moveQuestion(category, q.id, -1);
        });

        item.querySelector('.move-down').addEventListener('click', () => {
            moveQuestion(category, q.id, 1);
        });

        item.querySelector('.edit').addEventListener('click', () => {
            openEditQuestion(q, category);
        });

        item.querySelector('.delete').addEventListener('click', () => {
            if (confirm('هل تريد حذف هذا السؤال؟')) {
                HawdajData.deleteQuestion(category, q.id);
                if (category === 'general') refreshQuizAdmin();
                else refreshEpisodeQuestions();
                HawdajAudio.SFX.tap();
                HawdajApp.showToast('تم الحذف', 'info');
            }
        });

        return item;
    }

    function deleteSelectedQuestions(category) {
        let catForDelete = category;
        if (category === 'episode') {
           catForDelete = parseInt(document.getElementById('episode-select').value);
           if (!catForDelete) return;
        }
        
        const listId = category === 'general' ? 'general-q-list' : 'episode-q-list';
        const checkboxes = document.querySelectorAll(`#${listId} .q-select-checkbox:checked`);
        if (checkboxes.length === 0) {
            HawdajApp.showToast('لم يتم تحديد أي أسئلة للحذف', 'error');
            return;
        }
        
        if (confirm(`هل أنت متأكد من حذف ${checkboxes.length} سؤال بشكل نهائي؟`)) {
            checkboxes.forEach(cb => {
                HawdajData.deleteQuestion(catForDelete, cb.dataset.id);
            });
            if (category === 'general') refreshQuizAdmin();
            else refreshEpisodeQuestions();
            HawdajAudio.SFX.tap();
            HawdajApp.showToast(`تم حذف ${checkboxes.length} سؤال بنجاح`, 'info');
        }
    }

    function moveQuestion(category, questionId, direction) {
        const data = HawdajData.get();
        let arr;
        if (category === 'general') {
            arr = data.quizGeneral;
        } else {
            arr = data.quizEpisodes[category] || [];
        }

        const idx = arr.findIndex(q => q.id === questionId);
        const newIdx = idx + direction;
        if (idx < 0 || newIdx < 0 || newIdx >= arr.length) return;

        [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
        HawdajData.save(true);

        if (category === 'general') refreshQuizAdmin();
        else refreshEpisodeQuestions();
        HawdajAudio.SFX.tap();
    }

    // ── Question Modal ──
    function setupQuestionModal() {
        // Cancel
        document.getElementById('cancel-question')?.addEventListener('click', () => {
            document.getElementById('question-modal').classList.remove('active');
        });

        // Image upload handler
        document.getElementById('q-image-upload')?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Compress image to keep localStorage manageable
            const reader = new FileReader();
            reader.onload = (ev) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const maxSize = 400;
                    let w = img.width, h = img.height;
                    if (w > maxSize || h > maxSize) {
                        if (w > h) { h = (h / w) * maxSize; w = maxSize; }
                        else { w = (w / h) * maxSize; h = maxSize; }
                    }
                    canvas.width = w;
                    canvas.height = h;
                    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                    const base64 = canvas.toDataURL('image/jpeg', 0.7);
                    document.getElementById('q-image').value = base64;
                    document.getElementById('q-image-preview').src = base64;
                    document.getElementById('q-image-preview').style.display = 'block';
                    document.getElementById('q-image-clear').style.display = 'inline-flex';
                };
                img.src = ev.target.result;
            };
            reader.readAsDataURL(file);
            e.target.value = ''; // Reset file input
        });

        // Correct option selector
        document.querySelectorAll('#correct-select .correct-opt').forEach(opt => {
            opt.addEventListener('click', () => {
                document.querySelectorAll('#correct-select .correct-opt').forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');
            });
        });
    }

    function openAddQuestion(category) {
        editingQuestion = null;
        editingCategory = category;
        document.getElementById('q-modal-title').textContent = 'إضافة سؤال';

        // Clear form
        document.getElementById('q-text').value = '';
        document.getElementById('q-image').value = '';
        document.getElementById('q-hint').value = '';
        document.getElementById('q-image-preview').style.display = 'none';
        document.getElementById('q-image-clear').style.display = 'none';
        for (let i = 0; i < 4; i++) document.getElementById(`q-opt-${i}`).value = '';
        document.querySelectorAll('#correct-select .correct-opt').forEach((o, i) =>
            o.classList.toggle('selected', i === 0));

        document.getElementById('question-modal').classList.add('active');
    }

    function openEditQuestion(q, category) {
        editingQuestion = q;
        editingCategory = category;
        document.getElementById('q-modal-title').textContent = 'تعديل سؤال';

        document.getElementById('q-text').value = q.question;
        document.getElementById('q-image').value = q.image || '';
        document.getElementById('q-hint').value = q.hint || '';

        // Show existing image if any
        if (q.image) {
            document.getElementById('q-image-preview').src = q.image;
            document.getElementById('q-image-preview').style.display = 'block';
            document.getElementById('q-image-clear').style.display = 'inline-flex';
        } else {
            document.getElementById('q-image-preview').style.display = 'none';
            document.getElementById('q-image-clear').style.display = 'none';
        }

        q.options.forEach((opt, i) => {
            document.getElementById(`q-opt-${i}`).value = opt;
        });
        document.querySelectorAll('#correct-select .correct-opt').forEach((o, i) =>
            o.classList.toggle('selected', i === q.correct));

        document.getElementById('question-modal').classList.add('active');
    }

    function saveQuestion() {
        const question = document.getElementById('q-text').value.trim();
        if (!question) {
            HawdajApp.showToast('اكتب السؤال أولاً', 'error');
            return;
        }

        const options = [];
        for (let i = 0; i < 4; i++) {
            const val = document.getElementById(`q-opt-${i}`).value.trim();
            if (!val) {
                HawdajApp.showToast('اكتب جميع الخيارات', 'error');
                return;
            }
            options.push(val);
        }

        const correctEl = document.querySelector('#correct-select .correct-opt.selected');
        const correct = correctEl ? parseInt(correctEl.dataset.correct) : 0;

        const qObj = {
            question,
            options,
            correct,
            image: document.getElementById('q-image').value.trim(),
            hint: document.getElementById('q-hint').value.trim()
        };

        if (editingQuestion) {
            // Update existing
            qObj.id = editingQuestion.id;
            const data = HawdajData.get();
            if (editingCategory === 'general') {
                const idx = data.quizGeneral.findIndex(q => q.id === qObj.id);
                if (idx >= 0) data.quizGeneral[idx] = qObj;
            } else {
                const ep = editingCategory;
                const idx = (data.quizEpisodes[ep] || []).findIndex(q => q.id === qObj.id);
                if (idx >= 0) data.quizEpisodes[ep][idx] = qObj;
            }
            HawdajData.save(true);
        } else {
            HawdajData.addQuestion(editingCategory, qObj);
        }

        document.getElementById('question-modal').classList.remove('active');
        if (editingCategory === 'general') refreshQuizAdmin();
        else refreshEpisodeQuestions();
        HawdajAudio.SFX.correct();
        HawdajApp.showToast('تم الحفظ ✓', 'success');
    }

    // ── Puzzle Management ──
    function addPuzzle() {
        const name = document.getElementById('puzzle-name-input')?.value.trim();
        const image = document.getElementById('puzzle-img-data')?.value;
        const editId = document.getElementById('puzzle-edit-id')?.value;

        if (!name) {
            HawdajApp.showToast('اكتب اسم المعلم', 'error');
            return;
        }

        const data = HawdajData.get();

        if (editId) {
            // Edit existing
            const puzzle = data.puzzles.find(p => p.id === editId);
            if (puzzle) {
                puzzle.name = name;
                if (image) puzzle.image = image;
            }
            HawdajData.save(true);
            HawdajApp.showToast('تم تعديل البازل ✓', 'success');
        } else {
            // Add new
            if (!image) {
                HawdajApp.showToast('ارفع صورة البازل', 'error');
                return;
            }
            data.puzzles.push({
                id: 'p_' + Date.now(),
                name,
                image
            });
            HawdajData.save(true);
            HawdajApp.showToast('تم إضافة البازل 🖼️', 'success');
        }

        clearPuzzleForm();
        refreshPuzzleAdmin();
        HawdajAudio.SFX.correct();
    }

    function clearPuzzleForm() {
        document.getElementById('puzzle-name-input').value = '';
        document.getElementById('puzzle-img-data').value = '';
        document.getElementById('puzzle-edit-id').value = '';
        document.getElementById('puzzle-img-preview').style.display = 'none';
        document.getElementById('puzzle-img-clear').style.display = 'none';
    }

    function editPuzzle(puzzleId) {
        const data = HawdajData.get();
        const puzzle = data.puzzles.find(p => p.id === puzzleId);
        if (!puzzle) return;

        document.getElementById('puzzle-name-input').value = puzzle.name;
        document.getElementById('puzzle-edit-id').value = puzzle.id;
        if (puzzle.image) {
            document.getElementById('puzzle-img-data').value = puzzle.image;
            document.getElementById('puzzle-img-preview').src = puzzle.image;
            document.getElementById('puzzle-img-preview').style.display = 'block';
            document.getElementById('puzzle-img-clear').style.display = 'inline-flex';
        }
        // Scroll to form
        document.querySelector('[data-admin-section="puzzle"]')?.scrollTo({ top: 0, behavior: 'smooth' });
        HawdajApp.showToast('عدّل البيانات واضغط حفظ', 'info');
    }

    function refreshPuzzleAdmin() {
        const data = HawdajData.get();
        const list = document.getElementById('puzzle-img-list');
        if (!list) return;

        list.innerHTML = '';
        if (data.puzzles.length === 0) {
            list.innerHTML = '<p style="text-align:center;color:var(--text-secondary);padding:20px;">لا توجد بازلات</p>';
            return;
        }

        data.puzzles.forEach((p, i) => {
            const item = document.createElement('div');
            item.className = 'question-item';
            item.style.cssText = 'flex-direction:column; align-items:stretch; gap:8px;';
            const hasImg = p.image && p.image.startsWith('data:');
            item.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span class="q-text" style="font-weight:700;"><strong style="color:var(--accent-primary);">${i + 1}.</strong> 🏛️ ${p.name}</span>
          <div class="q-actions">
            <button class="q-action-btn edit-puzzle" title="تعديل" style="background:rgba(52,152,219,0.2);color:#3498db;">✏️</button>
            <button class="q-action-btn delete" title="حذف">🗑️</button>
          </div>
        </div>
        ${hasImg ? `<img src="${p.image}" style="max-width:100%;max-height:80px;border-radius:8px;object-fit:cover;">` : '<div style="font-size:var(--fs-xs);color:var(--text-secondary);">📁 ' + (p.image || 'لا توجد صورة') + '</div>'}
      `;
            item.querySelector('.edit-puzzle').addEventListener('click', () => editPuzzle(p.id));
            item.querySelector('.delete').addEventListener('click', () => {
                if (confirm('حذف هذا البازل؟')) {
                    data.puzzles = data.puzzles.filter(x => x.id !== p.id);
                    HawdajData.save(true);
                    refreshPuzzleAdmin();
                    HawdajApp.showToast('تم الحذف', 'info');
                }
            });
            list.appendChild(item);
        });
    }

    // ── Map Management ──
    function populateRegionSelect() {
        const select = document.getElementById('region-select');
        if (!select) return;
        const data = HawdajData.get();
        select.innerHTML = '';
        Object.entries(data.regions).forEach(([id, region]) => {
            const opt = document.createElement('option');
            opt.value = id;
            opt.textContent = region.name;
            select.appendChild(opt);
        });
        select.addEventListener('change', () => refreshMapQuestions());
        refreshMapQuestions();
    }

    function refreshMapAdmin() {
        refreshMapQuestions();
    }

    function refreshMapQuestions() {
        const regionId = document.getElementById('region-select')?.value;
        if (!regionId) return;

        const data = HawdajData.get();
        const region = data.regions[regionId];
        if (!region) return;

        // Load region facts into textarea
        const factsEl = document.getElementById('region-facts-edit');
        if (factsEl) {
            factsEl.value = (region.facts || '').replace(/\\n/g, '\n');
        }

        // Load clothing info
        const clothingText = document.getElementById('region-clothing-text');
        if (clothingText) clothingText.value = region.clothingText || '';

        const clothingImg = document.getElementById('region-clothing-img');
        const clothingPreview = document.getElementById('region-clothing-preview');
        const clothingClear = document.getElementById('region-clothing-clear');
        if (clothingImg) clothingImg.value = region.clothingImage || '';
        if (region.clothingImage) {
            if (clothingPreview) { clothingPreview.src = region.clothingImage; clothingPreview.style.display = 'block'; }
            if (clothingClear) clothingClear.style.display = 'inline-flex';
        } else {
            if (clothingPreview) clothingPreview.style.display = 'none';
            if (clothingClear) clothingClear.style.display = 'none';
        }

        // Render existing questions
        const list = document.getElementById('region-q-list');
        if (!list) return;

        list.innerHTML = '';
        const questions = region.questions || [];

        if (questions.length === 0) {
            list.innerHTML = '<p style="text-align:center;color:var(--text-secondary);padding:12px;">لا توجد أسئلة لهذه المنطقة</p>';
            return;
        }

        questions.forEach(q => {
            const item = document.createElement('div');
            item.className = 'question-item';
            item.style.cssText = 'flex-direction:column; align-items:stretch; gap:6px;';

            const correctText = q.options ? q.options[q.correct] : '';
            item.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span class="q-text" style="font-weight:700;">${q.question}</span>
          <div class="q-actions">
            <button class="q-action-btn delete" title="حذف">🗑️</button>
          </div>
        </div>
        <div style="font-size:var(--fs-xs); color:var(--text-secondary);">
          ✅ الإجابة: ${correctText}
        </div>
      `;
            item.querySelector('.delete').addEventListener('click', () => {
                if (confirm('حذف هذا السؤال؟')) {
                    region.questions = region.questions.filter(x => x.id !== q.id);
                    HawdajData.save(true);
                    refreshMapQuestions();
                    HawdajApp.showToast('تم الحذف', 'info');
                }
            });
            list.appendChild(item);
        });
    }

    function saveRegionFacts() {
        const regionId = document.getElementById('region-select')?.value;
        if (!regionId) return;

        const data = HawdajData.get();
        const region = data.regions[regionId];
        if (!region) return;

        region.facts = document.getElementById('region-facts-edit')?.value.trim() || '';
        region.clothingText = document.getElementById('region-clothing-text')?.value.trim() || '';
        region.clothingImage = document.getElementById('region-clothing-img')?.value || '';
        HawdajData.save(true);

        HawdajAudio.SFX.correct();
        HawdajApp.showToast('تم حفظ معلومات المنطقة ✓', 'success');
    }

    function addRegionQuestion() {
        const regionId = document.getElementById('region-select')?.value;
        if (!regionId) return;

        const question = document.getElementById('region-q-text')?.value.trim();
        if (!question) {
            HawdajApp.showToast('اكتب نص السؤال', 'error');
            return;
        }

        const options = [];
        for (let i = 0; i < 4; i++) {
            const val = document.getElementById(`region-q-opt${i}`)?.value.trim();
            if (!val) {
                HawdajApp.showToast('اكتب جميع الخيارات الأربعة', 'error');
                return;
            }
            options.push(val);
        }

        const correct = parseInt(document.getElementById('region-q-correct')?.value || '0');

        const data = HawdajData.get();
        const region = data.regions[regionId];
        if (!region.questions) region.questions = [];

        region.questions.push({
            id: 'rq_' + Date.now(),
            question,
            options,
            correct
        });
        HawdajData.save(true);

        // Clear form
        document.getElementById('region-q-text').value = '';
        for (let i = 0; i < 4; i++) document.getElementById(`region-q-opt${i}`).value = '';
        document.getElementById('region-q-correct').value = '0';

        refreshMapQuestions();
        HawdajAudio.SFX.correct();
        HawdajApp.showToast('تم إضافة السؤال ✓', 'success');
    }

    // ── Theme ──
    function toggleTheme() {
        const data = HawdajData.get();
        data.theme = data.theme === 'normal' ? 'ramadan' : 'normal';
        HawdajData.save(true);
        document.body.className = data.theme;
        updateThemeUI();
        HawdajAudio.SFX.tap();
    }

    function updateThemeUI() {
        const data = HawdajData.get();
        const label = document.getElementById('current-theme-label');
        if (label) {
            label.textContent = data.theme === 'normal' ? 'عادي ☀️' : 'رمضاني 🌙';
        }
    }

    // ── Points ──
    function loadPointsConfig() {
        const data = HawdajData.get();
        const pts = data.points;
        if (document.getElementById('pts-correct')) document.getElementById('pts-correct').value = pts.correct;
        if (document.getElementById('pts-speed')) document.getElementById('pts-speed').value = pts.speed;
        if (document.getElementById('pts-puzzle')) document.getElementById('pts-puzzle').value = pts.puzzle;
        if (document.getElementById('pts-region')) document.getElementById('pts-region').value = pts.region;
    }

    function savePoints() {
        const data = HawdajData.get();
        data.points.correct = parseInt(document.getElementById('pts-correct').value) || 10;
        data.points.speed = parseInt(document.getElementById('pts-speed').value) || 5;
        data.points.puzzle = parseInt(document.getElementById('pts-puzzle').value) || 50;
        data.points.region = parseInt(document.getElementById('pts-region').value) || 30;
        HawdajData.save(true);
        HawdajAudio.SFX.correct();
        HawdajApp.showToast('تم حفظ النقاط ✓', 'success');
    }

    // ── Competitions ──
    function createCompetition() {
        const name = document.getElementById('comp-name-input')?.value.trim();
        const prize = document.getElementById('comp-prize-input')?.value.trim();
        const endDate = document.getElementById('comp-end-date')?.value;
        const description = document.getElementById('comp-desc-input')?.value.trim();
        const questionCount = parseInt(document.getElementById('comp-question-count')?.value) || 10;

        if (!name || !prize || !endDate) {
            HawdajApp.showToast('أكمل الحقول المطلوبة (الاسم، الجائزة، التاريخ)', 'error');
            return;
        }

        const games = [];
        if (document.getElementById('comp-game-quiz')?.checked) games.push('quiz');
        if (document.getElementById('comp-game-puzzle')?.checked) games.push('puzzle');
        if (games.length === 0) games.push('quiz');

        const socialTasks = [];
        document.querySelectorAll('#comp-social-tasks .social-task-row').forEach(row => {
            const platform = row.querySelector('.social-platform')?.value;
            const url = row.querySelector('.social-url')?.value.trim();
            if (platform && url) socialTasks.push({ platform, url, type: 'subscribe' });
        });

        let shareTask = null;
        if (document.getElementById('comp-share-enabled')?.checked) {
            const shareUrl = document.getElementById('comp-share-url')?.value.trim();
            const shareCount = parseInt(document.getElementById('comp-share-count')?.value) || 5;
            if (shareUrl) shareTask = { url: shareUrl, targetCount: shareCount, type: 'share' };
        }

        const puzzleLevel = document.getElementById('comp-puzzle-level')?.value || 'easy';
        const puzzleTime = parseInt(document.getElementById('comp-puzzle-time')?.value) || 0;
        const quizTime = parseInt(document.getElementById('comp-quiz-time')?.value) || 0;
        const qSource = document.querySelector('input[name="comp-q-source"]:checked')?.value || 'existing';
        const customQuestions = (qSource === 'custom' && window._compCustomQuestions) ? [...window._compCustomQuestions] : [];

        const data = HawdajData.get();
        data.competitions.push({
            id: 'comp_' + Date.now(),
            name, prize, endDate, games, questionCount,
            puzzleLevel, puzzleTime, quizTime, qSource, customQuestions,
            active: true,
            description: description || '',
            typeLabel: games.map(g => g === 'quiz' ? 'الأسئلة' : 'البازل').join(' + '),
            socialTasks, shareTask,
            participants: [], scores: {}, winner: null, chat: {},
            createdAt: new Date().toISOString()
        });
        HawdajData.save(true);

        document.getElementById('comp-name-input').value = '';
        document.getElementById('comp-prize-input').value = '';
        document.getElementById('comp-end-date').value = '';
        document.getElementById('comp-desc-input').value = '';
        document.getElementById('comp-question-count').value = '10';
        const sc = document.getElementById('comp-social-tasks');
        if (sc) sc.innerHTML = '';

        if (window._compCustomQuestions) window._compCustomQuestions = [];
        const customQList = document.getElementById('comp-added-questions-list');
        if (customQList) customQList.innerHTML = '';

        refreshCompAdmin();
        HawdajAudio.SFX.correct();
        HawdajApp.showToast('تم إنشاء المسابقة 🏆', 'success');
    }

    function refreshCompAdmin() {
        const data = HawdajData.get();
        const list = document.getElementById('comp-list');
        if (!list) return;
        list.innerHTML = '';
        if (data.competitions.length === 0) {
            list.innerHTML = '<p style="text-align:center;color:var(--text-secondary);padding:16px;">لا توجد مسابقات</p>';
            return;
        }
        data.competitions.forEach(c => {
            const item = document.createElement('div');
            item.className = 'comp-item';
            item.style.cssText = 'flex-direction:column; align-items:stretch; gap:8px;';
            const isActive = new Date(c.endDate) > new Date() && c.active !== false;
            const gamesArr = c.games || [c.type || 'all'];
            const gamesStr = gamesArr.map(g => g === 'quiz' ? '❓ الأسئلة' : g === 'puzzle' ? '🧩 البازل' : '🎮 الكل').join('، ');
            const pCount = (c.participants || []).length;
            const sCount = (c.socialTasks || []).length;
            item.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="font-weight:900; color:var(--text-heading);">🏆 ${c.name}</div>
            <div style="margin-top:4px; font-size:var(--fs-xs);">
              ${isActive ? '🟢 نشطة' : '🔴 منتهية'} — حتى ${c.endDate}
            </div>
          </div>
          <div style="display:flex; gap:4px;">
            <button class="q-action-btn view-comp" title="التفاصيل" style="background:rgba(52,152,219,0.2);color:#3498db;">📊</button>
            <button class="q-action-btn toggle-comp" title="${c.active !== false ? 'إيقاف' : 'تفعيل'}"
              style="background:rgba(${c.active !== false ? '231,76,60' : '46,204,113'},0.2);color:${c.active !== false ? '#e74c3c' : '#2ecc71'};">
              ${c.active !== false ? '⏸' : '▶'}
            </button>
            <button class="q-action-btn delete" title="حذف">🗑️</button>
          </div>
        </div>
        <div style="font-size:var(--fs-xs); color:var(--text-secondary); display:flex; gap:10px; flex-wrap:wrap;">
          <span>🎮 ${gamesStr}</span>
          <span>📝 ${c.questionCount || '?'} سؤال ${c.qSource === 'custom' ? '(مخصصة)' : ''}</span>
          ${c.games && c.games.includes('puzzle') ? `<span>🧩 ${c.puzzleLevel === 'hard' ? 'صعب' : 'سهل'}</span>` : ''}
          <span>👥 ${pCount} مشترك</span>
          ${sCount > 0 ? '<span>📱 ' + sCount + ' مهمة</span>' : ''}
          ${c.shareTask ? '<span>🔗 مشاركة</span>' : ''}
          ${c.winner ? '<span>🏅 ' + c.winner + '</span>' : ''}
        </div>
        <div style="font-size:var(--fs-xs); color:var(--text-secondary);">🎁 ${c.prize}</div>`;
            item.querySelector('.view-comp').addEventListener('click', () => showCompDetails(c));
            item.querySelector('.toggle-comp').addEventListener('click', () => {
                c.active = c.active === false ? true : false;
                HawdajData.save(true);
                refreshCompAdmin();
            });
            item.querySelector('.delete').addEventListener('click', () => {
                if (confirm('حذف هذه المسابقة؟')) {
                    data.competitions = data.competitions.filter(x => x.id !== c.id);
                    HawdajData.save(true);
                    refreshCompAdmin();
                }
            });
            list.appendChild(item);
        });
    }

    function showCompDetails(comp) {
        const panel = document.getElementById('comp-details-panel');
        const titleEl = document.getElementById('comp-details-title');
        const listEl = document.getElementById('comp-participants-list');
        if (!panel || !listEl) return;
        panel.style.display = 'block';
        if (titleEl) titleEl.textContent = '📊 ' + comp.name;
        const participants = comp.participants || [];
        const eliminated = comp.eliminated || [];
        const activeCount = participants.length - eliminated.length;

        // Stats header
        const statsHTML = `<div style="display:flex;gap:8px;margin-bottom:12px;">
            <div style="flex:1;text-align:center;padding:8px;border-radius:10px;background:rgba(46,204,113,0.1);border:1px solid rgba(46,204,113,0.3);">
                <div style="font-size:1.2rem;font-weight:900;color:#2ecc71;">${activeCount}</div>
                <div style="font-size:0.6rem;color:var(--text-secondary);">🏃 نشط</div>
            </div>
            <div style="flex:1;text-align:center;padding:8px;border-radius:10px;background:rgba(231,76,60,0.1);border:1px solid rgba(231,76,60,0.3);">
                <div style="font-size:1.2rem;font-weight:900;color:#e74c3c;">${eliminated.length}</div>
                <div style="font-size:0.6rem;color:var(--text-secondary);">💀 مستبعد</div>
            </div>
            <div style="flex:1;text-align:center;padding:8px;border-radius:10px;background:rgba(255,215,0,0.1);border:1px solid rgba(255,215,0,0.3);">
                <div style="font-size:1.2rem;font-weight:900;color:#FFD700;">${participants.length}</div>
                <div style="font-size:0.6rem;color:var(--text-secondary);">👥 إجمالي</div>
            </div>
        </div>`;

        let sortedParticipants = [...participants].sort((a, b) => {
            const scoreA = comp.scores?.[a] || 0;
            const scoreB = comp.scores?.[b] || 0;
            if (scoreB !== scoreA) return scoreB - scoreA;
            const timeA = comp.progress?.[a]?.lastUpdate || Infinity;
            const timeB = comp.progress?.[b]?.lastUpdate || Infinity;
            return timeA - timeB;
        });

        if (sortedParticipants.length === 0) {
            listEl.innerHTML = statsHTML + '<p style="text-align:center;color:var(--text-secondary);padding:16px;">لا يوجد مشتركين بعد</p>';
        } else {
            listEl.innerHTML = statsHTML + sortedParticipants.map((name, i) => {
                const data = HawdajData.get();
                const studentObj = (data.allUsers || []).find(u => u.name === name);
                const score = comp.scores?.[name] || 0;
                const progress = comp.progress?.[name] || {};
                const tasksCompleted = progress.tasks || [];
                const quizDone = progress.quizDone || 0;
                const puzzleDone = progress.puzzleDone || 0;
                const quizNeeded = comp.questionCount || 10;
                const unreadMsgs = (comp.chat?.[name] || []).filter(m => !m.read && m.from === 'student').length;
                const isW = comp.winner === name;
                const isElim = eliminated.includes(name);
                const uniqueId = 'student-det-' + i;

                let doneTaskCount = tasksCompleted.length;
                let totalTaskCount = (comp.games || ['quiz']).length + (comp.socialTasks || []).length + (comp.shareTask ? 1 : 0);

                let extraTasksHTML = '';
                if (studentObj) {
                    (comp.socialTasks || []).forEach((t, ti) => {
                        const isDone = studentObj.dailyTasksCompleted?.includes('social_' + comp.id + '_' + ti);
                        if (isDone) doneTaskCount++;
                        extraTasksHTML += isDone ? '<span style="color:#2ecc71;background:rgba(46,204,113,0.1);padding:2px 6px;border-radius:4px;">✓ سوشيال</span> ' : '<span style="color:var(--text-secondary);background:rgba(255,255,255,0.05);padding:2px 6px;border-radius:4px;">○ سوشيال</span> ';
                    });
                    if (comp.shareTask) {
                        const pRefCode = studentObj.referralCodes?.[comp.id] || '';
                        const pRefCount = (data.allUsers || []).filter(u => u.referredBy === pRefCode).length;
                        const isShareDone = pRefCode && pRefCount >= (comp.shareTask.targetCount || 5);
                        if (isShareDone) doneTaskCount++;
                        extraTasksHTML += isShareDone ? '<span style="color:#2ecc71;background:rgba(46,204,113,0.1);padding:2px 6px;border-radius:4px;">✓ مشاركة</span> ' : `<span style="color:var(--text-secondary);background:rgba(255,255,255,0.05);padding:2px 6px;border-radius:4px;">○ مشاركة(${pRefCount}/${comp.shareTask.targetCount || 5})</span> `;
                    }
                }
                const progressPct = totalTaskCount > 0 ? Math.round((doneTaskCount / totalTaskCount) * 100) : 0;

                const cardBg = isElim ? 'rgba(231,76,60,0.08)' : isW ? 'rgba(255,215,0,0.1)' : 'rgba(255,255,255,0.05)';
                const cardBorder = isElim ? 'rgba(231,76,60,0.3)' : isW ? 'rgba(255,215,0,0.4)' : 'rgba(255,255,255,0.08)';
                const nameColor = isElim ? '#e74c3c' : 'var(--text-heading)';
                const elimBadge = isElim ? '<span style="background:#e74c3c;color:white;padding:2px 8px;border-radius:10px;font-size:0.6rem;font-weight:800;margin-right:6px;">💀 مستبعد</span>' : '';

                return `
                <div style="background:${cardBg}; border:1px solid ${cardBorder}; border-radius:12px; overflow:hidden; margin-bottom:10px; ${isElim ? 'opacity:0.7;' : ''}">
                    <div style="padding:12px; display:flex; align-items:center; justify-content:space-between; cursor:pointer;" onclick="const e = document.getElementById('${uniqueId}'); e.style.display = e.style.display === 'none' ? 'block' : 'none';">
                        <div style="display:flex; align-items:center; gap:10px; flex:1;">
                            <span style="font-weight:900; color:${isElim ? '#e74c3c' : 'var(--text-secondary)'}; min-width:20px; text-align:center;">${isElim ? '💀' : (i + 1)}</span>
                            <div style="flex:1;">
                                <div style="font-weight:800; color:${nameColor}; font-size:1rem; display:flex; justify-content:space-between; align-items:center;">
                                    <span style="${isElim ? 'text-decoration:line-through;' : ''}">${name} ${isW ? '🏆' : ''} ${elimBadge}</span>
                                    <span style="font-size:0.75rem; color:${isElim ? '#e74c3c' : 'var(--text-secondary)'};">${isElim ? 'مستبعد' : progressPct + '%'}</span>
                                </div>
                                <div style="width:100%; height:4px; background:rgba(255,255,255,0.1); border-radius:4px; margin:6px 0;">
                                    <div style="height:100%; width:${isElim ? '100' : progressPct}%; background:${isElim ? '#e74c3c' : progressPct === 100 ? '#2ecc71' : 'linear-gradient(90deg,#FFD700,#F59E0B)'}; border-radius:4px;"></div>
                                </div>
                                <div style="display:flex; flex-wrap:wrap; gap:6px; font-size:0.65rem; font-weight:700;">
                                    ${(comp.games || ['quiz']).includes('quiz') ? (tasksCompleted.includes('quiz') ? '<span style="color:#2ecc71;background:rgba(46,204,113,0.1);padding:2px 6px;border-radius:4px;">✓ أسئلة</span>' : `<span style="color:var(--text-secondary);background:rgba(255,255,255,0.05);padding:2px 6px;border-radius:4px;">○ أسئلة(${quizDone}/${quizNeeded})</span>`) : ''}
                                    ${(comp.games || []).includes('puzzle') ? (tasksCompleted.includes('puzzle') ? '<span style="color:#2ecc71;background:rgba(46,204,113,0.1);padding:2px 6px;border-radius:4px;">✓ بازل</span>' : `<span style="color:var(--text-secondary);background:rgba(255,255,255,0.05);padding:2px 6px;border-radius:4px;">○ بازل(${puzzleDone}/1)</span>`) : ''}
                                    ${extraTasksHTML}
                                </div>
                            </div>
                        </div>
                        <div style="display:flex; align-items:center; gap:8px;">
                            ${unreadMsgs > 0 ? `<span style="background:#e74c3c;color:white;border-radius:12px;padding:2px 8px;font-size:0.65rem;font-weight:800;animation:pulse 1s infinite;">💬 ${unreadMsgs}</span>` : ''}
                            <span style="color:var(--text-secondary); font-size:1.2rem;">▼</span>
                        </div>
                    </div>
                    
                    <div id="${uniqueId}" style="display:none; padding:12px; border-top:1px solid rgba(255,255,255,0.05); background:rgba(0,0,0,0.2);">
                        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
                            <span style="font-weight:900; font-size:1.1rem; color:${nameColor};">👤 ${name}</span>
                            <span style="font-weight:900; color:#FFD700; font-size:0.9rem; background:rgba(255,215,0,0.1); padding:4px 8px; border-radius:8px;">${score} ⭐</span>
                        </div>
                        ${isElim ? `<div style="background:rgba(231,76,60,0.1);border:1px solid rgba(231,76,60,0.3);border-radius:8px;padding:8px;margin-bottom:10px;text-align:center;">
                            <span style="color:#e74c3c;font-weight:800;font-size:0.8rem;">💀 تم الاستبعاد — ${progress.eliminationReason === 'timeout' ? 'انتهاء الوقت' : 'إجابة خاطئة'}</span>
                        </div>` : ''}
                        <div style="display:flex; gap:8px;">
                            <button onclick="HawdajChat.openAdminChat('${comp.id}','${name}')" style="flex:1; padding:8px; border-radius:8px; border:none; background:linear-gradient(135deg,#9b59b6,#8e44ad); color:white; cursor:pointer; font-weight:800; display:flex; align-items:center; justify-content:center; gap:8px;">
                                💬 محادثة
                            </button>
                            <button onclick="(function(){var d=HawdajData.get();var c=d.competitions.find(function(x){return x.id==='${comp.id}'});if(c){c.winner=c.winner==='${name}'?null:'${name}';HawdajData.save(true);AdminPanel.refreshCompAdmin();}})();" style="flex:1; padding:8px; border-radius:8px; border:none; background:${isW ? 'linear-gradient(135deg,#FFD700,#F59E0B)' : 'rgba(255,255,255,0.1)'}; color:${isW ? '#4A2800' : 'white'}; cursor:pointer; font-weight:800; display:flex; align-items:center; justify-content:center; gap:8px; transition:0.2s;">
                                ${isW ? '✓ إلغاء الفوز' : '🏆 تحديد كفائز'}
                            </button>
                        </div>
                    </div>
                </div>
                `;

















            }).join('');
        }
        panel.scrollIntoView({ behavior: 'smooth' });
    }

    // [duplicate removed]

    // [dup setupTabs removed]


    // [dup login removed]


    function logout() {
        isLoggedIn = false;
        HawdajApp.navigate('main-menu');
        HawdajAudio.SFX.tap();
    }

    // ── Quiz Management ──
    function populateEpisodeSelect() {
        const select = document.getElementById('episode-select');
        if (!select) return;
        select.innerHTML = '';
        for (let ep = 1; ep <= 20; ep++) {
            const opt = document.createElement('option');
            opt.value = ep;
            opt.textContent = `حلقة ${ep}: ${HawdajData.EPISODE_NAMES[ep]}`;
            select.appendChild(opt);
        }
        select.addEventListener('change', () => refreshEpisodeQuestions());
        refreshEpisodeQuestions();
    }

    // [dup refreshQuizAdmin removed]


    function refreshEpisodeQuestions() {
        const ep = parseInt(document.getElementById('episode-select')?.value);
        if (!ep) return;

        const data = HawdajData.get();
        const questions = data.quizEpisodes[ep] || [];
        const list = document.getElementById('episode-q-list');
        if (!list) return;

        list.innerHTML = '';
        questions.forEach((q, i) => {
            list.appendChild(createQuestionItem(q, ep, i, questions.length));
        });

        if (questions.length === 0) {
            list.innerHTML = '<p style="text-align:center;color:var(--text-secondary);padding:20px;">لا توجد أسئلة لهذه الحلقة</p>';
        }
    }

    function createQuestionItem(q, category, index, totalCount) {
        const item = document.createElement('div');
        item.className = 'question-item';
        item.innerHTML = `
      <div style="display:flex; align-items:center; gap:12px; flex:1;">
          <input type="checkbox" class="q-select-checkbox" data-id="${q.id}" style="width:20px;height:20px;cursor:pointer;flex-shrink:0;accent-color:var(--accent-primary);">
          <span class="q-text" style="flex:1; margin:0;"><strong style="color:var(--accent-primary);margin-left:4px;">${index + 1}.</strong> ${q.question}</span>
      </div>
      <div class="q-actions">
        <button class="q-action-btn move-up" title="رفع ⬆" style="background:rgba(46,204,113,0.2);color:#2ecc71;${index === 0 ? 'opacity:0.3;pointer-events:none;' : ''}">⬆</button>
        <button class="q-action-btn move-down" title="نزول ⬇" style="background:rgba(52,152,219,0.2);color:#3498db;${index === totalCount - 1 ? 'opacity:0.3;pointer-events:none;' : ''}">⬇</button>
        <button class="q-action-btn edit" data-id="${q.id}" title="تعديل">✏️</button>
        <button class="q-action-btn delete" data-id="${q.id}" title="حذف">🗑️</button>
      </div>
    `;

        item.querySelector('.move-up').addEventListener('click', () => {
            moveQuestion(category, q.id, -1);
        });

        item.querySelector('.move-down').addEventListener('click', () => {
            moveQuestion(category, q.id, 1);
        });

        item.querySelector('.edit').addEventListener('click', () => {
            openEditQuestion(q, category);
        });

        item.querySelector('.delete').addEventListener('click', () => {
            if (confirm('هل تريد حذف هذا السؤال؟')) {
                HawdajData.deleteQuestion(category, q.id);
                if (category === 'general') refreshQuizAdmin();
                else refreshEpisodeQuestions();
                HawdajAudio.SFX.tap();
                HawdajApp.showToast('تم الحذف', 'info');
            }
        });

        return item;
    }

    function moveQuestion(category, questionId, direction) {
        const data = HawdajData.get();
        let arr;
        if (category === 'general') {
            arr = data.quizGeneral;
        } else {
            arr = data.quizEpisodes[category] || [];
        }

        const idx = arr.findIndex(q => q.id === questionId);
        const newIdx = idx + direction;
        if (idx < 0 || newIdx < 0 || newIdx >= arr.length) return;

        [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
        HawdajData.save(true);

        if (category === 'general') refreshQuizAdmin();
        else refreshEpisodeQuestions();
        HawdajAudio.SFX.tap();
    }

    // ── Question Modal ──
    // [dup setupQuestionModal removed]


    function openAddQuestion(category) {
        editingQuestion = null;
        editingCategory = category;
        document.getElementById('q-modal-title').textContent = 'إضافة سؤال';

        // Clear form
        document.getElementById('q-text').value = '';
        document.getElementById('q-image').value = '';
        document.getElementById('q-hint').value = '';
        document.getElementById('q-image-preview').style.display = 'none';
        document.getElementById('q-image-clear').style.display = 'none';
        for (let i = 0; i < 4; i++) document.getElementById(`q-opt-${i}`).value = '';
        document.querySelectorAll('#correct-select .correct-opt').forEach((o, i) =>
            o.classList.toggle('selected', i === 0));

        document.getElementById('question-modal').classList.add('active');
    }

    function openEditQuestion(q, category) {
        editingQuestion = q;
        editingCategory = category;
        document.getElementById('q-modal-title').textContent = 'تعديل سؤال';

        document.getElementById('q-text').value = q.question;
        document.getElementById('q-image').value = q.image || '';
        document.getElementById('q-hint').value = q.hint || '';

        // Show existing image if any
        if (q.image) {
            document.getElementById('q-image-preview').src = q.image;
            document.getElementById('q-image-preview').style.display = 'block';
            document.getElementById('q-image-clear').style.display = 'inline-flex';
        } else {
            document.getElementById('q-image-preview').style.display = 'none';
            document.getElementById('q-image-clear').style.display = 'none';
        }

        q.options.forEach((opt, i) => {
            document.getElementById(`q-opt-${i}`).value = opt;
        });
        document.querySelectorAll('#correct-select .correct-opt').forEach((o, i) =>
            o.classList.toggle('selected', i === q.correct));

        document.getElementById('question-modal').classList.add('active');
    }

    function saveQuestion() {
        const question = document.getElementById('q-text').value.trim();
        if (!question) {
            HawdajApp.showToast('اكتب السؤال أولاً', 'error');
            return;
        }

        const options = [];
        for (let i = 0; i < 4; i++) {
            const val = document.getElementById(`q-opt-${i}`).value.trim();
            if (!val) {
                HawdajApp.showToast('اكتب جميع الخيارات', 'error');
                return;
            }
            options.push(val);
        }

        const correctEl = document.querySelector('#correct-select .correct-opt.selected');
        const correct = correctEl ? parseInt(correctEl.dataset.correct) : 0;

        const qObj = {
            question,
            options,
            correct,
            image: document.getElementById('q-image').value.trim(),
            hint: document.getElementById('q-hint').value.trim()
        };

        if (editingQuestion) {
            // Update existing
            qObj.id = editingQuestion.id;
            const data = HawdajData.get();
            if (editingCategory === 'general') {
                const idx = data.quizGeneral.findIndex(q => q.id === qObj.id);
                if (idx >= 0) data.quizGeneral[idx] = qObj;
            } else {
                const ep = editingCategory;
                const idx = (data.quizEpisodes[ep] || []).findIndex(q => q.id === qObj.id);
                if (idx >= 0) data.quizEpisodes[ep][idx] = qObj;
            }
            HawdajData.save(true);
        } else {
            HawdajData.addQuestion(editingCategory, qObj);
        }

        document.getElementById('question-modal').classList.remove('active');
        if (editingCategory === 'general') refreshQuizAdmin();
        else refreshEpisodeQuestions();
        HawdajAudio.SFX.correct();
        HawdajApp.showToast('تم الحفظ ✓', 'success');
    }

    // ── Puzzle Management ──
    function addPuzzle() {
        const name = document.getElementById('puzzle-name-input')?.value.trim();
        const image = document.getElementById('puzzle-img-data')?.value;
        const editId = document.getElementById('puzzle-edit-id')?.value;

        if (!name) {
            HawdajApp.showToast('اكتب اسم المعلم', 'error');
            return;
        }

        const data = HawdajData.get();

        if (editId) {
            // Edit existing
            const puzzle = data.puzzles.find(p => p.id === editId);
            if (puzzle) {
                puzzle.name = name;
                if (image) puzzle.image = image;
            }
            HawdajData.save(true);
            HawdajApp.showToast('تم تعديل البازل ✓', 'success');
        } else {
            // Add new
            if (!image) {
                HawdajApp.showToast('ارفع صورة البازل', 'error');
                return;
            }
            data.puzzles.push({
                id: 'p_' + Date.now(),
                name,
                image
            });
            HawdajData.save(true);
            HawdajApp.showToast('تم إضافة البازل 🖼️', 'success');
        }

        clearPuzzleForm();
        refreshPuzzleAdmin();
        HawdajAudio.SFX.correct();
    }

    function clearPuzzleForm() {
        document.getElementById('puzzle-name-input').value = '';
        document.getElementById('puzzle-img-data').value = '';
        document.getElementById('puzzle-edit-id').value = '';
        document.getElementById('puzzle-img-preview').style.display = 'none';
        document.getElementById('puzzle-img-clear').style.display = 'none';
    }

    function editPuzzle(puzzleId) {
        const data = HawdajData.get();
        const puzzle = data.puzzles.find(p => p.id === puzzleId);
        if (!puzzle) return;

        document.getElementById('puzzle-name-input').value = puzzle.name;
        document.getElementById('puzzle-edit-id').value = puzzle.id;
        if (puzzle.image) {
            document.getElementById('puzzle-img-data').value = puzzle.image;
            document.getElementById('puzzle-img-preview').src = puzzle.image;
            document.getElementById('puzzle-img-preview').style.display = 'block';
            document.getElementById('puzzle-img-clear').style.display = 'inline-flex';
        }
        // Scroll to form
        document.querySelector('[data-admin-section="puzzle"]')?.scrollTo({ top: 0, behavior: 'smooth' });
        HawdajApp.showToast('عدّل البيانات واضغط حفظ', 'info');
    }

    // [dup refreshPuzzleAdmin removed]


    // ── Map Management ──
    function populateRegionSelect() {
        const select = document.getElementById('region-select');
        if (!select) return;
        const data = HawdajData.get();
        select.innerHTML = '';
        Object.entries(data.regions).forEach(([id, region]) => {
            const opt = document.createElement('option');
            opt.value = id;
            opt.textContent = region.name;
            select.appendChild(opt);
        });
        select.addEventListener('change', () => refreshMapQuestions());
        refreshMapQuestions();
    }

    // [dup refreshMapAdmin removed]


    function refreshMapQuestions() {
        const regionId = document.getElementById('region-select')?.value;
        if (!regionId) return;

        const data = HawdajData.get();
        const region = data.regions[regionId];
        if (!region) return;

        // Load region facts into textarea
        const factsEl = document.getElementById('region-facts-edit');
        if (factsEl) {
            factsEl.value = (region.facts || '').replace(/\\n/g, '\n');
        }

        // Load clothing info
        const clothingText = document.getElementById('region-clothing-text');
        if (clothingText) clothingText.value = region.clothingText || '';

        const clothingImg = document.getElementById('region-clothing-img');
        const clothingPreview = document.getElementById('region-clothing-preview');
        const clothingClear = document.getElementById('region-clothing-clear');
        if (clothingImg) clothingImg.value = region.clothingImage || '';
        if (region.clothingImage) {
            if (clothingPreview) { clothingPreview.src = region.clothingImage; clothingPreview.style.display = 'block'; }
            if (clothingClear) clothingClear.style.display = 'inline-flex';
        } else {
            if (clothingPreview) clothingPreview.style.display = 'none';
            if (clothingClear) clothingClear.style.display = 'none';
        }

        // Render existing questions
        const list = document.getElementById('region-q-list');
        if (!list) return;

        list.innerHTML = '';
        const questions = region.questions || [];

        if (questions.length === 0) {
            list.innerHTML = '<p style="text-align:center;color:var(--text-secondary);padding:12px;">لا توجد أسئلة لهذه المنطقة</p>';
            return;
        }

        questions.forEach(q => {
            const item = document.createElement('div');
            item.className = 'question-item';
            item.style.cssText = 'flex-direction:column; align-items:stretch; gap:6px;';

            const correctText = q.options ? q.options[q.correct] : '';
            item.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span class="q-text" style="font-weight:700;">${q.question}</span>
          <div class="q-actions">
            <button class="q-action-btn delete" title="حذف">🗑️</button>
          </div>
        </div>
        <div style="font-size:var(--fs-xs); color:var(--text-secondary);">
          ✅ الإجابة: ${correctText}
        </div>
      `;
            item.querySelector('.delete').addEventListener('click', () => {
                if (confirm('حذف هذا السؤال؟')) {
                    region.questions = region.questions.filter(x => x.id !== q.id);
                    HawdajData.save(true);
                    refreshMapQuestions();
                    HawdajApp.showToast('تم الحذف', 'info');
                }
            });
            list.appendChild(item);
        });
    }

    function saveRegionFacts() {
        const regionId = document.getElementById('region-select')?.value;
        if (!regionId) return;

        const data = HawdajData.get();
        const region = data.regions[regionId];
        if (!region) return;

        region.facts = document.getElementById('region-facts-edit')?.value.trim() || '';
        region.clothingText = document.getElementById('region-clothing-text')?.value.trim() || '';
        region.clothingImage = document.getElementById('region-clothing-img')?.value || '';
        HawdajData.save(true);

        HawdajAudio.SFX.correct();
        HawdajApp.showToast('تم حفظ معلومات المنطقة ✓', 'success');
    }

    function addRegionQuestion() {
        const regionId = document.getElementById('region-select')?.value;
        if (!regionId) return;

        const question = document.getElementById('region-q-text')?.value.trim();
        if (!question) {
            HawdajApp.showToast('اكتب نص السؤال', 'error');
            return;
        }

        const options = [];
        for (let i = 0; i < 4; i++) {
            const val = document.getElementById(`region-q-opt${i}`)?.value.trim();
            if (!val) {
                HawdajApp.showToast('اكتب جميع الخيارات الأربعة', 'error');
                return;
            }
            options.push(val);
        }

        const correct = parseInt(document.getElementById('region-q-correct')?.value || '0');

        const data = HawdajData.get();
        const region = data.regions[regionId];
        if (!region.questions) region.questions = [];

        region.questions.push({
            id: 'rq_' + Date.now(),
            question,
            options,
            correct
        });
        HawdajData.save(true);

        // Clear form
        document.getElementById('region-q-text').value = '';
        for (let i = 0; i < 4; i++) document.getElementById(`region-q-opt${i}`).value = '';
        document.getElementById('region-q-correct').value = '0';

        refreshMapQuestions();
        HawdajAudio.SFX.correct();
        HawdajApp.showToast('تم إضافة السؤال ✓', 'success');
    }

    // ── Theme ──
    function toggleTheme() {
        const data = HawdajData.get();
        data.theme = data.theme === 'normal' ? 'ramadan' : 'normal';
        HawdajData.save(true);
        document.body.className = data.theme;
        updateThemeUI();
        HawdajAudio.SFX.tap();
    }

    function updateThemeUI() {
        const data = HawdajData.get();
        const label = document.getElementById('current-theme-label');
        if (label) {
            label.textContent = data.theme === 'normal' ? 'عادي ☀️' : 'رمضاني 🌙';
        }
    }

    // ── Points ──
    function loadPointsConfig() {
        const data = HawdajData.get();
        const pts = data.points;
        if (document.getElementById('pts-correct')) document.getElementById('pts-correct').value = pts.correct;
        if (document.getElementById('pts-speed')) document.getElementById('pts-speed').value = pts.speed;
        if (document.getElementById('pts-puzzle')) document.getElementById('pts-puzzle').value = pts.puzzle;
        if (document.getElementById('pts-region')) document.getElementById('pts-region').value = pts.region;
    }

    function savePoints() {
        const data = HawdajData.get();
        data.points.correct = parseInt(document.getElementById('pts-correct').value) || 10;
        data.points.speed = parseInt(document.getElementById('pts-speed').value) || 5;
        data.points.puzzle = parseInt(document.getElementById('pts-puzzle').value) || 50;
        data.points.region = parseInt(document.getElementById('pts-region').value) || 30;
        HawdajData.save(true);
        HawdajAudio.SFX.correct();
        HawdajApp.showToast('تم حفظ النقاط ✓', 'success');
    }

    // ── Competitions ──
    // [dup createCompetition removed]

    // [dup refreshCompAdmin removed]


    function showCompDetails(comp) {
        const panel = document.getElementById('comp-details-panel');
        const titleEl = document.getElementById('comp-details-title');
        const listEl = document.getElementById('comp-participants-list');
        if (!panel || !listEl) return;
        panel.style.display = 'block';
        if (titleEl) titleEl.textContent = '📊 ' + comp.name;
        const participants = comp.participants || [];
        if (participants.length === 0) {
            listEl.innerHTML = '<p style="text-align:center;color:var(--text-secondary);padding:16px;">لا يوجد مشتركين بعد</p>';
        } else {
            listEl.innerHTML = participants.map((name, i) => {
                const score = comp.scores?.[name] || 0;
                const progress = comp.progress?.[name] || {};
                const tasksCompleted = progress.tasks || [];
                const quizDone = progress.quizDone || 0;
                const puzzleDone = progress.puzzleDone || 0;
                const unreadMsgs = (comp.chat?.[name] || []).filter(m => !m.read && m.from === 'student').length;
                const isW = comp.winner === name;
                return '<div style="display:flex;align-items:center;gap:10px;padding:10px;border-radius:10px;background:' + (isW ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.05)') + ';border:1px solid ' + (isW ? 'rgba(255,215,0,0.4)' : 'rgba(255,255,255,0.08)') + ';">' +
                    '<span style="font-weight:900;min-width:25px;">' + (i + 1) + '</span>' +
                    '<span style="flex:1;font-weight:700;">' + (isW ? '🏆 ' : '') + name + '</span>' +
                    '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px;">' +
                    '<span style="font-weight:800;color:var(--accent-primary);font-size:0.85rem;">' + score + ' ⭐</span>' +
                    '<div style="display:flex;gap:3px;font-size:0.6rem;">' +
                    (tasksCompleted.includes('quiz') ? '<span style="color:#2ecc71;">✓أسئلة</span>' : '<span style="color:#888;">○أسئلة(' + quizDone + ')</span>') +
                    (tasksCompleted.includes('puzzle') ? '<span style="color:#2ecc71;">✓بازل</span>' : '<span style="color:#888;">○بازل(' + puzzleDone + ')</span>') +
                    '</div>' +
                    (unreadMsgs > 0 ? '<span style="background:#e74c3c;color:white;border-radius:10px;padding:1px 6px;font-size:0.6rem;">💬' + unreadMsgs + '</span>' : '') +
                    '</div>' +
                    '<button onclick="(function(){var d=HawdajData.get();var c=d.competitions.find(function(x){return x.id===\'' + comp.id + '\'});if(c){c.winner=c.winner===\'' + name + '\'?null:\'' + name + '\';HawdajData.save(true);AdminPanel.refreshCompAdmin();}})();"' +
                    ' style="padding:4px 10px;border-radius:8px;border:1px solid rgba(255,215,0,0.4);background:' + (isW ? '#FFD700' : 'transparent') + ';color:' + (isW ? '#4A2800' : 'var(--text-secondary)') + ';font-size:var(--fs-xs);cursor:pointer;font-weight:700;">' +
                    (isW ? '✓ فائز' : '🏅') + '</button>' +
                    '<button onclick="HawdajChat.openAdminChat(\'' + comp.id + '\',\'' + name + '\')" style="padding:4px 10px;border-radius:8px;border:1px solid rgba(155,89,182,0.4);background:transparent;color:#9b59b6;font-size:var(--fs-xs);cursor:pointer;font-weight:700;">💬</button></div>';
            }).join('');
        }
        panel.scrollIntoView({ behavior: 'smooth' });
    }
    // ── JSON Import/Export ──
    function importJSON() {
        const text = document.getElementById('json-import-text')?.value.trim();
        if (!text) {
            HawdajApp.showToast('الصق بيانات JSON أولاً', 'error');
            return;
        }
        try {
            const arr = JSON.parse(text);
            if (!Array.isArray(arr)) throw new Error('Not array');
            const count = HawdajData.importQuestions(arr);
            HawdajApp.showToast(`✅ تم استيراد ${count} سؤال`, 'success');
            document.getElementById('json-import-text').value = '';
            refreshQuizAdmin();
        } catch (e) {
            HawdajApp.showToast('خطأ في صيغة JSON', 'error');
        }
    }

    function exportJSON() {
        const json = HawdajData.exportAll();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'hawdaj_data.json';
        a.click();
        URL.revokeObjectURL(url);
        HawdajApp.showToast('تم التصدير 📤', 'success');
    }

    // ── Password ──
    function changePassword() {
        const newPw = document.getElementById('new-password')?.value;
        const confirmPw = document.getElementById('confirm-password')?.value;

        if (!newPw || newPw.length < 4) {
            HawdajApp.showToast('كلمة المرور قصيرة جداً', 'error');
            return;
        }
        if (newPw !== confirmPw) {
            HawdajApp.showToast('كلمات المرور غير متطابقة', 'error');
            return;
        }

        const data = HawdajData.get();
        data.adminPassword = newPw;
        HawdajData.save(true);
        document.getElementById('new-password').value = '';
        document.getElementById('confirm-password').value = '';
        HawdajAudio.SFX.correct();
        HawdajApp.showToast('تم تغيير كلمة المرور ✓', 'success');
    }

    function resetData() {
        if (confirm('⚠️ هل أنت متأكد؟ سيتم حذف جميع البيانات!')) {
            HawdajData.reset();
            HawdajApp.showToast('تم إعادة التعيين', 'info');
            setTimeout(() => location.reload(), 1000);
        }
    }

    // ── Store Management ──
    function refreshStoreAdmin() {
        const data = HawdajData.get();
        const list = document.getElementById('store-admin-list');
        if (!list) return;

        list.innerHTML = '';
        if (!data.storeItems || data.storeItems.length === 0) {
            list.innerHTML = '<p style="color:var(--text-secondary); text-align:center;">لا يوجد منتجات حالياً</p>';
            return;
        }

        data.storeItems.forEach(item => {
            const div = document.createElement('div');
            div.className = 'comp-item';
            div.innerHTML = `
                <div>
                    <strong style="color:var(--accent-primary);">${HawdajData.getAvatarHTML(item.icon, 20)} ${item.name}</strong>
                    <div style="font-size:var(--fs-xs); color:var(--text-secondary);"> السعر: ${item.price} ⭐</div>
                    <div style="font-size:var(--fs-xs); color:var(--text-secondary);">${item.desc}</div>
                </div>
                <!-- Only allow deleting custom items for now, not default powerups -->
                ${item.type !== 'powerup' ? `<button class="btn btn-danger" style="padding:6px 10px;" onclick="AdminPanel.deleteStoreItem('${item.id}')">🗑️</button>` : '<span style="font-size:var(--fs-xs); color:var(--text-secondary);">أساسي</span>'}
            `;
            list.appendChild(div);
        });
    }

    function addStoreItem() {
        const name = document.getElementById('store-item-name').value.trim();
        const price = parseInt(document.getElementById('store-item-price').value);
        let icon = document.getElementById('store-item-icon').value;
        const uploadInput = document.getElementById('store-item-upload');
        const desc = document.getElementById('store-item-desc').value.trim();

        if (!name || !price || isNaN(price)) {
            HawdajApp.showToast('الرجاء إدخال الاسم والسعر بشكل صحيح', 'warning');
            return;
        }

        const proceed = (finalIcon) => {
            const data = HawdajData.get();
            if (!data.storeItems) data.storeItems = [];
            data.storeItems.push({
                id: 'item_' + Date.now(),
                name, price, icon: finalIcon, desc, type: 'reward'
            });
            HawdajData.save(true);
            HawdajApp.showToast('تم إضافة المنتج للمتجر', 'success');

            document.getElementById('store-item-name').value = '';
            document.getElementById('store-item-price').value = '';
            document.getElementById('store-item-desc').value = '';
            if (uploadInput) uploadInput.value = '';
            refreshStoreAdmin();
        };

        if (uploadInput && uploadInput.files && uploadInput.files[0]) {
            const file = uploadInput.files[0];
            const reader = new FileReader();
            reader.onload = function (e) {
                proceed(e.target.result);
            };
            reader.readAsDataURL(file);
        } else {
            proceed(icon);
        }
    }

    window.AdminPanel = window.AdminPanel || {};
    window.AdminPanel.deleteStoreItem = function (id) {
        if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
        const data = HawdajData.get();
        data.storeItems = data.storeItems.filter(i => i.id !== id);
        HawdajData.save(true);
        HawdajApp.showToast('تم الحذف', 'info');
        refreshStoreAdmin();
    };

    // ── Dev Settings ──
    function loadQuizSettings() {
        const data = HawdajData.get();
        const ds = data.devSettings || {};

        const randEl = document.getElementById('quiz-randomize-setting');
        if (randEl) randEl.checked = ds.quizRandomize !== false;

        const optCountEl = document.getElementById('quiz-options-count');
        if (optCountEl && ds.quizOptionsCount) optCountEl.value = String(ds.quizOptionsCount);

        const qLimitEl = document.getElementById('quiz-question-limit');
        if (qLimitEl && ds.quizQuestionLimit !== undefined) qLimitEl.value = String(ds.quizQuestionLimit);
    }

    function loadDevSettings() {
        const data = HawdajData.get();
        if (!data.devSettings) return;

        // Load quiz randomize
        const randEl = document.getElementById('quiz-randomize-setting');
        if (randEl) randEl.checked = data.devSettings.quizRandomize !== false;

        // Load quiz options count
        const optCountEl = document.getElementById('quiz-options-count');
        if (optCountEl && data.devSettings.quizOptionsCount) {
            optCountEl.value = String(data.devSettings.quizOptionsCount);
        }

        // Load quiz question limit
        const qLimitEl = document.getElementById('quiz-question-limit');
        if (qLimitEl && data.devSettings.quizQuestionLimit !== undefined) {
            qLimitEl.value = String(data.devSettings.quizQuestionLimit);
        }

        document.querySelectorAll('.dev-character-upload').forEach(input => {
            input.value = ''; // Reset inputs on load
        });
    }

    function saveDevSettings() {
        const inputs = document.querySelectorAll('.dev-character-upload, .dev-icon-upload, .dev-avatar-upload');
        const data = HawdajData.get();
        if (!data.devSettings) data.devSettings = { characters: { azzam: {}, jadel: {} }, audio: {}, icons: {}, avatars: {} };
        if (!data.devSettings.audio) data.devSettings.audio = {};
        if (!data.devSettings.icons) data.devSettings.icons = {};
        if (!data.devSettings.avatars) data.devSettings.avatars = {};

        let pendingCount = 0;
        let anyUploads = false;

        inputs.forEach(input => {
            if (input.files && input.files[0]) {
                anyUploads = true;
                pendingCount++;
                const file = input.files[0];
                const reader = new FileReader();

                reader.onload = (e) => {
                    if (input.classList.contains('dev-character-upload')) {
                        data.devSettings.characters[input.dataset.char][input.dataset.pose] = e.target.result;
                    } else if (input.classList.contains('dev-icon-upload')) {
                        data.devSettings.icons[input.dataset.icon] = e.target.result;
                    } else if (input.classList.contains('dev-avatar-upload')) {
                        data.devSettings.avatars[input.dataset.avatar] = e.target.result;
                    }

                    pendingCount--;
                    if (pendingCount === 0) finishSaveDevSettings();
                };
                reader.readAsDataURL(file);
            }
        });

        if (!anyUploads) {
            HawdajApp.showToast('لم يتم اختيار ملفات جديدة لحفظها', 'info');
        }

        function finishSaveDevSettings() {
            HawdajData.save(true);
            // Also push to Firebase so audio/icons persist globally
            HawdajData.saveGlobalToFirebase();
            HawdajApp.showToast('تم حفظ إعدادات المطور بنجاح ✅', 'success');
            HawdajAudio.SFX.correct();
        }
    }

    // ═══════════════════════════════════════
    // USER MANAGEMENT
    // ═══════════════════════════════════════
    function renderUsers() {
        const data = HawdajData.get();
        const lb = data.leaderboard || [];
        const countEl = document.getElementById('admin-users-count');
        const listEl = document.getElementById('admin-users-list');

        if (!countEl || !listEl) return;

        countEl.textContent = `إجمالي اللاعبين المسجلين: ${lb.length}`;

        if (lb.length === 0) {
            listEl.innerHTML = `
                <div style="text-align:center; padding:30px; color:var(--text-secondary);">
                    <div style="font-size:2.5rem; margin-bottom:8px;">📭</div>
                    <p>لا يوجد لاعبين مسجلين بعد</p>
                </div>
            `;
            return;
        }

        listEl.innerHTML = lb.map((user, idx) => `
            <div style="display:flex; align-items:center; gap:12px; padding:12px; border-radius:12px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1);">
                <span style="font-size:var(--fs-lg); min-width:35px; text-align:center; font-weight:900; color:var(--text-heading);">${idx + 1}</span>
                <span style="font-size:1.5rem;">${HawdajData.getAvatarHTML(user.emoji, 30)}</span>
                <span style="flex:1; font-weight:700; font-size:var(--fs-md); color:var(--text-primary);">${user.name}</span>
                <span style="font-weight:800; color:var(--accent-primary); font-size:var(--fs-md);">${user.score.toLocaleString()} ⭐</span>
                <button onclick="AdminPanel.deleteUser(${idx})" style="background:#d9534f; color:white; border:none; border-radius:8px; padding:6px 12px; font-size:var(--fs-xs); font-weight:700; cursor:pointer; font-family:var(--font-main);">🗑️ حذف</button>
            </div>
        `).join('');
    }

    function deleteUser(idx) {
        const data = HawdajData.get();
        const user = data.leaderboard[idx];
        if (!user) return;

        if (!confirm(`هل تريد حذف اللاعب "${user.name}" نهائياً؟`)) return;

        data.leaderboard.splice(idx, 1);
        HawdajData.save(true);

        // Also update Firebase
        if (window.HawdajFirebase && window.HawdajFirebase.isReady) {
            window.HawdajFirebase.deleteUserFromLeaderboard(user.name);
        }

        renderUsers();
        HawdajApp.showToast(`تم حذف "${user.name}" بنجاح`, 'success');
    }

    function clearAllUsers() {
        if (!confirm('⚠️ هل أنت متأكد من حذف جميع اللاعبين نهائياً؟\nلا يمكن التراجع عن هذا الإجراء!')) return;

        const data = HawdajData.get();
        data.leaderboard = [];
        HawdajData.save(true);

        // Clear Firebase leaderboard too
        if (window.HawdajFirebase && window.HawdajFirebase.isReady) {
            window.HawdajFirebase.clearLeaderboard();
        }

        renderUsers();
        HawdajApp.showToast('تم حذف جميع اللاعبين بنجاح', 'success');
    }

    // Hook up user management buttons
    function setupUserManagement() {
        const refreshBtn = document.getElementById('admin-refresh-users');
        const clearBtn = document.getElementById('admin-clear-all-users');
        if (refreshBtn) refreshBtn.addEventListener('click', renderUsers);
        if (clearBtn) clearBtn.addEventListener('click', clearAllUsers);
    }

    const api = {
        init, login, logout,
        openAddQuestion, saveQuestion,
        toggleTheme, savePoints,
        createCompetition, refreshCompAdmin, showCompDetails, importJSON, exportJSON,
        changePassword, resetData,
        refreshQuizAdmin, refreshEpisodeQuestions,
        addPuzzle, refreshPuzzleAdmin,
        saveRegionFacts, addRegionQuestion,
        refreshStoreAdmin, addStoreItem,
        loadDevSettings, saveDevSettings,
        renderUsers, deleteUser, clearAllUsers, setupUserManagement
    };

    window.AdminPanel = window.AdminPanel || {};
    Object.assign(window.AdminPanel, api);
    Object.defineProperty(window.AdminPanel, 'isLoggedIn', {
        get: () => isLoggedIn,
        configurable: true
    });

    return window.AdminPanel;
})();

// ── Store Management ──
window.openEditStoreItem = function (id) {
    const data = HawdajData.get();
    const item = data.storeItems.find(i => i.id === id);
    if (!item) return;
    document.getElementById('edit-store-id').value = item.id;
    document.getElementById('store-item-type').value = item.type || 'avatar';
    document.getElementById('store-item-name').value = item.name || '';
    document.getElementById('store-item-price').value = item.price || 0;
    document.getElementById('store-item-rarity').value = item.rarity || 'common';
    document.getElementById('store-item-icon').value = item.icon || '';
    document.getElementById('store-item-desc').value = item.desc || '';
    document.getElementById('store-modal-title').textContent = 'تعديل: ' + item.name;
    document.getElementById('add-store-modal').style.display = 'flex';
};

window.openAddStoreItem = function () {
    document.getElementById('edit-store-id').value = '';
    document.getElementById('store-item-type').value = 'avatar';
    document.getElementById('store-item-name').value = '';
    document.getElementById('store-item-price').value = '';
    document.getElementById('store-item-rarity').value = 'common';
    document.getElementById('store-item-icon').value = '';
    document.getElementById('store-item-desc').value = '';
    document.getElementById('store-modal-title').textContent = 'إضافة منتج جديد';
    document.getElementById('add-store-modal').style.display = 'flex';
};

// [dup refreshStoreAdmin removed]


function addStoreItem() {
    const id = document.getElementById('edit-store-id')?.value;
    const type = document.getElementById('store-item-type').value;
    const name = document.getElementById('store-item-name').value.trim();
    const price = parseInt(document.getElementById('store-item-price').value);
    const rarity = document.getElementById('store-item-rarity').value;
    let icon = document.getElementById('store-item-icon').value.trim();
    const uploadInput = document.getElementById('store-item-upload');
    const desc = document.getElementById('store-item-desc').value.trim();

    if (!name || isNaN(price)) {
        HawdajApp.showToast('الرجاء إدخال الاسم والسعر', 'warning');
        return;
    }

    const data = HawdajData.get();
    if (!data.storeItems) data.storeItems = [];

    const commitSave = (finalIcon) => {
        if (id) {
            // Edit existing
            const item = data.storeItems.find(i => i.id === id);
            if (item) {
                item.type = type;
                item.name = name;
                item.price = price;
                item.rarity = rarity;
                if (finalIcon) item.icon = finalIcon;
                item.desc = desc;
            }
        } else {
            // Add new
            data.storeItems.push({
                id: 'item_' + Date.now(),
                type, name, price, rarity, icon: finalIcon, desc
            });
        }
        HawdajData.save(true);
        refreshStoreAdmin();
        document.getElementById('add-store-modal').style.display = 'none';
        HawdajAudio.SFX.correct();
        HawdajApp.showToast(id ? 'تم حفظ التعديلات' : 'تم إضافة المنتج', 'success');
    };

    if (uploadInput && uploadInput.files && uploadInput.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => commitSave(e.target.result);
        reader.readAsDataURL(uploadInput.files[0]);
    } else {
        if (!id && !icon) icon = '🎁';
        commitSave(icon);
    }
}
