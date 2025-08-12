// =============================================================
// NutraSynth Careers Portal Interaction Script (story.js)
// -------------------------------------------------------------
// Responsibilities:
// 1. Orchestrates boot scanline CRT intro + audio transition
// 2. Provides static burst SFX utility for interactive affordances
// 3. Performs progressive decode reveal of heading & summary text
// 4. Supplies Hangul scrambling helpers for localized atmosphere
// 5. Drives timed form auto-fill with conditional pause & completion glow
// 6. Triggers easter‑egg crack overlay + popup portal after submission
// =============================================================

// ------------------------------
// Boot / initial interactive setup
// ------------------------------
document.addEventListener('DOMContentLoaded', function() {
    // Cache audio elements used for subtle retro feedback.
    var staticAudio = document.getElementById('static-audio');
    var crtAudio = document.getElementById('crt-audio');
    var fadeInterval = null; // Holds interval handle for gradual static fade-out

    /**
     * playStaticWithFade()
     * Starts static sound at medium volume then fades it out quickly.
     * Used for any future hover / interactive micro-interactions.
     */
    function playStaticWithFade() {
        if (!staticAudio) return;
        staticAudio.currentTime = 0;
        staticAudio.volume = 0.3;
        staticAudio.play().catch(function(){}); // Ignore autoplay restriction errors.
        if (fadeInterval) clearInterval(fadeInterval);
        fadeInterval = setInterval(function() {
            if (staticAudio.volume > 0.05) {
                staticAudio.volume = Math.max(0, staticAudio.volume - 0.05);
            } else {
                staticAudio.volume = 0;
                staticAudio.pause();
                clearInterval(fadeInterval);
            }
        }, 50);
    }

    // ------------------------------
    // Scanline intro state machine (applies animated -> neutral -> hidden states)
    // ------------------------------
    var body = document.body;
    body.classList.remove('hide-scanlines', 'scanlines-animate', 'scanlines-black', 'scanlines-fade');
    void body.offsetWidth; // Forces reflow so animation retriggers reliably.
    body.classList.add('scanlines-animate');

    /**
     * endScanlines()
     * Plays CRT pop, converts colored scanlines to neutral, then hides overlay.
     * Runs once on first user click interaction.
     */
    function endScanlines() {
        if (crtAudio) {
            crtAudio.currentTime = 0;
            crtAudio.volume = 1.0;
            crtAudio.play().catch(function(){});
        }
        body.classList.remove('scanlines-animate');
        body.classList.add('scanlines-black');
        setTimeout(function() { body.classList.add('hide-scanlines'); }, 3000);
        window.removeEventListener('click', endScanlines);
    }
    window.addEventListener('click', endScanlines);
});

// ------------------------------
// Random Hangul character helper (for decode scrambling)
// ------------------------------
function randomKoreanChar() {
    const start = 0xAC00; // Start of Hangul syllables block
    const end = 0xD7A3;   // End of Hangul syllables block
    return String.fromCharCode(Math.floor(Math.random() * (end - start + 1)) + start);
}

// ------------------------------
// decodeTextEffect(): progressive reveal with dynamic scrambling
// ------------------------------
/**
 * Smoothly replaces placeholder / scrambled characters with the final text.
 * Uses Hangul glyphs for an atmospheric "systems localization" feel.
 * @param {HTMLElement} element - Target element whose text is being revealed
 * @param {String} finalText - Intended final user-facing text
 * @param {Number} duration - Total animation time in ms
 */
