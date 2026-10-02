/**
 * Inject voice-room + confirmation-sheet i18n keys into tr/en/es + ar_parts.
 * Run: node scripts/_i18n_room_keys.mjs && node scripts/build_ar_locale.mjs
 */
import fs from 'fs';

const SES_ODA = {
  tr: {
    odaKapatildi: 'Oda kapatıldı',
    yonetimKapattiFeed:
      'Yönetim bu ses odasını kapattı. Feed’den kaldırıldı.',
    odadanCikarildiniz: 'Odadan çıkarıldınız.',
    hostCikisSoru:
      'Oda açık kalır. Kalıcı kapatmak için oda numarasına dokun.',
    kal: 'Kal',
    ayrilSoruKisa: 'Sesli odadan ayrılmak istiyor musun?',
    odayiKapat: 'Odayı kapat',
    odayiKapatSoru:
      'Bu ses odası kalıcı olarak kapanacak ve feed’den kalkacak. Emin misin?',
    evetKapat: 'Evet, kapat',
    mikrofon: 'Mikrofon',
    mikrofonKilitli: 'Mikrofonunuz oda yöneticisi tarafından kilitlendi.',
    mikrofonYoneticiKapatti: 'Mikrofonunuz yönetici tarafından kapatıldı.',
    istekGonderilemedi: 'İstek gönderilemedi',
    istekGonderildiKoltuk:
      'İstek gönderildi. Host kabul edince koltuğa oturursun.',
    konusmaciBaglantiHatasi: 'Konuşmacı bağlantısı kurulamadı',
    modMute: 'Mikrofon kapatıldı.',
    modUnmute: 'Mikrofon izni güncellendi.',
    modMicLock: 'Mikrofon kilitlendi.',
    modMicUnlock: 'Mikrofon kilidi kaldırıldı.',
    modUnseat: 'Kullanıcı dinleyiciye alındı.',
    modKick: 'Kullanıcı odadan çıkarıldı.',
    modBan: 'Kullanıcı yasaklandı.',
    modUnban: 'Yasak kaldırıldı.',
    islemTamamlandi: 'İşlem tamamlandı.',
    demo: 'Demo',
    demoModerasyon: 'Gerçek odada moderasyon çalışır.',
    moderasyon: 'Moderasyon',
    islemBasarisiz: 'İşlem tamamlanamadı. Tekrar deneyin.',
    koltuktanKalk: 'Koltuktan kalk',
    koltuktanKalkSoru:
      'Konuşmacı koltuğundan ayrılıp dinleyici olmak ister misin?',
    ayril: 'Ayrıl',
    demoLiderlik: 'Liderlik devri gerçek odada çalışır.',
    buKullaniciya: 'bu kullanıcıya',
    liderligiDevret: 'Liderliği devret',
    liderligiDevretSoru:
      '{{ad}} oda sahibi olacak. Tahta oturacak. Emin misin?',
    devret: 'Devret',
    liderlik: 'Liderlik',
    devredilemedi: 'Devredilemedi',
    yoneticiYetkisiniKaldir: 'Yönetici yetkisini kaldır',
    yoneticiYap: 'Yönetici yap',
    yoneticiKaldirSoru:
      'Bu kullanıcının oda yöneticisi yetkisi kaldırılsın mı?',
    yoneticiYapSoru: 'Bu kullanıcıyı oda yöneticisi yapmak istiyor musunuz?',
    yonetici: 'Yönetici',
    yoneticiKaldirildi: 'Yönetici yetkisi kaldırıldı.',
    yoneticiVerildi: 'Yönetici yetkisi verildi.',
    taht: 'Taht',
    tahtSadeceSahip: 'Taht yalnızca oda sahibine aittir.',
    koltukKilitli: 'Bu koltuk kilitli.',
    koltukTalebi: 'Koltuk talebi',
    koltukTalebiSoru: 'Koltuk {{n}} için istek gönderilsin mi?',
    istekGonder: 'İstek gönder',
    istekGonderildiBuKoltuk:
      'İstek gönderildi. Host kabul edince bu koltuğa oturacaksın.',
    odadanCikar: 'Odadan çıkar',
    odadanCikarSoru: '{{ad}} odadan çıkarılsın mı?',
    yasakla: 'Yasakla',
    yasaklaSoru: '{{ad}} bu odadan yasaklansın mı?',
    menuProfiliniGor: 'Profilini Gör',
    menuKoltuktanKalk: 'Koltuktan Kalk',
    menuMikrofonuKapat: 'Mikrofonu Kapat',
    menuMikrofonuKilitle: 'Mikrofonu Kilitle',
    menuMikrofonKilidiniAc: 'Mikrofon Kilidini Aç',
    menuKoltuktanIndir: 'Koltuktan İndir',
    menuYoneticiYap: 'Yönetici Yap',
    menuYoneticiYetkisiniKaldir: 'Yönetici Yetkisini Kaldır',
    menuLiderligiDevret: 'Liderliği Devret',
    menuOdadanCikar: 'Odadan Çıkar',
    menuEngelleYasakla: 'Engelle / Yasakla',
    odaArtikCanliDegil: 'Bu oda artık canlı değil',
    odaYuklenemedi: 'Oda yüklenemedi',
    sesBaglantisi: 'Ses bağlantısı',
    sesBaglantisiHata:
      'Mikrofon yayınlanamadı. İzinleri kontrol edip odadan çıkıp tekrar dene.',
    hediye: 'Hediye',
    katalogYukleniyor: 'Katalog yükleniyor — biraz sonra dene.',
    yetersizCoin: 'Yetersiz coin',
    hediyeCoinYukle: 'Hediye kartında Coin yükle’ye bas.',
    gonderilemedi: 'Gönderilemedi',
    sehireGuc: 'Şehrine güç',
    sehireGucBody:
      '{{sehir}}: +{{delta}} güç\\nBugün toplam {{toplam}} güç kattın.',
    odaBulunamadi: 'Oda bulunamadı',
    odaSahibi: 'Oda sahibi',
    canliDinleyici: 'Canlı dinleyici',
    odaKartiDuzenle: 'Oda kartını ve koltuk sayısını düzenle',
    yorumlariGoster: 'Yorumları göster',
    yorumlar: 'Yorumlar',
    mikrofonuAc: 'Mikrofonu aç',
    mikrofonuKapat: 'Mikrofonu kapat',
    hediyeGonder: 'Hediye gönder',
    hazir: 'Hazır',
    bagliDinleyici: 'Bağlı · dinleyici',
    bagliKonusmaci: 'Bağlı · konuşmacı',
    demoDinleyici: 'Demo · dinleyici',
    demoKonusmaci: 'Demo · konuşmacı',
    sesBaglaniyor: 'Ses bağlanıyor…',
    demoCanliOda: 'Demo canlı oda',
    demoTopic: 'Ses + hediye önizleme',
    muzik: 'Müzik',
    uygula: 'Uygula',
    yeniFoto: 'Yeni foto',
    koltukAzalt: 'Koltuk azalt',
    profilBilgileri: 'Profil bilgileri',
    takipEdilenler: 'Takip edilenler',
    bildirVeyaEngelle: 'Bildir veya engelle',
    sesDevamEdiyor: 'Ses devam ediyor',
    sesOdasindanCik: 'Ses odasından çık',
    sesDevamOdayaDon: 'Ses devam ediyor · Odaya dönmek için dokun',
    odayaDon: 'Odaya dön',
    girisEfsane: 'EFSANE GİRİŞ',
    girisAltin: 'ALTIN GİRİŞ',
    girisGumus: 'GÜMÜŞ GİRİŞ',
    girisOzel: 'ÖZEL GİRİŞ',
    girisAltEfsane: 'Seviye {{level}} · efsane sahneye iniyor',
    girisAltAltin: 'Seviye {{level}} · altın kapıdan girdi',
    girisAltKatildi: 'Seviye {{level}} · odaya katıldı',
    odaNumarasiA11y: 'Oda numarası {{kod}}',
  },
  en: {
    odaKapatildi: 'Room closed',
    yonetimKapattiFeed:
      'Management closed this voice room. It was removed from the feed.',
    odadanCikarildiniz: 'You were removed from the room.',
    hostCikisSoru:
      'The room stays open. Tap the room number to close it permanently.',
    kal: 'Stay',
    ayrilSoruKisa: 'Leave the voice room?',
    odayiKapat: 'Close room',
    odayiKapatSoru:
      'This voice room will close permanently and leave the feed. Are you sure?',
    evetKapat: 'Yes, close',
    mikrofon: 'Microphone',
    mikrofonKilitli: 'Your mic was locked by a room admin.',
    mikrofonYoneticiKapatti: 'Your mic was muted by an admin.',
    istekGonderilemedi: 'Could not send request',
    istekGonderildiKoltuk:
      'Request sent. You will take a seat when the host accepts.',
    konusmaciBaglantiHatasi: 'Could not connect as speaker',
    modMute: 'Microphone muted.',
    modUnmute: 'Microphone permission updated.',
    modMicLock: 'Microphone locked.',
    modMicUnlock: 'Microphone unlocked.',
    modUnseat: 'User moved to listener.',
    modKick: 'User removed from the room.',
    modBan: 'User banned.',
    modUnban: 'Ban lifted.',
    islemTamamlandi: 'Done.',
    demo: 'Demo',
    demoModerasyon: 'Moderation works in a real room.',
    moderasyon: 'Moderation',
    islemBasarisiz: 'Could not complete. Try again.',
    koltuktanKalk: 'Leave seat',
    koltuktanKalkSoru: 'Leave the speaker seat and become a listener?',
    ayril: 'Leave',
    demoLiderlik: 'Leadership transfer works in a real room.',
    buKullaniciya: 'this user',
    liderligiDevret: 'Transfer leadership',
    liderligiDevretSoru:
      '{{ad}} will become room owner and take the throne. Continue?',
    devret: 'Transfer',
    liderlik: 'Leadership',
    devredilemedi: 'Could not transfer',
    yoneticiYetkisiniKaldir: 'Remove admin',
    yoneticiYap: 'Make admin',
    yoneticiKaldirSoru: 'Remove this user’s room admin rights?',
    yoneticiYapSoru: 'Make this user a room admin?',
    yonetici: 'Admin',
    yoneticiKaldirildi: 'Admin rights removed.',
    yoneticiVerildi: 'Admin rights granted.',
    taht: 'Throne',
    tahtSadeceSahip: 'Only the room owner can take the throne.',
    koltukKilitli: 'This seat is locked.',
    koltukTalebi: 'Seat request',
    koltukTalebiSoru: 'Send a request for seat {{n}}?',
    istekGonder: 'Send request',
    istekGonderildiBuKoltuk:
      'Request sent. You will sit here when the host accepts.',
    odadanCikar: 'Remove from room',
    odadanCikarSoru: 'Remove {{ad}} from the room?',
    yasakla: 'Ban',
    yasaklaSoru: 'Ban {{ad}} from this room?',
    menuProfiliniGor: 'View profile',
    menuKoltuktanKalk: 'Leave seat',
    menuMikrofonuKapat: 'Mute mic',
    menuMikrofonuKilitle: 'Lock mic',
    menuMikrofonKilidiniAc: 'Unlock mic',
    menuKoltuktanIndir: 'Remove from seat',
    menuYoneticiYap: 'Make admin',
    menuYoneticiYetkisiniKaldir: 'Remove admin',
    menuLiderligiDevret: 'Transfer leadership',
    menuOdadanCikar: 'Remove from room',
    menuEngelleYasakla: 'Block / Ban',
    odaArtikCanliDegil: 'This room is no longer live',
    odaYuklenemedi: 'Could not load room',
    sesBaglantisi: 'Audio connection',
    sesBaglantisiHata:
      'Could not publish mic. Check permissions, leave, and try again.',
    hediye: 'Gift',
    katalogYukleniyor: 'Catalog loading — try again shortly.',
    yetersizCoin: 'Not enough coins',
    hediyeCoinYukle: 'Tap Coin top-up on the gift card.',
    gonderilemedi: 'Could not send',
    sehireGuc: 'City power',
    sehireGucBody:
      '{{sehir}}: +{{delta}} power\\nYou added {{toplam}} power today.',
    odaBulunamadi: 'Room not found',
    odaSahibi: 'Room owner',
    canliDinleyici: 'Live listeners',
    odaKartiDuzenle: 'Edit room card and seat count',
    yorumlariGoster: 'Show comments',
    yorumlar: 'Comments',
    mikrofonuAc: 'Unmute mic',
    mikrofonuKapat: 'Mute mic',
    hediyeGonder: 'Send gift',
    hazir: 'Ready',
    bagliDinleyici: 'Connected · listener',
    bagliKonusmaci: 'Connected · speaker',
    demoDinleyici: 'Demo · listener',
    demoKonusmaci: 'Demo · speaker',
    sesBaglaniyor: 'Connecting audio…',
    demoCanliOda: 'Demo live room',
    demoTopic: 'Audio + gift preview',
    muzik: 'Music',
    uygula: 'Apply',
    yeniFoto: 'New photo',
    koltukAzalt: 'Decrease seats',
    profilBilgileri: 'Profile info',
    takipEdilenler: 'Following',
    bildirVeyaEngelle: 'Report or block',
    sesDevamEdiyor: 'Audio continuing',
    sesOdasindanCik: 'Leave voice room',
    sesDevamOdayaDon: 'Audio continuing · Tap to return',
    odayaDon: 'Return to room',
    girisEfsane: 'LEGENDARY ENTRY',
    girisAltin: 'GOLD ENTRY',
    girisGumus: 'SILVER ENTRY',
    girisOzel: 'SPECIAL ENTRY',
    girisAltEfsane: 'Level {{level}} · legendary entrance',
    girisAltAltin: 'Level {{level}} · entered through the gold gate',
    girisAltKatildi: 'Level {{level}} · joined the room',
    odaNumarasiA11y: 'Room number {{kod}}',
  },
  es: {
    odaKapatildi: 'Sala cerrada',
    yonetimKapattiFeed:
      'La administración cerró esta sala de voz. Se eliminó del feed.',
    odadanCikarildiniz: 'Te expulsaron de la sala.',
    hostCikisSoru:
      'La sala sigue abierta. Toca el número para cerrarla permanentemente.',
    kal: 'Quedarse',
    ayrilSoruKisa: '¿Salir de la sala de voz?',
    odayiKapat: 'Cerrar sala',
    odayiKapatSoru:
      'Esta sala se cerrará permanentemente y saldrá del feed. ¿Seguro?',
    evetKapat: 'Sí, cerrar',
    mikrofon: 'Micrófono',
    mikrofonKilitli: 'Un admin bloqueó tu micrófono.',
    mikrofonYoneticiKapatti: 'Un admin silenció tu micrófono.',
    istekGonderilemedi: 'No se pudo enviar la solicitud',
    istekGonderildiKoltuk:
      'Solicitud enviada. Te sentarás cuando el anfitrión acepte.',
    konusmaciBaglantiHatasi: 'No se pudo conectar como orador',
    modMute: 'Micrófono silenciado.',
    modUnmute: 'Permiso de micrófono actualizado.',
    modMicLock: 'Micrófono bloqueado.',
    modMicUnlock: 'Micrófono desbloqueado.',
    modUnseat: 'Usuario pasado a oyente.',
    modKick: 'Usuario expulsado de la sala.',
    modBan: 'Usuario baneado.',
    modUnban: 'Ban eliminado.',
    islemTamamlandi: 'Listo.',
    demo: 'Demo',
    demoModerasyon: 'La moderación funciona en una sala real.',
    moderasyon: 'Moderación',
    islemBasarisiz: 'No se pudo completar. Inténtalo de nuevo.',
    koltuktanKalk: 'Dejar asiento',
    koltuktanKalkSoru: '¿Dejar el asiento de orador y ser oyente?',
    ayril: 'Salir',
    demoLiderlik: 'La cesión de liderazgo funciona en una sala real.',
    buKullaniciya: 'este usuario',
    liderligiDevret: 'Ceder liderazgo',
    liderligiDevretSoru:
      '{{ad}} será el dueño y ocupará el trono. ¿Continuar?',
    devret: 'Ceder',
    liderlik: 'Liderazgo',
    devredilemedi: 'No se pudo ceder',
    yoneticiYetkisiniKaldir: 'Quitar admin',
    yoneticiYap: 'Hacer admin',
    yoneticiKaldirSoru: '¿Quitar los derechos de admin de este usuario?',
    yoneticiYapSoru: '¿Hacer admin de sala a este usuario?',
    yonetici: 'Admin',
    yoneticiKaldirildi: 'Derechos de admin eliminados.',
    yoneticiVerildi: 'Derechos de admin concedidos.',
    taht: 'Trono',
    tahtSadeceSahip: 'Solo el dueño puede ocupar el trono.',
    koltukKilitli: 'Este asiento está bloqueado.',
    koltukTalebi: 'Solicitud de asiento',
    koltukTalebiSoru: '¿Enviar solicitud para el asiento {{n}}?',
    istekGonder: 'Enviar solicitud',
    istekGonderildiBuKoltuk:
      'Solicitud enviada. Te sentarás aquí cuando el anfitrión acepte.',
    odadanCikar: 'Expulsar de la sala',
    odadanCikarSoru: '¿Expulsar a {{ad}} de la sala?',
    yasakla: 'Banear',
    yasaklaSoru: '¿Banear a {{ad}} de esta sala?',
    menuProfiliniGor: 'Ver perfil',
    menuKoltuktanKalk: 'Dejar asiento',
    menuMikrofonuKapat: 'Silenciar mic',
    menuMikrofonuKilitle: 'Bloquear mic',
    menuMikrofonKilidiniAc: 'Desbloquear mic',
    menuKoltuktanIndir: 'Bajar del asiento',
    menuYoneticiYap: 'Hacer admin',
    menuYoneticiYetkisiniKaldir: 'Quitar admin',
    menuLiderligiDevret: 'Ceder liderazgo',
    menuOdadanCikar: 'Expulsar de la sala',
    menuEngelleYasakla: 'Bloquear / Banear',
    odaArtikCanliDegil: 'Esta sala ya no está en vivo',
    odaYuklenemedi: 'No se pudo cargar la sala',
    sesBaglantisi: 'Conexión de audio',
    sesBaglantisiHata:
      'No se pudo publicar el mic. Revisa permisos, sal y vuelve a intentar.',
    hediye: 'Regalo',
    katalogYukleniyor: 'Catálogo cargando — inténtalo en un momento.',
    yetersizCoin: 'Coins insuficientes',
    hediyeCoinYukle: 'Toca Recargar coins en la tarjeta de regalo.',
    gonderilemedi: 'No se pudo enviar',
    sehireGuc: 'Poder de ciudad',
    sehireGucBody:
      '{{sehir}}: +{{delta}} poder\\nHoy sumaste {{toplam}} de poder.',
    odaBulunamadi: 'Sala no encontrada',
    odaSahibi: 'Dueño de la sala',
    canliDinleyici: 'Oyentes en vivo',
    odaKartiDuzenle: 'Editar tarjeta y asientos',
    yorumlariGoster: 'Mostrar comentarios',
    yorumlar: 'Comentarios',
    mikrofonuAc: 'Activar mic',
    mikrofonuKapat: 'Silenciar mic',
    hediyeGonder: 'Enviar regalo',
    hazir: 'Listo',
    bagliDinleyici: 'Conectado · oyente',
    bagliKonusmaci: 'Conectado · orador',
    demoDinleyici: 'Demo · oyente',
    demoKonusmaci: 'Demo · orador',
    sesBaglaniyor: 'Conectando audio…',
    demoCanliOda: 'Sala demo en vivo',
    demoTopic: 'Vista previa de audio + regalos',
    muzik: 'Música',
    uygula: 'Aplicar',
    yeniFoto: 'Nueva foto',
    koltukAzalt: 'Reducir asientos',
    profilBilgileri: 'Info del perfil',
    takipEdilenler: 'Siguiendo',
    bildirVeyaEngelle: 'Denunciar o bloquear',
    sesDevamEdiyor: 'Audio en curso',
    sesOdasindanCik: 'Salir de la sala de voz',
    sesDevamOdayaDon: 'Audio en curso · Toca para volver',
    odayaDon: 'Volver a la sala',
    girisEfsane: 'ENTRADA LEGENDARIA',
    girisAltin: 'ENTRADA DORADA',
    girisGumus: 'ENTRADA PLATEADA',
    girisOzel: 'ENTRADA ESPECIAL',
    girisAltEfsane: 'Nivel {{level}} · entrada legendaria',
    girisAltAltin: 'Nivel {{level}} · entró por la puerta dorada',
    girisAltKatildi: 'Nivel {{level}} · se unió a la sala',
    odaNumarasiA11y: 'Número de sala {{kod}}',
  },
  ar: {
    odaKapatildi: 'أُغلقت الغرفة',
    yonetimKapattiFeed:
      'أغلقت الإدارة غرفة الصوت هذه. أُزيلت من الخلاصة.',
    odadanCikarildiniz: 'تمت إزالتك من الغرفة.',
    hostCikisSoru:
      'تبقى الغرفة مفتوحة. المس رقم الغرفة لإغلاقها نهائيًا.',
    kal: 'البقاء',
    ayrilSoruKisa: 'هل تريد مغادرة غرفة الصوت؟',
    odayiKapat: 'إغلاق الغرفة',
    odayiKapatSoru:
      'ستُغلق غرفة الصوت نهائيًا وتخرج من الخلاصة. هل أنت متأكد؟',
    evetKapat: 'نعم، أغلق',
    mikrofon: 'الميكروفون',
    mikrofonKilitli: 'قفل مشرف الغرفة ميكروفونك.',
    mikrofonYoneticiKapatti: 'كتم مشرف ميكروفونك.',
    istekGonderilemedi: 'تعذّر إرسال الطلب',
    istekGonderildiKoltuk:
      'أُرسل الطلب. ستجلس عند قبول المضيف.',
    konusmaciBaglantiHatasi: 'تعذّر الاتصال كمتحدث',
    modMute: 'تم كتم الميكروفون.',
    modUnmute: 'تم تحديث إذن الميكروفون.',
    modMicLock: 'تم قفل الميكروفون.',
    modMicUnlock: 'تم فتح قفل الميكروفون.',
    modUnseat: 'نُقل المستخدم إلى المستمعين.',
    modKick: 'أُخرج المستخدم من الغرفة.',
    modBan: 'حُظر المستخدم.',
    modUnban: 'رُفع الحظر.',
    islemTamamlandi: 'تم.',
    demo: 'تجريبي',
    demoModerasyon: 'الإشراف يعمل في غرفة حقيقية.',
    moderasyon: 'الإشراف',
    islemBasarisiz: 'تعذّر الإكمال. حاول مرة أخرى.',
    koltuktanKalk: 'مغادرة المقعد',
    koltuktanKalkSoru: 'هل تغادر مقعد المتحدث وتصبح مستمعًا؟',
    ayril: 'مغادرة',
    demoLiderlik: 'نقل القيادة يعمل في غرفة حقيقية.',
    buKullaniciya: 'هذا المستخدم',
    liderligiDevret: 'نقل القيادة',
    liderligiDevretSoru:
      'سيصبح {{ad}} مالك الغرفة ويجلس على العرش. متابعة؟',
    devret: 'نقل',
    liderlik: 'القيادة',
    devredilemedi: 'تعذّر النقل',
    yoneticiYetkisiniKaldir: 'إزالة المشرف',
    yoneticiYap: 'تعيين مشرف',
    yoneticiKaldirSoru: 'إزالة صلاحيات مشرف الغرفة لهذا المستخدم؟',
    yoneticiYapSoru: 'تعيين هذا المستخدم مشرفًا للغرفة؟',
    yonetici: 'مشرف',
    yoneticiKaldirildi: 'أُزيلت صلاحيات المشرف.',
    yoneticiVerildi: 'مُنحت صلاحيات المشرف.',
    taht: 'العرش',
    tahtSadeceSahip: 'العرش للمالك فقط.',
    koltukKilitli: 'هذا المقعد مقفل.',
    koltukTalebi: 'طلب مقعد',
    koltukTalebiSoru: 'إرسال طلب للمقعد {{n}}؟',
    istekGonder: 'إرسال الطلب',
    istekGonderildiBuKoltuk:
      'أُرسل الطلب. ستجلس هنا عند قبول المضيف.',
    odadanCikar: 'إخراج من الغرفة',
    odadanCikarSoru: 'إخراج {{ad}} من الغرفة؟',
    yasakla: 'حظر',
    yasaklaSoru: 'حظر {{ad}} من هذه الغرفة؟',
    menuProfiliniGor: 'عرض الملف',
    menuKoltuktanKalk: 'مغادرة المقعد',
    menuMikrofonuKapat: 'كتم الميكروفون',
    menuMikrofonuKilitle: 'قفل الميكروفون',
    menuMikrofonKilidiniAc: 'فتح قفل الميكروفون',
    menuKoltuktanIndir: 'إنزال من المقعد',
    menuYoneticiYap: 'تعيين مشرف',
    menuYoneticiYetkisiniKaldir: 'إزالة المشرف',
    menuLiderligiDevret: 'نقل القيادة',
    menuOdadanCikar: 'إخراج من الغرفة',
    menuEngelleYasakla: 'حظر / منع',
    odaArtikCanliDegil: 'هذه الغرفة لم تعد مباشرة',
    odaYuklenemedi: 'تعذّر تحميل الغرفة',
    sesBaglantisi: 'اتصال الصوت',
    sesBaglantisiHata:
      'تعذّر بث الميكروفون. تحقق من الأذونات ثم غادر وأعد المحاولة.',
    hediye: 'هدية',
    katalogYukleniyor: 'جارٍ تحميل الكتالوج — حاول بعد قليل.',
    yetersizCoin: 'عملات غير كافية',
    hediyeCoinYukle: 'المس شحن العملات في بطاقة الهدية.',
    gonderilemedi: 'تعذّر الإرسال',
    sehireGuc: 'قوة المدينة',
    sehireGucBody:
      '{{sehir}}: +{{delta}} قوة\\nأضفت اليوم {{toplam}} من القوة.',
    odaBulunamadi: 'الغرفة غير موجودة',
    odaSahibi: 'مالك الغرفة',
    canliDinleyici: 'مستمعون مباشرون',
    odaKartiDuzenle: 'تعديل بطاقة الغرفة وعدد المقاعد',
    yorumlariGoster: 'إظهار التعليقات',
    yorumlar: 'التعليقات',
    mikrofonuAc: 'تشغيل الميكروفون',
    mikrofonuKapat: 'كتم الميكروفون',
    hediyeGonder: 'إرسال هدية',
    hazir: 'جاهز',
    bagliDinleyici: 'متصل · مستمع',
    bagliKonusmaci: 'متصل · متحدث',
    demoDinleyici: 'تجريبي · مستمع',
    demoKonusmaci: 'تجريبي · متحدث',
    sesBaglaniyor: 'جارٍ توصيل الصوت…',
    demoCanliOda: 'غرفة تجريبية مباشرة',
    demoTopic: 'معاينة صوت + هدايا',
    muzik: 'موسيقى',
    uygula: 'تطبيق',
    yeniFoto: 'صورة جديدة',
    koltukAzalt: 'تقليل المقاعد',
    profilBilgileri: 'معلومات الملف',
    takipEdilenler: 'المتابَعون',
    bildirVeyaEngelle: 'إبلاغ أو حظر',
    sesDevamEdiyor: 'الصوت مستمر',
    sesOdasindanCik: 'مغادرة غرفة الصوت',
    sesDevamOdayaDon: 'الصوت مستمر · المس للعودة',
    odayaDon: 'العودة إلى الغرفة',
    girisEfsane: 'دخول أسطوري',
    girisAltin: 'دخول ذهبي',
    girisGumus: 'دخول فضي',
    girisOzel: 'دخول خاص',
    girisAltEfsane: 'المستوى {{level}} · دخول أسطوري',
    girisAltAltin: 'المستوى {{level}} · دخل من البوابة الذهبية',
    girisAltKatildi: 'المستوى {{level}} · انضم إلى الغرفة',
    odaNumarasiA11y: 'رقم الغرفة {{kod}}',
  },
};

