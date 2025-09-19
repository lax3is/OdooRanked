// ==UserScript==
// @name         Odoo Gamification
// @namespace    http://tampermonkey.net/
// @version      3.0.0
// @description  Add gamification system to Odoo helpdesk with custom rank logos
// @author       Alexis.Sair
// @match        https://winprovence.odoo.com/*
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @updateURL    https://raw.githubusercontent.com/lax3is/OdooRanked/refs/heads/main/Gamification.js
// @downloadURL  https://raw.githubusercontent.com/lax3is/OdooRanked/refs/heads/main/Gamification.js
// ==/UserScript==

(function() {
    'use strict';



    function loadScript(url, callback){
        var script = document.createElement("script");
        script.type = "text/javascript";
        script.onload = callback;
        script.src = url;
        document.head.appendChild(script);
    }

    loadScript("https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js", function() {
        loadScript("https://www.gstatic.com/firebasejs/8.10.0/firebase-database.js", function() {
            mainGamification();
        });
    });

    function mainGamification() {
        console.log('[Gamification] mainGamification appelée, firebase =', typeof firebase);
        const firebaseConfig = {
            apiKey: "AIzaSyB6OFosv9Fg6pMQv0QGxyanuOETtNCw",
            authDomain: "odooranked.firebaseapp.com",
            databaseURL: "https://odooranked-default-rtdb.europe-west1.firebasedatabase.app",
            projectId: "odooranked",
            storageBucket: "odooranked.appspot.com",
            messagingSenderId: "463495344412",
            appId: "1:463495344412:web:3eace838263aa8124ad49",
            measurementId: "G-HZHTVQT1H8"
        };
        if (firebase.apps.length === 0) {
            firebase.initializeApp(firebaseConfig);
        }
        const database = firebase.database();

        const ONBOARDING_V100_IMAGE = 'https://i.imgur.com/dCU2QJb.png';

        function showOnboardingV100(userName) {
            if (document.getElementById('onboarding-v100') || localStorage.getItem('gm_onboarding_v100_ack') === '1') return;
            const bg = document.createElement('div');
            bg.id = 'onboarding-v100-bg';
            bg.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:100000;';
            const pop = document.createElement('div');
            pop.id = 'onboarding-v100';
            pop.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(34,40,49,0.98);border:2px solid #26e0ce44;border-radius:20px;box-shadow:0 0 40px 10px #26e0ce55,0 8px 32px rgba(0,0,0,0.25);padding:22px 22px 16px 22px;z-index:100001;min-width:320px;max-width:96vw;max-height:92vh;overflow:auto;text-align:center;color:#f3f6fa;font-family:"Segoe UI",Arial,sans-serif;';
            const img = document.createElement('img');
            img.src = ONBOARDING_V100_IMAGE;
            img.alt = 'Présentation Gamification v1.0.0';
            img.style.cssText = 'max-width:92vw;max-height:72vh;width:100%;height:auto;border-radius:12px;display:block;margin:0 auto 12px auto;';
            const btn = document.createElement('button');
            btn.textContent = "J'ai compris";
            btn.style.cssText = 'margin-top:6px;padding:10px 22px;border:none;border-radius:10px;background:linear-gradient(90deg,#26e0ce,#209cff);color:#fff;font-weight:800;cursor:pointer;';
            btn.onclick = () => {
                localStorage.setItem('gm_onboarding_v100_ack','1');
                try { firebase.database().ref('users/' + encodeURIComponent(userName)).update({ onboardingV100Ack: true }); } catch(e){}
                pop.remove();
                bg.remove();
            };
            pop.appendChild(img);
            pop.appendChild(btn);
            document.body.appendChild(bg);
            document.body.appendChild(pop);
        }
        // Fonction de test (console): force l'affichage de la popup d'onboarding


        // Fonction utilitaire pour formater et colorer les chiffres dans les tableaux de stats
        function formatStatNumber(val, type) {
            let color = '#3498db'; // Normal (bleu)
            if (type === 'important') color = '#27ae60'; // vert
            if (type === 'urgent') color = '#ff9800'; // orange
            if (type === 'bloquant') color = '#e74c3c'; // rouge
            const style = `font-size:1.25em;font-weight:bold;${val > 0 ? `color:${color};` : 'color:#eee;'}text-align:center;`;
            return `<span style='${style}'>${val}</span>`;
        }

        // Fonction utilitaire pour colorer le type d'appel
        function formatTypeLabel(type) {
            if (type === 'important') return `<span style='color:#27ae60;font-weight:bold;'>Important</span>`;
            if (type === 'urgent') return `<span style='color:#ff9800;font-weight:bold;'>Urgent</span>`;
            if (type === 'bloquant') return `<span style='color:#e74c3c;font-weight:bold;'>Bloquant</span>`;
            return `<span style='color:#3498db;font-weight:bold;'>Normal</span>`;
        }

        // Main ranks and sub-ranks
        const mainRanks = [
            { name: "Novice", xpRequired: 0 },
            { name: "Bronze", xpRequired: 1000 },
            { name: "Argent", xpRequired: 2500 },
            { name: "Or", xpRequired: 5000 },
            { name: "Platine", xpRequired: 10000 },
            { name: "Diamant", xpRequired: 20000 },
            { name: "Maître des appels", xpRequired: 35000 },
            { name: "DIEU DES APPELS", xpRequired: 50000 }
        ];
        const subRankLabels = ["IV", "III", "II", "I"];
        let ranks = [{ name: "Novice", xpRequired: 0 }];
        for (let i = 1; i < mainRanks.length - 1; i++) { // -1 to exclude DIEU DES APPELS from subranks
            const prev = mainRanks[i - 1];
            const curr = mainRanks[i];
            const step = (curr.xpRequired - prev.xpRequired) / 4;
            for (let j = 0; j < 4; j++) {
                ranks.push({
                    name: `${curr.name} ${subRankLabels[j]}`,
                    xpRequired: Math.round(prev.xpRequired + step * (j + 1))
                });
            }
        }
        ranks.push({ name: "DIEU DES APPELS", xpRequired: 50000 });

        // Mapping logos for each main rank
        const rankLogos = {
            "Novice": "https://i.imgur.com/ii2aCGm.png",
            "Bronze": "https://i.imgur.com/JOe5kWu.png",
            "Argent": "https://i.imgur.com/raOPNIg.png",
            "Or": "https://i.imgur.com/meGXyT4.png",
            "Platine": "https://i.imgur.com/7iLbCL8.png",
            "Diamant": "https://i.imgur.com/dANpcmc.png",
            "Maître": "https://i.imgur.com/lsKNORI.png",
            "DIEU": "https://i.imgur.com/jqJIdVW.png"
        };
        const rankColors = {
            "Novice": "#e0e0e0",
            "Bronze": "#cd7f32",
            "Argent": "#bfc1c2",
            "Or": "#e6b800",
            "Platine": "#7ed6df",
            "Diamant": "#273c75",
            "Maître": "#a020f0",
            "DIEU": "#d90429"
        };
        // === Nouveau: Système de niveaux (1→100) + Prestiges (0→10) ===
        // Modèle de progression: coût niveau n = baseXP + (n-1)*increment; total cumulé utilisé pour déterminer le niveau courant
        // Ajusté pour viser ~50 000 XP jusqu'au niveau 100
        const levelProgressionConfig = { baseXPPerLevel: 160, incrementPerLevel: 7, maxLevel: 100, maxPrestige: 10 };
        // Fin de saison des ranks (Master, Diamant, etc.)
        const seasonEnded = true;
        function xpToReachLevel(targetLevel) {
            // XP total nécessaire pour atteindre 'targetLevel' (niveau 1 => 0 XP)
            const { baseXPPerLevel, incrementPerLevel } = levelProgressionConfig;
            if (targetLevel <= 1) return 0;
            const n = targetLevel - 1;
            // somme arithmétique: n * base + inc * n*(n-1)/2
            return n * baseXPPerLevel + incrementPerLevel * (n * (n - 1) / 2);
        }
        function getLevelFromXp(xp) {
            const maxLevel = levelProgressionConfig.maxLevel;
            if (!Number.isFinite(xp) || xp < 0) xp = 0;
            let level = 1;
            for (let l = 2; l <= maxLevel; l++) {
                if (xp >= xpToReachLevel(l)) level = l; else break;
            }
            const currentLevelFloor = xpToReachLevel(level);
            const nextLevel = Math.min(level + 1, maxLevel);
            const nextLevelFloor = xpToReachLevel(nextLevel);
            const xpIntoLevel = xp - currentLevelFloor;
            const xpForNextLevel = Math.max(0, nextLevelFloor - currentLevelFloor);
            return { level, xpIntoLevel, xpForNextLevel, nextLevel };
        }
        // Logos de prestige (placeholders pour démarrer)
        const prestigeLogos = {
            0: "https://i.imgur.com/ii2aCGm.png",   // défaut
            1: "https://i.imgur.com/jqJIdVW.png",   // prestige 1
            2: "https://i.imgur.com/lsKNORI.png",
            3: "https://i.imgur.com/dANpcmc.png",
            4: "https://i.imgur.com/7iLbCL8.png",
            5: "https://i.imgur.com/meGXyT4.png",
            6: "https://i.imgur.com/raOPNIg.png",
            7: "https://i.imgur.com/JOe5kWu.png",
            8: "https://i.imgur.com/ii2aCGm.png",
            9: "https://i.imgur.com/lsKNORI.png",
            10: "https://i.imgur.com/jqJIdVW.png"
        };
        const prestigeColors = {
            0: "#26e0ce",
            1: "#ffd700",
            2: "#a020f0",
            3: "#2ecc71",   // vert émeraude
            4: "#e91e63",   // rose framboise
            5: "#ff8c00",   // orange soutenu
            6: "#c0c0c0",   // argent
            7: "#ffd700",   // or brillant
            8: "#26e0ce",
            9: "#8f00ff",
            10: "#d90429"
        };
        // Gradients d'XP par prestige (dégradés personnalisés)
        const prestigeGradients = {
            0: ["#209cff", "#26e0ce"],
            1: ["#ffd700", "#ff9800"],
            2: ["#a020f0", "#8f00ff"],
            3: ["#00b09b", "#96c93d"],   // émeraude → lime
            4: ["#ff512f", "#dd2476"],   // orange rosé → magenta
            5: ["#f7971e", "#ff512f"],   // orange vif → rouge orangé
            6: ["#d9d9d9", "#ffffff"],   // argent brillant
            7: ["#ffcc00", "#fff3b0"],   // or brillant
            // Prestiges épiques bi-color
            8: ["#00eaff", "#ff00cc"],   // cyan → magenta néon
            9: ["#8f00ff", "#00ffd5"],   // violet → aqua
            10: ["#d90429", "#ffffff"]   // rogue (rouge très prononcé) → blanc
        };
        function getPrestigeGradient(prestige) {
            const g = prestigeGradients[prestige];
            if (g && g.length === 2) return { start: g[0], end: g[1] };
            return { start: prestigeGradients[0][0], end: prestigeGradients[0][1] };
        }
        function getPrestigeGlowFilter(prestige, size = 'normal') {
            const c = prestigeColors[prestige] || '#26e0ce';
            return size === 'big'
                ? `drop-shadow(0 0 0px ${c}cc) drop-shadow(0 0 14px ${c}cc) drop-shadow(0 0 24px ${c}77)`
                : `drop-shadow(0 0 0px ${c}88) drop-shadow(0 0 7px ${c}88) drop-shadow(0 0 12px ${c}44)`;
        }
        // Génère un data URI d'un anneau rotatif style niveau 100 pour un prestige donné
        function generatePrestigeRingDataURI(prestige, size = 80, withNumber = true) {
            const g = getPrestigeGradient(prestige);
            const circumference = (2 * Math.PI * 44).toFixed(2);
            const dashoffset = (0).toFixed(2);
            const ticks = Array.from({length: 32}).map((_, i) => {
                const a = -Math.PI/2 + (2*Math.PI*i/32);
                const r1 = 34, r2 = 38;
                const x1 = 50 + r1*Math.cos(a);
                const y1 = 50 + r1*Math.sin(a);
                const x2 = 50 + r2*Math.cos(a);
                const y2 = 50 + r2*Math.sin(a);
                return `<line x1='${x1.toFixed(2)}' y1='${y1.toFixed(2)}' x2='${x2.toFixed(2)}' y2='${y2.toFixed(2)}' stroke='${g.start}' stroke-opacity='0.35' stroke-width='2'/>`;
            }).join('');
            const numberText = withNumber ? `<text x='50' y='58' text-anchor='middle' fill='#fff' font-size='34' font-weight='800' font-family='Segoe UI,Inter,Roboto,sans-serif'>100</text>` : '';
            const svg = `
<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 100 100'>
  <defs>
    <linearGradient id='pgrad' x1='0%' y1='0%' x2='100%' y2='100%'>
      <stop offset='0%' stop-color='${g.start}'/>
      <stop offset='100%' stop-color='${g.end}'/>
    </linearGradient>
    <filter id='pglow' x='-50%' y='-50%' width='200%' height='200%'>
      <feGaussianBlur stdDeviation='2' result='b'/>
      <feMerge><feMergeNode in='b'/><feMergeNode in='SourceGraphic'/></feMerge>
    </filter>
  </defs>
  <g>
    ${ticks}
    <circle cx='50' cy='50' r='44' stroke='url(#pgrad)' stroke-width='8' fill='none' stroke-dasharray='${circumference}' stroke-dashoffset='${dashoffset}' stroke-linecap='round' filter='url(#pglow)'/>
    <circle cx='86' cy='50' r='4' fill='${g.end}' />
    ${numberText}
    <animateTransform attributeName='transform' type='rotate' from='0 50 50' to='360 50 50' dur='6s' repeatCount='indefinite'/>
  </g>
</svg>`;
            return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
        }
        // Génère un SVG inline (non data:) pour preview dans le DOM (bypass CSP data:)
        function generatePrestigeRingSVG(prestige, size = 80, withNumber = true) {
            const g = getPrestigeGradient(prestige);
            const circumference = (2 * Math.PI * 44).toFixed(2);
            const dashoffset = (0).toFixed(2);
            const ticks = Array.from({length: 32}).map((_, i) => {
                const a = -Math.PI/2 + (2*Math.PI*i/32);
                const r1 = 34, r2 = 38;
                const x1 = 50 + r1*Math.cos(a);
                const y1 = 50 + r1*Math.sin(a);
                const x2 = 50 + r2*Math.cos(a);
                const y2 = 50 + r2*Math.sin(a);
                return `<line x1='${x1.toFixed(2)}' y1='${y1.toFixed(2)}' x2='${x2.toFixed(2)}' y2='${y2.toFixed(2)}' stroke='${g.start}' stroke-opacity='0.35' stroke-width='2'/>`;
            }).join('');
            const numberText = withNumber ? `<text x='50' y='58' text-anchor='middle' fill='#fff' font-size='34' font-weight='800' font-family='Segoe UI,Inter,Roboto,sans-serif'>100</text>` : '';
            return `
<svg width='${size}' height='${size}' viewBox='0 0 100 100' style='overflow:visible;'>
  <defs>
    <linearGradient id='pgrad${prestige}' x1='0%' y1='0%' x2='100%' y2='100%'>
      <stop offset='0%' stop-color='${g.start}'/>
      <stop offset='100%' stop-color='${g.end}'/>
    </linearGradient>
    <filter id='pglow${prestige}' x='-50%' y='-50%' width='200%' height='200%'>
      <feGaussianBlur stdDeviation='2' result='b'/>
      <feMerge><feMergeNode in='b'/><feMergeNode in='SourceGraphic'/></feMerge>
    </filter>
  </defs>
  <g>
    ${ticks}
    <circle cx='50' cy='50' r='44' stroke='url(#pgrad${prestige})' stroke-width='8' fill='none' stroke-dasharray='${circumference}' stroke-dashoffset='${dashoffset}' stroke-linecap='round' filter='url(#pglow${prestige})'/>
    <circle cx='86' cy='50' r='4' fill='${g.end}' />
    ${numberText}
    <animateTransform attributeName='transform' type='rotate' from='0 50 50' to='360 50 50' dur='6s' repeatCount='indefinite'/>
  </g>
</svg>`;
        }
        function getRankBaseName(rankName) {
            if (rankName.startsWith("Maître")) return "Maître";
            if (rankName.startsWith("DIEU")) return "DIEU";
            return rankName.split(" ")[0];
        }
        function getCurrentRank(xp) {
            for (let i = ranks.length - 1; i >= 0; i--) {
                if (xp >= ranks[i].xpRequired) {
                    return ranks[i];
                }
            }
            return ranks[0];
        }
        function getNextRankXp(currentXp) {
            const currentRank = getCurrentRank(currentXp);
            const nextRankIndex = ranks.findIndex(rank => rank.xpRequired > currentXp);
            if (nextRankIndex === -1) return null;
            return ranks[nextRankIndex].xpRequired - currentXp;
        }
        function getContrastYIQ(hexcolor) {
            hexcolor = hexcolor.replace('#', '');
            var r = parseInt(hexcolor.substr(0,2),16);
            var g = parseInt(hexcolor.substr(2,2),16);
            var b = parseInt(hexcolor.substr(4,2),16);
            var yiq = ((r*299)+(g*587)+(b*114))/1000;
            return (yiq >= 128) ? '#222' : '#fff';
        }
        function hexToRgba(hex, alpha) {
            hex = hex.replace('#', '');
            let r = parseInt(hex.substring(0,2), 16);
            let g = parseInt(hex.substring(2,4), 16);
            let b = parseInt(hex.substring(4,6), 16);
            return `rgba(${r},${g},${b},${alpha})`;
        }
        function getRankGlowFilter(baseRank, size = 'normal') {
            if (baseRank === 'Platine') return size === 'big' ? 'drop-shadow(0 0 0px #7ed6dfcc) drop-shadow(0 0 14px #7ed6dfcc) drop-shadow(0 0 24px #7ed6df77)' : 'drop-shadow(0 0 0px #7ed6df88) drop-shadow(0 0 7px #7ed6df88) drop-shadow(0 0 12px #7ed6df44)';
            if (baseRank === 'Or') return size === 'big' ? 'drop-shadow(0 0 0px #e6b800cc) drop-shadow(0 0 14px #e6b800cc) drop-shadow(0 0 24px #e6b80077)' : 'drop-shadow(0 0 0px #e6b80088) drop-shadow(0 0 7px #e6b80088) drop-shadow(0 0 12px #e6b80044)';
            if (baseRank === 'Argent') return size === 'big' ? 'drop-shadow(0 0 0px #bfc1c2cc) drop-shadow(0 0 14px #bfc1c2cc) drop-shadow(0 0 24px #bfc1c277)' : 'drop-shadow(0 0 0px #bfc1c288) drop-shadow(0 0 7px #bfc1c288) drop-shadow(0 0 12px #bfc1c244)';
            if (baseRank === 'Bronze') return size === 'big' ? 'drop-shadow(0 0 0px #cd7f32cc) drop-shadow(0 0 14px #cd7f32cc) drop-shadow(0 0 24px #cd7f3277)' : 'drop-shadow(0 0 0px #cd7f3288) drop-shadow(0 0 7px #cd7f3288) drop-shadow(0 0 12px #cd7f3244)';
            if (baseRank === 'Diamant') return size === 'big' ? 'drop-shadow(0 0 0px #273c75cc) drop-shadow(0 0 14px #273c75cc) drop-shadow(0 0 24px #273c7577)' : 'drop-shadow(0 0 0px #273c7588) drop-shadow(0 0 7px #273c7588) drop-shadow(0 0 12px #273c7544)';
            if (baseRank === 'Maître') return size === 'big' ? 'drop-shadow(0 0 0px #a020f0cc) drop-shadow(0 0 14px #a020f0cc) drop-shadow(0 0 24px #a020f077)' : 'drop-shadow(0 0 0px #a020f088) drop-shadow(0 0 7px #a020f088) drop-shadow(0 0 12px #a020f044)';
            if (baseRank === 'DIEU') return size === 'big' ? 'drop-shadow(0 0 0px #d90429cc) drop-shadow(0 0 14px #d90429cc) drop-shadow(0 0 24px #d9042977)' : 'drop-shadow(0 0 0px #d9042988) drop-shadow(0 0 7px #d9042988) drop-shadow(0 0 12px #d9042944)';
            return size === 'big' ? 'drop-shadow(0 0 0px #e0e0e0cc) drop-shadow(0 0 14px #e0e0e0cc) drop-shadow(0 0 24px #e0e0e077)' : 'drop-shadow(0 0 0px #e0e0e088) drop-shadow(0 0 7px #e0e0e088) drop-shadow(0 0 12px #e0e0e044)';
        }
        function updateUI(userData) {
            // Badge flottant : paramètres globaux pour éviter ReferenceError
            const badgeSize = 92; // taille ajustée (un peu réduite)
            const logoSize = 72;
            const stroke = 6;
            const radius = badgeSize/2 - stroke/2 - 1; // 1px de marge entre logo et cercle
            const normalizedRadius = radius;
            const circumference = 2 * Math.PI * normalizedRadius;
            // Rangs (inchangés)
            // Rangs désactivés (fin de saison)
            const currentRank = seasonEnded ? { name: 'Saison 1 (terminée)' } : getCurrentRank(userData.xp);
            const nextRankXp = seasonEnded ? null : getNextRankXp(userData.xp);
            let progressCircleRank = 0;
            if (!seasonEnded && nextRankXp !== null) {
                progressCircleRank = (userData.xp - currentRank.xpRequired) / (nextRankXp + userData.xp - currentRank.xpRequired);
            }
            const baseRank = seasonEnded ? 'Novice' : getRankBaseName(currentRank.name);
            const rankLogo = rankLogos[baseRank];
            const rankColor = rankColors[baseRank];
            // Niveaux (ajoutés)
            const prestige = Number(userData.prestige || 0);
            const levelInfo = getLevelFromXp(Number(userData.xp || 0));
            const currentLevel = levelInfo.level;
            const nextLevel = levelInfo.nextLevel;
            const xpIntoLevel = levelInfo.xpIntoLevel;
            const xpForNextLevel = levelInfo.xpForNextLevel || 1;
            const progressCircleLevel = Math.max(0, Math.min(1, xpIntoLevel / xpForNextLevel));
            // Afficher la popup prestige si déjà niveau max (au chargement ou sans gain d'XP)
            try {
                const userName = getCurrentUserName();
                if (currentLevel >= levelProgressionConfig.maxLevel && prestige < levelProgressionConfig.maxPrestige && userName && !document.getElementById('prestige-popup')) {
                    // Toujours afficher automatiquement quand niveau 100
                    openPrestigePopupForUser(userName, prestige);
                }
            } catch(e) { /* no-op */ }
            function generateFloatingBadgeContent() {
                const center = badgeSize/2;
                const grad = getPrestigeGradient(prestige);
                const levelFraction = Math.max(0, Math.min(1, (currentLevel-1) / (levelProgressionConfig.maxLevel-1)));
                // Ring plus présent
                const ringStroke = Math.max(8, Math.min(12, stroke + Math.round(levelFraction * 3)));
                const notchCount = Math.min(32, 12 + Math.floor(levelFraction * 20));
                const notchLen = 3 + Math.round(levelFraction * 4);
                const notchRadius = normalizedRadius - ringStroke - 2; // intérieur du cercle
                let notchesHtml = '';
                for (let i = 0; i < notchCount; i++) {
                    const theta = (2*Math.PI * i) / notchCount - Math.PI/2;
                    const sx = center + (notchRadius) * Math.cos(theta);
                    const sy = center + (notchRadius) * Math.sin(theta);
                    const ex = center + (notchRadius + notchLen) * Math.cos(theta);
                    const ey = center + (notchRadius + notchLen) * Math.sin(theta);
                    const op = 0.15 + 0.35 * levelFraction;
                    notchesHtml += `<line x1="${sx.toFixed(2)}" y1="${sy.toFixed(2)}" x2="${ex.toFixed(2)}" y2="${ey.toFixed(2)}" stroke="${grad.start}" stroke-opacity="${op}" stroke-width="1.2"/>`;
                }
                // Sparkle at current progress angle (from top)
                const progressTheta = -Math.PI/2 + 2 * Math.PI * progressCircleLevel;
                const sparkR = normalizedRadius - ringStroke - 6;
                const spx = center + sparkR * Math.cos(progressTheta);
                const spy = center + sparkR * Math.sin(progressTheta);
                let sparkSize = (2.8 + levelFraction*2.0);
                let sparkOpacity = 0.8;
                if (prestige >= 10) { sparkSize += 1.2; sparkOpacity = 0.95; }
                const sparkleHtml = `<circle cx="${spx.toFixed(2)}" cy="${spy.toFixed(2)}" r="${sparkSize.toFixed(2)}" fill="${grad.end}" opacity="${sparkOpacity}"/>`;
                // Prestige polygon (subtle)
                let polyHtml = '';
                const prestigeSides = prestige >= 6 ? 8 : (prestige >= 2 ? 6 : 0);
                if (prestigeSides > 0) {
                    const polyR = normalizedRadius - ringStroke - 1;
                    const pts = [];
                    for (let i = 0; i < prestigeSides; i++) {
                        const a = (2*Math.PI*i/prestigeSides) - Math.PI/2;
                        const px = center + polyR * Math.cos(a);
                        const py = center + polyR * Math.sin(a);
                        pts.push(`${px.toFixed(2)},${py.toFixed(2)}`);
                    }
                    polyHtml = `<polygon points="${pts.join(' ')}" fill="none" stroke="${grad.end}" stroke-opacity="${0.18 + 0.32*levelFraction}" stroke-width="1.2"/>`;
                }
                // Inner halo for high levels
                const innerHalo = currentLevel >= 70 ? `<circle cx="${center}" cy="${center}" r="${(normalizedRadius-ringStroke-6).toFixed(2)}" fill="none" stroke="${grad.end}" stroke-opacity="${0.12 + 0.28*levelFraction}" stroke-width="2"/>` : '';
                // Rotation progressive à partir du niveau 50
                const spinActive = currentLevel >= 50;
                const spinDuration = spinActive ? (16 - ((currentLevel - 50) / 50) * 8) : 0; // 16s -> 8s
                const spinStyle = spinActive ? `animation:spinSlow ${spinDuration.toFixed(2)}s linear infinite;` : '';
                // Regroupe les éléments de l'anneau pour breathing prestige 10 @100
                let ringElementsHtml = `${polyHtml}\n                    ${notchesHtml}\n                    <circle cx="${center}" cy="${center}" r="${normalizedRadius}" stroke="url(#xp-gradient)" stroke-width="${ringStroke}"\n                      fill="none" stroke-dasharray="${circumference}" stroke-dashoffset="${(circumference - progressCircleLevel * circumference).toFixed(2)}"\n                      style="transition:stroke-dashoffset 0.5s;filter: drop-shadow(0 0 ${prestige>=10? '10px':'6px'} ${grad.start});" stroke-linecap="round" filter="url(#ringPulse)"/>\n                    ${sparkleHtml}\n                    ${innerHalo}`;
                if (prestige >= 10 && currentLevel >= 100) {
                    ringElementsHtml = `<g style=\"animation:ringBreath 3s ease-in-out infinite; transform-origin:${center}px ${center}px;\">${ringElementsHtml}</g>`;
                }
                return `
                  <svg width="${badgeSize}" height="${badgeSize}" style="position:absolute;top:0;left:0;z-index:1;overflow:visible;${spinStyle}" viewBox="0 0 ${badgeSize} ${badgeSize}">
                    <defs>
                      <linearGradient id="xp-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="${grad.start}"/>
                        <stop offset="100%" stop-color="${grad.end}"/>
                      </linearGradient>
                      <filter id="ringPulse" x="-50%" y="-50%" width="200%" height="200%" filterUnits="objectBoundingBox">
                        <feGaussianBlur stdDeviation="${(0.6 + levelFraction).toFixed(2)}" result="soft"/>
                        <feMerge>
                          <feMergeNode in="soft"/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                    </defs>
                    ${ringElementsHtml}
                  </svg>
                  <div style="position:relative;z-index:2;color:#ffffff;font-weight:900;font-size:24px;font-family:'Segoe UI',Arial,sans-serif;text-shadow:0 0 8px #000, 0 0 12px ${grad.start};">${currentLevel}</div>
                `;
            }
            let gamificationUI = document.getElementById('gamification-ui');
            const logo = rankLogo;
            const color = rankColor;
            const bgColor = color;
            const textColor = getContrastYIQ(color.replace('#',''));
            if (!gamificationUI) {
                gamificationUI = document.createElement('div');
                gamificationUI.id = 'gamification-ui';
                document.body.appendChild(gamificationUI);
            }
            gamificationUI.style.cssText = `
                position: fixed;
                top: 32px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(34,40,49,0.93);
                color: #f3f6fa;
                padding: 18px 24px 24px 24px;
                border-radius: 18px;
                box-shadow: 0 0 48px 12px ${bgColor}, 0 8px 32px rgba(0,0,0,0.18);
                z-index: 9999;
                min-width: 220px;
                font-family: 'Segoe UI', Arial, sans-serif;
                transition: box-shadow 0.3s, width 0.3s, min-width 0.3s, background 0.5s, color 0.5s;
                display: flex;
                flex-direction: column;
                align-items: center;
                animation: glowing 2s infinite alternate;
                margin-left: 1.8cm;
            `;
            gamificationUI.style.display = 'none';
            let controls = `
                <div style="position:absolute;top:8px;right:8px;display:flex;gap:6px;">
                    <button id="close-btn" title="Fermer" style="background:none;border:none;font-size:2em;cursor:pointer;color:#ff3b3b;">×</button>
                </div>
            `;
            // Variables pour le grand badge de la zone ouverte
            const panelBadgeSize = 160;
            const panelStroke = 10;
            const panelRadius = panelBadgeSize/2 - panelStroke/2 - 6;
            const panelCircumference = 2 * Math.PI * panelRadius;
            const panelGrad = getPrestigeGradient(prestige);
            // SVG riche pour le panneau (même style que le badge flottant)
            const panelCenter = panelBadgeSize/2;
            const panelLevelFraction = Math.max(0, Math.min(1, (currentLevel-1)/(levelProgressionConfig.maxLevel-1)));
            const panelRingStroke = Math.max(10, Math.min(14, panelStroke + Math.round(panelLevelFraction*3)));
            const panelNotchCount = Math.min(36, 12 + Math.floor(panelLevelFraction*24));
            const panelNotchLen = 5 + Math.round(panelLevelFraction*6);
            const panelNotchRadius = panelRadius - panelRingStroke - 2;
            let panelNotchesHtml = '';
            for (let i=0;i<panelNotchCount;i++) {
                const t = (2*Math.PI*i)/panelNotchCount - Math.PI/2;
                const sx = panelCenter + panelNotchRadius * Math.cos(t);
                const sy = panelCenter + panelNotchRadius * Math.sin(t);
                const ex = panelCenter + (panelNotchRadius + panelNotchLen) * Math.cos(t);
                const ey = panelCenter + (panelNotchRadius + panelNotchLen) * Math.sin(t);
                const op = 0.15 + 0.35*panelLevelFraction;
                panelNotchesHtml += `<line x1="${sx.toFixed(2)}" y1="${sy.toFixed(2)}" x2="${ex.toFixed(2)}" y2="${ey.toFixed(2)}" stroke="${panelGrad.start}" stroke-opacity="${op}" stroke-width="1.4"/>`;
            }
            // Sparkle
            const panelProgressTheta = -Math.PI/2 + 2*Math.PI*(progressCircleLevel);
            const panelSparkR = panelRadius - panelRingStroke - 6;
            const panelSpX = panelCenter + panelSparkR * Math.cos(panelProgressTheta);
            const panelSpY = panelCenter + panelSparkR * Math.sin(panelProgressTheta);
            const panelSparkSize = (3 + panelLevelFraction*2.2);
            const panelSparkOpacity = 0.85;
            const panelSparkHtml = `<circle cx="${panelSpX.toFixed(2)}" cy="${panelSpY.toFixed(2)}" r="${panelSparkSize.toFixed(2)}" fill="${panelGrad.end}" opacity="${panelSparkOpacity}"/>`;
            // Poly prestige
            let panelPolyHtml = '';
            const panelSides = prestige>=6?8:(prestige>=2?6:0);
            if (panelSides>0){
                const r = panelRadius - panelRingStroke - 2;
                const pts=[];
                for (let i=0;i<panelSides;i++){
                    const a=(2*Math.PI*i/panelSides)-Math.PI/2;
                    pts.push(`${(panelCenter + r*Math.cos(a)).toFixed(2)},${(panelCenter + r*Math.sin(a)).toFixed(2)}`);
                }
                panelPolyHtml = `<polygon points="${pts.join(' ')}" fill="none" stroke="${panelGrad.end}" stroke-opacity="${0.18+0.32*panelLevelFraction}" stroke-width="1.4"/>`;
            }
            const panelInnerHalo = currentLevel>=70? `<circle cx="${panelCenter}" cy="${panelCenter}" r="${(panelRadius-panelRingStroke-6).toFixed(2)}" fill="none" stroke="${panelGrad.end}" stroke-opacity="0.22" stroke-width="2"/>`:'';
            const panelSpinActive = currentLevel>=50;
            const panelSpinDuration = panelSpinActive ? (16 - ((currentLevel-50)/50)*8) : 0;
            const panelSpinStyle = panelSpinActive ? `animation:spinSlow ${panelSpinDuration.toFixed(2)}s linear infinite;` : '';
            let panelRingGroup = `${panelPolyHtml}${panelNotchesHtml}<circle cx="${panelCenter}" cy="${panelCenter}" r="${panelRadius.toFixed(2)}" stroke="url(#panel-xp-gradient)" stroke-width="${panelRingStroke}" fill="none" stroke-dasharray="${panelCircumference.toFixed(2)}" stroke-dashoffset="${(panelCircumference - progressCircleLevel*panelCircumference).toFixed(2)}" style="transition:stroke-dashoffset 0.5s;" stroke-linecap="round"/>${panelSparkHtml}${panelInnerHalo}`;
            if (prestige>=10 && currentLevel>=100){ panelRingGroup = `<g style=\"animation:ringBreath 3s ease-in-out infinite; transform-origin:${panelCenter}px ${panelCenter}px;\">${panelRingGroup}</g>`; }
            const panelLeftSvg = `
                  <svg width="${panelBadgeSize}" height="${panelBadgeSize}" viewBox="0 0 ${panelBadgeSize} ${panelBadgeSize}" style="position:absolute;inset:0;overflow:visible;${panelSpinStyle}">
                    <defs>
                      <linearGradient id="panel-xp-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="${panelGrad.start}"/>
                        <stop offset="100%" stop-color="${panelGrad.end}"/>
                      </linearGradient>
                    </defs>
                    ${panelRingGroup}
                  </svg>
                  <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:28px;text-shadow:0 0 6px #000,0 0 10px ${panelGrad.start};font-family:'Segoe UI',Arial,sans-serif;">${currentLevel}</div>`;
            let panelContent = `
              <div style="display:flex;gap:18px;align-items:center;justify-content:center;width:100%;">
                <div style="position:relative;width:${panelBadgeSize}px;height:${panelBadgeSize}px;flex:0 0 ${panelBadgeSize}px;">${panelLeftSvg}</div>
                <div style="flex:1;min-width:240px;display:flex;flex-direction:column;gap:10px;align-items:flex-start;">
                  <div style="display:flex;align-items:center;gap:10px;">
                    <div style="font-size:1.2em;font-weight:bold;color:#f3f6fa;">Niveau ${currentLevel}</div>
                    <span style="padding:4px 10px;border-radius:999px;background:${hexToRgba(prestigeColors[prestige]||'#26e0ce',0.15)};color:#fff;border:1px solid ${hexToRgba(prestigeColors[prestige]||'#26e0ce',0.35)};font-weight:600;">Prestige ${prestige}</span>
                        </div>
                  <div style="font-size:0.98em;color:#bfc1c2;">${currentLevel < levelProgressionConfig.maxLevel ? `Reste ${(xpForNextLevel - xpIntoLevel)} XP pour le niveau ${nextLevel}` : 'Niveau maximum atteint'}</div>
                  <div style="width:100%;">
                    <div style="background:#e5e5e5;border-radius:10px;height:12px;overflow:hidden;">
                      <div style="height:100%;width:${Math.round(progressCircleLevel*100)}%;background:linear-gradient(90deg, ${panelGrad.start}, ${panelGrad.end});transition:width 0.5s;"></div>
                    </div>
                  </div>
                  ${seasonEnded ? '' : `<div style="display:flex;align-items:center;gap:10px;margin-top:4px;">
                    <img src="${logo}" alt="Logo Rang" style="width:40px;height:40px;object-fit:contain;border-radius:8px;background:transparent;filter:${getRankGlowFilter(baseRank)};"/>
                    <div style="font-weight:bold;color:#f3f6fa;">${currentRank.name}</div>
                    ${nextRankXp ? `<div style=\"font-size:0.95em;color:#bfc1c2;\">— ${nextRankXp} XP avant ${ranks[ranks.findIndex(r => r.name === currentRank.name)+1]?.name || ''}</div>`:''}
                  </div>`}
                        </div>
                    </div>
                `;
            gamificationUI.innerHTML = controls + panelContent;
            // --- Notification de level up et rank up ---
            const userName = getCurrentUserName();
            // Rank up désactivé (fin de saison)
            // Level (mémo discrèt)
            const storageKeyLevel = `gamif_last_level_${userName}`;
            localStorage.setItem(storageKeyLevel, String(currentLevel));
            document.getElementById('close-btn').onclick = () => {
                gamificationUI.style.display = "none";
                openBtn.style.display = 'flex';
            };
            // Affichage conditionnel du badge flottant selon l'URL (DYNAMIQUE)
            const url = window.location.href;
            const isTicketList = url.includes('model=helpdesk.ticket') && url.includes('view_type=list');
            const isTicketForm = url.includes('model=helpdesk.ticket') && url.includes('view_type=form');
            let openBtn = document.getElementById('open-gamification-btn');
            if (!(isTicketList || isTicketForm)) {
                if (openBtn) openBtn.style.display = 'none';
                gamificationUI.style.display = 'none';
                return;
            }
            if (!openBtn) {
                openBtn = document.createElement('button');
                openBtn.id = 'open-gamification-btn';
                openBtn.innerHTML = generateFloatingBadgeContent();
                openBtn.title = 'Afficher le score';
                openBtn.style.cssText = `
                    position: fixed;
                    top: 0px;
                    left: calc(50% - 160px);
                    transform: translateX(-50%);
                    z-index: 9998;
                    font-size: 2em;
                    background: transparent;
                    border: none;
                    border-radius: 50%;
                    width: ${badgeSize}px;
                    height: ${badgeSize}px;
            display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: none;
                `;
                openBtn.onclick = () => {
                    let gamificationUI = document.getElementById('gamification-ui');
                    if (gamificationUI) gamificationUI.style.display = '';
                    openBtn.style.display = 'none';
                };
                document.body.appendChild(openBtn);
            } else {
                openBtn.innerHTML = generateFloatingBadgeContent();
                openBtn.style.top = '0px';
                openBtn.style.left = 'calc(50% - 160px)';
                openBtn.style.display = 'flex';
            }
        }
        function showRankChangeAnimation(oldRank, newRank, rankLogos, rankColors) {
            let oldNotif = document.getElementById('rank-change-notif');
            if (oldNotif) oldNotif.remove();
            const notif = document.createElement('div');
            notif.id = 'rank-change-notif';
            const baseOld = getRankBaseName(oldRank.name);
            const baseNew = getRankBaseName(newRank.name);
            const bgColor = rankColors[baseNew];
            const textColor = getContrastYIQ(bgColor.replace('#',''));
            const logoOld = rankLogos[baseOld];
            const logoNew = rankLogos[baseNew];
            notif.style.cssText = `
                --glow-color: ${bgColor};
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                z-index: 10001;
                background: rgba(34,40,49,0.93);
                color: #f3f6fa;
                border-radius: 28px;
                box-shadow: 0 0 0 0 ${bgColor}, 0 8px 32px rgba(0,0,0,0.18);
                padding: 56px 80px 48px 80px;
                font-family: 'Segoe UI', Arial, sans-serif;
                text-align: center;
                font-size: 2em;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 32px;
                animation: fadeInNotif 0.3s, glowingNotif 2.2s infinite alternate;
                border: 3px solid ${bgColor};
                transition: background 0.5s, color 0.5s, box-shadow 0.5s;
            `;
            notif.innerHTML = `
                <div style="font-size:1.2em;font-weight:bold;margin-bottom:10px;color:#f3f6fa;text-shadow:0 0 8px #fff,0 0 16px ${bgColor};letter-spacing:1px;">🎉 Félicitations !</div>
                <div style="font-size:1.1em;margin-bottom:18px;color:#f3f6fa;">Passage à un rang supérieur</div>
                <div style="position:relative;width:100%;height:110px;display:flex;align-items:center;justify-content:center;">
                    <div id="old-rank" style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);opacity:1;transition:opacity 0.7s, transform 0.7s cubic-bezier(.4,1.4,.6,1);display:flex;flex-direction:column;align-items:center;gap:2px;">
                        <div style="padding:0;display:flex;align-items:center;justify-content:center;background:transparent;border-radius:0;">
                            <img src="${logoOld}" alt="Logo Rang" style="width:120px;height:120px;object-fit:contain;filter:${getRankGlowFilter(baseOld, 'big')};border-radius:0;background:transparent;"/>
                        </div>
                        <span style="color:#f3f6fa;font-weight:bold;font-size:1.1em;text-shadow:0 0 8px #fff,0 0 16px ${bgColor};">${oldRank.name}</span>
                    </div>
                    <div id="new-rank" style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) translateX(80px) scale(0.5);opacity:0;transition:opacity 0.7s, transform 0.7s cubic-bezier(.4,1.4,.6,1);display:flex;flex-direction:column;align-items:center;gap:2px;">
                        <div style="padding:0;display:flex;align-items:center;justify-content:center;background:transparent;border-radius:0;">
                            <img src="${logoNew}" alt="Logo Rang" style="width:120px;height:120px;object-fit:contain;filter:${getRankGlowFilter(baseNew, 'big')};border-radius:0;background:transparent;"/>
                        </div>
                        <span style="color:#f3f6fa;font-weight:bold;font-size:1.1em;text-shadow:0 0 8px #fff,0 0 16px ${bgColor};">${newRank.name}</span>
                    </div>
                </div>
            `;
            document.body.appendChild(notif);
            setTimeout(() => {
                const oldRankDiv = notif.querySelector('#old-rank');
                const newRankDiv = notif.querySelector('#new-rank');
                oldRankDiv.style.opacity = '0';
                oldRankDiv.style.transform = 'translate(-50%,-50%) translateX(-80px) scale(0.7)';
                setTimeout(() => {
                    newRankDiv.style.opacity = '1';
                    newRankDiv.style.transform = 'translate(-50%,-50%) translateX(0) scale(1.15)';
                    notif.style.boxShadow = `0 0 120px 40px ${bgColor}, 0 8px 32px rgba(0,0,0,0.18)`;
                    setTimeout(() => {
                        newRankDiv.style.transform = 'translate(-50%,-50%) translateX(0) scale(1)';
                        setTimeout(() => {
                            notif.style.opacity = '0';
                            notif.style.transform = 'translate(-50%,-40%) scale(0.95)';
                            setTimeout(() => {
                                notif.remove();
                            }, 400);
                        }, 1400);
                    }, 600);
                }, 700);
            }, 400);
        }
        function addPodiumButton() { /* classement désactivé */ }
        function showClassementMenu() { /* classement désactivé */ }
        function showStatsPopup(mode) {
            // Supprime tout popup existant
            let old = document.getElementById('stats-popup');
            if (old) old.remove();
            let oldBg = document.getElementById('stats-bg');
            if (oldBg) oldBg.remove();
            const bg = document.createElement('div');
            bg.id = 'stats-bg';
            bg.style.cssText = `
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0,0,0,0.35);
                z-index: 9999;
                animation: fadeInBg 0.3s;
            `;
            document.body.appendChild(bg);
            const popup = document.createElement('div');
            popup.id = 'stats-popup';
            popup.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(34,40,49,0.93);
                color: #f3f6fa;
                border-radius: 18px;
                box-shadow: 0 0 32px 8px #26e0ce, 0 8px 32px rgba(0,0,0,0.18);
                z-index: 10000;
                min-width: 700px;
                max-width: 99vw;
                padding: 64px 80px 48px 80px;
                font-family: 'Segoe UI', Arial, sans-serif;
            text-align: center;
                animation: popupIn 0.3s;
                backdrop-filter: blur(6px);
                border: 2px solid #26e0ce44;
            `;
            let title = mode === 'me' ? '📊 Mes statistiques' : '👥 Statistiques des autres utilisateurs';
            popup.innerHTML = `
                <div style="font-size:2.2em;margin-bottom:18px;font-weight:bold;letter-spacing:1px;">${title}</div>
                <div id="stats-content" style="margin-bottom:18px;font-size:1.1em;color:#aaa;">Chargement des stats...</div>
                <button id="close-stats-btn" style="margin-top:22px;padding:9px 28px;border:none;border-radius:8px;background:#4caf50;color:white;font-size:1.1em;cursor:pointer;">Fermer</button>
            `;
            document.body.appendChild(popup);
            document.getElementById('close-stats-btn').onclick = () => {
                popup.remove();
                bg.remove();
            };
            bg.onclick = () => {
                popup.remove();
                bg.remove();
            };
            // --- Affichage des stats ---
            const statsContent = document.getElementById('stats-content');
            if (mode === 'me') {
                // Stats personnelles - refonte
                const userName = getCurrentUserName();
                firebase.database().ref('users/' + encodeURIComponent(userName)).once('value').then(snapshot => {
                    const data = snapshot.val();
                    const xp = data && typeof data.xp === 'number' ? data.xp : 0;
                    const rank = getCurrentRank(xp).name;
                    const logs = data && data.clotures_log ? Object.values(data.clotures_log) : [];
                    let filter = 'jour';
                    let html = `<div style='font-size:1.3em;margin-bottom:12px;'><b style='color:#fff;'>${userName}</b> <span style='font-size:0.95em;font-weight:normal;color:#fff;margin-left:16px;'>— <span style='color:${rankColors[getRankBaseName(rank)]};font-weight:bold;'>${rank}</span> — <span style='color:#26e0ce;font-weight:bold;'>${xp} XP</span></span></div>`;
                    html += `<div style='margin-bottom:18px;'><label for='cloture-filter-me' style='margin-right:8px;'>Filtrer par :</label><select id='cloture-filter-me' style='padding:4px 10px;border-radius:6px;'>` +
                        `<option value='jour'>Jour</option>`+
                        `<option value='semaine'>Semaine</option>`+
                        `<option value='mois'>Mois</option>`+
                        `<option value='annee'>Année</option>`+
                        `<option value='tout'>Tout</option>`+
                        `</select></div>`;
                    html += `<div id='me-summary'></div><div id='me-table'></div>`;
                    statsContent.innerHTML = html;
                    function countTypes(logs) {
                        const types = { normal: 0, important: 0, urgent: 0, bloquant: 0 };
                        logs.forEach(l => { if (types[l.type] !== undefined) types[l.type]++; });
                        return types;
                    }
                    function renderTable(period) {
                        let summary = '';
                        let table = '';
                        if (period === 'jour') {
                            const now = new Date();
                            const today = now.toISOString().slice(0,10);
                            const filtered = logs.filter(l => l.date === today);
                            const types = countTypes(filtered);
                            const total = filtered.length;
                            summary = `<div style='margin-bottom:8px;'><b>Total appels</b> : <span style='color:#4caf50;font-weight:bold;font-size:1.15em;'>${total}</span> | Normal : ${formatStatNumber(types.normal, 'normal')} | Important : ${formatStatNumber(types.important, 'important')} | Urgent : ${formatStatNumber(types.urgent, 'urgent')} | Bloquant : ${formatStatNumber(types.bloquant, 'bloquant')}</div>`;
                            table += `<table style='width:100%;border-collapse:collapse;margin-top:8px;'>`;
                            table += `<thead><tr style='background:#222;'><th style='padding:6px 14px;'>Heure</th><th>Type</th></tr></thead><tbody>`;
                            filtered.sort((a, b) => (b.time||'').localeCompare(a.time||''));
                            filtered.forEach(log => {
                                table += `<tr><td style='padding:6px 14px;'>${log.time || ''}</td><td style='padding:6px 14px;'>${formatTypeLabel(log.type || '')}</td></tr>`;
                            });
                            table += `</tbody></table>`;
                            document.getElementById('me-summary').innerHTML = summary;
                            document.getElementById('me-table').innerHTML = table;
                        } else if (period === 'semaine' || period === 'mois') {
                            let days = [];
                            const now = new Date();
                            if (period === 'semaine') {
                            const weekStart = new Date(now);
                            weekStart.setDate(now.getDate() - now.getDay() + 1); // Lundi
                            for (let i=0; i<7; i++) {
                                const d = new Date(weekStart);
                                d.setDate(weekStart.getDate() + i);
                                    days.push(d.toISOString().slice(0,10));
                                }
                            } else if (period === 'mois') {
                                const ym = now.toISOString().slice(0,7);
                                const daysInMonth = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
                                for (let d=1; d<=daysInMonth; d++) {
                                    days.push(ym + '-' + (d<10?'0':'')+d);
                                }
                            }
                            // Résumé total sur la période
                            const periodLogs = logs.filter(l => days.includes(l.date));
                            const types = countTypes(periodLogs);
                            const total = periodLogs.length;
                            summary = `<div style='margin-bottom:8px;'><b>Total appels</b> : <span style='color:#4caf50;font-weight:bold;font-size:1.15em;'>${total}</span> | Normal : ${formatStatNumber(types.normal, 'normal')} | Important : ${formatStatNumber(types.important, 'important')} | Urgent : ${formatStatNumber(types.urgent, 'urgent')} | Bloquant : ${formatStatNumber(types.bloquant, 'bloquant')}</div>`;
                            table += `<table style='width:100%;border-collapse:collapse;margin-top:8px;'>`;
                            table += `<thead><tr style='background:#222;'><th style='padding:6px 14px;'>Date</th><th>Total</th><th>Normal</th><th>Important</th><th>Urgent</th><th>Bloquant</th><th></th></tr></thead><tbody>`;
                            days.forEach((date, dIdx) => {
                                const dayLogs = logs.filter(l => l.date === date);
                                const types = countTypes(dayLogs);
                                const total = dayLogs.length;
                                const dayName = new Date(date).toLocaleDateString('fr-FR', { weekday: 'long' });
                                table += `<tr style='background:${dIdx%2?'#23272f':'#1a1d22'};'>`+
                                    `<td style='padding:6px 14px;'>${dayName} ${date}</td>`+
                                    `<td style='font-weight:bold;color:#4caf50;'>${total}</td>`+
                                    `<td>${formatStatNumber(types.normal, 'normal')}</td>`+
                                    `<td>${formatStatNumber(types.important, 'important')}</td>`+
                                    `<td>${formatStatNumber(types.urgent, 'urgent')}</td>`+
                                    `<td>${formatStatNumber(types.bloquant, 'bloquant')}</td>`+
                                    `<td><button class='show-day-detail-me-btn' data-date='${date}' style='background:none;border:none;color:#26e0ce;cursor:pointer;font-size:1.1em;'>▼</button></td>`+
                                `</tr>`;
                                table += `<tr id='me-detail-${date}' style='display:none;background:#23272f;'><td colspan='7'></td></tr>`;
                            });
                            table += `</tbody></table>`;
                            document.getElementById('me-summary').innerHTML = summary;
                            document.getElementById('me-table').innerHTML = table;
                        } else if (period === 'annee') {
                            const now = new Date();
                            const year = now.getFullYear();
                            let months = [];
                            for (let m=1; m<=12; m++) {
                                const month = year + '-' + (m<10?'0':'')+m;
                                months.push(month);
                            }
                            // Résumé total sur l'année
                            const periodLogs = logs.filter(l => l.date && l.date.startsWith(year.toString()));
                            const types = countTypes(periodLogs);
                            const total = periodLogs.length;
                            summary = `<div style='margin-bottom:8px;'><b>Total appels</b> : <span style='color:#4caf50;font-weight:bold;font-size:1.15em;'>${total}</span> | Normal : ${formatStatNumber(types.normal, 'normal')} | Important : ${formatStatNumber(types.important, 'important')} | Urgent : ${formatStatNumber(types.urgent, 'urgent')} | Bloquant : ${formatStatNumber(types.bloquant, 'bloquant')}</div>`;
                            table += `<table style='width:100%;border-collapse:collapse;margin-top:8px;'>`;
                            table += `<thead><tr style='background:#222;'><th style='padding:6px 14px;'>Mois</th><th>Total</th><th>Normal</th><th>Important</th><th>Urgent</th><th>Bloquant</th><th></th></tr></thead><tbody>`;
                            months.forEach((month, mIdx) => {
                                const monthLogs = logs.filter(l => l.date && l.date.startsWith(month));
                                const types = countTypes(monthLogs);
                                const total = monthLogs.length;
                                const monthName = new Date(month + '-01').toLocaleDateString('fr-FR', { month: 'long' });
                                table += `<tr style='background:${mIdx%2?'#23272f':'#1a1d22'};'>`+
                                    `<td style='padding:6px 14px;'>${monthName} ${month}</td>`+
                                    `<td style='font-weight:bold;color:#4caf50;'>${total}</td>`+
                                    `<td>${formatStatNumber(types.normal, 'normal')}</td>`+
                                    `<td>${formatStatNumber(types.important, 'important')}</td>`+
                                    `<td>${formatStatNumber(types.urgent, 'urgent')}</td>`+
                                    `<td>${formatStatNumber(types.bloquant, 'bloquant')}</td>`+
                                    `<td><button class='show-month-detail-me-btn' data-month='${month}' style='background:none;border:none;color:#26e0ce;cursor:pointer;font-size:1.1em;'>▼</button></td>`+
                                `</tr>`;
                                table += `<tr id='me-detail-${month}' style='display:none;background:#23272f;'><td colspan='7'></td></tr>`;
                            });
                            table += `</tbody></table>`;
                            document.getElementById('me-summary').innerHTML = summary;
                            document.getElementById('me-table').innerHTML = table;
            } else {
                            const types = countTypes(logs);
                            const total = logs.length;
                            summary = `<div style='margin-bottom:8px;'><b>Total appels</b> : <span style='color:#4caf50;font-weight:bold;font-size:1.15em;'>${total}</span> | Normal : ${formatStatNumber(types.normal, 'normal')} | Important : ${formatStatNumber(types.important, 'important')} | Urgent : ${formatStatNumber(types.urgent, 'urgent')} | Bloquant : ${formatStatNumber(types.bloquant, 'bloquant')}</div>`;
                            table += `<table style='width:100%;border-collapse:collapse;margin-top:8px;'>`;
                            table += `<thead><tr style='background:#222;'><th style='padding:6px 14px;'>Date</th><th>Heure</th><th>Type</th></tr></thead><tbody>`;
                            logs.sort((a, b) => (b.date + (b.time||'')).localeCompare(a.date + (a.time||'')));
                            logs.forEach(log => {
                                table += `<tr><td style='padding:6px 14px;'>${log.date || ''}</td><td style='padding:6px 14px;'>${log.time || ''}</td><td style='padding:6px 14px;'>${formatTypeLabel(log.type || '')}</td></tr>`;
                            });
                            table += `</tbody></table>`;
                            document.getElementById('me-summary').innerHTML = summary;
                            document.getElementById('me-table').innerHTML = table;
                        }
                        // Listeners pour dérouler les détails jour/mois
                        document.querySelectorAll('.show-day-detail-me-btn').forEach(btn => {
                            btn.onclick = function() {
                                const date = this.getAttribute('data-date');
                                const detailRow = document.getElementById('me-detail-' + date);
                                if (!detailRow) return;
                                if (detailRow.style.display === 'none') {
                                    // Affiche le détail
                                    const dayLogs = logs.filter(l => l.date === date);
                                    let detailHtml = `<table style='width:100%;border-collapse:collapse;'><thead><tr style='background:#23272f;'><th style='padding:6px 14px;'>Heure</th><th>Type</th></tr></thead><tbody>`;
                                    dayLogs.sort((a, b) => (b.time||'').localeCompare(a.time||''));
                                    dayLogs.forEach(log => {
                                        detailHtml += `<tr><td style='padding:6px 14px;'>${log.time || ''}</td><td style='padding:6px 14px;'>${formatTypeLabel(log.type || '')}</td></tr>`;
                                    });
                                    detailHtml += `</tbody></table>`;
                                    detailRow.children[0].innerHTML = detailHtml;
                                    detailRow.style.display = '';
            } else {
                                    detailRow.style.display = 'none';
                                }
                            };
                        });
                        document.querySelectorAll('.show-month-detail-me-btn').forEach(btn => {
                            btn.onclick = function() {
                                const month = this.getAttribute('data-month');
                                const detailRow = document.getElementById('me-detail-' + month);
                                if (!detailRow) return;
                                if (detailRow.style.display === 'none') {
                                    // Affiche le détail
                                    const monthLogs = logs.filter(l => l.date && l.date.startsWith(month));
                                    let detailHtml = `<table style='width:100%;border-collapse:collapse;'><thead><tr style='background:#23272f;'><th style='padding:6px 14px;'>Date</th><th>Heure</th><th>Type</th></tr></thead><tbody>`;
                                    monthLogs.sort((a, b) => (b.date + (b.time||'')).localeCompare(a.date + (a.time||'')));
                                    monthLogs.forEach(log => {
                                        detailHtml += `<tr><td style='padding:6px 14px;'>${log.date || ''}</td><td style='padding:6px 14px;'>${log.time || ''}</td><td style='padding:6px 14px;'>${formatTypeLabel(log.type || '')}</td></tr>`;
                                    });
                                    detailHtml += `</tbody></table>`;
                                    detailRow.children[0].innerHTML = detailHtml;
                                    detailRow.style.display = '';
                                } else {
                                    detailRow.style.display = 'none';
                                }
                            };
                        });
                    }
                    renderTable(filter);
                    document.getElementById('cloture-filter-me').onchange = function() {
                        renderTable(this.value);
                    };
                }).catch(err => {
                    statsContent.innerHTML = 'Erreur lors du chargement de vos stats.';
                });
            } else {
                // Stats des autres utilisateurs - refonte
                firebase.database().ref('users').once('value').then(snapshot => {
                    const users = snapshot.val() || {};
                    const currentUser = getCurrentUserName();
                    // Prépare la liste des utilisateurs (hors soi-même)
                    const userList = Object.entries(users)
                        .filter(([name, data]) => decodeURIComponent(name) !== currentUser)
                        .map(([name, data]) => ({ name: decodeURIComponent(name), data }));
                    // Filtre global
                    let filter = 'jour';
                    // Génère le sélecteur global
                    let filterHtml = `<div style='margin-bottom:18px;'><label for='cloture-filter-global' style='margin-right:8px;'>Filtrer par :</label><select id='cloture-filter-global' style='padding:4px 10px;border-radius:6px;'>` +
                        `<option value='jour'>Jour</option>`+
                        `<option value='semaine'>Semaine</option>`+
                        `<option value='mois'>Mois</option>`+
                        `<option value='annee'>Année</option>`+
                        `<option value='tout'>Tout</option>`+
                        `</select></div>`;
                    // Conteneur scrollable
                    let html = filterHtml + `<div id='users-stats-list' style='max-height:420px;overflow-y:auto;text-align:left;'>`;
                    userList.forEach(({ name, data }, idx) => {
                        const logs = data && data.clotures_log ? Object.values(data.clotures_log) : [];
                        // Ajout du rang et de l'XP
                        const xp = data && typeof data.xp === 'number' ? data.xp : 0;
                        const rank = getCurrentRank(xp).name;
                        const baseRank = getRankBaseName(rank);
                        const rankColor = rankColors[baseRank] || '#fff';
                        html += `<div class='user-stats-block' style='margin-bottom:32px;padding:18px 18px 12px 18px;background:#23272f;border-radius:16px;box-shadow:0 0 16px 2px #fff3;position:relative;transition:box-shadow 0.3s;'>`;
                        html += `<div style='font-size:1.18em;font-weight:bold;margin-bottom:8px;color:#fff;display:flex;align-items:center;cursor:pointer;text-shadow:0 0 8px #fff8;' class='user-toggle' data-idx='${idx}'>`;
                        html += `<span style='margin-right:8px;transition:transform 0.2s;' id='arrow-${idx}'>▼</span><span style='color:#fff;font-weight:bold;'>${name}</span> <span style='font-size:0.95em;font-weight:normal;color:#fff;margin-left:16px;'>— <span style='color:${rankColor};font-weight:bold;'>${rank}</span> — <span style='color:#26e0ce;font-weight:bold;'>${xp} XP</span></span>`;
                        html += `</div>`;
                        html += `<div id='user-summary-${idx}'></div>`;
                        html += `<div id='user-table-${idx}' style='display:none;'></div>`;
                        html += `</div>`;
                    });
                    html += `</div>`;
                    statsContent.innerHTML = html;
                    // Fonction de filtrage et rendu
                    function filterLogs(logs, period) {
                            const now = new Date();
                            if (period === 'jour') {
                                const today = now.toISOString().slice(0,10);
                            return logs.filter(l => l.date === today);
                            } else if (period === 'semaine') {
                                const weekStart = new Date(now);
                            weekStart.setDate(now.getDate() - now.getDay() + 1); // Lundi
                            const weekDates = [];
                            for (let i=0; i<7; i++) {
                                const d = new Date(weekStart);
                                d.setDate(weekStart.getDate() + i);
                                weekDates.push(d.toISOString().slice(0,10));
                            }
                            return logs.filter(l => weekDates.includes(l.date));
                            } else if (period === 'mois') {
                                const ym = now.toISOString().slice(0,7);
                            return logs.filter(l => l.date && l.date.startsWith(ym));
                            } else if (period === 'annee') {
                                const y = now.getFullYear().toString();
                            return logs.filter(l => l.date && l.date.startsWith(y));
                        }
                        return logs;
                    }
                    function countTypes(logs) {
                        const types = { normal: 0, important: 0, urgent: 0, bloquant: 0 };
                        logs.forEach(l => { if (types[l.type] !== undefined) types[l.type]++; });
                        return types;
                    }
                    function renderAllTables(period) {
                        userList.forEach(({ name, data }, idx) => {
                            const logs = data && data.clotures_log ? Object.values(data.clotures_log) : [];
                            let summary = '';
                            let table = '';
                            if (period === 'jour') {
                                // JOUR : résumé + détail déroulable
                                const filtered = filterLogs(logs, period);
                                const types = countTypes(filtered);
                                const total = filtered.length;
                                summary = `<div style='margin-bottom:8px;'><b>Total appels</b> : <span style='color:#4caf50;font-weight:bold;font-size:1.15em;'>${total}</span> | Normal : ${formatStatNumber(types.normal, 'normal')} | Important : ${formatStatNumber(types.important, 'important')} | Urgent : ${formatStatNumber(types.urgent, 'urgent')} | Bloquant : ${formatStatNumber(types.bloquant, 'bloquant')}</div>`;
                                table += `<table style='width:100%;border-collapse:collapse;margin-top:8px;'>`;
                                table += `<thead><tr style='background:#222;'><th style='padding:6px 14px;'>Heure</th><th>Type</th></tr></thead><tbody>`;
                                filtered.sort((a, b) => (b.time||'').localeCompare(a.time||''));
                                filtered.forEach(log => {
                                    table += `<tr><td style='padding:6px 14px;'>${log.time || ''}</td><td style='padding:6px 14px;'>${formatTypeLabel(log.type || '')}</td></tr>`;
                                });
                                table += `</tbody></table>`;
                                document.getElementById('user-summary-' + idx).innerHTML = summary;
                                document.getElementById('user-table-' + idx).innerHTML = table;
                            } else if (period === 'semaine' || period === 'mois') {
                                // SEMAINE/MOIS : tableau synthétique par jour
                                let days = [];
                                const now = new Date();
                                if (period === 'semaine') {
                                    const weekStart = new Date(now);
                                    weekStart.setDate(now.getDate() - now.getDay() + 1); // Lundi
                                    for (let i=0; i<7; i++) {
                                        const d = new Date(weekStart);
                                        d.setDate(weekStart.getDate() + i);
                                        days.push(d.toISOString().slice(0,10));
                                    }
                                } else if (period === 'mois') {
                                    const ym = now.toISOString().slice(0,7);
                                    const daysInMonth = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
                                    for (let d=1; d<=daysInMonth; d++) {
                                        days.push(ym + '-' + (d<10?'0':'')+d);
                                    }
                                }
                                // Résumé total sur la période
                                const periodLogs = logs.filter(l => days.includes(l.date));
                                const types = countTypes(periodLogs);
                                const total = periodLogs.length;
                                summary = `<div style='margin-bottom:8px;'><b>Total appels</b> : <span style='color:#4caf50;font-weight:bold;font-size:1.15em;'>${total}</span> | Normal : ${formatStatNumber(types.normal, 'normal')} | Important : ${formatStatNumber(types.important, 'important')} | Urgent : ${formatStatNumber(types.urgent, 'urgent')} | Bloquant : ${formatStatNumber(types.bloquant, 'bloquant')}</div>`;
                                table += `<table style='width:100%;border-collapse:collapse;margin-top:8px;'>`;
                                table += `<thead><tr style='background:#222;'><th style='padding:6px 14px;'>Date</th><th>Total</th><th>Normal</th><th>Important</th><th>Urgent</th><th>Bloquant</th><th></th></tr></thead><tbody>`;
                                days.forEach((date, dIdx) => {
                                    const dayLogs = logs.filter(l => l.date === date);
                                    const types = countTypes(dayLogs);
                                    const total = dayLogs.length;
                                    const dayName = new Date(date).toLocaleDateString('fr-FR', { weekday: 'long' });
                                    table += `<tr style='background:${dIdx%2?'#23272f':'#1a1d22'};'>`+
                                        `<td style='padding:6px 14px;'>${dayName} ${date}</td>`+
                                        `<td style='font-weight:bold;color:#4caf50;'>${total}</td>`+
                                        `<td>${formatStatNumber(types.normal, 'normal')}</td>`+
                                        `<td>${formatStatNumber(types.important, 'important')}</td>`+
                                        `<td>${formatStatNumber(types.urgent, 'urgent')}</td>`+
                                        `<td>${formatStatNumber(types.bloquant, 'bloquant')}</td>`+
                                        `<td><button class='show-day-detail-btn' data-idx='${idx}' data-date='${date}' style='background:none;border:none;color:#26e0ce;cursor:pointer;font-size:1.1em;'>▼</button></td>`+
                                    `</tr>`;
                                    table += `<tr id='detail-${idx}-${date}' style='display:none;background:#23272f;'><td colspan='7'></td></tr>`;
                                });
                                table += `</tbody></table>`;
                                document.getElementById('user-summary-' + idx).innerHTML = summary;
                                document.getElementById('user-table-' + idx).innerHTML = table;
                            } else if (period === 'annee') {
                                // ANNEE : tableau synthétique par mois
                                const now = new Date();
                                const year = now.getFullYear();
                                let months = [];
                                for (let m=1; m<=12; m++) {
                                    const month = year + '-' + (m<10?'0':'')+m;
                                    months.push(month);
                                }
                                // Résumé total sur l'année
                                const periodLogs = logs.filter(l => l.date && l.date.startsWith(year.toString()));
                                const types = countTypes(periodLogs);
                                const total = periodLogs.length;
                                summary = `<div style='margin-bottom:8px;'><b>Total appels</b> : <span style='color:#4caf50;font-weight:bold;font-size:1.15em;'>${total}</span> | Normal : ${formatStatNumber(types.normal, 'normal')} | Important : ${formatStatNumber(types.important, 'important')} | Urgent : ${formatStatNumber(types.urgent, 'urgent')} | Bloquant : ${formatStatNumber(types.bloquant, 'bloquant')}</div>`;
                                table += `<table style='width:100%;border-collapse:collapse;margin-top:8px;'>`;
                                table += `<thead><tr style='background:#222;'><th style='padding:6px 14px;'>Mois</th><th>Total</th><th>Normal</th><th>Important</th><th>Urgent</th><th>Bloquant</th><th></th></tr></thead><tbody>`;
                                months.forEach((month, mIdx) => {
                                    const monthLogs = logs.filter(l => l.date && l.date.startsWith(month));
                                    const types = countTypes(monthLogs);
                                    const total = monthLogs.length;
                                    const monthName = new Date(month + '-01').toLocaleDateString('fr-FR', { month: 'long' });
                                    table += `<tr style='background:${mIdx%2?'#23272f':'#1a1d22'};'>`+
                                        `<td style='padding:6px 14px;'>${monthName} ${month}</td>`+
                                        `<td style='font-weight:bold;color:#4caf50;'>${total}</td>`+
                                        `<td>${formatStatNumber(types.normal, 'normal')}</td>`+
                                        `<td>${formatStatNumber(types.important, 'important')}</td>`+
                                        `<td>${formatStatNumber(types.urgent, 'urgent')}</td>`+
                                        `<td>${formatStatNumber(types.bloquant, 'bloquant')}</td>`+
                                        `<td><button class='show-month-detail-btn' data-idx='${idx}' data-month='${month}' style='background:none;border:none;color:#26e0ce;cursor:pointer;font-size:1.1em;'>▼</button></td>`+
                                    `</tr>`;
                                    table += `<tr id='detail-${idx}-${month}' style='display:none;background:#23272f;'><td colspan='7'></td></tr>`;
                                });
                                table += `</tbody></table>`;
                                document.getElementById('user-summary-' + idx).innerHTML = summary;
                                document.getElementById('user-table-' + idx).innerHTML = table;
                            } else {
                                // TOUT : résumé global + détail complet
                                const filtered = filterLogs(logs, period);
                                const types = countTypes(filtered);
                                const total = filtered.length;
                                summary = `<div style='margin-bottom:8px;'><b>Total appels</b> : <span style='color:#4caf50;font-weight:bold;font-size:1.15em;'>${total}</span> | Normal : ${formatStatNumber(types.normal, 'normal')} | Important : ${formatStatNumber(types.important, 'important')} | Urgent : ${formatStatNumber(types.urgent, 'urgent')} | Bloquant : ${formatStatNumber(types.bloquant, 'bloquant')}</div>`;
                                table += `<table style='width:100%;border-collapse:collapse;margin-top:8px;'>`;
                                table += `<thead><tr style='background:#222;'><th style='padding:6px 14px;'>Date</th><th>Type</th></tr></thead><tbody>`;
                                filtered.sort((a, b) => (b.date + (b.time||'')).localeCompare(a.date + (a.time||''))).forEach(log => {
                                    table += `<tr><td style='padding:6px 14px;'>${log.date || ''} ${log.time || ''}</td><td style='padding:6px 14px;'>${formatTypeLabel(log.type || '')}</td></tr>`;
                                });
                                table += `</tbody></table>`;
                                document.getElementById('user-summary-' + idx).innerHTML = summary;
                                document.getElementById('user-table-' + idx).innerHTML = table;
                            }
                        });
                        // Listeners pour dérouler les détails jour/mois
                        document.querySelectorAll('.show-day-detail-btn').forEach(btn => {
                            btn.onclick = function() {
                                const idx = this.getAttribute('data-idx');
                                const date = this.getAttribute('data-date');
                                const detailRow = document.getElementById('detail-' + idx + '-' + date);
                                if (!detailRow) return;
                                if (detailRow.style.display === 'none') {
                                    // Affiche le détail
                                    const user = userList[idx];
                                    const logs = user.data && user.data.clotures_log ? Object.values(user.data.clotures_log) : [];
                                    const dayLogs = logs.filter(l => l.date === date);
                                    let detailHtml = `<table style='width:100%;border-collapse:collapse;'><thead><tr style='background:#23272f;'><th style='padding:6px 14px;'>Heure</th><th>Type</th></tr></thead><tbody>`;
                                    dayLogs.sort((a, b) => (b.time||'').localeCompare(a.time||''));
                                    dayLogs.forEach(log => {
                                        detailHtml += `<tr><td style='padding:6px 14px;'>${log.time || ''}</td><td style='padding:6px 14px;'>${formatTypeLabel(log.type || '')}</td></tr>`;
                                    });
                                    detailHtml += `</tbody></table>`;
                                    detailRow.children[0].innerHTML = detailHtml;
                                    detailRow.style.display = '';
            } else {
                                    detailRow.style.display = 'none';
                                }
                            };
                        });
                        document.querySelectorAll('.show-month-detail-btn').forEach(btn => {
                            btn.onclick = function() {
                                const idx = this.getAttribute('data-idx');
                                const month = this.getAttribute('data-month');
                                const detailRow = document.getElementById('detail-' + idx + '-' + month);
                                if (!detailRow) return;
                                if (detailRow.style.display === 'none') {
                                    // Affiche le détail
                                    const user = userList[idx];
                                    const logs = user.data && user.data.clotures_log ? Object.values(user.data.clotures_log) : [];
                                    const monthLogs = logs.filter(l => l.date && l.date.startsWith(month));
                                    let detailHtml = `<table style='width:100%;border-collapse:collapse;'><thead><tr style='background:#23272f;'><th style='padding:6px 14px;'>Date</th><th>Heure</th><th>Type</th></tr></thead><tbody>`;
                                    monthLogs.sort((a, b) => (b.date + (b.time||'')).localeCompare(a.date + (a.time||'')));
                                    monthLogs.forEach(log => {
                                        detailHtml += `<tr><td style='padding:6px 14px;'>${log.date || ''}</td><td style='padding:6px 14px;'>${log.time || ''}</td><td style='padding:6px 14px;'>${formatTypeLabel(log.type || '')}</td></tr>`;
                                    });
                                    detailHtml += `</tbody></table>`;
                                    detailRow.children[0].innerHTML = detailHtml;
                                    detailRow.style.display = '';
            } else {
                                    detailRow.style.display = 'none';
                                }
                            };
                        });
                    }
                    // Premier rendu
                    renderAllTables(filter);
                    // Listener sur le filtre global
                    document.getElementById('cloture-filter-global').onchange = function() {
                        filter = this.value;
                        renderAllTables(filter);
                    };
                    // Listener pour le toggle (flèche)
                    document.querySelectorAll('.user-toggle').forEach(el => {
                        el.onclick = function() {
                            const idx = this.getAttribute('data-idx');
                            const table = document.getElementById('user-table-' + idx);
                            const arrow = document.getElementById('arrow-' + idx);
                            if (table.style.display === 'none') {
                                table.style.display = '';
                                arrow.style.transform = 'rotate(180deg)';
                } else {
                                table.style.display = 'none';
                                arrow.style.transform = '';
                            }
                        };
                    });
                }).catch(err => {
                    statsContent.innerHTML = 'Erreur lors du chargement des stats.';
                });
            }
        }
        function showPodiumPopup() {
            let old = document.getElementById('podium-popup');
            if (old) old.remove();
            let oldBg = document.getElementById('podium-bg');
            if (oldBg) oldBg.remove();
            const bg = document.createElement('div');
            bg.id = 'podium-bg';
            bg.style.cssText = `
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0,0,0,0.35);
                z-index: 9999;
                animation: fadeInBg 0.3s;
            `;
            document.body.appendChild(bg);
            const popup = document.createElement('div');
            popup.id = 'podium-popup';
            // Fond unique pour tous les thèmes
            popup.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(34,40,49,0.93);
                color: #f3f6fa;
                border-radius: 18px;
                box-shadow: 0 0 32px 8px #26e0ce, 0 8px 32px rgba(0,0,0,0.18);
                z-index: 10000;
                min-width: 700px;
                max-width: 99vw;
                padding: 64px 80px 48px 80px;
                font-family: 'Segoe UI', Arial, sans-serif;
                text-align: center;
                animation: popupIn 0.3s;
                backdrop-filter: blur(6px);
                border: 2px solid #26e0ce44;
            `;
            popup.innerHTML = `
                <div style="font-size:2.2em;margin-bottom:18px;font-weight:bold;letter-spacing:1px;">🏆 Classement général</div>
                <div id="leaderboard-loading" style="font-size:1.1em;color:#888;margin-bottom:18px;">Chargement du classement...</div>
                <div id="leaderboard-content"></div>
                <button id="close-podium-btn" style="margin-top:22px;padding:9px 28px;border:none;border-radius:8px;background:#4caf50;color:white;font-size:1.1em;cursor:pointer;">Fermer</button>
            `;
            document.body.appendChild(popup);
            document.getElementById('close-podium-btn').onclick = () => {
                popup.remove();
                bg.remove();
            };
            bg.onclick = () => {
                popup.remove();
                bg.remove();
            };
            // Récupère le classement en temps réel depuis Firebase
            firebase.database().ref('users').once('value').then(snapshot => {
                const users = snapshot.val() || {};
                // Transforme en tableau [{name, xp}]
                const leaderboard = Object.entries(users).map(([name, data]) => ({
                    name: decodeURIComponent(name),
                    xp: Number(data.xp || 0),
                    prestige: Number(data.prestige || 0),
                    levelInfo: getLevelFromXp(Number(data.xp || 0))
                })).sort((a, b) => b.xp - a.xp);
                // Récupère les ornements sélectionnés pour chaque utilisateur
                const userOrnaments = {};
                const ornamentPromises = Object.entries(users).map(([name, data]) => {
                  return firebase.database().ref('users/' + name).once('value').then(snap => {
                    const u = snap.val() || {};
                    userOrnaments[decodeURIComponent(name)] = u.selectedOrnament || null;
                  });
                });
                Promise.all(ornamentPromises).then(() => {
                const leaderboardHtml = `
                    <div id='leaderboard-scrollbox' style="max-height:400px;overflow-y:auto;position:relative;scrollbar-width:none;-ms-overflow-style:none;">
                      <ol style="padding-left:0;list-style:none;margin:0;">
                        ${leaderboard.map((user, i) => {
                          let medal = '';
                          if (i === 0) medal = '<span style=\'font-size:2.1em;vertical-align:middle;display:inline-block;margin-right:8px;\'>🥇</span>';
                          else if (i === 1) medal = '<span style=\'font-size:2.1em;vertical-align:middle;display:inline-block;margin-right:8px;\'>🥈</span>';
                          else if (i === 2) medal = '<span style=\'font-size:2.1em;vertical-align:middle;display:inline-block;margin-right:8px;\'>🥉</span>';
                          let drop = '';
                          if (i === 0) drop = 'drop-shadow(0 0 0px #26e0ce88) drop-shadow(0 0 7px #26e0ce88) drop-shadow(0 0 12px #26e0ce44)';
                          else if (i === 1) drop = 'drop-shadow(0 0 0px #ffd70088) drop-shadow(0 0 6px #ffd70088) drop-shadow(0 0 10px #ffd70044)';
                          else if (i === 2) drop = 'drop-shadow(0 0 0px #b08d5788) drop-shadow(0 0 5px #b08d5788) drop-shadow(0 0 8px #b08d5744)';
                          else drop = 'drop-shadow(0 0 3px #8883)';
                          const rankColor = prestigeColors[user.prestige] || '#fff';
                          // Ornement
                          const ornId = userOrnaments[user.name];
                          let ornamentHtml = '';
                          if (ornId === 'dieu_flamme') {
                            ornamentHtml = `<span style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);pointer-events:none;z-index:1;">
                              <img src='https://i.imgur.com/ZdQCAkg.png' alt='Flammes' style='width:110px;height:110px;object-fit:contain;pointer-events:none;'/>
                            </span>`;
                          }
                          // Photo de profil + ornement
                          const profileHtml = `<span style="position:relative;display:inline-block;width:90px;height:90px;">${ornamentHtml}<img src=\"${prestigeLogos[user.prestige] || prestigeLogos[0]}\" alt=\"Prestige ${user.prestige}\" style=\"width:90px;height:90px;vertical-align:middle;object-fit:contain;border-radius:20px;background:transparent;filter:${drop};margin-right:8px;position:relative;z-index:2;\"/></span>`;
                          // Effet flammes sur le nom
                          let nameHtml = `<span style=\"font-weight:bold;color:#e0e0e0;font-size:1.05em;min-width:160px;display:inline-block;\">${user.name}</span>`;
                          if (ornId === 'dieu_flamme') {
                            nameHtml = `<span class='flame-name' style="font-weight:bold;color:#fff;font-size:1.08em;min-width:120px;display:inline-block;position:relative;background:linear-gradient(90deg,#ff9800,#ffd700,#fff,#ffd700,#ff9800);background-size:200% 100%;background-clip:text;-webkit-background-clip:text;color:transparent;-webkit-text-fill-color:transparent;animation:flameTextAnim 2s linear infinite alternate;text-shadow:0 0 8px #ff9800,0 0 18px #ffd700;">${user.name}<span class='flame-anim' style='position:absolute;left:0;right:0;top:-18px;height:18px;pointer-events:none;z-index:2;'></span></span>`;
                          }
                          return `<li style=\"display:flex;align-items:center;gap:18px;justify-content:left;margin:18px 0 18px 0;font-size:1.1em;\">
                            ${profileHtml}
                            ${medal}
                            ${nameHtml}
                             <span style=\"color:${rankColor};font-weight:bold;font-size:1.12em;margin-left:12px;min-width:140px;display:inline-block;\">Prestige ${user.prestige} — Nv ${user.levelInfo.level}</span>
                            <span style=\"color:#26e0ce;font-size:1.12em;font-weight:bold;margin-left:12px;\">${user.xp} XP</span>
                            </li>`;
                        }).join('')}
                    </ol>
                  </div>
                    <style>
                    @keyframes flameTextAnim {
                      0% { background-position:0% 50%; }
                      100% { background-position:100% 50%; }
                    }
                    </style>`;
                  const loadingElem = document.getElementById('leaderboard-loading');
                  if (loadingElem) loadingElem.style.display = 'none';
                  const leaderboardContent = document.getElementById('leaderboard-content');
                  if (leaderboardContent) {
                    leaderboardContent.innerHTML = leaderboardHtml;
                  }
                });
            }).catch(err => {
                const loadingElem = document.getElementById('leaderboard-loading');
                if (loadingElem) loadingElem.textContent = 'Erreur lors du chargement du classement.';
                console.error('[Gamification] Erreur lors du chargement du classement:', err);
            });
            // Ajout du JS pour le scroll par flèches
            setTimeout(() => {
              const scrollbox = document.getElementById('leaderboard-scrollbox');
              const up = document.getElementById('leaderboard-arrow-up');
              const down = document.getElementById('leaderboard-arrow-down');
              if (scrollbox && up && down) {
                up.onclick = () => { scrollbox.scrollBy({ top: -120, behavior: 'smooth' }); };
                down.onclick = () => { scrollbox.scrollBy({ top: 120, behavior: 'smooth' }); };
              }
            }, 100);
        }
        function getCurrentUserName() {
            // Cherche dans la systray tous les spans visibles
            const systray = document.querySelector('.o_menu_systray, .o_user_menu, .o_user_menu_name, .oe_topbar_name');
            if (systray) {
                // Prend le texte le plus long (souvent le nom complet)
                const spans = systray.querySelectorAll('span');
                let best = '';
                spans.forEach(s => {
                    const txt = s.textContent.trim();
                    if (txt.length > best.length) best = txt;
                });
                if (best.length > 0) return best;
            }
            // Fallback : cherche dans toute la barre du haut
            const allSpans = document.querySelectorAll('span');
            let best = '';
            allSpans.forEach(s => {
                const txt = s.textContent.trim();
                if (txt.length > best.length) best = txt;
            });
            if (best.length > 0) return best;
            return 'Utilisateur inconnu';
        }
        function awardXPToUser(userName, amount, typeCloture = 'normal', duree = 0) {
            const userRef = firebase.database().ref('users/' + encodeURIComponent(userName));
            userRef.once('value').then(snapshot => {
                const data = snapshot.val();
                const currentXp = data && typeof data.xp === 'number' ? data.xp : 0;
                const newXp = currentXp + amount;
                // Enregistrement du XP
                userRef.update({ xp: newXp })
                    .then(() => {
                        showXPGainNotification(amount);
                        const prestige = (data && typeof data.prestige === 'number') ? data.prestige : 0;
                        updateUI({ xp: newXp, prestige });
                    })
                    .catch(err => {
                        console.error('[Gamification] Erreur lors de l\'écriture Firebase :', err);
                        alert('Erreur Firebase : ' + err.message);
                    });
                // Enregistrement de la cloture détaillée (compteur par jour/type)
                const now = new Date();
                const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
                const timeStr = now.toTimeString().slice(0,5); // HH:mm
                const clotureRef = firebase.database().ref('users/' + encodeURIComponent(userName) + '/clotures/' + dateStr + '/' + typeCloture);
                clotureRef.transaction(current => (current || 0) + 1);
                // Enregistrement du log détaillé (date + heure + type + duree)
                const logRef = firebase.database().ref('users/' + encodeURIComponent(userName) + '/clotures_log');
                logRef.push({ date: dateStr, time: timeStr, type: typeCloture, duree: duree })
                    .then(() => {
                        // Récupérer tous les logs pour vérifier les badges
                        logRef.once('value').then(snapshot => {
                            const logs = snapshot.val() ? Object.values(snapshot.val()) : [];
                            checkAndUnlockBadges(userName, logs);
                        });
                    });
            }).catch(err => {
                console.error('[Gamification] Erreur lors de la lecture Firebase :', err);
                alert('Erreur lecture Firebase : ' + err.message);
            });
        }
        function showXPGainNotification(amount) {
            let notification = document.getElementById('xp-gain-notification');
            if (notification) {
                notification.remove();
            }

            notification = document.createElement('div');
            notification.id = 'xp-gain-notification';
            notification.style.cssText = `                position: fixed;
                top: 90px;
                left: calc(50% - 160px);
                transform: translateX(-50%);
                background: rgba(38, 224, 206, 0.9);
                color: white;
                padding: 8px 16px;
                border-radius: 20px;
                font-family: 'Segoe UI', Arial, sans-serif;
                font-weight: bold;
                font-size: 1.1em;
                z-index: 9999;
                box-shadow: 0 0 20px rgba(38, 224, 206, 0.5);
                animation: xpGainAnimation 2s forwards;
                display: flex;
                align-items: center;
                gap: 8px;
            `;

            notification.innerHTML = `
                <span style="font-size: 1.2em;">✨</span>
                <span>+${amount} XP</span>
            `;

            document.body.appendChild(notification);

            // Supprime la notification après l'animation
            setTimeout(() => {
                notification.remove();
            }, 2000);
        }
        // === Effets de clôture (visuels lors du passage à "Résolu") ===
        function ensureClosureEffectsStyles() {
            if (document.getElementById('closure-effects-style')) return;
            const st = document.createElement('style');
            st.id = 'closure-effects-style';
            st.innerHTML = `
            @keyframes ceConfettiFall { 0%{ transform:translate(var(--x,0), -60px) rotate(0deg); opacity:1; } 100%{ transform:translate(var(--x,0), 180px) rotate(540deg); opacity:0; } }
            @keyframes ceParticleBurst { 0%{ transform:translate(-50%,-50%) translate(0,0) scale(.9); opacity:1; } 100%{ transform:translate(-50%,-50%) translate(var(--dx,0), var(--dy,0)) scale(1.05); opacity:0; } }
            @keyframes ceRingPulseOnce { 0%{ transform:translate(-50%,-50%) scale(.6); opacity:.9; } 100%{ transform:translate(-50%,-50%) scale(1.8); opacity:0; } }
            @keyframes ceCometSweep { 0%{ transform:translate(-20vw, -30vh) rotate(var(--ang,25deg)); opacity:0; } 10%{ opacity:1; } 100%{ transform:translate(120vw, 30vh) rotate(var(--ang,25deg)); opacity:0; } }
            @keyframes ceStarFallDiag { 0%{ transform:translate(var(--sx,0), -40vh) rotate(0deg); opacity:1; } 100%{ transform:translate(calc(var(--sx,0) + 40vw), 110vh) rotate(360deg); opacity:0; } }
            @keyframes ceShimmerFlash { 0%{ opacity:0; } 30%{ opacity:.55; } 100%{ opacity:0; } }
            @keyframes ceBeamGrow { 0%{ transform:translate(-50%,-50%) scaleY(0); opacity:0; } 30%{ opacity:1; } 100%{ transform:translate(-50%,-50%) scaleY(1); opacity:0; } }
            @keyframes cePolygonScale { 0%{ transform:translate(-50%,-50%) scale(.2) rotate(0deg); opacity:.9;} 100%{ transform:translate(-50%,-50%) scale(1.6) rotate(90deg); opacity:0;} }
            @keyframes ceNeonPulse { 0%{ transform:translate(-50%,-50%) scale(.6); opacity:.0;} 40%{ opacity:.9;} 100%{ transform:translate(-50%,-50%) scale(1.9); opacity:0;} }
            @keyframes ceRippleFs { 0%{ transform:translate(-50%,-50%) scale(.2); opacity:.85; } 100%{ transform:translate(-50%,-50%) scale(6); opacity:0; } }
            @keyframes ceLightningFlash { 0%{ opacity:0; } 15%{ opacity:.9; } 100%{ opacity:0; } }
            @keyframes ceLightningBolt { 0%{ opacity:0; } 15%{ opacity:1; } 100%{ opacity:0; } }
            `;
            document.head.appendChild(st);
        }
        // Palette de couleurs pour les effets de clôture (10 choix)
        const closureColorPalette = [
            { id: 'auto', label: 'Auto prestige', start: '', end: '' },
            { id: 'blue', label: 'Bleu', start: '#209cff', end: '#26e0ce' },
            { id: 'cyan', label: 'Cyan', start: '#00eaff', end: '#00ffd5' },
            { id: 'green', label: 'Vert', start: '#00b09b', end: '#96c93d' },
            { id: 'lime', label: 'Lime', start: '#a8ff78', end: '#78ffd6' },
            { id: 'gold', label: 'Or', start: '#ffd700', end: '#ff9800' },
            { id: 'orange', label: 'Orange', start: '#f7971e', end: '#ff512f' },
            { id: 'red', label: 'Rouge', start: '#d90429', end: '#ff6b6b' },
            { id: 'redblack', label: 'Rouge vif / Noir', start: '#ff1a1a', end: '#0a0a0a' },
            { id: 'pink', label: 'Rose', start: '#ff5f6d', end: '#ffc371' },
            { id: 'girly', label: 'Rose girly', start: '#ff69b4', end: '#ffd1e8' },
            { id: 'rainbow', label: 'Rainbow (P10 Lv100)', start: 'linear-gradient(90deg,#ff0080,#ff8c00,#ffff00,#00ff00,#00ffff,#0000ff,#8b00ff)', end: '' },
            { id: 'purple', label: 'Violet', start: '#8f00ff', end: '#a020f0' }
        ];
        function getClosureGradientById(colorId, prestige) {
            if (!colorId || colorId === 'auto') return getPrestigeGradient(Number(prestige||0));
            const c = closureColorPalette.find(c => c.id === colorId);
            if (c && c.id === 'rainbow') return { start: '#ff0080', end: '#00ffff', special: 'rainbow' };
            if (c && c.start && c.end) return { start: c.start, end: c.end };
            return getPrestigeGradient(Number(prestige||0));
        }
        function getDefaultClosureEffectForPrestige(p) {
            if (p >= 10) return 'epic';
            if (p >= 9) return 'polygon';
            if (p >= 8) return 'neon';
            if (p >= 7) return 'fireworks';
            if (p >= 6) return 'silver';
            if (p >= 5) return 'starfall';
            if (p >= 4) return 'comet';
            if (p >= 3) return 'ring';
            if (p >= 1) return 'confetti';
            return 'confetti';
        }
        function playClosureEffect(effectId, prestige, overrideGradient) {
            ensureClosureEffectsStyles();
            if (effectId === 'none') return; // désactivé
            const id = (effectId && effectId !== 'auto') ? effectId : getDefaultClosureEffectForPrestige(Number(prestige||0));
            const g = overrideGradient || getPrestigeGradient(Number(prestige||0));
            const layer = document.createElement('div');
            layer.id = 'closure-effects-layer';
            layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:99999;overflow:hidden;';
            document.body.appendChild(layer);
            const cleanup = (delay=2200) => setTimeout(()=>{ layer.remove(); }, delay);
            const colors = (g && g.special === 'rainbow')
                ? ['#ff0080','#ff8c00','#ffff00','#00ff00','#00ffff','#0000ff','#8b00ff','#ffffff']
                : [g.start, g.end, '#ffffff'];
            // helpers
            function burst(centerX, centerY, count, radius, baseSize) {
                for (let i=0;i<count;i++) {
                    const a = (2*Math.PI*i)/count + Math.random()*0.3;
                    const dx = Math.cos(a) * (radius + Math.random()*radius*0.6);
                    const dy = Math.sin(a) * (radius + Math.random()*radius*0.6);
                    const sp = document.createElement('span');
                    sp.style.cssText = `position:absolute;left:${centerX}px;top:${centerY}px;width:${baseSize+Math.random()*3}px;height:${baseSize+Math.random()*3}px;background:${colors[i%colors.length]};border-radius:50%;filter:drop-shadow(0 0 6px ${colors[i%colors.length]});animation:ceParticleBurst ${1.2+Math.random()*0.6}s ease-out forwards;`;
                    sp.style.setProperty('--dx', dx+'px');
                    sp.style.setProperty('--dy', dy+'px');
                    layer.appendChild(sp);
                }
            }
            function addRingPulse(cx, cy, color, w=3) {
                const ring = document.createElement('span');
                ring.style.cssText = `position:absolute;left:${cx}px;top:${cy}px;transform:translate(-50%,-50%);width:20px;height:20px;border:${w}px solid ${color};border-radius:50%;animation:ceRingPulseOnce 1.1s ease-out forwards;filter:drop-shadow(0 0 12px ${color});`;
                layer.appendChild(ring);
            }
            switch(id){
                case 'confetti': {
                    const n = 70;
                    for (let i=0;i<n;i++){
                        const s = document.createElement('span');
                        const x = Math.random()*window.innerWidth;
                        s.style.cssText = `position:absolute;left:${x}px;top:0;width:${6+Math.random()*6}px;height:${6+Math.random()*10}px;background:${colors[i%colors.length]};border-radius:2px;filter:drop-shadow(0 0 6px ${colors[i%colors.length]}88);animation:ceConfettiFall ${1.2+Math.random()*0.9}s linear forwards;`;
                        s.style.setProperty('--x', (Math.random()*60-30)+'px');
                        layer.appendChild(s);
                    }
                    cleanup(1800);
                    break;
                }
                case 'ring': {
                    // Onde circulaire façon goutte d'eau, pleine largeur
                    const cx = window.innerWidth/2, cy = window.innerHeight/2;
                    const ripple = document.createElement('div');
                    ripple.style.cssText = `position:absolute;left:${cx}px;top:${cy}px;width:120px;height:120px;border-radius:50%;border:4px solid ${g.end};box-shadow:0 0 28px ${g.end};animation:ceRippleFs 1.4s ease-out forwards;`;
                    ripple.style.transform = 'translate(-50%,-50%)';
                    layer.appendChild(ripple);
                    // Second front légèrement décalé
                    setTimeout(()=>{
                        const r2 = document.createElement('div');
                        r2.style.cssText = `position:absolute;left:${cx}px;top:${cy}px;width:100px;height:100px;border-radius:50%;border:3px solid ${g.start};box-shadow:0 0 18px ${g.start};animation:ceRippleFs 1.6s ease-out forwards;`;
                        r2.style.transform = 'translate(-50%,-50%)';
                        layer.appendChild(r2);
                    }, 120);
                    cleanup(1700);
                    break;
                }
                case 'comet': {
                    // Comète plus large + étincelles de traînée
                    const comet = document.createElement('span');
                    const cometBg = (g && g.special==='rainbow')
                        ? 'linear-gradient(90deg,transparent,#ff0080,#ff8c00,#ffff00,#00ff00,#00ffff,#0000ff,#8b00ff,#fff)'
                        : `linear-gradient(90deg,transparent,${g.start},${g.end},#fff)`;
                    comet.style.cssText = `position:absolute;left:-10vw;top:40%;width:320px;height:5px;background:${cometBg};border-radius:3px;filter:drop-shadow(0 0 16px ${g.end});animation:ceCometSweep 1.9s ease-out forwards;`;
                    comet.style.setProperty('--ang', (15+Math.random()*25)+'deg');
                    layer.appendChild(comet);
                    for(let i=0;i<10;i++){
                        const sp = document.createElement('span');
                        sp.style.cssText = `position:absolute;left:50%;top:50%;width:${3+Math.random()*3}px;height:${3+Math.random()*3}px;background:${g.end};border-radius:50%;opacity:.9;filter:drop-shadow(0 0 8px ${g.end});animation:ceParticleBurst ${.9+Math.random()*0.4}s ease-out forwards;`;
                        sp.style.setProperty('--dx', (-60+Math.random()*120)+'px');
                        sp.style.setProperty('--dy', (40+Math.random()*40)+'px');
                        sp.style.transform = 'translate(-50%,-50%)';
                        layer.appendChild(sp);
                    }
                    cleanup(2000);
                    break;
                }
                case 'starfall': {
                    // Plus d’étoiles, jusqu’en bas de page, plus lent
                    for (let i=0;i<120;i++){
                        const star = document.createElement('span');
                        const size = 4+Math.random()*4;
                        star.style.cssText = `position:absolute;left:${Math.random()*window.innerWidth}px;top:-10vh;width:${size}px;height:${size}px;background:${colors[i%colors.length]};border-radius:50%;filter:drop-shadow(0 0 10px ${colors[i%colors.length]});animation:ceStarFallDiag ${2.2+Math.random()*1.2}s linear forwards;`;
                        star.style.setProperty('--sx', (Math.random()*-60)+'vw');
                        layer.appendChild(star);
                    }
                    cleanup(2600);
                    break;
                }
                case 'silver': {
                    // Explosion (onde + débris) — pas un feu d'artifice
                    const cx = window.innerWidth/2, cy = window.innerHeight/2;
                    // onde de choc
                    addRingPulse(cx, cy, g.end, 5);
                    setTimeout(()=>addRingPulse(cx, cy, g.start, 4), 120);
                    // débris projetés
                    const total = 48;
                    for(let i=0;i<total;i++){
                        const a = (2*Math.PI*i)/total + Math.random()*0.1;
                        const dx = Math.cos(a)*(180+Math.random()*120);
                        const dy = Math.sin(a)*(180+Math.random()*120);
                        const sp = document.createElement('span');
                        const size = 4+Math.random()*4;
                        sp.style.cssText = `position:absolute;left:${cx}px;top:${cy}px;width:${size}px;height:${size}px;background:${g.end};border-radius:50%;filter:drop-shadow(0 0 10px ${g.end});animation:ceParticleBurst ${0.9+Math.random()*0.6}s ease-out forwards;`;
                        sp.style.setProperty('--dx', dx+'px');
                        sp.style.setProperty('--dy', dy+'px');
                        layer.appendChild(sp);
                    }
                    cleanup(1600);
                    break;
                }
                case 'fireworks': {
                    // Feu d’artifice plus grand avec plusieurs bouquets
                    const cx = window.innerWidth/2, cy = window.innerHeight/2 - 20;
                    const big = () => burst(cx, cy, 36, 240, 7);
                    big();
                    setTimeout(()=>burst(cx+160, cy+40, 28, 200, 6), 180);
                    setTimeout(()=>burst(cx-180, cy-20, 28, 200, 6), 360);
                    setTimeout(()=>big(), 520);
                    cleanup(2500);
                    break;
                }
                case 'neon': {
                    // Rayons néon retravaillés + pulse central
                    for (let i=0;i<14;i++){
                        const beam = document.createElement('span');
                        const ang = i*(360/14);
                        const neonGrad = (g && g.special==='rainbow')
                            ? 'linear-gradient(180deg,#ff0080,#ff8c00,#ffff00,#00ff00,#00ffff,#0000ff,#8b00ff,transparent)'
                            : `linear-gradient(180deg,${g.start},transparent)`;
                        beam.style.cssText = `position:absolute;left:50%;top:50%;width:6px;height:65vh;background:${neonGrad};transform-origin:50% 0;filter:drop-shadow(0 0 16px ${g.start});animation:ceBeamGrow 1.6s ease-out forwards;`;
                        beam.style.transform = `translate(-50%,-50%) rotate(${ang}deg)`;
                        layer.appendChild(beam);
                    }
                    const pulse = document.createElement('div');
                    const pulseColor = (g && g.special==='rainbow') ? '#ffffff' : g.end;
                    pulse.style.cssText = `position:absolute;left:50%;top:50%;width:140px;height:140px;border-radius:50%;border:3px solid ${pulseColor};box-shadow:0 0 28px ${pulseColor};animation:ceNeonPulse 1.4s ease-out forwards;`;
                    pulse.style.transform = 'translate(-50%,-50%)';
                    layer.appendChild(pulse);
                    cleanup(1900);
                    break;
                }
                case 'thunder': {
                    // Orage grandiose: éclairs multiples + flash global
                    const flashes = 3;
                    for (let i=0;i<flashes;i++){
                        setTimeout(()=>{
                            const flash = document.createElement('div');
                            flash.style.cssText = 'position:absolute;inset:0;background:rgba(255,255,255,0.25);animation:ceLightningFlash 220ms ease-out forwards;pointer-events:none;';
                            layer.appendChild(flash);
                        }, i*220);
                    }
                    function drawBolt(x, y, len, angleDeg, color){
                        const segs = 6 + Math.floor(Math.random()*4);
                        let path = `M ${x} ${y}`;
                        let cx = x, cy = y;
                        for(let i=0;i<segs;i++){
                            const a = (angleDeg + (Math.random()*30-15)) * Math.PI/180;
                            const l = len*(0.65 + Math.random()*0.5)/segs;
                            cx += Math.cos(a)*l;
                            cy += Math.sin(a)*l;
                            path += ` L ${cx} ${cy}`;
                        }
                        const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
                        svg.setAttribute('width', window.innerWidth);
                        svg.setAttribute('height', window.innerHeight);
                        svg.style.cssText = 'position:absolute;left:0;top:0;animation:ceLightningBolt 260ms ease-out forwards;';
                        const p = document.createElementNS('http://www.w3.org/2000/svg','path');
                        p.setAttribute('d', path);
                        p.setAttribute('stroke', color);
                        p.setAttribute('stroke-width', 4);
                        p.setAttribute('fill', 'none');
                        p.setAttribute('filter', 'drop-shadow(0 0 12px #fff) drop-shadow(0 0 22px #fff)');
                        svg.appendChild(p);
                        layer.appendChild(svg);
                    }
                    const boltColor = (g && g.special==='rainbow') ? '#ffffff' : g.end;
                    // Foudre principale du haut vers différents points
                    for(let i=0;i<6;i++){
                        setTimeout(()=>{
                            drawBolt(Math.random()*window.innerWidth, -10, window.innerHeight*0.8, 90+Math.random()*20-10, boltColor);
                        }, i*90);
                    }
                    // Éclairs latéraux
                    for(let i=0;i<4;i++){
                        setTimeout(()=>{
                            const left = Math.random()<0.5;
                            const startX = left ? -10 : window.innerWidth+10;
                            const ang = left ? 0+Math.random()*30 : 180-Math.random()*30;
                            drawBolt(startX, Math.random()*window.innerHeight*0.6, window.innerWidth*0.6, ang, boltColor);
                        }, 140 + i*100);
                    }
                    cleanup(1200 + flashes*220);
                    break;
                }
                case 'epic': default: {
                    // Si gradient spécial rainbow OU effet explicitement 'rainbow_combo'
                    const isRainbow = (g && g.special === 'rainbow') || id === 'rainbow_combo';
                    const cx = window.innerWidth/2, cy = window.innerHeight/2 - 20;
                    if (isRainbow) {
                        // feu d'artifice large
                        const big = () => burst(cx, cy, 40, 260, 8);
                        big();
                        setTimeout(()=>burst(cx+160, cy+40, 32, 220, 7), 180);
                        setTimeout(()=>burst(cx-180, cy-20, 32, 220, 7), 360);
                        // pluie d'étoiles renforcée
                        for (let i=0;i<140;i++){
                            const s = document.createElement('span');
                            const x = Math.random()*window.innerWidth;
                            s.style.cssText = `position:absolute;left:${x}px;top:-10vh;width:${5+Math.random()*6}px;height:${5+Math.random()*6}px;background:${colors[i%colors.length]};border-radius:50%;filter:drop-shadow(0 0 10px ${colors[i%colors.length]});animation:ceStarFallDiag ${2+Math.random()*1.2}s linear forwards;`;
                            s.style.setProperty('--sx', (Math.random()*-60)+'vw');
                            layer.appendChild(s);
                        }
                        // comète traversante
                        const comet = document.createElement('span');
                        comet.style.cssText = `position:absolute;left:-10vw;top:35%;width:380px;height:6px;background:linear-gradient(90deg,transparent,#ff0080,#ff8c00,#ffff00,#00ff00,#00ffff,#0000ff,#8b00ff,white);border-radius:3px;filter:drop-shadow(0 0 18px #fff);animation:ceCometSweep 2s ease-out forwards;`;
                        comet.style.setProperty('--ang', (12+Math.random()*20)+'deg');
                        layer.appendChild(comet);
                        cleanup(2600);
                    } else {
                        // Combo classique
                        burst(cx, cy, 28, 200, 7);
                        setTimeout(()=>{
                            for (let i=0;i<60;i++){
                                const s = document.createElement('span');
                                const x = Math.random()*window.innerWidth;
                                s.style.cssText = `position:absolute;left:${x}px;top:0;width:${6+Math.random()*6}px;height:${6+Math.random()*10}px;background:${colors[i%colors.length]};border-radius:2px;filter:drop-shadow(0 0 6px ${colors[i%colors.length]}88);animation:ceConfettiFall ${1.2+Math.random()*0.9}s linear forwards;`;
                                s.style.setProperty('--x', (Math.random()*60-30)+'px');
                                layer.appendChild(s);
                            }
                        }, 160);
                        addRingPulse(cx, cy, g.start, 3);
                        setTimeout(()=>addRingPulse(cx, cy, g.end, 2), 180);
                        cleanup(2200);
                    }
                    break;
                }
            }
        }
        // === Effets de souris (trail + burst au clic) ===
        function ensureMouseEffectsStyles() {
            if (document.getElementById('mouse-effects-style')) return;
            const st = document.createElement('style');
            st.id = 'mouse-effects-style';
            st.innerHTML = `
            @keyframes mtFadeMove { 0%{ transform:translate(var(--dx,0), var(--dy,0)) scale(1); opacity:1; } 100%{ transform:translate(calc(var(--dx,0) * 2), calc(var(--dy,0) * 2)) scale(0.6); opacity:0; } }
            @keyframes mtClickRipple { 0%{ transform:translate(-50%,-50%) scale(.4); opacity:.9; } 100%{ transform:translate(-50%,-50%) scale(1.8); opacity:0; } }
            `;
            document.head.appendChild(st);
        }
        let mouseTrailState = { enabled: false, layer: null, onMove: null, onClick: null, lastEmit: 0 };
        function createMouseLayer() {
            let layer = document.getElementById('mouse-trail-layer');
            if (!layer) {
                layer = document.createElement('div');
                layer.id = 'mouse-trail-layer';
                layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:99998;overflow:hidden;';
                document.body.appendChild(layer);
            }
            return layer;
        }
        // Particules: trail actuel
        function startMouseTrailParticles(colorId, prestige) {
            ensureMouseEffectsStyles();
            const layer = createMouseLayer();
            mouseTrailState.layer = layer;
            mouseTrailState.enabled = true;
            const grad = getClosureGradientById(colorId || 'auto', prestige);
            const rainbowColors = ['#ff0080','#ff8c00','#ffff00','#00ff00','#00ffff','#0000ff','#8b00ff','#ffffff'];
            function pickColor(i){
                if (grad && grad.special==='rainbow') return rainbowColors[i % rainbowColors.length];
                return (Math.random()<0.5 ? grad.start : grad.end) || '#26e0ce';
            }
            function emitParticle(x, y, i=0) {
                const s = document.createElement('span');
                const size = 4 + Math.random()*5;
                const dx = (Math.random()*8 - 4);
                const dy = (Math.random()*8 - 4);
                s.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${size}px;height:${size}px;border-radius:50%;background:${pickColor(i)};opacity:0.95;transform:translate(0,0);animation:mtFadeMove ${700+Math.random()*300}ms ease-out forwards;`;
                s.style.setProperty('--dx', dx+'px');
                s.style.setProperty('--dy', dy+'px');
                layer.appendChild(s);
                setTimeout(()=>{ s.remove(); }, 1100);
            }
            function burst(x, y) {
                // uniquement un petit cercle (ripple)
                if (grad && grad.special==='rainbow') {
                    const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
                    svg.setAttribute('width','40'); svg.setAttribute('height','40');
                    svg.style.cssText = `position:absolute;left:${x}px;top:${y}px;transform:translate(-50%,-50%);pointer-events:none;`;
                    const defs = document.createElementNS('http://www.w3.org/2000/svg','defs');
                    const lg = document.createElementNS('http://www.w3.org/2000/svg','linearGradient');
                    lg.setAttribute('id','mtrg'); lg.setAttribute('x1','0%'); lg.setAttribute('y1','0%'); lg.setAttribute('x2','100%'); lg.setAttribute('y2','100%');
                    const cols = ['#ff0080','#ff8c00','#ffff00','#00ff00','#00ffff','#0000ff','#8b00ff'];
                    cols.forEach((c,idx)=>{ const stp=document.createElementNS('http://www.w3.org/2000/svg','stop'); stp.setAttribute('offset', `${Math.round(idx*100/(cols.length-1))}%`); stp.setAttribute('stop-color', c); lg.appendChild(stp); });
                    defs.appendChild(lg); svg.appendChild(defs);
                    const circle = document.createElementNS('http://www.w3.org/2000/svg','circle');
                    circle.setAttribute('cx','20'); circle.setAttribute('cy','20'); circle.setAttribute('r','10');
                    circle.setAttribute('fill','none'); circle.setAttribute('stroke','url(#mtrg)'); circle.setAttribute('stroke-width','3');
                    svg.appendChild(circle);
                    layer.appendChild(svg);
                    svg.animate([{ transform:'translate(-50%,-50%) scale(0.4)', opacity:0.9 },{ transform:'translate(-50%,-50%) scale(1.8)', opacity:0 }], { duration: 550, easing:'ease-out', fill:'forwards' });
                    setTimeout(()=>{ svg.remove(); }, 600);
                } else {
                    const baseColor = grad.end || '#26e0ce';
                    const ring = document.createElement('div');
                    ring.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:18px;height:18px;border-radius:50%;border:2px solid ${baseColor};box-shadow:0 0 16px ${baseColor};animation:mtClickRipple 550ms ease-out forwards;`;
                    ring.style.transform = 'translate(-50%,-50%)';
                    layer.appendChild(ring);
                    setTimeout(()=>{ ring.remove(); }, 600);
                }
            }
            const throttleMs = 20;
            let prevX = null, prevY = null;
            mouseTrailState.onMove = (e) => {
                const now = performance.now();
                if (now - mouseTrailState.lastEmit < throttleMs) return;
                mouseTrailState.lastEmit = now;
                // Position au bas de la flèche du curseur: on décale plus à droite
                const offsetX = 4, offsetY = 12;
                const tx = e.clientX + offsetX;
                const ty = e.clientY + offsetY;
                emitParticle(tx, ty);
                emitParticle(tx, ty, 1);
                prevX = e.clientX; prevY = e.clientY;
            };
            mouseTrailState.onClick = (e) => burst(e.clientX, e.clientY);
            window.addEventListener('mousemove', mouseTrailState.onMove, { passive: true });
            window.addEventListener('click', mouseTrailState.onClick, { passive: true });
        }
        // Trait continu: ligne qui suit la souris et s'estompe
        function startMouseTrailLine(colorId, prestige) {
            ensureMouseEffectsStyles();
            const layer = createMouseLayer();
            mouseTrailState.layer = layer;
            mouseTrailState.enabled = true;
            const grad = getClosureGradientById(colorId || 'auto', prestige);
            const rainbowColors = ['#ff0080','#ff8c00','#ffff00','#00ff00','#00ffff','#0000ff','#8b00ff','#ffffff'];
            const baseColor = (grad && grad.special==='rainbow') ? '#ffffff' : (grad.end || '#26e0ce');
            const startHex = (grad && grad.start) ? grad.start : '#26e0ce';
            const endHex = (grad && grad.end) ? grad.end : '#209cff';
            let canvas = document.getElementById('mouse-trail-canvas');
            if (!canvas) {
                canvas = document.createElement('canvas');
                canvas.id = 'mouse-trail-canvas';
                canvas.style.cssText = 'position:absolute;left:0;top:0;width:100vw;height:100vh;pointer-events:none;';
                layer.appendChild(canvas);
            }
            const ctx = canvas.getContext('2d');
            function resize(){ canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
            resize();
            window.addEventListener('resize', resize);
            const points = [];
            const maxPoints = 64;
            const lifeMs = 700;
            function rgba(c, a){
                // c like #rrggbb
                const r = parseInt(c.slice(1,3),16), g = parseInt(c.slice(3,5),16), b = parseInt(c.slice(5,7),16);
                return `rgba(${r},${g},${b},${a})`;
            }
            function mix(hex1, hex2, t){
                const r1 = parseInt(hex1.slice(1,3),16), g1 = parseInt(hex1.slice(3,5),16), b1 = parseInt(hex1.slice(5,7),16);
                const r2 = parseInt(hex2.slice(1,3),16), g2 = parseInt(hex2.slice(3,5),16), b2 = parseInt(hex2.slice(5,7),16);
                const r = Math.round(r1 + (r2-r1)*t);
                const g = Math.round(g1 + (g2-g1)*t);
                const b = Math.round(b1 + (b2-b1)*t);
                return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
            }
            function animate(){
                if (!mouseTrailState.enabled) return; // stop when disabled
                const now = performance.now();
                // prune old
                while (points.length && (now - points[0].t > lifeMs)) points.shift();
                ctx.clearRect(0,0,canvas.width,canvas.height);
                if (points.length > 1) {
                    for (let i=1;i<points.length;i++){
                        const p0 = points[i-1];
                        const p1 = points[i];
                        const age = now - p1.t;
                        const a = Math.max(0, 1 - age / lifeMs);
                        const t = Math.min(1, i/(points.length-1));
                        const w = 2 + (i/points.length)*4; // plus épais vers la tête
                        let colHex;
                        if (grad && grad.special==='rainbow') {
                            colHex = rainbowColors[i % rainbowColors.length];
                        } else {
                            colHex = mix(startHex, endHex, t);
                        }
                        // halo doux
                        ctx.lineWidth = w + 6;
                        ctx.strokeStyle = rgba(colHex, a*0.22);
                        ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
                        // trait principal
                        ctx.lineWidth = w;
                        ctx.strokeStyle = rgba(colHex, a*0.95);
                        ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
                    }
                }
                mouseTrailState.raf = requestAnimationFrame(animate);
            }
            animate();
            function burst(x, y) {
                // petit ripple au clic
                if (grad && grad.special==='rainbow') {
                    const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
                    svg.setAttribute('width','40'); svg.setAttribute('height','40');
                    svg.style.cssText = `position:absolute;left:${x}px;top:${y}px;transform:translate(-50%,-50%);pointer-events:none;`;
                    const defs = document.createElementNS('http://www.w3.org/2000/svg','defs');
                    const lg = document.createElementNS('http://www.w3.org/2000/svg','linearGradient');
                    lg.setAttribute('id','mtrg2'); lg.setAttribute('x1','0%'); lg.setAttribute('y1','0%'); lg.setAttribute('x2','100%'); lg.setAttribute('y2','100%');
                    const cols = ['#ff0080','#ff8c00','#ffff00','#00ff00','#00ffff','#0000ff','#8b00ff'];
                    cols.forEach((c,idx)=>{ const stp=document.createElementNS('http://www.w3.org/2000/svg','stop'); stp.setAttribute('offset', `${Math.round(idx*100/(cols.length-1))}%`); stp.setAttribute('stop-color', c); lg.appendChild(stp); });
                    defs.appendChild(lg); svg.appendChild(defs);
                    const circle = document.createElementNS('http://www.w3.org/2000/svg','circle');
                    circle.setAttribute('cx','20'); circle.setAttribute('cy','20'); circle.setAttribute('r','10');
                    circle.setAttribute('fill','none'); circle.setAttribute('stroke','url(#mtrg2)'); circle.setAttribute('stroke-width','3');
                    svg.appendChild(circle);
                    layer.appendChild(svg);
                    svg.animate([{ transform:'translate(-50%,-50%) scale(0.4)', opacity:0.9 },{ transform:'translate(-50%,-50%) scale(1.8)', opacity:0 }], { duration: 550, easing:'ease-out', fill:'forwards' });
                    setTimeout(()=>{ svg.remove(); }, 600);
                } else {
                    const ring = document.createElement('div');
                    ring.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:18px;height:18px;border-radius:50%;border:2px solid ${baseColor};box-shadow:0 0 16px ${baseColor};animation:mtClickRipple 550ms ease-out forwards;`;
                    ring.style.transform = 'translate(-50%,-50%)';
                    layer.appendChild(ring);
                    setTimeout(()=>{ ring.remove(); }, 600);
                }
            }
            const throttleMs = 12;
            mouseTrailState.onMove = (e) => {
                const now = performance.now();
                if (now - mouseTrailState.lastEmit < throttleMs) return;
                mouseTrailState.lastEmit = now;
                const offsetX = 4, offsetY = 12;
                const tx = e.clientX + offsetX;
                const ty = e.clientY + offsetY;
                points.push({ x: tx, y: ty, t: now });
                if (points.length > maxPoints) points.shift();
            };
            mouseTrailState.onClick = (e) => burst(e.clientX, e.clientY);
            window.addEventListener('mousemove', mouseTrailState.onMove, { passive: true });
            window.addEventListener('click', mouseTrailState.onClick, { passive: true });
            // store extra for cleanup
            mouseTrailState.canvas = canvas;
            mouseTrailState.onResize = resize;
        }
        // Comète: tête lumineuse + traînée
        function startMouseTrailComet(colorId, prestige) {
            ensureMouseEffectsStyles();
            const layer = createMouseLayer();
            mouseTrailState.layer = layer; mouseTrailState.enabled = true;
            const grad = getClosureGradientById(colorId || 'auto', prestige);
            const rainbowColors = ['#ff0080','#ff8c00','#ffff00','#00ff00','#00ffff','#0000ff','#8b00ff','#ffffff'];
            const baseColor = (grad && grad.special==='rainbow') ? '#ffffff' : (grad.end || '#26e0ce');
            let canvas = document.getElementById('mouse-trail-canvas');
            if (!canvas) {
                canvas = document.createElement('canvas');
                canvas.id = 'mouse-trail-canvas';
                canvas.style.cssText = 'position:absolute;left:0;top:0;width:100vw;height:100vh;pointer-events:none;';
                layer.appendChild(canvas);
            }
            const ctx = canvas.getContext('2d');
            function resize(){ canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
            resize();
            window.addEventListener('resize', resize);
            const points = [];
            const maxPoints = 48;
            const lifeMs = 900;
            function rgba(hex, a){ const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16); return `rgba(${r},${g},${b},${a})`; }
            function animate(){
                if (!mouseTrailState.enabled) return;
                const now = performance.now();
                while (points.length && (now - points[0].t > lifeMs)) points.shift();
                ctx.clearRect(0,0,canvas.width,canvas.height);
                if (points.length > 1) {
                    // Traînée
                    for (let i=1;i<points.length;i++){
                        const p0 = points[i-1], p1 = points[i];
                        const age = now - p1.t; const a = Math.max(0, 1 - age/lifeMs);
                        const w = 1.5 + (i/points.length)*6;
                        ctx.lineWidth = w;
                        if (grad && grad.special==='rainbow') {
                            const col = rainbowColors[i % rainbowColors.length];
                            ctx.strokeStyle = rgba(col, a*0.8);
                        } else {
                            ctx.strokeStyle = rgba(baseColor, a*0.85);
                        }
                        ctx.beginPath();
                        ctx.moveTo(p0.x, p0.y);
                        ctx.lineTo(p1.x, p1.y);
                        ctx.stroke();
                    }
                    // Tête lumineuse
                    const head = points[points.length-1];
                    const r = 12;
                    const gradHead = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, r*2);
                    if (grad && grad.special==='rainbow') {
                        gradHead.addColorStop(0, 'rgba(255,255,255,1)');
                        gradHead.addColorStop(1, 'rgba(255,255,255,0)');
                    } else {
                        const col = baseColor;
                        const rr=parseInt(col.slice(1,3),16), gg=parseInt(col.slice(3,5),16), bb=parseInt(col.slice(5,7),16);
                        gradHead.addColorStop(0, `rgba(${rr},${gg},${bb},1)`);
                        gradHead.addColorStop(1, `rgba(${rr},${gg},${bb},0)`);
                    }
                    ctx.fillStyle = gradHead;
                    ctx.beginPath(); ctx.arc(head.x, head.y, r*2, 0, Math.PI*2); ctx.fill();
                }
                mouseTrailState.raf = requestAnimationFrame(animate);
            }
            animate();
            function burst(x, y) {
                // petit ripple au clic
                if (grad && grad.special==='rainbow') {
                    const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
                    svg.setAttribute('width','40'); svg.setAttribute('height','40');
                    svg.style.cssText = `position:absolute;left:${x}px;top:${y}px;transform:translate(-50%,-50%);pointer-events:none;`;
                    const defs = document.createElementNS('http://www.w3.org/2000/svg','defs');
                    const lg = document.createElementNS('http://www.w3.org/2000/svg','linearGradient');
                    lg.setAttribute('id','mtrg3'); lg.setAttribute('x1','0%'); lg.setAttribute('y1','0%'); lg.setAttribute('x2','100%'); lg.setAttribute('y2','100%');
                    const cols = ['#ff0080','#ff8c00','#ffff00','#00ff00','#00ffff','#0000ff','#8b00ff'];
                    cols.forEach((c,idx)=>{ const stp=document.createElementNS('http://www.w3.org/2000/svg','stop'); stp.setAttribute('offset', `${Math.round(idx*100/(cols.length-1))}%`); stp.setAttribute('stop-color', c); lg.appendChild(stp); });
                    defs.appendChild(lg); svg.appendChild(defs);
                    const circle = document.createElementNS('http://www.w3.org/2000/svg','circle');
                    circle.setAttribute('cx','20'); circle.setAttribute('cy','20'); circle.setAttribute('r','10');
                    circle.setAttribute('fill','none'); circle.setAttribute('stroke','url(#mtrg3)'); circle.setAttribute('stroke-width','3');
                    svg.appendChild(circle);
                    layer.appendChild(svg);
                    svg.animate([{ transform:'translate(-50%,-50%) scale(0.4)', opacity:0.9 },{ transform:'translate(-50%,-50%) scale(1.8)', opacity:0 }], { duration: 550, easing:'ease-out', fill:'forwards' });
                    setTimeout(()=>{ svg.remove(); }, 600);
                } else {
                    const ring = document.createElement('div');
                    ring.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:18px;height:18px;border-radius:50%;border:2px solid ${baseColor};box-shadow:0 0 16px ${baseColor};animation:mtClickRipple 550ms ease-out forwards;`;
                    ring.style.transform = 'translate(-50%,-50%)';
                    layer.appendChild(ring);
                    setTimeout(()=>{ ring.remove(); }, 600);
                }
            }
            const throttleMs = 10;
            mouseTrailState.onMove = (e) => {
                const now = performance.now();
                if (now - mouseTrailState.lastEmit < throttleMs) return;
                mouseTrailState.lastEmit = now;
                const offsetX = 4, offsetY = 12;
                const tx = e.clientX + offsetX, ty = e.clientY + offsetY;
                points.push({ x: tx, y: ty, t: now });
                if (points.length > maxPoints) points.shift();
            };
            mouseTrailState.onClick = (e) => burst(e.clientX, e.clientY);
            window.addEventListener('mousemove', mouseTrailState.onMove, { passive: true });
            window.addEventListener('click', mouseTrailState.onClick, { passive: true });
            mouseTrailState.canvas = canvas; mouseTrailState.onResize = resize;
        }
        // Bulles: petites bulles qui s'élèvent et s'estompent
        function startMouseTrailBubbles(colorId, prestige) {
            ensureMouseEffectsStyles();
            const layer = createMouseLayer();
            mouseTrailState.layer = layer; mouseTrailState.enabled = true;
            const grad = getClosureGradientById(colorId || 'auto', prestige);
            const rainbowColors = ['#ff0080','#ff8c00','#ffff00','#00ff00','#00ffff','#0000ff','#8b00ff','#ffffff'];
            function pickColor(i){
                if (grad && grad.special==='rainbow') return rainbowColors[i % rainbowColors.length];
                return (Math.random() < 0.5 ? grad.start : grad.end) || '#26e0ce';
            }
            const throttleMs = 22;
            mouseTrailState.onMove = (e) => {
                const now = performance.now();
                if (now - mouseTrailState.lastEmit < throttleMs) return;
                mouseTrailState.lastEmit = now;
                const offsetX = 6, offsetY = 16;
                const tx = e.clientX + offsetX, ty = e.clientY + offsetY;
                for (let i=0;i<2;i++){
                    const s = document.createElement('span');
                    const size = 6 + Math.random()*10;
                    const dx = (Math.random()*12 - 6);
                    const dy = (-10 - Math.random()*14); // vers le haut
                    const col = pickColor(i);
                    s.style.cssText = `position:absolute;left:${tx}px;top:${ty}px;width:${size}px;height:${size}px;border-radius:50%;background:${col};opacity:0.85;transform:translate(0,0);filter:blur(0.3px) drop-shadow(0 0 6px ${col});animation:mtFadeMove ${900+Math.random()*500}ms ease-out forwards;`;
                    s.style.setProperty('--dx', dx+'px');
                    s.style.setProperty('--dy', dy+'px');
                    layer.appendChild(s);
                    setTimeout(()=>s.remove(), 1600);
                }
            };
            mouseTrailState.onClick = (e) => {
                const baseColor = (grad && grad.special==='rainbow') ? '#ffffff' : (grad.end || '#26e0ce');
                const ring = document.createElement('div');
                ring.style.cssText = `position:absolute;left:${e.clientX}px;top:${e.clientY}px;width:18px;height:18px;border-radius:50%;border:2px solid ${baseColor};box-shadow:0 0 16px ${baseColor};animation:mtClickRipple 550ms ease-out forwards;`;
                ring.style.transform = 'translate(-50%,-50%)';
                layer.appendChild(ring);
                setTimeout(()=>{ ring.remove(); }, 600);
            };
            window.addEventListener('mousemove', mouseTrailState.onMove, { passive: true });
            window.addEventListener('click', mouseTrailState.onClick, { passive: true });
        }
        // Étoiles: petites étoiles scintillantes en file derrière la souris
        function startMouseTrailStars(colorId, prestige) {
            ensureMouseEffectsStyles();
            const layer = createMouseLayer();
            mouseTrailState.layer = layer; mouseTrailState.enabled = true;
            const grad = getClosureGradientById(colorId || 'auto', prestige);
            const rainbowColors = ['#ff0080','#ff8c00','#ffff00','#00ff00','#00ffff','#0000ff','#8b00ff','#ffffff'];
            const baseColor = (grad && grad.special==='rainbow') ? '#ffffff' : (grad.end || '#26e0ce');
            let canvas = document.getElementById('mouse-trail-canvas');
            if (!canvas) {
                canvas = document.createElement('canvas');
                canvas.id = 'mouse-trail-canvas';
                canvas.style.cssText = 'position:absolute;left:0;top:0;width:100vw;height:100vh;pointer-events:none;';
                layer.appendChild(canvas);
            }
            const ctx = canvas.getContext('2d');
            function resize(){ canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
            resize();
            window.addEventListener('resize', resize);
            const points = [];
            const maxPoints = 40;
            const lifeMs = 900;
            function rgba(hex, a){ const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16); return `rgba(${r},${g},${b},${a})`; }
            function drawStar(x,y,outer,inner,rot,col,a){
                ctx.save();
                ctx.translate(x,y); ctx.rotate(rot);
                ctx.beginPath();
                for(let i=0;i<10;i++){
                    const ang = i * Math.PI/5;
                    const r = (i%2===0) ? outer : inner;
                    ctx.lineTo(Math.cos(ang)*r, Math.sin(ang)*r);
                }
                ctx.closePath();
                ctx.shadowBlur = 12; ctx.shadowColor = col;
                ctx.fillStyle = rgba(col, Math.min(1, a*0.95));
                ctx.fill();
                ctx.restore();
            }
            function animate(){
                if (!mouseTrailState.enabled) return;
                const now = performance.now();
                while (points.length && (now - points[0].t > lifeMs)) points.shift();
                ctx.clearRect(0,0,canvas.width,canvas.height);
                for (let i=1;i<points.length;i+=2){
                    const p0 = points[i-1], p = points[i];
                    const age = now - p.t; const a = Math.max(0, 1 - age/lifeMs);
                    const t = i/(points.length-1);
                    const size = 4 + t*10;
                    const rot = (p.rotBase || 0) + t*4;
                    const col = (grad && grad.special==='rainbow') ? rainbowColors[i % rainbowColors.length] : baseColor;
                    drawStar(p.x, p.y, size, size*0.45, rot, col, a);
                }
                mouseTrailState.raf = requestAnimationFrame(animate);
            }
            animate();
            function burst(x, y) {
                const ring = document.createElement('div');
                const col = (grad && grad.special==='rainbow') ? '#ffffff' : baseColor;
                ring.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:18px;height:18px;border-radius:50%;border:2px solid ${col};box-shadow:0 0 16px ${col};animation:mtClickRipple 550ms ease-out forwards;`;
                ring.style.transform = 'translate(-50%,-50%)';
                layer.appendChild(ring); setTimeout(()=>{ ring.remove(); }, 600);
            }
            const throttleMs = 16;
            mouseTrailState.onMove = (e) => {
                const now = performance.now();
                if (now - mouseTrailState.lastEmit < throttleMs) return;
                mouseTrailState.lastEmit = now;
                const offsetX = 4, offsetY = 12;
                const tx = e.clientX + offsetX, ty = e.clientY + offsetY;
                points.push({ x: tx, y: ty, t: now, rotBase: Math.random()*Math.PI*2 });
                if (points.length > maxPoints) points.shift();
            };
            mouseTrailState.onClick = (e) => burst(e.clientX, e.clientY);
            window.addEventListener('mousemove', mouseTrailState.onMove, { passive: true });
            window.addEventListener('click', mouseTrailState.onClick, { passive: true });
            mouseTrailState.canvas = canvas; mouseTrailState.onResize = resize;
        }
        // Ruban: bande néon ondulée qui suit la souris
        function startMouseTrailRibbon(colorId, prestige) {
            ensureMouseEffectsStyles();
            const layer = createMouseLayer();
            mouseTrailState.layer = layer; mouseTrailState.enabled = true;
            const grad = getClosureGradientById(colorId || 'auto', prestige);
            const rainbowColors = ['#ff0080','#ff8c00','#ffff00','#00ff00','#00ffff','#0000ff','#8b00ff','#ffffff'];
            const baseStart = (grad && grad.special==='rainbow') ? '#ff6bd5' : (grad.start || '#26e0ce');
            const baseEnd = (grad && grad.special==='rainbow') ? '#6bd5ff' : (grad.end || '#209cff');
            let canvas = document.getElementById('mouse-trail-canvas');
            if (!canvas) {
                canvas = document.createElement('canvas');
                canvas.id = 'mouse-trail-canvas';
                canvas.style.cssText = 'position:absolute;left:0;top:0;width:100vw;height:100vh;pointer-events:none;mix-blend-mode:screen;';
                layer.appendChild(canvas);
            }
            const ctx = canvas.getContext('2d');
            function resize(){ canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
            resize();
            window.addEventListener('resize', resize);
            const points = [];
            const maxPoints = 50;
            const lifeMs = 800;
            function rgba(hex, a){ const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16); return `rgba(${r},${g},${b},${a})`; }
            function lerp(a,b,t){ return a + (b-a)*t; }
            function mix(hex1, hex2, t){
                const r1 = parseInt(hex1.slice(1,3),16), g1 = parseInt(hex1.slice(3,5),16), b1 = parseInt(hex1.slice(5,7),16);
                const r2 = parseInt(hex2.slice(1,3),16), g2 = parseInt(hex2.slice(3,5),16), b2 = parseInt(hex2.slice(5,7),16);
                const r = Math.round(lerp(r1,r2,t)), g = Math.round(lerp(g1,g2,t)), b = Math.round(lerp(b1,b2,t));
                return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
            }
            function animate(){
                if (!mouseTrailState.enabled) return;
                const now = performance.now();
                while (points.length && (now - points[0].t > lifeMs)) points.shift();
                ctx.clearRect(0,0,canvas.width,canvas.height);
                if (points.length > 2) {
                    for (let i=2;i<points.length;i++){
                        const p0 = points[i-2], p1 = points[i-1], p2 = points[i];
                        const age = now - p2.t; const a = Math.max(0, 1 - age/lifeMs);
                        const t = i/(points.length-1);
                        const col = (grad && grad.special==='rainbow') ? rainbowColors[i % rainbowColors.length] : mix(baseStart, baseEnd, t);
                        // normal
                        const vx = p2.x - p1.x, vy = p2.y - p1.y;
                        const len = Math.max(1, Math.hypot(vx,vy));
                        const nx = -vy/len, ny = vx/len;
                        // oscillation légère pour le ruban
                        const osc = Math.sin(i*0.6 + now*0.006) * 6;
                        const halfW = 6 + t*6 + osc*0.2;
                        // couches pour effet néon
                        ctx.fillStyle = rgba(col, a*0.18);
                        ctx.beginPath();
                        ctx.moveTo(p1.x + nx*(halfW+6), p1.y + ny*(halfW+6));
                        ctx.lineTo(p2.x + nx*(halfW+6), p2.y + ny*(halfW+6));
                        ctx.lineTo(p2.x - nx*(halfW+6), p2.y - ny*(halfW+6));
                        ctx.lineTo(p1.x - nx*(halfW+6), p1.y - ny*(halfW+6));
                        ctx.closePath(); ctx.fill();
                        ctx.fillStyle = rgba(col, a*0.35);
                        ctx.beginPath();
                        ctx.moveTo(p1.x + nx*(halfW+2), p1.y + ny*(halfW+2));
                        ctx.lineTo(p2.x + nx*(halfW+2), p2.y + ny*(halfW+2));
                        ctx.lineTo(p2.x - nx*(halfW+2), p2.y - ny*(halfW+2));
                        ctx.lineTo(p1.x - nx*(halfW+2), p1.y - ny*(halfW+2));
                        ctx.closePath(); ctx.fill();
                        ctx.fillStyle = rgba(col, a*0.9);
                        ctx.beginPath();
                        ctx.moveTo(p1.x + nx*halfW, p1.y + ny*halfW);
                        ctx.lineTo(p2.x + nx*halfW, p2.y + ny*halfW);
                        ctx.lineTo(p2.x - nx*halfW, p2.y - ny*halfW);
                        ctx.lineTo(p1.x - nx*halfW, p1.y - ny*halfW);
                        ctx.closePath(); ctx.fill();
                    }
                }
                mouseTrailState.raf = requestAnimationFrame(animate);
            }
            animate();
            function burst(x, y) {
                const col = (grad && grad.special==='rainbow') ? '#ffffff' : baseEnd;
                const ring = document.createElement('div');
                ring.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:18px;height:18px;border-radius:50%;border:2px solid ${col};box-shadow:0 0 16px ${col};animation:mtClickRipple 550ms ease-out forwards;`;
                ring.style.transform = 'translate(-50%,-50%)'; layer.appendChild(ring);
                setTimeout(()=>{ ring.remove(); }, 600);
            }
            const throttleMs = 14;
            mouseTrailState.onMove = (e) => {
                const now = performance.now();
                if (now - mouseTrailState.lastEmit < throttleMs) return;
                mouseTrailState.lastEmit = now;
                const offsetX = 4, offsetY = 12;
                const tx = e.clientX + offsetX, ty = e.clientY + offsetY;
                points.push({ x: tx, y: ty, t: now });
                if (points.length > maxPoints) points.shift();
            };
            mouseTrailState.onClick = (e) => burst(e.clientX, e.clientY);
            window.addEventListener('mousemove', mouseTrailState.onMove, { passive: true });
            window.addEventListener('click', mouseTrailState.onClick, { passive: true });
            mouseTrailState.canvas = canvas; mouseTrailState.onResize = resize;
        }
        // Wrapper: choisit le style
        function startMouseTrail(colorId, prestige, style) {
            const kind = style || 'particles';
            if (kind === 'line') return startMouseTrailLine(colorId, prestige);
            if (kind === 'comet') return startMouseTrailComet(colorId, prestige);
            if (kind === 'bubbles') return startMouseTrailBubbles(colorId, prestige);
            if (kind === 'stars') return startMouseTrailStars(colorId, prestige);
            if (kind === 'ribbon') return startMouseTrailRibbon(colorId, prestige);
            return startMouseTrailParticles(colorId, prestige);
        }
        function stopMouseTrail() {
            mouseTrailState.enabled = false;
            if (mouseTrailState.onMove) window.removeEventListener('mousemove', mouseTrailState.onMove);
            if (mouseTrailState.onClick) window.removeEventListener('click', mouseTrailState.onClick);
            if (mouseTrailState.onResize) window.removeEventListener('resize', mouseTrailState.onResize);
            if (mouseTrailState.raf) cancelAnimationFrame(mouseTrailState.raf);
            mouseTrailState.onMove = null; mouseTrailState.onClick = null; mouseTrailState.lastEmit = 0;
            const layer = document.getElementById('mouse-trail-layer');
            if (layer) layer.remove();
            mouseTrailState.canvas = null; mouseTrailState.onResize = null; mouseTrailState.raf = null;
        }
        function refreshMouseEffect(userName) {
            firebase.database().ref('users/' + encodeURIComponent(userName)).once('value').then(snap => {
                const d = snap.val() || {};
                const enabled = !!d.mouseEffectEnabled;
                const colorId = d.mouseEffectColor || 'auto';
                const prestige = Number(d.prestige || 0);
                const style = d.mouseEffectStyle || 'particles';
                if (enabled) {
                    stopMouseTrail();
                    startMouseTrail(colorId, prestige, style);
                } else {
                    stopMouseTrail();
                }
            });
        }
        // === Thèmes Tickets (léger, CSS only) ===
        function ensureTicketThemeStyles() {
            if (document.getElementById('ticket-theme-styles')) return;
            const st = document.createElement('style');
            st.id = 'ticket-theme-styles';
            st.innerHTML = `
            /* Scopé par classe body.gm-theme-*, appliqué uniquement sur pages Tickets */
            body.gm-theme-enabled.gm-theme-dark_plus .o_content,
            body.gm-theme-enabled.gm-theme-dark_plus .o_form_view,
            body.gm-theme-enabled.gm-theme-dark_plus .o_list_view,
            body.gm-theme-enabled.gm-theme-dark_plus .o_kanban_view { background-color: #12161c !important; }
            body.gm-theme-enabled.gm-theme-dark_plus,
            body.gm-theme-enabled.gm-theme-dark_plus .o_web_client,
            body.gm-theme-enabled.gm-theme-dark_plus .o_action_manager,
            body.gm-theme-enabled.gm-theme-dark_plus .o_action,
            body.gm-theme-enabled.gm-theme-dark_plus .o_control_panel { background-color:#11161d !important; }
            body.gm-theme-enabled.gm-theme-dark_plus .o_control_panel,
            body.gm-theme-enabled.gm-theme-dark_plus .o_cp_bottom,
            body.gm-theme-enabled.gm-theme-dark_plus .o_cp_top { border-color:#262c36 !important; background-image:none !important; background-color:#0f141a !important; }
            body.gm-theme-enabled.gm-theme-dark_plus header.o_navbar,
            body.gm-theme-enabled.gm-theme-dark_plus .o_main_navbar { background-color:#0f141a !important; border-color:#262c36 !important; }
            body.gm-theme-enabled.gm-theme-dark_plus .o_breadcrumb,
            body.gm-theme-enabled.gm-theme-dark_plus ol.breadcrumb { background-color:#11161d !important; }
            /* Barre d'état du formulaire */
            body.gm-theme-enabled.gm-theme-dark_plus .o_form_statusbar { background:#11161d !important; border-bottom:1px solid #262c36 !important; }
            /* Form view inside tickets */
            /* Vue formulaire: n’écrase pas les éléments déjà colorés inline */
            body.gm-theme-enabled.gm-theme-dark_plus .o_form_view .o_form_sheet,
            body.gm-theme-enabled.gm-theme-dark_plus .o_form_view .o_inner_group,
            body.gm-theme-enabled.gm-theme-dark_plus .o_form_view .o_group,
            body.gm-theme-enabled.gm-theme-dark_plus .o_form_view .o_notebook,
            body.gm-theme-enabled.gm-theme-dark_plus .o_form_view .o_chatter { background:#161b22 !important; color:#dfe3e8; }
            body.gm-theme-enabled.gm-theme-dark_plus .o_Chatter_container,
            body.gm-theme-enabled.gm-theme-dark_plus .o_mail_thread,
            body.gm-theme-enabled.gm-theme-dark_plus .o_thread_window,
            body.gm-theme-enabled.gm-theme-dark_plus .o_MessageList { background:#151a21 !important; }
            body.gm-theme-enabled.gm-theme-dark_plus .o_mail_thread .o_Message,
            body.gm-theme-enabled.gm-theme-dark_plus .o_attachment_box { background:#141a20 !important; }
            body.gm-theme-enabled.gm-theme-dark_plus .o_form_sheet_bg { background-color:#151a21 !important; }
            body.gm-theme-enabled.gm-theme-dark_plus .o_form_sheet_bg .o_form_sheet { background-color:#141a20 !important; border-color:#262c36 !important; }
            /* Tabs (notebook) */
            body.gm-theme-enabled.gm-theme-dark_plus .o_notebook .nav-tabs,
            body.gm-theme-enabled.gm-theme-dark_plus .o_notebook_headers .nav.nav-tabs,
            body.gm-theme-enabled.gm-theme-dark_plus ul.nav.nav-tabs.flex-row.flex-nowrap { background:#1b2028 !important; border-color:#262c36 !important; }
            body.gm-theme-enabled.gm-theme-dark_plus .o_notebook .nav-tabs .nav-link.active { background:#151a21 !important; border-color:#262c36 !important; }
            /* Onglets statuts (NOUVEAU / EN COURS / etc.) */
            body.gm-theme-enabled.gm-theme-dark_plus .o_form_statusbar .o_arrow_button,
            body.gm-theme-enabled.gm-theme-dark_plus .o_form_statusbar .btn-secondary { background-color:#1b2028 !important; border-color:#262c36 !important; }
            body.gm-theme-enabled.gm-theme-dark_plus .o_form_statusbar .o_arrow_button:hover,
            body.gm-theme-enabled.gm-theme-dark_plus .o_form_statusbar .btn-secondary:hover { background-color:#222934 !important; border-color:#2b3340 !important; }
            /* Chatter topbar */
            body.gm-theme-enabled.gm-theme-dark_plus .o_chatterTopbar { background:#151a21 !important; border-color:#262c36 !important; }
            body.gm-theme-enabled.gm-theme-dark_plus [class^="o_ChatterTopbar"],
            body.gm-theme-enabled.gm-theme-dark_plus [class*=" o_ChatterTopbar"] { background:#151a21 !important; border-color:#262c36 !important; }
            body.gm-theme-enabled.gm-theme-dark_plus [class^="o_Chatter"],
            body.gm-theme-enabled.gm-theme-dark_plus [class*=" o_Chatter"],
            body.gm-theme-enabled.gm-theme-dark_plus [class^="o_mail_thread"],
            body.gm-theme-enabled.gm-theme-dark_plus [class*=" o_mail_thread"],
            body.gm-theme-enabled.gm-theme-dark_plus [class^="o_MessageList"],
            body.gm-theme-enabled.gm-theme-dark_plus [class*=" o_MessageList"],
            body.gm-theme-enabled.gm-theme-dark_plus [class^="o_ThreadView"],
            body.gm-theme-enabled.gm-theme-dark_plus [class*=" o_ThreadView"] { background:#151a21 !important; }
            /* Group headers in list */
            body.gm-theme-enabled.gm-theme-dark_plus .o_list_renderer .o_group_header,
            body.gm-theme-enabled.gm-theme-dark_plus .o_list_renderer .o_group_has_content { background:#10141a !important; border-bottom:1px solid #262c36 !important; }
            body.gm-theme-enabled.gm-theme-dark_plus .o_form_view label,
            body.gm-theme-enabled.gm-theme-dark_plus .o_form_view .o_form_label { color:#cdd3db !important; }
            body.gm-theme-enabled.gm-theme-dark_plus .o_form_view .o_field_widget,
            body.gm-theme-enabled.gm-theme-dark_plus .o_form_view .o_field_widget input,
            body.gm-theme-enabled.gm-theme-dark_plus .o_form_view .o_field_widget textarea,
            body.gm-theme-enabled.gm-theme-dark_plus .o_form_view .o_field_widget .badge { background:#1b2028 !important; color:#e8edf2 !important; border-color:#262c36 !important; }
            body.gm-theme-enabled.gm-theme-dark_plus .o_form_view .o_statusbar_status,
            body.gm-theme-enabled.gm-theme-dark_plus .o_form_view .badge { background:#1e2530 !important; color:#dfe3e8 !important; border:1px solid #26e0ce33; }
            body.gm-theme-enabled.gm-theme-dark_plus .o_list_view table,
            body.gm-theme-enabled.gm-theme-dark_plus .o_list_view .table,
            body.gm-theme-enabled.gm-theme-dark_plus .o_list_view .o_list_table { background-color:#161b22 !important; color:#dfe3e8; }
            body.gm-theme-enabled.gm-theme-dark_plus .o_list_view thead th,
            body.gm-theme-enabled.gm-theme-dark_plus .o_list_view .o_list_table thead th { background:#1b2028 !important; color:#cdd3db; border-color:#262c36 !important; }
            body.gm-theme-enabled.gm-theme-dark_plus .o_list_view tbody tr,
            body.gm-theme-enabled.gm-theme-dark_plus .o_list_view .o_data_row { border-color:#262c36 !important; background-color:#151a21 !important; }
            body.gm-theme-enabled.gm-theme-dark_plus .o_list_view tbody tr:hover,
            body.gm-theme-enabled.gm-theme-dark_plus .o_list_view .o_data_row:hover { background:#1c2430 !important; }
            /* Zone corps liste: fond gris-noir. Important uniquement sur tbody pour laisser les scripts sur tr/td dominer. */
            body.gm-theme-enabled.gm-theme-dark_plus .o_list_view .o_list_table tbody { background-color:#0f1116 !important; }
            body.gm-theme-enabled.gm-theme-dark_plus .o_list_view .o_list_table tbody tr:not([style*="background"]) { background-color:#0f1116; }
            body.gm-theme-enabled.gm-theme-dark_plus .o_list_view .o_list_table tbody tr:not([style*="background"]):hover { background-color:#161b22; }
            body.gm-theme-enabled.gm-theme-dark_plus .o_list_view .table-striped > tbody > tr:nth-of-type(odd) { background-color:#10141a; }
            body.gm-theme-enabled.gm-theme-dark_plus .o_list_view .o_group_header { background-color:#10141a !important; }
            /* Lignes de tickets à l'intérieur des groupes */
            body.gm-theme-enabled.gm-theme-dark_plus .o_list_view .o_list_table tbody tr.o_data_row > td { background:#151a21 !important; background-image:none !important; border-top-color:#262c36 !important; }
            body.gm-theme-enabled.gm-theme-dark_plus .o_list_view .o_list_table tbody tr.o_data_row:hover > td { background:#1c2430 !important; }
            body.gm-theme-enabled.gm-theme-dark_plus .o_list_view.table-striped > tbody > tr.o_data_row:nth-of-type(odd) > td { background:#10141a !important; }
            /* Group headers (Logiciel / Matériel / RMA-SAV...) – force full-row style */
            body.gm-theme-enabled.gm-theme-dark_plus .o_list_view .o_list_table tr.o_group_header,
            body.gm-theme-enabled.gm-theme-dark_plus .o_list_view .o_list_table tr.o_group_has_content { background-color:#10141a !important; }
            body.gm-theme-enabled.gm-theme-dark_plus .o_list_view .o_list_table tr.o_group_header > th,
            body.gm-theme-enabled.gm-theme-dark_plus .o_list_view .o_list_table tr.o_group_header > td,
            body.gm-theme-enabled.gm-theme-dark_plus .o_list_view .o_list_table tr.o_group_has_content > th,
            body.gm-theme-enabled.gm-theme-dark_plus .o_list_view .o_list_table tr.o_group_has_content > td {
                background-color:#10141a !important; color:#e6edf3 !important; border-top:1px solid #262c36 !important; border-bottom:1px solid #262c36 !important;
            }
            body.gm-theme-enabled.gm-theme-dark_plus .o_list_view .o_list_table tr.o_group_header .o_group_name,
            body.gm-theme-enabled.gm-theme-dark_plus .o_list_view .o_list_table tr.o_group_has_content .o_group_name { color:#e6edf3 !important; font-weight:700; }
            /* Appliquer sur chaque tr (toutes classes usuelles) tout en respectant les styles inline */
            body.gm-theme-enabled.gm-theme-dark_plus .o_list_view .o_list_table tbody tr.o_data_row:not([style*="background"]) { background-color:#0f1116; border-top-color:#262c36; border-bottom-color:#262c36; }
            body.gm-theme-enabled.gm-theme-dark_plus .o_list_view .o_list_table tbody tr.o_group_header:not([style*="background"]) { background-color:#10141a; }
            body.gm-theme-enabled.gm-theme-dark_plus .o_list_view .o_list_table tbody tr.o_group_has_content:not([style*="background"]) { background-color:#10141a; }
            body.gm-theme-enabled.gm-theme-dark_plus .o_list_view .o_list_table tbody tr.o_list_footer:not([style*="background"]) { background-color:#0f1116; }
            /* Boutons (ne pas toucher à la couleur du texte) */
            /* Boutons secondaires (ex: Enregistrer une note interne, Activités, onglets statuts) */
            body.gm-theme-enabled.gm-theme-dark_plus .o_control_panel .btn:not(.btn-primary):not(.btn-danger):not(.btn-success):not(.o_cp_buttons .btn),
            body.gm-theme-enabled.gm-theme-dark_plus .o_form_statusbar .btn,
            body.gm-theme-enabled.gm-theme-dark_plus .o_statusbar_status .btn,
            body.gm-theme-enabled.gm-theme-dark_plus .o_statusbar_buttons .btn:not(.o_cp_buttons .btn),
            body.gm-theme-enabled.gm-theme-dark_plus .o_cp_pager .btn,
            body.gm-theme-enabled.gm-theme-dark_plus .o_pager .btn,
            body.gm-theme-enabled.gm-theme-dark_plus .btn-group .btn { background-color:#1b2028 !important; border-color:#262c36 !important; }
            body.gm-theme-enabled.gm-theme-dark_plus .o_control_panel .btn:hover,
            body.gm-theme-enabled.gm-theme-dark_plus .o_form_statusbar .btn:hover,
            body.gm-theme-enabled.gm-theme-dark_plus .o_statusbar_status .btn:hover,
            body.gm-theme-enabled.gm-theme-dark_plus .o_statusbar_buttons .btn:hover,
            body.gm-theme-enabled.gm-theme-dark_plus .o_cp_pager .btn:hover,
            body.gm-theme-enabled.gm-theme-dark_plus .o_pager .btn:hover,
            body.gm-theme-enabled.gm-theme-dark_plus .btn-group .btn:hover { background-color:#222934 !important; border-color:#2b3340 !important; }
            body.gm-theme-enabled.gm-theme-dark_plus .o_control_panel .btn:active,
            body.gm-theme-enabled.gm-theme-dark_plus .o_form_statusbar .btn:active,
            body.gm-theme-enabled.gm-theme-dark_plus .o_statusbar_status .btn:active,
            body.gm-theme-enabled.gm-theme-dark_plus .o_statusbar_buttons .btn:active,
            body.gm-theme-enabled.gm-theme-dark_plus .o_cp_pager .btn:active,
            body.gm-theme-enabled.gm-theme-dark_plus .o_pager .btn:active,
            body.gm-theme-enabled.gm-theme-dark_plus .btn-group .btn:active { background-color:#11161d !important; border-color:#262c36 !important; }
            /* Ne pas toucher aux trois boutons principaux (Traiter / Clôturer / Créer) */
            body.gm-theme-enabled.gm-theme-dark_plus .o_control_panel .o_cp_buttons .btn { background-color: revert !important; border-color: revert !important; }
            body.gm-theme-enabled.gm-theme-dark_plus .o_list_view .o_data_cell,
            body.gm-theme-enabled.gm-theme-dark_plus .o_list_view .o_data_cell a { color:inherit !important; }
            body.gm-theme-enabled.gm-theme-dark_plus .o_list_view .o_status,
            body.gm-theme-enabled.gm-theme-dark_plus .o_list_view .badge { filter:none; }
            body.gm-theme-enabled.gm-theme-dark_plus .btn-primary { background:linear-gradient(90deg,#26e0ce,#209cff) !important; border:none !important; color:#fff !important; }
            body.gm-theme-enabled.gm-theme-dark_plus .badge, body.gm-theme-enabled.gm-theme-dark_plus .o_tag { background:#1e2530 !important; color:#dfe3e8 !important; border:1px solid #26e0ce33; }
            body.gm-theme-enabled.gm-theme-dark_plus .o_kanban_view .o_kanban_record { background:#161b22 !important; border:1px solid #262c36 !important; box-shadow: 0 6px 16px rgba(0,0,0,0.25); }

            body.gm-theme-enabled.gm-theme-redblack .o_content,
            body.gm-theme-enabled.gm-theme-redblack .o_form_view,
            body.gm-theme-enabled.gm-theme-redblack .o_list_view,
            body.gm-theme-enabled.gm-theme-redblack .o_kanban_view { background-color: #0a0a0a !important; }
            body.gm-theme-enabled.gm-theme-redblack,
            body.gm-theme-enabled.gm-theme-redblack .o_web_client,
            body.gm-theme-enabled.gm-theme-redblack .o_action_manager,
            body.gm-theme-enabled.gm-theme-redblack .o_action,
            body.gm-theme-enabled.gm-theme-redblack .o_control_panel { background-color:#0b0b0b !important; }
            body.gm-theme-enabled.gm-theme-redblack .o_control_panel,
            body.gm-theme-enabled.gm-theme-redblack .o_cp_bottom,
            body.gm-theme-enabled.gm-theme-redblack .o_cp_top { border-color:#1a1a1a !important; background-image:none !important; background-color:#0b0b0b !important; }
            body.gm-theme-enabled.gm-theme-redblack header.o_navbar,
            body.gm-theme-enabled.gm-theme-redblack .o_main_navbar { background-color:#0b0b0b !important; border-color:#1a1a1a !important; }
            body.gm-theme-enabled.gm-theme-redblack .o_breadcrumb,
            body.gm-theme-enabled.gm-theme-redblack ol.breadcrumb { background-color:#0f0f0f !important; }
            /* Barre d'état du formulaire */
            body.gm-theme-enabled.gm-theme-redblack .o_form_statusbar { background:#0b0b0b !important; border-bottom:1px solid #1a1a1a !important; }
            /* Form view inside tickets */
            body.gm-theme-enabled.gm-theme-redblack .o_form_view .o_form_sheet,
            body.gm-theme-enabled.gm-theme-redblack .o_form_view .o_inner_group,
            body.gm-theme-enabled.gm-theme-redblack .o_form_view .o_group,
            body.gm-theme-enabled.gm-theme-redblack .o_form_view .o_notebook,
            body.gm-theme-enabled.gm-theme-redblack .o_form_view .o_chatter { background:#0f0f0f !important; color:#f0f0f0; }
            body.gm-theme-enabled.gm-theme-redblack .o_Chatter_container,
            body.gm-theme-enabled.gm-theme-redblack .o_mail_thread,
            body.gm-theme-enabled.gm-theme-redblack .o_thread_window,
            body.gm-theme-enabled.gm-theme-redblack .o_MessageList { background:#101010 !important; }
            body.gm-theme-enabled.gm-theme-redblack .o_mail_thread .o_Message,
            body.gm-theme-enabled.gm-theme-redblack .o_attachment_box { background:#0f0f0f !important; }
            body.gm-theme-enabled.gm-theme-redblack .o_form_sheet_bg { background-color:#0e0e0e !important; }
            body.gm-theme-enabled.gm-theme-redblack .o_form_sheet_bg .o_form_sheet { background-color:#0f0f0f !important; border-color:#1a1a1a !important; }
            /* Tabs (notebook) */
            body.gm-theme-enabled.gm-theme-redblack .o_notebook .nav-tabs,
            body.gm-theme-enabled.gm-theme-redblack .o_notebook_headers .nav.nav-tabs,
            body.gm-theme-enabled.gm-theme-redblack ul.nav.nav-tabs.flex-row.flex-nowrap { background:#121212 !important; border-color:#1a1a1a !important; }
            body.gm-theme-enabled.gm-theme-redblack .o_notebook .nav-tabs .nav-link.active { background:#0f0f0f !important; border-color:#1a1a1a !important; }
            /* Onglets statuts (NOUVEAU / EN COURS / etc.) — plus lisibles */
            body.gm-theme-enabled.gm-theme-redblack .o_form_statusbar .o_arrow_button,
            body.gm-theme-enabled.gm-theme-redblack .o_form_statusbar .btn-secondary { background-color:#161616 !important; border-color:#232323 !important; box-shadow: 0 0 0 1px rgba(255,255,255,0.04) inset; }
            body.gm-theme-enabled.gm-theme-redblack .o_form_statusbar .o_arrow_button:hover,
            body.gm-theme-enabled.gm-theme-redblack .o_form_statusbar .btn-secondary:hover { background-color:#1b1b1b !important; border-color:#282828 !important; }
            /* Statusbar: boutons d'état (sélecteurs plus spécifiques) */
            body.gm-theme-enabled.gm-theme-redblack .o_form_statusbar .o_statusbar_status > .btn { background-color:#161616 !important; border-color:#232323 !important; }
            body.gm-theme-enabled.gm-theme-redblack .o_form_statusbar .o_statusbar_status > .btn:hover { background-color:#1b1b1b !important; border-color:#282828 !important; }
            /* Actions à droite (ex: Enregistrer une note interne / Activités) */
            body.gm-theme-enabled.gm-theme-redblack .o_control_panel .o_cp_right .btn:not(.btn-primary):not(.btn-danger):not(.btn-success) { background-color:#161616 !important; border-color:#232323 !important; box-shadow: 0 0 0 1px rgba(255,255,255,0.04) inset; }
            body.gm-theme-enabled.gm-theme-redblack .o_control_panel .o_cp_right .btn:not(.btn-primary):not(.btn-danger):not(.btn-success):hover { background-color:#1b1b1b !important; border-color:#282828 !important; }
            /* Chatter topbar */
            body.gm-theme-enabled.gm-theme-redblack .o_chatterTopbar { background:#101010 !important; border-color:#1a1a1a !important; }
            body.gm-theme-enabled.gm-theme-redblack [class^="o_ChatterTopbar"],
            body.gm-theme-enabled.gm-theme-redblack [class*=" o_ChatterTopbar"] { background:#101010 !important; border-color:#1a1a1a !important; }
            body.gm-theme-enabled.gm-theme-redblack [class^="o_Chatter"],
            body.gm-theme-enabled.gm-theme-redblack [class*=" o_Chatter"],
            body.gm-theme-enabled.gm-theme-redblack [class^="o_mail_thread"],
            body.gm-theme-enabled.gm-theme-redblack [class*=" o_mail_thread"],
            body.gm-theme-enabled.gm-theme-redblack [class^="o_MessageList"],
            body.gm-theme-enabled.gm-theme-redblack [class*=" o_MessageList"],
            body.gm-theme-enabled.gm-theme-redblack [class^="o_ThreadView"],
            body.gm-theme-enabled.gm-theme-redblack [class*=" o_ThreadView"] { background:#0f0f0f !important; }
            /* Group headers in list */
            body.gm-theme-enabled.gm-theme-redblack .o_list_renderer .o_group_header,
            body.gm-theme-enabled.gm-theme-redblack .o_list_renderer .o_group_has_content { background:#111111 !important; border-bottom:1px solid #1a1a1a !important; }
            body.gm-theme-enabled.gm-theme-redblack .o_form_view label,
            body.gm-theme-enabled.gm-theme-redblack .o_form_view .o_form_label { color:#f5f5f5 !important; }
            body.gm-theme-enabled.gm-theme-redblack .o_form_view .o_field_widget,
            body.gm-theme-enabled.gm-theme-redblack .o_form_view .o_field_widget input,
            body.gm-theme-enabled.gm-theme-redblack .o_form_view .o_field_widget textarea,
            body.gm-theme-enabled.gm-theme-redblack .o_form_view .o_field_widget .badge { background:#151515 !important; color:#f0f0f0 !important; border-color:#1a1a1a !important; }
            body.gm-theme-enabled.gm-theme-redblack .o_form_view .o_statusbar_status,
            body.gm-theme-enabled.gm-theme-redblack .o_form_view .badge { background:#161111 !important; color:#ffbaba !important; border:1px solid #ff1a1a44; }
            body.gm-theme-enabled.gm-theme-redblack .o_list_view table,
            body.gm-theme-enabled.gm-theme-redblack .o_list_view .table,
            body.gm-theme-enabled.gm-theme-redblack .o_list_view .o_list_table { background-color:#0f0f0f !important; color:#f0f0f0; }
            body.gm-theme-enabled.gm-theme-redblack .o_list_view thead th,
            body.gm-theme-enabled.gm-theme-redblack .o_list_view .o_list_table thead th { background:#151515 !important; color:#f5f5f5; border-color:#1f1f1f !important; }
            body.gm-theme-enabled.gm-theme-redblack .o_list_view tbody tr,
            body.gm-theme-enabled.gm-theme-redblack .o_list_view .o_data_row { border-color:#1a1a1a !important; background-color:#0f0f10 !important; }
            body.gm-theme-enabled.gm-theme-redblack .o_list_view tbody tr:hover,
            body.gm-theme-enabled.gm-theme-redblack .o_list_view .o_data_row:hover { background:#151115 !important; }
            /* Zone corps liste: fond sombre. Important uniquement sur tbody pour laisser les scripts sur tr/td dominer. */
            body.gm-theme-enabled.gm-theme-redblack .o_list_view .o_list_table tbody { background-color:#101010 !important; }
            body.gm-theme-enabled.gm-theme-redblack .o_list_view .o_list_table tbody tr:not([style*="background"]) { background-color:#101010; }
            body.gm-theme-enabled.gm-theme-redblack .o_list_view .o_list_table tbody tr:not([style*="background"]):hover { background-color:#130a0a; }
            body.gm-theme-enabled.gm-theme-redblack .o_list_view .table-striped > tbody > tr:nth-of-type(odd) { background-color:#111111; }
            body.gm-theme-enabled.gm-theme-redblack .o_list_view .o_group_header { background-color:#111111 !important; }
            /* Lignes de tickets à l'intérieur des groupes */
            body.gm-theme-enabled.gm-theme-redblack .o_list_view .o_list_table tbody tr.o_data_row > td { background:#0f0f10 !important; background-image:none !important; border-top-color:#1a1a1a !important; }
            body.gm-theme-enabled.gm-theme-redblack .o_list_view .o_list_table tbody tr.o_data_row:hover > td { background:#151115 !important; }
            body.gm-theme-enabled.gm-theme-redblack .o_list_view.table-striped > tbody > tr.o_data_row:nth-of-type(odd) > td { background:#111111 !important; }
            /* Group headers (Logiciel / Matériel / RMA-SAV...) – force full-row style */
            body.gm-theme-enabled.gm-theme-redblack .o_list_view .o_list_table tr.o_group_header,
            body.gm-theme-enabled.gm-theme-redblack .o_list_view .o_list_table tr.o_group_has_content { background-color:#111111 !important; }
            body.gm-theme-enabled.gm-theme-redblack .o_list_view .o_list_table tr.o_group_header > th,
            body.gm-theme-enabled.gm-theme-redblack .o_list_view .o_list_table tr.o_group_header > td,
            body.gm-theme-enabled.gm-theme-redblack .o_list_view .o_list_table tr.o_group_has_content > th,
            body.gm-theme-enabled.gm-theme-redblack .o_list_view .o_list_table tr.o_group_has_content > td {
                background-color:#111111 !important; color:#eaeef2 !important; border-top:1px solid #1a1a1a !important; border-bottom:1px solid #1a1a1a !important;
            }
            body.gm-theme-enabled.gm-theme-redblack .o_list_view .o_list_table tr.o_group_header .o_group_name,
            body.gm-theme-enabled.gm-theme-redblack .o_list_view .o_list_table tr.o_group_has_content .o_group_name { color:#eaeef2 !important; font-weight:700; }
            /* Appliquer sur chaque tr (toutes classes usuelles) tout en respectant les styles inline */
            body.gm-theme-enabled.gm-theme-redblack .o_list_view .o_list_table tbody tr.o_data_row:not([style*="background"]) { background-color:#101010; border-top-color:#1a1a1a; border-bottom-color:#1a1a1a; }
            body.gm-theme-enabled.gm-theme-redblack .o_list_view .o_list_table tbody tr.o_group_header:not([style*="background"]) { background-color:#111111; }
            body.gm-theme-enabled.gm-theme-redblack .o_list_view .o_list_table tbody tr.o_group_has_content:not([style*="background"]) { background-color:#111111; }
            body.gm-theme-enabled.gm-theme-redblack .o_list_view .o_list_table tbody tr.o_list_footer:not([style*="background"]) { background-color:#101010; }
            /* Boutons (ne pas toucher à la couleur du texte) */
            body.gm-theme-enabled.gm-theme-redblack .o_control_panel .btn:not(.btn-primary):not(.btn-danger):not(.btn-success),
            body.gm-theme-enabled.gm-theme-redblack .o_form_statusbar .btn,
            body.gm-theme-enabled.gm-theme-redblack .o_statusbar_status .btn,
            body.gm-theme-enabled.gm-theme-redblack .o_statusbar_buttons .btn,
            body.gm-theme-enabled.gm-theme-redblack .o_cp_pager .btn,
            body.gm-theme-enabled.gm-theme-redblack .o_pager .btn,
            body.gm-theme-enabled.gm-theme-redblack .btn-group .btn { background-color:#141414 !important; border-color:#1f1f1f !important; }
            body.gm-theme-enabled.gm-theme-redblack .o_control_panel .btn:hover,
            body.gm-theme-enabled.gm-theme-redblack .o_form_statusbar .btn:hover,
            body.gm-theme-enabled.gm-theme-redblack .o_statusbar_status .btn:hover,
            body.gm-theme-enabled.gm-theme-redblack .o_statusbar_buttons .btn:hover,
            body.gm-theme-enabled.gm-theme-redblack .o_cp_pager .btn:hover,
            body.gm-theme-enabled.gm-theme-redblack .o_pager .btn:hover,
            body.gm-theme-enabled.gm-theme-redblack .btn-group .btn:hover { background-color:#191919 !important; border-color:#242424 !important; }
            body.gm-theme-enabled.gm-theme-redblack .o_control_panel .btn:active,
            body.gm-theme-enabled.gm-theme-redblack .o_form_statusbar .btn:active,
            body.gm-theme-enabled.gm-theme-redblack .o_statusbar_status .btn:active,
            body.gm-theme-enabled.gm-theme-redblack .o_statusbar_buttons .btn:active,
            body.gm-theme-enabled.gm-theme-redblack .o_cp_pager .btn:active,
            body.gm-theme-enabled.gm-theme-redblack .o_pager .btn:active,
            body.gm-theme-enabled.gm-theme-redblack .btn-group .btn:active { background-color:#0f0f0f !important; border-color:#1a1a1a !important; }
            /* Ne pas toucher aux trois boutons principaux (Traiter / Clôturer / Créer) */
            body.gm-theme-enabled.gm-theme-redblack .o_control_panel .o_cp_buttons .btn { background-color: revert !important; border-color: revert !important; }
            body.gm-theme-enabled.gm-theme-redblack .o_list_view .o_data_cell,
            body.gm-theme-enabled.gm-theme-redblack .o_list_view .o_data_cell a { color:inherit !important; }
            body.gm-theme-enabled.gm-theme-redblack .btn-primary { background:linear-gradient(90deg,#ff1a1a,#7a0000) !important; border:none !important; color:#fff !important; box-shadow:0 0 16px #ff1a1a44; }
            body.gm-theme-enabled.gm-theme-redblack .badge, body.gm-theme-enabled.gm-theme-redblack .o_tag { background:#161111 !important; color:#ffbaba !important; border:1px solid #ff1a1a44; }
            body.gm-theme-enabled.gm-theme-redblack .o_kanban_view .o_kanban_record { background:#0f0f0f !important; border:1px solid #1a1a1a !important; box-shadow: 0 6px 18px rgba(255,26,26,0.08); }

            /* === Thème Bleu === */
            body.gm-theme-enabled.gm-theme-blue .o_content,
            body.gm-theme-enabled.gm-theme-blue .o_form_view,
            body.gm-theme-enabled.gm-theme-blue .o_list_view,
            body.gm-theme-enabled.gm-theme-blue .o_kanban_view { background-color:#0a0d12 !important; }
            body.gm-theme-enabled.gm-theme-blue,
            body.gm-theme-enabled.gm-theme-blue .o_web_client,
            body.gm-theme-enabled.gm-theme-blue .o_action_manager,
            body.gm-theme-enabled.gm-theme-blue .o_action,
            body.gm-theme-enabled.gm-theme-blue .o_control_panel { background-color:#0b0f14 !important; }
            body.gm-theme-enabled.gm-theme-blue .o_control_panel,
            body.gm-theme-enabled.gm-theme-blue .o_cp_bottom,
            body.gm-theme-enabled.gm-theme-blue .o_cp_top { border-color:#162232 !important; background-image:none !important; background-color:#0b0f14 !important; }
            body.gm-theme-enabled.gm-theme-blue header.o_navbar,
            body.gm-theme-enabled.gm-theme-blue .o_main_navbar { background-color:#0b0f14 !important; border-color:#162232 !important; }
            body.gm-theme-enabled.gm-theme-blue .o_breadcrumb,
            body.gm-theme-enabled.gm-theme-blue ol.breadcrumb { background-color:#0e131a !important; }
            body.gm-theme-enabled.gm-theme-blue .o_form_statusbar { background:#0b0f14 !important; border-bottom:1px solid #162232 !important; }
            body.gm-theme-enabled.gm-theme-blue .o_form_view .o_form_sheet,
            body.gm-theme-enabled.gm-theme-blue .o_form_view .o_inner_group,
            body.gm-theme-enabled.gm-theme-blue .o_form_view .o_group,
            body.gm-theme-enabled.gm-theme-blue .o_form_view .o_notebook,
            body.gm-theme-enabled.gm-theme-blue .o_form_view .o_chatter { background:#0f141b !important; color:#e6edf3; }
            body.gm-theme-enabled.gm-theme-blue .o_Chatter_container,
            body.gm-theme-enabled.gm-theme-blue .o_mail_thread,
            body.gm-theme-enabled.gm-theme-blue .o_thread_window,
            body.gm-theme-enabled.gm-theme-blue .o_MessageList { background:#0f141b !important; }
            body.gm-theme-enabled.gm-theme-blue .o_form_sheet_bg { background-color:#0e1218 !important; }
            body.gm-theme-enabled.gm-theme-blue .o_form_sheet_bg .o_form_sheet { background-color:#0f141b !important; border-color:#162232 !important; }
            body.gm-theme-enabled.gm-theme-blue .o_notebook .nav-tabs,
            body.gm-theme-enabled.gm-theme-blue .o_notebook_headers .nav.nav-tabs,
            body.gm-theme-enabled.gm-theme-blue ul.nav.nav-tabs.flex-row.flex-nowrap { background:#101826 !important; border-color:#162232 !important; }
            body.gm-theme-enabled.gm-theme-blue .o_notebook .nav-tabs .nav-link.active { background:#0f141b !important; border-color:#162232 !important; }
            body.gm-theme-enabled.gm-theme-blue .o_list_view .o_list_table { background-color:#0f141b !important; color:#e6edf3; }
            body.gm-theme-enabled.gm-theme-blue .o_list_view thead th,
            body.gm-theme-enabled.gm-theme-blue .o_list_view .o_list_table thead th { background:#101826 !important; color:#cdd3db; border-color:#162232 !important; }
            body.gm-theme-enabled.gm-theme-blue .o_list_view tbody tr,
            body.gm-theme-enabled.gm-theme-blue .o_list_view .o_data_row { border-color:#162232 !important; background-color:#0f141b !important; }
            body.gm-theme-enabled.gm-theme-blue .o_list_view tbody tr:hover,
            body.gm-theme-enabled.gm-theme-blue .o_list_view .o_data_row:hover { background:#152031 !important; }
            body.gm-theme-enabled.gm-theme-blue .o_list_view .o_list_table tbody { background-color:#0b0f14 !important; }
            body.gm-theme-enabled.gm-theme-blue .o_list_view .o_list_table tbody tr:not([style*="background"]) { background-color:#0b0f14; }
            body.gm-theme-enabled.gm-theme-blue .o_list_view .o_list_table tbody tr:not([style*="background"]):hover { background-color:#152031; }
            body.gm-theme-enabled.gm-theme-blue .o_list_view .table-striped > tbody > tr:nth-of-type(odd) { background-color:#0e131a; }
            body.gm-theme-enabled.gm-theme-blue .o_list_view .o_group_header { background-color:#0e131a !important; }
            body.gm-theme-enabled.gm-theme-blue .o_list_view .o_list_table tbody tr.o_data_row > td { background:#0f141b !important; background-image:none !important; border-top-color:#162232 !important; }
            body.gm-theme-enabled.gm-theme-blue .o_list_view .o_list_table tbody tr.o_data_row:hover > td { background:#152031 !important; }
            body.gm-theme-enabled.gm-theme-blue .o_list_view.table-striped > tbody > tr.o_data_row:nth-of-type(odd) > td { background:#0e131a !important; }
            /* Stat boutons */
            body.gm-theme-enabled.gm-theme-blue .o_stat_buttons .o_stat_button,
            body.gm-theme-enabled.gm-theme-blue .o_button_box .btn.btn-light,
            body.gm-theme-enabled.gm-theme-blue button.oe_stat_button,
            body.gm-theme-enabled.gm-theme-blue button.oe_stat_button.btn-light { background:#101826 !important; border-color:#162232 !important; color:#e6edf3 !important; }
            body.gm-theme-enabled.gm-theme-blue .o_stat_buttons .o_stat_button:hover,
            body.gm-theme-enabled.gm-theme-blue .o_button_box .btn.btn-light:hover,
            body.gm-theme-enabled.gm-theme-blue button.oe_stat_button:hover,
            body.gm-theme-enabled.gm-theme-blue button.oe_stat_button.btn-light:hover { background:#152031 !important; border-color:#1f354e !important; color:#ffffff !important; }
            /* Blue surcouches: boutons droits, sélection, texte */
            body.gm-theme-enabled.gm-theme-blue .o_form_statusbar_buttons .btn { background-color: revert !important; border-color: revert !important; color: revert !important; box-shadow: revert !important; filter: revert !important; }
            body.gm-theme-enabled.gm-theme-blue .o_list_view .o_list_table tbody tr.o_data_row.o_selected { background-color:#162031 !important; color:#e6edf3 !important; }
            body.gm-theme-enabled.gm-theme-blue .o_form_statusbar_buttons .btn,
            body.gm-theme-enabled.gm-theme-blue .o_form_statusbar .o_statusbar_status > .btn,
            body.gm-theme-enabled.gm-theme-blue #btn-traiter-appel { color:#ffffff !important; }
            body.gm-theme-enabled.gm-theme-blue .o_form_statusbar_buttons button.btn.btn-danger,
            body.gm-theme-enabled.gm-theme-blue .o_form_statusbar .o_statusbar_status > button.btn.btn-danger,
            body.gm-theme-enabled.gm-theme-blue .o_form_statusbar_buttons button.btn.btn-danger span,
            body.gm-theme-enabled.gm-theme-blue .o_form_statusbar .o_statusbar_status > button.btn.btn-danger span { color:#ff4d4f !important; }
            body.gm-theme-enabled.gm-theme-blue #btn-creer-ticket,
            body.gm-theme-enabled.gm-theme-blue #btn-creer-ticket span { color:#ffffff !important; }
            /* Blue: chatter topbar et sections mail */
            body.gm-theme-enabled.gm-theme-blue .o_chatterTopbar { background:#0f141b !important; border-color:#162232 !important; }
            body.gm-theme-enabled.gm-theme-blue [class^="o_ChatterTopbar"],
            body.gm-theme-enabled.gm-theme-blue [class*=" o_ChatterTopbar"] { background:#0f141b !important; border-color:#162232 !important; }
            body.gm-theme-enabled.gm-theme-blue .o_ChatterTopbar_button,
            body.gm-theme-enabled.gm-theme-blue [class^="o_ChatterTopbar"] .btn { color:#ffffff !important; }
            body.gm-theme-enabled.gm-theme-blue [class^="o_Chatter"],
            body.gm-theme-enabled.gm-theme-blue [class*=" o_Chatter"],
            body.gm-theme-enabled.gm-theme-blue [class^="o_mail_thread"],
            body.gm-theme-enabled.gm-theme-blue [class*=" o_mail_thread"],
            body.gm-theme-enabled.gm-theme-blue [class^="o_MessageList"],
            body.gm-theme-enabled.gm-theme-blue [class*=" o_MessageList"],
            body.gm-theme-enabled.gm-theme-blue [class^="o_ThreadView"],
            body.gm-theme-enabled.gm-theme-blue [class*=" o_ThreadView"] { background:#0f141b !important; }
            body.gm-theme-enabled.gm-theme-blue .o_mail_thread .o_Message,
            body.gm-theme-enabled.gm-theme-blue .o_attachment_box { background:#101826 !important; border-color:#162232 !important; color:#e6edf3 !important; }
            /* Blue: labels & widgets */
            body.gm-theme-enabled.gm-theme-blue .o_form_view label,
            body.gm-theme-enabled.gm-theme-blue .o_form_view .o_form_label { color:#cdd3db !important; }
            body.gm-theme-enabled.gm-theme-blue .o_form_view .o_field_widget,
            body.gm-theme-enabled.gm-theme-blue .o_form_view .o_field_widget input,
            body.gm-theme-enabled.gm-theme-blue .o_form_view .o_field_widget textarea,
            body.gm-theme-enabled.gm-theme-blue .o_form_view .o_field_widget .badge { background:#101826 !important; color:#e6edf3 !important; border-color:#162232 !important; }
            body.gm-theme-enabled.gm-theme-blue .o_form_view .o_statusbar_status,
            body.gm-theme-enabled.gm-theme-blue .o_form_view .badge { background:#101826 !important; color:#e6edf3 !important; border:1px solid #162232 !important; }
            /* Blue: group headers renderer */
            body.gm-theme-enabled.gm-theme-blue .o_list_renderer .o_group_header,
            body.gm-theme-enabled.gm-theme-blue .o_list_renderer .o_group_has_content { background:#0e131a !important; border-bottom:1px solid #162232 !important; }
            /* Blue: liens et badges */
            body.gm-theme-enabled.gm-theme-blue .o_list_view .o_data_cell,
            body.gm-theme-enabled.gm-theme-blue .o_list_view .o_data_cell a { color:inherit !important; }
            body.gm-theme-enabled.gm-theme-blue .btn-primary { background:linear-gradient(90deg,#26e0ce,#209cff) !important; border:none !important; color:#fff !important; }
            body.gm-theme-enabled.gm-theme-blue .badge, body.gm-theme-enabled.gm-theme-blue .o_tag { background:#121a27 !important; color:#e6edf3 !important; border:1px solid #162232; }
            body.gm-theme-enabled.gm-theme-blue .o_kanban_view .o_kanban_record { background:#0f141b !important; border:1px solid #162232 !important; box-shadow: 0 6px 18px rgba(32,156,255,0.08); }
            /* Blue: boutons génériques (hors prim/danger/success) */
            body.gm-theme-enabled.gm-theme-blue .o_control_panel .btn:not(.btn-primary):not(.btn-danger):not(.btn-success):not(.o_cp_buttons .btn),
            body.gm-theme-enabled.gm-theme-blue .o_form_statusbar .btn,
            body.gm-theme-enabled.gm-theme-blue .o_statusbar_status .btn,
            body.gm-theme-enabled.gm-theme-blue .o_statusbar_buttons .btn:not(.o_cp_buttons .btn),
            body.gm-theme-enabled.gm-theme-blue .o_cp_pager .btn,
            body.gm-theme-enabled.gm-theme-blue .o_pager .btn,
            body.gm-theme-enabled.gm-theme-blue .btn-group .btn { background-color:#101826 !important; border-color:#162232 !important; }
            body.gm-theme-enabled.gm-theme-blue .o_control_panel .btn:hover,
            body.gm-theme-enabled.gm-theme-blue .o_form_statusbar .btn:hover,
            body.gm-theme-enabled.gm-theme-blue .o_statusbar_status .btn:hover,
            body.gm-theme-enabled.gm-theme-blue .o_statusbar_buttons .btn:hover,
            body.gm-theme-enabled.gm-theme-blue .o_cp_pager .btn:hover,
            body.gm-theme-enabled.gm-theme-blue .o_pager .btn:hover,
            body.gm-theme-enabled.gm-theme-blue .btn-group .btn:hover { background-color:#152031 !important; border-color:#1f354e !important; }
            body.gm-theme-enabled.gm-theme-blue .o_control_panel .btn:active,
            body.gm-theme-enabled.gm-theme-blue .o_form_statusbar .btn:active,
            body.gm-theme-enabled.gm-theme-blue .o_statusbar_status .btn:active,
            body.gm-theme-enabled.gm-theme-blue .o_statusbar_buttons .btn:active,
            body.gm-theme-enabled.gm-theme-blue .o_cp_pager .btn:active,
            body.gm-theme-enabled.gm-theme-blue .o_pager .btn:active,
            body.gm-theme-enabled.gm-theme-blue .btn-group .btn:active { background-color:#0b0f14 !important; border-color:#162232 !important; }
            /* Blue: statusbar onglets (flèches & secondaires) */
            body.gm-theme-enabled.gm-theme-blue .o_form_statusbar .o_arrow_button,
            body.gm-theme-enabled.gm-theme-blue .o_form_statusbar .btn-secondary { background-color:#101826 !important; border-color:#162232 !important; box-shadow: 0 0 0 1px #16223226 inset; }
            body.gm-theme-enabled.gm-theme-blue .o_form_statusbar .o_arrow_button:hover,
            body.gm-theme-enabled.gm-theme-blue .o_form_statusbar .btn-secondary:hover { background-color:#152031 !important; border-color:#1f354e !important; }
            /* Blue: ne pas toucher aux 3 boutons principaux */
            body.gm-theme-enabled.gm-theme-blue .o_control_panel .o_cp_buttons .btn { background-color: revert !important; border-color: revert !important; }
            /* Blue: appliquer sur chaque tr (respect inline) */
            body.gm-theme-enabled.gm-theme-blue .o_list_view .o_list_table tbody tr.o_data_row:not([style*="background"]) { background-color:#0b0f14; border-top-color:#162232; border-bottom-color:#162232; }
            body.gm-theme-enabled.gm-theme-blue .o_list_view .o_list_table tbody tr.o_group_header:not([style*="background"]) { background-color:#0e131a; }
            body.gm-theme-enabled.gm-theme-blue .o_list_view .o_list_table tbody tr.o_group_has_content:not([style*="background"]) { background-color:#0e131a; }
            body.gm-theme-enabled.gm-theme-blue .o_list_view .o_list_table tbody tr.o_list_footer:not([style*="background"]) { background-color:#0b0f14; }
            /* === Thème Vert === */
            body.gm-theme-enabled.gm-theme-green .o_content,
            body.gm-theme-enabled.gm-theme-green .o_form_view,
            body.gm-theme-enabled.gm-theme-green .o_list_view,
            body.gm-theme-enabled.gm-theme-green .o_kanban_view { background-color:#0a120c !important; }
            body.gm-theme-enabled.gm-theme-green,
            body.gm-theme-enabled.gm-theme-green .o_web_client,
            body.gm-theme-enabled.gm-theme-green .o_action_manager,
            body.gm-theme-enabled.gm-theme-green .o_action,
            body.gm-theme-enabled.gm-theme-green .o_control_panel { background-color:#0b130d !important; }
            body.gm-theme-enabled.gm-theme-green .o_control_panel,
            body.gm-theme-enabled.gm-theme-green .o_cp_bottom,
            body.gm-theme-enabled.gm-theme-green .o_cp_top { border-color:#1a2d1f !important; background-image:none !important; background-color:#0b130d !important; }
            body.gm-theme-enabled.gm-theme-green header.o_navbar,
            body.gm-theme-enabled.gm-theme-green .o_main_navbar { background-color:#0b130d !important; border-color:#1a2d1f !important; }
            body.gm-theme-enabled.gm-theme-green .o_breadcrumb,
            body.gm-theme-enabled.gm-theme-green ol.breadcrumb { background-color:#0e1711 !important; }
            body.gm-theme-enabled.gm-theme-green .o_form_statusbar { background:#0b130d !important; border-bottom:1px solid #1a2d1f !important; }
            body.gm-theme-enabled.gm-theme-green .o_form_view .o_form_sheet,
            body.gm-theme-enabled.gm-theme-green .o_form_view .o_inner_group,
            body.gm-theme-enabled.gm-theme-green .o_form_view .o_group,
            body.gm-theme-enabled.gm-theme-green .o_form_view .o_notebook,
            body.gm-theme-enabled.gm-theme-green .o_form_view .o_chatter { background:#0f1a12 !important; color:#e6f3e9; }
            body.gm-theme-enabled.gm-theme-green .o_notebook .nav-tabs,
            body.gm-theme-enabled.gm-theme-green .o_notebook_headers .nav.nav-tabs,
            body.gm-theme-enabled.gm-theme-green ul.nav.nav-tabs.flex-row.flex-nowrap { background:#122017 !important; border-color:#1a2d1f !important; }
            body.gm-theme-enabled.gm-theme-green .o_notebook .nav-tabs .nav-link.active { background:#0f1a12 !important; border-color:#1a2d1f !important; }
            body.gm-theme-enabled.gm-theme-green .o_list_view .o_list_table thead th { background:#122017 !important; color:#cfe3d6; border-color:#1a2d1f !important; }
            body.gm-theme-enabled.gm-theme-green .o_list_view .o_list_table tbody tr.o_data_row > td { background:#0f1a12 !important; border-top-color:#1a2d1f !important; }
            body.gm-theme-enabled.gm-theme-green .o_list_view .o_list_table tbody tr.o_data_row:hover > td { background:#16261b !important; }
            body.gm-theme-enabled.gm-theme-green .o_list_view .o_group_header { background:#101a12 !important; }
            body.gm-theme-enabled.gm-theme-green .o_stat_buttons .o_stat_button,
            body.gm-theme-enabled.gm-theme-green .o_button_box .btn.btn-light,
            body.gm-theme-enabled.gm-theme-green button.oe_stat_button { background:#122017 !important; border-color:#1a2d1f !important; color:#e6f3e9 !important; }
            body.gm-theme-enabled.gm-theme-green .o_stat_buttons .o_stat_button:hover,
            body.gm-theme-enabled.gm-theme-green .o_button_box .btn.btn-light:hover,
            body.gm-theme-enabled.gm-theme-green button.oe_stat_button:hover { background:#16261b !important; border-color:#23402a !important; }
            /* Green surcouches: boutons droits, sélection, texte */
            body.gm-theme-enabled.gm-theme-green .o_form_statusbar_buttons .btn { background-color: revert !important; border-color: revert !important; color: revert !important; box-shadow: revert !important; filter: revert !important; }
            body.gm-theme-enabled.gm-theme-green .o_list_view .o_list_table tbody tr.o_data_row.o_selected { background-color:#16261b !important; color:#e6f3e9 !important; }
            body.gm-theme-enabled.gm-theme-green .o_form_statusbar_buttons .btn,
            body.gm-theme-enabled.gm-theme-green .o_form_statusbar .o_statusbar_status > .btn,
            body.gm-theme-enabled.gm-theme-green #btn-traiter-appel { color:#ffffff !important; }
            body.gm-theme-enabled.gm-theme-green .o_form_statusbar_buttons button.btn.btn-danger,
            body.gm-theme-enabled.gm-theme-green .o_form_statusbar .o_statusbar_status > button.btn.btn-danger,
            body.gm-theme-enabled.gm-theme-green .o_form_statusbar_buttons button.btn.btn-danger span,
            body.gm-theme-enabled.gm-theme-green .o_form_statusbar .o_statusbar_status > button.btn.btn-danger span { color:#ff4d4f !important; }
            body.gm-theme-enabled.gm-theme-green #btn-creer-ticket,
            body.gm-theme-enabled.gm-theme-green #btn-creer-ticket span { color:#ffffff !important; }
            /* Green: chatter topbar & sections mail */
            body.gm-theme-enabled.gm-theme-green .o_chatterTopbar { background:#0f1a12 !important; border-color:#1a2d1f !important; }
            body.gm-theme-enabled.gm-theme-green [class^="o_ChatterTopbar"],
            body.gm-theme-enabled.gm-theme-green [class*=" o_ChatterTopbar"] { background:#0f1a12 !important; border-color:#1a2d1f !important; }
            body.gm-theme-enabled.gm-theme-green .o_ChatterTopbar_button,
            body.gm-theme-enabled.gm-theme-green [class^="o_ChatterTopbar"] .btn { color:#ffffff !important; }
            body.gm-theme-enabled.gm-theme-green [class^="o_Chatter"],
            body.gm-theme-enabled.gm-theme-green [class*=" o_Chatter"],
            body.gm-theme-enabled.gm-theme-green [class^="o_mail_thread"],
            body.gm-theme-enabled.gm-theme-green [class*=" o_mail_thread"],
            body.gm-theme-enabled.gm-theme-green [class^="o_MessageList"],
            body.gm-theme-enabled.gm-theme-green [class*=" o_MessageList"],
            body.gm-theme-enabled.gm-theme-green [class^="o_ThreadView"],
            body.gm-theme-enabled.gm-theme-green [class*=" o_ThreadView"] { background:#0f1a12 !important; }
            body.gm-theme-enabled.gm-theme-green .o_mail_thread .o_Message,
            body.gm-theme-enabled.gm-theme-green .o_attachment_box { background:#122017 !important; border-color:#1a2d1f !important; color:#e6f3e9 !important; }
            /* Green: fond formulaire (bg) */
            body.gm-theme-enabled.gm-theme-green .o_form_sheet_bg { background-color:#0e1711 !important; }
            body.gm-theme-enabled.gm-theme-green .o_form_sheet_bg .o_form_sheet { background-color:#0f1a12 !important; border-color:#1a2d1f !important; }
            /* Green: labels & widgets */
            body.gm-theme-enabled.gm-theme-green .o_form_view label,
            body.gm-theme-enabled.gm-theme-green .o_form_view .o_form_label { color:#cfe3d6 !important; }
            body.gm-theme-enabled.gm-theme-green .o_form_view .o_field_widget,
            body.gm-theme-enabled.gm-theme-green .o_form_view .o_field_widget input,
            body.gm-theme-enabled.gm-theme-green .o_form_view .o_field_widget textarea,
            body.gm-theme-enabled.gm-theme-green .o_form_view .o_field_widget .badge { background:#122017 !important; color:#e6f3e9 !important; border-color:#1a2d1f !important; }
            body.gm-theme-enabled.gm-theme-green .o_form_view .o_statusbar_status,
            body.gm-theme-enabled.gm-theme-green .o_form_view .badge { background:#122017 !important; color:#e6f3e9 !important; border:1px solid #1a2d1f !important; }
            /* Green: group headers renderer */
            body.gm-theme-enabled.gm-theme-green .o_list_renderer .o_group_header,
            body.gm-theme-enabled.gm-theme-green .o_list_renderer .o_group_has_content { background:#101a12 !important; border-bottom:1px solid #1a2d1f !important; }
            /* Green: liens et badges */
            body.gm-theme-enabled.gm-theme-green .o_list_view .o_data_cell,
            body.gm-theme-enabled.gm-theme-green .o_list_view .o_data_cell a { color:inherit !important; }
            body.gm-theme-enabled.gm-theme-green .btn-primary { background:linear-gradient(90deg,#00b09b,#96c93d) !important; border:none !important; color:#fff !important; }
            body.gm-theme-enabled.gm-theme-green .badge, body.gm-theme-enabled.gm-theme-green .o_tag { background:#122017 !important; color:#e6f3e9 !important; border:1px solid #1a2d1f; }
            body.gm-theme-enabled.gm-theme-green .o_kanban_view .o_kanban_record { background:#0f1a12 !important; border:1px solid #1a2d1f !important; box-shadow: 0 6px 18px rgba(0,176,155,0.08); }
            /* Green: boutons génériques */
            body.gm-theme-enabled.gm-theme-green .o_control_panel .btn:not(.btn-primary):not(.btn-danger):not(.btn-success):not(.o_cp_buttons .btn),
            body.gm-theme-enabled.gm-theme-green .o_form_statusbar .btn,
            body.gm-theme-enabled.gm-theme-green .o_statusbar_status .btn,
            body.gm-theme-enabled.gm-theme-green .o_statusbar_buttons .btn:not(.o_cp_buttons .btn),
            body.gm-theme-enabled.gm-theme-green .o_cp_pager .btn,
            body.gm-theme-enabled.gm-theme-green .o_pager .btn,
            body.gm-theme-enabled.gm-theme-green .btn-group .btn { background-color:#122017 !important; border-color:#1a2d1f !important; }
            body.gm-theme-enabled.gm-theme-green .o_control_panel .btn:hover,
            body.gm-theme-enabled.gm-theme-green .o_form_statusbar .btn:hover,
            body.gm-theme-enabled.gm-theme-green .o_statusbar_status .btn:hover,
            body.gm-theme-enabled.gm-theme-green .o_statusbar_buttons .btn:hover,
            body.gm-theme-enabled.gm-theme-green .o_cp_pager .btn:hover,
            body.gm-theme-enabled.gm-theme-green .o_pager .btn:hover,
            body.gm-theme-enabled.gm-theme-green .btn-group .btn:hover { background-color:#16261b !important; border-color:#23402a !important; }
            body.gm-theme-enabled.gm-theme-green .o_control_panel .btn:active,
            body.gm-theme-enabled.gm-theme-green .o_form_statusbar .btn:active,
            body.gm-theme-enabled.gm-theme-green .o_statusbar_status .btn:active,
            body.gm-theme-enabled.gm-theme-green .o_statusbar_buttons .btn:active,
            body.gm-theme-enabled.gm-theme-green .o_cp_pager .btn:active,
            body.gm-theme-enabled.gm-theme-green .o_pager .btn:active,
            body.gm-theme-enabled.gm-theme-green .btn-group .btn:active { background-color:#0b130d !important; border-color:#1a2d1f !important; }
            body.gm-theme-enabled.gm-theme-green .o_control_panel .o_cp_buttons .btn { background-color: revert !important; border-color: revert !important; }
            body.gm-theme-enabled.gm-theme-green .o_list_view .o_list_table tbody tr.o_data_row:not([style*="background"]) { background-color:#0b130d; border-top-color:#1a2d1f; border-bottom-color:#1a2d1f; }
            body.gm-theme-enabled.gm-theme-green .o_list_view .o_list_table tbody tr.o_group_header:not([style*="background"]) { background-color:#101a12; }
            body.gm-theme-enabled.gm-theme-green .o_list_view .o_list_table tbody tr.o_group_has_content:not([style*="background"]) { background-color:#101a12; }
            body.gm-theme-enabled.gm-theme-green .o_list_view .o_list_table tbody tr.o_list_footer:not([style*="background"]) { background-color:#0b130d; }
            /* Green: statusbar onglets (flèches & secondaires) */
            body.gm-theme-enabled.gm-theme-green .o_form_statusbar .o_arrow_button,
            body.gm-theme-enabled.gm-theme-green .o_form_statusbar .btn-secondary { background-color:#122017 !important; border-color:#1a2d1f !important; box-shadow: 0 0 0 1px #1a2d1f26 inset; }
            body.gm-theme-enabled.gm-theme-green .o_form_statusbar .o_arrow_button:hover,
            body.gm-theme-enabled.gm-theme-green .o_form_statusbar .btn-secondary:hover { background-color:#16261b !important; border-color:#23402a !important; }
            /* === Thème Rose === */
            body.gm-theme-enabled.gm-theme-pink .o_content,
            body.gm-theme-enabled.gm-theme-pink .o_form_view,
            body.gm-theme-enabled.gm-theme-pink .o_list_view,
            body.gm-theme-enabled.gm-theme-pink .o_kanban_view { background-color:#120a0f !important; }
            body.gm-theme-enabled.gm-theme-pink,
            body.gm-theme-enabled.gm-theme-pink .o_web_client,
            body.gm-theme-enabled.gm-theme-pink .o_action_manager,
            body.gm-theme-enabled.gm-theme-pink .o_action,
            body.gm-theme-enabled.gm-theme-pink .o_control_panel { background-color:#130b11 !important; }
            body.gm-theme-enabled.gm-theme-pink .o_control_panel,
            body.gm-theme-enabled.gm-theme-pink .o_cp_bottom,
            body.gm-theme-enabled.gm-theme-pink .o_cp_top { border-color:#2d1a26 !important; background-image:none !important; background-color:#130b11 !important; }
            body.gm-theme-enabled.gm-theme-pink header.o_navbar,
            body.gm-theme-enabled.gm-theme-pink .o_main_navbar { background-color:#130b11 !important; border-color:#2d1a26 !important; }
            body.gm-theme-enabled.gm-theme-pink .o_breadcrumb,
            body.gm-theme-enabled.gm-theme-pink ol.breadcrumb { background-color:#1a0e16 !important; }
            body.gm-theme-enabled.gm-theme-pink .o_form_statusbar { background:#130b11 !important; border-bottom:1px solid #2d1a26 !important; }
            /* Pink: fond formulaire (bg) */
            body.gm-theme-enabled.gm-theme-pink .o_form_sheet_bg { background-color:#1a0e16 !important; }
            body.gm-theme-enabled.gm-theme-pink .o_form_sheet_bg .o_form_sheet { background-color:#1a0e16 !important; border-color:#ff2ea6 !important; }
            body.gm-theme-enabled.gm-theme-pink .o_form_view .o_form_sheet,
            body.gm-theme-enabled.gm-theme-pink .o_form_view .o_inner_group,
            body.gm-theme-enabled.gm-theme-pink .o_form_view .o_group,
            body.gm-theme-enabled.gm-theme-pink .o_form_view .o_notebook,
            body.gm-theme-enabled.gm-theme-pink .o_form_view .o_chatter { background:#1a0e16 !important; color:#ffd6eb !important; }
            body.gm-theme-enabled.gm-theme-pink .o_notebook .nav-tabs,
            body.gm-theme-enabled.gm-theme-pink .o_notebook_headers .nav.nav-tabs,
            body.gm-theme-enabled.gm-theme-pink ul.nav.nav-tabs.flex-row.flex-nowrap { background:#22101b !important; border-color:#ff2ea6 !important; }
            body.gm-theme-enabled.gm-theme-pink .o_notebook .nav-tabs .nav-link.active { background:#1a0e16 !important; border-color:#2d1a26 !important; }
            body.gm-theme-enabled.gm-theme-pink .o_list_view .o_list_table thead th { background:#241024 !important; color:#ffd6eb; border-color:#ff2ea6 !important; }
            body.gm-theme-enabled.gm-theme-pink .o_list_view .o_list_table tbody tr.o_data_row > td { background:#1a0e16 !important; border-top-color:#2d1a26 !important; }
            body.gm-theme-enabled.gm-theme-pink .o_list_view .o_list_table tbody tr.o_data_row:hover > td { background:#2a0d1f !important; }
            body.gm-theme-enabled.gm-theme-pink .o_list_view .o_group_header { background:#1a0e16 !important; }
            body.gm-theme-enabled.gm-theme-pink .o_stat_buttons .o_stat_button,
            body.gm-theme-enabled.gm-theme-pink .o_button_box .btn.btn-light,
            body.gm-theme-enabled.gm-theme-pink button.oe_stat_button { background:#1e1220 !important; border-color:#ff2ea6 !important; color:#f3e6ed !important; box-shadow:0 0 0 1px #ff2ea61f inset; }
            body.gm-theme-enabled.gm-theme-pink .o_stat_buttons .o_stat_button:hover,
            body.gm-theme-enabled.gm-theme-pink .o_button_box .btn.btn-light:hover,
            body.gm-theme-enabled.gm-theme-pink button.oe_stat_button:hover { background:#2a0d1f !important; border-color:#ff49b6 !important; }
            /* Pink surcouches: boutons droits, sélection, texte (girly) */
            body.gm-theme-enabled.gm-theme-pink .o_form_statusbar_buttons .btn { background-color: revert !important; border-color: revert !important; color: revert !important; box-shadow: revert !important; filter: revert !important; }
            body.gm-theme-enabled.gm-theme-pink .o_list_view .o_list_table tbody tr.o_data_row.o_selected { background-color:#1e1220 !important; color:#f3e6ed !important; }
            body.gm-theme-enabled.gm-theme-pink .o_form_statusbar_buttons .btn,
            body.gm-theme-enabled.gm-theme-pink .o_form_statusbar .o_statusbar_status > .btn,
            body.gm-theme-enabled.gm-theme-pink #btn-traiter-appel { color:#ffffff !important; }
            body.gm-theme-enabled.gm-theme-pink .o_form_statusbar_buttons button.btn.btn-danger,
            body.gm-theme-enabled.gm-theme-pink .o_form_statusbar .o_statusbar_status > button.btn.btn-danger,
            body.gm-theme-enabled.gm-theme-pink .o_form_statusbar_buttons button.btn.btn-danger span,
            body.gm-theme-enabled.gm-theme-pink .o_form_statusbar .o_statusbar_status > button.btn.btn-danger span { color:#ff4d4f !important; }
            body.gm-theme-enabled.gm-theme-pink #btn-creer-ticket,
            body.gm-theme-enabled.gm-theme-pink #btn-creer-ticket span { color:#ffffff !important; }
            body.gm-theme-enabled.gm-theme-pink .btn-primary { background:linear-gradient(90deg,#ff2ea6,#ff6bd5) !important; border:none !important; color:#fff !important; box-shadow:0 0 16px #ff2ea644; }
            body.gm-theme-enabled.gm-theme-pink .badge, body.gm-theme-enabled.gm-theme-pink .o_tag { background:#20121b !important; color:#ffd6eb !important; border:1px solid #ff2ea6; box-shadow:0 0 0 1px #ff2ea61f inset; }
            /* Pink: chatter */
            body.gm-theme-enabled.gm-theme-pink .o_chatterTopbar { background:#1a0e16 !important; border-color:#2d1a26 !important; }
            body.gm-theme-enabled.gm-theme-pink [class^="o_ChatterTopbar"],
            body.gm-theme-enabled.gm-theme-pink [class*=" o_ChatterTopbar"] { background:#1a0e16 !important; border-color:#2d1a26 !important; }
            /* Pink: texte des boutons Chatter (Envoyer un message client, etc.) en blanc */
            body.gm-theme-enabled.gm-theme-pink .o_ChatterTopbar_button,
            body.gm-theme-enabled.gm-theme-pink [class^="o_ChatterTopbar"] .btn { color:#ffffff !important; }
            body.gm-theme-enabled.gm-theme-pink [class^="o_Chatter"],
            body.gm-theme-enabled.gm-theme-pink [class*=" o_Chatter"],
            body.gm-theme-enabled.gm-theme-pink [class^="o_mail_thread"],
            body.gm-theme-enabled.gm-theme-pink [class*=" o_mail_thread"],
            body.gm-theme-enabled.gm-theme-pink [class^="o_MessageList"],
            body.gm-theme-enabled.gm-theme-pink [class*=" o_MessageList"],
            body.gm-theme-enabled.gm-theme-pink [class^="o_ThreadView"],
            body.gm-theme-enabled.gm-theme-pink [class*=" o_ThreadView"] { background:#1a0e16 !important; }
            /* Pink: cartes de message et boîte pièces jointes */
            body.gm-theme-enabled.gm-theme-pink .o_mail_thread .o_Message,
            body.gm-theme-enabled.gm-theme-pink .o_attachment_box { background:#20121b !important; border-color:#ff2ea6 !important; color:#f3e6ed !important; }
            /* Pink: labels & widgets */
            body.gm-theme-enabled.gm-theme-pink .o_form_view label,
            body.gm-theme-enabled.gm-theme-pink .o_form_view .o_form_label { color:#f0dfe7 !important; }
            body.gm-theme-enabled.gm-theme-pink .o_form_view .o_field_widget,
            body.gm-theme-enabled.gm-theme-pink .o_form_view .o_field_widget input,
            body.gm-theme-enabled.gm-theme-pink .o_form_view .o_field_widget textarea,
            body.gm-theme-enabled.gm-theme-pink .o_form_view .o_field_widget .badge { background:#1e1220 !important; color:#f3e6ed !important; border-color:#ff2ea6 !important; }
            body.gm-theme-enabled.gm-theme-pink .o_form_view .o_statusbar_status,
            body.gm-theme-enabled.gm-theme-pink .o_form_view .badge { background:#20121b !important; color:#ffd6eb !important; border:1px solid #ff2ea644 !important; }
            /* Pink: group headers renderer */
            body.gm-theme-enabled.gm-theme-pink .o_list_renderer .o_group_header,
            body.gm-theme-enabled.gm-theme-pink .o_list_renderer .o_group_has_content { background:#1a0e16 !important; border-bottom:1px solid #ff2ea6 !important; }
            /* Pink: liens et kanban */
            body.gm-theme-enabled.gm-theme-pink .o_list_view .o_data_cell,
            body.gm-theme-enabled.gm-theme-pink .o_list_view .o_data_cell a { color:inherit !important; }
            body.gm-theme-enabled.gm-theme-pink .o_kanban_view .o_kanban_record { background:#1a0e16 !important; border:1px solid #2d1a26 !important; box-shadow: 0 6px 18px rgba(255,105,180,0.08); }
            /* Pink: onglets d'état (NOUVEAU / EN COURS / etc.) */
            body.gm-theme-enabled.gm-theme-pink .o_statusbar_status > .btn { background:#1e1220 !important; border-color:#3b0f2b !important; color:#f3e6ed !important; }
            body.gm-theme-enabled.gm-theme-pink .o_statusbar_status > .btn:hover { background:#2a0d1f !important; border-color:#5a1a3f !important; color:#ffffff !important; }
            /* Pink: statusbar onglets (exact mirroring red/black) */
            body.gm-theme-enabled.gm-theme-pink .o_form_statusbar .o_arrow_button,
            body.gm-theme-enabled.gm-theme-pink .o_form_statusbar .btn-secondary { background-color:#1e1220 !important; border-color:#ff2ea6 !important; box-shadow: 0 0 0 1px #ff2ea620 inset; }
            body.gm-theme-enabled.gm-theme-pink .o_form_statusbar .o_arrow_button:hover,
            body.gm-theme-enabled.gm-theme-pink .o_form_statusbar .btn-secondary:hover { background-color:#2a0d1f !important; border-color:#ff49b6 !important; }
            /* Pink: actions à droite (barre d’actions CP) */
            body.gm-theme-enabled.gm-theme-pink .o_control_panel .o_cp_right .btn:not(.btn-primary):not(.btn-danger):not(.btn-success) { background-color:#1e1220 !important; border-color:#ff2ea6 !important; box-shadow: 0 0 0 1px #ff2ea620 inset; color:#f3e6ed !important; }
            body.gm-theme-enabled.gm-theme-pink .o_control_panel .o_cp_right .btn:not(.btn-primary):not(.btn-danger):not(.btn-success):hover { background-color:#2a0d1f !important; border-color:#ff49b6 !important; color:#ffffff !important; }
            /* Pink: pager et groupes de boutons génériques */
            body.gm-theme-enabled.gm-theme-pink .o_cp_pager .btn,
            body.gm-theme-enabled.gm-theme-pink .o_pager .btn,
            body.gm-theme-enabled.gm-theme-pink .btn-group .btn { background-color:#1e1220 !important; border-color:#ff2ea6 !important; }
            body.gm-theme-enabled.gm-theme-pink .o_cp_pager .btn:hover,
            body.gm-theme-enabled.gm-theme-pink .o_pager .btn:hover,
            body.gm-theme-enabled.gm-theme-pink .btn-group .btn:hover { background-color:#2a0d1f !important; border-color:#ff49b6 !important; }
            body.gm-theme-enabled.gm-theme-pink .o_cp_pager .btn:active,
            body.gm-theme-enabled.gm-theme-pink .o_pager .btn:active,
            body.gm-theme-enabled.gm-theme-pink .btn-group .btn:active { background-color:#130b11 !important; border-color:#ff2ea6 !important; }
            /* Pink: bordures CP plus vives */
            body.gm-theme-enabled.gm-theme-pink .o_control_panel,
            body.gm-theme-enabled.gm-theme-pink .o_cp_bottom,
            body.gm-theme-enabled.gm-theme-pink .o_cp_top { border-color:#ff2ea6 !important; }
            /* Pink: boutons génériques */
            body.gm-theme-enabled.gm-theme-pink .o_control_panel .btn:not(.btn-primary):not(.btn-danger):not(.btn-success):not(.o_cp_buttons .btn),
            body.gm-theme-enabled.gm-theme-pink .o_form_statusbar .btn,
            body.gm-theme-enabled.gm-theme-pink .o_statusbar_status .btn,
            body.gm-theme-enabled.gm-theme-pink .o_statusbar_buttons .btn:not(.o_cp_buttons .btn),
            body.gm-theme-enabled.gm-theme-pink .o_cp_pager .btn,
            body.gm-theme-enabled.gm-theme-pink .o_pager .btn,
            body.gm-theme-enabled.gm-theme-pink .btn-group .btn { background-color:#1e1220 !important; border-color:#ff2ea6 !important; }
            body.gm-theme-enabled.gm-theme-pink .o_control_panel .btn:hover,
            body.gm-theme-enabled.gm-theme-pink .o_form_statusbar .btn:hover,
            body.gm-theme-enabled.gm-theme-pink .o_statusbar_status .btn:hover,
            body.gm-theme-enabled.gm-theme-pink .o_statusbar_buttons .btn:hover,
            body.gm-theme-enabled.gm-theme-pink .o_cp_pager .btn:hover,
            body.gm-theme-enabled.gm-theme-pink .o_pager .btn:hover,
            body.gm-theme-enabled.gm-theme-pink .btn-group .btn:hover { background-color:#2a0d1f !important; border-color:#ff49b6 !important; }
            body.gm-theme-enabled.gm-theme-pink .o_control_panel .btn:active,
            body.gm-theme-enabled.gm-theme-pink .o_form_statusbar .btn:active,
            body.gm-theme-enabled.gm-theme-pink .o_statusbar_status .btn:active,
            body.gm-theme-enabled.gm-theme-pink .o_statusbar_buttons .btn:active,
            body.gm-theme-enabled.gm-theme-pink .o_cp_pager .btn:active,
            body.gm-theme-enabled.gm-theme-pink .o_pager .btn:active,
            body.gm-theme-enabled.gm-theme-pink .btn-group .btn:active { background-color:#130b11 !important; border-color:#ff2ea6 !important; }
            body.gm-theme-enabled.gm-theme-pink .o_control_panel .o_cp_buttons .btn { background-color: revert !important; border-color: revert !important; }
            body.gm-theme-enabled.gm-theme-pink .o_list_view .o_list_table tbody tr.o_data_row:not([style*="background"]) { background-color:#130b11; border-top-color:#2d1a26; border-bottom-color:#2d1a26; }
            body.gm-theme-enabled.gm-theme-pink .o_list_view .o_list_table tbody tr.o_group_header:not([style*="background"]) { background-color:#1a0e16; }
            body.gm-theme-enabled.gm-theme-pink .o_list_view .o_list_table tbody tr.o_group_has_content:not([style*="background"]) { background-color:#1a0e16; }
            body.gm-theme-enabled.gm-theme-pink .o_list_view .o_list_table tbody tr.o_list_footer:not([style*="background"]) { background-color:#130b11; }

            /* === Thème Clair === */
            body.gm-theme-enabled.gm-theme-light .o_content,
            body.gm-theme-enabled.gm-theme-light .o_form_view,
            body.gm-theme-enabled.gm-theme-light .o_list_view,
            body.gm-theme-enabled.gm-theme-light .o_kanban_view { background-color:#fff7fb !important; }
            body.gm-theme-enabled.gm-theme-light,
            body.gm-theme-enabled.gm-theme-light .o_web_client,
            body.gm-theme-enabled.gm-theme-light .o_action_manager,
            body.gm-theme-enabled.gm-theme-light .o_action,
            body.gm-theme-enabled.gm-theme-light .o_control_panel { background-color:#fff5fa !important; }
            body.gm-theme-enabled.gm-theme-light .o_control_panel,
            body.gm-theme-enabled.gm-theme-light .o_cp_bottom,
            body.gm-theme-enabled.gm-theme-light .o_cp_top { border-color:#ffd1e6 !important; background-image:none !important; background-color:#fff5fa !important; }
            body.gm-theme-enabled.gm-theme-light header.o_navbar,
            body.gm-theme-enabled.gm-theme-light .o_main_navbar { background-color:#fff5fa !important; border-color:#ffd1e6 !important; }
            body.gm-theme-enabled.gm-theme-light .o_breadcrumb,
            body.gm-theme-enabled.gm-theme-light ol.breadcrumb { background-color:#fff0f6 !important; }
            /* Form view */
            body.gm-theme-enabled.gm-theme-light .o_form_statusbar { background:#fff0f6 !important; border-bottom:1px solid #ffd1e6 !important; }
            body.gm-theme-enabled.gm-theme-light .o_form_view .o_form_sheet,
            body.gm-theme-enabled.gm-theme-light .o_form_view .o_inner_group,
            body.gm-theme-enabled.gm-theme-light .o_form_view .o_group,
            body.gm-theme-enabled.gm-theme-light .o_form_view .o_notebook,
            body.gm-theme-enabled.gm-theme-light .o_form_view .o_chatter { background:#ffffff !important; color:#2b2f36 !important; }
            body.gm-theme-enabled.gm-theme-light .o_form_sheet_bg { background-color:#fff7fb !important; }
            body.gm-theme-enabled.gm-theme-light .o_form_sheet_bg .o_form_sheet { background-color:#ffffff !important; border-color:#ffd1e6 !important; }
            /* Chatter */
            body.gm-theme-enabled.gm-theme-light .o_chatterTopbar { background:#fff0f6 !important; border-color:#ffd1e6 !important; }
            body.gm-theme-enabled.gm-theme-light [class^="o_ChatterTopbar"],
            body.gm-theme-enabled.gm-theme-light [class*=" o_ChatterTopbar"] { background:#fff0f6 !important; border-color:#ffd1e6 !important; }
            body.gm-theme-enabled.gm-theme-light .o_ChatterTopbar_button,
            body.gm-theme-enabled.gm-theme-light [class^="o_ChatterTopbar"] .btn { color:#2b2f36 !important; }
            body.gm-theme-enabled.gm-theme-light [class^="o_Chatter"],
            body.gm-theme-enabled.gm-theme-light [class*=" o_Chatter"],
            body.gm-theme-enabled.gm-theme-light [class^="o_mail_thread"],
            body.gm-theme-enabled.gm-theme-light [class*=" o_mail_thread"],
            body.gm-theme-enabled.gm-theme-light [class^="o_MessageList"],
            body.gm-theme-enabled.gm-theme-light [class*=" o_MessageList"],
            body.gm-theme-enabled.gm-theme-light [class^="o_ThreadView"],
            body.gm-theme-enabled.gm-theme-light [class*=" o_ThreadView"] { background:#ffffff !important; }
            body.gm-theme-enabled.gm-theme-light .o_mail_thread .o_Message,
            body.gm-theme-enabled.gm-theme-light .o_attachment_box { background:#ffffff !important; border-color:#e6edf5 !important; color:#2b2f36 !important; }
            /* Tabs */
            body.gm-theme-enabled.gm-theme-light .o_notebook .nav-tabs,
            body.gm-theme-enabled.gm-theme-light .o_notebook_headers .nav.nav-tabs,
            body.gm-theme-enabled.gm-theme-light ul.nav.nav-tabs.flex-row.flex-nowrap { background:#ffe6f1 !important; border-color:#ffd1e6 !important; }
            body.gm-theme-enabled.gm-theme-light .o_notebook .nav-tabs .nav-link.active { background:#ffffff !important; border-color:#ffd1e6 !important; }
            /* List */
            body.gm-theme-enabled.gm-theme-light .o_list_view .o_list_table { background-color:#ffffff !important; color:#2b2f36; }
            body.gm-theme-enabled.gm-theme-light .o_list_view thead th,
            body.gm-theme-enabled.gm-theme-light .o_list_view .o_list_table thead th { background:#fff0f6 !important; color:#2b2f36; border-color:#ffd1e6 !important; }
            body.gm-theme-enabled.gm-theme-light .o_list_view tbody tr,
            body.gm-theme-enabled.gm-theme-light .o_list_view .o_data_row { border-color:#e6edf5 !important; background-color:#ffffff !important; }
            body.gm-theme-enabled.gm-theme-light .o_list_view tbody tr:hover,
            body.gm-theme-enabled.gm-theme-light .o_list_view .o_data_row:hover { background:#fff6fb !important; }
            body.gm-theme-enabled.gm-theme-light .o_list_view .o_list_table tbody { background-color:#ffffff !important; }
            body.gm-theme-enabled.gm-theme-light .o_list_view .o_list_table tbody tr:not([style*="background"]) { background-color:#ffffff; }
            body.gm-theme-enabled.gm-theme-light .o_list_view .o_list_table tbody tr:not([style*="background"]):hover { background-color:#fff6fb; }
            body.gm-theme-enabled.gm-theme-light .o_list_view .table-striped > tbody > tr:nth-of-type(odd) { background-color:#fffafd; }
            body.gm-theme-enabled.gm-theme-light .o_list_view .o_group_header { background-color:#fff0f6 !important; }
            body.gm-theme-enabled.gm-theme-light .o_list_view .o_list_table tbody tr.o_data_row > td { background:#ffffff !important; background-image:none !important; border-top-color:#ffd6e9 !important; }
            body.gm-theme-enabled.gm-theme-light .o_list_view .o_list_table tbody tr.o_data_row:hover > td { background:#fff6fb !important; }
            body.gm-theme-enabled.gm-theme-light .o_list_view.table-striped > tbody > tr.o_data_row:nth-of-type(odd) > td { background:#fffafd !important; }
            /* Group headers */
            body.gm-theme-enabled.gm-theme-light .o_list_renderer .o_group_header,
            body.gm-theme-enabled.gm-theme-light .o_list_renderer .o_group_has_content { background:#fff0f6 !important; border-bottom:1px solid #ffd1e6 !important; }
            body.gm-theme-enabled.gm-theme-light .o_list_view .o_list_table tr.o_group_header,
            body.gm-theme-enabled.gm-theme-light .o_list_view .o_list_table tr.o_group_has_content { background-color:#f3f6fa !important; }
            body.gm-theme-enabled.gm-theme-light .o_list_view .o_list_table tr.o_group_header > th,
            body.gm-theme-enabled.gm-theme-light .o_list_view .o_list_table tr.o_group_header > td,
            body.gm-theme-enabled.gm-theme-light .o_list_view .o_list_table tr.o_group_has_content > th,
            body.gm-theme-enabled.gm-theme-light .o_list_view .o_list_table tr.o_group_has_content > td {
                background-color:#fff0f6 !important; color:#2b2f36 !important; border-top:1px solid #ffd1e6 !important; border-bottom:1px solid #ffd1e6 !important;
            }
            body.gm-theme-enabled.gm-theme-light .o_list_view .o_list_table tbody tr.o_data_row.o_selected { background-color:#ffe4f3 !important; color:#2b2f36 !important; }
            /* Buttons */
            body.gm-theme-enabled.gm-theme-light .o_control_panel .btn:not(.btn-primary):not(.btn-danger):not(.btn-success):not(.o_cp_buttons .btn),
            body.gm-theme-enabled.gm-theme-light .o_form_statusbar .btn,
            body.gm-theme-enabled.gm-theme-light .o_statusbar_status .btn,
            body.gm-theme-enabled.gm-theme-light .o_statusbar_buttons .btn:not(.o_cp_buttons .btn),
            body.gm-theme-enabled.gm-theme-light .o_cp_pager .btn,
            body.gm-theme-enabled.gm-theme-light .o_pager .btn,
            body.gm-theme-enabled.gm-theme-light .btn-group .btn { background-color:#ffffff !important; border-color:#ffb3d6 !important; color:#2b2f36 !important; }
            body.gm-theme-enabled.gm-theme-light .o_control_panel .btn:hover,
            body.gm-theme-enabled.gm-theme-light .o_form_statusbar .btn:hover,
            body.gm-theme-enabled.gm-theme-light .o_statusbar_status .btn:hover,
            body.gm-theme-enabled.gm-theme-light .o_statusbar_buttons .btn:hover,
            body.gm-theme-enabled.gm-theme-light .o_cp_pager .btn:hover,
            body.gm-theme-enabled.gm-theme-light .o_pager .btn:hover,
            body.gm-theme-enabled.gm-theme-light .btn-group .btn:hover { background-color:#fff0f7 !important; border-color:#ff9fcd !important; }
            body.gm-theme-enabled.gm-theme-light .o_control_panel .btn:active,
            body.gm-theme-enabled.gm-theme-light .o_form_statusbar .btn:active,
            body.gm-theme-enabled.gm-theme-light .o_statusbar_status .btn:active,
            body.gm-theme-enabled.gm-theme-light .o_statusbar_buttons .btn:active,
            body.gm-theme-enabled.gm-theme-light .o_cp_pager .btn:active,
            body.gm-theme-enabled.gm-theme-light .o_pager .btn:active,
            body.gm-theme-enabled.gm-theme-light .btn-group .btn:active { background-color:#ffeaf4 !important; border-color:#ffb3d6 !important; }
            /* Statusbar pills */
            body.gm-theme-enabled.gm-theme-light .o_statusbar_status > .btn { background:#ffe6f1 !important; border-color:#ffb3d6 !important; color:#2b2f36 !important; }
            body.gm-theme-enabled.gm-theme-light .o_statusbar_status > .btn:hover { background:#ffd6e9 !important; border-color:#ff9fcd !important; color:#2b2f36 !important; }
            /* Keep main action buttons */
            body.gm-theme-enabled.gm-theme-light .o_control_panel .o_cp_buttons .btn { background-color: revert !important; border-color: revert !important; }
            /* Stat buttons */
            body.gm-theme-enabled.gm-theme-light .o_stat_buttons .o_stat_button,
            body.gm-theme-enabled.gm-theme-light .o_button_box .btn.btn-light,
            body.gm-theme-enabled.gm-theme-light button.oe_stat_button,
            body.gm-theme-enabled.gm-theme-light button.oe_stat_button.btn-light { background:#ffffff !important; border-color:#ffb3d6 !important; color:#2b2f36 !important; }
            body.gm-theme-enabled.gm-theme-light .o_stat_buttons .o_stat_button:hover,
            body.gm-theme-enabled.gm-theme-light .o_button_box .btn.btn-light:hover,
            body.gm-theme-enabled.gm-theme-light button.oe_stat_button:hover,
            body.gm-theme-enabled.gm-theme-light button.oe_stat_button.btn-light:hover { background:#fff0f7 !important; border-color:#ff9fcd !important; color:#2b2f36 !important; }
            /* Badges/tags and kanban */
            body.gm-theme-enabled.gm-theme-light .btn-primary { background:linear-gradient(90deg,#ff2ea6,#ff6bd5) !important; border:none !important; color:#fff !important; }
            body.gm-theme-enabled.gm-theme-light .badge, body.gm-theme-enabled.gm-theme-light .o_tag { background:#ffeaf4 !important; color:#2b2f36 !important; border:1px solid #ffd1e6 !important; }
            body.gm-theme-enabled.gm-theme-light .o_kanban_view .o_kanban_record { background:#ffffff !important; border:1px solid #ffd6e9 !important; box-shadow: 0 4px 10px rgba(255,105,180,0.06); }
            /* Special text rules */
            body.gm-theme-enabled.gm-theme-light .o_form_statusbar_buttons .btn,
            body.gm-theme-enabled.gm-theme-light .o_form_statusbar .o_statusbar_status > .btn,
            body.gm-theme-enabled.gm-theme-light #btn-traiter-appel { color:#2b2f36 !important; }
            body.gm-theme-enabled.gm-theme-light .o_form_statusbar_buttons button.btn.btn-danger,
            body.gm-theme-enabled.gm-theme-light .o_form_statusbar .o_statusbar_status > button.btn.btn-danger,
            body.gm-theme-enabled.gm-theme-light .o_form_statusbar_buttons button.btn.btn-danger span,
            body.gm-theme-enabled.gm-theme-light .o_form_statusbar .o_statusbar_status > button.btn.btn-danger span { color:#d90429 !important; }
            body.gm-theme-enabled.gm-theme-light #btn-creer-ticket,
            body.gm-theme-enabled.gm-theme-light #btn-creer-ticket span { color:#ffffff !important; }
            /* ===== Surcouches de lisibilité et zones manquantes ===== */
            /* Dark+ : texte clair sur boutons secondaires et headers de groupe */
            body.gm-theme-enabled.gm-theme-dark_plus .o_group_header,
            body.gm-theme-enabled.gm-theme-dark_plus .o_group_has_content { color:#e6edf3 !important; }
            body.gm-theme-enabled.gm-theme-dark_plus .o_control_panel .o_cp_right .btn { color:#e6edf3 !important; }
            /* Chatter topbar: libellés lisibles */
            body.gm-theme-enabled.gm-theme-dark_plus .o_ChatterTopbar_button,
            body.gm-theme-enabled.gm-theme-dark_plus [class^="o_ChatterTopbar"] .btn { color:#e6edf3 !important; }
            /* Garde les boutons principaux dans leur style Odoo d'origine */
            body.gm-theme-enabled.gm-theme-dark_plus .o_control_panel .o_cp_buttons .btn {
                background-color: revert !important; border-color: revert !important; color: revert !important; box-shadow: revert !important; filter: revert !important;
            }
            /* Lignes sélectionnées */
            body.gm-theme-enabled.gm-theme-dark_plus .o_list_view .o_list_table tbody tr.o_data_row.o_selected { background-color:#1c2733 !important; color:#e6edf3 !important; }
            /* Ne pas appliquer le thème aux boutons d'actions (à droite: Traiter / Attente / Clôturer) */
            body.gm-theme-enabled.gm-theme-dark_plus .o_form_statusbar_buttons .btn {
                background-color: revert !important; border-color: revert !important; color: revert !important; box-shadow: revert !important; filter: revert !important;
            }
            /* Forcer la lisibilité du texte des boutons d'état (couleurs d'origine, texte blanc) */
            body.gm-theme-enabled.gm-theme-dark_plus .o_form_statusbar_buttons .btn,
            body.gm-theme-enabled.gm-theme-dark_plus .o_form_statusbar .o_statusbar_status > .btn,
            body.gm-theme-enabled.gm-theme-dark_plus #btn-traiter-appel { color:#ffffff !important; }
            /* Statistiques (Tickets ouverts, Documents...) */
            body.gm-theme-enabled.gm-theme-dark_plus .o_stat_buttons .o_stat_button,
            body.gm-theme-enabled.gm-theme-dark_plus .o_button_box .btn.btn-light,
            body.gm-theme-enabled.gm-theme-dark_plus button.oe_stat_button,
            body.gm-theme-enabled.gm-theme-dark_plus button.oe_stat_button.btn-light {
                background:#1b2028 !important; border-color:#262c36 !important; color:#e6edf3 !important;
            }
            body.gm-theme-enabled.gm-theme-dark_plus .o_stat_buttons .o_stat_button:hover,
            body.gm-theme-enabled.gm-theme-dark_plus .o_button_box .btn.btn-light:hover,
            body.gm-theme-enabled.gm-theme-dark_plus button.oe_stat_button:hover,
            body.gm-theme-enabled.gm-theme-dark_plus button.oe_stat_button.btn-light:hover { background:#222934 !important; border-color:#2b3340 !important; color:#ffffff !important; }
            /* Onglets d'état (NOUVEAU / EN COURS / etc.) */
            body.gm-theme-enabled.gm-theme-dark_plus .o_statusbar_status > .btn { background:#161b22 !important; border-color:#262c36 !important; color:#e6edf3 !important; }
            body.gm-theme-enabled.gm-theme-dark_plus .o_statusbar_status > .btn:hover { background:#1c2430 !important; border-color:#2b3340 !important; color:#ffffff !important; }
            body.gm-theme-enabled.gm-theme-dark_plus .o_form_statusbar_buttons .btn:hover,
            body.gm-theme-enabled.gm-theme-dark_plus .o_form_statusbar .o_statusbar_status > .btn:hover,
            body.gm-theme-enabled.gm-theme-dark_plus #btn-traiter-appel:hover { color:#ffffff !important; }
            /* Clôturer le ticket: texte rouge explicite (cible le bouton et son span) */
            body.gm-theme-enabled.gm-theme-dark_plus .o_form_statusbar_buttons button.btn.btn-danger,
            body.gm-theme-enabled.gm-theme-dark_plus .o_form_statusbar .o_statusbar_status > button.btn.btn-danger,
            body.gm-theme-enabled.gm-theme-dark_plus .o_form_statusbar_buttons button.btn.btn-danger span,
            body.gm-theme-enabled.gm-theme-dark_plus .o_form_statusbar .o_statusbar_status > button.btn.btn-danger span { color:#ff4d4f !important; }
            body.gm-theme-enabled.gm-theme-dark_plus .o_form_statusbar_buttons button.btn.btn-danger:hover,
            body.gm-theme-enabled.gm-theme-dark_plus .o_form_statusbar .o_statusbar_status > button.btn.btn-danger:hover,
            body.gm-theme-enabled.gm-theme-dark_plus .o_form_statusbar_buttons button.btn.btn-danger:hover span,
            body.gm-theme-enabled.gm-theme-dark_plus .o_form_statusbar .o_statusbar_status > button.btn.btn-danger:hover span { color:#ff4d4f !important; }
            /* Ciblage par attribut pour fiabilité */
            body.gm-theme-enabled.gm-theme-dark_plus .o_form_statusbar_buttons button[name="close_ticket"],
            body.gm-theme-enabled.gm-theme-dark_plus .o_form_statusbar_buttons button[name="close_ticket"] span { color:#ff4d4f !important; }
            /* Créer un ticket: texte blanc explicite */
            body.gm-theme-enabled.gm-theme-dark_plus #btn-creer-ticket,
            body.gm-theme-enabled.gm-theme-dark_plus #btn-creer-ticket span { color:#ffffff !important; }

            /* Red/Black : idem */
            body.gm-theme-enabled.gm-theme-redblack .o_group_header,
            body.gm-theme-enabled.gm-theme-redblack .o_group_has_content { color:#f0f0f0 !important; }
            body.gm-theme-enabled.gm-theme-redblack .o_control_panel .o_cp_right .btn { color:#eaeef2 !important; }
            /* Chatter topbar: libellés lisibles */
            body.gm-theme-enabled.gm-theme-redblack .o_ChatterTopbar_button,
            body.gm-theme-enabled.gm-theme-redblack [class^="o_ChatterTopbar"] .btn { color:#eaeef2 !important; }
            /* Garde les boutons principaux dans leur style Odoo d'origine */
            body.gm-theme-enabled.gm-theme-redblack .o_control_panel .o_cp_buttons .btn {
                background-color: revert !important; border-color: revert !important; color: revert !important; box-shadow: revert !important; filter: revert !important;
            }
            body.gm-theme-enabled.gm-theme-redblack .o_list_view .o_list_table tbody tr.o_data_row.o_selected { background-color:#161116 !important; color:#f0f0f0 !important; }
            /* Ne pas appliquer le thème aux boutons d'actions (à droite: Traiter / Attente / Clôturer) */
            body.gm-theme-enabled.gm-theme-redblack .o_form_statusbar_buttons .btn {
                background-color: revert !important; border-color: revert !important; color: revert !important; box-shadow: revert !important; filter: revert !important;
            }
            /* Forcer la lisibilité du texte des boutons d'état (couleurs d'origine, texte blanc) */
            body.gm-theme-enabled.gm-theme-redblack .o_form_statusbar_buttons .btn,
            body.gm-theme-enabled.gm-theme-redblack .o_form_statusbar .o_statusbar_status > .btn,
            body.gm-theme-enabled.gm-theme-redblack #btn-traiter-appel { color:#ffffff !important; }
            /* Statistiques (Tickets ouverts, Documents...) */
            body.gm-theme-enabled.gm-theme-redblack .o_stat_buttons .o_stat_button,
            body.gm-theme-enabled.gm-theme-redblack .o_button_box .btn.btn-light,
            body.gm-theme-enabled.gm-theme-redblack button.oe_stat_button,
            body.gm-theme-enabled.gm-theme-redblack button.oe_stat_button.btn-light {
                background:#141414 !important; border-color:#1f1f1f !important; color:#eaeef2 !important; box-shadow: 0 0 0 1px rgba(255,255,255,0.04) inset;
            }
            body.gm-theme-enabled.gm-theme-redblack .o_stat_buttons .o_stat_button:hover,
            body.gm-theme-enabled.gm-theme-redblack .o_button_box .btn.btn-light:hover,
            body.gm-theme-enabled.gm-theme-redblack button.oe_stat_button:hover,
            body.gm-theme-enabled.gm-theme-redblack button.oe_stat_button.btn-light:hover { background:#191919 !important; border-color:#242424 !important; color:#ffffff !important; }
            /* Onglets d'état (NOUVEAU / EN COURS / etc.) */
            body.gm-theme-enabled.gm-theme-redblack .o_statusbar_status > .btn { background:#161616 !important; border-color:#232323 !important; color:#eaeef2 !important; }
            body.gm-theme-enabled.gm-theme-redblack .o_statusbar_status > .btn:hover { background:#1b1b1b !important; border-color:#282828 !important; color:#ffffff !important; }
            body.gm-theme-enabled.gm-theme-redblack .o_form_statusbar_buttons .btn:hover,
            body.gm-theme-enabled.gm-theme-redblack .o_form_statusbar .o_statusbar_status > .btn:hover,
            body.gm-theme-enabled.gm-theme-redblack #btn-traiter-appel:hover { color:#ffffff !important; }
            /* Clôturer le ticket: texte rouge explicite (cible le bouton et son span) */
            body.gm-theme-enabled.gm-theme-redblack .o_form_statusbar_buttons button.btn.btn-danger,
            body.gm-theme-enabled.gm-theme-redblack .o_form_statusbar .o_statusbar_status > button.btn.btn-danger,
            body.gm-theme-enabled.gm-theme-redblack .o_form_statusbar_buttons button.btn.btn-danger span,
            body.gm-theme-enabled.gm-theme-redblack .o_form_statusbar .o_statusbar_status > button.btn.btn-danger span { color:#ff4d4f !important; }
            body.gm-theme-enabled.gm-theme-redblack .o_form_statusbar_buttons button.btn.btn-danger:hover,
            body.gm-theme-enabled.gm-theme-redblack .o_form_statusbar .o_statusbar_status > button.btn.btn-danger:hover,
            body.gm-theme-enabled.gm-theme-redblack .o_form_statusbar_buttons button.btn.btn-danger:hover span,
            body.gm-theme-enabled.gm-theme-redblack .o_form_statusbar .o_statusbar_status > button.btn.btn-danger:hover span { color:#ff4d4f !important; }
            /* Ciblage par attribut pour fiabilité */
            body.gm-theme-enabled.gm-theme-redblack .o_form_statusbar_buttons button[name="close_ticket"],
            body.gm-theme-enabled.gm-theme-redblack .o_form_statusbar_buttons button[name="close_ticket"] span { color:#ff4d4f !important; }
            /* Créer un ticket: texte blanc explicite */
            body.gm-theme-enabled.gm-theme-redblack #btn-creer-ticket,
            body.gm-theme-enabled.gm-theme-redblack #btn-creer-ticket span { color:#ffffff !important; }
            /* ===== Fin surcouches ===== */
            `;
            document.head.appendChild(st);
        }
        function refreshTicketTheme(userName) {
            ensureTicketThemeStyles();
            const url = window.location.href;
            const isTicketPage = url.includes('model=helpdesk.ticket');
            const body = document.body;
            function clearThemes(){
                body.classList.remove(
                    'gm-theme-enabled',
                    'gm-theme-dark_plus',
                    'gm-theme-redblack',
                    'gm-theme-blue',
                    'gm-theme-green',
                    'gm-theme-pink',
                    'gm-theme-light'
                );
            }
            if (!isTicketPage) { clearThemes(); return; }
            firebase.database().ref('users/' + encodeURIComponent(userName)).once('value').then(snap => {
                const d = snap.val() || {};
                const themeRaw = d.ticketTheme || 'none';
                const theme = themeRaw === 'pink' ? 'light' : themeRaw; // migration: ancien "rose pourpre" -> "clair rose"
                const userPrestige = Number(d.prestige || 0);
                clearThemes();
                // Verrou: les thèmes se débloquent au Prestige 2
                if (userPrestige < 2) { try { clearActionButtonsForcedStyles(); } catch(e) {} return; }
                // Aucun thème sélectionné -> ne pas modifier l'UI et retirer tout style forcé
                if (!theme || theme === 'none') { try { clearActionButtonsForcedStyles(); } catch(e) {} return; }
                if (theme && theme !== 'none') {
                    body.classList.add('gm-theme-enabled');
                    body.classList.add('gm-theme-' + theme);
                    // sécurité: si une valeur legacy est fournie (blue/green/pink etc.), on l'applique directement
                }
                // Persister la migration en base (une seule fois)
                if (themeRaw === 'pink') {
                    firebase.database().ref('users/' + encodeURIComponent(userName)).update({ ticketTheme: 'light' });
                }
            });
        }
        // Force la lisibilité des boutons d'actions (haut gauche) selon leur libellé
        function enforceActionButtonsContrast() {
            // N'appliquer que si un thème tickets est actif
            if (!document.body.classList.contains('gm-theme-enabled')) return;
            function forceColorDeep(element, color) {
                if (!element) return;
                try { element.style.setProperty('color', color, 'important'); } catch(e) {}
                try {
                    element.querySelectorAll('*').forEach(child => {
                        try { child.style.setProperty('color', color, 'important'); } catch(e) {}
                    });
                } catch(e) {}
            }
            const selectors = [
                '.o_control_panel .o_cp_buttons .btn',
                '.o_form_statusbar_buttons .btn',
                '.o_form_statusbar .o_statusbar_status > .btn'
            ].join(',');
            document.querySelectorAll(selectors).forEach(btn => {
                const txt = (btn.textContent || '').trim().toLowerCase();
                if (!txt) return;
                // Clôturer -> texte rouge
                if (txt.includes('clôturer') || txt.includes('cloturer')) {
                    forceColorDeep(btn, '#ff4d4f');
                    btn.style.textShadow = '0 0 4px rgba(255,77,79,0.35)';
                    btn.style.fontWeight = '700';
                    return;
                }
                // Créer un ticket -> blanc
                if ((txt.includes('créer') || txt.includes('creer')) && txt.includes('ticket')) {
                    forceColorDeep(btn, '#ffffff');
                    if (btn.id === 'btn-creer-ticket') {
                        forceColorDeep(btn, '#ffffff');
                    }
                    btn.style.fontWeight = '600';
                    return;
                }
                // Mettre en attente / Traiter l'appel -> blanc
                if (txt.includes('mettre en attente') || txt.includes("traiter l'appel") || txt.includes('traiter l\'appel')) {
                    forceColorDeep(btn, '#ffffff');
                    btn.style.fontWeight = '600';
                }
            });
            // Ciblage robuste par attribut name (autre userscript)
            const closeBtn = document.querySelector('button[name="close_ticket"], .o_form_statusbar_buttons button[name="close_ticket"]');
            if (closeBtn) {
                forceColorDeep(closeBtn, '#ff4d4f');
            }
            const createBtn = document.getElementById('btn-creer-ticket');
            if (createBtn) {
                forceColorDeep(createBtn, '#ffffff');
            }
        }
        // Réinitialise tout style inline forcé sur les boutons d'action (quand thème désactivé)
        function clearActionButtonsForcedStyles() {
            const selectors = [
                '.o_control_panel .o_cp_buttons .btn',
                '.o_form_statusbar_buttons .btn',
                '.o_form_statusbar .o_statusbar_status > .btn',
                'button[name="close_ticket"]',
                '#btn-creer-ticket'
            ].join(',');
            document.querySelectorAll(selectors).forEach(btn => {
                try {
                    btn.style.removeProperty('color');
                    btn.style.removeProperty('text-shadow');
                    btn.style.removeProperty('font-weight');
                    btn.querySelectorAll('*').forEach(child => child.style.removeProperty('color'));
                } catch(e) {}
            });
        }
        function startObserveActionButtons() {
            const ensure = () => enforceActionButtonsContrast();
            const containers = document.querySelectorAll('.o_form_statusbar, .o_form_statusbar_buttons, .o_control_panel .o_cp_buttons');
            containers.forEach(node => {
                try {
                    const obs = new MutationObserver(ensure);
                    obs.observe(node, { childList: true, subtree: true, attributes: true, characterData: true });
                } catch(e) { /* no-op */ }
            });
            document.addEventListener('mouseover', (e) => {
                if (e.target && (e.target.closest && e.target.closest('.o_form_statusbar_buttons .btn, .o_cp_buttons .btn'))) ensure();
            }, { passive: true });
            ensure();
        }
        let actionBtnInterval = null;
        function startActionButtonsInterval() {
            if (actionBtnInterval) clearInterval(actionBtnInterval);
            actionBtnInterval = setInterval(() => {
                try {
                    if (document.body.classList.contains('gm-theme-enabled')) enforceActionButtonsContrast();
                    else clearActionButtonsForcedStyles();
                } catch(e) {}
            }, 800);
        }
        function setupCloturerDetection() {
            // Map pour stocker les tickets en cours de clôture
            const processingTickets = new Map();

            function addListeners() {
                document.querySelectorAll('button, a').forEach(btn => {
                    if (btn.dataset.gamifCloturer) return;
                    if (btn.textContent && btn.textContent.trim().toLowerCase().includes('clôturer')) {
                        btn.dataset.gamifCloturer = '1';
                        btn.addEventListener('click', function() {
                            console.log('[Gamification] Clic sur bouton Clôturer détecté');

                            // Récupérer l'ID du ticket
                            const ticketId = window.location.pathname.split('/').pop();
                            if (!ticketId) return;

                            // Vérifier si le ticket est déjà en cours de traitement
                            if (processingTickets.has(ticketId)) {
                                console.log('[Gamification] Ticket déjà en cours de traitement');
                                return;
                            }

                            // Marquer le ticket comme en cours de traitement
                            processingTickets.set(ticketId, true);

                            setTimeout(() => {
                                // Vérifie si le bouton est désactivé ou si le ticket est passé à l'état clôturé
                                const isDisabled = btn.disabled || btn.classList.contains('disabled') || btn.getAttribute('disabled') !== null;
                                console.log('[Gamification] Etat du bouton Clôturer :', isDisabled ? 'désactivé' : 'actif');
                                // Cherche un badge ou un indicateur d'état
                                const etatCloture = document.querySelector('.o_arrow_button_current[data-value="4"], .badge.bg-danger, .badge.bg-success, .badge.bg-primary');
                                if (etatCloture) {
                                    console.log('[Gamification] Texte du badge trouvé :', etatCloture.textContent.trim());
                                } else {
                                    console.log('[Gamification] Aucun badge d\'état trouvé');
                                }
                                if (
                                    isDisabled ||
                                    (etatCloture && /cl[ôo]tur[ée]|résolu/i.test(etatCloture.textContent))
                                ) {
                                    const userName = getCurrentUserName();
                                    // Détection du nombre d'étoiles (Priorité)
                                    let xp = 100;
                                    let nbEtoiles = 0;
                                    let typeCloture = 'normal';
                                    const prioriteRow = document.querySelector('.o_form_view .o_field_widget.o_field_priority, .o_form_view .o_priority, .o_form_view [name="priority"]');
                                    if (prioriteRow) {
                                        nbEtoiles = prioriteRow.querySelectorAll('.fa-star, .o_rating_star_full, .o_priority_star.o_full').length;
                                        if (nbEtoiles === 1) { xp = 120; typeCloture = 'important'; }
                                        else if (nbEtoiles === 2) { xp = 140; typeCloture = 'urgent'; }
                                        else if (nbEtoiles === 3) { xp = 200; typeCloture = 'bloquant'; }
                                        else { xp = 100; typeCloture = 'normal'; }
                                        console.log('[Gamification] Priorité détectée :', nbEtoiles, 'étoiles, XP =', xp, ', type =', typeCloture);
                                    }
                                    // Fallback couleur si jamais la priorité n'est pas trouvée
                                    let titreElem = document.querySelector('.o_form_view input[name="name"], .o_form_view .o_field_widget.o_field_char, .o_form_view h1, .o_form_view .o_form_label');
                                    let color = '';
                                    if (titreElem) {
                                        let el = titreElem;
                                        while (el && el.classList && !el.classList.contains('o_form_view')) {
                                            color = window.getComputedStyle(el).color;
                                            if (color && color !== 'rgb(234, 234, 234)' && color !== 'rgb(0, 0, 0)' && color !== 'rgb(255, 255, 255)') break;
                                            el = el.parentElement;
                                        }
                                        if (!color) color = window.getComputedStyle(titreElem).color;
                                        console.log('[Gamification] Couleur du titre détectée (robuste) :', color);
                                        let r, g, b;
                                        const match = color.match(/rgb\((\d+), (\d+), (\d+)\)/);
                                        if (match) {
                                            r = parseInt(match[1]);
                                            g = parseInt(match[2]);
                                            b = parseInt(match[3]);
                                            if (r > 200 && g < 100 && b < 100) { xp = 180; typeCloture = 'important'; }
                                            else if (r > 200 && g > 100 && b < 100) { xp = 140; typeCloture = 'urgent'; }
                                            else if (g > 150 && r < 100 && b < 100) { xp = 120; typeCloture = 'bloquant'; }
                                        }
                                    }
                                    console.log('[Gamification] Nom utilisateur détecté :', userName);
                                    console.log('[Gamification] Attribution de', xp, 'XP à', userName, 'Type:', typeCloture);
                                    // === NOUVEAU : récupération de la durée du timer ===
                                    let duree = 0;
                                    let timerElem = document.querySelector('span[name="timer_start"]');
                                    if (!timerElem) {
                                        timerElem = Array.from(document.querySelectorAll('.o_form_view *')).find(el => /\d{1,2}:\d{2}(:\d{2})?/.test(el.textContent));
                                    }
                                    if (timerElem) {
                                        const match = timerElem.textContent.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
                                        if (match) {
                                            const h = match[3] ? parseInt(match[1], 10) : 0;
                                            const m = match[3] ? parseInt(match[2], 10) : parseInt(match[1], 10);
                                            const s = match[3] ? parseInt(match[3], 10) : parseInt(match[2], 10);
                                            duree = h * 60 + m + (s >= 30 ? 1 : 0); // arrondi à la minute supérieure si >30s
                                        }
                                    }
                                    console.log('[Gamification] Durée détectée (minutes) :', duree);
                                    awardXPToUser(userName, xp, typeCloture, duree);
                                    try {
                                        firebase.database().ref('users/' + encodeURIComponent(userName)).once('value').then(snap => {
                                            const d = snap.val() || {};
                                            const effectId = d.closureEffect || 'auto';
                                            const prestige = Number(d.prestige || 0);
                                            const grad = getClosureGradientById(d.closureColor || 'auto', prestige);
                                            playClosureEffect(effectId, prestige, grad);
                                        });
                                    } catch(e) { /* no-op */ }
                                } else {
                                    console.log('[Gamification] Condition non remplie : XP non attribuée');
                                }

                                // Retirer le ticket de la liste des tickets en cours de traitement
                                processingTickets.delete(ticketId);
                            }, 1200);
                        });
                    }
                });
            }
            // Premier scan
            addListeners();
            // Observe le DOM pour les nouveaux boutons
            const observer = new MutationObserver(addListeners);
            observer.observe(document.body, { childList: true, subtree: true });
        }
        setupCloturerDetection();
        function waitForUserNameAndInit() {
            let tries = 0;
            function tryInit() {
                const userName = getCurrentUserName();
                if (userName && userName !== 'Utilisateur inconnu') {
                    console.log('[Gamification] Utilisateur détecté au chargement :', userName);
                    console.log('[Gamification] Début de la lecture XP Firebase pour', userName);
                    if (typeof firebase === 'undefined') {
                        console.error('[Gamification] Firebase N\'EST PAS chargé !');
                        return;
                    }
                    firebase.database().ref('users/' + encodeURIComponent(userName)).once('value').then(snapshot => {
                        const data = snapshot.val() || {};
                        const xp = typeof data.xp === 'number' ? data.xp : 0;
                        const prestige = typeof data.prestige === 'number' ? data.prestige : 0;
                        // Migration douce: si meilleur rang de saison non défini, tenter depuis localStorage
                        try {
                            if (!data.season1_bestRank) {
                                const lsBest = localStorage.getItem('gamif_last_rank_' + userName);
                                if (lsBest && typeof lsBest === 'string' && lsBest.trim()) {
                                    firebase.database().ref('users/' + encodeURIComponent(userName)).update({ season1_bestRank: lsBest.trim() });
                                }
                            }
                        } catch(e) { /* no-op */ }
                        console.log('[Gamification] Lecture Firebase pour', userName, ':', data, '=> XP utilisée :', xp, 'Prestige :', prestige);
                        updateUI({ xp, prestige });
                        try { refreshMouseEffect(userName); } catch(e) {}
                        try { refreshTicketTheme(userName); } catch(e) {}
                        try { startObserveActionButtons(); } catch(e) {}
                        try { startActionButtonsInterval(); } catch(e) {}
                        // Onboarding v1.0.0 : ne s'affiche qu'une seule fois
                        try {
                            const ackLS = localStorage.getItem('gm_onboarding_v100_ack') === '1';
                            const ackDB = !!data.onboardingV100Ack;
                            if (!ackLS && !ackDB) { showOnboardingV100(userName); }
                        } catch(e) {}
                    });
                } else if (tries < 20) { // essaie pendant 4 secondes max
                    tries++;
                    setTimeout(tryInit, 200);
                } else {
                    console.warn('[Gamification] Impossible de trouver le nom utilisateur après plusieurs essais.');
                }
            }
            tryInit();
        }
        waitForUserNameAndInit();
        // (Aucun bouton de test — supprimé)
        addPodiumButton();
        // --- Ajout : observer de changement d'URL pour SPA ---
        let lastUrl = window.location.href;
        setInterval(() => {
            if (window.location.href !== lastUrl) {
                lastUrl = window.location.href;
                // Recharge l'XP utilisateur pour updateUI
                const userName = getCurrentUserName();
                if (userName && userName !== 'Utilisateur inconnu') {
                    firebase.database().ref('users/' + encodeURIComponent(userName)).once('value').then(snapshot => {
                        const data = snapshot.val() || {};
                        const xp = typeof data.xp === 'number' ? data.xp : 0;
                        const prestige = typeof data.prestige === 'number' ? data.prestige : 0;
                        updateUI({ xp, prestige });
                        // Rafraîchir l'effet de souris sur navigation
                        try { refreshMouseEffect(userName); } catch(e) {}
                        try { refreshTicketTheme(userName); } catch(e) {}
                        try { startObserveActionButtons(); } catch(e) {}
                    });
                }
                // Affiche/masque les boutons Classement et Badges selon la page
                const url = window.location.href;
                const isTicketList = url.includes('model=helpdesk.ticket') && url.includes('view_type=list');
                const isTicketForm = url.includes('model=helpdesk.ticket') && url.includes('view_type=form');
                const podiumBtn = document.getElementById('podium-btn');
                const badgesBtn = document.getElementById('badges-btn');
                if (podiumBtn) podiumBtn.style.display = (isTicketList || isTicketForm) ? '' : 'none';
                if (badgesBtn) badgesBtn.style.display = (isTicketList || isTicketForm) ? '' : 'none';
                // Ajout automatique des boutons si besoin
                addPodiumButton();
                addBadgesButton();
                try { enforceActionButtonsContrast(); } catch(e) {}
                try { startActionButtonsInterval(); } catch(e) {}
            }
        }, 500);
        if (!document.getElementById('podium-animations')) {
            const style = document.createElement('style');
            style.id = 'podium-animations';
            style.innerHTML = `
                @keyframes popupIn { from { opacity:0; transform:translate(-50%,-60%);} to { opacity:1; transform:translate(-50%,-50%);} }
                @keyframes fadeInBg { from { opacity:0; } to { opacity:1; } }
            `;
            document.head.appendChild(style);
        }
        if (!document.getElementById('rank-animations')) {
            const style = document.createElement('style');
            style.id = 'rank-animations';
            style.innerHTML = `
                @keyframes fadeInNotif { from { opacity:0; } to { opacity:1; } }
                @keyframes glowing {
                    0% { box-shadow: 0 0 8px 2px #fff, 0 0 32px 8px var(--glow-color); }
                    50% { box-shadow: 0 0 32px 16px var(--glow-color), 0 0 64px 24px #fff; }
                    100% { box-shadow: 0 0 8px 2px #fff, 0 0 32px 8px var(--glow-color); }
                }
                @keyframes glowingNotif {
                    0% { box-shadow: 0 0 0 0 var(--glow-color), 0 8px 32px rgba(0,0,0,0.18); }
                    40% { box-shadow: 0 0 64px 24px var(--glow-color), 0 8px 32px rgba(0,0,0,0.18); }
                    100% { box-shadow: 0 0 0 0 var(--glow-color), 0 8px 32px rgba(0,0,0,0.18); }
                }
                @keyframes spinSlow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes ringBreath {
                  0% { transform: scale(1); filter: drop-shadow(0 0 6px rgba(255,255,255,0.2)); }
                  50% { transform: scale(1.04); filter: drop-shadow(0 0 12px rgba(255,255,255,0.35)); }
                  100% { transform: scale(1); filter: drop-shadow(0 0 6px rgba(255,255,255,0.2)); }
                }
            `;
            document.head.appendChild(style);
        }
        if (!document.getElementById('xp-animations')) {
            const style = document.createElement('style');
            style.id = 'xp-animations';
            style.innerHTML = `
                @keyframes xpGainAnimation {
                    0% {
                        opacity: 0;
                        transform: translate(-50%, 20px);
                    }
                    20% {
                        opacity: 1;
                        transform: translate(-50%, 0);
                    }
                    80% {
                        opacity: 1;
                        transform: translate(-50%, 0);
                    }
                    100% {
                        opacity: 0;
                        transform: translate(-50%, -20px);
                    }
                }
            `;
            document.head.appendChild(style);
        }
        // Ajoute la fonction pour afficher le popup central de détail d'un jour
        function showDayDetailPopup(date, logs) {
            // Supprime tout popup existant
            let old = document.getElementById('day-detail-popup');
            if (old) old.remove();
            let oldBg = document.getElementById('day-detail-bg');
            if (oldBg) oldBg.remove();
            const bg = document.createElement('div');
            bg.id = 'day-detail-bg';
            bg.style.cssText = `
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0,0,0,0.35);
                z-index: 9999;
                animation: fadeInBg 0.3s;
            `;
            document.body.appendChild(bg);
            const popup = document.createElement('div');
            popup.id = 'day-detail-popup';
            popup.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(34,40,49,0.93);
                color: #f3f6fa;
                border-radius: 18px;
                box-shadow: 0 0 32px 8px #26e0ce, 0 8px 32px rgba(0,0,0,0.18);
                z-index: 10000;
                min-width: 400px;
                max-width: 99vw;
                padding: 48px 48px 32px 48px;
                font-family: 'Segoe UI', Arial, sans-serif;
                text-align: center;
                animation: popupIn 0.3s;
                backdrop-filter: blur(6px);
                border: 2px solid #26e0ce44;
            `;
            const dayName = new Date(date).toLocaleDateString('fr-FR', { weekday: 'long' });
            const capitalizedDayName = dayName.charAt(0).toUpperCase() + dayName.slice(1);
            let html = `<div style="font-size:1.5em;margin-bottom:18px;font-weight:bold;letter-spacing:1px;">Détail des appels du ${capitalizedDayName} ${date}</div>`;
            if (logs.length === 0) {
                html += `<div style='color:#aaa;'>Aucun appel clôturé ce jour.</div>`;
            } else {
                html += `<table style='width:100%;border-collapse:collapse;'>
                    <thead><tr style='background:#23272f;'><th style='padding:6px 14px;'>Heure</th><th>Type</th></tr></thead>
                    <tbody>
                        ${logs.sort((a, b) => (b.time || '').localeCompare(a.time || '')).map(log => `<tr><td style='padding:6px 14px;font-size:1.1em;'>${log.time || ''}</td><td style='padding:6px 14px;font-size:1.1em;'>${formatTypeLabel(log.type || '')}</td></tr>`).join('')}
                    </tbody>
                </table>`;
            }
            html += `<button id='close-day-detail-btn' style='margin-top:22px;padding:9px 28px;border:none;border-radius:8px;background:#4caf50;color:white;font-size:1.1em;cursor:pointer;'>Fermer</button>`;
            popup.innerHTML = html;
            document.body.appendChild(popup);
            document.getElementById('close-day-detail-btn').onclick = () => {
                popup.remove();
                bg.remove();
            };
            bg.onclick = () => {
                popup.remove();
                bg.remove();
            };
        }
        window.showDayDetailPopup = showDayDetailPopup;
        // Ajoute la fonction pour afficher le popup central de détail d'une période (semaine/mois)
        function showPeriodDetailPopup(periodLabel, days, logs) {
            // Supprime tout popup existant
            let old = document.getElementById('period-detail-popup');
            if (old) old.remove();
            let oldBg = document.getElementById('period-detail-bg');
            if (oldBg) oldBg.remove();
            const bg = document.createElement('div');
            bg.id = 'period-detail-bg';
            bg.style.cssText = `
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0,0,0,0.35);
                z-index: 9999;
                animation: fadeInBg 0.3s;
            `;
            document.body.appendChild(bg);
            const popup = document.createElement('div');
            popup.id = 'period-detail-popup';
            popup.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(34,40,49,0.93);
                color: #f3f6fa;
                border-radius: 18px;
                box-shadow: 0 0 32px 8px #26e0ce, 0 8px 32px rgba(0,0,0,0.18);
                z-index: 10000;
                min-width: 400px;
                max-width: 99vw;
                padding: 48px 48px 32px 48px;
                font-family: 'Segoe UI', Arial, sans-serif;
                text-align: center;
                animation: popupIn 0.3s;
                backdrop-filter: blur(6px);
                border: 2px solid #26e0ce44;
            `;
            let html = `<div style="font-size:1.5em;margin-bottom:18px;font-weight:bold;letter-spacing:1px;">Détail : ${periodLabel}</div>`;
            html += `<div style='max-height:420px;overflow-y:auto;'><table style='width:100%;border-collapse:collapse;'>
                <thead><tr style='background:#23272f;'><th style='padding:6px 14px;'>Date</th><th>Normal</th><th>Important</th><th>Urgent</th><th>Bloquant</th><th>Total</th></tr></thead><tbody>`;
            days.forEach(date => {
                const dayLogs = logs.filter(l => l.date === date);
                const types = { normal: 0, important: 0, urgent: 0, bloquant: 0 };
                dayLogs.forEach(l => { if (types[l.type] !== undefined) types[l.type]++; });
                const total = dayLogs.length;
                const dayName = new Date(date).toLocaleDateString('fr-FR', { weekday: 'long' });
                const capitalizedDayName = dayName.charAt(0).toUpperCase() + dayName.slice(1);
                html += `<tr><td style='padding:6px 14px;'><button class='show-day-detail-btn-popup' data-date='${date}' data-logs='${encodeURIComponent(JSON.stringify(dayLogs))}' style='background:none;border:none;color:#26e0ce;cursor:pointer;font-size:1em;text-decoration:underline;'>${capitalizedDayName} ${date}</button></td>` +
                    `<td>${formatStatNumber(types.normal, 'normal')}</td>` +
                    `<td>${formatStatNumber(types.important, 'important')}</td>` +
                    `<td>${formatStatNumber(types.urgent, 'urgent')}</td>` +
                    `<td>${formatStatNumber(types.bloquant, 'bloquant')}</td>` +
                    `<td><span style='font-size:1.25em;font-weight:bold;color:#fff;'>${total}</span></td></tr>`;
            });
            html += `</tbody></table></div>`;
            html += `<button id='close-period-detail-btn' style='margin-top:22px;padding:9px 28px;border:none;border-radius:8px;background:#4caf50;color:white;font-size:1.1em;cursor:pointer;'>Fermer</button>`;
            popup.innerHTML = html;
            document.body.appendChild(popup);
            document.getElementById('close-period-detail-btn').onclick = () => {
                popup.remove();
                bg.remove();
            };
            bg.onclick = () => {
                popup.remove();
                bg.remove();
            };
            // Ajoute event sur chaque jour du popup
                    setTimeout(() => {
                document.querySelectorAll('.show-day-detail-btn-popup').forEach(btn => {
                    btn.addEventListener('click', function(e) {
                        e.preventDefault();
                        const date = this.getAttribute('data-date');
                        const logs = JSON.parse(decodeURIComponent(this.getAttribute('data-logs')));
                        showDayDetailPopup(date, logs);
                });
        });
            }, 0);
        }

        // === BADGES (HAUTS FAITS) ===
        const allBadges = [
            {
                id: 'poussin_motive',
                name: 'Poussin motivé',
                phrase: 'Il faut un début à tout…',
                description: 'Clôturer 5 tickets en une seule journée',
                img: 'https://i.imgur.com/xYip92S.png',
                check: function(logs) {
                    return logs.length >= 5;
                }
            },
            {
                id: 'roi_tombe',
                name: 'La Tête du roi est tombée...',
                phrase: 'Le trône vacille, tu as frappé fort !',
                description: 'Clôturer plus de 61 tickets en une seule journée',
                img: 'https://i.imgur.com/MaC8BD8.png',
                check: function(logs) {
                    return logs.length > 61;
                }
            },
            {
                id: 'allokoi',
                name: 'Allô quoi !',
                phrase: "J'ai appelé 10 fois. Même Nabilla n'a pas fait mieux.",
                description: 'Clôturer 10 tickets en une seule journée',
                img: 'https://i.imgur.com/ziLlvJr.png',
                check: function(logs) {
                    return logs.length >= 10;
                }
            },
            {
                id: 'agent_007',
                name: 'Agent 007',
                phrase: '0 pause 0 café 7 appels',
                description: 'Clôturer 7 tickets en moins d\'une heure',
                img: 'https://i.imgur.com/t5qs7s8.png',
                check: function(logs) {
                    // On trie les logs par heure croissante
                    const sorted = logs
                        .filter(l => l.time)
                        .sort((a, b) => a.time.localeCompare(b.time));

                    // Pour chaque log, on regarde s'il y a 7 clôtures dans la même heure glissante
                    for (let i = 0; i <= sorted.length - 7; i++) {
                        const first = sorted[i];
                        const last = sorted[i + 6];

                        // Convertir les heures en minutes pour faciliter la comparaison
                        const [firstHour, firstMin] = first.time.split(':').map(Number);
                        const [lastHour, lastMin] = last.time.split(':').map(Number);

                        const firstMinutes = firstHour * 60 + firstMin;
                        const lastMinutes = lastHour * 60 + lastMin;

                        // Vérifier si les 7 clôtures sont dans la même heure
                        if (lastMinutes - firstMinutes <= 60) {
                            return true;
                        }
                    }
                    return false;
                }
            },
            {
                id: 'un_nouvelle_famille',
                name: 'Un Nouvelle Famille',
                phrase: 'Tu es resté assez longtemps avec ce client pour te considérer comme un nouveau membre de la famille, bravo !',
                description: 'Rester plus de 50 minutes avec un client',
                img: 'https://i.imgur.com/I0qNYnJ.png',
                check: function(logs) {
                    return logs.some(l => l.duree && Number(l.duree) >= 50);
                }
            },
            {
                id: 'le_repas_de_famille',
                name: 'Le repas de famille',
                phrase: 'Après être entré dans sa famille, place au repas que tout le monde apprécie tant. Haaa la belle famille…',
                description: 'Rester plus de 2h avec un client au téléphone',
                img: 'https://i.imgur.com/EeN6147.png',
                check: function(logs) {
                    return logs.some(l => l.duree && Number(l.duree) >= 120);
                }
            },
            {
                id: 'naissance_hero',
                name: "La naissance d'un hero ?",
                phrase: "Qu'on mette une cape sur ce super mec / meuf",
                description: '20 appels jours',
                img: 'https://i.imgur.com/kz6asVd.png',
                check: function(logs) {
                    return logs.length >= 20;
                }
            },
            {
                id: 'legende_hotline',
                name: "La légende de la hotline",
                phrase: "tu n'as plus rien à prouver . Mais te la Pete pas non plus .",
                description: "30 appels en une journée",
                img: 'https://i.imgur.com/Z0dagDT.png',
                check: function(logs) {
                    return logs.length >= 30;
                }
            },
            {
                id: 'pastaga_51',
                name: "Ho mon Pastaga que je t'aime",
                phrase: "Ho mon Pastaga que je t'aime",
                description: "51 appels en deux jours (pile-poil 51)",
                img: 'https://i.imgur.com/fTaJQAr.png',
                check: function(logs) {
                    // On cherche deux jours consécutifs avec au total exactement 51 clôtures
                    const byDay = {};
                    logs.forEach(l => { if (l.date) byDay[l.date] = (byDay[l.date]||0)+1; });
                    const dates = Object.keys(byDay).sort();
                    for (let i = 0; i < dates.length - 1; i++) {
                        const d1 = dates[i];
                        const d2 = dates[i+1];
                        // Vérifie que les deux jours sont consécutifs
                        const date1 = new Date(d1);
                        const date2 = new Date(d2);
                        if ((date2 - date1) === 24*60*60*1000) {
                            if ((byDay[d1] + byDay[d2]) === 51) {
                                return true;
                            }
                        }
                    }
                    return false;
                }
            },
            {
                id: 'poussin_tres_motive_retour',
                name: 'le poussin tres motivé (le retour)',
                phrase: "t'es plutot motivé pour un vendredi, en tout cas bien plus que le poussin...",
                description: 'Faire 7 appels un vendredi matin (avant 12h)',
                img: 'https://i.imgur.com/roeGJ7X.png',
                hidden: true,
                check: function(logs) {
                    // Vérifie si c'est un vendredi
                    const today = new Date();
                    if (today.getDay() !== 5) return false;

                    // Compte les appels avant 12h
                    return logs.filter(l => {
                        if (!l.time) return false;
                        const [hours] = l.time.split(':').map(Number);
                        return hours < 12;
                    }).length >= 7;
                }
            },
            {
                id: 'poussin_ultra_motiver_pro_max',
                name: 'Le Poussin ULTRA MOTIVÉ pro max',
                phrase: "Tu veux un verre d'eau ? Un café ? Mais qui peut te stopper ? En tout cas, ce n'est pas le poussin qui va t'aider...",
                description: 'Faire 14 appels un vendredi matin (avant 12h)',
                img: 'https://i.imgur.com/sMlUdBf.png',
                hidden: true,
                check: function(logs) {
                    // Vérifie si c'est un vendredi
                    const today = new Date();
                    if (today.getDay() !== 5) return false;

                    // Compte les appels avant 12h
                    return logs.filter(l => {
                        if (!l.time) return false;
                        const [hours] = l.time.split(':').map(Number);
                        return hours < 12;
                    }).length >= 14;
                }
            }
        ];

        // Ajout du bouton Badges dans le menu
        function addBadgesButton() {
            if (document.getElementById('badges-btn') && document.getElementById('rewards-btn')) return;
            // Ancrage sur le bouton Analyse si présent
            const analyseBtn = document.querySelector('.o_menu_sections .dropdown-toggle[title="Analyse"]');
            if (!analyseBtn) return setTimeout(addBadgesButton, 1000);
            // Récompenses
            if (!document.getElementById('rewards-btn')) {
                const rewardsBtn = analyseBtn.cloneNode(true);
                rewardsBtn.id = 'rewards-btn';
                rewardsBtn.title = 'Récompenses';
                rewardsBtn.setAttribute('data-section', 'rewards');
                rewardsBtn.innerHTML = '<span>🎁 Récompenses</span>';
                rewardsBtn.onclick = (e) => { e.stopPropagation(); showShopPopup('rewards-only'); };
                analyseBtn.parentElement.insertAdjacentElement('afterend', rewardsBtn);
            }
            // Badges
            if (!document.getElementById('badges-btn')) {
                const anchor = document.getElementById('rewards-btn') || analyseBtn;
                const btn = anchor.cloneNode(true);
            btn.id = 'badges-btn';
            btn.title = 'Voir les badges';
            btn.setAttribute('data-section', 'badges');
            btn.innerHTML = '<span>🎖️ Badges</span>';
                btn.onclick = (e) => { e.stopPropagation(); showBadgesPopup(); };
                anchor.parentElement.insertAdjacentElement('afterend', btn);
            }
        }
        addBadgesButton();

        // Affichage de la popup des badges
        function showBadgesPopup() {
            let old = document.getElementById('badges-popup');
            if (old) old.remove();
            let oldBg = document.getElementById('badges-bg');
            if (oldBg) oldBg.remove();
            const bg = document.createElement('div');
            bg.id = 'badges-bg';
            bg.style.cssText = `position: fixed;top: 0; left: 0; right: 0; bottom: 0;background: rgba(0,0,0,0.35);z-index: 9999;animation: fadeInBg 0.3s;`;
            document.body.appendChild(bg);
            const popup = document.createElement('div');
            popup.id = 'badges-popup';
            popup.style.cssText = `position: fixed;top: 50%;left: 50%;transform: translate(-50%, -50%);background: rgba(34,40,49,0.93);color: #f3f6fa;border-radius: 18px;box-shadow: 0 0 32px 8px #26e0ce, 0 8px 32px rgba(0,0,0,0.18);z-index: 10000;min-width: 0;max-width: 98vw;width:95vw;max-height:90vh;overflow-y:auto;padding: 32px 8vw 24px 8vw;font-family: 'Segoe UI', Arial, sans-serif;text-align: center;animation: popupIn 0.3s;backdrop-filter: blur(6px);border: 2px solid #26e0ce44;`;
            // Ajout d'un style pour masquer la scrollbar mais permettre le scroll
            if (!document.getElementById('badges-scrollbar-style')) {
                const style = document.createElement('style');
                style.id = 'badges-scrollbar-style';
                style.innerHTML = `
                #badges-popup::-webkit-scrollbar { display: none !important; width: 0 !important; }
                #badges-popup { scrollbar-width: none !important; -ms-overflow-style: none !important; }
                @media (max-width: 600px) {
                  #badges-popup { padding: 12px 2vw 12px 2vw !important; }
                }
                `;
                document.head.appendChild(style);
            }
            popup.innerHTML = `<div style="font-size:2.2em;margin-bottom:18px;font-weight:bold;letter-spacing:1px;">🎖️ Mes badges</div><div id='badges-list' style='display:flex;flex-wrap:wrap;gap:32px;justify-content:center;'></div><button id="close-badges-btn" style="margin-top:22px;padding:9px 28px;border:none;border-radius:8px;background:#4caf50;color:white;font-size:1.1em;cursor:pointer;">Fermer</button>`;
            document.body.appendChild(popup);
            document.getElementById('close-badges-btn').onclick = () => { popup.remove(); bg.remove(); };
            bg.onclick = () => { popup.remove(); bg.remove(); };
            // Charger les badges débloqués
            const userName = getCurrentUserName();
            firebase.database().ref('users/' + encodeURIComponent(userName) + '/badges').once('value').then(snapshot => {
                const unlocked = snapshot.val() || {};
                const list = document.getElementById('badges-list');
                // Affiche uniquement les badges (pas les ornements)
                list.innerHTML = allBadges.filter(badge => typeof badge.check === 'function').map(badge => {
                    const isUnlocked = unlocked[badge.id];
                    const isHidden = badge.hidden && !isUnlocked;
                    return `<div style='background:${isUnlocked ? '#23272f' : '#181a1f'};border-radius:14px;padding:18px 18px 12px 18px;min-width:180px;max-width:220px;box-shadow:none;display:flex;flex-direction:column;align-items:center;gap:8px;opacity:${isUnlocked?1:0.5};'>
                        <img src='${badge.img}' alt='${isHidden ? 'Badge caché' : badge.name}' class='badge-img-clickable' style='width:70px;height:70px;object-fit:contain;border-radius:50%;background:#e0e0e0;filter:${isUnlocked?'':'grayscale(1) brightness(0.1)'};cursor:${isUnlocked&&!isHidden?'pointer':'default'};${isHidden?'pointer-events:none;':''}' data-img='${badge.img}' data-name='${badge.name}'/>
                        <div style='font-size:1.15em;font-weight:bold;color:#26e0ce;margin-bottom:2px;text-shadow:0 0 12px #26e0ce;'>${isHidden?'???':badge.name}</div>
                        <div style='font-size:1em;color:#fff;margin-bottom:2px;'>${isHidden?'???':badge.phrase}</div>
                        <div style='font-size:0.98em;color:#aaa;'>${isHidden?'???':badge.description}</div>
                        ${isUnlocked ? `<div style='margin-top:6px;color:#4caf50;font-weight:bold;'>Débloqué !</div>` : ''}
                    </div>`;
                }).join('');
                // Ajout du clic pour agrandir l'image
                setTimeout(() => {
                    document.querySelectorAll('.badge-img-clickable').forEach(img => {
                        img.onclick = function(e) {
                            e.stopPropagation();
                            // Supprime toute popup d'image précédente
                            let old = document.getElementById('badge-img-popup');
                            let oldBg = document.getElementById('badge-img-bg');
                            if (old) old.remove();
                            if (oldBg) oldBg.remove();
                            // Crée le fond
                            const bg = document.createElement('div');
                            bg.id = 'badge-img-bg';
                            bg.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.55);z-index:10001;';
                            document.body.appendChild(bg);
                            // Crée la popup
                            const popup = document.createElement('div');
                            popup.id = 'badge-img-popup';
                            popup.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(34,40,49,0.97);padding:32px 32px 24px 32px;border-radius:18px;box-shadow:0 0 32px 8px #26e0ce,0 8px 32px rgba(0,0,0,0.18);z-index:10002;display:flex;flex-direction:column;align-items:center;';
                            popup.innerHTML = `<img src='${img.dataset.img}' alt='${img.dataset.name}' style='max-width:320px;max-height:320px;object-fit:contain;margin-bottom:18px;border-radius:50%;background:#e0e0e0;'/><div style='color:#26e0ce;font-size:1.2em;font-weight:bold;'>${img.dataset.name}</div><button id='close-badge-img-btn' style='margin-top:18px;padding:8px 24px;border:none;border-radius:8px;background:#4caf50;color:white;font-size:1.1em;cursor:pointer;'>Fermer</button>`;
                            document.body.appendChild(popup);
                            document.getElementById('close-badge-img-btn').onclick = () => { popup.remove(); bg.remove(); };
                            bg.onclick = () => { popup.remove(); bg.remove(); };
                        };
                    });
                }, 0);
            });
        }

        // Affichage de la popup de la boutique
        function showShopPopup(mode = 'rewards-only') {
            let old = document.getElementById('shop-popup');
            if (old) old.remove();
            let oldBg = document.getElementById('shop-bg');
            if (oldBg) oldBg.remove();
            const bg = document.createElement('div');
            bg.id = 'shop-bg';
            bg.style.cssText = `position: fixed;top: 0; left: 0; right: 0; bottom: 0;background: rgba(0,0,0,0.35);z-index: 9999;animation: fadeInBg 0.3s;`;
            document.body.appendChild(bg);
            const popup = document.createElement('div');
            popup.id = 'shop-popup';
            popup.style.cssText = `position: fixed;top: 50%;left: 50%;transform: translate(-50%, -50%);background: rgba(34,40,49,0.93);color: #f3f6fa;border-radius: 18px;box-shadow: 0 0 32px 8px #26e0ce, 0 8px 32px rgba(0,0,0,0.18);z-index: 10000;min-width: 0;max-width: 98vw;width:95vw;max-height:90vh;overflow-y:auto;padding: 32px 8vw 24px 8vw;font-family: 'Segoe UI', Arial, sans-serif;text-align: center;animation: popupIn 0.3s;backdrop-filter: blur(6px);border: 2px solid #26e0ce44;`;

            // Ajout d'un style pour masquer la scrollbar mais permettre le scroll
            if (!document.getElementById('shop-scrollbar-style')) {
                const style = document.createElement('style');
                style.id = 'shop-scrollbar-style';
                style.innerHTML = `
                #shop-popup::-webkit-scrollbar { display: none !important; width: 0 !important; }
                #shop-popup { scrollbar-width: none !important; -ms-overflow-style: none !important; }
                @media (max-width: 600px) {
                  #shop-popup { padding: 12px 2vw 12px 2vw !important; }
                }
                `;
                document.head.appendChild(style);
            }

            popup.innerHTML = `
                <div style="font-size:2.2em;margin-bottom:18px;font-weight:bold;letter-spacing:1px;">🎁 Récompenses</div>
                <div id="prestige-cta" style="margin:6px auto 16px auto;max-width:900px;border-radius:12px;padding:14px 16px;text-align:left;display:none;background:linear-gradient(90deg,#1f2b36,#222c38);border:1px solid #26e0ce55;box-shadow:0 0 24px #26e0ce22;"></div>
                <div id="season1-summary" style="margin:6px auto 16px auto;max-width:900px;background:#1c222b;border:1px solid #26e0ce33;border-radius:12px;padding:10px 14px;text-align:left;display:none;">
                  <div style="font-weight:700;color:#26e0ce;margin-bottom:6px;">Saison 1</div>
                  <div id="season1-best" style="color:#e0e0e0;margin-bottom:8px;"></div>
                  <div id="season1-ornements" style="display:flex;gap:10px;flex-wrap:wrap;"></div>
                </div>
                <div id="prestige-summary" style="margin:6px auto 16px auto;max-width:900px;background:#1c222b;border:1px solid #26e0ce33;border-radius:12px;padding:10px 14px;text-align:left;">
                  <div style="font-weight:700;color:#26e0ce;margin-bottom:6px;">Prestige</div>
                  <div id="prestige-level" style="color:#e0e0e0;margin-bottom:8px;"></div>
                  <div id="prestige-medals" style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:8px;"></div>
                  <div style="color:#bfc1c2;font-size:0.95em;">Des récompenses dédiées au prestige arriveront prochainement.</div>
                    </div>
                <div id="rewards-content" class="shop-tab-content" style="display:block;">
                    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;justify-items:center;max-width:900px;margin:0 auto;" id="user-rewards">
                        <div style="color:#aaa;">Chargement des récompenses...</div>
                    </div>
                </div>
                <button id="close-shop-btn" style="margin-top:22px;padding:9px 28px;border:none;border-radius:8px;background:#4caf50;color:white;font-size:1.1em;cursor:pointer;">Fermer</button>
            `;
            document.body.appendChild(popup);

            // Pas d'onglets: uniquement Récompenses

            document.getElementById('close-shop-btn').onclick = () => { popup.remove(); bg.remove(); };
            bg.onclick = () => { popup.remove(); bg.remove(); };

            // Charger les données utilisateur (pour prestige)
            const userName = getCurrentUserName();
            firebase.database().ref('users/' + encodeURIComponent(userName)).once('value').then(snapshot => {
                const data = snapshot.val() || {};
                const xp = Number(data.xp || 0);
                const prestige = Number(data.prestige || 0);
                const level = getLevelFromXp(xp).level;
                // Bouton de prestige si niveau max atteint
                const rewardsContainer = document.getElementById('rewards-content');
                // Le bouton de passage de prestige central est supprimé (doublon).
            });

            // === ORNEMENTS & CATEGORIES DE RECOMPENSES ===
            // Préférences utilisateur pour effets de clôture
            function renderClosureEffectsCategory(user) {
                const wrap = document.createElement('div');
                wrap.style.cssText = 'grid-column:1/-1;justify-self:stretch;margin:10px 0 2px 0;text-align:left;';
                const currentPrestige = Number(user.prestige||0);
                const options = [
                  {id:'auto',label:"Auto (selon prestige)",unlock:()=>currentPrestige>=0},
                  {id:'none',label:'Aucun (désactivé)',unlock:()=>currentPrestige>=0},
                  {id:'confetti',label:'Confettis (P1+)',unlock:()=>currentPrestige>=1},
                  {id:'ring',label:'Onde circulaire (P3+)',unlock:()=>currentPrestige>=3},
                  {id:'comet',label:'Comète (P4+)',unlock:()=>currentPrestige>=4},
                  {id:'starfall',label:'Pluie d’étoiles (P5+)',unlock:()=>currentPrestige>=5},
                  {id:'silver',label:'Explosions (P6)',unlock:()=>currentPrestige>=6},
                  {id:'fireworks',label:'Feu d’artifice (P7+)',unlock:()=>currentPrestige>=7},
                  {id:'neon',label:'Rayons néon (P8+)',unlock:()=>currentPrestige>=8},
                  {id:'thunder',label:'Thunder (P9+)',unlock:()=>currentPrestige>=9},
                  {id:'epic',label:'Épique (P10)',unlock:()=>currentPrestige>=10},
                  {id:'rainbow_combo',label:'Effet du Maître (P10 Lv100)',unlock:()=>currentPrestige>=10 && (getLevelFromXp(Number(user.xp||0)).level>=100)}
                ];
                const selected = user.closureEffect || 'auto';
                const selectedColor = user.closureColor || 'auto';
                const rows = options.filter(o=>o.unlock()).map(o=>{
                    const disabled = false;
                    return `<label style='display:flex;align-items:center;gap:10px;margin:6px 0;color:#e0e0e0;'>
                        <input type='radio' name='closure-effect' value='${o.id}' ${selected===o.id?'checked':''} ${disabled?'disabled':''} />
                        <span>${o.label}</span>
                        ${selected===o.id?`<span style='margin-left:8px;font-size:.9em;color:#26e0ce;'>Sélectionné</span>`:''}
                    </label>`;
                }).join('');
                const colorChips = closureColorPalette.filter(c => c.id!=='rainbow' || (currentPrestige>=10 && (getLevelFromXp(Number(user.xp||0)).level>=100))).map(c => {
                    const grad = c.id==='auto'
                        ? `linear-gradient(90deg,#26e0ce,#209cff)`
                        : (c.id==='rainbow' ? `linear-gradient(90deg,#ff0080,#ff8c00,#ffff00,#00ff00,#00ffff,#0000ff,#8b00ff)` : `linear-gradient(90deg,${c.start},${c.end})`);
                    const sel = selectedColor===c.id ? 'outline:2px solid #26e0ce;box-shadow:0 0 12px #26e0ce66;' : '';
                    return `<button class='closure-color' data-color='${c.id}' title='${c.label}' style="width:26px;height:26px;border-radius:50%;border:0;cursor:pointer;background:${grad};${sel}"></button>`;
                }).join('');
                wrap.innerHTML = `<div style='color:#26e0ce;font-weight:800;margin:6px 0;'>Effets de clôture</div>
                <div id='closure-effects-options' style='background:#23272f;border-radius:12px;padding:12px 14px;border:1px solid #26e0ce22;'>
                  ${rows || "<div style='color:#aaa;'>Aucun effet disponible pour l’instant.</div>"}
                  <div style='margin-top:10px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;'>
                    <span style='color:#bfc1c2;font-size:.95em;margin-right:6px;'>Couleur:</span>
                    ${colorChips}
                  </div>
                </div>`;
                setTimeout(()=>{
                    wrap.querySelectorAll('input[name="closure-effect"]').forEach(inp=>{
                        inp.onchange = function(){
                            const val = this.value;
                            const userName = getCurrentUserName();
                            const color = selectedColor;
                            const grad = getClosureGradientById(color, currentPrestige);
                            firebase.database().ref('users/' + encodeURIComponent(userName)).update({ closureEffect: val }).then(()=>{
                                playClosureEffect(val, currentPrestige, grad);
                            });
                        };
                    });
                    // Attacher sur le document plutôt que sur wrap (le wrap reconstruit après refresh)
                    document.querySelectorAll('.closure-color').forEach(btn=>{
                        btn.onclick = function(){
                            const colorId = this.getAttribute('data-color');
                            const userName = getCurrentUserName();
                            const grad = getClosureGradientById(colorId, currentPrestige);
                            firebase.database().ref('users/' + encodeURIComponent(userName)).update({ closureColor: colorId }).then(()=>{
                                const curEffect = (document.querySelector('input[name="closure-effect"]:checked')||{}).value || 'auto';
                                playClosureEffect(curEffect, currentPrestige, grad);
                                // Mettre en évidence la sélection sans recharger tout
                                document.querySelectorAll('.closure-color').forEach(el=>{ el.style.outline='none'; el.style.boxShadow='none'; });
                                this.style.outline='2px solid #26e0ce'; this.style.boxShadow='0 0 12px #26e0ce66';
                            });
                        };
                    });
                },0);
                return wrap.outerHTML;
            }
            function getRankIndex(rankName) {
              return ranks.findIndex(r => r.name === rankName);
            }
            const allOrnaments = [
              {
                id: 'dieu_flamme',
                name: 'Flammes du Dieu des appels',
                img: 'https://i.imgur.com/ZdQCAkg.png',
                description: 'Ornement exclusif pour le rang DIEU DES APPELS',
                minRank: 'DIEU DES APPELS',
                unlock: user => {
                  const userRank = (user && user.season1_bestRank) ? user.season1_bestRank : getCurrentRank(user.xp).name;
                  return getRankIndex(userRank) >= getRankIndex('DIEU DES APPELS');
                }
              },
              {
                id: 'maitre_eclair',
                name: 'Eclairs du Maître des appels',
                img: 'https://i.imgur.com/sKtiPmj.png',
                description: 'Ornement exclusif pour le rang MAÎTRE DES APPELS',
                minRank: 'Maître des appels IV',
                unlock: user => {
                  const userRank = (user && user.season1_bestRank) ? user.season1_bestRank : getCurrentRank(user.xp).name;
                  return getRankIndex(userRank) >= getRankIndex('Maître des appels IV');
                }
              },
              {
                id: 'diamant',
                name: 'Aura du Diamant',
                img: 'https://i.imgur.com/JLyduRZ.png',
                description: 'Ornement exclusif pour le rang DIAMANT',
                minRank: 'Diamant IV',
                unlock: user => {
                  const userRank = (user && user.season1_bestRank) ? user.season1_bestRank : getCurrentRank(user.xp).name;
                  return getRankIndex(userRank) >= getRankIndex('Diamant IV');
                }
              },
              {
                id: 'platine',
                name: 'Aura du Platine',
                img: 'https://i.imgur.com/2gpOrLT.png',
                description: 'Ornement exclusif pour le rang PLATINE',
                minRank: 'Platine IV',
                unlock: user => {
                    const userRank = (user && user.season1_bestRank) ? user.season1_bestRank : getCurrentRank(user.xp).name;
                    return getRankIndex(userRank) >= getRankIndex('Platine IV');
                }
              },
                  {
                    id: 'prestige0_rot',
                    name: 'Médaillon Prestige 0 (rotatif)',
                    img: generatePrestigeRingDataURI(0, 80, true),
                    description: 'Débloqué au passage au Prestige 1 (anneau rotatif).',
                    unlock: user => Number(user.prestige || 0) >= 1
              },
              // Ornements Prestiges (anneaux rotatifs P1→P10)
              ...[1,2,3,4,5,6,7,8,9,10].map(p => ({
                id: `prestige${p}_rot`,
                name: `Médaillon Prestige ${p} (rotatif)`,
                img: generatePrestigeRingDataURI(p, 80, true),
                description: `Débloqué au passage au Prestige ${p}.`,
                unlock: user => Number(user.prestige || 0) >= p
              }))
            ];

            const rewardsContent = document.getElementById('user-rewards');
            if (rewardsContent) {
              const userName = getCurrentUserName();
              firebase.database().ref('users/' + encodeURIComponent(userName)).once('value').then(snapshot => {
                const user = snapshot.val() || {};
                user.xp = Number(user.xp) || 0;
                const seasonBest = user.season1_bestRank || null;
                const prestige = Number(user.prestige || 0);
                const lvl = getLevelFromXp(user.xp).level;
                // Injecter le résumé Saison 1 si dispo
                const s1 = document.getElementById('season1-summary');
                if (s1) {
                  if (seasonBest) {
                    s1.style.display = '';
                    const bestDiv = s1.querySelector('#season1-best');
                    bestDiv.textContent = `Rang max atteint: ${seasonBest}`;
                    const ornWrap = s1.querySelector('#season1-ornements');
                    const s1Unlocked = allOrnaments.filter(o => o.minRank && o.unlock(user));
                    ornWrap.innerHTML = s1Unlocked.map(o => `<img src='${o.img}' alt='${o.name}' title='${o.name}' style='width:46px;height:46px;object-fit:contain;border-radius:10px;background:#23272f;padding:6px;border:1px solid #26e0ce22;'>`).join('');
                  } else {
                    s1.style.display = 'none';
                  }
                }
                // Injecter la section Prestige (séparée) et Saison 1 (déjà au-dessus)
                const pSum = document.getElementById('prestige-summary');
                if (pSum) {
                  const grad = getPrestigeGradient(prestige);
                  pSum.querySelector('#prestige-level').innerHTML = `Prestige actuel: <b style="background:linear-gradient(90deg,${grad.start},${grad.end});-webkit-background-clip:text;background-clip:text;color:transparent;">P${prestige}</b>`;
                  const medals = pSum.querySelector('#prestige-medals');
                  const maxMedal = Math.max(0, Math.min(10, prestige));
                  medals.innerHTML = Array.from({length:maxMedal}).map((_,i)=>{
                    const g = getPrestigeGradient(i+1);
                    return `<span title='P${i+1}' style='display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:50%;background:#141a22;border:1px solid #26e0ce22;box-shadow:0 0 10px ${g.start}33 inset;'>
                      <svg width='26' height='26' viewBox='0 0 122 122'>
                        <defs><linearGradient id='pg${i}' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' stop-color='${g.start}'/><stop offset='100%' stop-color='${g.end}'/></linearGradient></defs>
                        <circle cx='61' cy='61' r='48' stroke='url(#pg${i})' stroke-width='10' fill='none'/>
                      </svg>
                    </span>`;
                  }).join('');
                }
                // Afficher un encart CTA si niveau 100 atteint et pas prestige max
                const cta = document.getElementById('prestige-cta');
                if (cta) {
                  if (lvl >= levelProgressionConfig.maxLevel && prestige < levelProgressionConfig.maxPrestige) {
                    const nextP = prestige + 1;
                    const grad = getPrestigeGradient(nextP);
                    cta.style.display = '';
                    cta.innerHTML = `
                      <div style='display:flex;align-items:center;gap:14px;'>
                        <div>
                          <svg width='58' height='58' viewBox='0 0 122 122' style='filter:drop-shadow(0 0 10px ${grad.start});'>
                            <defs><linearGradient id='ctaGrad' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' stop-color='${grad.start}'/><stop offset='100%' stop-color='${grad.end}'/></linearGradient></defs>
                            <circle cx='61' cy='61' r='50' stroke='url(#ctaGrad)' stroke-width='8' fill='#141a22'/>
                            <text x='61' y='69' text-anchor='middle' fill='#fff' font-size='26' font-weight='800'>P${nextP}</text>
                          </svg>
                        </div>
                        <div style='flex:1;'>
                          <div style='font-weight:800;margin-bottom:4px;'>Prêt pour le Prestige ${nextP} ?</div>
                          <div style='color:#bfc1c2;font-size:.95em;'>Passe au prestige pour recommencer au niveau 1 avec un style et une couleur d’XP exclusifs. Les récompenses de saison sont conservées.</div>
                        </div>
                        <div>
                          <button id='cta-prestige-btn' style='padding:10px 16px;border:none;border-radius:10px;background:linear-gradient(90deg,${grad.start},${grad.end});color:#fff;font-weight:700;cursor:pointer;'>Passer Prestige</button>
                        </div>
                      </div>`;
                    const btn = document.getElementById('cta-prestige-btn');
                    btn.onclick = () => {
                      openPrestigePopupForUser(userName, prestige);
                    };
                  } else {
                    cta.style.display = 'none';
                  }
                }
                // Ornements débloqués (liste) — on sépare visuellement Saison 1 vs Prestiges
                const unlockedOrnaments = allOrnaments.filter(o => o.unlock(user));
                const selectedOrnament = user.selectedOrnament || null;
                // Catégorie EFFET de clôture (toujours en premier dans la grille)
                const effectsHtml = renderClosureEffectsCategory(user) || '';
                let html = effectsHtml;
                if (unlockedOrnaments.length === 0) {
                  html += `<div style='color:#aaa;'>Aucun ornement débloqué pour le moment.</div>`;
                } else {
                  // --- Effets de souris (nouvelle catégorie) ---
                  const selectedMouse = !!user.mouseEffectEnabled;
                  const mouseColor = user.mouseEffectColor || 'auto';
                  const mouseStyle = user.mouseEffectStyle || 'particles';
                  // Déblocage Effets de souris: à partir du Prestige 1
                  const unlockedMouse = (prestige >= 1);
                  const mouseChips = closureColorPalette.map(c => {
                    const grad = c.id==='auto' ? `linear-gradient(90deg,#26e0ce,#209cff)` : (c.id==='rainbow' ? `linear-gradient(90deg,#ff0080,#ff8c00,#ffff00,#00ff00,#00ffff,#0000ff,#8b00ff)` : `linear-gradient(90deg,${c.start},${c.end})`);
                    const sel = mouseColor===c.id ? 'outline:2px solid #26e0ce;box-shadow:0 0 12px #26e0ce66;' : '';
                    const disabled = (!unlockedMouse ? 'opacity:.35;pointer-events:none;' : '') + ((c.id==='rainbow' && !(prestige>=10 && lvl>=100)) ? 'opacity:.45;pointer-events:none;' : '');
                    return `<button class='mouse-color' data-color='${c.id}' title='${c.label}' style="width:22px;height:22px;border-radius:50%;border:0;cursor:pointer;background:${grad};${sel}${disabled}"></button>`;
                  }).join('');
                  // Injecter la section Effets de souris en TÊTE de grille
                  html = `
                    <div style='grid-column:1/-1;justify-self:stretch;margin:10px 0 2px 0;text-align:left;color:#26e0ce;font-weight:800;'>Effets de souris</div>
                    <div id='mouse-effects-options' style='grid-column:1/-1;justify-self:stretch;background:#23272f;border-radius:12px;padding:12px 14px;border:1px solid #26e0ce22;display:flex;align-items:center;gap:12px;flex-wrap:wrap;'>
                      <label style='display:flex;align-items:center;gap:8px;color:#e0e0e0;${!unlockedMouse?'opacity:.5;':''}'>
                        <input type='checkbox' id='mouse-enable' ${selectedMouse?'checked':''} ${!unlockedMouse?'disabled':''}/> Activer le trail ${!unlockedMouse?"<span style='color:#ff9800;margin-left:8px;'>— Débloqué au Prestige 1</span>":''}
                      </label>
                      <div style='display:flex;align-items:center;gap:8px;'>
                        <span style='color:#bfc1c2;font-size:.95em;'>Style:</span>
                        <select id='mouse-style' ${!unlockedMouse?'disabled':''} style='background:#1b2028;border:1px solid #26e0ce33;color:#e0e0e0;border-radius:8px;padding:6px 10px;'>
                          <option value='particles' ${mouseStyle==='particles'?'selected':''}>Particules</option>
                          <option value='line' ${mouseStyle==='line'?'selected':''}>Trait</option>
                          <option value='comet' ${mouseStyle==='comet'?'selected':''}>Comète</option>
                          <option value='bubbles' ${mouseStyle==='bubbles'?'selected':''}>Bulles</option>
                          <option value='stars' ${mouseStyle==='stars'?'selected':''}>Étoiles</option>
                          <option value='ribbon' ${mouseStyle==='ribbon'?'selected':''}>Ruban</option>
                        </select>
                      </div>
                      <div style='display:flex;align-items:center;gap:8px;'>
                        <span style='color:#bfc1c2;font-size:.95em;'>Couleur:</span>
                        ${mouseChips}
                      </div>
                      <span style='color:#aaa;font-size:.92em;'>Aperçu immédiat. Explosion au clic.</span>
                    </div>` + html;
                  // --- Thème Tickets (nouvelle catégorie) ---
                  const ticketTheme = user.ticketTheme || 'none';
                  const canUseThemes = Number(user.prestige||0) >= 2;
                  const themeOptions = [
                    { id: 'none', label: 'Aucun (par défaut Odoo)' },
                    { id: 'dark_plus', label: 'Dark Odoo+ (à activer avec le mode sombre d\'Odoo)' },
                    { id: 'redblack', label: 'Rouge / Noir (à activer avec le mode sombre d\'Odoo)' },
                    { id: 'blue', label: 'Bleu nuit (à activer avec le mode sombre d\'Odoo)' },
                    { id: 'green', label: 'Vert sombre (à activer avec le mode sombre d\'Odoo)' },
                    { id: 'light', label: 'Clair (rose bonbon) (à activer avec le thème clair d\'Odoo)' }
                  ];
                  html += `
                    <div style='grid-column:1/-1;justify-self:stretch;margin:10px 0 2px 0;text-align:left;color:#26e0ce;font-weight:800;'>Thème Tickets</div>
                    <div id='ticket-theme-options' style='grid-column:1/-1;justify-self:stretch;background:#23272f;border-radius:12px;padding:12px 14px;border:1px solid #26e0ce22;display:flex;align-items:center;gap:12px;flex-wrap:wrap;${canUseThemes?"":"opacity:.5;"}'>
                      <label style='display:flex;align-items:center;gap:8px;color:#e0e0e0;'>
                        <span style='color:#bfc1c2;font-size:.95em;'>Style:</span>
                        <select id='ticket-theme' ${canUseThemes?"":"disabled"} style='background:#1b2028;border:1px solid #26e0ce33;color:#e0e0e0;border-radius:8px;padding:6px 10px;'>
                          ${themeOptions.map(o=>`<option value='${o.id}' ${ticketTheme===o.id?'selected':''}>${o.label}</option>`).join('')}
                        </select>
                      </label>
                      <span style='color:#aaa;font-size:.92em;'>S’applique aux pages Tickets seulement. Léger (CSS only). ${canUseThemes?"":"— Débloqué au Prestige 2"}</span>
                    </div>`;
                  // Groupe Saison 1
                  const s1Orns = unlockedOrnaments.filter(o => o.minRank);
                  const pOrns  = unlockedOrnaments.filter(o => !o.minRank);
                  const renderTile = (orn) => `
                    <div style='background:#23272f;border-radius:14px;padding:18px 18px 12px 18px;min-width:180px;max-width:220px;box-shadow:none;display:flex;flex-direction:column;align-items:center;gap:8px;${selectedOrnament===orn.id?'border:2px solid #26e0ce;box-shadow:0 0 16px 4px #26e0ce88;':''}'>
                      <img src='${orn.img}' alt='${orn.name}' style='width:80px;height:80px;object-fit:contain;margin-bottom:8px;'>
                      <div style='font-size:1.05em;font-weight:700;color:#e0e0e0;margin-bottom:2px;'>${orn.name}</div>
                      <div style='font-size:0.95em;color:#aaa;margin-bottom:8px;'>${orn.description||''}</div>
                      <button class='select-ornament-btn' data-ornament='${orn.id}' style='padding:7px 18px;border:none;border-radius:8px;background:${selectedOrnament===orn.id?'#26e0ce':'#4caf50'};color:white;font-size:0.98em;cursor:pointer;font-weight:700;'>${selectedOrnament===orn.id?'Sélectionné':'Sélectionner'}</button>
                    </div>`;
                  html += '';
                  if (s1Orns.length) {
                    html += `<div style='grid-column:1/-1;justify-self:stretch;margin:6px 0 2px 0;text-align:left;color:#26e0ce;font-weight:800;'>Saison 1 — Ornements</div>`;
                    html += s1Orns.map(o => {
                      const tile = document.createElement('div');
                      tile.innerHTML = renderTile(o);
                      const img = tile.querySelector('img');
                      if (img) {
                        img.style.filter = 'drop-shadow(0 0 6px rgba(255,255,255,0.2)) drop-shadow(0 0 10px rgba(38,224,206,0.18))';
                      }
                      return tile.innerHTML;
                    }).join('');
                  }
                  if (pOrns.length) {
                    html += `<div style='grid-column:1/-1;justify-self:stretch;margin:10px 0 2px 0;text-align:left;color:#26e0ce;font-weight:800;'>Prestige — Ornements</div>`;
                    html += pOrns.map(orn => {
                      // Remplace l'image par un SVG inline animé si c'est un anneau prestige
                      if (/^prestige(\d+)_rot$/.test(orn.id)) {
                        const p = parseInt(RegExp.$1, 10) || 0;
                        const tile = document.createElement('div');
                        tile.innerHTML = renderTile(orn);
                        const img = tile.querySelector('img');
                        if (img) {
                          img.outerHTML = generatePrestigeRingSVG(p, 80, true);
                        }
                        return tile.innerHTML;
                      }
                      return renderTile(orn);
                    }).join('');
                  }
                }
                rewardsContent.innerHTML = html;
                // Bind des radios de la catégorie EFFET de clôture (après injection DOM)
                setTimeout(() => {
                  const box = document.getElementById('closure-effects-options');
                  if (box) {
                    box.querySelectorAll('input[name="closure-effect"]').forEach(inp => {
                      inp.onchange = function() {
                        const val = this.value;
                        firebase.database().ref('users/' + encodeURIComponent(userName)).update({ closureEffect: val }).then(() => {
                          playClosureEffect(val, prestige);
                        });
                      };
                    });
                  }
                  // Bind Effets de souris
                  const mouseBox = document.getElementById('mouse-effects-options');
                  if (mouseBox) {
                    const cb = mouseBox.querySelector('#mouse-enable');
                    if (cb) cb.onchange = () => {
                      firebase.database().ref('users/' + encodeURIComponent(userName)).update({ mouseEffectEnabled: cb.checked }).then(() => {
                        refreshMouseEffect(userName);
                      });
                    };
                    const sel = mouseBox.querySelector('#mouse-style');
                    if (sel) sel.onchange = () => {
                      const style = sel.value;
                      firebase.database().ref('users/' + encodeURIComponent(userName)).update({ mouseEffectStyle: style }).then(() => {
                        refreshMouseEffect(userName);
                      });
                    };
                    mouseBox.querySelectorAll('.mouse-color').forEach(btn => {
                      btn.onclick = () => {
                        const colorId = btn.getAttribute('data-color');
                        firebase.database().ref('users/' + encodeURIComponent(userName)).update({ mouseEffectColor: colorId }).then(() => {
                          refreshMouseEffect(userName);
                          mouseBox.querySelectorAll('.mouse-color').forEach(el=>{ el.style.outline='none'; el.style.boxShadow='none'; });
                          btn.style.outline='2px solid #26e0ce'; btn.style.boxShadow='0 0 12px #26e0ce66';
                        });
                      };
                    });
                  }
                  // Bind Thème Tickets
                  const themeBox = document.getElementById('ticket-theme-options');
                  if (themeBox) {
                    const select = themeBox.querySelector('#ticket-theme');
                    if (select) select.onchange = () => {
                      const val = select.value;
                      firebase.database().ref('users/' + encodeURIComponent(userName)).update({ ticketTheme: val }).then(() => {
                        refreshTicketTheme(userName);
                      });
                    };
                  }
                }, 0);
                // Ajout listeners
                rewardsContent.querySelectorAll('.select-ornament-btn').forEach(btn => {
                  btn.onclick = function() {
                    const ornId = this.getAttribute('data-ornament');
                    firebase.database().ref('users/' + encodeURIComponent(userName)).update({ selectedOrnament: ornId }).then(() => {
                      showShopPopup(); // refresh
                    });
                  };
                });
              });
            }
        }

        // Fonction pour attribuer des PoWoo Coins
        function awardPCToUser(userName, amount, reason, isRankUp) {
            const userRef = firebase.database().ref('users/' + encodeURIComponent(userName));
            userRef.once('value').then(snapshot => {
                const data = snapshot.val();
                const currentPC = data.pc || 0;
                const newPC = currentPC + amount;
                userRef.update({ pc: newPC }).then(() => {
                    if (isRankUp) {
                        showPCRankUpNotification(amount);
                    } else {
                        showPCGainNotification(amount);
                    }
                });
            });
        }

        // Notification d'obtention de PC
        function showPCGainNotification(amount) {
            let notification = document.getElementById('pc-gain-notification');
            if (notification) notification.remove();

            notification = document.createElement('div');
            notification.id = 'pc-gain-notification';
            notification.style.cssText = `
                position: fixed;
                top: 90px;
                left: calc(50% - 160px);
                transform: translateX(-50%);
                background: rgba(34, 40, 49, 0.95);
                color: white;
                padding: 8px 16px;
                border-radius: 20px;
                font-family: 'Segoe UI', Arial, sans-serif;
                font-weight: bold;
                font-size: 1.1em;
                z-index: 9999;
                box-shadow: 0 0 20px rgba(38, 224, 206, 0.5);
                animation: pcGainAnimation 2s forwards;
                display: flex;
                align-items: center;
                gap: 8px;
                border: 1px solid rgba(255, 255, 255, 0.1);
            `;

            notification.innerHTML = `
                <span style="font-size: 1.2em;">✨</span>
                <span>+${amount} PC</span>
            `;

            document.body.appendChild(notification);

            // Supprime la notification après l'animation
            setTimeout(() => {
                notification.remove();
            }, 2000);
        }

        // Ajout de l'animation pour la notification PC
        if (!document.getElementById('pc-animations')) {
            const style = document.createElement('style');
            style.id = 'pc-animations';
            style.innerHTML = `
                @keyframes pcGainAnimation {
                    0% {
                        opacity: 0;
                        transform: translate(-50%, 20px);
                    }
                    20% {
                        opacity: 1;
                        transform: translate(-50%, 0);
                    }
                    80% {
                        opacity: 1;
                        transform: translate(-50%, 0);
                    }
                    100% {
                        opacity: 0;
                        transform: translate(-50%, -20px);
                    }
                }
            `;
            document.head.appendChild(style);
        }

        // Modification de la fonction awardXPToUser pour inclure les PC
        const originalAwardXPToUser = awardXPToUser;
        awardXPToUser = function(userName, amount, typeCloture = 'normal', duree = 0) {
            originalAwardXPToUser(userName, amount, typeCloture, duree);

            // Vérifier si l'utilisateur a atteint 50 appels pour attribuer des PC
            firebase.database().ref('users/' + encodeURIComponent(userName) + '/clotures_log').once('value').then(snapshot => {
                const logs = snapshot.val() ? Object.values(snapshot.val()) : [];
                if (logs.length >= 50) {
                    awardPCToUser(userName, 10);
                }
            });
        };

        // Vérification des badges à chaque cloture
        function checkAndUnlockBadges(userName, logs) {
            // Ne garder que les logs du jour en cours
            const today = new Date().toISOString().slice(0, 10);
            const todayLogs = logs.filter(log => log.date === today);

            firebase.database().ref('users/' + encodeURIComponent(userName) + '/badges').once('value').then(snapshot => {
                const unlocked = snapshot.val() || {};
                allBadges.forEach(badge => {
                    if (typeof badge.check === 'function' && !unlocked[badge.id]) {
                        // Vérifier le badge uniquement avec les logs du jour
                        if (badge.check(todayLogs)) {
                            console.log('[Gamification] Badge débloqué :', badge.id);
                            // Débloque le badge
                            firebase.database().ref('users/' + encodeURIComponent(userName) + '/badges/' + badge.id).set(true);
                            // Attribue 100 XP pour l'obtention du badge
                            awardXPToUser(userName, 100, 'badge');
                            showBadgeUnlockedNotification(badge);
                        }
                    }
                });
            });
        }

        // Notification animée de badge débloqué
        function showBadgeUnlockedNotification(badge) {
            let notif = document.getElementById('badge-unlocked-notif');
            if (notif) notif.remove();
            notif = document.createElement('div');
            notif.id = 'badge-unlocked-notif';
            notif.style.cssText = `position:fixed;top:32px;left:50%;transform:translateX(-50%) scale(1);background:#23272f;color:#fff;padding:38px 48px 32px 48px;border-radius:28px;box-shadow:0 0 64px 24px #26e0ce,0 8px 32px rgba(0,0,0,0.18);z-index:10001;min-width:320px;max-width:90vw;font-family:'Segoe UI',Arial,sans-serif;text-align:center;font-size:1.25em;display:flex;flex-direction:column;align-items:center;gap:12px;animation:badgeZoomNotif 1.8s infinite alternate;`;
            notif.innerHTML = `<div style='position:absolute;top:18px;right:24px;'><button id='close-badge-unlocked-btn' style='background:none;border:none;font-size:2em;cursor:pointer;color:#ff3b3b;'>×</button></div><div style='font-size:2.2em;font-weight:bold;color:#fff;margin-bottom:10px;text-shadow:0 0 18px #fff,0 0 32px #fff;'>🎉 Félicitations !</div><img src='${badge.img}' alt='${badge.name}' style='width:100px;height:100px;object-fit:contain;margin-bottom:12px;border-radius:50%;box-shadow:0 0 32px 8px #26e0ce88;'/><div style='font-size:1.45em;font-weight:bold;color:#fff;margin-bottom:6px;text-shadow:0 0 8px #26e0ce;'>${badge.name}</div><div style='font-size:1.1em;color:#e0e0e0;margin-bottom:2px;'>${badge.phrase}</div><div style='font-size:1.05em;color:#bfc1c2;'>${badge.description}</div>`;
            document.body.appendChild(notif);
            document.getElementById('close-badge-unlocked-btn').onclick = () => { notif.remove(); };
            // Animation CSS
            if (!document.getElementById('badge-animations')) {
                const style = document.createElement('style');
                style.id = 'badge-animations';
                style.innerHTML = `@keyframes badgeNotifIn { from { top:-120px; opacity:0; } to { top:32px; opacity:1; } }
                @keyframes badgeZoomNotif { 0% { transform:translateX(-50%) scale(1); } 100% { transform:translateX(-50%) scale(1.035); } }`;
                document.head.appendChild(style);
            }
        }

        // Ajout du style CSS global pour glowing si pas déjà présent
        if (!document.getElementById('user-stats-glow-style')) {
            const style = document.createElement('style');
            style.id = 'user-stats-glow-style';
            style.innerHTML = `.user-stats-block { box-shadow:0 0 16px 2px #fff3 !important; }
            .user-stats-block:hover { box-shadow:0 0 32px 6px #fff7 !important; }
            #users-stats-list::-webkit-scrollbar { display: none !important; width: 0 !important; }
            #users-stats-list { scrollbar-width: none !important; -ms-overflow-style: none !important; padding: 18px 18px !important; position: relative; width: calc(100% - 48px) !important; margin: 0 auto !important; }
            .user-stats-block { margin: 0 -18px 32px -18px !important; }
            @media (max-width: 900px) { #me-table { overflow-x: auto !important; width: 100% !important; display: block !important; } }
            #stats-popup { max-height: 90vh !important; overflow-y: auto !important; }
            #stats-popup::-webkit-scrollbar { display: none !important; width: 0 !important; }
            #stats-popup { scrollbar-width: none !important; -ms-overflow-style: none !important; }
            @media (max-width: 700px) { #stats-popup { padding: 18px 4vw 18px 4vw !important; } }`;
            document.head.appendChild(style);
        }

        // --- LOGIQUE PoWoo Coin (PC) ---
        // Attribuer +10 PC lors d'un passage de grade (rank up)
        let lastRankName = null;
        function checkAndAwardPCForRankUp(userName, newRankName) {
            if (!lastRankName) {
                lastRankName = localStorage.getItem('gamif_last_rank_' + userName) || '';
            }
            if (lastRankName !== newRankName) {
                awardPCToUser(userName, 10, 'rankup', true); // true = rankup
                lastRankName = newRankName;
                localStorage.setItem('gamif_last_rank_' + userName, newRankName);
            }
        }
        // Attribuer +10 PC à chaque palier de 50 appels clôturés (50, 100, 150...)
        function checkAndAwardPCForClotures(userName, logs) {
            const count = logs.length;
            const lastPCMilestone = parseInt(localStorage.getItem('gamif_last_pc_milestone_' + userName) || '0', 10);
            const milestone = Math.floor(count / 50) * 50;
            if (milestone > 0 && milestone !== lastPCMilestone) {
                awardPCToUser(userName, 10, 'cloture50');
                localStorage.setItem('gamif_last_pc_milestone_' + userName, milestone);
            }
        }
        // Surcharge de updateUI pour détecter le rank up et attribuer les PC
        const originalUpdateUI = updateUI;
        updateUI = function(userData) {
            originalUpdateUI(userData);
            // Fin de saison: ne plus attribuer de PC sur changement de rang
        };
        // Ajout d'un hook sur la cloture pour les PC (sans toucher à l'XP)
        awardXPToUser = function(userName, amount, typeCloture = 'normal', duree = 0) {
            originalAwardXPToUser(userName, amount, typeCloture, duree);
            // Vérifier les paliers de 50 appels
            firebase.database().ref('users/' + encodeURIComponent(userName) + '/clotures_log').once('value').then(snapshot => {
                const logs = snapshot.val() ? Object.values(snapshot.val()) : [];
                checkAndAwardPCForClotures(userName, logs);
            });
            // Si on vient de franchir le niveau 100: proposer prestige
            const userRef = firebase.database().ref('users/' + encodeURIComponent(userName));
            userRef.once('value').then(s => {
                const data = s.val() || {};
                const xp = Number(data.xp || 0);
                const prestige = Number(data.prestige || 0);
                const li = getLevelFromXp(xp);
                if (li.level >= levelProgressionConfig.maxLevel) {
                    // Popup prestige
                    const nextPrestige = Math.min(levelProgressionConfig.maxPrestige, prestige + 1);
                    const bg = document.createElement('div');
                    bg.id = 'prestige-bg';
                    bg.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:10020;';
                    document.body.appendChild(bg);
                    const pop = document.createElement('div');
                    pop.id = 'prestige-popup';
                    pop.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(34,40,49,0.97);border:2px solid #26e0ce44;border-radius:20px;box-shadow:0 0 40px 10px #26e0ce55,0 8px 32px rgba(0,0,0,0.25);padding:36px 44px 28px 44px;z-index:10021;min-width:520px;max-width:95vw;text-align:center;color:#f3f6fa;font-family:"Segoe UI",Arial,sans-serif;';
                    const gradNext = getPrestigeGradient(nextPrestige);
                    const gradCur = getPrestigeGradient(prestige);
                    if (!document.getElementById('prestige-anim-style')) {
                        const st = document.createElement('style');
                        st.id = 'prestige-anim-style';
                        st.innerHTML = `@keyframes prestigeIn {0%{opacity:0;transform:scale(.6) rotate(-10deg)}60%{opacity:1;transform:scale(1.08) rotate(0)}100%{opacity:1;transform:scale(1) rotate(0)}}
                        @keyframes prestigeOut {0%{opacity:1;transform:scale(1) rotate(0)}100%{opacity:0;transform:scale(.6) rotate(10deg)}}
                        @keyframes confettiFall {0%{transform:translateY(-40px) rotate(0)}100%{transform:translateY(140px) rotate(360deg)}}
                        @keyframes glowPulse {0%{filter:drop-shadow(0 0 6px rgba(255,255,255,.3))}100%{filter:drop-shadow(0 0 16px rgba(255,255,255,.9))}}
                        @keyframes textFadeUp {0%{opacity:0;transform:translateY(8px)}100%{opacity:1;transform:translateY(0)}}`;
                        document.head.appendChild(st);
                    }
                    pop.innerHTML = `
                      <div style="font-size:1.9em;font-weight:800;margin-bottom:6px;animation:textFadeUp .35s ease-out;">Niveau 100 atteint !</div>
                      <div style="margin:6px 0 16px 0;color:#bfc1c2;max-width:640px;animation:textFadeUp .5s .05s both;">
                        Le Prestige réinitialise votre niveau à 1 tout en conservant vos récompenses et ornements de saison. Il débloque des effets visuels et couleurs exclusifs. Des récompenses dédiées au Prestige arriveront prochainement.
                      </div>
                      <div style="position:relative;display:flex;align-items:center;justify-content:center;margin:8px 0 14px 0;height:140px;">
                        <div style="position:absolute;inset:0;pointer-events:none;overflow:hidden;">
                          ${Array.from({length:18}).map((_,i)=>`<span style='position:absolute;left:${(Math.random()*90+5).toFixed(1)}%;top:${(-Math.random()*20).toFixed(1)}px;width:6px;height:10px;background:linear-gradient(90deg,${gradNext.start},${gradNext.end});display:inline-block;border-radius:2px;opacity:.85;animation:confettiFall ${(Math.random()*1+1.2).toFixed(2)}s ${(Math.random()*0.8).toFixed(2)}s ease-in forwards;transform:translateY(-40px)'></span>`).join('')}
                        </div>
                        <div style="display:flex;align-items:center;gap:18px;">
                          <div id="p-cur" style="animation:prestigeOut 0.8s 1.2s forwards, glowPulse 1.6s ease-in-out infinite alternate;">
                            <svg width="120" height="120" viewBox="0 0 122 122">
                              <defs>
                                <linearGradient id="prest-cur" x1="0%" y1="0%" x2="100%" y2="100%">
                                  <stop offset="0%" stop-color="${gradCur.start}"/>
                                  <stop offset="100%" stop-color="${gradCur.end}"/>
                                </linearGradient>
                              </defs>
                              <circle cx="61" cy="61" r="50" stroke="url(#prest-cur)" stroke-width="8" fill="#141a22"/>
                              <text x="61" y="69" text-anchor="middle" fill="#fff" font-size="26" font-weight="800">P${prestige}</text>
                            </svg>
                          </div>
                          <div style="font-weight:900;color:#bfc1c2;">➡</div>
                          <div id="p-next" style="animation:prestigeIn 1s .2s both, glowPulse 1.6s ease-in-out infinite alternate;">
                            <svg width="128" height="128" viewBox="0 0 122 122">
                              <defs>
                                <linearGradient id="prest-next" x1="0%" y1="0%" x2="100%" y2="100%">
                                  <stop offset="0%" stop-color="${gradNext.start}"/>
                                  <stop offset="100%" stop-color="${gradNext.end}"/>
                                </linearGradient>
                              </defs>
                              <circle cx="61" cy="61" r="50" stroke="url(#prest-next)" stroke-width="9" fill="#141a22"/>
                              <text x="61" y="69" text-anchor="middle" fill="#fff" font-size="28" font-weight="900">P${nextPrestige}</text>
                            </svg>
                          </div>
                        </div>
                      </div>
                      <div style="display:flex;gap:12px;justify-content:center;">
                        <button id="prestige-confirm" style="padding:10px 22px;border:none;border-radius:10px;background:linear-gradient(90deg,${gradNext.start},${gradNext.end});color:#fff;font-weight:700;cursor:pointer;">Passer Prestige</button>
                        <button id="prestige-cancel" style="padding:10px 22px;border:none;border-radius:10px;background:#333a46;color:#fff;font-weight:700;cursor:pointer;">Plus tard</button>
                      </div>
                    `;
                    document.body.appendChild(pop);
                    const cleanup = () => { pop.remove(); bg.remove(); };
                    document.getElementById('prestige-cancel').onclick = cleanup;
                    bg.onclick = cleanup;
                    document.getElementById('prestige-confirm').onclick = () => {
                        const btn = document.getElementById('prestige-confirm');
                        btn.disabled = true;
                        btn.style.opacity = '.7';
                        // Déclenche l'animation de swap explicite
                        const curEl = document.getElementById('p-cur');
                        const nextEl = document.getElementById('p-next');
                        if (curEl) curEl.style.animation = 'prestigeOut .8s forwards';
                        if (nextEl) nextEl.style.animation = 'prestigeIn .8s forwards';
                        userRef.transaction(u => {
                            u = u || {};
                            // Mémoriser le meilleur rang de la saison avant reset XP
                            try {
                                const currentRankName = getCurrentRank(Number(u.xp || 0)).name;
                                const prevBest = u.season1_bestRank || '';
                                const idx = name => (Array.isArray(ranks) ? ranks.findIndex(r => r.name === name) : -1);
                                if (!prevBest || idx(currentRankName) > idx(prevBest)) {
                                    u.season1_bestRank = currentRankName;
                                }
                            } catch (e) { /* no-op */ }
                            const p = Number(u.prestige || 0);
                            u.prestige = Math.min(levelProgressionConfig.maxPrestige, p + 1);
                            u.xp = 0;
                            return u;
                        }).then(() => {
                            cleanup();
                            updateUI({ xp: 0, prestige: nextPrestige });
            });
        };
                }
            });
        };

        // Fonction utilitaire: ouvrir explicitement la popup prestige pour un utilisateur donné
        function openPrestigePopupForUser(userName, prestige) {
            const userRef = firebase.database().ref('users/' + encodeURIComponent(userName));
            userRef.once('value').then(s => {
                const data = s.val() || {};
                const xp = Number(data.xp || 0);
                const li = getLevelFromXp(xp);
                if (li.level < levelProgressionConfig.maxLevel) return; // sécurité
                const nextPrestige = Math.min(levelProgressionConfig.maxPrestige, Number(data.prestige||0) + 1);
                const bg = document.createElement('div');
                bg.id = 'prestige-bg';
                bg.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:10020;';
                document.body.appendChild(bg);
                const pop = document.createElement('div');
                pop.id = 'prestige-popup';
                pop.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(34,40,49,0.97);border:2px solid #26e0ce44;border-radius:20px;box-shadow:0 0 40px 10px #26e0ce55,0 8px 32px rgba(0,0,0,0.25);padding:36px 44px 28px 44px;z-index:10021;min-width:520px;max-width:95vw;text-align:center;color:#f3f6fa;font-family:"Segoe UI",Arial,sans-serif;';
                const gradNext = getPrestigeGradient(nextPrestige);
                const gradCur = getPrestigeGradient(Number(data.prestige||0));
                if (!document.getElementById('prestige-anim-style')) {
                    const st = document.createElement('style');
                    st.id = 'prestige-anim-style';
                    st.innerHTML = `@keyframes prestigeIn {0%{opacity:0;transform:scale(.6) rotate(-10deg)}60%{opacity:1;transform:scale(1.08) rotate(0)}100%{opacity:1;transform:scale(1) rotate(0)}}
                    @keyframes prestigeOut {0%{opacity:1;transform:scale(1) rotate(0)}100%{opacity:0;transform:scale(.6) rotate(10deg)}}
                    @keyframes confettiFall {0%{transform:translateY(-40px) rotate(0)}100%{transform:translateY(140px) rotate(360deg)}}
                    @keyframes glowPulse {0%{filter:drop-shadow(0 0 6px rgba(255,255,255,.3))}100%{filter:drop-shadow(0 0 16px rgba(255,255,255,.9))}}
                    @keyframes textFadeUp {0%{opacity:0;transform:translateY(8px)}100%{opacity:1;transform:translateY(0)}}`;
                    document.head.appendChild(st);
                }
                pop.innerHTML = `
                  <div style="font-size:1.9em;font-weight:800;margin-bottom:6px;animation:textFadeUp .35s ease-out;">Niveau 100 atteint !</div>
                  <div style="margin:6px 0 16px 0;color:#bfc1c2;max-width:640px;animation:textFadeUp .5s .05s both;">
                    Le Prestige réinitialise votre niveau à 1 tout en conservant vos récompenses et ornements de saison. Il débloque des effets visuels et couleurs exclusifs. Des récompenses dédiées au Prestige arriveront prochainement.
                  </div>
                  <div style="position:relative;display:flex;align-items:center;justify-content:center;margin:8px 0 14px 0;height:140px;">
                    <div style="position:absolute;inset:0;pointer-events:none;overflow:hidden;">
                      ${Array.from({length:18}).map((_,i)=>`<span style='position:absolute;left:${(Math.random()*90+5).toFixed(1)}%;top:${(-Math.random()*20).toFixed(1)}px;width:6px;height:10px;background:linear-gradient(90deg,${gradNext.start},${gradNext.end});display:inline-block;border-radius:2px;opacity:.85;animation:confettiFall ${(Math.random()*1+1.2).toFixed(2)}s ${(Math.random()*0.8).toFixed(2)}s ease-in forwards;transform:translateY(-40px)'></span>`).join('')}
                    </div>
                    <div style="display:flex;align-items:center;gap:18px;">
                      <div id="p-cur" style="animation:prestigeOut 0.8s 1.2s forwards, glowPulse 1.6s ease-in-out infinite alternate;">
                        <svg width="120" height="120" viewBox="0 0 122 122">
                          <defs>
                            <linearGradient id="prest-cur" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stop-color="${gradCur.start}"/>
                              <stop offset="100%" stop-color="${gradCur.end}"/>
                            </linearGradient>
                          </defs>
                          <circle cx="61" cy="61" r="50" stroke="url(#prest-cur)" stroke-width="8" fill="#141a22"/>
                          <text x="61" y="69" text-anchor="middle" fill="#fff" font-size="26" font-weight="800">P${Number(data.prestige||0)}</text>
                        </svg>
                      </div>
                      <div style="font-weight:900;color:#bfc1c2;">➡</div>
                      <div id="p-next" style="animation:prestigeIn 1s .2s both, glowPulse 1.6s ease-in-out infinite alternate;">
                        <svg width="128" height="128" viewBox="0 0 122 122">
                          <defs>
                            <linearGradient id="prest-next" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stop-color="${gradNext.start}"/>
                              <stop offset="100%" stop-color="${gradNext.end}"/>
                            </linearGradient>
                          </defs>
                          <circle cx="61" cy="61" r="50" stroke="url(#prest-next)" stroke-width="9" fill="#141a22"/>
                          <text x="61" y="69" text-anchor="middle" fill="#fff" font-size="28" font-weight="900">P${nextPrestige}</text>
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div style="display:flex;gap:12px;justify-content:center;">
                    <button id="prestige-confirm" style="padding:10px 22px;border:none;border-radius:10px;background:linear-gradient(90deg,${gradNext.start},${gradNext.end});color:#fff;font-weight:700;cursor:pointer;">Passer Prestige</button>
                    <button id="prestige-cancel" style="padding:10px 22px;border:none;border-radius:10px;background:#333a46;color:#fff;font-weight:700;cursor:pointer;">Plus tard</button>
                  </div>
                `;
                document.body.appendChild(pop);
                const cleanup = () => { pop.remove(); bg.remove(); };
                document.getElementById('prestige-cancel').onclick = cleanup;
                bg.onclick = cleanup;
                document.getElementById('prestige-confirm').onclick = () => {
                    const btn = document.getElementById('prestige-confirm');
                    btn.disabled = true;
                    btn.style.opacity = '.7';
                    const curEl = document.getElementById('p-cur');
                    const nextEl = document.getElementById('p-next');
                    if (curEl) curEl.style.animation = 'prestigeOut .8s forwards';
                    if (nextEl) nextEl.style.animation = 'prestigeIn .8s forwards';
                    userRef.transaction(u => {
                        u = u || {};
                        try {
                            const currentRankName = getCurrentRank(Number(u.xp || 0)).name;
                            const prevBest = u.season1_bestRank || '';
                            const idx = name => (Array.isArray(ranks) ? ranks.findIndex(r => r.name === name) : -1);
                            if (!prevBest || idx(currentRankName) > idx(prevBest)) {
                                u.season1_bestRank = currentRankName;
                            }
                        } catch (e) { /* no-op */ }
                        const p = Number(u.prestige || 0);
                        u.prestige = Math.min(levelProgressionConfig.maxPrestige, p + 1);
                        u.xp = 0;
                        return u;
                    }).then(() => {
                        cleanup();
                        updateUI({ xp: 0, prestige: nextPrestige });
                    });
                };
            });
        }
        // --- Notification PC qui part du bouton Shop ---
        function showPCGainNotification(amount) {
            let notification = document.getElementById('pc-gain-notification');
            if (notification) notification.remove();
            // Trouver le bouton Shop
            const shopBtn = document.getElementById('shop-btn');
            if (!shopBtn) return;
            const rect = shopBtn.getBoundingClientRect();
            notification = document.createElement('div');
            notification.id = 'pc-gain-notification';
            notification.style.cssText = `
                position: fixed;
                left: ${rect.left + rect.width/2}px;
                top: ${rect.top + rect.height/2}px;
                transform: translate(-50%, 0);
                background: rgba(38, 224, 206, 0.95);
                color: white;
                padding: 8px 16px;
                border-radius: 20px;
                font-family: 'Segoe UI', Arial, sans-serif;
                font-weight: bold;
                font-size: 1.1em;
                z-index: 9999;
                box-shadow: 0 0 20px rgba(38, 224, 206, 0.5);
                display: flex;
                align-items: center;
                gap: 8px;
                pointer-events: none;
                animation: pcShopGainAnim 3s forwards;
            `;
            notification.innerHTML = `
                <img src="https://i.imgur.com/WUkWpPb.png" alt="PoWoo Coin" style="width:24px;height:24px;">
                <span>+${amount} PC</span>
            `;
            document.body.appendChild(notification);
            setTimeout(() => {
                notification.remove();
            }, 3000);
        }
        if (!document.getElementById('pc-shop-animations')) {
            const style = document.createElement('style');
            style.id = 'pc-shop-animations';
            style.innerHTML = `
                @keyframes pcShopGainAnim {
                    0% {
                        opacity: 0;
                        transform: translate(-50%, 20px) scale(0.7);
                    }
                    10% {
                        opacity: 1;
                        transform: translate(-50%, 0) scale(1.1);
                    }
                    80% {
                        opacity: 1;
                        transform: translate(-50%, -30px) scale(1);
                    }
                    100% {
                        opacity: 0;
                        transform: translate(-50%, -60px) scale(0.7);
                    }
                }
            `;
            document.head.appendChild(style);
        }
        if (!document.getElementById('pc-rankup-animations')) {
            const style = document.createElement('style');
            style.id = 'pc-rankup-animations';
            style.innerHTML = `
                @keyframes pcRankUpAnimBig {
                    0% {
                        opacity: 0;
                        transform: translate(-50%, -40px) scale(0.7);
                        filter: blur(12px);
                    }
                    10% {
                        opacity: 1;
                        transform: translate(-50%, 0) scale(1.1);
                        filter: blur(0px);
                    }
                    40% {
                        opacity: 1;
                        transform: translate(-50%, 220px) scale(1.08);
                        filter: blur(0px);
                    }
                    80% {
                        opacity: 1;
                        transform: translate(-50%, 0) scale(1);
                        filter: blur(0px);
                    }
                    100% {
                        opacity: 0;
                        transform: translate(-50%, 0) scale(0.7);
                        filter: blur(12px);
                    }
                }
            `;
            document.head.appendChild(style);
        }
        // ... existing code ...

        function showPCRankUpNotification(amount) {
            let notification = document.getElementById('pc-rankup-notification');
            if (notification) notification.remove();
            // Trouver le bouton Shop
            const shopBtn = document.getElementById('shop-btn');
            if (!shopBtn) return;
            const rect = shopBtn.getBoundingClientRect();
            // Position de base : pile en bas du bouton Shop
            const baseOffset = rect.bottom + 6;
            // Décalage de descente réduit à 1.5cm (15px)
            const deepOffset = baseOffset + 15;
            // Décalage de remontée augmenté à 3cm (30px) au-dessus de la base
            const upOffset = baseOffset - 30;
            notification = document.createElement('div');
            notification.id = 'pc-rankup-notification';
            notification.style.cssText = `
                position: fixed;
                left: ${rect.left + rect.width/2}px;
                top: 0;
                transform: translate(-50%, ${baseOffset}px);
                background: linear-gradient(90deg, #26e0ce 0%, #209cff 100%);
                color: #fff;
                padding: 4px 16px;
                border-radius: 16px;
                font-family: 'Segoe UI', Arial, sans-serif;
                font-weight: bold;
                font-size: 0.98em;
                z-index: 10001;
                box-shadow: none;
                display: flex;
                align-items: center;
                gap: 8px;
                pointer-events: none;
                text-shadow: 0 1px 4px #000a, 0 0 6px #26e0cecc;
                filter: drop-shadow(0 0 16px #26e0ce) drop-shadow(0 0 32px #209cff88);
            `;
            notification.innerHTML = `
                <img src="https://i.imgur.com/WUkWpPb.png" alt="PoWoo Coin" style="width:32px;height:32px;filter:drop-shadow(0 0 8px #fff) drop-shadow(0 0 16px #26e0ce);border-radius:50%;background:#fff2;">
                <span style="font-size:1em;font-weight:bold;text-shadow:0 1px 6px #000,0 0 2px #000,0 0 1px #000;">+${amount} PoWoo Coin</span>
            `;
            document.body.appendChild(notification);
            // Animation : descend de 1.5cm, attend, puis remonte de 3cm au-dessus de la base, le tout lentement (7s)
            notification.animate([
                { opacity: 0, transform: `translate(-50%, ${baseOffset}px) scale(0.7)`, filter: 'blur(8px)' },
                { opacity: 1, transform: `translate(-50%, ${deepOffset}px) scale(1.12)`, filter: 'blur(0px)' },
                { opacity: 1, transform: `translate(-50%, ${deepOffset}px) scale(1.12)`, filter: 'blur(0px)' },
                { offset: 0.6, opacity: 1, transform: `translate(-50%, ${deepOffset}px) scale(1.12)`, filter: 'blur(0px)' },
                { offset: 0.8, opacity: 1, transform: `translate(-50%, ${upOffset}px) scale(1)`, filter: 'blur(0px)' },
                { opacity: 0, transform: `translate(-50%, ${upOffset}px) scale(0.7)`, filter: 'blur(8px)' }
            ], {
                duration: 7000,
                easing: 'cubic-bezier(.4,1.4,.6,1)',
                fill: 'forwards'
            });
            setTimeout(() => {
                notification.remove();
            }, 7000);
        }

        // === Ornement flammes dans la colonne Assigné à ===
        function applyOrnamentToAssigneeColumn() {
          document.querySelectorAll('.o_data_cell[name="user_id"]').forEach(cell => {
            const nameSpan = cell.querySelector('span, div, a') || cell;
            if (!nameSpan) return;
            const userName = nameSpan.textContent.trim();
            if (!userName) return;
            if (cell.classList.contains('ornament-applied')) return;
            cell.classList.add('ornament-applied');
            firebase.database().ref('users/' + encodeURIComponent(userName)).once('value').then(snapshot => {
              const user = snapshot.val() || {};
              // Empêcher la perte d'ornement au reset XP: si l'ornement est sélectionné mais pas débloqué par le rang courant,
              // on continue à l'afficher si l'utilisateur l'a déjà sélectionné (persistance de récompense de saison)
              if (user.selectedOrnament === 'dieu_flamme') {
                // Crée le conteneur principal (pour positionner le gif autour de tout)
                const mainWrapper = document.createElement('span');
                mainWrapper.style.position = 'relative';
                mainWrapper.style.display = 'flex';
                mainWrapper.style.alignItems = 'center';
                mainWrapper.style.justifyContent = 'flex-start';
                mainWrapper.style.width = 'auto';
                mainWrapper.style.minWidth = '160px';
                mainWrapper.style.maxWidth = '100%';
                mainWrapper.style.height = '56px';
                // Ajoute le GIF de flammes animé en fond
                const flamesBg = document.createElement('img');
                flamesBg.src = 'https://cdn.pixabay.com/animation/2024/05/07/23/55/23-55-47-279_256.gif';
                flamesBg.alt = 'Flammes animées';
                flamesBg.style.position = 'absolute';
                flamesBg.style.left = '0';
                flamesBg.style.top = '50%';
                flamesBg.style.transform = 'translateY(-50%)';
                flamesBg.style.width = '100%';
                flamesBg.style.height = '100%';
                flamesBg.style.pointerEvents = 'none';
                flamesBg.style.zIndex = '0';
                flamesBg.style.opacity = '0.7';
                // Conteneur ornement + photo
                const wrapper = document.createElement('span');
                wrapper.style.position = 'relative';
                wrapper.style.display = 'inline-block';
                wrapper.style.width = '56px';
                wrapper.style.height = '56px';
                wrapper.style.verticalAlign = 'middle';
                // Ajoute l'ornement PNG
                const flames = document.createElement('img');
                flames.src = 'https://i.imgur.com/ZdQCAkg.png';
                flames.alt = 'Ornement Dieu des appels';
                flames.style.position = 'absolute';
                flames.style.left = '50%';
                flames.style.top = '43%';
                flames.style.transform = 'translate(-50%,-50%)';
                flames.style.width = '56px';
                flames.style.height = '56px';
                flames.style.pointerEvents = 'none';
                flames.style.zIndex = '1';
                // Cherche la photo de profil Odoo
                let avatarImg = cell.querySelector('img');
                let avatar;
                if (avatarImg && avatarImg.src) {
                  avatar = document.createElement('img');
                  avatar.src = avatarImg.src;
                  avatar.alt = userName;
                  avatar.style.width = '26px';
                  avatar.style.height = '26px';
                  avatar.style.borderRadius = '50%';
                  avatar.style.objectFit = 'cover';
                  avatar.style.position = 'absolute';
                  avatar.style.left = '50%';
                  avatar.style.top = '46%';
                  avatar.style.transform = 'translate(-50%,-50%)';
                  avatar.style.zIndex = '2';
                  avatar.style.border = '2px solid #fff8';
                  avatar.style.background = '#23272f';
                } else {
                  avatar = document.createElement('span');
                  avatar.style.display = 'flex';
                  avatar.style.alignItems = 'center';
                  avatar.style.justifyContent = 'center';
                  avatar.style.width = '26px';
                  avatar.style.height = '26px';
                  avatar.style.borderRadius = '50%';
                  avatar.style.background = '#23272f';
                  avatar.style.position = 'absolute';
                  avatar.style.left = '50%';
                  avatar.style.top = '46%';
                  avatar.style.transform = 'translate(-50%,-50%)';
                  avatar.style.zIndex = '2';
                  avatar.style.fontWeight = 'bold';
                  avatar.style.fontSize = '1.1em';
                  avatar.style.color = '#fff';
                  avatar.textContent = userName[0] || '';
                }
                wrapper.appendChild(flames);
                wrapper.appendChild(avatar);
                // Effet flammes sur le nom
                const nameFlame = document.createElement('span');
                nameFlame.textContent = ' ' + userName;
                nameFlame.className = 'flame-name';
                nameFlame.style.fontWeight = 'bold';
                nameFlame.style.fontSize = '1.08em';
                nameFlame.style.position = 'relative';
                nameFlame.style.background = 'linear-gradient(90deg,#ff9800,#ffd700,#fff,#ffd700,#ff9800)';
                nameFlame.style.backgroundSize = '200% 100%';
                nameFlame.style.backgroundClip = 'text';
                nameFlame.style.webkitBackgroundClip = 'text';
                nameFlame.style.color = 'transparent';
                nameFlame.style.webkitTextFillColor = 'transparent';
                nameFlame.style.animation = 'flameTextAnim 2s linear infinite alternate';
                nameFlame.style.textShadow = '0 0 16px #ff9800,0 0 32px #ffd700,0 0 12px #fff';
                // Construction finale
                mainWrapper.style.marginLeft = '0.2cm';
                nameFlame.style.marginLeft = '12px';
                nameFlame.style.whiteSpace = 'nowrap';
                nameFlame.style.overflow = 'visible';
                nameFlame.style.textOverflow = 'unset';
                nameFlame.style.maxWidth = 'unset';
                mainWrapper.appendChild(flamesBg);
                mainWrapper.appendChild(wrapper);
                mainWrapper.appendChild(nameFlame);
                cell.innerHTML = '';
                cell.appendChild(mainWrapper);
              }
              // === MAITRE DES APPELS (éclair) ===
              if (user.selectedOrnament === 'maitre_eclair') {
                // Conteneur principal
                const mainWrapper = document.createElement('span');
                mainWrapper.style.position = 'relative';
                mainWrapper.style.display = 'flex';
                mainWrapper.style.alignItems = 'center';
                mainWrapper.style.justifyContent = 'flex-start';
                mainWrapper.style.width = 'auto';
                mainWrapper.style.minWidth = '160px';
                mainWrapper.style.maxWidth = '100%';
                mainWrapper.style.height = '56px';
                // GIF d'éclair violet en fond
                const thunderBg = document.createElement('img');
                thunderBg.src = 'https://cdn.pixabay.com/animation/2025/01/22/22/52/22-52-40-118_256.gif';
                thunderBg.alt = 'Eclair animé';
                thunderBg.style.position = 'absolute';
                thunderBg.style.left = '0';
                thunderBg.style.top = '50%';
                thunderBg.style.transform = 'translateY(-50%)';
                thunderBg.style.width = '100%';
                thunderBg.style.height = '100%';
                thunderBg.style.pointerEvents = 'none';
                thunderBg.style.zIndex = '0';
                thunderBg.style.opacity = '0.7';
                // Ornement PNG autour de la photo
                const wrapper = document.createElement('span');
                wrapper.style.position = 'relative';
                wrapper.style.display = 'inline-block';
                wrapper.style.width = '56px';
                wrapper.style.height = '56px';
                wrapper.style.verticalAlign = 'middle';
                const thunderOrn = document.createElement('img');
                thunderOrn.src = 'https://i.imgur.com/sKtiPmj.png';
                thunderOrn.alt = 'Ornement Maître des appels';
                thunderOrn.style.position = 'absolute';
                thunderOrn.style.left = '50%';
                thunderOrn.style.top = '43%';
                thunderOrn.style.transform = 'translate(-50%,-50%)';
                thunderOrn.style.width = '56px';
                thunderOrn.style.height = '56px';
                thunderOrn.style.pointerEvents = 'none';
                thunderOrn.style.zIndex = '1';
                // Photo de profil centrée
                let avatarImg = cell.querySelector('img');
                let avatar;
                if (avatarImg && avatarImg.src) {
                  avatar = document.createElement('img');
                  avatar.src = avatarImg.src;
                  avatar.alt = userName;
                  avatar.style.width = '30px';
                  avatar.style.height = '30px';
                  avatar.style.borderRadius = '50%';
                  avatar.style.objectFit = 'cover';
                  avatar.style.position = 'absolute';
                  avatar.style.left = '50%';
                  avatar.style.top = '49%';
                  avatar.style.transform = 'translate(-50%,-50%)';
                  avatar.style.zIndex = '2';
                  avatar.style.border = '2px solid #fff8';
                  avatar.style.background = '#23272f';
                } else {
                  avatar = document.createElement('span');
                  avatar.style.display = 'flex';
                  avatar.style.alignItems = 'center';
                  avatar.style.justifyContent = 'center';
                  avatar.style.width = '30px';
                  avatar.style.height = '30px';
                  avatar.style.borderRadius = '50%';
                  avatar.style.background = '#23272f';
                  avatar.style.position = 'absolute';
                  avatar.style.left = '50%';
                  avatar.style.top = '49%';
                  avatar.style.transform = 'translate(-50%,-50%)';
                  avatar.style.zIndex = '2';
                  avatar.style.fontWeight = 'bold';
                  avatar.style.fontSize = '1.1em';
                  avatar.style.color = '#fff';
                  avatar.textContent = userName[0] || '';
                }
                wrapper.appendChild(thunderOrn);
                wrapper.appendChild(avatar);
                // Effet éclair violet sur le nom
                const nameThunder = document.createElement('span');
                nameThunder.textContent = ' ' + userName;
                nameThunder.className = 'thunder-name';
                nameThunder.style.fontWeight = 'bold';
                nameThunder.style.fontSize = '1.08em';
                nameThunder.style.position = 'relative';
                nameThunder.style.background = 'linear-gradient(90deg,#8f00ff,#00eaff,#fff,#00eaff,#8f00ff)';
                nameThunder.style.backgroundSize = '200% 100%';
                nameThunder.style.backgroundClip = 'text';
                nameThunder.style.webkitBackgroundClip = 'text';
                nameThunder.style.color = 'transparent';
                nameThunder.style.webkitTextFillColor = 'transparent';
                nameThunder.style.animation = 'thunderTextAnim 2s linear infinite alternate';
                nameThunder.style.textShadow = '0 0 16px #8f00ff,0 0 32px #00eaff,0 0 12px #fff';
                // Construction finale
                mainWrapper.style.marginLeft = '0.2cm';
                nameThunder.style.marginLeft = '12px';
                nameThunder.style.whiteSpace = 'nowrap';
                nameThunder.style.overflow = 'visible';
                nameThunder.style.textOverflow = 'unset';
                nameThunder.style.maxWidth = 'unset';
                mainWrapper.appendChild(thunderBg);
                mainWrapper.appendChild(wrapper);
                mainWrapper.appendChild(nameThunder);
                cell.innerHTML = '';
                cell.appendChild(mainWrapper);
              }
              if (user.selectedOrnament === 'diamant') {
                // Conteneur principal
                const mainWrapper = document.createElement('span');
                mainWrapper.style.position = 'relative';
                mainWrapper.style.display = 'flex';
                mainWrapper.style.alignItems = 'center';
                mainWrapper.style.justifyContent = 'flex-start';
                mainWrapper.style.width = 'auto';
                mainWrapper.style.minWidth = '160px';
                mainWrapper.style.maxWidth = '100%';
                mainWrapper.style.height = '56px';
                // Ornement PNG autour de la photo
                const wrapper = document.createElement('span');
                wrapper.style.position = 'relative';
                wrapper.style.display = 'inline-block';
                wrapper.style.width = '56px';
                wrapper.style.height = '56px';
                wrapper.style.verticalAlign = 'middle';
                const diamondOrn = document.createElement('img');
                diamondOrn.src = 'https://i.imgur.com/JLyduRZ.png';
                diamondOrn.alt = 'Ornement Diamant';
                diamondOrn.style.position = 'absolute';
                diamondOrn.style.left = '50%';
                diamondOrn.style.top = '43%';
                diamondOrn.style.transform = 'translate(-50%,-50%)';
                diamondOrn.style.width = '56px';
                diamondOrn.style.height = '56px';
                diamondOrn.style.pointerEvents = 'none';
                diamondOrn.style.zIndex = '1';
                // Photo de profil centrée
                let avatarImg = cell.querySelector('img');
                let avatar;
                if (avatarImg && avatarImg.src) {
                  avatar = document.createElement('img');
                  avatar.src = avatarImg.src;
                  avatar.alt = userName;
                  avatar.style.width = '30px';
                  avatar.style.height = '30px';
                  avatar.style.borderRadius = '50%';
                  avatar.style.objectFit = 'cover';
                  avatar.style.position = 'absolute';
                  avatar.style.left = '50%';
                  avatar.style.top = '49%';
                  avatar.style.transform = 'translate(-50%,-50%)';
                  avatar.style.zIndex = '2';
                  avatar.style.border = '2px solid #fff8';
                  avatar.style.background = '#23272f';
                } else {
                  avatar = document.createElement('span');
                  avatar.style.display = 'flex';
                  avatar.style.alignItems = 'center';
                  avatar.style.justifyContent = 'center';
                  avatar.style.width = '30px';
                  avatar.style.height = '30px';
                  avatar.style.borderRadius = '50%';
                  avatar.style.background = '#23272f';
                  avatar.style.position = 'absolute';
                  avatar.style.left = '50%';
                  avatar.style.top = '49%';
                  avatar.style.transform = 'translate(-50%,-50%)';
                  avatar.style.zIndex = '2';
                  avatar.style.fontWeight = 'bold';
                  avatar.style.fontSize = '1.1em';
                  avatar.style.color = '#fff';
                  avatar.textContent = userName[0] || '';
                }
                wrapper.appendChild(diamondOrn);
                wrapper.appendChild(avatar);
                // Effet texte bleu scintillant
                const nameDiamond = document.createElement('span');
                nameDiamond.textContent = ' ' + userName;
                nameDiamond.className = 'diamond-name';
                nameDiamond.style.fontWeight = 'bold';
                nameDiamond.style.fontSize = '1.08em';
                nameDiamond.style.position = 'relative';
                nameDiamond.style.background = 'linear-gradient(90deg,#00eaff,#00bfff,#fff,#00bfff,#00eaff)';
                nameDiamond.style.backgroundSize = '200% 100%';
                nameDiamond.style.backgroundClip = 'text';
                nameDiamond.style.webkitBackgroundClip = 'text';
                nameDiamond.style.color = 'transparent';
                nameDiamond.style.webkitTextFillColor = 'transparent';
                nameDiamond.style.animation = 'diamondTextAnim 2s linear infinite alternate';
                nameDiamond.style.textShadow = '0 0 12px #00eaff,0 0 24px #00bfff,0 0 8px #fff';
                nameDiamond.style.marginLeft = '12px';
                nameDiamond.style.whiteSpace = 'nowrap';
                nameDiamond.style.overflow = 'visible';
                nameDiamond.style.textOverflow = 'unset';
                nameDiamond.style.maxWidth = 'unset';
                // Ajoute le GIF diamant à droite du texte
                const sparkle = document.createElement('img');
                sparkle.src = 'https://cdn.pixabay.com/animation/2024/02/22/14/55/14-55-54-406_256.gif';
                sparkle.alt = 'Diamant animé';
                sparkle.style.display = 'inline-block';
                sparkle.style.width = '32px';
                sparkle.style.height = '32px';
                sparkle.style.marginLeft = '2px';
                sparkle.style.verticalAlign = 'middle';
                sparkle.style.opacity = '0.85';
                nameDiamond.appendChild(sparkle);
                // Construction finale
                mainWrapper.style.marginLeft = '0.2cm';
                nameDiamond.style.marginLeft = '12px';
                mainWrapper.appendChild(wrapper);
                mainWrapper.appendChild(nameDiamond);
                cell.innerHTML = '';
                cell.appendChild(mainWrapper);
              }
              if (user.selectedOrnament === 'platine') {
                // Conteneur principal
                const mainWrapper = document.createElement('span');
                mainWrapper.style.position = 'relative';
                mainWrapper.style.display = 'flex';
                mainWrapper.style.alignItems = 'center';
                mainWrapper.style.justifyContent = 'flex-start';
                mainWrapper.style.width = 'auto';
                mainWrapper.style.minWidth = '160px';
                mainWrapper.style.maxWidth = '100%';
                mainWrapper.style.height = '56px';
                // Ornement PNG autour de la photo
                const wrapper = document.createElement('span');
                wrapper.style.position = 'relative';
                wrapper.style.display = 'inline-block';
                wrapper.style.width = '56px';
                wrapper.style.height = '56px';
                wrapper.style.verticalAlign = 'middle';
                const platineOrn = document.createElement('img');
                platineOrn.src = 'https://i.imgur.com/2gpOrLT.png';
                platineOrn.alt = 'Ornement Platine';
                platineOrn.style.position = 'absolute';
                platineOrn.style.left = '50%';
                platineOrn.style.top = '43%';
                platineOrn.style.transform = 'translate(-50%,-50%)';
                platineOrn.style.width = '56px';
                platineOrn.style.height = '56px';
                platineOrn.style.pointerEvents = 'none';
                platineOrn.style.zIndex = '1';
                // Photo de profil centrée
                let avatarImg = cell.querySelector('img');
                let avatar;
                if (avatarImg && avatarImg.src) {
                  avatar = document.createElement('img');
                  avatar.src = avatarImg.src;
                  avatar.alt = userName;
                  avatar.style.width = '30px';
                  avatar.style.height = '30px';
                  avatar.style.borderRadius = '50%';
                  avatar.style.objectFit = 'cover';
                  avatar.style.position = 'absolute';
                  avatar.style.left = '50%';
                  avatar.style.top = '49%';
                  avatar.style.transform = 'translate(-50%,-50%)';
                  avatar.style.zIndex = '2';
                  avatar.style.border = '2px solid #fff8';
                  avatar.style.background = '#23272f';
                } else {
                  avatar = document.createElement('span');
                  avatar.style.display = 'flex';
                  avatar.style.alignItems = 'center';
                  avatar.style.justifyContent = 'center';
                  avatar.style.width = '30px';
                  avatar.style.height = '30px';
                  avatar.style.borderRadius = '50%';
                  avatar.style.background = '#23272f';
                  avatar.style.position = 'absolute';
                  avatar.style.left = '50%';
                  avatar.style.top = '49%';
                  avatar.style.transform = 'translate(-50%,-50%)';
                  avatar.style.zIndex = '2';
                  avatar.style.fontWeight = 'bold';
                  avatar.style.fontSize = '1.1em';
                  avatar.style.color = '#fff';
                  avatar.textContent = userName[0] || '';
                }
                wrapper.appendChild(platineOrn);
                wrapper.appendChild(avatar);
                // Effet texte bleu ciel glow
                const namePlatine = document.createElement('span');
                namePlatine.textContent = ' ' + userName;
                namePlatine.className = 'platine-name';
                namePlatine.style.fontWeight = 'bold';
                namePlatine.style.fontSize = '1.08em';
                namePlatine.style.position = 'relative';
                namePlatine.style.color = '#7ed6df';
                namePlatine.style.textShadow = '0 0 8px #7ed6df, 0 0 16px #fff';
                namePlatine.style.marginLeft = '12px';
                namePlatine.style.whiteSpace = 'nowrap';
                namePlatine.style.overflow = 'visible';
                namePlatine.style.textOverflow = 'unset';
                namePlatine.style.maxWidth = 'unset';
                // Construction finale
                mainWrapper.style.marginLeft = '0.2cm';
                namePlatine.style.marginLeft = '12px';
                mainWrapper.appendChild(wrapper);
                mainWrapper.appendChild(namePlatine);
                cell.innerHTML = '';
                cell.appendChild(mainWrapper);
              }
              if (user.selectedOrnament === 'prestige0_rot' ||
                  user.selectedOrnament === 'prestige1_rot' ||
                  user.selectedOrnament === 'prestige2_rot' ||
                  user.selectedOrnament === 'prestige3_rot' ||
                  user.selectedOrnament === 'prestige4_rot' ||
                  user.selectedOrnament === 'prestige5_rot' ||
                  user.selectedOrnament === 'prestige6_rot' ||
                  user.selectedOrnament === 'prestige7_rot' ||
                  user.selectedOrnament === 'prestige8_rot' ||
                  user.selectedOrnament === 'prestige9_rot' ||
                  user.selectedOrnament === 'prestige10_rot') {
                // Conteneur principal compact: anneau de niveau rotatif + nom
                const mainWrapper = document.createElement('span');
                mainWrapper.style.position = 'relative';
                mainWrapper.style.display = 'flex';
                mainWrapper.style.alignItems = 'center';
                mainWrapper.style.justifyContent = 'flex-start';
                mainWrapper.style.gap = '6px';
                mainWrapper.style.width = 'auto';
                mainWrapper.style.minWidth = '160px';
                mainWrapper.style.maxWidth = '100%';
                mainWrapper.style.height = '32px';
                const pMatch = /prestige(\d+)_rot/.exec(user.selectedOrnament || 'prestige0_rot');
                const pIdx = pMatch ? parseInt(pMatch[1], 10) : 0;
                const grad = getPrestigeGradient(Math.max(0, Math.min(10, pIdx)));
                const size = 32;
                const circumference = (2 * Math.PI * 44).toFixed(2);
                const dashoffset = 0; // 100% pour visuel
                const tickCount = 32;
                let ticks = '';
                for (let i = 0; i < tickCount; i++) {
                  const a = -Math.PI/2 + (2*Math.PI*i/tickCount);
                  const r1 = 34, r2 = 37;
                  const x1 = 50 + r1*Math.cos(a);
                  const y1 = 50 + r1*Math.sin(a);
                  const x2 = 50 + r2*Math.cos(a);
                  const y2 = 50 + r2*Math.sin(a);
                  ticks += `<line x1='${x1.toFixed(2)}' y1='${y1.toFixed(2)}' x2='${x2.toFixed(2)}' y2='${y2.toFixed(2)}' stroke='${grad.start}' stroke-opacity='0.5' stroke-width='2'/>`;
                }
                const svg = `
<svg width="${size}" height="${size}" viewBox="0 0 100 100" style="overflow:visible;vertical-align:middle;position:absolute;left:0;top:0;">
  <defs>
    <linearGradient id="p0-orn-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${grad.start}"/>
      <stop offset="100%" stop-color="${grad.end}"/>
    </linearGradient>
    <filter id="p0-orn-glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="1.2" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <g>
    ${ticks}
    <circle cx="50" cy="50" r="44" stroke="url(#p0-orn-grad)" stroke-width="8" fill="none" stroke-dasharray="${circumference}" stroke-dashoffset="${dashoffset}" stroke-linecap="round" filter="url(#p0-orn-glow)"/>
    <circle cx="86" cy="50" r="4" fill="${grad.end}" filter="url(#p0-orn-glow)"/>
    <circle cx="86" cy="50" r="5.5" fill="none" stroke="#fff" stroke-opacity="0.6" stroke-width="1" />
    <animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="6s" repeatCount="indefinite"/>
  </g>
</svg>`;
                // Crée un conteneur pour intégrer l'avatar dans l'anneau
                const med = document.createElement('span');
                med.style.display = 'inline-block';
                med.style.position = 'relative';
                med.style.width = size + 'px';
                med.style.height = size + 'px';
                // avatar
                let avatarImg = cell.querySelector('img');
                let avatar;
                if (avatarImg && avatarImg.src) {
                  avatar = document.createElement('img');
                  avatar.src = avatarImg.src;
                  avatar.alt = userName;
                  avatar.style.width = '20px';
                  avatar.style.height = '20px';
                  avatar.style.borderRadius = '50%';
                  avatar.style.objectFit = 'cover';
                  avatar.style.position = 'absolute';
                  avatar.style.left = '50%';
                  avatar.style.top = '50%';
                  avatar.style.transform = 'translate(-50%,-50%)';
                  avatar.style.zIndex = '1';
                  avatar.style.border = '1px solid #fff8';
                  avatar.style.background = '#141a22';
                } else {
                  avatar = document.createElement('span');
                  avatar.style.display = 'flex';
                  avatar.style.alignItems = 'center';
                  avatar.style.justifyContent = 'center';
                  avatar.style.width = '20px';
                  avatar.style.height = '20px';
                  avatar.style.borderRadius = '50%';
                  avatar.style.background = '#141a22';
                  avatar.style.position = 'absolute';
                  avatar.style.left = '50%';
                  avatar.style.top = '50%';
                  avatar.style.transform = 'translate(-50%,-50%)';
                  avatar.style.zIndex = '1';
                  avatar.style.fontWeight = 'bold';
                  avatar.style.fontSize = '.8em';
                  avatar.style.color = '#fff';
                  avatar.textContent = userName[0] || '';
                }
                const ring = document.createElement('div');
                ring.innerHTML = svg;
                ring.style.position = 'absolute';
                ring.style.left = '0';
                ring.style.top = '0';
                ring.style.width = '100%';
                ring.style.height = '100%';
                ring.style.pointerEvents = 'none';
                // Reflets spéciaux Argent (P6) et Or (P7)
                if (pIdx === 6 || pIdx === 7) {
                  const flare = document.createElement('div');
                  flare.style.position = 'absolute';
                  flare.style.left = '-6px';
                  flare.style.top = '-6px';
                  flare.style.width = size + 12 + 'px';
                  flare.style.height = size + 12 + 'px';
                  flare.style.borderRadius = '50%';
                  flare.style.pointerEvents = 'none';
                  flare.style.boxShadow = pIdx === 6
                    ? '0 0 10px rgba(255,255,255,0.7), inset 0 0 10px rgba(255,255,255,0.5)'
                    : '0 0 12px rgba(255,215,0,0.55), inset 0 0 10px rgba(255,215,0,0.35)';
                  flare.style.animation = 'prestigeShimmer 2.4s linear infinite';
                  med.appendChild(flare);
                  if (!document.getElementById('prestige-shimmer-style')) {
                    const st = document.createElement('style');
                    st.id = 'prestige-shimmer-style';
                    st.innerHTML = `@keyframes prestigeShimmer {0%{filter:brightness(1)}50%{filter:brightness(1.25)}100%{filter:brightness(1)}}`;
                    document.head.appendChild(st);
                  }
                }
                med.appendChild(avatar);
                med.appendChild(ring);

                const nameSpan = document.createElement('span');
                nameSpan.textContent = ' ' + userName;
                nameSpan.style.fontWeight = 'bold';
                nameSpan.style.fontSize = '1.02em';
                nameSpan.style.background = `linear-gradient(90deg, ${grad.start}, ${grad.end}, ${grad.start})`;
                nameSpan.style.backgroundSize = '200% 100%';
                nameSpan.style.backgroundClip = 'text';
                nameSpan.style.webkitBackgroundClip = 'text';
                nameSpan.style.color = 'transparent';
                nameSpan.style.webkitTextFillColor = 'transparent';
                nameSpan.style.textShadow = '0 0 8px rgba(0,0,0,0.6)';
                nameSpan.style.animation = 'prestige0TextAnim 3s linear infinite alternate';
                nameSpan.style.whiteSpace = 'nowrap';
                nameSpan.style.overflow = 'visible';
                nameSpan.style.textOverflow = 'unset';

                mainWrapper.style.marginLeft = '0.2cm';
                mainWrapper.appendChild(med);
                mainWrapper.appendChild(nameSpan);
                cell.innerHTML = '';
                cell.appendChild(mainWrapper);
              }
            });
          });
        }
        // Ajoute l'animation CSS globale une seule fois
        if (!document.getElementById('flame-anim-style')) {
          const style = document.createElement('style');
          style.id = 'flame-anim-style';
          style.innerHTML = `@keyframes flameTextAnim {0%{background-position:0% 50%;}100%{background-position:100% 50%;}}`;
          document.head.appendChild(style);
        }
        // Animation texte prestige0 (dégradé qui défile)
        if (!document.getElementById('prestige0-anim-style')) {
          const style = document.createElement('style');
          style.id = 'prestige0-anim-style';
          style.innerHTML = `@keyframes prestige0TextAnim {0%{background-position:0% 50%;}100%{background-position:200% 50%;}}`;
          document.head.appendChild(style);
        }
        // Observe le DOM pour appliquer dynamiquement l'effet
        const assigneeObserver = new MutationObserver(applyOrnamentToAssigneeColumn);
        assigneeObserver.observe(document.body, { childList: true, subtree: true });
        // Appel initial
        applyOrnamentToAssigneeColumn();
        // Ajoute l'animation CSS pour le texte éclair si pas déjà présent
        if (!document.getElementById('thunder-anim-style')) {
          const style = document.createElement('style');
          style.id = 'thunder-anim-style';
          style.innerHTML = `@keyframes thunderTextAnim {0%{background-position:0% 50%;}100%{background-position:100% 50%;}}`;
          document.head.appendChild(style);
        }
        if (!document.getElementById('diamond-anim-style')) {
          const style = document.createElement('style');
          style.id = 'diamond-anim-style';
          style.innerHTML = `@keyframes diamondTextAnim {0%{background-position:0% 50%;}100%{background-position:100% 50%;}}`;
          document.head.appendChild(style);
        }
    }
  })();
