// TBC.TXT - Main Application JavaScript

console.log('[TBC.TXT] Script loaded - v3');
// ===== GLOBAL DATA (loaded from JSON) =====
// API base URL - use local server in dev, production API otherwise
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8080'
    : 'https://api.tbctxt.io';

let itemIds = {};
let classData = {};
let recipesData = {};
let raidsData = {};
let collectionsData = {};
let attunementsData = {};
let heroicsData = {};
let factionsData = {};
let lockoutsData = {};
let enchantSpellIds = {};
let talentSpellIds = {};
let questIds = {};
let itemStats = {}; // Pre-computed item stats from Wowhead

// Auth state
let currentUser = null; // { battletag, token } or null
let serverProgress = null; // Progress from server when logged in
const AUTH_STORAGE_KEY = 'tbctxt_auth';

// Auth functions
function checkAuthStatus() {
    // Check localStorage for saved auth
    const saved = localStorage.getItem(AUTH_STORAGE_KEY);
    if (saved) {
        try {
            currentUser = JSON.parse(saved);
        } catch (e) {
            localStorage.removeItem(AUTH_STORAGE_KEY);
            currentUser = null;
        }
    } else {
        currentUser = null;
    }
    updateAuthUI();
    if (currentUser) loadServerProgress();
}

function handleAuthCallback() {
    // Check for auth token in URL (from OAuth callback)
    const params = new URLSearchParams(window.location.search);
    const token = params.get('auth_token');
    const battletag = params.get('battletag');
    if (token && battletag) {
        currentUser = { battletag: decodeURIComponent(battletag), token };
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(currentUser));
        // Clean URL
        history.replaceState(null, '', window.location.pathname + window.location.hash);
        updateAuthUI();
        loadServerProgress();
    }
}

function logout() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    currentUser = null;
    updateAuthUI();
}

function updateAuthUI() {
    const headerAuth = document.getElementById('header-auth');
    if (!headerAuth) return;

    if (currentUser) {
        headerAuth.innerHTML = `
            <span class="inline-flex items-center px-3 py-1.5 border md:text-[11px] sm:text-[10px]" style="color: #00AEFF; border-color: #00AEFF;">
                <span class="text-xs">${currentUser.battletag}</span>
                <a href="#" onclick="logout(); return false;" class="ml-2 text-[10px] text-terminal-dim hover:text-terminal-text transition-colors">[ LOGOUT ]</a>
            </span>
        `;
    } else {
        headerAuth.innerHTML = `
            <a href="${API_BASE_URL}/api/auth/login" class="text-xs px-3 py-1.5 border transition-colors md:text-[11px] sm:text-[10px]" style="color: #00AEFF; border-color: #00AEFF;" onmouseover="this.style.backgroundColor='#00AEFF'; this.style.color='#222222';" onmouseout="this.style.backgroundColor='transparent'; this.style.color='#00AEFF';">[ LOGIN ]</a>
        `;
    }
}

async function loadServerProgress() {
    if (!currentUser || !currentUser.token) return;
    try {
        const res = await fetch(`${API_BASE_URL}/api/progress`, {
            headers: { 'Authorization': `Bearer ${currentUser.token}` }
        });
        if (res.ok) {
            serverProgress = await res.json();
            // Merge server progress with local storage (server wins on conflict)
            if (serverProgress.attunements) {
                localStorage.setItem(ATTUNEMENT_STORAGE_KEY, JSON.stringify(serverProgress.attunements));
            }
            console.log('Loaded progress from server:', serverProgress);
        }
    } catch (e) {
        console.error('Failed to load server progress:', e);
    }
}

