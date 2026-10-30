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
      pollingSensitivity: { growth: 0.025, inflation: 0.035, unemployment: 0.075, governmentTrust: 0.055, polarization: 0.055 },
      aliases: ["Die Linke", "Linke", "Socialist", "Socialists"]
    },
    greens: {
      name: "Greens",
      fullName: "Alliance 90/The Greens",
      color: "#39833b",
      status: "active",
      pollingSensitivity: { growth: 0.045, inflation: -0.035, unemployment: -0.035, governmentTrust: 0.055, polarization: -0.04 },
      aliases: ["Greens", "Green Party", "Bündnis 90/Die Grünen", "left-liberal Greens", "Die Grünen", "Social-Liberal"]
    },
    spd: {
      name: "SPD",
      fullName: "Social Democratic Party of Germany",
      color: "#e3000f",
      status: "active",
      pollingSensitivity: { growth: 0.055, inflation: -0.075, unemployment: -0.08, governmentTrust: 0.075, polarization: -0.025 },
      aliases: ["SPD", "Social Democrats"]
    },
    fdp: {
      name: "FDP",
      fullName: "Free Democratic Party",
      color: "#9a7900",
      status: "active",
      pollingSensitivity: { growth: 0.075, inflation: -0.065, unemployment: -0.045, governmentTrust: 0.045, polarization: -0.025 },
      aliases: ["FDP", "Market-Liberal", "Market-Liberals"]
    },
    cdu: {
      name: "CDU",
      fullName: "Christian Democratic Union of Germany",
      color: "#171717",
      status: "active",
      parliamentaryGroup: "union",
      pollingSensitivity: { growth: 0.055, inflation: -0.065, unemployment: -0.055, governmentTrust: 0.065, polarization: -0.035 },
      aliases: ["CDU", "CDU/CSU", "Conservative", "Conservatives"]
    },
    csu: {
      name: "CSU",
      fullName: "Christian Social Union in Bavaria",
      color: "#171717",
      status: "active",
      parliamentaryGroup: "union",
      pollingSensitivity: { growth: 0.055, inflation: -0.065, unemployment: -0.055, governmentTrust: 0.065, polarization: -0.035 },
      aliases: ["CSU"]
    },
    afd: {
      name: "AfD",
      fullName: "Alternative for Germany",
      color: "#168ac4",
      status: "active",
      pollingSensitivity: { growth: -0.035, inflation: 0.09, unemployment: 0.105, governmentTrust: 0.09, polarization: 0.09 },
      aliases: ["AfD", "far-right", "Far-Right", "Far Right", "Right-Wing Populist", "Right-Wing Populists"]
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
      aliases: ["UCD", "Union Christlicher Democraten", "Conservatives", "Christian Democrats", "Union"]
    }
  };

  // Current SPD faction identities mapped onto the existing faction-strength
  // tracks so past choices continue to move influence without old labels in UI.
  var spdFactions = [
    {
      id: "seeheimer_kreis",
      name: "Seeheimer Kreis (Seeheim Circle)",
      strengthTracks: [{ key: "center_strength", dissentKey: "center_dissent", weight: 1 }, { key: "reformist_strength", dissentKey: "reformist_dissent", weight: 0.5 }],
      color: "#9a7900"
    },
    {
      id: "parlamentarische_linke",
      name: "Parlamentarische Linke (Parliamentary Left)",
      strengthTracks: [{ key: "left_strength", dissentKey: "left_dissent", weight: 1 }, { key: "labor_strength", dissentKey: "labor_dissent", weight: 1 }],
      color: "#e3000f"
    },
    {
      id: "netzwerk_berlin",
      name: "Netzwerk Berlin (Berlin Network)",
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
      return '<li class="faction-row"><div class="faction-heading"><strong>' + escapeHtml(faction.name) +
        '</strong></div><div class="faction-stats"><span class="faction-stat">Strength <b>' + strength.toFixed(0) +
        '%</b></span><span class="faction-stat">Dissent <b>' + dissent.toFixed(2) + '%</b></span></div></li>';
    }).join('');
    return '<div class="faction-strength-distribution" role="img" aria-label="Faction strength distribution">' + segments +
      '</div><ul class="party-list faction-list">' + rows + '</ul>';
  }

  var startingRoster = [
    "die_linke", "greens", "spd", "fdp", "cdu", "csu", "afd", "other"
  ];

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
      ["Grand Coalition", "grandLabel"], ["Jamaica Coalition", "jamaicaLabel"],
      ["Kenya Coalition", "kenyaLabel"], ["Leftist Coalition", "leftistLabel"],
      ["Left Coalition", "leftistLabel"],
      ["Right Coalition", "rightLabel"], ["Bourgeoisie Coalition", "bourgeoisieLabel"],
      ["Traffic Light Coalition", "trafficLightLabel"],
      ["Deutschland Coalition", "deutschlandLabel"],
      ["Weimar Coalition", "weimar"], ["Popular Front", "popular"],
      ["Left Front", "left"], ["Minority government", "minorityLabel"]
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
        deutschland: ["spd", "union", "fdp"],
        kenya:["union", "spd", "greens"],
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

  function renderLetterColoredCoalition(label, segments) {
    var characters = Array.from(String(label));
    var output = [];
    var currentParty = null;
    var currentText = "";
    var letterIndex = 0;
    function flush() {
      if (!currentText) return;
      output.push(renderName(currentParty, currentText));
      currentParty = null;
      currentText = "";
    }
    characters.forEach(function (character) {
      if (/\s/.test(character)) {
        flush();
        output.push(escapeHtml(character));
        return;
      }
      var consumed = 0;
      var partyId = segments[segments.length - 1].party;
      for (var i = 0; i < segments.length; i++) {
        consumed += segments[i].letters;
        if (letterIndex < consumed) { partyId = segments[i].party; break; }
      }
      letterIndex++;
      if (currentParty !== partyId) flush();
      currentParty = partyId;
      currentText += character;
    });
    flush();
    return output.join("");
  }

  function renderCoalitionName(label, qualities, type) {
    var letterStyles = {
      grandLabel: [{ party: "cdu", letters: 5 }, { party: "spd", letters: 9 }],
      jamaicaLabel: [{ party: "cdu", letters: 5 }, { party: "greens", letters: 5 }, { party: "fdp", letters: 6 }],
      kenyaLabel: [{ party: "cdu", letters: 5 }, { party: "spd", letters: 5 }, { party: "greens", letters: 4 }],
      kenyaNoSpdLabel: [{ party: "cdu", letters: 5 }, { party: "greens", letters: 9 }],
      leftistLabel: [{ party: "spd", letters: 6 }, { party: "greens", letters: 6 }, { party: "die_linke", letters: 4 }],
      minorityLabel: [{ party: "spd", letters: 100 }],
      rightLabel: [{ party: "cdu", letters: 5 }, { party: "afd", letters: 9 }],
      bourgeoisieLabel: [{ party: "fdp", letters: 7 }, { party: "cdu", letters: 7 }, { party: "afd", letters: 6 }],
      trafficLightLabel: [{ party: "spd", letters: 7 }, { party: "fdp", letters: 5 }, { party: "greens", letters: 9 }],
      deutschlandLabel: [{ party: "cdu", letters: 7 }, { party: "spd", letters: 7 }, { party: "fdp", letters: 6 }]
    };
    var labelText = String(label);
    var styleType = type;
    if (/Grand Coalition/i.test(labelText)) styleType = "grandLabel";
    else if (/Jamaica Coalition/i.test(labelText)) styleType = "jamaicaLabel";
    else if (/Kenya Coalition/i.test(labelText)) styleType = (qualities.show_non_spd_coalitions ? "kenyaNoSpdLabel" : "kenyaLabel");
    else if (/Leftist Coalition/i.test(labelText)) styleType = "leftistLabel";
    else if (/Left Coalition/i.test(labelText)) {
      return renderLetterColoredCoalition(label, [
        { party: "spd", letters: 4 },
        { party: "greens", letters: 5 },
        { party: "die_linke", letters: 4 }
      ]);
    }
    else if (/Right Coalition/i.test(labelText)) styleType = "rightLabel";
    else if (/Bourgeoisie Coalition/i.test(labelText)) styleType = "bourgeoisieLabel";
    else if (/Minority government/i.test(labelText)) styleType = "minorityLabel";
    else if (/Traffic Light Coalition/i.test(labelText)) styleType = "trafficLightLabel";
    else if (/Deutschland Coalition/i.test(labelText)) styleType = "deutschlandLabel";
    if (letterStyles[styleType]) return renderLetterColoredCoalition(label, letterStyles[styleType]);
    var members = coalitionPartners(qualities, type, window.electionSystem.voteShares(qualities));
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
    die_linke: 40, greens: 80, fdp: 30, cdu: 55, csu: 55, afd: 10, other: 50
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
    if (!qualities._coalition_dissent_scaled) {
      var dissent = Number(qualities.coalition_dissent) || 0;
      // Each positive base unit adds 20 percentage points. Poor relations with
      // any coalition partner double the increase; good relations with all of
      // them halve it.
      Object.defineProperty(qualities, "coalition_dissent", {
        configurable: true,
        enumerable: true,
        get: function () { return dissent; },
        set: function (next) {
          next = Number(next) || 0;
          var delta = next - dissent;
          if (delta > 0) {
            var partners = Array.isArray(qualities.government_parties)
              ? qualities.government_parties.filter(function (id) { return String(id).toLowerCase() !== "spd"; })
              : [];
            var hasHostilePartner = partners.some(function (id) {
              return relationValue(qualities, "spd", id) < 30;
            });
            var allCooperative = partners.length > 0 && partners.every(function (id) {
              return relationValue(qualities, "spd", id) > 60;
            });
            delta *= hasHostilePartner ? 40 : (allCooperative ? 10 : 20);
          } else if (delta < 0) {
            delta *= 20;
          }
          dissent = Math.max(0, Math.min(100, dissent + delta));
        }
      });
      Object.defineProperty(qualities, "_coalition_dissent_scaled", {
        configurable: true, enumerable: false, value: 1
      });
    }
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
    var shares = window.electionSystem.voteShares(qualities);
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
    bourgeoisieRightness = Math.max(0, Math.min(100,
      bourgeoisieRightness + (Number(qualities.bourgeoisie_lr_adjustment) || 0)));
    return {
      afdPolling: Number(shares.afd) || 0,
      bourgeoisieSupport: bourgeoisieSupport,
      bourgeoisieRightness: bourgeoisieRightness,
      bourgeoisieRightStrength: bourgeoisieSupport * bourgeoisieRightness / 100,
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
    var streetPressure = 0;
    if (!qualities.historical_mode) {
      window.electionSystem.ensureStreetState(qualities);
      var focus = Number(qualities.verfassungsschutz_focus) || 0;
      streetPressure = Math.max(0, Math.min(15,
        (qualities.right_wing_agitation - qualities.grassroots_mobilization) * 0.08 +
        Math.max(0, qualities.left_wing_militancy - 35) * 0.08 + Math.abs(focus) * 0.04
      ));
    }
    qualities.firewall_integrity = Math.max(0, Math.min(100, Math.round(
      100 - afdPressure - bourgeoisiePressure - stateCoalitionPressure - nationalCoalitionPressure - streetPressure
    )));
    qualities.firewall_inputs = {
      afd_polling: Math.round(inputs.afdPolling * 10) / 10,
      bourgeoisie_right_strength: Math.round(inputs.bourgeoisieRightStrength * 10) / 10,
      bourgeoisie_rightness: Math.round(inputs.bourgeoisieRightness * 10) / 10,
      bourgeoisie_support: Math.round(inputs.bourgeoisieSupport * 10) / 10,
      state_coalitions: inputs.stateCoalitions,
      national_coalitions: inputs.nationalCoalitions,
      street_pressure: Math.round(streetPressure * 10) / 10
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
    var wasUnified = !!qualities.union_unified;
    var becomingUnified = state === "unified";
    var groups = Array.isArray(qualities.classes) ? qualities.classes : [];
    if (wasUnified !== becomingUnified) {
      groups.forEach(function (group) {
        var cduKey = group + "_cdu";
        var csuKey = group + "_csu";
        var ucdKey = group + "_ucd";
        if (becomingUnified) {
          qualities[ucdKey] = (Number(qualities[cduKey]) || 0) + (Number(qualities[csuKey]) || 0);
          delete qualities[cduKey];
          delete qualities[csuKey];
        } else {
          var unifiedSupport = Number(qualities[ucdKey]) || 0;
          qualities[cduKey] = unifiedSupport / 2;
          qualities[csuKey] = unifiedSupport / 2;
          delete qualities[ucdKey];
        }
      });
      var partyIds = Array.isArray(qualities.parties) ? qualities.parties.slice() : startingRoster.slice();
      partyIds = partyIds.filter(function (id) { return becomingUnified ? id !== "cdu" && id !== "csu" : id !== "ucd"; });
      if (becomingUnified) partyIds.push("ucd");
      else if (wasUnified) partyIds.push("cdu", "csu");
      qualities.parties = partyIds;
      if (Array.isArray(qualities.government_parties)) {
        var government = qualities.government_parties.map(function (id) {
          if (becomingUnified && (id === "cdu" || id === "csu")) return "ucd";
          if (!becomingUnified && id === "ucd") return "cdu";
          return id;
        });
        if (!becomingUnified && wasUnified && government.indexOf("cdu") !== -1) government.push("csu");
        qualities.government_parties = government.filter(function (id, index) { return government.indexOf(id) === index; });
      }
    }
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

  function adjustBourgeoisieRightness(qualities, delta) {
    ensurePolitics(qualities);
    qualities.bourgeoisie_lr_adjustment = Math.max(-100, Math.min(100,
      (Number(qualities.bourgeoisie_lr_adjustment) || 0) + Number(delta || 0)));
    recalculateFirewall(qualities);
  }

  function unionFutureStatus(qualities) {
    var shares = window.electionSystem.voteShares(qualities);
    var unionShare = qualities.union_unified
      ? (Number(shares.ucd) || 0)
      : (Number(shares.cdu) || 0) + (Number(shares.csu) || 0);
    var positions = qualities.party_rightwing || {};
    var unionScore = qualities.union_unified
      ? (Number(positions.ucd) || 65)
      : ((Number(positions.cdu) || 0) + (Number(positions.csu) || 0)) / 2;
    var afdRelation = (relationValue(qualities, "cdu", "afd") + relationValue(qualities, "csu", "afd")) / 2;
    var afdInGovernment = (Number((qualities.afd_coalitions || {}).national) || 0) > 0 ||
      (Array.isArray(qualities.government_parties) && qualities.government_parties.indexOf("afd") !== -1);
    var unify = unionShare < 20 && unionScore < 70;
    var split = unionScore >= 70 && afdRelation > 60;
    var pollsTriggered = unionShare < 25;
    var trigger = pollsTriggered || afdInGovernment;
    var eligible = !(Number(qualities.union_future_resolved) > 0) && !(Number(qualities.union_future_scheduled) > 0) && trigger &&
      (!(Number(qualities.union_future_status_quo) > 0) || unify || split);
    return {
      eligible: eligible,
      unify: unify,
      split: split,
      triggerReason: pollsTriggered ? "polls" : (afdInGovernment ? "afd_government" : "")
    };
  }

  function shouldShowUnionFuture(qualities) {
    return Number(qualities.modern_scenario) === 1 && !qualities.historical_mode && unionFutureStatus(qualities).eligible;
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
    var shares = window.electionSystem.voteShares(qualities);
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

  function streetRallyBlockChance(qualities) {
    window.electionSystem.ensureStreetState(qualities);
    var parties = ["fdp", "cdu", "csu"].filter(function (id) {
      return !Array.isArray(qualities.parties) || qualities.parties.indexOf(id) !== -1;
    });
    if (parties.indexOf("cdu") === -1 && parties.indexOf("csu") === -1 &&
        Array.isArray(qualities.parties) && qualities.parties.indexOf("ucd") !== -1) parties.push("ucd");
    var rightness = 0;
    var relation = 0;
    parties.forEach(function (id) {
      rightness += Number((qualities.party_rightwing || {})[id]) || 50;
      relation += relationValue(qualities, "spd", id);
    });
    rightness /= parties.length || 1;
    relation /= parties.length || 1;
    return Math.max(0.05, Math.min(0.8,
      0.08 + qualities.right_wing_agitation * 0.0045 +
      (rightness - 50) * 0.0024 + (50 - relation) * 0.0015
    ));
  }

  function streetRallyDefenseScore(qualities) {
    window.electionSystem.ensureStreetState(qualities);
    return qualities.left_wing_militancy * 0.7 + qualities.grassroots_mobilization * 0.15 -
      qualities.right_wing_agitation * 0.5;
  }

  function prepareStreetRally(qualities) {
    window.electionSystem.ensureStreetState(qualities);
    qualities.rally_effectiveness = 0.5 + qualities.grassroots_mobilization / 100;
    qualities.rally_support_before = {};
    (qualities.classes || []).forEach(function (group) {
      var key = group + "_spd";
      qualities.rally_support_before[key] = Number(qualities[key]) || 0;
    });
  }

  function applyStreetRallyEffectiveness(qualities) {
    if (qualities.historical_mode || !qualities.rally_support_before) return;
    var multiplier = Number(qualities.rally_effectiveness) || 1;
    Object.keys(qualities.rally_support_before).forEach(function (key) {
      var before = Number(qualities.rally_support_before[key]) || 0;
      var after = Number(qualities[key]) || 0;
      qualities[key] = before + (after - before) * multiplier;
    });
  }

  function updatePoliceLoyaltyForFocus(qualities, focusChange) {
    if (qualities.historical_mode) return;
    var loyaltyChange = Number(focusChange || 0) * 0.0015;
    ["interior_police_loyalty", "prussian_police_loyalty"].forEach(function (key) {
      var current = Number(qualities[key]);
      if (!isFinite(current)) current = key === "interior_police_loyalty" ? 0.45 : 0.5;
      qualities[key] = Math.max(0, Math.min(1, current + loyaltyChange));
    });
  }

  function trackRelationTrend(qualities, key, value) {
    var previous = qualities.party_relation_month_previous || (qualities.party_relation_month_previous = {});
    var trends = qualities.party_relation_trends || (qualities.party_relation_trends = {});
    var months = qualities.party_relation_months || (qualities.party_relation_months = {});
    var month = (Number(qualities.year) || 0) * 12 + (Number(qualities.month) || 1) - 1;
    if (previous[key] === undefined) {
      previous[key] = value;
      trends[key] = "same";
      months[key] = month;
    } else if (month > months[key]) {
      trends[key] = value > previous[key] ? "up" : value < previous[key] ? "down" : "same";
      previous[key] = value;
      months[key] = month;
    } else if (month === months[key]) {
      previous[key] = value;
    }
    return trends[key] || "same";
  }

  function renderTrendArrow(direction) {
    if (direction === "up") return '<span class="economy-trend economy-trend-up" aria-label="increased" title="Compared with last month">↑</span>';
    if (direction === "down") return '<span class="economy-trend economy-trend-down" aria-label="decreased" title="Compared with last month">↓</span>';
    return '<span class="economy-trend economy-trend-steady" aria-label="unchanged" title="No change from last month">→</span>';
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
    ensurePolitics(qualities);
    var current = qualities.party_relations[first] && qualities.party_relations[first][second];
    setRelation(qualities, first, second, (current === undefined ? 50 : current) + delta);
  }

  function renderMain(qualities) {
    var monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    var month = Number(qualities.month) || 0;
    var electionMonth = Number(qualities.next_election_month) || 0;
    var shares = window.electionSystem.voteShares(qualities);
    var position = qualities.spd_toleration ? "Tolerating the government" :
      qualities.spd_in_government ? "In government" : qualities.spd_caretaker ? "Caretaker government" : "In opposition";
    var coalitionType = qualities.in_grand_coalition ? "grand" : qualities.in_weimar_coalition ? "weimar" :
      qualities.in_popular_front ? "popular" : qualities.in_left_front ? "left" :
      qualities.in_minority_government ? "minority" : "";
    var govType = qualities.government_type || (coalitionType === "grand" ? "Grand Coalition" : coalitionType === "weimar" ? "Weimar Coalition" :
      coalitionType === "popular" ? "Popular Front" : coalitionType === "left" ? "Left Front" :
      coalitionType === "minority" ? "Minority government" : qualities.government_formation_pending ? "Pending." :
      qualities.spd_caretaker ? "Caretaker government" : qualities.chancellor ? "Government" : "Not formed");
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
    function renderCurrentCrises() {
      var currentIndex = (Number(qualities.year) || 0) * 12 + (Number(qualities.month) || 1);
      var active = (Array.isArray(qualities.active_crises) ? qualities.active_crises : []).filter(function(crisis) {
        return crisis && Number(crisis.expiresAt) >= currentIndex;
      });
      if (!active.length) return '<section class="party-panel current-crises"><h3>Current crises:</h3><p>No active crisis is dominating the news.</p></section>';
      var items = active.map(function(crisis) {
        var monthsLeft = Math.max(1, Number(crisis.expiresAt) - currentIndex + 1);
        function colorFlagWord(word, flag) {
          var letters = Array.from(word);
          var colors = flag === 'russia' ? ['white', 'blue', 'red'] : ['blue', 'yellow'];
          var baseLength = Math.floor(letters.length / colors.length);
          var remainder = letters.length % colors.length;
          var offset = 0;
          return colors.map(function(color, index) {
            var length = baseLength + (index === 0 ? remainder : 0);
            var text = letters.slice(offset, offset + length).map(escapeHtml).join('');
            offset += length;
            return text ? '<span class="flag-letter flag-' + flag + '-' + color + '">' + text + '</span>' : '';
          }).join('');
        }
        function colorCrisisReferences(text) {
          return escapeHtml(text)
            .replace(/COVID[-\s]?19/gi, '<span class="covid-term">$&</span>')
            .replace(/\b(Russia|Russian)\b/gi, function(word) { return colorFlagWord(word, 'russia'); })
            .replace(/\bUkraine\b/gi, function(word) { return colorFlagWord(word, 'ukraine'); });
        }
        var topic = colorCrisisReferences(crisis.topic || 'Public attention and polling are unusually sensitive to this issue.');
        return '<li><div class="crisis-heading"><strong>' + colorCrisisReferences(crisis.title || 'Breaking news') +
          '</strong><small>(' + monthsLeft + ' month' + (monthsLeft === 1 ? '' : 's') + ' remaining)</small></div><span>' + topic + '</span></li>';
      }).join('');
      return '<section class="party-panel current-crises"><h3>Current crises:</h3><ul class="crisis-list">' + items + '</ul></section>';
    }
    var currentDate = (monthNames[month - 1] || (month ? String(month) : "Month not set")) + " " + (qualities.year || "Year not set");
    var electionDate = electionMonth ? (monthNames[electionMonth - 1] || electionMonth) + " " + (qualities.next_election_year || "") : "Not scheduled";
    return '<section class="party-panel main-status"><h3>Political situation</h3>' +
      row("Next election", electionDate) + '<div class="main-status-row"><strong>Government</strong><span>' +
      (coalitionType ? renderCoalitionName(govType, qualities, coalitionType) : colorizeText(govType)) +
      '</span></div>' + row("Chancellor", chancellor) +
      row("President", president) + row("SPD position", position) +
      (Array.isArray(qualities.government_parties) && qualities.government_parties.length > 1 && qualities.government_parties.some(function(id) { return String(id).toLowerCase() === "spd"; }) ? row("Coalition dissent", (Number(qualities.coalition_dissent) || 0).toFixed(0) + "%") : "") +
      row("SPD faction dissent", (Number(qualities.dissent_percent === undefined ? (qualities.dissent || 0) : qualities.dissent_percent) || 0).toFixed(2) + "%") +
      renderCurrentCrises() +
      '<hr><h3>Party and resources</h3>' + row("SPD polling", (shares.spd || 0).toFixed(1) + "%") +
      row("Resources available", qualities.resources === undefined ? 0 : qualities.resources) +
      '<hr><h3>Time</h3>' + row("Month / year", currentDate) +
      '<details class="politics-details cabinet-details"><summary>Cabinet members</summary>' + renderMinisterRoster(qualities) + '</details></section>';
  }

  function renderMinisterRoster(qualities) {
    var ministries = [
      ["Foreign Affairs", "foreign_minister", "foreign_minister_party"],
      ["Interior Affairs", "interior_minister", "interior_minister_party"],
      ["Justice Affairs", "justice_minister", "justice_minister_party"],
      ["Labour & Social Affairs", "labor_minister", "labor_minister_party"],
      ["Defence", "defense_minister", "defense_minister_party"],
      ["Economic Affairs", "economic_minister", "economic_minister_party"],
      ["Finance Affairs", "finance_minister", "finance_minister_party"],
      ["Health Affairs", "health_minister", "health_minister_party"],
      ["Environment Affairs", "environment_minister", "environment_minister_party"],
      ["Education & Research Affairs", "education_minister", "education_minister_party"]
    ];
    var caretakerId = String(qualities.caretaker_party || "").toLowerCase();
    var caretakerActive = !!caretakerId && /caretaker/i.test(String(qualities.government_type || ""));
    var caretakerParty = getParty(caretakerId);
    var caretakerLabel = caretakerId === "cdu" && Array.isArray(qualities.caretaker_parties) && qualities.caretaker_parties.indexOf("csu") !== -1 ? "CDU/CSU" : caretakerParty ? caretakerParty.name : caretakerId;
    var legacyPartyNames = {
      z: "Center Party", ddp: "German Democratic Party", dvp: "German People’s Party",
      dnvp: "German National People’s Party", nsdap: "Nazi Party", kpd: "Communist Party",
      bvp: "Bavarian People’s Party", i: "Independent"
    };
    return '<ul class="cabinet-roster">' + ministries.map(function (ministry) {
      var party = caretakerActive ? caretakerId : String(qualities[ministry[2]] || "");
      var partyId = party.toLowerCase();
      var partyLabel = caretakerActive ? caretakerLabel : getParty(partyId) ? parties[partyId].name : legacyPartyNames[partyId] || party;
      var occupant = party ? (getParty(partyId) ? renderName(partyId, partyLabel) : escapeHtml(partyLabel)) : 'Vacant';
      return '<li><strong>' + escapeHtml(ministry[0]) + '</strong><span>' +
        occupant + '</span></li>';
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
    window.electionSystem.ensureStreetState(qualities);
    var focus = qualities.verfassungsschutz_focus;
    var focusPosition = ((focus + 100) / 2).toFixed(1);
    var polarization = Math.max(0, Math.min(100, Number(qualities.political_polarization) || 25));
    var polarizationLabel = polarization <= 20 ? 'Very low' : polarization <= 40 ? 'Low' : polarization <= 60 ? 'Moderate' : polarization <= 80 ? 'High' : 'Very high';
    var polarizationColor = relationColor(100 - polarization);
    return '<section class="party-panel street-panel"><h3>Street and civil society</h3>' +
      streetMetric('Right-wing agitation', qualities.right_wing_agitation, '#b94b42', 'Far-right street pressure and intimidation. Higher values strengthen the AfD’s polling position.') +
      streetMetric('Grassroots mobilization', qualities.grassroots_mobilization, '#39833b', 'The SPD’s ability to organize unions, civic groups, and peaceful democratic counter-protests.') +
      streetMetric('Left-wing militancy', qualities.left_wing_militancy, '#8a4b83', 'Militant activity can disrupt far-right mobilization, but high levels alienate moderate voters and strain cooperation.') +
      '<div class="street-metric"><div class="street-metric-heading"><strong>Verfassungsschutz and police focus</strong><span>' +
      (focus > 0 ? '+' : '') + Math.round(focus) + ' · ' + escapeHtml(focusDescription(focus)) +
      '</span></div><div class="street-focus-meter" role="img" aria-label="Security focus: ' + escapeHtml(focusDescription(focus)) + '"><span style="left:' + focusPosition + '%"></span></div>' +
      '<div class="street-focus-labels"><span>Far-left targeted</span><span>Balanced</span><span>Far-right targeted</span></div>' +
      '<p>Negative values put more scrutiny on the far-left; positive values put more scrutiny on the far-right.</p></div>' +
      '<div class="street-metric polarization-metric"><div class="street-metric-heading"><strong>Political polarisation</strong><span style="color:' + polarizationColor + '">' + polarizationLabel + '</span></div><div class="party-meter"><span style="width:' + Math.max(0, Math.min(100, polarization)) + '%;--party-color:' + polarizationColor + '"></span></div></div>' +
      streetMetric('Police loyalty', (Number(qualities.prussian_police_loyalty) || 0) * 100, '#526b8a', 'How firmly the police stand behind the constitutional order.') +
      streetMetric('Police strength', Number(qualities.prussian_police_strength) || 0, '#526b8a', 'The reach and capacity of the police.') +
      '</section>';
  }

  function renderSidebar(sceneId, qualities) {
    if (!qualities) return null;
    if (sceneId === 'status.street') return renderStreetPanel(qualities);
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
      relationEntries.sort(function (a, b) { return b.value - a.value; });
      var relations = relationEntries.map(function (entry) {
        var value = entry.value;
        var color = relationColor(value);
        var trend = trackRelationTrend(qualities, entry.key, value);
        var arrow = renderTrendArrow(trend);
        return '<li class="politics-relation"><div class="politics-relation-heading">' + renderName(entry.id, entry.label) +
          '<span class="relation-status" style="color:' + color + '">' + Math.round(value) + ' · ' + relationDescription(value) +
          ' <span class="relation-trend" title="Change; direction remains visible for two turns">' + arrow + '</span></span></div>' +
          '<div class="party-meter"><span style="width:' + value + '%;--party-color:' + color + '"></span></div></li>';
      }).join('');
      var firewall = recalculateFirewall(qualities);
      var ideology = qualities.party_rightwing || {};
      var bourgeoisieInputs = getFirewallInputs(qualities);
      var bourgeoisieRightStrength = bourgeoisieInputs.bourgeoisieRightness;
      var bourgeoisieRelation = getBourgeoisieAfdRelation(qualities);
      return '<section class="party-panel politics-panel"><h3>SPD relations</h3>' +
        '<ul class="party-list politics-relations">' + relations + '</ul>' +
        '<hr><h3>SPD factions</h3><p class="faction-note">Strength shows each faction’s influence within the party; dissent shows its opposition to the party’s current direction.</p>' + renderFactionRows(qualities) +
        '<hr><h3>Firewall integrity</h3><div class="firewall-score"><strong>' + firewall + ' / 100</strong>' +
        '<span>' + firewallDescription(firewall) + '</span></div><div class="firewall-meter"><span style="width:' + firewall + '%"></span></div>' +
        '<details class="politics-details firewall-details"' + (detailsExpanded ? ' open' : '') + '><summary>Details</summary>' +
        '<div class="firewall-detail-stats">' +
        '<p><strong><span class="bourgeoisie-label">Bourgeoisie</span> Left–Right:</strong> <span style="color:' + ideologyColor(bourgeoisieRightStrength) + '">' +
        Math.round(bourgeoisieRightStrength) + ' / 100 · ' + ideologyDescription(bourgeoisieRightStrength) + '</span></p>' +
        '<p><strong><span class="bourgeoisie-label">Bourgeoisie</span>–AfD relations:</strong> <span style="color:' + relationColor(bourgeoisieRelation) + '">' +
        Math.round(bourgeoisieRelation) + ' · ' + relationDescription(bourgeoisieRelation) + '</span></p>' +
        '<p><strong>Street climate pressure:</strong> ' + (qualities.firewall_inputs.street_pressure || 0) + ' points.</p>' +
        '<p><strong>Urgency against the far right:</strong> ' + Math.max(0, Math.min(10, Number(qualities.nazi_urgency) || 0)) + ' / 10.</p>' +
        '</div></details></section>';
    }
    return null;
  }

  function recordEconomyHistory(qualities) {
    var month = (Number(qualities.year) || 0) * 12 + (Number(qualities.month) || 1) - 1;
    var history = Array.isArray(qualities.economy_history) ? qualities.economy_history : (qualities.economy_history = []);
    var point = { month: month, unemployment: Number(qualities.unemployed) || 0, inflation: Number(qualities.inflation) || 0, growth: Number(qualities.economic_growth) || 0 };
    var latest = history.length ? history[history.length - 1] : null;
    var trendKeys = ["unemployment", "inflation", "growth"];
    var trends = qualities.economy_trends || (qualities.economy_trends = {});
    var previousTick = Number(qualities.economy_trend_month);
    if (!isFinite(previousTick) || month > previousTick) {
      trendKeys.forEach(function (key) {
        var previousValue = latest && latest.month === month - 1 ? Number(latest[key]) : Number(point[key]);
        var currentValue = Number(point[key]);
        trends[key] = { direction: currentValue > previousValue ? "up" : currentValue < previousValue ? "down" : "same" };
      });
      qualities.economy_trend_month = month;
    }
    if (latest && latest.month === month) history[history.length - 1] = point;
    else history.push(point);
    qualities.economy_history = history.filter(function (item) { return item.month >= month - 12 && item.month <= month; });
    return qualities.economy_history;
  }

  function renderEconomy(qualities) {
    var history = recordEconomyHistory(qualities);
    function value(key) {
      var number = Number(qualities[key]);
      return isFinite(number) ? number.toFixed(1) : '—';
    }
    function trend(key) {
      return renderTrendArrow((qualities.economy_trends[key] || {}).direction);
    }
    function chart(key, label, unit, color) {
      var width = 640, height = 220, left = 48, right = 12, top = 14, bottom = 34;
      var values = history.map(function (item) { return Number(item[key]) || 0; });
      var low = Math.min.apply(null, values), high = Math.max.apply(null, values);
      var padding = Math.max((high - low) * 0.15, 1);
      low = Math.floor(low - padding); high = Math.ceil(high + padding);
      if (low === high) high = low + 1;
      var plotWidth = width - left - right, plotHeight = height - top - bottom;
      function x(i) { return left + (history.length < 2 ? plotWidth / 2 : plotWidth * i / (history.length - 1)); }
      function y(v) { return top + plotHeight * (1 - (v - low) / (high - low)); }
      var grid = [0, 1, 2, 3].map(function (i) {
        var v = low + (high - low) * i / 3;
        return '<line x1="' + left + '" x2="' + (width - right) + '" y1="' + y(v) + '" y2="' + y(v) + '" class="poll-history-grid"/><text x="' + (left - 7) + '" y="' + (y(v) + 4) + '" text-anchor="end" class="poll-history-axis">' + v.toFixed(1) + '</text>';
      }).join('');
      var path = history.map(function (item, i) { return (i ? 'L ' : 'M ') + x(i) + ' ' + y(Number(item[key]) || 0); }).join(' ');
      var labels = history.map(function (item, i) {
        if (i !== 0 && i !== history.length - 1 && i % 3 !== 0) return '';
        var m = item.month % 12;
        return '<text x="' + x(i) + '" y="' + (height - 8) + '" text-anchor="middle" class="poll-history-axis">' + ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m] + ' ' + Math.floor(item.month / 12) + '</text>';
      }).join('');
      var qualityKey = key === 'growth' ? 'economic_growth' : (key === 'unemployment' ? 'unemployed' : key);
      return '<h4>' + label + ' <span class="economy-current-value">' + value(qualityKey) + unit + ' ' + trend(key) + '</span></h4><div class="poll-history-wrap"><svg class="poll-history-chart" viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="' + label + ' over time">' + grid + '<path d="' + path + '" fill="none" stroke="' + color + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' + labels + '</svg></div>';
    }
    return '<section class="party-panel economy-panel"><h3>Economic indicators over time</h3>' +
      chart('unemployment', 'Unemployment', '%', '#d04a3a') + chart('inflation', 'Inflation', '%', '#3977c3') + chart('growth', 'Economic growth', '%', '#39833b') + '</section>';
  }

  function initializePartyState(qualities) {
    qualities.parties = startingRoster.slice();
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
    ["kpd", "z", "ddp", "dvp", "dnvp", "nsdap", "bvp"].forEach(function (id) {
      qualities[id + "_in_government"] = 0;
    });
    qualities.government_parties = ["spd", "cdu", "csu"];
    qualities.union_alliance_active = 1;
  }

  window.partySystem = {
    parties: parties,
    factions: spdFactions,
    startingRoster: startingRoster.slice(),
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
    initializePartyState: initializePartyState,
    setRelation: setRelation,
    adjustRelation: adjustRelation,
    relationValue: relationValue,
    streetRallyBlockChance: streetRallyBlockChance,
    streetRallyDefenseScore: streetRallyDefenseScore,
    prepareStreetRally: prepareStreetRally,
    applyStreetRallyEffectiveness: applyStreetRallyEffectiveness,
    updatePoliceLoyaltyForFocus: updatePoliceLoyaltyForFocus,
    setUnionAlliance: setUnionAlliance,
    setUnionState: setUnionState,
    adjustRightWing: adjustRightWing,
    adjustBourgeoisieRightness: adjustBourgeoisieRightness,
    shouldShowUnionFuture: shouldShowUnionFuture,
    unionFutureStatus: unionFutureStatus,
    recalculateFirewall: recalculateFirewall,
    getFirewallInputs: getFirewallInputs,
    getNationalCoalitionChance: getNationalCoalitionChance,
    canFormCoalition: canFormCoalition,
    recordCoalition: recordCoalition,
    renderSidebar: renderSidebar,
    renderTrendArrow: renderTrendArrow,
    recordEconomyHistory: recordEconomyHistory,
    renderEconomy: renderEconomy,
    setDetailsExpanded: function (expanded) { detailsExpanded = !!expanded; },
    renderName: renderName,
    colorizeText: colorizeText
  };
}(window));
