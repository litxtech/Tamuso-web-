import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import {
  findNodeHandle,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  UIManager,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
  type ScrollViewProps,
  type StyleProp,
  type TextInputFocusEventData,
  type ViewStyle,
} from 'react-native';
import { useKlavyeYuksekligi } from './useKlavyeYuksekligi';
import { KlavyeUstY } from './KlavyeKonum';

type Props = ScrollViewProps & {
  ekstraPad?: number;
};

export type KlavyeScrollHandle = {
  scrollTo: ScrollView['scrollTo'];
  scrollToEnd: ScrollView['scrollToEnd'];
  getScrollY: () => number;
  getNode: () => ScrollView | null;
};

type Olculebilir = {
  measureInWindow: (
    callback: (x: number, y: number, width: number, height: number) => void,
  ) => void;
};

type KaydirOpts = {
  animated?: boolean;
  delayMs?: number;
  /** Klavyenin üstünde bırakılacak boşluk */
  ustBosluk?: number;
  alan?: Olculebilir | null;
  /** keyboardWill/DidShow dinle (tekrar kaydırmada false) */
  klavyeDinle?: boolean;
};

type ScrollLike = ScrollView | KlavyeScrollHandle | null | undefined;

/** Son odak — pad/klavye oturunca yeniden kaydır */
let sonOdak: {
  scroll: ScrollLike;
  alan: Olculebilir | null;
  opts?: Omit<KaydirOpts, 'alan'>;
} | null = null;

function sonOdagiKaydet(
  scroll: ScrollLike,
  alan: Olculebilir | null,
  opts?: Omit<KaydirOpts, 'alan'>,
) {
  sonOdak = { scroll, alan, opts };
}

/** Pad / klavye yüksekliği değişince çağır */
export function KlavyeSonOdagiTekrarKaydir() {
  if (!sonOdak?.scroll) return;
  KlavyeAlanaKaydir(sonOdak.scroll, {
    ...sonOdak.opts,
    alan: sonOdak.alan,
    delayMs: 0,
    animated: true,
    klavyeDinle: false,
  });
}

/**
 * Form ScrollView — klavye input’u örtmesin.
 * Her iki platformda da ölçülen klavye kadar alt boşluk + odak kaydırma.
 */
export const KlavyeScrollView = forwardRef<KlavyeScrollHandle, Props>(
  function KlavyeScrollView(
    { contentContainerStyle, ekstraPad = 40, style, onScroll, ...rest },
    ref,
  ) {
    const { yukseklik, acik } = useKlavyeYuksekligi(0);
    const icRef = useRef<ScrollView>(null);
    const scrollY = useRef(0);

    useImperativeHandle(ref, () => ({
      scrollTo: (opts) => icRef.current?.scrollTo(opts),
      scrollToEnd: (opts) => icRef.current?.scrollToEnd(opts),
      getScrollY: () => scrollY.current,
      getNode: () => icRef.current,
    }));

    const icerikStil = useMemo(() => {
      const flat = StyleSheet.flatten(contentContainerStyle) as
        | ViewStyle
        | undefined;
      const taban =
        typeof flat?.paddingBottom === 'number' ? flat.paddingBottom : 0;
      // Klavye açıkken alt pad şart — son input’ların (banka/IBAN) kayacak yeri olsun
      const ekstra = acik
        ? Math.max(ekstraPad, yukseklik > 0 ? yukseklik + 24 : ekstraPad + 160)
        : 0;
      return [
        contentContainerStyle,
        ekstra > 0 ? { paddingBottom: taban + ekstra } : null,
      ] as StyleProp<ViewStyle>;
    }, [acik, contentContainerStyle, ekstraPad, yukseklik]);

    // Pad oturunca / klavye yüksekliği gelince odaklı alanı tekrar hizala
    useEffect(() => {
      if (!acik) return;
      const t1 = setTimeout(() => KlavyeSonOdagiTekrarKaydir(), 16);
      const t2 = setTimeout(() => KlavyeSonOdagiTekrarKaydir(), 140);
      const t3 = setTimeout(() => KlavyeSonOdagiTekrarKaydir(), 320);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }, [acik, yukseklik]);

    const scrollIsler = useCallback(
      (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        scrollY.current = e.nativeEvent.contentOffset.y;
        onScroll?.(e);
      },
      [onScroll],
    );

    return (
      <ScrollView
        ref={icRef}
        style={style}
        contentContainerStyle={icerikStil}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets={false}
        scrollEventThrottle={16}
        onScroll={scrollIsler}
        {...rest}
      />
    );
  },
);

function scrollYAl(scroll: ScrollLike): number {
  if (!scroll) return 0;
  if ('getScrollY' in scroll && typeof scroll.getScrollY === 'function') {
    return scroll.getScrollY();
  }
  return 0;
}