async function saveProgressToServer() {
    if (!currentUser || !currentUser.token) return;
    try {
        const attunements = loadAttunementProgress();
        await fetch(`${API_BASE_URL}/api/progress`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentUser.token}`
            },
            body: JSON.stringify({ attunements })
        });
        console.log('Progress saved to server');
    } catch (e) {
        console.error('Failed to save to server:', e);
    }
}
let currentClass = 'warrior';
let currentSpec = null;
let currentPhase = 4;
let currentRaid = 'karazhan';
let currentRaidPhase = 'phase1';
let currentProfession = 'blacksmithing';
let currentAttunement = 'karazhan';
const FADE_TRANSITION_MS = 200;
const ATTUNEMENT_STORAGE_KEY = 'tbctxt_attunements';
const BIS_STORAGE_KEY = 'tbctxt_bis';
const REP_STORAGE_KEY = 'tbctxt_reputation';
const LOCKOUT_STORAGE_KEY = 'tbctxt_lockouts';
const GUILD_PROGRESS_KEY = 'tbctxt_guild_progress';
function showLoading() {
    document.getElementById('main-content').innerHTML = `
        <div class="text-terminal-dim text-center py-10">
            <div class="text-terminal-accent mb-2">[ LOADING DATA... ]</div>
            <div class="text-xs">Fetching class data, items, and raid info</div>
        </div>
    `;
}
async function loadAllData() {
    showLoading();
    async function fetchJSON(url) {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
        return res.json();
    }
    try {
        const [items, classes, recipes, raids, reference, stats, collections, attunements, heroics, factions, lockouts] = await Promise.all([
            fetchJSON('data/itemIds.json'),
            fetchJSON('data/classData.json'),
            fetchJSON('data/recipesData.json'),
            fetchJSON('data/raidsData.json'),
            fetchJSON('data/referenceData.json'),
            fetchJSON('data/itemStats.json'),
            fetchJSON('data/collectionsData.json'),
            fetchJSON('data/attunementsData.json'),
            fetchJSON('data/heroicsData.json'),
            fetchJSON('data/factionsData.json'),
            fetchJSON('data/lockoutsData.json')
        ]);
        itemIds = items;
        classData = classes;
        recipesData = recipes;
        raidsData = raids;
        collectionsData = collections;
        attunementsData = attunements;
        heroicsData = heroics;
        factionsData = factions;
        lockoutsData = lockouts;
        enchantSpellIds = reference.enchantSpellIds;
        talentSpellIds = reference.talentSpellIds;
        questIds = reference.questIds;
        itemStats = stats;
        console.log('Data loaded:', {
            items: Object.keys(itemIds).length,
            classes: Object.keys(classData).length,
            professions: Object.keys(recipesData).length,
            raidPhases: Object.keys(raidsData).length,
            itemStats: Object.keys(itemStats).length,
            heroicZones: Object.keys(heroicsData).length,
            factions: factionsData.factions?.length || 0
        });
        // Initialize the app
        initClassSelector();
        if (!window.location.hash) renderClassContent('warrior');
    } catch (error) {
        console.error('Failed to load data:', error);
        document.getElementById('main-content').innerHTML = `
            <div class="text-red-400 text-center py-10">
                <div class="mb-2">[ ERROR LOADING DATA ]</div>
                <div class="text-xs text-terminal-dim">${error.message}</div>
                <div class="text-xs text-terminal-dim mt-2">Check browser console for details (F12)</div>
            </div>
        `;
    }
}
function stripPriorityLabel(itemName) {
    return itemName.replace(/\s*\((BEST|RECOMMENDED|GOOD|OPTION|ALTERNATIVE|EASY|HARD)\)\s*$/i, '').trim();
}
function getPriorityLabel(itemName) {
    const match = itemName.match(/\((BEST|RECOMMENDED|GOOD|OPTION|ALTERNATIVE|EASY|HARD)\)\s*$/i);
    return match ? match[1].toUpperCase() : null;
}
function getPriorityBadge(label) {
    if (!label) return '';
    const badgeMap = {
        'BEST': { text: 'PRIORITY', class: 'text-red-400' },
        'RECOMMENDED': { text: 'GOOD', class: 'text-yellow-400' },
        'GOOD': { text: 'GOOD', class: 'text-yellow-400' },
        'OPTION': { text: 'OPTIONAL', class: 'text-green-400' },
        'ALTERNATIVE': { text: 'OPTIONAL', class: 'text-green-400' },
        'EASY': { text: 'EASY', class: 'text-blue-400' },
        'HARD': { text: 'HARD', class: 'text-purple-400' }
    };
    const badge = badgeMap[label];
    if (!badge) return '';
    return `<span class="ml-2 text-[10px] font-semibold ${badge.class}">[${badge.text}]</span>`;
}
function getItemId(itemName) {
    const cleanName = stripPriorityLabel(itemName);
    return itemIds[cleanName.toLowerCase()] || null;
}
function getItemQuality(itemName) {
    const cleanName = stripPriorityLabel(itemName);
    const name = cleanName.toLowerCase();
    // Legendary items
    const legendaryItems = ['warglaive of azzinoth', 'thori\'al', 'sulfuras'];
    if (legendaryItems.some(leg => name.includes(leg))) return 'legendary';
    // Rare (blue) items - mostly pre-raid dungeon drops, badges, some crafted
    const rareKeywords = [
        'badge of justice',
        'badge of tenacity',
        'vindicator\'s',
        'stalker\'s',
        'savage',
        'general\'s',
        'marshal\'s',
        'lieutenant commander\'s',
        'champion\'s',
        'centurion\'s',
        'wastewalker',
        'overlord\'s',
        'doomplate',
        'adamantine',
        'natasha\'s',
        'bloodlust brooch',
        'choker of vile intent',
        'continuum blade',
        'starlight gauntlets',
        'idol of the wild',
        'midnight legguards',
        'clefthoof',
        'flesh handler\'s',
        'deathforge',
        'girdle of the deathdealer',
        'scaled greaves',
        'terokk\'s',
        'boots of righteous fortitude',
        'ring of cryptic dreams',
        'ashyen\'s',
        'andormu\'s',
        'shatter-bound',
        'time-shifted',
        'phoenix-wing'
    ];
    // Check if it's a known epic crafted item
    const epicCraftedKeywords = [
        'primalstrike',
        'earthwarden',
        'lionheart',
        'black felsteel',
        'fel leather',
        'windhawk',
        'ragesteel',
        'khorium',
        'felfury',
        'twisting nether',
        'battlecast',
        'spellstrike',
        'whitemend',
        'primal mooncloth'
    ];
    if (epicCraftedKeywords.some(keyword => name.includes(keyword))) return 'epic';
    if (rareKeywords.some(keyword => name.includes(keyword))) return 'rare';
    // Default to epic for raid items
    return 'epic';
}
function processItemLinks() {
    if (typeof $WowheadPower !== 'undefined') {
        $WowheadPower.refreshLinks();
    }
}
// Helper function to generate item cell HTML (reduces duplication)
// Spell IDs for enchants (TBC wowhead uses spells, not items for enchants)
function getEnchantSpellId(itemName) {
    const cleanName = stripPriorityLabel(itemName).toLowerCase();
    return enchantSpellIds[cleanName] || null;
}
function getTalentSpellId(talentName) {
    const cleanName = talentName.toLowerCase().trim().replace(/\\'/g, "'");
    return talentSpellIds[cleanName] || null;
}
function getQuestId(questName) {
    const cleanName = questName.toLowerCase().trim().replace(/\\'/g, "'");
    return questIds[cleanName] || null;
}
function getQuestId(questName) {
    const cleanName = questName.toLowerCase().trim().replace(/\\'/g, "'");
    return questIds[cleanName] || null;
}
function getTalentSpellId(talentName) {
    // Handle escaped apostrophes from the data (e.g., "Nature\'s Grace" -> "nature's grace")
    const cleanName = talentName.toLowerCase().trim().replace(/\\'/g, "'");
    return talentSpellIds[cleanName] || null;
}
function getEnchantSpellId(itemName) {
    const cleanName = stripPriorityLabel(itemName).toLowerCase();
    return enchantSpellIds[cleanName] || null;
}
function generateItemCell(itemName) {
    if (itemName.includes(' / ')) {
        return itemName.split(' / ').map(item => {
            const trimmedItem = item.trim();
            const quality = getItemQuality(trimmedItem);
            const displayName = stripPriorityLabel(trimmedItem);
            const priorityLabel = getPriorityLabel(trimmedItem);
            const priorityBadge = (currentPhase === 0) ? getPriorityBadge(priorityLabel) : '';
            const itemId = getItemId(trimmedItem);
            const spellId = getEnchantSpellId(trimmedItem);
            // Use spell ID for enchants, item ID for items, otherwise plain text
            let link;
            if (spellId) {
                link = `<a href="https://tbc.wowhead.com/spell=${spellId}" data-wowhead="spell=${spellId}">${displayName}</a>`;
            } else if (itemId) {
                link = `<a href="https://tbc.wowhead.com/item=${itemId}" data-wowhead="item=${itemId}">${displayName}</a>`;
            } else {
                link = displayName;
            }
            return `<span class="item-quality-${quality}">${link}${priorityBadge}</span>`;
        }).join(' / ');
    }
    const quality = getItemQuality(itemName);
    const displayName = stripPriorityLabel(itemName);
    const priorityLabel = getPriorityLabel(itemName);
    const priorityBadge = (currentPhase === 0) ? getPriorityBadge(priorityLabel) : '';
    const itemId = getItemId(itemName);
    const spellId = getEnchantSpellId(itemName);
    // Use spell ID for enchants, item ID for items, otherwise plain text
    let link;
    if (spellId) {
        link = `<a href="https://tbc.wowhead.com/spell=${spellId}" data-wowhead="spell=${spellId}">${displayName}</a>`;
    } else if (itemId) {
        link = `<a href="https://tbc.wowhead.com/item=${itemId}" data-wowhead="item=${itemId}">${displayName}</a>`;
    } else {
        link = displayName;
    }
    return `<span class="item-quality-${quality}">${link}${priorityBadge}</span>`;
}
// Helper function to process source text and create wowhead NPC/quest links
function generateSourceCell(source) {
    // NPC map for boss linking
    const npcMap = {
        // Karazhan
        'Attumen the Huntsman': 16151, 'Moroes': 15687, 'Maiden of Virtue': 16457,
        'Opera Event': 0, 'The Curator': 15691, 'Shade of Aran': 16524,
        'Terestian Illhoof': 15688, 'Netherspite': 15689, 'Chess Event': 0,
        'Prince Malchezaar': 15690, 'Nightbane': 17225,
        // Gruul's Lair
        'High King Maulgar': 18831, 'Gruul the Dragonkiller': 19044,
        // Magtheridon's Lair
        'Magtheridon': 17257,
        // Serpentshrine Cavern
        'Hydross the Unstable': 21216, 'The Lurker Below': 21217,
        'Leotheras the Blind': 21215, 'Fathom-Lord Karathress': 21214,
        'Morogrim Tidewalker': 21213, 'Lady Vashj': 21212,
        // Tempest Keep
        'Al\'ar': 19514, 'Void Reaver': 19516, 'High Astromancer Solarian': 18805,
        'Kael\'thas Sunstrider': 19622,
        // Hyjal Summit
        'Rage Winterchill': 17767, 'Anetheron': 17808, 'Kaz\'rogal': 17888,
        'Azgalor': 17842, 'Archimonde': 17968,
        // Black Temple
        'High Warlord Naj\'entus': 22887, 'Supremus': 22898,
        'Shade of Akama': 22841, 'Teron Gorefiend': 22871,
        'Gurtogg Bloodboil': 22948, 'Reliquary of Souls': 22856,
        'Mother Shahraz': 22947, 'Illidari Council': 23426, 'The Illidari Council': 23426,
        'Illidan Stormrage': 22917,
        // Zul'Aman
        'Akil\'zon': 23574, 'Nalorakk': 23576, 'Jan\'alai': 23578,
        'Halazzi': 23577, 'Hex Lord Malacrass': 24239, 'Zul\'jin': 23863,
        // World Bosses
        'Doom-Lord Kazzak': 18728, 'Doomwalker': 17711,
        // Sunwell Plateau
        'Kalecgos': 24850, 'Brutallus': 24882, 'Felmyst': 25038,
        'Eredar Twins': 25166, 'M\'uru': 25741, 'Kil\'jaeden': 25315,
        // Dungeon Bosses
        'Epoch Hunter': 18096, 'Quagmirran': 17942, 'The Black Stalker': 17882,
        'Avatar of the Martyred': 18478, 'Exarch Maladaar': 18373,
        'Talon King Ikiss': 18473, 'Harbinger Skyriss': 20912,
        'Warp Splinter': 17977, 'Aeonus': 17881, 'Blackheart the Inciter': 18667,
        'Temporus': 17880, 'Warlord Kalithresh': 17798, 'Keli\'dan the Breaker': 17377,
        'Warchief Kargath Bladefist': 16808, 'Pathaleon the Calculator': 19220,
        'Pandemonius': 18341, 'Tavarok': 18343, 'Ambassador Hellmaw': 18731,
        'Murmur': 18708, 'Shirrak the Dead Watcher': 18371, 'Broggok': 17380,
        'Vazruden': 17537, 'Vazruden the Herald': 17537, 'Priestess Delrissa': 24560,
        'Chrono Lord Deja': 17879, 'Omor the Unscarred': 17308,
        'Commander Sarannis': 17976, 'Nexus-Prince Shaffar': 18344,
        'Captain Skarloc': 17862, 'Rokmar the Crackler': 17991,
        'Warbringer O\'mrogg': 16809, 'Terokk': 21838, 'Yor': 22930,
        'Dalliah the Doomsayer': 20885, 'Laj': 17980,
        'Nethermancer Sepethrea': 19221, 'High Botanist Freywinn': 17975,
        'Gezzarak the Huntress': 23163,
        // More dungeon bosses
        'Hungerfen': 17770, 'Ghaz\'an': 18105, 'Anzu': 23035,
        'Lieutenant Drake': 17848, 'Mechano-Lord Capacitus': 19219,
        'Mekgineer Steamrigger': 17796, 'Mennu the Betrayer': 17941,
        'Grand Warlock Nethekurse': 16807, 'Grandmaster Vorpil': 18732,
        'Darkweaver Syth': 18472, 'Zereketh the Unbound': 20870,
        'Selin Fireheart': 24723, 'The Maker': 17381,
        'Wrath-Scryer Soccothrates': 20886,
        // World bosses / rare spawns
        'Gurok the Usurper': 18062, 'Ar\'kelos the Guardian': 20798,
        'Gava\'xi': 18298, 'Coren Direbrew': 23872,
        // Classic raids (for references)
        'C\'Thun': 15727, 'Emperor Vek\'nilash': 15275, 'Nefarian': 11583,
        'Sapphiron': 15989, 'Kel\'Thuzad': 15990,
        // Naxxramas
        'Patchwerk': 16028, 'Grobbulus': 15931, 'Gluth': 15932,
        // Karazhan extras
        'Echo of Medivh': 16816, 'Curator': 15691,
        // Vendors
        'G\'eras': 19321
    };
    // Patterns for non-boss sources (don't need NPC linking)
    const professionSources = ['Blacksmithing', 'Leatherworking', 'Tailoring', 'Jewelcrafting', 'Engineering', 'Alchemy'];
    const pvpSources = ['Honor', 'Honor Points', 'Arena', 'Arena Points'];
    const otherSources = ['BoE World Drop', 'BoE', 'World Drop', 'Crafted', 'N/A', 'Various', 'Vendor', 'PvP'];
    // Extract display text - strip zone/instance info from "Boss - Zone" format
    let displayText = source;
    let bossName = null;
    let questName = null;
    // Pattern: "Boss - Zone" or "Boss— Zone" or "Boss - (H) Zone" -> extract just the boss name
    // Handles both hyphens (-) and em-dashes (—)
    const bossZoneMatch = source.match(/^(.+?)\s*[-—]\s*\(?H?\)?\s*(Karazhan|Gruul's Lair|Magtheridon's Lair|Serpentshrine Cavern|Tempest Keep|Hyjal Summit|Black Temple|Zul'Aman|Sunwell Plateau|The Blood Furnace|Blood Furnace|The Slave Pens|Slave Pens|The Underbog|Underbog|The Steamvault|Steamvault|The Botanica|Botanica|The Mechanar|Mechanar|The Arcatraz|Arcatraz|Shadow Labyrinth|Sethekk Halls|Auchenai Crypts|Auchindoun|Mana.?Tombs|Old Hillsbrad Foothills|The Black Morass|Black Morass|The Shattered Halls|Shattered Halls|Hellfire Ramparts|Ramparts|Magister's Terrace|Magisters' Terrace|Terokkar Forest|Netherstorm|Nagrand|Naxxramas|Caverns of Time|Blades? Edge Mountains|Shadowmoon Valley|Hellfire Peninsula|Tanaris|AQ40|Blackwing Lair|Stratholme|Blackrock Depths|World Boss)$/i);
    if (bossZoneMatch) {
        displayText = bossZoneMatch[1].trim();
        bossName = displayText;
    }
    // Pattern: "(H)Boss-Zone" or "(H) Boss - Zone" or "Boss— HeroicZone" or "Bossin HeroicZone" for heroic dungeons
    const heroicMatch = source.match(/^\(H\)\s*(.+?)[-–—]\s*(.+)$/) ||
                        source.match(/^(.+?)[-—]\s*[Hh]eroic\s*(.+)$/) ||
                        source.match(/^(.+?)in\s*[Hh]eroic(.+)$/);
    if (heroicMatch) {
        displayText = heroicMatch[1].trim();
        bossName = displayText;
    }
    // Pattern: "Boss—Zone" or "Boss-Zone" (no space) for dungeons -> extract boss name
    const bossZoneNoSpaceMatch = source.match(/^([A-Z][^-—]+)[-—]([A-Z].+)$/);
    if (!bossName && bossZoneNoSpaceMatch && !source.includes(' - ') && !source.includes(' — ')) {
        const potentialBoss = bossZoneNoSpaceMatch[1].trim();
        if (npcMap[potentialBoss] || npcMap[potentialBoss.replace(/'/g, "\\'")] ) {
            displayText = potentialBoss;
            bossName = potentialBoss;
        }
    }
    // Pattern: "Boss1,Boss2, orBoss3—Zone" -> extract first boss name
    // Also handles case where bossZoneMatch succeeded but gave us multiple bosses
    if (bossName && bossName.includes(',')) {
        const firstBoss = bossName.split(',')[0].trim();
        if (npcMap[firstBoss]) {
            displayText = firstBoss;
            bossName = firstBoss;
        }
    }
    const multiBossMatch = source.match(/^([A-Z][^,]+),.*[-—](.+)$/);
    if (!bossName && multiBossMatch) {
        const firstBoss = multiBossMatch[1].trim();
        if (npcMap[firstBoss]) {
            displayText = firstBoss;
            bossName = firstBoss;
        }
    }
    // Pattern: Any source containing "Badge of Justice" with a number -> show badge count
    const badgeMatch = source.match(/(\d+)\s*x?\s*-?\s*Badge[s]?\s*(of\s*Justice)?/i);
    if (badgeMatch || source.toLowerCase().includes('badge of justice')) {
        const count = badgeMatch ? badgeMatch[1] : '';
        const displayText = count ? `${count} Badges` : 'Badge Vendor';
        return `<a href="https://tbc.wowhead.com/item=29434" data-wowhead="item=29434" class="underline hover:text-terminal-text">${displayText}</a>`;
    }
    // Pattern: "Justice Vendor" -> badge vendor
    if (source.toLowerCase().includes('justice vendor')) {
        const countMatch = source.match(/(\d+)/);
        const count = countMatch ? countMatch[1] : '';
        const displayText = count ? `${count} Badges` : 'Badge Vendor';
        return `<a href="https://tbc.wowhead.com/item=29434" data-wowhead="item=29434" class="underline hover:text-terminal-text">${displayText}</a>`;
    }
    // Pattern: "G'eras- X xBadge" -> show badge count
    const gerasBadgeMatch = source.match(/G'eras\s*-?\s*(\d+)\s*x?\s*Badge/i);
    if (gerasBadgeMatch) {
        return `<a href="https://tbc.wowhead.com/item=29434" data-wowhead="item=29434" class="underline hover:text-terminal-text">${gerasBadgeMatch[1]} Badges</a>`;
    }
    // Pattern: "Exalted - Faction" or "Faction - Exalted/Revered/Honored" (handles both - and —)
    const repMatch = source.match(/^(Exalted|Revered|Honored|Friendly)\s*[-—]\s*(.+)$/i) || source.match(/^(.+?)\s*[-—]\s*(Exalted|Revered|Honored|Friendly)$/i);
    if (repMatch) {
        const faction = repMatch[1].match(/Exalted|Revered|Honored|Friendly/i) ? repMatch[2] : repMatch[1];
        const standing = repMatch[1].match(/Exalted|Revered|Honored|Friendly/i) ? repMatch[1] : repMatch[2];
        return `${faction} (${standing})`;
    }
    // Pattern: "The Aldor- Revered" etc (handles both - and —)
    const factionRepMatch = source.match(/^(The Aldor|The Scryers|Lower City|Keepers of Time|The Sha'tar|Cenarion Expedition|Honor Hold|Thrallmar|The Violet Eye|The Scale of the Sands|Ashtongue Deathsworn|The Consortium|Kurenai|The Mag'har)\s*[-—]?\s*(Exalted|Revered|Honored|Friendly)$/i);
    if (factionRepMatch) {
        return `${factionRepMatch[1]} (${factionRepMatch[2]})`;
    }
    // Profession sources - just return the profession name (no link)
    // Handles: "Blacksmithing", "Spellfire Tailoring", "Mooncloth Tailoring", etc.
    const professionMatch = professionSources.find(p => source.toLowerCase().includes(p.toLowerCase()));
    if (professionMatch) {
        // Handle profession specializations: "Spellfire Tailoring", "Mooncloth Tailoring", etc.
        // Also handle "Item—Tailoring" format
        const cleanSource = source.split('—')[0].trim();
        return cleanSource;
    }
    // PvP sources
    if (pvpSources.some(p => source.toLowerCase() === p.toLowerCase() || source.toLowerCase().includes(p.toLowerCase()))) {
        return source;
    }
    // Other simple sources
    if (otherSources.some(o => source.toLowerCase().includes(o.toLowerCase()))) {
        return source;
    }
    // Pattern: "Trash Mobs in - Zone" or "Trash mobs in - Zone"
    const trashMatch = source.match(/Trash\s*[Mm]obs?\s*in\s*-?\s*(.+)/i);
    if (trashMatch) {
        return `Trash (${trashMatch[1]})`;
    }
    // Pattern: "Xrd Timed Chest - Zul'Aman"
    const timedChestMatch = source.match(/(\d+\w*)\s*Timed\s*Chest/i);
    if (timedChestMatch) {
        return `${timedChestMatch[1]} Timed Chest`;
    }
    // Pattern: "Darkmoon Furies Deck" etc
    if (source.includes('Darkmoon') && source.includes('Deck')) {
        return source;
    }
    // Pattern: "Zul'Aman" - timed chest rewards
    if (source === 'Zul\'Aman' || source === 'Zul\\\'Aman') {
        return `<a href="https://tbc.wowhead.com/zone=3805" data-wowhead="zone=3805" class="underline hover:text-terminal-text">Zul\'Aman</a>`;
    }
    // Quest handling - check questIds FIRST before boss name matching
    // This prevents "Teron Gorefiend, I am..." from matching the boss "Teron Gorefiend"
    const questId = getQuestId(source);
    if (questId) {
        return `<a href="https://tbc.wowhead.com/quest=${questId}" data-wowhead="quest=${questId}" class="underline hover:text-terminal-text">${source}</a>`;
    }
    // Handle quest sources with "/" separator (multiple quest names)
    if (source.includes('/')) {
        const firstQuest = source.split('/')[0].trim();
        const questIdFirst = getQuestId(firstQuest);
        if (questIdFirst) {
            return `<a href="https://tbc.wowhead.com/quest=${questIdFirst}" data-wowhead="quest=${questIdFirst}" class="underline hover:text-terminal-text">${firstQuest}</a>`;
        }
    }
    // Check if source contains any known quest name (for contaminated strings)
    const sourceLower = source.toLowerCase().replace(/\\'/g, "'");
    for (const [questName, qId] of Object.entries(questIds)) {
        if (sourceLower.includes(questName)) {
            const displayQuestName = questName.charAt(0).toUpperCase() + questName.slice(1);
            return `<a href="https://tbc.wowhead.com/quest=${qId}" data-wowhead="quest=${qId}" class="underline hover:text-terminal-text">${displayQuestName}</a>`;
        }
    }
    // If we identified a boss name, try to link it
    if (bossName) {
        const npcId = npcMap[bossName] || npcMap[bossName.replace(/'/g, "\\'")] || 0;
        if (npcId > 0) {
            return `<a href="https://tbc.wowhead.com/npc=${npcId}" class="underline hover:text-terminal-text">${bossName}</a>`;
        }
        // Check if boss name is in npcMap with different quote escaping
        for (const [npcName, id] of Object.entries(npcMap)) {
            if (npcName.toLowerCase() === bossName.toLowerCase() && id > 0) {
                return `<a href="https://tbc.wowhead.com/npc=${id}" class="underline hover:text-terminal-text">${bossName}</a>`;
            }
        }
        return bossName;
    }
    // Check if the source contains any known NPC name directly
    // Sort by name length descending to match longer names first (e.g., "Kael'thas Sunstrider" before "Kael")
    const sortedNpcs = Object.entries(npcMap).sort((a, b) => b[0].length - a[0].length);
    for (const [npcName, npcId] of sortedNpcs) {
        if (npcId > 0) {
            // Check both with and without escaped apostrophes
            const sourceNormalized = source.replace(/\\'/g, "'");
            const npcNameNormalized = npcName.replace(/\\'/g, "'");
            if (sourceNormalized.includes(npcNameNormalized)) {
                return `<a href="https://tbc.wowhead.com/npc=${npcId}" class="underline hover:text-terminal-text">${npcNameNormalized}</a>`;
            }
        }
    }
    return displayText;
}
// Helper function to generate BIS table rows
function generateBisTable(bisData, specData) {
    // Group items by slot
    const groupedBySlot = {};
    bisData.forEach(row => {
        const slot = row[0];
        if (!groupedBySlot[slot]) {
            groupedBySlot[slot] = [];
        }
        groupedBySlot[slot].push({item: row[1], source: row[2]});
    });
    // Get enchants from specData
    const enchants = specData.enchants || {};
    // Mapping between bis slot names and enchant slot names
    const slotMapping = {
        'HELM': ['Head', 'Helm'],
        'NECK': ['Neck'],
        'SHOULDER': ['Shoulders', 'Shoulder'],
        'CLOAK': ['Back', 'Cloak'],
        'CHEST': ['Chest'],
        'BRACER': ['Bracers', 'Bracer', 'Wrist', 'Wrists'],
        'GLOVES': ['Gloves', 'Hands'],
        'BELT': ['Belt', 'Waist'],
        'LEGS': ['Legs'],
        'BOOTS': ['Feet', 'Feet*', 'Boots'],
        'RING': ['Finger', 'Ring', 'Rings', 'Ring (Enchanting-only)'],
        'RING 1': ['Finger', 'Ring', 'Rings', 'Ring (Enchanting-only)'],
        'RING 2': ['Finger', 'Ring', 'Rings', 'Ring (Enchanting-only)'],
        'TRINKET': ['Trinket', 'Trinkets'],
        'TRINKET 1': ['Trinket', 'Trinkets'],
        'TRINKET 2': ['Trinket', 'Trinkets'],
        'TRINKETS': ['Trinket', 'Trinkets'],
        'WEAPON': ['Weapon', 'Two-Handed Weapon', 'Main Hand Weapon', 'One-Handed Weapons', 'Melee Weapon'],
        '2-HANDER': ['Two-Handed Weapon', 'Weapon'],
        'DUAL WIELD - MH': ['Main Hand Weapon', 'One-Handed Weapons', 'Melee Weapon', 'Weapon'],
        'DUAL WIELD - OH': ['Off Hand Weapon', 'Off-Hand'],
        'MELEE WEAPON 1': ['Melee Weapon', 'Main Hand Weapon', 'Weapon'],
        'MELEE WEAPON 2': ['Melee Weapon', 'Off Hand Weapon', 'Weapon'],
        'OFF-HAND': ['Off Hand Weapon', 'Off-Hand', 'Shield'],
        'RANGED': ['Ranged Weapon'],
        'RANGED WEAPON': ['Ranged Weapon']
    };
    // Load BiS progress
    const bisProgress = loadBisProgress();
    // Generate table rows with grouped items and checkboxes
    return Object.entries(groupedBySlot).map(([slot, items]) => {
        const itemsHtml = items.map(i => {
            const itemKey = getBisItemKey(currentClass, currentSpec, currentPhase, slot, i.item);
            const isChecked = bisProgress[itemKey] ? 'checked' : '';
            const checkboxId = `bis-${itemKey}`;
            return `<div class="flex items-start gap-2">
                <input type="checkbox" id="${checkboxId}" class="bis-checkbox attunement-checkbox mt-1" data-item-key="${itemKey}" ${isChecked}>
                <label for="${checkboxId}" class="cursor-pointer ${isChecked ? 'line-through opacity-50' : ''}">${generateItemCell(i.item)}</label>
            </div>`;
        }).join('');
        const sourcesHtml = items.map(i => generateSourceCell(i.source)).join('<br>');
        // Find matching enchant for this slot
        let enchantHtml = '';
        const possibleEnchantKeys = slotMapping[slot] || [slot];
        for (const possibleKey of possibleEnchantKeys) {
            const enchantKey = Object.keys(enchants).find(key =>
                key.toLowerCase() === possibleKey.toLowerCase()
            );
            if (enchantKey) {
                enchantHtml = generateItemCell(enchants[enchantKey]);
                break;
            }
        }
        if (!enchantHtml) {
            enchantHtml = '<span class="text-terminal-dim">-</span>';
        }
        return `<tr class="hover:bg-white/5 transition-colors"><td class="p-2.5 border-b border-terminal-dim whitespace-nowrap md:p-2 sm:p-1.5">${slot}</td><td class="p-2.5 border-b border-terminal-dim md:p-2 sm:p-1.5">${itemsHtml}</td><td class="p-2.5 border-b border-terminal-dim md:p-2 sm:p-1.5">${enchantHtml}</td><td class="p-2.5 border-b border-terminal-dim md:p-2 sm:p-1.5">${sourcesHtml}</td></tr>`;
    }).join('');
}
function renderRaidsContent() {
    currentClass = null;
    document.querySelectorAll('.class-list li').forEach(li => li.classList.remove('active'));
    const raidsLink = document.querySelector('.class-list li[data-view="raids"]');
    if (raidsLink) raidsLink.classList.add('active');
    const phaseData = raidsData[currentRaidPhase];
    if (!phaseData) return;
    const raidData = phaseData.raids[currentRaid];
    // Build phase buttons
    const phaseButtons = Object.entries(raidsData).map(([key, phase]) =>
        `<a href="#raids/${key}" class="raid-phase-btn ${key === currentRaidPhase ? 'bg-terminal-text text-terminal-bg' : 'bg-transparent'} border border-terminal-text text-terminal-text px-4 py-2.5 cursor-pointer font-mono text-xs transition-all select-none hover:bg-terminal-text hover:text-terminal-bg no-underline md:px-3.5 md:py-2.5 md:text-[11px] md:min-h-[48px] md:inline-flex md:items-center md:justify-center sm:px-3 sm:py-2 sm:text-[10px] sm:min-h-[44px]" data-phase="${key}">${phase.name}</a>`
    ).join('');
    // Build raid buttons for current phase
    const raidButtons = Object.entries(phaseData.raids).map(([key, raid]) =>
        `<a href="#raids/${currentRaidPhase}/${key}" class="raid-btn ${key === currentRaid ? 'bg-terminal-accent text-terminal-bg' : 'bg-transparent'} border border-terminal-accent text-terminal-accent px-3 py-2 cursor-pointer font-mono text-xs transition-all select-none hover:bg-terminal-accent hover:text-terminal-bg no-underline md:px-3 md:py-2 md:text-[11px] sm:px-2.5 sm:py-1.5 sm:text-[10px]" data-raid="${key}">${raid.name} (${raid.size})</a>`
    ).join('');
    let html = `
        <div class="command-line text-terminal-dim my-5 md:text-[11px] md:my-3 sm:text-[10px]">query: tbc_raids --phase=${currentRaidPhase} --raid=${currentRaid}</div>
        <h2 class="text-terminal-accent text-lg mb-4 uppercase tracking-wide md:text-base md:mb-3 md:tracking-wider sm:text-sm sm:tracking-tight">🏰 [ TBC RAID GUIDES ]</h2>
        <p class="text-terminal-dim text-xs mb-6 md:mb-4 sm:mb-3">Boss strategies and ability breakdowns for all TBC raids</p>
        <h3 class="text-terminal-text text-sm my-4 uppercase md:text-[13px] md:my-3 sm:text-xs">📅 [ PHASE SELECTION ]</h3>
        <div class="flex flex-wrap gap-2 mb-4 md:gap-1.5 md:mb-3 sm:mb-2">${phaseButtons}</div>
        <h3 class="text-terminal-text text-sm my-4 uppercase md:text-[13px] md:my-3 sm:text-xs">🏰 [ RAIDS - ${phaseData.name.toUpperCase()} ]</h3>
        <div class="flex flex-wrap gap-2 mb-6 md:gap-1.5 md:mb-4 sm:mb-3">${raidButtons}</div>
    `;
    if (raidData) {
        // Raid overview section
        html += `
            <div class="border border-terminal-dim p-4 mb-6 md:p-3 md:mb-4 sm:p-2.5 sm:mb-3">
                <h3 class="text-terminal-accent text-base mb-3 md:text-sm sm:text-xs">${raidData.name}${raidData.shortName ? ` (${raidData.shortName})` : ''}</h3>
                <p class="text-terminal-dim text-xs mb-4 leading-relaxed md:text-[11px] md:mb-3 sm:text-[10px]">${raidData.description || ''}</p>
                <div class="grid grid-cols-2 gap-4 text-xs md:grid-cols-1 md:gap-2 md:text-[11px] sm:text-[10px]">
                    <div class="space-y-1.5">
                        <div><span class="text-terminal-text">👥 Size:</span> <span class="text-terminal-dim">${raidData.size} players</span></div>
                        <div><span class="text-terminal-text">📍 Location:</span> <span class="text-terminal-dim">${raidData.location}</span></div>
                        <div><span class="text-terminal-text">🔑 Attunement:</span> <span class="text-terminal-dim">${raidData.attunement}</span></div>
                        ${raidData.tierTokens ? `<div><span class="text-terminal-text">🎁 Tier Tokens:</span> <span class="text-terminal-dim">${raidData.tierTokens}</span></div>` : ''}
                    </div>
                </div>
            </div>
        `;

        // Recommended composition section
        if (raidData.recommendedComposition) {
            const comp = raidData.recommendedComposition;
            html += `
                <div class="border border-terminal-accent border-opacity-30 p-4 mb-6 md:p-3 md:mb-4 sm:p-2.5 sm:mb-3">
                    <h4 class="text-terminal-accent text-sm mb-3 uppercase md:text-xs sm:text-[11px]">// Recommended Raid Composition</h4>
                    <div class="flex flex-wrap gap-4 mb-3 text-xs md:gap-3 md:text-[11px] sm:gap-2 sm:text-[10px]">
                        <div class="bg-blue-900 bg-opacity-30 px-3 py-1.5 border border-blue-500 border-opacity-50">
                            <span class="text-blue-400">🛡️ TANKS:</span> <span class="text-terminal-text">${comp.tanks}</span>
                        </div>
                        <div class="bg-green-900 bg-opacity-30 px-3 py-1.5 border border-green-500 border-opacity-50">
                            <span class="text-green-400">💚 HEALERS:</span> <span class="text-terminal-text">${comp.healers}</span>
                        </div>
                        <div class="bg-red-900 bg-opacity-30 px-3 py-1.5 border border-red-500 border-opacity-50">
                            <span class="text-red-400">⚔️ DPS:</span> <span class="text-terminal-text">${comp.dps}</span>
                        </div>
                    </div>
                    ${comp.notes ? `<p class="text-terminal-dim text-xs leading-relaxed md:text-[11px] sm:text-[10px]">${comp.notes}</p>` : ''}
                </div>
            `;
        }

        // Minimum gear requirements section
        if (raidData.minimumGear) {
            const gear = raidData.minimumGear;
            html += `
                <div class="border border-yellow-500 border-opacity-30 p-4 mb-6 md:p-3 md:mb-4 sm:p-2.5 sm:mb-3">
                    <h4 class="text-yellow-400 text-sm mb-3 uppercase md:text-xs sm:text-[11px]">// Minimum Gear Requirements</h4>
                    <div class="space-y-2 text-xs md:text-[11px] sm:text-[10px]">
                        ${gear.tanks ? `<div><span class="text-blue-400">🛡️ Tanks:</span> <span class="text-terminal-dim">${gear.tanks}</span></div>` : ''}
                        ${gear.healers ? `<div><span class="text-green-400">💚 Healers:</span> <span class="text-terminal-dim">${gear.healers}</span></div>` : ''}
                        ${gear.dps ? `<div><span class="text-red-400">⚔️ DPS:</span> <span class="text-terminal-dim">${gear.dps}</span></div>` : ''}
                    </div>
                </div>
            `;
        }

        // Attunement steps section
        if (raidData.attunementSteps && raidData.attunementSteps.length > 0) {
            html += `
                <div class="border border-purple-500 border-opacity-30 p-4 mb-6 md:p-3 md:mb-4 sm:p-2.5 sm:mb-3">
                    <h4 class="text-purple-400 text-sm mb-3 uppercase md:text-xs sm:text-[11px]">// Attunement Guide</h4>
                    <div class="space-y-1.5 text-xs md:text-[11px] sm:text-[10px]">
                        ${raidData.attunementSteps.map(step => `<div class="text-terminal-dim">${step}</div>`).join('')}
                    </div>
                </div>
            `;
        }
        // Boss list header
        html += `<h3 class="text-terminal-text text-sm my-4 uppercase md:text-[13px] md:my-3 sm:text-xs">💀 [ BOSS ENCOUNTERS ]</h3>`;

        // Difficulty badge colors
        const difficultyColors = {
            'Easy': 'bg-green-900 border-green-500 text-green-400',
            'Medium': 'bg-yellow-900 border-yellow-500 text-yellow-400',
            'Hard': 'bg-red-900 border-red-500 text-red-400',
            'Very Hard': 'bg-purple-900 border-purple-500 text-purple-400'
        };

        for (const boss of raidData.bosses) {
            const bossLink = boss.npcId
                ? `<a href="https://tbc.wowhead.com/npc=${boss.npcId}" data-wowhead="npc=${boss.npcId}" class="text-wow-epic hover:text-terminal-text text-base md:text-sm sm:text-xs">${boss.name}</a>`
                : `<span class="text-wow-epic text-base md:text-sm sm:text-xs">${boss.name}</span>`;

            const difficultyBadge = boss.difficulty
                ? `<span class="ml-3 px-2 py-0.5 text-[10px] uppercase border bg-opacity-30 ${difficultyColors[boss.difficulty] || difficultyColors['Medium']}">${boss.difficulty}</span>`
                : '';

            html += `
                <div class="mb-6 border border-terminal-dim border-opacity-50 p-4 md:mb-4 md:p-3 sm:mb-3 sm:p-2.5">
                    <h4 class="mb-3 md:mb-2 sm:mb-1.5 flex items-center flex-wrap gap-2">${bossLink}${difficultyBadge}</h4>
                    <p class="text-terminal-dim text-xs mb-3 leading-relaxed md:text-[11px] md:mb-2 sm:text-[10px]">${boss.description}</p>
            `;

            // Phase breakdown section
            if (boss.phaseBreakdown && boss.phaseBreakdown.length > 0) {
                html += `
                    <div class="border border-cyan-500 border-opacity-30 p-3 mb-3 md:p-2.5 md:mb-2 sm:p-2">
                        <h5 class="text-cyan-400 text-xs uppercase mb-2 md:text-[11px] md:mb-1.5 sm:text-[10px]">// Phase Breakdown</h5>
                        <div class="space-y-1.5 text-xs md:text-[11px] sm:text-[10px]">
                            ${boss.phaseBreakdown.map(phase => `<div class="text-terminal-dim">${phase}</div>`).join('')}
                        </div>
                    </div>
                `;
            }

            // Guest list section (for Moroes)
            if (boss.guestList && boss.guestList.length > 0) {
                html += `
                    <div class="border border-orange-500 border-opacity-30 p-3 mb-3 md:p-2.5 md:mb-2 sm:p-2">
                        <h5 class="text-orange-400 text-xs uppercase mb-2 md:text-[11px] md:mb-1.5 sm:text-[10px]">// Possible Dinner Guests (4 spawn randomly)</h5>
                        <div class="grid grid-cols-2 gap-1.5 text-xs md:grid-cols-1 md:text-[11px] sm:text-[10px]">
                            ${boss.guestList.map(guest => `<div class="text-terminal-dim">• ${guest}</div>`).join('')}
                        </div>
                    </div>
                `;
            }

            // Abilities table with handling column
            if (boss.abilities && boss.abilities.length > 0) {
                html += `
                    <div class="mb-3 md:mb-2">
                        <h5 class="text-terminal-text text-xs uppercase mb-2 md:text-[11px] md:mb-1.5 sm:text-[10px]">// Abilities</h5>
                        <div class="overflow-x-auto -mx-4 px-4 md:-mx-3 md:px-3 sm:-mx-2.5 sm:px-2.5">
                            <table class="w-full border-collapse text-xs min-w-[700px] md:text-[11px] sm:text-[10px] sm:min-w-[500px]">
                                <thead>
                                    <tr>
                                        <th class="bg-terminal-dim text-terminal-bg p-2 text-left font-semibold uppercase text-[10px] tracking-wider md:p-1.5 md:text-[9px] sm:p-1 sm:text-[8px] w-[15%]">ABILITY</th>
                                        <th class="bg-terminal-dim text-terminal-bg p-2 text-left font-semibold uppercase text-[10px] tracking-wider md:p-1.5 md:text-[9px] sm:p-1 sm:text-[8px] w-[35%]">DESCRIPTION</th>
                                        <th class="bg-terminal-dim text-terminal-bg p-2 text-left font-semibold uppercase text-[10px] tracking-wider md:p-1.5 md:text-[9px] sm:p-1 sm:text-[8px] w-[50%]">HOW TO HANDLE</th>
                                    </tr>
                                </thead>
                                <tbody>
                `;
                for (const ability of boss.abilities) {
                    const abilityLink = ability.spellId
                        ? `<a href="https://tbc.wowhead.com/spell=${ability.spellId}" data-wowhead="spell=${ability.spellId}" class="text-terminal-accent hover:text-terminal-text">${ability.name}</a>`
                        : `<span class="text-terminal-accent">${ability.name}</span>`;
                    html += `
                        <tr class="border-b border-terminal-dim border-opacity-30">
                            <td class="p-2 md:p-1.5 sm:p-1 whitespace-nowrap align-top">${abilityLink}</td>
                            <td class="p-2 text-terminal-dim md:p-1.5 sm:p-1 align-top">${ability.description}</td>
                            <td class="p-2 text-green-400 text-opacity-80 md:p-1.5 sm:p-1 align-top">${ability.handling || '-'}</td>
                        </tr>
                    `;
                }
                html += `
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
            }

            // Strategy section
            if (boss.strategy) {
                html += `
                    <div class="bg-terminal-bg/50 border border-terminal-accent border-opacity-30 p-3 mb-3 md:p-2.5 md:mb-2 sm:p-2">
                        <h5 class="text-terminal-accent text-xs uppercase mb-1.5 md:text-[11px] md:mb-1 sm:text-[10px]">// Strategy</h5>
                        <p class="text-terminal-dim text-xs leading-relaxed md:text-[11px] sm:text-[10px]">${boss.strategy}</p>
                    </div>
                `;
            }

            // Common mistakes section
            if (boss.commonMistakes && boss.commonMistakes.length > 0) {
                html += `
                    <div class="border border-red-500 border-opacity-30 p-3 mb-3 md:p-2.5 md:mb-2 sm:p-2">
                        <h5 class="text-red-400 text-xs uppercase mb-2 md:text-[11px] md:mb-1.5 sm:text-[10px]">// Common Mistakes to Avoid</h5>
                        <div class="space-y-1 text-xs md:text-[11px] sm:text-[10px]">
                            ${boss.commonMistakes.map(mistake => `<div class="text-terminal-dim">⚠ ${mistake}</div>`).join('')}
                        </div>
                    </div>
                `;
            }

            // Loot highlights section
            if (boss.lootHighlights && boss.lootHighlights.length > 0) {
                html += `
                    <div class="border border-wow-epic border-opacity-30 p-3 md:p-2.5 sm:p-2">
                        <h5 class="text-wow-epic text-xs uppercase mb-2 md:text-[11px] md:mb-1.5 sm:text-[10px]">// Notable Loot</h5>
                        <div class="flex flex-wrap gap-2 text-xs md:text-[11px] sm:text-[10px]">
                            ${boss.lootHighlights.map(item => `<span class="text-terminal-dim bg-terminal-dim bg-opacity-20 px-2 py-0.5">${item}</span>`).join('')}
                        </div>
                    </div>
                `;
            }

            html += `
                </div>
            `;
        }
    }
    const mainContent = document.getElementById('main-content');
    mainContent.style.opacity = '0.3';
    setTimeout(() => {
        mainContent.innerHTML = html;
        mainContent.style.opacity = '1';
        // Add event listeners to phase buttons
        document.querySelectorAll('.raid-phase-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (e.ctrlKey || e.metaKey || e.button === 1) return;
                e.preventDefault();
                currentRaidPhase = btn.dataset.phase;
                const firstRaid = Object.keys(raidsData[currentRaidPhase].raids)[0];
                currentRaid = firstRaid;
                window.location.hash = `#raids/${currentRaidPhase}`;
            });
        });
        // Add event listeners to raid buttons
        document.querySelectorAll('.raid-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (e.ctrlKey || e.metaKey || e.button === 1) return;
                e.preventDefault();
                currentRaid = btn.dataset.raid;
                window.location.hash = `#raids/${currentRaidPhase}/${currentRaid}`;
            });
        });
        // Reinitialize wowhead tooltips
        if (typeof $WowheadPower !== 'undefined' && $WowheadPower.refreshLinks) {
            $WowheadPower.refreshLinks();
        }
    }, 200);
}
let currentCollection = 'mounts';
function renderCollectionsContent(category = 'mounts') {
    currentClass = null;
    currentCollection = category;
    document.querySelectorAll('.class-list li').forEach(li => li.classList.remove('active'));
    const collectionsLink = document.querySelector('.nav-link[data-view="collections"]');
    if (collectionsLink) collectionsLink.parentElement.classList.add('active');

    const categories = ['mounts', 'tabards', 'vanityPets', 'rareSpawns', 'toys'];
    const categoryLabels = {mounts: 'Mounts', tabards: 'Tabards', vanityPets: 'Vanity Pets', rareSpawns: 'Rare Spawns', toys: 'Toys'};

    const categoryButtons = categories.map(cat =>
        `<a href="#collections/${cat}" class="collection-btn ${cat === currentCollection ? 'bg-terminal-text text-terminal-bg' : 'bg-transparent'} border border-terminal-text text-terminal-text px-4 py-2.5 cursor-pointer font-mono text-xs transition-all select-none hover:bg-terminal-text hover:text-terminal-bg no-underline md:px-3.5 md:py-2.5 md:text-[11px] sm:px-3 sm:py-2 sm:text-[10px]" data-category="${cat}">${categoryLabels[cat]}</a>`
    ).join('');

    let contentHtml = '';
    const data = collectionsData[category];

    if (category === 'mounts' && data) {
        contentHtml = renderMountsSection(data);
    } else if (category === 'tabards' && data) {
        contentHtml = renderTabardsSection(data);
    } else if (category === 'vanityPets' && data) {
        contentHtml = renderPetsSection(data);
    } else if (category === 'rareSpawns' && data) {
        contentHtml = renderRareSpawnsSection(data);
    } else if (category === 'toys' && data) {
        contentHtml = renderToysSection(data);
    }

    const html = `
        <div class="command-line text-terminal-dim my-5 md:text-[11px] md:my-3 sm:text-[10px]">query: tbc_collections --category=${category}</div>
        <h2 class="text-terminal-accent text-lg mb-4 uppercase tracking-wide md:text-base md:mb-3 sm:text-sm">📦 [ TBC COLLECTIONS ]</h2>
        <p class="text-terminal-dim text-xs mb-6 md:mb-4 sm:mb-3">Collectible items available in The Burning Crusade</p>
        <h3 class="text-terminal-text text-sm my-4 uppercase md:text-[13px] md:my-3 sm:text-xs">📁 [ CATEGORY ]</h3>
        <div class="flex flex-wrap gap-2 mb-6 md:gap-1.5 md:mb-4 sm:mb-3">${categoryButtons}</div>
        ${contentHtml}
    `;

    const mainContent = document.getElementById('main-content');
    mainContent.style.opacity = '0.3';
    setTimeout(() => {
        mainContent.innerHTML = html;
        mainContent.style.opacity = '1';
        // Add event listeners to category buttons
        document.querySelectorAll('.collection-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (e.ctrlKey || e.metaKey || e.button === 1) return;
                e.preventDefault();
                window.location.hash = `#collections/${btn.dataset.category}`;
            });
        });
        if (typeof $WowheadPower !== 'undefined' && $WowheadPower.refreshLinks) {
            $WowheadPower.refreshLinks();
        }
    }, 200);
}

