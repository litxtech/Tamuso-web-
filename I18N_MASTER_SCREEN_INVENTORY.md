# I18N_MASTER_SCREEN_INVENTORY

> Generated: 2026-09-24T13:28:48.891Z
> Source: `app/**/*.tsx` route files plus Phase 1 interaction follow. Not guessed.
> Phase 1 (auth) code-audited. Phases 2–20 are not started. RTL was not run on a device.

## Counts

- Screen/route files: 149
- User: 100
- Admin: 49
- Tabs: 8
- Alert.alert: 909
- Named sheet/modal/overlay files: 21
- Translation leaves (tr/en/es/ar): 1820 each, missing 0, empty 0, Arabic `????` runs: 0

## Phase 1 interaction graph (real code)

```
Index / AcilisEkrani
└── LoginScreen
    ├── GirisLobiOturumGecmisi
    │   ├── tap → signInFromHistory → success | expired password alert
    │   └── remove → Alert (cancel / remove)
    ├── email+password → Alert missing | Alert sign-in failed | tabs
    ├── Spotify → connecting | cancel | error alert
    ├── Apple (iOS native button) → connecting | cancel | error alert
    ├── guest (non-production) → MisafirOlarakDevamEt errors
    ├── forgot-password → dogrula-kod (recovery) → reset-password
    ├── register
    │   ├── avatar picker errors
    │   ├── gender / birth picker (ProfilSecimAlani)
    │   ├── KayitFormunuDogrula + YasKapisi
    │   ├── age declaration
    │   ├── PolitikaOnayKutulari → PolitikaOkumaPaneli
    │   ├── Spotify sign-up
    │   └── needsConfirm → dogrula-kod (signup)
    └── policy links → PolitikaOkumaPaneli (server legal body, chrome localized)
HesabiTamamlaKarti (guest upgrade sheet, shared)
    └── validation → MisafirHesabiTamamla → dogrula-kod (email_change) | error
```

No separate onboarding route exists. Profile setup during sign-up is `register.tsx`. Apple button text is the system control.

## Phase 1 screens

### app/(auth)/dogrula-kod.tsx

- [x] Screen bulundu
- [x] Route bulundu
- [x] Ana UI tarandı
- [x] Child componentler tarandı
- [x] Buton aksiyonları tarandı
- [x] Modal tarandı
- [x] Bottom sheet tarandı
- [x] Alert tarandı
- [x] Toast/Snackbar tarandı
- [x] Form/validation tarandı
- [x] Loading tarandı
- [x] Empty state tarandı
- [x] Error state tarandı
- [x] Success state tarandı
- [x] Dynamic states tarandı
- [x] Accessibility tarandı
- [x] TR tamam
- [x] EN tamam
- [x] ES tamam
- [x] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [x] Missing translation = 0
- [ ] Duplicate key = 0

Arabic RTL: code reviewed (OTP row forced LTR, forgot-password alignment follows `I18nManager`). Device pass: TEST EDİLEMEDİ.
Hard-coded remaining: admin-authored lobby title/slogan/brand and policy body stay as stored content. Custom registration field labels are admin free text.

### app/(auth)/forgot-password.tsx

- [x] Screen bulundu
- [x] Route bulundu
- [x] Ana UI tarandı
- [x] Child componentler tarandı
- [x] Buton aksiyonları tarandı
- [x] Modal tarandı
- [x] Bottom sheet tarandı
- [x] Alert tarandı
- [x] Toast/Snackbar tarandı
- [x] Form/validation tarandı
- [x] Loading tarandı
- [x] Empty state tarandı
- [x] Error state tarandı
- [x] Success state tarandı
- [x] Dynamic states tarandı
- [x] Accessibility tarandı
- [x] TR tamam
- [x] EN tamam
- [x] ES tamam
- [x] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [x] Missing translation = 0
- [ ] Duplicate key = 0