/** Keys already in tr sesOda that may be missing from ar_parts */
const SES_ODA_EXISTING_AR = {
  koltukIzinleri: 'طلبات المقاعد',
  bekleyenIstekYok: 'لا طلبات معلّقة',
  bekleyenIstekSayi: '{{sayi}} طلب معلّق',
  koltukN: 'مقعد {{n}}',
  onayla: 'قبول',
  reddet: 'رفض',
  arkaPlan: 'الخلفية',
  oda: 'غرفة',
  kapak: 'الغلاف',
  kapat: 'إغلاق',
  takip: 'متابعة',
  dinleyenler: 'المستمعون',
  koltuktaOlmayanYok: 'لا مستمعين خارج المقاعد',
  dinleyenAciklama: 'من يستمع دون الجلوس على مقعد',
  dinleyenAlt: 'كل من ليس على مقعد يظهر هنا',
  yetkiYok: 'ليس لديك صلاحية للرد على هذا الطلب.',
  bosKoltukYok: 'لا مقعد فارغ.',
  zatenYanitlandi: 'تم الرد على هذا الطلب مسبقًا.',
  istekBulunamadi: 'الطلب غير موجود.',
  kayitCakismasi: 'تعارض. حاول مرة أخرى.',
  istekYanitlanamadi: 'تعذّر الرد على الطلب.',
};

