const urls = [
  "https://www.tamuso.com/robots.txt",
  "https://www.tamuso.com/sitemap.xml",
  "https://www.tamuso.com/login",
  "https://www.tamuso.com/wallet",
  "https://www.tamuso.com/messages",
  "https://www.tamuso.com/room/ornek-oda",
  "https://www.tamuso.com/admin",
  "https://www.tamuso.com/politika/yok-boyle-kod",
  "https://tamuso.com/",
];
for (const url of urls) {
  const res = await fetch(url, { redirect: "manual" });
  const loc = res.headers.get("location");
  const type = res.headers.get("content-type") || "";
  let extra = "";
  if (url.endsWith("robots.txt") || url.endsWith("sitemap.xml")) {
    extra = " " + (await res.text()).slice(0, 280).replace(/\s+/g, " ");
  }
  if (url.includes("/politika/privacy") || url.endsWith("/login")) {
    const t = await res.text();
    extra = " jsonld=" + (t.match(/application\/ld\+json/g) || []).length + " statik=" + t.includes("tamuso-statik");
  }
  console.log(res.status, type.split(";")[0], loc || "-", url, extra);
}
const home = await (await fetch("https://www.tamuso.com/")).text();
const privacy = await (await fetch("https://www.tamuso.com/politika/privacy")).text();
console.log("home jsonld", (home.match(/application\/ld\+json/g) || []).length, "privacy jsonld", (privacy.match(/application\/ld\+json/g) || []).length);
console.log("privacy h1 in main", /<main id="tamuso-statik">[\s\S]*<h1>Gizlilik Politikası<\/h1>/.test(privacy));
