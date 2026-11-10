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
    language: "Language",
    book: "Booking",
  },
  hero: {
    tagline: "House, dance and whitegirl music for graduation balls, events and clubs.",
    next: "Next",
  },
  about: {
    heading: "About",
    text: "17-year-old DJ from Zlín. House, EDM and whitegirl music. Loud sets.",
  },
  services: {
    intro:
      "DJ for graduation balls, private and corporate events and clubs. House, dance music and whitegirl music. Based in Zlín, playing across the Zlín Region and nearby.",
    items: [
      { title: "Graduation balls", detail: "Maturitní plesy" },
      { title: "Events & parties", detail: "Private and corporate events" },
      { title: "Clubs", detail: "Club nights" },
    ],
    genres: ["House", "Dance music", "Whitegirl music"],
    area: "Zlín, the Zlín Region and nearby",
    serviceName: "DJ for graduation balls, events and clubs",
  },
  tour: {
    heading: "Dates",
    past: "Past",
  },
  audio: {
    heading: "Listen",
    listen: "Listen on SoundCloud",
    emptyTitle: "New mixes coming soon.",
    emptyText: "Live sets and mixes will land here. Until then, catch the latest clips on Instagram.",
    emptyCta: "Instagram",
  },
  videos: {
    heading: "Video",
  },
  booking: {
    heading: "Booking",
    text: "Open for dates in 2026 and 2027. Tell me about your event.",
    contact: "Send an inquiry",
    name: "Name",
    email: "Email",
    eventDate: "Event date (optional)",
    message: "Message",
    submit: "Send",
    cancel: "Cancel",
    sending: "Sending…",
    sent: "Sent. Thank you.",
    error: "Something went wrong. Try again.",
  },
  footer: {
    privacy: "Privacy",
    terms: "Terms",
    rightsReserved: "All rights reserved.",
  },
  legal: {
    returnToMain: "Back to the main page",
  },
  loading: "Loading",
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
    language: "Jazyk",
    book: "Booking",
  },
  hero: {
    tagline: "House, dance a whitegirl music na maturitní plesy, akce a do klubů.",
    next: "Nejbližší",
  },
  about: {
    heading: "O mně",
    text: "17letý DJ ze Zlína. House, EDM a whitegirl music. Sety naplno.",
  },
  services: {
    intro:
      "DJ na maturitní plesy, soukromé i firemní akce a do klubů. Hraju house, dance music a whitegirl music. Zlín, Zlínský kraj a okolí.",
    items: [
      { title: "Maturitní plesy", detail: "DJ na maturitní ples" },
      { title: "Akce a oslavy", detail: "Soukromé i firemní akce" },
      { title: "Kluby", detail: "DJ do klubu" },
    ],
    genres: ["House", "Dance music", "Whitegirl music"],
    area: "Zlín, Zlínský kraj a okolí",
    serviceName: "DJ na maturitní plesy, akce a do klubů",
  },
  tour: {
    heading: "Termíny",
    past: "Proběhlo",
  },
  audio: {
    heading: "Poslech",
    listen: "Poslechnout na SoundCloudu",
    emptyTitle: "Nové mixy už brzy.",
    emptyText: "Live sety a mixy přibudou sem. Do té doby sledujte novinky na Instagramu.",
    emptyCta: "Instagram",
  },
  videos: {
    heading: "Video",
  },
  booking: {
    heading: "Booking",
    text: "Volné termíny na rok 2026 a 2027. Napište mi o vaší akci.",
    contact: "Napsat poptávku",
    name: "Jméno",
    email: "E-mail",
    eventDate: "Datum akce (nepovinné)",
    message: "Zpráva",
    submit: "Odeslat",
    cancel: "Zrušit",
    sending: "Odesílám…",
    sent: "Odesláno. Děkuji.",
    error: "Něco se pokazilo. Zkuste to znovu.",
  },
  footer: {
    privacy: "Ochrana údajů",
    terms: "Podmínky",
    rightsReserved: "Všechna práva vyhrazena.",
  },
  legal: {
    returnToMain: "Zpět na úvod",
  },
  loading: "Načítám",
};

export const ui: Record<Lang, typeof en> = { en, cs };
