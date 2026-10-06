/**
 * Webde Live Activity yok. iOS derlemesi TamusoLiveActivity.tsx kullanır.
 * @expo/ui/swift-ui web paketinde açılışta native görünüm ister ve uygulamayı düşürür.
 */

type LiveActivityHandle = {
  start?: (
    props: unknown,
    deepLink?: string,
  ) => { update?: (p: unknown) => void; end?: () => void };
  getInstances?: () => unknown[];
};

const TamusoLiveActivity: LiveActivityHandle = {
  start: () => ({
    update: () => undefined,
    end: () => undefined,
  }),
  getInstances: () => [],
};

export default TamusoLiveActivity;