function scrollToY(scroll: ScrollLike, y: number, animated: boolean) {
  if (!scroll) return;
  scroll.scrollTo({ y: Math.max(0, y), animated });
}

let showSub: { remove: () => void } | null = null;
let showSubTimer: ReturnType<typeof setTimeout> | null = null;

/** Odaklı input’u klavyenin hemen üstüne getir */
export function KlavyeAlanaKaydir(scroll: ScrollLike, opts?: KaydirOpts) {
  if (!scroll) return;
  const delay = opts?.delayMs ?? (Platform.OS === 'ios' ? 60 : 120);
  const animated = opts?.animated !== false;
  const ustBosluk = opts?.ustBosluk ?? 36;
  const klavyeDinle = opts?.klavyeDinle !== false;
  const { alan: _alan, klavyeDinle: _kd, ...optsKayit } = opts ?? {};
  sonOdagiKaydet(scroll, opts?.alan ?? sonOdak?.alan ?? null, optsKayit);

  const kaydir = () => {
    const alan = opts?.alan ?? sonOdak?.alan;
    const metrics = Keyboard.metrics();
    const etkinUst =
      metrics && metrics.screenY > 0 ? metrics.screenY : KlavyeUstY();

    // Ölçüm yoksa scrollToEnd yapma — tüm sayfa yukarı fırlar
    if (!alan?.measureInWindow) return;
    if (etkinUst <= 0) return;

    alan.measureInWindow((_x, y, _w, h) => {
      const alanAlt = y + h;
      const hedefAlt = etkinUst - ustBosluk;
      const fazla = alanAlt - hedefAlt;
      if (fazla > 4) {
        scrollToY(scroll, scrollYAl(scroll) + fazla, animated);
      }
    });
  };

  setTimeout(kaydir, delay);
  if (delay === 0) {
    kaydir();
  } else {
    setTimeout(kaydir, delay + 160);
    setTimeout(kaydir, delay + 320);
    setTimeout(kaydir, delay + 520);
  }

  if (!klavyeDinle) return;

  // Android’de didShow odak sonrası gelir — tek dinleyici (birikmesin)
  showSub?.remove();
  if (showSubTimer) clearTimeout(showSubTimer);
  const showEvt =
    Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
  showSub = Keyboard.addListener(showEvt, () => {
    kaydir();
    setTimeout(kaydir, 60);
    setTimeout(kaydir, 180);
  });
  showSubTimer = setTimeout(() => {
    showSub?.remove();
    showSub = null;
    showSubTimer = null;
  }, 2000);
}

/** TextInput onFocus → hedefi klavye üstüne kaydır */
export function KlavyeFocusKaydir(
  scroll: ScrollLike,
  e?: NativeSyntheticEvent<TextInputFocusEventData>,
  opts?: Omit<KaydirOpts, 'alan'>,
) {
  const nativeTarget = e?.nativeEvent?.target;
  let hedef: Olculebilir | null =
    (e?.target as unknown as Olculebilir) ?? null;

  if (
    (!hedef || typeof hedef.measureInWindow !== 'function') &&
    typeof nativeTarget === 'number'
  ) {
    hedef = {
      measureInWindow: (cb) => UIManager.measureInWindow(nativeTarget, cb),
    };
  }

  // Fabric: target bazen string/number handle
  if (
    (!hedef || typeof hedef.measureInWindow !== 'function') &&
    nativeTarget != null
  ) {
    const handle =
      typeof nativeTarget === 'number'
        ? nativeTarget
        : findNodeHandle(e?.target as never);
    if (handle != null) {
      hedef = {
        measureInWindow: (cb) => UIManager.measureInWindow(handle, cb),
      };
    }
  }

  sonOdagiKaydet(scroll, hedef, opts);
  KlavyeAlanaKaydir(scroll, { ...opts, alan: hedef });
}

/** Ref ile TextInput — en güvenilir ölçüm */
export function KlavyeRefIleKaydir(
  scroll: ScrollLike,
  inputRef: React.RefObject<Olculebilir | null>,
  opts?: Omit<KaydirOpts, 'alan'>,
) {
  const node = inputRef.current;
  if (node && typeof node.measureInWindow === 'function') {
    sonOdagiKaydet(scroll, node, opts);
    KlavyeAlanaKaydir(scroll, { ...opts, alan: node });
    return;
  }
  const handle = findNodeHandle(node as never);
  if (handle != null) {
    const alan: Olculebilir = {
      measureInWindow: (cb) => UIManager.measureInWindow(handle, cb),
    };
    sonOdagiKaydet(scroll, alan, opts);
    KlavyeAlanaKaydir(scroll, { ...opts, alan });
    return;
  }
  KlavyeAlanaKaydir(scroll, opts);
}
