declare var $WowheadPower: any;
declare var WH: any;
declare var tailwind: any;

console.log('[TBC.TXT] Script loaded - v3');



const API_BASE_URL: string = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8080'
    : 'https://api.tbctxt.io';


let itemIds: any = {};
let classData: any = {};
let recipesData: any = {};
let raidsData: any = {};
let collectionsData: any = {};
let attunementsData: any = {};
let heroicsData: any = {};
let factionsData: any = {};
let lockoutsData: any = {};
let enchantSpellIds: any = {};
let talentSpellIds: any = {};
let questIds: any = {};
let itemStats: any = {};


let currentUser: any = null;
let serverProgress: any = null;
const AUTH_STORAGE_KEY: string = 'tbctxt_auth';


function showModal(message: string, options: any = {}): Promise<boolean> {
    return new Promise((resolve) => {
        const { type = 'confirm', confirmText = 'YES', cancelText = 'NO' } = options;


        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-[100]';
        overlay.id = 'modal-overlay';


        overlay.innerHTML = `
            <div class="bg-terminal-bg border-2 border-terminal-accent p-6 max-w-md mx-4 font-mono">
                <div class="text-terminal-text text-sm mb-6">${message}</div>
                <div class="flex gap-3 justify-end">
                    ${type === 'confirm' ? `
                        <button id="modal-cancel" class="px-4 py-2 border border-terminal-dim text-terminal-dim hover:border-terminal-text hover:text-terminal-text transition-colors text-xs">[ ${cancelText} ]</button>
                        <button id="modal-confirm" class="px-4 py-2 border border-terminal-accent text-terminal-accent hover:bg-terminal-accent hover:text-terminal-bg transition-colors text-xs">[ ${confirmText} ]</button>
                    ` : `
                        <button id="modal-confirm" class="px-4 py-2 border border-terminal-accent text-terminal-accent hover:bg-terminal-accent hover:text-terminal-bg transition-colors text-xs">[ OK ]</button>
                    `}
                </div>
            </div>
        `;

        document.body.appendChild(overlay);


        document.getElementById('modal-confirm')?.focus();


        document.getElementById('modal-confirm')?.addEventListener('click', () => {
            overlay.remove();
            resolve(true);
        });


        document.getElementById('modal-cancel')?.addEventListener('click', () => {
            overlay.remove();
            resolve(false);
        });


        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                overlay.remove();
                document.removeEventListener('keydown', handleEscape);
                resolve(false);
            }
        };
        document.addEventListener('keydown', handleEscape);


        overlay.addEventListener('click', (e: Event) => {
            if (e.target === overlay) {
                overlay.remove();
                resolve(false);
            }
        });
    });
}


