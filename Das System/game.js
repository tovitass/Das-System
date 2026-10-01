(function() {
  var game;
  var ui;

  var main = function(dendryUI) {
    ui = dendryUI;
    game = ui.game;

    var content = document.getElementById('content');
    if (content && window.MutationObserver) {
      new MutationObserver(function() {
        var state = ui.dendryEngine && ui.dendryEngine.state;
        if (state && state.sceneId === 'modern_federal_election') {
          var choices = content.querySelector('ul.choices');
          if (choices) choices.remove();
        }
      }).observe(content, { childList: true, subtree: true });
    }

    // Pick one wallpaper for each theme on this page load. Scene changes and
    // theme switches reuse those picks, so the background stays consistent.
    var themeWallpapers = {
      light: ["img/backround_bright.jpg", "img/backround_bright_2.jpg"],
      dark: ["img/backround_dark.jpg", "img/backround_dark_2.jpg"]
    };
    var selectedWallpapers = {
      light: themeWallpapers.light[Math.floor(Math.random() * themeWallpapers.light.length)],
      dark: themeWallpapers.dark[Math.floor(Math.random() * themeWallpapers.dark.length)]
    };
    var knownWallpapers = themeWallpapers.light.concat(themeWallpapers.dark);
    var originalSetBg = ui.setBg;
    ui.setBg = function(background) {
      if (knownWallpapers.indexOf(background) !== -1) {
        var mode = document.body.classList.contains("dark-mode") ? "dark" : "light";
        background = selectedWallpapers[mode];
      }
      return originalSetBg.call(ui, background);
    };

    // Add your custom code here.
  };

  var TITLE = "Social Democracy: An Alternate History" + '_' + "Autumn Chen";

  // The url is a link to game.json
  window.loadMod = function(url) {
      ui.loadGame(url);
  };

  window.showStats = function() {
    if (window.dendryUI.dendryEngine.state.sceneId.startsWith('library')) {
        window.dendryUI.dendryEngine.goToScene('backSpecialScene');
    } else {
        window.dendryUI.dendryEngine.goToScene('library');
    }
  };

  window.showMods = function() {
    window.hideOptions();
    if (window.dendryUI.dendryEngine.state.sceneId.startsWith('mod_loader')) {
        window.dendryUI.dendryEngine.goToScene('backSpecialScene');
    } else {
        window.dendryUI.dendryEngine.goToScene('mod_loader');
    }
  };
  
  window.showOptions = function() {
      var save_element = document.getElementById('options');
      window.populateOptions();
      save_element.style.display = "block";
      if (!save_element.onclick) {
          save_element.onclick = function(evt) {
              var target = evt.target;
              var save_element = document.getElementById('options');
              if (target == save_element) {
                  window.hideOptions();
              }
          };
      }
  };

  window.hideOptions = function() {
      var save_element = document.getElementById('options');
      save_element.style.display = "none";
  };

  window.disableBg = function() {
      window.dendryUI.disable_bg = true;
      document.body.style.backgroundImage = 'none';
      window.dendryUI.saveSettings();
  };

  window.enableBg = function() {
      window.dendryUI.disable_bg = false;
      window.dendryUI.setBg(window.dendryUI.dendryEngine.state.bg);
      window.dendryUI.saveSettings();
  };

  window.disableAnimate = function() {
      window.dendryUI.animate = false;
      window.dendryUI.saveSettings();
  };

  window.enableAnimate = function() {
      window.dendryUI.animate = true;
      window.dendryUI.saveSettings();
  };

  window.disableAnimateBg = function() {
      window.dendryUI.animate_bg = false;
      window.dendryUI.saveSettings();
  };

  window.enableAnimateBg = function() {
      window.dendryUI.animate_bg = true;
      window.dendryUI.saveSettings();
  };

  window.disableAudio = function() {
      window.dendryUI.toggle_audio(false);
      window.dendryUI.saveSettings();
  };

  window.enableAudio = function() {
      window.dendryUI.toggle_audio(true);
      window.dendryUI.saveSettings();
  };

  window.enableImages = function() {
      window.dendryUI.show_portraits = true;
      window.dendryUI.saveSettings();
  };

  window.disableImages = function() {
      window.dendryUI.show_portraits = false;
      window.dendryUI.saveSettings();
  };

  window.enableLightMode = function() {
      window.dendryUI.dark_mode = false;
      document.body.classList.remove('dark-mode');
      applyThemeBackground();
      window.dendryUI.saveSettings();
  };

  window.enableDarkMode = function() {
      window.dendryUI.dark_mode = true;
      document.body.classList.add('dark-mode');
      applyThemeBackground();
      window.dendryUI.saveSettings();
  };

  function applyThemeBackground() {
    if (!ui || !ui.dendryEngine || !ui.dendryEngine.state || ui.disable_bg) return;
    var background = ui.dendryEngine.state.bg;
    if (background) ui.setBg(background);
  }

  // Populates the checkboxes in the options view
  window.populateOptions = function() {
    var disable_bg = window.dendryUI.disable_bg;
    var animate = window.dendryUI.animate;
    var disable_audio = window.dendryUI.disable_audio;
    var show_portraits = window.dendryUI.show_portraits;

    if (disable_bg) {
        $('#backgrounds_no')[0].checked = true;
    } else {
        $('#backgrounds_yes')[0].checked = true;
    }
    if (animate) {
        $('#animate_yes')[0].checked = true;
    } else {
        $('#animate_no')[0].checked = true;
    }
    if (disable_audio) {
        $('#audio_no')[0].checked = true;
    } else {
        $('#audio_yes')[0].checked = true;
    }
    if (show_portraits) {
        $('#images_yes')[0].checked = true;
    } else {
        $('#images_no')[0].checked = true;
    }
    if (window.dendryUI.dark_mode) {
        $('#dark_mode')[0].checked = true;
    } else {
        $('#light_mode')[0].checked = true;
    }
  };

  // This function allows you to modify the text before it's displayed.
  window.displayText = function(text) {
      if (window.partySystem) {
          return window.partySystem.colorizeText(text);
      }
      return text;
  };

  // This function allows you to do something in response to signals.
  window.handleSignal = function(signal, event, scene_id) {
  };
  
  // This function runs on a new page. Right now, this auto-saves.
  window.onNewPage = function() {
    var engine = window.dendryUI.dendryEngine;
    var state = engine.state;
    var scene = state.sceneId;
    // Resolve every event that was available at the same monthly checkpoint
    // before allowing the player back to the normal month screen.
    if (scene === 'main' && state.qualities && Array.isArray(state.qualities.pending_event_queue) &&
        state.qualities.pending_event_queue.length && !state.qualities.draining_event_queue) {
      state.qualities.draining_event_queue = 1;
      engine.goToScene('post_event.events_choice');
      return;
    }
    if (scene === 'post_event.events_choice' && state.qualities) state.qualities.draining_event_queue = 0;
    if (scene != 'root' && !window.justLoaded) {
        window.dendryUI.autosave();
    }
    if (window.justLoaded) {
        window.justLoaded = false;
    }
  };

  function coalitionSeatShare(result, partyIds) {
    var seats = result && result.seats || {};
    var coalitionSeats = partyIds.reduce(function(total, id) { return total + (Number(seats[id]) || 0); }, 0);
    var total = Number(result && result.seatTotal) || 0;
    return { seats: coalitionSeats, percent: total ? 100 * coalitionSeats / total : 0 };
  }

  function renderModernElectionControls(gameState, content) {
    if (!gameState || gameState.sceneId !== 'modern_federal_election' || !content) return;
    var old = document.getElementById('modern-election-controls');
    if (old) old.remove();
    var choiceList = content.querySelector('ul.choices');
    if (choiceList) choiceList.remove();
    var qualities = gameState.qualities || {};
    var result = qualities.modern_election_result;
    if (!result || !result.seats) return;

    var controls = document.createElement('section');
    controls.id = 'modern-election-controls';
    controls.className = 'modern-election-controls';
    var majority = Math.floor((Number(result.seatTotal) || 0) / 2) + 1;
    var isNoSpd = !!qualities.show_non_spd_coalitions;
    var mode = qualities.modern_election_flow || 'coalitions';
    var coalitionOptions = [
      { id:'grand', name:'Grand Coalition', parts:['spd','cdu','csu'], spd:true, chancellor:'Angela Merkel', chancellorParty:'CDU' },
      { id:'deutschland', name:'Deutschland Coalition', parts:['cdu','csu','spd','fdp'], spd:true, chancellor:'Angela Merkel', chancellorParty:'CDU' },
      { id:'kenya', name:'Kenya Coalition', parts:['cdu','csu','spd','greens'], spd:true, chancellor:'Angela Merkel', chancellorParty:'CDU' },
      { id:'traffic', name:'Traffic Light Coalition', parts:['spd','greens','fdp'], spd:true, chancellor:'Olaf Scholz', chancellorParty:'SPD' },
      { id:'left', name:'Leftist Coalition', parts:['spd','greens','die_linke'], spd:true, chancellor:'Olaf Scholz', chancellorParty:'SPD' },
      { id:'minority', name:'SPD Minority Government', parts:['spd'], spd:true, minority:true, chancellor:'Olaf Scholz', chancellorParty:'SPD' },
      { id:'jamaica', name:'Jamaica Coalition', parts:['cdu','csu','greens','fdp'], spd:false, chancellor:'Angela Merkel', chancellorParty:'CDU' },
      { id:'right', name:'Right Coalition', parts:['cdu','csu','afd'], spd:false, chancellor:'Angela Merkel', chancellorParty:'CDU' },
      { id:'bourgeoisie', name:'Bourgeoisie Coalition', parts:['fdp','cdu','csu','afd'], spd:false, chancellor:'Angela Merkel', chancellorParty:'CDU' }
    ];
    function appendButton(parent, label, callback, className) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = className || 'modern-election-action';
      button.textContent = label;
      button.addEventListener('click', callback);
      parent.appendChild(button);
      return button;
    }
    function returnToGame() {
      qualities.modern_election_flow = 'coalitions';
      qualities.government_formation_pending = 0;
      qualities.government_formed_summary_time = Number(qualities.time) || 0;
      window.dendryUI.dendryEngine.goToScene('modern_government_return');
    }
    if (mode === 'ministries' && qualities.modern_selected_coalition) {
      var coalition = coalitionOptions.filter(function(option) { return option.id === qualities.modern_selected_coalition; })[0];
      if (!coalition || !coalition.spd) { qualities.modern_election_flow = 'coalitions'; mode = 'coalitions'; }
      else {
        var inCoalition = coalitionSeatShare(result, coalition.parts);
        var spdSeats = Number(result.seats.spd) || 0;
        var ministryCount = inCoalition.seats ? Math.round(10 * spdSeats / inCoalition.seats) : 0;
        var ministries = [
          ['foreign','Foreign Affairs'], ['interior','Interior'], ['justice','Justice'],
          ['labor','Labour/Social Affairs'], ['economic','Economic Affairs'], ['finance','Finance'],
          ['health','Health'], ['environment','Environment'], ['transport','Transport/Infrastructure'],
          ['education','Education/Research']
        ];
        var chosen = Array.isArray(qualities.spd_ministries_selected) ? qualities.spd_ministries_selected : [];
        var heading = document.createElement('h2'); heading.textContent = 'Choose SPD Ministries'; controls.appendChild(heading);
        var explanation = document.createElement('p');
        explanation.textContent = 'The SPD holds ' + (inCoalition.seats ? (100 * spdSeats / inCoalition.seats).toFixed(1) : '0.0') +
          '% of coalition seats and may choose ' + ministryCount + ' of 10 ministries. Selected ministries cannot be changed.';
        controls.appendChild(explanation);
        var progress = document.createElement('p'); progress.className='modern-ministry-progress';
        progress.textContent = chosen.length + ' of ' + ministryCount + ' ministries selected'; controls.appendChild(progress);
        var list = document.createElement('div'); list.className='modern-ministry-options'; controls.appendChild(list);
        ministries.forEach(function(item) {
          var selected = chosen.indexOf(item[0]) !== -1;
          var button = appendButton(list, item[1] + (selected ? ' — Selected' : ''), function() {
            if (chosen.length >= ministryCount || chosen.indexOf(item[0]) !== -1) return;
            chosen.push(item[0]); qualities.spd_ministries_selected = chosen;
            renderModernElectionControls(gameState, content);
          }, 'modern-ministry-choice');
          button.disabled = selected || chosen.length >= ministryCount;
          if (selected) button.classList.add('selected');
        });
        if (chosen.length === ministryCount) {
          appendButton(controls, 'Confirm Cabinet', function() {
            var portfolioFields = {foreign:'foreign',interior:'interior',justice:'justice',labor:'labor',economic:'economic',finance:'finance',health:'health',environment:'environment',transport:'transport',education:'education'};
            var otherParty = coalition.parts.filter(function(id) { return id !== 'spd' && id !== 'csu'; }).sort(function(a,b) {
              return (Number(result.seats[b])||0) - (Number(result.seats[a])||0);
            })[0] || 'spd';
            var partyLabels = {spd:'SPD',cdu:'CDU',csu:'CSU',greens:'Greens',fdp:'FDP',die_linke:'Die Linke',afd:'AfD'};
            ministries.forEach(function(item) {
              var role=portfolioFields[item[0]], holder=chosen.indexOf(item[0]) !== -1 ? 'spd' : otherParty;
              qualities[role+'_minister_party']=partyLabels[holder] || holder.toUpperCase();
              if (holder==='spd') qualities[role+'_minister']='SPD appointee';
            });
            qualities.government_formation_pending=0; qualities.government_active=1;
            returnToGame();
          }, 'modern-election-action primary');
        }
        appendButton(controls, 'Back to coalition options', function() {
          qualities.modern_election_flow='coalitions'; qualities.modern_selected_coalition=null;
          qualities.spd_ministries_selected=[]; renderModernElectionControls(gameState,content);
        }, 'modern-election-action');
        content.appendChild(controls); return;
      }
    }

    var heading=document.createElement('h2');
    heading.textContent=isNoSpd ? 'Coalitions without the SPD' : 'Choose a coalition to form the next government';
    controls.appendChild(heading);
    coalitionOptions.filter(function(option) { return isNoSpd ? !option.spd : option.spd; }).forEach(function(option) {
      var shares=coalitionSeatShare(result,option.parts);
      var majorityPossible=option.minority || shares.seats>=majority;
      var compatible=window.partySystem.canFormCoalition(qualities,option.parts,'national');
      if (option.minority) {
        var union=(Number(result.seats.cdu)||0)+(Number(result.seats.csu)||0);
        majorityPossible=(Number(result.seats.spd)||0)>union && Object.keys(result.seats).filter(function(id){return !['spd','cdu','csu','other'].includes(id);}).every(function(id){return (Number(result.seats.spd)||0)>(Number(result.seats[id])||0);});
      }
      var canForm=majorityPossible&&compatible;
      var card=document.createElement('button'); card.type='button'; card.className='modern-coalition-option '+(canForm?'possible':'unavailable');
      card.disabled=!(majorityPossible&&compatible);
      var choice=document.createElement('span'); choice.className='modern-coalition-choice';
      choice.innerHTML='Form a <strong>'+window.partySystem.colorizeText(option.name)+'</strong>';
      card.appendChild(choice);
      card.addEventListener('click',function(){
        qualities.government_parties=option.parts.slice(); qualities.government_type=option.name;
        qualities.chancellor=option.chancellor; qualities.chancellor_party=option.chancellorParty;
        qualities.in_grand_coalition=option.id==='grand'?1:0; qualities.in_weimar_coalition=0;
        qualities.in_popular_front=option.id==='left'?1:0; qualities.in_left_front=option.id==='left'?1:0;
        qualities.in_minority_government=option.minority?1:0; qualities.spd_in_government=option.spd?1:0;
        qualities.spd_toleration=0; qualities.government_formation_pending=1; qualities.government_active=1;
        qualities.spd_caretaker=0; qualities.caretaker_party=null; qualities.caretaker_parties=[];
        qualities.modern_selected_coalition=option.id;
        qualities.spd_ministries_selected=[];
        qualities.government_toleration_parties=[];
        if (option.spd) { qualities.modern_election_flow='ministries'; renderModernElectionControls(gameState,content); }
        else { qualities.government_formation_pending=0; returnToGame(); }
      });
      var share=document.createElement('span'); share.className='modern-coalition-seat-share';
      share.textContent=shares.percent.toFixed(1)+'% of seats'; card.appendChild(share);
      if (!canForm) {
        var note=document.createElement('p'); note.className='modern-coalition-unavailable-note';
        note.textContent=shares.seats<majority&&!option.minority?'Cannot form a parliamentary majority.':'Party compatibility prevents this coalition.';
        card.appendChild(note);
      }
      controls.appendChild(card);
    });
    appendButton(controls,isNoSpd?'Show coalitions including the SPD':'The SPD refuses to partake in government',function(){
      qualities.show_non_spd_coalitions=!isNoSpd; renderModernElectionControls(gameState,content);
    },'modern-election-action coalition-toggle');
    content.appendChild(controls);
  }

  window.updateSidebar = function() {
      $('#qualities').empty();
      var scene = dendryUI.game.scenes[window.statusTab];
      var gameState = dendryUI.dendryEngine.state;
      var content = document.getElementById('content');
      var oldElectionPanel = document.getElementById('main-election-parliament');
      if (oldElectionPanel) oldElectionPanel.remove();
      var showElectionResult = gameState.qualities && gameState.qualities.modern_election_result &&
          ['modern_federal_election', 'modern_government_formation'].indexOf(gameState.sceneId) !== -1 &&
          window.modernParliament && content;
      document.body.classList.toggle('election-results-mode', !!showElectionResult);
      var oldFormationSummary = document.getElementById('modern-government-formed-summary');
      if (oldFormationSummary) oldFormationSummary.remove();
      if (gameState.sceneId === 'main' && gameState.qualities &&
          Number(gameState.qualities.government_formed_summary_time) === Number(gameState.qualities.time) &&
          gameState.qualities.modern_election_result) {
          var summary = document.createElement('p');
          summary.id = 'modern-government-formed-summary';
          summary.className = 'modern-government-formed-summary';
          var q = gameState.qualities;
          var spdVote = Number(q.modern_election_result.shares && q.modern_election_result.shares.spd) || 0;
          var partyNames = {spd:'SPD',cdu:'CDU',csu:'CSU',greens:'Greens',fdp:'FDP',die_linke:'Die Linke',afd:'AfD',other:'Other'};
          var members = Array.isArray(q.government_parties) ? q.government_parties : [];
          var displayedMembers = [];
          members.forEach(function(id) {
              var name = partyNames[String(id).toLowerCase()] || String(id);
              if ((id === 'cdu' || id === 'csu') && displayedMembers.indexOf('CDU/CSU') !== -1) return;
              if (id === 'cdu' || id === 'csu') displayedMembers.push('CDU/CSU');
              else if (displayedMembers.indexOf(name) === -1) displayedMembers.push(name);
          });
          var summaryText = 'The SPD got ' + spdVote.toFixed(1) + '% of the vote. A ' +
              (q.government_type || 'coalition government') + ' was formed with ' + displayedMembers.join(', ') +
              '. ' + (q.chancellor || 'The selected leader') + ' is now Chancellor.';
          summary.innerHTML = window.partySystem ? window.partySystem.colorizeText(summaryText) : summaryText;
          content.insertBefore(summary, content.firstChild);
      }
      if (showElectionResult) {
          var panel = document.createElement('div');
          panel.id = 'main-election-parliament';
          panel.innerHTML = window.modernParliament.renderResult(
              gameState.qualities.modern_election_result, window.partySystem.parties, 'Elected Bundestag'
          );
          var choices = content.querySelector('ul.choices');
          if (choices) content.insertBefore(panel, choices);
          else content.appendChild(panel);
          if (gameState.sceneId === 'modern_federal_election') {
              renderModernElectionControls(gameState, content);
          }
      }
      // Some builds contain no status scenes. Keep rendering the main
      // scene and its choices when the optional sidebar data is absent.
      if (!scene) {
          return;
      }
      if (window.statusTab === 'status.polls' && window.electionSystem) {
          $('#qualities').html(window.electionSystem.renderPolls(gameState.qualities));
          return;
      }
      if (window.partySystem) {
          var partyPanel = window.partySystem.renderSidebar(
              window.statusTab, dendryUI.dendryEngine.state.qualities
          );
          if (partyPanel !== null) {
              $('#qualities').html(partyPanel);
              var politicsDetails = document.querySelector('#qualities details.politics-details');
              if (politicsDetails) {
                  politicsDetails.addEventListener('toggle', function() {
                      window.partySystem.setDetailsExpanded(this.open);
                  });
              }
              return;
          }
      }
      dendryUI.dendryEngine._runActions(scene.onArrival);
      var displayContent = dendryUI.dendryEngine._makeDisplayContent(scene.content, true);
      $('#qualities').append(dendryUI.contentToHTML.convert(displayContent));
  };

  window.changeTab = function(newTab, tabId) {
      if (tabId == 'poll_tab' && dendryUI.dendryEngine.state.qualities.historical_mode) {
          window.alert('Polls are not available in historical mode.');
          return;
      }
      var tabButton = document.getElementById(tabId);
      var tabButtons = document.getElementsByClassName('tab_button');
      
      // Fixed: Scoped 'i' variable to avoid leaking into global window scope
      for (var i = 0; i < tabButtons.length; i++) {
        tabButtons[i].className = tabButtons[i].className.replace(' active', '');
      }
      tabButton.className += ' active';
      window.statusTab = newTab;
      window.updateSidebar();
  };

  window.onDisplayContent = function() {
      window.updateSidebar();
  };

  /*
   * quality - a number between max and min
   * qualityName - the name of the quality
   * max and min - numbers
   * colors - if true/1, will use color scheme (green to yellow to red)
   */
  window.generateBar = function(quality, qualityName, max, min, colors) {
      var bar = document.createElement('div');
      bar.className = 'bar';
      var value = document.createElement('div');
      value.className = 'barValue';
      var width = (quality - min) / (max - min);

      if (width > 1) {
          width = 1;
      } else if (width < 0) {
          width = 0;
      }

      value.style.width = Math.round(width * 100) + '%';
      if (colors) {
          value.style.backgroundColor = window.probToColor(width * 100);
      }
      bar.textContent = qualityName + ': ' + quality;
      if (colors) {
          bar.textContent += '/' + max;
      }
      bar.appendChild(value);
      return bar;
  };

  window.justLoaded = true;
  window.statusTab = "status";
  window.dendryModifyUI = main;
  console.log("Modifying stats: see dendryUI.dendryEngine.state.qualities");

  window.onload = function() {
    if (window.dendryUI && window.dendryUI.loadSettings) {
      window.dendryUI.loadSettings({show_portraits: false});
      if (window.dendryUI.dark_mode) {
          document.body.classList.add('dark-mode');
      }
      applyThemeBackground();
    }
    window.pinnedCardsDescription = "Advisor cards - actions are only usable once per 6 months.";
  };

}());
