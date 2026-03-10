/* eslint-disable no-alert */
(() => {
  const DB_NAME = "linkhub-db";
  const DB_VERSION = 1;
  const STORE = "links";
  const AUTH_KEY = "linkhub_auth_v1";
  const LOGIN_URL = "./index.html";

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const els = {
    appMain: $("#appMain"),
    logoutBtn: $("#logoutBtn"),
    grid: $("#grid"),
    empty: $("#emptyState"),
    addBtn: $("#addBtn"),
    emptyAddBtn: $("#emptyAddBtn"),
    exportBtn: $("#exportBtn"),
    importFile: $("#importFile"),
    clearAllBtn: $("#clearAllBtn"),
    searchInput: $("#searchInput"),
    sortSelect: $("#sortSelect"),
    dialog: $("#linkDialog"),
    form: $("#linkForm"),
    closeDialogBtn: $("#closeDialogBtn"),
    cancelBtn: $("#cancelBtn"),
    deleteBtn: $("#deleteBtn"),
    dialogTitle: $("#dialogTitle"),
    idInput: $("#idInput"),
    titleInput: $("#titleInput"),
    urlInput: $("#urlInput"),
    descInput: $("#descInput"),
    urlHint: $("#urlHint"),
    toast: $("#toast"),
  };

  /** @type {Array<{id:string,title:string,url:string,description:string,createdAt:number,updatedAt:number}>} */
  let allLinks = [];
  let state = {
    q: "",
    sort: "updatedAt_desc",
  };

  function toast(msg) {
    els.toast.hidden = false;
    els.toast.textContent = msg;
    window.clearTimeout(toast._t);
    toast._t = window.setTimeout(() => {
      els.toast.hidden = true;
    }, 2200);
  }

  function isAuthed() {
    return localStorage.getItem(AUTH_KEY) === "1";
  }

  function setAuthed(val) {
    if (val) localStorage.setItem(AUTH_KEY, "1");
    else localStorage.removeItem(AUTH_KEY);
  }

  function goLogin() {
    window.location.replace(LOGIN_URL);
  }

  function safeUrl(input) {
    try {
      const u = new URL(input);
      if (u.protocol !== "http:" && u.protocol !== "https:") return null;
      return u.toString();
    } catch {
      return null;
    }
  }

  function domainFromUrl(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  }

  function timeAgo(ts) {
    const sec = Math.floor((Date.now() - ts) / 1000);
    const min = Math.floor(sec / 60);
    const hr = Math.floor(min / 60);
    const day = Math.floor(hr / 24);
    if (sec < 30) return "baru saja";
    if (min < 60) return `${min} menit lalu`;
    if (hr < 24) return `${hr} jam lalu`;
    if (day < 14) return `${day} hari lalu`;
    return new Date(ts).toLocaleDateString("id-ID", { year: "numeric", month: "short", day: "2-digit" });
  }

  function uuid() {
    if (crypto?.randomUUID) return crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function openDb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: "id" });
          store.createIndex("updatedAt", "updatedAt", { unique: false });
          store.createIndex("createdAt", "createdAt", { unique: false });
          store.createIndex("title", "title", { unique: false });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function tx(storeName, mode, fn) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const t = db.transaction(storeName, mode);
      const store = t.objectStore(storeName);
      const result = fn(store, t);
      t.oncomplete = () => resolve(result);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    }).finally(() => db.close());
  }

  async function dbGetAll() {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const t = db.transaction(STORE, "readonly");
      const store = t.objectStore(STORE);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
      t.oncomplete = () => db.close();
    });
  }

  async function dbPut(link) {
    await tx(STORE, "readwrite", (store) => store.put(link));
  }

  async function dbDelete(id) {
    await tx(STORE, "readwrite", (store) => store.delete(id));
  }

  async function dbClear() {
    await tx(STORE, "readwrite", (store) => store.clear());
  }

  function normalizeText(s) {
    return (s || "").toString().trim().toLowerCase();
  }

  function applyFilters(list) {
    const q = normalizeText(state.q);
    let out = list.slice();
    if (q) {
      out = out.filter((l) => {
        const hay = `${l.title} ${l.description} ${domainFromUrl(l.url)} ${l.url}`.toLowerCase();
        return hay.includes(q);
      });
    }

    const sort = state.sort;
    out.sort((a, b) => {
      if (sort === "updatedAt_desc") return b.updatedAt - a.updatedAt;
      if (sort === "createdAt_desc") return b.createdAt - a.createdAt;
      if (sort === "title_asc") return a.title.localeCompare(b.title, "id-ID");
      if (sort === "domain_asc") return domainFromUrl(a.url).localeCompare(domainFromUrl(b.url), "id-ID");
      return 0;
    });
    return out;
  }

  function escapeHtml(s) {
    return (s || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function cardTemplate(link) {
    const domain = domainFromUrl(link.url);
    const favicon = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
    const desc = link.description?.trim() ? escapeHtml(link.description.trim()) : "—";
    return `
      <article class="card" data-id="${escapeHtml(link.id)}">
        <div class="card__icon" aria-hidden="true">
          <img src="${favicon}" alt="" loading="lazy" />
        </div>
        <div class="card__body">
          <div class="card__titleRow">
            <div class="card__title" title="${escapeHtml(link.title)}">${escapeHtml(link.title)}</div>
            <div class="card__domain" title="${escapeHtml(domain)}">${escapeHtml(domain || "link")}</div>
          </div>
          <div class="card__desc">${desc}</div>
          <div class="card__meta">
            <div class="card__time">Update ${timeAgo(link.updatedAt)}</div>
            <div class="card__buttons">
              <button class="miniBtn" data-action="open" type="button">Buka</button>
              <button class="miniBtn" data-action="edit" type="button">Edit</button>
              <button class="miniBtn miniBtn--danger" data-action="delete" type="button">Hapus</button>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  function render() {
    const list = applyFilters(allLinks);
    els.grid.innerHTML = list.map(cardTemplate).join("");
    const isEmpty = list.length === 0;
    els.empty.hidden = !isEmpty;
  }

  async function loadAndRender() {
    allLinks = await dbGetAll();
    render();
  }

  function resetForm() {
    els.form.reset();
    els.idInput.value = "";
    els.urlHint.classList.remove("is-bad");
    els.urlHint.textContent = "Wajib pakai http(s).";
  }

  function openAdd() {
    resetForm();
    els.dialogTitle.textContent = "Tambah link";
    els.deleteBtn.hidden = true;
    els.dialog.showModal();
    els.titleInput.focus();
  }

  function openEdit(id) {
    const link = allLinks.find((l) => l.id === id);
    if (!link) return;
    resetForm();
    els.dialogTitle.textContent = "Edit link";
    els.deleteBtn.hidden = false;
    els.idInput.value = link.id;
    els.titleInput.value = link.title;
    els.urlInput.value = link.url;
    els.descInput.value = link.description || "";
    els.dialog.showModal();
    els.titleInput.focus();
  }

  async function handleSave(e) {
    e.preventDefault();
    const id = els.idInput.value || uuid();
    const title = (els.titleInput.value || "").trim();
    const url = safeUrl((els.urlInput.value || "").trim());
    const description = (els.descInput.value || "").trim();

    if (!url) {
      els.urlHint.classList.add("is-bad");
      els.urlHint.textContent = "URL tidak valid. Contoh: https://domain.com";
      els.urlInput.focus();
      return;
    }

    const now = Date.now();
    const existing = allLinks.find((l) => l.id === id);
    const link = {
      id,
      title,
      url,
      description,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    await dbPut(link);
    const idx = allLinks.findIndex((l) => l.id === id);
    if (idx >= 0) allLinks[idx] = link;
    else allLinks.unshift(link);
    els.dialog.close();
    render();
    toast("Tersimpan.");
  }

  async function confirmDelete(id) {
    const link = allLinks.find((l) => l.id === id);
    if (!link) return;
    const ok = window.confirm(`Hapus link "${link.title}"?`);
    if (!ok) return;
    await dbDelete(id);
    allLinks = allLinks.filter((l) => l.id !== id);
    render();
    toast("Terhapus.");
  }

  async function deleteFromDialog() {
    const id = els.idInput.value;
    if (!id) return;
    await confirmDelete(id);
    els.dialog.close();
  }

  function openLink(id) {
    const link = allLinks.find((l) => l.id === id);
    if (!link) return;
    window.open(link.url, "_blank", "noopener,noreferrer");
  }

  function download(filename, text) {
    const blob = new Blob([text], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 500);
  }

  function exportJson() {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      links: allLinks,
    };
    const stamp = new Date().toISOString().slice(0, 19).replaceAll(":", "-");
    download(`linkhub-export-${stamp}.json`, JSON.stringify(payload, null, 2));
    toast("Export dibuat.");
  }

  async function importJsonFile(file) {
    const text = await file.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      toast("File JSON tidak valid.");
      return;
    }
    const links = Array.isArray(data?.links) ? data.links : Array.isArray(data) ? data : null;
    if (!links) {
      toast("Format import tidak dikenali.");
      return;
    }
    let imported = 0;
    for (const raw of links) {
      const title = (raw?.title || "").toString().trim();
      const url = safeUrl((raw?.url || "").toString().trim());
      if (!title || !url) continue;
      const now = Date.now();
      const link = {
        id: (raw?.id || uuid()).toString(),
        title,
        url,
        description: (raw?.description || "").toString(),
        createdAt: Number(raw?.createdAt) || now,
        updatedAt: Number(raw?.updatedAt) || now,
      };
      await dbPut(link);
      imported += 1;
    }
    allLinks = await dbGetAll();
    render();
    toast(`Import selesai: ${imported} link.`);
  }

  async function clearAll() {
    const ok = window.confirm("Hapus SEMUA link dari IndexedDB?");
    if (!ok) return;
    await dbClear();
    allLinks = [];
    render();
    toast("Semua link dihapus.");
  }

  function wireEvents() {
    els.addBtn.addEventListener("click", openAdd);
    els.emptyAddBtn.addEventListener("click", openAdd);
    els.exportBtn.addEventListener("click", exportJson);
    els.clearAllBtn.addEventListener("click", clearAll);

    els.logoutBtn?.addEventListener("click", () => {
      setAuthed(false);
      toast("Logout.");
      goLogin();
    });

    els.searchInput.addEventListener("input", (e) => {
      state.q = e.target.value || "";
      render();
    });
    els.sortSelect.addEventListener("change", (e) => {
      state.sort = e.target.value;
      render();
    });

    els.form.addEventListener("submit", handleSave);
    els.closeDialogBtn.addEventListener("click", () => els.dialog.close());
    els.cancelBtn.addEventListener("click", () => els.dialog.close());
    els.deleteBtn.addEventListener("click", deleteFromDialog);

    els.urlInput.addEventListener("input", () => {
      const u = safeUrl((els.urlInput.value || "").trim());
      if (!els.urlInput.value.trim()) {
        els.urlHint.classList.remove("is-bad");
        els.urlHint.textContent = "Wajib pakai http(s).";
        return;
      }
      if (!u) {
        els.urlHint.classList.add("is-bad");
        els.urlHint.textContent = "URL belum valid.";
        return;
      }
      els.urlHint.classList.remove("is-bad");
      els.urlHint.textContent = `OK: ${domainFromUrl(u)}`;
    });

    els.grid.addEventListener("click", async (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      const card = e.target.closest(".card");
      const id = card?.dataset?.id;
      if (!id) return;

      const action = btn.dataset.action;
      if (action === "open") openLink(id);
      if (action === "edit") openEdit(id);
      if (action === "delete") await confirmDelete(id);
    });

    els.importFile.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      await importJsonFile(file);
      e.target.value = "";
    });

    window.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        els.searchInput.focus();
      }
    });
  }

  async function init() {
    wireEvents();
    if (!isAuthed()) {
      goLogin();
      return;
    }
    await loadAndRender();
  }

  init().catch((err) => {
    console.error(err);
    toast("Gagal init IndexedDB. Coba reload.");
  });
})();

