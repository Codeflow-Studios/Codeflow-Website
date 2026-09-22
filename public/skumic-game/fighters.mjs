const SHARED_STATS = Object.freeze({
  maxHp: 1000,
  moveSpeed: 112,
  acceleration: 920,
  airControl: 0.64,
  jumpSpeed: 280,
  gravity: 790,
  defense: 1,
  pushRadius: 29,
});

const sharedBasics = () => ({
  punch: {
    id: "punch", label: "PUNCH", kind: "melee", frame: 2,
    damage: 60, startup: 0.075, active: 0.085, recovery: 0.16, cooldown: 0.20,
    hitbox: { x: 17, y: -91, w: 36, h: 27 }, hitstun: 0.23,
    knockback: { x: 48, y: -24 }, spark: "#fff7d1",
  },
  kick: {
    id: "kick", label: "KICK", kind: "melee", frame: 3,
    damage: 80, startup: 0.12, active: 0.10, recovery: 0.23, cooldown: 0.29,
    hitbox: { x: 18, y: -68, w: 48, h: 27 }, hitstun: 0.29,
    knockback: { x: 68, y: -34 }, spark: "#ffe600",
  },
  heavy: {
    id: "heavy", label: "HEAVY", kind: "melee", frame: 4,
    damage: 110, startup: 0.20, active: 0.115, recovery: 0.34, cooldown: 0.54,
    hitbox: { x: 13, y: -105, w: 48, h: 62 }, hitstun: 0.38,
    knockback: { x: 94, y: -60 }, spark: "#ff6b35",
  },
});

export const FIGHTERS = Object.freeze({
  matar: {
    id: "matar",
    name: "MATAR",
    nickname: "POINT BLANK",
    shortName: "MATAR",
    role: "PRESSURE / RANGE",
    color: "#ff3038",
    accent: "#ffe600",
    artFacing: 1,
    portrait: "assets/matar-portrait.png",
    originalSheet: "assets/matar-original-atlas.png",
    fightSheet: "assets/matar-fight-sheet-16bit-v3.png",
    stats: SHARED_STATS,
    moves: {
      ...sharedBasics(),
      heavy: { ...sharedBasics().heavy, label: "PISTOL-WHIP" },
      special1: {
        id: "quick-shot", label: "QUICK SHOT", kind: "projectile", frame: 5,
        damage: 90, startup: 0.18, active: 0.04, recovery: 0.30, cooldown: 1.05,
        hitstun: 0.30, knockback: { x: 74, y: -22 }, projectileSpeed: 310,
        projectileSize: { w: 26, h: 7 }, spark: "#ffe600",
      },
      special2: {
        id: "gun-dash", label: "GUN DASH", kind: "dash", frame: 2,
        damage: 100, startup: 0.10, active: 0.18, recovery: 0.30, cooldown: 1.18,
        hitbox: { x: 13, y: -97, w: 55, h: 72 }, hitstun: 0.34,
        knockback: { x: 88, y: -42 }, dashSpeed: 245, spark: "#00dcff",
      },
    },
    moveList: ["PUNCH", "KICK", "PISTOL-WHIP", "QUICK SHOT", "GUN DASH"],
  },
  gauthier: {
    id: "gauthier",
    name: "GAUTHIER",
    nickname: "BLUE EYES",
    shortName: "GAUTHIER",
    role: "BRUISER / COUNTER",
    color: "#00dcff",
    accent: "#ffe600",
    artFacing: -1,
    portrait: "assets/gauthier-portrait.png",
    originalSheet: "assets/gauthier-original-atlas.png",
    fightSheet: "assets/gauthier-fight-sheet-16bit-v3.png",
    stats: SHARED_STATS,
    moves: {
      ...sharedBasics(),
      special1: {
        id: "shoulder-rush", label: "SHOULDER RUSH", kind: "dash", frame: 5,
        damage: 100, startup: 0.10, active: 0.18, recovery: 0.30, cooldown: 1.18,
        hitbox: { x: 10, y: -101, w: 57, h: 76 }, hitstun: 0.34,
        knockback: { x: 88, y: -42 }, dashSpeed: 245, spark: "#00dcff",
      },
      special2: {
        id: "counter", label: "COUNTER", kind: "counter", frame: 4,
        damage: 90, startup: 0.05, active: 0.37, recovery: 0.30, cooldown: 1.05,
        hitstun: 0.34, knockback: { x: 82, y: -48 }, spark: "#ffe600",
      },
    },
    moveList: ["PUNCH", "KICK", "HEAVY", "SHOULDER RUSH", "COUNTER"],
  },
});

export const STAGES = Object.freeze({
  skumicStreet: {
    id: "skumic-street",
    name: "SKUMIC STREET",
    subtitle: "NIGHT",
    image: "assets/skumic-street.png",
    groundY: 232,
    bounds: { left: 30, right: 450 },
  },
});

export const INPUT_LABELS = Object.freeze({
  punch: "A",
  kick: "S",
  heavy: "D",
  special1: "F",
  special2: "G",
});

export function otherFighter(id) {
  return id === "matar" ? FIGHTERS.gauthier : FIGHTERS.matar;
}
