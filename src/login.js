(() => {
  const AUTH_KEY = "linkhub_auth_v1";
  const AUTH_USER = "admin";
  const AUTH_PASS = "confirm123";
  const DASHBOARD_URL = "./dashboard.html";

  const $ = (sel) => document.querySelector(sel);

  const els = {
    form: $("#loginForm"),
    user: $("#loginUser"),
    pass: $("#loginPass"),
    hint: $("#loginHint"),
  };

  function isAuthed() {
    return localStorage.getItem(AUTH_KEY) === "1";
  }

  function setAuthed(val) {
    if (val) localStorage.setItem(AUTH_KEY, "1");
    else localStorage.removeItem(AUTH_KEY);
  }

  function setHint(msg) {
    if (!els.hint) return;
    els.hint.textContent = msg || "";
  }

  function normalizeText(s) {
    return (s || "").toString().trim().toLowerCase();
  }

  function goDashboard() {
    window.location.replace(DASHBOARD_URL);
  }

  function init() {
    if (isAuthed()) {
      goDashboard();
      return;
    }

    setTimeout(() => els.user?.focus?.(), 0);

    els.form?.addEventListener("submit", (e) => {
      e.preventDefault();
      const u = normalizeText(els.user?.value || "");
      const p = (els.pass?.value || "").trim();

      if (u === AUTH_USER && p === AUTH_PASS) {
        setAuthed(true);
        setHint("");
        els.pass.value = "";
        goDashboard();
        return;
      }

      setAuthed(false);
      setHint("Username / password salah.");
      els.pass?.focus?.();
    });
  }

  init();
})();

