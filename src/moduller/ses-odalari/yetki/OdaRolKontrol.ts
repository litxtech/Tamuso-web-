/**
 * Ses odası yetki hiyerarşisi — OWNER > ADMIN(cohost) > MEMBER.
 * UI menü filtresi; gerçek yetki RPC/RLS tarafında doğrulanır.
 */

export type OdaRolu = 'owner' | 'admin' | 'member';

export function OdaRoluHesapla(input: {
  userId?: string | null;
  hostId?: string | null;
  memberRole?: string | null;
  isCohostSeat?: boolean;
  /** Platform admin — oda izni olmadan tam yetki */
  isPlatformAdmin?: boolean;
}): OdaRolu {
  if (!input.userId) return 'member';
  if (input.isPlatformAdmin) return 'owner';
  if (input.hostId && input.userId === input.hostId) return 'owner';
  if (input.memberRole === 'cohost' || input.isCohostSeat) return 'admin';
  return 'member';
}

export type KatilimciMenuAksiyonu =
  | 'profil'
  | 'mute'
  | 'mic_lock'
  | 'mic_unlock'
  | 'unseat'
  | 'admin_ata'
  | 'admin_kaldir'
  | 'lider_devret'
  | 'lider_geri_al'
  | 'kick'
  | 'ban'
  | 'koltuktan_ayril';

/** Actor'ün hedef üzerinde görebileceği yönetim aksiyonları */
export function KatilimciMenuAksiyonlari(input: {
  actorRole: OdaRolu;
  targetIsOwner: boolean;
  targetIsAdmin: boolean;
  targetOnSeat: boolean;
  targetMicLocked: boolean;
  targetIsSelf: boolean;
  /** Odayı kuran, devrettiği liderliği geri alabilir */
  liderGeriAl?: boolean;
  /** Gerçek oda sahibi — liderliği devredebilir */
  liderDevredebilir?: boolean;
  /** Hedef şu an rooms.host_id */
  hedefGercekSahip?: boolean;
}): KatilimciMenuAksiyonu[] {
  if (input.targetIsSelf) {
    const self: KatilimciMenuAksiyonu[] = ['profil'];
    if (input.targetOnSeat) self.push('koltuktan_ayril');
    return self;
  }

  const ops: KatilimciMenuAksiyonu[] = ['profil'];
  if (input.actorRole === 'member') return ops;

  // OWNER hedefi: kurucu liderliği geri alabilir, başka yönetim yok
  if (input.targetIsOwner) {
    if (input.liderGeriAl) ops.push('lider_geri_al');
    return ops;
  }

  // ADMIN başka ADMIN'e: sadece profil (owner hariç)
  if (input.actorRole === 'admin' && input.targetIsAdmin) return ops;

  if (input.actorRole === 'owner') {
    if (input.liderGeriAl) ops.push('lider_geri_al');
    if (input.targetIsAdmin) ops.push('admin_kaldir');
    else if (!input.hedefGercekSahip) ops.push('admin_ata');
    if (input.liderDevredebilir !== false && !input.hedefGercekSahip) {
      ops.push('lider_devret');
    }
  }

  ops.push('mute');
  if (input.targetMicLocked) ops.push('mic_unlock');
  else ops.push('mic_lock');
  if (input.targetOnSeat) ops.push('unseat');
  ops.push('kick');

  if (input.actorRole === 'owner') ops.push('ban');

  return ops;
}
