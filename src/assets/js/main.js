/* --------------------------------------------------------------------------
   Two small jobs:
     1. the live bootstyle preview in the ttkbootstrap section
     2. swapping screenshots between their light and dark renderings
   No framework, no build step.
   -------------------------------------------------------------------------- */

(function () {
  "use strict";

  /* ---- 1. bootstyle theme preview ---------------------------------------
     Add a theme here AND in src/_data/themes.yaml to make it appear.        */

  var THEMES = {
    flatly:    { primary: "#2c3e50", success: "#18bc9c", info: "#3498db", warning: "#f39c12", danger: "#e74c3c", fg: "#ffffff" },
    litera:    { primary: "#4582ec", success: "#02b875", info: "#17a2b8", warning: "#f0ad4e", danger: "#d9534f", fg: "#ffffff" },
    journal:   { primary: "#eb6864", success: "#22b24c", info: "#336699", warning: "#f5e625", danger: "#f57a00", fg: "#ffffff" },
    superhero: { primary: "#4c9be8", success: "#5cb85c", info: "#5bc0de", warning: "#f0ad4e", danger: "#d9534f", fg: "#10151c" },
    darkly:    { primary: "#375a7f", success: "#00bc8c", info: "#3498db", warning: "#f39c12", danger: "#e74c3c", fg: "#ffffff" },
    cyborg:    { primary: "#2a9fd6", success: "#77b300", info: "#9933cc", warning: "#ff8800", danger: "#cc0000", fg: "#ffffff" },
    solar:     { primary: "#b58900", success: "#2aa198", info: "#268bd2", warning: "#cb4b16", danger: "#d33682", fg: "#10151c" }
  };

  var chips = document.querySelectorAll(".chip");
  var bar = document.querySelector(".bar-demo > i");
  var buttons = document.querySelectorAll(".themebtn");

  function applyTheme(name) {
    var t = THEMES[name];
    if (!t) return;

    chips.forEach(function (c) {
      c.style.backgroundColor = t[c.dataset.role];
      c.style.color = t.fg;
    });

    if (bar) bar.style.backgroundColor = t.primary;

    buttons.forEach(function (b) {
      var on = b.dataset.themeName === name;
      b.setAttribute("aria-pressed", on ? "true" : "false");
      b.style.backgroundColor = on ? t.primary : "";
      b.style.borderColor = on ? t.primary : "";
      b.style.color = on ? t.fg : "";
    });
  }

  buttons.forEach(function (b) {
    b.addEventListener("click", function () { applyTheme(b.dataset.themeName); });
  });

  if (buttons.length) applyTheme(buttons[0].dataset.themeName);

  /* ---- 2. screenshots follow the page theme -----------------------------
     Three viewer states, not two: an explicit choice stamps data-theme on
     <html>, and the default stamps nothing — so check the attribute first
     and fall back to the media query.                                      */

  var shots = document.querySelectorAll("img.shot[data-dark-src]");
  var mq = window.matchMedia("(prefers-color-scheme: dark)");

  function isDark() {
    var stamped = document.documentElement.getAttribute("data-theme");
    if (stamped === "dark") return true;
    if (stamped === "light") return false;
    return mq.matches;
  }

  function syncShots() {
    var dark = isDark();
    shots.forEach(function (img) {
      var src = dark ? img.dataset.darkSrc : img.dataset.lightSrc;
      var set = dark ? img.dataset.darkSrcset : img.dataset.lightSrcset;
      if (src && img.getAttribute("src") !== src) img.setAttribute("src", src);
      if (set && img.getAttribute("srcset") !== set) img.setAttribute("srcset", set);
    });
  }

  if (mq.addEventListener) mq.addEventListener("change", syncShots);
  else if (mq.addListener) mq.addListener(syncShots);

  new MutationObserver(syncShots).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"]
  });

  syncShots();

  /* ---- 3. a screenshot that will not load leaves a labelled frame -------- */

  document.querySelectorAll("img.shot").forEach(function (img) {
    img.addEventListener("error", function () {
      if (img.dataset.failed) return;
      img.dataset.failed = "1";
      var box = document.createElement("div");
      box.className = "ph";
      box.innerHTML =
        "<b>Screenshot</b><span>" + (img.getAttribute("alt") || "") + "</span>" +
        '<span class="dim">run <code>npm run images</code> to pull this one local</span>';
      img.replaceWith(box);
    });
  });
})();
