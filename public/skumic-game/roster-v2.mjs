const SHARED_STATS = Object.freeze({
  maxHp: 1000,
  moveSpeed: 104,
  acceleration: 980,
  airControl: 0.62,
  jumpSpeed: 292,
  gravity: 850,
  defense: 1,
  pushRadius: 25,
});

const basics = () => ({
  punch: {
    id: "punch", label: "PUNCH", kind: "melee", frame: 2,
    damage: 60, startup: 0.07, active: 0.09, recovery: 0.16, cooldown: 0.18,
    hitbox: { x: 18, y: -103, w: 39, h: 27 }, hitstun: 0.22,
    knockback: { x: 47, y: -18 }, hitstop: 0.045, spark: "#fff3c4",
  },
  kick: {
    id: "kick", label: "KICK", kind: "melee", frame: 3,
    damage: 80, startup: 0.115, active: 0.11, recovery: 0.22, cooldown: 0.26,
    hitbox: { x: 16, y: -73, w: 57, h: 29 }, hitstun: 0.28,
    knockback: { x: 69, y: -28 }, hitstop: 0.055, spark: "#ffe600",
  },
  heavy: {
    id: "heavy", label: "HEAVY", kind: "melee", frame: 4,
    damage: 110, startup: 0.19, active: 0.12, recovery: 0.33, cooldown: 0.48,
    hitbox: { x: 12, y: -116, w: 55, h: 70 }, hitstun: 0.37,
    knockback: { x: 96, y: -48 }, hitstop: 0.072, spark: "#ff4d43",
  },
});

export const FIGHTERS = Object.freeze({
  matar: {
    id: "matar",
    name: "MATAR",
    nickname: "POINT BLANK",
    archetype: "PRESSURE / RANGE",
    color: "#ff3045",
    accent: "#ffe600",
    artFacing: 1,
    portrait: "assets/matar-portrait-v2.png?v=7",
    atlas: "assets/matar-atlas-v2.png?v=7",
    stats: SHARED_STATS,
    moves: {
      ...basics(),
      heavy: { ...basics().heavy, label: "PLATTER STRIKE", frame: 2 },
      special1: {
        id: "vinyl-throw", label: "VINYL THROW", kind: "projectile", frame: 2,
        damage: 90, startup: 0.17, active: 0.04, recovery: 0.30, cooldown: 1.08,
        hitstun: 0.29, knockback: { x: 77, y: -18 }, hitstop: 0.05,
        projectileSpeed: 330, projectileSize: { w: 22, h: 18 }, spark: "#ffe600",
      },
      special2: {
        id: "beat-dash", label: "BEAT DASH", kind: "dash", frame: 2,
        damage: 100, startup: 0.10, active: 0.19, recovery: 0.30, cooldown: 1.16,
        hitbox: { x: 12, y: -109, w: 63, h: 80 }, hitstun: 0.34,
        knockback: { x: 91, y: -36 }, hitstop: 0.065, dashSpeed: 252, spark: "#00ddff",
      },
    },
    moveList: ["PUNCH", "KICK", "PLATTER STRIKE", "VINYL THROW", "BEAT DASH"],
  },
  gauthier: {
    id: "gauthier",
    name: "GAUTHIER",
    nickname: "VAN DE ZEE",
    archetype: "BRUISER / COUNTER",
    color: "#00d8ff",
    accent: "#ffe600",
    artFacing: -1,
    portrait: "assets/gauthier-portrait-v2.png?v=7",
    atlas: "assets/gauthier-atlas-v2.png?v=7",
    stats: SHARED_STATS,
    moves: {
      ...basics(),
      special1: {
        id: "vocal-wave", label: "VOCAL WAVE", kind: "projectile", frame: 2,
        damage: 100, startup: 0.13, active: 0.20, recovery: 0.31, cooldown: 1.16,
        hitstun: 0.35, knockback: { x: 94, y: -39 }, hitstop: 0.067,
        projectileSpeed: 295, projectileSize: { w: 34, h: 20 }, spark: "#00d8ff",
      },
      special2: {
        id: "counter", label: "COUNTER", kind: "counter", frame: 4,
        damage: 90, startup: 0.07, active: 0.31, recovery: 0.33, cooldown: 1.08,
        hitstun: 0.34, knockback: { x: 84, y: -42 }, hitstop: 0.08, spark: "#ffe600",
      },
    },
    moveList: ["PUNCH", "KICK", "HEAVY", "VOCAL WAVE", "COUNTER"],
  },
});

export const STAGES = Object.freeze({
  "the-stage": Object.freeze({
    id: "the-stage",
    name: "THE STAGE",
    description: "LIVE CROWD · SPOTLIGHTS",
    image: "assets/stage-the-stage.png",
  }),
  "recording-studio": Object.freeze({
    id: "recording-studio",
    name: "RECORDING STUDIO",
    description: "MIX DESK · VOCAL BOOTH",
    image: "assets/stage-recording-studio.png",
  }),
});

export const STAGE = Object.freeze({
  groundY: 246,
  bounds: { left: 64, right: 416 },
});

export const INPUT_LABELS = Object.freeze({
  punch: "A",
  kick: "S",
  heavy: "D",
  special1: "F",
  special2: "G",
  guard: "C",
});

export const otherFighter = (id) => (id === "matar" ? "gauthier" : "matar");
