import { Easing } from "remotion";

export const APPLE_EASE = Easing.bezier(0.2, 0.8, 0.2, 1);
export const APPLE_OUT = Easing.bezier(0.16, 1, 0.3, 1);
export const APPLE_IN = Easing.bezier(0.4, 0, 1, 1);

export const SETTLE_SPRING = { damping: 22, stiffness: 130, mass: 1 } as const;
export const POP_SPRING = { damping: 12, stiffness: 200, mass: 0.6 } as const;
