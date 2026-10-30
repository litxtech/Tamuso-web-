let aktifUserId: string | null = null;

export function CevrimdisiAktifKullanici(): string | null {
  return aktifUserId;
}

export function CevrimdisiAktifKullaniciAyarla(userId: string | null): void {
  aktifUserId = userId;
}
