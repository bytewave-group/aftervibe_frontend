export const FIREWORK_CLICK_EFFECT_CONFIG = {
  hue: {
    min: 0,
    max: 360,
  },

  acceleration: 6,

  brightness: {
    min: 75,
    max: 90,
  },

  decay: {
    min: 0.03,
    max: 0.05,
  },

  explosion: 1,

  gravity: 1.8,

  friction: 0.88,

  opacity: 0.8,

  particles: 50,

  mouse: {
    click: true,
    move: true,
    max: 1,
  },

  intensity: 0,

  traceSpeed: 75,

  //? trace width set a small num , to hide the trace line
  traceLength: 1,
  lineWidth: {
    explosion: {
      min: 4,
      max: 5,
    },
    trace: {
      min: 0,
      max: 0.06,
    },
  },
  lineStyle: "round",
};

export const FIREWORK_NORMAL_BG_CONFIG = {
  hue: {
    min: 0,
    max: 360,
  },

  acceleration: 1,

  brightness: {
    min: 55,
    max: 80,
  },

  explosion: 3,

  gravity: 1.3,

  friction: 0.95,

  opacity: 0.2,

  particles: 30,

  mouse: {
    click: false,
  },

  intensity: 40,

  traceSpeed: 75,

  //? trace width set a small num , to hide the trace line
  traceLength: 1,
  lineWidth: {
    explosion: {
      min: 1,
      max: 4,
    },
    trace: {
      min: 0,
      max: 0.06,
    },
  },
  lineStyle: "round",
};