function decodeTextEffect(element, finalText, duration = 3000) {
    const chars = Array.from(finalText);
    let revealed = Array(chars.length).fill(false);
    // Non-space characters start as non-breaking spaces to stabilize layout width
    let current = chars.map(c => (c === '\n' ? '\n' : (c === ' ' ? ' ' : '\u00A0')));
    const startTime = Date.now();
    const total = chars.length;
    const interval = setInterval(() => {
        const now = Date.now();
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const toReveal = Math.floor(progress * total);

        // Gather indices still unrevealed (excluding whitespace/newlines)
        let unrevealedIndices = [];
        for (let i = 0; i < total; i++) {
            if (!revealed[i] && chars[i] !== '\n' && chars[i] !== ' ') {
                unrevealedIndices.push(i);
            }
        }
        // Randomly reveal a batch based on progress
        while (unrevealedIndices.length > 0 && revealed.filter(Boolean).length < toReveal) {
            const idx = unrevealedIndices.splice(Math.floor(Math.random() * unrevealedIndices.length), 1)[0];
            revealed[idx] = true;
            current[idx] = chars[idx];
        }
        // For characters not yet revealed, inject rolling random Hangul glyphs
        for (let i = 0; i < total; i++) {
            if (!revealed[i] && chars[i] !== '\n' && chars[i] !== ' ') {
                current[i] = randomKoreanChar();
            }
        }
        element.innerHTML = current.join('');
        if (progress >= 1) {
            clearInterval(interval);
            element.textContent = finalText; // Final clean text (no spans)
        }
    }, 30);
}

