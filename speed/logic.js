(function () {
  // Operations come from topics.json key concepts. Negation and conjunction
  // are on today. Disjunction and implication stay off until those words
  // appear in topics.json (or until setEnabled is called).
  var OP_AR = {
    negation: "النفي",
    conjunction: "الوصل",
    disjunction: "الفصل",
    implication: "الاستلزام"
  };
  var enabled = ["negation", "conjunction"];
  var LETTER_KEY = "speedtest.logic.letters";
  var letters = "pqr";
  var lastGiven = null;
  var score = 0;
  var best = window.SpeedBest.read("logic");
  var playing = false;
  var over = false;
  var timer = null;
  var current = null;
  var lastLabel = "";

  function $(id) { return document.getElementById(id); }

  function roundSeconds() {
    var t = Number(new URLSearchParams(location.search).get("t"));
    if (Number.isFinite(t) && t > 0 && t <= 60) return t;
    return 60;
  }

  function rand(n) { return Math.floor(Math.random() * n); }

  function bit() { return Math.random() < 0.5 ? 0 : 1; }

  function word(v) { return v === 1 ? "صحيحة" : "خاطئة"; }

  function opsFromTopics(topics) {
    var blob = JSON.stringify(topics).toLowerCase();
    var on = [];
    if (blob.indexOf("negation") !== -1 || blob.indexOf("نفي") !== -1) on.push("negation");
    if (blob.indexOf("conjunction") !== -1 || blob.indexOf("وصل") !== -1) on.push("conjunction");
    if (blob.indexOf("disjunction") !== -1 || blob.indexOf("الفصل") !== -1) on.push("disjunction");
    if (blob.indexOf("implication") !== -1 || blob.indexOf("استلزام") !== -1) on.push("implication");
    return on.length ? on : null;
  }

  function loadEnabled() {
    var fallback = ["negation", "conjunction"];
    var url;
    try { url = new URL("../../topics.json", document.baseURI).href; } catch (e) { return Promise.resolve(fallback); }
    var req = fetch(url).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
    var timer = new Promise(function (resolve) { setTimeout(function () { resolve(null); }, 1000); });
    return Promise.race([req, timer]).then(function (data) {
      if (!data) return fallback;
      return opsFromTopics(data) || fallback;
    });
  }

  function setEnabled(list) {
    enabled = list.slice();
    document.documentElement.dataset.ops = enabled.join(" ");
    paintOps();
  }

  function paintOps() {
    var names = enabled.map(function (id) { return OP_AR[id] || id; });
    $("ops").textContent = "العمليات في هذا الاختبار: " + names.join("، ") + ".";
  }

  function V(values, name) { return { type: "var", name: name, value: values[name] }; }
  function NOT(a) { return { type: "not", child: a }; }
  function AND(a, b) { return { type: "and", left: a, right: b }; }
  function OR(a, b) { return { type: "or", left: a, right: b }; }
  function IMP(a, b) { return { type: "impl", left: a, right: b }; }

  function valuesFor(names) {
    var values = {};
    names.forEach(function (n) { values[n] = bit(); });
    return values;
  }

  function names() {
    return letters === "abc" ? ["a", "b", "c"] : ["p", "q", "r"];
  }

  function loadLetters() {
    try {
      var saved = localStorage.getItem(LETTER_KEY);
      if (saved === "abc" || saved === "pqr") return saved;
    } catch (e) {}
    return "pqr";
  }

  function paintToggle() {
    var useAbc = letters === "abc";
    $("use-pqr").setAttribute("aria-pressed", useAbc ? "false" : "true");
    $("use-abc").setAttribute("aria-pressed", useAbc ? "true" : "false");
    $("use-pqr").classList.toggle("on", !useAbc);
    $("use-abc").classList.toggle("on", useAbc);
  }

  function remap(node, map) {
    if (node.type === "var") return { type: "var", name: map[node.name] || node.name, value: node.value };
    if (node.type === "not") return { type: "not", child: remap(node.child, map) };
    return { type: node.type, left: remap(node.left, map), right: remap(node.right, map) };
  }

  function collectValues(node, out) {
    out = out || {};
    if (node.type === "var") out[node.name] = node.value;
    else if (node.type === "not") collectValues(node.child, out);
    else {
      collectValues(node.left, out);
      collectValues(node.right, out);
    }
    return out;
  }

  function givensFrom(ast) {
    var values = collectValues(ast);
    return names().filter(function (name) {
      return Object.prototype.hasOwnProperty.call(values, name);
    }).map(function (name) {
      return { name: name, value: values[name] };
    });
  }

  function applyLetters(next) {
    var prev = letters;
    letters = next === "abc" ? "abc" : "pqr";
    try { localStorage.setItem(LETTER_KEY, letters); } catch (e) {}
    paintToggle();
    if (!current || prev === letters) return;
    var map = letters === "abc" ? { p: "a", q: "b", r: "c" } : { a: "p", b: "q", c: "r" };
    var ast = remap(current.ast, map);
    var tree = buildTree(ast);
    current = { ast: ast, tree: tree, givens: givensFrom(ast), value: tree.value, label: tree.label };
    lastLabel = tree.label;
    if (!$("screen-play").hidden) showQuestion(current);
    if (!$("screen-end").hidden && !$("review").hidden) showReview(current, lastGiven);
  }

  function bands() {
    var has = function (id) { return enabled.indexOf(id) !== -1; };
    var P = names()[0], Q = names()[1], R = names()[2];
    var easy = [];
    var mid = [];
    var hard = [];
    if (has("negation")) easy.push({ vars: [P], build: function (v) { return NOT(V(v, P)); } });
    if (has("conjunction")) easy.push({ vars: [P, Q], build: function (v) { return AND(V(v, P), V(v, Q)); } });
    if (has("negation") && has("conjunction")) {
      mid.push({ vars: [P, Q], build: function (v) { return NOT(AND(V(v, P), V(v, Q))); } });
      mid.push({ vars: [P, Q], build: function (v) { return AND(NOT(V(v, P)), V(v, Q)); } });
      mid.push({ vars: [P, Q], build: function (v) { return AND(NOT(V(v, P)), NOT(V(v, Q))); } });
      hard.push({ vars: [P, Q, R], build: function (v) { return AND(AND(V(v, P), V(v, Q)), V(v, R)); } });
      hard.push({ vars: [P, Q], build: function (v) { return NOT(AND(NOT(V(v, P)), V(v, Q))); } });
      hard.push({ vars: [P, Q, R], build: function (v) { return AND(NOT(V(v, P)), AND(V(v, Q), V(v, R))); } });
    }
    if (has("disjunction")) {
      easy.push({ vars: [P, Q], build: function (v) { return OR(V(v, P), V(v, Q)); } });
      if (has("negation")) mid.push({ vars: [P, Q], build: function (v) { return OR(NOT(V(v, P)), V(v, Q)); } });
      if (has("conjunction")) hard.push({ vars: [P, Q, R], build: function (v) { return OR(AND(V(v, P), V(v, Q)), V(v, R)); } });
    }
    if (has("implication")) {
      easy.push({ vars: [P, Q], build: function (v) { return IMP(V(v, P), V(v, Q)); } });
      if (has("negation")) mid.push({ vars: [P, Q], build: function (v) { return IMP(NOT(V(v, P)), V(v, Q)); } });
      if (has("conjunction")) hard.push({ vars: [P, Q, R], build: function (v) { return IMP(AND(V(v, P), V(v, Q)), V(v, R)); } });
    }
    if (!easy.length) easy.push({ vars: [P], build: function (v) { return NOT(V(v, P)); } });
    return [easy, mid.length ? mid : easy, hard.length ? hard : (mid.length ? mid : easy)];
  }

  function poolFor(level) {
    var group = bands();
    var pool = group[level].slice();
    if (level > 0 && Math.random() < 0.25) pool = pool.concat(group[level - 1]);
    return pool;
  }

  function isBinary(node) {
    return node.type === "and" || node.type === "or" || node.type === "impl";
  }

  function buildTree(node) {
    if (node.type === "var") {
      return { label: node.name, value: node.value, type: "var", name: node.name, children: [], reason: "" };
    }
    if (node.type === "not") {
      var child = buildTree(node.child);
      var inner = isBinary(node.child) ? "(" + child.label + ")" : child.label;
      return {
        label: "¬" + inner,
        value: child.value ? 0 : 1,
        type: "not",
        children: [child],
        reason: "النفي يقلب القيمة."
      };
    }
    var left = buildTree(node.left);
    var right = buildTree(node.right);
    var sym = { and: "∧", or: "∨", impl: "→" }[node.type];
    var ls = isBinary(node.left) ? "(" + left.label + ")" : left.label;
    var rs = isBinary(node.right) ? "(" + right.label + ")" : right.label;
    var value;
    var reason;
    if (node.type === "and") {
      value = left.value === 1 && right.value === 1 ? 1 : 0;
      reason = "الوصل يصح فقط إذا كان الطرفان 1.";
    } else if (node.type === "or") {
      value = left.value === 1 || right.value === 1 ? 1 : 0;
      reason = "الفصل يصح إذا كان أحد الطرفين 1.";
    } else {
      value = left.value === 1 && right.value === 0 ? 0 : 1;
      reason = "الاستلزام يخطئ فقط إذا كان الأول 1 والثاني 0.";
    }
    return {
      label: ls + " " + sym + " " + rs,
      value: value,
      type: node.type,
      children: [left, right],
      reason: reason
    };
  }

  function makeQuestion(atScore) {
    var level = atScore < 3 ? 0 : atScore < 7 ? 1 : 2;
    var pool = poolFor(level);
    var shape = pool[rand(pool.length)];
    var values = valuesFor(shape.vars);
    var ast = shape.build(values);
    var tree = buildTree(ast);
    var guard = 0;
    while (tree.label === lastLabel && pool.length > 1 && guard < 6) {
      shape = pool[rand(pool.length)];
      values = valuesFor(shape.vars);
      ast = shape.build(values);
      tree = buildTree(ast);
      guard++;
    }
    lastLabel = tree.label;
    var order = names();
    var givens = order.filter(function (name) { return Object.prototype.hasOwnProperty.call(values, name); }).map(function (name) {
      return { name: name, value: values[name] };
    });
    return { ast: ast, tree: tree, givens: givens, value: tree.value, label: tree.label };
  }

  function stepsOf(tree, out) {
    out = out || [];
    tree.children.forEach(function (child) { stepsOf(child, out); });
    out.push(tree);
    return out;
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function renderTree(node, isRoot, wrongValue) {
    var branch = el("div", "tbranch");
    var box = el("div", "tnode val-" + node.value + (isRoot ? " is-root" : "") + (node.type === "var" ? " is-leaf" : ""));
    box.appendChild(el("span", "texpr", node.label));
    box.appendChild(el("span", "tval", word(node.value) + " (" + node.value + ")"));
    if (isRoot) box.appendChild(el("span", "wrong-mark", "إجابتك: " + word(wrongValue) + " (" + wrongValue + ")"));
    branch.appendChild(box);
    if (node.children.length) {
      var kids = el("div", "tkids");
      node.children.forEach(function (child) { kids.appendChild(renderTree(child, false, wrongValue)); });
      branch.appendChild(kids);
    }
    return branch;
  }

  function showReview(question, given) {
    $("review-expr").textContent = question.label;
    $("verdict-yours").textContent = word(given) + " (" + given + ")";
    $("verdict-yours").className = "bad";
    $("verdict-right").textContent = word(question.value) + " (" + question.value + ")";
    $("verdict-right").className = "good";
    var wrap = $("tree");
    wrap.textContent = "";
    wrap.appendChild(renderTree(question.tree, true, given));
    var list = $("steps");
    list.textContent = "";
    stepsOf(question.tree).forEach(function (step, index, all) {
      var li = document.createElement("li");
      var formula = el("span", "eq", step.label + " = " + step.value);
      li.appendChild(formula);
      var tail = step.reason ? " — " + step.reason : "";
      if (index === all.length - 1) tail += " هذه هي القيمة النهائية.";
      li.appendChild(document.createTextNode(tail));
      list.appendChild(li);
    });
  }

  function paintGivens(givens) {
    var list = $("givens");
    list.textContent = "";
    givens.forEach(function (g) {
      var li = document.createElement("li");
      li.className = "val-" + g.value;
      li.appendChild(el("span", "given-letter eq", g.name));
      li.appendChild(el("span", "given-word", word(g.value) + " (" + g.value + ")"));
      list.appendChild(li);
    });
  }

  function showQuestion(question) {
    current = question;
    paintGivens(question.givens);
    $("expr").textContent = question.label;
  }

  function nextQuestion() {
    var guard = 0;
    var question = makeQuestion(score);
    while (guard < 5 && current && question.label === current.label && question.value === current.value) {
      question = makeQuestion(score);
      guard++;
    }
    showQuestion(question);
  }

  function showBest() {
    var text = best > 0 ? String(best) : "—";
    $("best").textContent = text;
    $("best-live").textContent = text;
  }

  function renderTime(left, duration) {
    $("time").textContent = String(Math.ceil(left));
    $("timefill").style.width = (100 * left / duration) + "%";
  }

  function showScreen(id) {
    ["screen-start", "screen-play", "screen-end"].forEach(function (s) {
      $(s).hidden = s !== id;
    });
  }

  function finish(reason, given) {
    if (over) return;
    over = true;
    playing = false;
    clearInterval(timer);
    var result = window.SpeedBest.write("logic", score);
    best = result.best;
    $("final").textContent = String(score);
    $("end-best").textContent = result.improved
      ? "رقم قياسي جديد: " + result.best
      : (result.best > 0 ? "أفضل نتيجة تبقى " + result.best : "لا توجد أفضل نتيجة بعد.");
    showBest();
    if (reason === "wrong") {
      lastGiven = given;
      $("end-title").textContent = "توقفت الجولة";
      $("review").hidden = false;
      showReview(current, given);
    } else {
      lastGiven = null;
      $("end-title").textContent = "انتهى الوقت";
      $("review").hidden = true;
    }
    showScreen("screen-end");
    $("end-title").focus();
  }

  function answer(given) {
    if (!playing || over || !current) return;
    if (given !== 0 && given !== 1) return;
    if (given === current.value) {
      score++;
      $("score").textContent = String(score);
      $("feedback").textContent = "صح";
      $("feedback").className = "feedback ok";
      nextQuestion();
    } else {
      $("feedback").textContent = "";
      finish("wrong", given);
    }
  }

  function start() {
    score = 0;
    over = false;
    playing = true;
    lastLabel = "";
    current = null;
    $("score").textContent = "0";
    $("feedback").textContent = "";
    $("feedback").className = "feedback";
    var duration = roundSeconds();
    var end = performance.now() + duration * 1000;
    renderTime(duration, duration);
    showScreen("screen-play");
    nextQuestion();
    clearInterval(timer);
    timer = setInterval(function () {
      var left = Math.max(0, (end - performance.now()) / 1000);
      renderTime(left, duration);
      if (left <= 0) finish("time");
    }, 100);
  }

  document.addEventListener("keydown", function (e) {
    if (!playing) return;
    if (e.key === "1" || e.key === "١") answer(1);
    if (e.key === "0" || e.key === "٠") answer(0);
  });

  $("start").addEventListener("click", start);
  $("again").addEventListener("click", start);
  $("use-pqr").addEventListener("click", function () { applyLetters("pqr"); });
  $("use-abc").addEventListener("click", function () { applyLetters("abc"); });
  $("yes").addEventListener("click", function () { answer(1); });
  $("no").addEventListener("click", function () { answer(0); });

  letters = loadLetters();
  paintToggle();
  showBest();
  loadEnabled().then(function (list) {
    if (!playing) setEnabled(list);
    else document.documentElement.dataset.ops = enabled.join(" ");
    $("start").disabled = false;
  });

  window.SpeedLogic = {
    opsFromTopics: opsFromTopics,
    setEnabled: setEnabled,
    makeQuestion: makeQuestion,
    buildTree: buildTree,
    stepsOf: stepsOf,
    get enabled() { return enabled.slice(); },
    get current() { return current; }
  };
})();
