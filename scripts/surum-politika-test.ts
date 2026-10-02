import assert from 'node:assert/strict';
import { MagazaUrlGecerli } from '../src/moduller/surum-politikasi/MagazaUrl.ts';
import { SemverKarsilastir } from '../src/moduller/surum-politikasi/SemverKarsilastir.ts';
import { SurumKarariVer, type SurumPolitikasi } from '../src/moduller/surum-politikasi/SurumKarari.ts';

function politika(parca: Partial<SurumPolitikasi>): SurumPolitikasi {
  return {
    platform: 'ios',
    latestVersion: '1.3.0',
    latestBuild: 30,
    minimumVersion: '1.3.0',
    minimumBuild: 30,
    forceUpdate: true,
    optionalUpdate: false,
    title: 'Yeni sürüm hazır',
    message: 'Güncelle',
    buttonText: 'Şimdi Güncelle',
    storeUrl: 'https://apps.apple.com/app/id1',
    maintenanceMessage: '',
    updatedAt: null,
    ...parca,
  };
}

assert.equal(SemverKarsilastir('1.10.0', '1.9.9'), 1);
assert.equal(SemverKarsilastir('1.9.9', '1.10.0'), -1);
assert.equal(SemverKarsilastir('1.3.0', '1.3.0'), 0);
assert.equal(SemverKarsilastir('1.2', '1.2.0'), null);

assert.equal(
  SurumKarariVer(
    { platform: 'ios', version: '1.2.4', build: 25 },
    politika({}),
  ),
  'zorunlu',
);

assert.equal(
  SurumKarariVer(
    { platform: 'ios', version: '1.3.0', build: 30 },
    politika({}),
  ),
  'izin',
);

assert.equal(
  SurumKarariVer(
    { platform: 'android', version: '1.2.4', build: 25 },
    politika({ platform: 'ios' }),
  ),
  'izin',
);

assert.equal(
  SurumKarariVer(
    { platform: 'android', version: '1.2.0', build: 10 },
    politika({
      platform: 'android',
      minimumVersion: '1.2.5',
      minimumBuild: 26,
      forceUpdate: true,
    }),
  ),
  'zorunlu',
);

assert.equal(
  SurumKarariVer(
    { platform: 'ios', version: '1.2.4', build: 25 },
    politika({ forceUpdate: false }),
  ),
  'izin',
);

assert.equal(
  SurumKarariVer(
    { platform: 'ios', version: '1.3.5', build: 40 },
    politika({
      forceUpdate: false,
      optionalUpdate: true,
      latestVersion: '1.4.0',
      latestBuild: 50,
      minimumVersion: '1.3.0',
      minimumBuild: 30,
    }),
  ),
  'istege_bagli',
);

assert.equal(
  SurumKarariVer(
    { platform: 'ios', version: '1.2.4', build: 25 },
    politika({ optionalUpdate: true, forceUpdate: true }),
  ),
  'zorunlu',
);

assert.equal(
  SurumKarariVer(
    { platform: 'ios', version: '1.3.0', build: null },
    politika({}),
  ),
  'izin',
);

assert.equal(MagazaUrlGecerli('ios', 'javascript:alert(1)'), false);
assert.equal(MagazaUrlGecerli('ios', 'https://evil.example/app'), false);
assert.equal(MagazaUrlGecerli('ios', 'https://apps.apple.com/app/tamuso/id1'), true);
assert.equal(MagazaUrlGecerli('android', 'https://play.google.com/store/apps/details?id=com.litxtech.muta'), true);
assert.equal(MagazaUrlGecerli('android', 'https://apps.apple.com/app/id1'), false);
assert.equal(MagazaUrlGecerli('ios', ''), false);

console.log('surum-politika-test ok');
