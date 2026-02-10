import type { ItemQuality } from '@/types/data';

export function stripPriorityLabel(itemName: string): string {
  return itemName.replace(/\s*\((BEST|RECOMMENDED|GOOD|OPTION|ALTERNATIVE|EASY|HARD)\)\s*$/i, '').trim();
}

export function getPriorityLabel(itemName: string): string | null {
  const match = itemName.match(/\((BEST|RECOMMENDED|GOOD|OPTION|ALTERNATIVE|EASY|HARD)\)\s*$/i);
  return match ? match[1].toUpperCase() : null;
}

export function getPriorityBadge(label: string | null): string {
  if (!label) return '';
  const badgeMap: Record<string, { text: string; class: string }> = {
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

export function getItemId(itemName: string, itemIds: Record<string, number>): number | null {
  const cleanName = stripPriorityLabel(itemName);
  return itemIds[cleanName.toLowerCase()] || null;
}

export function getItemQuality(itemName: string): ItemQuality {
  const cleanName = stripPriorityLabel(itemName);
  const name = cleanName.toLowerCase();

  const legendaryItems = ['warglaive of azzinoth', 'thori\'al', 'sulfuras'];
  if (legendaryItems.some(leg => name.includes(leg))) return 'legendary';

  const uncommonKeywords = ['flesh handler\'s'];
  if (uncommonKeywords.some(keyword => name.includes(keyword))) return 'uncommon';

  const epicKeywords = [
    'bloodlust brooch', 'choker of vile intent', 'ring of arathi warlords',
    'midnight legguards', 'girdle of the deathdealer', 'scaled greaves of the marksman',
    'ring of cryptic dreams', 'ashyen\'s gift', 'phoenix-wing cloak',
    'adamantine chain of the unbroken', 'dragonspine trophy', 'tsunami talisman',
    'madness of the betrayer', 'hourglass of the unraveller', 'terokk\'s shadowstaff',
    'continuum blade', 'primalstrike', 'earthwarden', 'lionheart',
    'black felsteel', 'fel leather', 'windhawk', 'ragesteel', 'khorium', 'felfury',
    'twisting nether', 'battlecast', 'spellstrike', 'whitemend', 'primal mooncloth',
    'vengeance wrap', 'boots of the long road', 'spellfire', 'frozen shadoweave',
    'belt of blasting', 'boots of blasting', 'belt of the long road',
    'ebon netherscale', 'netherstrike', 'netherdrake'
  ];
  if (epicKeywords.some(keyword => name.includes(keyword))) return 'epic';

  const rareKeywords = [
    'badge of tenacity', 'vindicator\'s brand', 'stalker\'s chain', 'savage plate',
    'general\'s', 'marshal\'s', 'lieutenant commander\'s', 'champion\'s', 'centurion\'s',
    'wastewalker', 'overlord\'s helmet of second sight', 'doomplate', 'natasha\'s choker',
    'starlight gauntlets', 'idol of the wild', 'clefthoof', 'deathforge girdle',
    'terokk\'s quill', 'boots of righteous fortitude', 'andormu\'s tear',
    'shatter-bound', 'time-shifted', 'beast lord', 'righteous',
    'icon of unyielding courage', 'bladefist\'s breadth', 'abacus of violent odds',
    'marksman\'s bow'
  ];
  if (rareKeywords.some(keyword => name.includes(keyword))) return 'rare';

  return 'epic';
}

export function isPriorityItem(itemName: string): boolean {
  const label = getPriorityLabel(itemName);
  return label === 'BEST';
}