Arabic RTL: code reviewed (OTP row forced LTR, forgot-password alignment follows `I18nManager`). Device pass: TEST EDİLEMEDİ.
Hard-coded remaining: admin-authored lobby title/slogan/brand and policy body stay as stored content. Custom registration field labels are admin free text.

### app/(auth)/login.tsx

- [x] Screen bulundu
- [x] Route bulundu
- [x] Ana UI tarandı
- [x] Child componentler tarandı
- [x] Buton aksiyonları tarandı
- [x] Modal tarandı
- [x] Bottom sheet tarandı
- [x] Alert tarandı
- [x] Toast/Snackbar tarandı
- [x] Form/validation tarandı
- [x] Loading tarandı
- [x] Empty state tarandı
- [x] Error state tarandı
- [x] Success state tarandı
- [x] Dynamic states tarandı
- [x] Accessibility tarandı
- [x] TR tamam
- [x] EN tamam
- [x] ES tamam
- [x] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [x] Missing translation = 0
- [ ] Duplicate key = 0

Arabic RTL: code reviewed (OTP row forced LTR, forgot-password alignment follows `I18nManager`). Device pass: TEST EDİLEMEDİ.
Hard-coded remaining: admin-authored lobby title/slogan/brand and policy body stay as stored content. Custom registration field labels are admin free text.

### app/(auth)/register.tsx

- [x] Screen bulundu
- [x] Route bulundu
- [x] Ana UI tarandı
- [x] Child componentler tarandı
- [x] Buton aksiyonları tarandı
- [x] Modal tarandı
- [x] Bottom sheet tarandı
- [x] Alert tarandı
- [x] Toast/Snackbar tarandı
- [x] Form/validation tarandı
- [x] Loading tarandı
- [x] Empty state tarandı
- [x] Error state tarandı
- [x] Success state tarandı
- [x] Dynamic states tarandı
- [x] Accessibility tarandı
- [x] TR tamam
- [x] EN tamam
- [x] ES tamam
- [x] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [x] Missing translation = 0
- [ ] Duplicate key = 0

Arabic RTL: code reviewed (OTP row forced LTR, forgot-password alignment follows `I18nManager`). Device pass: TEST EDİLEMEDİ.
Hard-coded remaining: admin-authored lobby title/slogan/brand and policy body stay as stored content. Custom registration field labels are admin free text.

### app/(auth)/reset-password.tsx

- [x] Screen bulundu
- [x] Route bulundu
- [x] Ana UI tarandı
- [x] Child componentler tarandı
- [x] Buton aksiyonları tarandı
- [x] Modal tarandı
- [x] Bottom sheet tarandı
- [x] Alert tarandı
- [x] Toast/Snackbar tarandı
- [x] Form/validation tarandı
- [x] Loading tarandı
- [x] Empty state tarandı
- [x] Error state tarandı
- [x] Success state tarandı
- [x] Dynamic states tarandı
- [x] Accessibility tarandı
- [x] TR tamam
- [x] EN tamam
- [x] ES tamam
- [x] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [x] Missing translation = 0
- [ ] Duplicate key = 0

Arabic RTL: code reviewed (OTP row forced LTR, forgot-password alignment follows `I18nManager`). Device pass: TEST EDİLEMEDİ.
Hard-coded remaining: admin-authored lobby title/slogan/brand and policy body stay as stored content. Custom registration field labels are admin free text.

### app/index.tsx

- [x] Screen bulundu
- [x] Route bulundu
- [x] Ana UI tarandı
- [x] Child componentler tarandı
- [x] Buton aksiyonları tarandı
- [x] Modal tarandı
- [x] Bottom sheet tarandı
- [x] Alert tarandı
- [x] Toast/Snackbar tarandı
- [x] Form/validation tarandı
- [x] Loading tarandı
- [x] Empty state tarandı
- [x] Error state tarandı
- [x] Success state tarandı
- [x] Dynamic states tarandı
- [x] Accessibility tarandı
- [x] TR tamam
- [x] EN tamam
- [x] ES tamam
- [x] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [x] Missing translation = 0
- [ ] Duplicate key = 0

