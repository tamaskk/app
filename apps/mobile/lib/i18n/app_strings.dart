import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// App-wide i18n singleton.
///
/// Default language is English. Persists the user's pick in
/// SharedPreferences so the next launch boots straight into the chosen
/// language. The instance is a [ChangeNotifier]: the root `MaterialApp` is
/// wrapped in an [AnimatedBuilder] that listens to it, so toggling the
/// language rebuilds every screen in one frame.
class AppStrings extends ChangeNotifier {
  AppStrings._();
  static final AppStrings instance = AppStrings._();

  static const _storageKey = 'app_language';

  // Default to English per product decision.
  String _lang = 'en';
  String get lang => _lang;
  bool get isHu => _lang == 'hu';
  bool get isEn => _lang == 'en';

  /// Read the persisted choice on app launch. Best-effort — if the prefs
  /// read fails for any reason the app stays at the default ('en') without
  /// blocking the splash.
  Future<void> load() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final stored = prefs.getString(_storageKey);
      if (stored == 'hu' || stored == 'en') {
        _lang = stored!;
        notifyListeners();
      }
    } catch (_) {
      // Stay on default.
    }
  }

  Future<void> setLang(String lang) async {
    if (lang != 'en' && lang != 'hu') return;
    if (_lang == lang) return;
    _lang = lang;
    notifyListeners();
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_storageKey, lang);
    } catch (_) {
      // Even if persistence fails the in-memory switch still applies for
      // this session.
    }
  }

  /// Lookup. Falls back to English, then to the raw key — missing strings
  /// surface visibly during development but never crash the UI.
  String t(String key) {
    final pair = _dict[key];
    if (pair == null) return key;
    return pair[_lang] ?? pair['en'] ?? key;
  }

  // ---------------------------------------------------------------------
  // Translation dictionary
  // ---------------------------------------------------------------------
  //
  // Keys are namespaced by area (common, auth, account, dashboard, etc.)
  // so additions don't collide. English is the canonical source; Hungarian
  // is the localisation. If a key is missing from the Hungarian map the
  // English text is used as the fallback — never empty.
  static const Map<String, Map<String, String>> _dict = {
    // ----- Common (buttons, generic labels, snacks) -----
    'common.save': {'en': 'Save', 'hu': 'Mentés'},
    'common.cancel': {'en': 'Cancel', 'hu': 'Mégse'},
    'common.done': {'en': 'Done', 'hu': 'Kész'},
    'common.delete': {'en': 'Delete', 'hu': 'Törlés'},
    'common.edit': {'en': 'Edit', 'hu': 'Szerkesztés'},
    'common.add': {'en': 'Add', 'hu': 'Hozzáad'},
    'common.back': {'en': 'Back', 'hu': 'Vissza'},
    'common.next': {'en': 'Next', 'hu': 'Tovább'},
    'common.continue': {'en': 'Continue', 'hu': 'Folytatás'},
    'common.search': {'en': 'Search', 'hu': 'Keresés'},
    'common.retry': {'en': 'Retry', 'hu': 'Újra'},
    'common.loading': {'en': 'Loading…', 'hu': 'Betöltés…'},
    'common.error': {'en': 'Something went wrong.', 'hu': 'Valami hiba történt.'},
    'common.no_results': {'en': 'No results', 'hu': 'Nincs találat'},
    'common.optional': {'en': 'optional', 'hu': 'opcionális'},
    'common.reset': {'en': 'Reset', 'hu': 'Alaphelyzet'},
    'common.close': {'en': 'Close', 'hu': 'Bezár'},
    'common.confirm': {'en': 'Confirm', 'hu': 'Megerősítés'},
    'common.yes': {'en': 'Yes', 'hu': 'Igen'},
    'common.no': {'en': 'No', 'hu': 'Nem'},
    'common.kg': {'en': 'kg', 'hu': 'kg'},
    'common.reps': {'en': 'reps', 'hu': 'ism'},
    'common.sets': {'en': 'sets', 'hu': 'szett'},
    'common.set': {'en': 'set', 'hu': 'szett'},
    'common.exercises': {'en': 'exercises', 'hu': 'gyakorlat'},
    'common.exercise': {'en': 'exercise', 'hu': 'gyakorlat'},

    // ----- Workout player -----
    'workout.save_failed': {
      'en': 'Couldn’t save the workout. Check your connection and try again.',
      'hu': 'Nem sikerült menteni az edzést. Ellenőrizd a kapcsolatot, és próbáld újra.',
    },
    'workout.rest_over': {'en': 'Rest over', 'hu': 'Pihenő letelt'},
    'workout.rest_get_ready': {
      'en': 'Get ready for the next set',
      'hu': 'Készülj a következő szettre',
    },
    'workout.rest_time': {'en': 'Rest time', 'hu': 'Pihenőidő'},
    // Sets-table column headers (uppercase).
    'workout.col_meters': {'en': 'METERS', 'hu': 'MÉTER'},
    'workout.col_pace': {'en': 'PACE', 'hu': 'TEMPÓ'},
    'workout.col_reps': {'en': 'REPS', 'hu': 'ISM'},
    'workout.col_time': {'en': 'TIME', 'hu': 'IDŐ'},
    // Workout / exercise action menus.
    'workout.menu_finish': {'en': 'Finish workout', 'hu': 'Edzés befejezése'},
    'workout.menu_pause': {
      'en': 'Exit – continue later',
      'hu': 'Kilépés – később folytatom',
    },
    'workout.menu_discard': {'en': 'Discard workout', 'hu': 'Edzés elvetése'},
    'workout.menu_info': {'en': 'Info', 'hu': 'Infó'},
    'workout.menu_progression': {'en': 'Progression', 'hu': 'Progresszió'},
    'workout.menu_change': {'en': 'Change', 'hu': 'Csere'},
    // Progression strategy picker.
    'workout.strat_linear': {'en': 'Linear', 'hu': 'Lineáris'},
    'workout.strat_linear_desc': {
      'en': '+weight every time',
      'hu': 'Minden alkalommal +súly',
    },
    'workout.strat_double': {'en': 'Double progression', 'hu': 'Dupla progresszió'},
    'workout.strat_double_desc': {
      'en': 'Reps first, then weight',
      'hu': 'Előbb ismétlés, majd súly',
    },
    'workout.strat_rpe': {'en': 'RPE-based', 'hu': 'RPE alapú'},
    'workout.strat_rpe_desc': {
      'en': 'Targeted load at RPE 7–8',
      'hu': 'RPE 7–8 célzott terhelés',
    },
    'workout.strat_none': {'en': 'None', 'hu': 'Nincs'},
    'workout.strat_none_desc': {
      'en': 'Don’t suggest anything',
      'hu': 'Ne javasoljon semmit',
    },
    'workout.how_to': {'en': 'How to', 'hu': 'Hogyan'},
    'workout.watch_youtube': {
      'en': 'Watch on YouTube',
      'hu': 'Megnézés YouTube-on',
    },
    'workout.no_more_exercises': {
      'en': 'No more exercises',
      'hu': 'Nincs több gyakorlat',
    },
    'workout.exit': {'en': 'Exit', 'hu': 'Kilépés'},
    'workout.finish_confirm_title': {
      'en': 'Finish workout?',
      'hu': 'Edzés befejezése?',
    },
    'workout.finish_confirm_body': {
      'en': '{count} exercise(s) still have unchecked sets. Finish anyway?',
      'hu': '{count} gyakorlatnál maradt bepipálatlan szett. Mindenképp befejezed?',
    },
    'workout.finish_anyway': {'en': 'Finish', 'hu': 'Befejezés'},

    // ----- Nav / app titles -----
    'app.title': {'en': 'HEFTOR', 'hu': 'HEFTOR'},
    'nav.home': {'en': 'Home', 'hu': 'Kezdőlap'},
    'nav.workouts': {'en': 'Workouts', 'hu': 'Edzések'},
    'nav.progress': {'en': 'Progress', 'hu': 'Fejlődés'},
    'nav.calendar': {'en': 'Calendar', 'hu': 'Naptár'},

    // ----- Splash -----
    'splash.loading': {'en': 'Loading…', 'hu': 'Betöltés…'},

    // ----- Welcome -----
    'welcome.tagline': {
      'en': 'Strength engineered intelligently.',
      'hu': 'Erő, intelligensen tervezve.',
    },
    'welcome.subtitle': {
      'en': 'Adaptive training that learns from every set you log.',
      'hu': 'Adaptív edzés, ami minden naplózott szettedből tanul.',
    },
    'welcome.create_account': {'en': 'Create account', 'hu': 'Fiók létrehozása'},
    'welcome.sign_in': {'en': 'Sign in', 'hu': 'Bejelentkezés'},
    'welcome.try_demo': {'en': 'Try a demo workout', 'hu': 'Próbálj egy demó edzést'},
    'welcome.headline': {
      'en': 'Pure training.\nNo bloat.',
      'hu': 'Tiszta edzés.\nSemmi felesleg.',
    },
    'welcome.body': {
      'en':
          'Create an account — then in 90 seconds we tailor a training plan to your goals.',
      'hu':
          'Hozz létre egy fiókot — utána 90 másodperc alatt összeállítjuk a céljaidra szabott edzéstervet.',
    },
    'welcome.cta': {'en': "Let's go", 'hu': 'Kezdjük'},
    'welcome.have_account': {'en': 'Already have an account? ', 'hu': 'Van már fiókod? '},
    'welcome.sign_in_link': {'en': 'Sign in', 'hu': 'Lépj be'},

    // ----- Auth (login / register / forgot password) -----
    'auth.email': {'en': 'Email', 'hu': 'Email'},
    'auth.password': {'en': 'Password', 'hu': 'Jelszó'},
    'auth.new_password': {'en': 'New password', 'hu': 'Új jelszó'},
    'auth.current_password': {'en': 'Current password', 'hu': 'Jelenlegi jelszó'},
    'auth.name': {'en': 'Name', 'hu': 'Név'},
    'auth.username': {'en': 'Username', 'hu': 'Felhasználónév'},
    'auth.login_title': {'en': 'Welcome back', 'hu': 'Üdv újra'},
    'auth.register_title': {'en': 'Create your account', 'hu': 'Hozd létre a fiókod'},
    'auth.sign_in': {'en': 'Sign in', 'hu': 'Bejelentkezés'},
    'auth.sign_up': {'en': 'Sign up', 'hu': 'Regisztráció'},
    'auth.forgot_password': {'en': 'Forgot password?', 'hu': 'Elfelejtetted a jelszót?'},
    'auth.no_account': {
      'en': 'No account? Create one',
      'hu': 'Nincs fiókod? Hozz létre egyet',
    },
    'auth.have_account': {
      'en': 'Have an account? Sign in',
      'hu': 'Van fiókod? Jelentkezz be',
    },
    'auth.login_subtitle': {
      'en': 'Sign in and chase a new PR.',
      'hu': 'Lépj be és csinálj egy új PR-t.',
    },
    'auth.login_button': {'en': 'Sign in', 'hu': 'Belépés'},
    'auth.no_account_leading': {'en': 'No account yet?', 'hu': 'Nincs még fiókod?'},
    'auth.no_account_action': {'en': 'Sign up', 'hu': 'Regisztrálj'},
    'auth.server_unreachable': {
      'en': "Couldn't reach the server.",
      'hu': 'Nem sikerült elérni a szervert.',
    },
    'auth.invalid_email': {
      'en': 'Enter a valid email address.',
      'hu': 'Adj meg egy érvényes email címet.',
    },
    'auth.password_min_8': {
      'en': 'Password must be at least 8 characters.',
      'hu': 'A jelszó legalább 8 karakter legyen.',
    },
    'auth.register_subtitle_default': {
      'en': 'Create an account so we can save your workouts.',
      'hu': 'Hozz létre egy fiókot, hogy elmentsük az edzéseidet.',
    },
    'auth.register_subtitle_with_plan': {
      'en': 'Save your plan to your account.',
      'hu': 'Mentsd el a tervedet a fiókodhoz.',
    },
    'auth.register_title_with_plan': {
      'en': 'Last step',
      'hu': 'Utolsó lépés',
    },
    'auth.register_title_default': {
      'en': 'Create account',
      'hu': 'Fiók létrehozása',
    },
    'auth.name_optional': {'en': 'Name (optional)', 'hu': 'Név (opcionális)'},
    'auth.password_min_8_label': {
      'en': 'Password (min. 8 characters)',
      'hu': 'Jelszó (min. 8 karakter)',
    },
    'auth.create_account_button': {
      'en': 'Create account',
      'hu': 'Fiók létrehozása',
    },
    'auth.have_account_leading': {
      'en': 'Already have an account?',
      'hu': 'Van már fiókod?',
    },
    'auth.have_account_action': {'en': 'Sign in', 'hu': 'Lépj be'},
    'auth.terms_lead': {
      'en': 'By creating an account you accept the ',
      'hu': 'A fiók létrehozásával elfogadod az ',
    },
    'auth.terms_and': {'en': ' and the ', 'hu': ' és az '},
    'auth.terms_link': {'en': 'Terms of service', 'hu': 'Felhasználási feltételeket'},
    'auth.privacy_link': {
      'en': 'Privacy policy',
      'hu': 'Adatvédelmi tájékoztató',
    },
    'auth.reset_title': {
      'en': 'Reset password',
      'hu': 'Jelszó visszaállítás',
    },
    'auth.reset_subtitle': {
      'en': 'Enter your email and we will send a reset link.',
      'hu': 'Add meg az email címedet, küldünk egy visszaállító linket.',
    },
    'auth.reset_sent_title': {
      'en': 'Email on the way',
      'hu': 'Email úton van',
    },
    'auth.reset_sent_body': {
      'en':
          "If {email} is registered we've sent a reset link. Check your inbox (and the spam folder) — it's valid for 30 minutes.",
      'hu':
          'Ha a(z) {email} regisztrált, küldtünk egy visszaállító linket. Nézd meg a postafiókod (és a spam mappát) — 30 percig érvényes.',
    },
    'auth.reset_have_code': {
      'en': "I have a reset link or code",
      'hu': 'Van visszaállító linkem vagy kódom',
    },
    'auth.reset_step2_title': {
      'en': 'Set a new password',
      'hu': 'Adj meg egy új jelszót',
    },
    'auth.reset_step2_subtitle': {
      'en':
          'Paste the link from the email (or just the code) and choose a new password.',
      'hu':
          'Illeszd be az emailből kapott linket (vagy csak a kódot) és válassz egy új jelszót.',
    },
    'auth.reset_token_label': {
      'en': 'Reset link or code',
      'hu': 'Visszaállító link vagy kód',
    },
    'auth.reset_token_hint': {
      'en': 'https://heftor.app/reset-password?token=…',
      'hu': 'https://heftor.app/reset-password?token=…',
    },
    'auth.reset_token_required': {
      'en': 'Paste the link or code from the email.',
      'hu': 'Illeszd be a linket vagy kódot az emailből.',
    },
    'auth.reset_new_password_label': {
      'en': 'New password',
      'hu': 'Új jelszó',
    },
    'auth.reset_confirm_password_label': {
      'en': 'Confirm new password',
      'hu': 'Új jelszó újra',
    },
    'auth.reset_passwords_dont_match': {
      'en': 'The two passwords do not match.',
      'hu': 'A két jelszó nem egyezik.',
    },
    'auth.reset_button': {
      'en': 'Reset password',
      'hu': 'Jelszó visszaállítása',
    },
    'auth.reset_invalid_or_expired': {
      'en': 'This link or code is invalid or has expired. Request a new one.',
      'hu': 'Ez a link vagy kód érvénytelen vagy lejárt. Kérj újat.',
    },
    'auth.or': {'en': 'or', 'hu': 'vagy'},
    'auth.continue_with_apple': {
      'en': 'Continue with Apple',
      'hu': 'Folytatás Apple-lel',
    },
    'auth.continue_with_google': {
      'en': 'Continue with Google',
      'hu': 'Folytatás Google-lel',
    },
    'auth.reset_password': {'en': 'Reset password', 'hu': 'Jelszó visszaállítása'},
    'auth.send_reset_link': {'en': 'Send reset link', 'hu': 'Visszaállító link küldése'},
    'auth.reset_link_sent': {
      'en': 'If the email exists you will receive a reset link.',
      'hu': 'Ha az email létezik, kapsz egy visszaállító linket.',
    },
    'auth.password_too_short': {
      'en': 'Password must be at least 6 characters.',
      'hu': 'A jelszó legalább 6 karakter legyen.',
    },

    // ----- Dashboard -----
    'dashboard.hi': {'en': 'Hi,', 'hu': 'Szia,'},
    'dashboard.month_total': {
      'en': '{kg} kg this month',
      'hu': '{kg} kg ebben a hónapban',
    },
    'dashboard.streak': {'en': 'STREAK', 'hu': 'STREAK'},
    'dashboard.rank': {'en': 'RANK', 'hu': 'RANG'},
    'dashboard.today_done': {'en': 'TODAY · DONE', 'hu': 'MA · KÉSZ'},
    'dashboard.today_no_workout': {
      'en': 'TODAY · NO WORKOUT',
      'hu': 'MA · NINCS EDZÉS',
    },
    'dashboard.today_card_planned': {
      'en': 'Today · planned',
      'hu': 'Ma · tervezett',
    },
    'dashboard.weekly_plan': {'en': 'WEEKLY PLAN', 'hu': 'HETI TERV'},
    'dashboard.summary': {'en': 'OVERALL', 'hu': 'ÖSSZESÍTETT'},
    'dashboard.start': {'en': 'Start workout', 'hu': 'Edzés indítása'},
    'dashboard.rest_day': {'en': 'Rest day', 'hu': 'Pihenőnap'},
    'dashboard.no_workout_today': {
      'en': 'No workout planned for today.',
      'hu': 'Mára nincs tervezett edzés.',
    },
    'dashboard.stagnation_title': {
      'en': 'Progress plateau detected',
      'hu': 'Megrekedt fejlődés',
    },
    'dashboard.stagnation_badge': {'en': 'PLATEAU', 'hu': 'STAGNÁLÁS'},
    'dashboard.workout_saved': {'en': 'Workout saved', 'hu': 'Edzés elmentve'},
    'dashboard.today_short': {'en': 'TODAY', 'hu': 'MA'},
    'dashboard.no_workout_today_short': {
      'en': 'No workout',
      'hu': 'Nincs edzésed',
    },
    'dashboard.start_short': {'en': 'START', 'hu': 'KEZDÉS'},
    'dashboard.month_total_kg': {
      'en': '{kg} kg this month',
      'hu': '{kg} kg ebben a hónapban',
    },
    'dashboard.month_total_t': {
      'en': '{kg} t this month',
      'hu': '{kg} t ebben a hónapban',
    },
    'dashboard.split_per_week': {
      'en': '{split} · {days}× / week',
      'hu': '{split} · {days}× / hét',
    },
    'dashboard.weekly_done': {
      'en': '{done}/{goal} this week',
      'hu': '{done}/{goal} ezen a héten',
    },
    'dashboard.done_short': {'en': 'DONE', 'hu': 'KÉSZ'},
    'dashboard.exercises_short_caps': {'en': 'EXERCISES', 'hu': 'GYAKORLAT'},
    'dashboard.exercises_count': {
      'en': '{n} exercises',
      'hu': '{n} gyakorlat',
    },
    'dashboard.workout_default': {'en': 'Workout', 'hu': 'Edzés'},
    'dashboard.no_workout_that_day': {
      'en': 'No workout that day',
      'hu': 'Nem volt edzés ezen a napon',
    },
    'dashboard.create_with_plus': {
      'en': 'Create one with the + button',
      'hu': 'Hozz létre egyet a + gombbal',
    },
    'dashboard.stat_total_sets': {'en': 'Total sets', 'hu': 'Összes set'},
    'dashboard.stat_lifted': {'en': 'Lifted', 'hu': 'Megemelt'},
    'dashboard.stat_active_time': {'en': 'Active time', 'hu': 'Aktív idő'},
    'dashboard.stat_sessions': {'en': 'Sessions', 'hu': 'Edzések'},
    'dashboard.new_pr': {'en': 'NEW PR', 'hu': 'ÚJ REKORD'},
    'dashboard.stagnation_label': {
      'en': '{n} EXERCISES STAGNATING · VIEW',
      'hu': '{n} GYAKORLAT STAGNÁL · NÉZD MEG',
    },
    'dashboard.weeks_stagnant': {
      'en': '{n} weeks stalled',
      'hu': '{n} hét stagnál',
    },

    // ----- Relative date labels -----
    'date.today': {'en': 'TODAY', 'hu': 'MA'},
    'date.yesterday': {'en': 'YESTERDAY', 'hu': 'TEGNAP'},
    'date.days_ago': {'en': '{n} DAYS AGO', 'hu': '{n} NAPJA'},

    // Month short labels (used by the dashboard date pill).
    'month.1': {'en': 'JAN', 'hu': 'JAN'},
    'month.2': {'en': 'FEB', 'hu': 'FEB'},
    'month.3': {'en': 'MAR', 'hu': 'MÁR'},
    'month.4': {'en': 'APR', 'hu': 'ÁPR'},
    'month.5': {'en': 'MAY', 'hu': 'MÁJ'},
    'month.6': {'en': 'JUN', 'hu': 'JÚN'},
    'month.7': {'en': 'JUL', 'hu': 'JÚL'},
    'month.8': {'en': 'AUG', 'hu': 'AUG'},
    'month.9': {'en': 'SEP', 'hu': 'SZE'},
    'month.10': {'en': 'OCT', 'hu': 'OKT'},
    'month.11': {'en': 'NOV', 'hu': 'NOV'},
    'month.12': {'en': 'DEC', 'hu': 'DEC'},

    // ----- Trainings list / last performed -----
    'trainings.last_done': {'en': 'LAST {when}', 'hu': 'UTOLJÁRA {when}'},
    'trainings.added': {'en': 'Workout added', 'hu': 'Edzés hozzáadva'},
    'trainings.generate_new_plan': {
      'en': 'Generate new weekly plan',
      'hu': 'Új heti terv generálása',
    },
    'trainings.your_first_plan': {'en': 'YOUR FIRST PLAN', 'hu': 'ELSŐ TERVED'},
    'trainings.counts_recommended_only': {
      'en': '{n} recommended',
      'hu': '{n} ajánlott',
    },
    'trainings.counts_full': {
      'en': '{manual} own · {gen} generated · {rec} recommended',
      'hu': '{manual} saját · {gen} generált · {rec} ajánlott',
    },
    'trainings.make_a_plan_title': {
      'en': 'Make a plan\nfor yourself.',
      'hu': 'Csinálj egy tervet\nmagadnak.',
    },
    'trainings.make_a_plan_body': {
      'en':
          'Pick weeks + sessions per week + muscle groups and get a plan in moments.',
      'hu':
          'Választasz hét + edzés/hét + izomcsoport, és pillanatok alatt megkapod a tervet.',
    },
    'trainings.tab_recommended': {'en': 'RECOMMENDED', 'hu': 'AJÁNLOTT'},
    'trainings.tab_generated': {'en': 'GENERATED', 'hu': 'GENERÁLT'},
    'trainings.empty_my_title': {
      'en': "You don't have your own workouts yet",
      'hu': 'Még nincs saját edzésed',
    },
    'trainings.empty_my_subtitle': {
      'en': 'Create one with the top-right button.',
      'hu': 'Hozz létre egyet a jobb felső gombbal.',
    },
    'trainings.my_section': {'en': 'MY WORKOUTS', 'hu': 'SAJÁT EDZÉSEK'},

    // ----- Workouts list -----
    'workouts.title': {'en': 'Workouts', 'hu': 'Edzések'},
    'workouts.new': {'en': 'New workout', 'hu': 'Új edzés'},
    'workouts.recommended': {'en': 'RECOMMENDED', 'hu': 'AJÁNLOTT EDZÉSEK'},
    'workouts.generated_for_you': {'en': 'GENERATED FOR YOU', 'hu': 'NEKED GENERÁLT'},
    'workouts.my_workouts': {'en': 'MY WORKOUTS', 'hu': 'SAJÁT EDZÉSEK'},
    'workouts.empty_my': {
      'en': 'You have no saved workouts yet.',
      'hu': 'Még nincs mentett edzésed.',
    },
    'workouts.start_workout': {'en': 'Start', 'hu': 'Indítás'},
    'workouts.day': {'en': 'Day', 'hu': 'Nap'},

    // ----- Create / edit workout -----
    'create.title': {'en': 'New workout', 'hu': 'Új edzés'},
    'create.save_count': {'en': 'Save ({n})', 'hu': 'Mentés ({n})'},
    'create.name_hint': {'en': 'Workout name', 'hu': 'Edzés neve'},
    'create.search_exercises': {
      'en': 'Search exercises…',
      'hu': 'Gyakorlat keresése…',
    },
    'create.all_filter': {'en': 'All', 'hu': 'Mind'},
    'create.give_name': {'en': 'Give your workout a name.', 'hu': 'Adj nevet az edzésnek.'},
    'create.add_exercise': {
      'en': 'Add at least one exercise.',
      'hu': 'Adj hozzá legalább egy gyakorlatot.',
    },
    'create.db_unavailable': {
      'en': 'The exercise database is currently unavailable.',
      'hu': 'A gyakorlat-adatbázis jelenleg nem elérhető.',
    },
    'create.too_many_requests': {
      'en': 'Too many requests. Try again later.',
      'hu': 'Túl sok kérés. Próbáld újra később.',
    },
    'create.server_unreachable': {
      'en': "Couldn't reach the server.",
      'hu': 'Nem sikerült elérni a szervert.',
    },
    'create.save_failed': {
      'en': "Couldn't save. Is the server up?",
      'hu': 'Nem sikerült menteni. Fut a szerver?',
    },

    // ----- Custom exercise sheet -----
    'custom.title': {'en': 'Own exercise', 'hu': 'Saját gyakorlat'},
    'custom.subtitle_card': {
      'en': "If it's not in the catalogue, add it as your own",
      'hu': 'Ha nincs a katalógusban, vedd fel sajátként',
    },
    'custom.intro': {
      'en':
          "Add your own movement when it's not in the catalogue. Setting the muscle group keeps the weekly volume counter accurate.",
      'hu':
          'Vedd fel a saját mozdulatodat, ha nincs a katalógusban. Az izomcsoport megadása segít, hogy a heti volumen számláló pontos maradjon.',
    },
    'custom.name_label': {'en': 'Name *', 'hu': 'Neve *'},
    'custom.name_hint': {'en': 'e.g. Trap-3 raise', 'hu': 'pl. Trap-3 raise'},
    'custom.name_required': {
      'en': 'Give the exercise a name',
      'hu': 'Adj nevet a gyakorlatnak',
    },
    'custom.name_too_long': {'en': 'Max 80 characters', 'hu': 'Legfeljebb 80 karakter'},
    'custom.muscle_label': {'en': 'Target muscle group', 'hu': 'Célzott izomcsoport'},
    'custom.muscle_pick': {
      'en': 'Pick a muscle group',
      'hu': 'Válassz izomcsoportot',
    },
    'custom.muscle_freeform_hint': {
      'en': 'e.g. chest, back, quads',
      'hu': 'pl. chest, back, quads',
    },
    'custom.equipment_label': {
      'en': 'Equipment (optional)',
      'hu': 'Eszköz (opcionális)',
    },
    'custom.equipment_hint': {
      'en': 'e.g. dumbbell, cable, body weight',
      'hu': 'pl. dumbbell, cable, body weight',
    },
    'custom.note_label': {'en': 'Note (optional)', 'hu': 'Megjegyzés (opcionális)'},
    'custom.note_hint': {
      'en': 'Cue, weight position, RPE target etc.',
      'hu': 'Tipp, súly-pozíció, RPE-target stb.',
    },
    'custom.gif_label': {
      'en': 'GIF / image URL (optional)',
      'hu': 'GIF / kép URL (opcionális)',
    },
    'custom.gif_hint': {
      'en': 'https://… (GIF, PNG or JPG)',
      'hu': 'https://… (GIF, PNG vagy JPG)',
    },
    'custom.gif_invalid': {
      'en': 'Enter a full URL (https://…)',
      'hu': 'Adj meg teljes URL-t (https://…)',
    },
    'custom.gif_invalid_scheme': {
      'en': 'Only http(s) URLs are supported',
      'hu': 'Csak http(s) URL támogatott',
    },
    'custom.preview': {'en': 'Preview', 'hu': 'Előnézet'},
    'custom.preview_invalid': {
      'en': 'Invalid URL',
      'hu': 'Érvénytelen URL',
    },
    'custom.add_to_workout': {
      'en': 'Add to workout',
      'hu': 'Hozzáadás az edzéshez',
    },

    // ----- Exercise detail sheet -----
    'detail.target_muscles': {'en': 'Target muscles', 'hu': 'Célzott izmok'},
    'detail.secondary_muscles': {'en': 'Secondary muscles', 'hu': 'Másodlagos izmok'},
    'detail.body_parts': {'en': 'Body parts', 'hu': 'Testrészek'},
    'detail.equipment': {'en': 'Equipment', 'hu': 'Eszközök'},
    'detail.execution': {'en': 'How to perform', 'hu': 'Végrehajtás'},
    'detail.add': {'en': 'Add to workout', 'hu': 'Hozzáadás az edzéshez'},
    'detail.remove': {'en': 'Remove from workout', 'hu': 'Eltávolítás az edzésből'},

    // ----- Account -----
    'account.title': {'en': 'Account', 'hu': 'Fiók'},
    'account.profile': {'en': 'Profile', 'hu': 'Profil'},
    'account.change_password': {'en': 'Change password', 'hu': 'Jelszó módosítása'},
    'account.plate_calculator': {'en': 'Plate calculator', 'hu': 'Tárcsa kalkulátor'},
    'account.bar_weight': {'en': 'Bar weight (kg)', 'hu': 'Rúd súlya (kg)'},
    'account.available_plates': {'en': 'Available plates (kg)', 'hu': 'Elérhető tárcsák (kg)'},
    'account.add_plate': {'en': 'New plate', 'hu': 'Új tárcsa'},
    'account.profile_saved': {'en': 'Profile saved', 'hu': 'Profil mentve'},
    'account.password_changed': {'en': 'Password changed', 'hu': 'Jelszó módosítva'},
    'account.settings_saved': {'en': 'Setting saved', 'hu': 'Beállítás mentve'},
    'account.couldnt_save': {'en': "Couldn't save.", 'hu': 'Nem sikerült menteni.'},
    'account.couldnt_change': {'en': "Couldn't change.", 'hu': 'Nem sikerült módosítani.'},
    'account.logout': {'en': 'Sign out', 'hu': 'Kijelentkezés'},
    'account.delete_account': {'en': 'Delete account', 'hu': 'Fiók törlése'},
    'account.delete_confirm_title': {
      'en': 'Delete account',
      'hu': 'Fiók törlése',
    },
    'account.delete_confirm_body': {
      'en':
          'Are you sure you want to delete your account? This action cannot be undone.',
      'hu':
          'Biztosan törlöd a fiókod? Ez a művelet nem visszavonható.',
    },
    'account.delete_failed': {
      'en': "Couldn't delete the account.",
      'hu': 'Nem sikerült törölni a fiókot.',
    },
    'account.rank': {'en': 'RANK', 'hu': 'RANG'},
    'account.world_leaderboard': {
      'en': 'WORLD LEADERBOARD',
      'hu': 'VILÁGRANGLISTA',
    },
    'account.this_week_xp': {
      'en': 'This week · +{xp} XP',
      'hu': 'Ez a hét · +{xp} XP',
    },
    'account.language': {'en': 'Language', 'hu': 'Nyelv'},
    'account.language_en': {'en': 'English', 'hu': 'Angol'},
    'account.language_hu': {'en': 'Hungarian', 'hu': 'Magyar'},

    // ----- Weekly breakdown labels -----
    'rank.sets': {'en': 'Sets', 'hu': 'Szettek'},
    'rank.session': {'en': 'Sessions', 'hu': 'Edzések'},
    'rank.pr': {'en': 'New PRs', 'hu': 'Új PR-ok'},
    'rank.weekly_goal': {'en': 'Weekly goal', 'hu': 'Heti cél'},
    'rank.streak': {'en': 'Streak bonus', 'hu': 'Streak bonus'},

    // ----- Calendar -----
    'calendar.title': {'en': 'Calendar', 'hu': 'Naptár'},
    'calendar.title_caps': {'en': 'CALENDAR', 'hu': 'NAPTÁR'},
    'calendar.this_week': {'en': 'THIS WEEK', 'hu': 'EZ A HÉT'},
    'calendar.this_month': {'en': 'THIS MONTH', 'hu': 'EZ A HÓNAP'},
    'calendar.new_alltime_record': {
      'en': 'New all-time record',
      'hu': 'Új all-time rekord',
    },
    'calendar.week_streak': {'en': 'WEEK STREAK', 'hu': 'HÉT SOROZAT'},
    'calendar.streak_hint_caps': {
      'en': 'WEEK STREAK · ALL-TIME RECORD ON THE RIGHT',
      'hu': 'HÉT SOROZAT · ALL-TIME REKORD JOBB OLDALON',
    },
    'calendar.alltime_record_caps': {
      'en': 'NEW ALL-TIME RECORD',
      'hu': 'ÚJ ALL-TIME REKORD',
    },
    'calendar.streak_at_risk': {
      'en': 'STREAK ON THE LINE — TRAIN TODAY',
      'hu': 'A STREAK A KOCKÁN — EDZS MA',
    },
    'calendar.week_still_open': {
      'en': 'YOUR WEEK IS STILL OPEN',
      'hu': 'A HETED MÉG NYITOTT',
    },
    'calendar.start_streak_again': {
      'en': 'START THE STREAK AGAIN',
      'hu': 'INDÍTSD ÚJRA A SOROZATOT',
    },
    'calendar.summary_caps': {
      'en': '{sessions} SESSION · {streak} WEEK STREAK RECORD · {pr} PR THIS MONTH',
      'hu':
          '{sessions} EDZÉS · {streak} HÉT REKORD STREAK · {pr} PR EBBEN A HÓNAPBAN',
    },
    'calendar.observations_caps': {
      'en': 'OBSERVATIONS',
      'hu': 'MEGFIGYELÉSEK',
    },
    'calendar.muscles_this_month_caps': {
      'en': 'MUSCLES · THIS MONTH',
      'hu': 'IZMOK · EZ A HÓNAP',
    },
    'calendar.rest_day_text': {'en': 'Rest day', 'hu': 'Pihenőnap'},
    'calendar.no_workout_on_day': {
      'en': 'No workout recorded on this day.',
      'hu': 'Nincs rögzített edzés ezen a napon.',
    },
    'calendar.no_workout_this_month': {
      'en': 'No workouts this month yet',
      'hu': 'Még nincs edzés ebben a hónapban',
    },
    'calendar.delta_up': {'en': '↑ +{n} VS LAST MONTH', 'hu': '↑ +{n} A MÚLT HÓNAPHOZ KÉPEST'},
    'calendar.delta_down': {
      'en': '↓ {n} VS LAST MONTH',
      'hu': '↓ {n} A MÚLT HÓNAPHOZ KÉPEST',
    },
    'calendar.delta_same': {
      'en': '= VS LAST MONTH',
      'hu': '= A MÚLT HÓNAPHOZ KÉPEST',
    },
    'calendar.sessions_count_caps': {
      'en': '{n} SESSION',
      'hu': '{n} EDZÉS',
    },
    'calendar.month_january': {'en': 'JANUARY', 'hu': 'JANUÁR'},
    'calendar.month_february': {'en': 'FEBRUARY', 'hu': 'FEBRUÁR'},
    'calendar.month_march': {'en': 'MARCH', 'hu': 'MÁRCIUS'},
    'calendar.month_april': {'en': 'APRIL', 'hu': 'ÁPRILIS'},
    'calendar.month_may': {'en': 'MAY', 'hu': 'MÁJUS'},
    'calendar.month_june': {'en': 'JUNE', 'hu': 'JÚNIUS'},
    'calendar.month_july': {'en': 'JULY', 'hu': 'JÚLIUS'},
    'calendar.month_august': {'en': 'AUGUST', 'hu': 'AUGUSZTUS'},
    'calendar.month_september': {'en': 'SEPTEMBER', 'hu': 'SZEPTEMBER'},
    'calendar.month_october': {'en': 'OCTOBER', 'hu': 'OKTÓBER'},
    'calendar.month_november': {'en': 'NOVEMBER', 'hu': 'NOVEMBER'},
    'calendar.month_december': {'en': 'DECEMBER', 'hu': 'DECEMBER'},

    // ----- Progress -----
    'progress.title': {'en': 'Progress', 'hu': 'Fejlődés'},
    'progress.tab_history': {'en': 'History', 'hu': 'Előzmények'},
    'progress.tab_exercises': {'en': 'Exercises', 'hu': 'Gyakorlatok'},
    'progress.subtitle': {
      'en': '{n} WORKOUTS · {vol} LIFTED',
      'hu': '{n} EDZÉS · {vol} MEGEMELT',
    },
    // History range filter pills.
    'progress.range_all': {'en': 'ALL', 'hu': 'MIND'},
    'progress.range_week': {'en': 'WEEK', 'hu': 'HÉT'},
    'progress.range_month': {'en': 'MONTH', 'hu': 'HÓNAP'},
    'progress.range_90': {'en': '90 DAYS', 'hu': '90 NAP'},
    'progress.range_year': {'en': 'YEAR', 'hu': 'ÉV'},
    // Relative date buckets in the history list.
    'progress.bucket_today': {'en': 'TODAY', 'hu': 'MA'},
    'progress.bucket_yesterday': {'en': 'YESTERDAY', 'hu': 'TEGNAP'},
    'progress.bucket_this_week': {'en': 'THIS WEEK', 'hu': 'EZEN A HÉTEN'},
    'progress.bucket_this_month': {'en': 'THIS MONTH', 'hu': 'EZ A HÓNAP'},
    'progress.bucket_earlier': {'en': 'EARLIER', 'hu': 'KORÁBBAN'},
    // Stat hero labels.
    'progress.stat_workouts': {'en': 'WORKOUTS', 'hu': 'EDZÉS'},
    'progress.stat_lifted': {'en': 'LIFTED', 'hu': 'MEGEMELT'},
    'progress.stat_active_time': {'en': 'ACTIVE TIME', 'hu': 'AKTÍV IDŐ'},
    // Empty / message states.
    'progress.empty_history_title': {
      'en': 'No finished workouts yet',
      'hu': 'Még nincs befejezett edzésed',
    },
    'progress.empty_history_subtitle': {
      'en':
          'Start a workout from the dashboard — every session shows up here, grouped by date.',
      'hu':
          'Indíts egy edzést a dashboardról — innen majd minden session megjelenik dátum szerint csoportosítva.',
    },
    'progress.empty_exercises_title': {
      'en': 'No data yet',
      'hu': 'Még nincs adat',
    },
    'progress.empty_exercises_subtitle': {
      'en': 'Log workouts to see your progress.',
      'hu': 'Naplózz edzéseket, hogy lásd a fejlődésed.',
    },
    // Row subtitles / counts.
    'progress.n_exercises': {'en': '{n} exercises', 'hu': '{n} gyakorlat'},
    'progress.n_sessions': {'en': '{n} sessions', 'hu': '{n} alkalom'},
    // Per-exercise chart.
    'progress.chart_need_two': {
      'en': 'At least 2 sessions are needed for the chart',
      'hu': 'Legalább 2 alkalom kell a grafikonhoz',
    },
    'progress.metric_1rm': {'en': '1RM', 'hu': '1RM'},
    'progress.metric_max_weight': {'en': 'Max Weight', 'hu': 'Max súly'},
    'progress.metric_volume': {'en': 'Volume', 'hu': 'Volumen'},
    'progress.metric_total_reps': {'en': 'Total Reps', 'hu': 'Össz. ism.'},
    // Session detail.
    'progress.detail_done': {'en': 'Done', 'hu': 'Kész'},
    'progress.detail_time': {'en': 'Time', 'hu': 'Idő'},
    'progress.detail_sets_value': {
      'en': '{done}/{total} sets',
      'hu': '{done}/{total} szett',
    },
    'progress.detail_started': {'en': 'Started: {time}', 'hu': 'Kezdés: {time}'},
    'progress.detail_finished': {
      'en': 'Finished: {time}',
      'hu': 'Befejezés: {time}',
    },

    // ----- Workout screen -----
    'workout.finish': {'en': 'Finish', 'hu': 'Befejezés'},
    'workout.add_set': {'en': 'Add set', 'hu': 'Új szett'},
    'workout.rest': {'en': 'Rest', 'hu': 'Pihenés'},
    'workout.suggested': {'en': 'Suggested', 'hu': 'Javasolt'},

    // ----- Onboarding -----
    'onboarding.welcome_title': {
      'en': 'Tell us about your goal',
      'hu': 'Mondj el a célodról',
    },
    'onboarding.continue': {'en': 'Continue', 'hu': 'Folytatás'},
    'onboarding.skip': {'en': 'Skip', 'hu': 'Kihagyás'},
    'onboarding.save_failed': {
      'en': "Couldn't save your onboarding.",
      'hu': 'Nem sikerült menteni az onboardingot.',
    },

    // ----- Trainings list cards -----
    'trainings.exercises_n': {'en': '{n} exercises', 'hu': '{n} gyakorlat'},
    'trainings.sets_n': {'en': '{n} sets', 'hu': '{n} szett'},
    'trainings.new_badge': {'en': 'NEW', 'hu': 'ÚJ'},

    // ----- Predefined workout story -----
    'predef.start_workout': {'en': 'Start workout', 'hu': 'Edzés indítása'},

    // ----- Subscription / Paywall -----
    'paywall.title': {'en': 'HEFTOR Pro', 'hu': 'HEFTOR Pro'},
    'paywall.subtitle': {
      'en': 'Unlock the full coach. Cancel anytime.',
      'hu': 'Nyisd meg a teljes coach-ot. Bármikor lemondható.',
    },
    'paywall.plan_monthly': {'en': 'Monthly', 'hu': 'Havi'},
    'paywall.plan_yearly': {'en': 'Yearly', 'hu': 'Éves'},
    'paywall.price_monthly': {'en': '2 490 Ft / month', 'hu': '2 490 Ft / hó'},
    'paywall.price_yearly_total': {
      'en': '17 990 Ft / year',
      'hu': '17 990 Ft / év',
    },
    'paywall.price_yearly_effective': {
      'en': '1 499 Ft / month — billed yearly',
      'hu': '1 499 Ft / hó — évente számlázva',
    },
    'paywall.save_badge': {'en': 'SAVE 40%', 'hu': '−40%'},
    'paywall.trial_cta': {
      'en': 'Start 3-day free trial',
      'hu': '3 napos próba indítása',
    },
    'paywall.subscribe_cta': {'en': 'Subscribe', 'hu': 'Előfizetés'},
    'paywall.trial_used': {
      'en': "You've already used your free trial.",
      'hu': 'Már használtad a próbaidőszakod.',
    },
    'paywall.restore': {'en': 'Restore purchases', 'hu': 'Vásárlások visszaállítása'},
    'paywall.fineprint': {
      'en':
          '3-day free trial then 2 490 Ft / month. Cancel anytime in your App Store / Play settings.',
      'hu':
          '3 napos ingyenes próba után 2 490 Ft / hó. Bármikor lemondható az App Store / Play beállításokban.',
    },
    'paywall.feature_unlimited_workouts': {
      'en': 'Unlimited saved workouts',
      'hu': 'Korlátlan mentett edzés',
    },
    'paywall.feature_engine': {
      'en': 'Adaptive progression engine',
      'hu': 'Adaptív progresszió-motor',
    },
    'paywall.feature_history': {
      'en': 'Full progress history',
      'hu': 'Teljes fejlődéstörténet',
    },
    'paywall.feature_plan': {
      'en': '20-week plan generator',
      'hu': '20 hetes terv-generátor',
    },
    'paywall.feature_pr_detect': {
      'en': 'Real PR detection (e1RM)',
      'hu': 'Valós PR detektálás (e1RM)',
    },
    'paywall.feature_stories': {
      'en': 'Generated workout stories',
      'hu': 'Generált edzés-stori-k',
    },
    'paywall.feature_priority': {
      'en': 'Priority support',
      'hu': 'Elsőbbségi support',
    },
    'paywall.purchase_failed': {
      'en': 'Could not complete the purchase. Please try again.',
      'hu': 'A vásárlás nem sikerült. Próbáld újra.',
    },

    // ----- Subscription state on Account screen -----
    'subscription.section': {'en': 'Subscription', 'hu': 'Előfizetés'},
    'subscription.status_free': {'en': 'Free', 'hu': 'Ingyenes'},
    'subscription.status_trialing': {
      'en': 'Trial · {days}d left',
      'hu': 'Próba · {days} nap van hátra',
    },
    'subscription.status_active_monthly': {
      'en': 'Pro · Monthly',
      'hu': 'Pro · Havi',
    },
    'subscription.status_active_yearly': {
      'en': 'Pro · Yearly',
      'hu': 'Pro · Éves',
    },
    'subscription.status_cancelled': {
      'en': 'Cancelled · until {date}',
      'hu': 'Lemondva · {date}-ig',
    },
    'subscription.status_expired': {'en': 'Expired', 'hu': 'Lejárt'},
    'subscription.cta_upgrade': {
      'en': 'Upgrade to Pro',
      'hu': 'Frissítés Pro-ra',
    },
    'subscription.cta_manage': {
      'en': 'Manage subscription',
      'hu': 'Előfizetés kezelése',
    },
    'subscription.cancel': {'en': 'Cancel subscription', 'hu': 'Előfizetés lemondása'},
    'subscription.cancel_confirm_title': {
      'en': 'Cancel subscription?',
      'hu': 'Lemondod az előfizetést?',
    },
    'subscription.cancel_confirm_body': {
      'en':
          "You'll keep Pro access until the current period ends, then drop back to Free.",
      'hu':
          'A jelenlegi időszak végéig megtartod a Pro-t, utána visszaválthat Ingyenesre.',
    },

    // ----- Weekly plan editor -----
    'plan.title': {'en': 'WEEKLY PLAN', 'hu': 'HETI TERV'},
    'plan.tagline': {'en': 'Make it yours.', 'hu': 'Szabd személyre.'},
    'plan.day_type_label': {'en': 'DAY TYPE', 'hu': 'NAP TÍPUSA'},
    'plan.muscles_label': {'en': 'MUSCLE GROUPS', 'hu': 'IZOMCSOPORTOK'},
    'plan.linked_workout_label': {
      'en': 'LINKED WORKOUT',
      'hu': 'CSATOLT EDZÉS',
    },
    'plan.linked_workout_hint': {
      'en': 'Pick one to copy its muscles into this day.',
      'hu': 'Válassz egyet, hogy az izomcsoportjai töltsék be ezt a napot.',
    },
    'plan.no_workouts': {
      'en': 'No saved workouts yet.',
      'hu': 'Még nincs mentett edzésed.',
    },
    'plan.save': {'en': 'SAVE', 'hu': 'MENTÉS'},
    'plan.saved': {'en': 'Weekly plan updated.', 'hu': 'Heti terv frissítve.'},
    'plan.save_failed': {
      'en': "Couldn't save.",
      'hu': 'Mentés sikertelen.',
    },
    'plan.notification_permission_required': {
      'en': "Allow notifications in Settings so reminders work.",
      'hu':
          'Engedélyezd az értesítéseket a beállításokban a működéshez.',
    },
    'plan.day_short_h': {'en': 'M', 'hu': 'H'},
    'plan.day_short_k': {'en': 'T', 'hu': 'K'},
    'plan.day_short_sze': {'en': 'W', 'hu': 'SZE'},
    'plan.day_short_cs': {'en': 'T', 'hu': 'CS'},
    'plan.day_short_p': {'en': 'F', 'hu': 'P'},
    'plan.day_short_szo': {'en': 'S', 'hu': 'SZO'},
    'plan.day_short_v': {'en': 'S', 'hu': 'V'},
    'plan.day_h': {'en': 'MONDAY', 'hu': 'HÉTFŐ'},
    'plan.day_k': {'en': 'TUESDAY', 'hu': 'KEDD'},
    'plan.day_sze': {'en': 'WEDNESDAY', 'hu': 'SZERDA'},
    'plan.day_cs': {'en': 'THURSDAY', 'hu': 'CSÜTÖRTÖK'},
    'plan.day_p': {'en': 'FRIDAY', 'hu': 'PÉNTEK'},
    'plan.day_szo': {'en': 'SATURDAY', 'hu': 'SZOMBAT'},
    'plan.day_v': {'en': 'SUNDAY', 'hu': 'VASÁRNAP'},
    'plan.reminder_section': {
      'en': 'DAILY REMINDER',
      'hu': 'NAPI EMLÉKEZTETŐ',
    },
    'plan.reminder_subtitle': {
      'en': 'Push notification on planned training days.',
      'hu': 'Push értesítés a tervezett edzések napjain.',
    },
    'plan.reminder_enabled': {
      'en': 'Reminder enabled',
      'hu': 'Emlékeztető bekapcsolva',
    },
    'plan.reminder_time': {'en': 'Time', 'hu': 'Időpont'},
    'plan.reminder_days': {'en': 'DAYS', 'hu': 'NAPOK'},

    // Day-value labels.
    'plan.label_rest': {'en': 'REST', 'hu': 'PIHENŐ'},
    'plan.label_workout': {'en': 'WORKOUT', 'hu': 'EDZÉS'},
    // Short labels for the dashboard chip strip — the cells are only
    // 40px wide so "WORKOUT" doesn't fit. Falls back to these on the
    // 7-day preview.
    'plan.chip_rest': {'en': 'REST', 'hu': 'PIH'},
    'plan.chip_workout': {'en': 'WORK', 'hu': 'EDZÉS'},
    'plan.label_push': {'en': 'PUSH', 'hu': 'PUSH'},
    'plan.label_pull': {'en': 'PULL', 'hu': 'PULL'},
    'plan.label_upper': {'en': 'UPPER', 'hu': 'FELSŐ'},
    'plan.label_lower': {'en': 'LOWER', 'hu': 'ALSÓ'},
    'plan.label_fullbody': {'en': 'FULL BODY', 'hu': 'TELJES TEST'},
    'plan.muscle_chest': {'en': 'CHEST', 'hu': 'MELL'},
    'plan.muscle_back': {'en': 'BACK', 'hu': 'HÁT'},
    'plan.muscle_shoulders': {'en': 'SHOULDERS', 'hu': 'VÁLL'},
    'plan.muscle_arms': {'en': 'ARMS', 'hu': 'KAR'},
    'plan.muscle_core': {'en': 'CORE', 'hu': 'CORE'},
    'plan.muscle_legs': {'en': 'LEGS', 'hu': 'LÁB'},

    // Plus-N overflow on the day row when more than 2 muscle groups
    // are picked.
    'plan.plus_n': {'en': '+{n}', 'hu': '+{n}'},

    // ----- Free tier limit reached -----
    'free_limit.title': {
      'en': 'Free workout limit reached',
      'hu': 'Elérted az ingyenes limitet',
    },
    'free_limit.body': {
      'en':
          'Free accounts can save up to {n} workouts. Upgrade to Pro for unlimited workouts and the full coach.',
      'hu':
          'Ingyenes fiókokon maximum {n} edzést menthetsz. Frissíts Pro-ra a korlátlan edzésekért és a teljes coach-ért.',
    },
    'free_limit.cta': {'en': 'See Pro', 'hu': 'Pro megnyitása'},

    // ----- Calendar insights (uppercase monochrome chips) -----
    // Weekday names as used inside the insight sentences: Hungarian superessive
    // ("PÉNTEKEN"), English plain uppercase ("FRIDAY").
    'insights.day.1': {'en': 'MONDAY', 'hu': 'HÉTFŐN'},
    'insights.day.2': {'en': 'TUESDAY', 'hu': 'KEDDEN'},
    'insights.day.3': {'en': 'WEDNESDAY', 'hu': 'SZERDÁN'},
    'insights.day.4': {'en': 'THURSDAY', 'hu': 'CSÜTÖRTÖKÖN'},
    'insights.day.5': {'en': 'FRIDAY', 'hu': 'PÉNTEKEN'},
    'insights.day.6': {'en': 'SATURDAY', 'hu': 'SZOMBATON'},
    'insights.day.7': {'en': 'SUNDAY', 'hu': 'VASÁRNAP'},
    'insights.most_common_day': {
      'en': 'YOU TRAIN MOST ON {day} ({count}×)',
      'hu': '{day} EDZESZ LEGTÖBBET ({count} ALKALOM)',
    },
    'insights.least_common_day': {
      'en': '{day} IS YOUR RAREST',
      'hu': '{day} A LEGRITKÁBB',
    },
    'insights.avg_start': {
      'en': 'YOU USUALLY START AT {time}',
      'hu': 'ÁTLAGOSAN {time}-KOR KEZDESZ',
    },
    'insights.avg_duration': {
      'en': 'AVG SESSION: {min} MIN',
      'hu': 'ÁTLAG SESSION: {min} PERC',
    },
    'insights.hl_biggest_session': {
      'en': 'BIGGEST SESSION',
      'hu': 'LEGNAGYOBB SESSION',
    },
    'insights.hl_most_sets': {'en': 'MOST SETS', 'hu': 'LEGTÖBB SETT'},
    'insights.hl_new_prs': {'en': 'NEW PRS', 'hu': 'ÚJ PR-OK'},
    'insights.sets_count': {'en': '{n} SETS', 'hu': '{n} SET'},
    'insights.workout_fallback': {'en': 'WORKOUT', 'hu': 'EDZÉS'},

    // ----- Training generator -----
    'generator.muscle_chest': {'en': 'CHEST', 'hu': 'MELL'},
    'generator.muscle_back': {'en': 'BACK', 'hu': 'HÁT'},
    'generator.muscle_shoulders': {'en': 'SHOULDERS', 'hu': 'VÁLL'},
    'generator.muscle_biceps': {'en': 'BICEPS', 'hu': 'BICEPSZ'},
    'generator.muscle_triceps': {'en': 'TRICEPS', 'hu': 'TRICEPSZ'},
    'generator.muscle_quads': {'en': 'QUADS', 'hu': 'COMB'},
    'generator.muscle_hamstrings': {'en': 'HAMSTRINGS', 'hu': 'COMBHAJLÍTÓ'},
    'generator.muscle_glutes': {'en': 'GLUTES', 'hu': 'FAR'},
    'generator.muscle_calves': {'en': 'CALVES', 'hu': 'VÁDLI'},
    'generator.muscle_abs': {'en': 'ABS', 'hu': 'HAS'},
    'generator.generated_snack': {
      'en': '{count} workouts generated.',
      'hu': '{count} edzés generálva.',
    },
    'generator.network_error': {
      'en': 'Network error. Please try again.',
      'hu': 'Hálózati hiba. Próbáld újra.',
    },
    'generator.cta': {
      'en': 'GENERATE {count} WORKOUTS',
      'hu': 'GENERÁLD A(Z) {count} EDZÉST',
    },
    'generator.eyebrow': {'en': 'GENERATED FOR YOU', 'hu': 'NEKED GENERÁLT'},
    'generator.title': {
      'en': 'How fast do you want to reach your shape?',
      'hu': 'Mennyi idő alatt érnéd el a formádat?',
    },
    'generator.subtitle': {
      'en': 'Pick how many workouts a week, and we’ll build exactly that many plans.',
      'hu': 'Választasz heti hány edzést, és pontosan annyi tervet készítünk.',
    },
    'generator.weeks_label': {'en': 'Weeks', 'hu': 'Hét'},
    'generator.weeks_unit': {'en': 'WEEKS', 'hu': 'HÉT'},
    'generator.sessions_label': {'en': 'Workouts / week', 'hu': 'Edzés / hét'},
    'generator.muscles_label': {'en': 'Muscle groups', 'hu': 'Izomcsoportok'},
    'generator.muscles_hint': {
      'en': 'Leave empty for all ten groups, or pick a specific focus.',
      'hu': 'Hagyd üresen mind a tíz csoporthoz, vagy válassz konkrét fókuszt.',
    },
    'generator.clear_selection': {
      'en': 'CLEAR SELECTION',
      'hu': 'KIVÁLASZTÁS TÖRLÉSE',
    },
    'generator.preview': {'en': 'PREVIEW', 'hu': 'ELŐNÉZET'},
    'generator.plan_unit': {'en': 'WORKOUTS', 'hu': 'EDZÉSTERV'},
    'generator.preview_line': {
      'en': '{weeks} weeks × {sessions} workouts.',
      'hu': '{weeks} hét × {sessions} edzés.',
    },
    'generator.preview_all_muscles': {
      'en': 'All muscle groups.',
      'hu': 'Az összes izomcsoport.',
    },
    'generator.preview_focus': {
      'en': '{count} focus muscles.',
      'hu': '{count} fókuszizom.',
    },

    // ----- Onboarding (post-registration question flow) -----
    'onboarding.goal_title': {'en': 'What’s your goal?', 'hu': 'Mi a célod?'},
    'onboarding.goal_subtitle': {
      'en': 'We’ll tailor the program to it.',
      'hu': 'Erre szabjuk a programot.',
    },
    'onboarding.goal_lose_fat': {'en': 'Lose fat', 'hu': 'Fogyás'},
    'onboarding.goal_lose_fat_sub': {
      'en': 'Keep muscle in a deficit',
      'hu': 'Tartsd meg az izmot deficit alatt',
    },
    'onboarding.goal_build_muscle': {'en': 'Build muscle', 'hu': 'Izomépítés'},
    'onboarding.goal_build_muscle_sub': {
      'en': 'Maximum hypertrophy',
      'hu': 'Maximális hipertrófia',
    },
    'onboarding.goal_strength': {
      'en': 'Strength & performance',
      'hu': 'Erő és teljesítmény',
    },
    'onboarding.goal_strength_sub': {
      'en': 'Raise your 1RM on the main lifts',
      'hu': 'Növeld az 1RM-et a fő gyakorlatokon',
    },
    'onboarding.goal_maintain': {'en': 'Maintain', 'hu': 'Fenntartás'},
    'onboarding.goal_maintain_sub': {
      'en': 'Keep muscle, refine your look',
      'hu': 'Tartsd az izmot, javítsd az összképet',
    },
    'onboarding.exp_title': {
      'en': 'How experienced are you?',
      'hu': 'Mennyi a tapasztalatod?',
    },
    'onboarding.exp_subtitle': {
      'en': 'How long have you trained regularly?',
      'hu': 'Mióta edzel rendszeresen?',
    },
    'onboarding.exp_beginner': {'en': 'Beginner', 'hu': 'Kezdő'},
    'onboarding.exp_beginner_sub': {
      'en': 'Less than 1 year',
      'hu': 'Kevesebb mint 1 év',
    },
    'onboarding.exp_intermediate': {'en': 'Intermediate', 'hu': 'Haladó'},
    'onboarding.exp_intermediate_sub': {'en': '1–3 years', 'hu': '1–3 év'},
    'onboarding.exp_advanced': {'en': 'Advanced', 'hu': 'Tapasztalt'},
    'onboarding.exp_advanced_sub': {'en': '3+ years', 'hu': '3+ év'},
    'onboarding.exp_elite': {'en': 'Elite', 'hu': 'Elit'},
    'onboarding.exp_elite_sub': {
      'en': '5+ years, coaching knowledge',
      'hu': '5+ év, edzői tudás',
    },
    'onboarding.body_title': {
      'en': 'A few things about you',
      'hu': 'Pár adat rólad',
    },
    'onboarding.body_subtitle': {
      'en': 'We tune your weekly volume to these.',
      'hu': 'Ezekre szabjuk a heti volument.',
    },
    'onboarding.gender': {'en': 'Gender', 'hu': 'Nem'},
    'onboarding.gender_male': {'en': 'Male', 'hu': 'Férfi'},
    'onboarding.gender_female': {'en': 'Female', 'hu': 'Nő'},
    'onboarding.gender_other': {'en': 'Other', 'hu': 'Egyéb'},
    'onboarding.age': {'en': 'Age', 'hu': 'Életkor'},
    'onboarding.years_unit': {'en': 'yr', 'hu': 'év'},
    'onboarding.weight': {'en': 'Body weight', 'hu': 'Testsúly'},
    'onboarding.cardio': {'en': 'Cardio amount', 'hu': 'Cardio mennyiség'},
    'onboarding.cardio_none': {'en': 'None', 'hu': 'Semmi'},
    'onboarding.cardio_light': {'en': 'Light', 'hu': 'Kevés'},
    'onboarding.cardio_moderate': {'en': 'Moderate', 'hu': 'Közepes'},
    'onboarding.cardio_high': {'en': 'A lot', 'hu': 'Sok'},
    'onboarding.schedule_title': {'en': 'Your weekly rhythm', 'hu': 'Heti ritmusod'},
    'onboarding.schedule_subtitle': {
      'en': 'How many days, and how long?',
      'hu': 'Hány nap edzés, mennyi időre?',
    },
    'onboarding.days_per_week': {
      'en': 'Training days / week',
      'hu': 'Edzésnap / hét',
    },
    'onboarding.days_optimal': {
      'en': 'OPTIMAL FOR YOUR LEVEL',
      'hu': 'OPTIMÁLIS A SZINTEDHEZ',
    },
    'onboarding.days_recovery_edge': {
      'en': 'On the edge of recovery',
      'hu': 'A regenerálás határán',
    },
    'onboarding.days_fine': {'en': 'Fine', 'hu': 'Megfelelő'},
    'onboarding.session_length': {
      'en': 'Length of one workout',
      'hu': 'Egy edzés hossza',
    },
    'onboarding.split_title': {'en': 'Training split', 'hu': 'Edzésfelosztás'},
    'onboarding.split_subtitle': {
      'en': 'How should we organise the weeks?',
      'hu': 'Hogyan szervezzük a heteket?',
    },
    'onboarding.split_full_body_sub': {
      'en': 'Every muscle every day, high frequency',
      'hu': 'Minden izom minden nap, magas frekvencia',
    },
    'onboarding.split_upper_lower_sub': {
      'en': 'Upper and lower body on separate days',
      'hu': 'Felső- és alsótest külön napokon',
    },
    'onboarding.split_ppl_sub': {
      'en': 'Push, pull, legs on separate days',
      'hu': 'Tolás, húzás, láb külön napokon',
    },
    'onboarding.split_bro_sub': {
      'en': 'One muscle group / day, 5–6 day week',
      'hu': 'Egy izomcsoport / nap, 5–6 napos hét',
    },
    'onboarding.recommended': {'en': 'RECOMMENDED', 'hu': 'AJÁNLOTT'},
    'onboarding.volume_title': {
      'en': 'Your weekly optimum',
      'hu': 'A heti optimumod',
    },
    'onboarding.volume_subtitle': {
      'en': 'This many working sets per muscle gives ideal results.',
      'hu': 'Ennyi munka-szett izomcsoportonként ad ideális eredményt.',
    },
    'onboarding.save_plan': {'en': 'Save my plan', 'hu': 'Mentsd a tervemet'},
    'onboarding.volume_unit': {
      'en': 'sets / muscle / week',
      'hu': 'szett / izom / hét',
    },
    'onboarding.volume_source': {
      'en': 'Based on RP MEV / MAV',
      'hu': 'RP MEV / MAV alapján',
    },
    'onboarding.fine_tune': {'en': 'Tune', 'hu': 'Hangold'},
    'onboarding.try_a_set': {
      'en': 'Try a set first →',
      'hu': 'Próbálj egy szettet előbb →',
    },

    // ----- i18n sweep: bulk-added keys (auto-aggregated) -----
    'autherr.generate_failed': {'en': 'Couldn\'t generate the plan.', 'hu': 'Generálás sikertelen.'},
    'autherr.save_failed': {'en': 'Couldn\'t save.', 'hu': 'Mentés sikertelen.'},
    'demo.back_to_plan': {'en': 'Back to plan', 'hu': 'Vissza a tervhez'},
    'demo.badge_demo': {'en': 'DEMO', 'hu': 'BEMUTATÓ'},
    'demo.bench_muscles': {'en': 'Chest · Triceps · Front delt', 'hu': 'Mell · Triceps · Elülső deltoid'},
    'demo.done_body': {'en': 'This is what a set looks like. From now on we\'ll keep track of the rest of your workouts, PRs and weekly volume — if you save to your account.', 'hu': 'Így néz ki egy szett. A többi edzésed, PR-jeid és heti volumented mostantól számon tartjuk — ha mented a fiókodba.'},
    'demo.done_title': {'en': 'You\'re done.', 'hu': 'Készen vagy.'},
    'demo.rest_label': {'en': 'REST', 'hu': 'PIHENŐ'},
    'demo.save_progress': {'en': 'Save your progress', 'hu': 'Mentsd a haladásod'},
    'demo.try_hint': {'en': 'Demo set — nothing is saved, just give it a try.', 'hu': 'Bemutató szett — semmi nem mentődik, csak próbáld.'},
    'exercise.change_exercise': {'en': 'Change exercise', 'hu': 'Gyakorlat cseréje'},
    'exercise.no_data': {'en': 'No data', 'hu': 'Nincs adat'},
    'heatmap.less': {'en': 'LESS', 'hu': 'KEVÉS'},
    'heatmap.more': {'en': 'MORE', 'hu': 'SOK'},
    'heatmap.optimal': {'en': 'OPTIMAL', 'hu': 'OPTIMÁLIS'},
    'heatmap.to_goal': {'en': '{n} TO GOAL', 'hu': '{n} A CÉLIG'},
    'hyrox.create_failed': {'en': 'Couldn\'t create the plan.', 'hu': 'Nem sikerült létrehozni a tervet.'},
    'hyrox.create_footnote': {'en': 'One tap creates all 36 training days. You can delete and recreate it anytime.', 'hu': 'Egy kattintás létrehozza mind a 36 edzésnapot. Bármikor törölheted és újra létrehozhatod.'},
    'hyrox.create_plan': {'en': 'Create plan', 'hu': 'Terv létrehozása'},
    'hyrox.default_weights_note': {'en': 'The default weights are for the Men Open division.', 'hu': 'Az alapértelmezett súlyok a Férfi Open divízióé.'},
    'hyrox.delete_failed': {'en': 'Couldn\'t delete.', 'hu': 'Nem sikerült törölni.'},
    'hyrox.delete_plan_body': {'en': 'Are you sure you want to delete the entire HYROX plan?', 'hu': 'Biztosan törlöd a teljes HYROX tervet?'},
    'hyrox.delete_plan_title': {'en': 'Delete plan', 'hu': 'Terv törlése'},
    'hyrox.division_label': {'en': 'DIVISION', 'hu': 'DIVÍZIÓ'},
    'hyrox.division_men_open': {'en': 'Men Open', 'hu': 'Férfi Open'},
    'hyrox.division_men_pro': {'en': 'Men Pro', 'hu': 'Férfi Pro'},
    'hyrox.division_women_open': {'en': 'Women Open', 'hu': 'Női Open'},
    'hyrox.division_women_pro': {'en': 'Women Pro', 'hu': 'Női Pro'},
    'hyrox.exercises_sets': {'en': '{exercises} exercises · {sets} sets', 'hu': '{exercises} gyakorlat · {sets} szett'},
    'hyrox.intro_description': {'en': '12-week preparation plan · 3 training days per week · 4 phases (Base → Build → Peak → Taper). The 8 official stations with competition weights, periodized running and compromised running.', 'hu': '12 hetes felkészülési terv · heti 3 edzésnap · 4 fázis (Alapozás → Építés → Csúcsosítás → Pihentetés). A 8 hivatalos állomás verseny-súlyokkal, periodizált futással és kompromittált futással.'},
    'hyrox.phase_1': {'en': 'Base', 'hu': 'Alapozás'},
    'hyrox.phase_2': {'en': 'Build', 'hu': 'Építés'},
    'hyrox.phase_3': {'en': 'Peak', 'hu': 'Csúcsosítás'},
    'hyrox.phase_4': {'en': 'Taper', 'hu': 'Pihentetés'},
    'hyrox.plan_created': {'en': 'HYROX plan created · {count} workouts ({label})', 'hu': 'HYROX terv létrehozva · {count} edzés ({label})'},
    'hyrox.plan_exists_body': {'en': 'Replace it with a new one? The current plan and its progress will be deleted.', 'hu': 'Lecseréled egy újra? A jelenlegi terv és a benne lévő haladás törlődik.'},
    'hyrox.plan_exists_title': {'en': 'You already have a HYROX plan', 'hu': 'Már van HYROX terved'},
    'hyrox.replace': {'en': 'Replace', 'hu': 'Csere'},
    'hyrox.server_unreachable': {'en': 'Couldn\'t reach the server. Is the backend running?', 'hu': 'Nem értem el a szervert. Fut a backend?'},
    'hyrox.week_n': {'en': 'Week {week}', 'hu': '{week}. hét'},
    'hyrox.weeks_progress': {'en': '12-week preparation · {done} / {total} days done', 'hu': '12 hetes felkészülés · {done} / {total} nap kész'},
    'leaderboard.athlete_fallback': {'en': 'ATHLETE', 'hu': 'ATLÉTA'},
    'leaderboard.empty_country': {'en': 'No country set on your account yet. Set it on the Account screen to appear on the national leaderboard.', 'hu': 'Még nincs ország beállítva a fiókodon. Állítsd be a Fiók képernyőn, hogy felkerülj a nemzeti listára.'},
    'leaderboard.empty_general': {'en': 'No one has earned XP in this round yet — be the first.', 'hu': 'Senki sem szerzett még XP-t ebben a körben — légy te az első.'},
    'leaderboard.load_failed': {'en': 'Couldn\'t load the leaderboard.', 'hu': 'Nem sikerült betölteni a ranglistát.'},
    'leaderboard.scope_country': {'en': 'COUNTRY', 'hu': 'ORSZÁG'},
    'leaderboard.scope_global': {'en': 'GLOBAL', 'hu': 'GLOBAL'},
    'leaderboard.scope_rank': {'en': 'LEVEL', 'hu': 'SZINT'},
    'leaderboard.scope_weekly': {'en': 'WEEK', 'hu': 'HÉT'},
    'leaderboard.title': {'en': 'LEADERBOARD', 'hu': 'RANGLISTA'},
    'leaderboard.you_on_list': {'en': 'YOU ON THE LIST', 'hu': 'TE A LISTÁN'},
    'leaderboard.you_tag': {'en': '(YOU)', 'hu': '(TE)'},
    'muscle.abs': {'en': 'Abs', 'hu': 'Has'},
    'muscle.back': {'en': 'Back', 'hu': 'Hát'},
    'muscle.biceps': {'en': 'Biceps', 'hu': 'Bicepsz'},
    'muscle.calves': {'en': 'Calves', 'hu': 'Vádli'},
    'muscle.chest': {'en': 'Chest', 'hu': 'Mell'},
    'muscle.glutes': {'en': 'Glutes', 'hu': 'Glutesz'},
    'muscle.hamstrings': {'en': 'Hamstrings', 'hu': 'Hamstring'},
    'muscle.legs': {'en': 'Legs', 'hu': 'Comb'},
    'muscle.shoulders': {'en': 'Shoulders', 'hu': 'Váll'},
    'muscle.triceps': {'en': 'Triceps', 'hu': 'Tricepsz'},
    'notif.channel_desc': {'en': 'Daily reminder for your planned workouts.', 'hu': 'Napi emlékeztető a tervezett edzésekre.'},
    'notif.channel_name': {'en': 'Training reminder', 'hu': 'Edzés emlékeztető'},
    'notif.reminder_body': {'en': 'Training day. Start your workout.', 'hu': 'Ma edzésnap. Indítsd a workoutot.'},
    'notif.reminder_title': {'en': 'HEFTOR', 'hu': 'HEFTOR'},
    'oauth.apple_failed': {'en': 'Couldn’t sign in with Apple ID.', 'hu': 'Nem sikerült belépni az Apple ID-val.'},
    'oauth.apple_no_token': {'en': 'Apple sign-in didn’t return a token.', 'hu': 'Az Apple bejelentkezés nem adott vissza tokent.'},
    'oauth.continue_apple': {'en': 'Continue with Apple', 'hu': 'Folytatás Apple-lel'},
    'oauth.continue_google': {'en': 'Continue with Google', 'hu': 'Folytatás Google-lel'},
    'oauth.google_failed': {'en': 'Couldn’t sign in with your Google account.', 'hu': 'Nem sikerült belépni a Google fiókkal.'},
    'oauth.google_no_token': {'en': 'Google sign-in didn’t return a token.', 'hu': 'A Google bejelentkezés nem adott vissza tokent.'},
    'oauth.or': {'en': 'or', 'hu': 'vagy'},
    'plate.below_bar': {'en': '{kg}kg is below the bar weight.', 'hu': '{kg}kg a rúd súlya alatt van.'},
    'plate.minimum': {'en': 'Minimum: {kg}kg (empty bar)', 'hu': 'Minimum: {kg}kg (üres rúd)'},
    'predefined.abs_legs': {'en': 'Abs + Legs', 'hu': 'Has + Comb'},
    'predefined.arm_day': {'en': 'Arm day', 'hu': 'Kar nap'},
    'predefined.back_shoulders': {'en': 'Back + Shoulders', 'hu': 'Hát + Váll'},
    'predefined.biceps_back': {'en': 'Biceps + Back', 'hu': 'Bicepsz + Hát'},
    'predefined.chest_back': {'en': 'Chest + Back', 'hu': 'Mell + Hát'},
    'predefined.chest_triceps': {'en': 'Chest + Triceps', 'hu': 'Mell + Tricepsz'},
    'predefined.glutes_legs': {'en': 'Glutes + Legs', 'hu': 'Glutesz + Comb'},
    'predefined.legs_calves': {'en': 'Legs + Calves', 'hu': 'Láb + Vádli'},
    'predefined.shoulders_triceps': {'en': 'Shoulders + Triceps', 'hu': 'Váll + Tricepsz'},
    'predefined.upper_body': {'en': 'Upper body', 'hu': 'Felsőtest'},
    'progress.hours': {'en': '{h}h', 'hu': '{h} óra'},
    'progress.hours_mins': {'en': '{h}h {rem}m', 'hu': '{h}ó {rem}p'},
    'pw.add_to_my_workouts': {'en': 'Add to my workouts', 'hu': 'Hozzáadás az edzéseimhez'},
    'pw.appbar_title': {'en': 'Recommended workout', 'hu': 'Ajánlott edzés'},
    'pw.db_unreachable': {'en': 'Couldn\'t reach the exercise database.', 'hu': 'Nem sikerült elérni a gyakorlat-adatbázist.'},
    'pw.save_failed': {'en': 'Couldn\'t save. Is the server running?', 'hu': 'Nem sikerült menteni. Fut a szerver?'},
    'pw.subtitle_count': {'en': '{subtitle} · {count} exercises', 'hu': '{subtitle} · {count} gyakorlat'},
    'pwstrength.excellent': {'en': 'Excellent', 'hu': 'Kiváló'},
    'pwstrength.fair': {'en': 'Fair', 'hu': 'Közepes'},
    'pwstrength.strong': {'en': 'Strong', 'hu': 'Erős'},
    'pwstrength.tooShort': {'en': 'Too short', 'hu': 'Túl rövid'},
    'pwstrength.weak': {'en': 'Weak', 'hu': 'Gyenge'},
    'rank.cap_reached': {'en': 'CAP REACHED — LEGENDARY', 'hu': 'CAP ELÉRVE — LEGENDÁS'},
    'stagnation.advice': {'en': '{name} — stalled for {weeks} weeks.', 'hu': '{name} — {weeks} hét stagnál.'},
    'stagnation.try': {'en': ' Try: {tips}', 'hu': ' Próbálj: {tips}'},
    'summary.month_1': {'en': 'Jan', 'hu': 'Jan'},
    'summary.month_10': {'en': 'Oct', 'hu': 'Okt'},
    'summary.month_11': {'en': 'Nov', 'hu': 'Nov'},
    'summary.month_12': {'en': 'Dec', 'hu': 'Dec'},
    'summary.month_2': {'en': 'Feb', 'hu': 'Feb'},
    'summary.month_3': {'en': 'Mar', 'hu': 'Már'},
    'summary.month_4': {'en': 'Apr', 'hu': 'Ápr'},
    'summary.month_5': {'en': 'May', 'hu': 'Máj'},
    'summary.month_6': {'en': 'Jun', 'hu': 'Jún'},
    'summary.month_7': {'en': 'Jul', 'hu': 'Júl'},
    'summary.month_8': {'en': 'Aug', 'hu': 'Aug'},
    'summary.month_9': {'en': 'Sep', 'hu': 'Sze'},
    'summary.workout': {'en': 'Workout', 'hu': 'Edzés'},
    'training.delete_failed': {'en': 'Couldn\'t delete.', 'hu': 'Nem sikerült törölni.'},
    'training.delete_irreversible': {'en': 'This action can\'t be undone.', 'hu': 'Ez a művelet nem visszavonható.'},
    'training.delete_title': {'en': 'Delete "{name}"', 'hu': '"{name}" törlése'},
    'training.name_label': {'en': 'Name', 'hu': 'Név'},
    'training.name_required': {'en': 'Give the workout a name.', 'hu': 'Adj nevet az edzésnek.'},
    'training.no_exercises': {'en': 'No exercises', 'hu': 'Nincs gyakorlat'},
    'training.save_failed': {'en': 'Couldn\'t save.', 'hu': 'Nem sikerült menteni.'},
    'trainingslist.paused': {'en': 'Paused · {done}/{total} sets done', 'hu': 'Félbehagyva · {done}/{total} szett kész'},
    'trainingslist.section_continue': {'en': 'CONTINUE WORKOUT', 'hu': 'FOLYTATHATÓ EDZÉS'},

  };
}

/// Sugar so screens can `Text(t('common.save'))` instead of typing the
/// full singleton lookup. Lives outside the class so it's a top-level
/// function (no `static` cruft at call sites).
String t(String key) => AppStrings.instance.t(key);

/// Substitute named placeholders like `{n}` or `{kg}` inside a translation.
/// Lets us share one template across both languages.
String tFmt(String key, Map<String, Object?> vars) {
  var s = AppStrings.instance.t(key);
  vars.forEach((k, v) {
    s = s.replaceAll('{$k}', '${v ?? ''}');
  });
  return s;
}