// ------------------------------
// Secondary DOMContentLoaded: text decode + form automation
// (Separated for clarity from boot scanline logic above.)
// ------------------------------
document.addEventListener('DOMContentLoaded', function() {
    // Injects audio references for typing / click SFX
    const typingAudio = document.getElementById('typing-audio');
    const clickAudio = document.getElementById('click-audio');
    const corporateAudio = document.getElementById('corporate-audio');
    let corporatePlayed = false;
    function playCorporateOnce(){
        if(corporatePlayed || !corporateAudio) return;
        corporatePlayed = true;
        try {
            corporateAudio.volume = 0.2; // Adjusted to 20% volume
            corporateAudio.currentTime = 0;
            const pr = corporateAudio.play();
            if(pr && pr.catch){
                pr.catch(()=>{
                    const retry = ()=>{ playCorporateOnce(); };
                    window.addEventListener('pointerdown', retry, { once:true });
                    window.addEventListener('keydown', retry, { once:true });
                });
            }
        } catch(e) {}
    }

    function safePlayTyping() {
        if (!typingAudio) return;
        try {
            typingAudio.currentTime = 0;
            typingAudio.loop = true;
            typingAudio.volume = 0.55;
            const p = typingAudio.play();
            if (p && typeof p.then === 'function') {
                p.catch(() => {
                    // Waits for first user interaction then retries
                    const retry = () => {
                        typingAudio.currentTime = 0;
                        typingAudio.play().catch(()=>{});
                    };
                    window.addEventListener('pointerdown', retry, { once: true });
                    window.addEventListener('keydown', retry, { once: true });
                });
            }
        } catch(e) {}
    }

    // ---------------------------------
    // Summary paragraphs: begin scrambled; decode on click once
    // ---------------------------------
    const summaryParagraphs = document.querySelectorAll('.summary p');
    summaryParagraphs.forEach(function(summary) {
        const finalText = summary.textContent;
        const parent = summary.parentElement;
        // Preserves initial height to avoid layout jump during scramble phase
        if (parent) parent.style.minHeight = parent.offsetHeight + 'px';
        function randomKoreanString(len) {
            let s = '';
            for (let i = 0; i < len; i++) {
                const c = finalText[i];
                if (c === '\n' || c === ' ') s += c; else s += randomKoreanChar();
            }
            return s;
        }
        summary.textContent = randomKoreanString(finalText.length);
        summary.addEventListener('click', function handleClick() {
            summary.removeEventListener('click', handleClick);
            playCorporateOnce(); // NEW: trigger corporate audio on first decode activation
            decodeTextEffect(summary, finalText, 1000);
        });
    });

    // ---------------------------------
    // Title: decodes immediately on load (also triggers corporate audio if not yet played)
    // ---------------------------------
    const titleMain = document.querySelector('.title-main');
    if (titleMain) {
        const finalTitle = titleMain.textContent;
        titleMain.textContent = '';
        playCorporateOnce(); // Fallback trigger if summary not clicked (or to start immediately)
        decodeTextEffect(titleMain, finalTitle, 1000);
    }

    // ---------------------------------
    // Progressive form auto-fill: simulates applicant; pauses until 5 words entered
    // ---------------------------------
    const form = document.getElementById('application-form');
    if (form) {
        // Demo values (storytelling only)
        const demoValues = {
            name: 'Thomas Zeng',
            email: 'thomas.zeng@example.com',
            phone: '+82-10-1234-5678',
            role: 'Quality Assurance Intern'
            // cover remains blank intentionally
        };

        // Handles powerdown visual + schedules crack overlay sequence
        const powerdownAudio = document.getElementById('powerdown-audio');
        function createCrackReveal() {
            // Renders crack overlay image; enables interaction to open hidden forum
            if (document.getElementById('crack-overlay')) return;
            const img = document.createElement('img');
            img.id = 'crack-overlay';
            img.src = 'crack.png';
            img.alt = 'System breach fracture overlay';
            img.classList.add('visible');
            img.tabIndex = 0; // Makes overlay focusable for keyboard activation
            document.body.appendChild(img);
            // Plays glass break SFX once
            try {
                const glass = new Audio('glass break.mp3');
                glass.currentTime = 0;
                glass.volume = 0.3;
                glass.play().catch(()=>{});
            } catch(e) {}
            // Opens easter egg popup
            function openEgg() {
                const availW = (window.screen && window.screen.availWidth) ? window.screen.availWidth : window.innerWidth;
                const availH = (window.screen && (window.screen.availHeight || window.screen.height)) ? (window.screen.availHeight || window.screen.height) : window.innerHeight;
                const w = Math.max(600, Math.floor(availW / 2)); // Uses left half, with minimum width
                const h = availH; // Uses full height
                const features = `left=0,top=0,width=${w},height=${h},menubar=no,toolbar=no,location=no,status=no,scrollbars=yes,resizable=yes`; 
                const win = window.open('nun_backroom_forum.html','nun_backroom_forum',features);
                if (win) { try { win.focus(); } catch(e){} }
            }
            img.addEventListener('click', openEgg);
            img.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openEgg(); } });
            // Glitch loop: applies periodic jitter & filter flashes
            (function glitchLoop(){
                const delay = 400 + Math.random()*2400;
                setTimeout(() => {
                    if (!img.isConnected) return;
                    const burst = 2 + Math.floor(Math.random()*4); // 2-5 rapid frames
                    const baseTransform = img.style.transform || '';
                    for (let i=0;i<burst;i++) {
                        setTimeout(()=>{
                            if (!img.isConnected) return;
                            const dx = (Math.random()-0.5)*28;
                            const dy = (Math.random()-0.5)*28;
                            const rotate = (Math.random()<0.35) ? ` rotate(${(Math.random()-0.5)*4}deg)` : '';
                            const scale  = (Math.random()<0.25) ? ` scale(${1 + (Math.random()-0.5)*0.12})` : '';
                            img.style.transform = `${baseTransform} translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px)${rotate}${scale}`;
                            if (i === 0) {
                                img.style.filter = 'grayscale(1) contrast(2.8) brightness(1.15)';
                            } else if (i === burst-1) {
                                img.style.filter = 'grayscale(1) contrast(3.4) brightness(0.85) invert(1)';
                            } else {
                                img.style.filter = 'grayscale(1) contrast(2.2) brightness(1.05)';
                            }
                        }, i*46);
                    }
                    setTimeout(()=>{
                        img.style.transform = baseTransform;
                        img.style.filter = 'grayscale(1) contrast(1.6) brightness(0.95)';
                        glitchLoop();
                    }, burst*46 + 90 + Math.random()*120);
                }, delay);
            })();
        }
        form.addEventListener('submit', function(e) {
            e.preventDefault(); // Prevents navigation for demo
            if (powerdownAudio) {
                powerdownAudio.currentTime = 0;
                powerdownAudio.play().catch(()=>{});
            }
            document.documentElement.classList.add('portal-powerdown');
            setTimeout(createCrackReveal, 1900); // Schedules crack after grayscale transition
        });

        // Immediate auto-fill steps (run sequentially over totalDuration)
        const preSequence = [
            () => { const el = form.elements['name']; if (el && !el.value) el.value = demoValues.name; },
            () => { const el = form.elements['email']; if (el && !el.value) el.value = demoValues.email; },
            () => { const el = form.elements['phone']; if (el && !el.value) el.value = demoValues.phone; },
            () => { const sel = form.elements['role']; if (sel && !sel.value) { for (let i=0;i<sel.options.length;i++){ if (sel.options[i].text===demoValues.role){ sel.selectedIndex=i; break; } } } }
        ];

        // Deferred steps (trigger after user supplies 5 cover letter words)
        const resumeStep = () => {
            const fileInput = form.elements['resume'];
            if (clickAudio) { clickAudio.currentTime = 0; clickAudio.play().catch(()=>{}); }
            if (fileInput) {
                let badge = fileInput.parentElement.querySelector('.fake-upload-indicator');
                if (!badge) {
                    badge = document.createElement('span');
                    badge.className = 'fake-upload-indicator';
                    badge.style.cssText = 'display:inline-block;margin-top:0.4rem;padding:0.35rem 0.6rem;font-size:0.75rem;border:1px solid #444;background:#222;color:#fff;border-radius:4px;font-family:\'IBM Plex Mono\',monospace;';
                    fileInput.parentElement.appendChild(badge);
                }
                badge.textContent = 'Uploaded: resume.pdf';
            }
        };
        const consentStep = () => { const consent = form.querySelector('input[name="consent"]'); if (consent) { if (clickAudio) { clickAudio.currentTime = 0; clickAudio.play().catch(()=>{}); } consent.checked = true; consent.dispatchEvent(new Event('change')); } };
        const completionStep = () => {
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) submitBtn.classList.add('submit-glow');
            if (typingAudio && !typingAudio.paused) { typingAudio.pause(); typingAudio.currentTime = 0; typingAudio.loop = false; }
        };

        const totalDuration = 4000; // Duration for pre-sequence auto-fill
        const step = totalDuration / preSequence.length;
        let started = false;
        let waitingForWords = false;
        const cover = form.elements['cover'];

        function startFill() {
            if (started) return; started = true;
            safePlayTyping();
            preSequence.forEach((fn, i) => setTimeout(fn, Math.round(i * step)));
            setTimeout(initCoverMonitoring, Math.round((preSequence.length) * step) + 150);
        }

        function wordCount(val) { return (val.trim().split(/\s+/).filter(Boolean)).length; }

        function initCoverMonitoring() {
            if (typingAudio && !typingAudio.paused) { typingAudio.pause(); }
            if (!cover) { // If no cover field, immediately proceed
                resumeStep();
                setTimeout(() => { consentStep(); completionStep(); }, 400);
                return;
            }
            const currentWords = wordCount(cover.value);
            if (currentWords >= 5) {
                resumeStep();
                setTimeout(() => { consentStep(); completionStep(); }, 400);
            } else {
                waitingForWords = true;
                cover.addEventListener('input', coverListener);
            }
        }

        function coverListener() {
            if (!waitingForWords) return;
            if (wordCount(cover.value) >= 5) {
                waitingForWords = false;
                cover.removeEventListener('input', coverListener);
                resumeStep();
                setTimeout(() => { consentStep(); completionStep(); }, 400);
            }
        }

        // Starts when form becomes at least 25% visible; falls back to timed start
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver(entries => {
                entries.forEach(entry => { if (entry.isIntersecting) { startFill(); observer.disconnect(); } });
            }, { threshold: 0.25 });
            observer.observe(form);
        } else {
            setTimeout(startFill, 800);
        }
    }
});

// =============================================================
// END story.js
// =============================================================
