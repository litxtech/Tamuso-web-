import type { BelgeIcerik } from '../../belge-paylasim/BelgeSablonlari';
import { SayiKisa } from '../bilesenler/AdminStil';

function tryYazi(n: unknown): string {
  return `${Number(n || 0).toLocaleString('tr-TR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} ₺`;
}

function coinYazi(n: unknown): string {
  return SayiKisa(Number(n || 0));
}

function asObj(v: unknown): Record<string, any> {
  return v && typeof v === 'object' ? (v as Record<string, any>) : {};
}

/** Finance report payload → BelgeIcerik (PDF / Share / WhatsApp / Print) */
export function FinanceBelgesiOlustur(
  reportType: string,
  payload: unknown,
  meta?: { reportId?: string | null; generatedAt?: string | null },
): BelgeIcerik {
  const p = asObj(payload);
  const ov = asObj(p.overview);
  const kpis = asObj(ov.kpis);
  const coin = asObj(p.coin_economy);
  const liab = asObj(p.liabilities);
  const liabBreak = asObj(liab.breakdown);
  const pnl = asObj(p.pnl);
  const pnlCur = asObj(pnl.current);
  const pnlEst = asObj(pnl.month_end_estimate);
  const rev = asObj(p.revenue);
  const sales = asObj(p.sales);
  const tip = reportType || String(p.report_type || 'CUSTOM_FINANCE');
  const when =
    meta?.generatedAt ||
    String(p.generated_at || ov.generated_at || new Date().toISOString());

  return {
    baslik: `Tamuso Finans · ${tip}`,
    altBaslik: meta?.reportId
      ? `Rapor ${meta.reportId}`
      : 'Finans Merkezi',
    platformAdi: 'Tamuso',
    ozet: `Operasyonel finans özeti · ${new Date(when).toLocaleString('tr-TR')}`,
    satirlar: [
      { etiket: 'Rapor tipi', deger: tip },
      ...(meta?.reportId
        ? [{ etiket: 'Rapor ID', deger: String(meta.reportId) }]
        : []),
      {
        etiket: 'Oluşturulma',
        deger: new Date(when).toLocaleString('tr-TR'),
      },
      {
        etiket: 'Toplam coin satışı',
        deger: tryYazi(kpis.total_coin_sales_try ?? sales.total_sales_try),
      },
      {
        etiket: 'Platform geliri',
        deger: tryYazi(kpis.platform_revenue_try ?? rev.brut_revenue_try),
      },
      {
        etiket: 'Platform net',
        deger: tryYazi(
          kpis.platform_net_try ??
            pnlCur.net_operational_result_try ??
            rev.net_operational_result_try,
        ),
      },
      {
        etiket: 'Kullanıcı coin bakiyesi',
        deger: coinYazi(coin.user_coin_supply ?? kpis.user_coin_supply),
      },
    ],
    bolumler: [
      {
        baslik: 'Coin ekonomisi',
        satirlar: [
          { etiket: 'Satılan', deger: coinYazi(coin.total_coin_sold) },
          { etiket: 'Bakiye', deger: coinYazi(coin.user_coin_supply) },
          { etiket: 'Harcanan', deger: coinYazi(coin.total_coin_spent) },
          { etiket: 'Bonus', deger: coinYazi(coin.total_bonus_coin) },
          { etiket: 'Oyun', deger: coinYazi(coin.total_game_coin) },
          {
            etiket: 'Promosyon',
            deger: coinYazi(coin.total_promotional_coin),
          },
        ],
      },
      {
        baslik: 'Yükümlülükler',
        satirlar: [
          {
            etiket: 'Toplam',
            deger: tryYazi(liab.total_liability_try),
          },
          {
            etiket: 'Creator alacağı',
            deger: tryYazi(liabBreak.creator_payable_try),
          },
          {
            etiket: 'Ajans alacağı',
            deger: tryYazi(liabBreak.agency_payable_try),
          },
          {
            etiket: 'Bekleyen çekim',
            deger: tryYazi(liabBreak.pending_withdrawals_try),
          },
          {
            etiket: 'Bekleyen iade',
            deger: tryYazi(liabBreak.pending_refunds_try),
          },
        ],
      },
      {
        baslik: 'Kâr / zarar (bu ay)',
        satirlar: [
          { etiket: 'Gelir', deger: tryYazi(pnlCur.revenue_try) },
          {
            etiket: 'Brüt satış',
            deger: tryYazi(pnlCur.gross_sales_try),
          },
          { etiket: 'İade', deger: tryYazi(pnlCur.refunds_try) },
          {
            etiket: 'Gider',
            deger: tryYazi(pnlCur.operating_expenses_try),
          },
          {
            etiket: 'Net sonuç',
            deger: tryYazi(pnlCur.net_operational_result_try),
          },
        ],
      },
      {
        baslik: 'Ay sonu tahmini (TAHMİN)',
        satirlar: [
          {
            etiket: 'Beklenen gelir',
            deger: tryYazi(pnlEst.expected_revenue_try),
          },
          {
            etiket: 'Beklenen gider',
            deger: tryYazi(pnlEst.expected_expense_try),
          },
          {
            etiket: 'Beklenen net',
            deger: tryYazi(pnlEst.expected_net_try),
          },
        ],
      },
      {
        baslik: 'Satış / gelir',
        satirlar: [
          {
            etiket: 'Dönem satış',
            deger: tryYazi(sales.total_sales_try),
          },
          {
            etiket: 'Dönem coin',
            deger: coinYazi(sales.total_coins),
          },
          {
            etiket: 'Brüt gelir',
            deger: tryYazi(rev.brut_revenue_try),
          },
          {
            etiket: 'Net sonuç',
            deger: tryYazi(rev.net_operational_result_try),
          },
        ],
      },
    ],
    not: 'Operasyonel finans — vergi muhasebesi değildir. Kaynak: sunucu.',
  };
}
