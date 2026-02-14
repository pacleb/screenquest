/**
 * Lottie Animation Assets Index
 *
 * All animation JSON files for the ScreenQuest app.
 * Import via: import { Animations } from '../assets/animations';
 *
 * Each animation is a Lottie-format JSON file. To preview, use:
 * https://lottiefiles.com/preview
 */

export const Animations = {
  /** Green check with burst particles — quest completion */
  checkmarkBurst: require("./checkmark-burst.json"),
  /** Gold star explosion — level up celebration */
  levelUp: require("./level-up.json"),
  /** Badge drop with shimmer — achievement unlock */
  achievementUnlock: require("./achievement-unlock.json"),
  /** Ring completion with sparkles — timer complete */
  timerComplete: require("./timer-complete.json"),
  /** Bouncing dots — loading state */
  loadingBounce: require("./loading-bounce.json"),
  /** Cute character looking around — empty states */
  emptyState: require("./empty-state.json"),
  /** Rocket launching — play session start */
  rocketLaunch: require("./rocket-launch.json"),
} as const;

export type AnimationKey = keyof typeof Animations;
