"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Lang = "en" | "hu";

const STORAGE_KEY = "eronlet-lang";

// ---------------------------------------------------------------------------
// Translation dictionary
// ---------------------------------------------------------------------------
//
// Default language is English ("en"). The Hungarian copy is the user-facing
// translation surface — keep it idiomatic, not literal. Long bodies are split
// into the same key in both languages so the section renderer doesn't need
// to know which language is active.
//
// Headings that mix sans + serif italic split into `_main` and `_accent`
// so the page can drop the accent through the serif font.

type Dict = Record<string, string>;

const en: Dict = {
  "nav.features": "Features",
  "nav.how": "How",
  "nav.stats": "Numbers",
  "nav.ranks": "Ranks",
  "nav.pricing": "Pricing",
  "nav.faq": "FAQ",
  "nav.about": "About",
  "nav.download": "Download",

  "about.eyebrow": "ABOUT HEFTOR",
  "about.heading_main": "Strength training,",
  "about.heading_accent": "engineered to last.",
  "about.subtitle":
    "HEFTOR is a quiet, opinionated training app for lifters who want progression they can actually see.",
  "about.story.title": "Where it started",
  "about.story.body":
    "HEFTOR began as a single spreadsheet. A logbook that tracked every set, calculated estimated 1RM and reminded a small group of training partners which exercise was next. When the spreadsheet outgrew its rows we rebuilt it as an app — same philosophy, more discipline.",
  "about.belief.title": "What we believe",
  "about.belief.body":
    "Most training apps drown the lifter in features. We believe the opposite: a small number of well-designed surfaces, monochrome, calm, with the math hidden until you ask for it. The app should disappear behind your training, not in front of it.",
  "about.engine.title": "The engine",
  "about.engine.body":
    "Behind every screen there is one simple model: progressive overload calibrated by your last RPE and PR history. We compute volume against MEV / MAV / MRV landmarks per muscle group, surface real PRs versus vanity PRs, and rebalance your weekly plan automatically.",
  "about.values.title": "Our values",
  "about.value.privacy": "Privacy by default — no ads, no tracking, no data sold.",
  "about.value.transparency":
    "Open methodology — read why the engine prescribed what it prescribed.",
  "about.value.craft": "Craft — every screen monochrome, considered, slow to ship.",
  "about.value.respect": "Respect the lifter — the app should serve you, not the other way around.",
  "about.cta.title": "Want to get a heads-up when we ship new things?",
  "about.cta.subtitle":
    "We send one short email a month — release notes, a training read, and what we're working on. No spam, ever.",
  "about.cta.button": "Subscribe to updates",

  "hero.headline_main": "Strength engineered",
  "hero.headline_accent": "intelligently.",
  "hero.subtitle": "Adaptive training that learns from every set you log.",
  "hero.cta": "Download →",
  "hero.community_title": "JOIN HEFTOR COMMUNITY",
  "hero.community_members": "10K+ committed lifters",

  "features.heading_main": "Powerful Features,",
  "features.heading_accent": "Thoughtfully Designed",
  "features.subtitle":
    "Features designed to enhance training clarity and progression — creating a more intuitive and effortless workout home.",
  "features.adaptive.title": "Adaptive Progression",
  "features.adaptive.body":
    "Maintain the ideal training stimulus by letting HEFTOR continuously suggest the next kg and rep target based on your last RPE and PR history.",
  "features.pr.title": "Smart PR Detection",
  "features.pr.body":
    "The session-save engine compares every set's Epley e1RM against your all-time max — so a real PR is celebrated and a vanity PR is suppressed.",
  "features.volume.title": "Volume Intelligence",
  "features.volume.body":
    "Per-muscle weekly volume vs. MEV / MAV / MRV landmarks — see exactly which muscle is under-trained and which is over the line.",
  "features.unified.title": "Unified Training Hub",
  "features.unified.body":
    "Dashboard, workouts, progress and calendar in one consistent monochrome surface. No tabs to learn, no settings to fight.",

  "steps.heading_main": "Set your goal.",
  "steps.heading_accent": "HEFTOR does the rest.",
  "steps.subtitle":
    "Built to simplify daily training through intelligent, connected systems.",
  "steps.1.title": "Onboard your goal",
  "steps.1.body":
    "In 90 seconds you tell HEFTOR your goal, experience and weekly rhythm.",
  "steps.2.title": "Get your plan",
  "steps.2.body":
    "The engine builds your weekly plan along those parameters — and re-balances it every week.",
  "steps.3.title": "Train and track",
  "steps.3.body":
    "Log every set with RPE; the engine calibrates the next session. You just train.",

  "radial.heading_main": "Every detail,",
  "radial.heading_accent": "precisely controlled.",
  "radial.subtitle":
    "Features designed to enhance training clarity and progression — creating a more intuitive and effortless workout home.",
  "radial.label.1": "Intelligent Progression",
  "radial.label.2": "Adaptive Plan",
  "radial.label.3": "Smart Timer",
  "radial.label.4": "Real PR Detection",
  "radial.label.5": "Plate Calculator",
  "radial.label.6": "Monochrome UI",

  "stats.heading_main": "Designed for performance,",
  "stats.heading_accent": "proven by the numbers.",
  "stats.faster": "Faster Progression",
  "stats.sets": "Sets Logged Daily",
  "stats.ranks": "Ranks · I to LEGEND",
  "stats.retention": "Retention Rate",

  "cta.heading_main": "See your strength.",
  "cta.heading_accent": "Track your progression.",
  "cta.subtitle":
    "From the first set to your tenth-year PR — HEFTOR remembers every rep so you don't have to.",
  "cta.button": "Download →",

  "footer.tagline":
    "Smarter strength through thoughtfully designed technology.",
  "footer.email_placeholder": "Enter your email",
  "footer.email_button": "Join →",
  "footer.newsletter.ok": "Thanks — you're on the list.",
  "footer.newsletter.already": "You're already subscribed.",
  "footer.community": "JOIN HEFTOR COMMUNITY · 10K+ MEMBERS",
  "footer.company": "Company",
  "footer.company.about": "About",
  "footer.company.press": "Press",
  "footer.company.careers": "Careers",
  "footer.company.contact": "Contact",
  "footer.product": "Product",
  "footer.product.features": "Features",
  "footer.product.ranks": "Ranks",
  "footer.product.pricing": "Pricing",
  "footer.product.faq": "FAQ",
  "footer.resources": "Resources",
  "footer.resources.blog": "Blog",
  "footer.resources.methodology": "Methodology",
  "footer.resources.changelog": "Changelog",
  "footer.resources.privacy": "Privacy",
  "footer.lang": "Language",
};

