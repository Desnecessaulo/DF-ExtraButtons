// ==UserScript==
// @name         DF ExtraButtons
// @namespace    http://tampermonkey.net/
// @version      1.0.1
// @description  Extra buttons for Dead Frontier
// @author       D1N0
// @match        *://fairview.deadfrontier.com/onlinezombiemmo/*
// @icon         https://www.favicon.cc/favicon/336/1014/favicon.ico
// @run-at       document-start
// @grant        GM_setValue
// @grant        GM_getValue
// @license      GPL-3.0-or-later
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
 * Buttons that require an Inner City trade zone (Clan, The Yard, Vendor) are automatically
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

    // ─── Constants ───────────────────────────────────────────────────────
    const BASE_URL = 'https://fairview.deadfrontier.com/onlinezombiemmo/';
    const CLAN_ID_DEFAULT = '-1';

    // ─── Early: hide original nav immediately to prevent flash ─────────
    const earlyStyle = document.createElement('style');
    earlyStyle.textContent = '#outpostnavigationheaders, #outpostnavigationheaders * { display: none !important; }';
    (document.head || document.documentElement).appendChild(earlyStyle);

    // ─── State ───────────────────────────────────────────────────────────
    let clanId = CLAN_ID_DEFAULT;
    let clanName = '';

    // ─── Clan Cache (persisted via GM storage, keyed by user ID) ─────────
    const loadCachedClan = () => {
        const cached = GM_getValue('dfbm_clan', null);
        if (!cached) return;

        // Invalidate cache if user changed (different account)
        const currentUserId = unsafeWindow.userVars?.DFSTATS_id_member;
        if (currentUserId && cached.userId && cached.userId !== currentUserId) {
            GM_setValue('dfbm_clan', null);
            return;
        }

        clanId = cached.id ?? CLAN_ID_DEFAULT;
        clanName = cached.name ?? '';
        console.log('[DFBM] Clan loaded from cache:', clanId, clanName);
    };

    const saveClanCache = () => {
        const userId = unsafeWindow.userVars?.DFSTATS_id_member ?? null;
        GM_setValue('dfbm_clan', { id: clanId, name: clanName, userId });
    };

    // ─── URL Helpers ─────────────────────────────────────────────────────
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

    const isLoginPage = () => {
        const params = new URLSearchParams(window.location.search);
        return params.get('page') === '1' || params.get('action') === 'login';
    };

    // ─── DOM Helpers ─────────────────────────────────────────────────────
    const createElement = (tag, attrs = {}, children = []) => {
        const el = document.createElement(tag);
        for (const [key, val] of Object.entries(attrs)) {
            if (key === 'className') el.className = val;
            else if (key === 'textContent') el.textContent = val;
            else if (key === 'disabled') el.disabled = val;
            else if (key.startsWith('on')) el.addEventListener(key.slice(2).toLowerCase(), val);
            else el.setAttribute(key, val);
        }
        children.forEach(child => {
            if (typeof child === 'string') el.appendChild(document.createTextNode(child));
            else if (child) el.appendChild(child);
        });
        return el;
    };

    const makeButton = (label, extraAttrs = {}) =>
        createElement('button', { textContent: label, ...extraAttrs });

    const makeAnchor = (href, classes = [], external = false) => {
        const attrs = { className: ['dfbm-btn', ...classes].join(' ') };
        if (href) attrs.href = href;
        if (external) attrs.target = '_blank';
        return createElement('a', attrs);
    };

    // ─── Logout Href Extraction ──────────────────────────────────────────
    const extractLogoutHref = () => {
        const nav = document.getElementById('outpostnavigationheaders');
        if (!nav) return null;
        const anchor = [...nav.querySelectorAll('a')].find(a => a.href.includes('action=logout'));
        return anchor?.href ?? null;
    };

    // ─── Trade Zone Detection ────────────────────────────────────────────
    const resolveTradeZone = () => {
        const { userVars } = unsafeWindow;
        let tradeZone = GM_getValue('tradeZone', null);

        const freshZone = userVars?.DFSTATS_df_tradezone ?? userVars?.df_tradezone;
        if (freshZone) {
            tradeZone = freshZone;
            GM_setValue('tradeZone', tradeZone);
        }

        return tradeZone;
    };

    const isSpecialZone = (zone) => zone === '21' || zone === '22';

    // ─── Clan Data Fetch (background refresh) ──────────────────────────
    const fetchClanData = () => {
        const previousId = clanId;
        const previousName = clanName;

        return fetch(window.location.href, { cache: 'force-cache' })
            .then(r => r.text())
            .then(html => {
                clanId = html.match(/DFSTATS_df_clan_id=([^&]+)/)?.[1] ?? CLAN_ID_DEFAULT;
                clanName = html.match(/DFSTATS_df_clan_name=([^&]+)/)?.[1] ?? '';
                saveClanCache();

                const changed = clanId !== previousId || clanName !== previousName;
                if (changed) console.log('[DFBM] Clan data changed:', previousId, '→', clanId);
                return changed;
            });
    };

    const hasClan = () => clanId !== CLAN_ID_DEFAULT && clanName !== '';

    // ─── Button Configurations ───────────────────────────────────────────
    const WIKI_LINKS = [
        { label: 'WEAPONS', href: 'https://deadfrontier.fandom.com/wiki/Category:Weapons' },
        { label: 'ARMOUR', href: 'https://deadfrontier.fandom.com/wiki/Armour' },
        { label: 'IMPLANTS', href: 'https://deadfrontier.fandom.com/wiki/Implants' },
        { label: 'CLOTHING', href: 'https://deadfrontier.fandom.com/wiki/Clothing' },
        { label: 'MISSIONS', href: 'https://deadfrontier.fandom.com/wiki/Missions' },
        { label: 'CITY MAP', href: 'https://deadfrontier.fandom.com/wiki/Map' },
        { label: 'BESTIARY', href: 'https://deadfrontier.fandom.com/wiki/Bestiary' },
        { label: 'STORY', href: 'https://deadfrontier.fandom.com/wiki/Category:Background_Story' },
        { label: 'STATS & LEVEL', href: 'https://deadfrontier.fandom.com/wiki/Stats_and_Levels' },
        { label: 'BUILD GUIDE', href: 'https://deadfrontier.fandom.com/wiki/Character_Build_Guide' },
        { label: 'PROFESSIONS', href: 'https://deadfrontier.fandom.com/wiki/Professions' },
        { label: 'TIPS & TACTICS', href: 'https://deadfrontier.fandom.com/wiki/Tips_and_Tactics' },
        { label: 'DFPROFILER', href: 'https://www.dfprofiler.com/' },
    ];

    const CLAN_LINKS = [
        { label: 'STORAGE / BANK', href: 'index.php?page=89' },
        { label: 'MACHINES', href: 'index.php?page=93' },
    ];

    const buildLeftButtons = (specialZone, inClan) => [
        { label: 'OUTPOST', href: 'index.php' },
        { label: 'MARKETPLACE', href: 'index.php?page=35' },
        { label: 'BANK', href: 'index.php?page=15' },
        { label: 'STORAGE', href: 'index.php?page=50' },
        ...(inClan ? [{ label: 'CLAN', href: null, hasClanDropdown: true, disabled: !specialZone }] : []),
        { label: 'THE YARD', href: 'index.php?page=24', disabled: !specialZone },
        { label: 'CRAFTING', href: 'index.php?page=59' },
        { label: 'VENDOR', href: 'index.php?page=84', disabled: !specialZone },
        { label: 'CITY', href: null, isCity: true },
    ];

    const buildRightButtons = (logoutHref) => [
        { label: 'FORUM', href: 'index.php?action=forum' },
        { label: 'WIKI', href: 'https://deadfrontier.fandom.com/wiki/Dead_Frontier_Wiki', external: true, hasDropdown: true },
        { label: '$', href: 'index.php?page=28', tooltip: 'CREDIT SHOP', icon: true },
        { label: '?', href: 'index.php?page=53', tooltip: 'HELP', icon: true },
        { label: '✕', href: logoutHref, tooltip: 'LOGOUT', icon: true, isLogout: true },
    ];

    // ─── Dropdown Builders ───────────────────────────────────────────────
    const buildDropdownPanel = (links, className, options = {}) => {
        const panel = createElement('div', { className });
        links.forEach((item, i) => {
            const attrs = { href: item.href, textContent: item.label };
            if (options.external) attrs.target = '_blank';
            const link = createElement('a', attrs);
            if (options.lastClass && i === links.length - 1) link.classList.add(options.lastClass);
            panel.appendChild(link);
        });
        return panel;
    };

    const buildClanWrap = (btn) => {
        const wrap = createElement('div', { className: 'dfbm-clan-wrap' });
        if (btn.disabled) wrap.classList.add('dfbm-clan-disabled');

        const clanBtn = makeButton(btn.label, { disabled: btn.disabled });
        const panel = buildDropdownPanel(CLAN_LINKS, 'dfbm-clan-dropdown');

        const isClanActive = CLAN_LINKS.some(item => isActive(item.href));
        if (isClanActive && !btn.disabled) clanBtn.classList.add('dfbm-clan-active');

        if (!btn.disabled) {
            clanBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                wrap.classList.toggle('dfbm-clan-open');
            });
            document.addEventListener('click', () => wrap.classList.remove('dfbm-clan-open'));
        }

        wrap.append(clanBtn, panel);
        return wrap;
    };

    const buildWikiWrap = (btn) => {
        const wrap = createElement('div', { className: 'dfbm-wiki-wrap' });

        const a = createElement('a', { href: btn.href, target: '_blank' }, [makeButton(btn.label)]);
        wrap.appendChild(a);

        const panel = buildDropdownPanel(WIKI_LINKS, 'dfbm-wiki-dropdown', {
            external: true,
            lastClass: 'dfbm-wiki-more',
        });
        wrap.appendChild(panel);

        return wrap;
    };

    // ─── City Button Handler ─────────────────────────────────────────────
    const buildCityButton = () => {
        const a = makeAnchor(null, ['dfbm-city']);
        const button = createElement('button', {}, [
            createElement('span', { textContent: 'CITY' }),
            createElement('span', { className: 'dfbm-city-arrow', textContent: '›' }),
        ]);

        button.addEventListener('click', () => {
            unsafeWindow.playSound?.('outpost');
            if (isHomePage() && unsafeWindow.doPageChange) {
                setTimeout(() => unsafeWindow.doPageChange(21, 1, false), 1000);
            } else {
                GM_setValue('dfbm_redirectToCity', true);
                setTimeout(() => { window.location.href = `${BASE_URL}index.php`; }, 1000);
            }
        });

        a.appendChild(button);
        return a;
    };

    // ─── Logout Button Handler ──────────────────
    const buildLogoutAnchor = (btn) => {
        const classes = ['dfbm-icon', 'dfbm-logout'];
        const a = makeAnchor(null, classes);
        const button = makeButton(btn.label);

        if (btn.tooltip) {
            button.title = btn.tooltip;
            a.title = btn.tooltip;
        }

        a.addEventListener('click', (e) => {
            e.preventDefault();
            if (btn.href) {
                // Clear any script-specific GM state that could interfere on next login
                GM_setValue('dfbm_redirectToCity', false);
                window.location.assign(btn.href);
            }
        });

        a.appendChild(button);
        return a;
    };

    // ─── Build Left Side ─────────────────────────────────────────────────
    const populateLeftButtons = (container, buttons) => {
        for (const btn of buttons) {
            if (btn.hasClanDropdown) {
                container.appendChild(buildClanWrap(btn));
                continue;
            }

            if (btn.isCity) {
                container.appendChild(buildCityButton());
                continue;
            }

            const classes = [];
            if (btn.disabled) classes.push('dfbm-disabled');
            if (!btn.disabled && isActive(btn.href)) classes.push('dfbm-active');

            const a = makeAnchor(btn.href, classes);
            const button = makeButton(btn.label, { disabled: btn.disabled || false });
            a.appendChild(button);
            container.appendChild(a);
        }
    };

    // ─── Build Right Side ────────────────────────────────────────────────
    const populateRightButtons = (container, buttons) => {
        for (const btn of buttons) {
            if (btn.hasDropdown) {
                container.appendChild(buildWikiWrap(btn));
                continue;
            }

            if (btn.isLogout) {
                container.appendChild(buildLogoutAnchor(btn));
                continue;
            }

            const classes = [];
            if (btn.icon) classes.push('dfbm-icon');
            if (isActive(btn.href)) classes.push('dfbm-active');

            const a = makeAnchor(btn.href, classes, btn.external);
            const button = makeButton(btn.label);

            if (btn.tooltip) {
                button.title = btn.tooltip;
                a.title = btn.tooltip;
            }

            a.appendChild(button);
            container.appendChild(a);
        }
    };

    // ─── Post-insert DOM adjustments ─────────────────────────────────────
    const hideOriginalNav = (navEl) => {
        navEl.style.cssText = [
            'display:none !important',
            'visibility:hidden !important',
            'opacity:0 !important',
            'height:0 !important',
            'overflow:hidden !important',
            'position:absolute !important',
            'pointer-events:none !important',
        ].join(';');

        const navParent = navEl.parentNode;
        if (navParent && navParent.id !== 'sidebar' && navParent.tagName !== 'BODY') {
            navParent.style.overflow = 'visible';
        }
    };

    const fixOverflowAncestors = (startEl) => {
        let el = startEl;
        while (el && el !== document.body) {
            const { overflow, overflowX, overflowY } = window.getComputedStyle(el);
            if ([overflow, overflowX, overflowY].includes('hidden')) {
                el.style.overflow = 'visible';
            }
            el = el.parentElement;
        }
    };

    const injectPermanentHideStyle = () => {
        const style = createElement('style', {
            textContent: `
                #outpostnavigationheaders, #outpostnavigationheaders * {
                    display: none !important;
                    visibility: hidden !important;
                    height: 0 !important;
                    overflow: hidden !important;
                }
            `,
        });
        document.head.appendChild(style);
    };

    const replaceBackground = (selector, url) => {
        const el = document.querySelector(selector);
        if (!el) return;
        el.setAttribute('background', url);
        el.style.backgroundImage = `url("${url}")`;
    };

    // ─── City Redirect on Load ───────────────────────────────────────────
    const handleCityRedirect = () => {
        if (!GM_getValue('dfbm_redirectToCity', false) || !isHomePage()) return;

        GM_setValue('dfbm_redirectToCity', false);
        const interval = setInterval(() => {
            if (unsafeWindow.doPageChange) {
                clearInterval(interval);
                unsafeWindow.doPageChange(21, 1, false);
            }
        }, 200);
    };

    // ─── Clan Button Sync (add or remove based on fresh data) ──────────
    const syncClanButton = (clanChanged) => {
        const leftDiv = document.getElementById('dfbm-left');
        if (!leftDiv) return;

        const existingWrap = leftDiv.querySelector('.dfbm-clan-wrap');

        // If clan data didn't change and button is already correct, do nothing
        if (!clanChanged && existingWrap && hasClan()) return;
        if (!clanChanged && !existingWrap && !hasClan()) return;

        // Remove stale button if present
        if (existingWrap) existingWrap.remove();

        // Add button if currently in a clan
        if (!hasClan()) return;

        // Clan is disabled when NOT in a special zone (same as THE YARD / VENDOR)
        const tradeZone = GM_getValue('tradeZone', null);
        const clanDisabled = !isSpecialZone(tradeZone);

        const storageBtn = [...leftDiv.querySelectorAll('.dfbm-btn')]
            .find(b => b.querySelector('button')?.textContent === 'STORAGE');

        const wrap = buildClanWrap({ label: 'CLAN', disabled: clanDisabled });

        if (storageBtn) storageBtn.after(wrap);
        else leftDiv.appendChild(wrap);
    };

    // ─── CSS ─────────────────────────────────────────────────────────────
    const STYLES = `
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

        /* ── Base button ── */
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
        .dfbm-wiki-wrap > a > button,
        .dfbm-clan-wrap > button {
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

        .dfbm-btn button::before,
        .dfbm-wiki-wrap > a > button::before,
        .dfbm-clan-wrap > button::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0;
            height: 40%;
            background: linear-gradient(180deg, rgba(180,70,0,0.08), transparent);
            pointer-events: none;
        }

        .dfbm-btn button:hover,
        .dfbm-wiki-wrap:hover > a > button,
        .dfbm-wiki-wrap > a > button:hover,
        .dfbm-clan-wrap > button:hover,
        .dfbm-clan-wrap.dfbm-clan-open > button {
            background: linear-gradient(180deg, #3d1500 0%, #2a0d00 50%, #320f00 100%);
            border-color: #8a3000;
            border-top-color: #aa4500;
            color: #e87030;
            text-shadow: 0 0 12px rgba(255,120,0,0.8), 1px 1px 2px rgba(0,0,0,0.9);
            box-shadow: inset 0 1px 0 rgba(200,80,0,0.3), inset 0 -1px 0 rgba(0,0,0,0.4), 0 1px 6px rgba(150,50,0,0.4);
        }

        .dfbm-btn.dfbm-active button,
        .dfbm-clan-wrap > button.dfbm-clan-active {
            background: linear-gradient(180deg, #4a1a00 0%, #3a1200 50%, #420f00 100%);
            border-color: #aa4500;
            border-top-color: #cc5500;
            color: #ff8c40;
            text-shadow: 0 0 10px rgba(255,140,50,0.9), 1px 1px 2px rgba(0,0,0,0.8);
            box-shadow: inset 0 1px 0 rgba(220,100,0,0.4), inset 0 -1px 0 rgba(0,0,0,0.5), 0 0 8px rgba(180,70,0,0.3);
        }

        /* ── Disabled state ── */
        .dfbm-btn.dfbm-disabled button,
        .dfbm-clan-wrap.dfbm-clan-disabled > button {
            opacity: 0.35;
            cursor: not-allowed;
            color: #5a2a10;
            text-shadow: none;
        }

        .dfbm-btn.dfbm-disabled button:hover,
        .dfbm-clan-wrap.dfbm-clan-disabled > button:hover {
            background: linear-gradient(180deg, #2a0e00 0%, #1a0800 50%, #200b00 100%) !important;
            border-color: #4a1500 !important;
            color: #5a2a10 !important;
            text-shadow: none !important;
            box-shadow: inset 0 1px 0 rgba(150,60,0,0.2), inset 0 -1px 0 rgba(0,0,0,0.4), 0 1px 3px rgba(0,0,0,0.6) !important;
        }

        /* ── Icon buttons ── */
        .dfbm-btn.dfbm-icon button {
            min-width: 26px;
            width: 26px;
            padding: 0;
            font-size: 13px;
            font-weight: 900;
            letter-spacing: 0;
        }

        /* ── City button ── */
        .dfbm-btn.dfbm-city button {
            min-width: 52px;
            color: #af9b6d;
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

        /* ── Logout button ── */
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

        /* ── Wiki dropdown ── */
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

        .dfbm-wiki-wrap > a > button::after {
            content: '▾';
            font-size: 8px;
            margin-left: 3px;
            opacity: 0.6;
            vertical-align: middle;
        }

        .dfbm-wiki-dropdown,
        .dfbm-clan-dropdown {
            display: none;
            position: absolute;
            top: 100%;
            min-width: 110px;
            background: linear-gradient(180deg, #1e0b00 0%, #110600 100%);
            border: 1px solid #5a1a00;
            border-top: none;
            box-shadow: 0 6px 20px rgba(0,0,0,0.9), inset 1px 0 0 rgba(100,40,0,0.2), inset -1px 0 0 rgba(100,40,0,0.2);
            z-index: 9999;
            flex-direction: column;
            overflow: hidden;
        }

        .dfbm-wiki-dropdown { right: 0; }
        .dfbm-clan-dropdown { left: 0; min-width: 130px; }

        .dfbm-wiki-dropdown::before,
        .dfbm-clan-dropdown::before {
            content: '';
            display: block;
            height: 1px;
            background: linear-gradient(90deg, transparent, #8a3000, transparent);
            margin: 0 8px;
        }

        .dfbm-wiki-wrap:hover .dfbm-wiki-dropdown { display: flex; }

        .dfbm-clan-wrap.dfbm-clan-open .dfbm-clan-dropdown,
        .dfbm-clan-wrap:hover .dfbm-clan-dropdown { display: flex; }

        .dfbm-clan-wrap.dfbm-clan-disabled .dfbm-clan-dropdown { display: none !important; }

        /* ── Dropdown links (shared) ── */
        .dfbm-wiki-dropdown a,
        .dfbm-clan-dropdown a {
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

        .dfbm-wiki-dropdown a:last-child,
        .dfbm-clan-dropdown a:last-child { border-bottom: none; }

        .dfbm-wiki-dropdown a::before,
        .dfbm-clan-dropdown a::before {
            content: '';
            position: absolute;
            left: 0; top: 0; bottom: 0;
            width: 2px;
            background: #7a2800;
            opacity: 0;
            transition: opacity 0.1s ease;
        }

        .dfbm-wiki-dropdown a:hover,
        .dfbm-clan-dropdown a:hover {
            background: linear-gradient(90deg, rgba(60,20,0,0.8), rgba(40,12,0,0.4));
            color: #e07030;
            text-shadow: 0 0 10px rgba(220,100,0,0.7), 1px 1px 2px rgba(0,0,0,0.9);
            padding-left: 15px;
        }

        .dfbm-wiki-dropdown a:hover::before,
        .dfbm-clan-dropdown a:hover::before { opacity: 1; }

        .dfbm-wiki-dropdown a.dfbm-wiki-more {
            color: #8a1a1a;
            font-style: italic;
        }

        .dfbm-wiki-dropdown a.dfbm-wiki-more:hover { color: #cc5020; }

        /* ── Clan wrap ── */
        .dfbm-clan-wrap {
            position: relative;
            display: inline-flex;
            margin: 4px 1px;
            flex-shrink: 0;
        }

        .dfbm-clan-wrap > button::after {
            content: '▾';
            font-size: 8px;
            margin-left: 3px;
            opacity: 0.6;
            vertical-align: middle;
        }
    `;

    // ─── Main Init ───────────────────────────────────────────────────────
    const init = () => {
        if (!document.getElementById('sidebar')) return;

        // Don't run full init on login/logout pages to prevent any loop
        if (isLoginPage()) return;

        // Load cached clan data so the button appears instantly
        loadCachedClan();

        const tradeZone = resolveTradeZone();
        const specialZone = isSpecialZone(tradeZone);
        const inClan = hasClan();
        const logoutHref = extractLogoutHref();

        const leftButtons = buildLeftButtons(specialZone, inClan);
        const rightButtons = buildRightButtons(logoutHref);

        // Inject styles
        document.head.appendChild(createElement('style', { textContent: STYLES }));

        // Build bar
        const bar = createElement('div', { id: 'dfbm-bar' });
        const leftDiv = createElement('div', { id: 'dfbm-left' });
        const rightDiv = createElement('div', { id: 'dfbm-right' });

        populateLeftButtons(leftDiv, leftButtons);
        populateRightButtons(rightDiv, rightButtons);

        bar.append(leftDiv, rightDiv);

        // Insert bar & hide original nav
        const navEl = document.getElementById('outpostnavigationheaders');
        if (navEl) {
            hideOriginalNav(navEl);
            navEl.parentNode.insertBefore(bar, navEl);
        }

        fixOverflowAncestors(document.getElementById('dfbm-bar')?.parentElement);
        injectPermanentHideStyle();

        // City redirect
        handleCityRedirect();

        // Custom header images
        replaceBackground(
            'td[width="985"].design2010[background*="header.jpg"]',
            'https://i.ibb.co/1t6d7WZv/header.jpg'
        );
        replaceBackground(
            'td[width="911"].design2010[background*="menu_bottom.jpg"]',
            'https://i.ibb.co/wFLgpdbr/menu-bottom.jpg'
        );
    };

    // ─── Bootstrap ───────────────────────────────────────────────────────
    const waitForElement = (selector, timeout = 5000) => new Promise((resolve, reject) => {
        const existing = document.querySelector(selector);
        if (existing) return resolve(existing);

        const observer = new MutationObserver(() => {
            const el = document.querySelector(selector);
            if (el) {
                observer.disconnect();
                resolve(el);
            }
        });

        observer.observe(document.documentElement, { childList: true, subtree: true });

        setTimeout(() => {
            observer.disconnect();
            reject(new Error(`[DFBM] Timeout: "${selector}" not found after ${timeout}ms`));
        }, timeout);
    });

    document.addEventListener('DOMContentLoaded', async () => {
        try {
            // Wait for both key elements before initializing
            await Promise.all([
                waitForElement('#sidebar'),
                waitForElement('#outpostnavigationheaders'),
            ]);
            init();

            // Background refresh: fetch fresh clan data and sync UI if changed
            const clanChanged = await fetchClanData();
            syncClanButton(clanChanged);
        } catch (err) {
            console.warn(err.message);
            // Still try init even if one element times out (e.g. login page has no nav)
            init();
        }
    });


})();
