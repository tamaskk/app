# HEFTOR — Feature Ideas

30+ feature ötlet, ami illeszkedik a **Monochrome Performance** dizájnhoz (pure black OLED, white cards, Inter, 8px grid).

Minden ötlethez tartozik egy ready-to-paste **prompt**, amit egyszerűen beilleszthetsz a Claude Code-ba az implementációhoz. A promptok feltételezik, hogy a working directory `/Users/mac/Desktop/Developer/workoutapp/`, a stack Next.js 14 (apps/web) + Flutter (apps/mobile), backend MongoDB + Mongoose.

**Kategóriák:**
1. [Tréning intelligencia](#1-tréning-intelligencia)
2. [Edzéstervezés](#2-edzéstervezés)
3. [Analitika és vizualizáció](#3-analitika-és-vizualizáció)
4. [Gym Mode élmény](#4-gym-mode-élmény)
5. [Recovery & body context](#5-recovery--body-context)
6. [Adat-portabilitás és coach](#6-adat-portabilitás-és-coach)
7. [Stretch / kísérleti](#7-stretch--kísérleti)

---

## 1. Tréning intelligencia

### 1.2 RPE / RIR per-set logging
Minden szettnél opcionálisan RPE skála (6-10) vagy RIR (0-4). Adat-arany a többi feature-höz.

**Prompt:**
> Adj hozzá RPE (Rate of Perceived Exertion, 6-10) és RIR (Reps in Reserve, 0-4) tracking-et minden szetthez az HEFTOR-ban. A `WorkoutSession` modelben a `Set` schemához tedd hozzá az `rpe?: number` és `rir?: number` mezőket. A workout screenen (web + Flutter) a szett sor jobb szélén legyen egy kis "·" gomb, amire kattintva chip-skála ugrik fel: 6 7 8 9 10 (vagy RIR 4 3 2 1 0). User-setting alapján döntsd el, RPE-t vagy RIR-t mutass. A skála vízszintes, minden chip 32×32, fekete-fehér, kiválasztva inverz. Ne legyen kötelező mező — ha nincs kitöltve, az ok. A summary screen mutasson average RPE-t a session-re. Tartsd a 8px grid-et és Inter-t.

---

### 1.3 1RM trend + e1RM minden szetre
Epley-formula alapján számolt e1RM tracking, görbe a progress oldalon.

**Prompt:**
> Implementáld az estimated 1RM (e1RM) tracking-et az HEFTOR progress oldalon (`apps/web/app/progress/` + `apps/mobile/lib/screens/progress/`). Minden completed szetre számolj e1RM-et az Epley-formulával (`kg × (1 + reps/30)`), és a per-exercise nézetben rajzolj egy vékony 1px fehér line chartot az utolsó 12 hét legmagasabb napi e1RM-jeiből. Y-tengelyen csak min/max kg label, X-tengelyen csak első+utolsó dátum. Backend: új endpoint `GET /api/progress/e1rm?exerciseId=...&weeks=12` ami group-by-day-szel adja vissza a max e1RM-eket. Mutasd külön a "all-time best e1RM" számot nagy Inter Bold fontnal a chart fölött. Semmi szín, semmi tooltip mouseover effekt — érintésre tap-tap ugró tooltip ok.

---

### 1.5 Warmup set generator
Munkasúlyhoz 3-4 bemelegítő szett automatikus számolása.

**Prompt:**
> Adj hozzá warmup set generátort az HEFTOR workout screenhez. Amikor a user új gyakorlathoz ér, és az első working set kg-ja > bodyweight × 0.5 (vagy > 40kg compound esetén), egy `Generate warmup` gomb jelenjen meg a szett lista tetején. Kattintás után toldjon be 3-4 warmup szettet a working set elé: 40%×8, 60%×5, 80%×3, 90%×1 a munkasúly százalékai szerint. A warmup szettek `isWarmup: true` flag-gel kerüljenek a `WorkoutSession` modelbe, és a UI-ban halványabban (60% opacity) jelenjenek meg, "W" jelzéssel a szett szám helyett. A summary screen és minden volume/PR számítás zárja ki a warmup szetteket. Csak compound gyakorlatoknál (squat, bench, deadlift, OHP, row) ajánlja fel automatikusan — izoláció gyakorlatoknál ne. Konfigurálható user-setting: warmup auto-suggest on/off.

---

### 1.7 Smart rest timer (gyakorlat-szenzitív)
Compound 3 perc, izoláció 90 sec, magas RPE +30s automatikusan.

**Prompt:**
> Cseréld le az HEFTOR rest timer fix időtartamát egy smart timer-re, ami a gyakorlat típusából és az utolsó szett RPE-jéből számolja az alapértelmezett pihenőt. Logika: compound (squat, bench, deadlift, row, OHP, pull-up) → 180s, accessory compound (lunges, dips) → 120s, izoláció (curl, raise, fly, extension) → 90s. Ha az utolsó RPE ≥ 9, adj hozzá +30s-t; ha ≤ 7, vonj le 30s-t. A meglévő ±10s és skip kontrollok maradjanak. A gyakorlat kategória a `Training Exercise.category` mezőből jöjjön, fallback default 120s. User-overrideolhatja per-exercise basis — ha a user módosítja, mentsd a `Training Exercise.restSecondsOverride` mezőbe. A timer body-text 64pt Inter Bold maradjon, fehér számjegy, fekete háttér.

---

## 2. Edzéstervezés

### 2.1 Program templates (5/3/1, PPL, nSuns, GZCLP)
Tudományosan validált programok mint létrehozható template-ek.

**Prompt:**
> Adj hozzá pre-built program template-eket az HEFTOR Trainings screenhez. Hozz létre `lib/programTemplates.ts` (web) és `lib/program_templates.dart` (mobil) konstans listát az alábbi programokkal: 5/3/1 (4 nap), PPL 6-day, Upper/Lower 4-day, nSuns 5-day, GZCLP 3-day. Minden template tartalmazzon: name, frequency (napok/hét), goal (strength/hypertrophy/general), description (1 mondat), és egy heti séma exercise listával + szett/rep sémával + progressziós szabállyal. A Trainings screen tetejére tedd a `Browse Templates` gombot — kattintásra grid view a template kártyákkal: csak template név + 1-soros leírás + nap/hét szám. Tap → preview screen → "Add to my trainings" copy-zza a usernek. Stílus: identikus a meglévő training kártyákkal, semmi extra dekoráció. Forrás dokumentáció minden template-hez egy kommentbe.

---

### 2.2 Mesocycle builder
4-6 hetes blokkok progressziós szabályokkal.

**Prompt:**
> Implementálj mesocycle builder-t az HEFTOR-ba. Új modell `Mesocycle`: { name, weeks (4-6), trainings (Training[] heti elosztásban), progressionRule, deloadWeek? }. Új screen `/mesocycles` (web) + `mesocycles_screen.dart` (mobil): lista a futó és múlt mesocycle-ekről, "New mesocycle" CTA. A builder wizard 3 step: (1) név + hetek száma + cél, (2) heti template (mely tréning melyik napon), (3) progressziós szabály (linear +2.5kg/hét compound, double progression, RPE-based). A workout screen mostantól mutassa: `Week 3 of 6 — Push Day A`. Backend: minden új workout session linkelődjön a mesocycle aktuális hetéhez. Deload week (utolsó hét) automatikusan 50% volume. Stílus: progress bar nélkül, csak text status pl. `WK 3/6`. Ne törd el a meglévő standalone training flow-t — a mesocycle opcionális layer felette.

---

### 2.3 Set type támogatás (superset, dropset, cluster, AMRAP)
Speciális szett típusok jelöléssel.

**Prompt:**
> Adj hozzá speciális set type-okat az HEFTOR-hoz: superset, dropset, cluster, rest-pause, AMRAP. A `Set` schemához új mező: `setType: 'normal' | 'superset' | 'dropset' | 'cluster' | 'restpause' | 'amrap'` (default `normal`). A workout screenen szett sor jobb szélén tap-pel set type választó nyílik. Superset esetén a user 2+ gyakorlatot összekapcsol (új `Training Exercise.supersetGroupId` mező), és a workout screen ezeket egymás után rendereli `A1 / A2 / A3` jelöléssel, közös pihenővel végül. Dropset esetén a szett alatt rögtön következő drop szett rep mezője megjelenik, kg auto-csökken 20%-kal. AMRAP esetén a rep input "AMRAP" placeholder-t kap. Cluster: 3 mini-szett rep szám 5-5-5, kg azonos, 15s pihenő közte. Vizuálisan: egybetűs prefix a szett szám előtt (S=superset, D=dropset, C=cluster, R=restpause, A=AMRAP). Volume számítás kompatibilis maradjon.

---

### 2.4 Exercise alternatives
Egy gomb mutatja az ekvivalens gyakorlatokat (foglalt gép esetén).

**Prompt:**
> Implementáld az exercise alternative funkciót az HEFTOR workout screenen. Minden gyakorlat fejlécén legyen egy halvány `Swap` link. Tap után modal nyílik az ekvivalens gyakorlatok listájával. Az ekvivalencia logika: ugyanaz a `targetMuscles` primer izom + hasonló mozgás-pattern (push/pull/hinge/squat/carry). Backend: `GET /api/exercises/alternatives?exerciseId=...` ami a MuscleWiki katalógusból szűr ugyanazon target-muscle alapján, opcionálisan equipment filter (bodyweight, dumbbell, barbell, machine, cable). A modal mutassa: gyakorlat név + thumbnail + 1-soros equipment. Tap-on a swap permanens vagy csak-erre-a-session-re (két gomb): `Swap permanently` updateli a Training modelt, `Swap for today` csak az aktuális workout session-re vonatkozik. A history adatot ne keverd — a swappolt gyakorlat saját PR / volume bucket-jébe megy.

---

### 2.5 Auto-deload prompt
Ha romlik a teljesítmény, javasol deload hetet.

**Prompt:**
> Adj hozzá auto-deload prompt-ot az HEFTOR-hoz. Heti egyszer (vagy mesocycle context-ben hetenkénti boundary-n) számolj egy egyszerű fatigue indexet: utolsó 14 nap session quality score-ainak trendje + stagnating exercise-ok száma + heti volume vs. 4-héttel ezelőtti volume. Ha a fatigue index egy küszöb felett van (pl. >= 2/3 negatív signal), a dashboardon jelenjen meg egy banner: `Consider a deload week — your performance trended down 2 weeks in a row`. Tap után a user vagy elfogadja (a következő hétre az aktív mesocycle / standalone trainings volume 50%, intenzitás 80%), vagy elutasítja (`Dismiss for 1 week`). A deload heti workouts vizuálisan jelölve legyenek a calendaron (kis "DL" jelzéssel). Ne legyen aggresszív — heti maximum 1 prompt, dismiss után 7 napig csendes.

---

## 3. Analitika és vizualizáció

### 3.1 Muscle heatmap silhouette
Emberi sziluett elöl/hátul, heti volumen szerinti árnyalattal.

**Prompt:**
> Implementálj egy muscle heatmap vizualizációt az HEFTOR progress oldalra. Két SVG sziluett (elöl + hátul), izomcsoportonként külön path: chest, shoulders, biceps, triceps, forearms, abs, quads, calves (elöl); upper-back, lats, lower-back, glutes, hamstrings (hátul). A heti összes szett-szám alapján minden izom kapjon szürkeárnyalat fill-t: 0 set = #1a1a1a, MEV (8 set) = #4a4a4a, MAV (16 set) = #8a8a8a, MRV (24+ set) = #ffffff. Az izomcsoportonkénti szett-számot az exercise → targetMuscles mezőből kalkuláld (working sets only, warmup kizárva). Egy hét = aktuális vagy felhasználó-választott hét. A két sziluett egymás mellett, mobile-on egymás alatt. Tap egy izomra: tooltip pop-up a heti szettszámmal és MEV/MAV/MRV reference-szel. Inter font, 1px fehér body outline, kitöltés szürkeárnyalat. Build forrás: SVG path-ek manuálisan vagy meglévő anatómiai SVG-ből (referencia: muscle-wiki vagy hasonló open SVG).

---

### 3.2 Volume landmarks (MEV / MAV / MRV)
Heti volumen vs. tudományos landmark, izomcsoportonként.

**Prompt:**
> Adj hozzá a progress oldalhoz egy "Weekly Volume" panelt, ami izomcsoportonként mutatja a working szett számot vs. Renaissance Periodization MEV/MAV/MRV landmark-okat. Konstans mapping `lib/volumeLandmarks.ts`: chest MEV 8 / MAV 14 / MRV 22, back 10/16/25, shoulders 8/16/26, biceps 8/14/20, triceps 6/14/22, quads 8/14/20, hamstrings 6/12/20, glutes 4/12/16, calves 8/14/20, abs 0/16/25. Minden izomcsoport egy sor: bal oldalt név, jobb oldalt `12 / MAV 14` és egy horizontális 1px szürke bar 0–MRV skálával, fehér jelölőkkel MEV/MAV/MRV pontokon, és egy fehér tick a tényleges heti szettszámnál. Színek nélkül — pozíció jelzi a státuszt (under MEV / between MEV-MAV / between MAV-MRV / over MRV). Szűrhető heti / havi nézetre. Forrás: utolsó workout session-ök, working sets, target muscles aggregálva.

---

### 3.3 Session quality score (0–100)
Egy szám a session quality-ról.

**Prompt:**
> Számold ki minden completed workout sessionre a "Session Quality Score" (0-100) értéket. Komponensek és súlyok: (1) set completion — befejezett szettek / tervezett szettek (×30 súly), (2) rest timer adherence — átlagos eltérés a smart rest target-től (±15s = 100, ±60s = 0) (×25 súly), (3) e1RM trend — session átlag e1RM vs. előző session ugyanezekkel a gyakorlatokkal (+1% = +10, -1% = -10, range 70-100) (×25 súly), (4) duration consistency — session hossz vs. user 30-napos átlag (±10% = jó) (×20 súly). A workout summary screen tetejére tedd egy nagy Inter Bold számmal: `87` és alatta kis szürke `SESSION QUALITY`. Tap-pel breakdown popup a 4 komponenssel. Backend: minden session save-kor számold és mentsd a `WorkoutSession.qualityScore` mezőbe. Progress oldalon egy mini 7-napos trend line, csak fehér 1px.

---

### 3.4 Comparison mode (két session / két hónap)
Side-by-side összehasonlítás.

**Prompt:**
> Implementálj comparison mode-ot az HEFTOR progress oldalra. Új tab/screen `/progress/compare`, ahol a user kiválaszt két dátumot vagy két hónap-range-et, és a két adatsor egymás mellett (mobile-on egymás alatt, két oszlop) látható. Metrikák: total volume, working sets, avg session duration, avg session quality score, per-muscle group volume, top 3 exercises (kg / e1RM változás). Két oszlop, közöttük egy ↑↓ delta százalék. Stílus: identikus oszlop fejlécek, vékony 1px szürke divider közte. Semmi grafikon — csak text-grid. Példa sor: `Total Volume    12,400 kg    ←→    11,800 kg    ↓ 4.8%`. A delta színe a delta előjelétől független — pure white. Pre-set range-ek: `This week vs. Last week`, `This month vs. Last month`, `Custom range`.

---

M1, M2, M3, M4, M5, M6, M7, M8, M10

### 3.5 PR feed (minimal timeline)
Tipográfia-only timeline az új rekordokról.

**Prompt:**
> Hozz létre egy "PR Feed" screent (web `/prs`, mobile new tab) az HEFTOR-ban. Minden új e1RM rekord automatikusan event-té váljon a session save után (új MongoDB collection `PersonalRecord` vagy a User profile-ban embedded). A PR feed reverse-chronological lista: minden sor egy text-only event: `2026-03-14 · BENCH PRESS · 105 kg × 5 (e1RM 122.5)`. Csoportosítva napra/hétre vékony divider-rel. Tap egy PR-re: kiugró toast a régi rekorddal is (`Previous: 100kg × 5`). Filter chip-ek a tetején: `All / Bench / Squat / Deadlift / OHP`. Sharing (opcionális): hosszú tap → text copy clipboard-ra. Stílus: 14pt Inter, mono dátum prefix, uppercase gyakorlat név, normal súly. Semmi konfetti, semmi badge.

---

### 3.6 Time-under-tension tracking (opcionális tempo)
Per-set tempo (excentric-pause-concentric) tracking.

**Prompt:**
> Adj hozzá time-under-tension (TUT) tracking opciót az HEFTOR-hoz. A `Training Exercise`-hez új mező: `tempo?: string` formátum `"3-1-1-0"` (eccentric-bottom pause-concentric-top pause). Ha ki van töltve, a workout screen szett során mutasd kis szürke szöveggel a tempot, és számold a per-set TUT-ot: `(eccentric + concentric) × reps + (bottom + top pauses) × reps`. A session summaryn új sor: `Total time under tension: 9 min 24 sec`. Opcionális per-set actual tempo capture: tap-and-hold + release a rep gombon, frame-by-frame nem kell, csak az össz-set idő. Default off — csak haladók engedélyezik a setting-ben (`Show tempo & TUT`).

---

## 4. Gym Mode élmény

### 4.1 Distraction-free Gym Mode
Egyetlen képernyő, csak szett bevitel + rest timer.

**Prompt:**
> Hozz létre egy "Gym Mode" screent az HEFTOR mobil app-ban (Flutter). Új route `/gym-mode`, indítható a workout screen tetejéről egy nagy `Enter Gym Mode` gombbal. A Gym Mode screen full-bleed fekete, semmi navbar, semmi tab bar. Tartalom: tetején nagy fehér Inter Bold 32pt szöveg az aktuális gyakorlattal és set indexszel (`BENCH PRESS · SET 3 / 4`), középen óriási kg input (96pt) és rep input (96pt) — slot-szerű, tap növel, swipe lefelé csökkent, hosszú tap manual input modal. Alul egy óriási fehér 200×200px kör `COMPLETE SET` gomb. Set complete után automatikusan átvált a rest timer view-ra: full-screen ovális, 144pt countdown szám, alatta `BENCH SET 4 NEXT`. Két nagy gomb az alsó harmadon: `-10s` és `SKIP`. Wake lock-olt képernyő (always on). Exit a screen jobb felső sarkában egy kis `×`. Haptic feedback minden interakción. A többi feature (RPE input, plate calc, etc.) nem érhető el ebben a mode-ban — itt a fókusz a prioritás.

---

### 4.2 Voice logging
"Ten reps, eighty kilos" → bekerül.

**Prompt:**
> Implementálj voice logging-ot az HEFTOR mobil workout screenhez. Új mikrofon ikon a szett sor jobb szélén. Tap után indul a `speech_to_text` package (Flutter). Engedélyezett parsing patterns: `"ten reps eighty kilos"`, `"80 kilos 10"`, `"10 by 80"`, `"eighty for ten"`. Regex-szel és angol/magyar number-word mappel parse-old, írd a kg és rep mezőkbe, és automatikusan check-old be a szettet. Ha nem érthető: vibráció + halvány toast `Couldn't parse`, ne csukd be a mic-et, próbálkozhasson újra. Voice command-ok: `next set`, `skip`, `done` (set complete). Magyar / angol nyelvet a user setting-ből vegye. Voice mode visual indicator: 1px fehér pulse a screen szélén, miközben fut. Battery drain miatt csak igény szerint induljon (nem always-on listen). iOS Speech Recognition permission promptot kezeld.

---

### 4.3 Haptic feedback szett complete + timer warning
Vibráció minden interakcióra.

**Prompt:**
> Adj hozzá haptic feedback-et az HEFTOR mobil app-hoz (Flutter `haptic_feedback` vagy `flutter/services` HapticFeedback). Trigger pontok: (1) szett complete check → medium impact, (2) rest timer indul → light impact, (3) rest timer 10 másodperc hátra → light impact, (4) 3 másodperc hátra → 3 rövid light impact gyors egymásutánban, (5) rest timer 0 → heavy impact + 200ms warning vibráció, (6) PR detektálás session közben → success haptic pattern (3 medium pulse), (7) auto-progression suggestion elfogadás → selection click. User setting: `Haptic feedback on/off` (default on). Tartsd az iOS és Android pattern-eket a platform conventions szerint különbözőnek (Android-on `HapticFeedbackType.lightImpact` ↔ vibration pattern fallback).

---

### 4.4 Headphone-friendly timer end (zenedrop)
Nem síp, hanem rövid hangtónus.

**Prompt:**
> Cseréld le az HEFTOR rest timer hangját egy zene-barát alternatívára. Új user setting `Timer sound`: `Off / Soft tone / Drop`. A "Soft tone" egy halk, alacsony tónus (250 Hz sine wave, 400ms fade in-out) — kicsírázza a fejhallgatót szabadon. A "Drop" egy 1.5 másodperces zene-drop sample (pre-recorded, embedded mp3, kb. 30KB), amit edzőtárs gyűjthet. Audio session config: iOS `AVAudioSession.CategoryAmbient` és Android `AudioManager.STREAM_NOTIFICATION` hogy ne állítsa le a Spotify/Apple Music zenét, csak duck-olja 30%-ra a hang alatt. A timer közben semmi tick-tock zaj. Ha headphones detected (Bluetooth A2DP routing), automatikusan finomabb tónus. Volume a user system volume-jával skálázódik.

---

### 4.5 Apple Watch / WearOS companion
Pihenő timer + szett complete a csuklón.

**Prompt:**
> Építs egy minimal Apple Watch companion app-ot az HEFTOR-hoz (későbbi fázisban WearOS). Új mappa `apps/watch-ios/` natív SwiftUI app. Funkciók: (1) aktív session detection — ha a iPhone-on fut egy workout session, a Watch automatikusan showolja, (2) screen 1: aktuális gyakorlat név + set count + nagy `COMPLETE SET` Digital Crown-vagy-tap gomb, (3) screen 2: rest timer countdown (Live Activity / always-on display), (4) haptic feedback timer 10s/3s/0s pontokon. Communication: WatchConnectivity framework, real-time message channel a phone app és watch közt. A watch standalone nem értelmes — mindig egy aktív iPhone session-re piggyback. Stílus: identikus monochrome — fekete háttér, fehér szöveg, Inter (vagy SF Pro fallback). Build target: watchOS 10+. Nincs onboarding, nincs settings — a phone-on minden.

---

### 4.6 Quiet hours / focus mode edzés alatt
Push notifikációk auto-off edzés közben.

**Prompt:**
> Implementálj automatikus focus mode-ot az HEFTOR mobil app-ban a workout session ideje alatt. iOS: integráld az Focus Filter API-t (iOS 16+), amikor a user `Start workout`-ot nyom, kérdezzen rá egyszer "Enable Workout Focus during sessions?". Ha igen, minden session indítja a system-level Workout Focus-ot (csak emergency contacts mehetnek át). Android: használd a Do Not Disturb mode-ot a `NotificationManager.setInterruptionFilter` API-val. A workout end automatikusan kapcsol vissza normal mode-ra. User setting: `Auto Focus Mode during workouts` (default off, opt-in). Permission denied case: csak az app-internal notifikációkat blokkold (semmi PR celebration toast, semmi reminder, semmi "your friend started a workout" típusú zaj).

---

## 5. Recovery & body context

### 5.1 Bodyweight tracker
Egyetlen vékony line chart, opcionális napi súly bevitel.

**Prompt:**
> Adj hozzá bodyweight tracking-ot az HEFTOR account/profile screenhez. Új MongoDB collection `BodyWeightEntry`: { userId, date, kg }. UI: az Account oldalon egy szekció `Weight` egy egyszerű kg input mezővel és `Log today` gombbal. A submitted entries egy vékony 1px fehér line chart-on jelennek meg (90 napos default range), Y-tengelyen min/max kg, X-tengelyen első+utolsó dátum. A chart felett: aktuális súly nagy Inter Bold + 30-napos delta `−1.2 kg` (előjellel, szín nélkül). Opcionális Apple Health / Google Fit sync: heti egyszer pull a HealthKit `bodyMass` adatból, conflict esetén a HealthKit nyer. Naponta 1 entry max (override frissít, nem duplikál). Egy reminder kapcsoló: `Daily weigh-in reminder at 7:00 AM` (opcionális). Privacy: bodyweight nem szinkronizálódik PR feedbe, semmi social share.

---

### 5.2 Sleep + readiness overlay (Apple Health / Google Fit)
Healthkit-ből alvás és resting HR, fatigue inputként.

**Prompt:**
> Integrálj Apple HealthKit / Google Fit read-only pull-t az HEFTOR-ba. Olvasd: bodyweight, sleep duration, resting heart rate, steps. Adj hozzá a dashboardhoz egy `Today` sávot: `Sleep 7h 42m · RHR 58 · Steps 8,420` egy sorban, 12pt szürke uppercase. Semmi grafikon a dashboardon — csak a számok. A readiness score-t a fatigue detection (#1.5) is használhatja: ha sleep < 6h vagy RHR > baseline+10%, dashboardon egy halvány banner `Low readiness — consider reduced volume today`. Permission request a setting-ben opt-in (`Connect Apple Health`). Sync background-ben, daily, csak read scope. Ne tárolj duplikált adatot az adatbázisban — minden pull-on cache 24 óráig.

---

### 5.3 Mobility / warmup library
Rövid GIF-ek gyakorlat-specifikus mobility-vel linkelve.

**Prompt:**
> Hozz létre egy mobility & warmup library-t az HEFTOR-ba. Új MongoDB collection `MobilityExercise`: { name, gifUrl, durationSec, targetArea (shoulders/hips/spine/ankles/wrists), associatedExercises (string[] of main lift names) }. Seed 20-30 mobility drillel: cat-cow, world's greatest stretch, hip 90/90, shoulder dislocations, ankle dorsiflexion etc. Új tab `/mobility` (web + Flutter) listával, target area filterrel. Workout screenen minden compound gyakorlat fölött egy halvány `Mobility →` link, ami megnyitja az asszociált 2-3 mobility drillt sequence-ként (auto-advance 30s-onként). A drill view: GIF + drill név + countdown timer. Semmi rep szám, csak idő. Stílus: identikus exercise card-hoz, fekete-fehér thumbnail crop a GIF-ből.

---

### 5.4 Injury / pain flag
Gyakorlatnál egy kis "!", ha fájdalom volt.

**Prompt:**
> Adj hozzá injury/pain flag funkciót az HEFTOR-hoz. A workout screen szett során egy halvány `!` gomb. Tap után modal: `Did this set cause pain? Location: [Shoulder/Knee/Back/Wrist/Elbow/Other], Severity: 1-5`. A flag mentődjön `Set.painFlag: { location, severity }` mezőbe. Következő session ugyanazzal a gyakorlattal, ha az aktuális kg ≥ a flag-elt set kg-ja, warning banner: `Last time you flagged shoulder pain at 80kg — consider lighter or alternate`. Új screen `/injury-log` (account-on belül) reverse-chronological listával: dátum, gyakorlat, kg/reps, location, severity. Trend detection: ugyanaz a location 3+ alkalommal flagelve → suggestion a stagnation banner-szerűen, hogy fontold meg medical check-up-ot vagy form review-t. Stílus: a `!` jelzés mindenhol egyszerű karakter, semmi piros — szürke `!` enough.

---

## 6. Adat-portabilitás és coach

### 6.1 CSV / PDF export
Éves training journal, A4 friendly.

**Prompt:**
> Implementálj CSV és PDF export-ot az HEFTOR-hoz. Új endpoint `GET /api/export?format=csv|pdf&from=...&to=...`. CSV oszlopok: `date, training_name, exercise, set_index, kg, reps, rpe, is_warmup, e1rm, duration_min`. PDF: A4 portrait, header `HEFTOR TRAINING JOURNAL · {user name} · {date range}`, minden napon egy szekció, szekción belül training név + exercise lista táblázatos formában. Stílus a PDF-en: Inter font, vékony fekete szöveg fehér papíron, semmi szürke háttér — fordított-monochrome a nyomtathatóság miatt. Az export gomb az account oldalon: dátum range picker + format radio + `Download` gomb. Server-side PDF generation (pl. `pdfkit` Node-ra). Limit: max 365 nap egy exportban a memory miatt. Async generation > 30 nap esetén: link e-mailben.

---

### 6.2 Coach mode (klienseket figyelő)
Edző láthatja kliensei tervet és progressziót.

**Prompt:**
> Implementálj coach mode-ot az HEFTOR-ba. Új user role: `coach`. Egy coach meghívhat klienseket e-mail invite-tal (`POST /api/coach/invite`). Új MongoDB collection `CoachRelationship`: { coachUserId, clientUserId, status: 'pending' | 'accepted' | 'revoked', acceptedAt }. Coach login után új tab `/coach`: lista a klienseiről, kattintásra read-only view a kliens training-jeire, workout sessionjeire, progress chartjaira (azonos UI mint a saját adatra). Coach hozzáadhat egy `coachNote` mezőt minden workout sessionhez (max 200 char), amit a kliens a session summary-n lát: `Coach note: focus on bracing on heavy sets`. Coach készíthet és pushelhet trainings template-eket a kliensnek (`POST /api/coach/{clientId}/trainings`). Klienst minden coach action elfogadása előtt értesíti egy `Coach update` banner. Privacy: coach soha nem lát bodyweight-et, injury log-ot — csak a workout adatot. Revoke any time.

---

## 7. Stretch / kísérleti

### 7.1 Camera plate detection
Fotó a rúdról → automatikus kg számolás.

**Prompt:**
> Kísérleti feature: camera-based plate detection az HEFTOR mobil app-ban. Workout screenen a kg input mellett egy `📷` (vagy egyszerű "CAM" text) gomb. Tap után kamera megnyílik, user fényképezi a rúd egyik oldalát. On-device ML model (CoreML iOS / ML Kit Android) klasszifikálja a látható tárcsákat color-coded standardok alapján: piros 25kg, kék 20kg, sárga 15kg, zöld 10kg, fehér 5kg, ezüst kisebbek. A model output: `[25, 25, 10, 5] kg per side`. Számold ki: bar weight (default 20kg) + 2 × sum of detected plates = `100 kg`. Confirmation prompt: `Detected 100 kg — confirm? [Use] [Re-shoot] [Manual]`. Disclaim: experimental, accuracy ~70-80% jó megvilágításnál. Model size budget < 10 MB. Trénelt modell hiányában fallback dummy implementation pre-defined fotó set-tel teszteléshez. Ne pusholj ki produkcióba teszteletlen ML feature-t.

---

### 7.2 Training partner sync (közös session)
Real-time session megosztás edzőtárssal.

**Prompt:**
> Implementálj training partner sync-et az HEFTOR-hoz. Új concept `PartnerSession`: két (vagy több) user közös session-t indít a `Start partner session` gombbal. Invite QR kód vagy short code (`ABCD-1234`). A partner appja megerősíti, és attól a momenttől a két session shared state-en megy: ugyanazok a gyakorlatok ugyanabban a sorrendben, de saját kg/rep adatokkal. Real-time WebSocket channel (Socket.IO vagy Pusher): minden szett complete-et broadcastol a partner-nek halvány banner-ként `Partner finished set 3 — 100kg × 8`. Pihenő közben két timer ovális egymás mellett (saját + partner), figyeled, mikor kész a társ a következő szettre. Session end után a két user-nek külön save-elődik a session, de keresztreferencia `partnerSessionId` mezővel. Hosszú távon retrospective: `7 sessions with @karoly`. Stílus: a partner adata mindig 50% opacity-vel jelenjen meg, hogy a saját adat dominálja a UI-t. Edge case: connection drop → fallback solo session.

---

### 7.3 Geofence auto-start
Edzőterembe érkezésnél auto-indítás.

**Prompt:**
> Adj hozzá geofence-alapú auto-start prompt-ot az HEFTOR mobil app-hoz. Setup flow az Account-ban: `Set your gym location` — kérj engedélyt a location-re (when-in-use), a user pinneli a térképen az edzőterme helyét. Mentsd lat/lng + 100m radius geofence-ként az `User.gymLocation` mezőbe. iOS `CLLocationManager.startMonitoring(for:)` + Android Geofencing API: belépéskor (és csak training-napon, ha van mesocycle) push notification: `You arrived at your gym — start today's workout?` deep link-kel a Trainings screenre. Privacy: location semmiképp ne menjen server-re — csak lokálisan tárolódjon (encrypted KeyStore / Keychain). Csak when-in-use permission, soha not always. User setting opt-in (`Auto-start prompts at gym` default off). Trip detection cooldown: 1 prompt / 6 óra.

---

## Bónusz: Onboarding + meta

### 8.1 Onboarding wizard (új user)
3-step minimal setup.

**Prompt:**
> Hozz létre egy 3-step minimal onboarding wizard-ot az új HEFTOR user-eknek (web + mobile). Step 1: `What's your training goal?` chip-választás (Strength / Hypertrophy / General fitness / Powerlifting). Step 2: `How often do you train?` (2-3 / 4-5 / 6+ days). Step 3: `Choose a starting program` — 3-4 program template suggestion az 1-2 step alapján (#2.1-ből). Skip mindenhol elérhető (`I'll do it later`). Stílus: full-screen, semmi navbar, csak `1 / 3` indikátor a tetején, nagy Inter Bold kérdés, kártya-stílusú opciók. A wizard végén automatikusan beimport-álja a választott programot a user trainings listájába. Csak első login-kor fut. Re-runnable a Settings-ből: `Reset onboarding`.

---

### 8.2 Quick start ("Today's workout") banner a dashboardon
Egy tap a mai tréning indításához.

**Prompt:**
> Adj hozzá `Today's workout` banner-t a dashboard tetejére (web + mobile). Ha van aktív mesocycle, a heti séma alapján determinisztikusan tudjuk, melyik nap melyik training-et kell csinálni. A banner mutassa: nagy szöveggel `PUSH DAY A`, alatta kis szürke `6 exercises · ~75 min`, és egy nagy fehér `START` gomb. Tap → direkt a workout screenre az adott training-gel pre-loaded. Ha nincs mesocycle, fallback: az utolsó completed training rotation szerinti következő (pl. ha utoljára Push-t toltál, ma Pull). Ha rest day szerint van, a banner: `Rest day — recovery work?` linkkel a mobility library-ba (#5.3). Ne legyen agresszív — csak akkor mutasd, ha tényleg van mit indítani.

---

## Implementation prioritás (MVP javaslat)

Ha 5 feature-t választanál, ebben a sorrendben hozzák a legnagyobb értéket:

1. **#1.2 RPE / RIR logging** — fundamentum minden többi intelligenciához
2. **#1.1 Auto-progression engine** — egyetlen feature, ami miatt új user marad
3. **#1.6 Plate calculator** — 1 nap meló, mindennap használják
4. **#3.1 Muscle heatmap silhouette** — signature vizuál, illik a designhoz, 2 nap meló
5. **#4.1 Gym Mode** — egyetlen képernyő, ami megkülönböztet a "logger" appoktól

---

## Hogyan használd a promptokat

1. Másold ki a kívánt feature `**Prompt:**` blokkjának tartalmát.
2. Illeszd be egy új Claude Code session-be (a working directory legyen `/Users/mac/Desktop/Developer/workoutapp/`).
3. Ha több feature-t akarsz egyszerre, ajánlott külön branch-eken futtatni — több feature egy session-ben gyakran karambolozik.
4. A komplexebbeknél (mesocycle builder, coach mode, partner sync) érdemes előtte egy `/plan-eng-review` futtatás a részletes implementation tervhez.
