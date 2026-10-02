import assert from 'node:assert/strict';

const SEGMENT_DEG = 45;

function wheelRestDegrees(index, fullTurns) {
  const turns = Math.max(1, Math.floor(fullTurns));
  const slot = ((360 - index * SEGMENT_DEG) % 360 + 360) % 360;
  return turns * 360 + slot;
}

function landedSegment(rotationDeg) {
  const mod = ((rotationDeg % 360) + 360) % 360;
  const pointerLocal = ((360 - mod) % 360 + 360) % 360;
  return Math.round(pointerLocal / SEGMENT_DEG) % 8;
}

for (let i = 0; i < 8; i += 1) {
  const rest = wheelRestDegrees(i, 5);
  assert.equal(landedSegment(rest), i, `index ${i}`);
  assert.equal(landedSegment(rest + 8 - 8), i);
}

assert.equal(((wheelRestDegrees(0, 5) % 360) + 360) % 360, 0);
assert.equal(((wheelRestDegrees(1, 5) % 360) + 360) % 360, 315);
console.log('fruit-wheel geometry ok');
