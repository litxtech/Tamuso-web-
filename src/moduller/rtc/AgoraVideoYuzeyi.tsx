import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AgoraUzakUidler, AgoraVideoDinle } from './AgoraMotoru';
import { AgoraNativeVarMi } from './AgoraMotoru';

type Props = {
  yerel?: boolean;
  style?: object;
};

/** Agora kareleri. LiveKit VideoView ile karışmaz. */
export function AgoraVideoYuzeyi({ yerel, style }: Props) {
  const [uidler, setUidler] = useState<number[]>(() => AgoraUzakUidler());
  const Surface = React.useMemo(() => {
    if (!AgoraNativeVarMi()) return null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('react-native-agora') as {
        RtcSurfaceView?: React.ComponentType<{
          style?: object;
          canvas: { uid: number };
        }>;
      };
      return mod.RtcSurfaceView ?? null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => AgoraVideoDinle((s) => setUidler(s.uzakUidler)), []);

  if (!Surface) return <View style={style ?? StyleSheet.absoluteFill} />;
  const uid = yerel ? 0 : (uidler[0] ?? 0);
  if (!yerel && uid === 0) return <View style={style ?? StyleSheet.absoluteFill} />;
  return <Surface style={style ?? StyleSheet.absoluteFill} canvas={{ uid }} />;
}
