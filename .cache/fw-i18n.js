const fs = require('fs');

const blocks = {
  'src/i18n/locales/es.ts': `    fwTitle: "Fruit Wheel",
    fwEyebrow: "8 FRUTAS",
    fwBody: "8 frutas · ruleta en vivo · resultado del servidor",
    fwCherry: "Cereza",
    fwLemon: "Limón",
    fwOrange: "Naranja",
    fwWatermelon: "Sandía",
    fwGrape: "Uva",
    fwStrawberry: "Fresa",
    fwPineapple: "Piña",
    fwKiwi: "Kiwi",
    fwBalance: "Saldo",
    fwThisRound: "Esta ronda",
    fwRemaining: "Restante",
    fwConfirm: "CONFIRMAR SELECCIÓN",
    fwChecking: "Comprobando tu selección…",
    fwLocked: "Selecciones cerradas",
    fwPreparing: "La ruleta se prepara…",
    fwClearFruit: "Quitar",
    fwClearAll: "Quitar todo",
    fwCustom: "Otro",
    fwCustomTitle: "Cantidad de coins",
    fwApply: "Añadir",
    fwHistory: "Historial",
    fwRules: "Reglas",
    fwRecent: "Recientes",
    fwPlayers: "En esta ronda",
    fwNoMatch: "No hubo coincidencia en esta ronda.",
    fwWinTitle: "Resultado ganador",
    fwRoundClosed: "La ronda se cerró.",
    fwInsufficient: "El saldo no alcanza para esta selección.",
    fwLimit: "Fuera del límite de selección.",
    fwClosed: "El juego está cerrado ahora.",
    fwEmptyHistory: "Aún no hay historial.",
    fwStake: "Selección",
    fwPayout: "Resultado",
    fwMatched: "Coincidió",
    fwUnmatched: "Sin coincidencia",
    fwRulesBody: "Fruit Wheel es una ruleta en vivo de 8 frutas. La apertura, el cierre y el resultado siguen el reloj del servidor. Las coins pueden repartirse en una o varias frutas mientras la ronda está abierta y no cambian después del cierre. Los multiplicadores vienen de la configuración del servidor y no cambian dentro de una ronda ya abierta. La fruta ganadora se decide en el servidor al abrir la ronda y no se modifica según cómo se colocaron las coins. El pago se registra solo con la liquidación del servidor. La política del servidor decide qué saldo se usa. Esta pantalla no es una garantía de ganancia."`,
  'src/i18n/locales/pt.ts': `    fwTitle: "Fruit Wheel",
    fwEyebrow: "8 FRUTAS",
    fwBody: "8 frutas · roleta ao vivo · resultado do servidor",
    fwCherry: "Cereja",
    fwLemon: "Limão",
    fwOrange: "Laranja",
    fwWatermelon: "Melancia",
    fwGrape: "Uva",
    fwStrawberry: "Morango",
    fwPineapple: "Abacaxi",
    fwKiwi: "Kiwi",
    fwBalance: "Saldo",
    fwThisRound: "Esta rodada",
    fwRemaining: "Restante",
    fwConfirm: "CONFIRMAR SELEÇÃO",
    fwChecking: "Verificando sua seleção…",
    fwLocked: "Seleções encerradas",
    fwPreparing: "A roleta está preparando…",
    fwClearFruit: "Limpar",
    fwClearAll: "Limpar tudo",
    fwCustom: "Outro",
    fwCustomTitle: "Quantidade de coins",
    fwApply: "Adicionar",
    fwHistory: "Histórico",
    fwRules: "Regras",
    fwRecent: "Recentes",
    fwPlayers: "Nesta rodada",
    fwNoMatch: "Não houve combinação nesta rodada.",
    fwWinTitle: "Resultado vencedor",
    fwRoundClosed: "A rodada fechou.",
    fwInsufficient: "O saldo não cobre esta seleção.",
    fwLimit: "Fora do limite de seleção.",
    fwClosed: "O jogo está fechado agora.",
    fwEmptyHistory: "Ainda não há histórico.",
    fwStake: "Seleção",
    fwPayout: "Resultado",
    fwMatched: "Combinou",
    fwUnmatched: "Sem combinação",
    fwRulesBody: "Fruit Wheel é uma roleta ao vivo com 8 frutas. Abertura, fechamento e resultado seguem o relógio do servidor. Coins podem ser distribuídas em uma ou mais frutas enquanto a rodada está aberta e não mudam depois do fechamento. Os multiplicadores vêm da configuração do servidor e não mudam numa rodada já aberta. A fruta vencedora é definida no servidor ao abrir a rodada e não é alterada conforme a distribuição das coins. O pagamento é registrado somente pela liquidação do servidor. A política do servidor define qual saldo é usado. Esta tela não é garantia de ganho."`,
};

