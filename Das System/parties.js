(function (window) {
  "use strict";

  // Party IDs are stable game keys. Names, colors, and future party paths live
  // here so scenes do not need to invent their own labels.
  var detailsExpanded = true;

  var parties = {
    die_linke: {
      name: "Die Linke",
      shortName: "Linke",
      color: "#d5007f",
      status: "active",
      aliases: ["Die Linke", "Linke", "Socialist", "Socialists"]
    },
    greens: {
      name: "Greens",
      fullName: "Alliance 90/The Greens",
      color: "#39833b",
      status: "active",
      aliases: ["Greens", "Green Party", "Bündnis 90/Die Grünen", "left-liberal Greens", "Die Grünen", "Social-Liberal"]
    },
    spd: {
      name: "SPD",
      fullName: "Social Democratic Party of Germany",
      color: "#e3000f",
      status: "active",
      aliases: ["SPD", "Social Democrats"]
    },
    fdp: {
      name: "FDP",
      fullName: "Free Democratic Party",
      color: "#9a7900",
      status: "active",
      aliases: ["FDP", "Market-Liberal", "Market-Liberals"]
    },
    cdu: {
      name: "CDU",
      fullName: "Christian Democratic Union of Germany",
      color: "#171717",
      status: "active",
      parliamentaryGroup: "union",
      aliases: ["CDU", "CDU/CSU", "Conservative", "Conservatives"]
    },
    csu: {
      name: "CSU",
      fullName: "Christian Social Union in Bavaria",
      color: "#171717",
      status: "active",
      parliamentaryGroup: "union",
      aliases: ["CSU"]
    },
    afd: {
      name: "AfD",
      fullName: "Alternative for Germany",
      color: "#168ac4",
      status: "active",
      aliases: ["AfD"]
    },
    other: {
      name: "Other",
      fullName: "Other parties",
      color: "#777777",
      status: "active",
      aliases: ["Other parties"]
    },

    // Dormant entries are available to future events, but are not in the
    // starting roster until their formation is implemented.
    bsw: {
      name: "BSW",
      fullName: "Bündnis Sahra Wagenknecht",
      color: "#7b2b83",
      status: "dormant",
      eligibleFrom: "2023-07",
      aliases: ["BSW", "Bündnis Sahra Wagenknecht", "Conservative Leftists"]
    },

    bvp: {
      name: "BVP",
      fullName: "Bavarian successor party",
      color: "#79b9df",
      status: "dormant",
      aliases: ["BVP", "Bavarians"]
    },
    ucd: {
      name: "UCD",
      fullName: "Union Christlicher Democraten",
      color: "#171717",
      status: "dormant",
      aliases: ["UCD", "Union Christlicher Democraten", "Conservatives"]
    }
  };

  // Current SPD faction identities mapped onto the existing faction-strength
  // tracks so past choices continue to move influence without old labels in UI.
  var spdFactions = [
    {
      id: "seeheimer_kreis",
      name: "Seeheimer Kreis (Seeheim Circle)",
      orientation: "Moderate, centrist, and market-friendly.",
      description: "Pragmatic reform and a market-oriented Third Way; influential among parliamentary members.",
      strengthTracks: [{ key: "center_strength", dissentKey: "center_dissent", weight: 1 }, { key: "reformist_strength", dissentKey: "reformist_dissent", weight: 0.5 }],
      color: "#9a7900"
    },
    {
      id: "parlamentarische_linke",
      name: "Parlamentarische Linke (Parliamentary Left)",
      orientation: "Traditional left wing.",
      description: "Favors Keynesian economic policy and a strong welfare state, and challenges reforms seen as weakening worker protections.",
      strengthTracks: [{ key: "left_strength", dissentKey: "left_dissent", weight: 1 }, { key: "labor_strength", dissentKey: "labor_dissent", weight: 1 }],
      color: "#e3000f"
    },
    {
      id: "netzwerk_berlin",
      name: "Netzwerk Berlin (Berlin Network)",
      orientation: "Reformist and centrist-left.",
      description: "Promotes modernized social democracy, with positions and membership that often overlap with the Seeheim Circle.",
      strengthTracks: [{ key: "reformist_strength", dissentKey: "reformist_dissent", weight: 0.5 }, { key: "neorevisionist_strength", dissentKey: "neorevisionist_dissent", weight: 1 }],
      color: "#a34a72"
    }
  ];

  function getFactionMetrics(qualities) {
    var raw = spdFactions.map(function (faction) {
      var influence = 0;
      var dissentTotal = 0;
      var dissentWeight = 0;
      faction.strengthTracks.forEach(function (track) {
        var strength = Math.max(0, Number(qualities[track.key]) || 0) * track.weight;
        influence += strength;
        dissentTotal += strength * (Number(qualities[track.dissentKey]) || 0);
        dissentWeight += strength;
      });
      var fallbackDissent = faction.strengthTracks.reduce(function (sum, track) {
        return sum + (Number(qualities[track.dissentKey]) || 0);
      }, 0) / faction.strengthTracks.length;
      return {
        strength: influence,
        dissent: dissentWeight ? dissentTotal / dissentWeight : fallbackDissent
      };
    });
    var totalStrength = raw.reduce(function (sum, value) { return sum + value.strength; }, 0);
    if (!totalStrength) {
      raw.forEach(function (value) { value.strength = 100 / raw.length; });
    } else {
      raw.forEach(function (value) { value.strength = 100 * value.strength / totalStrength; });
    }
    return raw;
  }

  function renderFactionRows(qualities) {
    var metrics = getFactionMetrics(qualities);
    var segments = spdFactions.map(function (faction, index) {
      return '<span title="' + escapeHtml(faction.name) + ': ' + metrics[index].strength.toFixed(1) + '%" ' +
        'style="width:' + Math.max(0, Math.min(100, metrics[index].strength)).toFixed(2) + '%;--faction-color:' +
        escapeHtml(faction.color) + '"></span>';
    }).join('');
    var rows = spdFactions.map(function (faction, index) {
      var strength = metrics[index].strength;
      var dissent = metrics[index].dissent;
      var roster = qualities.advisor_roster && qualities.advisor_roster[faction.id];
      var advisors = Array.isArray(roster) ? roster.filter(function (advisor) { return qualities[advisor.key]; }) : [];
      return '<li class="faction-row"><div class="faction-heading"><strong>' + escapeHtml(faction.name) +
        '</strong></div><div class="faction-stats"><span class="faction-stat">Strength <b>' + strength.toFixed(0) +
        '%</b></span><span class="faction-stat">Dissent <b>' + dissent.toFixed(0) + '%</b></span></div>' +
        '<p class="faction-orientation">' + escapeHtml(faction.orientation) + '</p><p class="faction-description">' +
        escapeHtml(faction.description) + '</p><p class="faction-advisors"><strong>Advisors:</strong> ' +
        (advisors.length ? advisors.map(function (advisor) { return escapeHtml(advisor.name); }).join(', ') : 'None currently appointed') +
        '</p></li>';
    }).join('');
    return '<div class="faction-strength-distribution" role="img" aria-label="Faction strength distribution">' + segments +
      '</div><ul class="party-list faction-list">' + rows + '</ul>';
  }

  var startingRoster = [
    "die_linke", "greens", "spd", "fdp", "cdu", "csu", "afd", "other"
  ];

  // 2017 second-vote shares, including a catch-all for smaller parties.
  // The election model applies these same shares to each demographic group
  // until class-specific starting profiles are authored.
  var startingShares = {
    die_linke: 9.2,
    greens: 8.9,
    spd: 20.5,
    fdp: 10.7,
    cdu: 26.8,
    csu: 6.1,
    afd: 12.6,
    other: 5.2
  };

  // Future formations are declared here for later event work. No transition
  // runs automatically in the current game.
  var plannedTransitions = {
    bsw_split: {
      status: "todo",
      date: "2023-07",
      from: ["die_linke"],
      to: ["die_linke", "bsw"]
    },
    union_splits_to_bvp: {
      status: "todo",
      from: ["csu"],
      to: ["cdu", "bvp"]
    },
    cdu_csu_form_ucd: {
      status: "todo",
      from: ["cdu", "csu"],
      to: ["ucd"]
    }
  };

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (character) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#39;"
      }[character];
    });
  }

  function getParty(id) {
    return parties[id] || null;
  }

  function renderName(id, label) {
    var party = getParty(id);
    if (!party) {
      return escapeHtml(label || id);
    }
    return '<span class="party-name" data-party-id="' + escapeHtml(id) +
      '" style="--party-color:' + escapeHtml(party.color) + '">' +
      escapeHtml(label || party.name) + "</span>";
  }

  var aliases = [];
  Object.keys(parties).forEach(function (id) {
    parties[id].aliases.forEach(function (alias) {
      aliases.push({ id: id, alias: alias });
    });
    if (id !== "other" && parties[id].fullName) aliases.push({ id: id, alias: parties[id].fullName });
    if (id !== "other") aliases.push({ id: id, alias: parties[id].name });
  });
  aliases.sort(function (a, b) {
    return b.alias.length - a.alias.length;
  });

  var aliasToId = {};
  aliases.forEach(function (entry) {
    aliasToId[entry.alias.toLowerCase()] = entry.id;
  });

  var aliasPattern = new RegExp(
    "(^|[^A-Za-z0-9])(" +
      aliases.map(function (entry) {
        return entry.alias.replace(/[.*+?^{}()|[\]\\]/g, "\\$&");
      }).join("|") +
      ")(?=$|[^A-Za-z0-9])",
    "gi"
  );

  function colorizeText(value) {
    var rendered = escapeHtml(value).replace(aliasPattern, function (match, prefix, text) {
      var id = aliasToId[text.toLowerCase()];
      return prefix + renderName(id, text);
    });
    var state = window.dendryUI && window.dendryUI.dendryEngine && window.dendryUI.dendryEngine.state;
    var qualities = state && state.qualities;
    if (!qualities) return rendered;
    var coalitions = [
      ["Grand Coalition", "grand"], ["Weimar Coalition", "weimar"],
      ["Popular Front", "popular"], ["Left Front", "left"],
      ["Minority government", "minority"]
    ];
    coalitions.forEach(function (entry) {
      var pattern = new RegExp(entry[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
      rendered = rendered.replace(pattern, function (label) {
        return renderCoalitionName(label, qualities, entry[1]);
      });
    });
    return rendered;
  }

  function coalitionPartners(qualities, type, shares) {
    var ids = Array.isArray(qualities.parties) ? qualities.parties.filter(getParty) : startingRoster;
    var members = [];
    function add(id) { if (members.indexOf(id) === -1) members.push(id); }
    var recorded = Array.isArray(qualities.government_parties) ? qualities.government_parties : [];
    recorded.forEach(function (value) {
      var key = String(value).toLowerCase();
      if (key === "union" || key === "cdu/csu" || key === "cdu + csu") add(qualities.union_unified ? "ucd" : "union");
      else if (key === "ucd" || key === "union christlicher democraten") add("ucd");
      else if (getParty(key)) add(key);
      else Object.keys(parties).some(function (id) {
        if (parties[id].name.toLowerCase() === key) { add(id); return true; }
        return false;
      });
    });
    if (!members.length) {
      var maps = {
        grand: ["union", "spd"],
        weimar: ["spd", "greens", "fdp"],
        popular: ["spd", "greens", "die_linke"],
        left: ["spd", "greens", "die_linke"],
        minority: ["spd"]
      };
      (maps[type] || []).forEach(add);
    }
    var alliance = qualities.union_alliance_active !== 0 && !qualities.union_unified &&
      ids.indexOf("cdu") !== -1 && ids.indexOf("csu") !== -1;
    if (members.indexOf("union") !== -1) members[members.indexOf("union")] = qualities.union_unified ? "ucd" : (alliance ? "union" : "cdu");
    if (alliance && members.indexOf("cdu") !== -1 && members.indexOf("csu") !== -1) {
      members.splice(members.indexOf("csu"), 1);
      members[members.indexOf("cdu")] = "union";
    }
    if (qualities.union_unified && (members.indexOf("cdu") !== -1 || members.indexOf("csu") !== -1)) {
      members = members.filter(function (id) { return id !== "cdu" && id !== "csu"; });
      add("ucd");
    }
    function share(id) {
      if (id === "union") return (shares.cdu || 0) + (shares.csu || 0);
      if (id === "ucd") return (shares.ucd || 0) || ((shares.cdu || 0) + (shares.csu || 0));
      return shares[id] || 0;
    }
    return members.sort(function (a, b) { return share(b) - share(a); });
  }

  function renderCoalitionName(label, qualities, type) {
    var members = coalitionPartners(qualities, type, getVoteShares(qualities));
    if (!members.length) return colorizeText(label);
    return String(label).split(/(\s+)/).map(function (word) {
      if (!word || /^\s+$/.test(word)) return escapeHtml(word);
      var letters = Array.from(word);
      var base = Math.floor(letters.length / members.length);
      var remainder = letters.length % members.length;
      var offset = 0;
      return members.map(function (id, index) {
        var length = base + (index === 0 ? remainder : 0);
        var segment = letters.slice(offset, offset + length).join("");
        offset += length;
        return segment ? renderName(id === "union" ? "cdu" : id, segment) : "";
      }).join("");
    }).join("");
  }

  function ensureRelations(qualities) {
    qualities.party_relations = qualities.party_relations || {};
    startingRoster.forEach(function (first) {
      qualities.party_relations[first] = qualities.party_relations[first] || {};
      startingRoster.forEach(function (second) {
        if (first !== second && qualities.party_relations[first][second] === undefined) {
          qualities.party_relations[first][second] = 50;
        }
      });
    });
  }

  var initialRelations = {
    die_linke: 65, greens: 65, fdp: 40, cdu: 35, csu: 30, afd: 0, other: 50
  };

  function ensurePolitics(qualities) {
    var needsInitialRelations = !qualities.party_relations_initialized;
    ensureRelations(qualities);
    if (needsInitialRelations) {
      startingRoster.forEach(function (id) {
        if (id !== "spd") {
          var value = initialRelations[id] === undefined ? 50 : initialRelations[id];
          qualities.party_relations.spd[id] = value;
          qualities.party_relations[id].spd = value;
        }
      });
      qualities.party_relations_initialized = 1;
    }
    qualities.union_alliance_active = qualities.union_alliance_active === undefined ? 1 : qualities.union_alliance_active;
    qualities.party_rightwing = qualities.party_rightwing || { cdu: 62, csu: 68, fdp: 58, ucd: 65 };
    qualities.afd_coalitions = qualities.afd_coalitions || { state: 0, national: 0 };
    if (qualities.firewall_integrity === undefined) qualities.firewall_integrity = 100;
    recalculateFirewall(qualities);
  }

  // Firewall formula (all inputs are measured on 0-100 scales):
  // 100 - AfD polling pressure - bourgeoisie right strength pressure
  //     - previous coalition penalties.
  // AfD polling costs 0.8 integrity per polling point (maximum 25 points).
  // Bourgeoisie right strength is vote-share-weighted rightwardness as a
  // bloc pressure input; it costs 0.5 per point (max 35). The displayed
  // Bourgeoisie Left-Right stat is the bloc's normalized weighted average.
  // Each prior state AfD coalition costs 8 (max 32); each national one costs 20 (max 40).
  function getFirewallInputs(qualities) {
    var shares = getVoteShares(qualities);
    var ideology = qualities.party_rightwing || {};
    var coalitions = qualities.afd_coalitions || {};
    var ids = Array.isArray(qualities.parties) ? qualities.parties : startingRoster;
    var bourgeoisieSupport = 0;
    var bourgeoisieWeightedRightness = 0;
    ["fdp", "cdu", "csu", "bvp", "ucd"].forEach(function (id) {
      if (ids.indexOf(id) !== -1) {
        var partySupport = Number(shares[id]) || 0;
        bourgeoisieSupport += partySupport;
        bourgeoisieWeightedRightness += partySupport * (Number(ideology[id]) || 0);
      }
    });
    var bourgeoisieRightness = bourgeoisieSupport ? bourgeoisieWeightedRightness / bourgeoisieSupport : 0;
    return {
      afdPolling: Number(shares.afd) || 0,
      bourgeoisieSupport: bourgeoisieSupport,
      bourgeoisieRightness: bourgeoisieRightness,
      bourgeoisieRightStrength: bourgeoisieWeightedRightness / 100,
      stateCoalitions: Math.max(0, Number(coalitions.state) || 0),
      nationalCoalitions: Math.max(0, Number(coalitions.national) || 0),
      rightWingScores: ideology
    };
  }

  function recalculateFirewall(qualities) {
    var inputs = getFirewallInputs(qualities);
    var afdPressure = Math.min(25, inputs.afdPolling * 0.8);
    var bourgeoisiePressure = Math.min(35, inputs.bourgeoisieRightStrength * 0.5);
    var stateCoalitionPressure = Math.min(32, inputs.stateCoalitions * 8);
    var nationalCoalitionPressure = Math.min(40, inputs.nationalCoalitions * 20);
    qualities.firewall_integrity = Math.max(0, Math.min(100, Math.round(
      100 - afdPressure - bourgeoisiePressure - stateCoalitionPressure - nationalCoalitionPressure
    )));
    qualities.firewall_inputs = {
      afd_polling: Math.round(inputs.afdPolling * 10) / 10,
      bourgeoisie_right_strength: Math.round(inputs.bourgeoisieRightStrength * 10) / 10,
      bourgeoisie_rightness: Math.round(inputs.bourgeoisieRightness * 10) / 10,
      bourgeoisie_support: Math.round(inputs.bourgeoisieSupport * 10) / 10,
      state_coalitions: inputs.stateCoalitions,
      national_coalitions: inputs.nationalCoalitions
    };
    return qualities.firewall_integrity;
  }

  function getNationalCoalitionChance(qualities) {
    ensurePolitics(qualities);
    var inputs = getFirewallInputs(qualities);
    if (qualities.firewall_integrity > 35) return 0;
    var rightWingScores = inputs.rightWingScores;
    var highestRightScore = Math.max(Number(rightWingScores.cdu) || 0,
      Number(rightWingScores.csu) || 0, Number(rightWingScores.fdp) || 0,
      Number(rightWingScores.ucd) || 0, Number(rightWingScores.bvp) || 0);
    var chance = (35 - qualities.firewall_integrity) * 2 +
      Math.max(0, inputs.afdPolling - 10) * 1.5 +
      Math.max(0, inputs.bourgeoisieRightStrength - 25) * 0.5 +
      Math.max(0, highestRightScore - 70) * 0.75;
    return Math.max(0, Math.min(85, Math.round(chance)));
  }

  function setUnionAlliance(qualities, active) {
    qualities.union_alliance_active = active ? 1 : 0;
    if (active) qualities.union_unified = 0;
  }

  function setUnionState(qualities, state) {
    if (state === "unified") {
      qualities.union_alliance_active = 0;
      qualities.union_unified = 1;
    } else if (state === "split") {
      qualities.union_alliance_active = 0;
      qualities.union_unified = 0;
    } else {
      qualities.union_alliance_active = 1;
      qualities.union_unified = 0;
    }
  }

  function adjustRightWing(qualities, partyId, delta) {
    ensurePolitics(qualities);
    if (qualities.party_rightwing[partyId] === undefined) return;
    qualities.party_rightwing[partyId] = Math.max(0, Math.min(100,
      Number(qualities.party_rightwing[partyId]) + Number(delta || 0)));
    recalculateFirewall(qualities);
  }

  function canFormCoalition(qualities, partyIds, level) {
    ensurePolitics(qualities);
    if (partyIds.indexOf("afd") === -1) return true;
    var relevant = partyIds.filter(function (id) { return ["cdu", "csu", "fdp", "ucd"].indexOf(id) !== -1; });
    if (!relevant.length) return false;
    if (level !== "national") return true;
    return Number(qualities.firewall_integrity) <= 35;
  }

  function recordCoalition(qualities, partyIds, level) {
    ensurePolitics(qualities);
    if (partyIds.indexOf("afd") === -1 || partyIds.length < 2) return;
    level = level === "national" ? "national" : "state";
    qualities.afd_coalitions[level] = (Number(qualities.afd_coalitions[level]) || 0) + 1;
    recalculateFirewall(qualities);
  }

  function getBourgeoisieAfdRelation(qualities) {
    var ids = Array.isArray(qualities.parties) ? qualities.parties : startingRoster;
    var shares = getVoteShares(qualities);
    var candidates = ["fdp", "cdu", "csu", "bvp", "ucd"];
    var totalWeight = 0;
    var weightedRelation = 0;
    candidates.forEach(function (id) {
      if (ids.indexOf(id) === -1) return;
      var weight = Number(shares[id]) || 0;
      if (weight <= 0) return;
      weightedRelation += relationValue(qualities, id, "afd") * weight;
      totalWeight += weight;
    });
    return totalWeight ? weightedRelation / totalWeight : 50;
  }

  function relationDescription(value) {
    if (value <= 20) return "Hostile";
    if (value <= 40) return "Strained";
    if (value <= 60) return "Neutral";
    if (value <= 80) return "Cooperative";
    return "Ally";
  }

  function relationColor(value) {
    return "hsl(" + (120 * Math.max(0, Math.min(100, value)) / 100) + ", 68%, 38%)";
  }

  function ideologyDescription(value) {
    if (value <= 20) return "Left Dominant";
    if (value <= 40) return "Left leaning";
    if (value <= 60) return "Balanced";
    if (value <= 80) return "Right leaning";
    return "Right Dominant";
  }

  function ideologyColor(value) {
    value = Math.max(0, Math.min(100, Number(value) || 0));
    var hue = value <= 50 ? 210 : 0;
    var saturation = Math.abs(value - 50) * 1.3;
    return "hsl(" + hue + ", " + saturation + "%, 42%)";
  }

  function relationValue(qualities, first, second) {
    var matrix = qualities.party_relations || {};
    var value = matrix[first] && matrix[first][second];
    if (value === undefined && matrix[second]) value = matrix[second][first];
    if (value === undefined && (first === "ucd" || second === "ucd")) {
      var other = first === "ucd" ? second : first;
      return (relationValue(qualities, "cdu", other) + relationValue(qualities, "csu", other)) / 2;
    }
    return value === undefined ? 50 : Math.max(0, Math.min(100, Number(value) || 0));
  }

  function trackRelationTrend(qualities, key, value) {
    var previous = qualities.party_relation_previous || (qualities.party_relation_previous = {});
    var trends = qualities.party_relation_trends || (qualities.party_relation_trends = {});
    var turn = [qualities.year, qualities.month, qualities.time, qualities.month_actions].join(":");
    var turns = qualities.party_relation_turns || (qualities.party_relation_turns = {});
    if (previous[key] === undefined) {
      previous[key] = value;
      trends[key] = "same";
      turns[key] = turn;
    } else if (turns[key] !== turn || previous[key] !== value) {
      trends[key] = value > previous[key] ? "up" : value < previous[key] ? "down" : "same";
      previous[key] = value;
      turns[key] = turn;
    }
    return trends[key] || "same";
  }

  function firewallDescription(value) {
    if (value >= 80) return "Strong";
    if (value >= 60) return "Under pressure";
    if (value >= 40) return "Weak";
    if (value > 0) return "Near collapse";
    return "Collapsed";
  }

  function setRelation(qualities, first, second, value) {
    if (!getParty(first) || !getParty(second) || first === second) return;
    ensureRelations(qualities);
    value = Math.max(0, Math.min(100, Number(value) || 0));
    qualities.party_relations[first][second] = value;
    qualities.party_relations[second][first] = value;
  }

  function adjustRelation(qualities, first, second, delta) {
    ensureRelations(qualities);
    var current = qualities.party_relations[first] && qualities.party_relations[first][second];
    setRelation(qualities, first, second, (current === undefined ? 50 : current) + delta);
  }

  function getVoteShares(qualities) {
    var ids = Array.isArray(qualities.parties) ? qualities.parties.filter(getParty) : startingRoster;
    var result = {};
    var totalWeight = 0;
    ids.forEach(function (id) { result[id] = 0; });
    (qualities.classes || []).forEach(function (group) {
      var weight = Math.max(0, Number(qualities[group]) || 0);
      var total = 0;
      ids.forEach(function (id) {
        total += Math.max(0, Number(qualities[group + '_' + id]) || 0);
      });
      if (weight && total) {
        ids.forEach(function (id) {
          result[id] += weight * Math.max(0, Number(qualities[group + '_' + id]) || 0) / total;
        });
        totalWeight += weight;
      }
    });
    if (!totalWeight) {
      ids.forEach(function (id) { result[id] = startingShares[id] || 0; });
      totalWeight = ids.reduce(function (sum, id) { return sum + result[id]; }, 0) || 1;
    }
    ids.forEach(function (id) { result[id] = 100 * result[id] / totalWeight; });
    return applyStreetVoteEffects(result, qualities, ids);
  }

  function ensureStreetState(qualities) {
    var defaults = {
      right_wing_agitation: 45,
      grassroots_mobilization: 45,
      left_wing_militancy: 10,
      verfassungsschutz_focus: 0
    };
    Object.keys(defaults).forEach(function (key) {
      var value = Number(qualities[key]);
      if (!isFinite(value)) value = defaults[key];
      qualities[key] = key === "verfassungsschutz_focus" ?
        Math.max(-100, Math.min(100, value)) : Math.max(0, Math.min(100, value));
    });
    return qualities;
  }

  function applyStreetVoteEffects(shares, qualities, ids) {
    if (qualities.historical_mode) return shares;
    ensureStreetState(qualities);
    var swing = Math.max(-2, Math.min(2,
      (qualities.grassroots_mobilization - qualities.right_wing_agitation) / 25));
    var militancyBacklash = Math.max(0, qualities.left_wing_militancy - 35) * 0.025;
    var farLeftFocusPenalty = Math.max(0, -qualities.verfassungsschutz_focus) * 0.005;
    var farRightFocusPenalty = Math.max(0, qualities.verfassungsschutz_focus) * 0.005;
    if (ids.indexOf("spd") !== -1) {
      shares.spd = Math.max(0, (shares.spd || 0) + swing - militancyBacklash - farLeftFocusPenalty);
    }
    if (ids.indexOf("afd") !== -1) {
      shares.afd = Math.max(0, (shares.afd || 0) - swing * 0.5 - farRightFocusPenalty);
    }
    var total = ids.reduce(function (sum, id) { return sum + (shares[id] || 0); }, 0) || 1;
    ids.forEach(function (id) { shares[id] = 100 * (shares[id] || 0) / total; });
    return shares;
  }

  function getPollingEntries(qualities, shares) {
    var ids = Array.isArray(qualities.parties) ? qualities.parties.filter(getParty) : startingRoster;
    var unified = !!qualities.union_unified || ids.indexOf("ucd") !== -1;
    var alliance = qualities.union_alliance_active !== 0 && ids.indexOf("cdu") !== -1 && ids.indexOf("csu") !== -1;
    var used = {};
    var entries = [];
    if (unified) {
      var unionShare = ids.indexOf("ucd") !== -1 ? (shares.ucd || 0) : (shares.cdu || 0) + (shares.csu || 0);
      entries.push({ id: "ucd", label: "UCD", share: unionShare });
      used.ucd = used.cdu = used.csu = true;
    } else if (alliance) {
      entries.push({ id: "cdu", label: "CDU + CSU", share: (shares.cdu || 0) + (shares.csu || 0) });
      used.cdu = used.csu = true;
    }
    ids.forEach(function (id) {
      if (used[id]) return;
      entries.push({ id: id, label: id === "other" ? "Other (smaller parties)" : parties[id].name, share: shares[id] || 0 });
    });
    var order = { die_linke: 10, bsw: 15, spd: 20, greens: 30, cdu: 40, csu: 40, ucd: 40, fdp: 50, afd: 60, other: 70 };
    entries.sort(function (a, b) { return (order[a.id] || 45) - (order[b.id] || 45); });
    return entries;
  }

  function allocateParliamentSeats(entries, seatTotal) {
    var eligible = entries.filter(function (entry) { return entry.id !== "other" && entry.share >= 5; });
    var eligibleVotes = eligible.reduce(function (sum, entry) { return sum + entry.share; }, 0);
    var seats = {};
    var fractions = [];
    var assigned = 0;
    if (eligibleVotes > 0) {
      eligible.forEach(function (entry) {
        var exact = entry.share / eligibleVotes * seatTotal;
        var whole = Math.floor(exact);
        seats[entry.id] = whole;
        assigned += whole;
        fractions.push({ id: entry.id, remainder: exact - whole });
      });
      fractions.sort(function (a, b) { return b.remainder - a.remainder; });
      for (var i = 0; i < seatTotal - assigned; i++) {
        seats[fractions[i % fractions.length].id]++;
      }
    }
    return { entries: entries, eligible: eligible, seats: seats, seatTotal: seatTotal };
  }

  function renderParliamentChart(projection) {
    if (!projection.eligible.length) return '<p class="parliament-empty">No party currently reaches the 5% threshold.</p>';
    var rows = 9;
    var radii = [];
    for (var r = 0; r < rows; r++) radii.push(76 + r * 16);
    var radiusTotal = radii.reduce(function (sum, radius) { return sum + radius; }, 0);
    var rowCounts = radii.map(function (radius) { return Math.floor(projection.seatTotal * radius / radiusTotal); });
    var leftToAssign = projection.seatTotal - rowCounts.reduce(function (sum, count) { return sum + count; }, 0);
    for (var extra = 0; extra < leftToAssign; extra++) rowCounts[rows - 1 - (extra % rows)]++;
    var seats = [];
    radii.forEach(function (radius, row) {
      var count = rowCounts[row];
      for (var index = 0; index < count; index++) {
        var angle = Math.PI - (index + 0.5) * Math.PI / count;
        seats.push({ angle: angle, radius: radius });
      }
    });
    seats.sort(function (a, b) { return b.angle - a.angle || b.radius - a.radius; });
    var orderedParties = projection.eligible.slice();
    var partyIndex = 0;
    var partySeatsLeft = projection.seats[orderedParties[0].id] || 0;
    var darkMode = typeof document !== "undefined" && document.body.classList.contains("dark-mode");
    var circles = seats.map(function (seat) {
      while (partySeatsLeft <= 0 && partyIndex < orderedParties.length - 1) {
        partyIndex++;
        partySeatsLeft = projection.seats[orderedParties[partyIndex].id] || 0;
      }
      var entry = orderedParties[partyIndex];
      partySeatsLeft--;
      var party = parties[entry.id];
      var color = (darkMode && (entry.id === "cdu" || entry.id === "csu" || entry.id === "ucd")) ? "#f2f2f2" : party.color;
      var x = 240 + seat.radius * Math.cos(seat.angle);
      var y = 238 - seat.radius * Math.sin(seat.angle);
      return '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="3.05" fill="' + escapeHtml(color) +
        '" stroke="' + (entry.id === "cdu" || entry.id === "csu" || entry.id === "ucd" ? "#777" : "rgba(0,0,0,.25)") +
        '" stroke-width=".55"><title>' + escapeHtml(entry.label) + ': ' + projection.seats[entry.id] + ' seats</title></circle>';
    }).join('');
    return '<svg class="poll-parliament-chart" viewBox="0 0 480 250" role="img" aria-label="Projected parliament with ' +
      projection.seatTotal + ' seats"><title>Projected parliament</title><path d="M42 238 A198 198 0 0 1 438 238" class="parliament-outline" />' +
      circles + '</svg>';
  }

  function renderPollRows(qualities, projection) {
    var sortedEntries = projection.entries.slice().sort(function (a, b) { return b.share - a.share; });
    return '<ul class="party-list">' + sortedEntries.map(function (entry) {
      var share = entry.share;
      var status = entry.id === "other" ? "Aggregate only; not allocated as a party" :
        share < 5 ? "Below 5% threshold" : (projection.seats[entry.id] || 0) + " projected seats";
      return '<li class="party-row"><div class="party-row-heading">' + renderName(entry.id, entry.label) +
        '<span class="party-percent">' + share.toFixed(1) + '%</span></div><div class="party-meter"><span style="width:' +
        share.toFixed(2) + '%;--party-color:' + escapeHtml(parties[entry.id].color) + '"></span></div>' +
        '<div class="poll-seat-status">' + escapeHtml(status) + '</div></li>';
    }).join('') + '</ul>';
  }

  function renderMain(qualities) {
    var monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    var month = Number(qualities.month) || 0;
    var electionMonth = Number(qualities.next_election_month) || 0;
    var shares = getVoteShares(qualities);
    var position = qualities.spd_toleration ? "Tolerating the government" :
      qualities.spd_in_government ? "In government" : qualities.spd_caretaker ? "Caretaker government" : "In opposition";
    var coalitionType = qualities.in_grand_coalition ? "grand" : qualities.in_weimar_coalition ? "weimar" :
      qualities.in_popular_front ? "popular" : qualities.in_left_front ? "left" :
      qualities.in_minority_government ? "minority" : "";
    var govType = coalitionType === "grand" ? "Grand Coalition" : coalitionType === "weimar" ? "Weimar Coalition" :
      coalitionType === "popular" ? "Popular Front" : coalitionType === "left" ? "Left Front" :
      coalitionType === "minority" ? "Minority government" : qualities.chancellor ? "Government" : "Not formed";
    function officeHolder(name, partyId) {
      if (!name) return "Not set";
      if (!partyId) return name;
      var known = window.partySystem && window.partySystem.get(String(partyId).toLowerCase());
      return name + " (" + (known ? known.name : partyId) + ")";
    }
    var chancellor = officeHolder(qualities.chancellor, qualities.chancellor_party);
    var president = officeHolder(qualities.president, qualities.president_party);
    function row(label, value) {
      var colorize = window.partySystem ? window.partySystem.colorizeText : escapeHtml;
      return '<div class="main-status-row"><strong>' + colorize(label) + '</strong><span>' + colorize(value) + '</span></div>';
    }
    var currentDate = (monthNames[month - 1] || (month ? String(month) : "Month not set")) + " " + (qualities.year || "Year not set");
    var electionDate = electionMonth ? (monthNames[electionMonth - 1] || electionMonth) + " " + (qualities.next_election_year || "") : "Not scheduled";
    return '<section class="party-panel main-status"><h3>Political situation</h3>' +
      row("Next election", electionDate) + '<div class="main-status-row"><strong>Government</strong><span>' +
      (coalitionType ? renderCoalitionName(govType, qualities, coalitionType) : colorizeText(govType)) +
      '</span></div>' + row("Chancellor", chancellor) +
      row("President", president) + row("SPD position", position) +
      row("Coalition dissent", (qualities.coalition_dissent === undefined ? 0 : qualities.coalition_dissent)) +
      row("SPD faction dissent", (qualities.dissent_percent === undefined ? (qualities.dissent || 0) : qualities.dissent_percent) + "%") +
      '<hr><h3>Party and resources</h3>' + row("SPD polling", (shares.spd || 0).toFixed(1) + "%") +
      row("Resources available", qualities.resources === undefined ? 0 : qualities.resources) +
      '<hr><h3>Time</h3>' + row("Month / year", currentDate) + '</section>';
  }

  function renderMinisterRoster(qualities) {
    var ministries = [
      ["Foreign Affairs", "foreign_minister", "foreign_minister_party"],
      ["Interior", "interior_minister", "interior_minister_party"],
      ["Justice", "justice_minister", "justice_minister_party"],
      ["Labour & Social Affairs", "labor_minister", "labor_minister_party"],
      ["Defence", "defense_minister", "defense_minister_party"],
      ["Economic Affairs", "economic_minister", "economic_minister_party"],
      ["Finance", "finance_minister", "finance_minister_party"],
      ["Health", "health_minister", "health_minister_party"],
      ["Environment", "environment_minister", "environment_minister_party"],
      ["Transport & Infrastructure", "transport_minister", "transport_minister_party"],
      ["Education & Research", "education_minister", "education_minister_party"]
    ];
    return '<ul class="cabinet-roster">' + ministries.map(function (ministry) {
      var party = String(qualities[ministry[2]] || "");
      var partyId = party.toLowerCase();
      return '<li><strong>' + escapeHtml(ministry[0]) + '</strong><span>' +
        escapeHtml(qualities[ministry[1]] || 'Vacant') + (party ? ' (' + (getParty(partyId) ? renderName(partyId, party) : escapeHtml(party)) + ')' : '') +
        '</span></li>';
    }).join('') + '</ul>';
  }

  function streetMetric(label, value, color, description) {
    return '<div class="street-metric"><div class="street-metric-heading"><strong>' + escapeHtml(label) +
      '</strong><span>' + Math.round(value) + ' / 100</span></div><div class="street-meter" role="img" aria-label="' +
      escapeHtml(label + ': ' + Math.round(value) + ' out of 100') + '"><span style="width:' + value +
      '%;--street-color:' + color + '"></span></div><p>' + escapeHtml(description) + '</p></div>';
  }

  function focusDescription(value) {
    if (value <= -60) return 'Far-left targeted';
    if (value <= -20) return 'Leaning toward far-left scrutiny';
    if (value < 20) return 'Balanced';
    if (value < 60) return 'Leaning toward far-right scrutiny';
    return 'Far-right targeted';
  }

  function renderStreetPanel(qualities) {
    if (qualities.historical_mode) {
      var legacyRows = [
        ['Reichsbanner', qualities.rb_strength, qualities.rb_militancy],
        ['RFB', qualities.rfb_strength, qualities.rfb_militancy],
        ['Stahlhelm', qualities.sh_strength, qualities.sh_militancy],
        ['SA', qualities.sa_strength, qualities.sa_militancy]
      ];
      return '<section class="party-panel street-panel"><h3>Historical street organizations</h3><p>Historical mode keeps the original paramilitary measures.</p><ul class="party-list">' +
        legacyRows.map(function (row) { return '<li class="street-legacy-row"><strong>' + escapeHtml(row[0]) + '</strong><span>' +
          (Number(row[1]) || 0) + ' strength · ' + (Number(row[2]) || 0) + ' militancy</span></li>'; }).join('') +
        '</ul><p>Reichswehr: ' + (Number(qualities.reichswehr_strength) || 0) + ' · Prussian police: ' +
        (Number(qualities.prussian_police_strength) || 0) + '</p></section>';
    }
    ensureStreetState(qualities);
    var focus = qualities.verfassungsschutz_focus;
    var focusPosition = ((focus + 100) / 2).toFixed(1);
    var swing = Math.max(-2, Math.min(2,
      (qualities.grassroots_mobilization - qualities.right_wing_agitation) / 25));
    var backlash = Math.max(0, qualities.left_wing_militancy - 35) * 0.025;
    return '<section class="party-panel street-panel"><h3>Street and civil society</h3>' +
      streetMetric('Right-wing agitation', qualities.right_wing_agitation, '#b94b42', 'Far-right street pressure and intimidation. Higher values strengthen the AfD’s polling position.') +
      streetMetric('Grassroots mobilization', qualities.grassroots_mobilization, '#39833b', 'The SPD’s ability to organize unions, civic groups, and peaceful democratic counter-protests.') +
      streetMetric('Left-wing militancy', qualities.left_wing_militancy, '#8a4b83', 'Militant activity can disrupt far-right mobilization, but high levels alienate moderate voters and strain cooperation.') +
      '<div class="street-metric"><div class="street-metric-heading"><strong>Verfassungsschutz and police focus</strong><span>' +
      (focus > 0 ? '+' : '') + Math.round(focus) + ' · ' + escapeHtml(focusDescription(focus)) +
      '</span></div><div class="street-focus-meter" role="img" aria-label="Security focus: ' + escapeHtml(focusDescription(focus)) + '"><span style="left:' + focusPosition + '%"></span></div>' +
      '<div class="street-focus-labels"><span>Far-left targeted</span><span>Balanced</span><span>Far-right targeted</span></div>' +
      '<p>Negative values put more scrutiny on the far-left; positive values put more scrutiny on the far-right.</p></div>' +
      '<p class="street-impact">Current polling effect: grassroots versus right-wing agitation shifts up to 2 points between the SPD and AfD. Militancy above 35 and far-left security focus can reduce SPD support; far-right focus can reduce AfD support.</p>' +
      '</section>';
  }

  function renderSidebar(sceneId, qualities) {
    if (!qualities) return null;
    if (sceneId === 'status.street') return renderStreetPanel(qualities);
    if (sceneId === 'status.polls') {
      var shares = getVoteShares(qualities);
      var entries = getPollingEntries(qualities, shares);
      var projection = allocateParliamentSeats(entries, 598);
      return '<section class="party-panel polls-panel"><h3>Projected parliament</h3>' +
        '<p>Illustrative 598-seat distribution from current polling. Only parties reaching 5% receive seats.</p>' +
        renderParliamentChart(projection) + '<h3>Projected election results</h3>' +
        renderPollRows(qualities, projection) + '</section>';
    }
    if (sceneId === 'status') return renderMain(qualities);
    if (sceneId === 'status.politics') {
      var ids = Array.isArray(qualities.parties) ? qualities.parties.filter(getParty) : startingRoster;
      ensurePolitics(qualities);
      var unionTogether = qualities.union_alliance_active !== 0 && !qualities.union_unified && ids.indexOf("cdu") !== -1 && ids.indexOf("csu") !== -1;
      var unionUnified = !!qualities.union_unified || ids.indexOf("ucd") !== -1;
      var relationEntries = [];
      ids.forEach(function (id) {
        if (id === "spd" || id === "other" || (unionTogether && id === "csu") ||
            (unionUnified && (id === "cdu" || id === "csu"))) return;
        if (!unionTogether && !unionUnified && id === "csu") return;
        if (unionUnified && id === "ucd") {
          relationEntries.push({ id: "ucd", label: "UCD", key: "ucd", value: relationValue(qualities, "spd", "ucd") });
          return;
        }
        if (unionTogether && id === "cdu") {
          relationEntries.push({ id: "cdu", label: "CDU + CSU", key: "union", value: (relationValue(qualities, "spd", "cdu") + relationValue(qualities, "spd", "csu")) / 2 });
          return;
        }
        relationEntries.push({ id: id, label: parties[id].name, key: id, value: relationValue(qualities, "spd", id) });
      });
      if (unionUnified && !relationEntries.some(function (entry) { return entry.id === "ucd"; })) {
        relationEntries.push({ id: "ucd", label: "UCD", key: "ucd", value: (relationValue(qualities, "spd", "cdu") + relationValue(qualities, "spd", "csu")) / 2 });
      }
      var relations = relationEntries.map(function (entry) {
        var value = entry.value;
        var color = relationColor(value);
        var trend = trackRelationTrend(qualities, entry.key, value);
        var arrow = trend === "up" ? "↑" : trend === "down" ? "↓" : "−";
        var trendColor = trend === "up" ? "#287a38" : trend === "down" ? "#b3261e" : "#777";
        return '<li class="politics-relation"><div class="politics-relation-heading">' + renderName(entry.id, entry.label) +
          '<span class="relation-status" style="color:' + color + '">' + Math.round(value) + ' · ' + relationDescription(value) +
          ' <span class="relation-trend" title="Change since the previous turn" style="color:' + trendColor + '">' + arrow + '</span></span></div>' +
          '<div class="party-meter"><span style="width:' + value + '%;--party-color:' + color + '"></span></div></li>';
      }).join('');
      var firewall = recalculateFirewall(qualities);
      var ideology = qualities.party_rightwing || {};
      var bourgeoisieInputs = getFirewallInputs(qualities);
      var bourgeoisieRightStrength = bourgeoisieInputs.bourgeoisieRightness;
      var bourgeoisieRelation = getBourgeoisieAfdRelation(qualities);
      return '<section class="party-panel politics-panel"><h3>SPD relations</h3>' +
        '<ul class="party-list politics-relations">' + relations + '</ul>' +
        '<hr><h3>SPD factions</h3><p class="faction-note">Strength shows relative faction influence; dissent is the weighted average of each faction’s existing dissent tracks.</p>' + renderFactionRows(qualities) +
        '<details class="politics-details cabinet-details"><summary>Cabinet ministers</summary>' + renderMinisterRoster(qualities) + '</details>' +
        '<hr><h3>Firewall integrity</h3><div class="firewall-score"><strong>' + firewall + ' / 100</strong>' +
        '<span>' + firewallDescription(firewall) + '</span></div><div class="firewall-meter"><span style="width:' + firewall + '%"></span></div>' +
        '<details class="politics-details"' + (detailsExpanded ? ' open' : '') + '><summary>Details</summary>' +
        '<div class="firewall-detail-stats">' +
        '<p><strong><span class="bourgeoisie-label">Bourgeoisie</span> Left–Right:</strong> <span style="color:' + ideologyColor(bourgeoisieRightStrength) + '">' +
        Math.round(bourgeoisieRightStrength) + ' / 100 · ' + ideologyDescription(bourgeoisieRightStrength) + '</span></p>' +
        '<p><strong><span class="bourgeoisie-label">Bourgeoisie</span>–AfD relations:</strong> <span style="color:' + relationColor(bourgeoisieRelation) + '">' +
        Math.round(bourgeoisieRelation) + ' · ' + relationDescription(bourgeoisieRelation) + '</span></p>' +
        '</div></details></section>';
    }
    return null;
  }

  function initializeElection(qualities) {
    qualities.parties = startingRoster.slice();
    if (!Array.isArray(qualities.classes)) {
      qualities.classes = [
        "workers", "old_middle", "new_middle", "rural", "unemployed", "catholics"
      ];
    }
    qualities.classes.forEach(function (group) {
      startingRoster.forEach(function (id) {
        qualities[group + "_" + id] = startingShares[id];
      });
    });
    ensurePolitics(qualities);

    // Opening government for the modern starting scenario.
    qualities.chancellor = "Angela Merkel";
    qualities.chancellor_party = "CDU";
    qualities.president = "Frank-Walter Steinmeier";
    qualities.president_party = "SPD";
    qualities.spd_in_government = 1;
    qualities.spd_toleration = 0;
    qualities.spd_caretaker = 0;
    qualities.in_grand_coalition = 1;
    qualities.in_weimar_coalition = 0;
    qualities.in_popular_front = 0;
    qualities.in_left_front = 0;
    qualities.in_spd_majority = 0;
    qualities.in_minority_government = 0;
    qualities.in_emergency_government = 0;
    qualities.government_parties = ["SPD", "CDU", "CSU"];
    qualities.union_alliance_active = 1;
  }

  window.partySystem = {
    parties: parties,
    factions: spdFactions,
    startingRoster: startingRoster.slice(),
    startingShares: Object.assign({}, startingShares),
    plannedTransitions: plannedTransitions,
    get: getParty,
    name: function (id) {
      var party = getParty(id);
      return party ? party.name : id;
    },
    color: function (id) {
      var party = getParty(id);
      return party ? party.color : "#777777";
    },
    activeIds: function () {
      return startingRoster.slice();
    },
    initializeElection: initializeElection,
    setRelation: setRelation,
    adjustRelation: adjustRelation,
    setUnionAlliance: setUnionAlliance,
    setUnionState: setUnionState,
    adjustRightWing: adjustRightWing,
    recalculateFirewall: recalculateFirewall,
    getFirewallInputs: getFirewallInputs,
    getNationalCoalitionChance: getNationalCoalitionChance,
    canFormCoalition: canFormCoalition,
    recordCoalition: recordCoalition,
    getVoteShares: getVoteShares,
    renderSidebar: renderSidebar,
    setDetailsExpanded: function (expanded) { detailsExpanded = !!expanded; },
    renderName: renderName,
    colorizeText: colorizeText
  };
}(window));
