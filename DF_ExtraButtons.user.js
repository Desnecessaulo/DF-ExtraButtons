// ==UserScript==
// @name         DF ExtraButtons
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Extra buttons for Dead Frontier
// @author       D1N0
// @match        *://fairview.deadfrontier.com/onlinezombiemmo/*
// @icon         https://www.favicon.cc/favicon/336/1014/favicon.ico
// @run-at       document-end
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

/*
 * Created by D1N0 and inspired by community scripts
 * DFP: https://www.dfprofiler.com/profile/view/12191879
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * DF ExtraButtons
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * WHAT THIS SCRIPT DOES:
 * ----------------------
 *
 * Replaces Dead Frontier's default navigation bar with a custom one that matches
 * the game's visual style. It adds quick-access buttons for all major in-game
 * pages (Marketplace, Bank, Storage, Crafting, etc.), a WIKI dropdown with links
 * to the community wiki, and compact icon buttons for Credit Shop, Help, and Logout.
 *
 * Buttons that require an Inner City trade zone (The Yard, Vendor) are automatically
 * disabled or enabled based on the player's current zone.
 *
 * The CITY button handles Inner City navigation correctly, since the game engine.
 *
 * Custom header and menu background images are also applied on every page load.
 *
 * All styles are fully scoped to avoid any conflict with the game's own CSS.
 *
 */

