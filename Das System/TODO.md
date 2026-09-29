# TODO: Modern Age / 2017 Modernization

## 0. Investigate Existing Infrastructure

* [ ] Determine whether the current UI changes are connected to the underlying game systems or are merely visual mockups.
* [ ] Investigate whether the vanilla systems are still present and functional underneath the modified UI.
* [ ] Specifically check whether existing vanilla systems have been "painted over" rather than replaced.
* [ ] If the original infrastructure still works, repurpose and adapt it for the Modern Day / 2017 scenario instead of unnecessarily rebuilding it from scratch.
* [ ] Document which systems are functional, which are partially functional, and which need to be replaced.

## 1. Ministries & Advisors

* [ ] Expand the Ministries and their available advisors.
* [ ] Remove all existing minister portraits. They are outdated and will no longer be used.
* [ ] Add the following SPD candidates and their faction affiliations:

| Ministry                   | SPD Candidate         | Faction                |
| -------------------------- | --------------------- | ---------------------- |
| Foreign Affairs            | Michael Roth          | Netzwerk Berlin        |
| Interior                   | Boris Pistorius       | Seeheimer Kreis        |
| Justice                    | Katarina Barley       | Netzwerk Berlin        |
| Labour & Social Affairs    | Hubertus Heil         | Netzwerk Berlin        |
| Defence                    | Eva Högl              | Netzwerk Berlin        |
| Economic Affairs           | Brigitte Zypries      | Seeheimer Kreis        |
| Finance                    | Olaf Scholz           | Seeheimer Kreis        |
| Health                     | Karl Lauterbach       | Parlamentarische Linke |
| Environment                | Svenja Schulze        | Netzwerk Berlin        |
| Transport & Infrastructure | Martin Burkert        | Seeheimer Kreis        |
| Education & Research       | Ernst Dieter Rossmann | Parlamentarische Linke |

* [ ] Add advisor entries for all listed candidates.
* [ ] I will add the portraits/images separately.

### Portrait filenames

Use a consistent naming convention:

```text
michael_roth.png
boris_pistorius.png
katarina_barley.png
hubertus_heil.png
eva_hoegl.png
brigitte_zypries.png
olaf_scholz.png
karl_lauterbach.png
svenja_schulze.png
martin_burkert.png
ernst_dieter_rossmann.png
```

* [ ] Update and modernize all scenes and events related to Ministries so they work with the new Ministry/advisor system.

## 2. Modernize Events & Scenes

* [ ] Review all event text.
* [ ] Review all scene text.
* [ ] Replace outdated references and terminology.
* [ ] Ensure all events and scenes fit the 2017 / Modern Age setting.
* [ ] Remove references that only make sense in the original/vanilla historical context.
* [ ] Ensure political figures, institutions, parties, and political circumstances are appropriate for 2017.

## 3. Coalition System

* [ ] Ensure coalition mechanics function correctly.
* [ ] Evaluate what kind of coaltions woule EVER be possible, and use the existing coaltions infrastrcuture to ensure they are options
* [ ]Ensure Coaltions are dependent on Firewall integrity, Party opinions, Conservative rightshift etc. 
* [ ] If the governing coalition collapses, trigger new elections in 5 months time.
* [ ] Ensure the election actually takes place rather than merely displaying an election-related event. DO NOT FORGET about the Parliament chart that is shown in vanilla game.
* [ ] Ensure the post-election government formation works correctly.
* [ ] If the First Grand Coalition collapses, Merkel remains Chancellor until a new government is formed, rather than being immediately removed from office and replaced by a nonexisting brüning (Z).
* [ ] Check all possible coalition-breakup paths for broken or missing transitions.

## 4. Main Tab: Time Display

* [ ] Remove the separate `Month/Year` text from the main tab.
* [ ] Change the display to:

```text
Time: February 2017
```

* [ ] Ensure the displayed month/year updates correctly as time advances.

## 5. Percentage Formatting

* [ ] Round all percentage values to exactly two decimal places.
* [ ] Use the appropriate decimal separator for the UI.

Example:

```text
20,36%
```

instead of:

```text
20.357849%
```

or other excessive precision.

## 6. Inter-Party Relations

* [ ] Add an option for building relations with **Die Linke** in the Inter-Party Relations scene.
* [ ] Ensure the option uses the same underlying relations system as the existing party-relations options.

## 7. Inter-Party Relations: Actual Effects

* [ ] Investigate why choices in the Inter-Party Relations scene currently do not appear to affect actual party relations.
* [ ] Determine whether:

  * [ ] The underlying relations system was removed.
  * [ ] The original system still exists but is disconnected from the current UI.
  * [ ] A replacement system was implemented but does not update the displayed values.
  * [ ] The UI is only a visual representation and has no connection to the underlying game state.
* [ ] Verify whether selecting an Inter-Party Relations option actually changes the relevant party's opinion/relations value.
* [ ] Ensure the resulting change is reflected in the Relations UI.
* [ ] Ensure the change persists after leaving the scene/event.
* [ ] Ensure subsequent gameplay systems use the updated relation value.
* [ ] If the vanilla relations infrastructure still exists, repurpose it rather than creating an entirely separate system.
* [ ] Test relations with all relevant parties, including CDU/CSU, FDP, Greens, Die Linke, and AfD where applicable.
* [ ] Verify that positive and negative relations changes both work correctly.
