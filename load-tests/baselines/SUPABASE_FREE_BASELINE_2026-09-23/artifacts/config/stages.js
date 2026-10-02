/**
 * CCU ramp stage şablonları.
 * HOLD varsayılan 180s (birkaç dakika stabilize).
 */
export function stagesForCcu(ccu) {
  const hold = Number(__ENV.LOADTEST_HOLD_SEC || 180);
  const ramp = Number(__ENV.LOADTEST_RAMP_SEC || 45);

  if (ccu && ccu > 0) {
    const r = Math.max(20, Math.min(180, Math.floor(ccu / 15)));
    return [
      { target: ccu, duration: `${r}s` },
      { target: ccu, duration: `${hold}s` },
      { target: 0, duration: '20s' },
    ];
  }

  return [
    { target: 100, duration: `${ramp}s` },
    { target: 100, duration: `${hold}s` },
    { target: 0, duration: '20s' },
  ];
}

export const CCU_LEVELS = [100, 500, 1000, 2500, 5000, 7500, 10000];
