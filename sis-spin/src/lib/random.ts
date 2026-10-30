import type { Reward } from '../types';

export const getRandomReward = (rewards: Reward[]): Reward => {
  const totalWeight = rewards.reduce((sum, reward) => sum + reward.weight, 0);
  let random = Math.random() * totalWeight;
  for (const reward of rewards) {
    random -= reward.weight;
    if (random <= 0) return reward;
  }
  return rewards[0];
};

export const getRewardAngle = (rewardId: number, totalSlices: number): number => {
  const sliceAngle = 360 / totalSlices;
  return 360 - rewardId * sliceAngle - sliceAngle / 2;
};

export const calculateFinalRotation = (
  currentRotation: number,
  targetAngle: number,
  fullTurns = 6,
): number => {
  const currentMod = ((currentRotation % 360) + 360) % 360;
  const diff = (targetAngle - currentMod + 360) % 360;
  return currentRotation + fullTurns * 360 + diff;
};
