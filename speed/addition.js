(function () {
  var $ = function (id) { return document.getElementById(id); };
  var best = window.SpeedBest.read("addition");
  var score = 0;
  var playing = false;
  var over = false;
  var a = 0;
  var b = 0;
  var timer = null;
  var lastKey = "";

  function roundSeconds() {
    var t = Number(new URLSearchParams(location.search).get("t"));
    if (Number.isFinite(t) && t > 0 && t <= 60) return t;
    return 60;
  }

  function showBest() {
    var text = best > 0 ? String(best) : "—";
    $("best").textContent = text;
    $("best-live").textContent = text;
  }

  function rand(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  function digits(raw) {
    return String(raw)
      .replace(/[٠-٩]/g, function (d) { return "٠١٢٣٤٥٦٧٨٩".indexOf(d); })
      .replace(/[۰-۹]/g, function (d) { return "۰۱۲۳۴۵۶۷۸۹".indexOf(d); })
      .trim();
  }

  function newProblem() {
    var x;
    var y;
    var key = "";
    var guard = 0;
    do {
      x = rand(0, 9);
      y = rand(0, 9);
      key = x + "+" + y;
      guard++;
    } while (key === lastKey && guard < 6);
    lastKey = key;
    a = x;
    b = y;
    $("problem").textContent = x + " + " + y;
    $("answer").value = "";
    $("answer").focus();
  }

  function renderTime(left, duration) {
    var shown = Math.ceil(left);
    $("time").textContent = String(shown);
    $("timefill").style.width = (100 * left / duration) + "%";
  }

  function showScreen(id) {
    ["screen-start", "screen-play", "screen-end"].forEach(function (s) {
      $(s).hidden = s !== id;
    });
  }

  function finish() {
    if (over) return;
    over = true;
    playing = false;
    clearInterval(timer);
    var result = window.SpeedBest.write("addition", score);
    best = result.best;
    $("final").textContent = String(score);
    $("end-best").textContent = result.improved
      ? "رقم قياسي جديد: " + result.best
      : (result.best > 0 ? "أفضل نتيجة تبقى " + result.best : "لا توجد أفضل نتيجة بعد.");
    showBest();
    showScreen("screen-end");
    $("end-title").focus();
  }

  function submit() {
    if (!playing || over) return;
    var raw = digits($("answer").value);
    if (raw === "" || !/^\d+$/.test(raw)) return;
    var given = Number(raw);
    var sum = a + b;
    var input = $("answer");
    input.classList.remove("flash-ok", "flash-bad");
    if (given === sum) {
      score++;
      $("score").textContent = String(score);
      input.classList.add("flash-ok");
      $("feedback").textContent = "";
      $("feedback").className = "feedback";
    } else {
      input.classList.add("flash-bad");
      $("feedback").textContent = a + " + " + b + " = " + sum;
      $("feedback").className = "feedback bad";
    }
    setTimeout(function () { input.classList.remove("flash-ok", "flash-bad"); }, 250);
    newProblem();
  }

  function start() {
    score = 0;
    over = false;
    playing = true;
    lastKey = "";
    $("score").textContent = "0";
    $("feedback").textContent = "";
    $("feedback").className = "feedback";
    var duration = roundSeconds();
    var end = performance.now() + duration * 1000;
    renderTime(duration, duration);
    showScreen("screen-play");
    newProblem();
    clearInterval(timer);
    timer = setInterval(function () {
      var left = Math.max(0, (end - performance.now()) / 1000);
      renderTime(left, duration);
      if (left <= 0) finish();
    }, 100);
  }

  showBest();
  $("start").addEventListener("click", start);
  $("again").addEventListener("click", start);
  $("form").addEventListener("submit", function (e) {
    e.preventDefault();
    submit();
  });

  window.SpeedAdd = {
    roundSeconds: roundSeconds,
    digits: digits
  };
})();
