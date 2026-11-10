import type { Lang } from "./ui";

export interface LegalSection {
  heading: string;
  body: string;
  email?: string;
}

export interface LegalDocument {
  title: string;
  sections: LegalSection[];
  closing: LegalSection;
}

export const privacyPolicy: Record<Lang, LegalDocument> = {
  en: {
    title: "Privacy policy",
    sections: [
      {
        heading: "1. Data collection",
        body: "We collect only the bare minimum data necessary to process booking requests. This may include your name, email address, and event details submitted via direct communication. We do not use invasive tracking pixels or third-party analytics cookies.",
      },
      {
        heading: "2. Data usage",
        body: "Any information you provide is used strictly for direct communication regarding gigs, events, and bookings. We do not sell, rent, or share your contact information with external corporations or third-party advertisers.",
      },
      {
        heading: "3. Security",
        body: "Communications sent via email are stored securely using standard encryption. However, be advised that transmission over the public internet is never 100% secure. Do not transmit sensitive financial data via unencrypted channels.",
      },
      {
        heading: "4. Third-party platforms",
        body: "Our site contains links to external platforms such as Instagram and SoundCloud. Once you leave this domain, you are subject to the privacy policies and terms of those respective platforms.",
      },
    ],
    closing: {
      heading: "Contact",
      body: "For any privacy concerns or data removal requests, contact:",
      email: "contact@tobinn.cz",
    },
  },
  cs: {
    title: "Ochrana osobních údajů",
    sections: [
      {
        heading: "1. Sběr údajů",
        body: "Shromažďujeme jen nezbytné minimum údajů potřebných k vyřízení poptávek na booking. Může jít o vaše jméno, e-mailovou adresu a podrobnosti o akci, které nám zašlete v rámci přímé komunikace. Nepoužíváme sledovací pixely ani analytické cookies třetích stran.",
      },
      {
        heading: "2. Využití údajů",
        body: "Veškeré údaje, které nám poskytnete, používáme výhradně pro přímou komunikaci ohledně vystoupení, akcí a bookingu. Vaše kontaktní údaje neprodáváme, nepronajímáme ani nesdílíme s externími společnostmi či inzerenty.",
      },
      {
        heading: "3. Zabezpečení",
        body: "Komunikace zaslaná e-mailem je bezpečně uložena s využitím standardního šifrování. Mějte však na paměti, že přenos přes veřejný internet nikdy není stoprocentně bezpečný. Citlivé finanční údaje neposílejte nešifrovanými kanály.",
      },
      {
        heading: "4. Platformy třetích stran",
        body: "Web obsahuje odkazy na externí platformy, jako je Instagram a SoundCloud. Jakmile tento web opustíte, řídíte se zásadami ochrany soukromí a podmínkami těchto platforem.",
      },
    ],
    closing: {
      heading: "Kontakt",
      body: "S dotazy k ochraně osobních údajů nebo žádostí o jejich výmaz se obraťte na:",
      email: "contact@tobinn.cz",
    },
  },
};

export const termsAndConditions: Record<Lang, LegalDocument> = {
  en: {
    title: "Terms & conditions",
    sections: [
      {
        heading: "1. General terms",
        body: "By accessing this website and utilizing our booking services, you agree to be bound by these terms and conditions. If you do not agree with them, please leave the website.",
      },
      {
        heading: "2. Booking",
        body: "All booking inquiries are subject to availability, scheduling, and final confirmation by management. An inquiry constitutes a request, not a binding contract. Contracts are only valid once formally signed and applicable deposits are cleared.",
      },
      {
        heading: "3. Intellectual property",
        body: "All audio, branding, logos, and typographic structures displayed on this site are the intellectual property of DJ Tobinn. Unauthorized reproduction, redistribution, or commercial exploitation is strictly prohibited.",
      },
      {
        heading: "4. Limitation of liability",
        body: "We are not liable for any direct, indirect, or incidental damages arising from the use of this website, unavailability of services, or interaction with third-party embeds.",
      },
    ],
    closing: {
      heading: "Last update",
      body: "These terms were last modified in 2026. We reserve the right to update these terms at any time without prior notice.",
    },
  },
  cs: {
    title: "Obchodní podmínky",
    sections: [
      {
        heading: "1. Obecná ustanovení",
        body: "Přístupem na tento web a využitím našich bookingových služeb souhlasíte s těmito obchodními podmínkami. Pokud s nimi nesouhlasíte, web prosím opusťte.",
      },
      {
        heading: "2. Booking",
        body: "Všechny poptávky na booking podléhají dostupnosti, harmonogramu a konečnému potvrzení managementem. Poptávka je pouze žádostí, nikoli závaznou smlouvou. Smlouva je platná až po jejím formálním podpisu a uhrazení případné zálohy.",
      },
      {
        heading: "3. Duševní vlastnictví",
        body: "Veškeré audio, branding, loga a typografické prvky zobrazené na tomto webu jsou duševním vlastnictvím DJ Tobinn. Neoprávněné kopírování, šíření nebo komerční využití je přísně zakázáno.",
      },
      {
        heading: "4. Omezení odpovědnosti",
        body: "Neneseme odpovědnost za žádné přímé, nepřímé ani nahodilé škody vzniklé v souvislosti s používáním tohoto webu, nedostupností služeb nebo interakcí s obsahem třetích stran.",
      },
    ],
    closing: {
      heading: "Poslední aktualizace",
      body: "Tyto podmínky byly naposledy upraveny v roce 2026. Vyhrazujeme si právo je kdykoli změnit bez předchozího upozornění.",
    },
  },
};
