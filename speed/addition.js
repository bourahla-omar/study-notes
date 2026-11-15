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

  // Daily goal: games played today, resets with the local date.
  var DAILY_GOAL = 45;
  var DAILY_KEY = "speedtest.addition.daily.v1";
  function today() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function dailyCount() {
    try {
      var d = JSON.parse(localStorage.getItem(DAILY_KEY));
      if (d && d.date === today()) return d.count;
    } catch (e) {}
    return 0;
  }
  function countGame() {
    var before = dailyCount();
    var count = before + 1;
    try { localStorage.setItem(DAILY_KEY, JSON.stringify({ date: today(), count: count })); } catch (e) {}
    renderGoal();
    return before < DAILY_GOAL && count >= DAILY_GOAL;
  }
  function renderGoal() {
    var n = dailyCount();
    var pct = Math.min(100, 100 * n / DAILY_GOAL);
    var html = "هدف اليوم: " + Math.min(n, DAILY_GOAL) + " / " + DAILY_GOAL + " جولة" + (n >= DAILY_GOAL ? " \u2705" : "") +
      '<div class="goalbar"><div style="width:' + pct + '%"></div></div>';
    ["goal-start", "goal-end"].forEach(function (id) {
      $(id).innerHTML = html;
      $(id).classList.toggle("done", n >= DAILY_GOAL);
    });
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
      x = rand(1, 9);
      y = rand(1, 9);
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
    var hit = countGame();
    $("celebrate").innerHTML = hit
      ? '<div class="celebrate"><b>\u{1F389} حققتِ هدف اليوم!</b>' + DAILY_GOAL + ' جولة اليوم. أحسنتِ!</div>'
      : "";
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
    // Two-digit sum: its last digit alone also counts (5 for 15), same rule as the Quick Addition game.
    var ok = given === sum || (sum >= 10 && sum < 100 && /^\d$/.test(raw) && given === sum % 10);
    if (ok) {
      score++;
      $("score").textContent = String(score);
      input.classList.add("flash-ok");
      if (given !== sum) {
        $("feedback").textContent = a + " + " + b + " = " + sum;
        $("feedback").className = "feedback ok";
      } else {
        $("feedback").textContent = "";
        $("feedback").className = "feedback";
      }
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
  renderGoal();
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