const jsonBlock = {
  'src/i18n/locales/fr.json': {
    fwTitle: 'Fruit Wheel', fwEyebrow: '8 FRUITS', fwBody: '8 fruits · roue en direct · résultat serveur',
    fwCherry: 'Cerise', fwLemon: 'Citron', fwOrange: 'Orange', fwWatermelon: 'Pastèque', fwGrape: 'Raisin', fwStrawberry: 'Fraise', fwPineapple: 'Ananas', fwKiwi: 'Kiwi',
    fwBalance: 'Solde', fwThisRound: 'Cette manche', fwRemaining: 'Reste', fwConfirm: 'CONFIRMER', fwChecking: 'Vérification de la sélection…',
    fwLocked: 'Sélections fermées', fwPreparing: 'La roue se prépare…', fwClearFruit: 'Effacer', fwClearAll: 'Tout effacer', fwCustom: 'Autre', fwCustomTitle: 'Montant', fwApply: 'Ajouter',
    fwHistory: 'Historique', fwRules: 'Règles', fwRecent: 'Récents', fwPlayers: 'Cette manche', fwNoMatch: 'Pas de correspondance pour cette manche.', fwWinTitle: 'Résultat gagnant',
    fwRoundClosed: 'La manche est fermée.', fwInsufficient: 'Le solde ne couvre pas cette sélection.', fwLimit: 'Hors limite.', fwClosed: 'Le jeu est fermé.',
    fwEmptyHistory: 'Pas encore d’historique.', fwStake: 'Sélection', fwPayout: 'Résultat', fwMatched: 'Correspond', fwUnmatched: 'Sans correspondance',
    fwRulesBody: 'Fruit Wheel est une roue en direct à 8 fruits. Ouverture, fermeture et résultat suivent l’horloge du serveur. Les coins peuvent être répartis sur un ou plusieurs fruits tant que la manche est ouverte, puis ne changent plus. Les multiplicateurs viennent de la configuration serveur et ne changent pas pour une manche déjà ouverte. Le fruit gagnant est choisi sur le serveur à l’ouverture et n’est pas modifié selon la répartition des coins. Le paiement est enregistré uniquement par le règlement serveur. La politique serveur décide du solde utilisé. Cet écran n’est pas une garantie de gain.',
  },
  'src/i18n/locales/fil.json': {
    fwTitle: 'Fruit Wheel', fwEyebrow: '8 PRUTAS', fwBody: '8 prutas · live na gulong · resulta ng server',
    fwCherry: 'Cherry', fwLemon: 'Lemon', fwOrange: 'Orange', fwWatermelon: 'Pakwan', fwGrape: 'Ubas', fwStrawberry: 'Strawberry', fwPineapple: 'Pinya', fwKiwi: 'Kiwi',
    fwBalance: 'Balanse', fwThisRound: 'Round na ito', fwRemaining: 'Natitira', fwConfirm: 'KUMPIRMAHIN', fwChecking: 'Sinusuri ang pagpili…',
    fwLocked: 'Sarado na ang pagpili', fwPreparing: 'Inihahanda ang gulong…', fwClearFruit: 'Alisin', fwClearAll: 'Alisin lahat', fwCustom: 'Iba', fwCustomTitle: 'Dami ng coin', fwApply: 'Idagdag',
    fwHistory: 'History', fwRules: 'Patakaran', fwRecent: 'Kamakailan', fwPlayers: 'Sa round na ito', fwNoMatch: 'Walang tugma sa round na ito.', fwWinTitle: 'Panalong resulta',
    fwRoundClosed: 'Sarado na ang round.', fwInsufficient: 'Hindi sapat ang balanse.', fwLimit: 'Labas sa limit.', fwClosed: 'Sarado ang laro ngayon.',
    fwEmptyHistory: 'Wala pang history.', fwStake: 'Pagpili', fwPayout: 'Resulta', fwMatched: 'Tugma', fwUnmatched: 'Walang tugma',
    fwRulesBody: 'Ang Fruit Wheel ay live na gulong na may 8 prutas. Ang bukas, lock, at resulta ay ayon sa orasan ng server. Maaaring hatiin ang coin sa isa o higit pang prutas habang bukas ang round, at hindi na babaguhin pagkasara. Ang multiplier ay galing sa config ng server at hindi nagbabago sa round na nabuksan na. Ang panalong prutas ay pinipili sa server sa pagbukas at hindi binabago ayon sa hati ng coin. Ang payout ay isinusulat lamang ng settlement ng server. Ang server policy ang magpapasya kung aling balanse ang gamit. Hindi ito garantiya ng panalo.',
  },
  'src/i18n/locales/ar.json': {
    fwTitle: 'Fruit Wheel', fwEyebrow: '٨ فواكه', fwBody: '٨ فواكه · عجلة مباشرة · نتيجة الخادم',
    fwCherry: 'كرز', fwLemon: 'ليمون', fwOrange: 'برتقال', fwWatermelon: 'بطيخ', fwGrape: 'عنب', fwStrawberry: 'فراولة', fwPineapple: 'أناناس', fwKiwi: 'كيوي',
    fwBalance: 'الرصيد', fwThisRound: 'هذه الجولة', fwRemaining: 'المتبقي', fwConfirm: 'تأكيد الاختيار', fwChecking: 'يتم التحقق من الاختيار…',
    fwLocked: 'أُغلقت الاختيارات', fwPreparing: 'العجلة تستعد…', fwClearFruit: 'مسح', fwClearAll: 'مسح الكل', fwCustom: 'مخصص', fwCustomTitle: 'كمية العملة', fwApply: 'إضافة',
    fwHistory: 'السجل', fwRules: 'القواعد', fwRecent: 'الأخيرة', fwPlayers: 'في هذه الجولة', fwNoMatch: 'لا تطابق في هذه الجولة.', fwWinTitle: 'النتيجة الرابحة',
    fwRoundClosed: 'أُغلقت الجولة.', fwInsufficient: 'الرصيد لا يكفي لهذا الاختيار.', fwLimit: 'خارج حد الاختيار.', fwClosed: 'اللعبة مغلقة الآن.',
    fwEmptyHistory: 'لا يوجد سجل بعد.', fwStake: 'الاختيار', fwPayout: 'النتيجة', fwMatched: 'تطابق', fwUnmatched: 'بدون تطابق',
    fwRulesBody: 'Fruit Wheel عجلة مباشرة بثماني فواكه. أوقات الفتح والإغلاق والنتيجة تتبع ساعة الخادم. يمكن توزيع العملات على فاكهة أو أكثر ما دامت الجولة مفتوحة، ولا تتغير بعد الإغلاق. المضاعفات من إعداد الخادم ولا تتغير داخل جولة بدأت. الفاكهة الرابحة تُحدد على الخادم عند فتح الجولة ولا تُعدَّل حسب توزيع العملات. يُسجل الدفع فقط حسب تسوية الخادم. سياسة الخادم تحدد أي رصيد يُستخدم. هذه الشاشة ليست ضمانًا للربح.',
  },
};

