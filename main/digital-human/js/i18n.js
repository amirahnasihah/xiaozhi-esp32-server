/*
 * English / 中文 switch for the digital-human tester page.
 *
 * Upstream writes every label in Chinese, inline in index.html and the JS. Rather than
 * rewriting those files (and conflicting with every upstream update), this layer translates
 * the page as it runs: text nodes, placeholders and tooltips, and anything the app puts on
 * screen later (status, buttons, toasts), via a MutationObserver. The original Chinese is
 * kept per node, so switching back restores it exactly.
 *
 * Only text people see is in the dictionary. Wake words and text the server sends (e.g. the
 * binding prompt the app matches on) are deliberately not translated.
 *
 * Choice is kept in localStorage ("xz_lang"); English is the default.
 */
(function () {
  const DICT = {
    "小智数字人页面": "XiaoZhi tester",
    "离线": "Offline", "已连接": "Connected", "连接中...": "Connecting...", "正在连接服务器...": "Connecting to the server...",
    "模型加载中✨": "Loading model ✨", "输入消息，按Enter发送": "Type a message, press Enter to send",
    "设置": "Settings", "请先连接服务器": "Connect to the server first", "请先绑定验证码": "Bind the code in the console first",
    "打开/关闭摄像头": "Camera on/off", "摄像头": "Camera", "拨号": "Call", "挂断": "Hang up",
    "开始录音": "Start recording", "录音中": "Recording", "录音": "Record", "关闭": "Close",
    "设备配置": "Device", "唤醒词": "Wake word", "MCP工具": "MCP tools", "数字人皮肤": "Avatar",
    "设备MAC:": "Device MAC:", "客户端ID:": "Client ID:", "设备名称:": "Device name:", "Web测试设备": "Web tester",
    "情绪表情:": "Emotion faces:", "启用": "On", "禁用": "Off",
    "OTA服务器地址:": "OTA server address:", "OTA服务器地址，如：": "OTA server address, e.g. ",
    "WebSocket服务器地址:": "WebSocket server address:", "填写OTA地址后，点击拨号按钮自动连接": "Fill in the OTA address, then press Call",
    "视觉分析地址:": "Vision analysis address:", "成功建立ws连接后自动获取": "Filled in after connecting",
    "启用本地唤醒词:": "Local wake word:", "唤醒词服务地址:": "Wake word service address:",
    "唤醒词配置 (一行一个):": "Wake words (one per line):", "例如：": "For example:", "应用唤醒词": "Apply wake words",
    "MCP 工具管理": "MCP tools", "添加新工具": "Add tool", "添加工具": "Add tool", "编辑工具": "Edit tool",
    "工具名称": "Tool name", "工具描述": "Tool description", "详细描述工具的功能和使用场景...": "Describe what the tool does and when to use it...",
    "输入参数": "Parameters", "添加参数": "Add parameter", "编辑参数": "Edit parameter",
    "暂无参数，点击上方按钮添加参数": "No parameters yet. Add one with the button above.",
    "模拟返回结果 (JSON 格式，可选)": "Mock result (JSON, optional)", "- 留空则返回默认成功消息": "- leave empty for a default success message",
    "取消": "Cancel", "保存": "Save", "参数名称": "Parameter name", "参数描述": "Parameter description", "必填参数": "Required",
    "数据类型": "Type", "字符串": "String", "整数": "Integer", "数字": "Number", "布尔值": "Boolean", "数组": "Array", "对象": "Object",
    "最小值": "Min", "最大值": "Max", "可选": "optional", "例如: ": "e.g. ",
    "选择模型:": "Model:", "hiyori (春日)": "hiyori", "natori (名取)": "natori", "切换背景": "Change background",
    "● 已加载": "● Loaded", "● 加载失败": "● Failed to load", "已切换到模型: ": "Switched to model: ",
    "模型切换失败": "Model switch failed", "模型切换出错": "Model switch error", "Live2D管理器未初始化": "Live2D manager not ready",
    "⚠️ 摄像头启动失败，请检查浏览器权限": "⚠️ Camera failed to start. Check the browser permission",
    "⚠️ 摄像头启动失败，可能被浏览器拒绝": "⚠️ Camera failed to start; the browser may have blocked it",
    "⚠️ 当前由于是http访问，无法录音，只能用文字交互": "⚠️ No microphone over http. Use text instead",
    "⚠️ 麦克风不可用，请检查权限设置，只能用文字交互": "⚠️ Microphone unavailable. Check the permission, or use text",
    "连接成功，开始聊天吧~😊": "Connected. Say hi! 😊", "请输入OTA服务器地址": "Enter the OTA server address",
    "启用唤醒词时，至少需要填写一个唤醒词。": "Add at least one wake word to turn it on.", "应用中...": "Applying...",
    "地址已变更，是否继续？（将断开旧连接并重新连接）": "The address changed. Continue? (This disconnects and reconnects.)",
    "已取消地址变更。": "Address change cancelled.",
    "唤醒词配置已保存，唤醒词服务正在重启。": "Wake words saved; the wake word service is restarting.",
    "唤醒词已保存。是否现在重启唤醒词服务以立即生效？": "Wake words saved. Restart the wake word service now so they take effect?",
    "唤醒词配置已保存，可稍后手动重启服务后生效。": "Wake words saved; they take effect after the service restarts.",
    "应用唤醒词失败: ": "Applying wake words failed: ", "检测到唤醒词“": "Wake word “", "”，准备连接服务器...": "” heard, connecting...",
    " 个工具": " tools", "个工具": " tools", "参数名称已存在，请使用不同的名称": "That parameter name already exists",
    "WebSocket 已连接，无法编辑工具": "Disconnect first to edit tools", "确定要删除工具": "Delete tool",
    "编辑": "Edit", "删除": "Delete",
  };
  const KEYS = Object.keys(DICT).sort((a, b) => b.length - a.length);
  const ATTRS = ["placeholder", "title", "aria-label"];
  const STORE = "xz_lang";

  let lang = "en";
  try { lang = localStorage.getItem(STORE) || "en"; } catch (e) {}

  // Short words (1-2 characters, e.g. 设置 "settings", 编辑 "edit") only count when they are
  // the whole label, so they don't get swapped inside a sentence ("音量已设置" stays intact).
  const isShort = (k) => [...k.replace(/[^一-鿿]/g, "")].length <= 2;
  const translate = (s) => {
    if (!s || !/[一-鿿]/.test(s)) return s;
    const cjk = s.replace(/[^一-鿿]/g, "");
    let out = s;
    for (const k of KEYS) {
      if (!out.includes(k)) continue;
      if (isShort(k) && cjk !== k.replace(/[^一-鿿]/g, "")) continue;
      out = out.split(k).join(DICT[k]);
    }
    return out;
  };

  // Originals, so 中文 restores exactly what upstream wrote. MutationObserver reports
  // changes asynchronously, so a "we are writing" flag can't tell our own writes apart;
  // instead remember the last value we wrote to each node and ignore records that match it.
  const origText = new WeakMap();
  const origAttr = new WeakMap();
  const wroteText = new WeakMap();
  const wroteAttr = new WeakMap();

  function applyText(node) {
    if (!origText.has(node)) origText.set(node, node.data);
    const want = lang === "en" ? translate(origText.get(node)) : origText.get(node);
    if (node.data !== want) { wroteText.set(node, want); node.data = want; }
  }
  function applyAttrs(el) {
    let saved = origAttr.get(el);
    for (const a of ATTRS) {
      if (!el.hasAttribute || !el.hasAttribute(a)) continue;
      if (!saved) { saved = {}; origAttr.set(el, saved); }
      if (!(a in saved)) saved[a] = el.getAttribute(a);
      const want = lang === "en" ? translate(saved[a]) : saved[a];
      if (el.getAttribute(a) !== want) {
        const w = wroteAttr.get(el) || {}; w[a] = want; wroteAttr.set(el, w);
        el.setAttribute(a, want);
      }
    }
  }
  function walk(root) {
    if (root.nodeType === 3) return applyText(root);
    if (root.nodeType !== 1 || root.tagName === "SCRIPT" || root.tagName === "STYLE") return;
    applyAttrs(root);
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
      acceptNode: (n) => (n.nodeType === 1 && (n.tagName === "SCRIPT" || n.tagName === "STYLE") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    });
    for (let n = tw.nextNode(); n; n = tw.nextNode()) (n.nodeType === 3 ? applyText(n) : applyAttrs(n));
  }

  const observer = new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === "characterData") {
        if (r.target.data === wroteText.get(r.target)) continue; // our own write
        origText.set(r.target, r.target.data); applyText(r.target);
      } else if (r.type === "attributes") {
        const val = r.target.getAttribute(r.attributeName);
        if (val === (wroteAttr.get(r.target) || {})[r.attributeName]) continue; // our own write
        const saved = origAttr.get(r.target) || {};
        saved[r.attributeName] = val; origAttr.set(r.target, saved);
        applyAttrs(r.target);
      } else r.addedNodes.forEach(walk);
    }
  });

  // Native popups the app opens with Chinese text.
  const _alert = window.alert.bind(window), _confirm = window.confirm.bind(window);
  window.alert = (m) => _alert(lang === "en" ? translate(String(m)) : m);
  window.confirm = (m) => _confirm(lang === "en" ? translate(String(m)) : m);

  function button() {
    const b = document.createElement("button");
    b.id = "xz-lang-switch";
    b.type = "button";
    b.setAttribute("aria-label", "Language / 语言");
    b.style.cssText = "position:fixed;top:12px;right:12px;z-index:100000;padding:6px 12px;border-radius:999px;border:1px solid rgba(255,255,255,.35);background:rgba(20,20,28,.6);color:#fff;font:600 12px/1 system-ui,sans-serif;cursor:pointer;backdrop-filter:blur(6px)";
    const paint = () => { b.textContent = lang === "en" ? "EN · 中文" : "中文 · EN"; };
    paint();
    b.addEventListener("click", () => {
      lang = lang === "en" ? "zh" : "en";
      try { localStorage.setItem(STORE, lang); } catch (e) {}
      document.documentElement.lang = lang === "en" ? "en" : "zh-CN";
      walk(document.body); document.title = lang === "en" ? translate(titleZh) : titleZh;
      paint();
    });
    return b;
  }

  let titleZh = document.title;
  function start() {
    titleZh = document.title;
    if (lang === "en") { document.documentElement.lang = "en"; document.title = translate(titleZh); }
    walk(document.body);
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    document.body.appendChild(button());
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
  window.xzI18n = { translate, get lang() { return lang; } };
})();
