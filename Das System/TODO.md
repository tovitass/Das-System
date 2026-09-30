# Das System - Development TODO

## 1. Understand and Stabilize the Existing Game

Before rewriting anything, map out what currently works.

* [x] Identify which vanilla systems are still active and which modern systems have replaced them.
* [x] Identify duplicate systems where modern and vanilla code both perform the same job.
* [x] Identify dead, unfinished, test, historical, or suspicious code that has no clear purpose.
* [x] Verify that the 2017 scenario actually uses the systems that the UI suggests it uses (static source trace).
* [x] Document the actual flow of the game from starting the scenario to an election and government formation.

**Goal:** Know exactly what is real, what is legacy, and what is only visual before making major changes.

### Step 1 audit

This is a source-level audit; the game was not launched in a browser during this pass.

**What the 2017 path uses**

1. `root.start` initializes a 2017 modern game and the legacy Weimar state/data as well.
2. The difficulty route reaches `root.1928_main`, whose arrival hook calls `electionSystem.initializeScenario(Q)`. Election setup loads the modern roster/support defaults, then party setup sets the opening Merkel grand coalition, modern president, and government party list.
3. `game.js` renders the politics sidebar through `partySystem` and routes the polls panel to `electionSystem`. `electionSystem.calculate` calculates vote shares, applies the 5% threshold, and allocates 598 seats.
4. `modern_federal_election` becomes eligible at the scheduled date (initially September 2021, unless state changes it). It calculates and records shares and seats, advances the election date by four years, then jumps to `modern_government_formation`. Available majority coalition scenes update the modern government fields. A minority-government option remains available regardless of whether its seat count is a majority.

**What is still legacy or duplicated**

- `parties.js` still owns vote-share/polling calculation alongside party definitions and coalition/firewall helpers; `elections.js` delegates vote shares back to it. The election result and seat allocation are modern, but responsibility is not yet separated as Step 2/3 intend.
- `post_event` still recalculates and records support using the active `Q.parties` roster. Its 1929–1930s annual party support shifts are now restricted to historical mode; modern monthly decisions/events still share some old state fields.
- The older `election_algorithm`, `election_1928`, legacy demographic panels, and D3 Reichstag/history renderers remain for historical gameplay. `election_simulation.2017` is a separate legacy simulation scene; the normal modern election event does not route through it.
- The modern polling projection and official election result use `parliament.js`. Historical scenes still use `d3-linegraph.js` for election, party-support, and economic histories.

**Suspicious or unfinished findings**

- Modern election code records modern seat results, but the election narrative says “Projected vote shares” and displays only SPD, CDU+CSU, and AfD. The new seats are not visibly presented by the election scene itself.
- Government formation only offers a fixed set of coalition combinations, and the minority option is unconditional. Coalition eligibility checks party compatibility and majority seats, but do not use the displayed party-relation values as negotiation input.
- `root.start` still initializes Weimar-era parties, classes, ministers, and a January 2017 state before `electionSystem.initializeScenario` replaces the party roster and support columns. This leaves legacy values around and makes startup harder to reason about.
- Legacy callbacks and historical end-game/routes remain in the same compiled game data as the modern scenario. They need a deliberate reachability and state-isolation pass before removal.

**Known flow**

```text
Start / difficulty selection
  → root.start (2017 base state plus legacy initialization)
  → root.1928_main (modern party/government initialization)
  → main and monthly post_event loop
  → modern_federal_election at the scheduled date
  → electionSystem.calculate → modern_government_formation
  → eligible coalition scene or minority government → main
```

The route and function calls are confirmed from source. Runtime behavior, UI rendering, and save/load behavior still need a browser smoke test under Step 10.

---

## 2. Rebuild the Party System

* [x] Keep modern party definitions, factions, relations, Union status, and compatibility rules in `parties.js`.
* [x] Move demographic vote shares, street-related polling effects, poll projections, and seat allocation to `elections.js`.
* [x] Move modern scenario support defaults and scenario setup under `electionSystem.initializeScenario`; `partySystem.initializePartyState` now initializes the modern party/government state.
* [ ] Fully isolate legacy Weimar party state and shared event logic from modern gameplay. Modern startup replaces the active roster, but the common `post_event` loop and historical state initialization still contain legacy party infrastructure; finish this as part of Steps 6 and 8.

The modern polls tab now renders through `electionSystem`, and the election result path uses that module for vote shares and seat allocation. The modern party module still reads election shares to weight firewall/coalition presentation, but it no longer calculates them. The unlinked `election_simulation.2017` test scene still routes into the legacy election algorithm and should be removed or corrected during cleanup.

Make `parties.js` responsible for parties and nothing unrelated.

