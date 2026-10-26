(function () {
  var KEYS = {
    addition: "speedtest.addition.best",
    logic: "speedtest.logic.best"
  };

  function read(name) {
    try {
      var n = Number(localStorage.getItem(KEYS[name]));
      return Number.isFinite(n) && n > 0 ? n : 0;
    } catch (e) {
      return 0;
    }
  }

  function write(name, score) {
    var prev = read(name);
    if (score > prev) {
      try { localStorage.setItem(KEYS[name], String(score)); } catch (e) {}
      return { best: score, improved: true, prev: prev };
    }
    return { best: prev, improved: false, prev: prev };
  }

  window.SpeedBest = { KEYS: KEYS, read: read, write: write };
})();
