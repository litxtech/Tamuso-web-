import { NativeModule, requireNativeModule } from 'expo';
import { Platform } from 'react-native';

import type { TamusoCallKitModuleEvents } from './TamusoCallKit.types';

declare class TamusoCallKitNativeModule extends NativeModule<TamusoCallKitModuleEvents> {
  isSupported(): boolean;
  startPushKit(): boolean;
  getVoipToken(): string | null;
  reportIncomingCall(
    callId: string,
    callerName: string,
    hasVideo: boolean,
  ): Promise<{ ok: boolean; callId: string }>;
  startOutgoingCall(
    callId: string,
    calleeName: string,
    hasVideo: boolean,
  ): Promise<{ ok: boolean; callId: string }>;
  reportConnecting(callId: string): void;
  reportConnected(callId: string): void;
  endCall(callId: string): void;
  endCallMissed(callId: string): void;
  endCallFailed(callId: string): void;
  endAllCalls(): void;
  setMuted(callId: string, muted: boolean): void;
  getActiveCallId(): string | null;
}

let native: TamusoCallKitNativeModule | null = null;

function getNative(): TamusoCallKitNativeModule | null {
  if (Platform.OS !== 'ios') return null;
  if (native) return native;
  try {
    native = requireNativeModule<TamusoCallKitNativeModule>('TamusoCallKit');
    return native;
  } catch {
    return null;
  }
}

export function callKitIsSupported(): boolean {
  const mod = getNative();
  if (!mod) return false;
  try {
    return mod.isSupported();
  } catch {
    return false;
  }
}

export function callKitStartPushKit(): boolean {
  const mod = getNative();
  if (!mod) return false;
  try {
    return mod.startPushKit();
  } catch {
    return false;
  }
}

export function callKitGetVoipToken(): string | null {
  const mod = getNative();
  if (!mod) return null;
  try {
    return mod.getVoipToken();
  } catch {
    return null;
  }
}

export async function callKitReportIncoming(
  callId: string,
  callerName: string,
  hasVideo: boolean,
): Promise<boolean> {
  const mod = getNative();
  if (!mod) return false;
  try {
    await mod.reportIncomingCall(callId, callerName, hasVideo);
    return true;
  } catch {
    return false;
  }
}

export async function callKitStartOutgoing(
  callId: string,
  calleeName: string,
  hasVideo: boolean,
): Promise<boolean> {
  const mod = getNative();
  if (!mod) return false;
  try {
    await mod.startOutgoingCall(callId, calleeName, hasVideo);
    return true;
  } catch {
    return false;
  }
}

export function callKitReportConnecting(callId: string): void {
  getNative()?.reportConnecting(callId);
}

export function callKitReportConnected(callId: string): void {
  getNative()?.reportConnected(callId);
}

export function callKitEnd(callId: string): void {
  getNative()?.endCall(callId);
}

export function callKitEndMissed(callId: string): void {
  getNative()?.endCallMissed(callId);
}

export function callKitEndFailed(callId: string): void {
  getNative()?.endCallFailed(callId);
}

export function callKitEndAll(): void {
  getNative()?.endAllCalls();
}

export function callKitSetMuted(callId: string, muted: boolean): void {
  getNative()?.setMuted(callId, muted);
}

export function callKitGetActiveCallId(): string | null {
  return getNative()?.getActiveCallId() ?? null;
}

export function callKitAddListener(
  event: 'onCallEvent' | 'onVoipEvent',
  listener: (payload: Record<string, unknown>) => void,
): { remove: () => void } {
  const mod = getNative();
  if (!mod) return { remove: () => undefined };
  // ExpoModulesCore EventEmitter
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sub = (mod as any).addListener(event, listener);
  return {
    remove: () => {
      try {
        sub?.remove?.();
      } catch {
        /* ignore */
      }
    },
  };
}

export default getNative;
