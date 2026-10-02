import { OzellikBayragiAktifMi } from '../../ozellik-bayraklari/OzellikBayragiAktifMi';
import type { CeviriAnahtari } from '../../../i18n/useCeviri';

export type AnaSayfaBolumKodu =
  | 'live_now'
  | 'voice_rooms'
  | 'trending'
  | 'official_city_rooms'
  | 'city_league'
  | 'country_league'
  | 'events'
  | 'pk_now'
  | 'popular_agencies'
  | 'creators_for_you';

export type AnaSayfaBolum = {
  /** Locale-bağımsız sabit kimlik — React key / route / feature için */
  kod: AnaSayfaBolumKodu;
  aktif: boolean;
};

/** Menü / portal çeviri anahtarları — display text burada tutulmaz */
export const ANA_SAYFA_BOLUM_CEVIR: Record<
  AnaSayfaBolumKodu,
  { baslik: CeviriAnahtari; alt: CeviriAnahtari }
> = {
  live_now: {
    baslik: 'anaSayfa.bolumLiveNow',
    alt: 'anaSayfa.bolumLiveNowAlt',
  },
  voice_rooms: {
    baslik: 'anaSayfa.bolumVoiceRooms',
    alt: 'anaSayfa.bolumVoiceRoomsAlt',
  },
  trending: {
    baslik: 'anaSayfa.bolumTrending',
    alt: 'anaSayfa.bolumTrendingAlt',
  },
  official_city_rooms: {
    baslik: 'anaSayfa.bolumOfficialCity',
    alt: 'anaSayfa.bolumOfficialCityAlt',
  },
  city_league: {
    baslik: 'anaSayfa.bolumCityLeague',
    alt: 'anaSayfa.bolumCityLeagueAlt',
  },
  country_league: {
    baslik: 'anaSayfa.bolumCountryLeague',
    alt: 'anaSayfa.bolumCountryLeagueAlt',
  },
  events: {
    baslik: 'anaSayfa.bolumEvents',
    alt: 'anaSayfa.bolumEventsAlt',
  },
  pk_now: {
    baslik: 'anaSayfa.bolumPkNow',
    alt: 'anaSayfa.bolumPkNowAlt',
  },
  popular_agencies: {
    baslik: 'anaSayfa.bolumPopularAgencies',
    alt: 'anaSayfa.bolumPopularAgenciesAlt',
  },
  creators_for_you: {
    baslik: 'anaSayfa.bolumCreatorsForYou',
    alt: 'anaSayfa.bolumCreatorsForYouAlt',
  },
};

/** Home dating kartlarindan olusmaz — bolum listesi (metin yok, sadece id + flag) */
export function AnaSayfaBolumleriniGetir(): AnaSayfaBolum[] {
  return [
    {
      kod: 'live_now',
      aktif: OzellikBayragiAktifMi('live_enabled'),
    },
    {
      kod: 'voice_rooms',
      aktif: OzellikBayragiAktifMi('voice_rooms_enabled'),
    },
    { kod: 'trending', aktif: true },
    {
      kod: 'official_city_rooms',
      aktif: OzellikBayragiAktifMi('city_league_enabled'),
    },
    {
      kod: 'city_league',
      aktif: OzellikBayragiAktifMi('city_league_enabled'),
    },
    {
      kod: 'country_league',
      aktif: OzellikBayragiAktifMi('country_league_enabled'),
    },
    {
      kod: 'events',
      aktif: OzellikBayragiAktifMi('events_enabled'),
    },
    {
      kod: 'pk_now',
      aktif: OzellikBayragiAktifMi('pk_enabled'),
    },
    {
      kod: 'popular_agencies',
      aktif: OzellikBayragiAktifMi('agency_enabled'),
    },
    {
      kod: 'creators_for_you',
      aktif: true,
    },
  ];
}
