const fs = require("fs");

const filPath = "src/i18n/locales/fil.json";
const cachePath = "src/i18n/locales/_fil_value_cache.json";

function loadJson(p) {
  let s = fs.readFileSync(p, "utf8");
  // strip accidental trailing literal \n from a bad write
  if (s.length >= 2 && s.charCodeAt(s.length - 2) === 92 && s.charCodeAt(s.length - 1) === 110) {
    s = s.slice(0, -2);
  }
  return JSON.parse(s);
}

const fil = loadJson(filPath);
const cache = loadJson(cachePath);

const correctSatinAlOnay =
  "{{baslik}}{{bonus}}\nKabuuan {{toplam}} coins\n{{fiyat}}\nPayment: {{kanal}}";
const enSatinAlOnay =
  "{{baslik}}{{bonus}}\nTotal {{toplam}} coins\n{{fiyat}}\nPayment: {{kanal}}";

fil.cuzdanX.satinAlOnay = correctSatinAlOnay;
cache[enSatinAlOnay] = correctSatinAlOnay;

fs.writeFileSync(filPath, JSON.stringify(fil, null, 2) + "\n", "utf8");
fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2) + "\n", "utf8");

// verify
const fil2 = JSON.parse(fs.readFileSync(filPath, "utf8"));
const cache2 = JSON.parse(fs.readFileSync(cachePath, "utf8"));
console.log("satinAlOnay:", JSON.stringify(fil2.cuzdanX.satinAlOnay));
console.log("cache ok:", cache2[enSatinAlOnay] === correctSatinAlOnay);
console.log("fil ends newline:", fs.readFileSync(filPath, "utf8").endsWith("\n"));
console.log("cache ends newline:", fs.readFileSync(cachePath, "utf8").endsWith("\n"));
