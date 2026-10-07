import assert from 'node:assert/strict';
import {
  kesitBoyutAsimi,
  kesitSaniyeNormalize,
  kesitSuresiGecerliMi,
  kesitUzanti,
  KESIT_VARSAYILAN_MAX_BAYT,
} from './canliKesitDogrulama.ts';

assert.equal(kesitSuresiGecerliMi(1), true);
assert.equal(kesitSuresiGecerliMi(15), true);
assert.equal(kesitSuresiGecerliMi(30), true);
assert.equal(kesitSuresiGecerliMi(0), false);
assert.equal(kesitSuresiGecerliMi(45), false);
assert.equal(kesitSaniyeNormalize(4), 4);
assert.equal(kesitSaniyeNormalize(99), 30);
assert.equal(kesitBoyutAsimi(KESIT_VARSAYILAN_MAX_BAYT + 1, KESIT_VARSAYILAN_MAX_BAYT), true);
assert.equal(kesitBoyutAsimi(1024, KESIT_VARSAYILAN_MAX_BAYT), false);
assert.equal(kesitUzanti('video/mp4'), 'mp4');
assert.equal(kesitUzanti('video/webm;codecs=vp8,opus'), 'webm');
assert.equal(kesitUzanti('audio/pcm'), null);

console.log('canliKesitDogrulama ok');