const OYUN_EXTRA = {
  tr: {
    davetEyebrow: 'OYUN DAVETİ',
    varsayilanAd: 'Tamuso Oyun',
    davetBody: '{{host}} bir oyun başlattı. Katılmak ister misin?',
    birOyuncu: 'Bir oyuncu',
    davetMeta: '{{sn}} sn · {{joined}}/{{max}} oyuncu',
    katil: 'KATIL',
    izle: 'İZLE',
    simdiDegil: 'ŞİMDİ DEĞİL',
    odaAcikKalir:
      'Üstteki oda açık kalır. Kart dock’un üstüne biner; koltuklar yerinde durur.',
    acikOyunYok: 'Şu an açık oyun yok',
    acikOyunYokBody:
      'Oyunlar admin panelinden kapatılmış. Daha sonra tekrar dene.',
    oyna: 'OYNA',
    soloSunucu: 'Solo · sunucu sonucu',
    noxBody: '5×3 payline · wild · scatter bonus · sunucu sonucu',
    zeusBody: '6×5 cascade · 4 Zeus = 15 ücretsiz tur · çarpan küreleri',
    kaskadBody: '6×5 cascade · portal scatter · çarpan küreleri · bonus turlar',
  },
  en: {
    davetEyebrow: 'GAME INVITE',
    varsayilanAd: 'Tamuso Game',
    davetBody: '{{host}} started a game. Want to join?',
    birOyuncu: 'A player',
    davetMeta: '{{sn}} s · {{joined}}/{{max}} players',
    katil: 'JOIN',
    izle: 'WATCH',
    simdiDegil: 'NOT NOW',
    odaAcikKalir:
      'The room above stays open. The card sits above the dock; seats stay put.',
    acikOyunYok: 'No games open right now',
    acikOyunYokBody: 'Games were turned off in admin. Try again later.',
    oyna: 'PLAY',
    soloSunucu: 'Solo · server result',
    noxBody: '5×3 payline · wild · scatter bonus · server result',
    zeusBody: '6×5 cascade · 4 Zeus = 15 free spins · multipliers',
    kaskadBody: '6×5 cascade · portal scatter · multipliers · bonus rounds',
  },
  es: {
    davetEyebrow: 'INVITACIÓN',
    varsayilanAd: 'Juego Tamuso',
    davetBody: '{{host}} inició un juego. ¿Quieres unirte?',
    birOyuncu: 'Un jugador',
    davetMeta: '{{sn}} s · {{joined}}/{{max}} jugadores',
    katil: 'UNIRSE',
    izle: 'VER',
    simdiDegil: 'AHORA NO',
    odaAcikKalir:
      'La sala de arriba sigue abierta. La tarjeta va sobre el dock; los asientos quedan.',
    acikOyunYok: 'No hay juegos abiertos',
    acikOyunYokBody: 'Los juegos están cerrados en admin. Inténtalo más tarde.',
    oyna: 'JUGAR',
    soloSunucu: 'Solo · resultado del servidor',
    noxBody: '5×3 payline · wild · bonus scatter · resultado del servidor',
    zeusBody: '6×5 cascade · 4 Zeus = 15 giros gratis · multiplicadores',
    kaskadBody: '6×5 cascade · portal scatter · multiplicadores · bonus',
  },
  ar: {
    davetEyebrow: 'دعوة لعبة',
    varsayilanAd: 'لعبة Tamuso',
    davetBody: 'بدأ {{host}} لعبة. هل تريد الانضمام؟',
    birOyuncu: 'لاعب',
    davetMeta: '{{sn}} ث · {{joined}}/{{max}} لاعبين',
    katil: 'انضمام',
    izle: 'مشاهدة',
    simdiDegil: 'ليس الآن',
    odaAcikKalir:
      'تبقى الغرفة أعلاه مفتوحة. البطاقة فوق الشريط؛ المقاعد كما هي.',
    acikOyunYok: 'لا ألعاب مفتوحة الآن',
    acikOyunYokBody: 'أُغلقت الألعاب من لوحة الإدارة. حاول لاحقًا.',
    oyna: 'العب',
    soloSunucu: 'فردي · نتيجة الخادم',
    noxBody: '5×3 خطوط · وايلد · مكافأة سكاتر · نتيجة الخادم',
    zeusBody: '6×5 تتالي · 4 زيوس = 15 لفة مجانية · مضاعفات',
    kaskadBody: '6×5 تتالي · بوابة سكاتر · مضاعفات · جولات مكافأة',
  },
};