function renderMountsSection(data) {
    let html = '<h3 class="text-terminal-text text-sm my-4 uppercase md:text-[13px] md:my-3 sm:text-xs">🦅 [ FLYING MOUNTS ]</h3>';
    const flyingCategories = {
        'allianceVendor': '🔵 Alliance Vendor', 'hordeVendor': '🔴 Horde Vendor', 'netherwing': '🐉 Netherwing (Rep)',
        'shatariSkyguard': "🦅 Sha'tari Skyguard (Rep)", 'cenarionExpedition': '🌿 Cenarion Expedition (Rep)',
        'engineering': '⚙️ Engineering', 'rareDrops': '✨ Rare Drops', 'gladiator': '⚔️ Gladiator (PvP)'
    };
    for (const [key, label] of Object.entries(flyingCategories)) {
        if (data.flyingMounts && data.flyingMounts[key]) {
            html += renderMountGroup(label, data.flyingMounts[key]);
        }
    }
    html += '<h3 class="text-terminal-text text-sm my-4 uppercase md:text-[13px] md:my-3 sm:text-xs">🐴 [ GROUND MOUNTS ]</h3>';
    const groundCategories = {
        'bloodElfHawkstriders': '🔴 Blood Elf Hawkstriders', 'draeneiElekks': '🔵 Draenei Elekks',
        'talbuksMaghar': "🔴 Mag'har Talbuks (Rep)", 'talbuksKurenai': '🔵 Kurenai Talbuks (Rep)',
        'halaa': '⚔️ Halaa PvP', 'raidDrops': '🏰 Raid Drops', 'worldEvents': '🎉 World Events'
    };
    for (const [key, label] of Object.entries(groundCategories)) {
        if (data.groundMounts && data.groundMounts[key]) {
            html += renderMountGroup(label, data.groundMounts[key]);
        }
    }
    return html;
}

function renderMountGroup(label, mounts) {
    const rows = mounts.map(m => `
        <tr class="border-b border-terminal-dim border-opacity-30">
            <td class="p-2 md:p-1.5 sm:p-1"><a href="https://tbc.wowhead.com/item=${m.itemId}" data-wowhead="item=${m.itemId}" class="text-wow-epic hover:text-terminal-text">${m.name}</a></td>
            <td class="p-2 text-terminal-dim md:p-1.5 sm:p-1 text-xs">${m.faction || 'Both'}</td>
            <td class="p-2 text-terminal-dim md:p-1.5 sm:p-1 text-xs">${m.requirements || '-'}</td>
        </tr>
    `).join('');
    return `
        <div class="mb-4">
            <h4 class="text-terminal-accent text-xs mb-2">${label}</h4>
            <div class="overflow-x-auto">
                <table class="w-full border-collapse text-xs">
                    <thead><tr><th class="bg-terminal-dim text-terminal-bg p-2 text-left text-[10px] uppercase">Mount</th><th class="bg-terminal-dim text-terminal-bg p-2 text-left text-[10px] uppercase">Faction</th><th class="bg-terminal-dim text-terminal-bg p-2 text-left text-[10px] uppercase">Requirements</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>
    `;
}

function renderTabardsSection(data) {
    let html = '';
    const categories = {reputation: '⭐ Reputation Tabards', pvp: '⚔️ PvP Tabards', other: '📦 Other Tabards'};
    for (const [key, label] of Object.entries(categories)) {
        if (data[key]) {
            const rows = data[key].map(t => `
                <tr class="border-b border-terminal-dim border-opacity-30">
                    <td class="p-2 md:p-1.5 sm:p-1"><a href="https://tbc.wowhead.com/item=${t.itemId}" data-wowhead="item=${t.itemId}" class="text-wow-rare hover:text-terminal-text">${t.name}</a></td>
                    <td class="p-2 text-terminal-dim md:p-1.5 sm:p-1 text-xs">${t.source || '-'}</td>
                    <td class="p-2 text-terminal-dim md:p-1.5 sm:p-1 text-xs">${t.requirements || '-'}</td>
                </tr>
            `).join('');
            html += `
                <h4 class="text-terminal-accent text-xs mb-2 mt-4">${label}</h4>
                <div class="overflow-x-auto">
                    <table class="w-full border-collapse text-xs">
                        <thead><tr><th class="bg-terminal-dim text-terminal-bg p-2 text-left text-[10px] uppercase">Tabard</th><th class="bg-terminal-dim text-terminal-bg p-2 text-left text-[10px] uppercase">Source</th><th class="bg-terminal-dim text-terminal-bg p-2 text-left text-[10px] uppercase">Requirements</th></tr></thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            `;
        }
    }
    return html;
}

function renderPetsSection(data) {
    let html = '';
    const categories = {vendor: '🛒 Vendor Pets', drops: '🎁 Drop/Quest Pets', engineering: '⚙️ Engineering Pets', worldEvents: '🎉 World Event Pets'};
    for (const [key, label] of Object.entries(categories)) {
        if (data[key]) {
            const rows = data[key].map(p => `
                <tr class="border-b border-terminal-dim border-opacity-30">
                    <td class="p-2 md:p-1.5 sm:p-1"><a href="https://tbc.wowhead.com/item=${p.itemId}" data-wowhead="item=${p.itemId}" class="text-wow-uncommon hover:text-terminal-text">${p.name}</a></td>
                    <td class="p-2 text-terminal-dim md:p-1.5 sm:p-1 text-xs">${p.source || '-'}</td>
                    <td class="p-2 text-terminal-dim md:p-1.5 sm:p-1 text-xs">${p.zone || '-'}</td>
                    <td class="p-2 text-terminal-dim md:p-1.5 sm:p-1 text-xs">${p.requirements || '-'}</td>
                </tr>
            `).join('');
            html += `
                <h4 class="text-terminal-accent text-xs mb-2 mt-4">${label}</h4>
                <div class="overflow-x-auto">
                    <table class="w-full border-collapse text-xs">
                        <thead><tr><th class="bg-terminal-dim text-terminal-bg p-2 text-left text-[10px] uppercase">Pet</th><th class="bg-terminal-dim text-terminal-bg p-2 text-left text-[10px] uppercase">Source</th><th class="bg-terminal-dim text-terminal-bg p-2 text-left text-[10px] uppercase">Zone</th><th class="bg-terminal-dim text-terminal-bg p-2 text-left text-[10px] uppercase">Requirements</th></tr></thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            `;
        }
    }
    return html;
}

function renderRareSpawnsSection(data) {
    let html = '';
    const zones = {hellfire: '🔥 Hellfire Peninsula', zangarmarsh: '🍄 Zangarmarsh', terokkar: '🌲 Terokkar Forest', nagrand: '🌾 Nagrand', bladesEdge: "⛰️ Blade's Edge Mountains", netherstorm: '⚡ Netherstorm', shadowmoon: '🌑 Shadowmoon Valley'};
    for (const [key, label] of Object.entries(zones)) {
        if (data[key]) {
            const rows = data[key].map(r => `
                <tr class="border-b border-terminal-dim border-opacity-30">
                    <td class="p-2 md:p-1.5 sm:p-1"><a href="https://tbc.wowhead.com/npc=${r.npcId}" data-wowhead="npc=${r.npcId}" class="text-yellow-400 hover:text-terminal-text">${r.name}</a></td>
                    <td class="p-2 text-terminal-dim md:p-1.5 sm:p-1 text-xs">${r.drops || '-'}</td>
                    <td class="p-2 text-terminal-dim md:p-1.5 sm:p-1 text-xs">${r.coords || '-'}</td>
                </tr>
            `).join('');
            html += `
                <h4 class="text-terminal-accent text-xs mb-2 mt-4">${label}</h4>
                <div class="overflow-x-auto">
                    <table class="w-full border-collapse text-xs">
                        <thead><tr><th class="bg-terminal-dim text-terminal-bg p-2 text-left text-[10px] uppercase">NPC</th><th class="bg-terminal-dim text-terminal-bg p-2 text-left text-[10px] uppercase">Notable Drops</th><th class="bg-terminal-dim text-terminal-bg p-2 text-left text-[10px] uppercase">Location</th></tr></thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            `;
        }
    }
    return html;
}

function renderToysSection(data) {
    let html = '';
    const categories = {transformation: '🎭 Transformation Items', party: '🎉 Party Items', engineering: '⚙️ Engineering Gadgets', misc: '📦 Miscellaneous'};
    for (const [key, label] of Object.entries(categories)) {
        if (data[key]) {
            const rows = data[key].map(t => `
                <tr class="border-b border-terminal-dim border-opacity-30">
                    <td class="p-2 md:p-1.5 sm:p-1"><a href="https://tbc.wowhead.com/item=${t.itemId}" data-wowhead="item=${t.itemId}" class="text-wow-uncommon hover:text-terminal-text">${t.name}</a></td>
                    <td class="p-2 text-terminal-dim md:p-1.5 sm:p-1 text-xs">${t.effect || '-'}</td>
                    <td class="p-2 text-terminal-dim md:p-1.5 sm:p-1 text-xs">${t.source || '-'}</td>
                </tr>
            `).join('');
            html += `
                <h4 class="text-terminal-accent text-xs mb-2 mt-4">${label}</h4>
                <div class="overflow-x-auto">
                    <table class="w-full border-collapse text-xs">
                        <thead><tr><th class="bg-terminal-dim text-terminal-bg p-2 text-left text-[10px] uppercase">Item</th><th class="bg-terminal-dim text-terminal-bg p-2 text-left text-[10px] uppercase">Effect</th><th class="bg-terminal-dim text-terminal-bg p-2 text-left text-[10px] uppercase">Source</th></tr></thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            `;
        }
    }
    return html;
}

// ===== ATTUNEMENT TRACKER FUNCTIONS =====
function loadAttunementProgress() {
    try {
        const saved = localStorage.getItem(ATTUNEMENT_STORAGE_KEY);
        return saved ? JSON.parse(saved) : {};
    } catch (e) {
        console.error('Error loading attunement progress:', e);
        return {};
    }
}

function saveAttunementProgress(stepId, completed) {
    try {
        const progress = loadAttunementProgress();
        if (completed) {
            progress[stepId] = true;
        } else {
            delete progress[stepId];
        }
        localStorage.setItem(ATTUNEMENT_STORAGE_KEY, JSON.stringify(progress));
        // Also save to server if logged in
        saveProgressToServer();
    } catch (e) {
        console.error('Error saving attunement progress:', e);
    }
}

function clearAttunementProgress(attunementKey = null) {
    try {
        if (attunementKey) {
            const progress = loadAttunementProgress();
            const attunement = attunementsData[attunementKey];
            if (attunement && attunement.steps) {
                attunement.steps.forEach(step => {
                    delete progress[step.id];
                });
            }
            localStorage.setItem(ATTUNEMENT_STORAGE_KEY, JSON.stringify(progress));
        } else {
            localStorage.removeItem(ATTUNEMENT_STORAGE_KEY);
        }
        // Also save to server if logged in
        saveProgressToServer();
    } catch (e) {
        console.error('Error clearing attunement progress:', e);
    }
}

function getAttunementCompletionStats(attunementKey) {
    const progress = loadAttunementProgress();
    const attunement = attunementsData[attunementKey];
    if (!attunement || !attunement.steps) return { completed: 0, total: 0, percent: 0 };
    const total = attunement.steps.length;
    const completed = attunement.steps.filter(step => progress[step.id]).length;
    return {
        completed,
        total,
        percent: total > 0 ? Math.round((completed / total) * 100) : 0
    };
}

function renderProgressBar(completed, total) {
    const percent = total > 0 ? (completed / total) * 100 : 0;
    const filledBlocks = Math.round(percent / 10);
    const emptyBlocks = 10 - filledBlocks;
    const bar = '\u2588'.repeat(filledBlocks) + '\u2591'.repeat(emptyBlocks);
    return `<span class="text-terminal-accent">[${bar}]</span> <span class="text-terminal-dim">${percent}% (${completed}/${total})</span>`;
}

// ===== BIS CHECKBOX FUNCTIONS =====
function loadBisProgress() {
    try {
        const saved = localStorage.getItem(BIS_STORAGE_KEY);
        return saved ? JSON.parse(saved) : {};
    } catch (e) {
        console.error('Error loading BiS progress:', e);
        return {};
    }
}

function saveBisProgress(itemKey, completed) {
    try {
        const progress = loadBisProgress();
        if (completed) {
            progress[itemKey] = true;
        } else {
            delete progress[itemKey];
        }
        localStorage.setItem(BIS_STORAGE_KEY, JSON.stringify(progress));
    } catch (e) {
        console.error('Error saving BiS progress:', e);
    }
}

function getBisItemKey(className, specName, phase, slot, itemName) {
    return `${className}-${specName}-${phase}-${slot}-${stripPriorityLabel(itemName).toLowerCase().replace(/[^a-z0-9]/g, '')}`;
}

// ===== REPUTATION TRACKER FUNCTIONS =====
// factionsData.factions and factionsData.standings are loaded from factionsData.json

function loadRepProgress() {
    try {
        const saved = localStorage.getItem(REP_STORAGE_KEY);
        return saved ? JSON.parse(saved) : {};
    } catch (e) {
        console.error('Error loading reputation progress:', e);
        return {};
    }
}

function saveRepProgress(factionId, standing) {
    try {
        const progress = loadRepProgress();
        progress[factionId] = standing;
        localStorage.setItem(REP_STORAGE_KEY, JSON.stringify(progress));
    } catch (e) {
        console.error('Error saving reputation progress:', e);
    }
}

// ===== RAID LOCKOUT TRACKER FUNCTIONS =====
// lockoutsData.raids is loaded from lockoutsData.json

function loadLockoutProgress() {
    try {
        const saved = localStorage.getItem(LOCKOUT_STORAGE_KEY);
        return saved ? JSON.parse(saved) : {};
    } catch (e) {
        console.error('Error loading lockout progress:', e);
        return {};
    }
}

function saveLockoutProgress(raidId, locked, timestamp = null) {
    try {
        const progress = loadLockoutProgress();
        if (locked) {
            progress[raidId] = { locked: true, timestamp: timestamp || Date.now() };
        } else {
            delete progress[raidId];
        }
        localStorage.setItem(LOCKOUT_STORAGE_KEY, JSON.stringify(progress));
    } catch (e) {
        console.error('Error saving lockout progress:', e);
    }
}

function checkLockoutExpiry() {
    const progress = loadLockoutProgress();
    const now = Date.now();
    let changed = false;

    for (const raid of lockoutsData.raids) {
        if (progress[raid.id]) {
            const lockoutTime = progress[raid.id].timestamp;
            const expiryTime = lockoutTime + (raid.resetDays * 24 * 60 * 60 * 1000);
            if (now >= expiryTime) {
                delete progress[raid.id];
                changed = true;
            }
        }
    }

    if (changed) {
        localStorage.setItem(LOCKOUT_STORAGE_KEY, JSON.stringify(progress));
    }
    return progress;
}

// ===== GUILD PROGRESS TRACKER FUNCTIONS =====
function loadGuildProgress() {
    try {
        const saved = localStorage.getItem(GUILD_PROGRESS_KEY);
        return saved ? JSON.parse(saved) : {};
    } catch (e) {
        console.error('Error loading guild progress:', e);
        return {};
    }
}

function saveGuildProgress(bossId, killCount) {
    try {
        const progress = loadGuildProgress();
        if (killCount > 0) {
            progress[bossId] = killCount;
        } else {
            delete progress[bossId];
        }
        localStorage.setItem(GUILD_PROGRESS_KEY, JSON.stringify(progress));
    } catch (e) {
        console.error('Error saving guild progress:', e);
    }
}

function renderAttunementsContent(attunementKey = 'karazhan') {
    currentClass = null;
    currentAttunement = attunementKey;
    document.querySelectorAll('.class-list li').forEach(li => li.classList.remove('active'));
    const attunementsLink = document.querySelector('.nav-link[data-view="attunements"]');
    if (attunementsLink) attunementsLink.parentElement.classList.add('active');

    const attunementOrder = ['karazhan', 'ssc', 'tk', 'hyjal', 'bt', 'heroicKeys'];
    const attunementLabels = {
        karazhan: 'Karazhan',
        ssc: 'SSC',
        tk: 'TK',
        hyjal: 'Hyjal',
        bt: 'Black Temple',
        heroicKeys: 'Heroic Keys'
    };

    const attunementButtons = attunementOrder.map(key => {
        const stats = getAttunementCompletionStats(key);
        const isComplete = stats.percent === 100;
        return `<a href="#attunements/${key}" class="attunement-btn ${key === currentAttunement ? 'bg-terminal-text text-terminal-bg' : 'bg-transparent'} ${isComplete ? 'border-terminal-accent' : 'border-terminal-text'} border text-terminal-text px-4 py-2.5 cursor-pointer font-mono text-xs transition-all select-none hover:bg-terminal-text hover:text-terminal-bg no-underline md:px-3.5 md:py-2.5 md:text-[11px] sm:px-3 sm:py-2 sm:text-[10px]" data-attunement="${key}">${attunementLabels[key]}${isComplete ? ' \u2713' : ''}</a>`;
    }).join('');

    const attunement = attunementsData[attunementKey];
    let contentHtml = '';

    if (attunement) {
        contentHtml = renderAttunementSteps(attunementKey, attunement);
    }

    const html = `
        <div class="command-line text-terminal-dim my-5 md:text-[11px] md:my-3 sm:text-[10px]">query: tbc_attunements --raid=${attunementKey}</div>
        <h2 class="text-terminal-accent text-lg mb-4 uppercase tracking-wide md:text-base md:mb-3 sm:text-sm">🔑 [ TBC ATTUNEMENTS ]</h2>
        <p class="text-terminal-dim text-xs mb-2">Track your raid attunement progress. Data is saved in your browser.</p>
        <p class="text-terminal-dim text-xs mb-6 md:mb-4 sm:mb-3 italic">Note: Most attunements were removed in later patches but remain for achievements/titles.</p>
        <h3 class="text-terminal-text text-sm my-4 uppercase md:text-[13px] md:my-3 sm:text-xs">🔑 [ SELECT ATTUNEMENT ]</h3>
        <div class="flex flex-wrap gap-2 mb-6 md:gap-1.5 md:mb-4 sm:mb-3">${attunementButtons}</div>
        ${contentHtml}
        <div class="mt-6 pt-4 border-t border-terminal-dim border-opacity-30">
            <button onclick="clearAttunementProgress('${attunementKey}'); renderAttunementsContent('${attunementKey}');" class="text-xs text-terminal-dim hover:text-red-400 mr-4 cursor-pointer bg-transparent border-none font-mono">[Clear This Progress]</button>
            <button onclick="if(confirm('Clear ALL attunement progress?')) { clearAttunementProgress(); renderAttunementsContent('${attunementKey}'); }" class="text-xs text-terminal-dim hover:text-red-400 cursor-pointer bg-transparent border-none font-mono">[Clear All Progress]</button>
        </div>
    `;

    const mainContent = document.getElementById('main-content');
    mainContent.style.opacity = '0.3';
    setTimeout(() => {
        mainContent.innerHTML = html;
        mainContent.style.opacity = '1';
        attachAttunementListeners();
        if (typeof $WowheadPower !== 'undefined' && $WowheadPower.refreshLinks) {
            $WowheadPower.refreshLinks();
        }
    }, FADE_TRANSITION_MS);
}