for (const [file, block] of Object.entries(blocks)) {
  const text = fs.readFileSync(file, 'utf8');
  if (text.includes('fwTitle')) continue;
  const idx = text.indexOf('fairSpinOtoKalan:');
  const end = text.indexOf('\n', idx);
  const next = text.slice(0, end) + ',\n' + block + text.slice(end);
  // the original line already has comma. Don't double.
  fs.writeFileSync(file, text.slice(0, end) + '\n' + block + ',' + text.slice(end));
  console.log('ts', file);
}

for (const [file, obj] of Object.entries(jsonBlock)) {
  const text = fs.readFileSync(file, 'utf8');
  if (text.includes('"fwTitle"')) continue;
  const needle = '"fairSpinOtoKalan"';
  const idx = text.indexOf(needle);
  const lineEnd = text.indexOf('\n', idx);
  const extra = Object.entries(obj).map(([k, v]) => `    "${k}": ${JSON.stringify(v)}`).join(',\n');
  const line = text.slice(idx, lineEnd);
  const needsComma = !line.trim().endsWith(',');
  const inserted = text.slice(0, lineEnd) + (needsComma ? ',' : '') + '\n' + extra + text.slice(lineEnd);
  fs.writeFileSync(file, inserted);
  console.log('json', file);
}
