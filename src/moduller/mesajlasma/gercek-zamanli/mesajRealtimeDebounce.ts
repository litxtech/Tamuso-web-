/**
 * Realtime olay fırtınasında RPC / liste yenilemeyi birleştirir.
 * Fan-out kesilene kadar istemci tarafı güvenlik ağı.
 */
export function mesajRealtimeDebounce(
  fn: () => void,
  ms = 1200,
): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn();
    }, ms);
  };
}
