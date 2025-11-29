## 13.11.1

### Fixed

- Schadensreduktion für Streiftreffer wird nur einmal abgerechnet

## 13.11.0

### New Features

- Erfolgsgrade auf Angriffswürfe können jetzt abgerechnet werden.
- Es kann sich ausgesucht werden welche Art von Strafe sich durch Streiftreffer ergibt.

### Changes

- Attribute von Waffen und Fertigkeiten werden validiert. Ungültige Attribute führen zu Fehlern.

### Fixed

- Das Auslesen komplexer Würfelterme für Schadensberechnung funktioniert jetzt zuverlässiger

## 13.10.0

### New Features

- Es gibt einen neuen Modifikator `check.result`, der die Erfolgsgrade nach einer Probe modifiziert.

## Changes

- Die Interne Handhabung von Modifikatoren wurde überarbeitet.

## 13.9.2

### Fixed

- Der Zustand 'Ringend' verwendet jetzt den korrekten Modifikator'
- Das Entfernen von Tooltips aus der Anzeige wird jetzt so lange versucht, bis es erfolgreich ist.

## 13.9.1

### Fixed

- Meisterschaften zu Fertigkeiten werden beim Schweben nur angezeigt, wenn sie ohnehin sichtbar sind.
- Items auf Akteuren sortieren funktioniert wieder.
- Ein Fehler, der zu unschönen Darstellungen im Actor Sheet führte, wurde behoben.

## 13.9.0

### Breaking Changes

- Die Modifikatoren `generalskills`,`fightingskills` und `magicskills` sind veraltet. Sie werden durch `actor.skill`
  ersetzt.
    - Existierende Modifikatoren werden migriert.

### New Features

- Es gibt einen neuen Modifikator `actor.skills`
    - Mit den Unterpfaden `general`, `fighting` und `magic` können Fertigkeitenwerte für alle Fertigkeiten eines Typs
      modifiziert werden.
    - Mit den Attributen `skill`, `attribute1` und `attribute2` kann der Modifikator auf bestimmte Fertigkeiten
      beschränkt werden.
- Die Dokumentation für Modifikatoren wurde erweitert.

## 13.8.8

### Fixed

- Tooltips für Meisterschaften werden wieder angezeigt.
- NPC Items können wieder auf NPCs gezogen werden.

## 13.8.7

### Fixed

- Ein Fehler wurde behoben, bei dem Widerstände von NPCs angezeigt wurden.

## 13.8.6

### Fixed

- Ein Fehler wurde behoben, bei dem Aktive Abwehr nicht immer ausgelöst werden konnte.
- Ein Fehler wurde behoben, bei dem Kampffertigkeiten nicht angezeigt wurden.

## 13.8.5

### Fixed

- Ein Fehler wurde behoben, bei dem die Scrollleiste von Objektdatenblätter sich zurückgesetzt hat, wenn das Blatt neu
  gerendert wurde.

## 13.8.4

### Fixed

- Die negative Strafe für Patzer wird jetzt addiert, nicht abgezogen.

## 13.8.3

### Fixed

- Ein Fehler wurde behoben, bei dem Attribute bei NPCs nicht angzeigt wurden
- Ein Fehler wurde behoben, bei dem man bei NPC Widerstände nicht gut eingeben konnte

### New Features

- Bonusgrenzen werden in Tooltips angezeigt

## 13.8.2

### Fixed

- Ein Fehler wurde behoben, bei dem das Standarddatenblatt für Ojbekte benutzt wurde.

## 13.8.1

### Fixed

- Zustände, Zaubereffekte und kanalisierte Zauber werden wieder auf Akteuren angezeigt.
- Objekte können wieder auf Akteure gezogen werden.
- Foundry Standardanwendungen ohne besonderes Styling können wieder geschlossen werden.
- Ein Fehler wurde behoben, bei dem nur Standardwerte für Proben genutzt wurden.

### New Features

- Viele Standardwerte für Proben wurden in `CONFIG.splittermond.checks` überführt

## 13.8.0

### Breaking Changes

- Fertigkeiten können nicht mehr von einem Akteur gezogen werden

### New Features

- Das NPC und Charakter Sheet wurde auf V2 migriert.
- Welche Objekte auf Akteure gezogen werden können, ist nun konfigurierbar.

## 13.7.4

### New Features:

- Der Würfel Dialog lässt sich jetzt überspringen, indem `skill.roll(options)` mit `askUser: false` aufgerufen wird. Special Thanks to @IceFreez3r

## 13.7.3

### Fixed

- Ein Fehler wurde behoben, bei welchem das Öffnen des Rüstungs-Sheets mit einem Stapelüberlauf endete.

## 13.7.2

### Fixed

- Ein Fehler wurde behoben bei dem Kämpfe nicht gestartet werden konnten wenn Token mit negativen Initiativen
  hinzugefügt wurden.
- Ein Fehler wurde behoben bei dem bereits ausgelöste Statuseffekte bei Kampfbeginn erneut ausgelöst wurden.

## 13.7.1

### Other

- Der Dialog zum Löschen von Items wurde auf V2 migriert
- Der Dialog zum Auswählen möglicher Fertigkeiten von Meisterschaften und Zaubern wurde auf V2 migriert
- Der Dialog zur Selektion des Typs von Zauberpatzern wurde auf V2 migriert
- Der Dialog zur Abfrage von Imports wurde auf V2 migriert
- Der Dialog zur Abfrage ob kanalisierte Zauber aufgehoben werden sollen wurde auf V2 migriert.

## 13.7.0

### New Features:

- ItemSheet wurde auf V2 migriert
- Der Check Dialog wurde auf V2 migriert.
- Der Dialog des NPC Import Makros wurde auf V2 migriert

### Fixed:

- Ein Fehler wurde behoben, bei dem Streiftrefferreduktionen immer ausgewertet wurden.

## 13.6.9

### Fixed

- Ein Fehler wurde behoben, der Proben aus Fließtexten verhinderte

## 13.6.8

### Fixed

- Bei Streiftreffern wird jetzt das doppelte der Anzahl der angesagten Manöver vom Schaden abgezogen.
    - Die Option Schaden selber zu nehmen muss manuell umgesetzt werden.
- Ein Fehler wurde behoben, der die Kampfanzeige brach, wenn man alle Kämpfer auf abwarten gesetzt hat.
- Bei Herausragenden Erfolgen für Angriffe wird jetzt die Tickzahl um 1 reduziert.

## 13.6.7

### Fixed

- Statuseffekte die im Kampf anwendet werden beginnen immer am aktuellen Tick
- Alle Statuseffekte die während eines Kampfes angelegt werden werden berücksichtigt.
- Ein Fehler wude behoben, bei dem Ticks von Angriffen nicht abgerechnet werden konnten.
- Der Combat Tracker funktioniert wieder.
    - Korrekte Behandlung von Abwarten / Bereithalten
    - Dialog zum Vorrücken von Kampftteilnehmern

## 13.6.5, 13.6.6

### Fixed

- the bug that prevented release 1.6.4.

