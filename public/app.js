const QUALITIES = [
  { k: "maxresdefault", name: "Max resolution" },
  { k: "sddefault", name: "Standard" },
  { k: "hqdefault", name: "High" },
  { k: "mqdefault", name: "Medium" },
  { k: "default", name: "Small" },
];

const $ = (id) => document.getElementById(id);
let videoId = null;

const imgUrl = (k, id = videoId) => `https://i.ytimg.com/vi/${id}/${k}.jpg`;
const currentQuality = () => document.querySelector('input[name="q"]:checked')?.value;

function parseId(input) {
  const s = input.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  try {
    const u = new URL(/^https?:\/\//.test(s) ? s : "https://" + s);
    const host = u.hostname.replace(/^(www|m)\./, "");
    if (host === "youtu.be") return u.pathname.slice(1).split("/")[0].slice(0, 11) || null;
    if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
      const v = u.searchParams.get("v");
      if (v) return v.slice(0, 11);
      const m = u.pathname.match(/\/(?:embed|shorts|live|v)\/([\w-]{11})/);
      if (m) return m[1];
    }
  } catch {}
  return null;
}

// Missing sizes return a 120x90 placeholder, so check real dimensions.
function probe(k, id) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () =>
      resolve(k === "default" || img.naturalWidth > 120 ? { w: img.naturalWidth, h: img.naturalHeight } : null);
    img.onerror = () => resolve(null);
    img.src = imgUrl(k, id);
  });
}

function optionHTML(q, size) {
  const ok = !!size;
  return `
    <div class="relative">
      <input type="radio" name="q" id="q-${q.k}" value="${q.k}" class="peer sr-only" ${ok ? "" : "disabled"}>
      <label for="q-${q.k}" class="block cursor-pointer rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5
        peer-checked:border-blue-600 peer-checked:ring-1 peer-checked:ring-blue-600
        peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-blue-600
        peer-disabled:cursor-not-allowed peer-disabled:line-through peer-disabled:opacity-40
        dark:border-slate-700 dark:bg-slate-950 dark:peer-checked:border-blue-400 dark:peer-checked:ring-blue-400">
        <b class="block">${q.name}</b>
        <span class="text-sm text-slate-600 dark:text-slate-400">${ok ? `${size.w} × ${size.h}` : "Not available for this video"}</span>
      </label>
    </div>`;
}

function showError(msg) {
  $("result").classList.add("hidden");
  $("err").textContent = msg;
}

async function load() {
  $("err").textContent = "";
  const id = parseId($("url").value);
  if (!id) return showError("That doesn't look like a YouTube link. Check it and try again.");

  $("go").disabled = true;
  $("go").textContent = "Checking…";
  const sizes = await Promise.all(QUALITIES.map((q) => probe(q.k, id)));
  $("go").disabled = false;
  $("go").textContent = "Get thumbnail";

  if (!sizes.some(Boolean)) return showError("No thumbnail found. The video may be private or the ID is wrong.");

  videoId = id;
  $("opts").innerHTML = QUALITIES.map((q, i) => optionHTML(q, sizes[i])).join("");
  const firstAvailable = $("opts").querySelector("input:not(:disabled)");
  if (firstAvailable) firstAvailable.checked = true;

  $("vid").textContent = "Video ID: " + id;
  $("result").classList.remove("hidden");
  updatePreview();
}

function updatePreview() {
  const k = currentQuality();
  if (!k) return;
  $("preview").src = imgUrl(k);
  $("dims").textContent = QUALITIES.find((q) => q.k === k).name;
}

async function download() {
  const k = currentQuality();
  if (!k) return;
  const btn = $("dl");
  btn.disabled = true;
  btn.textContent = "Downloading…";
  try {
    const res = await fetch(imgUrl(k));
    if (!res.ok) throw new Error("bad response");
    const href = URL.createObjectURL(await res.blob());
    const a = Object.assign(document.createElement("a"), { href, download: `${videoId}-${k}.jpg` });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  } catch {
    window.open(imgUrl(k), "_blank");
    $("err").textContent = "Direct download was blocked, so the image opened in a new tab. Right-click it to save.";
  }
  btn.disabled = false;
  btn.textContent = "Download";
}

async function copyLink() {
  const k = currentQuality();
  if (!k) return;
  const btn = $("copy");
  try {
    await navigator.clipboard.writeText(imgUrl(k));
    btn.textContent = "Copied";
  } catch {
    btn.textContent = "Copy failed";
  }
  setTimeout(() => (btn.textContent = "Copy image link"), 1500);
}

$("go").addEventListener("click", load);
$("url").addEventListener("keydown", (e) => e.key === "Enter" && load());
$("opts").addEventListener("change", updatePreview);
$("dl").addEventListener("click", download);
$("open").addEventListener("click", () => currentQuality() && window.open(imgUrl(currentQuality()), "_blank"));
$("copy").addEventListener("click", copyLink);