function renderAttunementSteps(attunementKey, attunement) {
    const progress = loadAttunementProgress();
    const stats = getAttunementCompletionStats(attunementKey);

    let html = `
        <div class="border border-terminal-text p-4 mb-4">
            <div class="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div>
                    <h3 class="text-terminal-accent text-base uppercase mb-1">${attunement.name}</h3>
                    <p class="text-terminal-dim text-xs">${attunement.description || ''}</p>
                    ${attunement.note ? `<p class="text-yellow-400 text-xs mt-1">\u26A0 ${attunement.note}</p>` : ''}
                </div>
                <div class="text-right">
                    <div class="text-xs text-terminal-dim mb-1">Reward: ${attunement.reward}</div>
                    ${attunement.rewardItemId ? `<a href="https://tbc.wowhead.com/item=${attunement.rewardItemId}" data-wowhead="item=${attunement.rewardItemId}" class="text-wow-epic text-xs hover:text-terminal-text">View Item</a>` : ''}
                </div>
            </div>
            <div class="mb-4">
                <div class="text-xs text-terminal-dim mb-1">Progress:</div>
                <div class="flex items-center gap-3">
                    <div class="progress-bar-bg flex-1 max-w-xs">
                        <div class="progress-bar-fill" style="width: ${stats.percent}%"></div>
                    </div>
                    <span class="text-xs text-terminal-dim">${stats.percent}% (${stats.completed}/${stats.total})</span>
                </div>
            </div>
        </div>
    `;

    if (attunementKey === 'heroicKeys') {
        html += renderHeroicKeysSteps(attunement, progress);
    } else {
        html += '<div class="border-t border-terminal-dim border-opacity-30">';
        attunement.steps.forEach((step, index) => {
            const isCompleted = progress[step.id];
            const stepTypeIcon = getStepTypeIcon(step.type);
            const questLink = step.questId ? `<a href="https://tbc.wowhead.com/quest=${step.questId}" data-wowhead="quest=${step.questId}" class="text-yellow-400 hover:text-terminal-text">${step.name}</a>` : `<span class="text-terminal-text">${step.name}</span>`;

            html += `
                <label class="attunement-step ${isCompleted ? 'completed' : ''} flex items-start gap-3 py-3 px-2 cursor-pointer border-b border-terminal-dim border-opacity-30 hover:bg-terminal-dim hover:bg-opacity-5">
                    <input type="checkbox" id="${step.id}" class="attunement-checkbox mt-0.5" ${isCompleted ? 'checked' : ''} />
                    <span class="text-terminal-accent text-xs min-w-[24px]">${index + 1}.</span>
                    <div class="flex-1 step-text">
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="text-xs">${stepTypeIcon}</span>
                            ${questLink}
                            ${step.factionSpecific ? '<span class="text-xs text-blue-400">[Faction]</span>' : ''}
                        </div>
                        <div class="text-xs text-terminal-dim mt-1">${step.description}</div>
                        <div class="text-xs text-terminal-dim mt-1">
                            ${step.location ? `📍 ${step.location}` : ''}
                            ${step.npc ? ` · 👤 ${step.npc}` : ''}
                            ${step.boss ? ` · 💀 ${step.boss}` : ''}
                        </div>
                        ${step.note ? `<div class="text-xs text-yellow-400 mt-1">⚠ ${step.note}</div>` : ''}
                    </div>
                </label>
            `;
        });
        html += '</div>';
    }

    return html;
}

function renderHeroicKeysSteps(attunement, progress) {
    let html = '<div class="border-t border-terminal-dim border-opacity-30">';

    attunement.steps.forEach(step => {
        const isCompleted = progress[step.id];

        html += `
            <label class="attunement-step ${isCompleted ? 'completed' : ''} flex items-start gap-3 py-3 px-2 cursor-pointer border-b border-terminal-dim border-opacity-30 hover:bg-terminal-dim hover:bg-opacity-5">
                <input type="checkbox" id="${step.id}" class="attunement-checkbox mt-0.5" ${isCompleted ? 'checked' : ''} />
                <div class="flex-1 step-text">
                    <div class="flex items-center gap-2 flex-wrap mb-1">
                        🔑 ${step.itemId ? `<a href="https://tbc.wowhead.com/item=${step.itemId}" data-wowhead="item=${step.itemId}" class="text-wow-rare hover:text-terminal-text">${step.name}</a>` : `<span class="text-terminal-text">${step.name}</span>`}
                    </div>
                    <div class="text-xs text-terminal-dim">${step.description}</div>
                    <div class="text-xs text-terminal-dim mt-1">
                        ⭐ ${step.faction} · ${step.repRequired} · 🏰 ${step.dungeons.join(', ')}
                    </div>
                </div>
            </label>
        `;
    });

    html += '</div>';
    return html;
}

function getStepTypeIcon(type) {
    const icons = {
        'quest': '\u{1F4DC}',
        'dungeon': '\u{1F3F0}',
        'heroic': '\u{2694}\uFE0F',
        'raid': '\u{1F409}',
        'reputation': '\u{2B50}'
    };
    return icons[type] || '\u{1F4DC}';
}

function attachAttunementListeners() {
    document.querySelectorAll('.attunement-checkbox').forEach(cb => {
        cb.addEventListener('change', (e) => {
            const stepId = e.target.id;
            const completed = e.target.checked;
            saveAttunementProgress(stepId, completed);

            const label = e.target.closest('.attunement-step');
            if (label) {
                label.classList.toggle('completed', completed);
            }

            // Update progress bar
            const stats = getAttunementCompletionStats(currentAttunement);
            const progressFill = document.querySelector('.progress-bar-fill');
            const progressText = document.querySelector('.progress-bar-bg').nextElementSibling;
            if (progressFill) {
                progressFill.style.width = `${stats.percent}%`;
            }
            if (progressText) {
                progressText.textContent = `${stats.percent}% (${stats.completed}/${stats.total})`;
            }

            // Update button checkmark
            const btn = document.querySelector(`.attunement-btn[data-attunement="${currentAttunement}"]`);
            if (btn && stats.percent === 100) {
                if (!btn.textContent.includes('\u2713')) {
                    btn.textContent = btn.textContent + ' \u2713';
                }
                btn.classList.add('border-terminal-accent');
                btn.classList.remove('border-terminal-text');
            } else if (btn) {
                btn.textContent = btn.textContent.replace(' \u2713', '');
                btn.classList.remove('border-terminal-accent');
                btn.classList.add('border-terminal-text');
            }
        });
    });

    document.querySelectorAll('.attunement-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (e.ctrlKey || e.metaKey || e.button === 1) return;
            e.preventDefault();
            window.location.hash = `#attunements/${btn.dataset.attunement}`;
        });
    });
}

function renderRecipesContent() {
    currentClass = null;
    document.querySelectorAll('.class-list li').forEach(li => li.classList.remove('active'));
    const recipesLink = document.querySelector('.class-list li[data-view="recipes"]');
    if (recipesLink) recipesLink.classList.add('active');
    const priorityLabels = {
        high: { text: 'PRIORITY', class: 'text-red-400' },
        medium: { text: 'GOOD', class: 'text-yellow-400' },
        low: { text: 'OPTIONAL', class: 'text-green-400' }
    };
    const profession = recipesData[currentProfession];
    if (!profession) return;
    const profEmojis = {blacksmithing: '⚒️', leatherworking: '🥾', tailoring: '🧵', jewelcrafting: '💎', engineering: '⚙️', alchemy: '⚗️', enchanting: '✨'};
    const currentProfEmoji = profEmojis[currentProfession] || '📜';
    let html = `
        <div class="command-line text-terminal-dim my-5 md:text-[11px] md:my-3 sm:text-[10px]">query: profession_recipes --profession=${currentProfession}</div>
        <h2 class="text-terminal-accent text-lg mb-4 uppercase tracking-wide md:text-base md:mb-3 md:tracking-wider sm:text-sm sm:tracking-tight">${currentProfEmoji} [ ${profession.title.toUpperCase()} // TBC ]</h2>
        <p class="text-terminal-dim text-xs mb-6 md:mb-4 sm:mb-3">Essential ${profession.title} recipes to prioritize for raiding and gold making</p>
        <div class="flex flex-wrap gap-2 mb-6 md:gap-1.5 md:mb-4 sm:mb-3">
            ${Object.keys(recipesData).map(prof => {
                return `<a href="#recipes/${prof}" class="profession-btn ${prof === currentProfession ? 'bg-terminal-text text-terminal-bg' : 'bg-transparent'} border border-terminal-text text-terminal-text px-4 py-2.5 cursor-pointer font-mono text-xs transition-all select-none hover:bg-terminal-text hover:text-terminal-bg no-underline md:px-3.5 md:py-2.5 md:text-[11px] md:min-h-[48px] md:inline-flex md:items-center md:justify-center sm:px-3 sm:py-2 sm:text-[10px] sm:min-h-[44px]" data-profession="${prof}">${profEmojis[prof] || ''} ${recipesData[prof].title}</a>`;
            }).join('')}
        </div>
    `;
    for (const [catKey, category] of Object.entries(profession.categories)) {
        html += `
            <div class="mb-6 last:mb-0">
                <h4 class="text-terminal-text text-sm mb-3 md:text-xs">// ${category.name}</h4>
                <div class="overflow-x-auto -mx-5 px-5 md:-mx-4 md:px-4 sm:-mx-3 sm:px-3">
                    <table class="w-full border-collapse text-[13px] min-w-[700px] md:text-[11px] sm:text-[10px] sm:min-w-[600px]">
                        <thead>
                            <tr>
                                <th class="bg-terminal-dim text-terminal-bg p-2.5 text-left font-semibold uppercase text-[11px] tracking-widest md:p-2 md:text-[10px] sm:p-1.5 sm:text-[9px]">RECIPE</th>
                                <th class="bg-terminal-dim text-terminal-bg p-2.5 text-left font-semibold uppercase text-[11px] tracking-widest md:p-2 md:text-[10px] sm:p-1.5 sm:text-[9px]">SOURCE</th>
                                <th class="bg-terminal-dim text-terminal-bg p-2.5 text-left font-semibold uppercase text-[11px] tracking-widest md:p-2 md:text-[10px] sm:p-1.5 sm:text-[9px]">PRIORITY</th>
                                <th class="bg-terminal-dim text-terminal-bg p-2.5 text-left font-semibold uppercase text-[11px] tracking-widest md:p-2 md:text-[10px] sm:p-1.5 sm:text-[9px]">NOTES</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        for (const recipe of category.recipes) {
            const priority = priorityLabels[recipe.priority] || priorityLabels.medium;
            // Handle recipe name with tooltip - some items like head/shoulder enchants don't have craftable spell IDs
            let recipeName;
            if (recipe.itemId) {
                // Use item tooltip
                recipeName = `<a href="https://tbc.wowhead.com/item=${recipe.itemId}" data-wowhead="item=${recipe.itemId}" class="text-terminal-accent hover:text-terminal-text">${recipe.name}</a>`;
            } else if (recipe.spellId && recipe.spellId > 0) {
                // Use spell tooltip
                recipeName = `<a href="https://tbc.wowhead.com/spell=${recipe.spellId}" data-wowhead="spell=${recipe.spellId}" class="text-terminal-accent hover:text-terminal-text">${recipe.name}</a>`;
            } else {
                // No tooltip, just plain text
                recipeName = `<span class="text-terminal-accent">${recipe.name}</span>`;
            }
            html += `
                <tr class="border-b border-terminal-dim border-opacity-30 hover:bg-terminal-dim hover:bg-opacity-10">
                    <td class="p-2.5 md:p-2 sm:p-1.5">${recipeName}</td>
                    <td class="p-2.5 text-terminal-dim md:p-2 sm:p-1.5">${recipe.source}</td>
                    <td class="p-2.5 md:p-2 sm:p-1.5"><span class="text-[10px] font-semibold ${priority.class}">[${priority.text}]</span></td>
                    <td class="p-2.5 text-terminal-dim italic md:p-2 sm:p-1.5">${recipe.notes}</td>
                </tr>
            `;
        }
        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }
    const mainContent = document.getElementById('main-content');
    mainContent.style.opacity = '0.3';
    setTimeout(() => {
        mainContent.innerHTML = html;
        mainContent.style.opacity = '1';
        // Add event listeners to profession buttons
        document.querySelectorAll('.profession-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (e.ctrlKey || e.metaKey || e.button === 1) return;
                e.preventDefault();
                currentProfession = btn.dataset.profession;
                window.location.hash = `#recipes/${currentProfession}`;
            });
        });
        // Reinitialize wowhead tooltips
        if (typeof $WowheadPower !== 'undefined' && $WowheadPower.refreshLinks) {
            $WowheadPower.refreshLinks();
        }
    }, FADE_TRANSITION_MS);
}
function renderClassContent(className) {
    const data = classData[className];
    if (!data) return;
    currentClass = className;
    // Set default spec if needed
    if (!currentSpec || !data.specs[currentSpec]) {
        currentSpec = data.defaultSpec;
    }
    const specData = data.specs[currentSpec];
    if (!specData) return;
    // Validate current phase
    if (!specData.phases[currentPhase]) {
        currentPhase = Object.keys(specData.phases)[0];
    }
    const phaseData = specData.phases[currentPhase];
    // Generate UI components
    const phaseButtons = Object.keys(specData.phases)
        .map(p => `<a href="#${className}/${currentSpec}/${p}" class="phase-btn ${p == currentPhase ? 'bg-terminal-text text-terminal-bg' : 'bg-transparent'} border border-terminal-text text-terminal-text px-4 py-2.5 cursor-pointer font-mono text-xs transition-all select-none hover:bg-terminal-text hover:text-terminal-bg no-underline md:px-3.5 md:py-2.5 md:text-[11px] md:min-h-[48px] md:inline-flex md:items-center md:justify-center sm:px-3 sm:py-2 sm:text-[10px] sm:min-h-[44px]" data-phase="${p}">${specData.phases[p].name}</a>`)
        .join('');
    const bisTable = generateBisTable(phaseData.bis, specData);
    // Generate talents tree
    let talentsHtml = '';
    if (specData.talents && specData.talents.length > 0) {
        const buildsList = specData.talents.map((build, buildIdx) => {
            const buildPrefix = buildIdx === specData.talents.length - 1 ? '└──' : '├──';
            let buildHtml = `${buildPrefix} ${build.name}\n`;
            build.trees.forEach((tree, treeIdx) => {
                if (tree.talents.length === 0) return;
                const treeIndent = buildIdx === specData.talents.length - 1 ? '    ' : '│   ';
                const treePrefix = treeIdx === build.trees.length - 1 ? '└──' : '├──';
                buildHtml += `${treeIndent}${treePrefix} ${tree.name}:\n`;
                tree.talents.forEach((talent, talentIdx) => {
                    const talentIndent = treeIdx === build.trees.length - 1 ? '    ' : '│   ';
                    const talentPrefix = talentIdx === tree.talents.length - 1 ? '    └──' : '    ├──';
                    const talentSpellId = getTalentSpellId(talent.name);
                    const talentLink = talentSpellId
                        ? `<a href="https://tbc.wowhead.com/spell=${talentSpellId}" data-wowhead="spell=${talentSpellId}">${talent.name}</a>`
                        : talent.name;
                    buildHtml += `${treeIndent}${talentPrefix} ${talentLink}: ${talent.points}/${talent.max}\n`;
                });
            });
            return buildHtml;
        }).join('\n');
        talentsHtml = `
            <h3 class="text-terminal-text text-sm my-4 uppercase md:text-[13px] md:my-3 sm:text-xs">🌳 [ TALENT BUILDS ]</h3>
            <div class="talent-tree bg-terminal-bg/30 border border-terminal-dim p-4 my-4 font-mono text-xs leading-relaxed md:text-[11px] md:p-3 sm:text-[10px] sm:p-2.5" style="white-space: pre-wrap;">${buildsList}</div>
        `;
    }
    // Generate gems section
    let gemsHtml = '';
    if (specData.gems && specData.gems.length > 0) {
        const gemsList = specData.gems.map(gem => generateItemCell(gem)).join(' ');
        gemsHtml = `
            <h3 class="text-terminal-text text-sm my-4 uppercase md:text-[13px] md:my-3 sm:text-xs">💎 [ RECOMMENDED GEMS ]</h3>
            <div class="bg-terminal-bg/30 border border-terminal-dim p-4 my-4 font-mono text-xs leading-relaxed md:text-[11px] md:p-3 sm:text-[10px] sm:p-2.5">${gemsList}</div>
        `;
    }
    // Generate macros section
    let macrosHtml = '';
    if (specData.macros && specData.macros.length > 0) {
        const macrosList = specData.macros.map(macro => {
            const escapedCode = macro.code.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            return `
                <div class="mb-4 last:mb-0">
                    <div class="text-terminal-accent text-xs mb-1 font-semibold">${macro.name}</div>
                    <pre class="bg-terminal-bg border border-terminal-dim p-2 text-[11px] text-terminal-text overflow-x-auto select-all cursor-pointer hover:border-terminal-accent transition-colors" onclick="navigator.clipboard.writeText(this.innerText).then(() => { this.style.borderColor = '#4ade80'; setTimeout(() => this.style.borderColor = '', 500); })" title="Click to copy">${escapedCode}</pre>
                </div>`;
        }).join('');
        macrosHtml = `
            <h3 class="text-terminal-text text-sm my-4 uppercase md:text-[13px] md:my-3 sm:text-xs">⌨️ [ USEFUL MACROS ]</h3>
            <div class="border border-terminal-dim p-4 my-4 md:p-3 sm:p-2.5">${macrosList}</div>
        `;
    }
    // Generate rotation section
    let rotationHtml = '';
    if (specData.rotation) {
        const rot = specData.rotation;
        // Priority list
        let priorityHtml = '';
        if (rot.priority && rot.priority.length > 0) {
            const priorityList = rot.priority.map((ability, idx) => {
                const abilityLink = ability.spellId
                    ? `<a href="https://tbc.wowhead.com/spell=${ability.spellId}" data-wowhead="spell=${ability.spellId}" class="text-terminal-accent hover:text-terminal-text">${ability.name}</a>`
                    : `<span class="text-terminal-accent">${ability.name}</span>`;
                return `<tr class="border-b border-terminal-dim border-opacity-30">
                    <td class="p-2 md:p-1.5 sm:p-1 text-terminal-accent whitespace-nowrap">${idx + 1}.</td>
                    <td class="p-2 md:p-1.5 sm:p-1 whitespace-nowrap">${abilityLink}</td>
                    <td class="p-2 text-terminal-dim md:p-1.5 sm:p-1">${ability.description}</td>
                </tr>`;
            }).join('');
            priorityHtml = `
                <h4 class="text-terminal-accent text-xs uppercase mb-2 mt-4 md:text-[11px] md:mb-1.5 sm:text-[10px]">// Priority</h4>
                <div class="overflow-x-auto -mx-4 px-4 md:-mx-3 md:px-3 sm:-mx-2.5 sm:px-2.5">
                    <table class="w-full border-collapse text-xs min-w-[400px] md:text-[11px] sm:text-[10px]">
                        <thead><tr>
                            <th class="bg-terminal-dim text-terminal-bg p-2 text-left font-semibold uppercase text-[10px] tracking-wider md:p-1.5 md:text-[9px] sm:p-1 sm:text-[8px] w-8">#</th>
                            <th class="bg-terminal-dim text-terminal-bg p-2 text-left font-semibold uppercase text-[10px] tracking-wider md:p-1.5 md:text-[9px] sm:p-1 sm:text-[8px]">ABILITY</th>
                            <th class="bg-terminal-dim text-terminal-bg p-2 text-left font-semibold uppercase text-[10px] tracking-wider md:p-1.5 md:text-[9px] sm:p-1 sm:text-[8px]">USAGE</th>
                        </tr></thead>
                        <tbody>${priorityList}</tbody>
                    </table>
                </div>`;
        }
        // Opener section
        let openerHtml = '';
        if (rot.opener && rot.opener.length > 0) {
            const openerList = rot.opener.map(ability => {
                const abilityLink = ability.spellId
                    ? `<a href="https://tbc.wowhead.com/spell=${ability.spellId}" data-wowhead="spell=${ability.spellId}" class="text-terminal-accent hover:text-terminal-text">${ability.name}</a>`
                    : `<span class="text-terminal-accent">${ability.name}</span>`;
                return abilityLink;
            }).join(' → ');
            openerHtml = `
                <h4 class="text-terminal-accent text-xs uppercase mb-2 mt-4 md:text-[11px] md:mb-1.5 sm:text-[10px]">// Opener</h4>
                <div class="bg-terminal-bg/50 border border-terminal-dim p-3 text-xs md:text-[11px] sm:text-[10px]">${openerList}</div>`;
        }
        // Cooldowns section
        let cooldownsHtml = '';
        if (rot.cooldowns && rot.cooldowns.length > 0) {
            const cdList = rot.cooldowns.map(cd => {
                const cdLink = cd.spellId
                    ? `<a href="https://tbc.wowhead.com/spell=${cd.spellId}" data-wowhead="spell=${cd.spellId}" class="text-terminal-accent hover:text-terminal-text">${cd.name}</a>`
                    : `<span class="text-terminal-accent">${cd.name}</span>`;
                return `<div class="mb-2"><span class="text-terminal-text">•</span> ${cdLink}: <span class="text-terminal-dim">${cd.description}</span></div>`;
            }).join('');
            cooldownsHtml = `
                <h4 class="text-terminal-accent text-xs uppercase mb-2 mt-4 md:text-[11px] md:mb-1.5 sm:text-[10px]">// Cooldowns</h4>
                <div class="bg-terminal-bg/50 border border-terminal-dim p-3 text-xs md:text-[11px] sm:text-[10px]">${cdList}</div>`;
        }
        // Notes section
        let notesHtml = '';
        if (rot.notes) {
            notesHtml = `
                <h4 class="text-terminal-accent text-xs uppercase mb-2 mt-4 md:text-[11px] md:mb-1.5 sm:text-[10px]">// Notes</h4>
                <div class="bg-terminal-bg/50 border border-terminal-dim p-3 text-xs text-terminal-dim md:text-[11px] sm:text-[10px]">${rot.notes}</div>`;
        }
        rotationHtml = `
            <h3 class="text-terminal-text text-sm my-4 uppercase md:text-[13px] md:my-3 sm:text-xs">⚔️ [ ROTATION ]</h3>
            <div class="border border-terminal-dim p-4 my-4 md:p-3 sm:p-2.5">
                ${rot.description ? `<p class="text-terminal-dim text-xs mb-3 md:text-[11px] sm:text-[10px]">${rot.description}</p>` : ''}
                ${priorityHtml}
                ${openerHtml}
                ${cooldownsHtml}
                ${notesHtml}
            </div>
        `;
    }
    const specs = Object.entries(data.specs)
        .map(([key, spec]) => `<a href="#${className}/${key}" class="spec-tab ${key === currentSpec ? 'border-terminal-accent text-terminal-accent' : 'border-terminal-dim'} inline-block py-2 px-3 mr-2.5 border cursor-pointer transition-all text-xs select-none hover:border-terminal-accent hover:text-terminal-accent no-underline md:py-2.5 md:px-3 md:text-[11px] md:min-h-[48px] md:inline-flex md:items-center md:mr-2 sm:py-2 sm:px-2.5 sm:text-[10px] sm:mr-1.5 sm:min-h-[44px]" data-spec="${key}">${spec.name}</a>`)
        .join('');
    const html = `
        <div class="command-line text-terminal-dim my-5 md:text-[11px] md:my-3 sm:text-[10px]">query: ${className}_pve_bis --spec=${currentSpec} --phase=${currentPhase}</div>
        <div class="mb-8 pb-5 border-b border-dashed border-terminal-dim last:border-b-0 md:mb-6 md:pb-4 sm:pb-3">
            <h2 class="text-terminal-accent text-lg mb-4 uppercase tracking-wide md:text-base md:mb-3 md:tracking-wider sm:text-sm sm:tracking-tight">[ ${data.title} // ${specData.name.toUpperCase()} PVE ]</h2>
            <p class="text-terminal-dim text-xs mb-4 md:text-[11px] sm:text-[10px]">Armor: ${data.armorType || 'Unknown'}</p>
            <h3 class="text-terminal-text text-sm my-4 uppercase md:text-[13px] md:my-3 sm:text-xs">🎯 [ SPEC SELECTION ]</h3>
            <div class="my-2.5">${specs}</div>
            <h3 class="text-terminal-text text-sm my-4 uppercase md:text-[13px] md:my-3 sm:text-xs">📊 [ STAT PRIORITY ]</h3>
            <div class="my-2.5 text-terminal-text text-xs md:text-[11px] sm:text-[10px]">${specData.statPriority ? specData.statPriority.map((stat, i) => `<span class="${i === 0 ? 'text-terminal-accent' : ''}">${stat}</span>`).join(' > ') : '<span class="text-terminal-dim">Not specified</span>'}</div>
            <h3 class="text-terminal-text text-sm my-4 uppercase md:text-[13px] md:my-3 sm:text-xs">🔧 [ RECOMMENDED PROFESSIONS ]</h3>
            <div class="my-2.5">${data.professions ? data.professions.map(p => `[ <a href="https://tbc.wowhead.com/skill=${p.skillId}" data-wowhead="skill=${p.skillId}" class="text-terminal-text hover:text-terminal-accent">${p.name}</a> ]`).join(' ') : '<span class="text-terminal-dim">None specified</span>'}</div>
            <h3 class="text-terminal-text text-sm my-4 uppercase md:text-[13px] md:my-3 sm:text-xs">📅 [ PHASE SELECTOR ]</h3>
            <div class="flex flex-wrap gap-2.5 my-4 md:gap-2 md:my-3">${phaseButtons}</div>
            <h3 id="bis-header" class="text-terminal-text text-sm my-4 uppercase md:text-[13px] md:my-3 sm:text-xs">👑 [ BEST IN SLOT - ${phaseData.name} ]</h3>
            <div class="overflow-x-auto -mx-5 px-5 md:-mx-4 md:px-4 sm:-mx-3 sm:px-3">
                <table class="w-full border-collapse my-4 text-[13px] min-w-[600px] md:my-3.5 md:text-[11px] sm:my-3 sm:text-[10px] sm:min-w-[500px]">
                    <thead><tr><th class="bg-terminal-dim text-terminal-bg p-2.5 text-justify font-semibold uppercase text-[11px] tracking-widest md:p-2 md:text-[10px] sm:p-1.5 sm:text-[9px] sm:tracking-wide">SLOT</th><th class="bg-terminal-dim text-terminal-bg p-2.5 text-justify font-semibold uppercase text-[11px] tracking-widest md:p-2 md:text-[10px] sm:p-1.5 sm:text-[9px] sm:tracking-wide">ITEM</th><th class="bg-terminal-dim text-terminal-bg p-2.5 text-justify font-semibold uppercase text-[11px] tracking-widest md:p-2 md:text-[10px] sm:p-1.5 sm:text-[9px] sm:tracking-wide">ENCHANT</th><th class="bg-terminal-dim text-terminal-bg p-2.5 text-justify font-semibold uppercase text-[11px] tracking-widest md:p-2 md:text-[10px] sm:p-1.5 sm:text-[9px] sm:tracking-wide">SOURCE</th></tr></thead>
                    <tbody id="bis-table">${bisTable}</tbody>
                </table>
            </div>
            ${gemsHtml}
            ${rotationHtml}
            ${macrosHtml}
            ${talentsHtml}
        </div>
    `;
    const mainContent = document.getElementById('main-content');
    mainContent.style.opacity = '0.3';
    setTimeout(() => {
        mainContent.innerHTML = html;
        mainContent.style.opacity = '1';
        processItemLinks();
        attachEventListeners(specData);
    }, FADE_TRANSITION_MS);
}
function attachEventListeners(specData) {
    // Phase button listeners
    document.querySelectorAll('.phase-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            if (e.ctrlKey || e.metaKey || e.button === 1) return;
            e.preventDefault();
            // Remove active state from all buttons
            document.querySelectorAll('.phase-btn').forEach(b => {
                b.classList.remove('bg-terminal-text', 'text-terminal-bg');
                b.classList.add('bg-transparent', 'text-terminal-text');
            });
            // Add active state to clicked button
            this.classList.remove('bg-transparent', 'text-terminal-text');
            this.classList.add('bg-terminal-text', 'text-terminal-bg');
            const phase = parseInt(this.getAttribute('data-phase'));
            currentPhase = phase;
            history.replaceState(null, '', `#${currentClass}/${currentSpec}/${phase}`);
            const phaseData = specData.phases[phase];
            document.getElementById('bis-header').textContent = `[ BEST IN SLOT - ${phaseData.name} ]`;
            document.getElementById('bis-table').innerHTML = generateBisTable(phaseData.bis, specData);
            processItemLinks();
            attachBisCheckboxListeners();
        });
    });
    // Spec tab listeners
    document.querySelectorAll('.spec-tab').forEach(tab => {
        tab.addEventListener('click', function(e) {
            if (e.ctrlKey || e.metaKey || e.button === 1) return;
            e.preventDefault();
            const newSpec = this.getAttribute('data-spec');
            if (newSpec !== currentSpec) {
                currentSpec = newSpec;
                currentPhase = 1;
                window.location.hash = `#${currentClass}/${newSpec}`;
            }
        });
    });
    // BiS checkbox listeners
    attachBisCheckboxListeners();
}