const COCUK = {
  tr: {
    baslik: 'Çocuk Koruma',
    govde: `Tamuso yalnızca 18 yaşını doldurmuş kişiler içindir.

Çocukların (18 yaş altı) güvenliği en yüksek önceliğimizdir. Platformda çocuk cinsel istismarı materyali (CSAM), çocuk sömürüsü, grooming, reşit olmayanlara yönelik cinsel içerik veya reşit olmayanların katılımına SIFIR TOLERANS uygulanır.

Bu politikayı ihlal eden hesaplar derhal ve kalıcı olarak kapatılır. Af yoktur. Gerekli hallerde yasal mercilere bildirim yapılır.

Devam etmek için 18 yaşından büyük olduğunuzu beyan etmelisiniz. 18 yaşından küçük olduğunuzu belirtirseniz hesabınız kapatılır ve giriş lobisine yönlendirilirsiniz.

Bu onay her hesap için yalnızca bir kez istenir.`,
    btnBuyugum: '18 yaşından büyüğüm',
    btnDegilim: '18 yaşından değilim',
    onayUyari:
      '18 yaşından küçük olduğunuzu onaylıyorsanız hesabınız kapatılacak ve lobiye yönlendirileceksiniz. Bu işlem geri alınamaz.',
    btnOnayKapat: 'Onaylıyorum — hesabımı kapat',
    btnVazgec: 'Vazgeç',
  },
  en: {
    baslik: 'Child Protection',
    govde: `Tamuso is only for people who are 18 years of age or older.

The safety of children (under 18) is our highest priority. We have ZERO TOLERANCE for child sexual abuse material (CSAM), child exploitation, grooming, sexual content involving minors, or participation by minors on the Platform.

Accounts that violate this policy are closed immediately and permanently. There is no amnesty. Where required, we report to authorities.

To continue, you must confirm that you are 18 or older. If you indicate that you are under 18, your account will be closed and you will be returned to the login lobby.

This confirmation is requested only once per account.`,
    btnBuyugum: 'I am 18 or older',
    btnDegilim: 'I am under 18',
    onayUyari:
      'If you confirm you are under 18, your account will be closed and you will be sent to the login lobby. This cannot be undone.',
    btnOnayKapat: 'I confirm — close my account',
    btnVazgec: 'Go back',
  },
  es: {
    baslik: 'Protección infantil',
    govde: `Tamuso es solo para personas de 18 años o más.

La seguridad de los menores (menores de 18) es nuestra máxima prioridad. Tenemos CERO TOLERANCIA al material de abuso sexual infantil (CSAM), explotación infantil, grooming, contenido sexual con menores o participación de menores en la Plataforma.

Las cuentas que violen esta política se cierran de inmediato y de forma permanente. No hay amnistía. Cuando corresponda, informamos a las autoridades.

Para continuar debes confirmar que tienes 18 años o más. Si indicas que eres menor de 18, tu cuenta se cerrará y volverás al lobby de inicio de sesión.

Esta confirmación se solicita solo una vez por cuenta.`,
    btnBuyugum: 'Tengo 18 años o más',
    btnDegilim: 'Soy menor de 18',
    onayUyari:
      'Si confirmas que eres menor de 18, tu cuenta se cerrará y irás al lobby. Esto no se puede deshacer.',
    btnOnayKapat: 'Confirmo — cerrar mi cuenta',
    btnVazgec: 'Volver',
  },
  ar: {
    baslik: 'حماية الأطفال',
    govde: `Tamuso مخصّصة فقط لمن أتمّوا 18 عامًا فأكثر.

سلامة الأطفال (دون 18) أولويتنا القصوى. نطبّق سياسة عدم تسامح مطلق مع مواد الاعتداء الجنسي على الأطفال (CSAM)، واستغلال الأطفال، والاستدراج، والمحتوى الجنسي المتعلق بالقُصّر، أو مشاركة القُصّر في المنصة.

تُغلق الحسابات المخالفة فورًا وبشكل دائم. لا عفو. وعند الاقتضاء نبلّغ السلطات المختصة.

للمتابعة يجب أن تؤكد أنك تبلغ 18 عامًا أو أكثر. إذا بيّنت أنك دون 18، يُغلق حسابك وتُعاد إلى واجهة تسجيل الدخول.

يُطلب هذا التأكيد مرة واحدة فقط لكل حساب.`,
    btnBuyugum: 'عمري 18 أو أكثر',
    btnDegilim: 'عمري أقل من 18',
    onayUyari:
      'إذا أكّدت أنك دون 18، سيُغلق حسابك وتُوجَّه إلى واجهة الدخول. لا يمكن التراجع.',
    btnOnayKapat: 'أؤكّد — أغلق حسابي',
    btnVazgec: 'رجوع',
  },
};

