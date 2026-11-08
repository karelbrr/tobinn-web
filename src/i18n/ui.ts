export const languages = {
  cs: "CZ",
  en: "EN",
} as const;

export type Lang = keyof typeof languages;

export const defaultLang: Lang = "en";

export function toLang(locale: string | undefined): Lang {
  return locale && locale in languages ? (locale as Lang) : defaultLang;
}

// "/cs/privacy" -> "privacy", "/cs/" -> "", "/privacy" -> "privacy"
export function getPathWithoutLang(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] && segments[0] !== defaultLang && segments[0] in languages) {
    segments.shift();
  }
  return segments.join("/");
}

const en = {
  meta: {
    title: "DJ TOBINN – DJ for Proms, Events & Clubs | Zlín",
    description:
      "House, dance and whitegirl music DJ for graduation balls (maturitní plesy), private and corporate events and clubs in Zlín, the Zlín Region and nearby.",
    ogDescription:
      "DJ for graduation balls, events and clubs. House, dance and whitegirl music. Zlín, the Zlín Region and nearby.",
    ogLocale: "en_US",
  },
  nav: {
    menu: "Menu",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    language: "Language",
    about: "About",
    services: "Services",
    tour: "Tour",
    audio: "Audio",
    video: "Video",
    book: "Book",
  },
  about: {
    lines: ["17-YEAR-OLD DJ.", "HOUSE, EDM &", "WHITE GIRL MUSIC."],
    outlinedLine: "LOUD SETS.",
  },
  services: {
    heading: ["DJ", "ZLÍN"],
    intro:
      "DJ for graduation balls, private and corporate events and clubs. House, dance music and whitegirl music. Based in Zlín, playing across the Zlín Region and nearby.",
    items: [
      { title: "GRADUATION BALLS", detail: "Maturitní plesy" },
      { title: "EVENTS & PARTIES", detail: "Private & corporate events" },
      { title: "CLUBS", detail: "Club nights" },
    ],
    genres: ["HOUSE", "DANCE MUSIC", "WHITEGIRL MUSIC"],
    area: "ZLÍN · ZLÍN REGION & NEARBY",
    serviceName: "DJ for graduation balls, events and clubs",
  },
  tour: {
    heading: ["DATES"],
    past: "(PAST)",
  },
  audio: {
    heading: ["AUDIO", "ARCHIVE"],
    listen: "LISTEN",
    emptyTitle: "NEW MIXES COMING SOON.",
    emptyText:
      "Live sets and mixes will land here. Until then, catch the latest clips on Instagram.",
    emptyCta: "INSTAGRAM",
  },
  videos: {
    heading: ["VIDEO", "ARCHIVE"],
  },
  booking: {
    heading: "BOOKING",
    contact: "CONTACT",
    orContactOn: "OR CONTACT ON",
    name: "Name",
    email: "Email",
    eventDate: "Event Date (Optional)",
    message: "Message",
    submit: "SUBMIT",
    cancel: "CANCEL",
    sending: "SENDING...",
    sent: "SENT SUCCESSFULLY!",
    error: "ERROR. TRY AGAIN.",
  },
  footer: {
    privacy: "PRIVACY POLICY",
    terms: "TERMS & CONDITIONS",
    rightsReserved: "ALL RIGHTS RESERVED.",
  },
  legal: {
    returnToMain: "RETURN TO MAIN",
  },
};

const cs: typeof en = {
  meta: {
    title: "DJ TOBINN – DJ na maturitní plesy, akce a do klubu | Zlín",
    description:
      "DJ na maturitní plesy, soukromé i firemní akce a do klubů. House, dance music a whitegirl music. Zlín, Zlínský kraj a okolí. Nezávazná poptávka online.",
    ogDescription:
      "DJ na maturitní plesy, akce a do klubů. House, dance a whitegirl music. Zlín, Zlínský kraj a okolí.",
    ogLocale: "cs_CZ",
  },
  nav: {
    menu: "Menu",
    openMenu: "Otevřít menu",
    closeMenu: "Zavřít menu",
    language: "Jazyk",
    about: "O mně",
    services: "Služby",
    tour: "Tour",
    audio: "Audio",
    video: "Video",
    book: "Booking",
  },
  about: {
    lines: ["17LETÝ DJ.", "HOUSE, EDM &", "WHITE GIRL MUSIC."],
    outlinedLine: "SETY NAPLNO.",
  },
  services: {
    heading: ["DJ", "ZLÍN"],
    intro:
      "DJ na maturitní plesy, soukromé i firemní akce a do klubů. Hraju house, dance music a whitegirl music. Zlín, Zlínský kraj a okolí.",
    items: [
      { title: "MATURITNÍ PLESY", detail: "DJ na maturitní ples" },
      { title: "AKCE & OSLAVY", detail: "DJ pro soukromé i firemní akce" },
      { title: "KLUBY", detail: "DJ do klubu" },
    ],
    genres: ["HOUSE", "DANCE MUSIC", "WHITEGIRL MUSIC"],
    area: "ZLÍN · ZLÍNSKÝ KRAJ A OKOLÍ",
    serviceName: "DJ na maturitní plesy, akce a do klubů",
  },
  tour: {
    heading: ["TERMÍNY"],
    past: "(PROBĚHLO)",
  },
  audio: {
    heading: ["AUDIO", "ARCHIV"],
    listen: "PŘEHRÁT",
    emptyTitle: "NOVÉ MIXY UŽ BRZY.",
    emptyText:
      "Live sety a mixy přibudou sem. Do té doby sledujte novinky na Instagramu.",
    emptyCta: "INSTAGRAM",
  },
  videos: {
    heading: ["VIDEO", "ARCHIV"],
  },
  booking: {
    heading: "BOOKING",
    contact: "KONTAKT",
    orContactOn: "NEBO PIŠTE NA",
    name: "Jméno",
    email: "E-mail",
    eventDate: "Datum akce (nepovinné)",
    message: "Zpráva",
    submit: "ODESLAT",
    cancel: "ZRUŠIT",
    sending: "ODESÍLÁM...",
    sent: "ODESLÁNO!",
    error: "CHYBA. ZKUSTE TO ZNOVU.",
  },
  footer: {
    privacy: "OCHRANA OSOBNÍCH ÚDAJŮ",
    terms: "OBCHODNÍ PODMÍNKY",
    rightsReserved: "VŠECHNA PRÁVA VYHRAZENA.",
  },
  legal: {
    returnToMain: "ZPĚT NA ÚVOD",
  },
};

export const ui: Record<Lang, typeof en> = { en, cs };
