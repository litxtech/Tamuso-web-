/**
 * No-op web stub — CallKit/PushKit are iOS-only.
 */
export function callKitIsSupported(): boolean {
  return false;
}
export function callKitStartPushKit(): boolean {
  return false;
}
export function callKitGetVoipToken(): string | null {
  return null;
}
export async function callKitReportIncoming(): Promise<boolean> {
  return false;
}
export async function callKitStartOutgoing(): Promise<boolean> {
  return false;
}
export function callKitReportConnecting(): void {}
export function callKitReportConnected(): void {}
export function callKitEnd(): void {}
export function callKitEndMissed(): void {}
export function callKitEndFailed(): void {}
export function callKitEndAll(): void {}
export function callKitSetMuted(): void {}
export function callKitGetActiveCallId(): string | null {
  return null;
}
export function callKitAddListener(): { remove: () => void } {
  return { remove: () => undefined };
}
export default null;
