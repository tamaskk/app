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
