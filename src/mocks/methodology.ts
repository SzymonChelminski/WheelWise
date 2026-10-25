/*
 * Methodology page text for the design preview, Polish and English.
 * The wording is a proposal: every figure must be checked
 * against src/config/cost-model.ts before it goes live.
 */
export interface MethodologyCopy {
  title: string;
  intro: string;
  tocLabel: string;
  sections: {
    id: string;
    heading: string;
    paragraphs: string[];
    list?: string[];
  }[];
  sourcesCaption: string;
  sourcesColumns: string[];
  sources: { name: string; url: string; what: string; updated: string; licence: string }[];
  disclaimerTitle: string;
  disclaimers: string[];
}

const pl: MethodologyCopy = {
  title: "Jak liczymy",
  intro: "WheelWise nie zgaduje. Każda kwota na stronie powstaje z publicznych danych i jawnego modelu kosztów. Tu opisujemy, skąd bierzemy liczby i gdzie kończy się ich dokładność.",
  tocLabel: "Na tej stronie",
  sections: [
    {
      id: "ceny",
      heading: "Ceny aut są orientacyjne",
      paragraphs: [
        "Katalog aut i ceny pochodzą z otwartego zbioru ADEME Car Labelling, prowadzonego przez francuską agencję rządową. To ceny katalogowe nowych aut we Francji.",
        "Cenę przeliczamy na złote po średnim kursie euro NBP, zamieniamy francuski VAT 20% na polski 23% i zaokrąglamy do 100 zł. Dla każdego modelu z danym silnikiem i skrzynią pokazujemy cenę najtańszej wersji.",
        "Producenci ustalają ceny osobno dla każdego kraju, więc cena w polskim salonie może się różnić o kilka procent lub więcej. Dlatego przy każdej cenie piszemy „cena orientacyjna” i podajemy datę cennika.",
      ],
    },
    {
      id: "koszty",
      heading: "Z czego składa się koszt",
      paragraphs: [
        "Całkowity koszt to suma sześciu kategorii. Ceny zakupu nie doliczamy: jej miejsce zajmuje utrata wartości, czyli ta część ceny, której nie odzyskasz przy sprzedaży.",
      ],
      list: [
        "Utrata wartości: różnica między ceną a szacowaną wartością auta po wybranym okresie.",
        "Paliwo i energia: zużycie WLTP pomnożone przez Twój przebieg i aktualną cenę paliwa lub prądu.",
        "Ubezpieczenie: OC albo OC z AC dla wybranego wieku kierowcy, albo składka, którą podasz.",
        "Serwis: przeglądy i obsługa okresowa.",
        "Części i eksploatacja: opony, hamulce i inne części zużywalne.",
        "Opłaty: rejestracja i okresowe badania techniczne.",
      ],
    },
    {
      id: "szacunki",
      heading: "Co oznacza znak ≈",
      paragraphs: [
        "Dla utraty wartości, ubezpieczenia, serwisu i części nie istnieją otwarte dane dla każdego modelu. Liczymy je modelem, którego parametry dobraliśmy na podstawie opublikowanych średnich rynkowych. Każdą taką kwotę poprzedza znak ≈.",
        "Zużycie WLTP jest zwykle niższe niż w codziennej jeździe, szczególnie w hybrydach plug-in. Rzeczywisty koszt paliwa będzie więc raczej wyższy niż pokazany.",
      ],
    },
    {
      id: "moc",
      heading: "Moc aut elektrycznych i hybryd",
      paragraphs: [
        "Dla aut benzynowych, diesli i aut na LPG źródło podaje moc maksymalną silnika i taką pokazujemy.",
        "Dla hybryd i hybryd plug-in źródło podaje tylko moc silnika spalinowego. Moc całego układu, razem z silnikiem elektrycznym, jest wyższa, ale nie ma jej w danych. Dlatego przy tych autach piszemy „moc silnika spalinowego”.",
        "Dla aut elektrycznych w danych nie ma mocy maksymalnej. Pokazujemy najwyższą wartość, jaką podaje źródło. Dla większości modeli jest to moc znamionowa (ciągła), wyraźnie niższa od mocy szczytowej z katalogu producenta: Tesla Model 3 ma w danych 88 kW. Dlatego przy autach elektrycznych piszemy „moc według danych źródłowych”. Ta wartość ma też niewielki wpływ na szacunek ubezpieczenia.",
      ],
    },
    {
      id: "zarobki",
      heading: "Skala zarobków",
      paragraphs: [
        "Skala pokazuje miesięczny dochód netto (na rękę), przy którym zakup auta i paliwo zajmują określoną część budżetu. Cenę auta dzielimy równo na miesiące wybranego okresu posiadania, jak ratę bez odsetek, i dodajemy miesięczny koszt paliwa lub prądu.",
        "Ubezpieczenia, serwisu, części, opłat i utraty wartości w skali nie liczymy. Te kwoty są w koszcie posiadania na stronie auta, w rankingach i w porównaniu.",
        "Progi opieramy na polskich zaleceniach: wydatki na transport nie powinny przekraczać 15–20% dochodu netto. Do zakupu i paliwa dochodzą jeszcze inne koszty auta, dlatego powyżej 25% auto jest niezalecane. Kwoty zaokrąglamy do 100 zł, a widok roczny to 12 razy kwota miesięczna.",
      ],
      list: [
        "komfortowo: zakup i paliwo zajmują do 15% dochodu",
        "rozsądnie: od 15% do 20%",
        "na granicy: od 20% do 25%",
        "niezalecane: ponad 25%",
      ],
    },
    {
      id: "aktualnosc",
      heading: "Jak często odświeżamy dane",
      paragraphs: [
        "Raz na dobę sprawdzamy wszystkie źródła. Każde z nich publikuje dane we własnym rytmie, dlatego przy cenach podajemy ich datę.",
      ],
    },
  ],
  sourcesCaption: "Źródła danych",
  sourcesColumns: ["Źródło", "Co z niego bierzemy", "Aktualizacja", "Licencja"],
  sources: [
    {
      name: "ADEME Car Labelling",
      url: "https://data.ademe.fr/datasets/ademe-car-labelling",
      what: "Katalog nowych aut, ceny katalogowe we Francji, zużycie WLTP",
      updated: "co kwartał",
      licence: "Licence Ouverte 2.0",
    },
    {
      name: "Komisja Europejska, Weekly Oil Bulletin",
      url: "https://energy.ec.europa.eu/data-and-analysis/weekly-oil-bulletin_en",
      what: "Ceny benzyny 95, oleju napędowego i LPG w Polsce",
      updated: "co tydzień",
      licence: "CC BY 4.0",
    },
    {
      name: "Eurostat, nrg_pc_204",
      url: "https://ec.europa.eu/eurostat/databrowser/view/nrg_pc_204",
      what: "Cena prądu dla gospodarstw domowych w Polsce",
      updated: "co pół roku",
      licence: "CC BY 4.0",
    },
    {
      name: "Narodowy Bank Polski",
      url: "https://api.nbp.pl/",
      what: "Średni kurs euro (tabela A)",
      updated: "w dni robocze",
      licence: "Dane publiczne NBP",
    },
  ],
  disclaimerTitle: "Zanim podejmiesz decyzję",
  disclaimers: [
    "WheelWise nie jest ofertą handlową ani poradą finansową. Przed zakupem sprawdź cenę u dealera i poproś o wycenę ubezpieczenia.",
    "Nie liczymy kredytu, leasingu, parkingu, opłat drogowych ani mandatów. Zakładamy zakup za gotówkę.",
    "Katalog pochodzi z rynku francuskiego: części aut sprzedawanych w Polsce w nim nie ma, a niektóre wersje są dostępne tylko we Francji.",
  ],
};

