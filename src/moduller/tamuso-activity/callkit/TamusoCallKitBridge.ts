/**
 * CallKit + PushKit JS facade — does not replace LiveKit media.
 * CallKit = native call UI lifecycle
 * LiveKit = media
 * Supabase = auth + call state
 */

import { Platform } from 'react-native';
import { OzellikBayragiAktifMi } from '../../ozellik-bayraklari/OzellikBayragiAktifMi';
import {
  callKitAddListener,
  callKitEnd,
  callKitEndAll,
  callKitEndFailed,
  callKitEndMissed,
  callKitGetActiveCallId,
  callKitGetVoipToken,
  callKitIsSupported,
  callKitReportConnected,
  callKitReportConnecting,
  callKitReportIncoming,
  callKitSetMuted,
  callKitStartOutgoing,
  callKitStartPushKit,
  type CallKitEventPayload,
  type VoipEventPayload,
} from '../../../../modules/tamuso-callkit/src';
import type { CallUiState } from './tipler';

const callState = new Map<string, CallUiState>();

type IncomingHandler = (payload: {
  callId: string;
  callerName: string;
  hasVideo: boolean;
}) => void;

type AnswerHandler = (callId: string) => void;
type EndHandler = (callId: string, reason: 'declined' | 'ended' | 'missed' | 'failed') => void;

let incomingHandler: IncomingHandler | null = null;
let answerHandler: AnswerHandler | null = null;
let endHandler: EndHandler | null = null;
let voipTokenHandler: ((token: string) => void) | null = null;
let bootstrapped = false;

export function TamusoCallKitEnabled(): boolean {
  if (Platform.OS !== 'ios') return false;
  if (!OzellikBayragiAktifMi('callkit_enabled')) return false;
  return callKitIsSupported();
}

export function TamusoCallKitOnIncoming(fn: IncomingHandler): void {
  incomingHandler = fn;
}

export function TamusoCallKitOnAnswer(fn: AnswerHandler): void {
  answerHandler = fn;
}

export function TamusoCallKitOnEnd(fn: EndHandler): void {
  endHandler = fn;
}

export function TamusoCallKitOnVoipToken(fn: (token: string) => void): void {
  voipTokenHandler = fn;
}

export function TamusoCallKitBootstrap(): void {
  if (bootstrapped || Platform.OS !== 'ios') return;
  bootstrapped = true;

  if (!OzellikBayragiAktifMi('callkit_enabled')) return;

  callKitStartPushKit();

  callKitAddListener('onCallEvent', (raw) => {
    const e = raw as unknown as CallKitEventPayload;
    const callId = e.callId ?? '';
    if (!callId && e.type !== 'reset' && e.type !== 'audio_activated' && e.type !== 'audio_deactivated') {
      return;
    }

    switch (e.type) {
      case 'incoming':
        callState.set(callId, 'RINGING');
        incomingHandler?.({
          callId,
          callerName: e.callerName ?? 'Tamuso',
          hasVideo: !!e.hasVideo,
        });
        break;
      case 'answered':
        callState.set(callId, 'ACCEPTING');
        answerHandler?.(callId);
        break;
      case 'declined_or_ended': {
        const prev = callState.get(callId);
        if (prev === 'RINGING' || prev === 'ACCEPTING') {
          callState.set(callId, 'DECLINED');
          endHandler?.(callId, 'declined');
        } else {
          callState.set(callId, 'ENDED');
          endHandler?.(callId, 'ended');
        }
        break;
      }
      case 'connected':
        callState.set(callId, 'CONNECTED');
        break;
      case 'connecting':
        callState.set(callId, 'CONNECTING');
        break;
      case 'ended':
        callState.set(callId, 'ENDED');
        endHandler?.(callId, 'ended');
        break;
      case 'failed':
        callState.set(callId, 'FAILED');
        endHandler?.(callId, 'failed');
        break;
      default:
        break;
    }
  });

  callKitAddListener('onVoipEvent', (raw) => {
    const e = raw as unknown as VoipEventPayload;
    if (e.type === 'voip_token' && e.token) {
      voipTokenHandler?.(e.token);
    }
    if (e.type === 'voip_push' && e.callId) {
      callState.set(e.callId, 'RINGING');
      incomingHandler?.({
        callId: e.callId,
        callerName: e.callerName ?? 'Tamuso',
        hasVideo: !!e.hasVideo,
      });
    }
  });

  const existing = callKitGetVoipToken();
  if (existing) voipTokenHandler?.(existing);
}

export async function TamusoCallKitReportIncoming(input: {
  callId: string;
  callerName: string;
  hasVideo: boolean;
}): Promise<boolean> {
  if (!TamusoCallKitEnabled()) return false;
  callState.set(input.callId, 'RINGING');
  return callKitReportIncoming(input.callId, input.callerName, input.hasVideo);
}

export async function TamusoCallKitStartOutgoing(input: {
  callId: string;
  calleeName: string;
  hasVideo: boolean;
}): Promise<boolean> {
  if (!TamusoCallKitEnabled()) return false;
  callState.set(input.callId, 'CONNECTING');
  return callKitStartOutgoing(input.callId, input.calleeName, input.hasVideo);
}

export function TamusoCallKitMarkConnecting(callId: string): void {
  if (!TamusoCallKitEnabled()) return;
  callState.set(callId, 'CONNECTING');
  callKitReportConnecting(callId);
}

/**
 * Only call after LiveKit media is actually connected.
 */
export function TamusoCallKitMarkConnected(callId: string): void {
  if (!TamusoCallKitEnabled()) return;
  callState.set(callId, 'CONNECTED');
  callKitReportConnected(callId);
}

export function TamusoCallKitEnd(callId: string): void {
  callState.set(callId, 'ENDED');
  callKitEnd(callId);
}

export function TamusoCallKitMissed(callId: string): void {
  callState.set(callId, 'MISSED');
  callKitEndMissed(callId);
}

export function TamusoCallKitFailed(callId: string): void {
  callState.set(callId, 'FAILED');
  callKitEndFailed(callId);
}

export function TamusoCallKitEndAll(): void {
  callKitEndAll();
  callState.clear();
}

export function TamusoCallKitSetMuted(callId: string, muted: boolean): void {
  callKitSetMuted(callId, muted);
}

export function TamusoCallKitGetState(callId: string): CallUiState {
  return callState.get(callId) ?? 'IDLE';
}

export function TamusoCallKitActiveId(): string | null {
  return callKitGetActiveCallId();
}

export function TamusoCallKitVoipToken(): string | null {
  return callKitGetVoipToken();
}
