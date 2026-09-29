// Shared cosmetics system. Each entry corresponds to a Collectible id
// (see COLLECTIBLES in game.js) and belongs to a "group". Items in an
// EXCLUSIVE group can only have one equipped at a time (equipping one
// unequips any sibling); items in a TOGGLE group are independent on/off
// switches that can combine freely with everything else.
export const COSMETIC_ITEMS = [
  { id: 'pumpkin', emoji: '🎃', name: "Jack-o'-Pattern", group: 'pattern', description: 'Orange head, black-and-orange checkered body (1 black, 3 orange, repeating).' },
  { id: 'zombie', emoji: '🧟', name: 'Zombie Flesh', group: 'pattern', description: 'Pink head, body cycling through shades of green.' },
  { id: 'candy', emoji: '🍬', name: 'Candy Palette', group: 'pattern', description: 'Bright rainbow colors cycling down your body.' },
  { id: 'moon', emoji: '🌕', name: 'Moon Orb', group: 'shape', description: 'Rounded body segments instead of squares.' },
  { id: 'crescent', emoji: '🌙', name: 'Crescent Tip', group: 'tail', description: 'Your tail tip becomes a triangle.' },
  { id: 'bat', emoji: '🦇', name: 'Bat Crown', group: 'glow', description: 'A soft glow around your head only.' },
  { id: 'mage', emoji: '🧙', name: 'Mage Glow', group: 'glow', description: 'A soft glow around your whole body.' },
  { id: 'grave', emoji: '🪦', name: 'Grave Mark', group: 'trace', description: 'Leaves a fading grey trace behind you as you move.' },
  { id: 'wolf', emoji: '🐺', name: 'Wolf Charm', group: 'companion', description: 'A cosmetic wolf follows behind you. Purely decorative — no collision.' },
];

export const EXCLUSIVE_GROUPS = ['pattern', 'shape', 'glow'];

export function getUnlockedCollectibles() {
  try {
    return JSON.parse(localStorage.getItem('unlockedCollectibles') || '[]');
  } catch {
    return [];
  }
}

export function getEquipped() {
  try {
    return JSON.parse(localStorage.getItem('equippedCosmetics') || '{}');
  } catch {
    return {};
  }
}

function saveEquipped(equipped) {
  localStorage.setItem('equippedCosmetics', JSON.stringify(equipped));
}

// Turns a cosmetic on/off. Returns the new equipped map.
export function toggleCosmetic(id) {
  const item = COSMETIC_ITEMS.find(c => c.id === id);
  if (!item) return getEquipped();

  const unlocked = getUnlockedCollectibles();
  if (!unlocked.includes(id)) return getEquipped(); // can't equip what you haven't unlocked

  const equipped = getEquipped();
  const turningOn = !equipped[id];

  if (EXCLUSIVE_GROUPS.includes(item.group)) {
    COSMETIC_ITEMS.filter(c => c.group === item.group).forEach(c => { equipped[c.id] = false; });
  }
  equipped[id] = turningOn;

  saveEquipped(equipped);
  return equipped;
}

export function isEquipped(id) {
  return !!getEquipped()[id];
}

// Convenience getters for game.js's rendering — each returns the equipped
// item's id for that group, or null if none from that group is equipped.
export function getEquippedInGroup(group) {
  const equipped = getEquipped();
  const item = COSMETIC_ITEMS.find(c => c.group === group && equipped[c.id]);
  return item ? item.id : null;
}
