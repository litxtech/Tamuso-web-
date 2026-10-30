const r = await fetch("https://www.tamuso.com/politika/privacy?v=102a0bd", { cache: "no-store" });
console.log("status", r.status, "cache", r.headers.get("x-vercel-cache"), "age", r.headers.get("age"));
const t = await r.text();
console.log("statik", t.includes("tamuso-statik"), "gizlilik", t.includes("GİZLİLİK POLİTİKASI"));