(() => {
    'use strict';

    // Only run on pages that contain the game sidebar.
    // This prevents the script from executing on login screens or other non-game pages.
    if (!document.getElementById('sidebar')) return;

    // ── Trade Zone Detection ────────────────────────────────────────────────────
    // Reads the player's current trade zone from the game's global userVars object.
    const { userVars } = unsafeWindow;

    let tradeZone = GM_getValue('tradeZone', null);

    if (userVars?.DFSTATS_df_tradezone) {
        tradeZone = userVars.DFSTATS_df_tradezone;
        GM_setValue('tradeZone', tradeZone);
    } else if (userVars?.df_tradezone) {
        tradeZone = userVars.df_tradezone;
        GM_setValue('tradeZone', tradeZone);
    }

    const isSpecialZone = tradeZone === '21' || tradeZone === '22';

    // ── Button Definitions ──────────────────────────────────────────────────────
    // Left side holds the main in-game navigation buttons.
    // Buttons marked with `disabled` are greyed out and non-clickable unless the
    const leftButtons = [
        { label: 'OUTPOST', href: 'index.php' },
        { label: 'MARKETPLACE', href: 'index.php?page=35' },
        { label: 'BANK', href: 'index.php?page=15' },
        { label: 'STORAGE', href: 'index.php?page=50' },
        { label: 'THE YARD', href: 'index.php?page=24', disabled: !isSpecialZone },
        { label: 'CRAFTING', href: 'index.php?page=59' },
        { label: 'VENDOR', href: 'index.php?page=84', disabled: !isSpecialZone },
        { label: 'CITY', href: null, isCity: true },
    ];

    const rightButtons = [
        { label: 'FORUM', href: 'index.php?action=forum' },
        { label: 'WIKI', href: 'https://deadfrontier.fandom.com/wiki/Dead_Frontier_Wiki', external: true, hasDropdown: true },
        { label: '$', href: 'index.php?page=28', tooltip: 'CREDIT SHOP', icon: true },
        { label: '?', href: 'index.php?page=53', tooltip: 'HELP', icon: true },
        { label: '✕', href: null, tooltip: 'LOGOUT', icon: true, isLogout: true },
    ];

    // Links rendered inside the WIKI hover dropdown. All open in a new tab.
    const wikiDropdown = [
        { label: 'WEAPONS', href: 'https://deadfrontier.fandom.com/wiki/Category:Weapons' },
        { label: 'ARMOUR', href: 'https://deadfrontier.fandom.com/wiki/Armour' },
        { label: 'IMPLANTS', href: 'https://deadfrontier.fandom.com/wiki/Implants' },
        { label: 'CITY MAP', href: 'https://deadfrontier.fandom.com/wiki/Map' },
        { label: 'MORE +', href: 'https://deadfrontier.fandom.com/wiki/Dead_Frontier_Wiki' },
    ];

    const originalNav = document.getElementById('outpostnavigationheaders');
    const logoutHref = originalNav?.children[15]?.firstElementChild?.href ?? null;
    const logoutBtn = rightButtons.find(b => b.isLogout);
    if (logoutBtn && logoutHref) logoutBtn.href = logoutHref;

    // ── URL Helpers ─────────────────────────────────────────────────────────────
    // These utilities determine the current page and whether a given button should
    // be highlighted as active. They handle both `page=` and `action=` URL formats,
    // as well as the home page which has no query parameters.
    const BASE_URL = 'https://fairview.deadfrontier.com/onlinezombiemmo/';

    const getBasePath = () => window.location.href.replace(BASE_URL, '');

    const isHomePage = (path = getBasePath()) =>
        path === '' || path === '/' || /^index\.php(\?)?$/.test(path);

    const isActive = (href) => {
        if (!href) return false;
        const path = getBasePath();
        if (href === 'index.php') return isHomePage(path);
        if (href.includes('action=')) return path.includes(href.split('?')[1]);
        return path === href;
    };

    // ── Styles ──────────────────────────────────────────────────────────────────
    // All CSS classes are prefixed with `dfbm-` to avoid collisions with the

    const css = `
        #dfbm-bar {
            display: flex;
            align-items: stretch;
            justify-content: space-between;
            width: 100%;
            max-width: 100%;
            box-sizing: border-box;
            overflow: visible;
            background: linear-gradient(180deg, #1a0a00 0%, #0d0500 40%, #120800 100%);
            border-bottom: 2px solid #5a1a00;
            border-top: 1px solid #3a1000;
            box-shadow: 0 3px 12px rgba(0,0,0,0.8), inset 0 1px 0 rgba(120,50,0,0.3);
            position: relative;
            z-index: 200;
            font-family: 'Arial Black', 'Arial Bold', Arial, sans-serif;
            min-height: 38px;
            padding: 0 4px;
        }

        #dfbm-bar::before {
            content: '';
            position: absolute;
            inset: 0;
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
            pointer-events: none;
            z-index: 1;
        }

        #dfbm-left, #dfbm-right {
            display: flex;
            align-items: center;
            gap: 2px;
            position: relative;
            z-index: 2;
            flex-shrink: 1;
            min-width: 0;
            overflow: visible;
        }



        .dfbm-btn {
            position: relative;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            text-decoration: none !important;
            padding: 0;
            margin: 4px 1px;
            flex-shrink: 0;
        }

        .dfbm-btn button,
        .dfbm-wiki-wrap > a > button {
            text-decoration: none !important;
        }

        .dfbm-btn button {
            background: linear-gradient(180deg, #2a0e00 0%, #1a0800 50%, #200b00 100%);
            border: 1px solid #4a1500;
            border-top-color: #6a2500;
            border-bottom-color: #300800;
            color: #b85a20;
            font-family: 'Arial Black', 'Arial Bold', Arial, sans-serif;
            font-size: 9px;
            font-weight: 900;
            letter-spacing: 0.5px;
            padding: 6px 8px;
            cursor: pointer;
            white-space: nowrap;
            text-shadow: 0 0 8px rgba(200,80,0,0.5), 1px 1px 2px rgba(0,0,0,0.9);
            box-shadow: inset 0 1px 0 rgba(150,60,0,0.2), inset 0 -1px 0 rgba(0,0,0,0.4), 0 1px 3px rgba(0,0,0,0.6);
            transition: all 0.12s ease;
            min-width: 64px;
            height: 26px;
            position: relative;
            overflow: hidden;
            text-decoration: none;
        }

        .dfbm-btn button::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0;
            height: 40%;
            background: linear-gradient(180deg, rgba(180,70,0,0.08), transparent);
            pointer-events: none;
        }

        .dfbm-btn button:hover {
            background: linear-gradient(180deg, #3d1500 0%, #2a0d00 50%, #320f00 100%);
            border-color: #8a3000;
            border-top-color: #aa4500;
            color: #e87030;
            text-shadow: 0 0 12px rgba(255,120,0,0.8), 1px 1px 2px rgba(0,0,0,0.9);
            box-shadow: inset 0 1px 0 rgba(200,80,0,0.3), inset 0 -1px 0 rgba(0,0,0,0.4), 0 1px 6px rgba(150,50,0,0.4);
        }

        .dfbm-btn.dfbm-active button {
            background: linear-gradient(180deg, #4a1a00 0%, #3a1200 50%, #420f00 100%);
            border-color: #aa4500;
            border-top-color: #cc5500;
            color: #ff8c40;
            text-shadow: 0 0 10px rgba(255,140,50,0.9), 1px 1px 2px rgba(0,0,0,0.8);
            box-shadow: inset 0 1px 0 rgba(220,100,0,0.4), inset 0 -1px 0 rgba(0,0,0,0.5), 0 0 8px rgba(180,70,0,0.3);
        }

        .dfbm-btn.dfbm-disabled button {
            opacity: 0.35;
            cursor: not-allowed;
            color: #5a2a10;
            text-shadow: none;
        }

        .dfbm-btn.dfbm-disabled button:hover {
            background: linear-gradient(180deg, #2a0e00 0%, #1a0800 50%, #200b00 100%);
            border-color: #4a1500;
            color: #5a2a10;
            text-shadow: none;
            box-shadow: inset 0 1px 0 rgba(150,60,0,0.2), inset 0 -1px 0 rgba(0,0,0,0.4), 0 1px 3px rgba(0,0,0,0.6);
        }

        .dfbm-btn.dfbm-icon button {
            min-width: 26px;
            width: 26px;
            padding: 0;
            font-size: 13px;
            font-weight: 900;
            letter-spacing: 0;
        }

        .dfbm-btn.dfbm-city button {
            min-width: 52px;
        }

        .dfbm-btn.dfbm-city .dfbm-city-arrow {
            font-size: 12px;
            margin-left: 2px;
            opacity: 0.7;
            display: inline-block;
            transition: transform 0.15s ease, opacity 0.15s ease;
        }

        .dfbm-btn.dfbm-city button:hover .dfbm-city-arrow {
            transform: translateX(2px);
            opacity: 1;
        }

        .dfbm-btn.dfbm-logout button {
            color: #8a1a1a;
            border-color: #3a0a0a;
            border-top-color: #5a1515;
        }

        .dfbm-btn.dfbm-logout button:hover {
            color: #cc3030;
            border-color: #6a1515;
            border-top-color: #8a2020;
            text-shadow: 0 0 12px rgba(255,50,50,0.7), 1px 1px 2px rgba(0,0,0,0.9);
            background: linear-gradient(180deg, #2a0a0a 0%, #1a0606 50%, #200808 100%);
        }

        .dfbm-wiki-wrap {
            position: relative;
            display: inline-flex;
            margin: 4px 1px;
            flex-shrink: 0;
        }

        .dfbm-wiki-wrap > a {
            position: relative;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            text-decoration: none;
            padding: 0;
        }

        .dfbm-wiki-wrap > a > button {
            background: linear-gradient(180deg, #2a0e00 0%, #1a0800 50%, #200b00 100%);
            border: 1px solid #4a1500;
            border-top-color: #6a2500;
            border-bottom-color: #300800;
            color: #b85a20;
            font-family: 'Arial Black', 'Arial Bold', Arial, sans-serif;
            font-size: 9px;
            font-weight: 900;
            letter-spacing: 0.5px;
            padding: 6px 8px;
            cursor: pointer;
            white-space: nowrap;
            text-shadow: 0 0 8px rgba(200,80,0,0.5), 1px 1px 2px rgba(0,0,0,0.9);
            box-shadow: inset 0 1px 0 rgba(150,60,0,0.2), inset 0 -1px 0 rgba(0,0,0,0.4), 0 1px 3px rgba(0,0,0,0.6);
            transition: all 0.12s ease;
            min-width: 64px;
            height: 26px;
            position: relative;
            overflow: hidden;
            text-decoration: none;
        }

        .dfbm-wiki-wrap > a > button::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0;
            height: 40%;
            background: linear-gradient(180deg, rgba(180,70,0,0.08), transparent);
            pointer-events: none;
        }

        .dfbm-wiki-wrap > a > button::after {
            content: '▾';
            font-size: 8px;
            margin-left: 3px;
            opacity: 0.6;
            vertical-align: middle;
        }

        .dfbm-wiki-wrap:hover > a > button,
        .dfbm-wiki-wrap > a > button:hover {
            background: linear-gradient(180deg, #3d1500 0%, #2a0d00 50%, #320f00 100%);
            border-color: #8a3000;
            border-top-color: #aa4500;
            color: #e87030;
            text-shadow: 0 0 12px rgba(255,120,0,0.8), 1px 1px 2px rgba(0,0,0,0.9);
            box-shadow: inset 0 1px 0 rgba(200,80,0,0.3), inset 0 -1px 0 rgba(0,0,0,0.4), 0 1px 6px rgba(150,50,0,0.4);
        }

        .dfbm-wiki-dropdown {
            display: none;
            position: absolute;
            top: 100%;
            right: 0;
            min-width: 110px;
            background: linear-gradient(180deg, #1e0b00 0%, #110600 100%);
            border: 1px solid #5a1a00;
            border-top: none;
            box-shadow: 0 6px 20px rgba(0,0,0,0.9), inset 1px 0 0 rgba(100,40,0,0.2), inset -1px 0 0 rgba(100,40,0,0.2);
            z-index: 9999;
            flex-direction: column;
            overflow: hidden;
        }

        .dfbm-wiki-dropdown::before {
            content: '';
            display: block;
            height: 1px;
            background: linear-gradient(90deg, transparent, #8a3000, transparent);
            margin: 0 8px;
        }

        .dfbm-wiki-wrap:hover .dfbm-wiki-dropdown {
            display: flex;
        }

        .dfbm-wiki-dropdown a {
            display: block;
            text-decoration: none;
            padding: 7px 12px;
            font-family: 'Arial Black', 'Arial Bold', Arial, sans-serif;
            font-size: 8px;
            font-weight: 900;
            letter-spacing: 0.6px;
            color: #8a3a10;
            text-shadow: 0 0 6px rgba(150,50,0,0.3), 1px 1px 2px rgba(0,0,0,0.9);
            border-bottom: 1px solid rgba(80,25,0,0.4);
            transition: all 0.1s ease;
            position: relative;
            white-space: nowrap;
        }

        .dfbm-wiki-dropdown a:last-child {
            border-bottom: none;
        }

        .dfbm-wiki-dropdown a::before {
            content: '';
            position: absolute;
            left: 0; top: 0; bottom: 0;
            width: 2px;
            background: #7a2800;
            opacity: 0;
            transition: opacity 0.1s ease;
        }

        .dfbm-wiki-dropdown a:hover {
            background: linear-gradient(90deg, rgba(60,20,0,0.8), rgba(40,12,0,0.4));
            color: #e07030;
            text-shadow: 0 0 10px rgba(220,100,0,0.7), 1px 1px 2px rgba(0,0,0,0.9);
            padding-left: 15px;
        }

        .dfbm-wiki-dropdown a:hover::before {
            opacity: 1;
        }

        .dfbm-wiki-dropdown a.dfbm-wiki-more {
            color: #6a2a08;
            font-style: italic;
        }

        .dfbm-wiki-dropdown a.dfbm-wiki-more:hover {
            color: #cc5020;
        }
    `;

    const styleEl = document.createElement('style');
    styleEl.textContent = css;
    document.head.appendChild(styleEl);

    // ── DOM Helpers ─────────────────────────────────────────────────────────────
    // Small factory functions used when building button elements to avoid
    // repeating the same createElement + attribute assignment pattern.
    const makeButton = (label) => {
        const btn = document.createElement('button');
        btn.textContent = label;
        return btn;
    };

    const makeAnchor = (href, classes = [], external = false) => {
        const a = document.createElement('a');
        a.className = ['dfbm-btn', ...classes].join(' ');
        if (href) a.href = href;
        if (external) a.target = '_blank';
        return a;
    };

    // ── Build Bar ───────────────────────────────────────────────────────────────
    // Iterates over the button definition arrays and builds the left and right
    // groups of the navigation bar.
    //
    // The CITY button uses a two-step navigation approach because the game engine
    // only allows entering the Inner City from the home page (index.php). When
    // clicked from any other page, a flag is saved via GM_setValue and the player
    // is redirected to home first. On the next page load the flag is detected and
    // doPageChange(21) is called automatically once the game engine is ready.
    const bar = document.createElement('div');
    bar.id = 'dfbm-bar';
    const leftDiv = document.createElement('div');
    leftDiv.id = 'dfbm-left';
    const rightDiv = document.createElement('div');
    rightDiv.id = 'dfbm-right';

    for (const btn of leftButtons) {
        const classes = [];
        if (btn.disabled) classes.push('dfbm-disabled');
        if (!btn.disabled && isActive(btn.href)) classes.push('dfbm-active');

        const a = makeAnchor(btn.isCity ? null : btn.href, classes);
        let button;

        if (btn.isCity) {
            a.classList.add('dfbm-city');
            button = document.createElement('button');
            const textSpan = document.createElement('span');
            textSpan.textContent = 'CITY';
            const arrowSpan = document.createElement('span');
            arrowSpan.className = 'dfbm-city-arrow';
            arrowSpan.textContent = '›';
            button.append(textSpan, arrowSpan);

            button.addEventListener('click', () => {
                unsafeWindow.playSound?.('outpost');
                if (isHomePage() && unsafeWindow.doPageChange) {
                    setTimeout(() => unsafeWindow.doPageChange(21, 1, false), 1000);
                } else {
                    GM_setValue('dfbm_redirectToCity', true);
                    setTimeout(() => { window.location.href = `${BASE_URL}index.php`; }, 1000);
                }
            });
        } else {
            button = makeButton(btn.label);
            if (btn.disabled) button.disabled = true;
        }

        a.appendChild(button);
        leftDiv.appendChild(a);
    }

    for (const btn of rightButtons) {
        if (btn.hasDropdown) {
            const wrap = document.createElement('div');
            wrap.className = 'dfbm-wiki-wrap';

            const a = document.createElement('a');
            a.href = btn.href;
            a.target = '_blank';
            a.appendChild(makeButton(btn.label));
            wrap.appendChild(a);

            const panel = document.createElement('div');
            panel.className = 'dfbm-wiki-dropdown';

            wikiDropdown.forEach((item, i) => {
                const link = document.createElement('a');
                link.href = item.href;
                link.target = '_blank';
                link.textContent = item.label;
                if (i === wikiDropdown.length - 1) link.classList.add('dfbm-wiki-more');
                panel.appendChild(link);
            });

            wrap.appendChild(panel);
            rightDiv.appendChild(wrap);
            continue;
        }

        const classes = [];
        if (btn.icon) classes.push('dfbm-icon');
        if (btn.isLogout) classes.push('dfbm-logout');
        if (isActive(btn.href)) classes.push('dfbm-active');

        const a = makeAnchor(btn.href, classes, btn.external);
        const button = makeButton(btn.label);

        if (btn.tooltip) {
            button.title = btn.tooltip;
            a.title = btn.tooltip;
        }

        a.appendChild(button);
        rightDiv.appendChild(a);
    }

    bar.append(leftDiv, rightDiv);

    // ── Replace Original Nav ────────────────────────────────────────────────────
    // The game's original navigation element is fully hidden via both inline style
    const navEl = document.getElementById('outpostnavigationheaders');
    if (navEl) {
        navEl.style.cssText = 'display:none !important; visibility:hidden !important; opacity:0 !important; height:0 !important; overflow:hidden !important; position:absolute !important; pointer-events:none !important;';
        const navParent = navEl.parentNode;
        if (navParent && navParent.id !== 'sidebar' && navParent.tagName !== 'BODY') {
            navParent.style.overflow = 'visible';
        }
        navEl.parentNode.insertBefore(bar, navEl);
    }

    let el = document.getElementById('dfbm-bar')?.parentElement;
    while (el && el !== document.body) {
        const { overflow, overflowX, overflowY } = window.getComputedStyle(el);
        if ([overflow, overflowX, overflowY].includes('hidden')) el.style.overflow = 'visible';
        el = el.parentElement;
    }

    const hideCSS = document.createElement('style');
    hideCSS.textContent = `
        #outpostnavigationheaders, #outpostnavigationheaders * {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            overflow: hidden !important;
        }
    `;
    document.head.appendChild(hideCSS);

    // ── Inner City Redirect ─────────────────────────────────────────────────────
    // On page load, checks if the CITY button was clicked from a non-home page.
    // If so, clears the flag and waits for the game engine's doPageChange function
    // to become available, then triggers the Inner City transition automatically.
    const cityRedirect = GM_getValue('dfbm_redirectToCity', false);
    if (cityRedirect && isHomePage()) {
        GM_setValue('dfbm_redirectToCity', false);
        const cityInterval = setInterval(() => {
            if (unsafeWindow.doPageChange) {
                clearInterval(cityInterval);
                unsafeWindow.doPageChange(21, 1, false);
            }
        }, 200);
    }

    // ── Custom Backgrounds ──────────────────────────────────────────────────────
    // Replaces the default game header and menu-bottom images with custom ones.
    const replaceBackground = (selector, url) => {
        const el = document.querySelector(selector);
        if (!el) return;
        el.setAttribute('background', url);
        el.style.backgroundImage = `url("${url}")`;
    };

    replaceBackground('td[width="985"].design2010[background*="header.jpg"]', 'https://i.ibb.co/1t6d7WZv/header.jpg');
    replaceBackground('td[width="911"].design2010[background*="menu_bottom.jpg"]', 'https://i.ibb.co/wFLgpdbr/menu-bottom.jpg');

})();

