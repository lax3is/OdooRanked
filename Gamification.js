// ==UserScript==
// @name         Odoo Gamification System
// @namespace    http://tampermonkey.net/
// @version      0.1.6
// @description  Add gamification system to Odoo helpdesk with custom rank logos
// @author       Alexis.Sair
// @match        https://winprovence.odoo.com/*
// @grant        GM_xmlhttpRequest
// @require      https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js
// @require      https://www.gstatic.com/firebasejs/8.10.0/firebase-database.js
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
            const badgeSize = 80;
            const logoSize = 60;
            const stroke = 6;
            const radius = badgeSize/2 - stroke/2 - 1; // 1px de marge entre logo et cercle
            const normalizedRadius = radius;
            const circumference = 2 * Math.PI * normalizedRadius;
            const currentRank = getCurrentRank(userData.xp);
            const nextRankXp = getNextRankXp(userData.xp);
            let progressCircle = 1;
            if (nextRankXp !== null) {
                progressCircle = (userData.xp - currentRank.xpRequired) / (nextRankXp + userData.xp - currentRank.xpRequired);
            }
            let gamificationUI = document.getElementById('gamification-ui');
            const baseRank = getRankBaseName(currentRank.name);
            const logo = rankLogos[baseRank];
            const color = rankColors[baseRank];
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
            `;
            gamificationUI.style.display = 'none';
            let controls = `
                <div style="position:absolute;top:8px;right:8px;display:flex;gap:6px;">
                    <button id="close-btn" title="Fermer" style="background:none;border:none;font-size:2em;cursor:pointer;color:#ff3b3b;">×</button>
                </div>
            `;
            let panelContent = `
                <div style="display:flex;flex-direction:column;align-items:center;gap:2px;margin-bottom:8px;">
                    <div style="padding:0;display:flex;align-items:center;justify-content:center;background:transparent;border-radius:0;">
                        <img src="${logo}" alt="Logo Rang" style="width:110px;height:110px;object-fit:contain;border-radius:0;background:transparent;filter:${getRankGlowFilter(baseRank)};"/>
                    </div>
                    <div style="font-size:1.1em;font-weight:bold;margin-top:2px;color:#f3f6fa;text-shadow:0 0 8px #fff,0 0 16px ${color};">${currentRank.name}</div>
                </div>
                ${nextRankXp ? `<div style="font-size:1.18em;font-weight:bold;color:#f3f6fa;text-align:center;margin-bottom:10px;text-shadow:0 1px 8px #fff,0 0 2px #0002;">
  <span style='color:#26e0ce;font-size:1.22em;'>${nextRankXp} XP</span> avant <b style='color:#f3f6fa;'>${ranks[ranks.findIndex(r => r.name === currentRank.name)+1]?.name || ""}</b>
</div>` : ''}
                <div style="margin:14px 0 0 0;width:100%;">
                    <div style="background:#e5e5e5;border-radius:8px;height:14px;overflow:hidden;">
                        <div style="background:#4caf50;height:100%;width:${Math.round(progressCircle*100)}%;transition:width 0.5s;"></div>
                    </div>
                </div>
            `;
            gamificationUI.innerHTML = controls + panelContent;
            // --- Notification de level up : une seule fois ---
            const userName = getCurrentUserName();
            const storageKey = `gamif_last_rank_${userName}`;
            const lastRank = localStorage.getItem(storageKey);
            if (lastRank && lastRank !== currentRank.name) {
                showRankChangeAnimation(
                    { name: lastRank },
                    currentRank,
                    rankLogos,
                    rankColors
                );
            }
            localStorage.setItem(storageKey, currentRank.name);
            gamificationUI.dataset.rank = currentRank.name;
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
                openBtn.innerHTML = `
                  <svg width="${badgeSize}" height="${badgeSize}" style="position:absolute;top:0;left:0;z-index:1;" viewBox="0 0 ${badgeSize} ${badgeSize}">
                    <defs>
                      <linearGradient id="xp-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#f953c6"/>
                        <stop offset="60%" stop-color="#b91d73"/>
                        <stop offset="100%" stop-color="#6a11cb"/>
                      </linearGradient>
                    </defs>
                    <circle cx="${badgeSize/2}" cy="${badgeSize/2}" r="${normalizedRadius}" stroke="url(#xp-gradient)" stroke-width="${stroke}"
                      fill="none" stroke-dasharray="${circumference}" stroke-dashoffset="${circumference - progressCircle * circumference}"
                      style="transition:stroke-dashoffset 0.5s;" stroke-linecap="round"/>
                  </svg>
                  <img src="${logo}" alt="Logo Rang" style="width:${logoSize}px;height:${logoSize}px;object-fit:contain;border-radius:50%;background:#fff;position:relative;z-index:2;filter:${getRankGlowFilter(baseRank)};margin:${(badgeSize-logoSize)/2}px;"/>
                `;
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
                openBtn.innerHTML = `
                  <svg width="${badgeSize}" height="${badgeSize}" style="position:absolute;top:0;left:0;z-index:1;" viewBox="0 0 ${badgeSize} ${badgeSize}">
                    <defs>
                      <linearGradient id="xp-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#f953c6"/>
                        <stop offset="60%" stop-color="#b91d73"/>
                        <stop offset="100%" stop-color="#6a11cb"/>
                      </linearGradient>
                    </defs>
                    <circle cx="${badgeSize/2}" cy="${badgeSize/2}" r="${normalizedRadius}" stroke="url(#xp-gradient)" stroke-width="${stroke}"
                      fill="none" stroke-dasharray="${circumference}" stroke-dashoffset="${circumference - progressCircle * circumference}"
                      style="transition:stroke-dashoffset 0.5s;" stroke-linecap="round"/>
                  </svg>
                  <img src="${logo}" alt="Logo Rang" style="width:${logoSize}px;height:${logoSize}px;object-fit:contain;border-radius:50%;background:#fff;position:relative;z-index:2;filter:${getRankGlowFilter(baseRank)};margin:${(badgeSize-logoSize)/2}px;"/>
                `;
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
        function addPodiumButton() {
            if (document.getElementById('podium-btn')) return;
            
            function tryAddButton() {
                // Chercher le bouton Analyse dans la navbar
                const analyseBtn = document.querySelector('.o_menu_sections .dropdown-toggle[title="Analyse"]');
                if (!analyseBtn) {
                    setTimeout(tryAddButton, 1000);
                    return;
                }

                // Cloner le bouton Analyse pour garder le style Odoo
                const btn = analyseBtn.cloneNode(true);
            btn.id = 'podium-btn';
            btn.title = 'Voir le classement';
            btn.setAttribute('data-section', 'classement');
            btn.innerHTML = '<span>🏆 Classement</span>';
            btn.onclick = (e) => {
                e.stopPropagation();
                showClassementMenu(btn);
            };

                // Insérer juste après Analyse
                analyseBtn.parentElement.insertAdjacentElement('afterend', btn);
            }

            tryAddButton();
        }
        function showClassementMenu(anchorBtn) {
            // Supprime tout menu existant
            let oldMenu = document.getElementById('classement-dropdown-menu');
            if (oldMenu) oldMenu.remove();
            // Crée le menu déroulant
            const menu = document.createElement('div');
            menu.id = 'classement-dropdown-menu';
            const menuWidth = 240;
            menu.style.cssText = `
                position: fixed;
                min-width: ${menuWidth}px;
                max-width: 98vw;
                background: #23272f;
                color: #fff;
                border-radius: 14px;
                box-shadow: 0 8px 32px 0 #26e0ce55, 0 2px 8px #0008;
                z-index: 10010;
                font-family: 'Segoe UI', Arial, sans-serif;
                padding: 0.5em 0;
                border: none;
                transition: transform 0.18s cubic-bezier(.4,1.4,.6,1);
                transform: scale(0.98);
            `;
            menu.innerHTML = `
                <div style="padding:12px 24px;cursor:pointer;font-size:1.1em;transition:background 0.2s;" onmouseover="this.style.background='#2226'" onmouseout="this.style.background='none'" id="menu-classement-general">🏆 Classement général</div>
                <div style="padding:12px 24px;cursor:pointer;font-size:1.1em;transition:background 0.2s;" onmouseover="this.style.background='#2226'" onmouseout="this.style.background='none'" id="menu-stats-personnelles">📊 Stats personnelles</div>
                <div style="padding:12px 24px;cursor:pointer;font-size:1.1em;transition:background 0.2s;" onmouseover="this.style.background='#2226'" onmouseout="this.style.background='none'" id="menu-stats-autres">👥 Stats des autres utilisateurs</div>
            `;
            document.body.appendChild(menu);
            // Positionne le menu centré sous le bouton
            const rect = anchorBtn.getBoundingClientRect();
            menu.style.left = (rect.left + rect.width/2 - menuWidth/2 + window.scrollX) + 'px';
            menu.style.top = (rect.bottom + window.scrollY + 8) + 'px';
            // Petit effet scale à l'ouverture
            setTimeout(() => {
                menu.style.transform = 'scale(1)';
            }, 10);
            // Ferme le menu si on clique ailleurs
            setTimeout(() => {
                document.addEventListener('click', closeMenuOnClick, { once: true });
            }, 10);
            function closeMenuOnClick(e) {
                if (!menu.contains(e.target)) menu.remove();
            }
            // Actions des choix
            menu.querySelector('#menu-classement-general').onclick = () => {
                menu.remove();
                showPodiumPopup();
            };
            menu.querySelector('#menu-stats-personnelles').onclick = () => {
                menu.remove();
                showStatsPopup('me');
            };
            menu.querySelector('#menu-stats-autres').onclick = () => {
                menu.remove();
                showStatsPopup('others');
            };
            // Ajout effet glowing sur hover pour chaque option du menu
            const menuOptions = menu.querySelectorAll('div[id^="menu-"]');
            menuOptions.forEach(opt => {
                opt.addEventListener('mouseover', function() {
                    this.style.background = '#23272f';
                    this.style.boxShadow = '0 0 12px 2px #26e0ce, 0 2px 8px #0006';
                    this.style.color = '#26e0ce';
                });
                opt.addEventListener('mouseout', function() {
                    this.style.background = 'none';
                    this.style.boxShadow = 'none';
                    this.style.color = '#fff';
                });
            });
        }
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
                    let html = `<div style='font-size:1.3em;margin-bottom:12px;'><b>${userName}</b> <span style='font-size:0.95em;font-weight:normal;color:#fff;margin-left:16px;'>— <span style='color:#26e0ce;'>${rank}</span> — <span style='color:#4caf50;'>${xp} XP</span></span></div>`;
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
                        html += `<div class='user-stats-block' style='margin-bottom:32px;padding:18px 18px 12px 18px;background:#23272f;border-radius:12px;'>`;
                        html += `<div style='font-size:1.18em;font-weight:bold;margin-bottom:8px;color:#26e0ce;display:flex;align-items:center;cursor:pointer;' class='user-toggle' data-idx='${idx}'>`;
                        html += `<span style='margin-right:8px;transition:transform 0.2s;' id='arrow-${idx}'>▼</span>${name} <span style='font-size:0.95em;font-weight:normal;color:#fff;margin-left:16px;'>— <span style='color:#26e0ce;'>${rank}</span> — <span style='color:#4caf50;'>${xp} XP</span></span>`;
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
                                filtered.sort((a, b) => (b.time||'').localeCompare(a.time||'')).forEach(log => {
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
                    xp: data.xp || 0,
                    rank: getCurrentRank(data.xp || 0).name
                })).sort((a, b) => b.xp - a.xp);
                const leaderboardHtml = `
                  <div id='leaderboard-scrollbox' style="max-height:400px;overflow-y:auto;position:relative;scrollbar-width:none;-ms-overflow-style:none;">
                    <ol style="padding-left:0;list-style:none;margin:0;">
                        ${leaderboard.map((user, i) => {
                            const base = getRankBaseName(user.rank);
                            // Podium médailles
                            let medal = '';
                            if (i === 0) medal = '<span style=\'font-size:2.1em;vertical-align:middle;display:inline-block;margin-right:8px;\'>🥇</span>';
                            else if (i === 1) medal = '<span style=\'font-size:2.1em;vertical-align:middle;display:inline-block;margin-right:8px;\'>🥈</span>';
                            else if (i === 2) medal = '<span style=\'font-size:2.1em;vertical-align:middle;display:inline-block;margin-right:8px;\'>🥉</span>';
                            // Glow color selon la place, version discrète
                            let drop = '';
                            if (i === 0) drop = 'drop-shadow(0 0 0px #26e0ce88) drop-shadow(0 0 7px #26e0ce88) drop-shadow(0 0 12px #26e0ce44)';
                            else if (i === 1) drop = 'drop-shadow(0 0 0px #ffd70088) drop-shadow(0 0 6px #ffd70088) drop-shadow(0 0 10px #ffd70044)';
                            else if (i === 2) drop = 'drop-shadow(0 0 0px #b08d5788) drop-shadow(0 0 5px #b08d5788) drop-shadow(0 0 8px #b08d5744)';
                            else drop = 'drop-shadow(0 0 3px #8883)';
                            // Couleur du rang
                            const rankColor = rankColors[base] || '#fff';
                            return `<li style=\"display:flex;align-items:center;gap:18px;justify-content:left;margin:18px 0 18px 0;font-size:1.1em;\">
                                <span style=\"font-size:2.5em;padding-left:8px;display:flex;align-items:center;justify-content:center;\">
                                    <img src=\"${rankLogos[base]}\" alt=\"${base}\" style=\"width:90px;height:90px;vertical-align:middle;object-fit:contain;border-radius:20px;background:transparent;filter:${drop};margin-right:8px;\"/>
                                </span>
                                ${medal}
                                <span style=\"font-weight:bold;color:#e0e0e0;font-size:1.05em;min-width:120px;display:inline-block;\">${user.name}</span>
                                <span style=\"color:${rankColor};font-weight:bold;font-size:1.12em;margin-left:12px;min-width:100px;display:inline-block;\">${user.rank}</span>
                                <span style=\"color:#26e0ce;font-size:1.12em;font-weight:bold;margin-left:12px;\">${user.xp} XP</span>
                            </li>`;
                        }).join('')}
                    </ol>
                  </div>
                  <style>
                  #leaderboard-scrollbox::-webkit-scrollbar { display: none !important; width: 0 !important; }
                  #leaderboard-scrollbox { scrollbar-width: none !important; -ms-overflow-style: none !important; }
                  </style>
                `;
                const loadingElem = document.getElementById('leaderboard-loading');
                if (loadingElem) loadingElem.style.display = 'none';
                const leaderboardContent = document.getElementById('leaderboard-content');
                if (leaderboardContent) {
                    leaderboardContent.innerHTML = leaderboardHtml;
                }
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
        function awardXPToUser(userName, amount, typeCloture = 'normal') {
            const userRef = firebase.database().ref('users/' + encodeURIComponent(userName));
            userRef.once('value').then(snapshot => {
                const data = snapshot.val();
                const currentXp = data && typeof data.xp === 'number' ? data.xp : 0;
                const newXp = currentXp + amount;
                // Enregistrement du XP
                userRef.update({ xp: newXp })
                    .then(() => {
                        showXPGainNotification(amount);
                        updateUI({ xp: newXp });
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
                // Enregistrement du log détaillé (date + heure + type)
                const logRef = firebase.database().ref('users/' + encodeURIComponent(userName) + '/clotures_log');
                logRef.push({ date: dateStr, time: timeStr, type: typeCloture });
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
        function setupCloturerDetection() {
            function addListeners() {
                document.querySelectorAll('button, a').forEach(btn => {
                    if (btn.dataset.gamifCloturer) return;
                    if (btn.textContent && btn.textContent.trim().toLowerCase().includes('clôturer')) {
                        btn.dataset.gamifCloturer = '1';
                        btn.addEventListener('click', function() {
                            console.log('[Gamification] Clic sur bouton Clôturer détecté');
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
                                    } else {
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
                                    }
                                    console.log('[Gamification] Nom utilisateur détecté :', userName);
                                    console.log('[Gamification] Attribution de', xp, 'XP à', userName, 'Type:', typeCloture);
                                    awardXPToUser(userName, xp, typeCloture);
                                } else {
                                    console.log('[Gamification] Condition non remplie : XP non attribuée');
                                }
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
                        const data = snapshot.val();
                        const xp = data && typeof data.xp === 'number' ? data.xp : 0;
                        console.log('[Gamification] Lecture Firebase pour', userName, ':', data, '=> XP utilisée :', xp);
                        updateUI({ xp });
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
                        const data = snapshot.val();
                        const xp = data && typeof data.xp === 'number' ? data.xp : 0;
                        updateUI({ xp });
                    });
                }
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
    }
})(); 