It should contain:

* Party definitions
* Party properties
* Party relations
* Party factions
* CDU/CSU relationship
* Party compatibility
* Coalition-related party information

Move election calculations out of it.

Remove the remaining Weimar party infrastructure from the modern gameplay path.

**Goal:** One clean, authoritative modern party system.

---

## 3. Rebuild the Election & Polling System

Create a dedicated election system separate from the party definitions.

It should handle:

* Demographic voting
* Polling
* Vote shares
* Election results
* 5% threshold
* Seat allocation
* Election history
* Election scheduling

The modern election system must be the **only** system responsible for determining modern election results.

**Goal:** One clear pipeline:

```text
Demographics
    ↓
Polling
    ↓
Vote shares
    ↓
Election
    ↓
Seats
```
---

## 4. Rebuild Parliament

* [x] Keep seat allocation out of `parliament.js`; its renderers accept prepared seat maps.
* [x] Use the same `modernParliament` renderer for modern polling, the official election result, and historical seat displays.
* [x] Remove the duplicate D3 parliament renderer and its script include.

The official seat map is shown during election results and government formation, with CDU and CSU combined for display while their separate seat counts remain available to coalition logic. The historical scenes still prepare their historical seat counts, then pass them to `parliament.js`; `d3-linegraph.js` remains for historical charts that are not parliament visualizations.

Create one authoritative parliament system.

`parliament.js` should only deal with representing parliament, not calculating elections.

It should receive something like:

```text
SPD      180 seats
CDU/CSU  210 seats
Greens    90 seats
FDP       60 seats
Linke     40 seats
AfD       18 seats
```

and turn that into the parliament visualization.

Remove the current duplicate/legacy parliament implementations once the replacement works.

**Goal:** Parliament is a representation of the election result, not a separate system.

---

## 5. Rebuild Government & Coalition Formation

Create one modern government system.

It should handle:

* Current government
* Chancellor
* Coalition partners
* Coalition compatibility
* Party relations
* Firewall
* CDU/CSU unity
* Coalition formation
* Coalition collapse
* Government formation after elections

The system must actually use the modern election result and modern party relations.

**Goal:**

```text
Election
   ↓
Parliament
   ↓
Coalition possibilities
   ↓
Government formation
   ↓
Government
```

---

## 6. Modernize the Game State

Clean the underlying `Q` state so the modern game isn't simultaneously carrying a modern and Weimar version of everything.

Replace or isolate things like:

```text
kpd
z
ddp
dvp
dnvp
nsdap
```

where they are being used as active modern gameplay variables.

Make modern variables authoritative for:

* Parties
* Elections
* Government
* Parliament
* Relations
* Political factions
* Street politics

**Goal:** The game state should describe Germany in 2017, not Germany in 1928 with a modern UI painted over it.

---

## 7. Modernize Ministries, Advisors & Government Content

Once the underlying government system works:

* Replace historical ministers and advisors.
* Add the modern ministry structure.
* Add the intended 2017 politicians.
* Connect ministers/advisors to actual game effects.
* Remove obsolete historical cabinet infrastructure.

**Goal:** The cabinet shown to the player is the cabinet the game is actually using.

---

## 8. Modernize Events & Scenes

After the underlying systems are stable, go through the existing scenes and modernize the actual gameplay content.

* Replace obsolete Weimar mechanics.
* Rewrite events that still modify historical party variables.
* Connect events to the modern party/election/government systems.
* Remove genuinely obsolete historical events.
* Keep historical references only where they make sense in the modern scenario.

**Goal:** Player decisions should affect the modern systems rather than dead vanilla infrastructure.

---

## 9. Clean the UI & Presentation

Once the underlying systems work, clean the interface.

* Main tab
* Politics
* Polls
* Street
* Parliament
* Election history
* Ministries
* Advisors
* Percentages
* Dates and time

Every displayed value should come directly from the actual game state.

**Goal:** Nothing should merely *look* functional.

---

## 10. Final Cleanup & Verification

Do one final repository-wide pass.

* Remove dead code.
* Remove unused libraries.
* Remove obsolete assets.
* Remove backup/test files from production.
* Fix missing assets.
* Fix stale build configuration.
* Check that `core.json` and the compiled game remain synchronized.
* Test the complete gameplay loop.

Final test:

```text
Start 2017
   ↓
Play
   ↓
Political decisions
   ↓
Polling changes
   ↓
Election
   ↓
Parliament changes
   ↓
Coalition formation
   ↓
New government
   ↓
Ministries/advisors
   ↓
Continue playing
```

**Goal:** The entire game is one coherent system instead of several overlapping systems that happen to work together.
