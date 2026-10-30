import {
  CanliRolYayinlar,
  DavetGecisGecerli,
  GorusmeGecisGecerli,
  OdaIzgarasiSec,
  ToplantiBaslangicIso,
} from '../src/moduller/ajans-gorusme/kurallar/AjansGorusmeKurallari';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(GorusmeGecisGecerli('scheduled', 'live'), 'scheduled->live');
assert(GorusmeGecisGecerli('waiting', 'live'), 'waiting->live');
assert(GorusmeGecisGecerli('live', 'ended'), 'live->ended');
assert(!GorusmeGecisGecerli('ended', 'live'), 'ended terminal');
assert(!GorusmeGecisGecerli('cancelled', 'scheduled'), 'cancelled terminal');
assert(!GorusmeGecisGecerli('live', 'scheduled'), 'no rewind');

assert(DavetGecisGecerli('pending', 'accepted'), 'accept');
assert(DavetGecisGecerli('pending', 'declined'), 'decline');
assert(DavetGecisGecerli('pending', 'expired'), 'expire');
assert(!DavetGecisGecerli('accepted', 'pending'), 'no reopen');
assert(!DavetGecisGecerli('declined', 'accepted'), 'declined terminal');

assert(OdaIzgarasiSec(1) === 'single', '1');
assert(OdaIzgarasiSec(2) === 'split', '2');
assert(OdaIzgarasiSec(4) === 'grid', '4');
assert(OdaIzgarasiSec(8) === 'scroll', '8');

assert(CanliRolYayinlar('host', false) === 'host', 'host publishes');
assert(CanliRolYayinlar('co_host', true) === 'host', 'cohost');
assert(CanliRolYayinlar('speaker', true) === 'speaker', 'speaker');
assert(CanliRolYayinlar('speaker', false) === 'listener', 'muted speaker');
assert(CanliRolYayinlar('platform', true) === 'speaker', 'official');
assert(CanliRolYayinlar('listener', true) === 'listener', 'listener cannot publish');
assert(CanliRolYayinlar('member', true) === 'listener', 'unknown role');

assert(ToplantiBaslangicIso('2026-10-07', '22:30') !== null, 'iso');
assert(ToplantiBaslangicIso('07-10-2026', '22:30') === null, 'bad date');
assert(ToplantiBaslangicIso('2026-10-07', '99:00') === null, 'bad time');

console.log('ajans-gorusme-tests ok');