function attachBisCheckboxListeners() {
    document.querySelectorAll('.bis-checkbox').forEach(cb => {
        cb.addEventListener('change', function() {
            const itemKey = this.getAttribute('data-item-key');
            const isChecked = this.checked;
            saveBisProgress(itemKey, isChecked);
            // Update label styling
            const label = this.nextElementSibling;
            if (label) {
                if (isChecked) {
                    label.classList.add('line-through', 'opacity-50');
                } else {
                    label.classList.remove('line-through', 'opacity-50');
                }
            }
        });
    });
}
// Pre-raid checker state
let preRaidClass = 'warrior';
let preRaidSpecName = null;
let preRaidGearText = '';
let preRaidDebounceTimer = null;
let selectedPhase = '1'; // Default to Phase 1 (Karazhan)

// Phase definitions - "Am I ready for X?"
const PHASES = [
    { key: '1', name: 'Phase 1 (Karazhan/Gruul/Mag)', shortName: 'Karazhan' },
    { key: '2', name: 'Phase 2 (SSC/TK)', shortName: 'SSC/TK' },
    { key: '3', name: 'Phase 3 (Hyjal/BT)', shortName: 'Hyjal/BT' },
    { key: '4', name: 'Phase 4 (ZA)', shortName: 'ZA' },
    { key: '5', name: 'Phase 5 (Sunwell)', shortName: 'Sunwell' }
];

// Minimum raid thresholds by role and phase
// These are realistic minimums to be "ready", not BiS targets
const RAID_THRESHOLDS = {
    caster_dps: {
        '1': { spellhit: 50, spelldamage: 500, stamina: 120, label: 'Karazhan' },
        '2': { spellhit: 76, spelldamage: 750, stamina: 160, label: 'SSC/TK' },
        '3': { spellhit: 101, spelldamage: 1000, stamina: 200, label: 'Hyjal/BT' },
        '4': { spellhit: 101, spelldamage: 1100, stamina: 230, label: 'ZA' },
        '5': { spellhit: 126, spelldamage: 1300, stamina: 280, label: 'Sunwell' }
    },
    healer: {
        '1': { healing: 1000, mp5: 40, stamina: 120, label: 'Karazhan' },
        '2': { healing: 1400, mp5: 60, stamina: 160, label: 'SSC/TK' },
        '3': { healing: 1700, mp5: 80, stamina: 200, label: 'Hyjal/BT' },
        '4': { healing: 1900, mp5: 90, stamina: 230, label: 'ZA' },
        '5': { healing: 2200, mp5: 110, stamina: 280, label: 'Sunwell' }
    },
    melee_dps: {
        '1': { hit: 50, attackpower: 800, crit: 40, stamina: 120, label: 'Karazhan' },
        '2': { hit: 75, attackpower: 1100, crit: 70, stamina: 160, label: 'SSC/TK' },
        '3': { hit: 100, attackpower: 1400, crit: 100, stamina: 220, label: 'Hyjal/BT' },
        '4': { hit: 110, attackpower: 1600, crit: 120, stamina: 260, label: 'ZA' },
        '5': { hit: 120, attackpower: 1900, crit: 150, stamina: 320, label: 'Sunwell' }
    },
    tank: {
        '1': { defense: 490, armor: 10000, stamina: 200, label: 'Karazhan' },
        '2': { defense: 490, armor: 13000, stamina: 280, label: 'SSC/TK' },
        '3': { defense: 490, armor: 16000, stamina: 350, label: 'Hyjal/BT' },
        '4': { defense: 490, armor: 18000, stamina: 400, label: 'ZA' },
        '5': { defense: 490, armor: 21000, stamina: 480, label: 'Sunwell' }
    }
};

// Map specs to roles
const SPEC_ROLES = {
    // Priest
    'shadow': 'caster_dps',
    'holy': 'healer',
    'discipline': 'healer',
    // Mage
    'fire': 'caster_dps',
    'frost': 'caster_dps',
    'arcane': 'caster_dps',
    // Warlock
    'affliction': 'caster_dps',
    'demonology': 'caster_dps',
    'destruction': 'caster_dps',
    // Druid
    'balance': 'caster_dps',
    'feral': 'melee_dps',
    'feral tank': 'tank',
    'restoration': 'healer',
    // Paladin
    'holy': 'healer',
    'protection': 'tank',
    'retribution': 'melee_dps',
    // Shaman
    'elemental': 'caster_dps',
    'enhancement': 'melee_dps',
    'restoration': 'healer',
    // Warrior
    'arms': 'melee_dps',
    'fury': 'melee_dps',
    'protection': 'tank',
    // Rogue
    'combat': 'melee_dps',
    'assassination': 'melee_dps',
    'subtlety': 'melee_dps',
    // Hunter
    'beast mastery': 'melee_dps',
    'marksmanship': 'melee_dps',
    'survival': 'melee_dps'
};

// Gear slots for scoring
const GEAR_SLOTS = ['HELM', 'NECK', 'SHOULDER', 'CLOAK', 'CHEST', 'BRACER', 'GLOVES', 'BELT', 'LEGS', 'BOOTS', 'RING', 'TRINKET', 'WEAPON', 'OFF-HAND', 'RANGED'];

// Cache for calculated BiS stats per phase/spec
let bisStatsCache = {};

// Find item ID from name (case-insensitive, partial match)
function findItemId(itemName) {
    if (!itemIds || typeof itemIds !== 'object') return null;
    const lower = itemName.toLowerCase().trim();
    if (!lower) return null;
    // Exact match first
    for (const name in itemIds) {
        if (name.toLowerCase() === lower) return itemIds[name];
    }
    // Partial match - item name contains search term
    for (const name in itemIds) {
        if (name.toLowerCase().includes(lower)) return itemIds[name];
    }
    return null;
}

// Cache for item searches
const itemSearchCache = {};

