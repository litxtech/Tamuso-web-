import { useCallback, useEffect, useRef, useState } from 'react';
import { loadKaskadAudioSettings } from '../../kaskad/ses/GameAudioManager';
import {
  playStormKingCue,
  setStormKingMusic,
  setStormKingVoiceDuck,
  startStormKingAudio,
  stopStormKingAudio,
  type StormKingCue,
} from '../ses/StormKingSes';

export { stopStormKingAudio };

export function useStormKingAudio(voiceDuck: boolean) {
  const duckRef = useRef(voiceDuck);
  duckRef.current = voiceDuck;
  const [musicOn, setMusicOn] = useState(true);

  useEffect(() => {
    startStormKingAudio(duckRef.current);
    let live = true;
    void loadKaskadAudioSettings().then((settings) => {
      if (live) setMusicOn(settings.music);
    });
    return () => {
      live = false;
      stopStormKingAudio();
    };
  }, []);

  useEffect(() => {
    setStormKingVoiceDuck(voiceDuck);
  }, [voiceDuck]);

  const toggleMusic = useCallback(() => {
    setMusicOn((current) => {
      const next = !current;
      void setStormKingMusic(next);
      return next;
    });
  }, []);

  return {
    play: (cue: StormKingCue) => playStormKingCue(cue),
    stop: stopStormKingAudio,
    musicOn,
    toggleMusic,
  };
}
