import type { AircraftCategory } from '../data/fleetData';

export interface CockpitTelemetry {
  x: number;
  y: number;
  z: number;
  pitch: number; // rad (+ = nose up)
  yaw: number; // rad (0 = North/+Z)
  roll: number; // rad (+ = bank right)
  speedKts: number;
  altFt: number;
  headingDeg: number;
  throttle: number; // 0..1
  gForce: number;
  gearDown: boolean;
  onGround: boolean;
  stallWarn: boolean;
  pullUpWarn: boolean;
  ringsPassed: number;
  totalRings: number;
  nextRingDistM: number;
  nextRingBearingDeg: number; // relative to aircraft nose (-180..180)
  stickX: number; // -1..1 (roll input)
  stickY: number; // -1..1 (pitch input)
  isVtol: boolean;
}

export interface CockpitInputState {
  touchRoll: number; // -1..1
  touchPitch: number; // -1..1
  touchThrottle: number | null; // null = controlled by keys/default, 0..1 = direct slider
  keys: {
    w: boolean;
    s: boolean;
    a: boolean;
    d: boolean;
    shift: boolean;
    ctrl: boolean;
  };
  resetRequested: boolean;
  toggleGearRequested: boolean;
}

export interface FlightProfileSpec {
  label: string;
  maxSpeedKts: number;
  accelRate: number;
  dragFactor: number;
  liftoffKts: number;
  stallKts: number;
  pitchRate: number;
  rollRate: number;
  turnRate: number;
  isVtol: boolean;
}

export function getFlightProfileSpec(category: AircraftCategory): FlightProfileSpec {
  if (category === 'Tempur') {
    return {
      label: 'FIGHTER JET • HIGH AGILITY',
      maxSpeedKts: 620,
      accelRate: 135,
      dragFactor: 0.19,
      liftoffKts: 130,
      stallKts: 108,
      pitchRate: 1.45,
      rollRate: 2.35,
      turnRate: 0.95,
      isVtol: false,
    };
  }
  if (category === 'Angkut & VIP') {
    return {
      label: 'HEAVY TRANSPORT • STABLE',
      maxSpeedKts: 340,
      accelRate: 62,
      dragFactor: 0.16,
      liftoffKts: 108,
      stallKts: 90,
      pitchRate: 0.72,
      rollRate: 0.95,
      turnRate: 0.52,
      isVtol: false,
    };
  }
  if (category === 'Helikopter') {
    return {
      label: 'HELICOPTER • VTOL',
      maxSpeedKts: 175,
      accelRate: 52,
      dragFactor: 0.34,
      liftoffKts: 0,
      stallKts: 0,
      pitchRate: 1.05,
      rollRate: 1.35,
      turnRate: 0.85,
      isVtol: true,
    };
  }
  // Latih
  return {
    label: 'TRAINER • AGILE',
    maxSpeedKts: 285,
    accelRate: 84,
    dragFactor: 0.22,
    liftoffKts: 76,
    stallKts: 60,
    pitchRate: 1.15,
    rollRate: 1.75,
    turnRate: 0.78,
    isVtol: false,
  };
}

export const cockpitTelemetry: CockpitTelemetry = {
  x: 0,
  y: 2.4,
  z: -125,
  pitch: 0,
  yaw: 0,
  roll: 0,
  speedKts: 0,
  altFt: 0,
  headingDeg: 90,
  throttle: 0,
  gForce: 1.0,
  gearDown: true,
  onGround: true,
  stallWarn: false,
  pullUpWarn: false,
  ringsPassed: 0,
  totalRings: 10,
  nextRingDistM: 180,
  nextRingBearingDeg: 0,
  stickX: 0,
  stickY: 0,
  isVtol: false,
};

export const cockpitInput: CockpitInputState = {
  touchRoll: 0,
  touchPitch: 0,
  touchThrottle: null,
  keys: {
    w: false,
    s: false,
    a: false,
    d: false,
    shift: false,
    ctrl: false,
  },
  resetRequested: false,
  toggleGearRequested: false,
};

export function resetCockpitSimState(isVtol: boolean) {
  cockpitTelemetry.x = 0;
  cockpitTelemetry.y = 2.4;
  cockpitTelemetry.z = -125;
  cockpitTelemetry.pitch = 0;
  cockpitTelemetry.yaw = 0;
  cockpitTelemetry.roll = 0;
  cockpitTelemetry.speedKts = 0;
  cockpitTelemetry.altFt = 0;
  cockpitTelemetry.headingDeg = 90;
  cockpitTelemetry.throttle = 0;
  cockpitTelemetry.gForce = 1.0;
  cockpitTelemetry.gearDown = true;
  cockpitTelemetry.onGround = true;
  cockpitTelemetry.stallWarn = false;
  cockpitTelemetry.pullUpWarn = false;
  cockpitTelemetry.ringsPassed = 0;
  cockpitTelemetry.stickX = 0;
  cockpitTelemetry.stickY = 0;
  cockpitTelemetry.isVtol = isVtol;

  cockpitInput.touchRoll = 0;
  cockpitInput.touchPitch = 0;
  cockpitInput.touchThrottle = 0;
  cockpitInput.resetRequested = false;
  cockpitInput.toggleGearRequested = false;
}
