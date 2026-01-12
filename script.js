document.addEventListener('DOMContentLoaded', () => {
    const $ = (selector) => document.querySelector(selector);
    const $$ = (selector) => document.querySelectorAll(selector);

    const pages = {
        landing: $('#landing-page'),
        setup: $('#setup-page'),
        wordEntry: $('#word-entry-page'),
        game: $('#game-page'),
    };

    const gameState = {
        config: null
    };

    // --- LOGIC: SECURITY & CONFIG ---
    async function loadConfig() {
        try {
            const response = await fetch('config.json');
            if (!response.ok) throw new Error("Config not found");
            gameState.config = await response.json();
            console.log("Config loaded successfully.");
        } catch (e) {
            console.error("Failed to load config", e);
            $('#login-error').innerText = "خطأ في الاتصال بالخادم";
        }
    }

    async function hashString(message) {
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }

    async function handleLogin() {
        const input = $('#access-code-input').value.trim();
        const errorEl = $('#login-error');
        const btn = $('#login-btn');

        if (!input) {
            errorEl.innerText = "الرجاء إدخال الكود";
            return;
        }

        if (!gameState.config) {
            await loadConfig();
            if (!gameState.config) return;
        }

        btn.disabled = true;
        btn.innerText = "جاري التحقق...";

        const hashedInput = await hashString(input);
        
        // التحقق من المصفوفة في ملف الكونفج
        if (gameState.config.valid_hashes.includes(hashedInput)) {
            // Success
            $('#login-overlay').style.opacity = '0';
            setTimeout(() => {
                $('#login-overlay').classList.add('hidden');
                $('#app').classList.remove('hidden');
                // مهلة بسيطة لعمل الانيميشن ثم اظهار التطبيق
                setTimeout(() => {
                     $('#app').classList.remove('opacity-0');
                     resizeBoard(); // Ensure size is correct
                }, 100);
            }, 500);
        } else {
            // Fail
            errorEl.innerText = "كود غير صحيح";
            btn.disabled = false;
            btn.innerText = "دخول 🔓";
            $('#access-code-input').value = '';
            $('#access-code-input').focus();
        }
    }

    // --- LOGIC: RESPONSIVE SCALER ---
    function resizeBoard() {
        const scaler = $('#game-scaler');
        const app = $('#app');
        if (!scaler || !app) return;

        // الأبعاد الأصلية التي صممت اللعبة عليها
        const baseWidth = 450; 
        const baseHeight = 800; 

        // أبعاد الشاشة الحالية
        const availableWidth = window.innerWidth;
        const availableHeight = window.innerHeight;

        // حساب نسبة التكبير/التصغير
        const scaleX = availableWidth / baseWidth;
        const scaleY = availableHeight / baseHeight;
        
        // نختار النسبة الأصغر لضمان ظهور اللعبة بالكامل
        // ونضع حداً أقصى للتكبير (مثلاً 1.2) حتى لا تصبح ضخمة جداً على الشاشات الكبيرة
        const scale = Math.min(scaleX, scaleY, 1.2); 

        // تطبيق التحويل
        scaler.style.transform = `scale(${scale})`;
        
        // توسيط العنصر اذا كانت الشاشة أكبر
        // (يتم التعامل معه تلقائياً بواسطة Flexbox في الـ CSS الخاص بـ #app)
    }

    // --- EXISTING GAME LOGIC ---
    const ARABIC_LETTERS = ['ا', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'ه', 'و', 'ي', 'ء'];
    
    const WORD_BANK = {
        "حيوانات": ["فيل", "زرافة", "تمساح", "أخطبوط", "كنغر", "بطريق", "أسد", "نمر", "ذئب", "ثعلب", "أرنب", "غزال", "فهد", "ضفدع", "بومة", "عقاب", "صقر", "غوريلا"],
        "دول": ["مصر", "السعودية", "المغرب", "الإمارات", "فلسطين", "الجزائر", "الأردن", "لبنان", "سوريا", "الكويت", "قطر", "البحرين", "عمان", "اليمن", "العراق", "تونس", "ليبيا", "السودان"],
        "فواكه": ["تفاح", "موز", "برتقال", "مانجو", "بطيخ", "فراولة", "عنب", "توت", "كرز", "خوخ", "مشمش", "تين", "بلح", "رمان", "كيوي", "أناناس", "شمام", "كمثرى"],
        "ألوان": ["أحمر", "أزرق", "أخضر", "أصفر", "برتقالي", "بنفسجي", "وردي", "بني", "رمادي", "أبيض", "أسود", "ذهبي", "فضي"],
        "أطعمة": ["خبز", "أرز", "لحم", "دجاج", "سمك", "معكرونة", "بيتزا", "ساندويتش", "سلطة", "حساء", "جبن", "بيض", "خضار", "فلافل", "شاورما"],
        "مهن": ["طبيب", "مهندس", "معلم", "شرطي", "طباخ", "سائق", "نجار", "حداد", "خياط", "مزارع", "صحفي", "فنان", "كاتب", "طيار", "محاسب"]
    };

    function showPage(pageId) {
        Object.values(pages).forEach(p => p.classList.remove('active'));
        pages[pageId].classList.add('active');
        // Recalculate layout after page switch mainly for keyboard/hangman alignment
        setTimeout(resizeBoard, 50); 
    }

    function showAlert(message, title = 'تنبيه!') {
        $('#alert-title').innerText = title;
        $('#alert-message').innerText = message;
        $('#alert-modal').showModal();
    }

    function createBackgroundEffects() {
        const container = $('#background-effects');
        if (!container || container.children.length > 0) return;
        const letters = ARABIC_LETTERS.filter(l => l !== 'ء');
        for (let i = 0; i < 20; i++) {
            const letter = document.createElement('span');
            letter.className = 'floating-letter';
            letter.innerText = letters[Math.floor(Math.random() * letters.length)];
            letter.style.left = `${Math.random() * 100}vw`;
            letter.style.animationDuration = `${10 + Math.random() * 15}s`;
            letter.style.animationDelay = `${Math.random() * 10}s`;
            letter.style.fontSize = `${1.5 + Math.random() * 1.5}rem`;
            container.appendChild(letter);
        }
    }

    function init() {
        // Load Config Immediately
        loadConfig();
        
        // Listeners for Login
        $('#login-btn').addEventListener('click', handleLogin);
        $('#access-code-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleLogin();
        });

        // Resize Listener
        window.addEventListener('resize', resizeBoard);
        
        // Initial Effect
        createBackgroundEffects();

        // --- مستمعات الأحداث (Event Listeners) ---

// أزرار اختيار الوضع (فردي / جماعي)
$$('.mode-btn').forEach(btn => {
    btn.addEventListener('click', (e) => selectMode(e.target.dataset.mode));
});

// زر بدء اللعب وزر تأكيد الكلمة
$('#start-game-btn').addEventListener('click', startGame);
$('#confirm-word-btn').addEventListener('click', handleWordConfirmation);

// أزرار "كيف ألعب" (فتح وإغلاق)
$('#how-to-play-btn').addEventListener('click', () => $('#how-to-play-modal').showModal());
$('#close-how-to-play-btn').addEventListener('click', () => $('#how-to-play-modal').close());

// ⚠️ زر العودة للرئيسية أثناء اللعب (تم التعديل لإضافة التأكيد)
$('#game-home-btn').addEventListener('click', () => {
    // التحقق من حالة اللعب: إذا كان اللاعب في وسط اللعبة، نطلب التأكيد
    if (confirm("هل أنت متأكد من الخروج؟ سيتم إلغاء اللعبة الحالية!")) {
        showPage('landing');
    }
});

// أزرار التنقل الأخرى
$('#back-to-landing-btn').addEventListener('click', () => showPage('landing'));

// أزرار شاشة "نهاية اللعبة"
$('#game-over-home-btn').addEventListener('click', () => {
    $('#game-over-modal').close();
    showPage('landing');
});

$('#next-action-btn').addEventListener('click', () => {
    $('#game-over-modal').close();
    prepareNextRound();
});

// زر التلميح
$('#hint-btn').addEventListener('click', () => {
    if (gameState.hint) {
        $('#hint-text').innerText = gameState.hint;
        $('#hint-modal').showModal();
    }
});
        });
        $('#close-hint-btn').addEventListener('click', () => $('#hint-modal').close());
        $('#suggest-word-btn').addEventListener('click', showWordSuggestions);
        $('#close-suggestion-btn').addEventListener('click', () => $('#word-suggestion-modal').close());
        $('#close-alert-btn').addEventListener('click', () => $('#alert-modal').close());

        const passwordInput = $('#secret-word-input');
        const togglePassword = $('#toggle-password');
        togglePassword.addEventListener('click', () => {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            togglePassword.textContent = type === 'password' ? '👁️' : '🙈';
        });
    }

    function selectMode(mode) {
        setupGame(mode);
        showPage('setup');
    }

    function setupGame(mode) {
        Object.assign(gameState, {
            mode: mode,
            players: [],
            teamNames: { teamA: 'الأبطال', teamB: 'النجوم' },
            teams: { teamA: [], teamB: [] },
            scores: { teamA: 0, teamB: 0 },
            playerIndex: 0,
            teamAPlayerIndex: 0,
            teamBPlayerIndex: 0,
            currentTeam: 'teamA',
            word: '',
            originalWord: '',
            hint: '',
            guessedLetters: new Set(),
            wrongGuesses: 0, maxMistakes: 8, targetScore: 5
        });

        const setupContent = $('#setup-content');
        const setupTitle = $('#setup-title');
        let contentHTML = '';
        const difficultySelector = `
          <div class="text-center mt-6">
              <label class="font-semibold block mb-2">مستوى الصعوبة:</label>
              <div class="flex justify-center gap-2">
                <div><button data-difficulty="12" class="difficulty-btn btn bg-green-200 text-green-800 px-4 py-2 rounded-full font-bold">سهل</button><span class="text-xs text-slate-500 block mt-1">12 خطأ</span></div>
                <div><button data-difficulty="8" class="difficulty-btn btn bg-amber-200 text-amber-800 px-4 py-2 rounded-full font-bold active">متوسط</button><span class="text-xs text-slate-500 block mt-1">8 أخطاء</span></div>
                <div><button data-difficulty="4" class="difficulty-btn btn bg-red-200 text-red-800 px-4 py-2 rounded-full font-bold">صعب</button><span class="text-xs text-slate-500 block mt-1">4 أخطاء</span></div>
              </div>
          </div>`;

        if (mode === 'players') {
            setupTitle.innerText = "🙋‍♂️ إعداد اللاعبين";
            contentHTML = `<div><h3 class="font-bold text-xl mb-2 text-center">أسماء اللاعبين</h3><div class="flex gap-2"><input type="text" id="player-input" class="w-full p-2 border rounded" placeholder="أضف لاعب واضغط Enter..."><button id="add-player-btn" class="btn btn-primary px-4 rounded-lg font-bold">+</button></div><ul id="player-list" class="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2"></ul></div>${difficultySelector}`;
        } else if (mode === 'teams') {
            setupTitle.innerText = "🤝 إعداد الفرق";
            contentHTML = `<div class="grid grid-cols-1 md:grid-cols-2 gap-6"><div><input type="text" id="team-a-name" class="w-full p-2 border rounded text-center font-bold text-xl text-[--primary] mb-2" value="الأبطال"><div class="flex gap-2"><input type="text" id="team-a-input" class="w-full p-2 border rounded" placeholder="أضف لاعب..."><button id="add-team-a-btn" class="btn btn-primary px-4 rounded-lg font-bold">+</button></div><ul id="team-a-list" class="mt-2 space-y-1"></ul></div><div><input type="text" id="team-b-name" class="w-full p-2 border rounded text-center font-bold text-xl text-blue-500 mb-2" value="النجوم"><div class="flex gap-2"><input type="text" id="team-b-input" class="w-full p-2 border rounded" placeholder="أضف لاعب..."><button id="add-team-b-btn" class="btn btn-primary px-4 rounded-lg font-bold">+</button></div><ul id="team-b-list" class="mt-2 space-y-1"></ul></div></div><div class="text-center mt-4"><label class="font-semibold">الهدف للوصول إليه: </label><input type="number" id="target-score-input" value="5" min="1" class="w-20 p-1 border rounded text-center"></div>${difficultySelector}`;
        }
        setupContent.innerHTML = contentHTML;

        $$('.difficulty-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                $$('.difficulty-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                gameState.maxMistakes = parseInt(e.currentTarget.dataset.difficulty);
            });
        });

        if (mode === 'players') {
            $('#add-player-btn').addEventListener('click', handleAddPlayer);
            $('#player-input').addEventListener('keypress', (e) => { if (e.key === 'Enter') handleAddPlayer(); });
            renderPlayerList();
        } else if (mode === 'teams') {
            $('#add-team-a-btn').addEventListener('click', () => handleAddTeamPlayer('teamA'));
            $('#team-a-input').addEventListener('keypress', (e) => { if (e.key === 'Enter') handleAddTeamPlayer('teamA'); });
            $('#add-team-b-btn').addEventListener('click', () => handleAddTeamPlayer('teamB'));
            $('#team-b-input').addEventListener('keypress', (e) => { if (e.key === 'Enter') handleAddTeamPlayer('teamB'); });
            renderTeamLists();
        }
    }

    function handleAddPlayer() {
        const input = $('#player-input');
        const playerName = input.value.trim();
        if (playerName && !gameState.players.includes(playerName)) {
            gameState.players.push(playerName);
            input.value = '';
            renderPlayerList();
        }
        input.focus();
    }

    function renderPlayerList() {
        const list = $('#player-list');
        if (!list) return;
        list.innerHTML = gameState.players.map((p, index) => `<li class="bg-slate-100 p-2 rounded text-center flex justify-between items-center"><span>${p}</span><button data-index="${index}" class="remove-player-btn text-red-500 font-bold px-2">&times;</button></li>`).join('');
        $$('.remove-player-btn').forEach(btn => btn.addEventListener('click', (e) => {
            gameState.players.splice(parseInt(e.target.dataset.index), 1);
            renderPlayerList();
        }));
    }

    function handleAddTeamPlayer(teamKey) {
        const inputId = teamKey === 'teamA' ? '#team-a-input' : '#team-b-input';
        const input = $(inputId);
        const playerName = input.value.trim();
        if (playerName && !gameState.teams[teamKey].includes(playerName)) {
            gameState.teams[teamKey].push(playerName);
            input.value = '';
            renderTeamLists();
        }
        input.focus();
    }

    function renderTeamLists() {
        const aList = $('#team-a-list');
        const bList = $('#team-b-list');
        if (!aList || !bList) return;
        aList.innerHTML = gameState.teams['teamA'].map((p, i) => `<li class="bg-slate-100 p-1 rounded text-center flex justify-between"><span>${p}</span><button data-team="teamA" data-index="${i}" class="remove-team-player-btn text-red-500 font-bold px-2">&times;</button></li>`).join('');
        bList.innerHTML = gameState.teams['teamB'].map((p, i) => `<li class="bg-slate-100 p-1 rounded text-center flex justify-between"><span>${p}</span><button data-team="teamB" data-index="${i}" class="remove-team-player-btn text-red-500 font-bold px-2">&times;</button></li>`).join('');
        $$('.remove-team-player-btn').forEach(btn => btn.addEventListener('click', e => {
            gameState.teams[e.target.dataset.team].splice(parseInt(e.target.dataset.index), 1);
            renderTeamLists();
        }));
    }

    function startGame() {
        if (gameState.mode === 'players' && gameState.players.length < 2) {
            showAlert('تحتاج إلى لاعبين على الأقل في وضع دور اللاعبين.'); return;
        }
        if (gameState.mode === 'teams') {
            if (gameState.teams['teamA'].length < 1 || gameState.teams['teamB'].length < 1) {
                showAlert('يجب أن يحتوي كل فريق على لاعب واحد على الأقل.'); return;
            }
            gameState.teamNames.teamA = $('#team-a-name').value.trim() || 'الأبطال';
            gameState.teamNames.teamB = $('#team-b-name').value.trim() || 'النجوم';
            gameState.targetScore = parseInt($('#target-score-input').value) || 5;
            gameState.scores = { teamA: 0, teamB: 0 };
        }
        prepareNextRound();
    }

    function prepareNextRound() { promptForWord(); }

    function promptForWord() {
        let wordMaster = '';
        if (gameState.mode === 'players') {
            wordMaster = gameState.players[gameState.playerIndex];
        } else {
            const teamKey = gameState.currentTeam;
            const index = teamKey === 'teamA' ? gameState.teamAPlayerIndex : gameState.teamBPlayerIndex;
            wordMaster = gameState.teams[teamKey][index];
        }

        $('#word-entry-title').innerText = `دور ${wordMaster} لإدخال الكلمة`;
        $('#word-entry-instruction').innerText = `على البقية عدم النظر!`;
        $('#secret-word-input').value = '';
        $('#secret-word-hint').value = '';
        $('#word-entry-error').innerText = '';
        showPage('wordEntry');
    }

    function handleWordConfirmation() {
        const word = $('#secret-word-input').value.trim();
        const hint = $('#secret-word-hint').value.trim();
        const errorEl = $('#word-entry-error');
        if (!word) { errorEl.innerText = 'الرجاء إدخال كلمة.'; return; }
        if (!/^[ءآأؤإئابةتثجحخدذرزسشصضطظعغفقكلمنهوىي\s]+$/.test(word)) {
            errorEl.innerText = 'الرجاء استخدام حروف عربية فقط.'; return;
        }
        gameState.originalWord = word;
        gameState.word = word.toLowerCase()
            .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه')
            .replace(/ى/g, 'ي').replace(/[ؤئ]/g, 'ء');

        gameState.hint = hint;
        startRound();
    }

    function showWordSuggestions() {
        const list = $('#suggestion-list');
        list.innerHTML = '';
        const categories = Object.keys(WORD_BANK);
        for (let i = 0; i < 3; i++) {
            const randomCategory = categories[Math.floor(Math.random() * categories.length)];
            const randomWord = WORD_BANK[randomCategory][Math.floor(Math.random() * WORD_BANK[randomCategory].length)];
            const suggestionButton = document.createElement('button');
            suggestionButton.className = "w-full text-right p-2 rounded bg-slate-100 hover:bg-slate-200 transition";
            suggestionButton.innerHTML = `<strong>${randomCategory}:</strong> ${randomWord}`;
            suggestionButton.onclick = () => {
                $('#secret-word-input').value = randomWord;
                $('#secret-word-hint').value = '';
                $('#word-suggestion-modal').close();
            };
            list.appendChild(suggestionButton);
        }
        $('#word-suggestion-modal').showModal();
    }

    function startRound() {
        gameState.guessedLetters.clear();
        gameState.wrongGuesses = 0;
        $('#hangman-figure').classList.remove('falling');
        renderGameUI();
        showPage('game');
    }

    function renderGameUI() {
        renderWord();
        renderKeyboard();
        renderHangman();
        renderStatus();
        $('#hint-btn').style.display = gameState.hint ? 'block' : 'none';
    }

    function renderWord() {
        const wordDisplay = $('#word-display');
        wordDisplay.innerHTML = gameState.originalWord.split('').map(char => {
            if (char === ' ') return `<div class="w-8 h-12 sm:w-10 sm:h-16"></div>`;
            let normalizedChar = char.toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[ؤئ]/g, 'ء');
            const isRevealed = gameState.guessedLetters.has(normalizedChar);
            return `<div class="word-letter ${isRevealed ? 'revealed' : ''} w-8 h-12 sm:w-12 sm:h-20 perspective-[500px]"><div class="relative w-full h-full letter-inner"><div class="absolute w-full h-full flex items-center justify-center text-2xl sm:text-4xl font-bold border-b-4 border-slate-400 rounded-lg backface-hidden">${isRevealed ? char : ''}</div></div></div>`;
        }).join('');
    }

    function renderKeyboard() {
        const keyboard = $('#keyboard');
        keyboard.innerHTML = ARABIC_LETTERS.map(letter => {
            const isGuessed = gameState.guessedLetters.has(letter);
            let stateClass = '';
            if (isGuessed) {
                const correct = gameState.word.includes(letter);
                stateClass = correct ? 'correct' : 'incorrect';
            }
            return `<button class="keyboard-btn p-1 sm:p-3 rounded-lg text-lg sm:text-xl font-bold ${stateClass}" data-letter="${letter}" ${isGuessed ? 'disabled' : ''}>${letter}</button>`;
        }).join('');
        $$('.keyboard-btn').forEach(btn => btn.addEventListener('click', (e) => handleGuess(e.target.dataset.letter)));
    }

    function renderHangman() {
        const allPossibleParts = {
            head: '#hangman-head', body: '#hangman-body',
            armR: '#hangman-arm-right', armL: '#hangman-arm-left',
            legR: '#hangman-leg-right', legL: '#hangman-leg-left',
            eyeR: '#hangman-eye-right', eyeL: '#hangman-eye-left', mouth: '#hangman-mouth',
            earR: '#hangman-ear-right', earL: '#hangman-ear-left', hair: '#hangman-hair'
        };

        const sequences = {
            12: [['head'], ['body'], ['armR'], ['armL'], ['legR'], ['legL'], ['eyeR'], ['eyeL'], ['mouth'], ['earR'], ['earL'], ['hair']],
            8: [['head'], ['body'], ['armR'], ['armL'], ['legR'], ['legL'], ['eyeR', 'eyeL'], ['mouth', 'hair']],
            4: [['head'], ['body'], ['armR', 'armL'], ['legR', 'legL', 'eyeR', 'eyeL', 'mouth', 'hair']]
        };

        Object.values(allPossibleParts).forEach(selector => $(selector)?.classList.add('hidden'));
        const currentSequence = sequences[gameState.maxMistakes] || sequences[8];
        const partsToShow = [];
        for (let i = 0; i < gameState.wrongGuesses; i++) {
            if (currentSequence[i]) partsToShow.push(...currentSequence[i]);
        }
        partsToShow.forEach(partKey => { if (allPossibleParts[partKey]) $(allPossibleParts[partKey])?.classList.remove('hidden'); });

        const isLosing = gameState.wrongGuesses >= gameState.maxMistakes;
        $$('.hangman-part, .hangman-face-part').forEach(el => {
            const shouldWiggle = !el.classList.contains('hidden') && !isLosing;
            el.classList.toggle('wiggle', shouldWiggle);
        });
    }

    function renderStatus() {
        const status = $('#game-status');
        let html = '';
        if (gameState.mode === 'players') {
            const wordMaster = gameState.players[gameState.playerIndex];
            html = `<div class="text-center w-full"><div class="font-bold text-sm sm:text-base">الكلمة من: ${wordMaster}</div><div class="text-xs sm:text-sm">الأخطاء: ${gameState.wrongGuesses} / ${gameState.maxMistakes}</div></div>`;
        } else {
            const teamAName = gameState.teamNames.teamA;
            const teamBName = gameState.teamNames.teamB;
            const guessingTeamKey = gameState.currentTeam === 'teamA' ? 'teamB' : 'teamA';
            const guessingTeamName = gameState.teamNames[guessingTeamKey];
            html = `<span class="text-[--primary] font-extrabold text-sm sm:text-base">${teamAName}: ${gameState.scores['teamA']}</span><span class="mx-0.5 sm:mx-1 text-slate-400">|</span><span class="text-blue-500 font-extrabold text-sm sm:text-base">${teamBName}: ${gameState.scores['teamB']}</span><span class="w-full text-xs sm:text-sm mt-1">التخمين: فريق ${guessingTeamName}</span>`;
        }
        status.innerHTML = html;
    }

    function handleGuess(letter) {
        if (gameState.guessedLetters.has(letter)) return;
        gameState.guessedLetters.add(letter);
        if (!gameState.word.includes(letter)) gameState.wrongGuesses++;
        renderGameUI();
        checkGameState();
    }

    function checkGameState() {
        const wordGuessed = gameState.word.split('').every(char => {
            if (char === ' ') return true;
            return gameState.guessedLetters.has(char);
        });
        const roundLost = gameState.wrongGuesses >= gameState.maxMistakes;
        if (wordGuessed) setTimeout(() => handleRoundEnd(true), 500);
        else if (roundLost) {
            $('#hangman-figure').classList.add('falling');
            setTimeout(() => handleRoundEnd(false), 1200);
        }
    }

    function handleRoundEnd(isWin) {
        const nextActionBtn = $('#next-action-btn');
        const finalScoreDisplay = $('#final-score-display');
        finalScoreDisplay.innerHTML = '';

        if (gameState.mode === 'players') {
            gameState.playerIndex = (gameState.playerIndex + 1) % gameState.players.length;
            const message = isWin ? "أحسنتم! خمنتم الكلمة بنجاح!" : "للأسف! حظ أوفر في المرة القادمة.";
            endGame(isWin, message, "الدور التالي");
            nextActionBtn.onclick = () => { $('#game-over-modal').close(); prepareNextRound(); };
        } else {
            const guessingTeamKey = gameState.currentTeam === 'teamA' ? 'teamB' : 'teamA';
            const wordMasterTeamKey = gameState.currentTeam;
            if (isWin) gameState.scores[guessingTeamKey]++; else gameState.scores[wordMasterTeamKey]++;
            
            const teamAName = gameState.teamNames.teamA;
            const teamBName = gameState.teamNames.teamB;
            finalScoreDisplay.innerHTML = `<span class="text-[--primary] font-bold">${teamAName}: ${gameState.scores['teamA']}</span> - <span class="text-blue-500 font-bold">${teamBName}: ${gameState.scores['teamB']}</span>`;

            const winnerKey = Object.keys(gameState.scores).find(teamKey => gameState.scores[teamKey] >= gameState.targetScore);
            if (winnerKey) {
                const winnerName = gameState.teamNames[winnerKey];
                endGame(true, `🏆 فريق ${winnerName} يفوز بالمباراة!`, "مباراة جديدة");
                nextActionBtn.onclick = () => { $('#game-over-modal').close(); showPage('landing'); };
            } else {
                const guessingTeamName = gameState.teamNames[guessingTeamKey];
                const wordMasterTeamName = gameState.teamNames[wordMasterTeamKey];
                const message = isWin ? `نقطة لفريق ${guessingTeamName}!` : `نقطة لفريق ${wordMasterTeamName}!`;
                if (gameState.currentTeam === 'teamA') gameState.teamAPlayerIndex = (gameState.teamAPlayerIndex + 1) % gameState.teams['teamA'].length;
                else gameState.teamBPlayerIndex = (gameState.teamBPlayerIndex + 1) % gameState.teams['teamB'].length;
                gameState.currentTeam = guessingTeamKey;
                endGame(isWin, message, "الجولة التالية");
                nextActionBtn.onclick = () => { $('#game-over-modal').close(); prepareNextRound(); };
            }
        }
    }

    function endGame(isWin, message, nextActionText) {
        $('#game-over-title').innerText = isWin ? '🎉 انتهت الجولة!' : '😟 انتهت الجولة';
        $('#game-over-message').innerText = message;
        $('#game-over-word').innerText = gameState.originalWord;
        $('#next-action-btn').innerText = nextActionText;
        $('#game-over-modal').showModal();
    }

    init();
});