// Search for item ID by name using Blizzard API via backend
async function searchItemByName(itemName) {
    const lower = itemName.toLowerCase().trim();
    if (!lower) return null;

    // Check cache first
    if (itemSearchCache[lower] !== undefined) {
        return itemSearchCache[lower];
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/item-search?name=${encodeURIComponent(itemName)}`);
        if (!response.ok) {
            console.error('Item search failed:', response.status);
            return null;
        }

        const data = await response.json();
        if (data.items && data.items.length > 0) {
            // Find best match - require the names to actually relate
            const exactMatch = data.items.find(item =>
                item.name.toLowerCase() === lower
            );
            // Partial match: item name contains search OR search contains item name
            const partialMatch = data.items.find(item => {
                const itemLower = item.name.toLowerCase();
                return itemLower.includes(lower) || lower.includes(itemLower);
            });

            const result = exactMatch || partialMatch;
            if (!result) {
                // No good match found
                itemSearchCache[lower] = null;
                return null;
            }

            // Cache the result and add to local itemIds for future lookups
            itemSearchCache[lower] = result;
            if (result && result.id) {
                itemIds[lower] = result.id;
            }
            return result;
        }

        itemSearchCache[lower] = null;
        return null;
    } catch (e) {
        console.error('Item search error:', e);
        return null;
    }
}

// Extract item name without rating suffix
function cleanItemName(bisEntry) {
    // bisEntry is like "Overlord's Helmet of Second Sight (BEST)"
    return bisEntry.replace(/\s*\((BEST|RECOMMENDED|OPTION|EASY)\)\s*$/i, '').trim();
}

// Get rating weight for scoring
function getRatingWeight(bisEntry) {
    if (bisEntry.includes('(BEST)')) return 1.0;
    if (bisEntry.includes('(RECOMMENDED)')) return 0.85;
    if (bisEntry.includes('(OPTION)')) return 0.7;
    if (bisEntry.includes('(EASY)')) return 0.6;
    return 0.5;
}

// Get BiS list for a class/spec/phase
function getPhaseBisList(className, specName, phaseKey) {
    const cls = classData[className];
    if (!cls || !cls.specs || !cls.specs[specName]) return [];
    const spec = cls.specs[specName];
    if (!spec.phases) return [];
    // phases is an object with keys "0", "1", etc.
    const phase = spec.phases[phaseKey];
    return phase?.bis || [];
}

// Legacy function for compatibility
function getPreRaidBisList(className, specName) {
    return getPhaseBisList(className, specName, '0');
}

// Calculate total BiS stats for a phase by fetching all BiS items
async function calculatePhaseBisStats(className, specName, phaseKey) {
    const cacheKey = `${className}-${specName}-${phaseKey}`;
    if (bisStatsCache[cacheKey]) return bisStatsCache[cacheKey];

    const bisList = getPhaseBisList(className, specName, phaseKey);
    if (bisList.length === 0) return null;

    // Get only BEST items for each slot (or first item if no BEST marker)
    const bestBySlot = {};
    for (const [slot, itemName, source] of bisList) {
        if (itemName.includes('(BEST)') || !bestBySlot[slot]) {
            const cleanName = cleanItemName(itemName);
            const itemId = findItemId(cleanName);
            if (itemId) {
                bestBySlot[slot] = { itemId, name: cleanName };
            }
        }
    }

    // Get item IDs that need fetching
    const bisItemIds = Object.values(bestBySlot).map(item => item.itemId);
    await fetchAllItemStats(bisItemIds);

    // Debug: log what items are counted for BiS
    console.log(`[BiS ${phaseKey}] Slots:`, Object.keys(bestBySlot).length, Object.entries(bestBySlot).map(([slot, item]) => `${slot}: ${item.name}`));

    // Get stats from fetched cache
    const statsArray = Object.values(bestBySlot)
        .map(item => fetchedItemStats[item.itemId])
        .filter(stats => stats && Object.values(stats).some(v => typeof v === 'number' && v > 0));

    const totalStats = sumStats(statsArray);
    console.log(`[BiS ${phaseKey}] Total stats:`, totalStats);
    bisStatsCache[cacheKey] = totalStats;
    return totalStats;
}

// Get status based on stat comparison to BiS
function getStatStatus(userValue, bisValue, prevBisValue) {
    if (bisValue === 0) return { status: '-', class: 'text-terminal-dim' };

    const percent = (userValue / bisValue) * 100;

    if (percent >= 100) {
        return { status: 'BiS', class: 'text-wow-legendary' };
    } else if (percent >= 90) {
        return { status: 'GOOD', class: 'text-terminal-accent' };
    } else if (prevBisValue && userValue >= prevBisValue * 0.8) {
        return { status: 'PREPARED', class: 'text-yellow-400' };
    } else {
        return { status: 'LOW', class: 'text-red-400' };
    }
}

// Get overall readiness status
function getOverallStatus(userStats, bisStats, prevBisStats) {
    // Include both melee and caster stats - only count ones where BiS > 0
    const keyStats = ['stamina', 'hit', 'crit', 'attackpower', 'spelldamage', 'spellhit', 'spellcrit', 'healing', 'defense', 'mp5'];
    let bisCount = 0, goodCount = 0, preparedCount = 0, totalRelevant = 0;

    for (const stat of keyStats) {
        if (bisStats[stat] > 0) {
            totalRelevant++;
            const percent = (userStats[stat] / bisStats[stat]) * 100;
            if (percent >= 100) bisCount++;
            else if (percent >= 90) goodCount++;
            else if (prevBisStats && userStats[stat] >= prevBisStats[stat] * 0.8) preparedCount++;
        }
    }

    if (totalRelevant === 0) return { status: 'NO DATA', class: 'text-terminal-dim' };
    if (bisCount === totalRelevant) return { status: 'BiS', class: 'text-wow-legendary' };
    if (bisCount + goodCount >= totalRelevant * 0.8) return { status: 'GOOD', class: 'text-terminal-accent' };
    if (bisCount + goodCount + preparedCount >= totalRelevant * 0.6) return { status: 'PREPARED', class: 'text-yellow-400' };
    return { status: 'UNDERGEARED', class: 'text-red-400' };
}

// Get role for a spec
function getSpecRole(specName) {
    const lower = specName?.toLowerCase() || '';
    return SPEC_ROLES[lower] || 'caster_dps'; // Default to caster
}

// Check user stats against raid thresholds
function checkRaidThresholds(userStats, role, phaseKey) {
    const thresholds = RAID_THRESHOLDS[role]?.[phaseKey];
    if (!thresholds) return { passed: [], failed: [], label: 'Unknown' };

    const results = { passed: [], failed: [], label: thresholds.label };

    for (const [stat, minValue] of Object.entries(thresholds)) {
        if (stat === 'label') continue;

        const userValue = userStats[stat] || 0;
        const statLabels = {
            hit: 'Hit Rating', spellhit: 'Spell Hit', spelldamage: 'Spell Damage', stamina: 'Stamina',
            healing: 'Healing', mp5: 'MP5', attackpower: 'Attack Power',
            crit: 'Crit %', defense: 'Defense', armor: 'Armor', dodge: 'Dodge %'
        };

        const entry = {
            stat,
            label: statLabels[stat] || stat,
            current: userValue,
            required: minValue,
            diff: userValue - minValue
        };

        if (userValue >= minValue) {
            results.passed.push(entry);
        } else {
            results.failed.push(entry);
        }
    }

    return results;
}

// Compare user items to BiS list by slot
function compareItemsToBis(userItemNames, bisList) {
    const results = {};
    const usedUserItems = new Set(); // Track which user items have been matched

    // Build BiS lookup by slot (keep RING 1, RING 2, etc. separate)
    const bisBySlot = {};
    for (const [slot, itemName, source] of bisList) {
        if (!bisBySlot[slot]) bisBySlot[slot] = [];
        bisBySlot[slot].push({
            name: cleanItemName(itemName),
            source,
            rating: getRatingWeight(itemName)
        });
    }

    // Check each BiS slot
    for (const [slot, bisItems] of Object.entries(bisBySlot)) {
        const bestBis = bisItems.find(i => i.rating >= 1) || bisItems[0];

        // Find if user has any item for this slot (that hasn't been used yet)
        let userMatch = null;
        let matchType = 'MISSING';

        for (const userName of userItemNames) {
            if (usedUserItems.has(userName.toLowerCase())) continue; // Skip already matched items

            const cleanUser = userName.toLowerCase().trim();

            // Check if user item matches any BiS item for this slot
            for (const bisItem of bisItems) {
                const cleanBis = bisItem.name.toLowerCase();
                if (cleanUser === cleanBis || cleanUser.includes(cleanBis) || cleanBis.includes(cleanUser)) {
                    userMatch = userName;
                    usedUserItems.add(userName.toLowerCase());
                    if (bisItem.rating >= 1) {
                        matchType = 'BiS';
                    } else if (bisItem.rating >= 0.7) {
                        matchType = 'GOOD';
                    } else {
                        matchType = 'OK';
                    }
                    break;
                }
            }
            if (userMatch) break;
        }

        // Display slot name without number for cleaner UI
        const displaySlot = slot.replace(/\s*\d+$/, '');
        results[slot] = {
            displaySlot,
            userItem: userMatch,
            bisItem: bestBis?.name || 'Unknown',
            bisSource: bestBis?.source || '',
            status: matchType
        };
    }

    return results;
}

// Parse gear list and match against BiS
function parseAndMatchGear(gearText, bisList) {
    const lines = gearText.split('\n').map(l => l.trim()).filter(l => l);
    const results = [];

    for (const line of lines) {
        const itemId = findItemId(line);
        let bisMatch = null;
        let slot = null;
        let rating = null;

        // Check if this item is in the BiS list
        for (const bisEntry of bisList) {
            const [bisSlot, bisItemName, bisSource] = bisEntry;
            const cleanBisName = cleanItemName(bisItemName);
            if (cleanBisName.toLowerCase() === line.toLowerCase() ||
                cleanBisName.toLowerCase().includes(line.toLowerCase()) ||
                line.toLowerCase().includes(cleanBisName.toLowerCase())) {
                bisMatch = bisEntry;
                slot = bisSlot;
                rating = getRatingWeight(bisItemName);
                break;
            }
        }

        results.push({
            input: line,
            itemId,
            found: !!itemId,
            bisMatch,
            slot,
            rating: rating || (itemId ? 0.3 : 0) // Recognized items get some credit
        });
    }

    return results;
}

// Stat requirements for raids (unbuffed minimums)
const RAID_REQUIREMENTS = {
    karazhan: {
        tank: { stamina: 400, defense: 490, armor: 12000 },
        melee: { stamina: 250, hit: 95, attackpower: 1400, crit: 20 },
        caster: { stamina: 200, spellhit: 76, spelldamage: 700, intellect: 300 },
        healer: { stamina: 200, healing: 1000, mp5: 50, intellect: 350 }
    },
    gruul: {
        tank: { stamina: 500, defense: 490, armor: 14000 },
        melee: { stamina: 300, hit: 142, attackpower: 1600, crit: 22 },
        caster: { stamina: 250, spellhit: 126, spelldamage: 900, intellect: 350 },
        healer: { stamina: 250, healing: 1200, mp5: 70, intellect: 400 }
    },
    ssc_tk: {
        tank: { stamina: 600, defense: 490, armor: 16000 },
        melee: { stamina: 350, hit: 142, attackpower: 1800, crit: 25 },
        caster: { stamina: 300, spellhit: 126, spelldamage: 1100, intellect: 400 },
        healer: { stamina: 300, healing: 1500, mp5: 90, intellect: 450 }
    }
};

// Calculate readiness score based on BiS matches
function calculateGearReadiness(matchResults) {
    if (matchResults.length === 0) return 0;

    // Count BiS matches by slot
    const slotsFilled = {};

    for (const result of matchResults) {
        if (result.slot && result.rating) {
            // Take the best rating for each slot
            if (!slotsFilled[result.slot] || slotsFilled[result.slot] < result.rating) {
                slotsFilled[result.slot] = result.rating;
            }
        }
    }

    // Calculate score based on slots filled
    const filledSlots = Object.keys(slotsFilled).length;
    const totalSlots = 15; // Approximate total gear slots
    const avgRating = filledSlots > 0 ? Object.values(slotsFilled).reduce((a, b) => a + b, 0) / filledSlots : 0;

    // Score = coverage * quality
    const coverage = Math.min(filledSlots / totalSlots, 1);
    return Math.round(coverage * avgRating * 100);
}

// Parse stats from Wowhead tooltip HTML - OPTIMIZED single-pass DFA-style
function parseTooltipStats(tooltipHtml) {
    const stats = {
        stamina: 0, intellect: 0, strength: 0, agility: 0, spirit: 0,
        armor: 0, defense: 0, dodge: 0, parry: 0, block: 0,
        hit: 0, crit: 0, haste: 0, expertise: 0, attackpower: 0, armorpen: 0,
        spellhit: 0, spellcrit: 0, spellhaste: 0, spelldamage: 0, healing: 0, mp5: 0
    };
    if (!tooltipHtml) return stats;

    // Strip HTML tags and decode entities to get plain text
    const text = tooltipHtml
        .replace(/<[^>]+>/g, ' ')  // Remove HTML tags
        .replace(/&nbsp;/g, ' ')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/Socket Bonus:.*?(?=Durability|Requires|Equip:|$)/gi, '')  // Remove socket bonus
        .replace(/\s+/g, ' ');     // Normalize whitespace

    console.log('[TEXT]', text.substring(0, 300));

    // Simple patterns for plain text
    const patterns = [
        [/\+(\d+)\s+Stamina/gi, 'stamina'],
        [/\+(\d+)\s+Intellect/gi, 'intellect'],
        [/\+(\d+)\s+Strength/gi, 'strength'],
        [/\+(\d+)\s+Agility/gi, 'agility'],
        [/\+(\d+)\s+Spirit/gi, 'spirit'],
        [/\+(\d+)\s+Hit Rating/gi, 'hit'],
        [/\+(\d+)\s+Critical Strike Rating/gi, 'crit'],
        [/\+(\d+)\s+Haste Rating/gi, 'haste'],
        [/\+(\d+)\s+Expertise Rating/gi, 'expertise'],
        [/\+(\d+)\s+Attack Power/gi, 'attackpower'],
        [/\+(\d+)\s+Armor Penetration/gi, 'armorpen'],
        [/\+(\d+)\s+Defense Rating/gi, 'defense'],
        [/\+(\d+)\s+Dodge Rating/gi, 'dodge'],
        [/\+(\d+)\s+Parry Rating/gi, 'parry'],
        [/\+(\d+)\s+Block Rating/gi, 'block'],
        [/(\d+)\s+Armor/gi, 'armor'],
        // Equip effects
        [/spell hit rating by (\d+)/gi, 'spellhit'],
        [/spell critical strike rating by (\d+)/gi, 'spellcrit'],
        [/spell haste rating by (\d+)/gi, 'spellhaste'],
        [/healing done by up to (\d+)/gi, 'healing'],
        [/healing done by spells by up to (\d+)/gi, 'healing'],
        [/damage and healing[^0-9]+by (?:up to )?(\d+)/gi, 'spelldamage'],
        [/spell power by (\d+)/gi, 'spelldamage'],
        [/hit rating by (\d+)/gi, 'hit'],
        [/critical strike rating by (\d+)/gi, 'crit'],
        [/haste rating by (\d+)/gi, 'haste'],
        [/attack power by (\d+)/gi, 'attackpower'],
        [/(\d+) mana per 5/gi, 'mp5'],
    ];

    // Apply all patterns and SUM the values (not replace)
    for (const [pattern, statKey] of patterns) {
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const val = parseInt(match[1], 10);
            if (val > 0) {
                stats[statKey] += val;
            }
        }
    }

    // Debug output
    const nonZero = Object.entries(stats).filter(([k,v]) => v > 0);
    console.log('[PARSED]', nonZero.length > 0 ? Object.fromEntries(nonZero) : 'NONE');

    return stats;
}

// Sum stats from multiple items
function sumStats(statsArray) {
    const total = {
        stamina: 0, intellect: 0, strength: 0, agility: 0, spirit: 0,
        armor: 0, defense: 0, dodge: 0, parry: 0, block: 0,
        hit: 0, crit: 0, haste: 0, expertise: 0, attackpower: 0, armorpen: 0,
        spellhit: 0, spellcrit: 0, spellhaste: 0, spelldamage: 0, healing: 0, mp5: 0
    };
    for (const stats of statsArray) {
        for (const key in total) {
            total[key] += stats[key] || 0;
        }
    }
    return total;
}

// Global cache for fetched item stats
let fetchedItemStats = {};
let tooltipFetchInProgress = false;
let preloadContainer = null;

// OUR OWN tooltip cache - populated by XHR/JSONP intercept
let capturedTooltips = {};

// Helper to extract tooltip from response text
function extractTooltipFromResponse(text, itemIdHint) {
    // Try to find tooltip_enus in the response
    const tooltipMatch = text.match(/"tooltip_enus"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    if (tooltipMatch) {
        // Try to find item ID near the tooltip
        const idMatch = text.match(/["\[](\d{4,6})["\]]/);
        const itemId = idMatch ? idMatch[1] : itemIdHint;
        if (itemId) {
            const tooltip = tooltipMatch[1]
                .replace(/\\"/g, '"')
                .replace(/\\n/g, '\n')
                .replace(/\\\\/g, '\\')
                .replace(/\\u003c/g, '<')
                .replace(/\\u003e/g, '>')
                .replace(/\\u0026/g, '&');
            capturedTooltips[itemId] = tooltip;
            console.log('[CAPTURED]', itemId, tooltip.substring(0, 80));
            return true;
        }
    }
    return false;
}

// Intercept XMLHttpRequest to capture Wowhead tooltip responses
(function() {
    const origOpen = XMLHttpRequest.prototype.open;
    const origSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function(method, url) {
        this._whUrl = url;
        return origOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function() {
        const xhr = this;
        const url = xhr._whUrl || '';

        // Check if this is a Wowhead request
        if (url.includes('wowhead.com')) {
            console.log('[XHR]', url);
            xhr.addEventListener('load', function() {
                try {
                    const text = xhr.responseText;
                    console.log('[XHR RESPONSE]', url, text.substring(0, 200));

                    // Extract item ID from URL if present
                    const idMatch = url.match(/item[=\/](\d+)/);
                    extractTooltipFromResponse(text, idMatch ? idMatch[1] : null);
                } catch(e) {
                    console.log('[XHR ERROR]', e);
                }
            });
        }
        return origSend.apply(this, arguments);
    };
})();

// Also intercept fetch API
(function() {
    const origFetch = window.fetch;
    window.fetch = function(url, options) {
        const urlStr = typeof url === 'string' ? url : url.url || '';

        if (urlStr.includes('wowhead.com')) {
            console.log('[FETCH API]', urlStr);
            return origFetch.apply(this, arguments).then(response => {
                const clone = response.clone();
                clone.text().then(text => {
                    console.log('[FETCH RESPONSE]', urlStr, text.substring(0, 200));
                    const idMatch = urlStr.match(/item[=\/](\d+)/);
                    extractTooltipFromResponse(text, idMatch ? idMatch[1] : null);
                });
                return response;
            });
        }
        return origFetch.apply(this, arguments);
    };
})();

// Watch for JSONP script insertions and intercept Wowhead callbacks
(function() {
    // Monitor script insertions
    const observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.tagName === 'SCRIPT' && node.src && node.src.includes('wowhead.com')) {
                    console.log('[SCRIPT ADDED]', node.src);
                }
            }
        }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    // Intercept $WowheadPower methods when it becomes available
    function hookWowhead() {
        if (typeof $WowheadPower === 'undefined') {
            setTimeout(hookWowhead, 100);
            return;
        }

        console.log('[WOWHEAD] Hooking $WowheadPower, methods:', Object.keys($WowheadPower));

        // Try to find and hook the item registration function
        const checkObj = obj => {
            if (!obj || typeof obj !== 'object') return;
            for (const key of Object.keys(obj)) {
                if (typeof obj[key] === 'function' && (key.includes('register') || key.includes('item') || key.includes('tooltip'))) {
                    const orig = obj[key];
                    obj[key] = function() {
                        console.log('[WOWHEAD CALL]', key, arguments);
                        return orig.apply(this, arguments);
                    };
                }
            }
        };

        checkObj($WowheadPower);
        if (typeof WH !== 'undefined') checkObj(WH);
    }

    hookWowhead();
})();

// Get tooltip from our captured cache
function getTooltipFromCache(itemId) {
    return capturedTooltips[String(itemId)] || null;
}

// Direct fetch from Wowhead tooltip API
async function fetchTooltipDirect(itemId) {
    if (capturedTooltips[itemId]) {
        return capturedTooltips[itemId];
    }

    // Try multiple Wowhead API endpoints - TBC Classic uses dataEnv=5
    const endpoints = [
        `https://nether.wowhead.com/tooltip/item/${itemId}?dataEnv=5&locale=0`,
        `https://nether.wowhead.com/tooltip/item/${itemId}?dataEnv=4&locale=0`,
        `https://nether.wowhead.com/tbc/tooltip/item/${itemId}`,
        `https://tbc.wowhead.com/tooltip/item/${itemId}`
    ];

    for (const url of endpoints) {
        try {
            console.log('[FETCH TRYING]', url);
            const response = await fetch(url);
            console.log('[FETCH STATUS]', itemId, response.status);

            if (response.ok) {
                const data = await response.json();
                console.log('[FETCH DATA]', itemId, Object.keys(data));

                if (data.tooltip) {
                    capturedTooltips[itemId] = data.tooltip;
                    console.log('[FETCH OK]', itemId, data.tooltip.substring(0, 80));
                    return data.tooltip;
                }
            }
        } catch(e) {
            console.log('[FETCH ERROR]', url, e.message);
        }
    }

    return null;
}

// OPTIMIZED: Fetch ALL items directly from Wowhead API
async function fetchAllItemStats(itemIds) {
    console.log('[FETCH] fetchAllItemStats called with:', itemIds);
    if (tooltipFetchInProgress) {
        console.log('[FETCH] Already in progress, returning');
        return;
    }
    tooltipFetchInProgress = true;

    const statusDiv = document.getElementById('stats-status');
    const emptyStats = { stamina: 0, intellect: 0, strength: 0, agility: 0, spirit: 0, armor: 0, defense: 0, dodge: 0, parry: 0, block: 0, hit: 0, crit: 0, haste: 0, expertise: 0, attackpower: 0, armorpen: 0, spellhit: 0, spellcrit: 0, spellhaste: 0, spelldamage: 0, healing: 0, mp5: 0 };

    const toFetch = itemIds.filter(id => !fetchedItemStats[id]);
    console.log('[FETCH] Items to fetch (not cached):', toFetch);
    if (toFetch.length === 0) {
        if (statusDiv) statusDiv.innerHTML = '<span class="text-terminal-accent">Stats cached!</span>';
        tooltipFetchInProgress = false;
        return;
    }

    if (statusDiv) statusDiv.innerHTML = `<span class="text-yellow-400">Loading ${toFetch.length} items...</span>`;

    // Fetch all items in parallel using direct API
    let loaded = 0;
    const fetchPromises = toFetch.map(async (id) => {
        const tooltip = await fetchTooltipDirect(id);
        if (tooltip) {
            fetchedItemStats[id] = parseTooltipStats(tooltip);
            loaded++;
        } else {
            fetchedItemStats[id] = { ...emptyStats };
        }
        if (statusDiv) statusDiv.innerHTML = `<span class="text-yellow-400">Loading... ${loaded}/${toFetch.length}</span>`;
    });

    await Promise.all(fetchPromises);

    if (statusDiv) statusDiv.innerHTML = `<span class="text-terminal-accent">${loaded}/${toFetch.length} loaded</span>`;
    tooltipFetchInProgress = false;
}

// Update the stats display with phase-based BiS comparison
async function updateStatsDisplay(itemIdsList) {
    const statsDiv = document.getElementById('total-stats');
    const readinessDiv = document.getElementById('stat-readiness');
    if (!statsDiv) return;

    // If no itemIdsList provided, try to get from gear input
    if (!itemIdsList) {
        const gearText = document.getElementById('gear-input')?.value || '';
        const lines = gearText.split('\n').map(l => l.trim()).filter(l => l);
        itemIdsList = lines.map(l => findItemId(l)).filter(Boolean);
    }

    // Get stats from fetched cache
    const userItemStats = itemIdsList
        .map(id => fetchedItemStats[id])
        .filter(stats => stats && Object.values(stats).some(v => typeof v === 'number' && v > 0));

    if (userItemStats.length === 0) {
        statsDiv.innerHTML = '<span class="text-yellow-400">No stats loaded yet. Click Calculate Stats.</span>';
        if (readinessDiv) readinessDiv.innerHTML = '';
        return;
    }

    const userTotal = sumStats(userItemStats);

    // Get BiS stats for selected phase and previous phase
    const bisStats = await calculatePhaseBisStats(preRaidClass, preRaidSpecName, selectedPhase);
    const prevPhaseKey = String(Math.max(0, parseInt(selectedPhase) - 1));
    const prevBisStats = prevPhaseKey !== selectedPhase ? await calculatePhaseBisStats(preRaidClass, preRaidSpecName, prevPhaseKey) : null;

    // Key stats to display with comparison
    const statDefs = [
        { key: 'stamina', label: 'Stamina' },
        { key: 'intellect', label: 'Intellect' },
        { key: 'strength', label: 'Strength' },
        { key: 'agility', label: 'Agility' },
        { key: 'hit', label: 'Hit Rating' },
        { key: 'crit', label: 'Crit Rating' },
        { key: 'haste', label: 'Haste' },
        { key: 'expertise', label: 'Expertise' },
        { key: 'attackpower', label: 'Attack Power' },
        { key: 'armorpen', label: 'Armor Pen' },
        { key: 'spelldamage', label: 'Spell Damage' },
        { key: 'spellhit', label: 'Spell Hit' },
        { key: 'spellcrit', label: 'Spell Crit' },
        { key: 'healing', label: 'Healing' },
        { key: 'mp5', label: 'MP5' },
        { key: 'defense', label: 'Defense' },
        { key: 'dodge', label: 'Dodge' },
        { key: 'parry', label: 'Parry' },
        { key: 'armor', label: 'Armor' }
    ];

    // Filter to only show stats that are relevant (user has or BiS has)
    const relevantStats = statDefs.filter(s =>
        userTotal[s.key] > 0 || (bisStats && bisStats[s.key] > 0)
    );

    // Build stats comparison table
    let statsHtml = `<div class="space-y-1 text-xs">`;
    for (const s of relevantStats) {
        const userVal = userTotal[s.key] || 0;
        const bisVal = bisStats ? (bisStats[s.key] || 0) : 0;
        const prevVal = prevBisStats ? (prevBisStats[s.key] || 0) : 0;
        const status = getStatStatus(userVal, bisVal, prevVal);

        statsHtml += `
            <div class="flex items-center justify-between">
                <span class="text-terminal-dim">${s.label}:</span>
                <div class="flex items-center gap-2">
                    <span class="text-terminal-text">${userVal}</span>
                    ${bisVal > 0 ? `<span class="text-terminal-dim">/ ${bisVal}</span>` : ''}
                    <span class="${status.class} text-[10px] font-bold w-16 text-right">${status.status}</span>
                </div>
            </div>
        `;
    }
    statsHtml += `</div>`;
    statsDiv.innerHTML = statsHtml;

    // Calculate readiness using thresholds and slot comparison
    if (readinessDiv) {
        const phaseName = PHASES.find(p => p.key === selectedPhase)?.shortName || `Phase ${selectedPhase}`;
        const role = getSpecRole(preRaidSpecName);
        const thresholds = checkRaidThresholds(userTotal, role, selectedPhase);

        // Get user item names for slot comparison
        const gearText = document.getElementById('gear-input')?.value || '';
        const userItemNames = gearText.split('\n').map(l => l.trim()).filter(l => l);
        const bisList = getPhaseBisList(preRaidClass, preRaidSpecName, selectedPhase);
        const slotComparison = compareItemsToBis(userItemNames, bisList);

        // Determine overall status based on thresholds
        const allPassed = thresholds.failed.length === 0;
        const mostPassed = thresholds.failed.length <= 1;
        const overallStatus = allPassed ? { text: 'READY', class: 'text-terminal-accent' } :
                              mostPassed ? { text: 'ALMOST READY', class: 'text-yellow-400' } :
                              { text: 'NOT READY', class: 'text-red-400' };

        let readinessHtml = `
            <div class="mb-4">
                <div class="flex items-center justify-between mb-2">
                    <h4 class="text-terminal-text text-xs uppercase">${thresholds.label} Requirements</h4>
                    <span class="${overallStatus.class} text-sm font-bold">[${overallStatus.text}]</span>
                </div>

                <div class="space-y-1 text-xs mb-4">
        `;

        // Show passed thresholds
        for (const t of thresholds.passed) {
            readinessHtml += `
                <div class="flex items-center justify-between">
                    <span class="text-terminal-accent">✓ ${t.label}</span>
                    <span class="text-terminal-text">${t.current} / ${t.required}</span>
                </div>
            `;
        }

        // Show failed thresholds
        for (const t of thresholds.failed) {
            const needed = t.required - t.current;
            readinessHtml += `
                <div class="flex items-center justify-between">
                    <span class="text-red-400">✗ ${t.label}</span>
                    <span class="text-red-400">${t.current} / ${t.required} <span class="text-[10px]">(need ${needed})</span></span>
                </div>
            `;
        }

        readinessHtml += `
                </div>
            </div>
        `;

        // Slot-by-slot comparison
        const slotEntries = Object.entries(slotComparison);
        if (slotEntries.length > 0) {
            readinessHtml += `
                <div class="border-t border-terminal-dim/30 pt-3 mt-3">
                    <h5 class="text-terminal-dim text-[10px] uppercase mb-2">// Gear Slots</h5>
                    <div class="space-y-1 text-[10px] max-h-48 overflow-y-auto">
            `;

            for (const [slot, data] of slotEntries) {
                const statusColors = {
                    'BiS': 'text-wow-legendary',
                    'GOOD': 'text-terminal-accent',
                    'OK': 'text-yellow-400',
                    'MISSING': 'text-red-400'
                };
                const statusColor = statusColors[data.status] || 'text-terminal-dim';

                const slotLabel = data.displaySlot || slot;
                if (data.status === 'MISSING') {
                    readinessHtml += `
                        <div class="flex items-center justify-between gap-2">
                            <span class="text-terminal-dim w-16 flex-shrink-0">${slotLabel}</span>
                            <span class="text-red-400 flex-1 truncate">— Need: ${data.bisItem}</span>
                            <span class="${statusColor} font-bold w-14 text-right">[${data.status}]</span>
                        </div>
                    `;
                } else {
                    readinessHtml += `
                        <div class="flex items-center justify-between gap-2">
                            <span class="text-terminal-dim w-16 flex-shrink-0">${slotLabel}</span>
                            <span class="text-terminal-text flex-1 truncate">${data.userItem || '—'}</span>
                            <span class="${statusColor} font-bold w-14 text-right">[${data.status}]</span>
                        </div>
                    `;
                }
            }

            readinessHtml += `
                    </div>
                </div>
            `;
        }

        readinessDiv.innerHTML = readinessHtml;
    }
}
// Detect role based on stats
function detectRole(stats) {
    if (stats.defense > 100 || stats.parry > 50 || stats.dodge > 50) return 'tank';
    if (stats.healing > stats.spelldamage && stats.healing > 0) return 'healer';
    if (stats.spelldamage > 200 || stats.spellhit > 50) return 'caster';
    return 'melee';
}

// Update gear preview with Wowhead tooltips
async function updateGearPreview() {
    const previewDiv = document.getElementById('gear-preview');
    if (!previewDiv) return;

    const gearText = document.getElementById('gear-input')?.value || '';
    preRaidGearText = gearText;

    if (!gearText.trim()) {
        previewDiv.innerHTML = '<span class="text-terminal-dim">Items will appear here as you type...</span>';
        return;
    }

    const bisList = getPreRaidBisList(preRaidClass, preRaidSpecName);
    const matchResults = parseAndMatchGear(gearText, bisList);

    // Find items not in local database and search Blizzard API
    const unknownItems = matchResults.filter(r => !r.itemId);
    if (unknownItems.length > 0) {
        // Show searching indicator
        const searchingHtml = matchResults.map(r => {
            if (r.itemId) {
                const bisTag = r.bisMatch ? `<span class="text-terminal-accent ml-2">[BiS${r.slot ? ' - ' + r.slot : ''}]</span>` : '';
                return `<div class="py-1"><a href="https://tbc.wowhead.com/item=${r.itemId}" data-wowhead="item=${r.itemId}" class="text-wow-uncommon hover:text-terminal-text">${r.input}</a>${bisTag}</div>`;
            }
            return `<div class="py-1"><span class="text-yellow-400">${r.input}</span> <span class="text-terminal-dim">(searching...)</span></div>`;
        }).join('');
        previewDiv.innerHTML = searchingHtml;

        // Search for unknown items via Blizzard API
        await Promise.all(unknownItems.map(async (r) => {
            const result = await searchItemByName(r.input);
            if (result && result.id) {
                r.itemId = result.id;
                r.found = true;
                r.fromBlizzard = true;
            }
        }));
    }

    // Build final preview HTML
    const previewHtml = matchResults.map(r => {
        if (r.itemId) {
            const bisTag = r.bisMatch ? `<span class="text-terminal-accent ml-2">[BiS${r.slot ? ' - ' + r.slot : ''}]</span>` : '';
            const foundTag = r.fromBlizzard ? `<span class="text-blue-400 ml-2">[Found]</span>` : '';
            return `<div class="py-1"><a href="https://tbc.wowhead.com/item=${r.itemId}" data-wowhead="item=${r.itemId}" class="text-wow-uncommon hover:text-terminal-text">${r.input}</a>${bisTag}${foundTag}</div>`;
        }
        return `<div class="py-1"><span class="text-red-400">${r.input}</span> <span class="text-terminal-dim">(not found)</span></div>`;
    }).join('');

    previewDiv.innerHTML = previewHtml || '<span class="text-terminal-dim">No items entered</span>';

    // Refresh Wowhead tooltips
    if (typeof $WowheadPower !== 'undefined' && $WowheadPower.refreshLinks) {
        $WowheadPower.refreshLinks();
    }
}

