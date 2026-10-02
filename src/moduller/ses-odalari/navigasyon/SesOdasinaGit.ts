/**
 * Ses odasına hızlı giriş.
 * Sözleşme / topluluk onayı yok — doğrudan odaya gider.
 * Liste kartındaki oda verisini önbelleğe yazar — room ekranı spinner beklemesin.
 */
import { router } from 'expo-router';
import type { Room, RoomSeat } from '../../../types/models';
import { YeniOdaOnbellegeYaz } from '../onbellek/YeniOdaOnbellek';

type Opts = {
  roomId: string;
  room?: Room | null;
  seats?: RoomSeat[];
};

export async function SesOdasinaGit({ roomId, room, seats }: Opts) {
  if (!roomId) return;
  if (room) {
    YeniOdaOnbellegeYaz(room, seats ?? []);
  }
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