async function showTipJar(): Promise<void> {

    try {
        const response = await fetch(`${API_BASE_URL}/api/donate/create-session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });

        const data = await response.json();

        if (data.url) {
            window.location.href = data.url;
        } else {
            throw new Error(data.error || 'Failed to create checkout session');
        }
    } catch (e: any) {
        await showModal('Unable to open tip jar: ' + e.message, { type: 'alert' });
    }
}


function checkDonationStatus(): void {
    const params = new URLSearchParams(window.location.search);
    const donateStatus = params.get('donate');

    if (donateStatus === 'success') {
        showModal('Thank you for your support! You\'re awesome.', { type: 'alert' });
        history.replaceState(null, '', window.location.pathname + window.location.hash);
    } else if (donateStatus === 'cancelled') {
        history.replaceState(null, '', window.location.pathname + window.location.hash);
    }
}


function checkAuthStatus(): void {

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

function handleAuthCallback(): void {

    const params = new URLSearchParams(window.location.search);
    const token = params.get('auth_token');
    const battletag = params.get('battletag');
    if (token && battletag) {
        currentUser = { battletag: decodeURIComponent(battletag), token };
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(currentUser));

        history.replaceState(null, '', window.location.pathname + window.location.hash);
        updateAuthUI();
        loadServerProgress();
    }
}

function logout(): void {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    currentUser = null;
    updateAuthUI();
}

function updateAuthUI(): void {
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

async function loadServerProgress(): Promise<void> {
    if (!currentUser || !currentUser.token) return;
    try {
        const res = await fetch(`${API_BASE_URL}/api/progress`, {
            headers: { 'Authorization': `Bearer ${currentUser.token}` }
        });
        if (res.ok) {
            serverProgress = await res.json();

            if (serverProgress.attunements) {
                localStorage.setItem(ATTUNEMENT_STORAGE_KEY, JSON.stringify(serverProgress.attunements));
            }
            console.log('Loaded progress from server:', serverProgress);
        }
    } catch (e) {
        console.error('Failed to load server progress:', e);
    }
}

async function saveProgressToServer(): Promise<void> {
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
let currentClass: string | null = 'warrior';
let currentSpec: any = null;
let currentPhase: any = 4;
let currentRaid: string = 'karazhan';
let currentRaidPhase: string = 'phase1';
let currentProfession: string = 'blacksmithing';
let currentAttunement: string = 'karazhan';
const FADE_TRANSITION_MS: number = 200;
const ATTUNEMENT_STORAGE_KEY: string = 'tbctxt_attunements';
const BIS_STORAGE_KEY: string = 'tbctxt_bis';
const REP_STORAGE_KEY: string = 'tbctxt_reputation';
const LOCKOUT_STORAGE_KEY: string = 'tbctxt_lockouts';
const GUILD_PROGRESS_KEY: string = 'tbctxt_guild_progress';
function showLoading(): void {
    document.getElementById('main-content')!.innerHTML = `
        <div class="text-terminal-dim text-center py-10">
            <div class="text-terminal-accent mb-2">[ LOADING DATA... ]</div>
            <div class="text-xs">Fetching class data, items, and raid info</div>
        </div>
    `;
}
async function loadAllData(): Promise<void> {
    showLoading();
    async function fetchJSON(url: string): Promise<any> {
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

        initClassSelector();
        if (!window.location.hash) renderClassContent('warrior');
    } catch (error: any) {
        console.error('Failed to load data:', error);
        document.getElementById('main-content')!.innerHTML = `
            <div class="text-red-400 text-center py-10">
                <div class="mb-2">[ ERROR LOADING DATA ]</div>
                <div class="text-xs text-terminal-dim">${error.message}</div>
                <div class="text-xs text-terminal-dim mt-2">Check browser console for details (F12)</div>
            </div>
        `;
    }
}
function stripPriorityLabel(itemName: string): string {
    return itemName.replace(/\s*\((BEST|RECOMMENDED|GOOD|OPTION|ALTERNATIVE|EASY|HARD)\)\s*$/i, '').trim();
}
function getPriorityLabel(itemName: string): string | null {
    const match = itemName.match(/\((BEST|RECOMMENDED|GOOD|OPTION|ALTERNATIVE|EASY|HARD)\)\s*$/i);
    return match ? match[1].toUpperCase() : null;
}
function getPriorityBadge(label: string | null): string {
    if (!label) return '';
    const badgeMap: any = {
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
function getItemId(itemName: string): any {
    const cleanName = stripPriorityLabel(itemName);
    return itemIds[cleanName.toLowerCase()] || null;
}
function getItemQuality(itemName: string): string {
    const cleanName = stripPriorityLabel(itemName);
    const name = cleanName.toLowerCase();

    const legendaryItems = ['warglaive of azzinoth', 'thori\'al', 'sulfuras'];
    if (legendaryItems.some(leg => name.includes(leg))) return 'legendary';

    const uncommonKeywords = [
        'flesh handler\'s'
    ];
    if (uncommonKeywords.some(keyword => name.includes(keyword))) return 'uncommon';

    const epicKeywords = [
        'bloodlust brooch',
        'choker of vile intent',
        'ring of arathi warlords',
        'midnight legguards',
        'girdle of the deathdealer',
        'scaled greaves of the marksman',
        'ring of cryptic dreams',
        'ashyen\'s gift',
        'phoenix-wing cloak',
        'adamantine chain of the unbroken',
        'dragonspine trophy',
        'tsunami talisman',
        'madness of the betrayer',
        'hourglass of the unraveller',
        'terokk\'s shadowstaff',
        'continuum blade',
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
        'primal mooncloth',
        'vengeance wrap',
        'boots of the long road',
        'spellfire',
        'frozen shadoweave',
        'belt of blasting',
        'boots of blasting',
        'belt of the long road',
        'ebon netherscale',
        'netherstrike',
        'netherdrake'
    ];
    if (epicKeywords.some(keyword => name.includes(keyword))) return 'epic';

    const rareKeywords = [
        'badge of tenacity',
        'vindicator\'s brand',
        'stalker\'s chain',
        'savage plate',
        'general\'s',
        'marshal\'s',
        'lieutenant commander\'s',
        'champion\'s',
        'centurion\'s',
        'wastewalker',
        'overlord\'s helmet of second sight',
        'doomplate',
        'natasha\'s choker',
        'starlight gauntlets',
        'idol of the wild',
        'clefthoof',
        'deathforge girdle',
        'terokk\'s quill',
        'boots of righteous fortitude',
        'andormu\'s tear',
        'shatter-bound',
        'time-shifted',
        'beast lord',
        'righteous',
        'icon of unyielding courage',
        'bladefist\'s breadth',
        'abacus of violent odds',
        'marksman\'s bow'
    ];
    if (rareKeywords.some(keyword => name.includes(keyword))) return 'rare';

    return 'epic';
}
function processItemLinks(): void {
    if (typeof $WowheadPower !== 'undefined') {
        $WowheadPower.refreshLinks();

        setTimeout(updateItemQualitiesFromWowhead, 50);
    }
}


const WOWHEAD_QUALITY_MAP: any = {
    'q0': 'poor',
    'q1': 'common',
    'q2': 'uncommon',
    'q3': 'rare',
    'q4': 'epic',
    'q5': 'legendary',
    'q6': 'artifact',
    'q7': 'heirloom'
};


function extractQualityFromTooltip(tooltipHtml: string): string | null {
    if (!tooltipHtml) return null;

    const match = tooltipHtml.match(/<b class="(q[0-7])"/);
    if (match && WOWHEAD_QUALITY_MAP[match[1]]) {
        return WOWHEAD_QUALITY_MAP[match[1]];
    }
    return null;
}


const itemQualityCache: any = {};
let qualityFetchInProgress: boolean = false;


async function updateItemQualitiesFromWowhead(): Promise<void> {
    if (qualityFetchInProgress) return;
    qualityFetchInProgress = true;
    const itemSpans = document.querySelectorAll('span[data-item-id]');


    const itemsToFetch: any[] = [];
    itemSpans.forEach((span: any) => {
        const itemId = span.getAttribute('data-item-id');
        if (itemId && !span.getAttribute('data-quality-updated') && !itemQualityCache[itemId]) {
            itemsToFetch.push({ itemId, span });
        }
    });

    if (itemsToFetch.length === 0) {
        qualityFetchInProgress = false;
        return;
    }


    const batchSize = 10;
    for (let i = 0; i < itemsToFetch.length; i += batchSize) {
        const batch = itemsToFetch.slice(i, i + batchSize);
        await Promise.all(batch.map(async ({ itemId, span }: any) => {
            try {

                if (itemQualityCache[itemId]) {
                    updateSpanQuality(span, itemQualityCache[itemId]);
                    span.setAttribute('data-quality-updated', 'true');
                    return;
                }


                if (typeof capturedTooltips !== 'undefined' && capturedTooltips[itemId]) {
                    const quality = extractQualityFromTooltip(capturedTooltips[itemId]);
                    if (quality) {
                        itemQualityCache[itemId] = quality;
                        updateSpanQuality(span, quality);
                        span.setAttribute('data-quality-updated', 'true');
                    }
                    return;
                }


                const tooltip = await fetchTooltipDirect(itemId);
                if (tooltip) {
                    const quality = extractQualityFromTooltip(tooltip);
                    if (quality) {
                        itemQualityCache[itemId] = quality;
                        updateSpanQuality(span, quality);
                        span.setAttribute('data-quality-updated', 'true');
                    }
                }
            } catch (e) {
                console.log('[QUALITY] Error fetching quality for', itemId, e);
            }
        }));
    }
    qualityFetchInProgress = false;
}


function getQualityFromColor(color: string): string | null {

    const colorMap: any = {
        'rgb(163, 53, 238)': 'epic',
        'rgb(0, 112, 221)': 'rare',
        'rgb(30, 255, 0)': 'uncommon',
        'rgb(255, 128, 0)': 'legendary',
        'rgb(157, 157, 157)': 'poor',
        'rgb(255, 255, 255)': 'common'
    };
    return colorMap[color] || null;
}


function updateSpanQuality(span: any, newQuality: string): void {

    const classes = span.className.split(' ');
    const filteredClasses = classes.filter((c: string) => !c.startsWith('item-quality-'));
    filteredClasses.push(`item-quality-${newQuality}`);
    span.className = filteredClasses.join(' ');
}

function getQuestId(questName: string): any {
    const cleanName = questName.toLowerCase().trim().replace(/\\'/g, "'");
    return questIds[cleanName] || null;
}
function getTalentSpellId(talentName: string): any {

    const cleanName = talentName.toLowerCase().trim().replace(/\\'/g, "'");
    return talentSpellIds[cleanName] || null;
}
function getEnchantSpellId(itemName: string): any {
    const cleanName = stripPriorityLabel(itemName).toLowerCase();
    return enchantSpellIds[cleanName] || null;
}
function generateItemCell(itemName: string): string {
    if (itemName.includes(' / ')) {
        return itemName.split(' / ').map((item: string) => {
            const trimmedItem = item.trim();
            const quality = getItemQuality(trimmedItem);
            const displayName = stripPriorityLabel(trimmedItem);
            const priorityLabel = getPriorityLabel(trimmedItem);
            const priorityBadge = (currentPhase === 0) ? getPriorityBadge(priorityLabel) : '';
            const itemId = getItemId(trimmedItem);
            const spellId = getEnchantSpellId(trimmedItem);

            let link: string;
            if (spellId) {
                link = `<a href="https://tbc.wowhead.com/spell=${spellId}" data-wowhead="spell=${spellId}">${displayName}</a>`;
            } else if (itemId) {
                link = `<a href="https://tbc.wowhead.com/item=${itemId}" data-wowhead="item=${itemId}">${displayName}</a>`;
            } else {
                link = displayName;
            }

            const dataAttr = itemId ? ` data-item-id="${itemId}"` : '';
            return `<span class="item-quality-${quality}"${dataAttr}>${link}${priorityBadge}</span>`;
        }).join(' / ');
    }
    const quality = getItemQuality(itemName);
    const displayName = stripPriorityLabel(itemName);
    const priorityLabel = getPriorityLabel(itemName);
    const priorityBadge = (currentPhase === 0) ? getPriorityBadge(priorityLabel) : '';
    const itemId = getItemId(itemName);
    const spellId = getEnchantSpellId(itemName);

    let link: string;
    if (spellId) {
        link = `<a href="https://tbc.wowhead.com/spell=${spellId}" data-wowhead="spell=${spellId}">${displayName}</a>`;
    } else if (itemId) {
        link = `<a href="https://tbc.wowhead.com/item=${itemId}" data-wowhead="item=${itemId}">${displayName}</a>`;
    } else {
        link = displayName;
    }

    const dataAttr = itemId ? ` data-item-id="${itemId}"` : '';
    return `<span class="item-quality-${quality}"${dataAttr}>${link}${priorityBadge}</span>`;
}

function generateSourceCell(source: string): string {

    const npcMap: any = {

        'Attumen the Huntsman': 16151, 'Moroes': 15687, 'Maiden of Virtue': 16457,
        'Opera Event': 0, 'The Curator': 15691, 'Shade of Aran': 16524,
        'Terestian Illhoof': 15688, 'Netherspite': 15689, 'Chess Event': 0,
        'Prince Malchezaar': 15690, 'Nightbane': 17225,

        'High King Maulgar': 18831, 'Gruul the Dragonkiller': 19044,

        'Magtheridon': 17257,

        'Hydross the Unstable': 21216, 'The Lurker Below': 21217,
        'Leotheras the Blind': 21215, 'Fathom-Lord Karathress': 21214,
        'Morogrim Tidewalker': 21213, 'Lady Vashj': 21212,

        'Al\'ar': 19514, 'Void Reaver': 19516, 'High Astromancer Solarian': 18805,
        'Kael\'thas Sunstrider': 19622,

        'Rage Winterchill': 17767, 'Anetheron': 17808, 'Kaz\'rogal': 17888,
        'Azgalor': 17842, 'Archimonde': 17968,

        'High Warlord Naj\'entus': 22887, 'Supremus': 22898,
        'Shade of Akama': 22841, 'Teron Gorefiend': 22871,
        'Gurtogg Bloodboil': 22948, 'Reliquary of Souls': 22856,
        'Mother Shahraz': 22947, 'Illidari Council': 23426, 'The Illidari Council': 23426,
        'Illidan Stormrage': 22917,

        'Akil\'zon': 23574, 'Nalorakk': 23576, 'Jan\'alai': 23578,
        'Halazzi': 23577, 'Hex Lord Malacrass': 24239, 'Zul\'jin': 23863,

        'Doom-Lord Kazzak': 18728, 'Doomwalker': 17711,

        'Kalecgos': 24850, 'Brutallus': 24882, 'Felmyst': 25038,
        'Eredar Twins': 25166, 'M\'uru': 25741, 'Kil\'jaeden': 25315,

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

        'Hungerfen': 17770, 'Ghaz\'an': 18105, 'Anzu': 23035,
        'Lieutenant Drake': 17848, 'Mechano-Lord Capacitus': 19219,
        'Mekgineer Steamrigger': 17796, 'Mennu the Betrayer': 17941,
        'Grand Warlock Nethekurse': 16807, 'Grandmaster Vorpil': 18732,
        'Darkweaver Syth': 18472, 'Zereketh the Unbound': 20870,
        'Selin Fireheart': 24723, 'The Maker': 17381,
        'Wrath-Scryer Soccothrates': 20886,

        'Gurok the Usurper': 18062, 'Ar\'kelos the Guardian': 20798,
        'Gava\'xi': 18298, 'Coren Direbrew': 23872,

        'C\'Thun': 15727, 'Emperor Vek\'nilash': 15275, 'Nefarian': 11583,
        'Sapphiron': 15989, 'Kel\'Thuzad': 15990,

        'Patchwerk': 16028, 'Grobbulus': 15931, 'Gluth': 15932,

        'Echo of Medivh': 16816, 'Curator': 15691,

        'G\'eras': 19321
    };

    const professionSources = ['Blacksmithing', 'Leatherworking', 'Tailoring', 'Jewelcrafting', 'Engineering', 'Alchemy'];
    const pvpSources = ['Honor', 'Honor Points', 'Arena', 'Arena Points'];
    const otherSources = ['BoE World Drop', 'BoE', 'World Drop', 'Crafted', 'N/A', 'Various', 'Vendor', 'PvP'];

    const dungeons = [
        'Hellfire Ramparts', 'The Blood Furnace', 'The Shattered Halls', 'Shattered Halls',
        'The Slave Pens', 'Slave Pens', 'The Underbog', 'Underbog', 'The Steamvault', 'Steamvault',
        'Mana-Tombs', 'Mana Tombs', 'Auchenai Crypts', 'Sethekk Halls', 'Shadow Labyrinth',
        'Old Hillsbrad Foothills', 'The Black Morass', 'Black Morass',
        'The Mechanar', 'Mechanar', 'The Botanica', 'Botanica', 'The Arcatraz', 'Arcatraz',
        "Magisters' Terrace", "Magister's Terrace"
    ];
    const raids = [
        'Karazhan', "Gruul's Lair", "Magtheridon's Lair",
        'Serpentshrine Cavern', 'Tempest Keep', 'Tempest Keep: The Eye', 'The Eye',
        'Mount Hyjal', 'Hyjal Summit', 'Black Temple', "Zul'Aman",
        'Sunwell Plateau'
    ];

    let displayText: string = source;
    let bossName: string | null = null;
    let zoneName: string | null = null;
    let questName: string | null = null;

    const bossZoneMatch = source.match(/^(.+?)\s+-\s+(.+)$/);
    if (bossZoneMatch) {
        bossName = bossZoneMatch[1].trim();
        zoneName = bossZoneMatch[2].trim();
    }

    const heroicMatch = source.match(/^\(H\)\s*(.+?)\s+-\s+(.+)$/);
    if (heroicMatch) {
        bossName = heroicMatch[1].trim();
        zoneName = heroicMatch[2].trim();
    }

    if (bossName && bossName.includes(',')) {
        bossName = bossName.split(',')[0].trim();
    }

    const getBossColorClass = (zone: string | null): string => {
        if (!zone) return '';
        const zoneLower = zone.toLowerCase();
        if (dungeons.some(d => zoneLower.includes(d.toLowerCase()))) return 'text-wow-rare';
        if (raids.some(r => zoneLower.includes(r.toLowerCase()))) return 'text-wow-epic';
        return '';
    };

    const badgeMatch = source.match(/(\d+)\s*x?\s*-?\s*Badge[s]?\s*(of\s*Justice)?/i);
    if (badgeMatch || source.toLowerCase().includes('badge of justice')) {
        const count = badgeMatch ? badgeMatch[1] : '';
        const displayText = count ? `${count} Badges` : 'Badge Vendor';
        return `<a href="https://tbc.wowhead.com/item=29434" data-wowhead="item=29434" class="underline hover:text-terminal-text">${displayText}</a>`;
    }

    if (source.toLowerCase().includes('justice vendor')) {
        const countMatch = source.match(/(\d+)/);
        const count = countMatch ? countMatch[1] : '';
        const displayText = count ? `${count} Badges` : 'Badge Vendor';
        return `<a href="https://tbc.wowhead.com/item=29434" data-wowhead="item=29434" class="underline hover:text-terminal-text">${displayText}</a>`;
    }

    const gerasBadgeMatch = source.match(/G'eras\s*-?\s*(\d+)\s*x?\s*Badge/i);
    if (gerasBadgeMatch) {
        return `<a href="https://tbc.wowhead.com/item=29434" data-wowhead="item=29434" class="underline hover:text-terminal-text">${gerasBadgeMatch[1]} Badges</a>`;
    }

    const repMatch = source.match(/^(Exalted|Revered|Honored|Friendly)\s*[-—]\s*(.+)$/i) || source.match(/^(.+?)\s*[-—]\s*(Exalted|Revered|Honored|Friendly)$/i);
    if (repMatch) {
        const faction = repMatch[1].match(/Exalted|Revered|Honored|Friendly/i) ? repMatch[2] : repMatch[1];
        const standing = repMatch[1].match(/Exalted|Revered|Honored|Friendly/i) ? repMatch[1] : repMatch[2];
        return `${faction} (${standing})`;
    }

    const factionRepMatch = source.match(/^(The Aldor|The Scryers|Lower City|Keepers of Time|The Sha'tar|Cenarion Expedition|Honor Hold|Thrallmar|The Violet Eye|The Scale of the Sands|Ashtongue Deathsworn|The Consortium|Kurenai|The Mag'har)\s*[-—]?\s*(Exalted|Revered|Honored|Friendly)$/i);
    if (factionRepMatch) {
        return `${factionRepMatch[1]} (${factionRepMatch[2]})`;
    }

    const professionMatch = professionSources.find(p => source.toLowerCase().includes(p.toLowerCase()));
    if (professionMatch) {

        const cleanSource = source.split('—')[0].trim();
        return cleanSource;
    }

    if (pvpSources.some(p => source.toLowerCase() === p.toLowerCase() || source.toLowerCase().includes(p.toLowerCase()))) {
        return source;
    }

    if (otherSources.some(o => source.toLowerCase().includes(o.toLowerCase()))) {
        return source;
    }

    const trashMatch = source.match(/Trash\s*[Mm]obs?\s*in\s*-?\s*(.+)/i);
    if (trashMatch) {
        return `Trash (${trashMatch[1]})`;
    }

    const timedChestMatch = source.match(/(\d+\w*)\s*Timed\s*Chest/i);
    if (timedChestMatch) {
        return `${timedChestMatch[1]} Timed Chest`;
    }

    if (source.includes('Darkmoon') && source.includes('Deck')) {
        return source;
    }

    if (source === 'Zul\'Aman' || source === 'Zul\\\'Aman') {
        return `<a href="https://tbc.wowhead.com/zone=3805" data-wowhead="zone=3805" class="underline hover:text-terminal-text">Zul\'Aman</a>`;
    }

    const questId = getQuestId(source);
    if (questId) {
        return `<a href="https://tbc.wowhead.com/quest=${questId}" data-wowhead="quest=${questId}" class="underline hover:text-terminal-text">${source}</a>`;
    }

    if (source.includes('/')) {
        const firstQuest = source.split('/')[0].trim();
        const questIdFirst = getQuestId(firstQuest);
        if (questIdFirst) {
            return `<a href="https://tbc.wowhead.com/quest=${questIdFirst}" data-wowhead="quest=${questIdFirst}" class="underline hover:text-terminal-text">${firstQuest}</a>`;
        }
    }

    const sourceLower = source.toLowerCase().replace(/\\'/g, "'");
    for (const [questName, qId] of Object.entries(questIds)) {
        if (sourceLower.includes(questName)) {
            const displayQuestName = questName.charAt(0).toUpperCase() + questName.slice(1);
            return `<a href="https://tbc.wowhead.com/quest=${qId}" data-wowhead="quest=${qId}" class="underline hover:text-terminal-text">${displayQuestName}</a>`;
        }
    }

    if (bossName && zoneName) {
        const colorClass = getBossColorClass(zoneName);
        const isRaid = raids.some(r => zoneName!.toLowerCase().includes(r.toLowerCase()));
        const isDungeon = dungeons.some(d => zoneName!.toLowerCase().includes(d.toLowerCase()));
        const skullPrefix = (isRaid || isDungeon) ? '💀 ' : '';
        const npcId = npcMap[bossName] || npcMap[bossName.replace(/'/g, "\\'")] || 0;
        const bossDisplay = bossZoneMatch ? bossZoneMatch[1].trim() : bossName;
        if (npcId > 0) {
            return `${skullPrefix}<a href="https://tbc.wowhead.com/npc=${npcId}" class="underline ${colorClass}">${bossDisplay}</a><span class="text-terminal-dim"> - ${zoneName}</span>`;
        }

        for (const [npcName, id] of Object.entries(npcMap)) {
            if (npcName.toLowerCase() === bossName!.toLowerCase() && (id as number) > 0) {
                return `${skullPrefix}<a href="https://tbc.wowhead.com/npc=${id}" class="underline ${colorClass}">${bossDisplay}</a><span class="text-terminal-dim"> - ${zoneName}</span>`;
            }
        }
        return `${skullPrefix}<span class="${colorClass}">${bossDisplay}</span><span class="text-terminal-dim"> - ${zoneName}</span>`;
    }
    if (bossName) {
        const npcId = npcMap[bossName] || npcMap[bossName.replace(/'/g, "\\'")] || 0;
        if (npcId > 0) {
            return `<a href="https://tbc.wowhead.com/npc=${npcId}" class="underline hover:text-terminal-text">${displayText}</a>`;
        }
        return displayText;
    }

    const sortedNpcs = Object.entries(npcMap).sort((a: any, b: any) => b[0].length - a[0].length);
    for (const [npcName, npcId] of sortedNpcs) {
        if ((npcId as number) > 0) {

            const sourceNormalized = source.replace(/\\'/g, "'");
            const npcNameNormalized = npcName.replace(/\\'/g, "'");
            if (sourceNormalized.includes(npcNameNormalized)) {
                return `<a href="https://tbc.wowhead.com/npc=${npcId}" class="underline hover:text-terminal-text">${displayText}</a>`;
            }
        }
    }
    return displayText;
}

function generateBisTable(bisData: any, specData: any): string {

    const groupedBySlot: any = {};
    bisData.forEach((row: any) => {
        const slot = row[0];
        if (!groupedBySlot[slot]) {
            groupedBySlot[slot] = [];
        }
        groupedBySlot[slot].push({item: row[1], source: row[2]});
    });

    const enchants = specData.enchants || {};

    const slotMapping: any = {
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
        'MELEE WEAPON': ['Melee Weapon', 'Main Hand Weapon', 'Weapon'],
        'MELEE WEAPON 1': ['Melee Weapon', 'Main Hand Weapon', 'Weapon'],
        'MELEE WEAPON 2': ['Melee Weapon', 'Off Hand Weapon', 'Weapon'],
        'OFF-HAND': ['Off Hand Weapon', 'Off-Hand', 'Shield'],
        'RANGED': ['Ranged Weapon'],
        'RANGED WEAPON': ['Ranged Weapon']
    };

    const bisProgress = loadBisProgress();

    return Object.entries(groupedBySlot).map(([slot, items]: [string, any]) => {
        const itemsHtml = items.map((i: any) => {
            const itemKey = getBisItemKey(currentClass as string, currentSpec, currentPhase, slot, i.item);
            const isChecked = bisProgress[itemKey] ? 'checked' : '';
            const checkboxId = `bis-${itemKey}`;
            return `<div class="flex items-start gap-2">
                <input type="checkbox" id="${checkboxId}" class="bis-checkbox attunement-checkbox mt-1" data-item-key="${itemKey}" ${isChecked}>
                <label for="${checkboxId}" class="cursor-pointer ${isChecked ? 'line-through opacity-50' : ''}">${generateItemCell(i.item)}</label>
            </div>`;
        }).join('');
        const sourcesHtml = items.map((i: any) => generateSourceCell(i.source)).join('<br>');

        let enchantHtml = '';
        const possibleEnchantKeys = slotMapping[slot] || [slot];
        for (const possibleKey of possibleEnchantKeys) {
            const enchantKey = Object.keys(enchants).find((key: string) =>
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
function renderRaidsContent(): void {
    currentClass = null;
    document.querySelectorAll('.class-list li').forEach((li: any) => li.classList.remove('active'));
    const raidsLink = document.querySelector('.class-list li[data-view="raids"]');
    if (raidsLink) raidsLink.classList.add('active');
    const phaseData = raidsData[currentRaidPhase];
    if (!phaseData) return;
    const raidData = phaseData.raids[currentRaid];

    const phaseButtons = Object.entries(raidsData).map(([key, phase]: [string, any]) =>
        `<a href="#raids/${key}" class="raid-phase-btn ${key === currentRaidPhase ? 'bg-terminal-text text-terminal-bg' : 'bg-transparent'} border border-terminal-text text-terminal-text px-4 py-2.5 cursor-pointer font-mono text-xs transition-all select-none hover:bg-terminal-text hover:text-terminal-bg no-underline md:px-3.5 md:py-2.5 md:text-[11px] md:min-h-[48px] md:inline-flex md:items-center md:justify-center sm:px-3 sm:py-2 sm:text-[10px] sm:min-h-[44px]" data-phase="${key}">${phase.name}</a>`
    ).join('');

    const raidButtons = Object.entries(phaseData.raids).map(([key, raid]: [string, any]) =>
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


        if (raidData.attunementSteps && raidData.attunementSteps.length > 0) {
            html += `
                <div class="border border-purple-500 border-opacity-30 p-4 mb-6 md:p-3 md:mb-4 sm:p-2.5 sm:mb-3">
                    <h4 class="text-purple-400 text-sm mb-3 uppercase md:text-xs sm:text-[11px]">// Attunement Guide</h4>
                    <div class="space-y-1.5 text-xs md:text-[11px] sm:text-[10px]">
                        ${raidData.attunementSteps.map((step: string) => `<div class="text-terminal-dim">${step}</div>`).join('')}
                    </div>
                </div>
            `;
        }

        html += `<h3 class="text-terminal-text text-sm my-4 uppercase md:text-[13px] md:my-3 sm:text-xs">💀 [ BOSS ENCOUNTERS ]</h3>`;


        const difficultyColors: any = {
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


            if (boss.phaseBreakdown && boss.phaseBreakdown.length > 0) {
                html += `
                    <div class="border border-cyan-500 border-opacity-30 p-3 mb-3 md:p-2.5 md:mb-2 sm:p-2">
                        <h5 class="text-cyan-400 text-xs uppercase mb-2 md:text-[11px] md:mb-1.5 sm:text-[10px]">// Phase Breakdown</h5>
                        <div class="space-y-1.5 text-xs md:text-[11px] sm:text-[10px]">
                            ${boss.phaseBreakdown.map((phase: string) => `<div class="text-terminal-dim">${phase}</div>`).join('')}
                        </div>
                    </div>
                `;
            }


            if (boss.guestList && boss.guestList.length > 0) {
                html += `
                    <div class="border border-orange-500 border-opacity-30 p-3 mb-3 md:p-2.5 md:mb-2 sm:p-2">
                        <h5 class="text-orange-400 text-xs uppercase mb-2 md:text-[11px] md:mb-1.5 sm:text-[10px]">// Possible Dinner Guests (4 spawn randomly)</h5>
                        <div class="grid grid-cols-2 gap-1.5 text-xs md:grid-cols-1 md:text-[11px] sm:text-[10px]">
                            ${boss.guestList.map((guest: string) => `<div class="text-terminal-dim">• ${guest}</div>`).join('')}
                        </div>
                    </div>
                `;
            }


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


            if (boss.strategy) {
                html += `
                    <div class="bg-terminal-bg/50 border border-terminal-accent border-opacity-30 p-3 mb-3 md:p-2.5 md:mb-2 sm:p-2">
                        <h5 class="text-terminal-accent text-xs uppercase mb-1.5 md:text-[11px] md:mb-1 sm:text-[10px]">// Strategy</h5>
                        <p class="text-terminal-dim text-xs leading-relaxed md:text-[11px] sm:text-[10px]">${boss.strategy}</p>
                    </div>
                `;
            }


            if (boss.commonMistakes && boss.commonMistakes.length > 0) {
                html += `
                    <div class="border border-red-500 border-opacity-30 p-3 mb-3 md:p-2.5 md:mb-2 sm:p-2">
                        <h5 class="text-red-400 text-xs uppercase mb-2 md:text-[11px] md:mb-1.5 sm:text-[10px]">// Common Mistakes to Avoid</h5>
                        <div class="space-y-1 text-xs md:text-[11px] sm:text-[10px]">
                            ${boss.commonMistakes.map((mistake: string) => `<div class="text-terminal-dim">⚠ ${mistake}</div>`).join('')}
                        </div>
                    </div>
                `;
            }


            if (boss.lootHighlights && boss.lootHighlights.length > 0) {
                html += `
                    <div class="border border-wow-epic border-opacity-30 p-3 md:p-2.5 sm:p-2">
                        <h5 class="text-wow-epic text-xs uppercase mb-2 md:text-[11px] md:mb-1.5 sm:text-[10px]">// Notable Loot</h5>
                        <div class="flex flex-wrap gap-2 text-xs md:text-[11px] sm:text-[10px]">
                            ${boss.lootHighlights.map((item: string) => `<span class="text-terminal-dim bg-terminal-dim bg-opacity-20 px-2 py-0.5">${item}</span>`).join('')}
                        </div>
                    </div>
                `;
            }

            html += `
                </div>
            `;
        }
    }
    const mainContent = document.getElementById('main-content')!;
    mainContent.style.opacity = '0.3';
    setTimeout(() => {
        mainContent.innerHTML = html;
        mainContent.style.opacity = '1';

        document.querySelectorAll('.raid-phase-btn').forEach((btn: any) => {
            btn.addEventListener('click', (e: any) => {
                if (e.ctrlKey || e.metaKey || e.button === 1) return;
                e.preventDefault();
                currentRaidPhase = btn.dataset.phase;
                const firstRaid = Object.keys(raidsData[currentRaidPhase].raids)[0];
                currentRaid = firstRaid;
                window.location.hash = `#raids/${currentRaidPhase}`;
            });
        });

        document.querySelectorAll('.raid-btn').forEach((btn: any) => {
            btn.addEventListener('click', (e: any) => {
                if (e.ctrlKey || e.metaKey || e.button === 1) return;
                e.preventDefault();
                currentRaid = btn.dataset.raid;
                window.location.hash = `#raids/${currentRaidPhase}/${currentRaid}`;
            });
        });

        if (typeof $WowheadPower !== 'undefined' && $WowheadPower.refreshLinks) {
            $WowheadPower.refreshLinks();
            setTimeout(updateItemQualitiesFromWowhead, 50);
        }
    }, 200);
}
let currentCollection: string = 'mounts';
function renderCollectionsContent(category: string = 'mounts'): void {
    currentClass = null;
    currentCollection = category;
    document.querySelectorAll('.class-list li').forEach((li: any) => li.classList.remove('active'));
    const collectionsLink = document.querySelector('.nav-link[data-view="collections"]');
    if (collectionsLink) collectionsLink.parentElement!.classList.add('active');

    const categories = ['mounts', 'tabards', 'vanityPets', 'rareSpawns', 'toys'];
    const categoryLabels: any = {mounts: 'Mounts', tabards: 'Tabards', vanityPets: 'Vanity Pets', rareSpawns: 'Rare Spawns', toys: 'Toys'};

    const categoryButtons = categories.map((cat: string) =>
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

    const mainContent = document.getElementById('main-content')!;
    mainContent.style.opacity = '0.3';
    setTimeout(() => {
        mainContent.innerHTML = html;
        mainContent.style.opacity = '1';

        document.querySelectorAll('.collection-btn').forEach((btn: any) => {
            btn.addEventListener('click', (e: any) => {
                if (e.ctrlKey || e.metaKey || e.button === 1) return;
                e.preventDefault();
                window.location.hash = `#collections/${btn.dataset.category}`;
            });
        });
        if (typeof $WowheadPower !== 'undefined' && $WowheadPower.refreshLinks) {
            $WowheadPower.refreshLinks();
            setTimeout(updateItemQualitiesFromWowhead, 50);
        }
    }, 200);
}

function renderMountsSection(data: any): string {
    let html = '<h3 class="text-terminal-text text-sm my-4 uppercase md:text-[13px] md:my-3 sm:text-xs">🦅 [ FLYING MOUNTS ]</h3>';
    const flyingCategories: any = {
        'allianceVendor': '🔵 Alliance Vendor', 'hordeVendor': '🔴 Horde Vendor', 'netherwing': '🐉 Netherwing (Rep)',
        'shatariSkyguard': "🦅 Sha'tari Skyguard (Rep)", 'cenarionExpedition': '🌿 Cenarion Expedition (Rep)',
        'engineering': '⚙️ Engineering', 'rareDrops': '✨ Rare Drops', 'gladiator': '⚔️ Gladiator (PvP)'
    };
    for (const [key, label] of Object.entries(flyingCategories)) {
        if (data.flyingMounts && data.flyingMounts[key]) {
            html += renderMountGroup(label as string, data.flyingMounts[key]);
        }
    }
    html += '<h3 class="text-terminal-text text-sm my-4 uppercase md:text-[13px] md:my-3 sm:text-xs">🐴 [ GROUND MOUNTS ]</h3>';
    const groundCategories: any = {
        'bloodElfHawkstriders': '🔴 Blood Elf Hawkstriders', 'draeneiElekks': '🔵 Draenei Elekks',
        'talbuksMaghar': "🔴 Mag'har Talbuks (Rep)", 'talbuksKurenai': '🔵 Kurenai Talbuks (Rep)',
        'halaa': '⚔️ Halaa PvP', 'raidDrops': '🏰 Raid Drops', 'worldEvents': '🎉 World Events'
    };
    for (const [key, label] of Object.entries(groundCategories)) {
        if (data.groundMounts && data.groundMounts[key]) {
            html += renderMountGroup(label as string, data.groundMounts[key]);
        }
    }
    return html;
}

function renderMountGroup(label: string, mounts: any[]): string {
    const rows = mounts.map((m: any) => `
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

function renderTabardsSection(data: any): string {
    let html = '';
    const categories: any = {reputation: '⭐ Reputation Tabards', pvp: '⚔️ PvP Tabards', other: '📦 Other Tabards'};
    for (const [key, label] of Object.entries(categories)) {
        if (data[key]) {
            const rows = data[key].map((t: any) => `
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

function renderPetsSection(data: any): string {
    let html = '';
    const categories: any = {vendor: '🛒 Vendor Pets', drops: '🎁 Drop/Quest Pets', engineering: '⚙️ Engineering Pets', worldEvents: '🎉 World Event Pets'};
    for (const [key, label] of Object.entries(categories)) {
        if (data[key]) {
            const rows = data[key].map((p: any) => `
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

function renderRareSpawnsSection(data: any): string {
    let html = '';
    const zones: any = {hellfire: '🔥 Hellfire Peninsula', zangarmarsh: '🍄 Zangarmarsh', terokkar: '🌲 Terokkar Forest', nagrand: '🌾 Nagrand', bladesEdge: "⛰️ Blade's Edge Mountains", netherstorm: '⚡ Netherstorm', shadowmoon: '🌑 Shadowmoon Valley'};
    for (const [key, label] of Object.entries(zones)) {
        if (data[key]) {
            const rows = data[key].map((r: any) => `
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

function renderToysSection(data: any): string {
    let html = '';
    const categories: any = {transformation: '🎭 Transformation Items', party: '🎉 Party Items', engineering: '⚙️ Engineering Gadgets', misc: '📦 Miscellaneous'};
    for (const [key, label] of Object.entries(categories)) {
        if (data[key]) {
            const rows = data[key].map((t: any) => `
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


function loadAttunementProgress(): any {
    try {
        const saved = localStorage.getItem(ATTUNEMENT_STORAGE_KEY);
        return saved ? JSON.parse(saved) : {};
    } catch (e) {
        console.error('Error loading attunement progress:', e);
        return {};
    }
}

function saveAttunementProgress(stepId: string, completed: boolean): void {
    try {
        const progress = loadAttunementProgress();
        if (completed) {
            progress[stepId] = true;
        } else {
            delete progress[stepId];
        }
        localStorage.setItem(ATTUNEMENT_STORAGE_KEY, JSON.stringify(progress));

        saveProgressToServer();
    } catch (e) {
        console.error('Error saving attunement progress:', e);
    }
}

function clearAttunementProgress(attunementKey: string | null = null): void {
    try {
        if (attunementKey) {
            const progress = loadAttunementProgress();
            const attunement = attunementsData[attunementKey];
            if (attunement && attunement.steps) {
                attunement.steps.forEach((step: any) => {
                    delete progress[step.id];
                });
            }
            localStorage.setItem(ATTUNEMENT_STORAGE_KEY, JSON.stringify(progress));
        } else {
            localStorage.removeItem(ATTUNEMENT_STORAGE_KEY);
        }

        saveProgressToServer();
    } catch (e) {
        console.error('Error clearing attunement progress:', e);
    }
}

function getAttunementCompletionStats(attunementKey: string): any {
    const progress = loadAttunementProgress();
    const attunement = attunementsData[attunementKey];
    if (!attunement || !attunement.steps) return { completed: 0, total: 0, percent: 0 };
    const total = attunement.steps.length;
    const completed = attunement.steps.filter((step: any) => progress[step.id]).length;
    return {
        completed,
        total,
        percent: total > 0 ? Math.round((completed / total) * 100) : 0
    };
}

function renderProgressBar(completed: number, total: number): string {
    const percent = total > 0 ? (completed / total) * 100 : 0;
    const filledBlocks = Math.round(percent / 10);
    const emptyBlocks = 10 - filledBlocks;
    const bar = '\u2588'.repeat(filledBlocks) + '\u2591'.repeat(emptyBlocks);
    return `<span class="text-terminal-accent">[${bar}]</span> <span class="text-terminal-dim">${percent}% (${completed}/${total})</span>`;
}


function loadBisProgress(): any {
    try {
        const saved = localStorage.getItem(BIS_STORAGE_KEY);
        return saved ? JSON.parse(saved) : {};
    } catch (e) {
        console.error('Error loading BiS progress:', e);
        return {};
    }
}

function saveBisProgress(itemKey: string, completed: boolean): void {
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

function getBisItemKey(className: string, specName: string, phase: any, slot: string, itemName: string): string {
    return `${className}-${specName}-${phase}-${slot}-${stripPriorityLabel(itemName).toLowerCase().replace(/[^a-z0-9]/g, '')}`;
}



function loadRepProgress(): any {
    try {
        const saved = localStorage.getItem(REP_STORAGE_KEY);
        return saved ? JSON.parse(saved) : {};
    } catch (e) {
        console.error('Error loading reputation progress:', e);
        return {};
    }
}

function saveRepProgress(factionId: string, standing: string): void {
    try {
        const progress = loadRepProgress();
        progress[factionId] = standing;
        localStorage.setItem(REP_STORAGE_KEY, JSON.stringify(progress));
    } catch (e) {
        console.error('Error saving reputation progress:', e);
    }
}



function loadLockoutProgress(): any {
    try {
        const saved = localStorage.getItem(LOCKOUT_STORAGE_KEY);
        return saved ? JSON.parse(saved) : {};
    } catch (e) {
        console.error('Error loading lockout progress:', e);
        return {};
    }
}

function saveLockoutProgress(raidId: string, locked: boolean, timestamp: number | null = null): void {
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

function checkLockoutExpiry(): any {
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


function loadGuildProgress(): any {
    try {
        const saved = localStorage.getItem(GUILD_PROGRESS_KEY);
        return saved ? JSON.parse(saved) : {};
    } catch (e) {
        console.error('Error loading guild progress:', e);
        return {};
    }
}

function saveGuildProgress(bossId: string, killCount: number): void {
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

function renderAttunementsContent(attunementKey: string = 'karazhan'): void {
    currentClass = null;
    currentAttunement = attunementKey;
    document.querySelectorAll('.class-list li').forEach((li: any) => li.classList.remove('active'));
    const attunementsLink = document.querySelector('.nav-link[data-view="attunements"]');
    if (attunementsLink) attunementsLink.parentElement!.classList.add('active');

    const attunementOrder = ['karazhan', 'ssc', 'tk', 'hyjal', 'bt', 'heroicKeys'];
    const attunementLabels: any = {
        karazhan: 'Karazhan',
        ssc: 'SSC',
        tk: 'TK',
        hyjal: 'Hyjal',
        bt: 'Black Temple',
        heroicKeys: 'Heroic Keys'
    };

    const attunementButtons = attunementOrder.map((key: string) => {
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
            <button onclick="clearAttunementProgress(); renderAttunementsContent('${attunementKey}');" class="text-xs text-terminal-dim hover:text-red-400 cursor-pointer bg-transparent border-none font-mono">[Clear All Progress]</button>
        </div>
    `;

    const mainContent = document.getElementById('main-content')!;
    mainContent.style.opacity = '0.3';
    setTimeout(() => {
        mainContent.innerHTML = html;
        mainContent.style.opacity = '1';
        attachAttunementListeners();
        if (typeof $WowheadPower !== 'undefined' && $WowheadPower.refreshLinks) {
            $WowheadPower.refreshLinks();
            setTimeout(updateItemQualitiesFromWowhead, 50);
        }
    }, FADE_TRANSITION_MS);
}

function renderAttunementSteps(attunementKey: string, attunement: any): string {
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
        attunement.steps.forEach((step: any, index: number) => {
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

function renderHeroicKeysSteps(attunement: any, progress: any): string {
    let html = '<div class="border-t border-terminal-dim border-opacity-30">';

    attunement.steps.forEach((step: any) => {
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

function getStepTypeIcon(type: string): string {
    const icons: any = {
        'quest': '\u{1F4DC}',
        'dungeon': '\u{1F3F0}',
        'heroic': '\u{2694}\uFE0F',
        'raid': '\u{1F409}',
        'reputation': '\u{2B50}'
    };
    return icons[type] || '\u{1F4DC}';
}

function attachAttunementListeners(): void {
    document.querySelectorAll('.attunement-checkbox').forEach((cb: any) => {
        cb.addEventListener('change', (e: any) => {
            const stepId = e.target.id;
            const completed = e.target.checked;
            saveAttunementProgress(stepId, completed);

            const label = e.target.closest('.attunement-step');
            if (label) {
                label.classList.toggle('completed', completed);
            }


            const stats = getAttunementCompletionStats(currentAttunement);
            const progressFill = document.querySelector('.progress-bar-fill') as any;
            const progressText = (document.querySelector('.progress-bar-bg') as any)?.nextElementSibling;
            if (progressFill) {
                progressFill.style.width = `${stats.percent}%`;
            }
            if (progressText) {
                progressText.textContent = `${stats.percent}% (${stats.completed}/${stats.total})`;
            }


            const btn = document.querySelector(`.attunement-btn[data-attunement="${currentAttunement}"]`) as any;
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

    document.querySelectorAll('.attunement-btn').forEach((btn: any) => {
        btn.addEventListener('click', (e: any) => {
            if (e.ctrlKey || e.metaKey || e.button === 1) return;
            e.preventDefault();
            window.location.hash = `#attunements/${btn.dataset.attunement}`;
        });
    });
}

function renderRecipesContent(): void {
    currentClass = null;
    document.querySelectorAll('.class-list li').forEach((li: any) => li.classList.remove('active'));
    const recipesLink = document.querySelector('.class-list li[data-view="recipes"]');
    if (recipesLink) recipesLink.classList.add('active');
    const priorityLabels: any = {
        high: { text: 'PRIORITY', class: 'text-red-400' },
        medium: { text: 'GOOD', class: 'text-yellow-400' },
        low: { text: 'OPTIONAL', class: 'text-green-400' }
    };
    const profession = recipesData[currentProfession];
    if (!profession) return;
    const profEmojis: any = {blacksmithing: '⚒️', leatherworking: '🥾', tailoring: '🧵', jewelcrafting: '💎', engineering: '⚙️', alchemy: '⚗️', enchanting: '✨'};
    const currentProfEmoji = profEmojis[currentProfession] || '📜';
    let html = `
        <div class="command-line text-terminal-dim my-5 md:text-[11px] md:my-3 sm:text-[10px]">query: profession_recipes --profession=${currentProfession}</div>
        <h2 class="text-terminal-accent text-lg mb-4 uppercase tracking-wide md:text-base md:mb-3 md:tracking-wider sm:text-sm sm:tracking-tight">${currentProfEmoji} [ ${profession.title.toUpperCase()} // TBC ]</h2>
        <p class="text-terminal-dim text-xs mb-6 md:mb-4 sm:mb-3">Essential ${profession.title} recipes to prioritize for raiding and gold making</p>
        <div class="flex flex-wrap gap-2 mb-6 md:gap-1.5 md:mb-4 sm:mb-3">
            ${Object.keys(recipesData).map((prof: string) => {
                return `<a href="#recipes/${prof}" class="profession-btn ${prof === currentProfession ? 'bg-terminal-text text-terminal-bg' : 'bg-transparent'} border border-terminal-text text-terminal-text px-4 py-2.5 cursor-pointer font-mono text-xs transition-all select-none hover:bg-terminal-text hover:text-terminal-bg no-underline md:px-3.5 md:py-2.5 md:text-[11px] md:min-h-[48px] md:inline-flex md:items-center md:justify-center sm:px-3 sm:py-2 sm:text-[10px] sm:min-h-[44px]" data-profession="${prof}">${profEmojis[prof] || ''} ${recipesData[prof].title}</a>`;
            }).join('')}
        </div>
    `;
    for (const [catKey, category] of Object.entries(profession.categories) as [string, any][]) {
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

            let recipeName: string;
            if (recipe.itemId) {

                recipeName = `<a href="https://tbc.wowhead.com/item=${recipe.itemId}" data-wowhead="item=${recipe.itemId}" class="text-terminal-accent hover:text-terminal-text">${recipe.name}</a>`;
            } else if (recipe.spellId && recipe.spellId > 0) {

                recipeName = `<a href="https://tbc.wowhead.com/spell=${recipe.spellId}" data-wowhead="spell=${recipe.spellId}" class="text-terminal-accent hover:text-terminal-text">${recipe.name}</a>`;
            } else {

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
    const mainContent = document.getElementById('main-content')!;
    mainContent.style.opacity = '0.3';
    setTimeout(() => {
        mainContent.innerHTML = html;
        mainContent.style.opacity = '1';

        document.querySelectorAll('.profession-btn').forEach((btn: any) => {
            btn.addEventListener('click', (e: any) => {
                if (e.ctrlKey || e.metaKey || e.button === 1) return;
                e.preventDefault();
                currentProfession = btn.dataset.profession;
                window.location.hash = `#recipes/${currentProfession}`;
            });
        });

        if (typeof $WowheadPower !== 'undefined' && $WowheadPower.refreshLinks) {
            $WowheadPower.refreshLinks();
            setTimeout(updateItemQualitiesFromWowhead, 50);
        }
    }, FADE_TRANSITION_MS);
}
function renderClassContent(className: string): void {
    const data = classData[className];
    if (!data) return;
    currentClass = className;

    if (!currentSpec || !data.specs[currentSpec]) {
        currentSpec = data.defaultSpec;
    }
    const specData = data.specs[currentSpec];
    if (!specData) return;

    if (!specData.phases[currentPhase]) {
        currentPhase = Object.keys(specData.phases)[0];
    }
    const phaseData = specData.phases[currentPhase];

    const phaseButtons = Object.keys(specData.phases)
        .map((p: string) => `<a href="#${className}/${currentSpec}/${p}" class="phase-btn ${p == currentPhase ? 'bg-terminal-text text-terminal-bg' : 'bg-transparent'} border border-terminal-text text-terminal-text px-4 py-2.5 cursor-pointer font-mono text-xs transition-all select-none hover:bg-terminal-text hover:text-terminal-bg no-underline md:px-3.5 md:py-2.5 md:text-[11px] md:min-h-[48px] md:inline-flex md:items-center md:justify-center sm:px-3 sm:py-2 sm:text-[10px] sm:min-h-[44px]" data-phase="${p}">${specData.phases[p].name}</a>`)
        .join('');
    const bisTable = generateBisTable(phaseData.bis, specData);

    let talentsHtml = '';
    if (specData.talents && specData.talents.length > 0) {
        const buildsList = specData.talents.map((build: any, buildIdx: number) => {
            const buildPrefix = buildIdx === specData.talents.length - 1 ? '└──' : '├──';
            let buildHtml = `${buildPrefix} ${build.name}\n`;
            build.trees.forEach((tree: any, treeIdx: number) => {
                if (tree.talents.length === 0) return;
                const treeIndent = buildIdx === specData.talents.length - 1 ? '    ' : '│   ';
                const treePrefix = treeIdx === build.trees.length - 1 ? '└──' : '├──';
                buildHtml += `${treeIndent}${treePrefix} ${tree.name}:\n`;
                tree.talents.forEach((talent: any, talentIdx: number) => {
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

    let gemsHtml = '';
    if (specData.gems && specData.gems.length > 0) {
        const gemsList = specData.gems.map((gem: string) => generateItemCell(gem)).join(' ');
        gemsHtml = `
            <h3 class="text-terminal-text text-sm my-4 uppercase md:text-[13px] md:my-3 sm:text-xs">💎 [ RECOMMENDED GEMS ]</h3>
            <div class="bg-terminal-bg/30 border border-terminal-dim p-4 my-4 font-mono text-xs leading-relaxed md:text-[11px] md:p-3 sm:text-[10px] sm:p-2.5">${gemsList}</div>
        `;
    }

    let macrosHtml = '';
    if (specData.macros && specData.macros.length > 0) {
        const macrosList = specData.macros.map((macro: any) => {
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

    let rotationHtml = '';
    if (specData.rotation) {
        const rot = specData.rotation;

        let priorityHtml = '';
        if (rot.priority && rot.priority.length > 0) {
            const priorityList = rot.priority.map((ability: any, idx: number) => {
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

        let openerHtml = '';
        if (rot.opener && rot.opener.length > 0) {
            const openerList = rot.opener.map((ability: any) => {
                const abilityLink = ability.spellId
                    ? `<a href="https://tbc.wowhead.com/spell=${ability.spellId}" data-wowhead="spell=${ability.spellId}" class="text-terminal-accent hover:text-terminal-text">${ability.name}</a>`
                    : `<span class="text-terminal-accent">${ability.name}</span>`;
                return abilityLink;
            }).join(' → ');
            openerHtml = `
                <h4 class="text-terminal-accent text-xs uppercase mb-2 mt-4 md:text-[11px] md:mb-1.5 sm:text-[10px]">// Opener</h4>
                <div class="bg-terminal-bg/50 border border-terminal-dim p-3 text-xs md:text-[11px] sm:text-[10px]">${openerList}</div>`;
        }

        let cooldownsHtml = '';
        if (rot.cooldowns && rot.cooldowns.length > 0) {
            const cdList = rot.cooldowns.map((cd: any) => {
                const cdLink = cd.spellId
                    ? `<a href="https://tbc.wowhead.com/spell=${cd.spellId}" data-wowhead="spell=${cd.spellId}" class="text-terminal-accent hover:text-terminal-text">${cd.name}</a>`
                    : `<span class="text-terminal-accent">${cd.name}</span>`;
                return `<div class="mb-2"><span class="text-terminal-text">•</span> ${cdLink}: <span class="text-terminal-dim">${cd.description}</span></div>`;
            }).join('');
            cooldownsHtml = `
                <h4 class="text-terminal-accent text-xs uppercase mb-2 mt-4 md:text-[11px] md:mb-1.5 sm:text-[10px]">// Cooldowns</h4>
                <div class="bg-terminal-bg/50 border border-terminal-dim p-3 text-xs md:text-[11px] sm:text-[10px]">${cdList}</div>`;
        }

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
        .map(([key, spec]: [string, any]) => `<a href="#${className}/${key}" class="spec-tab ${key === currentSpec ? 'border-terminal-accent text-terminal-accent' : 'border-terminal-dim'} inline-block py-2 px-3 mr-2.5 border cursor-pointer transition-all text-xs select-none hover:border-terminal-accent hover:text-terminal-accent no-underline md:py-2.5 md:px-3 md:text-[11px] md:min-h-[48px] md:inline-flex md:items-center md:mr-2 sm:py-2 sm:px-2.5 sm:text-[10px] sm:mr-1.5 sm:min-h-[44px]" data-spec="${key}">${spec.name}</a>`)
        .join('');
    const html = `
        <div class="command-line text-terminal-dim my-5 md:text-[11px] md:my-3 sm:text-[10px]">query: ${className}_pve_bis --spec=${currentSpec} --phase=${currentPhase}</div>
        <div class="mb-8 pb-5 border-b border-dashed border-terminal-dim last:border-b-0 md:mb-6 md:pb-4 sm:pb-3">
            <h2 class="text-terminal-accent text-lg mb-4 uppercase tracking-wide md:text-base md:mb-3 md:tracking-wider sm:text-sm sm:tracking-tight">[ ${data.title} // ${specData.name.toUpperCase()} PVE ]</h2>
            <p class="text-terminal-dim text-xs mb-4 md:text-[11px] sm:text-[10px]">Armor: ${data.armorType || 'Unknown'}</p>
            <h3 class="text-terminal-text text-sm my-4 uppercase md:text-[13px] md:my-3 sm:text-xs">🎯 [ SPEC SELECTION ]</h3>
            <div class="my-2.5">${specs}</div>
            <h3 class="text-terminal-text text-sm my-4 uppercase md:text-[13px] md:my-3 sm:text-xs">📊 [ STAT PRIORITY ]</h3>
            <div class="my-2.5 text-terminal-text text-xs md:text-[11px] sm:text-[10px]">${specData.statPriority ? specData.statPriority.map((stat: string, i: number) => `<span class="${i === 0 ? 'text-terminal-accent' : ''}">${stat}</span>`).join(' > ') : '<span class="text-terminal-dim">Not specified</span>'}</div>
            <h3 class="text-terminal-text text-sm my-4 uppercase md:text-[13px] md:my-3 sm:text-xs">🔧 [ RECOMMENDED PROFESSIONS ]</h3>
            <div class="my-2.5">${data.professions ? data.professions.map((p: any) => `[ <a href="https://tbc.wowhead.com/skill=${p.skillId}" data-wowhead="skill=${p.skillId}" class="text-terminal-text hover:text-terminal-accent">${p.name}</a> ]`).join(' ') : '<span class="text-terminal-dim">None specified</span>'}</div>
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
    const mainContent = document.getElementById('main-content')!;
    mainContent.style.opacity = '0.3';
    setTimeout(() => {
        mainContent.innerHTML = html;
        mainContent.style.opacity = '1';
        processItemLinks();
        attachEventListeners(specData);
    }, FADE_TRANSITION_MS);
}
function attachEventListeners(specData: any): void {

    document.querySelectorAll('.phase-btn').forEach((btn: any) => {
        btn.addEventListener('click', function(this: any, e: any) {
            if (e.ctrlKey || e.metaKey || e.button === 1) return;
            e.preventDefault();

            document.querySelectorAll('.phase-btn').forEach((b: any) => {
                b.classList.remove('bg-terminal-text', 'text-terminal-bg');
                b.classList.add('bg-transparent', 'text-terminal-text');
            });

            this.classList.remove('bg-transparent', 'text-terminal-text');
            this.classList.add('bg-terminal-text', 'text-terminal-bg');
            const phase = parseInt(this.getAttribute('data-phase'));
            currentPhase = phase;
            history.replaceState(null, '', `#${currentClass}/${currentSpec}/${phase}`);
            const phaseData = specData.phases[phase];
            document.getElementById('bis-header')!.textContent = `[ BEST IN SLOT - ${phaseData.name} ]`;
            document.getElementById('bis-table')!.innerHTML = generateBisTable(phaseData.bis, specData);
            processItemLinks();
            attachBisCheckboxListeners();
        });
    });

    document.querySelectorAll('.spec-tab').forEach((tab: any) => {
        tab.addEventListener('click', function(this: any, e: any) {
            if (e.ctrlKey || e.metaKey || e.button === 1) return;
            e.preventDefault();
            const newSpec = this.getAttribute('data-spec');
            if (newSpec !== currentSpec) {
                currentSpec = newSpec;

                window.location.hash = `#${currentClass}/${newSpec}/${currentPhase}`;
            }
        });
    });

    attachBisCheckboxListeners();
}

function attachBisCheckboxListeners(): void {
    document.querySelectorAll('.bis-checkbox').forEach((cb: any) => {
        cb.addEventListener('change', function(this: any) {
            const itemKey = this.getAttribute('data-item-key');
            const isChecked = this.checked;
            saveBisProgress(itemKey, isChecked);

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

let preRaidClass: string = 'warrior';
let preRaidSpecName: string | null = null;
let preRaidGearText: string = '';
let preRaidDebounceTimer: any = null;
let selectedPhase: string = '1';


const PHASES: any[] = [
    { key: '1', name: 'Phase 1 (Karazhan/Gruul/Mag)', shortName: 'Karazhan' },
    { key: '2', name: 'Phase 2 (SSC/TK)', shortName: 'SSC/TK' },
    { key: '3', name: 'Phase 3 (Hyjal/BT)', shortName: 'Hyjal/BT' },
    { key: '4', name: 'Phase 4 (ZA)', shortName: 'ZA' },
    { key: '5', name: 'Phase 5 (Sunwell)', shortName: 'Sunwell' }
];


const RAID_THRESHOLDS: any = {
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


const SPEC_ROLES: any = {

    'shadow': 'caster_dps',
    'holy': 'healer',
    'discipline': 'healer',

    'fire': 'caster_dps',
    'frost': 'caster_dps',
    'arcane': 'caster_dps',

    'affliction': 'caster_dps',
    'demonology': 'caster_dps',
    'destruction': 'caster_dps',

    'balance': 'caster_dps',
    'feral': 'melee_dps',
    'feral tank': 'tank',
    'restoration': 'healer',

    'protection': 'tank',
    'retribution': 'melee_dps',

    'elemental': 'caster_dps',
    'enhancement': 'melee_dps',

    'arms': 'melee_dps',
    'fury': 'melee_dps',

    'combat': 'melee_dps',
    'assassination': 'melee_dps',
    'subtlety': 'melee_dps',

    'beast mastery': 'melee_dps',
    'marksmanship': 'melee_dps',
    'survival': 'melee_dps'
};


const GEAR_SLOTS: string[] = ['HELM', 'NECK', 'SHOULDER', 'CLOAK', 'CHEST', 'BRACER', 'GLOVES', 'BELT', 'LEGS', 'BOOTS', 'RING', 'TRINKET', 'WEAPON', 'OFF-HAND', 'RANGED'];


let bisStatsCache: any = {};


function findItemId(itemName: string): any {
    if (!itemIds || typeof itemIds !== 'object') return null;
    const lower = itemName.toLowerCase().trim();
    if (!lower) return null;

    for (const name in itemIds) {
        if (name.toLowerCase() === lower) return itemIds[name];
    }

    for (const name in itemIds) {
        if (name.toLowerCase().includes(lower)) return itemIds[name];
    }
    return null;
}


const itemSearchCache: any = {};


async function searchItemByName(itemName: string): Promise<any> {
    const lower = itemName.toLowerCase().trim();
    if (!lower) return null;


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

            const exactMatch = data.items.find((item: any) =>
                item.name.toLowerCase() === lower
            );

            const partialMatch = data.items.find((item: any) => {
                const itemLower = item.name.toLowerCase();
                return itemLower.includes(lower) || lower.includes(itemLower);
            });

            const result = exactMatch || partialMatch;
            if (!result) {

                itemSearchCache[lower] = null;
                return null;
            }


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


function cleanItemName(bisEntry: string): string {

    return bisEntry.replace(/\s*\((BEST|RECOMMENDED|OPTION|EASY)\)\s*$/i, '').trim();
}


function getRatingWeight(bisEntry: string): number {
    if (bisEntry.includes('(BEST)')) return 1.0;
    if (bisEntry.includes('(RECOMMENDED)')) return 0.85;
    if (bisEntry.includes('(OPTION)')) return 0.7;
    if (bisEntry.includes('(EASY)')) return 0.6;
    return 0.5;
}


function getPhaseBisList(className: string, specName: string, phaseKey: string): any[] {
    const cls = classData[className];
    if (!cls || !cls.specs || !cls.specs[specName]) return [];
    const spec = cls.specs[specName];
    if (!spec.phases) return [];

    const phase = spec.phases[phaseKey];
    return phase?.bis || [];
}


function getPreRaidBisList(className: string, specName: string): any[] {
    return getPhaseBisList(className, specName, '0');
}


async function calculatePhaseBisStats(className: string, specName: string, phaseKey: string): Promise<any> {
    const cacheKey = `${className}-${specName}-${phaseKey}`;
    if (bisStatsCache[cacheKey]) return bisStatsCache[cacheKey];

    const bisList = getPhaseBisList(className, specName, phaseKey);
    if (bisList.length === 0) return null;


    const bestBySlot: any = {};
    for (const [slot, itemName, source] of bisList) {
        if (itemName.includes('(BEST)') || !bestBySlot[slot]) {
            const cleanName = cleanItemName(itemName);
            const itemId = findItemId(cleanName);
            if (itemId) {
                bestBySlot[slot] = { itemId, name: cleanName };
            }
        }
    }


    const bisItemIds = Object.values(bestBySlot).map((item: any) => item.itemId);
    await fetchAllItemStats(bisItemIds);


    console.log(`[BiS ${phaseKey}] Slots:`, Object.keys(bestBySlot).length, Object.entries(bestBySlot).map(([slot, item]: [string, any]) => `${slot}: ${item.name}`));


    const statsArray = Object.values(bestBySlot)
        .map((item: any) => fetchedItemStats[item.itemId])
        .filter((stats: any) => stats && Object.values(stats).some((v: any) => typeof v === 'number' && v > 0));

    const totalStats = sumStats(statsArray);
    console.log(`[BiS ${phaseKey}] Total stats:`, totalStats);
    bisStatsCache[cacheKey] = totalStats;
    return totalStats;
}


function getStatStatus(userValue: number, bisValue: number, prevBisValue: number): any {
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


function getOverallStatus(userStats: any, bisStats: any, prevBisStats: any): any {

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


function getSpecRole(specName: string | null): string {
    const lower = specName?.toLowerCase() || '';
    return SPEC_ROLES[lower] || 'caster_dps';
}


function checkRaidThresholds(userStats: any, role: string, phaseKey: string): any {
    const thresholds = RAID_THRESHOLDS[role]?.[phaseKey];
    if (!thresholds) return { passed: [], failed: [], label: 'Unknown' };

    const results: any = { passed: [], failed: [], label: thresholds.label };

    for (const [stat, minValue] of Object.entries(thresholds)) {
        if (stat === 'label') continue;

        const userValue = userStats[stat] || 0;
        const statLabels: any = {
            hit: 'Hit Rating', spellhit: 'Spell Hit', spelldamage: 'Spell Damage', stamina: 'Stamina',
            healing: 'Healing', mp5: 'MP5', attackpower: 'Attack Power',
            crit: 'Crit %', defense: 'Defense', armor: 'Armor', dodge: 'Dodge %'
        };

        const entry = {
            stat,
            label: statLabels[stat] || stat,
            current: userValue,
            required: minValue,
            diff: userValue - (minValue as number)
        };

        if (userValue >= (minValue as number)) {
            results.passed.push(entry);
        } else {
            results.failed.push(entry);
        }
    }

    return results;
}


function compareItemsToBis(userItemNames: string[], bisList: any[]): any {
    const results: any = {};
    const usedUserItems = new Set<string>();


    const bisBySlot: any = {};
    for (const [slot, itemName, source] of bisList) {
        if (!bisBySlot[slot]) bisBySlot[slot] = [];
        bisBySlot[slot].push({
            name: cleanItemName(itemName),
            source,
            rating: getRatingWeight(itemName)
        });
    }


    for (const [slot, bisItems] of Object.entries(bisBySlot) as [string, any][]) {
        const bestBis = bisItems.find((i: any) => i.rating >= 1) || bisItems[0];


        let userMatch: string | null = null;
        let matchType = 'MISSING';

        for (const userName of userItemNames) {
            if (usedUserItems.has(userName.toLowerCase())) continue;

            const cleanUser = userName.toLowerCase().trim();


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


function parseAndMatchGear(gearText: string, bisList: any[]): any[] {
    const lines = gearText.split('\n').map((l: string) => l.trim()).filter((l: string) => l);
    const results: any[] = [];

    for (const line of lines) {
        const itemId = findItemId(line);
        let bisMatch: any = null;
        let slot: string | null = null;
        let rating: number | null = null;


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
            rating: rating || (itemId ? 0.3 : 0)
        });
    }

    return results;
}


const RAID_REQUIREMENTS: any = {
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


function calculateGearReadiness(matchResults: any[]): number {
    if (matchResults.length === 0) return 0;


    const slotsFilled: any = {};

    for (const result of matchResults) {
        if (result.slot && result.rating) {

            if (!slotsFilled[result.slot] || slotsFilled[result.slot] < result.rating) {
                slotsFilled[result.slot] = result.rating;
            }
        }
    }


    const filledSlots = Object.keys(slotsFilled).length;
    const totalSlots = 15;
    const avgRating = filledSlots > 0 ? (Object.values(slotsFilled) as number[]).reduce((a, b) => a + b, 0) / filledSlots : 0;


    const coverage = Math.min(filledSlots / totalSlots, 1);
    return Math.round(coverage * (avgRating as number) * 100);
}


function parseTooltipStats(tooltipHtml: string): any {
    const stats: any = {
        stamina: 0, intellect: 0, strength: 0, agility: 0, spirit: 0,
        armor: 0, defense: 0, dodge: 0, parry: 0, block: 0,
        hit: 0, crit: 0, haste: 0, expertise: 0, attackpower: 0, armorpen: 0,
        spellhit: 0, spellcrit: 0, spellhaste: 0, spelldamage: 0, healing: 0, mp5: 0
    };
    if (!tooltipHtml) return stats;


    const text = tooltipHtml
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/Socket Bonus:.*?(?=Durability|Requires|Equip:|$)/gi, '')
        .replace(/\s+/g, ' ');

    console.log('[TEXT]', text.substring(0, 300));


    const patterns: [RegExp, string][] = [
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


    for (const [pattern, statKey] of patterns) {
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const val = parseInt(match[1], 10);
            if (val > 0) {
                stats[statKey] += val;
            }
        }
    }


    const nonZero = Object.entries(stats).filter(([k,v]: [string, any]) => v > 0);
    console.log('[PARSED]', nonZero.length > 0 ? Object.fromEntries(nonZero) : 'NONE');

    return stats;
}


function sumStats(statsArray: any[]): any {
    const total: any = {
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


let fetchedItemStats: any = {};
let tooltipFetchInProgress: boolean = false;
let preloadContainer: any = null;


let capturedTooltips: any = {};


function extractTooltipFromResponse(text: string, itemIdHint: string | null): boolean {

    const tooltipMatch = text.match(/"tooltip_enus"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    if (tooltipMatch) {

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


(function() {
    const origOpen = XMLHttpRequest.prototype.open;
    const origSend = XMLHttpRequest.prototype.send;

    (XMLHttpRequest.prototype as any).open = function(method: string, url: string) {
        (this as any)._whUrl = url;
        return origOpen.apply(this, arguments as any);
    };

    (XMLHttpRequest.prototype as any).send = function() {
        const xhr = this;
        const url = (xhr as any)._whUrl || '';


        if (url.includes('wowhead.com')) {
            console.log('[XHR]', url);
            xhr.addEventListener('load', function() {
                try {
                    const text = xhr.responseText;
                    console.log('[XHR RESPONSE]', url, text.substring(0, 200));


                    const idMatch = url.match(/item[=\/](\d+)/);
                    extractTooltipFromResponse(text, idMatch ? idMatch[1] : null);
                } catch(e) {
                    console.log('[XHR ERROR]', e);
                }
            });
        }
        return origSend.apply(this, arguments as any);
    };
})();


(function() {
    const origFetch = window.fetch;
    (window as any).fetch = function(url: any, options: any) {
        const urlStr = typeof url === 'string' ? url : url.url || '';

        if (urlStr.includes('wowhead.com')) {
            console.log('[FETCH API]', urlStr);
            return origFetch.apply(this, arguments as any).then((response: Response) => {
                const clone = response.clone();
                clone.text().then((text: string) => {
                    console.log('[FETCH RESPONSE]', urlStr, text.substring(0, 200));
                    const idMatch = urlStr.match(/item[=\/](\d+)/);
                    extractTooltipFromResponse(text, idMatch ? idMatch[1] : null);
                });
                return response;
            });
        }
        return origFetch.apply(this, arguments as any);
    };
})();


(function() {

    const observer = new MutationObserver((mutations: MutationRecord[]) => {
        for (const mutation of mutations) {
            for (const node of Array.from(mutation.addedNodes)) {
                if ((node as any).tagName === 'SCRIPT' && (node as any).src && (node as any).src.includes('wowhead.com')) {
                    console.log('[SCRIPT ADDED]', (node as any).src);
                }
            }
        }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });


    function hookWowhead(): void {
        if (typeof $WowheadPower === 'undefined') {
            setTimeout(hookWowhead, 100);
            return;
        }

        console.log('[WOWHEAD] Hooking $WowheadPower, methods:', Object.keys($WowheadPower));


        const checkObj = (obj: any) => {
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


function getTooltipFromCache(itemId: any): any {
    return capturedTooltips[String(itemId)] || null;
}


async function fetchTooltipDirect(itemId: any): Promise<any> {
    if (capturedTooltips[itemId]) {
        return capturedTooltips[itemId];
    }


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
        } catch(e: any) {
            console.log('[FETCH ERROR]', url, e.message);
        }
    }

    return null;
}


async function fetchAllItemStats(itemIds: any[]): Promise<void> {
    console.log('[FETCH] fetchAllItemStats called with:', itemIds);
    if (tooltipFetchInProgress) {
        console.log('[FETCH] Already in progress, returning');
        return;
    }
    tooltipFetchInProgress = true;

    const statusDiv = document.getElementById('stats-status');
    const emptyStats: any = { stamina: 0, intellect: 0, strength: 0, agility: 0, spirit: 0, armor: 0, defense: 0, dodge: 0, parry: 0, block: 0, hit: 0, crit: 0, haste: 0, expertise: 0, attackpower: 0, armorpen: 0, spellhit: 0, spellcrit: 0, spellhaste: 0, spelldamage: 0, healing: 0, mp5: 0 };

    const toFetch = itemIds.filter((id: any) => !fetchedItemStats[id]);
    console.log('[FETCH] Items to fetch (not cached):', toFetch);
    if (toFetch.length === 0) {
        if (statusDiv) statusDiv.innerHTML = '<span class="text-terminal-accent">Stats cached!</span>';
        tooltipFetchInProgress = false;
        return;
    }

    if (statusDiv) statusDiv.innerHTML = `<span class="text-yellow-400">Loading ${toFetch.length} items...</span>`;


    let loaded = 0;
    const fetchPromises = toFetch.map(async (id: any) => {
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


async function updateStatsDisplay(itemIdsList?: any[]): Promise<void> {
    const statsDiv = document.getElementById('total-stats');
    const readinessDiv = document.getElementById('stat-readiness');
    if (!statsDiv) return;


    if (!itemIdsList) {
        const gearText = (document.getElementById('gear-input') as any)?.value || '';
        const lines = gearText.split('\n').map((l: string) => l.trim()).filter((l: string) => l);
        itemIdsList = lines.map((l: string) => findItemId(l)).filter(Boolean);
    }


    const userItemStats = itemIdsList!
        .map((id: any) => fetchedItemStats[id])
        .filter((stats: any) => stats && Object.values(stats).some((v: any) => typeof v === 'number' && v > 0));

    if (userItemStats.length === 0) {
        statsDiv.innerHTML = '<span class="text-yellow-400">No stats loaded yet. Click Calculate Stats.</span>';
        if (readinessDiv) readinessDiv.innerHTML = '';
        return;
    }

    const userTotal = sumStats(userItemStats);


    const bisStats = await calculatePhaseBisStats(preRaidClass, preRaidSpecName as string, selectedPhase);
    const prevPhaseKey = String(Math.max(0, parseInt(selectedPhase) - 1));
    const prevBisStats = prevPhaseKey !== selectedPhase ? await calculatePhaseBisStats(preRaidClass, preRaidSpecName as string, prevPhaseKey) : null;


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


    const relevantStats = statDefs.filter((s: any) =>
        userTotal[s.key] > 0 || (bisStats && bisStats[s.key] > 0)
    );


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


    if (readinessDiv) {
        const phaseName = PHASES.find((p: any) => p.key === selectedPhase)?.shortName || `Phase ${selectedPhase}`;
        const role = getSpecRole(preRaidSpecName);
        const thresholds = checkRaidThresholds(userTotal, role, selectedPhase);


        const gearText = (document.getElementById('gear-input') as any)?.value || '';
        const userItemNames = gearText.split('\n').map((l: string) => l.trim()).filter((l: string) => l);
        const bisList = getPhaseBisList(preRaidClass, preRaidSpecName as string, selectedPhase);
        const slotComparison = compareItemsToBis(userItemNames, bisList);


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


        for (const t of thresholds.passed) {
            readinessHtml += `
                <div class="flex items-center justify-between">
                    <span class="text-terminal-accent">✓ ${t.label}</span>
                    <span class="text-terminal-text">${t.current} / ${t.required}</span>
                </div>
            `;
        }


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


        const slotEntries = Object.entries(slotComparison);
        if (slotEntries.length > 0) {
            readinessHtml += `
                <div class="border-t border-terminal-dim/30 pt-3 mt-3">
                    <h5 class="text-terminal-dim text-[10px] uppercase mb-2">// Gear Slots</h5>
                    <div class="space-y-1 text-[10px] max-h-48 overflow-y-auto">
            `;

            for (const [slot, data] of slotEntries as [string, any][]) {
                const statusColors: any = {
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

function detectRole(stats: any): string {
    if (stats.defense > 100 || stats.parry > 50 || stats.dodge > 50) return 'tank';
    if (stats.healing > stats.spelldamage && stats.healing > 0) return 'healer';
    if (stats.spelldamage > 200 || stats.spellhit > 50) return 'caster';
    return 'melee';
}


async function updateGearPreview(): Promise<void> {
    const previewDiv = document.getElementById('gear-preview');
    if (!previewDiv) return;

    const gearText = (document.getElementById('gear-input') as any)?.value || '';
    preRaidGearText = gearText;

    if (!gearText.trim()) {
        previewDiv.innerHTML = '<span class="text-terminal-dim">Items will appear here as you type...</span>';
        return;
    }

    const bisList = getPreRaidBisList(preRaidClass, preRaidSpecName as string);
    const matchResults = parseAndMatchGear(gearText, bisList);


    const unknownItems = matchResults.filter((r: any) => !r.itemId);
    if (unknownItems.length > 0) {

        const searchingHtml = matchResults.map((r: any) => {
            if (r.itemId) {
                const bisTag = r.bisMatch ? `<span class="text-terminal-accent ml-2">[BiS${r.slot ? ' - ' + r.slot : ''}]</span>` : '';
                return `<div class="py-1"><a href="https://tbc.wowhead.com/item=${r.itemId}" data-wowhead="item=${r.itemId}" class="text-wow-uncommon hover:text-terminal-text">${r.input}</a>${bisTag}</div>`;
            }
            return `<div class="py-1"><span class="text-yellow-400">${r.input}</span> <span class="text-terminal-dim">(searching...)</span></div>`;
        }).join('');
        previewDiv.innerHTML = searchingHtml;


        await Promise.all(unknownItems.map(async (r: any) => {
            const result = await searchItemByName(r.input);
            if (result && result.id) {
                r.itemId = result.id;
                r.found = true;
                r.fromBlizzard = true;
            }
        }));
    }


    const previewHtml = matchResults.map((r: any) => {
        if (r.itemId) {
            const bisTag = r.bisMatch ? `<span class="text-terminal-accent ml-2">[BiS${r.slot ? ' - ' + r.slot : ''}]</span>` : '';
            const foundTag = r.fromBlizzard ? `<span class="text-blue-400 ml-2">[Found]</span>` : '';
            return `<div class="py-1"><a href="https://tbc.wowhead.com/item=${r.itemId}" data-wowhead="item=${r.itemId}" class="text-wow-uncommon hover:text-terminal-text">${r.input}</a>${bisTag}${foundTag}</div>`;
        }
        return `<div class="py-1"><span class="text-red-400">${r.input}</span> <span class="text-terminal-dim">(not found)</span></div>`;
    }).join('');

    previewDiv.innerHTML = previewHtml || '<span class="text-terminal-dim">No items entered</span>';


    if (typeof $WowheadPower !== 'undefined' && $WowheadPower.refreshLinks) {
        $WowheadPower.refreshLinks();
        setTimeout(updateItemQualitiesFromWowhead, 50);
    }
}

function renderPreRaidChecker(): void {
    currentClass = null;
    document.querySelectorAll('.class-list li').forEach((li: any) => li.classList.remove('active'));
    const preRaidLink = document.querySelector('.class-list li[data-view="raidready"]');
    if (preRaidLink) preRaidLink.classList.add('active');


    const classes = Object.keys(classData);
    if (!preRaidClass || !classData[preRaidClass]) {
        preRaidClass = classes[0] || 'warrior';
    }
    const specs = classData[preRaidClass]?.specs ? Object.keys(classData[preRaidClass].specs) : [];
    if (!preRaidSpecName || !specs.includes(preRaidSpecName)) {
        preRaidSpecName = classData[preRaidClass]?.defaultSpec || specs[0];
    }


    const savedCharacters = loadAllCharacters();
    const charOptions = savedCharacters.length > 0
        ? `<option value="">-- Select Character --</option>` + savedCharacters.map((c: any) =>
            `<option value="${c.id}" ${c.id === currentCharacterId ? 'selected' : ''}>${c.name}</option>`
          ).join('')
        : `<option value="">No saved characters</option>`;

    const html = `
        <div class="command-line text-terminal-dim my-5 md:text-[11px] md:my-3 sm:text-[10px]">./gear-checker --class=${preRaidClass} --spec=${preRaidSpecName} --phase=${selectedPhase}</div>
        <h2 class="text-terminal-accent text-lg mb-2 uppercase tracking-wide md:text-base sm:text-sm">⚖️ [ GEAR CHECKER ]</h2>
        <p class="text-terminal-dim text-xs mb-6 md:mb-4 sm:mb-3">Paste your gear list to compare against BiS for any raid tier. Save characters for quick access.</p>

        <div class="grid grid-cols-4 gap-4 mb-6 md:grid-cols-2 sm:grid-cols-1">
            <div>
                <label class="text-terminal-dim text-xs block mb-2">🎭 CLASS</label>
                <select id="raidready-class" class="w-full bg-terminal-bg border border-terminal-text text-terminal-text px-3 py-2 text-xs font-mono cursor-pointer">
                    ${classes.map((c: string) => `<option value="${c}" ${c === preRaidClass ? 'selected' : ''}>${classData[c]?.title || c}</option>`).join('')}
                </select>
            </div>
            <div>
                <label class="text-terminal-dim text-xs block mb-2">🎯 SPEC</label>
                <select id="raidready-spec" class="w-full bg-terminal-bg border border-terminal-text text-terminal-text px-3 py-2 text-xs font-mono cursor-pointer">
                    ${specs.map((s: string) => `<option value="${s}" ${s === preRaidSpecName ? 'selected' : ''}>${classData[preRaidClass]?.specs[s]?.title || s}</option>`).join('')}
                </select>
            </div>
            <div>
                <label class="text-terminal-dim text-xs block mb-2">🏰 READY FOR</label>
                <select id="phase-select" class="w-full bg-terminal-bg border border-terminal-accent text-terminal-accent px-3 py-2 text-xs font-mono cursor-pointer">
                    ${PHASES.map((p: any) => `<option value="${p.key}" ${p.key === selectedPhase ? 'selected' : ''}>${p.name}</option>`).join('')}
                </select>
            </div>
            <div>
                <label class="text-terminal-dim text-xs block mb-2">📂 SAVED CHARS</label>
                <div class="flex gap-2">
                    <select id="char-select" class="flex-1 bg-terminal-bg border border-terminal-dim text-terminal-text px-3 py-2 text-xs font-mono cursor-pointer">
                        ${charOptions}
                    </select>
                    ${savedCharacters.length > 0 ? `<button id="delete-char-btn" class="text-red-400 hover:text-red-300 px-2 text-xs border border-red-400/50 hover:border-red-400" title="Delete selected character">✕</button>` : ''}
                </div>
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

        <div class="mb-6 flex flex-wrap items-center gap-3">
            <button id="fetch-stats-btn" class="bg-terminal-accent text-terminal-bg px-6 py-2 font-mono text-xs font-bold cursor-pointer hover:bg-terminal-text transition-colors">
                [ CALCULATE STATS ]
            </button>
            <div class="flex items-center gap-2">
                <input type="text" id="char-name-input" class="bg-terminal-bg border border-terminal-dim text-terminal-text px-3 py-2 text-xs font-mono w-32" placeholder="Char name...">
                <button id="save-char-btn" class="border border-terminal-text text-terminal-text px-4 py-2 font-mono text-xs cursor-pointer hover:bg-terminal-text hover:text-terminal-bg transition-colors">
                    [ SAVE CHAR ]
                </button>
            </div>
            <span id="stats-status" class="text-xs"></span>
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

    const mainContent = document.getElementById('main-content')!;
    mainContent.style.opacity = '0.3';
    setTimeout(() => {
        mainContent.innerHTML = html;
        mainContent.style.opacity = '1';


        document.getElementById('raidready-class')!.addEventListener('change', (e: any) => {
            preRaidClass = e.target.value;
            preRaidSpecName = classData[preRaidClass]?.defaultSpec || Object.keys(classData[preRaidClass]?.specs || {})[0];
            renderPreRaidChecker();
        });


        document.getElementById('raidready-spec')!.addEventListener('change', (e: any) => {
            preRaidSpecName = e.target.value;
            bisStatsCache = {};
            updateGearPreview();

            updateStatsDisplay();
        });


        document.getElementById('phase-select')!.addEventListener('change', (e: any) => {
            selectedPhase = e.target.value;
            bisStatsCache = {};

            updateStatsDisplay();
        });


        document.getElementById('fetch-stats-btn')!.addEventListener('click', async () => {
            console.log('[BUTTON] Calculate Stats clicked!');
            const gearText = (document.getElementById('gear-input') as any)?.value || '';
            const lines = gearText.split('\n').map((l: string) => l.trim()).filter((l: string) => l);
            console.log('[BUTTON] Lines:', lines);
            const itemIdsList: any[] = [];

            for (const line of lines) {
                const itemId = findItemId(line);
                console.log('[BUTTON] Item:', line, '-> ID:', itemId);
                if (itemId) itemIdsList.push(itemId);
            }

            console.log('[BUTTON] Item IDs to fetch:', itemIdsList);

            if (itemIdsList.length > 0) {

                bisStatsCache = {};

                await fetchAllItemStats(itemIdsList);

                updateStatsDisplay(itemIdsList);
            } else {
                const statusDiv = document.getElementById('stats-status');
                if (statusDiv) statusDiv.innerHTML = '<span class="text-red-400">No valid items found</span>';
            }
        });


        document.getElementById('gear-input')!.addEventListener('input', () => {
            clearTimeout(preRaidDebounceTimer);
            preRaidDebounceTimer = setTimeout(updateGearPreview, 300);
        });


        document.getElementById('save-char-btn')!.addEventListener('click', () => {
            const charName = (document.getElementById('char-name-input') as any).value.trim();
            const gearText = (document.getElementById('gear-input') as any).value.trim();
            if (!gearText) {
                document.getElementById('stats-status')!.innerHTML = '<span class="text-red-400">No gear to save</span>';
                return;
            }
            const id = saveCharacterToList(charName || 'Unnamed', gearText);
            if (id) {
                currentCharacterId = id;
                document.getElementById('stats-status')!.innerHTML = '<span class="text-green-400">Character saved!</span>';
                renderPreRaidChecker();
            }
        });


        document.getElementById('char-select')!.addEventListener('change', (e: any) => {
            const charId = e.target.value;
            if (charId) {
                const char = getCharacterById(charId);
                if (char) {
                    currentCharacterId = charId;
                    preRaidGearText = char.gearText;
                    (document.getElementById('gear-input') as any).value = char.gearText;
                    (document.getElementById('char-name-input') as any).value = char.name;
                    updateGearPreview();
                }
            }
        });


        const deleteBtn = document.getElementById('delete-char-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', async () => {
                const charId = (document.getElementById('char-select') as any).value;
                if (charId && await showModal('Delete this character?', { confirmText: 'DELETE', cancelText: 'CANCEL' })) {
                    deleteCharacter(charId);
                    currentCharacterId = null;
                    renderPreRaidChecker();
                }
            });
        }


        if (preRaidGearText) {
            updateGearPreview();
        }
    }, FADE_TRANSITION_MS);
}


let currentHeroicZone: string = 'hellfire';

function renderHeroicsContent(zone: string = 'hellfire', dungeon: string | null = null): void {
    currentClass = null;
    currentHeroicZone = zone;
    document.querySelectorAll('.class-list li').forEach((li: any) => li.classList.remove('active'));
    const heroicsLink = document.querySelector('.nav-link[data-view="heroics"]');
    if (heroicsLink) heroicsLink.parentElement!.classList.add('active');

    const zoneButtons = Object.entries(heroicsData).map(([key, z]: [string, any]) =>
        `<a href="#heroics/${key}" class="heroic-zone-btn ${key === zone ? 'bg-terminal-accent text-terminal-bg' : 'bg-transparent text-terminal-accent'} border border-terminal-accent px-3 py-2 cursor-pointer font-mono text-xs transition-all select-none hover:bg-terminal-accent hover:text-terminal-bg no-underline md:px-2.5 md:py-1.5 md:text-[11px] sm:px-2 sm:py-1 sm:text-[10px]" data-zone="${key}">${z.name}</a>`
    ).join('');

    const zoneData = heroicsData[zone];


    const dungeonButtons = zoneData.dungeons.map((d: any) =>
        `<a href="#heroics/${zone}/${d.id}" class="heroic-dungeon-btn ${d.id === dungeon ? 'bg-terminal-text text-terminal-bg' : 'bg-transparent text-terminal-text'} border border-terminal-text px-3 py-2 cursor-pointer font-mono text-xs transition-all select-none hover:bg-terminal-text hover:text-terminal-bg no-underline md:px-2.5 md:py-1.5 md:text-[11px] sm:px-2 sm:py-1 sm:text-[10px]" data-dungeon="${d.id}">${d.name}</a>`
    ).join('');


    let contentHtml = '';

    const getDifficultyColor = (diff: string): string => ({
        'Easy': 'text-green-400',
        'Easy-Medium': 'text-green-300',
        'Medium': 'text-yellow-400',
        'Medium-Hard': 'text-orange-300',
        'Hard': 'text-orange-400',
        'Very Hard': 'text-red-400'
    } as any)[diff] || 'text-terminal-dim';

    if (dungeon) {

        const selectedDungeon = zoneData.dungeons.find((d: any) => d.id === dungeon);
        if (selectedDungeon) {
            const difficultyColor = getDifficultyColor(selectedDungeon.difficulty);


            const bossesHtml = selectedDungeon.bosses.map((boss: any, idx: number) => {
                const bossName = typeof boss === 'string' ? boss : boss.name;
                const bossDiff = boss.difficulty ? getDifficultyColor(boss.difficulty) : '';


                if (typeof boss === 'string') {
                    return `
                        <div class="border border-terminal-dim/50 p-3 md:p-2.5 sm:p-2">
                            <div class="flex items-center gap-2">
                                <span class="text-terminal-accent text-xs">[${idx + 1}]</span>
                                <span class="text-terminal-text text-sm font-semibold md:text-xs">${boss}</span>
                            </div>
                        </div>
                    `;
                }


                const abilitiesHtml = boss.abilities ? boss.abilities.map((ability: any) => `
                    <div class="border-l-2 border-terminal-accent/50 pl-3 mb-3 md:pl-2 md:mb-2">
                        <div class="text-terminal-text text-xs font-semibold mb-1 md:text-[11px]">${ability.name}</div>
                        <div class="text-terminal-dim text-xs mb-1 md:text-[11px] sm:text-[10px]">${ability.description}</div>
                        <div class="text-yellow-400 text-xs md:text-[11px] sm:text-[10px]">→ ${ability.handling}</div>
                    </div>
                `).join('') : '';

                const lootHtml = boss.loot ? boss.loot.map((item: string) =>
                    `<span class="text-wow-epic">• ${item}</span>`
                ).join(' ') : '';

                return `
                    <div class="border border-terminal-dim p-4 mb-4 md:p-3 sm:p-2.5">
                        <div class="flex justify-between items-start mb-3 flex-wrap gap-2">
                            <div class="flex items-center gap-2">
                                <span class="text-terminal-accent text-sm font-bold md:text-xs">[${idx + 1}]</span>
                                <span class="text-terminal-text text-base font-semibold md:text-sm">${boss.name}</span>
                            </div>
                            ${boss.difficulty ? `<span class="${bossDiff} text-xs border border-current px-2 py-0.5">[${boss.difficulty}]</span>` : ''}
                        </div>

                        ${boss.description ? `<p class="text-terminal-dim text-xs mb-4 md:text-[11px] sm:text-[10px]">${boss.description}</p>` : ''}

                        ${abilitiesHtml ? `
                            <div class="mb-4 md:mb-3">
                                <h5 class="text-terminal-accent text-xs mb-2 uppercase md:text-[11px]">⚡ Abilities</h5>
                                ${abilitiesHtml}
                            </div>
                        ` : ''}

                        ${boss.strategy ? `
                            <div class="mb-4 md:mb-3">
                                <h5 class="text-terminal-accent text-xs mb-2 uppercase md:text-[11px]">📋 Strategy</h5>
                                <div class="bg-terminal-bg/50 border border-terminal-accent/30 p-3 text-xs text-terminal-text md:p-2 md:text-[11px] sm:text-[10px]">
                                    ${boss.strategy}
                                </div>
                            </div>
                        ` : ''}

                        ${lootHtml ? `
                            <div>
                                <h5 class="text-terminal-accent text-xs mb-2 uppercase md:text-[11px]">🎁 Loot</h5>
                                <div class="text-xs md:text-[11px] sm:text-[10px]">${lootHtml}</div>
                            </div>
                        ` : ''}
                    </div>
                `;
            }).join('');


            const overviewHtml = `
                <div class="border border-terminal-accent/50 bg-terminal-bg/30 p-4 mb-6 md:p-3 md:mb-4 sm:p-2.5">
                    <div class="flex justify-between items-start mb-3 flex-wrap gap-2">
                        <h3 class="text-terminal-accent text-lg font-semibold md:text-base sm:text-sm">${selectedDungeon.name}</h3>
                        <span class="${difficultyColor} text-sm border border-current px-2 py-1 md:text-xs">[${selectedDungeon.difficulty}]</span>
                    </div>

                    ${selectedDungeon.description ? `<p class="text-terminal-dim text-xs mb-4 md:text-[11px] sm:text-[10px]">${selectedDungeon.description}</p>` : ''}

                    <div class="grid grid-cols-2 gap-3 text-xs md:grid-cols-1 md:gap-2 md:text-[11px] sm:text-[10px]">
                        ${selectedDungeon.estimatedTime ? `<div><span class="text-terminal-dim">Time:</span> <span class="text-terminal-text">${selectedDungeon.estimatedTime}</span></div>` : ''}
                        ${selectedDungeon.composition ? `<div><span class="text-terminal-dim">Comp:</span> <span class="text-terminal-text">${selectedDungeon.composition.recommended}</span></div>` : ''}
                    </div>

                    ${selectedDungeon.composition?.notes ? `
                        <div class="mt-3 text-xs text-yellow-400 md:text-[11px] sm:text-[10px]">
                            💡 ${selectedDungeon.composition.notes}
                        </div>
                    ` : ''}
                </div>
            `;


            const trashHtml = selectedDungeon.trashTips ? `
                <div class="border border-terminal-dim/50 p-4 mb-6 md:p-3 md:mb-4 sm:p-2.5">
                    <h4 class="text-terminal-text text-sm mb-2 uppercase md:text-xs">🗑️ [ TRASH TIPS ]</h4>
                    <p class="text-terminal-dim text-xs md:text-[11px] sm:text-[10px]">${selectedDungeon.trashTips}</p>
                </div>
            ` : '';

            contentHtml = `
                ${overviewHtml}
                ${trashHtml}
                <h4 class="text-terminal-text text-sm my-4 uppercase md:text-xs md:my-3">👹 [ BOSS GUIDES ]</h4>
                ${bossesHtml}
            `;
        }
    } else {

        const dungeonsHtml = zoneData.dungeons.map((d: any) => {
            const difficultyColor = getDifficultyColor(d.difficulty);
            const bossNames = d.bosses.map((b: any) => typeof b === 'string' ? b : b.name).join(' → ');

            return `
                <div class="border border-terminal-dim p-4 mb-4 md:p-3 sm:p-2.5">
                    <div class="flex justify-between items-start mb-2 flex-wrap gap-2">
                        <a href="#heroics/${zone}/${d.id}" class="text-terminal-text text-sm font-semibold hover:text-terminal-accent cursor-pointer no-underline md:text-xs">${d.name}</a>
                        <span class="${difficultyColor} text-xs">[${d.difficulty}]</span>
                    </div>
                    ${d.description ? `<p class="text-terminal-dim text-xs mb-2 md:text-[11px] sm:text-[10px]">${d.description}</p>` : ''}
                    <div class="text-terminal-dim text-xs mb-2 md:text-[11px] sm:text-[10px]">
                        <span class="text-terminal-accent">Bosses:</span> ${bossNames}
                    </div>
                    ${d.estimatedTime ? `<div class="text-terminal-dim text-xs md:text-[11px] sm:text-[10px]"><span class="text-terminal-accent">Time:</span> ${d.estimatedTime}</div>` : ''}
                </div>
            `;
        }).join('');
        contentHtml = dungeonsHtml;
    }

    const html = `
        <div class="command-line text-terminal-dim my-5 md:text-[11px] md:my-3 sm:text-[10px]">./heroic-guide --zone=${zone}${dungeon ? ` --dungeon=${dungeon}` : ''}</div>
        <h2 class="text-terminal-accent text-lg mb-2 uppercase tracking-wide md:text-base sm:text-sm">⚔️ [ HEROIC DUNGEONS GUIDE ]</h2>
        <p class="text-terminal-dim text-xs mb-6 md:mb-4 sm:mb-3">${zoneData.description || 'TBC Heroic dungeon strategies and key requirements'}</p>

        <h3 class="text-terminal-text text-sm my-4 uppercase md:text-[13px] md:my-3 sm:text-xs">🗝️ [ ZONE SELECT ]</h3>
        <div class="flex flex-wrap gap-2 mb-4 md:gap-1.5 md:mb-3">${zoneButtons}</div>

        <div class="border border-terminal-accent/50 bg-terminal-bg/30 p-4 mb-4 md:p-3 md:mb-3 sm:p-2.5">
            <h3 class="text-terminal-accent text-sm mb-2 md:text-xs">${zoneData.name}</h3>
            <div class="grid grid-cols-2 gap-4 text-xs md:grid-cols-1 md:gap-2 md:text-[11px] sm:text-[10px]">
                <div><span class="text-terminal-dim">Key:</span> <span class="text-terminal-text">${zoneData.key}</span></div>
                <div><span class="text-terminal-dim">Faction:</span> <span class="text-terminal-text">${zoneData.faction}</span></div>
                <div><span class="text-terminal-dim">Rep Required:</span> <span class="text-yellow-400">${zoneData.repRequired}</span></div>
            </div>
        </div>

        <h3 class="text-terminal-text text-sm my-4 uppercase md:text-[13px] md:my-3 sm:text-xs">🏰 [ DUNGEON SELECT ]</h3>
        <div class="flex flex-wrap gap-2 mb-6 md:gap-1.5 md:mb-4">${dungeonButtons}</div>

        ${dungeon ? '' : '<h3 class="text-terminal-text text-sm my-4 uppercase md:text-[13px] md:my-3 sm:text-xs">📜 [ ALL DUNGEONS ]</h3>'}
        ${contentHtml}
    `;

    const mainContent = document.getElementById('main-content')!;
    mainContent.style.opacity = '0.3';
    setTimeout(() => {
        mainContent.innerHTML = html;
        mainContent.style.opacity = '1';

        document.querySelectorAll('.heroic-zone-btn').forEach((btn: any) => {
            btn.addEventListener('click', function(this: any, e: any) {
                if (e.ctrlKey || e.metaKey || e.button === 1) return;
                e.preventDefault();
                window.location.hash = this.getAttribute('href');
            });
        });

        document.querySelectorAll('.heroic-dungeon-btn').forEach((btn: any) => {
            btn.addEventListener('click', function(this: any, e: any) {
                if (e.ctrlKey || e.metaKey || e.button === 1) return;
                e.preventDefault();
                window.location.hash = this.getAttribute('href');
            });
        });
    }, FADE_TRANSITION_MS);
}


function renderReputationTracker(): void {
    currentClass = null;
    document.querySelectorAll('.class-list li').forEach((li: any) => li.classList.remove('active'));
    const repLink = document.querySelector('.nav-link[data-view="reputation"]');
    if (repLink) repLink.parentElement!.classList.add('active');

    const repProgress = loadRepProgress();

    const factionsHtml = factionsData.factions.map((faction: any) => {
        const currentStanding = repProgress[faction.id] || 'neutral';
        const standingIndex = factionsData.standings.findIndex((s: any) => s.id === currentStanding);
        const standingData = factionsData.standings[standingIndex] || factionsData.standings[3];

        const standingColors: any = {
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

        const selectOptions = factionsData.standings.map((s: any) =>
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
                    <div class="progress-bar-fill" style="width: ${progressPercent}%; background: ${standingData.color}"></div>
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
            <button onclick="localStorage.removeItem('${REP_STORAGE_KEY}'); renderReputationTracker();" class="text-xs text-terminal-dim hover:text-red-400 cursor-pointer bg-transparent border-none font-mono">[Reset All]</button>
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

    const mainContent = document.getElementById('main-content')!;
    mainContent.style.opacity = '0.3';
    setTimeout(() => {
        mainContent.innerHTML = html;
        mainContent.style.opacity = '1';

        document.querySelectorAll('.rep-select').forEach((select: any) => {
            select.addEventListener('change', function(this: any) {
                const factionId = this.getAttribute('data-faction');
                const newStanding = this.value;
                saveRepProgress(factionId, newStanding);
                renderReputationTracker();
            });
        });
    }, FADE_TRANSITION_MS);
}


function renderLockoutTracker(): void {
    currentClass = null;
    document.querySelectorAll('.class-list li').forEach((li: any) => li.classList.remove('active'));
    const lockoutLink = document.querySelector('.nav-link[data-view="lockouts"]');
    if (lockoutLink) lockoutLink.parentElement!.classList.add('active');


    const lockoutProgress = checkLockoutExpiry();

    const raidsHtml = lockoutsData.raids.map((raid: any) => {
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
            <button onclick="localStorage.removeItem('${LOCKOUT_STORAGE_KEY}'); renderLockoutTracker();" class="text-xs text-terminal-dim hover:text-red-400 cursor-pointer bg-transparent border-none font-mono">[Clear All]</button>
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

    const mainContent = document.getElementById('main-content')!;
    mainContent.style.opacity = '0.3';
    setTimeout(() => {
        mainContent.innerHTML = html;
        mainContent.style.opacity = '1';

        document.querySelectorAll('.lockout-checkbox').forEach((cb: any) => {
            cb.addEventListener('change', function(this: any) {
                const raidId = this.getAttribute('data-raid');
                saveLockoutProgress(raidId, this.checked);
                renderLockoutTracker();
            });
        });
    }, FADE_TRANSITION_MS);
}


function renderGuildProgress(): void {
    currentClass = null;
    document.querySelectorAll('.class-list li').forEach((li: any) => li.classList.remove('active'));
    const guildLink = document.querySelector('.nav-link[data-view="guildprogress"]');
    if (guildLink) guildLink.parentElement!.classList.add('active');

    const guildProgress = loadGuildProgress();


    let allBosses: any[] = [];
    for (const [phaseKey, phaseData] of Object.entries(raidsData) as [string, any][]) {
        for (const [raidKey, raid] of Object.entries(phaseData.raids) as [string, any][]) {
            if (raid.bosses && raid.bosses.length > 0) {
                raid.bosses.forEach((boss: any) => {
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


    const bossesByRaid: any = {};
    allBosses.forEach((boss: any) => {
        if (!bossesByRaid[boss.raid]) {
            bossesByRaid[boss.raid] = { phase: boss.phase, bosses: [] };
        }
        bossesByRaid[boss.raid].bosses.push(boss);
    });

    const raidsHtml = Object.entries(bossesByRaid).map(([raidName, raidData]: [string, any]) => {
        const bossIds = raidData.bosses.map((b: any) => b.id);
        const bossesHtml = raidData.bosses.map((boss: any) => {
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

        const totalKills = raidData.bosses.reduce((sum: number, boss: any) => sum + (guildProgress[boss.id] || 0), 0);
        const clearedCount = raidData.bosses.filter((boss: any) => (guildProgress[boss.id] || 0) > 0).length;

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

    const totalAllKills = Object.values(guildProgress).reduce((sum: any, count: any) => sum + count, 0);

    const html = `
        <div class="command-line text-terminal-dim my-5 md:text-[11px] md:my-3 sm:text-[10px]">./guild-progress --show-kills</div>
        <h2 class="text-terminal-accent text-lg mb-2 uppercase tracking-wide md:text-base sm:text-sm">🎖️ [ GUILD PROGRESS TRACKER ]</h2>
        <p class="text-terminal-dim text-xs mb-2 md:mb-1.5 sm:mb-1">Track your guild's boss kill counts across all TBC raids.</p>
        <p class="text-terminal-accent text-sm mb-6 md:text-xs md:mb-4 sm:mb-3">Total Boss Kills: <span class="text-yellow-400">${totalAllKills}</span></p>

        <div class="flex justify-between items-center mb-4">
            <h3 class="text-terminal-text text-sm uppercase md:text-[13px] sm:text-xs">🏆 [ KILL COUNTERS ]</h3>
            <button onclick="localStorage.removeItem('${GUILD_PROGRESS_KEY}'); renderGuildProgress();" class="text-xs text-terminal-dim hover:text-red-400 cursor-pointer bg-transparent border-none font-mono">[Reset All]</button>
        </div>

        ${raidsHtml}
    `;

    const mainContent = document.getElementById('main-content')!;
    mainContent.style.opacity = '0.3';
    setTimeout(() => {
        mainContent.innerHTML = html;
        mainContent.style.opacity = '1';

        document.querySelectorAll('.kill-count-input').forEach((input: any) => {
            input.addEventListener('change', function(this: any) {
                const bossId = this.getAttribute('data-boss');
                const count = parseInt(this.value) || 0;
                saveGuildProgress(bossId, Math.max(0, count));
                renderGuildProgress();
            });
        });

        document.querySelectorAll('.kill-increment').forEach((btn: any) => {
            btn.addEventListener('click', function(this: any) {
                const bossId = this.getAttribute('data-boss');
                const current = guildProgress[bossId] || 0;
                saveGuildProgress(bossId, current + 1);
                renderGuildProgress();
            });
        });
        document.querySelectorAll('.kill-decrement').forEach((btn: any) => {
            btn.addEventListener('click', function(this: any) {
                const bossId = this.getAttribute('data-boss');
                const current = guildProgress[bossId] || 0;
                saveGuildProgress(bossId, Math.max(0, current - 1));
                renderGuildProgress();
            });
        });

        document.querySelectorAll('.full-clear-btn').forEach((btn: any) => {
            btn.addEventListener('click', function(this: any) {
                const bossIds = JSON.parse(this.getAttribute('data-bosses'));
                bossIds.forEach((bossId: string) => {
                    const current = guildProgress[bossId] || 0;
                    saveGuildProgress(bossId, current + 1);
                });
                renderGuildProgress();
            });
        });
    }, FADE_TRANSITION_MS);
}


const CHAR_IMPORT_KEY: string = 'tbctxt_characters';
let currentCharacterId: string | null = null;

function loadAllCharacters(): any[] {
    try {
        const saved = localStorage.getItem(CHAR_IMPORT_KEY);
        return saved ? JSON.parse(saved) : [];
    } catch (e) {
        return [];
    }
}

function saveCharacterToList(name: string, gearText: string): string | null {
    try {
        const characters = loadAllCharacters();
        const charName = name || 'Unnamed';


        const existingIndex = characters.findIndex((c: any) => c.name.toLowerCase() === charName.toLowerCase());

        if (existingIndex !== -1) {

            characters[existingIndex].gearText = gearText;
            characters[existingIndex].savedAt = Date.now();
            localStorage.setItem(CHAR_IMPORT_KEY, JSON.stringify(characters));
            return characters[existingIndex].id;
        } else {

            const id = Date.now().toString();
            const newChar = {
                id,
                name: charName,
                gearText,
                savedAt: Date.now()
            };
            characters.push(newChar);
            localStorage.setItem(CHAR_IMPORT_KEY, JSON.stringify(characters));
            return id;
        }
    } catch (e) {
        console.error('Error saving character:', e);
        return null;
    }
}

function deleteCharacter(charId: string): void {
    try {
        let characters = loadAllCharacters();
        characters = characters.filter((c: any) => c.id !== charId);
        localStorage.setItem(CHAR_IMPORT_KEY, JSON.stringify(characters));
    } catch (e) {
        console.error('Error deleting character:', e);
    }
}

function getCharacterById(charId: string): any {
    const characters = loadAllCharacters();
    return characters.find((c: any) => c.id === charId) || null;
}

function parseGearText(text: string): any[] {
    const lines = text.split('\n').map((l: string) => l.trim()).filter((l: string) => l);
    const foundItems: any[] = [];

    for (const line of lines) {

        const cleanLine = line.replace(/^\d+\.\s*/, '').replace(/\[|\]/g, '').trim();
        const itemId = findItemId(cleanLine);
        if (itemId) {
            foundItems.push({
                name: cleanLine,
                itemId: itemId,
                quality: getItemQuality(cleanLine)
            });
        } else {

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


const BUG_REPORT_CONFIG: any = {

    googleScriptUrl: 'https://script.google.com/macros/s/AKfycbx0OOy3YFpNVeaLspP4NlFdE2Hv60_YRj5tXmV3Cs7ggFJhDFIHjZMGTaCeO6QTR_PlUA/exec'
};

function renderBugReportForm(): void {
    currentClass = null;
    document.querySelectorAll('.class-list li').forEach((li: any) => li.classList.remove('active'));

    const html = `
        <div class="command-line text-terminal-dim my-5 md:text-[11px] md:my-3 sm:text-[10px]">submit --bug-report</div>
        <h2 class="text-terminal-accent text-lg mb-4 uppercase tracking-wide md:text-base md:mb-3 sm:text-sm">🐛 [ BUG REPORT ]</h2>
        <p class="text-terminal-dim text-xs mb-6 md:mb-4 sm:mb-3">Found an issue? Help us improve TBC.TXT by reporting bugs, incorrect data, or missing information.</p>

        <form id="bug-report-form" class="max-w-2xl">
            <div class="mb-4">
                <label class="block text-terminal-text text-xs mb-2 uppercase">Page / Section *</label>
                <select id="bug-page" required class="w-full bg-terminal-bg border border-terminal-dim text-terminal-text p-3 font-mono text-xs focus:border-terminal-accent focus:outline-none">
                    <option value="">-- Select Page --</option>
                    <optgroup label="Classes">
                        <option value="Warrior">Warrior</option>
                        <option value="Paladin">Paladin</option>
                        <option value="Hunter">Hunter</option>
                        <option value="Rogue">Rogue</option>
                        <option value="Priest">Priest</option>
                        <option value="Shaman">Shaman</option>
                        <option value="Mage">Mage</option>
                        <option value="Warlock">Warlock</option>
                        <option value="Druid">Druid</option>
                    </optgroup>
                    <optgroup label="Guides">
                        <option value="Raids">Raids</option>
                        <option value="Heroics">Heroics</option>
                        <option value="Attunements">Attunements</option>
                        <option value="Raid-Ready Checker">Raid-Ready Checker</option>
                    </optgroup>
                    <optgroup label="Database">
                        <option value="Recipes">Recipes</option>
                        <option value="Collections">Collections</option>
                    </optgroup>
                    <optgroup label="Trackers">
                        <option value="Reputation">Reputation</option>
                        <option value="Lockouts">Lockouts</option>
                        <option value="Guild Progress">Guild Progress</option>
                    </optgroup>
                    <optgroup label="Other">
                        <option value="General/Site-wide">General / Site-wide</option>
                        <option value="Other">Other</option>
                    </optgroup>
                </select>
            </div>

            <div class="mb-4">
                <label class="block text-terminal-text text-xs mb-2 uppercase">Issue Type *</label>
                <select id="bug-type" required class="w-full bg-terminal-bg border border-terminal-dim text-terminal-text p-3 font-mono text-xs focus:border-terminal-accent focus:outline-none">
                    <option value="">-- Select Issue Type --</option>
                    <option value="Wrong Item Data">Wrong Item Data (wrong stats, source, slot)</option>
                    <option value="Wrong BIS List">Wrong BIS List Item</option>
                    <option value="Wrong Talent Build">Wrong Talent Build</option>
                    <option value="Missing Information">Missing Information</option>
                    <option value="Broken Link/Tooltip">Broken Link or Tooltip</option>
                    <option value="Display/UI Issue">Display or UI Issue</option>
                    <option value="Feature Request">Feature Request</option>
                    <option value="Other">Other</option>
                </select>
            </div>

            <div class="mb-4">
                <label class="block text-terminal-text text-xs mb-2 uppercase">Spec / Phase (if applicable)</label>
                <input type="text" id="bug-spec" placeholder="e.g., Arms Warrior Phase 2, Holy Paladin PreRaid" class="w-full bg-terminal-bg border border-terminal-dim text-terminal-text p-3 font-mono text-xs focus:border-terminal-accent focus:outline-none placeholder:text-terminal-dim/50">
            </div>

            <div class="mb-6">
                <label class="block text-terminal-text text-xs mb-2 uppercase">Description *</label>
                <textarea id="bug-description" required rows="6" placeholder="Please describe the issue in detail. Include:&#10;- What is wrong&#10;- What it should be&#10;- Source/reference if possible (e.g., Wowhead link)" class="w-full bg-terminal-bg border border-terminal-dim text-terminal-text p-3 font-mono text-xs focus:border-terminal-accent focus:outline-none resize-y placeholder:text-terminal-dim/50"></textarea>
            </div>

            <div class="flex gap-4">
                <button type="submit" id="bug-submit-btn" class="bg-terminal-accent text-terminal-bg px-6 py-3 font-mono text-xs uppercase cursor-pointer border-none hover:bg-terminal-text transition-colors">
                    [ SUBMIT REPORT ]
                </button>
                <button type="button" onclick="document.getElementById('bug-report-form').reset();" class="bg-transparent text-terminal-dim px-6 py-3 font-mono text-xs uppercase cursor-pointer border border-terminal-dim hover:border-terminal-text hover:text-terminal-text transition-colors">
                    [ CLEAR ]
                </button>
            </div>
        </form>

        <div id="bug-report-status" class="mt-6 hidden"></div>

        <div class="mt-8 pt-6 border-t border-terminal-dim">
            <h3 class="text-terminal-text text-sm mb-3 uppercase">// Quick Tips</h3>
            <ul class="text-terminal-dim text-xs space-y-2">
                <li>• For BIS issues, mention the exact item name and what it should be replaced with</li>
                <li>• Include Wowhead links when possible to help verify the correct data</li>
                <li>• Check if the issue is for TBC Classic (2.5.x) not WotLK or Retail</li>
            </ul>
        </div>
    `;

    const mainContent = document.getElementById('main-content')!;
    mainContent.style.opacity = '0.3';
    setTimeout(() => {
        mainContent.innerHTML = html;
        mainContent.style.opacity = '1';
        attachBugReportListeners();
    }, FADE_TRANSITION_MS);
}

function attachBugReportListeners(): void {
    const form = document.getElementById('bug-report-form')!;
    const statusDiv = document.getElementById('bug-report-status')!;
    const submitBtn = document.getElementById('bug-submit-btn') as any;

    form.addEventListener('submit', async (e: Event) => {
        e.preventDefault();


        if (BUG_REPORT_CONFIG.googleScriptUrl === 'YOUR_GOOGLE_SCRIPT_URL_HERE') {
            statusDiv.className = 'mt-6 p-4 border border-yellow-500 text-yellow-500';
            statusDiv.innerHTML = '⚠️ Bug report form not configured. Please set up Google Sheets integration.';
            statusDiv.classList.remove('hidden');
            return;
        }

        const data = {
            page: (document.getElementById('bug-page') as any).value,
            issueType: (document.getElementById('bug-type') as any).value,
            spec: (document.getElementById('bug-spec') as any).value || 'N/A',
            description: (document.getElementById('bug-description') as any).value
        };


        submitBtn.disabled = true;
        submitBtn.textContent = '[ SUBMITTING... ]';
        submitBtn.classList.add('opacity-50', 'cursor-not-allowed');

        try {
            const response = await fetch(BUG_REPORT_CONFIG.googleScriptUrl, {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });


            statusDiv.className = 'mt-6 p-4 border border-terminal-accent text-terminal-accent';
            statusDiv.innerHTML = '✓ Bug report submitted successfully! Thank you for helping improve TBC.TXT.';
            statusDiv.classList.remove('hidden');
            (form as any).reset();

        } catch (error) {
            console.error('Bug report submission error:', error);
            statusDiv.className = 'mt-6 p-4 border border-red-500 text-red-500';
            statusDiv.innerHTML = '✗ Failed to submit report. Please try again or report via GitHub.';
            statusDiv.classList.remove('hidden');
        }


        submitBtn.disabled = false;
        submitBtn.textContent = '[ SUBMIT REPORT ]';
        submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    });
}

function renderApiDocs(): void {
    currentClass = null;
    document.querySelectorAll('.class-list li').forEach((li: any) => li.classList.remove('active'));
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
    const mainContent = document.getElementById('main-content')!;
    mainContent.style.opacity = '0.3';
    setTimeout(() => {
        mainContent.innerHTML = html;
        mainContent.style.opacity = '1';
    }, 200);
}
function navigateToHash(hash: string): void {
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
        renderHeroicsContent(parts[1] || 'hellfire', parts[2] || null);
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
    } else if (page === 'raidready') {
        renderPreRaidChecker();
    } else if (page === 'api') {
        renderApiDocs();
    } else if (page === 'bug-report') {
        renderBugReportForm();
    } else {

        currentClass = page;
        if (parts[1]) currentSpec = parts[1];
        if (parts[2]) currentPhase = parseInt(parts[2]);
        renderClassContent(page);
    }

    updateActiveNav(page);
}

function updateActiveNav(target: string): void {
    const current = document.querySelector('.class-list li.active');
    if (current) current.classList.remove('active');
    const activeLink = document.querySelector(`.nav-link[data-class="${target}"], .nav-link[data-view="${target}"]`);
    if (activeLink) activeLink.parentElement!.classList.add('active');
}

function initClassSelector(): void {
    document.querySelectorAll('.nav-link').forEach((link: any) => {
        link.addEventListener('click', function(this: any, e: any) {
            if (e.ctrlKey || e.metaKey || e.button === 1) return;
            e.preventDefault();
            window.location.hash = this.getAttribute('href');

            document.querySelectorAll('.nav-dropdown.open').forEach((dd: any) => dd.classList.remove('open'));
        });
    });


    document.querySelectorAll('.nav-dropdown-btn').forEach((btn: any) => {
        btn.addEventListener('click', function(this: any, e: Event) {
            e.stopPropagation();
            const dropdown = this.closest('.nav-dropdown');
            const isOpen = dropdown.classList.contains('open');

            document.querySelectorAll('.nav-dropdown.open').forEach((dd: any) => dd.classList.remove('open'));

            if (!isOpen) dropdown.classList.add('open');
        });
    });


    document.addEventListener('click', function(e: Event) {
        if (!(e.target as any).closest('.nav-dropdown')) {
            document.querySelectorAll('.nav-dropdown.open').forEach((dd: any) => dd.classList.remove('open'));
        }
    });

    window.addEventListener('hashchange', () => navigateToHash(window.location.hash));


    handleAuthCallback();


    checkDonationStatus();

    if (window.location.hash) {

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

    checkAuthStatus();
}
window.addEventListener('DOMContentLoaded', loadAllData);
