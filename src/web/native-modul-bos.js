/** Web paketinde native-only modüllerin yerine geçer. Çağrı null döner. */
const bos = function bos() {
  return null;
};
const hedef = new Proxy(bos, {
  get() {
    return hedef;
  },
  apply() {
    return null;
  },
});
module.exports = hedef;
