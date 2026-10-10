/* Modern polling, election results, and Bundestag seat allocation. */
(function (window) {
  "use strict";

  var DEFAULT_SEATS = 598;
  var THRESHOLD = 5;
  var STARTING_SHARES = {
    die_linke: 9.2, greens: 8.9, spd: 20.5, fdp: 10.7,
    cdu: 26.8, csu: 6.1, afd: 12.6, other: 5.2
  };

  function initializeScenario(qualities) {
    window.partySystem.initializePartyState(qualities);
    if (!Array.isArray(qualities.classes)) {
      qualities.classes = ["workers", "old_middle", "new_middle", "rural", "unemployed", "catholics"];
    }
    qualities.classes.forEach(function (group) {
      window.partySystem.activeIds().forEach(function (id) {
        qualities[group + "_" + id] = STARTING_SHARES[id] || 0;
      });
    });
    var currentYear = Number(qualities.year) || 2017;
    var currentMonth = Number(qualities.month) || 1;
    var electionYear = currentYear + (currentMonth > 9 ? 1 : 0);
    qualities.next_election_year = electionYear;
    qualities.next_election_month = 9;
    qualities.next_election_time = (Number(qualities.time) || 0) +
      (electionYear - currentYear) * 12 + (9 - currentMonth);
    qualities.election_records = qualities.election_records || [];
    qualities.n_elections = Number(qualities.n_elections) || 0;
  }

  function voteShares(qualities) {
    var partySystem = window.partySystem;
    var ids = Array.isArray(qualities.parties) ? qualities.parties.filter(function (id) { return !!partySystem.get(id); }) : partySystem.activeIds();
    var result = {};
    var totalWeight = 0;
    ids.forEach(function (id) { result[id] = 0; });
    (qualities.classes || []).forEach(function (group) {
      var weight = Math.max(0, Number(qualities[group]) || 0);
      var total = ids.reduce(function (sum, id) { return sum + Math.max(0, Number(qualities[group + "_" + id]) || 0); }, 0);
      if (weight && total) {
        ids.forEach(function (id) { result[id] += weight * Math.max(0, Number(qualities[group + "_" + id]) || 0) / total; });
        totalWeight += weight;
      }
    });
    if (!totalWeight) {
      ids.forEach(function (id) { result[id] = STARTING_SHARES[id] || 0; });
      totalWeight = ids.reduce(function (sum, id) { return sum + result[id]; }, 0) || 1;
    }
    ids.forEach(function (id) { result[id] = 100 * result[id] / totalWeight; });
    var pollingBonuses = qualities.polling_bonuses || {};
    var bonusTotal = ids.reduce(function (sum, id) {
      return sum + Math.max(0, Number(pollingBonuses[id]) || 0);
    }, 0);
    var donorTotal = ids.reduce(function (sum, id) {
      return sum + (Math.max(0, Number(pollingBonuses[id]) || 0) ? 0 : result[id]);
    }, 0);
    if (bonusTotal && donorTotal) {
      ids.forEach(function (id) {
        var bonus = Math.max(0, Number(pollingBonuses[id]) || 0);
        result[id] = bonus ? result[id] + bonus : Math.max(0, result[id] - bonusTotal * result[id] / donorTotal);
      });
    }
    // Active crisis topics can move opinion between polling checkpoints. Their
    // modest, explicit shifts affect projections while the issue is in play.
    if (!qualities.historical_mode && Array.isArray(qualities.active_crises)) {
      var currentMonth = (Number(qualities.year) || 0) * 12 + (Number(qualities.month) || 1);
      qualities.active_crises.forEach(function(crisis) {
        if (!crisis || Number(crisis.expiresAt) < currentMonth || !crisis.polling) return;
        Object.keys(crisis.polling).forEach(function(id) {
          if (ids.indexOf(id) !== -1) result[id] = Math.max(0, (result[id] || 0) + (Number(crisis.polling[id]) || 0));
        });
      });
      var crisisTotal = ids.reduce(function(sum, id) { return sum + (result[id] || 0); }, 0) || 1;
      ids.forEach(function(id) { result[id] = 100 * (result[id] || 0) / crisisTotal; });
    }
    // The Our Enemies campaign is intended to win over voters from the
    // parties it targets. Shift a modest share from each targeted party to SPD.
    var targets = Array.isArray(qualities.enemy_targets) ? qualities.enemy_targets : [];
    var spdTransfer = 0;
    targets.forEach(function (id) {
      if (id !== "spd" && ids.indexOf(id) !== -1 && result[id] > 0) {
        var transfer = Math.min(1.5, result[id]);
        result[id] -= transfer;
        spdTransfer += transfer;
      }
    });
    if (ids.indexOf("spd") !== -1) result.spd += spdTransfer;
    return applyStreetEffects(result, qualities, ids);
  }

  function applyStreetEffects(shares, qualities, ids) {
    if (qualities.historical_mode) return shares;
    ensureStreetState(qualities);
    var swing = Math.max(-2, Math.min(2, (qualities.grassroots_mobilization - qualities.right_wing_agitation) / 25));
    var backlash = Math.max(0, qualities.left_wing_militancy - 35) * 0.025;
    var leftPenalty = Math.max(0, -qualities.verfassungsschutz_focus) * 0.005;
    var rightPenalty = Math.max(0, qualities.verfassungsschutz_focus) * 0.005;
    if (ids.indexOf("spd") !== -1) shares.spd = Math.max(0, (shares.spd || 0) + swing - backlash - leftPenalty);
    if (ids.indexOf("afd") !== -1) shares.afd = Math.max(0, (shares.afd || 0) - swing * 0.5 - rightPenalty);
    var total = ids.reduce(function (sum, id) { return sum + (shares[id] || 0); }, 0) || 1;
    ids.forEach(function (id) { shares[id] = 100 * (shares[id] || 0) / total; });
    return shares;
  }

  function ensureStreetState(qualities) {
    var defaults = { right_wing_agitation: 45, grassroots_mobilization: 45, left_wing_militancy: 10, verfassungsschutz_focus: 0 };
    Object.keys(defaults).forEach(function (key) {
      var value = Number(qualities[key]);
      if (!isFinite(value)) value = defaults[key];
      qualities[key] = key === "verfassungsschutz_focus" ? Math.max(-100, Math.min(100, value)) : Math.max(0, Math.min(100, value));
    });
    return qualities;
  }

  function pollingEntries(qualities, shares) {
    var partySystem = window.partySystem;
    var ids = Array.isArray(qualities.parties) ? qualities.parties.filter(function (id) { return !!partySystem.get(id); }) : partySystem.activeIds();
    var unified = !!qualities.union_unified || ids.indexOf("ucd") !== -1;
    var alliance = qualities.union_alliance_active !== 0 && ids.indexOf("cdu") !== -1 && ids.indexOf("csu") !== -1;
    var used = {};
    var entries = [];
    if (unified) {
      entries.push({ id: "ucd", label: "UCD", share: ids.indexOf("ucd") !== -1 ? (shares.ucd || 0) : (shares.cdu || 0) + (shares.csu || 0) });
      used.ucd = used.cdu = used.csu = true;
    } else if (alliance) {
      entries.push({ id: "cdu", label: "CDU + CSU", share: (shares.cdu || 0) + (shares.csu || 0) });
      used.cdu = used.csu = true;
    }
    ids.forEach(function (id) {
      if (!used[id]) entries.push({ id: id, label: id === "other" ? "Other (smaller parties)" : partySystem.name(id), share: shares[id] || 0 });
    });
    var order = { die_linke: 10, bsw: 15, spd: 20, greens: 30, fdp: 35, cdu: 40, csu: 40, ucd: 40, afd: 60, other: 70 };
    return entries.sort(function (a, b) { return (order[a.id] || 45) - (order[b.id] || 45); });
  }

  function renderPolls(qualities) {
    var partySystem = window.partySystem;
    var rawShares = voteShares(qualities);
    var entries = pollingEntries(qualities, rawShares);
    var shares = {};
    entries.forEach(function (entry) { shares[entry.id] = entry.share; });
    var history = recordPollingHistory(qualities, rawShares);
    var result = allocateSeats(shares, DEFAULT_SEATS, THRESHOLD);
    var chart = window.modernParliament.renderProjection(entries, THRESHOLD, partySystem.parties);
    var historyChart = renderPollingHistory(history, entries, partySystem);
    var sorted = entries.slice().sort(function (a, b) { return b.share - a.share; });
    function escape(value) { return String(value).replace(/[&<>"']/g, function (c) { return ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;", "'":"&#39;" })[c]; }); }
    var rows = sorted.map(function (entry) {
      var status = entry.id === "other" ? "Aggregate only; not allocated as a party" : entry.share < THRESHOLD ? "Below 5% threshold" : (result.seats[entry.id] || 0) + " projected seats";
      var party = partySystem.get(entry.id) || { color: "#777" };
      return '<li class="party-row"><div class="party-row-heading">' + partySystem.renderName(entry.id, entry.label) + '<span class="party-percent">' + entry.share.toFixed(1) + '%</span></div><div class="party-meter"><span style="width:' + entry.share.toFixed(2) + '%;--party-color:' + escape(party.color) + '"></span></div><div class="poll-seat-status">' + escape(status) + '</div></li>';
    }).join("");
    return '<section class="party-panel polls-panel"><h3>Projected vote shares</h3><p>Parties below 5% are excluded from seat allocation.</p>' + chart + '<h3>Projected election results</h3><ul class="party-list">' + rows + '</ul><h3>Polling over the last 12 months</h3>' + historyChart + '</section>';
  }

  function recordPollingHistory(qualities, knownShares) {
    var shares = knownShares || voteShares(qualities);
    var monthIndex = (Number(qualities.year) || 2017) * 12 + ((Number(qualities.month) || 1) - 1);
    if (qualities.polling_history_version !== 2) {
      qualities.polling_history = [];
      qualities.polling_history_version = 2;
      delete qualities.polling_pending;
    }
    var history = Array.isArray(qualities.polling_history) ? qualities.polling_history : (qualities.polling_history = []);
    var pending = qualities.polling_pending;
    if (pending && pending.month < monthIndex) {
      var last = history.length && history[history.length - 1];
      if (!last || last.month < pending.month) {
        history.push({ month: pending.month, shares: Object.assign({}, shares) });
      }
    }
    qualities.polling_pending = { month: monthIndex, shares: Object.assign({}, shares) };
    history = history.filter(function (item) { return item.month >= monthIndex - 12 && item.month < monthIndex; });
    qualities.polling_history = history;
    return history;
  }

  function renderPollingHistory(history, entries, partySystem) {
    var width = 640, height = 300, left = 44, right = 12, top = 14, bottom = 34;
    var plotWidth = width - left - right, plotHeight = height - top - bottom;
    var parties = entries.filter(function (entry) { return entry.id !== "other"; });
    function shareForPoint(point, party) {
      var values = point.shares || {};
      if (party.id === "cdu" && party.label === "CDU + CSU") return (Number(values.cdu) || 0) + (Number(values.csu) || 0);
      if (party.id === "ucd") return Number(values.ucd) || ((Number(values.cdu) || 0) + (Number(values.csu) || 0));
      return Number(values[party.id]) || 0;
    }
    var maxShare = Math.max(20, Math.ceil(Math.max.apply(null, history.reduce(function (values, point) {
      return values.concat(parties.map(function (party) { return shareForPoint(point, party); }));
    }, [0])) / 10) * 10);
    function x(index) { return left + (history.length < 2 ? plotWidth / 2 : plotWidth * index / (history.length - 1)); }
    function y(value) { return top + plotHeight * (1 - value / maxShare); }
    function escape(value) { return String(value).replace(/[&<>"']/g, function (c) { return ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;", "'":"&#39;" })[c]; }); }
    var grid = [];
    for (var tick = 0; tick <= maxShare; tick += 10) {
      grid.push('<line x1="' + left + '" x2="' + (width - right) + '" y1="' + y(tick) + '" y2="' + y(tick) + '" class="poll-history-grid"/><text x="' + (left - 7) + '" y="' + (y(tick) + 4) + '" text-anchor="end" class="poll-history-axis">' + tick + '%</text>');
    }
    var lines = parties.map(function (party) {
      var points = history.map(function (item, index) { return [x(index), y(shareForPoint(item, party))]; });
      var path = points.length ? 'M ' + points[0][0] + ' ' + points[0][1] : '';
      for (var i = 1; i < points.length; i++) {
        var mid = (points[i - 1][0] + points[i][0]) / 2;
        path += ' C ' + mid + ' ' + points[i - 1][1] + ', ' + mid + ' ' + points[i][1] + ', ' + points[i][0] + ' ' + points[i][1];
      }
      var color = (partySystem.get(party.id) || {}).color || '#777';
      return '<path d="' + path + '" fill="none" stroke="' + escape(color) + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><title>' + escape(party.label) + '</title></path>';
    }).join('');
    var labels = history.map(function (item, index) {
      var month = item.month % 12;
      var year = Math.floor(item.month / 12);
      return '<text x="' + x(index) + '" y="' + (height - 8) + '" text-anchor="middle" class="poll-history-axis">' + ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][month] + ' ' + year + '</text>';
    }).join('');
    var legend = parties.map(function (party) {
      var color = (partySystem.get(party.id) || {}).color || '#777';
      return '<span class="poll-history-legend-item"><i style="background:' + escape(color) + '"></i>' + escape(party.label) + '</span>';
    }).join('');
    return '<div class="poll-history-wrap"><svg class="poll-history-chart" viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="Party polling over the last 12 months">' + grid.join('') + lines + labels + '</svg><div class="poll-history-legend">' + legend + '</div></div>';
  }

  function allocateSeats(shares, seatTotal, threshold) {
    seatTotal = Math.max(1, Math.floor(Number(seatTotal) || DEFAULT_SEATS));
    threshold = threshold === undefined ? THRESHOLD : Math.max(0, Number(threshold) || 0);
    var ids = Object.keys(shares).filter(function (id) { return id !== "other"; });
    var eligible = ids.filter(function (id) {
      return id !== "other" && (Number(shares[id]) || 0) >= threshold;
    }).map(function (id) { return { id: id, share: Number(shares[id]) || 0 }; });
    var total = eligible.reduce(function (sum, item) { return sum + item.share; }, 0);
    var seats = {};
    var remainders = [];
    var assigned = 0;
    if (total > 0) {
      eligible.forEach(function (item) {
        var exact = item.share / total * seatTotal;
        seats[item.id] = Math.floor(exact);
        assigned += seats[item.id];
        remainders.push({ id: item.id, value: exact - seats[item.id] });
      });
      remainders.sort(function (a, b) { return b.value - a.value; });
      for (var i = 0; i < seatTotal - assigned; i++) seats[remainders[i].id]++;
    }
    return {
      shares: Object.assign({}, shares),
      seats: seats,
      eligible: eligible.map(function (item) { return item.id; }),
      excluded: ids.filter(function (id) { return id !== "other" && (Number(shares[id]) || 0) < threshold; }),
      seatTotal: seatTotal,
      threshold: threshold
    };
  }

  function calculate(qualities, options) {
    options = options || {};
    var shares = voteShares(qualities);
    var result = allocateSeats(shares, options.seatTotal, options.threshold);
    result.date = { year: Number(qualities.year) || 0, month: Number(qualities.month) || 0 };
    return result;
  }

  function scheduleNextElection(qualities, intervalYears, month) {
    intervalYears = Math.max(1, Math.floor(Number(intervalYears) || 4));
    month = Math.max(1, Math.min(12, Math.floor(Number(month) || 9)));
    qualities.next_election_year = (Number(qualities.year) || 0) + intervalYears;
    qualities.next_election_month = month;
    qualities.next_election_time = (Number(qualities.time) || 0) + intervalYears * 12;
  }

  function scheduleEarlyElection(qualities, monthsFromNow) {
    monthsFromNow = Math.max(1, Math.floor(Number(monthsFromNow) || 3));
    var now = Number(qualities.time) || 0;
    var targetTime = now + monthsFromNow;
    var existingTime = Number(qualities.next_election_time) || 0;
    if (!existingTime || existingTime <= now || existingTime > targetTime) {
      var monthIndex = (Number(qualities.year) || 0) * 12 + (Number(qualities.month) || 1) - 1 + monthsFromNow;
      qualities.next_election_time = targetTime;
      qualities.next_election_year = Math.floor(monthIndex / 12);
      qualities.next_election_month = (monthIndex % 12) + 1;
    }
    qualities.time_to_election = Math.max(0, Number(qualities.next_election_time) - now);
    return { time: qualities.next_election_time, year: qualities.next_election_year, month: qualities.next_election_month };
  }

  function installCaretaker(qualities) {
    var result = qualities.modern_election_result || calculate(qualities);
    var seats = Object.assign({}, result.seats || {});
    var ids = Object.keys(seats).filter(function (id) { return id !== "other" && Number(seats[id]) > 0; });
    var unionIds = ids.filter(function (id) { return id === "cdu" || id === "csu"; });
    var cdu = window.partySystem.get("cdu"), csu = window.partySystem.get("csu");
    var isUnion = unionIds.length > 1 && cdu && csu && cdu.parliamentaryGroup === csu.parliamentaryGroup;
    if (isUnion) {
      ids = ids.filter(function (id) { return id !== "csu"; });
      seats.cdu = (Number(seats.cdu) || 0) + (Number(seats.csu) || 0);
    }
    ids.sort(function (a, b) { return (Number(seats[b]) || 0) - (Number(seats[a]) || 0); });
    var leader = ids[0] || "spd";
    var party = window.partySystem.get(leader) || { name: leader };
    var unionCaretaker = leader === "cdu" && isUnion;
    var label = unionCaretaker ? "CDU/CSU" : party.name;
    [
      ["foreign_minister", "foreign_minister_party"], ["interior_minister", "interior_minister_party"],
      ["justice_minister", "justice_minister_party"], ["labor_minister", "labor_minister_party"],
      ["defense_minister", "defense_minister_party"], ["economic_minister", "economic_minister_party"],
      ["finance_minister", "finance_minister_party"], ["health_minister", "health_minister_party"],
      ["environment_minister", "environment_minister_party"], ["transport_minister", "transport_minister_party"],
      ["education_minister", "education_minister_party"]
    ].forEach(function (ministry) {
      qualities[ministry[0]] = label + " caretaker minister";
      qualities[ministry[1]] = leader;
    });
    var previousChancellorParty = String(qualities.chancellor_party || "").toLowerCase();
    qualities.caretaker_party = leader;
    qualities.caretaker_parties = unionCaretaker ? ["cdu", "csu"] : [leader];
    qualities.government_parties = qualities.caretaker_parties.slice();
    qualities.government_type = label + " caretaker government";
    qualities.chancellor_party = leader.toUpperCase();
    if (previousChancellorParty !== leader && !(unionCaretaker && previousChancellorParty === "cdu")) {
      qualities.chancellor = "Caretaker Chancellor";
    }
    qualities.spd_in_government = leader === "spd" ? 1 : 0;
    qualities.spd_caretaker = leader === "spd" ? 1 : 0;
    qualities.spd_toleration = 0;
    qualities.in_grand_coalition = 0;
    qualities.in_weimar_coalition = 0;
    qualities.in_popular_front = 0;
    qualities.in_left_front = 0;
    qualities.in_minority_government = 0;
    qualities.government_formation_pending = 0;
    qualities.government_active = 1;
    return { party: leader, label: label, seats: seats[leader] || 0 };
  }

  function recordResult(qualities, result) {
    var shares = result.shares || {};
    var record = {
      date: new Date((Number(qualities.year) || 0), (Number(qualities.month) || 1) - 1),
      seats: Object.assign({}, result.seats),
      eligible: result.eligible.slice(),
      threshold: result.threshold,
      seatTotal: result.seatTotal
    };
    Object.keys(shares).forEach(function (id) {
      record[id] = shares[id];
      qualities["old_" + id + "_r"] = qualities[id + "_r"];
      qualities[id + "_r"] = Math.round(shares[id]);
    });
    qualities.modern_election_result = result;
    qualities.modern_election_spd = (shares.spd || 0).toFixed(1);
    qualities.modern_election_union = ((shares.cdu || 0) + (shares.csu || 0)).toFixed(1);
    qualities.modern_election_afd = (shares.afd || 0).toFixed(1);
    qualities.election_records = qualities.election_records || [];
    qualities.election_records.push(record);
    qualities.n_elections = (Number(qualities.n_elections) || 0) + 1;
    qualities.government_formation_pending = 1;
    qualities.government_type = "Pending.";
    qualities.government_active = 0;
    scheduleNextElection(qualities, 4, 9);
    return record;
  }

  window.electionSystem = {
    defaultSeatTotal: DEFAULT_SEATS,
    threshold: THRESHOLD,
    startingShares: Object.assign({}, STARTING_SHARES),
    initializeScenario: initializeScenario,
    voteShares: voteShares,
    recordPollingHistory: recordPollingHistory,
    ensureStreetState: ensureStreetState,
    renderPolls: renderPolls,
    allocateSeats: allocateSeats,
    calculate: calculate,
    scheduleNextElection: scheduleNextElection,
    scheduleEarlyElection: scheduleEarlyElection,
    recordResult: recordResult,
    installCaretaker: installCaretaker
  };
}(window));