## 13.6.4

### New Features

- Es gibt jetzt eine Funktion `addTicks` mit der Kampfteilnehmer auf der Tickleiste vorgerückt werden können.

### Fixed

- Die Tickleiste positiniert sich jetzt auch neu, wenn die Seitenleiste durch einen Click auf einen Tab geöffnet wird.
- Ein Fehler wurde behoben, bei dem Geschwindigkeitsmodiffikatoren nicht beachtet wurden.
- Ein Fehler wurde behoben bei der sich die Tickleiste nicht aktualisiert hat, wenn ein der Statuseffekt eines
  Kampfteilnehmers geändert wurde.

## 13.6.3

### Fixed

- Ein Fehler wurde behoben bei dem Fokusmodifikatoren mit ungültigen Fertigkeits- oder Typusfiltern ausgestattet wurden
- Ein Fehler wurde behoben, bei denen Änderungen an Kampteilnehmern nicht auf der Tickleiste aktualisiert wurden

## 13.6.2

### New Features

- Modifikatoren für Items können auf Items mit bestimmten Fertigkeiten beschränkt werden
    - Attribut `skill` kann genutzt werden, um den Modifikator auf Items zu beschränken, die eine bestimmte Fertigkeit
      nutzen.
    - Beispiel: `damage itemSkill="Klingenwaffen" 2` addiert 2 Schaden zu allen Waffen, die die Fertigkeit "
      Klingenwaffen" nutzen.
    - Das Attribut kann mit "itemType" kombiniert werden, um z.B. nur Schilde mit der Fertigkeit "Klingenwaffen" zu
      modifizieren.
    -

### Fixed

- Fokusmodifikatoren werden automatisch migriert

## 13.6.1

### Breaking Changes

- Die Modifikatoren `foreduction` und `foenhancedreduction` sind veraltet. Sie werden durch `focus.reduction` und
  `focus.enhancedreduction` ersetzt.
    - Existierende Modifikatoren werden bei der Migration automatisch umbenannt.

### New Features

- Streiftreffer bei Angriffen werden jetzt bei der Schadenbserechnung berücksichtigt.
- es gibt jetzt Modifikatoren `focus.addition` und `focus.enchandedaddition`, die es erlauben Fokuskosten zu erhöhen.

### Fixed

- VTD bei aktiver Abwehr wird korrekt angezeigt, wenn der Wert mittels Splitterpunkt modifiziert wird.

## 13.5.2

### Fixed

- Korrekte optionale Attribute werfen jetzt keine Fehler mehr
- Featuremodifikatoren müssen den Namen des Merkmals benutzen.

## 13.5.1

### Fixed

- Ein Fehler wurde behoben, bei dem die Splitterpunkte sich nicht mit dem Heldengrad erhöht haben.
- Ein Fehler wurde behoben, bei dem die Zauberdauer Modifikatoren zu Fehlern bei nicht auf Akteuren verorteten Zaubern führten.
- Ein Fehler wurde behonben, bei dem der Wert der Zauberdauer in etwas ungültiges konvertiert wurde.

## 13.5.0

### New Features

- Einträge für Zauberdauer werden jetzt normiert und validiert
    - Damit sind nur noch die Dauern "Ticks" und "Minuten" zulässig
- Es gibt zwei neue Modifikatoren "item.castDuration" und "item.castDuration.multiplier", die die Zauberdauer modifizieren
    - "item.castDuration" addiert eine feste Anzahl an Ticks oder Minuten zur Zauberdauer Bsp: `item.castDuration item="Feuerball" Einheit="Ticks" 2` addiert 2 Ticks zur Zauberdauer des Zaubers "Feuerball"
    - "item.castDuration.multiplier" multipliziert die Zauberdauer mit einem Faktor Bsp: `item.castDuration.multiplier item="Feuerball" 2` verdoppelt die Zauberdauer des Zaubers "Feuerball". Modifikatoren von `0` werden ignoriert, da eine Zauberdauer von `0` nicht sinnvoll ist.
    - Beide Modifikatoren können mit dem Attribut "item" auf einen bestimmten Zauber beschränkt werden.
    - Der Modifikator kann auch mit "itemType" beschänkt werden, allerdings haben nur Zauber eine Zauberdauer.
    - Optionen für Angriffswürfe können jetzt überschrieben werden (vielen Dank an IceFreezer für die Patch)

## 13.4.0

### Breaking changes

- Die Modifikatoren 'damage' und 'weaponspeed' sind veraltet. Sie werden durch "item.damage" und "item.weaponspeed" ersetzt.
- der Modifikator 'item.mergeFeature' ersetzt 'item.addFeature'. Mit diesem wird das Merkmal des Modifikators einem Objekt hinzugefügt, wenn die Merkmalsstufe höher ist als die des gleichen Merkmals des Objekts. (Hat das Objekt das Merkmal nicht, wird das Merkmal des Modifikators hinzugefügt.)

### New Features

- Es gibt einen 'splittermond.ready' Hook, der aufgerufen wird, wenn Splittermond vollständig initialisiert ist.
- Die Modifikatoren "item.damage", "item.addfeature", "item.mergefeature" und "item.weaponspeed" haben einen neuen Filter namens "itemType". Gültige Werte sind alle Itemtypen wie z.B. "Waffe", "Zauber".
- 'item.addFeature' erlaubt das Hinzufügen von Merkmalsstufen, für schon vorhandene Merkmale.
- Bei der Schadensberechnung wird die Stufe des Merkmals "Scharf" auf die Hälfte der Anzahl der Seiten der Schadenswürfel begrenzt. Dies spiegelt sich nicht in der Anzeige wider.

### Fixed