const en: MethodologyCopy = {
  title: "How we calculate",
  intro: "WheelWise does not guess. Every amount on the site comes from public data and an open cost model. This page says where the numbers come from and where their precision ends.",
  tocLabel: "On this page",
  sections: [
    {
      id: "prices",
      heading: "Car prices are indicative",
      paragraphs: [
        "The car catalogue and prices come from ADEME Car Labelling, an open dataset run by a French government agency. They are list prices of new cars in France.",
        "We convert the price to złoty at the NBP mid euro rate, replace French VAT of 20% with Polish VAT of 23% and round to 100 zł. For each model with a given engine and gearbox we show the price of the cheapest version.",
        "Manufacturers set prices country by country, so the price at a Polish dealer may differ by several percent or more. That is why every price is marked “indicative price” and carries the date of the price list.",
      ],
    },
    {
      id: "costs",
      heading: "What the cost is made of",
      paragraphs: [
        "The total cost is the sum of six categories. The purchase price is not added: depreciation stands in for it, the part of the price you will not get back when you sell.",
      ],
      list: [
        "Depreciation: the price minus the estimated value of the car after the chosen period.",
        "Fuel and energy: WLTP consumption times your mileage and the current fuel or electricity price.",
        "Insurance: third-party (OC) or comprehensive (OC + AC) for the chosen driver age, or the premium you enter.",
        "Servicing: inspections and scheduled service.",
        "Parts and wear: tyres, brakes and other wear parts.",
        "Fees: registration and periodic roadworthiness tests.",
      ],
    },
    {
      id: "estimates",
      heading: "What the ≈ sign means",
      paragraphs: [
        "No open data exists per model for depreciation, insurance, servicing and parts. We calculate them with a model whose parameters follow published market averages. Each such amount is preceded by the ≈ sign.",
        "WLTP consumption is usually lower than in everyday driving, plug-in hybrids especially. The real fuel cost will tend to be higher than shown.",
      ],
    },
    {
      id: "power",
      heading: "Power of electric and hybrid cars",
      paragraphs: [
        "For petrol, diesel and LPG cars the source gives the maximum engine power, and that is what we show.",
        "For hybrids and plug-in hybrids the source gives the power of the combustion engine only. The power of the whole system, electric motor included, is higher, but the data does not contain it. That is why these cars are labelled “combustion engine power”.",
        "For electric cars the data has no maximum power. We show the highest figure the source gives. For most models this is the rated (continuous) power, clearly lower than the peak power in the manufacturer’s brochure: the Tesla Model 3 is listed at 88 kW. That is why electric cars are labelled “power per source data”. The figure also has a small effect on the insurance estimate.",
      ],
    },
    {
      id: "income",
      heading: "The income scale",
      paragraphs: [
        "The scale shows the net (take-home) monthly income at which purchase and fuel take a given share of the budget. We divide the price of the car evenly over the months of the chosen ownership period, like an instalment without interest, and add the monthly cost of fuel or electricity.",
        "Insurance, servicing, parts, fees and depreciation are not counted in the scale. They are part of the cost of ownership on the car page, in the rankings and in the comparison.",
        "The thresholds follow Polish guidance: transport should take no more than 15–20% of net income. The other costs of the car come on top of purchase and fuel, so above 25% the car is not recommended. Amounts are rounded to 100 zł, and the yearly view is 12 times the monthly amount.",
      ],
      list: [
        "comfortable: purchase and fuel take up to 15% of income",
        "reasonable: 15% to 20%",
        "stretching it: 20% to 25%",
        "not recommended: over 25%",
      ],
    },
    {
      id: "freshness",
      heading: "How often the data is refreshed",
      paragraphs: [
        "Once a day we check every source. Each publishes at its own pace, which is why prices carry their date.",
      ],
    },
  ],
  sourcesCaption: "Data sources",
  sourcesColumns: ["Source", "What we take from it", "Updated", "Licence"],
  sources: [
    {
      name: "ADEME Car Labelling",
      url: "https://data.ademe.fr/datasets/ademe-car-labelling",
      what: "Catalogue of new cars, list prices in France, WLTP consumption",
      updated: "quarterly",
      licence: "Licence Ouverte 2.0",
    },
    {
      name: "European Commission, Weekly Oil Bulletin",
      url: "https://energy.ec.europa.eu/data-and-analysis/weekly-oil-bulletin_en",
      what: "Prices of petrol 95, diesel and LPG in Poland",
      updated: "weekly",
      licence: "CC BY 4.0",
    },
    {
      name: "Eurostat, nrg_pc_204",
      url: "https://ec.europa.eu/eurostat/databrowser/view/nrg_pc_204",
      what: "Household electricity price in Poland",
      updated: "half-yearly",
      licence: "CC BY 4.0",
    },
    {
      name: "Narodowy Bank Polski",
      url: "https://api.nbp.pl/",
      what: "Mid euro exchange rate (table A)",
      updated: "on working days",
      licence: "NBP public data",
    },
  ],
  disclaimerTitle: "Before you decide",
  disclaimers: [
    "WheelWise is neither a sales offer nor financial advice. Before buying, check the price with a dealer and ask for an insurance quote.",
    "Loans, leasing, parking, tolls and fines are not included. We assume a cash purchase.",
    "The catalogue comes from the French market: some cars sold in Poland are missing, and some versions are sold in France only.",
  ],
};

export const methodologyCopy = { pl, en };
