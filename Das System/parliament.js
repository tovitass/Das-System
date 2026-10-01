/* Render a prepared modern seat distribution. Seat calculation belongs to elections.js. */
(function (window) {
  "use strict";

  function render(projection, partyDefinitions, chartClass) {
    if (!projection || !projection.eligible || !projection.eligible.length) {
      return '<p class="parliament-empty">No party currently reaches the 5% threshold.</p>';
    }
    var radii = [];
    for (var row = 0; row < 9; row++) radii.push(76 + row * 16);
    var sum = radii.reduce(function (total, radius) { return total + radius; }, 0);
    var counts = radii.map(function (radius) { return Math.floor(projection.seatTotal * radius / sum); });
    for (var left = projection.seatTotal - counts.reduce(function (a, b) { return a + b; }, 0), i = 0; left > 0; left--, i++) counts[8 - (i % 9)]++;
    var dots = [];
    var seatOrder = 0;
    var parties = projection.eligible.slice();
    var boundaries = [];
    var cumulativeSeats = 0;
    parties.forEach(function (id) {
      cumulativeSeats += Math.max(0, Number(projection.seats[id]) || 0);
      boundaries.push(cumulativeSeats / (Number(projection.seatTotal) || 1));
    });
    radii.forEach(function (radius, row) {
      for (var seat = 0; seat < counts[row]; seat++) {
        var angle = Math.PI - (seat + 0.5) * Math.PI / counts[row];
        var wedge = (seat + 0.5) / counts[row];
        var partyIndex = boundaries.findIndex(function (end) { return wedge <= end; });
        if (partyIndex < 0) partyIndex = parties.length - 1;
        var id = parties[partyIndex];
        var party = partyDefinitions[id] || { name: id, color: "#777" };
        var color = document.body.classList.contains("dark-mode") && ["cdu", "csu"].indexOf(id) !== -1 ? "#f2f2f2" : party.color;
        dots.push('<circle cx="' + (240 + radius * Math.cos(angle)).toFixed(1) + '" cy="' + (238 - radius * Math.sin(angle)).toFixed(1) + '" r="3.05" fill="' + color + '" stroke="#777" stroke-width=".55" class="parliament-seat" style="--seat-index:' + (seatOrder++) + '"><title>' + party.name + ': ' + projection.seats[id] + ' seats</title></circle>');
      }
    });
    return '<svg class="parliament-chart ' + (chartClass || 'parliament-semicircle') + '" viewBox="32 0 416 250" role="img" aria-label="Parliament with ' + projection.seatTotal + ' seats"><title>Parliament seat distribution</title><path d="M42 238 A198 198 0 0 1 438 238" class="parliament-outline" />' + dots.join("") + '</svg>';
  }

  function renderProjection(entries, threshold, partyDefinitions) {
    threshold = Math.max(0, Math.min(100, Number(threshold) || 5));
    var centerX = 240, centerY = 218, outer = 180, inner = 98;
    var angle = Math.PI;
    var colors = partyDefinitions || {};
    function point(radius, radians) {
      return [centerX + radius * Math.cos(radians), centerY - radius * Math.sin(radians)];
    }
    function coords(pair) { return pair.map(function (n) { return n.toFixed(2); }).join(","); }
    function arcPath(start, end) {
      var a = point(outer, start), b = point(outer, end), c = point(inner, end), d = point(inner, start);
      var large = start - end > Math.PI ? 1 : 0;
      return 'M' + coords(a) + ' A' + outer + ' ' + outer + ' 0 ' + large + ' 1 ' + coords(b) +
        ' L' + coords(c) + ' A' + inner + ' ' + inner + ' 0 ' + large + ' 0 ' + coords(d) + ' Z';
    }
    var total = entries.reduce(function (sum, entry) { return sum + Math.max(0, Number(entry.share) || 0); }, 0) || 100;
    var parts = ['<svg class="parliament-chart projected-half-donut" viewBox="0 0 480 270" role="img" aria-label="Projected vote shares shown as a half-donut; 5% threshold">', '<title>Projected vote shares and 5% threshold</title>'];
    entries.forEach(function (entry) {
      var share = Math.max(0, Number(entry.share) || 0);
      if (!share) return;
      var next = angle - Math.PI * share / total;
      var party = colors[entry.id] || { name: entry.label || entry.id, color: '#777' };
      parts.push('<path d="' + arcPath(angle, next) + '" fill="' + escapeHtml(party.color) + '" stroke="var(--content-bg-color)" stroke-width="2"><title>' + escapeHtml(party.name || entry.label || entry.id) + ': ' + share.toFixed(1) + '%</title></path>');
      angle = next;
    });
    var tickAngle = Math.PI - Math.PI * threshold / 100;
    var tickA = point(outer + 2, tickAngle), tickB = point(outer + 20, tickAngle), label = point(outer + 34, tickAngle);
    parts.push('<line x1="' + tickA[0].toFixed(2) + '" y1="' + tickA[1].toFixed(2) + '" x2="' + tickB[0].toFixed(2) + '" y2="' + tickB[1].toFixed(2) + '" class="threshold-mark"/>');
    parts.push('</svg>');
    return parts.join('');
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (character) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[character];
    });
  }

  function renderResult(result, partyDefinitions, heading) {
    if (!result) return "";
    partyDefinitions = partyDefinitions || {};
    var displayResult = Object.assign({}, result, {
      eligible: (result.eligible || []).slice(),
      seats: Object.assign({}, result.seats)
    });
    var displayParties = Object.assign({}, partyDefinitions);
    if (displayResult.eligible.indexOf("cdu") !== -1 && displayResult.eligible.indexOf("csu") !== -1 &&
        partyDefinitions.cdu && partyDefinitions.csu &&
        partyDefinitions.cdu.parliamentaryGroup === partyDefinitions.csu.parliamentaryGroup) {
      displayResult.seats.cdu = (Number(displayResult.seats.cdu) || 0) + (Number(displayResult.seats.csu) || 0);
      delete displayResult.seats.csu;
      displayResult.eligible = displayResult.eligible.filter(function (id) { return id !== "csu"; });
      displayParties.cdu = Object.assign({}, partyDefinitions.cdu, { name: "CDU/CSU" });
    }
    var leftToRight = { die_linke: 0, spd: 1, greens: 2, fdp: 3, cdu: 4, csu: 4, afd: 5 };
    var eligible = displayResult.eligible.slice().sort(function (a, b) {
      var rankA = Object.prototype.hasOwnProperty.call(leftToRight, a) ? leftToRight[a] : 99;
      var rankB = Object.prototype.hasOwnProperty.call(leftToRight, b) ? leftToRight[b] : 99;
      return rankA - rankB || String(a).localeCompare(String(b));
    });
    displayResult.eligible = eligible;
    var rows = eligible.map(function (id) {
      var party = displayParties[id] || { name: id, color: "#777777" };
      return '<li class="party-row"><span><i class="seat-legend-swatch" style="--party-color:' + escapeHtml(party.color) + '"></i>' +
        escapeHtml(party.name || id) + '</span><strong>' + (Number(displayResult.seats[id]) || 0) + ' seats</strong></li>';
    }).join("");
    return '<section class="party-panel parliament-result"><h3>' + escapeHtml(heading || "Elected Bundestag") + '</h3>' +
      render(displayResult, displayParties, 'election-parliament-chart') + '<p>Seat allocation: ' + result.seatTotal + ' seats; 5% threshold.</p>' +
      '<ul class="party-list parliament-seat-list">' + rows + '</ul></section>';
  }

  function renderLegacy(targetId, rows, colors) {
    var target = document.getElementById(targetId);
    if (!target || !Array.isArray(rows)) return;
    colors = colors || {};
    var seats = {};
    var eligible = [];
    var partyDefinitions = {};
    var seatTotal = 0;
    rows.forEach(function (row) {
      var count = Math.max(0, Math.floor(Number(row.seats) || 0));
      if (!count) return;
      seats[row.id] = count;
      eligible.push(row.id);
      seatTotal += count;
      partyDefinitions[row.id] = { name: row.legend || row.name || row.id, color: colors[row.id] || "#777777" };
    });
    target.innerHTML = render({ seats: seats, eligible: eligible, seatTotal: seatTotal }, partyDefinitions);
  }

  window.modernParliament = { render: render, renderProjection: renderProjection, renderResult: renderResult, renderLegacy: renderLegacy };
}(window));