function renderPreRaidChecker() {
    currentClass = null;
    document.querySelectorAll('.class-list li').forEach(li => li.classList.remove('active'));
    const preRaidLink = document.querySelector('.class-list li[data-view="raidready"]');
    if (preRaidLink) preRaidLink.classList.add('active');

    // Get available classes and specs
    const classes = Object.keys(classData);
    if (!preRaidClass || !classData[preRaidClass]) {
        preRaidClass = classes[0] || 'warrior';
    }
    const specs = classData[preRaidClass]?.specs ? Object.keys(classData[preRaidClass].specs) : [];
    if (!preRaidSpecName || !specs.includes(preRaidSpecName)) {
        preRaidSpecName = classData[preRaidClass]?.defaultSpec || specs[0];
    }

    const phaseName = PHASES.find(p => p.key === selectedPhase)?.name || 'Phase 1';

    const html = `
        <div class="command-line text-terminal-dim my-5 md:text-[11px] md:my-3 sm:text-[10px]">./gear-checker --class=${preRaidClass} --spec=${preRaidSpecName} --phase=${selectedPhase}</div>
        <h2 class="text-terminal-accent text-lg mb-2 uppercase tracking-wide md:text-base sm:text-sm">⚖️ [ GEAR CHECKER ]</h2>
        <p class="text-terminal-dim text-xs mb-6 md:mb-4 sm:mb-3">Paste your gear list to compare against BiS for any raid tier</p>

        <div class="grid grid-cols-3 gap-4 mb-6 md:grid-cols-1">
            <div>
                <label class="text-terminal-dim text-xs block mb-2">🎭 CLASS</label>
                <select id="raidready-class" class="w-full bg-terminal-bg border border-terminal-text text-terminal-text px-3 py-2 text-xs font-mono cursor-pointer">
                    ${classes.map(c => `<option value="${c}" ${c === preRaidClass ? 'selected' : ''}>${classData[c]?.title || c}</option>`).join('')}
                </select>
            </div>
            <div>
                <label class="text-terminal-dim text-xs block mb-2">🎯 SPEC</label>
                <select id="raidready-spec" class="w-full bg-terminal-bg border border-terminal-text text-terminal-text px-3 py-2 text-xs font-mono cursor-pointer">
                    ${specs.map(s => `<option value="${s}" ${s === preRaidSpecName ? 'selected' : ''}>${classData[preRaidClass]?.specs[s]?.title || s}</option>`).join('')}
                </select>
            </div>
            <div>
                <label class="text-terminal-dim text-xs block mb-2">🏰 READY FOR</label>
                <select id="phase-select" class="w-full bg-terminal-bg border border-terminal-accent text-terminal-accent px-3 py-2 text-xs font-mono cursor-pointer">
                    ${PHASES.map(p => `<option value="${p.key}" ${p.key === selectedPhase ? 'selected' : ''}>${p.name}</option>`).join('')}
                </select>
            </div>
        </div>

        <div class="mb-4">
            <label class="text-terminal-dim text-xs block mb-2">📋 PASTE YOUR GEAR <span class="text-terminal-accent">(one item per line)</span></label>
            <textarea id="gear-input" class="w-full bg-terminal-bg border border-terminal-text text-terminal-text px-3 py-2 text-xs font-mono h-40 resize-y" placeholder="Overlord's Helmet of Second Sight
Choker of Vile Intent
Wastewalker Shoulderpads
...">${preRaidGearText}</textarea>
        </div>

        <div class="mb-4">
            <label class="text-terminal-dim text-xs block mb-2">✅ RECOGNIZED ITEMS</label>
            <div id="gear-preview" class="border border-terminal-dim/50 p-3 min-h-[60px] text-xs max-h-60 overflow-y-auto">
                <span class="text-terminal-dim">Items will appear here as you type...</span>
            </div>
        </div>

        <div class="mb-6">
            <button id="fetch-stats-btn" class="bg-terminal-accent text-terminal-bg px-6 py-2 font-mono text-xs font-bold cursor-pointer hover:bg-terminal-text transition-colors">
                [ CALCULATE STATS ]
            </button>
            <span id="stats-status" class="ml-3 text-xs"></span>
        </div>

        <div class="grid grid-cols-2 gap-4 mb-6 md:grid-cols-1">
            <div class="border border-terminal-dim/50 p-4">
                <h4 class="text-terminal-text text-xs uppercase mb-3">📊 // Total Gear Stats</h4>
                <div id="total-stats">
                    <span class="text-terminal-dim text-xs">Click "Calculate Stats" to fetch item stats from Wowhead</span>
                </div>
            </div>
            <div class="border border-terminal-dim/50 p-4">
                <div id="stat-readiness">
                    <span class="text-terminal-dim text-xs">Raid readiness will appear after stats are calculated</span>
                </div>
            </div>
        </div>
    `;

    const mainContent = document.getElementById('main-content');
    mainContent.style.opacity = '0.3';
    setTimeout(() => {
        mainContent.innerHTML = html;
        mainContent.style.opacity = '1';

        // Class selector change
        document.getElementById('raidready-class').addEventListener('change', (e) => {
            preRaidClass = e.target.value;
            preRaidSpecName = classData[preRaidClass]?.defaultSpec || Object.keys(classData[preRaidClass]?.specs || {})[0];
            renderPreRaidChecker();
        });

        // Spec selector change
        document.getElementById('raidready-spec').addEventListener('change', (e) => {
            preRaidSpecName = e.target.value;
            bisStatsCache = {}; // Clear cache when spec changes
            updateGearPreview();
            // Update stats display if we have fetched data
            updateStatsDisplay();
        });

        // Phase selector change
        document.getElementById('phase-select').addEventListener('change', (e) => {
            selectedPhase = e.target.value;
            bisStatsCache = {}; // Clear cache when phase changes
            // Recalculate stats display
            updateStatsDisplay();
        });

        // Calculate stats button - fetches from Wowhead dynamically
        document.getElementById('fetch-stats-btn').addEventListener('click', async () => {
            console.log('[BUTTON] Calculate Stats clicked!');
            const gearText = document.getElementById('gear-input')?.value || '';
            const lines = gearText.split('\n').map(l => l.trim()).filter(l => l);
            console.log('[BUTTON] Lines:', lines);
            const itemIdsList = [];

            for (const line of lines) {
                const itemId = findItemId(line);
                console.log('[BUTTON] Item:', line, '-> ID:', itemId);
                if (itemId) itemIdsList.push(itemId);
            }

            console.log('[BUTTON] Item IDs to fetch:', itemIdsList);

            if (itemIdsList.length > 0) {
                // Clear BiS cache to force recalculation
                bisStatsCache = {};
                // Fetch item stats from Wowhead
                await fetchAllItemStats(itemIdsList);
                // Now display
                updateStatsDisplay(itemIdsList);
            } else {
                const statusDiv = document.getElementById('stats-status');
                if (statusDiv) statusDiv.innerHTML = '<span class="text-red-400">No valid items found</span>';
            }
        });

        // Gear input with debounce
        document.getElementById('gear-input').addEventListener('input', () => {
            clearTimeout(preRaidDebounceTimer);
            preRaidDebounceTimer = setTimeout(updateGearPreview, 300);
        });

        // Initial preview if there's existing text
        if (preRaidGearText) {
            updateGearPreview();
        }
    }, FADE_TRANSITION_MS);
}

// ===== HEROIC DUNGEONS GUIDE =====
let currentHeroicZone = 'hellfire';

function renderHeroicsContent(zone = 'hellfire') {
    currentClass = null;
    currentHeroicZone = zone;
    document.querySelectorAll('.class-list li').forEach(li => li.classList.remove('active'));
    const heroicsLink = document.querySelector('.nav-link[data-view="heroics"]');
    if (heroicsLink) heroicsLink.parentElement.classList.add('active');

    const zoneButtons = Object.entries(heroicsData).map(([key, z]) =>
        `<a href="#heroics/${key}" class="heroic-zone-btn ${key === zone ? 'bg-terminal-accent text-terminal-bg' : 'bg-transparent text-terminal-accent'} border border-terminal-accent px-3 py-2 cursor-pointer font-mono text-xs transition-all select-none hover:bg-terminal-accent hover:text-terminal-bg no-underline md:px-2.5 md:py-1.5 md:text-[11px] sm:px-2 sm:py-1 sm:text-[10px]" data-zone="${key}">${z.name}</a>`
    ).join('');

    const zoneData = heroicsData[zone];
    const dungeonsHtml = zoneData.dungeons.map(d => {
        const difficultyColor = {
            'Easy': 'text-green-400',
            'Medium': 'text-yellow-400',
            'Hard': 'text-orange-400',
            'Very Hard': 'text-red-400'
        }[d.difficulty] || 'text-terminal-dim';

        return `
            <div class="border border-terminal-dim p-4 mb-4 md:p-3 sm:p-2.5">
                <div class="flex justify-between items-start mb-2 flex-wrap gap-2">
                    <h4 class="text-terminal-text text-sm font-semibold md:text-xs">${d.name}</h4>
                    <span class="${difficultyColor} text-xs">[${d.difficulty}]</span>
                </div>
                <div class="text-terminal-dim text-xs mb-3 md:text-[11px] sm:text-[10px]">
                    <span class="text-terminal-accent">Bosses:</span> ${d.bosses.join(' → ')}
                </div>
                <div class="bg-terminal-bg/50 border border-terminal-dim/50 p-2 text-xs text-terminal-dim md:text-[11px] sm:text-[10px]">
                    <span class="text-yellow-400">💡 Tips:</span> ${d.tips}
                </div>
            </div>
        `;
    }).join('');

    const html = `
        <div class="command-line text-terminal-dim my-5 md:text-[11px] md:my-3 sm:text-[10px]">./heroic-guide --zone=${zone}</div>
        <h2 class="text-terminal-accent text-lg mb-2 uppercase tracking-wide md:text-base sm:text-sm">⚔️ [ HEROIC DUNGEONS GUIDE ]</h2>
        <p class="text-terminal-dim text-xs mb-6 md:mb-4 sm:mb-3">TBC Heroic dungeon strategies and key requirements</p>

        <h3 class="text-terminal-text text-sm my-4 uppercase md:text-[13px] md:my-3 sm:text-xs">🗝️ [ ZONE SELECT ]</h3>
        <div class="flex flex-wrap gap-2 mb-6 md:gap-1.5 md:mb-4">${zoneButtons}</div>

        <div class="border border-terminal-accent/50 bg-terminal-bg/30 p-4 mb-6 md:p-3 md:mb-4 sm:p-2.5">
            <h3 class="text-terminal-accent text-sm mb-2 md:text-xs">${zoneData.name}</h3>
            <div class="grid grid-cols-2 gap-4 text-xs md:grid-cols-1 md:gap-2 md:text-[11px] sm:text-[10px]">
                <div><span class="text-terminal-dim">Key:</span> <span class="text-terminal-text">${zoneData.key}</span></div>
                <div><span class="text-terminal-dim">Faction:</span> <span class="text-terminal-text">${zoneData.faction}</span></div>
                <div><span class="text-terminal-dim">Rep Required:</span> <span class="text-yellow-400">${zoneData.repRequired}</span></div>
            </div>
        </div>

        <h3 class="text-terminal-text text-sm my-4 uppercase md:text-[13px] md:my-3 sm:text-xs">🏰 [ DUNGEONS ]</h3>
        ${dungeonsHtml}
    `;

    const mainContent = document.getElementById('main-content');
    mainContent.style.opacity = '0.3';
    setTimeout(() => {
        mainContent.innerHTML = html;
        mainContent.style.opacity = '1';
        // Zone button listeners
        document.querySelectorAll('.heroic-zone-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                if (e.ctrlKey || e.metaKey || e.button === 1) return;
                e.preventDefault();
                window.location.hash = this.getAttribute('href');
            });
        });
    }, FADE_TRANSITION_MS);
}

// ===== REPUTATION TRACKER =====
function renderReputationTracker() {
    currentClass = null;
    document.querySelectorAll('.class-list li').forEach(li => li.classList.remove('active'));
    const repLink = document.querySelector('.nav-link[data-view="reputation"]');
    if (repLink) repLink.parentElement.classList.add('active');

    const repProgress = loadRepProgress();

    const factionsHtml = factionsData.factions.map(faction => {
        const currentStanding = repProgress[faction.id] || 'neutral';
        const standingIndex = factionsData.standings.findIndex(s => s.id === currentStanding);
        const standingData = factionsData.standings[standingIndex] || factionsData.standings[3]; // Default neutral

        const standingColors = {
            'hated': 'text-red-600',
            'hostile': 'text-red-500',
            'unfriendly': 'text-red-400',
            'neutral': 'text-yellow-400',
            'friendly': 'text-green-400',
            'honored': 'text-green-500',
            'revered': 'text-blue-400',
            'exalted': 'text-purple-400'
        };

        const progressPercent = Math.max(0, ((standingIndex + 1) / factionsData.standings.length) * 100);

        const selectOptions = factionsData.standings.map(s =>
            `<option value="${s.id}" ${s.id === currentStanding ? 'selected' : ''}>${s.name}</option>`
        ).join('');

        let factionNote = '';
        if (faction.alliance) factionNote = '<span class="text-blue-400 text-[10px]">[A]</span>';
        if (faction.horde) factionNote = '<span class="text-red-400 text-[10px]">[H]</span>';
        if (faction.exclusive) factionNote = '<span class="text-yellow-400 text-[10px]">[Exclusive]</span>';

        return `
            <div class="border border-terminal-dim p-3 md:p-2.5 sm:p-2">
                <div class="flex justify-between items-center mb-2 flex-wrap gap-2">
                    <span class="text-terminal-text text-xs font-semibold md:text-[11px]">${faction.name} ${factionNote}</span>
                    <select class="rep-select bg-terminal-bg border border-terminal-dim ${standingColors[currentStanding]} px-2 py-1 text-xs font-mono cursor-pointer md:text-[11px] sm:text-[10px]" data-faction="${faction.id}">
                        ${selectOptions}
                    </select>
                </div>
                <div class="progress-bar-bg">
                    <div class="progress-bar-fill" style="width: ${progressPercent}%; background: ${standingIndex >= 5 ? '#1eff00' : standingIndex >= 3 ? '#facc15' : '#f87171'}"></div>
                </div>
            </div>
        `;
    }).join('');

    const html = `
        <div class="command-line text-terminal-dim my-5 md:text-[11px] md:my-3 sm:text-[10px]">./rep-tracker --show-all</div>
        <h2 class="text-terminal-accent text-lg mb-2 uppercase tracking-wide md:text-base sm:text-sm">🏆 [ REPUTATION TRACKER ]</h2>
        <p class="text-terminal-dim text-xs mb-6 md:mb-4 sm:mb-3">Track your TBC faction standings. Progress is saved locally.</p>

        <div class="flex justify-between items-center mb-4">
            <h3 class="text-terminal-text text-sm uppercase md:text-[13px] sm:text-xs">📊 [ FACTIONS ]</h3>
            <button onclick="if(confirm('Reset all reputation progress?')) { localStorage.removeItem('${REP_STORAGE_KEY}'); renderReputationTracker(); }" class="text-xs text-terminal-dim hover:text-red-400 cursor-pointer bg-transparent border-none font-mono">[Reset All]</button>
        </div>

        <div class="grid grid-cols-2 gap-3 md:grid-cols-1 md:gap-2">
            ${factionsHtml}
        </div>

        <div class="mt-6 p-4 border border-terminal-dim/50 bg-terminal-bg/30 md:mt-4 md:p-3 sm:mt-3 sm:p-2.5">
            <h4 class="text-terminal-accent text-xs mb-2">💡 Key Reputation Notes</h4>
            <ul class="text-terminal-dim text-xs space-y-1 md:text-[11px] sm:text-[10px]">
                <li>• <span class="text-yellow-400">Honored</span> with dungeon factions unlocks Heroic keys</li>
                <li>• <span class="text-blue-400">Revered</span> with The Violet Eye unlocks Karazhan ring upgrades</li>
                <li>• <span class="text-purple-400">Exalted</span> with Netherwing unlocks Netherdrake mounts</li>
                <li>• Aldor and Scryers are mutually exclusive - choose wisely!</li>
            </ul>
        </div>
    `;

    const mainContent = document.getElementById('main-content');
    mainContent.style.opacity = '0.3';
    setTimeout(() => {
        mainContent.innerHTML = html;
        mainContent.style.opacity = '1';
        // Rep select listeners
        document.querySelectorAll('.rep-select').forEach(select => {
            select.addEventListener('change', function() {
                const factionId = this.getAttribute('data-faction');
                const newStanding = this.value;
                saveRepProgress(factionId, newStanding);
                renderReputationTracker();
            });
        });
    }, FADE_TRANSITION_MS);
}

// ===== RAID LOCKOUT TRACKER =====
function renderLockoutTracker() {
    currentClass = null;
    document.querySelectorAll('.class-list li').forEach(li => li.classList.remove('active'));
    const lockoutLink = document.querySelector('.nav-link[data-view="lockouts"]');
    if (lockoutLink) lockoutLink.parentElement.classList.add('active');

    // Check for expired lockouts
    const lockoutProgress = checkLockoutExpiry();

    const raidsHtml = lockoutsData.raids.map(raid => {
        const lockout = lockoutProgress[raid.id];
        const isLocked = lockout && lockout.locked;
        let timeRemaining = '';

        if (isLocked) {
            const expiryTime = lockout.timestamp + (raid.resetDays * 24 * 60 * 60 * 1000);
            const remaining = expiryTime - Date.now();
            if (remaining > 0) {
                const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
                const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
                timeRemaining = `${days}d ${hours}h`;
            }
        }

        return `
            <div class="border ${isLocked ? 'border-red-400/50 bg-red-400/5' : 'border-terminal-dim'} p-4 md:p-3 sm:p-2.5">
                <div class="flex justify-between items-center mb-2">
                    <div>
                        <span class="text-terminal-text text-sm font-semibold md:text-xs">${raid.name}</span>
                        <span class="text-terminal-dim text-xs ml-2 md:text-[11px]">(${raid.resetDays === 3 ? '3-day' : 'Weekly'})</span>
                    </div>
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" class="lockout-checkbox attunement-checkbox" data-raid="${raid.id}" ${isLocked ? 'checked' : ''}>
                        <span class="text-xs ${isLocked ? 'text-red-400' : 'text-green-400'} md:text-[11px]">${isLocked ? 'LOCKED' : 'AVAILABLE'}</span>
                    </label>
                </div>
                ${isLocked ? `<div class="text-terminal-dim text-xs md:text-[11px] sm:text-[10px]">Resets in: <span class="text-yellow-400">${timeRemaining}</span></div>` : ''}
            </div>
        `;
    }).join('');

    const html = `
        <div class="command-line text-terminal-dim my-5 md:text-[11px] md:my-3 sm:text-[10px]">./lockout-tracker --check-resets</div>
        <h2 class="text-terminal-accent text-lg mb-2 uppercase tracking-wide md:text-base sm:text-sm">🔒 [ RAID LOCKOUT TRACKER ]</h2>
        <p class="text-terminal-dim text-xs mb-6 md:mb-4 sm:mb-3">Track your weekly raid lockouts. Check a raid when you\'ve saved to it.</p>

        <div class="flex justify-between items-center mb-4">
            <h3 class="text-terminal-text text-sm uppercase md:text-[13px] sm:text-xs">🏰 [ RAID INSTANCES ]</h3>
            <button onclick="if(confirm('Clear all lockouts?')) { localStorage.removeItem('${LOCKOUT_STORAGE_KEY}'); renderLockoutTracker(); }" class="text-xs text-terminal-dim hover:text-red-400 cursor-pointer bg-transparent border-none font-mono">[Clear All]</button>
        </div>

        <div class="grid grid-cols-2 gap-3 md:grid-cols-1 md:gap-2">
            ${raidsHtml}
        </div>

        <div class="mt-6 p-4 border border-terminal-dim/50 bg-terminal-bg/30 md:mt-4 md:p-3 sm:mt-3 sm:p-2.5">
            <h4 class="text-terminal-accent text-xs mb-2">📅 Reset Schedule</h4>
            <ul class="text-terminal-dim text-xs space-y-1 md:text-[11px] sm:text-[10px]">
                <li>• <span class="text-terminal-text">Weekly raids</span> reset Tuesday (NA) / Wednesday (EU) at server reset</li>
                <li>• <span class="text-terminal-text">Zul'Aman</span> resets every 3 days</li>
                <li>• Lockouts are estimated based on when you checked the box</li>
            </ul>
        </div>
    `;

    const mainContent = document.getElementById('main-content');
    mainContent.style.opacity = '0.3';
    setTimeout(() => {
        mainContent.innerHTML = html;
        mainContent.style.opacity = '1';
        // Lockout checkbox listeners
        document.querySelectorAll('.lockout-checkbox').forEach(cb => {
            cb.addEventListener('change', function() {
                const raidId = this.getAttribute('data-raid');
                saveLockoutProgress(raidId, this.checked);
                renderLockoutTracker();
            });
        });
    }, FADE_TRANSITION_MS);
}

