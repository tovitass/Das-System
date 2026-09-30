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
    qualities.next_election_year = 2021;
    qualities.next_election_month = 9;
    qualities.next_election_time = (Number(qualities.time) || 0) +
      (2021 - (Number(qualities.year) || 2017)) * 12 + (9 - (Number(qualities.month) || 1));
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
    var order = { die_linke: 10, bsw: 15, spd: 20, greens: 30, cdu: 40, csu: 40, ucd: 40, fdp: 50, afd: 60, other: 70 };
    return entries.sort(function (a, b) { return (order[a.id] || 45) - (order[b.id] || 45); });
  }

  function renderPolls(qualities) {
    var partySystem = window.partySystem;
    var entries = pollingEntries(qualities, voteShares(qualities));
    var shares = {};
    entries.forEach(function (entry) { shares[entry.id] = entry.share; });
    var result = allocateSeats(shares, DEFAULT_SEATS, THRESHOLD);
    var chart = window.modernParliament.renderProjection(entries, THRESHOLD, partySystem.parties);
    var sorted = entries.slice().sort(function (a, b) { return b.share - a.share; });
    function escape(value) { return String(value).replace(/[&<>"']/g, function (c) { return ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;", "'":"&#39;" })[c]; }); }
    var rows = sorted.map(function (entry) {
      var status = entry.id === "other" ? "Aggregate only; not allocated as a party" : entry.share < THRESHOLD ? "Below 5% threshold" : (result.seats[entry.id] || 0) + " projected seats";
      var party = partySystem.get(entry.id) || { color: "#777" };
      return '<li class="party-row"><div class="party-row-heading">' + partySystem.renderName(entry.id, entry.label) + '<span class="party-percent">' + entry.share.toFixed(1) + '%</span></div><div class="party-meter"><span style="width:' + entry.share.toFixed(2) + '%;--party-color:' + escape(party.color) + '"></span></div><div class="poll-seat-status">' + escape(status) + '</div></li>';
    }).join("");
    return '<section class="party-panel polls-panel"><h3>Projected vote shares</h3><p>The tick marks the 5% threshold used for seat allocation.</p>' + chart + '<h3>Projected election results</h3><ul class="party-list">' + rows + '</ul></section>';
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
    if (!existingTime || existingTime > targetTime) {
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
    qualities.government_type = "Government formation pending";
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
