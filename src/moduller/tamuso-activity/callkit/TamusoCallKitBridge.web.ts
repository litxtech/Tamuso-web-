import type { CallUiState } from '../tipler';

/** Webde CallKit yok. Telefon derlemesi TamusoCallKitBridge.ts kullanır. */

export function TamusoCallKitEnabled(): boolean {
  return false;
}

export function TamusoCallKitOnIncoming(
  _fn: (payload: { callId: string; callerName: string; hasVideo: boolean }) => void,
): void {}

export function TamusoCallKitOnAnswer(_fn: (callId: string) => void): void {}

export function TamusoCallKitOnEnd(
  _fn: (callId: string, reason: 'declined' | 'ended' | 'missed' | 'failed') => void,
): void {}

export function TamusoCallKitOnVoipToken(_fn: (token: string) => void): void {}

export function TamusoCallKitBootstrap(): void {}

export async function TamusoCallKitReportIncoming(_input: {
  callId: string;
  callerName: string;
  hasVideo: boolean;
}): Promise<boolean> {
  return false;
}

export async function TamusoCallKitStartOutgoing(_input: {
  callId: string;
  calleeName: string;
  hasVideo: boolean;
}): Promise<boolean> {
  return false;
}

export function TamusoCallKitMarkConnecting(_callId: string): void {}

export function TamusoCallKitMarkConnected(_callId: string): void {}

export function TamusoCallKitEnd(_callId: string): void {}

export function TamusoCallKitMissed(_callId: string): void {}

export function TamusoCallKitFailed(_callId: string): void {}

export function TamusoCallKitEndAll(): void {}

export function TamusoCallKitSetMuted(_callId: string, _muted: boolean): void {}

export function TamusoCallKitGetState(_callId: string): CallUiState {
  return 'IDLE';
}

export function TamusoCallKitActiveId(): string | null {
  return null;
}

export function TamusoCallKitVoipToken(): string | null {
  return null;
}
