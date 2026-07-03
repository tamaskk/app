# Mobil app – hibalista

> Automatikus, több-ügynökös kódaudit eredménye a `apps/mobile` Flutter appról (a backend `apps/web` API-kkal együtt, ahol a hiba a kettő között van).
> 20 párhuzamos reviewer + fájlonkénti ellenőrző ügynökök. Minden tételt egy külön ellenőrző erősített meg a kód alapján.
>
> **Készült:** 2026-07-03 · **Megerősített hibák:** 130 · **Bizonytalan:** 1

## Összefoglaló

🔴 **Kritikus:** 1 · 🟠 **Magas:** 22 · 🟡 **Közepes:** 64 · ⚪ **Alacsony:** 43

Súlyossági szintek:

- 🔴 **Kritikus** – Összeomlás, adatvesztés vagy biztonsági hiba.
- 🟠 **Magas** – Funkció eltörik vagy hibás eredményt ad gyakori folyamatban.
- 🟡 **Közepes** – Szélső esetben hibás működés vagy zavaró UX-hiba.
- ⚪ **Alacsony** – Kisebb / kozmetikai hiba.

## Legfontosabb hibák (kritikus + magas)

| # | Súly | Fájl | Hiba |
|---|---|---|---|
| 1 | 🔴 Kritikus | [lib/screens/workout_screen.dart:328](lib/screens/workout_screen.dart#L328) | Az edzés befejezése a session POST némán elnyelt hibája esetén véglegesen elveszíti a naplózott edzést és törli a folytatható helyi állapotot |
| 2 | 🟠 Magas | [lib/models/exercise_api_models.dart:41](lib/models/exercise_api_models.dart#L41) | A targetMuscles a jelenlegi app-nyelvre olduodik fel, igy magyarul nem hasznalhato angol katalogus-szurokulcskent -> ures gyakorlatcsere-valaszto |
| 3 | 🟠 Magas | [lib/models/rank.dart:27](lib/models/rank.dart#L27) | A RankDef.fromJson kotelezo tipuskenyszeritest hajt vegre a hianyzo 'threshold' mezon, ami minden ranglista-bejegyzesnel kivetelt dob es teljesen elrontja a ranglista kepernyot |
| 4 | 🟠 Magas | [lib/screens/leaderboard_screen.dart:45](lib/screens/leaderboard_screen.dart#L45) | A ranglista soha nem jelenik meg: a RankDef.fromJson kötelező 'threshold' mezőt vár, amit a backend nem küld |
| 5 | 🟠 Magas | [lib/screens/onboarding_screen.dart:272](lib/screens/onboarding_screen.dart#L272) | A teljes onboarding folyamat fixen magyar nyelvű, pedig az app alapból angol |
| 6 | 🟠 Magas | [lib/screens/paywall_screen.dart:41](lib/screens/paywall_screen.dart#L41) | A relaunch/session-restore nem tolti be az elofizetest, igy a visszatero elofizetok az ingyenes probat/Pro-upgrade-et latjak |
| 7 | 🟠 Magas | [lib/screens/progress_screen.dart:44](lib/screens/progress_screen.dart#L44) | A haladasi statisztikak a be nem pipalt (done=false) sorozatokat is beleszamoljak |
| 8 | 🟠 Magas | [lib/screens/reset_password_screen.dart:97](lib/screens/reset_password_screen.dart#L97) | Sikeres jelszo-visszaallitas utan a kepernyo nem navigal tovabb, a felhasznalo a urlapon ragad |
| 9 | 🟠 Magas | [lib/screens/training_generator_screen.dart:72](lib/screens/training_generator_screen.dart#L72) | A tervgenerátor képernyő teljesen keményen kódolt magyar szövegeket használ, megkerülve az i18n rendszert |
| 10 | 🟠 Magas | [lib/screens/workout_screen.dart:151](lib/screens/workout_screen.dart#L151) | Az auto-progresszió javaslatai más felhasználók edzéselőzményeiből származnak (hitelesítetlen hívás + szűretlen backend lekérdezés) |
| 11 | 🟠 Magas | [lib/screens/workout_screen.dart:302](lib/screens/workout_screen.dart#L302) | Egy már naplózott, majd folytatott edzés újbóli befejezése második, átfedő sessiont hoz létre, duplán számolva az időtartamot és az XP-t |
| 12 | 🟠 Magas | [lib/screens/workout_screen.dart:442](lib/screens/workout_screen.dart#L442) | Az aktív edzés-képernyő fixen magyar szövegeket használ (plusz egy angol 'How to'), megkerülve az i18n táblát |
| 13 | 🟠 Magas | [lib/screens/workout_summary_screen.dart:83](lib/screens/workout_summary_screen.dart#L83) | A fejlődési százalékok minden felhasználó edzéseiből számolódnak, mert a GET /api/sessions nincs felhasználóra szűrve |
| 14 | 🟠 Magas | [lib/services/auth_service.dart:329](lib/services/auth_service.dart#L329) | A név mentése törli a gyorsítótárazott felhasználó előfizetését, XP-jét, rangját, heti tervét és emlékeztetőit |
| 15 | 🟠 Magas | [lib/utils/insights.dart:32](lib/utils/insights.dart#L32) | A naptar 'Megfigyelesek' chipjei fix magyar szovegek, angol nyelvu appban is |
| 16 | 🟠 Magas | [lib/utils/streak.dart:26](lib/utils/streak.dart#L26) | A heti sorozat minden nyari/teli oraatallitasnal levagodik, mert a heti kurzor abszolut 168 oras Duration-nel lep vissza |
| 17 | 🟠 Magas | [lib/widgets/generated_stories.dart:30](lib/widgets/generated_stories.dart#L30) | A generalt terv sav dayIndex szerint rendez weekIndex elott, osszekeverve a tobbhetes terveket |
| 18 | 🟠 Magas | [web: app/api/auth/me/route.ts:105](../web/app/api/auth/me/route.ts#L105) | Fiók törlése csak a User dokumentumot törli — az edzések és edzésnaplók a szerveren maradnak |
| 19 | 🟠 Magas | [web: app/api/auth/reset-password/route.ts:42](../web/app/api/auth/reset-password/route.ts#L42) | A jelszó-visszaállítás válasza mindig onboarding:null-t ad vissza (inkluzív Mongoose projekció), ami visszakényszeríti a felhasználót az onboardingba és felülírja a mentett válaszait |
| 20 | 🟠 Magas | [web: app/api/progress/stagnation/route.ts:30](../web/app/api/progress/stagnation/route.ts#L30) | A GET /api/progress/stagnation minden felhasznalo edzeseibol szamol platot, nem a hivo sajatjabol |
| 21 | 🟠 Magas | [web: app/api/progression/route.ts:50](../web/app/api/progression/route.ts#L50) | A POST /api/progression az OSSZES felhasznalo elozmenyebol szamol javaslatot (nincs userId szures, a mobil sem kuld tokent) |
| 22 | 🟠 Magas | [web: app/api/sessions/route.ts:18](../web/app/api/sessions/route.ts#L18) | A GET /api/sessions minden felhasználó edzését visszaadja userId szűrés nélkül |
| 23 | 🟠 Magas | [web: lib/trainingGenerator.ts:186](../web/lib/trainingGenerator.ts#L186) | A napi izomcsomag utolsó izmai kimaradnak: vádli, has és (a 4 napos tervben) bicepsz nem kap egyetlen gyakorlatot sem |

---

## 🔴 Kritikus súlyosságú hibák (1)

### 1. Az edzés befejezése a session POST némán elnyelt hibája esetén véglegesen elveszíti a naplózott edzést és törli a folytatható helyi állapotot

**Hol:** [lib/screens/workout_screen.dart:328](lib/screens/workout_screen.dart#L328)

Az _exit(asSession:true) a createSession hívást üres catch blokkal (324-326) veszi körül, majd a 328. sor feltétel nélkül törli a helyi folytatható állapotot (WorkoutProgressStore.clear). Ha nincs hálózat vagy a backend 500-at ad, a hiba elnyelődik, a session nem mentődik, a `created` null marad, így a képernyő minden visszajelzés nélkül visszalép (351). A felhasználó úgy látja, mintha minden rendben lett volna, közben az edzés nem jelenik meg az előzményekben, nem kap XP-t, és a 'folytatás' kártya is eltűnt, mert a helyi állapotot törölte. Az adat visszaállíthatatlanul elveszik.

<sub>🔧 Technikai részlet: In _exit(asSession:true) the createSession call (305) is wrapped in an empty catch (324-326), and line 328 unconditionally runs WorkoutProgressStore.clear(workout.id!). On a network/500 failure `created` stays null, so line 341's check fails and line 351 just pops with no error, no retry, no summary. The completed session (duration, done flags, XP) is never logged, and the local resumable progress has already been wiped, so the log is permanently lost. Only the training PATCH (_save) is retried via _dirty; the session is not.</sub>

---

## 🟠 Magas súlyosságú hibák (22)

### 2. A targetMuscles a jelenlegi app-nyelvre olduodik fel, igy magyarul nem hasznalhato angol katalogus-szurokulcskent -> ures gyakorlatcsere-valaszto

**Hol:** [lib/models/exercise_api_models.dart:41](lib/models/exercise_api_models.dart#L41)

A 41. sor a targetMuscles mezot a _localizedList/_pickLang fuggvennyel oldja fel, amely az aktualis app-nyelv ertekevel ter vissza (a 100. sor a nyelvi talalatot adja vissza az angol fallback elott), igy hu nyelven 'mellizmok' lesz 'pectorals' helyett. Ez az ertek visszakerul egy lekerdezesbe: a workout_screen.dart:706 az ex.targetMuscles.first-ot adja at initialMuscle-kent, az exercise_sheets.dart:284 pedig listExercises(targetMuscles:['mellizmok'])-et hiv, a _changeExercise pedig ujra eltarolja a picked.targetMuscles erteket (716. sor). A katalogus (a backend csak tovabbitja a szurot) csak angol izomkulcsokra illeszkedik - ezt a testver ExerciseApi._name helper is megerositi, amely szandekosan az angol erteket hasznalja stabil szurokulcskent. A felhasznalo magyar nyelven a gyakorlat cserejekor egy elore beallitott, de sose illeszkedo izom-szurot lat, es a valaszto uresen nyilik meg. Ez ellentmond a fajl sajat fejleccenek (9-11. sor) is.

<sub>🔧 Technikai részlet: targetMuscles is parsed via _localizedList->_pickLang, which returns the current app-language value (line 100 returns the matched-lang value before the English fallback). With lang='hu' a localized group yields e.g. 'mellizmok' instead of 'pectorals'. This value feeds back into a query: workout_screen.dart:706 passes ex.targetMuscles.first as initialMuscle -> exercise_sheets.dart:284 calls listExercises(targetMuscles:['mellizmok']), and _changeExercise re-stores picked.targetMuscles (line 716), perpetuating the localized value. The backend (apps/web/app/api/exercises/route.ts) merely proxies targetMuscles to the ExerciseDB catalogue, which matches English keys (confirmed by the sibling ExerciseApi._name helper that deliberately keys off the English value 'so it stays a stable filter key'). The muscle chip list itself is English, so the Hungarian pre-filter matches nothing and the replace-exercise picker opens empty. Contradicts this file's own header contract (lines 9-11). Confirmed and reachable when the app runs in Hungarian against a localized catalogue; severity high but partially recoverable by clearing the filter chip.</sub>

---

### 3. A RankDef.fromJson kotelezo tipuskenyszeritest hajt vegre a hianyzo 'threshold' mezon, ami minden ranglista-bejegyzesnel kivetelt dob es teljesen elrontja a ranglista kepernyot

**Hol:** [lib/models/rank.dart:27](lib/models/rank.dart#L27)

A rank.dart:27 sorban a `threshold: (json['threshold'] as num).toInt()` nem-nullozhato tipuskenyszeritest vegez. A ranglista backend (apps/web/app/api/leaderboard/route.ts:219-222) a rankBundle fuggvenyben csak {tier, numeral, name} mezoket ad vissza, a threshold mezot szandekosan kihagyja. A kliensen a _LbEntry.fromJson a json['rank'] objektumot adja at a RankDef.fromJson-nak, igy a json['threshold'] null, es a `null as num` TypeError-t dob. Ez a kivetel a _loadInitial/_loadMore .map(...) hivasaban es az ownPosition parszolasakor is bekovetkezik, amit a `catch (_)` elnyel es beallitja az _error erteket. Igy a felhasznalo minden fulon (global/country/rank/weekly) mindig a 'Nem sikerult betolteni a ranglistat.' uzenetet latja, es soha nem jelenik meg adat. Megjegyzes: a /api/me/rank teljes RankDef-et kuld thresholddal, igy a fiok kepernyo hasznalata nem erintett.

<sub>🔧 Technikai részlet: rank.dart:27 does `threshold: (json['threshold'] as num).toInt()`, a non-nullable cast. The leaderboard backend's rankBundle (apps/web/app/api/leaderboard/route.ts:219-222) returns only {tier, numeral, name} and omits threshold. _LbEntry.fromJson (leaderboard_screen.dart:45-47) passes json['rank'] into RankDef.fromJson, so json['threshold'] is null and `null as num` throws a TypeError. This throw occurs inside the .map(...) in _loadInitial (and for ownPosition), is swallowed by `catch (_)`, which sets _error. Every result row and ownPosition trigger it, so the board always shows the failure message on every scope. /api/me/rank does send threshold, so account_screen's use is unaffected — only the leaderboard path breaks. Confirmed and reachable; line 27 is correct.</sub>

---

### 4. A ranglista soha nem jelenik meg: a RankDef.fromJson kötelező 'threshold' mezőt vár, amit a backend nem küld

**Hol:** [lib/screens/leaderboard_screen.dart:45](lib/screens/leaderboard_screen.dart#L45)

A _LbEntry.fromJson a 45. sorban meghívja a RankDef.fromJson-t a json['rank'] térképpel, ami a backendtől (rankBundle, route.ts:219-222) csak {tier, numeral, name} mezőket tartalmaz — threshold nélkül. A RankDef.fromJson (rank.dart:27) viszont `threshold: (json['threshold'] as num).toInt()` nem-nullable cast-ot végez, ami null esetén TypeError-t dob. Ez minden results elemnél és az ownPosition-nél is bekövetkezik, így a _loadInitial catch ága lefut és _error = 'Nem sikerült betölteni a ranglistát.' lesz. A felhasználó minden scope-fülön és minden oldalon csak a hibaüzenetet látja — a ranglista funkció teljesen halott.

<sub>🔧 Technikai részlet: Backend rankBundle() (route.ts:219-222) returns only {tier, numeral, name}; RankDef.fromJson (rank.dart:27) does a non-nullable `(json['threshold'] as num).toInt()` cast which throws on the missing field. Every entry and ownPosition parse throws, _loadInitial's catch sets _error, so the error state always shows for every scope/page. Confirmed against both files.</sub>

---

### 5. A teljes onboarding folyamat fixen magyar nyelvű, pedig az app alapból angol

**Hol:** [lib/screens/onboarding_screen.dart:272](lib/screens/onboarding_screen.dart#L272)

Az onboarding_screen.dart nem importálja az i18n rendszert (app_strings.dart) és sehol nem hívja a t() függvényt – minden szöveg beégetett magyar sztring ('Mi a célod?', 'Tovább', 'Mentsd a tervemet' stb.). Az alkalmazás alapértelmezett nyelve viszont angol (app_strings.dart:18), és bár léteznek onboarding.continue/onboarding.skip kulcsok, ezeket a képernyő nem használja. Egy friss telepítés után, angol nyelven regisztráló felhasználó a kötelező regisztráció utáni onboardingot végig magyarul kapja, nyelvváltási lehetőség nélkül.

<sub>🔧 Technikai részlet: onboarding_screen.dart imports no i18n (app_strings.dart missing from imports lines 1-6) and never calls t(). Every user-facing string is a hardcoded Hungarian literal: 'Mi a célod?' (272), continueLabel default 'Tovább' (100), 'Mentsd a tervemet' (577), etc. AppStrings defaults to 'en' (app_strings.dart:18), and onboarding.continue/onboarding.skip keys exist in the dict (app_strings.dart:762-763) but are unused. A new user on the default English build sees this mandatory post-registration flow entirely in Hungarian.</sub>

---

### 6. A relaunch/session-restore nem tolti be az elofizetest, igy a visszatero elofizetok az ingyenes probat/Pro-upgrade-et latjak

**Hol:** [lib/screens/paywall_screen.dart:41](lib/screens/paywall_screen.dart#L41)

A jogosultsagot a gyorsitotarazott widget.auth.user?.subscription-bol szamolja (41. sor), de a session visszaallitasa a GET /api/auth/me vegpontot hivja, ami NEM adja vissza a subscription mezot, igy az AuthUser.fromJson az ingyenes elofizetesre esik vissza. Nincs indulaskori getSubscription() lekeres (az egyetlen hivo a paywall 'Vasarlasok visszaallitasa' gombja). Emiatt egy aktiv elofizeto, aki kilep es ujrainditja az appot, a paywallon a 'Kezdd el a 3 napos ingyenes probat' gombot latja, a Fiok kepernyon pedig 'Ingyenes' allapotot es 'Frissites Pro-ra' CTA-t, a lemondas link elrejtve. Megjegyzes: a bejelentkezes valojaban helyesen tolti be az elofizetest (publicUserJson), tehat az uj eszkozon valo belepes nem hibas, de az ujrainditasi ut valoban torott.

<sub>🔧 Technikai részlet: canTrial at line 41 (and _onPrimaryCta at 338, and AccountScreen at account_screen.dart:413) reads widget.auth.user?.subscription. On session restore, restoreSession() (auth_service.dart:306) calls GET /api/auth/me, whose route (apps/web/app/api/auth/me/route.ts) returns a user object with NO subscription field, so AuthUser.fromJson (auth.dart:48-51) defaults to Subscription.free(). No launch-time getSubscription() poll exists (the only caller is paywall _onRestore, line 377). Thus a paying user who force-quits and relaunches sees canTrial=true and the 'Start 3-day free trial' CTA, and Account shows 'Free'/'Upgrade to Pro'. The scenario is reachable and the defect is real. Minor inaccuracies in the report: the LOGIN route DOES hydrate subscription (via publicUserJson, user-json.ts), so the 'new device login' sub-case is not broken; and register omitting it is harmless (new users are free anyway). The core restore-path bug stands.</sub>

---

### 7. A haladasi statisztikak a be nem pipalt (done=false) sorozatokat is beleszamoljak

**Hol:** [lib/screens/progress_screen.dart:44](lib/screens/progress_screen.dart#L44)

A _sessionVolume es a _metricValue (Volume, Max Weight, Total Reps, 1RM) minden sorozaton vegigmegy, done szures nelkul. A befejezeskor a kliens minden sorozatot elkuld a valos done ertekevel (workout_screen.dart:320), a backend pedig szures nelkul eltarolja oket, igy a sablonbol elore kitoltott, de ki nem pipalt sorozatok is bekerulnek. Emiatt a Volume es az ismetlesszam felfujodik, es ha a kihagyott sorozat volt a legnehezebb, a Max Weight/1RM olyan sulyt mutat, amit a felhasznalo sosem emelt meg. Ez ellentmond a recent_pr.dart es a doneSets logikanak, amelyek szurik a set.done erteket.

<sub>🔧 Technikai részlet: _sessionVolume (44-45) and _metricValue (195-206: Volume, Max Weight, Total Reps, Epley 1RM) fold over every set with no set.done filter. Confirmed the sets reach the client unfiltered: workout_screen.dart:320 sends _setPayload(s, done:true) which emits 'done': s.done (the real flag, false for skipped sets), and apps/web/lib/trainings.ts mapExercises persists done: s.done ?? false without dropping unchecked sets. Meanwhile recent_pr.dart (53,101) and the model's doneSets (api_models.dart:195-196) DO filter set.done. So a planned template set left unchecked (carrying pre-filled/auto-progression kg*reps) inflates Volume and Total Reps, and can spike Max Weight/1RM to a weight never lifted, while the PR badge (filtered) does not flag it. Wrong results in the common skip-a-set flow.</sub>

---

### 8. Sikeres jelszo-visszaallitas utan a kepernyo nem navigal tovabb, a felhasznalo a urlapon ragad

**Hol:** [lib/screens/reset_password_screen.dart:97](lib/screens/reset_password_screen.dart#L97)

Sikeres visszaallitaskor a kod meghivja a widget.onAuthenticated?.call(user)-t (97. sor), de csak akkor lep vissza (pop), ha az onAuthenticated == null (100. sor). A valos bekotesben az onAuthenticated soha nem null: a LoginScreen (login_screen.dart:150) es a ForgotPasswordScreen (forgot_password_screen.dart:81) valtozatlanul tovabbadja, es az a main.dart:215-ben levo (user) => setState(() => _user = user) callbackra oldodik fel. Ez a setState csak az AuthGate also (home) utvonalanak tartalmat cbereli LoginScreen-rol MainShell-re, mikozben a rakott ForgotPasswordScreen es ResetPasswordScreen utvonalak a stack tetejen maradnak. Igy a felhasznalo tovabbra is a reset urlapot latja: a spinner megall, nincs sikeruzenet, nincs navigacio. Ha ujra ranyom, a mar felhasznalt tokennel ujra kuld, a szerver 410-et ad, es megjelenik a 'link ervenytelen vagy lejart' uzenet, ami azt a hamis benyomast kelti, hogy a visszaallitas nem sikerult.

<sub>🔧 Technikai részlet: On success the screen calls widget.onAuthenticated?.call(user) (line 97) and only pops when onAuthenticated == null (line 100). In real wiring onAuthenticated is always non-null: login_screen.dart:150 pushes ForgotPasswordScreen with the raw callback (unlike _goToRegister at line 73-75 which wraps it in a Navigator.pop), forgot_password_screen.dart:81 threads it unchanged to ResetPasswordScreen, and it resolves to main.dart:215 (user) => setState(() => _user = user). That setState only swaps AuthGate's home-route content (LoginScreen -> MainShell) at the bottom of the navigator; the pushed ForgotPasswordScreen and ResetPasswordScreen routes stay on top, so the reset form remains visible. Re-tapping re-submits the consumed token -> resetPassword throws AuthException 410 -> line 106-107 shows reset_invalid_or_expired. The defect and scenario are both reachable.</sub>

---

### 9. A tervgenerátor képernyő teljesen keményen kódolt magyar szövegeket használ, megkerülve az i18n rendszert

**Hol:** [lib/screens/training_generator_screen.dart:72](lib/screens/training_generator_screen.dart#L72)

A képernyő egyetlen felhasználói szöveget sem az AppStrings/t() rendszeren keresztül jelenít meg, hanem mindent keményen kódolt magyarul (pl. a '$created edzés generálva.' snackbar a 72. soron, a 'Hálózati hiba. Próbáld újra.' a 80. soron, a 'GENERÁLD A(...) EDZÉST' gomb a 141. soron, valamint a fejléc, a szekciócímkék és az előnézet szövegei). Az alkalmazás alapértelmezett nyelve 'en', és az indító trainings_list_screen.dart már a t() fordítófüggvényt használja, így egy angol nyelvre állított felhasználó az egyébként angol folyamaton belül egy teljesen magyar generátor képernyőt lát, magyar hibaüzenetekkel és visszajelzéssel. A hiba minden angol nyelvű felhasználónál jelentkezik, amint megnyitja a generátort.

<sub>🔧 Technikai részlet: Verified: apps/mobile/lib/i18n/app_strings.dart defines a bilingual system defaulting to 'en' (_lang = 'en'), and the launching screen trainings_list_screen.dart imports it and uses t('trainings.added') etc. training_generator_screen.dart never imports app_strings.dart and hardcodes Hungarian in every user-facing string: snackbar '$created edzés generálva.' (line 72), network error 'Hálózati hiba. Próbáld újra.' (line 80), button 'GENERÁLD A(...) EDZÉST' (line 141), header/labels/preview (lines 162-188, 198, 264, 285, 288, 318, 344-382), and muscle labels (lines 21-30). An English user (the default) gets a fully Hungarian screen.</sub>

---

### 10. Az auto-progresszió javaslatai más felhasználók edzéselőzményeiből származnak (hitelesítetlen hívás + szűretlen backend lekérdezés)

**Hol:** [lib/screens/workout_screen.dart:151](lib/screens/workout_screen.dart#L151)

A _loadSuggestions a getProgressionSuggestions-t hívja, amely csak Content-Type fejlécet küld, Authorization tokent nem — ellentétben az api.dart összes többi felhasználóhoz kötött hívásával. A backend progression/route.ts ezután userId szűrő nélkül kérdezi le a session-öket, így minden felhasználó előzményéből veszi a legutóbbi 3 sessiont gyakorlatonként. A 'Javasolt: X × Y' felirat ezért egy idegen felhasználó terheléseit tükrözheti. Egy 40 kg-ot guggoló kezdő így akár 'Javasolt: 142,5 × 5' értéket láthat, ami veszélyes és teljesen irreleváns.

<sub>🔧 Technikai részlet: _loadSuggestions calls _api.getProgressionSuggestions which sends only a Content-Type header — no Authorization bearer, unlike every other user-scoped call in api.dart. The backend progression/route.ts then runs WorkoutSessionModel.find({'exercises.exerciseId':{$in:ids}}) with no userId filter and takes HISTORY_DEPTH=3 recent sessions per exercise from the entire user base. The 'Javasolt:' hint (line 1164) therefore reflects whichever user most recently trained that exercise, not the current user. Both the missing token and the unscoped query are plainly present in code and reachable on every workout open.</sub>

---

### 11. Egy már naplózott, majd folytatott edzés újbóli befejezése második, átfedő sessiont hoz létre, duplán számolva az időtartamot és az XP-t

**Hol:** [lib/screens/workout_screen.dart:302](lib/screens/workout_screen.dart#L302)

A dashboard 'folytatás' funkciója (_resumeFromSession) a régi session időtartamát adja át resumeElapsed-ként és visszaállítja a már kipipált szetteket. Az _exit viszont mindig új sessiont POST-ol: a startedAt-et a teljes _elapsedTotal-lal (a korábbi session idejét is tartalmazza) dátumozza vissza, a backend pedig feltétel nélkül új dokumentumot hoz létre és újra kioszt XP-t a már jutalmazott szettekre. Így az előzményekben két, időben átfedő session szerepel, a heti volumen és az XP közel megduplázódik. Például egy 45 perces edzés folytatása 15 perccel egy 60 perces második sessiont és dupla XP-t eredményez.

<sub>🔧 Technikai részlet: A logged session can be resumed from the dashboard (_resumeFromSession, dashboard_screen.dart 228-266) which passes resumeElapsed:s.duration and rebuilds sets with their done flags. _exit always back-dates startedAt by the full _elapsedTotal (302-303, which includes the previous session's duration) and POSTs a brand-new session with all done sets marked done (320). The backend sessions/route.ts:58 unconditionally WorkoutSessionModel.create()s a new document and re-awards XP (calculateSessionXp, 111-123). Nothing updates the original, so history shows two overlapping sessions and XP is double-counted for already-rewarded sets.</sub>

---

### 12. Az aktív edzés-képernyő fixen magyar szövegeket használ (plusz egy angol 'How to'), megkerülve az i18n táblát

**Hol:** [lib/screens/workout_screen.dart:442](lib/screens/workout_screen.dart#L442)

A workout_screen.dart egyáltalán nem használja a meglévő AppStrings i18n rendszert (amiben külön workout.* kulcsok is vannak en/hu fordítással), hanem végig beégetett magyar szövegeket jelenít meg: metrika-fejlécek, a pihenő-lejárt overlay ('Pihenő letelt', 'Készülj a következő szettre', 'Folytatás'), a menük ('Edzés befejezése', 'Kilépés – később folytatom', 'Edzés elvetése', 'Progresszió', 'Törlés'), a progresszió-stratégiák, a 'Megnézés YouTube-on', a 'Nincs több gyakorlat' és a 'Kilépés'. Ráadásul a 966. sor angolul írja ki a 'How to' feliratot. Angol nyelvre állítva a teljes edzés-lejátszó magyarul jelenik meg, magyar nyelven pedig a 'How to' angolul marad – mindkét esetben kevert nyelvű felület.

<sub>🔧 Technikai részlet: The app has a real i18n system: AppStrings (lib/i18n/app_strings.dart) is a ChangeNotifier with a t(key) lookup and en/hu entries, including a dedicated 'workout.*' section (workout.finish/add_set/rest/suggested at 752-755). workout_screen.dart imports and calls none of it (grep confirms no AppStrings/.t usage) and hardcodes Hungarian throughout: metric headers 'MÉTER'/'TEMPÓ'/'KG'/'IDŐ' (184-192), rest-over overlay 'Pihenő letelt' (411 barrierLabel, 442) / 'Készülj a következő szettre' (450) / 'Folytatás' (464), 'Pihenőidő' (489), menu items (572,576,580,598,606), progression labels (670-673), 'Megnézés YouTube-on' (1053), 'Nincs több gyakorlat' (1135), 'Kilépés' (1148); and conversely line 966 hardcodes English 'How to'. So English users see a Hungarian core workout player and Hungarian users see a stray English link.</sub>

---

### 13. A fejlődési százalékok minden felhasználó edzéseiből számolódnak, mert a GET /api/sessions nincs felhasználóra szűrve

**Hol:** [lib/screens/workout_summary_screen.dart:83](lib/screens/workout_summary_screen.dart#L83)

A backend GET /api/sessions végpontja (route.ts 15-26. sor) semmilyen userId szűrőt nem alkalmaz és a tokent sem olvassa, így az összes felhasználó edzését visszaadja. Az összesítő képernyő _loadPrevious függvénye (83. sor) ezt a listát csak exerciseId alapján párosítja (96. sor), így az 'előző alkalom' egy idegen felhasználó edzése is lehet. Emiatt a felhasználó akár egy soha nem végzett gyakorlathoz is lát piros/zöld nyilat hibás százalékkal, és a kliens idegen felhasználók edzésadatait is megkapja.

<sub>🔧 Technikai részlet: Backend GET /api/sessions (apps/web/app/api/sessions/route.ts lines 15-26) runs WorkoutSessionModel.find() with no userId filter and never reads the bearer token, returning every user's sessions. Mobile getSessions() (api.dart line 369) and _loadPrevious (line 83) consume that list and match the 'previous occurrence' purely by exerciseId (_exKey, line 96), so the matched prior session can belong to another user. This both leaks other users' training data and produces meaningless up/down percentage arrows.</sub>

---

### 14. A név mentése törli a gyorsítótárazott felhasználó előfizetését, XP-jét, rangját, heti tervét és emlékeztetőit

**Hol:** [lib/services/auth_service.dart:329](lib/services/auth_service.dart#L329)

Az updateProfile() a teljes _user objektumot lecseréli a PATCH /api/auth/me válaszból, ami viszont csak az id, email és name mezőket adja vissza. Az AuthUser.fromJson a hiányzó mezőket alapértelmezettre állítja (xp=0, rang=1, subscription=free, weeklyPlan/reminders/onboarding=null), így egy sima névváltoztatás elveszíti az összes gamifikációs és előfizetési állapotot. A felhasználó az Account képernyőn a mentés után azonnal azt látja, hogy Pro helyett Free lett, eltűnik a rangja/XP-je, a heti terve és az emlékeztetői, egészen az app újraindításáig vagy a /me újratöltéséig.

<sub>🔧 Technikai részlet: updateProfile() does `_user = AuthUser.fromJson(data['user'])`, but PATCH /api/auth/me (apps/web/app/api/auth/me/route.ts:91-93) returns only `{id, email, name}`. AuthUser.fromJson (models/auth.dart:31-52) defaults every missing field: xp=0, rank=1, onboarding/username/weeklyPlan/reminders=null, subscription=Subscription.free(). account_screen.dart:119 calls updateProfile then re-renders from widget.auth.user (used for the subscription card at line 413), so the cached Pro/XP/rank/plan state is wiped and immediately visible. Nothing re-fetches /me during the session.</sub>

---

### 15. A naptar 'Megfigyelesek' chipjei fix magyar szovegek, angol nyelvu appban is

**Hol:** [lib/utils/insights.dart:32](lib/utils/insights.dart#L32)

A computeInsights minden felhasznaloi szoveget (napok nevei, 'EDZESZ LEGTOBBET', 'A LEGRITKABB', 'ATLAGOSAN hh:mm-KOR KEZDESZ', 'ATLAG SESSION: n PERC') fix magyar sztringkent allitja elo, kikerulve a t()/tFmt() forditasi utat. A calendar_screen.dart valtozatlanul jeleniti meg ezeket a lokalizalt 'OBSERVATIONS' fejlec alatt, az app alapertelmezett nyelve viszont angol. Egy angol nyelvre allitott felhasznalo (ez az alapertelmezes) 5+ rogzitett edzessel a Naptar fulon magyar mondatokat lat az angol fejlec alatt.

<sub>🔧 Technikai részlet: computeInsights produces only hardcoded Hungarian strings: _dayNames (lines 32-40), 'EDZESZ LEGTOBBET' (78), 'A LEGRITKABB' (82), 'ATLAGOSAN hh:mm-KOR KEZDESZ' (96), 'ATLAG SESSION: n PERC' (104). calendar_screen.dart:746-751 renders them verbatim under the localized t('calendar.observations_caps') header, and app_strings.dart:18 sets the default language to 'en'. English users therefore see Hungarian chips.</sub>

---

### 16. A heti sorozat minden nyari/teli oraatallitasnal levagodik, mert a heti kurzor abszolut 168 oras Duration-nel lep vissza

**Hol:** [lib/utils/streak.dart:26](lib/utils/streak.dart#L26)

A weeklyStreak a hetek Monday-ejfel idobelyegeit (millisecondsSinceEpoch) tarolja, de a visszalepes a cursor.subtract(Duration(days:7)) abszolut idoszamitassal tortenik. Amikor a 7 napos lepes atlepi az EU-s oraatallitasi hatart (Magyarorszagon marcius es oktober utolso vasarnapja), a kurzor 1 orat elcsuszik (pl. hetfo 00:00 helyett vasarnap 23:00 vagy hetfo 01:00), igy az idobelyeg mar nem egyezik egyetlen tarolt het kulccsal sem, es a ciklus idejekoran leall. Emiatt a felhasznalo a dashboard es a naptar sorozatszamlaloban a valosnal joval kisebb erteket lat (pl. 26 helyett ~13), es a hiba az egesz szezonban fennmarad. A hiba evente ketszer, minden felhasznalonal jelentkezik.

<sub>🔧 Technikai részlet: weeks stores _weekStart epoch ms (local Monday-midnights, each with that week's UTC offset). The walk cursor = cursor.subtract(const Duration(days:7)) (line 26) and the last-week check (lines 17-19) do absolute 168h arithmetic. Crossing a EU DST transition the offset changes by 1h, so e.g. Mon 2026-03-30 00:00 CEST minus 168h = 2026-03-22 22:00 UTC, whereas the stored key for the 03-23 week = 2026-03-22 23:00 UTC. The epochs differ by 3600000 ms, weeks.contains() returns false, and the while-loop terminates early, truncating the streak. Same drift at the October fall-back. Consumed by dashboard_screen.dart:129 and calendar_screen.dart:103.</sub>

---

### 17. A generalt terv sav dayIndex szerint rendez weekIndex elott, osszekeverve a tobbhetes terveket

**Hol:** [lib/widgets/generated_stories.dart:30](lib/widgets/generated_stories.dart#L30)

A _sorted() metodus eloszor a dayIndex szerint rendez (30. sor), es csak egyenloseg eseten esik vissza a weekIndex-re (33. sor). A backend generator viszont a dayIndex-et heten belul (0..sessionsPerWeek-1) allitja be, a kartyanevek pedig a globalIndex+1 alapjan keszulnek. Emiatt egy 4 hetes, heti 3 edzeses tervnel a sav az 1,4,7,10,2,5,8,11,3,6,9,12 sorrendben jelenik meg 1..12 helyett. A felhasznalo az '1. nap' elvegzese utan a '4. nap'-ot latja legelol kovetkezokent, igy ket tervezett edzest atugorhat; a helyes kulcs a weekIndex elsodleges, dayIndex masodlagos rendezes.

<sub>🔧 Technikai részlet: The backend generator (trainingGenerator.ts:56-61) sets dayIndex 0-based within the week (0..sessionsPerWeek-1) and weekIndex per week, while card names use globalIndex+1 = w*sessionsPerWeek+d+1. Both fields are persisted (generate/route.ts:77-78) and parsed by the model (api_models.dart:110-111). _sorted() at line 30 compares dayIndex FIRST, using weekIndex only as a tiebreak (line 33), so a 4-week x 3-session plan renders as 1,4,7,10,2,5,8,11,3,6,9,12 instead of 1..12. Chronological order requires weekIndex primary and dayIndex secondary. This contradicts the widget's own doc comment and steers the user to the wrong next session.</sub>

---

### 18. Fiók törlése csak a User dokumentumot törli — az edzések és edzésnaplók a szerveren maradnak

**Hol:** [web: app/api/auth/me/route.ts:105](../web/app/api/auth/me/route.ts#L105)

A DELETE /api/auth/me végpont kizárólag a UserModel.findByIdAndDelete(id) hívást futtatja, nincs kaszkádtörlés a felhasználó Training és WorkoutSession dokumentumaira, amelyek userId mezővel kötődnek a fiókhoz. A User sémán nincs pre-delete hook sem, ami ezt pótolná. Amikor a felhasználó a fiók törlését megerősíti ('Ez a művelet nem vonható vissza'), az API 204-et ad vissza és a kliens kijelentkezik, de a teljes edzéselőzmény és minden személyes edzésterv az adatbázisban marad árván a régi userId alatt. Ez adatmegőrzési/adatvédelmi hiba (GDPR törléshez való jog).

<sub>🔧 Technikai részlet: DELETE handler runs only UserModel.findByIdAndDelete(id). Training (userId indexed) and WorkoutSession (userId indexed) documents are not cascade-deleted, and the User schema has no pre-delete hook that would remove them. So all of the user's trainings and workout sessions remain orphaned in MongoDB after account 'deletion', contradicting the UI's irreversible-deletion promise (privacy/GDPR right-to-erasure defect).</sub>

---

### 19. A jelszó-visszaállítás válasza mindig onboarding:null-t ad vissza (inkluzív Mongoose projekció), ami visszakényszeríti a felhasználót az onboardingba és felülírja a mentett válaszait

**Hol:** [web: app/api/auth/reset-password/route.ts:42](../web/app/api/auth/reset-password/route.ts#L42)

A lekérdezés a `.select("+passwordResetTokenHash +passwordResetExpiresAt email name passwordHash")`-t használja, ami keveri a `+` előtagú (csak a séma-szintű select:false-t felülíró) mezőket a sima inkluzív mezőkkel (email, name, passwordHash). Emiatt a Mongoose inkluzív projekciónak tekinti: csak ezeket a mezőket tölti be, így a user.onboarding, xp, rank, username, weeklyPlan és reminders mind undefined lesz, és a válasz JSON onboarding:null-t, xp:0-t, rank:1-et stb. küld a teljes adatú felhasználónak is. A hiba akkor jelentkezik, amikor egy meglévő, onboardingot már kitöltött felhasználó a jelszó-visszaállító folyamatot végigcsinálja. A felhasználó azt látja, hogy a mobilapp (main.dart:159 _needsOnboarding) újra megjeleníti neki a 6 lépéses onboarding kérdőívet, mintha új felhasználó lenne; a kitöltés után az eredeti onboarding-válaszai (cél, split, hangolt optimalVolume) felülíródnak, az xp/rank/heti terv pedig visszaállítottnak tűnik a következő /me lekérésig.

<sub>🔧 Technikai részlet: Confirmed. The `.select("+passwordResetTokenHash +passwordResetExpiresAt email name passwordHash")` mixes `+`-prefixed fields (which only override schema `select:false`) with plain inclusive paths (email, name, passwordHash). Mongoose therefore treats it as an INCLUSIVE projection: only _id, email, name, passwordHash and the two forced reset fields are loaded. user.onboarding, xp, rank, username, weeklyPlan, reminders are all undefined, so the response JSON at lines 64-69 emits onboarding:null, xp:0, rank:1, weeklyPlan:null etc. even for a fully-populated user. The User schema (models/User.ts) defines all these as real fields with defaults, and login/route.ts:45 uses publicUserJson(user) on a full document without this restrictive select, so the bug is unique to reset-password. Mobile main.dart:159 `_needsOnboarding => _user!.onboarding == null` then routes the user back into OnboardingScreen; finishing it PATCHes /api/me/onboarding and overwrites their saved answers. Scenario reachable via the normal forgot-password flow.</sub>

---

### 20. A GET /api/progress/stagnation minden felhasznalo edzeseibol szamol platot, nem a hivo sajatjabol

**Hol:** [web: app/api/progress/stagnation/route.ts:30](../web/app/api/progress/stagnation/route.ts#L30)

A stagnalas-detektor route a 30. sorban a WorkoutSessionModel.find() hivast szuro nelkul futtatja, es a bearer tokent egyaltalan nem olvassa ki, pedig a WorkoutSession modellnek van indexelt userId mezoje. Emiatt akar 300, az OSSZES felhasznalotol szarmazo edzes kerul a detectStagnation fuggvenybe, amely csak exerciseId szerint csoportosit, felhasznalo szerint nem. Tobbfelhasznalos kornyezetben a felhasznalo a dashboard platobanneren idegenek gyakorlatait/e1RM ertekeit lathatja, olyan gyakorlatrol is kaphat platojelzest, amit soha nem vegzett. A mobil (api.dart getStagnation) elkuldi a tokent, de a szerver figyelmen kivul hagyja.

<sub>🔧 Technikai részlet: The GET handler calls WorkoutSessionModel.find() with no filter and never reads the bearer token, despite WorkoutSession having an indexed userId field (lib/models/WorkoutSession.ts). It passes up to 300 sessions from ALL users into detectStagnation, whose StagnationSession type (lib/stagnation.ts) has no userId concept and groups purely by exerciseId. So in any multi-user deployment the plateau/e1RM results mix strangers' lifts into the caller's dashboard banner. The scenario is reachable: mobile Api.getStagnation() sends the token but it is ignored server-side. (Note: GET /api/sessions shares the same unfiltered pattern, but this finding is specifically and correctly about the stagnation route.)</sub>

---

### 21. A POST /api/progression az OSSZES felhasznalo elozmenyebol szamol javaslatot (nincs userId szures, a mobil sem kuld tokent)

**Hol:** [web: app/api/progression/route.ts:50](../web/app/api/progression/route.ts#L50)

A route az 'exercises.exerciseId' alapjan kérdezi le a munkameneteket userId szures nelkul (50-52. sor), pedig a WorkoutSession modellben van indexelt userId mezo. A mobil kliens getProgressionSuggestions hivasa csak Content-Type fejlecet kuld, Authorization tokent nem, es a handler sehol nem olvas ki felhasznalot, igy a szures nem is lehetseges. Mivel az exerciseId-k a kozos katalogusbol szarmaznak, minden edzes kozbeni javaslat a tobbi felhasznalo betoltott sulyaibol keveredik: ha valaki masik user 140 kg-ot naplozott, a 60 kg-mal edzo felhasznalo idegen terheleshez igazitott kovetkezo-sorozat javaslatot lat.

<sub>🔧 Technikai részlet: The POST handler builds each exercise's history from WorkoutSessionModel.find({ 'exercises.exerciseId': { $in: ids } }) (line 50-52) with no userId filter, even though the WorkoutSession schema has an indexed userId field (WorkoutSession.ts line 41). The mobile client's getProgressionSuggestions (api.dart) sends only Content-Type and no Authorization header, and the handler never reads any auth/userId, so scoping is impossible. Catalogue exerciseIds are shared across all users, so the sort/limit(200) pool and the resulting suggestedKg/suggestedReps are derived from every account that logged that exerciseId. Reachable on every in-workout suggestion request; not guarded elsewhere.</sub>

---

### 22. A GET /api/sessions minden felhasználó edzését visszaadja userId szűrés nélkül

**Hol:** [web: app/api/sessions/route.ts:18](../web/app/api/sessions/route.ts#L18)

A GET kezelő (18. sor) a WorkoutSessionModel.find() hívást szűrő nélkül futtatja, és a bearer tokent el sem olvassa, így a teljes kollekció minden edzésmenetét visszaadja. A hiba akkor jelentkezik, amikor bármelyik bejelentkezett felhasználó megnyitja a Dashboard, Naptár, Haladás vagy Edzés-összegző képernyőt: a saját adatai közé keverve látja más fiókok edzéseit, dátumait, gyakorlatneveit és súlyait, ami eltorzítja a statisztikákat (edzésszám, sorozatok, e1RM görbék). A testvér GET /api/trainings végpont ezzel szemben userId-re szűr, és a kódkomment kifejezetten 'valódi hibaként' írja le a nem szűrt visszaadást; a sessions végpontot sosem javították ki. A POST viszont eltárolja a userId-t, tehát az adat tulajdonolt, csak a GET hagyja figyelmen kívül.

<sub>🔧 Technikai részlet: GET at lines 15-21 calls WorkoutSessionModel.find() with no filter and never reads the bearer token, returning every user's sessions. The sibling GET /api/trainings (trainings/route.ts) reads the token and filters by `userId: userId ?? null`, and its comment documents that returning unscoped rows was 'a real bug'. POST /api/sessions does persist userId (line 59), so sessions are owned but the GET ignores ownership. Mobile Api.getSessions() (api.dart ~line 368) sends the auth header via _get but the server discards it, so any signed-in user's Dashboard/Calendar/Progress screens receive all other accounts' sessions mixed into their stats.</sub>

---

### 23. A napi izomcsomag utolsó izmai kimaradnak: vádli, has és (a 4 napos tervben) bicepsz nem kap egyetlen gyakorlatot sem

**Hol:** [web: lib/trainingGenerator.ts:186](../web/lib/trainingGenerator.ts#L186)

A pickSessionExercises először izmonként egy összetett gyakorlatot választ, majd izolációs gyakorlatokkal tölt fel, de a 186. sorban `break`-el, amint eléri az 5 gyakorlatot. Mivel az izmokat a csomag sorrendjében járja be, a hátsó izmok (vádli, has, illetve a 4 napos felsőtest-napon a bicepsz) semmit nem kapnak, és egyetlen kiválasztott gyakorlat targetMuscles mezője sem tartalmazza őket. Az alapértelmezett (üres fókusz, 4 edzés/hét) beállítással generált teljes tervben így a vádli és a bicepsz teljes 1-20 hetes időszakon át 0 terhelést kap, miközben a UI azt ígéri, hogy üresen hagyva mind a tíz csoport lefedésre kerül.

<sub>🔧 Technikai részlet: pickSessionExercises picks 1 compound per muscle in bundle order (break at >=6), then pads isolations with `break` at picked.length>=5 (line 186), then a fallback breaking at >=4. Traced against exercisePool.ts: leg bundle [quads,hamstrings,glutes,calves] -> Back Squat, RDL, Hip Thrust (calves has no compound), Leg Extension, Lying Leg Curl (=5) then break; calves never picked and no picked exercise lists calves in targetMuscles. 4-day upper [chest,back,shoulders,triceps,biceps] -> Bench, Deadlift, OHP, Close-Grip Bench, Cable Fly (=5) then break; biceps pool is isolation-only and no picked exercise targets biceps. The 2-/5-day [chest,back,shoulders,abs] bundle likewise never reaches abs. So calves is never trained in any full-focus plan with a leg day, biceps is never trained in the 4-day (default) plan, and abs is never trained in the 2-/5-day plans, despite muscleGroups claiming them. Reachable via the default empty-focus / 4-sessions path.</sub>

---

## 🟡 Közepes súlyosságú hibák (64)

### 24. Az Android auto-backup engedelyezve maradt (allowBackup alapertelmezetten true), igy a SharedPreferences-ben tarolt sima szoveges auth token biztonsagi mentessel kiszivarogtathato.

**Hol:** [android/app/src/main/AndroidManifest.xml:2](android/app/src/main/AndroidManifest.xml#L2)

A manifest <application> eleme (2-5. sor) nem allitja be az android:allowBackup="false" attributumot, sem a dataExtractionRules/fullBackupContent szabalyokat, ezert az Android alapertelmezesben engedelyezi az auto-backupot. A bejelentkezesi token titkositatlanul kerul a SharedPreferences-be (auth_service.dart _writeToken, prefs.setString), amit igy a Google felhos mentes es az `adb backup -f out.ab <pkg>` is elment. Egy tamado hozzaferhet a mentett tokenhez es atveheti a fiokot; a hiba akkor jelentkezik, ha a keszulek menteset visszaallitjak vagy USB-debug melletti adb backup keszul rola. Ajanlott az allowBackup=false vagy explicit backup-szabaly, illetve a token titkositott tarolasa (flutter_secure_storage).

<sub>🔧 Technikai részlet: The <application> element (lines 2-5) declares no android:allowBackup="false", nor android:fullBackupContent / android:dataExtractionRules, so Android's default allowBackup=true applies. auth_service.dart:409-412 (_writeToken) stores the bearer token in plaintext via prefs.setString(_tokenKey, token) in SharedPreferences, and plate_settings/api also read the same plaintext key. That SharedPreferences file is therefore captured by Google Auto Backup and by `adb backup`, allowing off-device extraction of a valid session token. This is a real, well-known Android hardening gap for apps that store credentials, though exploitation of adb backup requires USB debugging + physical access and Google cloud backup is transport-encrypted.</sub>

---

### 25. A javasolt edzések (story-strip) címei és izomcsoport-nevei fixen magyarul vannak

**Hol:** [lib/data/predefined_workouts.dart:32](lib/data/predefined_workouts.dart#L32)

A predefined_workouts.dart-ban a story-edzések címei ('Hát + Váll', 'Bicepsz + Hát', stb.) és az izomcsoport-címkék ('Hát', 'Váll', 'Comb', 'Vádli', 'Felsőtest') keményen kódolt magyar szövegek, nincs fordítási kulcsuk. Az alkalmazásnak van i18n rendszere (lib/i18n/app_strings.dart), amelynek alapértelmezett nyelve az angol. Emiatt angol nyelvű felhasználó is magyar címeket lát a story-stripben (workout_stories.dart:114) és a javasolt edzés részletező képernyőjén (predefined_workout_screen.dart:213/220). Nem összeomlás, tisztán lokalizációs/UX hiba, ezért közepes súlyosság.

<sub>🔧 Technikai részlet: The app has an i18n singleton (lib/i18n/app_strings.dart) whose default language is English ('en'). Yet predefined_workouts.dart hardcodes Hungarian title and MuscleGroup label strings ('Hát + Váll', 'Hát', 'Váll', etc.) with no translation key. These render untranslated: workout_stories.dart:114 shows workout.title, and predefined_workout_screen.dart:213/220 show w.title and w.subtitle (joined labels). So an English (default) user sees Hungarian titles in the story strip and detail screen. Bug is real; line 32 is a correct anchor.</sub>

---

### 26. A MainShell csak a screens[_index] widgetet jeleniti meg IndexedStack nelkul, ezert minden alsó menüvaltas eldobja a képernyő állapotát és újratölt a hálózatról

**Hol:** [lib/main.dart:298](lib/main.dart#L298)

A MainShell.build metódus minden build-nél újraépíti az öt képernyő listáját, és csak a screens[_index] elemet rakja a FadeTransition gyerekének, IndexedStack vagy keep-alive nélkül. Mivel fülváltáskor a látható gyerek típusa megváltozik, a Flutter megsemmisíti a kilépő képernyő State-jét és újat hoz létre, így újra lefut az initState. Mind a Progress, Trainings és Hyrox képernyő az initState-ben hívja a _load() hálózati lekérést, ezért minden fülre koppintás teljes újratöltést vált ki és visszaugratja a görgetést a tetejére, betöltő pörgővel. Oda-vissza váltogatva feleslegesen terheli a backendet és megszakítja a folyamatban lévő UI állapotot.

<sub>🔧 Technikai részlet: MainShell.build (lines 288-298) constructs a fresh List of the five screens each build and renders only screens[_index] as the FadeTransition child. Because the child's runtimeType changes on every tab switch (DashboardScreen -> ProgressScreen etc.), Flutter disposes the outgoing screen's State and creates a new one, re-running initState. I confirmed ProgressScreen (initState line 243 -> _load), TrainingsListScreen (line 46 -> _load), and HyroxScreen (line 46 -> _load) all fetch from the API in initState. So each tab switch triggers a full network reload and resets scroll position. An IndexedStack or AutomaticKeepAlive would preserve state. Correct defect anchor is line 298 (child: screens[_index]).</sub>

---

### 27. A backend hibaüzenetei nyersen jelennek meg, kevert nyelvű üzeneteket okozva

**Hol:** [lib/screens/account_screen.dart:146](lib/screens/account_screen.dart#L146)

A képernyő az AuthException.message értékét közvetlenül jeleníti meg (_snack(e.message) a 122., 146. és 193. sorban), az app kétnyelvű app_strings rétegét megkerülve. A backend viszont fix nyelvű üzeneteket ad vissza: a jelszóváltás magyarul ('A jelenlegi jelszó helytelen.', 'Az új jelszó legalább 6 karakter legyen.'), az előfizetési végpontok pedig angolul ('Trial already used', 'Nothing to cancel', 'Invalid plan'). Így egy angol nyelvre állított felhasználó rossz jelenlegi jelszó megadásakor magyar hibaüzenetet lát, egy magyar felhasználó pedig előfizetési hibánál angol szöveget. A hiba a rossz beviteli/állapot eseteknél mindig előjön.

<sub>🔧 Technikai részlet: Backend PATCH /api/auth/me returns hardcoded Hungarian detail strings ('A jelenlegi jelszó helytelen.' at me/route.ts:77, 'Az új jelszó legalább 6 karakter legyen.' at :83), while the subscription routes return hardcoded English ('Trial already used', 'Nothing to cancel', 'Invalid plan'). account_screen.dart shows AuthException.message verbatim via _snack(e.message) at lines 122, 146 and 193, bypassing the app's bilingual app_strings layer. So an EN-locale user typing a wrong current password sees a Hungarian snackbar, and a HU-locale user hitting a subscription error sees English text. Reachable and confirmed against the backend route handlers.</sub>

---

### 28. A _load némán elnyeli a hálózati hibát, így a sikertelen lekérés üres fiókként jelenik meg

**Hol:** [lib/screens/calendar_screen.dart:79](lib/screens/calendar_screen.dart#L79)

A 79. sor catch ága a hibát felhasználói visszajelzés nélkül eldobja, és a _sessions listát üresen (első betöltésnél) vagy elavult állapotban (frissítésnél) hagyja. Első betöltési hiba esetén a képernyő tévesen 0 streaket, '0 EDZÉS' összegzést, 'Még nincs edzés ebben a hónapban' üzenetet és üres hónaprácsot mutat, ami megkülönböztethetetlen egy valóban üres fióktól. Akkor jelentkezik, ha a felhasználó offline állapotban vagy backend kimaradás alatt nyitja meg a Naptár fület, holott hónapok óta naplózott edzései vannak, és nincs hibaállapot vagy újrapróbálás felajánlva.

<sub>🔧 Technikai részlet: The catch block at line 79-81 `catch (_) { if (mounted) setState(() => _loading = false); }` discards the error with no user feedback and leaves _sessions as [] (first load) or stale (refresh). On first-load failure the UI positively asserts wrong facts: streak 0, '0 SESSION' in summary (183), 'No workouts this month yet' (622), an empty month grid — indistinguishable from a genuinely empty account, with no error/retry state.</sub>

---

### 29. Halott feltétel a _dayDetailCard-ban: a jövőbeli napok is 'Pihenőnap' feliratot kapnak

**Hol:** [lib/screens/calendar_screen.dart:546](lib/screens/calendar_screen.dart#L546)

A kód a 523-524. sorban kiszámítja az isPast értéket, de a 546-548. sorban a ternáris kifejezés mindkét ága ugyanazt a 'calendar.rest_day_text' szöveget adja vissza, így a múltbeli és jövőbeli napok megkülönböztetése soha nem valósul meg. Ha a felhasználó a hónaprács jobbra léptető nyilával a jövőbe lapoz és egy következő heti napra koppint, a kártya magabiztosan 'Pihenőnap' feliratot és 'Nincs rögzített edzés ezen a napon' szöveget jelenít meg egy még be sem következett dátumra, tervezett/közelgő nap üzenet helyett.

<sub>🔧 Technikai részlet: Lines 546-548 read `isPast ? t('calendar.rest_day_text') : t('calendar.rest_day_text')` — both branches return the identical 'Rest day' string, so the isPast distinction (computed at 523-524) never affects the output. Any future day tapped in the grid (reachable via the chevron_right pager at 397-406, which does not clamp to the current month) shows 'Rest day'/'Pihenőnap' plus 'No workout recorded on this day', asserting a rest day for a date that has not happened yet.</sub>

---

### 30. Szuro vagy kereses valtasa toltes kozben veglegesen beragasztja a _loadingMore=true allapotot, megbenitva a vegtelen gorgetest

**Hol:** [lib/screens/create_training_screen.dart:183](lib/screens/create_training_screen.dart#L183)

Ha a felhasznalo ugy inditja el a _loadFirstPage-et (kereses gepelese, testresz-chip valtasa vagy mentes), hogy kozben egy kovetkezo-oldal keres (_loadMore) meg fut, a _requestId megno, ezert a keslekedo _loadMore finally-blokkja atugorja a _loadingMore = false visszaallitast. Semmi mas nem allitja vissza, igy a _loadMore orzo feltetele minden tovabbi lapozast blokkol a kepernyo eletere. Az uj bongeszo-oldal _hasMore=true erteke miatt a lista aljan orokke porgo spinner jelenik meg, ujabb oldalak betoltese nelkul, amig a kepernyot be nem csukjak es ujra megnyitjak.

<sub>🔧 Technikai részlet: _loadMore captures reqId = _requestId (line 166, not incremented) and its finally resets the flag only if reqId == _requestId (line 183). If _loadFirstPage runs while a _loadMore is in flight (typing search / tapping a body-part chip via _selectBodyPart / submit), it does ++_requestId (line 121) and never resets _loadingMore, so when the stale _loadMore completes the finally skips the reset and _loadingMore stays true forever. The _loadMore guard (line 165) then returns on every future call, and since browse mode typically has _hasMore=true, _resultsBody keeps rendering the loader row (line 595/599) that spins without loading. No other code resets _loadingMore.</sub>

---

### 31. A sajat gyakorlat felszerelese es megjegyzese eltunik menteskor

**Hol:** [lib/screens/create_training_screen.dart:293](lib/screens/create_training_screen.dart#L293)

Az egyeni gyakorlat urlapja begyujti a felszerelest es a megjegyzest, es a mentes elotti reszletlap mindkettot mutatja, de a _save payloadja csak az exerciseId, name, gifUrl, targetMuscles es sets mezoket kuldi el. A backend IncomingExercise tipusa tamogatja a note mezot (trainings.ts), tehat korbe tudna jarni, megsem kerul elkuldesre; a felszereles pedig egyaltalan nem. A training ujranyitasakor a felhasznalo altal beirt felszereles es megjegyzes veglegesen elveszik.

<sub>🔧 Technikai részlet: _addCustomExercise stores the sheet's equipment into ApiExercise.equipments and note into instructions (lines 253-254), and _ExerciseDetailSheet renders both (_chipsSection for equipments line 785, _instructions line 786). But _save's payload map (lines 293-300) sends only exerciseId, name, gifUrl, targetMuscles and sets — equipments and instructions/note are never serialized. Backend IncomingExercise supports note (apps/web/lib/trainings.ts:27, persisted by mapExercises line 61) so it could round-trip but isn't sent; equipment isn't sent either. After saving, the custom exercise's equipment and note are unrecoverable.</sub>

---

### 32. A sajat gyakorlat szabadszoveges izom-mezoje minden ujrarajzolaskor uj controllert kap, ezert a beirt szoveg eltunik es sosem mentodik

**Hol:** [lib/screens/create_training_screen.dart:1246](lib/screens/create_training_screen.dart#L1246)

Ha az izomlista nem toltodott be (offline / elso inditas), a _muscleDropdown egy szabadszoveges mezot ad vissza, amelynek a controllere kozvetlenul a build()-ben jon letre (TextEditingController(text: _muscle ?? '')). Mivel a lap folyamatosan ujraepul (a GIF-URL mezo listenere minden leutesre setState-et hiv, es a MediaQuery viewInsets a billentyuzet-animacio kozben is rebuildet valt ki), a mezo controllere ures peldanyra cserelodik, es a felhasznalo begepelt izomneve latvanyosan torlodik. Raadasul a mezonek nincs onChanged-je, igy a _muscle vegig null marad, es a mentett gyakorlat izomcimke nelkul jon letre; az eldobott controllerek soha nem dispose-olodnak.

<sub>🔧 Technikai részlet: In _muscleDropdown() the offline fallback (widget.muscles empty) returns _textField(controller: TextEditingController(text: _muscle ?? '')) — the controller is constructed inline, so it is recreated on every build(). Rebuilds are frequent: _gifUrlController has a listener calling setState on every keystroke (line 964) and build() reads MediaQuery viewInsets (line 992) so keyboard-animation frames rebuild too, replacing the field's controller with an empty one and wiping typed text. The _textField passes no onChanged and _muscle is only assigned by the dropdown's onChanged (line 1281), so the typed muscle is never captured; _submit passes targetMuscle: _muscle (still null). The controller is also never disposed. The fallback exists precisely for the offline case and cannot work.</sub>

---

### 33. Sikertelen frissítés törli a megjelenített adatokat (sessionök, edzések, streak, statisztikák nullázódnak)

**Hol:** [lib/screens/dashboard_screen.dart:131](lib/screens/dashboard_screen.dart#L131)

A _loadData üres listákra inicializálja a sessions/trainings változókat, és a hálózati hívások hibáit némán elnyeli (catch(_){}), majd feltétel nélkül setState-tel felülírja a korábban betöltött adatokat az üres eredménnyel. Ha a felhasználó lehúzza a képernyőt frissítéshez, de épp megszakad a kapcsolat, a streak chip 0-ra ugrik, a napjelölők, a heti haladás és az összes statisztika kiürül, és megjelenik az 'új edzés a +-szal' üres állapot. Hibaüzenet nem jelenik meg, így úgy tűnik, mintha az egész előzmény eltűnt volna; egy későbbi sikeres frissítés helyreállítja.

<sub>🔧 Technikai részlet: _loadData initialises sessions/trainings to const [] (lines 111-112) and swallows getSessions/getTrainings failures with catch(_){} (lines 115,118). It then unconditionally setStates those empty lists (lines 130-137), overwriting previously loaded data. On a transient failure during pull-to-refresh, _sessions/_trainings become empty, so streak, day markers, weekly progress, recent list and the stats grid all reset to zero/empty with no error surfaced. The scenario is reachable via RefreshIndicator (onRefresh: _loadData, line 400) after a prior successful load.</sub>

---

### 34. A heti cél a munkameneteket számolja, nem a különálló edzésnapokat

**Hol:** [lib/screens/dashboard_screen.dart:189](lib/screens/dashboard_screen.dart#L189)

A `_weeklyDone` getter az adott heti munkamenetek darabszámát adja vissza (`.length`), miközben a cél (`_weeklyGoal`) a napokban megadott heti edzésszám. A streak.dart `weeklyDoneCount` függvénye és a kezdőképernyő-widget (`HomeWidgetSync.sync`) viszont különálló napokra deduplikál. Ha a felhasználó ugyanazon a napon két munkamenetet zár le (pl. befejezi az edzést, majd a legutóbbiak listájából újra folytatja és befejezi), a dashboard hőse 2/3-ot és 66%-ot mutat, míg a widget és a naptár 1/3-ot ugyanarra az adatra.

<sub>🔧 Technikai részlet: `_weeklyDone` returns `_sessions.where(...).length` — a raw session count for the current Mon–Sun window, with no per-day dedup. In contrast `weeklyDoneCount` in utils/streak.dart and `HomeWidgetSync.sync` (home_widget_sync.dart) both `.map((d)=>DateTime(d.year,d.month,d.day)).toSet().length`. `_dayContent` feeds `_weeklyDone` into both the hero progress bar (`_weeklyDone/_weeklyGoal`) and the 'done/goal' label. Two sessions on the same day (e.g. finishing a workout then re-finishing via `_resumeFromSession`, which posts a new session) advance the hero by 2 while the widget/calendar show 1. Reachable and inconsistent.</sub>

---

### 35. A folytatható edzés kártya felirata bedrótozott magyar 'Félbehagyva' szöveg

**Hol:** [lib/screens/dashboard_screen.dart:310](lib/screens/dashboard_screen.dart#L310)

A folytatható edzések listaelemének felirata inline, i18n kulcs nélkül tartalmazza a 'Félbehagyva' szót, ami nincs benne az app_strings.dart-ban. Mivel az alapértelmezett nyelv az angol, az angol felhasználó a dashboardon 'Félbehagyva · 4/12 set' feliratot lát, miközben a képernyő többi része angol, és a nyelvváltás sem hat rá.

<sub>🔧 Technikai részlet: `subtitle: 'Félbehagyva · ${s.progress.doneCount}/${tr.totalSets} set'` is a hardcoded Hungarian literal; grep confirms no 'Félbehagyva' key exists in app_strings.dart and the default language is 'en' (app_strings.dart:18 `_lang='en'`). Every neighbouring subtitle uses t()/tFmt(). So English (default) users see Hungarian on the continue card, and the string does not flip on the language toggle.</sub>

---

### 36. A havi volumen a be nem fejezett szetteket is beszámítja, túlszámolva a terhelést

**Hol:** [lib/screens/dashboard_screen.dart:568](lib/screens/dashboard_screen.dart#L568)

A _currentMonthVolume az aktuális hónap összes sessionjének minden szettjére összegzi a kg × ismétlés szorzatot, done szűrés nélkül. Mivel a befejezett sessionök a be nem pipált sablon-szetteket is eltárolják (a workout_screen createSession az összes szettet elküldi a valós done állapottal), a be nem fejezett szettek alapértelmezett súlya/ismétlése is beleszámít. Így a kezdőképernyő fejlécében és a statisztikáknál mutatott 'e havi' tonnamennyiség magasabb a ténylegesen elvégzett munkánál, és nem konzisztens a máshol (doneSets) használt done-szűrt logikával.

<sub>🔧 Technikai részlet: _currentMonthVolume (556-568) folds x.kg * x.reps over every set of every session in the current month with no x.done filter. Finished sessions do persist untouched template sets with done:false — createSession in workout_screen.dart:320 sends all sets via _setPayload(s, done:true), and line 233 (if (done) 'done': s.done) stores each set's real done value, so unchecked sets with default kg/reps remain in the session. The model even exposes a done-filtered doneSets getter (api_models.dart:195-196) used elsewhere, confirming the inconsistency. The inflated figure drives the hero headline (_personalHeadline, line 538).</sub>

---

### 37. A 'Megemelt' össztömeg és a havi fejléc a be nem pipált szetteket is beleszámolja

**Hol:** [lib/screens/dashboard_screen.dart:956](lib/screens/dashboard_screen.dart#L956)

A `_stats` totalVolume számítása és a `_currentMonthVolume` a kg×ismétlést minden szettre összegzi `x.done` szűrő nélkül, holott a `SavedSet` hordoz `done` jelzőt és a `doneSets` getter szűr rá. A munkamenetek a be nem pipált (tervezett) szetteket is elmentik. Így ha valaki egy 5×5 fekvenyomást 100 kg-mal csak 1 szett után félbehagy (valós 500 kg), a 'Megemelt' statisztika és a 'X kg ebben a hónapban' fejléc 2500 kg-mal nő 500 helyett.

<sub>🔧 Technikai részlet: In `_stats` the volume fold is `e.sets.fold(0.0,(c,x)=>c+x.kg*x.reps)` with no `x.done` guard (line 956), and `_currentMonthVolume` (line 568) does the same for the monthly headline. api_models.dart confirms `SavedSet` carries `done` and `WorkoutSession.doneSets` filters on it (line 196), and the dashboard itself renders `${s.doneSets}/${s.totalSets}` with doneSets<totalSets possible, so sessions do persist unticked sets with planned kg/reps. recent_pr.dart correctly skips `if(!set.done)`. Thus abandoning a workout after 1 of 5 sets still credits all 5 sets' tonnage to the 'Lifted' stat and the monthly kg headline.</sub>

---

### 38. A `_ListCard` állapotcímkéi bedrótozott magyar szövegek ('Befejezve' / 'Nincs befejezve')

**Hol:** [lib/screens/dashboard_screen.dart:1198](lib/screens/dashboard_screen.dart#L1198)

A `_ListCard` widget a `statusLabel`-t fixen magyarul állítja be i18n nélkül, és ezt minden legutóbbi munkamenet soron megjeleníti. A két szöveg nincs az app_strings.dart-ban. Az alapértelmezetten angol nyelvű felhasználó minden kártya mellett 'Befejezve' vagy 'Nincs befejezve' feliratot lát, és a fiókban a nyelvváltás nem befolyásolja ezeket.

<sub>🔧 Technikai részlet: `final statusLabel = finished ? 'Befejezve' : 'Nincs befejezve';` in `_ListCard.build` is rendered on every recent-session row. grep confirms neither string exists in app_strings.dart and t()/tFmt() is not used; default language is 'en'. English users see Hungarian status labels that never flip with the language toggle. Distinct code/string from finding 23.</sub>

---

### 39. Az utolsó demó szett befejezése felesleges 90 másodperces pihenőidőzítőt indít a kész-képernyő alatt

**Hol:** [lib/screens/demo_workout_screen.dart:55](lib/screens/demo_workout_screen.dart#L55)

A _completeSet feltétel nélkül _resting=true-t állít és elindítja a 90 másodperces időzítőt akkor is, ha az utolsó szettet pipálják ki (nincs _allDone ellenőrzés). Mivel a build a 149. sorban _allDone-tól függetlenül megjeleníti a _restPanel-t, az utolsó szett bejelölése után a 'Készen vagy.' konverziós képernyő alatt egy élő 'PIHENŐ 1:30' panel jelenik meg −10s/+10s/SKIP gombokkal, egy már befejezett edzésre visszaszámlálva. A felhasználó a fő első-benyomás pillanatban zavaros, kettős felületet lát 90 másodpercig, vagy amíg észre nem veszi a SKIP-et.

<sub>🔧 Technikai részlet: _completeSet unconditionally sets _resting=true and _restSeconds=90 and starts the periodic timer (lines 54-59) even when the completed set is the last one; it never checks _allDone. The build method renders the completion view in the Expanded (_allDone ? _completionView()) while separately showing `if (_resting) _restPanel()` (line 149) in the outer Column regardless of _allDone. So after ticking the 4th set, 'Készen vagy.' plus the save CTA appear with a live 'PIHENŐ 1:30' panel (−10s/+10s/SKIP) pinned beneath for up to 90s or until SKIP. Reachable on the normal completion path.</sub>

---

### 40. A bemutató edzés képernyő fixen magyar, miközben az app alapértelmezett nyelve angol

**Hol:** [lib/screens/demo_workout_screen.dart:108](lib/screens/demo_workout_screen.dart#L108)

A demo_workout_screen.dart minden szövege beégetett magyar string, a fájl nem importálja az app_strings.dart-ot és sehol nem hív t()/AppStrings-et. Az AppStrings alapértelmezett nyelve 'en' (app_strings.dart:18), így egy angol nyelvű, még nem regisztrált érdeklődő a demót teljesen magyarul kapja, beleértve a 'Mentsd a haladásod' konverziós gombot is. A képernyő az onboardingból (onboarding_screen.dart:663) elérhető. Megjegyzés: a belépési CTA valójában nem az angol welcome.try_demo, hanem szintén beégetett magyar link, és az egész onboarding folyamat magyar nyelvű — de az itt jelentett hiba valós.

<sub>🔧 Technikai részlet: Every visible string in demo_workout_screen.dart is a hardcoded Hungarian literal ('BEMUTATÓ' l108, 'Mell · Triceps · Elülső deltoid' l128, disclaimer l138, 'PIHENŐ' l292, 'Készen vagy.' l361, pitch l371, 'Mentsd a haladásod' l388, 'Vissza a tervhez' l405); app_strings.dart is not imported and no t()/AppStrings call exists. AppStrings default _lang is 'en' (app_strings.dart:18), so an English-default user sees Hungarian. Reachable: onboarding_screen.dart:663 pushes this screen. Note the reviewer's framing is partly wrong — the entry CTA is not the English welcome.try_demo but a hardcoded-Hungarian onboarding link ('Próbálj egy szettet előbb →', onboarding_screen.dart:644), and the entire onboarding flow is likewise Hungarian-only — but the reported i18n defect on this file is genuinely present.</sub>

---

### 41. A teljes HYROX kepernyo bedrotozott magyar szovegeket hasznal, megkerulve az i18n rendszert, amelynek alapertelmezett nyelve az angol

**Hol:** [lib/screens/hyrox_screen.dart:12](lib/screens/hyrox_screen.dart#L12)

A kepernyo egyaltalan nem importalja a lib/i18n/app_strings.dart-ot, es mindenhol magyar string-literalokat hasznal: divizio-cimkek (12-15), fazisnevek (19-22), _load hibauzenet (74), snackbarok (90, 101, 159), parbeszedek (113-147), fejlec (262), torles tooltip (271), '{n}. het' (287), nap-alcim (362) es a teljes _EmptyState szoveg (410-482). Mivel az AppStrings alapertelmezetten angol (app_strings.dart:18) es a t()-n keresztul mukodne, egy angol nyelvre allitott felhasznalo az egesz HYROX fulet magyarul latja, mig az app tobbi resze angol.

<sub>🔧 Technikai részlet: The screen imports none of lib/i18n/app_strings.dart and hardcodes Hungarian throughout: division labels (12-15), phase names (19-22), _load error (74), snackbars (90, 101, 159), dialogs (113-147), header (262), delete tooltip (271), '{n}. het' (287), day subtitle (362), and the entire _EmptyState copy (410-482). AppStrings defaults to 'en' (app_strings.dart:18) and exposes t(); none of these strings resolve through it, so English users see the whole tab in Hungarian.</sub>

---

### 42. A _load() elso setState-je nincs mounted-ellenorzessel vedve, ezert tab-valtaskor 'setState after dispose' hibat es hamis 'letrehozas sikertelen' uzenetet okoz

**Hol:** [lib/screens/hyrox_screen.dart:58](lib/screens/hyrox_screen.dart#L58)

A _load() az elso setState-jet (58-61. sor) mounted-ellenorzes nelkul hivja, es ezt a fuggvenyt a _createPlan (94. sor) es a _deletePlan (155. sor) is meghivja halozati keres utan. Mivel a MainShell kozvetlenul a screens[_index]-et rendereli (nem IndexedStack), a HYROX kepernyo eldobodik, ha a felhasznalo kozben masik fulre valt. Amikor a POST/DELETE visszater, a _load setState-je mar eldobott allapoton fut es kivetelt dob; a _createPlan try-blokkjaban ez a catch(_)-be esik, es a felhasznalo a sikeres letrehozas ellenere a 'Nem sikerult letrehozni a tervet.' uzenetet latja.

<sub>🔧 Technikai részlet: _load() opens with an unguarded setState (lines 58-61). It is awaited post-network in _createPlan (line 94) and _deletePlan (line 155). main.dart renders screens[_index] directly (line 298), not an IndexedStack, so switching tabs disposes _HyroxScreenState. When createHyroxPlan/deleteHyroxPlan returns, _load's first setState runs on a defunct State and throws. In _createPlan this throw occurs inside the try after success, so the generic catch (_) at line 99 fires the 'Nem sikerült létrehozni a tervet.' snackbar even though the plan was created. The initState and _openDay paths are guarded, but the create/delete paths are not.</sub>

---

### 43. Sikertelen terv-lekeres a terv-letrehozo ures allapotot mutatja hibauzenet/ujraprobalas helyett, kiteve a meglevo tervvel rendelkezo felhasznalot a romboló csere-folyamatnak

**Hol:** [lib/screens/hyrox_screen.dart:208](lib/screens/hyrox_screen.dart#L208)

A build() csak a _plan.isEmpty alapjan dont az _EmptyState mellett (208. sor), ezert ha a getTrainings hibat dob (offline, 500), a _plan ures marad es a felhasznalo a 'hozd letre a terved' marketing-kepernyot latja az aktiv 'Terv letrehozasa' gombbal, a hiba csak egy kis piros sorkent jelenik meg, ujraprobalas gomb nelkul. Ha egy mar meglevo tervvel rendelkezo felhasznalo ilyenkor a gombra kattint, a backend 409-et ad, megjelenik a 'Mar van HYROX terved' parbeszed, es a 'Csere' megnyomasa toroli a teljes tervet es a benne rögzitett haladast.

<sub>🔧 Technikai részlet: build() picks _EmptyState solely on _plan.isEmpty (line 208). On a failed getTrainings, _load sets _error but leaves _plan empty, so a user who already has a plan sees the create-plan pitch with an active 'Terv letrehozasa' button; _error is only a small red line (lines 448-453) and there is no retry action distinct from creation. Tapping create on reconnect triggers the 409 -> _confirmReplace dialog, whose 'Csere' calls _createPlan(replace:true), wiping the existing plan and its doneAt progress. Reachable whenever the GET fails for a user with a plan; the destructive step does require confirming a warning dialog.</sub>

---

### 44. A ranglista képernyő beégetett magyar szövegeket használ a t() i18n rendszer helyett

**Hol:** [lib/screens/leaderboard_screen.dart:17](lib/screens/leaderboard_screen.dart#L17)

A leaderboard_screen.dart nem importálja az app_strings.dart-ot és nem használ t()-t; minden felhasználói szöveg beégetett magyar: scope-címkék 'ORSZÁG'/'SZINT'/'HÉT' (17-21), 'RANGLISTA' cím (184), betöltési hiba (138), üres állapot üzenetek (279-280), '(TE)' (516) és 'TE A LISTÁN' (573). Az AppStrings singleton alapértelmezése angol ('en'), és a többi képernyő t()-vel oldja fel a szövegeket. Az angol nyelvet használó (alapértelmezett) felhasználó teljesen magyar ranglistát lát.

<sub>🔧 Technikai részlet: app_strings.dart defaults _lang='en' and other screens (e.g. account_screen) use t(); leaderboard_screen.dart imports no i18n module and hardcodes Hungarian for all user-facing text. Confirmed.</sub>

---

### 45. A scope-váltás nem szakítja meg / nem őrzi a folyamatban lévő kéréseket, így egy elavult válasz felülírhatja az új fül listáját

**Hol:** [lib/screens/leaderboard_screen.dart:101](lib/screens/leaderboard_screen.dart#L101)

A _switchScope alaphelyzetbe állítja az állapotot és új _loadInitial-t indít, de sem a _loadInitial, sem a _loadMore nem jegyzi fel, melyik scope indította a kérést, és a _loadingMore sincs visszaállítva váltáskor. Ha a régi scope _loadInitial válasza az új után érkezik, a setState felülírja az _entries/_own/_hasMore/_page mezőket a rossz scope adataival; ha egy _loadMore van folyamatban váltáskor, a `_entries.addAll(more)` a régi scope sorait fűzi az új listához és elrontja a _page értéket. A felhasználó lassú hálózaton fült váltva idegen adatokat/pozíciókat láthat a listában.

<sub>🔧 Technikai részlet: The code captures scope/page at call time but has no request-generation token or scope check in the setState callbacks, and _switchScope does not reset _loadingMore. Both the _loadInitial overwrite race and the _loadMore append race are real in the source. Confirmed as a latent concurrency defect (currently also masked by finding 94).</sub>

---

### 46. Valos fiok belepesi adatai (email + jelszo) forraskodban a debug TEST gombban

**Hol:** [lib/screens/login_screen.dart:183](lib/screens/login_screen.dart#L183)

A login_screen.dart 183-184. soraban egy valosnak tuno fiok emailje es sima szoveges jelszava (tamas@blcks.io / Hdf697123) be van egetve a debug-only TEST gomb kodjaba. Bar a gomb csak kDebugMode eseten jelenik meg es a release buildbol kimarad, a hitelesito adatpar bekerult a verziokezelobe, igy barki, akinek hozzaferese van a repohoz, CI logokhoz vagy egy debug binarishoz, egy mukodo bejelentkezesi adatparhoz jut a produkcios backendhez. A felhasznalo ezt nem latja, de biztonsagi kockazat a fiokra nezve.

<sub>🔧 Technikai részlet: Lines 183-184 hardcode a real-looking account credential (_email.text = 'tamas@blcks.io'; _password.text = 'Hdf697123';). Although wrapped in `if (kDebugMode)` (line 166) so it is stripped from release builds, the plaintext email/password pair is committed to source, exposed to anyone with repo access, CI artifacts, and every debug binary. If reused, it is a live credential leak against the production backend.</sub>

---

### 47. Az Apple bejelentkezés minden hibakódot 'felhasználó megszakította'-ként nyel el, így valódi hibáknál sincs semmilyen visszajelzés

**Hol:** [lib/screens/oauth_buttons.dart:64](lib/screens/oauth_buttons.dart#L64)

A 64. sori `on SignInWithAppleAuthorizationException` ág az összes hibakódot elkapja, nem csak a .canceled (megszakítás) esetét, és sosem vizsgálja az e.code értéket. Emiatt a valódi hibák (.failed, .unknown – pl. hiányzó entitlement, rosszul beállított Services ID vagy átmeneti Apple-hiba) csendben elvesznek. A felhasználó megnyomja a 'Folytatás Apple-lel' gombot, semmi nem történik, semmilyen hibaüzenet nem jelenik meg, és egy halottnak tűnő gombot próbálgat. Javasolt: csak `e.code == AuthorizationErrorCode.canceled` esetén elnyelni, a többit a _showError-ral megjeleníteni.

<sub>🔧 Technikai részlet: The catch `on SignInWithAppleAuthorizationException { // User cancelled }` at line 64 matches every AuthorizationErrorCode the plugin throws, not only .canceled. It never inspects e.code, so .failed/.invalidResponse/.notHandled/.unknown (misconfigured Services ID, missing entitlement, transient Apple failure) are all silently discarded and no snackbar is shown. Contrast with the Google path which has no such swallowing catch. Genuine Apple failures produce zero feedback.</sub>

---

### 48. Az OAuth gombok, elválasztó és hibaüzenetek fixen magyarul vannak, holott már léteznek fordítási kulcsok

**Hol:** [lib/screens/oauth_buttons.dart:122](lib/screens/oauth_buttons.dart#L122)

A 'Folytatás Apple-lel' (122), 'Folytatás Google-lel' (131), a 'vagy' elválasztó (145) és a hibaszövegek (47, 67, 84, 96) mind bedrótozott magyar sztringek, a widget sehol nem hívja a t() függvényt. A app_strings.dart 277-284. soraiban viszont léteznek az auth.continue_with_apple, auth.continue_with_google és auth.or kulcsok, és az alkalmazás máshol (login/register/account képernyők) következetesen t()-t használ. Mivel az app alapértelmezett nyelve angol, minden új felhasználó magyarul látja a bejelentkező képernyő két legfeltűnőbb gombját és a hibaüzeneteket.

<sub>🔧 Technikai részlet: The button labels 'Folytatás Apple-lel' (122), 'Folytatás Google-lel' (131), the 'vagy' divider (145) and the error strings on lines 47, 67, 84, 96 are hardcoded Hungarian. The i18n keys auth.continue_with_apple, auth.continue_with_google and auth.or exist in app_strings.dart (lines 277-284), and t() is used pervasively across register_screen/login_screen/account_screen. This widget never calls t(). With English as the default locale these Hungarian strings show on the first login/register screen.</sub>

---

### 49. Kétszeri koppintás egy egyválasztós opción két időzített _next() hívást indít, átugorva egy onboarding lépést

**Hol:** [lib/screens/onboarding_screen.dart:54](lib/screens/onboarding_screen.dart#L54)

Az _autoAdvance() 320 ms késleltetéssel hívja a _next()-et, de nincs védelem több függőben lévő továbblépés ellen (nincs flag, timer-törlés vagy _step-ellenőrzés). Ha a felhasználó a 'Mi a célod?' képernyőn 320 ms-en belül kétszer koppint (dupla koppintás vagy választás módosítása), két időzített hívás is lefut, mindkettő lépteti a _step-et, így a folyamat átugorja a 'Mennyi a tapasztalatod?' lépést. Az experience null marad, a heti volumen a rossz (intermediate) alapértékkel számolódik, és a felhasználó anélkül kerül tovább, hogy a kihagyott kérdésre válaszolt volna.

<sub>🔧 Technikai részlet: _autoAdvance() (line 54) schedules Future.delayed(320ms, () { if (mounted) _next(); }) with no pending-advance flag, no timer cancellation, and no check that _step is unchanged. Every goal/experience option tap (lines 281-307, 322-348) calls setState + _autoAdvance. Two taps inside 320ms (double-tap or changing selection) schedule two callbacks, each incrementing _step, so the flow jumps two steps and silently skips the intervening question. _next() only increments and never re-checks a canContinue gate, so experience/gender/cardio can remain null.</sub>

---

### 50. Az optimalVolume csak egyszer számolódik ki (==0 feltétellel), így visszalépve és a válaszokat módosítva elavult ajánlás marad a képernyőn

**Hol:** [lib/screens/onboarding_screen.dart:570](lib/screens/onboarding_screen.dart#L570)

A _volumeRevealStep() csak akkor számolja ki a heti optimális volument, ha az még 0 (570. sor). Mivel az optimalWeeklyVolume 8..22 közé vág és a kézi hangoló 6-nál padlóz, az érték az első megjelenítés után soha nem lesz újra 0, ezért nem számolódik újra. Ha a felhasználó visszalép a tapasztalat/cél/cardio válaszokat módosítani, majd újra előrelép, a fejlécen a régi válaszokból számolt szám marad, és ugyanez az elavult érték kerül mentésre a fiókhoz – ellentmondva a ténylegesen tárolt válaszoknak.

<sub>🔧 Technikai részlet: _volumeRevealStep() computes _data.optimalVolume = optimalWeeklyVolume(_data) only inside an `if (_data.optimalVolume == 0)` guard (line 570). optimalWeeklyVolume clamps to 8..22 and the manual tuner floors at 6 (line 616), so once shown the value is never 0 again and is never recomputed. Navigating back (via _back / PopScope) to change experience, goal or cardio and returning still shows and saves the stale value. _next()'s save path (line 37) has the identical ==0 guard, so the stale number is persisted to PATCH /api/me/onboarding.</sub>

---

### 51. A jelszóerősség címkéi fixen magyarul vannak, nincs i18n

**Hol:** [lib/screens/password_strength.dart:40](lib/screens/password_strength.dart#L40)

A passwordStrengthLabel() függvény (37-52. sor) fixen magyar szövegeket ad vissza ('Túl rövid', 'Gyenge', 'Közepes', 'Erős', 'Kiváló'), a fájl nem importálja az app_strings.dart-ot és nem használja a t() fordítófüggvényt. Az app alapértelmezett nyelve angol (app_strings.dart 18. sor), és ezek a címkék nem is szerepelnek a fordítási szótárban. A mérő a regisztrációs (register_screen.dart:156) és a jelszó-visszaállító (reset_password_screen.dart:171) képernyőn jelenik meg, így angol nyelvű felhasználó a jelszó beírásakor a mérő alatt magyar szöveget lát (pl. 'Közepes', 'Erős') az angol mezőcímkék mellett.

<sub>🔧 Technikai részlet: passwordStrengthLabel() (lines 37-52) returns fixed Hungarian strings ('Túl rövid', 'Gyenge', 'Közepes', 'Erős', 'Kiváló'). The file does not import app_strings.dart nor use t(); none of these labels exist as keys in the i18n dictionary. AppStrings defaults to 'en' (app_strings.dart line 18). The meter renders the label at password_strength.dart line 83 and is embedded on register_screen.dart:156 and reset_password_screen.dart:171, so an English-locale user sees Hungarian strength text below the meter. Confirmed mixed-language UX defect.</sub>

---

### 52. A gyakorlat-keverés a lista hosszával van seedelve, így determinisztikus – mindig ugyanaz a 4 gyakorlat

**Hol:** [lib/screens/predefined_workout_screen.dart:73](lib/screens/predefined_workout_screen.dart#L73)

A 73. sorban a `shuffle(Random(page.items.length))` a véletlengenerátort a visszakapott gyakorlatok számával seedeli. Mivel a katalógus API stabil sorrendben adja vissza az elemeket és a kérés limitje 16, a seed gyakorlatilag mindig ugyanaz, ezért a keverés minden megnyitáskor, minden újrapróbálkozáskor és minden felhasználónál ugyanazt a permutációt adja. A felhasználó így mindig ugyanazt a 4 gyakorlatot kapja csoportonként, holott a képernyő 'élőben generált' edzésként mutatja be. A tényleges változatossághoz seed nélküli Random() kellene.

<sub>🔧 Technikai részlet: `[...page.items]..shuffle(Random(page.items.length))` seeds the RNG from the item count. The backing list order from the catalogue API is stable, so a fixed seed yields the same permutation on every load. Even if a group returns fewer than 16 items, the seed is stable per group, so `.take(_perGroup)` always yields the same 4 exercises for that group across opens, retries, and users. The shuffle never introduces the fresh variety the class doc implies; an unseeded Random() would be required.</sub>

---

### 53. Az ajánlott-edzés képernyő chrome-ja beégetett magyar, megkerüli az i18n réteget

**Hol:** [lib/screens/predefined_workout_screen.dart:173](lib/screens/predefined_workout_screen.dart#L173)

Az alkalmazás alapértelmezett nyelve angol (AppStrings._lang = 'en'), és maga a fájl is használ t()/tFmt() hívásokat (128-143. sor), tehát az i18n réteg elérhető. Ennek ellenére az app-bar cím 'Ajánlott edzés' (173), a katalógus-hiba (84), a mentési hiba (115), az 'Újra' gomb (202) – noha a common.retry kulcs létezik –, a '… gyakorlat' felirat (220) és a 'Hozzáadás az edzéseimhez' CTA (335) mind beégetett magyar szöveg. Angol nyelvre állított felhasználó a story-csíkból megnyitva teljesen magyar képernyőt lát ebben az alapfolyamatban.

<sub>🔧 Technikai részlet: AppStrings._lang defaults to 'en' and the file itself already uses t()/tFmt() for the free-tier dialog (lines 128-143), proving the i18n layer is wired in. Yet the app-bar title 'Ajánlott edzés' (173), catalogue error (84), save error (115), 'Újra' retry (202) — despite common.retry existing with an 'en':'Retry' value — the '… gyakorlat' subtitle (220), and the 'Hozzáadás az edzéseimhez' CTA (335) are all hardcoded Hungarian. English users see this core flow entirely in Hungarian.</sub>

---

### 54. A _sessionVolume a be nem pipált sorozatokat is beleszámolja, felfújva a 'MEGEMELT' összeget a fejlécben, a statisztika-hero értékben és a sor-alcímekben

**Hol:** [lib/screens/progress_screen.dart:44](lib/screens/progress_screen.dart#L44)

A _sessionVolume (44-45. sor) done-szűrés nélkül összegzi a kg*reps értéket az összes sorozatra, és ez táplálja a fejléc alcímét (336. sor), a tartomány szerinti statisztika-hero 'MEGEMELT' értékét (115. sor) és minden előzmény-sor volumenét (674. sor). Mivel a be nem fejezett sorozatok is elmentődnek, egy nem teljesen kipipált edzés több megemelt tonnát mutat a valósnál. A hiba különálló a 46-os leletétől (más függvény, más felület), külön javítást igényel.

<sub>🔧 Technikai részlet: _sessionVolume (lines 44-45) sums kg*reps over every set with no s.done filter. It feeds the header subtitle (line 336 via totalVolume), the range stat hero (line 445 -> _StatBucket.fromSessions line 115), and each history row subtitle (line 674). Because undone planned sets are persisted (workout_screen.dart line 320), any workout finished before all sets are ticked reports inflated lifted volume. Distinct code and surface from finding 46 (which is _metricValue), so not a duplicate; both would need separate fixes.</sub>

---

### 55. A grafikon-metrikák (1RM, max súly, volumen, összes ismétlés) a be nem pipált (done==false) és 0 ismétléses sorozatokat is beleszámolják

**Hol:** [lib/screens/progress_screen.dart:195](lib/screens/progress_screen.dart#L195)

A _metricValue függvény (195-208. sor) minden mentett sorozaton végigmegy done- és reps>0-szűrés nélkül, így a be nem pipált, de eltervezett súlyú sorozatok is bekerülnek a számításba. A mentéskor (workout_screen.dart 320. sor) minden tervezett sorozat elmentődik a valódi done állapotával, ezért egy részben teljesített edzés tartalmaz done==false sorozatokat is. Ez ellentmond a PR-logikának (recent_pr.dart 100-104. sor), amely kiszűri ezeket. A felhasználó az Edzés-fül 'utolsó kg' értékében és a gyakorlat-grafikon aktuális/trend értékeiben olyan súlyt lát, amit sosem emelt meg.

<sub>🔧 Technikai részlet: _metricValue (lines 195-208) folds over every SavedSet with no s.done or s.reps>0 guard, for Max Weight/Volume/1RM/Total Reps. The save path persists all planned sets, each with its real done flag (workout_screen.dart line 320 -> _setPayload line 233 emits 'done': s.done), so partially completed sessions contain done==false sets carrying their planned kg/reps. This contradicts the PR logic in recent_pr.dart lines 100-104 which skips !set.done || set.reps<=0. The exercise-tab 'latest' value (line 714) and the ExerciseProgressScreen chart/hero/trend (lines 846-849) therefore include weight the user never lifted; the Epley branch even yields kg for a 0-rep set. Reachable via any workout finished with unchecked sets.</sub>

---

### 56. A SessionDetailScreen a HYROX táv/idő állomásokat 'BW'-ként és '0 ism'-ként jeleníti meg, mert figyelmen kívül hagyja a distanceM és seconds mezőket

**Hol:** [lib/screens/progress_screen.dart:1139](lib/screens/progress_screen.dart#L1139)

A SavedSet tárolja a HYROX távolság/idő mezőket (distanceM, seconds), és a mentés meg is őrzi őket, de az _exerciseBlock (1139. és 1146. sor) csak a kg és reps mezőket olvassa. Egy táv- vagy idő-állomásnál kg==0 és reps==0, így a sor 'BW · 0 ism'-ként jelenik meg, a megtett méter vagy a mért idő nélkül. Amikor a felhasználó egy HYROX edzést nyit meg az Előzményekből, a HYROX állomások haszontalanul, adat nélkül jelennek meg; a 'BW' felirat ráadásul lefordítatlan angol szöveg a magyar felületen.

<sub>🔧 Technikai részlet: SavedSet carries distanceM/seconds (api_models.dart 210-211), persisted by _setPayload (workout_screen.dart 234-235) and parsed back (223-230). _exerciseBlock renders each set as s.kg>0 ? kg : 'BW' (line 1139) plus '${s.reps} reps' (line 1146), never reading distanceM/seconds. A distance/time HYROX station has kg==0 and reps==0, so it shows 'BW' + '0 reps' with no distance or time. HYROX sessions reach this screen via the same /api/sessions store that _load fetches. 'BW' is also a hardcoded untranslated English string.</sub>

---

### 57. Bedrótozott magyar (és angol) feliratok kikerülik az i18n réteget az edzéslistán

**Hol:** [lib/screens/trainings_list_screen.dart:359](lib/screens/trainings_list_screen.dart#L359)

Több felhasználónak megjelenő szöveg nem a t()/tFmt() fordítófüggvényt használja, holott a képernyő többi része lokalizált: a 'FOLYTATHATÓ EDZÉS' szekciócím (359. sor), a 'Félbehagyva · $done/$total szett kész' alszöveg (415. sor), a nyelvileg kevert '${t.exercises.length} gyakorlat · ${t.totalSets} set' (671. sor), a 'MUTASD · $label' visszaállító chip (860. sor) és a mindig magyar tizedesvessző a _fmtVolume-ban (238. sor). Fordítva a hálózati hibaüzenet 'Could not reach the server. Is it running?' (111. sor) fixen angol. Mivel az app alapértelmezetten angol, egy visszatérő angol nyelvű felhasználó a képernyő tetején magyarul látja a folytatható-edzés kártyát, míg egy magyar felhasználó szerverhiba esetén angol üzenetet kap.

<sub>🔧 Technikai részlet: Verified in source: line 359 'FOLYTATHATÓ EDZÉS', line 415 'Félbehagyva · $done/$total szett kész', line 671 mixed 'gyakorlat · ... set', line 860 'MUTASD · $label', line 238 replaceAll('.', ',') hard-codes a Hungarian decimal comma, and line 111 hard-codes the English 'Could not reach the server. Is it running?'. All bypass the t()/tFmt() layer used everywhere else on the screen (e.g. lines 299, 455, 466). Genuine i18n defect.</sub>

---

### 58. A pihenő visszaszámláló Timer.periodic-alapú, ezért háttérben megáll és a pihenő-letelt riasztás késve szól

**Hol:** [lib/screens/workout_screen.dart:77](lib/screens/workout_screen.dart#L77)

A pihenő időzítő a _restRemaining-t másodpercenként egy periodikus tick-kel csökkenti (77-83), fali óra horgony nélkül — szemben az eltelt-idő órával, amelyet szándékosan tárolt időbélyegből számol, hogy ne csússzon. Amikor a felhasználó pihenő közben lezárja a telefont vagy appot vált, a Dart időzítők leállnak, és a kihagyott tickek összevonódnak, így a visszaszámláló nagyjából ott folytatódik, ahol megállt. Ezért a felhasználó 90 mp helyett akár közel 3 percet pihen, és a rezgés/riasztás jóval a valós pihenő vége után szólal meg.

<sub>🔧 Technikai részlet: The rest countdown decrements _restRemaining once per periodic tick (77-83) with no wall-clock anchor, unlike the elapsed clock which is derived from _sittingStart/_bankedElapsed (62-63) precisely so it can't drift. When the app is suspended (screen locked / app switched during a rest — the normal case) Dart timers stop firing and missed ticks are coalesced, so the countdown resumes roughly where it paused instead of accounting for real elapsed time. The 'Pihenő letelt' alert and haptics therefore fire late.</sub>

---

### 59. Az élő edzés képernyő végig fixen magyar (elszórt angollal), megkerülve az app angol-alapértelmezésű i18n rendszerét

**Hol:** [lib/screens/workout_screen.dart:572](lib/screens/workout_screen.dart#L572)

Az app kétnyelvű a lib/i18n/app_strings.dart révén (alapértelmezett nyelv 'en'), és a legtöbb képernyő importálja azt, de a workout_screen.dart nem importálja, és az összes felhasználói szöveget fixen magyarul kódolja (menük 572-583, pihenő dialógus 442-464, progresszió címkék 669-673, oszlopfejlécek 183-192, YouTube gomb 1053 stb.). Eközben a 'How to' (966) és az alapértelmezett 'REPS'/'KG' fejléc (194) angol, így a képernyő kevert nyelvű. Egy angolul beállított felhasználó a fő edzés-lejátszót nem tudja elolvasni, és a nyelvváltás sincs hatással erre a képernyőre.

<sub>🔧 Technikai részlet: The app is bilingual via lib/i18n/app_strings.dart (default language 'en' per its own comment) and most screens import it, but workout_screen.dart does not import app_strings (imports 1-16) and hardcodes user-facing text in Hungarian: menu items (572-583), rest dialog (442-464), 'Pihenőidő' (489), progression labels (669-673), column headers (183-192), 'Megnézés YouTube-on' (1053), 'Nincs több gyakorlat'/'Kilépés' (1135-1148), 'Javasolt:' (1164). Meanwhile 'How to' (966) and default 'REPS'/'KG' (194) are English, so the screen is mixed-language regardless of the language setting.</sub>

---

### 60. HYROX állomás cseréjekor némán elveszik a metric, stationKey és note, elrontva és tartósan megrongálva az állomás megjelenítését

**Hol:** [lib/screens/workout_screen.dart:711](lib/screens/workout_screen.dart#L711)

A _changeExercise az új Exercise-t úgy építi újra (711-719), hogy nem adja át az opcionális metric, stationKey és note mezőket, így azok null-ra váltanak. Egy HYROX állomásnál (pl. distance, time, pace) a szett sorok azonnal átváltanak klasszikus ISM/KG kitöltésre 0-t mutatva, a célterhelés és a coaching megjegyzés eltűnik. A 600 ms-os debounce után a _save null metric/stationKey/note értékekkel PATCH-eli az edzést, így az állomás a backenden is tartósan sérült marad. A 'Csere' menüpont az állomásokra is elérhető, semmi nem gátolja meg.

<sub>🔧 Technikai részlet: _changeExercise rebuilds the Exercise (711-719) passing only name/variant/exerciseId/gifUrl/targetMuscles/progressionStrategy/sets; the optional metric, stationKey and note (defined in workout.dart 35-38, defaulting null) are omitted so they become null. For a HYROX station the rows re-render as classic reps/kg (_SetRow keys off metric), and _save persists metric:null/stationKey:null/note:null (257-259), permanently degrading the station on the backend. 'Csere' is offered for station exercises too (menu 602, action button 984), so nothing prevents it.</sub>

---

### 61. A _SetRow null-check hibával összeomlik minden ismeretlen metrika-értéknél

**Hol:** [lib/screens/workout_screen.dart:1317](lib/screens/workout_screen.dart#L1317)

Az initState csak a hat ismert metrikára hoz létre kontrollert; 'time' és minden ismeretlen érték esetén a _primary null marad. A _stationSlots else ága (1317) viszont _primary!-t dereferál minden nem-strength metrikánál, ami nem 'time' és nem 'reps_weight'. Mivel a metric közvetlenül a nem validált backend JSON-ból jön (json['metric'] as String?), egy új szerveroldali érték (pl. 'calories') vagy elgépelt/eltérő kis-nagybetűs érték (pl. 'Distance') 'Null check operator used on a null value' hibát dob és pirosra váltja a gyakorlat oldalát, ahelyett hogy szépen elfajulna.

<sub>🔧 Technikai részlet: In _SetRowState.initState _primary is created only for 'reps_weight','distance','distance_weight','pace' (1223-1232); for 'time' and any unknown metric nothing is created. For a non-strength metric that is neither 'time' nor 'reps_weight', _stationSlots falls into the else branch (1314-1325) and dereferences _primary! at line 1317 → null-check crash. metric comes straight from unvalidated backend JSON (api_models.dart:159 `json['metric'] as String?`), so a new server-side value like 'calories' or a casing typo like 'Distance' triggers 'Null check operator used on a null value' and red-screens the exercise page. Reachable if backend emits an unexpected metric.</sub>

---

### 62. Az összesítő a soha nem teljesített szettekből is számol fejlődést és ismétlést

**Hol:** [lib/screens/workout_summary_screen.dart:25](lib/screens/workout_summary_screen.dart#L25)

A _best1rm (25. sor) és a _totalReps (110-111. sor) minden szetten végigmegy anélkül, hogy a SavedSet.done mezőt vizsgálná, pedig a szettek a done flaggel együtt kerülnek elküldésre (workout_screen 320. sor) és a nem kipipált szettek is bekerülnek a session-be. A backend PR-detektálása szándékosan kihagyja a be nem fejezett szetteket (route.ts 209/223. sor). Így ha a felhasználó egy nagyobb súlyú szettet betervez de nem teljesít, az összesítő ebből számol e1RM-et és hamis zöld '+X %' nyilat mutat, a Reps statisztika pedig a meg nem csinált ismétléseket is beleszámolja.

<sub>🔧 Technikai részlet: _best1rm (line 25) folds over every set with max(a, s.kg*(1+s.reps/30)) and _totalReps (lines 110-111) sums every set's reps, neither checking SavedSet.done (the flag exists, api_models.dart line 208). workout_screen posts ALL sets including undone ones (line 320 _setPayload(done:true)), and the summary uses the returned session, so undone sets flow in. The backend's own PR detection deliberately skips undone sets (route.ts lines 209/223), proving the intended semantics; the summary contradicts it, showing gains and reps for weight never lifted.</sub>

---

### 63. Az összesítő képernyő keveri az angol és magyar szövegeket és megkerüli az i18n rendszert

**Hol:** [lib/screens/workout_summary_screen.dart:173](lib/screens/workout_summary_screen.dart#L173)

A fájl nem importálja az i18n/app_strings.dart-ot, pedig az már tartalmazza a common.sets/set/reps és month.1..12 kulcsokat mindkét nyelven. A 'Duration/Sets/Reps' feliratok (173-176. sor) és a '3 set' alcím (212. sor) fixen angolok, miközben a dátum magyar hónaprövidítést használ (11-12. sor) és a cím tartaléka 'Edzés' (160. sor). Emiatt egy magyar felhasználó magyar dátum alatt angol feliratokat lát, egy angol felhasználó pedig magyar hónapneveket és 'Edzés' címet – a képernyő minden nyelven félig fordított.

<sub>🔧 Technikai részlet: The file never imports i18n/app_strings.dart. Stat labels 'Duration'/'Sets'/'Reps' (lines 173-176) and '${ex.sets.length} set' (line 212) are hardcoded English, while month abbreviations are Hungarian (lines 11-12, _fmtDate line 15) and the fallback title is 'Edzés' (line 160). app_strings.dart already defines common.sets/common.set/common.reps and month.1..12 with both en/hu values, so the screen is half-translated for every user regardless of language.</sub>

---

### 64. Egyik Api HTTP-hivas sem allit be timeout-ot, igy egy megakadt kapcsolat orokre fuggoben hagyja a kerest

**Hol:** [lib/services/api.dart:90](lib/services/api.dart#L90)

Az Api osztaly minden halozati hivasa (_get a 90. soron, createTraining, updateTraining, createSession, createHyroxPlan, deleteHyroxPlan, deleteTraining es getProgressionSuggestions) a nyers http.Client-en keresztul megy, .timeout(...) nelkul, mikozben az AuthService es az ExerciseApi minden hivasa idokorlatot hasznal. Egy elveszett vagy fel-nyitott TCP-kapcsolat eseten (mobilhalozat-valtas, hatterbe kuldes) a bevart Future sosem fejezodik be. A felhasznalo azt latja, hogy a betolto spinner vegtelenul porog, nincs hibauzenet es nincs ujraprobalkozas, amig ki nem lovi az appot. Ez a getProgressionSuggestions dokumentalt 'sosem dob kivetelt' szerzodeset is megsertheti, mert megakadt socketnel a try/catch sosem sul el.

<sub>🔧 Technikai részlet: Confirmed. None of the Api class HTTP calls apply .timeout(): _get (line 90), createTraining (158), updateTraining (186), createSession (220), createHyroxPlan (259), deleteHyroxPlan (292), deleteTraining (308), and getProgressionSuggestions (329). By contrast, exercise_api.dart:34 and auth_service.dart (lines 59-422) wrap every call in .timeout(Duration(...)). With a half-open/stalled TCP connection the awaited Future never completes, so callers hang with a spinner and no error. It also breaks getProgressionSuggestions' documented 'never throws — returns {} on any failure' contract: on a hung socket the try/catch never fires because the await at line 329 never returns.</sub>

---

### 65. A restoreSession() bármilyen átmeneti hibánál letörli a tárolt tokent, ezért offline indítás után újra be kell jelentkezni

**Hol:** [lib/services/auth_service.dart:310](lib/services/auth_service.dart#L310)

A restoreSession() catch ága feltétel nélkül meghívja a logout()-ot, ami eltávolítja az 'auth_token'-t a SharedPreferences-ből. A catch nem tesz különbséget a valóban érvénytelen token (401) és egy átmeneti hálózati hiba vagy időtúllépés között. Ha a felhasználó lefedettség nélkül (repülőn, metrón) indítja el az appot, a token véglegesen törlődik a lemezről, és később a hálózat visszatértével is kézzel kell újra bejelentkeznie, pedig a token a szerveren még érvényes volt.

<sub>🔧 Technikai részlet: restoreSession() wraps _get('/api/auth/me') (20s timeout) in a try, and the catch unconditionally calls logout() (line 310), which runs prefs.remove('auth_token') (line 320). The catch cannot distinguish a real 401 from a transient network/timeout error, so any offline launch permanently erases the stored bearer token from disk, forcing a fresh login even after connectivity returns.</sub>

---

### 66. A hosszú élettartamú munkamenet-token titkosítatlanul, a SharedPreferences-ben tárolódik

**Hol:** [lib/services/auth_service.dart:412](lib/services/auth_service.dart#L412)

A munkamenet bearer tokenje sima SharedPreferences bejegyzésként íródik ki (prefs.setString, 412. sor), nem pedig a Keychain/Keystore által védett flutter_secure_storage-ba — a pubspec.yaml nem is tartalmazza ezt a függőséget. Androidon ez titkosítatlan XML fájl az app sandboxában, ami rootolt vagy kompromittált eszközön, adb backup vagy forenzikus kinyerés útján kiolvasható. Mivel ez egy hosszú élettartamú token, amely minden felhasználói híváshoz (fióktörlés, előfizetés-vásárlás) használatos, egy eszközhozzáféréssel rendelkező támadó vele teljesen megszemélyesítheti a felhasználót.

<sub>🔧 Technikai részlet: The bearer token is persisted with prefs.setString(_tokenKey, token) at line 412 and read back in _readToken and api.dart; pubspec.yaml has no flutter_secure_storage dependency (grep confirmed), so it lives in plaintext SharedPreferences (cleartext XML on Android). It is a long-lived Bearer token used for all user-scoped calls including account deletion and subscription purchase, so on a rooted/compromised device or via adb backup it can be extracted and replayed. A legitimate hardening gap, though exploitation requires device-level access.</sub>

---

### 67. Az edzés-emlékeztető értesítés szövege és Android csatornaneve keményen bedrótozott magyar, ezért angol nyelvű felhasználók is magyar értesítést kapnak

**Hol:** [lib/services/notification_service.dart:97](lib/services/notification_service.dart#L97)

A reschedule() (amit a heti terv szerkesztő _save hív) keményen bedrótozott magyar szövegeket ad át: az értesítés törzse 'Ma edzésnap. Indítsd a workoutot.' (97. sor), az Android csatornanév 'Edzés emlékeztető' (83. sor) és a leírás 'Napi emlékeztető a tervezett edzésekre.' (84-85. sor). A notification_service.dart egyáltalán nem használja az app_strings.dart t() rendszerét és nincs nyelvi paramétere, pedig az app kétnyelvű és alapból angol. Így egy angolul használó felhasználó a beállított időpontban magyar nyelvű push értesítést kap, és a rendszer értesítés-beállításokban magyar csatornanevet lát.

<sub>🔧 Technikai részlet: notification_service.dart hardcodes Hungarian: body 'Ma edzésnap. Indítsd a workoutot.' (line 97), Android channel name 'Edzés emlékeztető' (line 83) and channelDescription (lines 84-85). The service never imports app_strings.dart and has no locale parameter, while AppStrings defaults to English (_lang='en', 'Default to English per product decision'). reschedule() is invoked from weekly_plan_edit_screen.dart:236/243, so an English-locale user who enables reminders receives Hungarian OS notifications and sees a Hungarian channel name in settings. Defect present and reachable.</sub>

---

### 68. A naptár megfigyelés-chipek fixen magyarul jelennek meg angol nyelvű appban is

**Hol:** [lib/utils/insights.dart:32](lib/utils/insights.dart#L32)

A computeInsights() az insights.dart-ban keményen bekódolt magyar szövegeket állít elő (_dayNames, 'EDZESZ LEGTÖBBET', 'A LEGRITKÁBB', 'ÁTLAGOSAN hh:mm-KOR KEZDESZ', 'ÁTLAG SESSION: N PERC'), amelyeket a calendar_screen.dart _insightsSection() közvetlenül, fordítás nélkül renderel. Az app kétnyelvű és alapból angol (app_strings.dart), a szekció fejléce a t('calendar.observations_caps') kulcson keresztül lokalizált. Ezért ha a felhasználó angolra váltja az appot és megnyitja a naptárt, a fejléc angol, de a chipek magyarul olvashatók (pl. 'PÉNTEKEN EDZESZ LEGTÖBBET (5 ALKALOM)', 'ÁTLAG SESSION: 47 PERC'). A hiba legalább 4 dátumozott edzés esetén jelentkezik.

<sub>🔧 Technikai részlet: The app is bilingual and defaults to English (lib/i18n/app_strings.dart: _lang='en', isEn/isHu, t() with en/hu dict). In calendar_screen.dart _insightsSection() the section header uses the localized t('calendar.observations_caps'), but the chip strings come straight from computeInsights() in insights.dart, which builds hardcoded Hungarian text: _dayNames (line 32-40) plus the literals 'EDZESZ LEGTÖBBET (N ALKALOM)' (line 78), 'A LEGRITKÁBB' (line 82), 'ÁTLAGOSAN hh:mm-KOR KEZDESZ' (line 96) and 'ÁTLAG SESSION: N PERC' (line 104). None of these pass through t(), so an English-locale user sees a localized header with Hungarian chip sentences. Scenario is reachable (>=4 dated sessions). Confirmed; medium as it is a localization/UX defect, not a crash.</sub>

---

### 69. A tipikus kezdesi ido kulon atlagolja az ora- es perc-mezoket, matematikailag rossz idot ad

**Hol:** [lib/utils/insights.dart:88](lib/utils/insights.dart#L88)

A modul az ora-komponensek atlagat (avgHour) es a perc-komponensek atlagat (avgMin) kulon szamolja ki, majd osszefuzi oket ($hh:$mm). Ez nem a kezdesi idok valodi atlaga: oratahatart atlepo mintaknal (pl. 17:55 es 18:05) az eredmeny akar 30 perccel is elteher, ejfel korul (23:xx / 00:xx) pedig durvan hibas. A felhasznalo a naptar MEGFIGYELESEK reszen hibas 'ATLAGOSAN hh:mm-KOR KEZDESZ' idot lat, ha legalabb 4 rogzitett kezdesi ideje van.

<sub>🔧 Technikai részlet: avgHour = round(mean(started.hour)) and avgMin = round(mean(started.minute)) are computed independently (lines 88-93) and concatenated as $hh:$mm. The mean of clock times must be taken over total minutes since midnight; averaging components is wrong across hour boundaries (17:55/18:05 -> 18:30, 30 min off) and grossly wrong across midnight. The scenario is reachable since typicalStartTime only requires >=4 startedAt samples.</sub>

---

### 70. Az allTimeBestStreak a tavaszi oraatallitasnal ketteszakit egy sorozatot, mert az egymast koveto hetkezdetek 167 oraval vannak es az inDays==7 nem teljesul

**Hol:** [lib/utils/streak.dart:45](lib/utils/streak.dart#L45)

Az allTimeBestStreak ket szomszedos het Monday-ejfelet hasonlit ossze a curr.difference(prev).inDays == 7 feltetellel. A tavaszi oraatallitas atlepesekor ket egymast koveto hetfo-ejfel abszolut tavolsaga 167 ora, igy az inDays erteke 6, a feltetel hamis, es a run szamlalo visszaall 1-re, holott a hetek folytonosak. Ezert a naptar 'valaha volt legjobb sorozat' erteke a marciust atolelo sorozatoknal alacsonyabb a valosnal, es a 'NEW ALL-TIME RECORD' jelzes rossz idopontban sul el.

<sub>🔧 Technikai részlet: curr.difference(prev).inDays == 7 compares two consecutive stored Monday-midnight epochs. Across the spring-forward two adjacent Monday-midnights are 167h apart (e.g. 2026-03-22 23:00 UTC to 2026-03-29 22:00 UTC = 6d23h), so inDays == 6 and run resets to 1, splitting any streak that spans late March. (Fall-back gives 169h -> inDays==7, so only the spring transition breaks it.) Underreports _bestStreak at calendar_screen.dart:104.</sub>

---

### 71. allTimeBestStreak DST tavaszi óraátállításnál megszakítja a sorozatot (inDays 7 helyett 6)

**Hol:** [lib/utils/streak.dart:45](lib/utils/streak.dart#L45)

A hét-egymásutániságot a `curr.difference(prev).inDays == 7` ellenőrzi, ahol prev/curr helyi idő szerinti hétfő-éjfélek. A tavaszi óraátállítás (március utolsó vasárnapja) hetét átívelő két hétfő-éjfél valós időben csak 167 óra távolságra van, mert egy óra kimarad, így az `.inDays` 6-ra csonkol és az egyenlőség hamis lesz, a `run` visszaáll 1-re. Emiatt a márciusi óraátállítás heti határánál a folyamatos edzéssorozat tévesen megszakítottnak számít, és a felhasználó az összesített legjobb sorozatát rövidebbnek látja (pl. 20 helyett 12). Évente egyszer, csak a tavaszi átállásnál jelentkezik.

<sub>🔧 Technikai részlet: _weekStart builds LOCAL Monday-midnights and stores their millisecondsSinceEpoch; DateTime.fromMillisecondsSinceEpoch also returns local times. Across the spring-forward DST transition, two consecutive Monday-midnights are only 167 real hours apart (one hour skipped), so curr.difference(prev) is a 167h Duration and .inDays truncates to 6, making the `== 7` check fail and resetting run to 1. Consecutive weeks straddling the late-March DST change are wrongly counted as a break, splitting the all-time-best streak. (Autumn fall-back gives 169h → inDays 7, so only spring is affected.)</sub>

---

### 72. A streakStatus() sosem adhat StreakStatus.broken erteket, igy a 'kezdd ujra a sorozatot' allapot elerhetetlen, es a sorozat nelkuli felhasznalo is 'veszelyben a sorozat' uzenetet lat

**Hol:** [lib/utils/streak.dart:82](lib/utils/streak.dart#L82)

A streakStatus()-ban a daysLeft = 7 - today.weekday erteke mindig 0 es 6 kozott van, es a daysLeft<=2 (atRisk) valamint daysLeft>=3 (pending) agak egyutt minden erteket lefednek, ezert a 82. sori return StreakStatus.broken holt kod. Ezen felul a fuggveny csak azt vizsgalja, edzett-e a felhasznalo ezen a heten, azt nem, hogy egyaltalan van-e elo sorozata. Igy egy hetek ota nem edzo (weeklyStreak==0) felhasznalo szombaton/vasarnap 'A SOROZAT VESZELYBEN' uzenetet lat, holott nincs mit elveszitenie, a szandekolt 'KEZDD UJRA A SOROZATOT' szoveg pedig egyetlen allapotban sem jelenik meg.

<sub>🔧 Technikai részlet: daysLeft = 7 - today.weekday is 0..6 (weekday 1..7). if(daysLeft<=2) covers 0-2 and if(daysLeft>=3) covers 3-6, so every value is returned before reaching line 82; return StreakStatus.broken is dead code. Moreover streakStatus only checks trainedThisWeek, never whether a prior streak exists, so a user with weeklyStreak==0 who didn't train this week still gets atRisk/pending. calendar_screen.dart:238-239 only shows start_streak_again in the broken case, which never fires; atRisk (line 232-233) renders even with no streak to lose.</sub>

---

### 73. streakStatus soha nem ad vissza broken állapotot, így a 0-s sorozatnál rossz üzenet jelenik meg

**Hol:** [lib/utils/streak.dart:82](lib/utils/streak.dart#L82)

A `daysLeft = 7 - today.weekday` értéke 0 és 6 közötti, és a `daysLeft <= 2` (atRisk) illetve `daysLeft >= 3` (pending) ág együtt minden egész értéket lefed, ezért a 82. sori `return StreakStatus.broken;` elérhetetlen holt kód. A calendar_screen.dart 238-239. sora csak a broken ágban jeleníti meg a `calendar.start_streak_again` szöveget, ami így soha nem látszik. Egy megszakadt (0-s) sorozatú felhasználó helyette hétvégén a 'STREAK AT RISK', hétköznap a 'week still open' feliratot kapja a kijelzett 0 mellett, ami azt sugallja, hogy van védendő sorozata.

<sub>🔧 Technikai részlet: daysLeft = 7 - today.weekday, weekday ∈ 1..7, so daysLeft ∈ 0..6. `if (daysLeft <= 2) return atRisk;` covers 0,1,2 and `if (daysLeft >= 3) return pending;` covers 3,4,5,6, so every value returns before line 82; StreakStatus.broken is unreachable. Confirmed against the caller: calendar_screen.dart:238-239 only shows calendar.start_streak_again inside the broken case, so that hint never appears. A user with streak 0 gets atRisk (weekend) or pending (weekday) instead, i.e. a 'streak at risk'/'week still open' hint next to a displayed 0.</sub>

---

### 74. A titleCase ASCII \w+ mintát használ, ezért az ékezetes magyar szavakat szétvágja és félreírja ('edzés' -> 'EdzéS')

**Hol:** [lib/utils/text.dart:4](lib/utils/text.dart#L4)

A titleCase függvény a RegExp(r'\w+') mintát használja, amely a Dart (ECMAScript) szabályai szerint csak az [A-Za-z0-9_] karaktereket ismeri szónak, az ékezetes betűket (á é í ó ö ő ú ü ű) nem. Emiatt minden ékezet szóhatárként viselkedik, és az utána következő betűt nagybetűsíti: 'vállnyomás' -> 'VáLlnyomáS'. Mivel az alkalmazás magyar nyelvű és a titleCase-t az edzés-, gyakorlat- és munkamenetnevekre alkalmazzák, a felhasználó szinte minden ékezetes nevet elrontott, szó közbeni nagybetűkkel lát.

<sub>🔧 Technikai részlet: titleCase uses RegExp(r'\w+'), and Dart RegExp follows ECMAScript semantics where \w matches only [A-Za-z0-9_]. Accented Hungarian letters (á é í ó ö ő ú ü ű) are not word characters, so they act as boundaries: 'edzés' matches run 'edz', then a boundary at 'é', then run 's' whose first char is upper-cased -> 'EdzéS'. Line 5 does m[0][0].toUpperCase() on each such run. Since the app is Hungarian and titleCase is applied to training/session/exercise names across the dashboard and other screens, most names containing accented letters render with garbled mid-word capitals.</sub>

---

### 75. A gyakorlat GIF helyorzo a bedrotozott magyar 'Hamarosan' szot mutatja angol nyelvu felhasznaloknak

**Hol:** [lib/widgets/exercise_placeholder.dart:30](lib/widgets/exercise_placeholder.dart#L30)

A helyorzo cimke a 30. sorban egy bedrotozott 'Hamarosan' string, nem pedig egy AppStrings.t() lekeres, es nincs hozza forditasi kulcs. A widget akkor jelenik meg, amikor egy gyakorlat GIF-je hianyzik vagy 404-et ad (nagy elonezeteknel, showLabel:true a create_training_screen.dart es exercise_sheets.dart hivasokban). Mivel az alap nyelv angol (AppStrings._lang = 'en'), egy angol nyelvre allitott felhasznalo egy magyar szot lat az egyebkent angol feluleten.

<sub>🔧 Technikai részlet: Line 30 hardcodes the literal Hungarian string 'Hamarosan' instead of routing through AppStrings.t(). AppStrings._lang defaults to 'en' (app_strings.dart line 18), and the placeholder is used with showLabel:true in create_training_screen.dart (lines 806, 811) and exercise_sheets.dart (line 140), so an English-locale user sees a Hungarian word on large exercise previews when the GIF is missing/404s. There is no localization key for this text.</sub>

---

### 76. A gyakorlat-info és gyakorlatcsere lapok bedrótozott magyar szövegeket használnak egy kétnyelvű, alapból angol appban

**Hol:** [lib/widgets/exercise_sheets.dart:123](lib/widgets/exercise_sheets.dart#L123)

Az app alapértelmezett nyelve angol (app_strings.dart: _lang='en'), ez a fájl viszont minden felhasználói szöveget magyarul dróto z be: 'Nincs adat', 'Célzott izmok', 'Másodlagos izmok', 'Testrészek', 'Eszközök', 'Végrehajtás', 'Gyakorlat cseréje', 'Mind', 'Nincs találat'. Az ugyanezekhez tartozó i18n kulcsok már léteznek és a create_training_screen használja is őket (detail.*, common.no_results, create.all_filter). Emiatt angol nyelvű felhasználó a gyakorlat részleteinél és a cserélő lapnál kevert nyelvű képernyőt lát: a szekciócímek magyarul jelennek meg.

<sub>🔧 Technikai részlet: The app defaults to English (app_strings.dart:18 _lang='en') yet this file hardcodes Hungarian: 'Nincs adat' (108), 'Célzott izmok'/'Másodlagos izmok'/'Testrészek'/'Eszközök' (123-126), 'Végrehajtás' (193), 'Gyakorlat cseréje' (319), 'Mind' (345), 'Nincs találat' (391). Matching i18n keys exist and are already used by create_training_screen: common.no_results (app_strings.dart:84), create.all_filter (457), detail.target_muscles/secondary_muscles/body_parts/equipment/execution (548-552). So default (English) users see mixed-language section headers in the exercise info and change sheets.</sub>

---

### 77. A gyakorlatcsere-lap üres találati listával nyílik meg, mert az előre kiválasztott izomszűrő lokalizált (magyar) érték, nem angol szűrőkulcs

**Hol:** [lib/widgets/exercise_sheets.dart:261](lib/widgets/exercise_sheets.dart#L261)

A lap az initState-ben az előző gyakorlat első célzott izmát állítja be szűrőnek (_muscleFilter = widget.initialMuscle), amit a 284. sorban targetMuscles szűrőként küld el az API-nak. A targetMuscles értékek azonban az aktuális app-nyelvre feloldva tárolódnak (a _pickLang az aktuális nyelvet részesíti előnyben), így magyar nyelven pl. 'mellizmok' lesz, a create_training pedig ezt szó szerint elmenti. A katalógus szűrője csak angol kulcsokra illeszkedik, ezért magyar felhasználónál a lap 0 találattal, 'Nincs találat' üzenettel nyílik meg, aktív chip nélkül. Angol nyelven a hiba nem jelentkezik (ott 'pectorals' oldódik fel).

<sub>🔧 Technikai részlet: initState applies _muscleFilter = widget.initialMuscle (from workout_screen.dart:706 ex.targetMuscles.first) and _load() sends it as targetMuscles:[_muscleFilter!] (line 284). ApiExercise resolves targetMuscles via _localizedList/_pickLang (exercise_api_models.dart:91-104), which prefers the CURRENT app language, not English — contradicting the model's own comment. create_training_screen._save persists the resolved values verbatim (line 297). So in Hungarian mode the stored/passed muscle is e.g. 'mellizmok', which the catalogue filter (English keys) cannot match, opening an empty 'Nincs találat' sheet. The codebase itself documents this localized shape (mellizmok/pectorals) in exercise_api_models.dart:8-11, so the hu path is real. English users are unaffected (resolves to 'pectorals').</sub>

---

### 78. A gyakorlatcsere-lap izomszűrő chipjei a /muscles listából épülnek, ezért a testrész-nevű chipek (mell, hát, váll, törzs) mindig 0 találatot adnak

**Hol:** [lib/widgets/exercise_sheets.dart:284](lib/widgets/exercise_sheets.dart#L284)

A lap a chipeket az _api.muscles() (/muscles) listából építi, ami – a create_training_screen 44-48. sori kommentje szerint – valódi izmokat és testrész-szavakat (mell, hát, váll, törzs) kever, a szűrést viszont a targetMuscles tengelyen végzi (284. sor). Mivel a gyakorlatok a valódi izmot tárolják (pl. pectorals) és nem a testrészt, a testrész-nevű chipekre koppintva a katalógus 0 gyakorlatot ad vissza. A felhasználó a 'Chest'/'Back'/'Shoulders'/'Core' chipre koppintva üres 'Nincs találat' listát lát, holott több tucat illő gyakorlat létezik. Ez ugyanaz a taxonómiai hiba, amit a 68f456d commit már javított a create_training képernyőn, de ezt a lapot kihagyta.

<sub>🔧 Technikai részlet: Chips are built from _api.muscles() (line 274, the /muscles list) while _load filters on the targetMuscles axis (line 284). The create_training_screen comment (lines 44-48) authoritatively documents that /muscles mixes muscles and body-part words, and filtering a body-part value (e.g. chest) as a target muscle finds nothing because chest is a bodyPart whose target muscle is pectorals. This is the exact taxonomy bug fixed in create_training (commit 68f456d switched to the bodyParts axis) but the change-exercise sheet was missed, making body-part-named chips dead filters. Distinct root cause from finding 33 (axis mismatch vs. language mismatch).</sub>

---

### 79. Az izomtérfogat-diagram a nem teljesített (tervezett) sorozatokat is beszámítja

**Hol:** [lib/widgets/muscle_heatmap.dart:62](lib/widgets/muscle_heatmap.dart#L62)

A diagram a `reps > 0` feltétellel számolja a sorozatokat a `done` (teljesítve) jelző helyett. Mivel az edzés befejezésekor minden sorozat mentésre kerül – a bejelöletlenek is, előre kitöltött ismétlésszámmal –, a sohasem elvégzett sorozatok is beleszámítanak az izmonkénti heti sorozatszámba. A felhasználó egy félbehagyott edzés után túl magas 'X SET' értéket és téves 'OPTIMÁLIS' / 'n A CÉLIG' jelzést lát az adott izomnál. A helyes szűrő az `x.done` lenne.

<sub>🔧 Technikai részlet: _aggregate() counts ex.sets.where((x) => x.reps > 0).length, but SavedSet has a real `done` flag (api_models.dart:208) and finished sessions persist ALL sets including untocked ones: workout_screen.dart:320 maps over every set (e.sets.map(... done: true) which writes the actual s.done). New sets copy the previous set's reps (workout_screen.dart:551), so undone sets typically have reps>0. Thus planned-but-not-performed sets are credited to the muscle, inflating the SET counts and MAV/OPTIMÁLIS hints. The comment on line 60-61 even says it should count 'every set the user performed', but it checks reps, not done. Should filter on x.done.</sub>

---

### 80. A súlytárcsa-számoló beégetett magyar szövegei angol felhasználóknak is magyarul jelennek meg

**Hol:** [lib/widgets/plate_calculator_sheet.dart:58](lib/widgets/plate_calculator_sheet.dart#L58)

A showPlateCalculator sosem használja az AppStrings fordítási réteget, pedig az alapértelmezett nyelv angol (app_strings.dart:18, `_lang = 'en'`). A nem megvalósítható ágban (amikor a súly kisebb a rúdnál) az 58. sor beégetett magyar szöveget ('a rúd súlya alatt van.') és a 62. sor ('üres rúd') jelenít meg. Ha egy angol nyelvű felhasználó a rúd súlyánál könnyebb sorozatra (pl. 15 kg egy 20 kg-os rúddal) nyitja meg a számolót, magyar szöveget lát angol helyett.

<sub>🔧 Technikai részlet: showPlateCalculator never calls AppStrings; the default locale is English (app_strings.dart:18 `_lang = 'en'`), yet the infeasible branch renders literal Hungarian at line 58 ('...a rúd súlya alatt van.') and line 62 ('...(üres rúd)'). AppStrings is used across the app (main.dart, account_screen, progress_screen, etc.), confirming the convention this file breaks. An English user with a set below bar weight sees untranslated Hungarian.</sub>

---

### 81. A teljes edzés szerkesztés/törlés folyamat keményen kódolt magyar, megkerüli az i18n rendszert

**Hol:** [lib/widgets/training_actions.dart:44](lib/widgets/training_actions.dart#L44)

A fájl csak a '../utils/text.dart'-ot importálja (titleCase), az app_strings.dart t() függvényét nem, így minden felhasználói szöveg keményen kódolt magyar: 'Szerkesztés' (44), 'Törlés' (57), 'Nem sikerült törölni.' (121), '... törlése' (141), 'Ez a művelet nem visszavonható.' (148), 'Törlés'/'Mégse' (168, 183), 'Adj nevet az edzésnek.' (239), 'Nem sikerült menteni.' (269), 'Szerkesztés' cím (296), 'Mentés' (320), 'Név' (336), 'Nincs gyakorlat' (356). A szótárban léteznek a kulcsok (common.edit, common.delete, common.save, common.cancel, create.give_name). Az app alapértelmezett nyelve angol (app_strings.dart:18 _lang='en'), így egy angol felhasználó egy teljesen magyar, olvashatatlan destruktív folyamatot kap, benne a visszavonhatatlanságra figyelmeztető szöveget.

<sub>🔧 Technikai részlet: Verified: training_actions.dart does not import app_strings/t and every string is a literal Hungarian const. app_strings.dart confirms default lang is 'en' (line 18) and that all cited keys (common.edit line 75, common.delete 74, common.save 71, common.cancel 72, create.give_name 458) already exist. Non-Hungarian users see the whole edit/delete flow in Hungarian. Confirmed.</sub>

---

### 82. A törlés/mentés await után mounted-ellenőrzés nélkül hívja a nav.pop()-ot, ami idegen route-ot zárhat be

**Hol:** [lib/widgets/training_actions.dart:116](lib/widgets/training_actions.dart#L116)

A _DeleteTrainingSheetState._delete előre elmenti a `nav = Navigator.of(context)`-et, majd `await deleteTraining(); await onChanged(); nav.pop();` fut mounted-ellenőrzés nélkül (116. sor); a _EditTrainingSheetState._save ugyanígy (264. sor). Mindkét sheet showModalBottomSheet-tel jelenik meg alapértelmezett isDismissible/enableDrag mellett, tehát a folyamatban lévő kérés közben a felhasználó lehúzhatja vagy a háttérre koppintva bezárhatja a sheetet. Ha a bezárás azután történik, hogy a deleteTraining/onChanged már feloldódott, a nav.pop() a most legfelül lévő route-ot (az alatta lévő képernyőt) zárja be, mivel a sheet route már eltűnt. A felhasználó váratlanul kikerül az edzéslistáról vagy épp aktuális képernyőjéről.

<sub>🔧 Technikai részlet: Line 116 (and mirror at 264) calls nav.pop() after two awaits with no mounted guard; nav is the shared Navigator that hosts both the modal route and the underlying page. Both sheets are shown via showModalBottomSheet with default isDismissible/enableDrag (lines 82, 202), so barrier-tap/drag dismissal mid-request is reachable. If dismissal lands after deleteTraining resolves but during the onChanged() network refresh (the client isn't aborted since the HTTP call already completed), the later nav.pop() pops the underlying screen. Real defect, narrow timing window.</sub>

---

### 83. A szerkesztő/törlő sheetből indított snackbarok a nyitott modal sheet mögött jelennek meg, így a felhasználó nem lát visszajelzést

**Hol:** [lib/widgets/training_actions.dart:238](lib/widgets/training_actions.dart#L238)

A _save az 'Adj nevet az edzésnek.' (238) és 'Nem sikerült menteni.' (268), a _delete a 'Nem sikerült törölni.' (120) snackbart ScaffoldMessenger.of(context)-tel jeleníti meg. A snackbart a háttérben lévő képernyő Scaffoldja rendereli a képernyő alján, a modal bottom sheet viszont az Overlay-ben efölött, szintén alulra horgonyozva helyezkedik el (a szerkesztő sheet maxHeight 0.85), így a snackbart teljesen eltakarja a sheet mindhárom esetben (üres név korai visszatérés, mentési hiba, törlési hiba – a sheet mindháromkor nyitva marad). A felhasználó semmilyen látható visszajelzést nem kap: az üres névvel megnyomott Mentés gomb halottnak tűnik, hálózati hibánál csak a spinner áll le.

<sub>🔧 Technikai részlet: ScaffoldMessenger renders the SnackBar inside the currently-registered (underlying screen) Scaffold, which sits below the modal bottom-sheet route in the Overlay paint order; both sheets are bottom-anchored so the bottom-anchored snackbar is covered. All three paths keep the sheet open (early return line 241, catch on save 265-271, catch on delete 117-124). Reachable and a genuine no-feedback UX defect.</sub>

---

### 84. A PATCH /api/me/reminders valasz kihagyja a `subscription` mezot, ezert emlekezto mentese memoriaban torli a Pro jogosultsagot

**Hol:** [web: app/api/me/reminders/route.ts:52](../web/app/api/me/reminders/route.ts#L52)

A reminders route kezzel epiti fel a visszaadott user objektumot (52-62. sor), es kihagyja belole a `subscription` mezot, ellentetben a publicUserJson helperrel, amit a weekly-plan es login vegpontok hasznalnak. A mobil oldalon a saveReminders a _patchMeUser-on keresztul teljes egeszeben lecsereli a felhasznalot (`_user = AuthUser.fromJson(map['user'])`), es az AuthUser.fromJson a hianyzo subscriptiont a `Subscription.free()` ertekre allitja (isPro=false). Igy ha egy Pro felhasznalo bekapcsol egy emlekeztot es ment, a Pro allapota memoriaban free-re valt, es a paywall/Pro-gating free-kent kezeli, amig az app ujra nem indul vagy le nem fut a getSubscription(). Uzemi visszaigazolas: kozepes sulyossag, mert onmagat javitja a kovetkezo /me vagy getSubscription hivasnal.

<sub>🔧 Technikai részlet: The PATCH handler builds the returned user object by hand (lines 52-62) and omits the `subscription` field, unlike publicUserJson (apps/web/lib/user-json.ts) which the weekly-plan and login routes use and which DOES include subscription. On mobile, saveReminders -> _patchMeUser (auth_service.dart:147) does a full `_user = AuthUser.fromJson(map['user'])` replacement (not copyWith), and AuthUser.fromJson (models/auth.dart:48-51) defaults an absent `subscription` to `const Subscription.free()` with isPro=false. So a Pro user who saves a reminder has their in-memory subscription reset to free until relaunch or getSubscription() runs. Reachable and real; self-heals on next /me or getSubscription, hence medium.</sub>

---

### 85. Próbaidőszak alatti lemondás azonnal megvonja a Pro-hozzáférést és hibás 'Lemondva · -ig' címkét jelenít meg

**Hol:** [web: app/api/me/subscription/cancel/route.ts:42](../web/app/api/me/subscription/cancel/route.ts#L42)

Ha egy próbaidőszakban lévő (trialing) felhasználó lemondja az előfizetést, a cancel végpont 'cancelled' státuszra állítja a feliratkozást, de a currentPeriodEnd null marad (a próbaidőszaknál csak trialEndsAt van beállítva). A hasProAccess a 'cancelled' státusznál csak a currentPeriodEnd-et nézi, így az isPro azonnal false lesz, pedig a megerősítő párbeszéd azt ígéri, hogy az időszak végéig megmarad a Pro. A felhasználó azonnal elveszti a Pro funkciókat, és az Account képernyőn az állapotjelvény üres dátummal jelenik meg: 'Cancelled · until ' angolul, illetve a nyelvtanilag hibás 'Lemondva · -ig' magyarul.

<sub>🔧 Technikai részlet: start-trial sets status 'trialing' with currentPeriodEnd:null (only trialEndsAt). account_screen.dart:461 shows the Cancel link for trialing+isPro, and the confirm dialog (app_strings.dart:877) promises Pro until period end. cancel/route.ts:42-46 spreads sub and sets status:'cancelled' while leaving currentPeriodEnd null. hasProAccess (subscription.ts:61-66) for 'cancelled' requires currentPeriodEnd != null && > now, so isPro flips to false immediately. account_screen.dart:507-511 then renders the badge with an empty date, producing 'Cancelled · until ' / 'Lemondva · -ig'. Every step is present and reachable.</sub>

---

### 86. 9 izom kiválasztása 'teljes fókusznak' számít, így a szándékosan kihagyott izom mégis bekerül a tervbe

**Hol:** [web: lib/trainingGenerator.ts:98](../web/lib/trainingGenerator.ts#L98)

A pickWeekTemplate a 98. sorban `focus.length >= ALL_MUSCLES.length - 1`, azaz >=9 esetén teljes fókuszként kezeli a kérést, és a mind a 10 izmot lefedő kanonikus split-ekre esik vissza. Ha a felhasználó a 10 izomból pontosan 9-et választ ki (pl. térdsérülés miatt kihagyja a combot), a kihagyott izom mégis megjelenik a generált edzésekben gyakorlatként. A felhasználó explicit kizárása így némán figyelmen kívül marad; a küszöbnek `>= ALL_MUSCLES.length`-nek kellene lennie.

<sub>🔧 Technikai részlet: Line 98: `const isFullFocus = focus.length >= ALL_MUSCLES.length - 1;`. ALL_MUSCLES has 10 entries (exercisePool.ts lines 421-432), so a deduplicated selection of exactly 9 muscles yields isFullFocus=true and the function falls through to the canonical splits (cases 1-6) which cover all 10 groups, including the one the user deselected. E.g. excluding quads then selecting the other 9 still produces the case-4 Upper/Lower split whose lower days contain Back Squat/Leg Press/Walking Lunge (quads). The threshold should be `>= ALL_MUSCLES.length`.</sub>

---

### 87. Kevés fókuszizom + több edzésnap esetén az összes üres nap az első izommal töltődik fel, súlyosan aránytalan splitet adva

**Hol:** [web: lib/trainingGenerator.ts:108](../web/lib/trainingGenerator.ts#L108)

A nem-teljes-fókusz ágban a 108. sor minden üres napot a focus[0]-lal tölt fel a lista körbejárása (focus[i % focus.length]) helyett. Így pl. fókusz=[mell, hát] és 6 edzés/hét esetén a heti sablon mell, hát, mell, mell, mell, mell lesz, azaz a mell heti 5x, a hát 1x edződik, és ez ismétlődik akár 20 héten át. A felhasználó kiegyensúlyozott váltakozás helyett egy erősen torz tervet kap; 4 edzés/hét esetén az arány 3:1.

<sub>🔧 Technikai részlet: In the non-full-focus branch, line 108 `days.map((d) => (d.length > 0 ? d : [focus[0]]))` fills every empty day with focus[0] instead of cycling (`focus[i % focus.length]`). With focus=[chest,back] and 6 sessions/week: forEach assigns chest->day0, back->day1, days 2-5 empty -> all filled with chest, giving chest,back,chest,chest,chest,chest (chest 5x, back 1x per week), repeated for the whole plan. The code comment claims round-robin but the fill defeats it whenever sessionsPerWeek > focus.length, a normal configuration.</sub>

---

## ⚪ Alacsony súlyosságú hibák (43)

### 88. Elgépelés a magyar streak-veszélyben banneren: 'EDZS MA' helyesen 'EDZZ MA'

**Hol:** [lib/i18n/app_strings.dart:625](lib/i18n/app_strings.dart#L625)

A calendar.streak_at_risk kulcs magyar értéke a 625. sorban 'A STREAK A KOCKÁN — EDZS MA'. Az 'edz' ige felszólító módú, egyes szám második személyű alakja helyesen 'edzz' (dupla z), tehát az 'EDZS' (s-re végződő) alak elgépelés. A hiba akkor jelentkezik, amikor a nyelv magyarra van állítva, és a felhasználó heti sorozata veszélyben van: a naptárban a látványos motivációs banner láthatóan hibásan írt szót mutat ('EDZS MA' a helyes 'EDZZ MA' helyett).

<sub>🔧 Technikai részlet: At line 625 the Hungarian value for calendar.streak_at_risk is 'A STREAK A KOCKÁN — EDZS MA'. The intended second-person imperative of the verb 'edz' (train) is 'edzz' (stem edz + imperative -z suffix), so 'EDZS' (ending in s) is a genuine misspelling in a user-facing motivational banner. The English counterpart 'TRAIN TODAY' confirms the imperative intent. Reachable whenever the app is in Hungarian and the streak-at-risk banner is shown.</sub>

---

### 89. A tárcsakalkulátor mentése 'Beállítás mentve' üzenetet mutat érvénytelen bevitelnél is, a bevitel némán visszaáll

**Hol:** [lib/screens/account_screen.dart:87](lib/screens/account_screen.dart#L87)

A _savePlates (79-88. sor) a rúdsúlyt double.tryParse-szal olvassa be, majd átadja a PlateSettings.update()-nek, ami a null vagy <=0 súlyt (plate_settings.dart:48) és az üres tárcsalistát (50-52. sor) figyelmen kívül hagyja, megtartva a régi értékeket. Ezután a képernyő a mezőt és a chipeket a változatlan beállításból írja vissza (85-86. sor), és feltétel nélkül a 'Beállítás mentve' snacket mutatja (87. sor). Ha a felhasználó '0'-t vagy 'abc'-t ír a rúdsúly mezőbe, vagy minden tárcsa-chipet töröl (pl. gép-only edzőterem modellezéséhez), a mentés sikert jelez, miközben a mező visszaugrik 20-ra és a törölt chipek újra megjelennek, validációs hibaüzenet nélkül.

<sub>🔧 Technikai részlet: _savePlates (lines 79-88) parses the bar-weight with double.tryParse (null for 'abc', 0.0 for '0') and passes _plates to PlateSettings.update(). update() ignores barWeight when null or <=0 (plate_settings.dart:48) and ignores an empty availablePlates list (lines 50-52), keeping the old values. _savePlates then rewrites _barWeight.text and _plates from the unchanged settings (lines 85-86) and unconditionally shows _snack(t('account.settings_saved')) at line 87, with no validation branch. So invalid bar weight or a fully-cleared plate list is silently discarded while the user is told 'Setting saved'. Confirmed and reachable (chips are removable via the GestureDetector onTap at line 297).</sub>

---

### 90. A _fmtVolume mindig vesszőre cseréli a tizedespontot, így angol nyelven is magyar számformátum jelenik meg

**Hol:** [lib/screens/calendar_screen.dart:35](lib/screens/calendar_screen.dart#L35)

A 35. soron a _fmtVolume 1000 kg feletti térfogatnál feltétel nélkül lecseréli a tizedespontot vesszőre, függetlenül az alkalmazás nyelvétől. A vessző magyarul helyes, de az angol felületen hibás: az angol nyelvű felhasználó '12,3 t' formátumot lát az angol 'LIFTED' felirat mellett '12.3 t' helyett. Akkor jelentkezik, ha az angol nyelvet használó felhasználó havi térfogata eléri az egy tonnát.

<sub>🔧 Technikai részlet: Line 35: _fmtVolume does (kg/1000).toStringAsFixed(1).replaceAll('.', ',') unconditionally for volumes ≥ 1000 kg, hardcoding a comma decimal separator regardless of app language. The app supports English (every string has an 'en' variant), so an English-locale user sees '12,3 t' next to English labels, a mixed-locale rendering.</sub>

---

### 91. A pull-to-refresh lecseréli az egész listát egy teljes képernyős töltésjelzőre

**Hol:** [lib/screens/calendar_screen.dart:71](lib/screens/calendar_screen.dart#L71)

A RefreshIndicator.onRefresh a _load metódust hívja, amelynek első sora (71. sor) a _loading = true beállítása. Mivel a törzs a _loading alapján a RefreshIndicator/ListView helyett egy középre igazított töltésjelzőt jelenít meg, a húzás pillanatában eltűnik a húzás-indikátor és az egész képernyőt egy pörgő jelző váltja fel. A frissítés végén a kulcs nélküli ListView a lista tetején, 0-s görgetési pozícióban épül újra, tehát a felhasználó elveszti a görgetési helyét ahelyett, hogy a lista helyben frissülne a húzás alatt.

<sub>🔧 Technikai részlet: RefreshIndicator.onRefresh points at _load (line 166), whose first line is setState(() => _loading = true) at line 71. The body (163-165) is `_loading ? Center(spinner) : RefreshIndicator(ListView(...))`, so starting a pull immediately unmounts the RefreshIndicator/ListView and replaces the screen with a centered spinner; on completion the keyless ListView rebuilds at scroll offset 0. The inline refresh affordance is defeated on every pull.</sub>

---

### 92. A nap-részletek kártya a 'set' szót fixen angolul jeleníti meg lokalizáció helyett

**Hol:** [lib/screens/calendar_screen.dart:575](lib/screens/calendar_screen.dart#L575)

Az 575. soron a _dayDetailCard a sorozatszám után egy nyers 'set' angol szót fűz a szöveghez t() hívás nélkül, miközben a sor többi része lokalizált. Magyar nyelvű felület esetén ez kevert nyelvű sort eredményez, például '5 GYAKORLAT · 12/15 set', ahol a magyar 'szett'/'sorozat' helyett angol szó jelenik meg. Akkor látszik, amikor a felhasználó a hónapráccsban egy naplózott edzést tartalmazó napra koppint.

<sub>🔧 Technikai részlet: Line 575 builds '${s.exercises.length} ${t('dashboard.exercises_short_caps')} · ${s.doneSets}/${s.totalSets} set' — the trailing word 'set' is a raw English literal, not a t() lookup, while the rest of the line is localized. In the Hungarian UI this produces a mixed-language line.</sub>

---

### 93. A csökkenés címke kettős előjelet jelenít meg: '↓ -2 A MÚLT HÓNAPHOZ KÉPEST'

**Hol:** [lib/screens/calendar_screen.dart:608](lib/screens/calendar_screen.dart#L608)

A _monthSection-ben a delta érték a csökkenő ágban negatív (month.length - lastMonth), és a 608. sor ezt a negatív számot adja át a 'calendar.delta_down' sablonnak, amely már tartalmazza a '↓' lefelé nyilat, de a '+' előjelet nem. Így a kimenet '↓ -2 A MÚLT HÓNAPHOZ KÉPEST' lesz, ahol a nyíl és a mínuszjel egyszerre kódolja az irányt. Akkor jelentkezik, ha a felhasználó ebben a hónapban kevesebb edzést végzett, mint az előzőben. A helyes megoldás a delta.abs() átadása lenne, ahogy a növekvő ág is pozitív értéket kap.

<sub>🔧 Technikai részlet: delta = month.length - lastMonth is negative in the decline branch (line 602/607), and line 608 passes the signed negative delta into tFmt('calendar.delta_down', {'n': delta}). The template at app_strings.dart:659 is '↓ {n} VS LAST MONTH' (no '+' prefix), so a delta of -2 renders '↓ -2 VS LAST MONTH'. The up-template (line 657) uses '↑ +{n}' with a positive value, confirming the down-template expected a magnitude (delta.abs()), not the signed value.</sub>

---

### 94. A _titleCase ASCII-only mintat hasznal, ezert elrontja az ekezetes magyar neveket kozepen nagybetuvel

**Hol:** [lib/screens/create_training_screen.dart:706](lib/screens/create_training_screen.dart#L706)

A _titleCase a RegExp(r'\w+') mintat hasznalja, de a Dart \w csak az [A-Za-z0-9_] karaktereket illeszti, igy az ekezetes betuk (e, o, u, a) szodarabokra tordelnek, es minden ekezet utani ASCII-toredek uj nagybetut kap. A magyar katalogusnevek (pl. 'felfele nezo kutya') igy 'Felfele NeZo Kutya' alakban jelennek meg a listaban, a reszletlapon es a chip-cimkeken, ha az app nyelve magyar vagy a sajat gyakorlat neve ekezetes. Ugyanez a hiba szerepel a lib/utils/text.dart titleCase fuggvenyeben is.

<sub>🔧 Technikai részlet: _titleCase uses RegExp(r'\w+'), and Dart's \w matches only [A-Za-z0-9_] (no unicode flag), so accented letters break words apart: 'nezo' (n-e-z-o with accents) matches 'n' and 'z' as separate fragments, each capitalised, yielding 'NeZo'-style garbling. The identical implementation is in lib/utils/text.dart:3-6 (confirmed) used by exercise_sheets.dart/training_actions.dart, and _titleCase here is applied to names, muscleSummary and detail chips (lines 634, 646, 766, 866, 1278). With Hungarian localized catalogue names (the user's app language is Hungarian) the mid-word capitalisation is visible across list rows, detail/edit/change sheets.</sub>

---

### 95. A `_fmtTime` a percet magyar 'p' rövidítéssel írja, a szám/tömeg-formázók magyar tizedesvesszőt kényszerítenek

**Hol:** [lib/screens/dashboard_screen.dart:57](lib/screens/dashboard_screen.dart#L57)

A `_fmtTime` egy óránál rövidebb időnél '${minutes}p' formátumot ad, ahol a 'p' a magyar 'perc' rövidítése; a `_fmtCount` és `_fmtVolume` pedig fixen '.'-ot ',' -re cserél. Mivel az alapértelmezett nyelv az angol, az angol felhasználó '45p'-t lát az 'Active time' kártyán és a hero feliratban, 1200 kg-nál pedig '1,2 t'-t magyar tizedesvesszővel. Ez alacsony súlyú, de a nyelvváltás nem javítja.

<sub>🔧 Technikai részlet: `_fmtTime` returns `'${minutes}p'` for durations under an hour — 'p' is the Hungarian 'perc' abbreviation, meaningless in English; and `_fmtCount`/`_fmtVolume` (lines 46-52) hardcode `.replaceAll('.', ',')`, forcing a Hungarian decimal comma. These feed the 'Active time' stat card, the hero duration suffix, and the volume/count cards. With default language 'en', English users see '45p', '1,2K', '1,2 t'. Present and locale-insensitive.</sub>

---

### 96. A napsáv dátumai abszolút Duration összeadással készülnek, így az őszi óraátállításnál duplázódik egy nap

**Hol:** [lib/screens/dashboard_screen.dart:103](lib/screens/dashboard_screen.dart#L103)

A `_days` lista minden elemét `start.add(Duration(days:i))`-vel generálja helyi éjfélből kiindulva. A Dart abszolút időt ad hozzá, ezért az őszi óraátállítás (Magyarországon október utolsó vasárnapja, 25 órás nap) átlépésekor az eredmény az előző naptári nap 23:00-ja lesz. Az átállás előtti ~2 hétben a +14 napos ablak átlépi a határt: az átállás napja kétszer jelenik meg a sávban, a többi chip egy nappal eltolódik, az utolsó jövőbeli nap pedig kimarad. A duplikált chipek ugyanazt a napot mutatják.

<sub>🔧 Technikai részlet: `_days` is `List.generate(..., (i)=>start.add(Duration(days:i)))` from a local midnight. Dart's `DateTime.add` adds absolute time and explicitly warns the time-of-day (and even the calendar date) shifts across a DST change. In Hungary the fall-back (last Sunday of October) is a 25-hour day, so a chip whose forward offset crosses it lands at 23:00 of the previous calendar day, making `day.day`/`day.weekday` repeat that day. The ±14-day window crosses the transition for ~2 weeks around it, duplicating the transition date and dropping the last future day. Latent but genuinely present.</sub>

---

### 97. A 'félbehagyott' alcím fixen magyar szöveg és angol 'set' egységgel keveredik

**Hol:** [lib/screens/dashboard_screen.dart:310](lib/screens/dashboard_screen.dart#L310)

A 310. sor a folytatható edzés alcímét 'Félbehagyva · {done}/{total} set' formában építi fel, ami keményen bedrótozott magyar szöveg angol 'set' egységgel, nem a t() fordítási rendszeren keresztül. Angol nyelvi beállításnál a felhasználó a magyar 'Félbehagyva' feliratot látja, magyar nyelvnél pedig a magyar szöveg az angol 'set' szóval keveredik. A hiba minden olyan esetben látszik, amikor a kezdőképernyő legutóbbi listájában befejezetlen edzés szerepel.

<sub>🔧 Technikai részlet: Line 310 builds the resumable-session subtitle as 'Félbehagyva · ${s.progress.doneCount}/${tr.totalSets} set' — the 'Félbehagyva' prefix is hardcoded Hungarian and the 'set' unit is hardcoded English, neither routed through t(). Every other user-facing string on this screen uses t()/tFmt(). In English locale the label shows Hungarian text; in Hungarian locale it mixes an English 'set' unit.</sub>

---

### 98. A lehuzasos frissites az egesz listat teljes kepernyos spinnerre csereli es visszaallitja a gorgetest, mert a _load() _loading=true-t allit

**Hol:** [lib/screens/hyrox_screen.dart:217](lib/screens/hyrox_screen.dart#L217)

A RefreshIndicator onRefresh-e a _load (217. sor), amelynek elso setState-je _loading=true-t allit (59. sor), igy a build() a lista helyett egy kozepre igazitott CircularProgressIndicatort mutat (206-207. sor). Amikor a felhasznalo lejjebb gorget es lehuzza a listat frissiteshez, az egesz lista eltunik a spinner mogott, majd a betoltes vegen a lista ujra a tetejerol jelenik meg, elvesztve a gorgetesi poziciot.

<sub>🔧 Technikai részlet: RefreshIndicator.onRefresh is _load (line 217), whose first setState sets _loading=true (line 59). build() then replaces the RefreshIndicator+CustomScrollView subtree with Center(CircularProgressIndicator) (lines 206-207), tearing down the list mid-gesture and, on completion, rebuilding the CustomScrollView from the top, discarding the scroll offset. Confirmed UX defect, minor.</sub>

---

### 99. Az ORSZÁG üres állapot tévesen ország beállítására szólít fel akkor is, ha az ország már be van állítva

**Hol:** [lib/screens/leaderboard_screen.dart:278](lib/screens/leaderboard_screen.dart#L278)

Az _emptyState a country scope-nál feltétel nélkül a 'Még nincs ország beállítva a fiókodon...' szöveget mutatja, kizárólag a _scope == LeaderboardScope.country alapján. A backend viszont ugyanígy üres results-ot ad vissza akkor is, ha az ország BE VAN állítva, de a felhasználónak 0 XP-je van és nincs XP-vel rendelkező honfitársa (all-time szűrő xp>0). A kliens nem különbözteti meg a 'nincs ország' és a 'van ország, de üres a lista' esetet, így tévesen az ország beállítására utasítja, ami már be van állítva. (Megjegyzés: jelenleg ezt a képernyőt a 94-es rank-parse hiba amúgy is elfedi.)

<sub>🔧 Technikai részlet: _emptyState (line 278) branches solely on scope==country and does not consult _own or any 'country set' signal. Backend returns results:[] both for no-country and for country-set-but-no-XP (all-time xp>0 filter), so the message wrongly tells a user with a country set to set one. Reachable once finding 94 is fixed; confirmed low-severity edge case.</sub>

---

### 100. A szerver hibauzenetei (detail) valtozatlanul, angolul jelennek meg a magyar UI-ban

**Hol:** [lib/screens/login_screen.dart:56](lib/screens/login_screen.dart#L56)

A login_screen.dart 56. soraban AuthException eseten kozvetlenul az e.message jelenik meg, amelyet az AuthService a backend `detail` mezojebol tolt fel (auth_service.dart:391). A backend login/register vegpontok ezt mindig angolul adjak vissza ('Invalid email or password', 'Email already registered', 'Valid email is required'). Amikor egy magyar nyelvu felhasznalo elrontja a jelszavat vagy mar letezo emaillel regisztral, a beviteli mezo alatt angol hibauzenet jelenik meg, miközben a kornyezo UI magyar. Nincs statuszkod-alapu lokalizacio, ellentetben pl. a reset_password kepernyovel.

<sub>🔧 Technikai részlet: Line 56 sets _error = e.message directly. AuthException.message is populated from the backend `detail` field (auth_service.dart:391), which the login/register routes return in English ('Invalid email or password' 401, 'Email already registered' 409, 'Valid email is required' 422). There is no status-code-to-Hungarian mapping here, so a Hungarian-locale user sees English error text amid otherwise-Hungarian UI in the most common failure flows.</sub>

---

### 101. Az Apple bejelentkezés nonce nélkül történik, gyengítve az identity-token visszajátszás elleni védelmet

**Hol:** [lib/screens/oauth_buttons.dart:39](lib/screens/oauth_buttons.dart#L39)

A 39. sori SignInWithApple.getAppleIDCredential hívás csak scopes paramétert ad meg, nonce-ot nem, és a nyers identityToken így megy tovább a /api/auth/oauth/apple végpontra. A backend (apps/web/lib/oauth.ts verifyIdToken és a route) sehol nem hivatkozik nonce-ra, tehát nincs kérésenkénti nonce-kötés vagy -ellenőrzés. Az ajánlott folyamat véletlen nonce-ot generál, annak SHA-256 hash-ét küldi, és a szerver ellenőrzi a token nonce claim-jét, hogy az adott bejelentkezéshez kösse. Enélkül egy elfogott/naplóban kiszivárgott identity token nem ellenőrizhető frissként. Alacsony súlyosság, mert csak külön token-kiszivárgási út mellett kihasználható.

<sub>🔧 Technikai részlet: SignInWithApple.getAppleIDCredential is called at line 39 with only scopes, no nonce. The raw identityToken is forwarded to /api/auth/oauth/apple, and the backend verifyIdToken (apps/web/lib/oauth.ts) plus the route handler contain no reference to 'nonce' at all (grep found none), so there is no per-request nonce binding or verification anywhere in the flow. The claim is factually accurate; impact is low because it only matters given a separate token-capture path, but the replay-hardening is genuinely absent.</sub>

---

### 102. A végső mentésnek nincs betöltő állapota vagy folyamatban-lévő védelme – a 'Mentsd a tervemet' gomb aktív marad, ismételt koppintás párhuzamos PATCH kéréseket indít

**Hol:** [lib/screens/onboarding_screen.dart:40](lib/screens/onboarding_screen.dart#L40)

Az utolsó lépésen a _next() szinkron módon meghívja a widget.onComplete-et (40. sor), ami az AuthGate-ben aszinkron és bevárja a saveOnboarding()-ot, de semmi nem állít be foglaltság-jelzőt. A 'Mentsd a tervemet' gomb (canContinue: true) végig aktív marad, így lassú hálózaton a felhasználó semmilyen visszajelzést nem kap, és ha újra koppint, minden koppintás egy újabb párhuzamos PATCH /api/me/onboarding kérést indít. Ugyanez igaz a demo képernyő onSaveProgress útjára is (668-671. sor).

<sub>🔧 Technikai részlet: On the reveal step canContinue is true (line 576) and the continue button stays enabled. _next() (last-step branch) synchronously calls widget.onComplete(_data) at line 40 and returns; AuthGate's onComplete (main.dart:170) is async and awaits _auth.saveOnboarding(). No busy/in-flight flag is set anywhere, so repeated taps of 'Mentsd a tervemet' each fire another PATCH /api/me/onboarding with no visual feedback. The demo path's onSaveProgress (lines 668-671) calls _next() the same way.</sub>

---

### 103. A proba CTA figyelmen kivul hagyja a valasztott csomagot, es a kisbetus szoveg mindig a havi arat irja

**Hol:** [lib/screens/paywall_screen.dart:347](lib/screens/paywall_screen.dart#L347)

Amig canTrial igaz, a kepernyo megjeleniti a Havi/Eves csomagvalasztot (alapertelmezetten az eves van kiemelve), de a _onPrimaryCta a startTrial()-t hivja (347. sor), ami nem kuld csomagot; a backend expliciten plan: null-t ment. A felhasznalo _plan valasztasa jelzes nelkul elveszik. Ezen felul a paywall.fineprint statikus szoveg mindig a '3 napos ingyenes proba utan 2 490 Ft / ho' havi arat irja, meg akkor is, ha az Eves csomag van kivalasztva.

<sub>🔧 Technikai részlet: While canTrial is true the screen still renders the Monthly/Yearly picker (default _plan='yearly', line 34) but _onPrimaryCta branches at line 347 to widget.auth.startTrial(), which sends no plan; the backend start-trial route explicitly stores plan: null. The user's _plan selection is silently discarded. Additionally paywall.fineprint (app_strings.dart:805-810) is a static string that always says '3-day free trial then 2 490 Ft / month', contradicting a Yearly selection. Both parts confirmed.</sub>

---

### 104. A 'Vasarlasok visszaallitasa' gomb semmilyen visszajelzest nem ad, ha a szerver szerint a felhasznalo meg mindig ingyenes

**Hol:** [lib/screens/paywall_screen.dart:380](lib/screens/paywall_screen.dart#L380)

A _onRestore lekeri a kanonikus elofizetest, majd csak akkor zarja be a paywallt, ha next.isPro igaz (380. sor). Ha a visszakapott elofizetes nem Pro (a leggyakoribb eset lejart vagy nemletezo elofizetesnel), nincs snackbar, nincs hibauzenet es semmilyen vizualis valtozas: a spinner felvillan, majd minden ugyanugy marad. A felhasznalo azt hiszi, hogy a gomb elromlott, es ismetelten nyomkodja.

<sub>🔧 Technikai részlet: _onRestore (line 369-386) calls getSubscription(), then at line 380 pops the paywall only if next.isPro. When the returned subscription is not Pro (expired sub, or a hopeful tap), there is no snackbar, no _error set, and no visible change beyond the _busy spinner toggling off in finally. The 'purchase_failed' message is only set on thrown exceptions (line 382). So a still-free user gets zero feedback and the button appears dead. Confirmed low-severity UX defect.</sub>

---

### 105. A _fmtMinutesH az angol 'h' óra-rövidítést használja magyar nyelven, ütközve a _fmtDuration 'ó/óra' formátumával ugyanazon a képernyőn

**Hol:** [lib/screens/progress_screen.dart:54](lib/screens/progress_screen.dart#L54)

A _fmtMinutesH magyar nyelven '${h}h' (53. sor) és '${h}h ${rem}p' (54. sor) formátumot ad vissza, keverve az angol 'h'-t a magyar 'p'-vel. Ugyanezen a képernyőn a _fmtDuration helyesen 'ó'/'óra' rövidítést használ (25-26. sor). Az AKTÍV IDŐ statisztika-hero így pl. '3h 25p'-t mutat, míg alatta egy edzés-sor '1ó 10p'-t — két különböző óra-rövidítés, az egyik angol, egyetlen képernyőn.

<sub>🔧 Technikai részlet: _fmtMinutesH returns '${h}h' (line 53) and, for Hungarian, '${h}h ${rem}p' (line 54) — mixing the English 'h' with the Hungarian 'p'. Meanwhile _fmtDuration uses Hungarian 'óra'/'ó' for HU (lines 25-26). The stat hero AKTÍV IDŐ (line 533 calls _fmtMinutesH) thus shows an English 'h' abbreviation inconsistent with the 'ó' shown in the session rows right below.</sub>

---

### 106. A _dateBucket a nyari idoszamitas valtasakor rosszul csoportositja a napokat

**Hol:** [lib/screens/progress_screen.dart:82](lib/screens/progress_screen.dart#L82)

A _dateBucket a today.difference(that).inDays kepletet hasznalja helyi ejfelekre epitett DateTime-okon. A tavaszi oraatallitas ejszakajan ket egymast koveto helyi ejfel kozott csak 23 ora telik el, igy az inDays 0-ra csonkolodik, es a tegnapi edzes a 'MA', a tegnapelotti a 'TEGNAP' csoportba kerul. A hiba evente ketszer, az oraatallitast koveto napon jelentkezik, ilyenkor minden friss edzes egy csoporttal frissebbnek latszik. Helyes megoldas a naptari napok osszehasonlitasa (mint az alatta levo ISO-heti isBefore ellenorzes).

<sub>🔧 Technikai részlet: `today` and `that` are built via DateTime(y,m,d) = local midnights. `today.difference(that).inDays` measures absolute elapsed time; across the EU spring-forward night two consecutive local midnights are only 23h apart, so inDays truncates 23h->0 and 47h->1. A session from the previous calendar day then buckets as 'today', two-days-ago as 'yesterday'. The sibling relativeDayLabel() in recent_pr.dart:124 has the identical flaw, confirming the pattern. Correct fix is date-only calendar-day counting (as the ISO-week isBefore check just below does). Reachable only around the twice-yearly DST switch, hence low.</sub>

---

### 107. A lehuzasos frissites nem mukodik Androidon rovid vagy ures listanal

**Hol:** [lib/screens/progress_screen.dart:323](lib/screens/progress_screen.dart#L323)

A RefreshIndicator olyan ListView-kat fog kozre (447, 708, 770 sor), amelyek nem allitjak be az AlwaysScrollableScrollPhysics-et. Androidon az alapertelmezett ClampingScrollPhysics nem fogadja el a huzast, ha a tartalom rovidebb a kepernyonel, ezert egy-ket edzesnel vagy az ures allapotoknal a lehuzasos frissites egyszeruen nem sul el, es nem jelenik meg a frissito animacio sem. A felhasznalo hiaba huzza le a listat, semmi nem tortenik; iOS-en a BouncingScrollPhysics miatt mukodik. Az ures allapotokban nincs Ujraprobalas gomb sem, igy a kepernyot el kell hagyni az ujratolteshez.

<sub>🔧 Technikai részlet: RefreshIndicator wraps ListViews at lines 447, 708 and the _message ListView at 770, none of which set physics: AlwaysScrollableScrollPhysics. On Android the default ClampingScrollPhysics refuses to accept a drag when minScrollExtent == maxScrollExtent (content shorter than viewport), so RefreshIndicator.onRefresh never fires for short lists and the empty/no-data states (which have no retry button). Confirmed, documented Flutter behavior; minor UX affordance loss with a workaround (re-entering the screen re-runs _load), hence low.</sub>

---

### 108. Az ExerciseProgressScreen csendben a teljes időszakra vált, ha a kiválasztott tartományban nincs adat, így a grafikon és a trend % ellentmond az aktív tartomány-chipnek

**Hol:** [lib/screens/progress_screen.dart:840](lib/screens/progress_screen.dart#L840)

A _filtered getter (840. sor) az f.isEmpty ? összes pont : f logikát használja, ezért ha a kiválasztott 1M/3M/6M/1Y ablakba egyetlen edzés sem esik, a teljes előzmény kerül kirajzolásra, miközben a szűk tartomány chipje aktív marad. A nagy aktuális érték, a trend százalék (849-851. sor) és a grafikon így az össz-időszaki adatot mutatja a kiválasztott tartomány címkéje alatt. A felhasználó pl. 3M-et választ egy 8 hónapja nem edzett gyakorlatnál, mégis a teljes 2 éves görbét és a teljes trendet látja.

<sub>🔧 Technikai részlet: _filtered returns f.isEmpty ? widget.history.points : f (line 840). When the selected 1M/3M/6M/1Y window contains no points, the full history is charted while the narrow-range chip stays visually active (line 963). The hero value (848), trend pct (849-851) and chart (846) then describe all-time data mislabelled as the selected range, with no fallback indicator. Reachable when an exercise was last trained outside the chosen window.</sub>

---

### 109. A gyakorlat-grafikon időtartomány-chipjei a nyers, lefordítatlan kulcsokat mutatják — a magyar felhasználó az angol 'All'-t (és '1Y'-t) látja

**Hol:** [lib/screens/progress_screen.dart:963](lib/screens/progress_screen.dart#L963)

A _ranges map kulcsait ('1M','3M','6M','1Y','All') a 963. sor közvetlenül Text(r)-rel rajzolja ki, fordítás nélkül. Az 'All' kemény-kódolt angol szöveg, miközben az Előzmények fül ugyanezt a fogalmat a t('progress.range_all') kulccsal 'MIND'-ként jeleníti meg. Így a magyar felhasználó a gyakorlat-grafikonon vegyes nyelvű, angol 'All' feliratot lát.

<sub>🔧 Technikai részlet: The _ranges map keys ('1M','3M','6M','1Y','All', lines 826-832) are rendered directly via Text(r) at line 963. 'All' is a hardcoded English user-facing string, whereas the History tab uses t('progress.range_all') which resolves to 'MIND' in Hungarian (app_strings.dart line 692). HU users see 'All' on the per-exercise chart, a mixed-language UI.</sub>

---

### 110. A jogi link snackbarja beleegetett angol '— coming soon' szoveget fuz a lefordItott (magyar) linkfelirat moge

**Hol:** [lib/screens/register_screen.dart:197](lib/screens/register_screen.dart#L197)

A show() a '$which — coming soon' szoveget epiti fel, ahol a 'which' a lokalizalt t('auth.terms_link')/t('auth.privacy_link'), de a 'coming soon' resz beleegetett angol szoveg (197. sor). Emiatt magyar nyelven a felhasznalo kevert nyelvu, nyelvtanilag hibas uzenetet lat, pl. 'Felhasznalasi felteteleket — coming soon'. Ez akkor jelentkezik, amikor a felhasznalo a regisztracios kepernyon a Felteteles vagy Adatvedelmi linkre koppint. Ezenfelul a linkek csak placeholder snackbart mutatnak, nincs mogottuk tenyleges jogi dokumentum egy megfelelosegi feluleten.

<sub>🔧 Technikai részlet: Line 197 builds Text('$which — coming soon') where 'which' is the localized t('auth.terms_link')/t('auth.privacy_link') but 'coming soon' is a hardcoded English literal. A Hungarian-locale user tapping the terms link sees a mixed-language, grammatically broken snackbar. The links are also placeholder dead-ends on a compliance surface.</sub>

---

### 111. A Terms/Privacy linkek TapGestureRecognizer objektumai minden build-nel ujra letrejonnek es soha nincsenek felszabaditva

**Hol:** [lib/screens/register_screen.dart:213](lib/screens/register_screen.dart#L213)

A _LegalNote egy StatelessWidget, amelynek build metodusa minden ujrarajzolaskor ket uj _LinkTap (TapGestureRecognizer) peldanyt hoz letre a 213. es 220. sorban, es ezeket soha nem szabaditja fel dispose() hivassal. A Flutter szerzodese szerint a TextSpan-hoz kotott recognizert a tulajdonosanak kell felszabaditania (jellemzoen egy State objektumban). Mivel a RegisterScreen minden setState-nel (hiba/toltes allapot) es nyelvvaltasnal ujrarajzol, a recognizer peldanyok felhalmozodnak a kepernyo eletciklusa alatt. Enyhe memoriaszivargas, a felhasznalo kozvetlenul nem lat belole semmit.

<sub>🔧 Technikai részlet: _LegalNote is a StatelessWidget (line 190). Its build() creates two _LinkTap instances (subclasses of TapGestureRecognizer) at lines 213 and 220 on every rebuild, and there is no State object or dispose() call to release them. Flutter's documented contract requires the owner of a recognizer attached to a TextSpan to dispose it. Because RegisterScreen rebuilds on every setState (_error/_loading) and language toggle, recognizer objects accumulate undisposed. Real but minor leak.</sub>

---

### 112. _openCreate/_openGenerator await után mounted-ellenőrzés nélkül hívja _load()-ot, amelynek első setState-je őrizetlen — setState-after-dispose összeomlás

**Hol:** [lib/screens/trainings_list_screen.dart:124](lib/screens/trainings_list_screen.dart#L124)

Az await Navigator.push után az _openCreate (124. sor) és _openGenerator (135. sor) mounted-ellenőrzés nélkül hívja _load()-ot, amelynek első setState-je (85. sor) szintén nincs mounted-tel őrizve — szemben a testvér _openTraining-gel (157. sor), amely helyesen if (mounted)-del véd. A main.dart alapján ha a session lejár és _user null lesz, a build a MainShell helyett a WelcomeScreen-t adja vissza (194. vs 199. sor), így a TrainingsListScreen felszabadul még a felnyitott generátor-útvonal alatt is. A generátor true-val visszatérve setState-et hív egy már megszűnt State-en, ami debugban FlutterError, release-ben null-check crash.

<sub>🔧 Technikai részlet: Confirmed present: line 85 setState in _load has no mounted guard (only the later setState calls at 100/108/110/114 do), and callers at 124/135 invoke _load() without a mounted check, unlike _openTraining at 157. main.dart:167-194 shows that _user going null swaps MainShell for WelcomeScreen, disposing this screen; if that happens while the pushed route is up, popping true triggers setState on a disposed State. Edge-case reachability but the defect is objectively in the code.</sub>

---

### 113. A 'legutóbb végezve' adat névre, nem trainingId-re illeszt, így átnevezés után hibás NEW jelvény és közös előzmény

**Hol:** [lib/screens/trainings_list_screen.dart:218](lib/screens/trainings_list_screen.dart#L218)

A _lastPerformedFor() a WorkoutSession-t a SavedTraining-hez kis-nagybetűt figyelmen kívül hagyó névösszehasonlítással párosítja (218. sor). A backend eltárolja a trainingId-t (apps/web/app/api/sessions/route.ts 60. sor), de a WorkoutSession.fromJson az api_models.dart-ban (184-192. sor) egyáltalán nem olvassa ki a trainingId mezőt, ezért marad a törékeny névheurisztika. Átnevezés után az összes korábbi munkamenet illesztése megszűnik, így a kártya a 'LAST …' helyett a 'NEW' jelvényt mutatja; két azonos nevű edzés pedig ugyanazt az előzményt osztja meg.

<sub>🔧 Technikai részlet: Confirmed: line 218 compares s.name to t.name (trimmed, lowercased). WorkoutSession.fromJson (api_models.dart:184-192) parses only _id, name, startedAt, finishedAt, exercises — never trainingId, though the backend stores it (sessions/route.ts:60). After a rename no session name matches, so _lastPerformedFor returns null and _MetaRow shows new_badge. Low severity edge case, but real.</sub>

---

### 114. A lehúzásos frissítés hibái csendben elnyelődnek, ha már van betöltött adat — a felhasználó elavult listát lát visszajelzés nélkül

**Hol:** [lib/screens/trainings_list_screen.dart:589](lib/screens/trainings_list_screen.dart#L589)

A _load() a hibát az _error mezőbe menti (107-112. sor), de a hibafelület csak akkor jelenik meg, ha _error != null ÉS _trainings.isEmpty (589. sor). Ha a lista már fel van töltve és egy frissítés meghiúsul (szerver leáll, token lejár), a RefreshIndicator pörgője egyszerűen eltűnik: nincs snackbar, nincs banner, és az elavult lista marad. A másodlagos getSessions hívás hibái (93-94. sor) szintén csendben elnyelődnek, így a 'LAST …' címkék is elavultak maradhatnak.

<sub>🔧 Technikai részlet: Confirmed: _error is set at 108/111 but the error sliver is gated on `_error != null && _trainings.isEmpty` (line 589). With a non-empty list, a failed pull-to-refresh sets _error, _loading returns false, and _content() renders the stale list with no snackbar/banner. getSessions failures are swallowed by the empty catch at line 94. Minor UX defect but real.</sub>

---

### 115. _openDayPicker: hianyzo mounted-ellenorzes a showModalBottomSheet await utan

**Hol:** [lib/screens/weekly_plan_edit_screen.dart:183](lib/screens/weekly_plan_edit_screen.dart#L183)

A _openDayPicker metodusban a `await showModalBottomSheet(...)` utan a `setState`-et (183. sor) nem elozi meg `if (!mounted) return;` ellenorzes, mikozben a testver _save() metodus minden await utani setState-et mounted-tel ved. A hiba akkor jelentkezik, ha a kepernyo State-je megsemmisul (pl. token-lejarat miatti navigacios verem-reset), miközben a bottom sheet meg nyitva van, es a sheet ezutan nem-null erteket ad vissza. Ilyenkor a setState() a dispose() utan hivodik meg, ami 'setState() called after dispose()' FlutterError-t dob. Ritka edge-case, ezert alacsony sulyossagu.

<sub>🔧 Technikai részlet: In _openDayPicker, after `await showModalBottomSheet<_DayPlan>(...)` (lines 170-181), the code does `if (picked != null) { setState(...) }` at lines 182-183 with no `if (!mounted) return;` guard. The sibling _save() method guards every post-await setState with `mounted` (lines 245, 249, 251, 253), confirming this is the codebase's own convention and it is violated here. If the State is disposed while the sheet is open and the sheet then returns a non-null value, setState() would be called after dispose(), throwing a FlutterError. Reachable but requires a programmatic navigator-stack reset while the modal is open, so severity is low.</sub>

---

### 116. _pickTime: hianyzo mounted-ellenorzes a showTimePicker await utan

**Hol:** [lib/screens/weekly_plan_edit_screen.dart:206](lib/screens/weekly_plan_edit_screen.dart#L206)

A _pickTime metodusban a 206. soron a `setState(() => _reminderTime = picked)` kozvetlenul a `await showTimePicker(...)` utan fut, mounted-ellenorzes nelkul. Ugyanaz a lifecycle-veszely, mint a _openDayPicker eseteben, de ez egy kulon kodhely (masik metodus), ezert nem duplikatum. Ha a State megsemmisul, mikozben az idovalaszto dialogus nyitva van, es a dialogus nem-null erteket ad vissza, a setState() a dispose() utan hivodik meg es FlutterError-t dob. Alacsony sulyossagu, mert csak ritka navigacios verem-reset eseten reprodukalhato.

<sub>🔧 Technikai részlet: In _pickTime, line 206 does `if (picked != null) setState(() => _reminderTime = picked);` directly after `await showTimePicker(...)` (lines 192-205) with no mounted guard. This is a distinct code site from finding 71 (a different method), so it is not a duplicate. Same lifecycle hazard: if the State is disposed while the time-picker dialog is open and the dialog returns a non-null time, setState() runs on a disposed State and throws. Low severity for the same reachability reason.</sub>

---

### 117. Szett hozzáadása HYROX állomáshoz csak kg/reps-t másol, cél-adatok nélküli hibás sort hoz létre

**Hol:** [lib/screens/workout_screen.dart:551](lib/screens/workout_screen.dart#L551)

A _addSet mindig csak kg és reps mezővel hozza létre az új WorkoutSet-et, az állomás-mezőket (distanceM, seconds, targetKg) nem másolja át, pedig a + gomb az állomás-oldalakon is megjelenik. 'time' metrikájú állomáson az új sor teljesen inert lesz: nincs szerkeszthető mező, a cél '–', csak a kész-kör látszik; 'pace' állomáson a céltempó '–' lesz a valós 2:05/km helyett; distance_weight/reps_weight esetén eltűnik az előírt terhelés chip. A felhasználó egy extra intervallum rögzítésekor üres, cél nélküli sort kap.

<sub>🔧 Technikai részlet: _addSet (548-555) always creates WorkoutSet(kg: last?.kg, reps: last?.reps) and never copies distanceM/seconds/targetKg. The add button is rendered on every exercise page including stations (line 1030). For a 'time' station _stationSlots left = _targetChip(_fmtClock(seconds)) which is '–' with no editable field and right = SizedBox (1302-1303,1336) → completely inert row. For 'pace' the target chip _fmtPace(seconds) shows '–' (1334). For distance_weight/reps_weight the target load chip becomes SizedBox because targetKg is null (1330-1332). Confirmed degenerate rows.</sub>

---

### 118. A gyakorlat törlése nem menti újra a helyi haladást, így az elmentett done-jelzők elcsúsznak

**Hol:** [lib/screens/workout_screen.dart:739](lib/screens/workout_screen.dart#L739)

A _deleteExercise csak a _scheduleSave()-et hívja (backend mentés), a _saveProgress()-t nem, ellentétben az _addSet és _removeSet metódusokkal. A helyi haladás done-mátrixa pozíció (index) szerint tárolódik és úgy is töltődik vissza, ezért egy gyakorlat törlése után a mentett sorok elcsúsznak. A hiba akkor jelentkezik, ha a felhasználó töröl egy gyakorlatot, majd az operációs rendszer bezárja az appot bármilyen további szett-váltás előtt: újranyitáskor a törölt gyakorlat done-jelzői rossz gyakorlatra kerülnek (pl. B gyakorlaton kész szettek jelennek meg, amiket a felhasználó nem csinált). Sima kilépésnél a kód újraementi a haladást, ezért csak ritka, kill-alapú eset.

<sub>🔧 Technikai részlet: _deleteExercise (725-740) only calls _scheduleSave() at line 739 (backend PATCH via _save, which never touches WorkoutProgressStore), whereas _addSet (554) and _removeSet (561) also call _saveProgress(). WorkoutProgressStore.save writes a positional done matrix (workout_progress.dart:71-72) and _initProgress re-applies it by index (108-116) with only a length guard, no reordering guard. So after a delete the stored matrix is stale. Normal graceful exits re-save (_exit line 335, onToggleDone line 1011), but if the OS kills the app before any further set toggle/add/remove, the stale flags are applied to the wrong exercises on reopen. Real but edge-case bug.</sub>

---

### 119. A gyakorlat sorokon lévő chevron ikonnak nincs kattintáskezelője

**Hol:** [lib/screens/workout_summary_screen.dart:263](lib/screens/workout_summary_screen.dart#L263)

A _exerciseRow minden sor végére kirak egy Icons.chevron_right ikont (263. sor), ami a szokásos 'koppints a részletekért' jelzés, de a sor egy sima Container GestureDetector/InkWell és onTap nélkül. A felhasználó rákoppint a gyakorlat sorára, hogy lássa a szettenkénti bontást vagy előzményt, de semmi nem történik – a képernyő így hibásnak tűnik.

<sub>🔧 Technikai részlet: _exerciseRow renders a trailing Icons.chevron_right (line 263), the standard 'tap for detail' affordance, but the row is a plain Container inside a Row with no GestureDetector/InkWell and no onTap anywhere in the widget or its ancestors on this screen. Tapping the row does nothing.</sub>

---

### 120. Az auth tartalék hibaüzenetek keverten magyarul és angolul jelennek meg, a nyelvtől függetlenül

**Hol:** [lib/services/auth_service.dart:391](lib/services/auth_service.dart#L391)

Amikor a backend nem küld 'detail' mezőt, az AuthException beégetett tartalék szövegeket dob, amelyek következetlenül lokalizáltak: egyes helyeken magyarul ('Hiba történt', 'Mentés sikertelen'), máshol angolul ('Purchase failed', 'Request failed'). Egyik sem megy át az AppStrings-en, pedig az app támogatja az angol (alap) és magyar nyelvet. Így egy angol nyelvre állított felhasználó bejelentkezési hibánál magyar 'Hiba történt' üzenetet lát, miközben egy vásárlási hiba angolul jelenik meg — a hibaüzenet nyelve a hívástól függ, nem a beállított nyelvtől.

<sub>🔧 Technikai részlet: The AuthException fallback strings are hardcoded and inconsistently localized: Hungarian in _authPost/_patchMe/requestPasswordReset ('Hiba történt' at 391/373/63), _patchMeUser ('Mentés sikertelen' 144), saveOnboarding (110), generateTrainingPlan (283); but English in startTrial (186), purchase (223), cancelSubscription (248), deleteAccount (354), _get ('Request failed' 426). None go through AppStrings. The app supports en (default) and hu locales (i18n/app_strings.dart), so an English-locale user can see Hungarian error text and vice versa depending on which call failed.</sub>

---

### 121. A 'legritkabb edzesnap' megfigyeles figyelmen kivul hagyja a nulla edzeses napokat, rossz napot nevezhet meg

**Hol:** [lib/utils/insights.dart:81](lib/utils/insights.dart#L81)

A byWeekday map csak azokat a napokat tartalmazza, amelyeken volt legalabb egy edzes, ezert a sorted.last a legkevesbe edzett *edzett* napot valasztja ki (erteke 1). A feltetel (bottom.value<=1 es legalabb 4 kulonbozo edzett nap) mellett akar 3 nap is lehet nulla edzessel. Igy a chip egy 1-edzeses napot jelol 'A LEGRITKABB'-kent, holott mas napokon 0 edzes volt (pl. 'HETFON A LEGRITKABB', mikozben pentek/szombat/vasarnap ures).

<sub>🔧 Technikai részlet: byWeekday only contains weekdays with >=1 session (lines 56-58), so sorted.last is the least-frequent TRAINED day (value==1 given the map min is 1). The guard bottom.value<=1 && sorted.length>=4 only requires 4 distinct trained weekdays, leaving up to 3 weekdays with zero sessions. The chip then labels a 1-session day as 'A LEGRITKABB' while never-trained days have 0, which is factually wrong.</sub>

---

### 122. A súlytárcsa-kalkulátor angol szavakat kever a magyar felületbe ('bar', 'closest achievable')

**Hol:** [lib/utils/plates.dart:108](lib/utils/plates.dart#L108)

A plates.dart renderelő segédfüggvényei fix angol szövegeket adnak vissza: a formatEquation és formatBarDiagram a 'bar' szót (93. és 102. sor), a closestNote pedig a 'closest achievable: ...kg' feliratot (108. sor) — ezek nincsenek lokalizálva. A plate_calculator_sheet.dart ezeket a magyar feliratok (pl. 'a rúd súlya alatt van', 'Minimum: ...kg (üres rúd)') mellett jeleníti meg. Amikor a felhasználó egy nem pontosan kirakható súlyra (pl. 98 kg) nyitja meg a kalkulátort, vegyes nyelvű kimenetet lát: az egyenletben 'bar', a megjegyzésben pedig teljesen angolul 'closest achievable: 97.5kg' szerepel a magyar felületen belül. Kizárólag megjelenítési (kozmetikai) hiba, működést nem érint.

<sub>🔧 Technikai részlet: Confirmed. plates.dart hardcodes English words that are not routed through any localization layer: 'bar' in formatEquation (line 93) and formatBarDiagram (line 102), and 'closest achievable: ...kg' in closestNote (line 108). plate_calculator_sheet.dart renders these (formatEquation at line 66, formatBarDiagram at line 75, note at line 83) directly alongside Hungarian text such as 'a rúd súlya alatt van', 'Minimum: ...kg (üres rúd)' (lines 58-64). For a non-exact weight the user therefore sees an equation containing 'bar' and a fully English note 'closest achievable: 97.5kg' inside an otherwise Hungarian sheet. It is a genuine, unconditional i18n inconsistency, though purely cosmetic (no functional/data impact), hence low severity.</sub>

---

### 123. A relativeDayLabel a tavaszi oraatallitas utani napon a 'tegnapi' PR-t 'ma'-kent jelolheti

**Hol:** [lib/utils/recent_pr.dart:124](lib/utils/recent_pr.dart#L124)

A hiba a 124. sorban van: a today es that helyi ejfelek, es a today.difference(that).inDays a valos eltelt idot szamolja. A tavaszi oraatallitas (spring-forward) napjan az adott nap csak 23 oras, igy ket egymast koveto helyi ejfel kulonbsege 23 ora, amit az inDays 0 napra csonkol. Ekkor a fuggveny a diff <= 0 aggal a 'date.today' szoveget adja vissza a valojaban tegnapi PR-hez. A felhasznalo a tavaszi oraatallitas napjan beallitott PR-t a kovetkezo reggel 'MA' cimkevel latja 'TEGNAP' helyett. Evente egyszer, DST-t hasznalo idozonaban jelentkezik.

<sub>🔧 Technikai részlet: today and that are local midnights built via the DateTime(y,m,d) constructor. Dart's DateTime.difference returns true elapsed time, so across a spring-forward DST transition two consecutive local midnights are only 23h apart; Duration.inDays truncates that to 0. diff==0 then falls into the 'if (diff <= 0) return t(date.today)' branch at line 125, labeling a yesterday PR as 'today'. Reachable once per year in any DST locale. Genuine but low-impact cosmetic date-label bug.</sub>

---

### 124. Az izomdiagram segédszövege ('OPTIMÁLIS' / '{n} A CÉLIG') keményen kódolt magyar

**Hol:** [lib/widgets/muscle_heatmap.dart:110](lib/widgets/muscle_heatmap.dart#L110)

A 110. sorban a segédszöveg ('OPTIMÁLIS' vagy '{n} A CÉLIG'), illetve a 130. sorban a '$sets SET' felirat közvetlenül, keményen kódolt magyar szövegként épül fel, nem a t() fordítási rétegen keresztül. Az alkalmazás alapértelmezett nyelve angol (i18n/app_strings.dart), és a diagram fejléce már lokalizált. Angol nyelvre állított felhasználó esetén a sorok lábában magyarul jelenik meg az 'OPTIMÁLIS'/'n A CÉLIG', miközben a képernyő többi része angol – kevert nyelvű felület.

<sub>🔧 Technikai részlet: Line 110 builds hint = sets >= mav ? 'OPTIMÁLIS' : '${mav - sets} A CÉLIG' as literal Hungarian, and line 130 renders '$sets SET' — neither goes through the t() i18n layer. The app has a real i18n system (i18n/app_strings.dart with t(), default language English, supports en/hu) and the calendar heading at calendar_screen.dart:729 uses t('calendar.muscles_this_month_caps'). So an English-default user sees a localized English heading with Hungarian 'OPTIMÁLIS'/'6 A CÉLIG' footers. Real but cosmetic.</sub>

---

### 125. A RankCard beégetett magyar feliratokat használ a t() i18n rendszer helyett

**Hol:** [lib/widgets/rank_card.dart:102](lib/widgets/rank_card.dart#L102)

A rang-kártya a maximális rang feliratát ('CAP ELÉRVE — LEGENDÁS', 102. sor) és a chip 'RANG' címkéjét (138. sor) beégetett magyar szövegként jeleníti meg, nem a t() fordítórendszeren keresztül. A hiba akkor jelentkezik, amikor a felhasználó angol nyelvre állította az appot: az account_screen a t() segítségével angolul jeleníti meg a rang szekció fejlécét, közvetlenül alatta viszont a kártya magyarul írja ki a 'CAP ELÉRVE — LEGENDÁS' és 'RANG' szövegeket. A felhasználó vegyes nyelvű felületet lát.

<sub>🔧 Technikai részlet: The app has a working i18n system (lib/i18n/app_strings.dart with t(), default locale 'en'), and account_screen.dart localizes its rank section via t(). But rank_card.dart line 102 renders the literal 'CAP ELÉRVE — LEGENDÁS' and line 138 renders 'RANG', both hardcoded Hungarian not routed through t(). An English-language user sees these Hungarian strings.</sub>

---

### 126. A rang-emelkedés overlay kevert nyelvű: keményen kódolt angol ('NEW RANK') és magyar ('TOVÁBB') felirat, egyik sincs lokalizálva

**Hol:** [lib/widgets/rank_up_overlay.dart:53](lib/widgets/rank_up_overlay.dart#L53)

A rang-emelkedés ünneplő képernyőjén a felső fejléc az angol 'NEW RANK' literál (53. sor), az elutasító gomb pedig a magyar 'TOVÁBB' literál (119. sor). Egyik sem megy át a t() lokalizációs függvényen, pedig az app támogatja mind az angol (alapértelmezett), mind a magyar nyelvet. Így a felhasználó a beállított nyelvtől függetlenül kevert nyelvű képernyőt lát: angol nyelvnél a 'TOVÁBB', magyar nyelvnél a 'NEW RANK' jelenik meg. Akkor jelentkezik, amikor edzés mentése után a felhasználó új rangküszöböt lép át.

<sub>🔧 Technikai részlet: The header label at line 53 is the English literal 'NEW RANK' and the dismiss button at line 119 is the Hungarian literal 'TOVÁBB'. Neither passes through the app's t() localization helper (lib/i18n/app_strings.dart defines t() and supports both 'en' default and 'hu'). So regardless of the selected language, the celebration screen mixes English and Hungarian: an English user sees 'TOVÁBB', a Hungarian user sees 'NEW RANK'.</sub>

---

### 127. A szerkesztő sheet megerősítés nélkül eldobja a nem mentett destruktív módosításokat, ha lehúzással vagy háttér-koppintással bezárják

**Hol:** [lib/widgets/training_actions.dart:202](lib/widgets/training_actions.dart#L202)

A _showEditSheet (202) showModalBottomSheet-et használ alapértelmezett isDismissible/enableDrag mellett, és a _EditTrainingSheet a munkamásolatot lokális state-ben tartja (_exercises = List.of(...), a név controller). A gyakorlat eltávolítása egyetlen koppintás, visszavonás nélkül (388-389), és nincs nem-mentett-változás védelem (PopScope/onWillPop): a sheet lehúzása vagy a háttérre koppintás némán eldobja az átírt nevet és minden törlést. Egy tévedésből eltávolított gyakorlat sem tehető vissza másképp, csak az egész bezárásával és minden más elvesztésével. A felhasználó észrevétlenül elveszti a módosításait.

<sub>🔧 Technikai részlet: Confirmed: showModalBottomSheet at line 202 has no isDismissible:false and the widget has no PopScope/onWillPop guard, while edits live in local state (_exercises line 224, _name line 222) with one-tap no-undo removal (lines 388-389). Barrier tap / drag dismiss silently discards all unsaved edits. Genuine but low-severity UX defect.</sub>

---

### 128. A szerkesztő mentés kihagyja a metric/stationKey/note és szettenkénti HYROX mezőket, amelyeket a backend PATCH nullra állít – egy egyszerű átnevezés letörli őket

**Hol:** [lib/widgets/training_actions.dart:250](lib/widgets/training_actions.dart#L250)

A _save minden gyakorlatot csak {exerciseId, name, gifUrl, targetMuscles, category, progressionStrategy, sets:[{kg,reps}]} formában sorosít (250-260). A backend PATCH (apps/web/app/api/trainings/[id]/route.ts) a teljes exercises tömböt lecseréli a mapExercises-en át (apps/web/lib/trainings.ts), amely a hiányzó mezőket nullra/alapértékre állítja: metric→null, stationKey→null, note→null, restSeconds→null, zone→null, szettenként distanceM/seconds/targetKg→null, done→false. A workout_screen.dart _save (256-259) szándékosan visszaküldi a metric/stationKey/note mezőket, hogy a mentés ne törölje a stationöket – ez a sheet nem, ez egy divergencia. Egy note-ot vagy HYROX metaadatot hordozó edzés puszta átnevezése vagy egy gyakorlat törlése itt véglegesen letörli ezeket az adatokat. Jelenleg a showTrainingActions csak a strength listákról/dashboardról érhető el (hyrox kizárva), ezért ma a legtöbb elérhető sor e mezői null-ok – emiatt latens/alacsony súlyú, de a kód valóban strippel.

<sub>🔧 Technikai részlet: Confirmed at code level: mapExercises in apps/web/lib/trainings.ts sets absent metric/stationKey/note/restSeconds/zone to null and per-set distanceM/seconds/targetKg to null, done→false; PATCH replaces the whole array (findByIdAndUpdate with update.exercises). The sheet's payload (lines 250-260) omits all of these, unlike workout_screen.dart which round-trips them. SavedExercise/SavedSet models do carry these fields (api_models.dart:133-135, 210-212). Real data-stripping divergence; low because the reachable strength/dashboard rows currently usually have these null (latent).</sub>

---

### 129. A hőtérkép cellák dátumai Duration alapú összeadással számolódnak, ami egy őszi óraátállítás (DST fall-back) után egy nappal elcsúsznak, ha az év helyi nyári időben kezdődik

**Hol:** [lib/widgets/yearly_heatmap.dart:113](lib/widgets/yearly_heatmap.dart#L113)

A cellaDátum a gridStart.add(Duration(days: w*7+dow)) abszolút időtartam-aritmetikával számolódik a helyi éjféli rácskezdetből. Dartban a DateTime.add abszolút (UTC-alapú) mikroszekundumokat ad hozzá, így egy DST átállásnál a fali óra eltolódik. Északi féltekén az év első átállása tavaszi előreállítás (+1h, ugyanaz a naptári nap marad 01:00-kor), ezért a kulcsok jók maradnak; déli féltekén (pl. Australia/Sydney, ahol januárban van a nyári idő) az első átállás visszaállítás, ami után minden számított cella az előző nap 23:00-jára esik, így a DateTime(...,day) egy nappal korábbi napot ad. Ettől a ponttól a következő tavaszi átállásig minden cella rossz dátumot kulcsol: az edzések egy cellával korábban (rossz nap/oszlop) jelennek meg.

<sub>🔧 Technikai részlet: Dart's DateTime.add adds absolute microseconds; across a fall-back DST transition the local wall clock of a midnight-anchored gridStart shifts to 23:00 of the prior day, so DateTime(cellDate.year,month,day) at lines 123-124 keys the wrong day. Reachable for any user in a southern-hemisphere DST zone (Sydney: DST ends early April, resumes October), matching the described shift window. Northern-hemisphere zones start in standard time so the first transition is spring-forward and keys stay correct. Genuine but edge-case, hence low.</sub>

---

### 130. Az éves hőtérkép jelmagyarázata ('KEVÉS'/'SOK') és a hónapkezdőbetűk fixen magyarul vannak, figyelmen kívül hagyva az angol alapértelmezett nyelvet

**Hol:** [lib/widgets/yearly_heatmap.dart:149](lib/widgets/yearly_heatmap.dart#L149)

A widget a 'KEVÉS' (149. sor) és 'SOK' (171. sor) feliratokat, valamint a hónaposzlopok kezdőbetűit (_kMonthsShort, 194-196. sor: 'Á' áprilisra, 'SZ' szeptemberre) fordítási kulcsok helyett fix magyar konstansként tartalmazza. Az AppStrings i18n rendszer (t(...)) alapértelmezése angol, és a naptár képernyő minden más szövege ezen keresztül lokalizált. Angol nyelvű felhasználó az éves aktivitási hőtérképen magyar 'KEVÉS … SOK' jelmagyarázatot és magyar hónapkezdőbetűket lát, miközben a körülötte lévő címek angolul jelennek meg.

<sub>🔧 Technikai részlet: Lines 149/171 hardcode 'KEVÉS'/'SOK' and lines 194-196 hardcode Hungarian month initials, all const. calendar_screen.dart localizes everything else via t(...) (e.g. lines 172, 316), and AppStrings defaults to 'en' (app_strings.dart), so English users see Hungarian text here.</sub>

---

## ❔ Bizonytalan (1) – emberi megerősítést igényel

### 131. Keresessel hozzaadott gyakorlatok ures targetMuscles ertekkel menthetok, mert a kereso vegpont minimalis adatot ad vissza

**Hol:** [lib/screens/create_training_screen.dart:132](lib/screens/create_training_screen.dart#L132) · Súly (becsült): Közepes

A jelzes szerint a kulso /api/v1/exercises/search vegpont csak exerciseId, gifUrl es name mezoket ad vissza, igy az izom-metaadat elveszik keresessel hozzaadott gyakorlatoknal, es a reszletlap is ures marad, mert a _showDetails nem tolti ujra id alapjan a gyakorlatot. A kod ezzel osszhangban van (ures listakra esik vissza, es a mentes az ures targetMuscles-t kuldi), de a hiba fennallasa kizarolag a kulso katalogus-API valaszatol fugg, amit a kodbol nem lehet ellenorizni. Ezert bizonytalan; a valaszsemat elo futtatassal kellene igazolni.

<sub>🔧 Technikai részlet: The claim depends entirely on the external gym-exercise-api /api/v1/exercises/search response shape, which is not in this repo and cannot be inspected from code. The code side is consistent with the claim: searchExercises maps json['data'] via ApiExercise.fromJson, which defaults targetMuscles/bodyParts/equipments/instructions to [] when absent; _showDetails (line 265) renders _ExerciseDetailSheet from the in-memory object with no refetch-by-id (unlike exercise_sheets.dart _ExerciseInfoSheet which calls getExercise at line 67); and _save (lines 293-300) serializes whatever targetMuscles the object holds. So IF search truly returns a minimal shape the defect is real, but that is a live-backend fact I cannot verify.</sub>

---


## Módszertan

- **Fájlcsoport-reviewerek:** 14 ügynök, minden képernyőt / service-t / modellt / widgetet teljesen elolvasva.
- **Keresztmetszeti dimenziók:** async/lifecycle, mobil↔backend API-szerződés, JSON-parsolás és null-biztonság, i18n, biztonság, domain-matematika és dátumlogika.
- **Ellenőrzés:** minden nyers találatot fájlonként kötegelt, szkeptikus ügynök vizsgált felül a kód (és a kapcsolódó backend route-ok) alapján; a duplikátumokat és cáfoltakat kiszűrtük.
- **Nyers találat:** 159 → duplikátum: 29 → **megerősített: 130**.
- A `flutter analyze` tiszta, tehát ezek a hibák a statikus elemzőn túli, logikai/futásidejű problémák.
