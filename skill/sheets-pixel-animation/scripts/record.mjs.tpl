const fs = await import("node:fs/promises");
const [NAME, ID, MENU, SETUP, PLAY] = JSON.parse(process.env.ARGS ?? "null") ?? __ARGS__;
const D = (process.env.OUT_DIR ?? "/tmp/sheets-anim") + "/" + NAME;
await fs.mkdir(D + "/frames", { recursive: true });
const list = await listTaskSpaces();
const SPACE = "sheet anim " + NAME;
const mine = list.find(e => e.name === SPACE);
let task = null;
if (mine) { try { task = await takeOverTaskSpace(mine.id); } catch (e) { task = null; } }
if (!task) task = await taskSpace(mine ? SPACE + " " + Date.now() % 100000 : SPACE);
const p = task.page("p1");
if (!(await p.url()).includes(ID)) { await p.goto(`https://docs.google.com/spreadsheets/u/1/d/${ID}/edit`, { timeout: 60000 }); await p.waitForTimeout(9000); }
const menu = async (item) => { await p.mouse.click(1300, 600); const mid = await p.evaluate((m) => [...document.querySelectorAll("#docs-menubar .menu-button")].find(e => e.innerText.trim() === m)?.id, MENU); await p.click(`loc=css:[id="${mid}"]`, { label: "custom menu" }); await p.waitForTimeout(900); await p.click(`text="${item}"`, { label: "menu item" }); };
const fix = async () => {
  const st = await p.evaluate(() => {
    const show = document.querySelector("#viewModeButton")?.getAttribute("aria-label")?.startsWith("Show the menus");
    const close = [...document.querySelectorAll("[aria-label='Close']")].map(e => e.getBoundingClientRect()).find(r => r.width > 0 && r.x > 1500);
    return { show, close: close ? [close.x + close.width / 2, close.y + close.height / 2] : null };
  });
  if (st.show) { await p.click("loc=css:#viewModeButton", { label: "show menus" }); await p.waitForTimeout(1200); }
  if (st.close && await p.evaluate(() => document.body.innerText.includes("Ask Gemini"))) { await p.mouse.click(st.close[0], st.close[1]); await p.waitForTimeout(1500); }
};
await fix(); await fix();
await menu(SETUP);
await p.waitForTimeout(5000);
const dlg = await p.evaluate(() => [...document.querySelectorAll("[role=dialog]")].filter(d => d.offsetParent).map(d => d.innerText.slice(0, 80)).join("|"));
if (/Authorization required/.test(dlg)) {
  const pop = p.waitForEvent("popup", { timeout: 20000 }).catch(() => null);
  await p.click("loc=role:button[name='OK']", { label: "authorize OK" });
  await pop; await task.handOff(); console.log(JSON.stringify({ NAME, need: "auth" })); process.exit(0);
}
// wait for setup to finish (script running toast disappears)
for (let i = 0; i < 60; i++) { await p.waitForTimeout(2000); const run = await p.evaluate(() => /Running script/i.test(document.body.innerText)); if (!run && i > 2) break; }
await p.waitForTimeout(3000);
await p.screenshot({ path: D + "/setup.png" });
await menu(PLAY);
const t0 = Date.now(); let i = 0; const ts = [];
while (Date.now() - t0 < 68000) {
  const r = await p.cdp("Page.captureScreenshot", { format: "jpeg", quality: 80 });
  await fs.writeFile(D + "/frames/f" + String(i).padStart(4, "0") + ".jpg", Buffer.from(r.data, "base64"));
  ts.push(Date.now() - t0); i++;
}
await fs.writeFile(D + "/frames/ts.json", JSON.stringify(ts));
await p.waitForTimeout(2000);
await p.click("loc=css:#t-name-box", { label: "name box" });
await p.keyboard.insertText("B1"); await p.keyboard.press("Enter");
await p.waitForTimeout(1000);
console.log(JSON.stringify({ NAME, shots: i, B1: await p.evaluate(() => document.querySelector("#t-formula-bar-input")?.innerText) }));
await task.finish({ keep: [] });
