# Splittermond für Foundry VTT

Dieses Foundry VTT - System implementiert das deutsche Rollenspiel-System [Splittermond](https://splittermond.de/) des [Uhrwerk Verlags](https://www.uhrwerk-verlag.de/). Dieses Fanprojekt implementiert einzelne Regeln, kann jedoch nicht Regeltexte und ein Gesamtkompendium bereitstellen. 

*Dieses System befindet sich noch in Entwicklung. Änderungen können jederzeit vorgenommen werden, die eine Abwärtskompatibilität beeinträchtigen.*

**Installations-URL:**  [https://github.com/SplittermondFoundry/Splittermond/blob/main/public/system.json](https://github.com/SplittermondFoundry/Splittermond/blob/main/public/system.json)

![Screenshot](public/screenshots/character-sheet-general.png)

## Features
### Genesis Import
Jeder Charakter aus dem Charaktererstellungstool Gensis lässt sich als JSON-Datei importieren.

![Screenshot](public/screenshots/genesis-import.gif)

### Automatische Berechnung von Werten
Alle abgeleiten Werte sowie die Fertigkeitswerte werden aus den Attributen und Fertigkeitspunkten automatisch berechnet.

![Screenshot](public/screenshots/character-sheet-skills.png)

### Proben
Es können alle Fertigkeitsproben per Klick auf die Fertigkeit, den Zauber oder den Angriff durchgeführt werden.

![Screenshot](public/screenshots/standard-check.gif)

### Verwaltung von Zauber
Zauber können per Drag-and-Drop auf das Charakterblatt gezogen werden. Diese Werden nach Magieschule geordnet angezeigt.

![Screenshot](public/screenshots/character-sheet-spells.png)

Per Klick auf den Zaubernamen wird eine entsprechende Probe ausgeführt. Zusätzlich können die Zauberkosten durch Klick auf die Kosten abgerechnet werden. Dabei können die kanalisierten Fokuspunkte nach Zauber getrennt verwaltet werden.

![Screenshot](public/screenshots/spell-check.gif)

### Ausrüstung
Alle Ausrüstungsgegenstände können getrennt nach ihrem Typ organisiert werden. Dabei lassen sich Waffen, Rüstungen und Schilde zusätzlich als "ausgerüstet" markiert werden.

![Screenshot](public/screenshots/character-sheet-inventory.png)

### Kampfaktionen
Abhängig von den ausgerüsteten Waffen wird unter dem Tab "Kampf" die entsprechenden Angriffsoptionen aufgelistet.

![Screenshot](public/screenshots/character-sheet-attack.png)

Durch anklicken des Waffennamens kann eine Probe ausgelöst werden. Ist in Foundry VTT ein Ziel ausgewählt, wird dessen Verteidigung automatisch als Schwierigkeit eingetragen.

![Screenshot](public/screenshots/weapon-check.gif)

Durch einen Klick auf den Schaden kann ein Schadenswurf erzeugt werden. Dabei werden auch die Merkmale der Waffe berücksichtigt.

Unter "Aktive Abwehr" werden alle *Aktive Abwehr*-Möglichkeiten der aktuellen Waffe sowie weitere Fertigkeiten aufgelistet.

![Screenshot](public/screenshots/character-sheet-defense.png)

Bei einem Wurf auf die Aktive Abwehr wird das Waffenmerkmal *Defensiv* hinsichtlich der Erhöhung der Verteidigung berücksichtigt.

### Modifikatoren
Alle Gegenstände als auch Meisterschaften, Stärken, Zustände und Zaubereffekte können Werte innerhalb des Sheets modifizieren.

![Screenshot](public/screenshots/modifier.gif)

Eine Liste möglicher Modifikatoren wird noch bereitgestellt.

### Patzertabellen
Kampf- und Zauberpatzertabellen sind implementiert. Per Drag-n-Drop können die Erwürfelten Zustände auf das Charakterblatt gezogen werden. Mali durch Zustände wie z.B. *Erschöpft* werden im Charakterbogen berücksichtigt.

![Screenshot](public/screenshots/character-sheet-status.png)

### Fertigkeitswurf fordern
Der Spielleiter kann mittels Makro einen Fertigkeitswurf fordern. Dafür aktiviert er das Makro und wählt die Fertigkeit und Schwierigkeit. Es wird eine Chatnachricht erstellt auf die die Spieler klicken können um einen Fertigkeitswurf auszuführen

![Screenshot](public/screenshots/request-skill-check.gif)


Damit diese Funktion genutzt werden kann, müssen die Macros `requestSkillCheck` und `skillCheck` aus dem Makro-Kompendium importiert werden. Zusätzlich muss den Spielern die Berechtigung zur Nutzung des `skillCheck`-Makros freigegeben werden (Eintrag "Permissions" im Kontext-Menü des Makro-Directory).

### Tickleiste
Der in Foundry eingebaute "Combat Tracker" lässt sich nun als Tickleiste verwenden. Die Spieler können auf ihre Waffengeschwindigkeit, Zauberdauer etc. klicken um ihre Ticks zu erhöhen. Außerdem kann ein Spieler auf das "Abwarten/Bereithalten"-Feld gesetzt werden.

![Screenshot](public/screenshots/combat-tracker.gif)

### NSC Bogen
Der NSC-Bogen bietet für Nicht-Spieler-Charaktere die Möglichkeit *abgeleitete Werte* sowie eine Auswahl an Fertigkeiten einzutragen.

![Screenshot](public/screenshots/npc-sheet-general.png)
Gegnermerkmale wie *Schwächlich* haben aufgrund der einstellbaren Modifikatoren Auswirkungen auf die Anzahl der Wundstufen.

## Entwicklung
Das Projekt baut produziert mittels `vite` eine ES6-Webanwendung. Die Anwendung wird in den Ordner `dist` gebaut. Um Änderungen automatisch auf seinem Server zu haben, muss der Order `dist` in Foundry VTT als System-Ordner hinzugefügt werden.
Bash:
```bash
ln -s /path/to/splittermond-fvtt/dist /path/to/foundryvtt/Data/systems/splittermond
```
PowerShell:
```powershell
New-Item -ItemType SymbolicLink -Path "C:\path\to\foundryvtt\Data\systems\splittermond" -Value "C:\path\to\splittermond-fvtt\dist"
```
Es sollte darauf geachtet werden, dass das Projekt nicht gebaut werden kann, wenn der dist ordner als Splittermond-Systemordner in Foundry VTT eingetragen ist,
da der Server die Kompendium-Dateteien offen hält, sodass sie vom Build-Prozess nicht überschrieben werden können.

Zur Entwicklung empfiehlt es sich deshalb, das Projekt mit `npm run dev` zu starten. Die Anwendung wird dann unter `localhost:30001` bereitgestellt,
und zwar als Proxy zum eigentlichen Foundry server, von dem erwartet wird, dass er unter `localhost:30000` läuft. Der dev Server lädt 
automatisch neu, wenn Änderungen gespeichert werden, sodass man immer auf einem aktuellen Stand ist.