Arabic RTL: code reviewed (OTP row forced LTR, forgot-password alignment follows `I18nManager`). Device pass: TEST EDİLEMEDİ.
Hard-coded remaining: admin-authored lobby title/slogan/brand and policy body stay as stored content. Custom registration field labels are admin free text.

## All other screens (not audited this pass)

### app/(tabs)/cihazlar.tsx

Heuristic file status: LIKELY_TRANSLATED (TR literals in file ≈ 0). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/(tabs)/create.tsx

Heuristic file status: PARTIAL (TR literals in file ≈ 1). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/(tabs)/durum.tsx

Heuristic file status: PARTIAL (TR literals in file ≈ 4). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/(tabs)/index.tsx

Heuristic file status: PARTIAL (TR literals in file ≈ 14). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/(tabs)/messages.tsx

Heuristic file status: LIKELY_TRANSLATED (TR literals in file ≈ 0). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/(tabs)/profile.tsx

Heuristic file status: PARTIAL (TR literals in file ≈ 1). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/(tabs)/rooms.tsx

Heuristic file status: LIKELY_TRANSLATED (TR literals in file ≈ 0). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/(tabs)/wallet.tsx

Heuristic file status: PARTIAL (TR literals in file ≈ 4). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/ai-muzik/[id].tsx

Heuristic file status: PARTIAL (TR literals in file ≈ 47). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/ai-muzik/index.tsx

Heuristic file status: PARTIAL (TR literals in file ≈ 59). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/ai-muzik/islemler.tsx

Heuristic file status: PARTIAL (TR literals in file ≈ 6). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/ai-muzik/kutuphane.tsx

Heuristic file status: PARTIAL (TR literals in file ≈ 26). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/ai-muzik/pasaport/[id].tsx

Heuristic file status: PARTIAL (TR literals in file ≈ 8). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/ajans/[id]/analitik.tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 5). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/ajans/[id]/ayarlar.tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 44). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/ajans/[id]/basvurular.tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 4). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/ajans/[id]/canli.tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 9). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/ajans/[id]/davetler.tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 5). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/ajans/[id]/destek.tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 3). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/ajans/[id]/duyurular.tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 5). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/ajans/[id]/ekipler.tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 4). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/ajans/[id]/etkinlikler.tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 5). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/ajans/[id]/gorevler.tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 10). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/ajans/[id]/guvenlik.tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 4). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/ajans/[id]/index.tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 15). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/ajans/[id]/islemler.tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 15). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/ajans/[id]/program.tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 5). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/ajans/[id]/uyeler/[userId].tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 8). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/ajans/[id]/uyeler/index.tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 8). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/ajans/index.tsx

Heuristic file status: PARTIAL (TR literals in file ≈ 24). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/ajans/profil/[id]/index.tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 24). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/ajans/profil/[id]/uyeler.tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 6). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/ajans/teklifler.tsx

Heuristic file status: PARTIAL (TR literals in file ≈ 20). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/ajans/uye/index.tsx

Heuristic file status: PARTIAL (TR literals in file ≈ 17). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/ajans/yonetim/index.tsx

Heuristic file status: PARTIAL (TR literals in file ≈ 4). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/ayarlar/dil.tsx

Heuristic file status: PARTIAL (TR literals in file ≈ 2). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/ayarlar/gizlilik.tsx

Heuristic file status: LIKELY_TRANSLATED (TR literals in file ≈ 0). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/ayarlar/index.tsx

Heuristic file status: PARTIAL (TR literals in file ≈ 1). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/ayarlar/kisiler-aramalar.tsx

Heuristic file status: LIKELY_TRANSLATED (TR literals in file ≈ 0). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/ayarlar/satin-alma-gecmisi.tsx

Heuristic file status: PARTIAL (TR literals in file ≈ 1). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/bildir/index.tsx

Heuristic file status: PARTIAL (TR literals in file ≈ 18). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/bildirim-ayarlari/index.tsx