// ===== GUILD PROGRESS TRACKER =====
function renderGuildProgress() {
    currentClass = null;
    document.querySelectorAll('.class-list li').forEach(li => li.classList.remove('active'));
    const guildLink = document.querySelector('.nav-link[data-view="guildprogress"]');
    if (guildLink) guildLink.parentElement.classList.add('active');

    const guildProgress = loadGuildProgress();

    // Get all bosses from raidsData
    let allBosses = [];
    for (const [phaseKey, phaseData] of Object.entries(raidsData)) {
        for (const [raidKey, raid] of Object.entries(phaseData.raids)) {
            if (raid.bosses && raid.bosses.length > 0) {
                raid.bosses.forEach(boss => {
                    allBosses.push({
                        id: `${raidKey}-${boss.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
                        name: boss.name,
                        raid: raid.name,
                        phase: phaseData.name,
                        npcId: boss.npcId
                    });
                });
            }
        }
    }

    // Group bosses by raid
    const bossesByRaid = {};
    allBosses.forEach(boss => {
        if (!bossesByRaid[boss.raid]) {
            bossesByRaid[boss.raid] = { phase: boss.phase, bosses: [] };
        }
        bossesByRaid[boss.raid].bosses.push(boss);
    });

    const raidsHtml = Object.entries(bossesByRaid).map(([raidName, raidData]) => {
        const bossIds = raidData.bosses.map(b => b.id);
        const bossesHtml = raidData.bosses.map(boss => {
            const killCount = guildProgress[boss.id] || 0;
            return `
                <div class="flex items-center justify-between py-2 border-b border-terminal-dim/30 last:border-0">
                    <span class="text-terminal-text text-xs md:text-[11px]">${boss.name}</span>
                    <div class="flex items-center gap-2">
                        <button class="kill-decrement text-terminal-dim hover:text-red-400 px-2 py-0.5 text-xs border border-terminal-dim/50 hover:border-red-400" data-boss="${boss.id}">-</button>
                        <input type="text" class="kill-count-input bg-terminal-bg border border-terminal-dim text-terminal-accent text-center w-12 px-1 py-0.5 text-xs font-mono" data-boss="${boss.id}" value="${killCount}">
                        <button class="kill-increment text-terminal-dim hover:text-green-400 px-2 py-0.5 text-xs border border-terminal-dim/50 hover:border-green-400" data-boss="${boss.id}">+</button>
                    </div>
                </div>
            `;
        }).join('');

        const totalKills = raidData.bosses.reduce((sum, boss) => sum + (guildProgress[boss.id] || 0), 0);
        const clearedCount = raidData.bosses.filter(boss => (guildProgress[boss.id] || 0) > 0).length;

        return `
            <div class="border border-terminal-dim mb-4 md:mb-3">
                <div class="bg-terminal-dim/20 p-3 flex justify-between items-center flex-wrap gap-2 md:p-2.5 sm:p-2">
                    <div>
                        <span class="text-terminal-accent text-sm font-semibold md:text-xs">${raidName}</span>
                        <span class="text-terminal-dim text-xs ml-2 md:text-[11px]">${raidData.phase}</span>
                    </div>
                    <div class="flex items-center gap-3 md:gap-2">
                        <button class="full-clear-btn text-xs text-terminal-bg bg-terminal-accent hover:bg-terminal-text px-2 py-1 font-mono cursor-pointer transition-colors" data-bosses='${JSON.stringify(bossIds)}'>[+1 CLEAR]</button>
                        <span class="text-xs text-terminal-dim md:text-[11px]">
                            <span class="${clearedCount === raidData.bosses.length ? 'text-green-400' : ''}">${clearedCount}/${raidData.bosses.length}</span> |
                            <span class="text-terminal-accent">${totalKills}</span> kills
                        </span>
                    </div>
                </div>
                <div class="p-3 md:p-2.5 sm:p-2">
                    ${bossesHtml}
                </div>
            </div>
        `;
    }).join('');

    const totalAllKills = Object.values(guildProgress).reduce((sum, count) => sum + count, 0);

    const html = `
        <div class="command-line text-terminal-dim my-5 md:text-[11px] md:my-3 sm:text-[10px]">./guild-progress --show-kills</div>
        <h2 class="text-terminal-accent text-lg mb-2 uppercase tracking-wide md:text-base sm:text-sm">🎖️ [ GUILD PROGRESS TRACKER ]</h2>
        <p class="text-terminal-dim text-xs mb-2 md:mb-1.5 sm:mb-1">Track your guild's boss kill counts across all TBC raids.</p>
        <p class="text-terminal-accent text-sm mb-6 md:text-xs md:mb-4 sm:mb-3">Total Boss Kills: <span class="text-yellow-400">${totalAllKills}</span></p>

        <div class="flex justify-between items-center mb-4">
            <h3 class="text-terminal-text text-sm uppercase md:text-[13px] sm:text-xs">🏆 [ KILL COUNTERS ]</h3>
            <button onclick="if(confirm('Reset all guild progress?')) { localStorage.removeItem('${GUILD_PROGRESS_KEY}'); renderGuildProgress(); }" class="text-xs text-terminal-dim hover:text-red-400 cursor-pointer bg-transparent border-none font-mono">[Reset All]</button>
        </div>

        ${raidsHtml}
    `;

    const mainContent = document.getElementById('main-content');
    mainContent.style.opacity = '0.3';
    setTimeout(() => {
        mainContent.innerHTML = html;
        mainContent.style.opacity = '1';
        // Kill count input listeners
        document.querySelectorAll('.kill-count-input').forEach(input => {
            input.addEventListener('change', function() {
                const bossId = this.getAttribute('data-boss');
                const count = parseInt(this.value) || 0;
                saveGuildProgress(bossId, Math.max(0, count));
                renderGuildProgress();
            });
        });
        // Increment/decrement buttons
        document.querySelectorAll('.kill-increment').forEach(btn => {
            btn.addEventListener('click', function() {
                const bossId = this.getAttribute('data-boss');
                const current = guildProgress[bossId] || 0;
                saveGuildProgress(bossId, current + 1);
                renderGuildProgress();
            });
        });
        document.querySelectorAll('.kill-decrement').forEach(btn => {
            btn.addEventListener('click', function() {
                const bossId = this.getAttribute('data-boss');
                const current = guildProgress[bossId] || 0;
                saveGuildProgress(bossId, Math.max(0, current - 1));
                renderGuildProgress();
            });
        });
        // Full clear buttons - add +1 kill to all bosses in raid
        document.querySelectorAll('.full-clear-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const bossIds = JSON.parse(this.getAttribute('data-bosses'));
                bossIds.forEach(bossId => {
                    const current = guildProgress[bossId] || 0;
                    saveGuildProgress(bossId, current + 1);
                });
                renderGuildProgress();
            });
        });
    }, FADE_TRANSITION_MS);
}

// ===== CHARACTER IMPORT =====
const CHAR_IMPORT_KEY = 'tbctxt_character';
let importedCharacter = null;

function loadSavedCharacter() {
    try {
        const saved = localStorage.getItem(CHAR_IMPORT_KEY);
        return saved ? JSON.parse(saved) : null;
    } catch (e) {
        return null;
    }
}

function saveCharacter(charData) {
    try {
        localStorage.setItem(CHAR_IMPORT_KEY, JSON.stringify(charData));
        importedCharacter = charData;
    } catch (e) {
        console.error('Error saving character:', e);
    }
}

function parseGearText(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    const foundItems = [];

    for (const line of lines) {
        // Try to match item names from our database
        const cleanLine = line.replace(/^\d+\.\s*/, '').replace(/\[|\]/g, '').trim();
        const itemId = findItemId(cleanLine);
        if (itemId) {
            foundItems.push({
                name: cleanLine,
                itemId: itemId,
                quality: getItemQuality(cleanLine)
            });
        } else {
            // Try fuzzy matching - look for partial matches
            const lowerLine = cleanLine.toLowerCase();
            for (const [itemName, id] of Object.entries(itemIds)) {
                if (itemName.includes(lowerLine) || lowerLine.includes(itemName)) {
                    foundItems.push({
                        name: itemName,
                        itemId: id,
                        quality: getItemQuality(itemName)
                    });
                    break;
                }
            }
        }
    }

    return foundItems;
}

function renderCharacterImport() {
    currentClass = null;
    document.querySelectorAll('.class-list li').forEach(li => li.classList.remove('active'));
    const importLink = document.querySelector('.nav-link[data-view="charimport"]');
    if (importLink) importLink.parentElement.classList.add('active');

    const savedChar = loadSavedCharacter();

    let savedCharHtml = '';
    if (savedChar && savedChar.gear && savedChar.gear.length > 0) {
        const gearHtml = savedChar.gear.map(item => {
            const qualityClass = `item-quality-${item.quality}`;
            return `<div class="${qualityClass}"><a href="https://tbc.wowhead.com/item=${item.itemId}" data-wowhead="item=${item.itemId}">${item.name}</a></div>`;
        }).join('');

        savedCharHtml = `
            <div class="border border-terminal-accent/50 bg-terminal-bg/30 p-4 mb-6 md:p-3 md:mb-4 sm:p-2.5">
                <div class="flex justify-between items-center mb-3">
                    <h3 class="text-terminal-accent text-sm md:text-xs">${savedChar.name || 'Imported Character'} ${savedChar.realm ? `- ${savedChar.realm}` : ''}</h3>
                    <button onclick="localStorage.removeItem('${CHAR_IMPORT_KEY}'); renderCharacterImport();" class="text-xs text-terminal-dim hover:text-red-400 cursor-pointer bg-transparent border-none font-mono">[Clear]</button>
                </div>
                <p class="text-terminal-dim text-xs mb-2 md:text-[11px]">${savedChar.gear.length} items recognized</p>
                <div class="text-xs space-y-1 max-h-60 overflow-y-auto md:text-[11px] sm:text-[10px]">
                    ${gearHtml}
                </div>
            </div>
        `;
    }

    const html = `
        <div class="command-line text-terminal-dim my-5 md:text-[11px] md:my-3 sm:text-[10px]">./char-import --parse</div>
        <h2 class="text-terminal-accent text-lg mb-2 uppercase tracking-wide md:text-base sm:text-sm">📥 [ CHARACTER IMPORT ]</h2>
        <p class="text-terminal-dim text-xs mb-6 md:mb-4 sm:mb-3">Import your character's gear by pasting item names. Works with addon exports, wowhead lists, or manual entry.</p>

        ${savedCharHtml}

        <div class="grid grid-cols-2 gap-4 mb-4 md:grid-cols-1">
            <div>
                <label class="text-terminal-dim text-xs block mb-2">Character Name</label>
                <input type="text" id="char-name" class="w-full bg-terminal-bg border border-terminal-dim text-terminal-text px-3 py-2 text-xs font-mono" placeholder="Legolas" value="${savedChar?.name || ''}">
            </div>
            <div>
                <label class="text-terminal-dim text-xs block mb-2">Realm</label>
                <input type="text" id="char-realm" class="w-full bg-terminal-bg border border-terminal-dim text-terminal-text px-3 py-2 text-xs font-mono" placeholder="Faerlina" value="${savedChar?.realm || ''}">
            </div>
        </div>

        <div class="mb-4">
            <label class="text-terminal-dim text-xs block mb-2">📋 PASTE GEAR LIST <span class="text-terminal-accent">(one item per line)</span></label>
            <textarea id="char-gear-input" class="w-full bg-terminal-bg border border-terminal-text text-terminal-text px-3 py-2 text-xs font-mono h-48 resize-y" placeholder="Paste your gear list here...

Examples of accepted formats:
- Helm of the Fallen Hero
- [Legguards of the Fallen Crusader]
- 1. Shoulderpads of the Stranger
- Tier 5 Chest - Robes of Tirisfal

The parser will try to match items from our database."></textarea>
        </div>

        <div class="flex gap-3 mb-6 flex-wrap">
            <button id="parse-gear-btn" class="bg-terminal-accent text-terminal-bg px-6 py-2 font-mono text-xs font-bold cursor-pointer hover:bg-terminal-text transition-colors">
                [ PARSE GEAR ]
            </button>
            <button id="clear-input-btn" class="border border-terminal-dim text-terminal-dim px-4 py-2 font-mono text-xs cursor-pointer hover:border-terminal-text hover:text-terminal-text transition-colors bg-transparent">
                [ CLEAR ]
            </button>
        </div>

        <div id="parse-results" class="hidden">
            <h3 class="text-terminal-text text-sm my-4 uppercase md:text-[13px] md:my-3 sm:text-xs">✅ [ PARSED ITEMS ]</h3>
            <div id="parsed-items-list" class="border border-terminal-dim p-4 mb-4 max-h-80 overflow-y-auto md:p-3 sm:p-2.5"></div>
            <button id="save-char-btn" class="bg-terminal-text text-terminal-bg px-6 py-2 font-mono text-xs font-bold cursor-pointer hover:bg-terminal-accent transition-colors">
                [ SAVE CHARACTER ]
            </button>
        </div>

        <div class="mt-6 p-4 border border-terminal-dim/50 bg-terminal-bg/30 md:mt-4 md:p-3 sm:mt-3 sm:p-2.5">
            <h4 class="text-terminal-accent text-xs mb-2">💡 Import Tips</h4>
            <ul class="text-terminal-dim text-xs space-y-1 md:text-[11px] sm:text-[10px]">
                <li>• Copy gear lists from Wowhead, Seventyupgrades, or addon exports</li>
                <li>• The parser tries to fuzzy-match item names from our 36,000+ item database</li>
                <li>• Items not found will be skipped - check spelling for missing items</li>
                <li>• Saved character data persists in your browser</li>
            </ul>
        </div>
    `;

    const mainContent = document.getElementById('main-content');
    mainContent.style.opacity = '0.3';
    setTimeout(() => {
        mainContent.innerHTML = html;
        mainContent.style.opacity = '1';
        processItemLinks();

        // Parse button
        document.getElementById('parse-gear-btn').addEventListener('click', function() {
            const gearText = document.getElementById('char-gear-input').value;
            const parsedItems = parseGearText(gearText);

            const resultsDiv = document.getElementById('parse-results');
            const itemsListDiv = document.getElementById('parsed-items-list');

            if (parsedItems.length > 0) {
                const itemsHtml = parsedItems.map(item => {
                    const qualityClass = `item-quality-${item.quality}`;
                    return `<div class="${qualityClass} py-1"><a href="https://tbc.wowhead.com/item=${item.itemId}" data-wowhead="item=${item.itemId}">${item.name}</a></div>`;
                }).join('');

                itemsListDiv.innerHTML = `
                    <p class="text-terminal-accent text-xs mb-3">${parsedItems.length} items recognized</p>
                    ${itemsHtml}
                `;
                resultsDiv.classList.remove('hidden');
                processItemLinks();

                // Store parsed items for saving
                window._parsedCharItems = parsedItems;
            } else {
                itemsListDiv.innerHTML = '<p class="text-red-400 text-xs">No items recognized. Check item names and try again.</p>';
                resultsDiv.classList.remove('hidden');
            }
        });

        // Clear button
        document.getElementById('clear-input-btn').addEventListener('click', function() {
            document.getElementById('char-gear-input').value = '';
            document.getElementById('parse-results').classList.add('hidden');
        });

        // Save button
        document.getElementById('save-char-btn')?.addEventListener('click', function() {
            const charName = document.getElementById('char-name').value.trim();
            const charRealm = document.getElementById('char-realm').value.trim();
            const gear = window._parsedCharItems || [];

            if (gear.length > 0) {
                saveCharacter({
                    name: charName || 'Unknown',
                    realm: charRealm || '',
                    gear: gear,
                    savedAt: Date.now()
                });
                renderCharacterImport();
            }
        });
    }, FADE_TRANSITION_MS);
}

function renderApiDocs() {
    currentClass = null;
    document.querySelectorAll('.class-list li').forEach(li => li.classList.remove('active'));
    const apiLink = document.querySelector('.class-list li[data-view="api"]');
    if (apiLink) apiLink.classList.add('active');
    const html = `
        <div class="command-line text-terminal-dim my-5 md:text-[11px] md:my-3 sm:text-[10px]">man tbc-api</div>
        <h2 class="text-terminal-accent text-lg mb-4 uppercase tracking-wide md:text-base md:mb-3 sm:text-sm">🔌 [ TBC.TXT API DOCUMENTATION ]</h2>
        <p class="text-terminal-dim text-xs mb-6 md:mb-4 sm:mb-3">REST API for accessing TBC PvE data in your own applications</p>
        <div class="border border-terminal-dim p-4 mb-6 md:p-3 md:mb-4 sm:p-2.5 sm:mb-3">
            <h3 class="text-terminal-accent text-sm mb-3 md:text-xs">// Base URL</h3>
            <pre class="bg-terminal-bg/50 p-3 text-xs text-terminal-text overflow-x-auto md:text-[11px] sm:text-[10px]"><code>https://api.tbctxt.io</code></pre>
        </div>
        <h3 class="text-terminal-text text-sm my-4 uppercase md:text-[13px] md:my-3 sm:text-xs">📡 [ ENDPOINTS ]</h3>
        <div class="overflow-x-auto -mx-5 px-5 md:-mx-4 md:px-4 sm:-mx-3 sm:px-3">
            <table class="w-full border-collapse text-[13px] min-w-[600px] md:text-[11px] sm:text-[10px]">
                <thead>
                    <tr>
                        <th class="bg-terminal-dim text-terminal-bg p-2.5 text-left font-semibold uppercase text-[11px] tracking-widest md:p-2 md:text-[10px] sm:p-1.5 sm:text-[9px]">ENDPOINT</th>
                        <th class="bg-terminal-dim text-terminal-bg p-2.5 text-left font-semibold uppercase text-[11px] tracking-widest md:p-2 md:text-[10px] sm:p-1.5 sm:text-[9px]">DESCRIPTION</th>
                    </tr>
                </thead>
                <tbody>
                    <tr class="border-b border-terminal-dim border-opacity-30"><td class="p-2.5 text-terminal-accent md:p-2 sm:p-1.5"><code>GET /api/health</code></td><td class="p-2.5 text-terminal-dim md:p-2 sm:p-1.5">Server status and data counts</td></tr>
                    <tr class="border-b border-terminal-dim border-opacity-30"><td class="p-2.5 text-terminal-accent md:p-2 sm:p-1.5"><code>GET /api/classes</code></td><td class="p-2.5 text-terminal-dim md:p-2 sm:p-1.5">List all classes with available specs</td></tr>
                    <tr class="border-b border-terminal-dim border-opacity-30"><td class="p-2.5 text-terminal-accent md:p-2 sm:p-1.5"><code>GET /api/classes/{class}</code></td><td class="p-2.5 text-terminal-dim md:p-2 sm:p-1.5">Full class data (e.g., /api/classes/warrior)</td></tr>
                    <tr class="border-b border-terminal-dim border-opacity-30"><td class="p-2.5 text-terminal-accent md:p-2 sm:p-1.5"><code>GET /api/classes/{class}/{spec}</code></td><td class="p-2.5 text-terminal-dim md:p-2 sm:p-1.5">Specific spec (e.g., /api/classes/warrior/fury)</td></tr>
                    <tr class="border-b border-terminal-dim border-opacity-30"><td class="p-2.5 text-terminal-accent md:p-2 sm:p-1.5"><code>GET /api/items/search?q={query}</code></td><td class="p-2.5 text-terminal-dim md:p-2 sm:p-1.5">Search items by name</td></tr>
                    <tr class="border-b border-terminal-dim border-opacity-30"><td class="p-2.5 text-terminal-accent md:p-2 sm:p-1.5"><code>GET /api/items/{name}</code></td><td class="p-2.5 text-terminal-dim md:p-2 sm:p-1.5">Get item ID by name</td></tr>
                    <tr class="border-b border-terminal-dim border-opacity-30"><td class="p-2.5 text-terminal-accent md:p-2 sm:p-1.5"><code>GET /api/raids</code></td><td class="p-2.5 text-terminal-dim md:p-2 sm:p-1.5">All raid data by phase</td></tr>
                    <tr class="border-b border-terminal-dim border-opacity-30"><td class="p-2.5 text-terminal-accent md:p-2 sm:p-1.5"><code>GET /api/raids/{phase}</code></td><td class="p-2.5 text-terminal-dim md:p-2 sm:p-1.5">Raids by phase (e.g., /api/raids/1)</td></tr>
                    <tr class="border-b border-terminal-dim border-opacity-30"><td class="p-2.5 text-terminal-accent md:p-2 sm:p-1.5"><code>GET /api/recipes/{profession}</code></td><td class="p-2.5 text-terminal-dim md:p-2 sm:p-1.5">Profession recipes</td></tr>
                    <tr class="border-b border-terminal-dim border-opacity-30"><td class="p-2.5 text-terminal-accent md:p-2 sm:p-1.5"><code>GET /api/reference/enchants</code></td><td class="p-2.5 text-terminal-dim md:p-2 sm:p-1.5">Enchant spell IDs</td></tr>
                    <tr class="border-b border-terminal-dim border-opacity-30"><td class="p-2.5 text-terminal-accent md:p-2 sm:p-1.5"><code>GET /api/reference/talents</code></td><td class="p-2.5 text-terminal-dim md:p-2 sm:p-1.5">Talent spell IDs</td></tr>
                </tbody>
            </table>
        </div>
        <h3 class="text-terminal-text text-sm my-4 uppercase md:text-[13px] md:my-3 sm:text-xs">📝 [ EXAMPLE USAGE ]</h3>
        <div class="border border-terminal-dim p-4 mb-4 md:p-3 sm:p-2.5">
            <h4 class="text-terminal-accent text-xs mb-2">// JavaScript</h4>
            <pre class="bg-terminal-bg/50 p-3 text-xs text-terminal-dim overflow-x-auto md:text-[11px] sm:text-[10px]"><code>const response = await fetch('https://api.tbctxt.io/api/classes/warrior/fury');
const fury = await response.json();
console.log(fury.rotation);      // Rotation priority
console.log(fury.phases[1].bis); // Phase 1 BiS gear</code></pre>
        </div>
        <h3 class="text-terminal-text text-sm my-4 uppercase md:text-[13px] md:my-3 sm:text-xs">📂 [ DATA FILES ]</h3>
        <p class="text-terminal-dim text-xs mb-3 md:text-[11px] sm:text-[10px]">Raw JSON files available in <code class="text-terminal-accent">/data/</code>:</p>
        <ul class="text-terminal-dim text-xs list-none space-y-1 md:text-[11px] sm:text-[10px]">
            <li>• <code class="text-terminal-accent">classData.json</code> - All class/spec data (701 KB)</li>
            <li>• <code class="text-terminal-accent">itemIds.json</code> - 36,000+ item IDs (1.2 MB)</li>
            <li>• <code class="text-terminal-accent">raidsData.json</code> - Raid/boss mechanics (132 KB)</li>
            <li>• <code class="text-terminal-accent">recipesData.json</code> - Profession recipes (81 KB)</li>
            <li>• <code class="text-terminal-accent">referenceData.json</code> - Enchants, talents, quests (19 KB)</li>
        </ul>
        <div class="mt-6 p-4 border border-terminal-accent border-opacity-30 bg-terminal-bg/50 md:mt-4 md:p-3 sm:mt-3 sm:p-2.5">
            <p class="text-terminal-dim text-xs md:text-[11px] sm:text-[10px]">CORS enabled on all endpoints. Read-only, no authentication required.</p>
        </div>
    `;
    const mainContent = document.getElementById('main-content');
    mainContent.style.opacity = '0.3';
    setTimeout(() => {
        mainContent.innerHTML = html;
        mainContent.style.opacity = '1';
    }, 200);
}
function navigateToHash(hash) {
    const target = hash.replace('#', '');
    if (!target) {
        renderClassContent('warrior');
        updateActiveNav('warrior');
        return;
    }

    const parts = target.split('/');
    const page = parts[0];

    if (page === 'recipes') {
        if (parts[1]) currentProfession = parts[1];
        renderRecipesContent();
    } else if (page === 'raids') {
        if (parts[1]) currentRaidPhase = parts[1];
        if (parts[2]) currentRaid = parts[2];
        renderRaidsContent();
    } else if (page === 'heroics') {
        renderHeroicsContent(parts[1] || 'hellfire');
    } else if (page === 'collections') {
        renderCollectionsContent(parts[1] || 'mounts');
    } else if (page === 'attunements') {
        renderAttunementsContent(parts[1] || 'karazhan');
    } else if (page === 'reputation') {
        renderReputationTracker();
    } else if (page === 'lockouts') {
        renderLockoutTracker();
    } else if (page === 'guildprogress') {
        renderGuildProgress();
    } else if (page === 'charimport') {
        renderCharacterImport();
    } else if (page === 'raidready') {
        renderPreRaidChecker();
    } else if (page === 'api') {
        renderApiDocs();
    } else {
        // Class page: #warrior or #warrior/arms or #warrior/arms/3
        currentClass = page;
        if (parts[1]) currentSpec = parts[1];
        if (parts[2]) currentPhase = parseInt(parts[2]);
        renderClassContent(page);
    }

    updateActiveNav(page);
}

function updateActiveNav(target) {
    const current = document.querySelector('.class-list li.active');
    if (current) current.classList.remove('active');
    const activeLink = document.querySelector(`.nav-link[data-class="${target}"], .nav-link[data-view="${target}"]`);
    if (activeLink) activeLink.parentElement.classList.add('active');
}

function initClassSelector() {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            if (e.ctrlKey || e.metaKey || e.button === 1) return;
            e.preventDefault();
            window.location.hash = this.getAttribute('href');
        });
    });

    window.addEventListener('hashchange', () => navigateToHash(window.location.hash));

    // Handle auth callback (token in URL from OAuth)
    handleAuthCallback();

    if (window.location.hash) {
        // Handle auth hash states
        if (window.location.hash === '#login-success') {
            history.replaceState(null, '', window.location.pathname);
            console.log('Login successful!');
        } else if (window.location.hash === '#login-error') {
            history.replaceState(null, '', window.location.pathname);
            console.error('Login failed');
        } else {
            navigateToHash(window.location.hash);
        }
    }
    // Check auth status (from localStorage)
    checkAuthStatus();
}
window.addEventListener('DOMContentLoaded', loadAllData);