- Kommata in Modifikatorzeichenketten, die sich in Attributswerten (begrenzt durch " oder ') befinden, werden nicht mehr als Trenner zwischen Modifikatoren gewertet.
- Die Tickleiste füllt jetzt allen zur Verfügung stehenden Platz aus.

## 13.3.1

### Fixed

- Ein Fehler wurde behoben, bei dem Objekte nicht angezeigt werden konnten, da im Bauprozess der Klassennamen durch einen kürzeren mit $-Zeichen ersetzt wurden.

## 13.3.0

### New Features

- Es gibt einen neuen Modifikator "npcattacks", der es erlaubt Den "Fertigkeitswert" eines Angriffs, dessen Ursprung keine ausrüstbarer Gegenstand ist, zu modifizieren. Dieser Modifikator bei Nutzen der Zustände "Erschöpft" und "Ringend automatisch zur Anwendung."

### Fixed

- Private Chatnachrichten werden nun farblich hervor gehoben
- Fernkampfangriffe können nun wieder vorbereitet werden

## 13.2.5

### Fixed

- Invalide vorbereitete Zauber werden nun gelöscht
- Bei NPC Angriffen wird der Schaden nun korrekt angezeigt.
- weaponspeed Modifikatoren funktioniere nun wieder

## 13.2.4

### Fixed

- Der Modifikator "lowerFumbleResult" wird nun korrekt ausgewertet.
    - Die Stärke "Stabile Magie" funktioniert nun korrekt.

## 13.2.3

### Fixed

- Genesis Importer scheitert nicht an W6 Einträgen wie z.B. bei Geschärfter Klinge
- Herausragende Erfolge reduzieren nun Verzehrten Fokus von kanalisierten Zaubern

### Other

- Die Toolbar wurde Application V2 umgestellt

## 13.2.2

### Fixed

- Initiativewundmalus wird nur noch für Initiative verwendet
- Schilde haben wieder einen Waffenschaden
- Vorzeichen für Initativemali werden jetzt korrekt angezeigt

### Other

- Der Spezieszauberer wurder auf Application V2 umgestellt

## 13.2.1

### Fixed

- Wundmalus addiert sich nun korrekt zu Initiative
- Das Hintergrundbild im Setup is jetzt deutlich kleiner
- Die Kompendiumbrowserliste kann jetzt gescrollt werden

### Other

- Der Kompendiumbrowser ist basiert jetzt auf Application V2
- Die Größe des Kompendiumbrowserfensters kann nun
- Darstellung der Initiativemali verbessert

## 13.2.0

### New Features

- System now comes with a custom background image for all worlds.
- Anfügen von Zaubern oder Meisterschaften an einen Charakter oder NSC schaut jetzt auf gesetzte Fertigkeit, wenn kein Wert in "Verfügbar in angegeben ist"
- Dialog zur Auswahl einer beliebigen Fertigkeit beim Anfügen von Zaubern oder Meisterschaften an einen Charakter oder NSC ist nun auch bedienbar.

### Fixed

- Bei Zaubern kann für Schadenstyp und Schadensart nun wieder 'nichts' angegeben werden.

## 13.1.0

### New Features

- Bei Zauberproben wird nun das Bild des Zaubers, so vorhanden, in der Chatnachricht angezeigt

## 13.0.12

### Fixed

- Import von Items in Unterordner funktioniert wieder

## 13.0.11

### Fixed

- Anfügen von Zaubern an einen Charakter oder NSC ist jetzt robuster gegenüber Fehleingaben
- Zaubermerkmale können wieder angegeben werden

## 13.0.10

### Fixed

- Merkmal Stabil wird nun wieder korrekt bei der Schadensberechnung berücksichtigt
- Wenn Durchdringung größer als die Gesamtschadensreduktion ist, reduziert "Durchdringung" nun nicht mehr mit "Stabil" geschützte Schadensreduktion.

## 13.0.9

### Fixed

- Fehlerhafte Korrektur von 13.0.8 korrigiert.

## 13.0.8

### Fixed

- LP und FO regenieren sich nun korrekt bei Ruhephasen
- Upgrade auf Font Awesome 6

## 13.0.7

### Fixed

- Import von Items durch Strg+V auf der Leinwand funktioniert wieder
- Der Itemimport wird bei Anwendung von Strg+V im Chat oder im Journal nicht mehr ausgeführt

## 13.0.6

### Fixed

- Bei exakt verbleiben nur die ursprüngliche Anzahl an Würfen
- Angriffe können wieder gelöscht werden
- Säkundäre Waffenmerkmale werden wieder korrekt angezeigt

### Known issues

- Der Import von Items mittels Ctrl+V funktieniert bis auf weiteres nur wenn der Text in eine Eingabe (Journalseite, Chat) eingefügt wird. Ursache ist die Art wie Foundry solche Eingaben handhabt. Eine Lösung ist in Arbeit

## 13.0.5

### Fixed

- Berechnung von Schaden bei Waffen mit dem Merkmal "Wuchtig" funktioniert wieder
- Merkmale von Gegenständen, die nicht bekannt sind, werden nun Ignoriert und blockieren nicht den Genesis Import.
- Styling der Settings verbessert
- Styling des Charakterimportdialogs verbessert

## 13.0.4

### Fixed

- Styling der Journal Seiten ist jetzt konsistenter mit dem Rest
- Bilder in den Kompendien werden jetzt gefunden

## 13.0.3

Mit großem Dank an ID_Bastion für das Überarbeiten der Dokumentation und an kleinerFuchs fürs Testen

### Breaking changes

- Migrationen von v0.12.11 müssen zuerst auf v0.12.20 migrieren.
- Kompatibilität von Splittermond mit Foundry Version V12 wird nicht mehr garantiert
- Quench tests werden nicht mehr in Produktion ausgeliefert
- Der Modifikator `damage.<Waffename>` ist kein gültiger Modifikator mehr
- Der Modifikator `weaponspeed.<Waffename>` ist kein gültiger Modifikator mehr
- Ersatz für beide ist `damage item="Waffename"` bzw. `weaponspeed item="Waffename"`

### New Features

- Kompatibel mit Foundry V13
- Der Versionsname setzt sich zukünftig aus der kompatiblen Foundry Version, sowie breaking / patch changes zusammen
- Schadensmodifikatoren akzeptieren jetzt Merkmale und Schadensarten
    - neue syntax ist `damage Merkmale="Scharf 2" Schadensart="Feuerschaden" 3`
    - Ein Schadensmodifikator übernimmt immer die Merkmale des Objekts, auf dem er angewandt wird.
    - Ein Schadensmodifikator übernimmt die Schadensart des Objekts, auf dem er angewandt wird, wenn keine Schadensart angegeben ist.
- Schadensmodifikatoren können global wirken
- Merkmale von Waffen, Schilden, NPC Angriffen und Rüstungen erkennen jetzt Modifikatoren
    - Modifikatoren gelten immer für primäre und sekundäre Waffenmerkmale
    - Modifikatoren können mit `item.addfeature` hinzugefügt werden
    - Sie können global gelten oder mittels attribute `item="<name>" beschränkt werden`
    - Merkmale die für gewöhnlich keinen Wert haben (z.B. "Ablenkend") müssen mit Wert 1 hinzugefügt werden
    - Beispiel: `item.addfeature feature="Ablenkend" item=Schwert" 1`
- Überarbeitete und detailliertere Dokumentation

### Fixed

- Wenn mehr als ein Probendialog offen ist, funktioniert das Auswählen von Modifikatoren und Manövern jetzt zuverlässig.
- Alle möglichen Fehler die durch die Migration nach V13 aufgetreten sind.

## 0.12.20

### Fixed

- Fertigkeitsgruppen akzeptieren jetzt wieder Schwerpunkte
- Nicht auswählbare Modifikatoren werden jetzt bei nach dem Wurf angezeigt
    - Variable Terme zeigen nicht das Ergebnis an, sondern den Term

## 0.12.19

### Fixed

- Modifikatoren mit negativem Fokus als Wert werden jetzt korrekt eingelesen
- Der Wert 0 ist nun ein gültiger Modifikatorwert
- Jede Fokusreduktion wird jetzt nur einmal auf einen Zauber angewandt
- Das Modul "Einstellungen" wartet nun 5 statt 2 Sekunden bis die Spielwelt geladen ist
- Die meisten Einstellungen werfen keinen Fehler mehr, wenn sie nicht innerhalb der Frist registriert werden. Stattdessen wird ein Fehler oder eine Warnung in die Konsole geschrieben.

## 0.12.18

### Fixed

- Fokuskostenabrechnung wird jetzt auch angezeigt, wenn Fokuskostenreduktion nicht als Option gewählt ist.
- Schadensarten beinhalten jetzt Naturschaden
- Fokusreduktionen werden jetzt mit der Zustandsstufe multipliziert
- Fokusmodifikatoren unterstützen jetzt Verweise
    - hat zurzeit vermutlich keine praktische Anwendung

## 0.12.17

### New features

- Würfelmodifikatoren:
    - Auswertungsinterval sollte jetzt besser mit Proben kongruieren
    - Beherrscht jetzt tatsächlich auch komplexere Würfelausdrücke

### Fixed

- Auswählbare Modifikatoren werden nicht mehr doppelt berechnet
- NSC Schadensreduktion ist wieder korrekt
- Fokusreduktionen die nur Zahlen sind, werden wieder korrekt berechnet

## 0.12.16

### New features

- Würfelmodifikatoren (BETA)
    - Würfelwerte die Foundry lesen kann, können als Modifikatorwerte eingesetzt werden
    - Würfelwürfe werden unter Umständen von einem minderwertigen Ersatzalgorithmus errechnet (wenn das vom Server errechnete Ergebnis noch nicht vorliegt)
    - Die Auswertung des Würfelausdrucks steht in keinem Verhältnis zu einer Probe (z.B. wird er schon beim Anzeigen von Modifikatoren mehrfach ausgewertet). Bei einer Auswertung wird manchmal ein alter, manchmal ein neuer Wert zurückgegeben.
    - Der zurückgegebene Wert bewegt sich immer in dem bereich den die Würfelformel vorgibt (d.h. für 1W6 liegt er zwischen 1 und 6)

- Splitterpunkt boni können mittels Meisterschaften gesetzt werden
    - Bonus kann mit dem Attribut `Fertigkeit=<name>` auf eine Fertigkeit eingeschränkt werden
    - Alternativ kann die interne Darstellung `skill=<skillId>` verwendet werden
    - Als Wert kann eine Referenz auf einen anderen Wert des Charakters angegeben wereden
        - Attribute können mit `${<code>}` z.B. `${AUS}` referenziert werden.
    - Der Minimale Bonus ist immer 3 und eine Warnung wird auf die Console geschrieben, wenn ein Modifikator einen niedrigeren Wert vorschlägt.
- Modifikatorparser fehler sind übersetzt

### Fixed

- Modifikatoren von Rüstungen werden jetzt wieder korrekt berechnet
- Korrekte Darstellung von auswählbaren Modifikatoren

## 0.12.15

### Fixed

- Hinzufügen von Kompendium Spezies zu Charakteren funktioniert jetzt wieder
- Wundstufen aus dem Zustand 'Verwundet' werden jetzt bei vollen LP korrekt berechnet
- Modifikatoren werden jetzt wieder korrekt berechnet und angezeigt

## 0.12.14

### Fixed

- Zaubererfolgsgradoptionen können jetzt wieder individuell ausgewählt werden
- Alle anderen checkboxen uns schalter sollten auch gehen

### Breaking changes

- Bei Modifikatoren können Schwerpunkte mit Leerzeichen nur als emphasis="Name mit Leerzeichen" angegeben werden

## 0.12.13

### Fixed

- Resistenzen und Verwundbarkeiten werden jetzt immer beachtet
- Patzertabelle wird auch bei verpatzen einer Aktiven Abwehr angezeigt
- Schadensübersicht zeigt auch negative Modifikatoren an.
- Migration von 0.12.11 nach 0.12.12 fügt keine Leerzeichen mehr ein und übersetzt "Susceptibility" korrekt

## 0.12.12 HOTFIX##

### Fixed

- Verwundbarkeiten und Resistenzen werden nun korrekt bei der Schadensberechnung berücksichtigt
    - Die Schlüsselwörter dafür sind 'weakness.<damage Type>' und 'resistance.<damage Type>'
    - 'susceptibility' findet keine Anwendung mehr
    - Beide Schlüsselwörter können positive und negative Werte annehmen.
        - Verwundbarkeiten werden dabe exponentiell gehandhabt:
          d.h "Verwundbarkeit 1 = "Schaden _ 2", "Verwundbarkeit 2" = "Schaden _ 4",
        - Resistenzen sind linear = "Resizenz 2" = +2 Schaden, "Resistenz 3" = +3 Schaden

### New Features

- Das Rüstungsmerkmal Stabil wird nun berücksichtigt
- Es gibt eine Option die Wirkung von 'Stabil' auf die Rüstung zu begrenzen, die das Merkmal trägt
- Detaillierte Schadensreduktionsdaten via tooltip.

## 0.12.11

### Fixed

- Hinzufügen von Mondzeichen Per Drag And Drop wenn es schon ein Mondzeichen gibt
- Patzerdialoge tauchen nun bei dem Nutzr auf der den Wurf gemacht hat
- Einen Fehler das manchmal das Auswählen von Zauberoptionen verhindert hat.
- Beim Wiederholten Öffnen eines Items wird jetzt immer der übersetzete Text angezeigt.

### New features

- Überarbeitete Schadensberechnung
    - Schadensberechnung beachtet jetzt Verwundbarkeiten und Schadensreduktion
    - Waffenlose Angriffe verursachen jetzt Betäubungsschaden außer der Charakter hat "Natürliche Waffe"
    - Mittels Hooks können Immunitäten eingestellt werden
    - Betäubungsimmunität wird automatisch auf Betäubungsschaden angewendet
    - Es gibt eine Einstellung mit der man anzeigen kann welche Schadensdialoge man sehen möchte
- Verwundbarkeiten können über den modifikator 'susceptibility' hinzugefügt werden
    - Der Importer erkennt Verwundbarkeiten und Resistenzen
    - folgende Modifikatoren existieren:
      "physical",
      "mental",
      "electric",
      "acid",
      "rock",
      "fire",
      "heat",
      "cold",
      "poison",
      "light",
      "shadow",
      "bleeding",
      "disease"

## 0.12.10 HOTFIX##

### Fixed

- Hinzufügen von Mondzeichen Per Drag And Drop
- Anzeige von LP und FO im Token

### Breaking Changes

- alle anderen Attribute eines Akteurs (außer Splitterpunkte für Charaktere) werden nicht mehr als Ressourcen geführt.

## 0.12.2 HOTFIX##

2024-07-22

- fixed: NPC- und Item-Importer (Copy-and-Paste von PDF-Quellen) funktioniert wieder. Anmerkung: Der Importer funktioniert nur bei Nutzung des Adobe Acrobat PDF-Betrachters

## 0.12.1##

2024-07-15

- fixed: Genesis Import (Meisterschaften wurden falsch importiert)
- fixed: Drag-n-drop von Zaubern auf das Sheet
- fixed: Magiepatzer-Dialog wurde nicht korrekt vorausgefüllt
- fixed: Merkmale werden bei Schadenswürfen in Zaubern wieder berücksichtigt

## 0.12.0##

2024-07-10

Diese Version ist nicht mehr V11 kompatibel. Bitte updatet auf V12. Diese Version basiert auf den mühevollen Arbeiten von `m-2 squared`. Vielen Dank dafür!

- added: V12 support
- added: neue dynamische Zauber-Chat-Card
- changed: sehr viel Refactoring

## 0.11.0##

2023-07-10

Diese Version ist nicht mehr V10 kompatibel. Bitte updatet auf V11 oder V12. Die Änderungen basieren auf den Arbeiten von `m-2 squared`. Vielen Dank dafür!

- added: Zauber können im Compendium nun nach Schwelle gefiltert werden
- added: negative Zauberkostenreduktion ist möglich
- changed: Viel Code "unter der Haube"

## 0.10.4##

2023-08-28

- fixed: Kompendium-Browser
- added: Meisterschaften können als Manöver gekennzeichnet werden (Issue #139)
- added: Manöver können beim Fertigkeitswürfen ausgewählt werden (Issue #139)
- added: _Streiftreffer_ bei nicht erreichten EG für Manöver wird berücksichtigt (Issue #139)

## 0.10.3##

2023-07-29

- fixed: Im NPC-Sheet konnten manche Felder nicht editiert werden (Issue #145/#146)
- fixed: Der "minimale Stärke"-Wert wurde im Rüstungs-Sheet nicht angezeigt (Issue #143)
- added: Waffenmerkmal "improvisierte Waffe" sowie die Meisterschaft "Improvisation" implementiert

## 0.10.2 HOTFIX##

2023-07-15

- fixed: Rüstungs- und Schild-Items lassen sich nicht mehr öffnen (Issue #132)
- added: Schwierigkeit einer Fertigkeitsprobe kann mit Mausrad erhöht/erniedrigt werden (Issue #141)
- added: Waffenmerkmal "Unhandlich" wird berücksichtigt (Issue #98)

## 0.10.1 HOTFIX##

2023-07-15

- fixed: Combat in V11

## 0.10.0

2023-07-15

Diese Version ist nicht mehr V9 kompatibel. Bitte updatet auf V10.

- added: Neuer Fertigkeitsproben-Dialog mit mehr Informationen
- added: V11 support. Das System ist nun auch mit Foundry VTT V11 kompatibel.
- changed: alter pre-V10 Code wurde entfernt
- changed: Stat-Block der Itemsheets wurde angepasst
- fixed: @-Befehle sind nun auch in Item/Actor-Descriptions möglich
- fixed: Fertigkeitsauswahldialog für Zauber und Meisterschaften
- fixed: Compendium-Browser wieder funktionstüchtig

## 0.9.8

2023-05-23

- added: kleiner Wertekasten unterhalb des Item-Namens im Itemsheet
- fixed: Compendium-Browser ist wieder nutzbar

## 0.9.7

2022-10-22

- added: Das Löschen von Items vom Charakterbogen muss explizit bestätigt werden. (Issue #113)
- fixed: Wurf auf Zauberpatzertabelle nicht möglich. (Issue #134)
- fixed: Modifikator "GSW.mult" wird nach dem Löschen nicht zurückgesetzt. (Issue #133)
- fixed: In der Chatnachricht für Angriffe auf Fernkampfwaffen wird die WGS als Tickanzahl verwendet anstatt 3 Ticks. (Issue #131)
- fixed: Im NSC-Bogen kann kein 0-Attribut eingegeben werden. (Issue #128)

## 0.9.6

2022-09-22

- fixed: In der Token Action Bar werden die Abgeleiteten Werte nicht mehr angezeigt.

## 0.9.5

2022-09-22

- fixed: Falscher Tick für nachträglich hinzugefügte Token mit negativer Initiative (Issue #127).
- fixed: Combat-Tracker-Datenobjekt wurde fälschlicherweise überschrieben.

## 0.9.4

2022-09-20

- added: Das Modul "Monks Little Details" kann mit der Tickleiste verwendet werden.
- fixed: Einige Bugs bzgl. des Combat-Trackers wurden behoben.
- fixed: Darstellungsfehler der Seitenleiste in den Foundry-Einstellungen wurden behoben.

## 0.9.3

2022-09-13

- fixed: Im NSC-Charakterbogen wurden Abgeleiteten Werte nach Änderung teilweise wieder zurückgesetzt (Issue #119)
- fixed: Einige Bugs bzgl. des Combat-Trackers. (Probleme mit negativen Tickwerten etc.)

## 0.9.2

2022-09-06

- fixed: Im NSC-Charakterbogen konnten keine Abgeleiteten Werte und die Schadensreduktion überschrieben werden (Issue #119)
- fixed: Beim Hinzufügen eines Angriffs im NSC-Charakterbogen wurde der Charakter fehlerhaft. (Issue #122)
- fixed: Tickleiste wurde nicht auf aktuellen Tick gesetzt (Issue #121)
- fixed: Nachträglich zum Kampf hinzugefügte NSCs werden auf der Tickleiste relativ zum aktuellen Tick positioniert. (Issue #115)
- fixed: Feld "id" wurde in system.json für V10-Kompatibilität hinzugefügt. (Issue #118)

## 0.9.1

2022-08-31

- **added: Foundry VTT Version V10 Support!** Aufgrund umfangreicher Änderungen in Foundry VTT in Version 10 musste das System angepasst werden.
- added: Den NSCs können zusätzlich zu Waffen (die eine Kampffertigkeit benötigen) auch NSC-Angriffe hinzugefügt werden. Dieser Item-Typ ermöglicht es Angriffe ohne zugehöriger Kampffertigkeit zu erstellen.
- added: Neue Modifikatoren für Lebenspunkt-/Fokuspunktregeneration `healthregeneration.bonus` und `focusregeneration.bonus` (Issue #107)
- added: +- Buttons für Schwierigkeit bei "Fertigkeitsprobe anfordern"-Dialog hinzugefügt (Issue #110)
- fixed: Verstärkte Zauber-Kosten wurden falsch berechnet (Issue #108)
- changed: Das System wurde an vielen Stellen komplett überarbeitet. Dadurch konnte redundanter Code entfernt werden.
- changed: Copy-And-Paste-Importer wurde für NPCs, Waffen und Zauber überarbeitet.
- changed: Die Tickleiste wurde intern überarbeitet, sodass die Reihenfolge der Spieler synchron ist.

## 0.8.5 HOTFIX

2022-08-10

- fixed: Import von Genesis-Charakteren

## 0.8.4

2022-03-21

- added: Statuseffekte (wie Brennend) tauchen nun als Token in der Tickleiste auf. Der Regeltext wird bei entsprechender Aktivierung im Chat eingeblendet. Die Statuseffekte wurden im entsprechenden Kompendium für dieses Feature vorbereitet. (Dank geht an Jean-Pierre)
- added: Kompatibilität der Token-Aktionsleiste mit `minimal-ui`.
- added: Die max. Höhe der Zauber/Fertigkeitslister der Token-Aktionsleiste wurde eingeschränkt und eine Scrollbar hinzugefügt.
- fixed: negative Initiative erzeugt im Combat-Tracker keinen Fehler mehr.
- fixed: Token konnten nicht per Drag-and-Drop auf Tick 0 gezogen werden.

## 0.8.3

2022-03-14

- added: Die Token-Aktionsleiste kann nun zeitlgeich mit der Macroleiste angezeigt werden (Einstellung änderbar)
- added: Die Token-Aktionsleiste ist mit dem modul `custom-hotbar` kompatibel
- fixed: Compendium-Browser Filtermöglichkeiten (Dank an Tony)
- fixed: Das Inventar kann sortiert werden (Dank an Tony)

## 0.8.1 HOTFIX

2022-03-01

- fixed: Beim Erstellen einer Würfelproben-Chatnachrichten wurden die entsprechenden Aktionen teilweise nicht auf dem korrekten Token angewendet.
- fixed: CSS wurde überarbeitet (Dank geht an Tony)
- changed: Verlinkungen von Zuständen beziehen sich ab jetzt auf die Zustände im Kompendium. Zustände müssen nicht mehr importiert werden.

## 0.8.0

2022-02-28

- added: Token-Aktionsleiste: Über diese Leiste können Proben, Angriffe, Zauber, Aktive Abwehr etc. ohne Öffnen des Charakterplats ausgeführt werden. Die Leiste ersetzt für die Spieler die Token-Leiste. Für den Spielleiter wird diese Leiste nur bei selektiertem Token angezeigt.
- added: Token-Aktionsleiste: Zauber und Fernkampfwaffen können vorbereitet werden.
- fixed: Roll-Tooltip für Aktive Abwehr
- changed: Neuimplementierung der des `foreduction`-Modifiers

## 0.7.6 HOTFIX

2022-01-12

- fixed: NPCs können keine Proben würfeln

## 0.7.5 HOTFIX

2022-01-12

- fixed: Fixed Chat Output

## 0.7.4

2022-01-12

- added: Für Proben kann nun ein Splitterpunkt ausgegeben werden um das Ergebnis um +3 zu modifizieren (GRW S. 81)
- added: Zauber können nun Waffenmerkmale für Schaden beinhalten (Danke Jean-Pierre)
- added: Kulturkunde-Items besitzen nun Modifier
- added: neuer Modifier "foreduction" und "foenhancedreduction" zur reduzierung der Fokuskosten (siehe JournalEntry zu den Modifikatoren)
- fixed: Item-Dialoge haben nun sinnvolle Größen (Danke Jean-Pierre)
- fixed: Falscher EG-Wert für Erfolgsgradoption "Kanalisierten Fokus verringern"
- fixed: In NPC-Sheet ist die Eingabe für LP notwendig (Danke Jean-Pierre)
- fixed: CSS-Probleme

## 0.7.3

2022-01-03

- added: Lunare werden vom Charakterimporter übernommen.
- fixed: Charakter-Importer funktionierte teilweise nicht.
- fixed: NSC-Importer: Ctrl+v funktionierte auf manchen Servern nicht.

## 0.7.2

2022-01-02

- fixed: NSC-Sheet: Fehler bei der Übernahme der Fertigkeitswerte, falls die Fertigkeitspunkte auf 0 gesetzt wird.
- fixed: NSCs mit Waffen ohne Merkmalen konnnten nicht importiert werden.
- fixed: NSC-Importer: Fehler bei Import von NSCs mit Fernkampfwaffen (Issue #68)

## 0.7.1 HOTFIX

2021-12-28

- fixed: Items konnten nicht vom Sheet gelöscht werden
- fixed: Modifikator "lowerFumbleResult" wurde fehlerhaft ausgewertet.

## 0.7.0

2021-12-28
Das System ist nun für Version 9 von Foundry VTT kompatibel

- changed: veraltete API-Funktionen auf neue geändert
- fixed: Aus "Geschichten und Mythen" wurde "Geschichte und Mythen"! VORSICHT: Dies kann zu Kompatibilitätsproblemen mit Modifikatoren führen.

## 0.6.3 HOTFIX

2021-12-14

- fixed: Der Kampffertigkeitswert von NSCs wurde bei Anwendundung von Schaden erhöht (Issue #66)
- fixed: Die Regeneration bei Ruhephase wurde falsch berechnet (Issue #67)
- fixed: Modifilator GSW.mult wurde nicht richtig angewendet (Issue #71)
- fixed: Tooltip für KW und GW

## 0.6.2

2021-10-29

- added: Die Meisterschaft "Großmeister" ist nun implementiert. Eine Meisterschaft kann als "Großmeister"-Meisterschaft markiert werden (Haken in Meisterschaftseigenschaften). Ist Diese Meisterschaft vorhanden, werden automatisch "Großmeister"-Würfe bei entsprechender Fertigkeits-Probe geworfen.
- added: Mondzeichen können jetzt aus dem Charakterblatt hinzugefügt werden (wenn noch kein Mondzeichen hinzugefügt wurde.)
- fixed: Fehlerhaftes parsen im NSC-Copy-and-Paste-Importer
- fixed: Malus für "min. Attribute" bei Waffen wurde falsch berechnet
- fixed: Für die Fertigkeit "Tierführung" waren die falschen Attribute hinterlegt

## 0.6.1

2021-10-18

- added: Dokumentation für fehlende Modifikatoren
- added: Verminderte Patzerstufen werden in Chatnachricht dargestellt
- added: Es können mehrere Zauber gleichzeitig mittels Copy-and-Paste-Importer hinzugefügt werden (Dank geht an Jean-Pierre für diese Erweiterung)
- fixed: Bug in NSC-Sheet wenn nur Fertigkeitswerte (statt Punkte) definiert wurden
- fixed: Darstellung der Patzertabellen in Chatnachricht korrigiert
- fixed: Tooltip in Lebenspunkteelement falsch (Issue #53)
- fixed: Kompatible FVVT-Core-Version wurde auf aktuelle Version angepasst

## 0.6.0

2021-08-10

- added: Neues Design das nun die Möglichkeit bietet Themes zu erstellen
- added: 3 neue UI-Themes (einstellbar in den System-Einstellungen)
- removed: legacy 0.7.x code

## 0.5.0

2021-07-12

- added: Tick Bar for a more Splittermond-like Combat Tracker experience
- removed: 0.7.x support

## 0.4.8

2021-07-12

- fixed: Combat Tracker problems with FVTT 0.7.x

## 0.4.7 HOTFIX

2021-07-12

- fixed: Hilfetext für Modifikatoren und minimale Attribute in Item-Sheets

## 0.4.6

2021-07-12

- added: Hilfetext für Modifikatoren und minimale Attribute in Item-Sheets
- changed: Robusteres parsen der Modifikatoren (case insensitive) und "minimalen Attribute"
- changed: Situative Modifikatoren in "Modifikatoren"-JournalEntry hinzugefügt (inkl. Beispiele)
- fixed: Malusberechnung für minimale Attribute von Waffen/Schilden
- fixed: Fehler bei Nutzung des mitgelieferten Foundry-VTT-Clients unter 0.7.x
- fixed: CombatTracker für Version 0.7.x

## 0.4.5

2021-06-30

- added: Es kann nun eine Aktive Abwehr aus der Angriffs-Chatnachricht initiiert werden.
- changed: Combat Tracker: Bei gleicher Initiative gilt für die Kampfreihenfolge die höhere Intuition (GRW S. 157)

## 0.4.4

2021-06-21

- added: Der Schaden von Schadenswürfen kann mit dem Button "Schaden anwenden" auf selektierte Token angewendet werden (nur GM). Dazu öffnet sich ein weiterer Dialog in dem der Schaden modifiziert werden kann.
- added: Die Quelle des Schadens wird in der Chatnachricht des Schadenswurfs angezeigt.
- added: Unter "Fertigkeiten" im Spielercharakterblatt werden alle Fertigkeiten ausgeblendet in denen keine Fertigkeitspunkte vergeben wurden (Gleiche Funktionalität wie bei NSCs). Durch einen Klick auf das Augesymbol lassen sich alle Fertigkeiten einblenden.
- fixed: Fokuskostenparser hat fehlerhafte Kosten ausgegeben
- fixed: Modifikatoren von abgeleitete Werten wurden im NSC-Sheet mehrfach angewendet

## 0.4.3 HOTFIX

2021-06-19

- fixed: Schadenschaltfläche in Chatnachricht funktioniert nicht

## 0.4.2 HOTFIX

2021-06-18

- fixed: Schadenschaltfläche wurde in Chatnachricht nicht angezeigt

## 0.4.1 HOTFIX

2021-06-18

- fixed: Fokusabrechnung in Chatnachricht funktioniert nicht

## 0.4.0

2021-06-18

- added: Ausrüstungsgegenstände können Schaden annehmen. Die "Gesundheitsstufe" von Waffen beeinflusst den Fertigkeitswert. Die Haltbarkeit wird automatisch anhand der Last und Härte des Objekts bestimmt.
- added: In "Kampf" werden nun mehr Informationen zur Kampffertigkeit im Tooltip angezeigt (Modifikatoren etc.)
- added: +/--Schaltflächen bei numerischen Feldern
- added: Fokuspunkte können in der entsprechenden Chatnachricht direkt verrechnet werden
- added: Mit `@Ticks[5 Ticks,<Beschreibung>]` kann in JournalEntries und Chatnachrichten eine interaktive Schaltfläche erstellt werden, um die entsprechende Tickanzahl vorranzuschreiten. Dieser Befehl wird unteranderem in den Patzernachrichten verwendet.
- changed: Die Patzertabellen wurde neu implementiert. Dadurch fällt die Notwendigkeit weg Macros für die Spieler freizugeben. Trotzdem gibt es weiterhin Makros, die es erlauben manuell auf die Patzertabelle würfeln zu lassen (Wenn keine Chatnachricht hierfür vorhanden ist). Mit einem Klick auf die Patzernachricht, lassen sich alle Einträge in der Patzertabelle ein- und ausblenden.
- changed: Fertigkeitsprobeanfragen wurden neu implementiert. Auch hier müssen keine Macros mehr für die Spieler freigegeben werden. Der Chatbefehl für eine Fertigkeitsprobeanfrage lautet beispielsweise `@SkillCheck[Wahrnehmung gegen 18]`. Für den Spielleiter steht hierfür auch ein Makro (Fertigkeitsprobe anfragen) zur Verfügung. Innerhalb von JournalEntries lässt sich eine Anfrage mit `@RequestSkillCheck[Wahrnehmung gegen 18]` einfügen.
- fixed: Wundmalus wurde falsch berechnet

## 0.3.4

2021-06-16

- added: +/--Schaltflächen für Splitterpunkte, Schaden sowie Schwierigkeit und Modifikator im Probendialog
- added: Icons in der Zauberliste
- changed: Überarbeitung der CSS-Organisation

## 0.3.3

2021-06-11

- added: Der Wurfmodus (Sichtbarkeit des Wurfes) kann im Wurfdialog direkt angegeben werden
- added: Der maximale Bonus aus Ausrüstung und Zauber kann per Modifikator (z.B. `bonusCap +1`) verändert werden (Issue #40)
- fixed: Probleme bei der Darstellung der Schadensreduktion (Issue #44)

## 0.3.2

2021-06-09

- added: Buttons in Chatnachrichten werden nur für Spielleiter und Owner angezeigt.
- fixed: Probleme mit Merkmalen bei Schadenswürfen (Issue #46 und #48)
- fixed: NPC-Sheet-Probleme in (0.8.6). Modifikatoren wurden bei jedem Schließen des Sheets erneut angewendet.

## 0.3.1

2021-06-02

- fixed: Tick-Button in Chat-Nachricht hat nicht funktioniert
- fixed: NPC-Importer stürzt ab wenn keine Meisterschaft angegeben ist
- fixed: Kompatibilitätsprobleme (0.8.6) in NPC-Importer bei Kompendium-Lookup für Zauber, Meisterschaften etc.
- fixed: Kompatibilitätsprobleme (0.8.6) in Genesis-Import

## 0.3.0

2021-05-28

- added: Kompatibilität mit Foundry VTT 0.8.x
- added: Journal Style überarbeitet
- added: Mehr Informationen über einen Fertigkeitswurf (Fertigkeit, Angriff oder Zauberspruch) bei Klick auf das Ergebnis in der Chantnachricht
- added: Erweiterte Chatnachricht für Schadenswürfe
- added: Beim Import von Genesis-Daten werden die Schwerpunktmeisterschaften automatisch als Modifikator
- fixed: Schwächen lassen sich nun auf den Charakterbogen ziehen
- fixed: Fehlerbehandlung bei fehlerhafter Modifikatoreingabe

## 0.2.2

2021-05-12

- fixed: Kompendium Browser wurde nicht richtig geladen, wenn Zauber aber keine Meisterschaften und/oder Waffen angelegt wurden.
- fixed: Beim Drag-and-Drop einer Meisterschaft auf den Charakterbogen wurde die Fertigkeit nicht richtig augewählt.

## 0.2.1

2021-05-07

- fixed: Fehler bei der Berechnung der abgeleiteten Werte für NSCs (Issue #38)
- fixed: Für Fernkampfwaffen werden im "Ticks"-Button "3 Ticks" zum Auslösen verwendet. (Issue #41)
- Für jedes Attribut kann nun der Startwert angegeben werden. Der maximal mögliche Wert wird mit der Heldenstufe berechnet (Issue #42)
- Klickt man im Combat-Tracker auf den Initiativwert, kann man eine Tickdauer hinzufügen, auch wenn man nicht im Zug ist. Dies kann nur der "Owner" (Besitzer des Charakters oder GM).

## 0.2.0

2021-05-03

- fixed: Bei SR-Modifikator wurde zusätzlich die Behinderung modifiziert (Issue #36)
- Automatisches Scrollen der Fertigkeitsliste wurde wieder entfernt. Stattdessen ausführlicher Tooltip
- Ausführlichere Tooltips
- Verteidigungswerte (VTD, KW, GW) von Gegnern werden nicht mehr im Probendialog und in der Ergebnisnachricht für die Spieler angezeigt. Es kann weiterhin ein Ziel selektiert werden. Im Probendialog steht dann VTD/KW/GW (abhängig vom Wurf), der Zahlenwert wird aber nicht mehr angezeigt. Trotzdem werden die Erfolgsgrade berechnet. Der GM sieht die angesetzte Schwierigkeit
- Neuer Kompendiumbrowser hinzugefügt. Aktuell sind nur Zauber, Meisterschaften und Waffen enthalten. Dies wird später noch erweitert.

## 0.1.8

2021-04-29

- fixed: Fokuskosten und kanalisierter Schaden konnte für "unlinked Actors" nicht abgerechnet werden.
- fixed: Tippfehler in "Modifikatoren"-JournalEntry
- Meisterschaften werden nach Fertigkeit in der selben Reihenfolge dargestellt, wie in der Fertigkeitsliste
- Geht man mit der Maus über eine Fertigkeit in der Fertigkeits- oder Meisterschaftsliste, wird in der jeweils anderen Liste (Meisterschafts-/Fertigkeitsliste) zu dieser Fertigkeit gescrollt und hervorgehoben. Dadurch lassen sich die Fertigkeiten leichter einsehen bevor eine Probe durchgeführt wird.
- Kompatibilität mit dem "VTTA Tokenizer"-Modul. (Dank an Kristian Domke)
- Meisterschaften lassen sich per Drag-n-Drop aus dem Bogen in das ItemDirectory ziehen.

## 0.1.7

2021-04-22

- fixed: Zaubereffekte sind nun Drag-and-Dropable (Issue 30)
- Waffen können nun auch aus dem Inventar per Drag-and-Dop in die Makroleiste gezogen werden
- In der Chatnachricht der Aktiven Abwehr ist nun auch eine "Ticks"-Schaltfläche vorhanden.
- Situative Boni (Meisterschaften) können nun als Modifikator angegeben werden als `<skillId>/<Situation> <Bonus>`. Diese situativen Modifikatoren werden als Liste im Probendialog aufgeführt und können durch anklicken aktiviert werden Bei Zaubern kann als Situation der Zaubertypus angegeben werden. In diesem Fall wird im Probendialog beim entsprechenden Zauber der Modifikator automatisch aktiviert. Wird bei einer Kampffertigkeit ein Angriffsname (Waffenname) angegeben, wird dieser Modifikator beim entsprechenden Probendialog automatisch aktiviert.
- Felder für Geld im Charakterbogen verfügbar.

## 0.1.6

2021-04-20

- fixed: Attribut "Bewegung" zu "Beweglichkeit"
- fixed: Die Last von Gegenständen werden im Inventar angezeigt
- Beim Import eines Charakters aus Genesis kann nun ausgewählt werden, ob alle Daten überschrieben oder aktualisiert werden sollen. (Issue #28)
- Die Ticks-Schaltfläche einer Chatnachricht ändert nun die Ticks des "Speakers" der Nachricht und nicht die des ausgewählten Tokens. (Issue #26)
- Zaubereffekte können nun seperat ein- und ausgeschaltete werden (Issue #21)
- Multiplikator für Erfahrungspunkteschwellen für Heldengrade hinzugefügt
- Fehlende Übersetzung hinzugefügt

## 0.1.5

2021-04-19

- Fixed: Auswahl der Fertigkeit wenn Meisterschaft über Drag-and-Drop hinzugefügt
- Fixed: "Sterbend" war im "Zustand"-Kompendium als Waffe gelistet
- Fixed: max. Splitterpunkte abhängig von Heldengrad (Issue #23)
- Fixed: Meisterschaft konnte nicht direkt im Sheet erstellt werden (Issue #22)
- Neuer Meisterschafts Copy-and-Paste-Importer (Funktioniert nur mit der Formatierung des GRWs)
- Robusterer NPC-Copy-and-Paste-Importer

## 0.1.4

2021-04-16

- Fixed: Bug in der Eingabe von Attributen
- Fixed: Bezeichner für "Willenskraft"
- Robusterer Copy-Paste-Importer (Nun auch Kreaturimport von B&U möglich, Issue #17)
- Min. Attribute für Waffen, Rüstungen und Schilde werden für die Behinderung, Tick-Zuschlag bzw. WGS berücksichtigt
- Der Fertigkeitswert für eine einzelne Waffe kann mittels Modifiaktor angepasst werden
- Notifications beim Import mittels Copy-Paste-Importer
- Fertigkeit-IDs in JournalEntry hinzugefügt (Issue #18)

## 0.1.3

2021-04-14

- Copy-and-Paste-Importer für Stärken und Gegnermerkmale (Es können mehrere Merkmale/Stärken auf einmal kopiert werden. Etwaige Modifikatoren werden automatisch hinzugefügt)
- Es können mehrere Waffen, Rüstungen, Schilde per Copy-and-Paste importiert werden wenn vorher in einem Texteditor jede Waffe/Wüstung/Schild in einer eigenen Zeile steht.
- Fix Issue #16: Kritisch und Defensiv wird jetzt berücksichtig.

## 0.1.2

2021-04-13

- Copy-and-Paste-Importer für Waffen, Rüstungen, Schilde und NPCs

## 0.1.1

2021-04-12

- Robusterer Copy-and-Paste Zauberspruchparser
- Für NPCs werden die Attribute, wenn nicht anders angegeben, auf 0 gesetzt.
- Modifikatoren werden nur für ausgerüstete Gegenstände berücksichtigt. (Issue #13)
- Erfolgsgradoptionen für Zauber in ItemSheet hinzugefügt (Issue #12)
- Erfolgsgradoptionen für Zauber in Chatnachrichten hinzugefügt
- JournalEntry zum Thema "Modifikatoren" hinzugefügt (Issue #14)

## 0.1.0

2021-04-09

- Erste Alpha-Release-Version

## 0.0.53

2021-04-09

- Bug fixes (Issue #6, #7, #8, #9, #10)
- Neue interaktive Chatnachrichten für Fertigkeitswürfe, Angriffe und zauber
- Kampf- und Zauberpatzertabellen hinzugefügt

## 0.0.51

2021-04-01

- Neues Charakterblattlayout
- Schadensreduktion als Wert im Kopf des Charakterblatts hinzugefügt
- Kompatibilität mit Kompendium-Export aus Genesis

## 0.0.49

2021-03-31

- [Zauberimport](feature-copy-paste.md) durch Copy&Paste aus PDFs
- Dialog zur Auswahl der Magieschule bei Drag'n Drop von Zaubern aus einem Kompendium
- Bug fixes(Issue #6, JSON-importer)
- [requestSkillCheck und skillCheckMacro](feature-journal-skillcheck.md)

## 0.0.44