const KISILER_EXTRA = {
  tr: { sn: '{{n}} sn', dkSn: '{{dk}} dk {{sn}} sn' },
  en: { sn: '{{n}} s', dkSn: '{{dk}} m {{sn}} s' },
  es: { sn: '{{n}} s', dkSn: '{{dk}} min {{sn}} s' },
  ar: { sn: '{{n}} ث', dkSn: '{{dk}} د {{sn}} ث' },
};

function esc(s) {
  return String(s)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

function mergeIntoSection(src, sectionName, additions) {
  const marker = `  ${sectionName}: {`;
  const start = src.indexOf(marker);
  if (start < 0) throw new Error(`section ${sectionName} not found`);
  let i = start + marker.length - 1;
  let depth = 0;
  let inStr = null;
  let escape = false;
  let end = -1;
  for (; i < src.length; i++) {
    const c = src[i];
    if (inStr) {
      if (escape) {
        escape = false;
        continue;
      }
      if (c === '\\') {
        escape = true;
        continue;
      }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      inStr = c;
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end < 0) throw new Error(`unclosed ${sectionName}`);
  const body = src.slice(start + marker.length, end);
  const lines = [];
  for (const [k, v] of Object.entries(additions)) {
    const re = new RegExp(`\\b${k}:\\s*'`);
    if (re.test(body)) {
      // replace existing value
      const valRe = new RegExp(`(\\b${k}:\\s*)'((?:\\\\'|[^'])*)'`);
      // handled below via full rebuild of keys only for missing
      continue;
    }
    lines.push(`    ${k}: '${esc(v)}',`);
  }
  // Also update existing keys that are in additions
  let newBody = body;
  for (const [k, v] of Object.entries(additions)) {
    const valRe = new RegExp(`(\\b${k}:\\s*)'((?:\\\\'|[^'])*)'`);
    if (valRe.test(newBody)) {
      newBody = newBody.replace(valRe, `$1'${esc(v)}'`);
    }
  }
  const missing = Object.entries(additions).filter(
    ([k]) => !new RegExp(`\\b${k}:\\s*'`).test(body),
  );
  if (missing.length) {
    const insert = missing.map(([k, v]) => `    ${k}: '${esc(v)}',`).join('\n');
    // insert before closing of section (trim trailing whitespace of body)
    const trimmed = newBody.replace(/\s*$/, '');
    const needsComma = /,\s*$/.test(trimmed) || /}\s*$/.test(trimmed) ? '' : ',';
    // body ends with last property line; ensure comma then new lines
    let prefix = trimmed;
    if (!prefix.endsWith(',')) prefix += ',';
    newBody = `${prefix}\n${insert}\n`;
  }
  return src.slice(0, start + marker.length) + newBody + src.slice(end);
}

function injectNewNamespace(src, name, obj, beforeMarker = '\n  genel:') {
  // remove old if present
  const re = new RegExp(`\\n  ${name}: \\{[\\s\\S]*?\\n  \\},?`);
  src = src.replace(re, '\n');
  const entries = Object.entries(obj);
  const lines = entries.map(([k, v], i) => {
    const comma = i < entries.length - 1 ? ',' : '';
    return `    ${k}: '${esc(v)}'${comma}`;
  });
  const block = `\n  ${name}: {\n${lines.join('\n')}\n  },`;
  if (!src.includes(beforeMarker)) {
    throw new Error(`marker ${beforeMarker} missing`);
  }
  return src.replace(beforeMarker, `${block}${beforeMarker}`);
}

function mergeFlatIntoNamespace(src, name, additions) {
  if (!src.includes(`  ${name}: {`)) {
    return injectNewNamespace(src, name, additions);
  }
  return mergeIntoSection(src, name, additions);
}

for (const lang of ['tr', 'en', 'es']) {
  const path = `src/i18n/locales/${lang}.ts`;
  let src = fs.readFileSync(path, 'utf8');
  src = mergeIntoSection(src, 'sesOda', SES_ODA[lang]);
  src = mergeFlatIntoNamespace(src, 'oyun', {
    ...{
      tr: { baslik: 'Oyunlar', kaskad: 'Kaskad', zeus: 'Zeus', nox: 'Nox' },
      en: { baslik: 'Games', kaskad: 'Cascade', zeus: 'Zeus', nox: 'Nox' },
      es: { baslik: 'Juegos', kaskad: 'Cascade', zeus: 'Zeus', nox: 'Nox' },
    }[lang],
    ...OYUN_EXTRA[lang],
  });
  src = injectNewNamespace(src, 'cocukKoruma', COCUK[lang]);
  src = mergeIntoSection(src, 'kisilerX', KISILER_EXTRA[lang]);
  fs.writeFileSync(path, src, 'utf8');
  console.log('patched', path);
}

// ar_parts
const sesOdaAr = {
  ...JSON.parse(fs.readFileSync('scripts/ar_parts/sesOda.json', 'utf8')),
  ...SES_ODA_EXISTING_AR,
  ...SES_ODA.ar,
};
fs.writeFileSync(
  'scripts/ar_parts/sesOda.json',
  JSON.stringify(sesOdaAr, null, 2) + '\n',
  'utf8',
);

const small = JSON.parse(
  fs.readFileSync('scripts/ar_parts/_small_sections.json', 'utf8'),
);
small.oyun = {
  baslik: 'الألعاب',
  kaskad: 'Cascade',
  zeus: 'Zeus',
  nox: 'Nox',
  ...OYUN_EXTRA.ar,
};
fs.writeFileSync(
  'scripts/ar_parts/_small_sections.json',
  JSON.stringify(small, null, 2) + '\n',
  'utf8',
);

fs.writeFileSync(
  'scripts/ar_parts/cocukKoruma.json',
  JSON.stringify(COCUK.ar, null, 2) + '\n',
  'utf8',
);

const kisilerX = JSON.parse(
  fs.readFileSync('scripts/ar_parts/kisilerX.json', 'utf8'),
);
Object.assign(kisilerX, KISILER_EXTRA.ar);
fs.writeFileSync(
  'scripts/ar_parts/kisilerX.json',
  JSON.stringify(kisilerX, null, 2) + '\n',
  'utf8',
);

console.log('ar_parts updated — run build_ar_locale.mjs next');