Heuristic file status: PARTIAL (TR literals in file ≈ 1). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/bildirimler/index.tsx

Heuristic file status: LIKELY_TRANSLATED (TR literals in file ≈ 0). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/canli/[id].tsx

Heuristic file status: PARTIAL (TR literals in file ≈ 3). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/canli/index.tsx

Heuristic file status: PARTIAL (TR literals in file ≈ 1). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/cuzdan/takas.tsx

Heuristic file status: PARTIAL (TR literals in file ≈ 65). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/destek/index.tsx

Heuristic file status: LIKELY_TRANSLATED (TR literals in file ≈ 0). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/durum/[id].tsx

Heuristic file status: PARTIAL (TR literals in file ≈ 2). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/durum/duzenle.tsx

Heuristic file status: LIKELY_TRANSLATED (TR literals in file ≈ 0). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/durum/olustur.tsx

Heuristic file status: PARTIAL (TR literals in file ≈ 3). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/duyuru/index.tsx

Heuristic file status: PARTIAL (TR literals in file ≈ 1). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/engellenen-kullanicilar/index.tsx

Heuristic file status: LIKELY_TRANSLATED (TR literals in file ≈ 0). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/fikirler/[id].tsx

Heuristic file status: PARTIAL (TR literals in file ≈ 7). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/fikirler/benim.tsx

Heuristic file status: PARTIAL (TR literals in file ≈ 3). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/fikirler/index.tsx

Heuristic file status: PARTIAL (TR literals in file ≈ 7). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/fikirler/olustur.tsx

Heuristic file status: PARTIAL (TR literals in file ≈ 17). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/gorusme/[id].tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 5). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/guvenlik/index.tsx

Heuristic file status: PARTIAL (TR literals in file ≈ 24). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/hesap-sil/index.tsx

Heuristic file status: PARTIAL (TR literals in file ≈ 26). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/host/index.tsx

Heuristic file status: PARTIAL (TR literals in file ≈ 20). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/islem-hacmi/index.tsx

Heuristic file status: LIKELY_TRANSLATED (TR literals in file ≈ 0). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/kesfet.tsx

Heuristic file status: PARTIAL (TR literals in file ≈ 2). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/kisiler/index.tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 0). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/kullanici/[id].tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 21). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/kyc/index.tsx

Heuristic file status: PARTIAL (TR literals in file ≈ 34). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/lobi/[id].tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 15). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/mesaj/[id].tsx

Heuristic file status: PARTIAL (TR literals in file ≈ 1). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/oyun/kaskad.tsx

Heuristic file status: PARTIAL (TR literals in file ≈ 1). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/oyun/nox.tsx

Heuristic file status: PARTIAL (TR literals in file ≈ 1). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/oyun/zeus.tsx

Heuristic file status: PARTIAL (TR literals in file ≈ 1). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/paylas/[kod].tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 5). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/paylasim/index.tsx

Heuristic file status: PARTIAL (TR literals in file ≈ 9). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/pk/index.tsx

Heuristic file status: PARTIAL (TR literals in file ≈ 6). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/platform/index.tsx

Heuristic file status: PARTIAL (TR literals in file ≈ 24). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/politika/[kod].tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 2). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/politika/index.tsx

Heuristic file status: LIKELY_TRANSLATED (TR literals in file ≈ 0). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/profil-ayarlar/index.tsx

Heuristic file status: PARTIAL (TR literals in file ≈ 2). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/profil-duzenle/index.tsx

Heuristic file status: PARTIAL (TR literals in file ≈ 3). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/raporlarim/[id].tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 8). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/raporlarim/index.tsx

Heuristic file status: LIKELY_TRANSLATED (TR literals in file ≈ 0). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/room/[id].tsx

Heuristic file status: PARTIAL (TR literals in file ≈ 41). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/sehir/[id].tsx

Heuristic file status: PARTIAL (TR literals in file ≈ 34). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/sehir/index.tsx

Heuristic file status: PARTIAL (TR literals in file ≈ 27). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/sehir/lig.tsx

