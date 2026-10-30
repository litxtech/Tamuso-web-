/**
 * Ses odasına hızlı giriş.
 * Sözleşme / topluluk onayı yok — doğrudan odaya gider.
 * Liste kartındaki oda verisini önbelleğe yazar — room ekranı spinner beklemesin.
 * Token + ses oturumu navigasyon anında ısınır — "ses bağlanıyor" gecikmesi kısalır.
 */
import { router } from 'expo-router';
import type { Room, RoomSeat } from '../../../types/models';
import { YeniOdaOnbellegeYaz } from '../onbellek/YeniOdaOnbellek';

type Opts = {
  roomId: string;
  room?: Room | null;
  seats?: RoomSeat[];
};

function odaKanalAdi(roomId: string, room?: Room | null): string {
  return room?.livekit_room_name?.trim() || `voice_${roomId}`;
}

/** Lazy — liste ekranı MedyaBaglantisi yükünü taşımasın; HMR yarışı kırılmasın */
function sesGirisiniIsit(kanal: string) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const token = require('../../livekit/token/LiveKitTokenAl') as {
      LiveKitTokenOncedenAl?: (i: { roomName: string; role?: string }) => void;
    };
    token.LiveKitTokenOncedenAl?.({ roomName: kanal, role: 'listener' });
  } catch {
    /* token modülü yok */
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const medya = require('../../livekit/MedyaBaglantisi') as {
      MedyaSesOturumuIsit?: (opts?: { asPublisher?: boolean }) => void;
    };
    medya.MedyaSesOturumuIsit?.();
  } catch {
    /* medya modülü yok */
  }
}

export async function SesOdasinaGit({ roomId, room, seats }: Opts) {
  if (!roomId) return;
  if (room) {
    YeniOdaOnbellegeYaz(room, seats ?? []);
  }
  sesGirisiniIsit(odaKanalAdi(roomId, room));
  router.push(`/room/${roomId}` as any);
}

/** `/lobi/:id` veya `/room/:id` href — doğrudan odaya. */
export async function SesOdasinaHrefIleGit(href: string) {
  const m = href.match(/\/(?:lobi|room)\/([^/?#]+)/);
  if (m?.[1]) {
    await SesOdasinaGit({ roomId: m[1] });
    return;
  }
  router.push(href as any);
}