const hu: Dict = {
  "nav.features": "Funkciók",
  "nav.how": "Hogyan",
  "nav.stats": "Számok",
  "nav.ranks": "Rangok",
  "nav.pricing": "Árazás",
  "nav.faq": "GYIK",
  "nav.about": "Rólunk",
  "nav.download": "Letöltés",

  "about.eyebrow": "AZ HEFTORROL",
  "about.heading_main": "Erőedzés,",
  "about.heading_accent": "tartós alapokra építve.",
  "about.subtitle":
    "Az HEFTOR egy csendes, határozott szemléletű edzésapp olyan emelőknek, akik tényleg látható progressziót akarnak.",
  "about.story.title": "Hogyan kezdődött",
  "about.story.body":
    "Az HEFTOR egy táblázattal kezdődött. Egy logbook, amely minden szettet rögzített, becsült 1RM-et számolt, és egy kis edzőpartneri körnek emlékeztetőt adott, melyik gyakorlat jön. Amikor a táblázat kinőtte a sorait, alkalmazássá építettük újra — ugyanaz a filozófia, csak fegyelmezettebben.",
  "about.belief.title": "Amiben hiszünk",
  "about.belief.body":
    "A legtöbb edzésapp funkciókkal nyomja agyon a felhasználót. Mi pont az ellenkezőjében hiszünk: kevés, jól megtervezett felület, monokróm, nyugodt, a matekot rejtve tartva, amíg nem kéred. Az appnak az edzésed mögött kell eltűnnie, nem előtte.",
  "about.engine.title": "A motor",
  "about.engine.body":
    "Minden képernyő mögött egyetlen egyszerű modell áll: progresszív túlterhelés az utolsó RPE-d és PR-historyd alapján kalibrálva. Izomcsoportonkénti volume-ot MEV / MAV / MRV küszöbökhöz mérünk, megkülönböztetjük a valódi PR-t a hiú PR-tól, és hetente automatikusan újrahangoljuk a tervedet.",
  "about.values.title": "Értékeink",
  "about.value.privacy": "Adatvédelem alapból — nincs hirdetés, nincs követés, semmilyen adat nem cserél gazdát.",
  "about.value.transparency":
    "Átlátható módszertan — olvasható, miért javasolta a motor, amit javasolt.",
  "about.value.craft": "Kézművesség — minden képernyő monokróm, átgondolt, lassan tervezett.",
  "about.value.respect": "Tiszteld az emelőt — az app téged szolgáljon, ne fordítva.",
  "about.cta.title": "Akarsz szólni, amikor szállítunk valamit?",
  "about.cta.subtitle":
    "Havi egy rövid emailt küldünk — release notes, egy edzéscikk, és amin éppen dolgozunk. Nulla spam.",
  "about.cta.button": "Feliratkozás a frissítésekre",

  "hero.headline_main": "Erő, intelligensen",
  "hero.headline_accent": "tervezve.",
  "hero.subtitle":
    "Adaptív edzés, ami minden naplózott szettedből tanul.",
  "hero.cta": "Letöltés →",
  "hero.community_title": "CSATLAKOZZ AZ HEFTOR KÖZÖSSÉGHEZ",
  "hero.community_members": "10K+ elkötelezett emelő",

  "features.heading_main": "Erős funkciók,",
  "features.heading_accent": "alaposan tervezve.",
  "features.subtitle":
    "Funkciók, amelyek tisztábbá és tervezhetőbbé teszik az edzést — egy intuitív és sallangmentes edzés-otthon.",
  "features.adaptive.title": "Adaptív progresszió",
  "features.adaptive.body":
    "Tartsd meg az ideális stimulust — a HEFTOR folyamatosan javasolja a következő kg- és rep-célt az utolsó RPE-d és PR-history-d alapján.",
  "features.pr.title": "Okos PR detektálás",
  "features.pr.body":
    "Minden szett Epley e1RM-jét összeveti az all-time maxoddal — a valódi PR-t megünnepli, a hiú PR-t elnyomja.",
  "features.volume.title": "Volume intelligencia",
  "features.volume.body":
    "Izmonkénti heti volume MEV / MAV / MRV küszöbökhöz mérve — látod pontosan melyik izom van alul, és melyik van túltolva.",
  "features.unified.title": "Egységes edzés-hub",
  "features.unified.body":
    "Dashboard, edzések, fejlődés és naptár ugyanazon a monochrome felületen. Nincs taneszköz, nincs beállítás-káosz.",

  "steps.heading_main": "Állítsd be a célt.",
  "steps.heading_accent": "A HEFTOR csinálja a többit.",
  "steps.subtitle":
    "Arra építve, hogy az okos, kapcsolt rendszerek egyszerűsítsék a napi edzést.",
  "steps.1.title": "Add meg a célt",
  "steps.1.body":
    "90 másodperc alatt megadod a célodat, a tapasztalatodat és a heti ritmusodat.",
  "steps.2.title": "Kapj egy tervet",
  "steps.2.body":
    "A HEFTOR a megadott szempontok mentén megépíti a heti tervedet — hetente egyszer újraszámolja.",
  "steps.3.title": "Edz és kövess",
  "steps.3.body":
    "Minden szettet RPE-vel jegyzel, az engine kalibrálja a következő edzést. Te csak edzel.",

  "radial.heading_main": "Minden részlet,",
  "radial.heading_accent": "precízen irányítva.",
  "radial.subtitle":
    "Funkciók, amelyek tisztábbá és tervezhetőbbé teszik az edzést — egy intuitív és sallangmentes edzés-otthon.",
  "radial.label.1": "Okos progresszió",
  "radial.label.2": "Adaptív terv",
  "radial.label.3": "Smart timer",
  "radial.label.4": "Valós PR detektálás",
  "radial.label.5": "Tárcsa kalkulátor",
  "radial.label.6": "Monochrome UI",

  "stats.heading_main": "Teljesítményre tervezve,",
  "stats.heading_accent": "számokkal bizonyítva.",
  "stats.faster": "Gyorsabb progresszió",
  "stats.sets": "Napi szett-logolás",
  "stats.ranks": "Rang · I-től LEGEND-ig",
  "stats.retention": "Megtartási arány",

  "cta.heading_main": "Lásd az erődet.",
  "cta.heading_accent": "Kövesd a fejlődésed.",
  "cta.subtitle":
    "Az első szettől a tizedik éves PR-ig — a HEFTOR minden repet emlékszik helyetted.",
  "cta.button": "Letöltés →",

  "footer.tagline":
    "Okosabb erő alaposan megtervezett technológián keresztül.",
  "footer.email_placeholder": "Add meg az email-címed",
  "footer.email_button": "Csatlakozás →",
  "footer.newsletter.ok": "Köszönjük — fent vagy a listán.",
  "footer.newsletter.already": "Már fel vagy iratkozva.",
  "footer.community": "CSATLAKOZZ AZ HEFTOR KÖZÖSSÉGHEZ · 10K+ TAG",
  "footer.company": "Cég",
  "footer.company.about": "Rólunk",
  "footer.company.press": "Sajtó",
  "footer.company.careers": "Karrier",
  "footer.company.contact": "Kapcsolat",
  "footer.product": "Termék",
  "footer.product.features": "Funkciók",
  "footer.product.ranks": "Rangok",
  "footer.product.pricing": "Árazás",
  "footer.product.faq": "GYIK",
  "footer.resources": "Források",
  "footer.resources.blog": "Blog",
  "footer.resources.methodology": "Módszertan",
  "footer.resources.changelog": "Változások",
  "footer.resources.privacy": "Adatvédelem",
  "footer.lang": "Nyelv",
};

const translations: Record<Lang, Dict> = { en, hu };

// ---------------------------------------------------------------------------
// Provider + hook
// ---------------------------------------------------------------------------

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
};

const LangContext = createContext<Ctx | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  // SSR-safe: always start at "en". After mount we read the persisted choice
  // so the first paint is deterministic — no flash if the stored value is
  // also "en", a quick switch otherwise.
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    // Hydrate from localStorage on mount. React 19's `set-state-in-effect`
    // rule flags this, but the extra render is intentional: SSR has no
    // access to localStorage, so we boot with "en" and switch on the client
    // when the persisted choice differs. No clean alternative without
    // `useSyncExternalStore`, which would add subscription plumbing for
    // a single read.
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "en" || stored === "hu") {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLangState(stored);
      }
    } catch {
      // localStorage unavailable (private mode, server, etc.) — leave as "en".
    }
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      // Persisting failed — runtime state still updates this session.
    }
  };

  // Falls back to English then to the raw key so a missing translation is
  // visible during development but never blows the layout.
  const t = (key: string) =>
    translations[lang][key] ?? translations.en[key] ?? key;

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) {
    throw new Error("useLang must be used inside <LangProvider>");
  }
  return ctx;
}
