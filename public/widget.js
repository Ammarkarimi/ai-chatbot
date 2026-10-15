/*!
 * Chatbot embed loader.
 * Usage: <script src="https://YOUR_APP/widget.js" data-bot-id="BOT_ID" defer></script>
 */
(function () {
  var script = document.currentScript;
  if (!script) return;
  var botId = script.getAttribute("data-bot-id");
  if (!botId || window["__chatbot_" + botId]) return;
  window["__chatbot_" + botId] = true;

  var origin = new URL(script.src).origin;

  fetch(origin + "/api/public/bots/" + encodeURIComponent(botId))
    .then(function (r) {
      if (!r.ok) throw new Error("Chatbot not found: " + botId);
      return r.json();
    })
    .then(mount)
    .catch(function (err) {
      console.warn("[chatbot]", err.message);
    });

  function mount(cfg) {
    var color = script.getAttribute("data-color") || cfg.primaryColor || "#4f46e5";
    var side = (script.getAttribute("data-position") || cfg.position) === "left" ? "left" : "right";
    var open = false;

    var root = document.createElement("div");
    root.setAttribute("data-chatbot", botId);
    var shadow = root.attachShadow ? root.attachShadow({ mode: "open" }) : root;

    var style = document.createElement("style");
    style.textContent =
      ":host{all:initial}" +
      ".cb-btn{position:fixed;bottom:20px;" + side + ":20px;width:60px;height:60px;border-radius:50%;border:0;cursor:pointer;" +
      "background:" + color + ";color:#fff;box-shadow:0 8px 24px rgba(0,0,0,.2);z-index:2147483646;display:flex;align-items:center;justify-content:center;transition:transform .2s}" +
      ".cb-btn:hover{transform:scale(1.06)}" +
      ".cb-btn svg{width:28px;height:28px}" +
      ".cb-frame{position:fixed;bottom:92px;" + side + ":20px;width:380px;height:600px;max-height:calc(100vh - 112px);border:0;border-radius:16px;" +
      "box-shadow:0 12px 48px rgba(0,0,0,.25);z-index:2147483647;background:#fff;opacity:0;transform:translateY(12px);pointer-events:none;transition:opacity .2s,transform .2s}" +
      ".cb-frame.open{opacity:1;transform:none;pointer-events:auto}" +
      "@media (max-width:480px){.cb-frame{inset:0;width:100%;height:100%;max-height:none;border-radius:0}.cb-frame.open + .cb-btn{display:none}}";

    var frame = document.createElement("iframe");
    frame.className = "cb-frame";
    frame.title = cfg.name + " chat";
    frame.setAttribute("allow", "clipboard-write");
    frame.loading = "lazy";

    var btn = document.createElement("button");
    btn.className = "cb-btn";
    btn.setAttribute("aria-label", "Open chat with " + cfg.name);
    var chatIcon =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
    var closeIcon =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>';
    btn.innerHTML = chatIcon;

    function toggle(next) {
      open = typeof next === "boolean" ? next : !open;
      // Load the chat app on first open to keep host pages fast.
      if (open && !frame.src) frame.src = origin + "/embed/" + encodeURIComponent(botId);
      frame.classList.toggle("open", open);
      btn.innerHTML = open ? closeIcon : chatIcon;
      btn.setAttribute("aria-expanded", String(open));
    }

    btn.addEventListener("click", function () {
      toggle();
    });
    window.addEventListener("message", function (e) {
      if (e.origin === origin && e.data && e.data.type === "chatbot:close" && e.data.botId === botId) toggle(false);
    });

    shadow.appendChild(style);
    shadow.appendChild(frame);
    shadow.appendChild(btn);
    document.body.appendChild(root);

    // Public API: window.Chatbot.open() / close() / toggle()
    window.Chatbot = { open: function () { toggle(true); }, close: function () { toggle(false); }, toggle: toggle };
    if (script.getAttribute("data-open") === "true") toggle(true);
  }
})();