Heuristic file status: PARTIAL (TR literals in file ≈ 4). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/sehir/savas.tsx

Heuristic file status: PARTIAL (TR literals in file ≈ 11). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/sehir/secim/[id].tsx

Heuristic file status: PARTIAL (TR literals in file ≈ 17). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/sehir/secim/index.tsx

Heuristic file status: PARTIAL (TR literals in file ≈ 8). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/sertifikasyon/index.tsx

Heuristic file status: PARTIAL (TR literals in file ≈ 44). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/siralamalar/index.tsx

Heuristic file status: PARTIAL (TR literals in file ≈ 15). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/takip/istekler.tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 0). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/takip/ortak.tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 0). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/takip/takip-edilenler.tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 0). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/takip/takipciler.tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 0). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/webview.tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 0). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/admin/ai-muzik.tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 38). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/admin/ajanslar/[id].tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 46). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/admin/ajanslar/index.tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 15). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/admin/bannerlar/[id].tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 35). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/admin/bannerlar/index.tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 10). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/admin/bannerlar/otomatik.tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 4). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/admin/bannerlar/yeni.tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 0). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/admin/ciro.tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 7). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/admin/cocuk-koruma.tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 7). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/admin/coin-paketleri.tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 14). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/admin/coin.tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 4). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/admin/cuzdan-yonetimi.tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 56). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/admin/destek/[id].tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 6). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/admin/destek/index.tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 15). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/admin/ekonomi.tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 32). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/admin/fikirler/[id].tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 36). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/admin/fikirler/index.tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 10). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/admin/fikirler/kategoriler.tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 2). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/admin/finans.tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 13). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/admin/giris-lobisi.tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 25). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/admin/gorusme-guvenlik.tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 15). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/admin/iletisim.tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 8). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/admin/index.tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 100). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/admin/islem-hacmi/index.tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 40). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/admin/kaskad-animasyon-lab.tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 3). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/admin/kaskad-yonetim.tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 93). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/admin/kayit-alanlari.tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 19). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/admin/kisiler-aramalar.tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 8). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/admin/komisyonlar.tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 26). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/admin/kullanicilar/[id].tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 72). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/admin/kullanicilar/index.tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 27). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/admin/kyc/[id].tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 35). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/admin/kyc/index.tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 6). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/admin/moderasyon/[id].tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 63). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/admin/moderasyon/index.tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 12). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/admin/muzik.tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 1). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/admin/odalar.tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 63). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/admin/oyun-test.tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 5). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/admin/oyunlar.tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 24). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/admin/ozellikler.tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 15). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/admin/paylasim-linkleri.tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 13). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/admin/platform-guvenlik.tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 38). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/admin/politikalar/[kod].tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 18). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/admin/politikalar/index.tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 10). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/admin/rehber.tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 11). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/admin/satin-alma-itirazlar.tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 19). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/admin/sehir-secim.tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 22). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/admin/sehirler.tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 15). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0

### app/admin/takas/index.tsx

Heuristic file status: NOT_TRANSLATED (TR literals in file ≈ 28). This does not certify the interaction tree.
- [x] Screen bulundu
- [x] Route bulundu
- [ ] Ana UI tarandı
- [ ] Child componentler tarandı
- [ ] Buton aksiyonları tarandı
- [ ] Modal tarandı
- [ ] Bottom sheet tarandı
- [ ] Alert tarandı
- [ ] Toast/Snackbar tarandı
- [ ] Form/validation tarandı
- [ ] Loading tarandı
- [ ] Empty state tarandı
- [ ] Error state tarandı
- [ ] Success state tarandı
- [ ] Dynamic states tarandı
- [ ] Accessibility tarandı
- [ ] TR tamam
- [ ] EN tamam
- [ ] ES tamam
- [ ] AR tamam
- [ ] Arabic RTL kontrol
- [ ] Hard-coded text = 0
- [ ] Missing translation = 0
- [ ] Duplicate key = 0
