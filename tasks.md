Das ist eine exzellente Entscheidung. Emojis wirken in wissenschaftlichen Kontexten oft zu verspielt oder unsauber (da sie je nach Betriebssystem anders aussehen). **Font Awesome Icons** garantieren einen einheitlichen, professionellen Look ("Vektorgrafik-Schärfe").

Hier ist die **aktualisierte und finale Liste der Instruktionen** für Coding-Gemini. Ich habe den Punkt "Icons" explizit hinzugefügt und die Emojis in den anderen Aufgaben durch konkrete Font-Awesome-Klassen ersetzt.

---

### **Finaler Prompt für Coding-Gemini**

**Kontext:**
Du bist Lead Developer für das Projekt **HerData**. Wir starten **Phase 3: Refinement & UX**.
Dein Ziel: Professionalisierung der Codebasis ("Production Ready"), Design-Upgrade auf "Modern Classicism" (Serif + Sans), Mobile-Fixes und strikte Nutzung von Font Awesome statt Emojis.

Führe die folgenden 6 Arbeitspakete aus:

#### **0. Setup & Assets (Prerequisite)**
* **Font Awesome:**
    * Binde Font Awesome (Free Version via CDN) in den `<head>` aller HTML-Seiten (`index.html`, `person.html`, `how-to.html`, `stats.html`) ein.
    * Nutze: `<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">`
* **Google Fonts:**
    * Importiere in `css/style.css`:
        * Headings: **'Merriweather', serif** (400, 700).
        * UI/Body: **'Lato'** oder **'Inter', sans-serif** (300, 400, 600).

#### **1. Globales Design-System ("Modern Classicism")**
* **CSS-Variablen (`css/variables.css`):**
    * `--primary-color`: `#2C3E50` (Tiefes Preußisch Blau).
    * `--accent-color`: `#D35400` (Dezentes Terrakotta).
    * `--bg-body`: `#F9F9F9` (Off-White/Papier).
    * `--bg-card`: `#FFFFFF` (Reinweiß).
    * `--text-main`: `#333333`.
* **Karten-Stil (`app.js`):**
    * Ändere den Tile-Layer zu **CartoDB Positron** (helle, entsättigte Karte), damit die Datenpunkte wirken.
    * URL: `'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'`

#### **2. UI-Refactoring (Card-Design & Navbar)**
* **Globales CSS (`css/style.css`):**
    * Klasse `.card`: Entferne `border`. Setze `box-shadow: 0 4px 12px rgba(0,0,0,0.05)`, `border-radius: 8px`, mehr `padding`.
    * Buttons: Keine Standard-Styles. Nutze `--primary-color`, leichte Border-Radius, Hover-Effekte.
* **Seite `how-to.html`:**
    * Vollständige Integration: Binde `navbar.js` und CSS ein.
    * Layout: Container zentriert (max-width 900px).
    * Info-Boxen: Nutze Font Awesome Icons (z.B. `<i class="fas fa-info-circle"></i>`) statt farbiger Standard-Alerts.

#### **3. Performance & Cleanup (Logic)**
* **Debug entfernen:**
    * Setze `const IS_PRODUCTION = true;`.
    * Logik: Unterdrücke `console.log` wenn `IS_PRODUCTION` aktiv ist.
    * Entferne den `#debug-btn` und zugehörigen Code restlos.
* **Silent Init:**
    * Refactore `app.js`: 1. Daten laden -> 2. State setzen -> 3. `renderMap()` (einmalig) -> 4. Event Listener registrieren.
    * Implementiere `debounce` (300ms) für Slider und Sucheingabe.

#### **4. Daten-Transparenz & UX (Icons statt Text)**
* **Map-Legende (`index.html`):**
    * Zeile hinzufügen: `<i class="fas fa-map-marker-alt"></i> 227 verortet | <i class="fas fa-ban"></i> 221 ohne Geodaten`.
    * "Ohne Geodaten" muss klickbar sein -> Filteraktion.
* **Tabelle (`person.html`):**
    * Spalte "Korrespondenz": Nutze Icons statt "E".
        * Format: `<i class="fas fa-pen-fancy" title="Absenderin"></i> 88  <span class="text-muted">|</span>  <i class="far fa-eye" title="Erwähnt"></i> 23`.
    * Leere Zellen: Zeige nichts an (Whitespace) für visuelle Ruhe.

#### **5. Mobile Responsiveness**
* **CSS Media Queries (< 768px):**
    * **Navbar:** Fixiere `z-index` und Background-Color (keine Überlappung).
    * **Tabelle:** "Mobile Card View" in der Tabelle.
        * Verstecke Spalten "Lebensdaten", "Korrespondenz".
        * Zeige Name fett, darunter Rolle als Badge.
        * Füge einen "Expand"-Button (Chevron: `<i class="fas fa-chevron-right"></i>`) hinzu, falls Details nötig sind.

---

**Soll ich diesen Prompt jetzt ausführen lassen?**