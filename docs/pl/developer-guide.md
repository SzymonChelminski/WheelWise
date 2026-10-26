# Przewodnik programisty WheelWise

Ten przewodnik jest dla programisty, który zaczyna pracę z projektem. Wyjaśnia, jak zbudowana jest aplikacja, gdzie leży każda reguła i jak ją zmienić. Pierwsze uruchomienie opisuje [README](../../README.md). Wdrożenie i codzienne zadanie opisuje [przewodnik operatora](operations.md).

## 1. Przegląd architektury

### 1.1 Komponenty

| Komponent | Lokalizacja | Zadanie |
|---|---|---|
| Budowanie katalogu | `src/lib/catalog/` | Czyste funkcje, które zamieniają wiersze zbioru ADEME w auta WheelWise: mapowanie wartości, grupowanie, przeliczenie ceny. Używa `data/brands.json`. |
| Baza danych | `src/db/` | Trzy tabele: `cars`, `market_prices`, `refresh_runs`. Neon Postgres na produkcji, PGlite w pamięci w trybie lokalnym. |
| Pobieranie danych | `src/ingest/` | Adaptery źródeł i codzienne zadanie. Uruchamia je Vercel Cron Job przez `GET /api/cron/daily`. Skrypt `scripts/refresh.ts` uruchamia je z wiersza poleceń. |
| Silnik kosztów | `src/lib/costs/` | Czyste funkcje bez operacji wejścia i wyjścia. Liczą koszty, skalę zarobków i rankingi. Serwer i przeglądarka używają tego samego kodu. |
| Dostęp do danych | `src/lib/data/` | Funkcje odczytu z pamięcią podręczną, które wywołują strony. |
| Zdjęcia modeli | `scripts/build-model-images.ts`, `data/model-images.json`, `src/lib/catalog/model-images.ts`, `src/components/ui/CarPhoto.tsx` | Skrypt uruchamiany ręcznie znajduje na Wikimedia Commons jedno wolne zdjęcie każdego modelu auta. Strona auta czyta wynik z zatwierdzonego pliku. Zobacz sekcję 7.6. |
| Interfejs | `src/app/[locale]/`, `src/components/` | Strony, komponenty systemu projektowego i komponenty funkcji. |
| Konfiguracja | `src/config/` | Parametry modelu kosztów, reguły katalogu, adresy i limity źródeł, adres serwisu, czasy wyszukiwania aut. |

### 1.2 Przepływ danych

```
Vercel Cron -> GET /api/cron/daily -> runJob('daily')
   1. exchange-rate : NBP, tabela A, średni kurs EUR      -> market_prices (eur_pln)
   2. oil-bulletin  : XLSX Weekly Oil Bulletin KE + NBP   -> market_prices (petrol, diesel, lpg)
   3. electricity   : Eurostat nrg_pc_204                 -> market_prices (electricity)
   4. catalogue     : API ADEME -> buildCatalog           -> cars (wymiana katalogu)
   -> jeden wiersz w refresh_runs -> unieważnienie znacznika pamięci podręcznej "catalog"

strona -> src/lib/data (z pamięcią podręczną) -> silnik kosztów (z założeniami użytkownika) -> interfejs
```

Przy pierwszym wdrożeniu `npm run db:migrate` i `npm run db:bootstrap` ładują zapisane dane przykładowe (fixtures). Serwis ma dane, zanim zadanie uruchomi się po raz pierwszy. Zobacz sekcję 7.

### 1.3 Renderowanie i pamięć podręczna

- Next.js działa z `cacheComponents: true` i `partialPrefetching: true` (`next.config.ts`).
- Funkcje `getCatalog`, `getCar` i `getSearchIndex` w `src/lib/data/` używają `'use cache'`, znacznika `catalog` i profilu czasu życia `hours`.
- Codzienne zadanie wywołuje `revalidateTag('catalog', 'max')`, gdy zmieniło dane. Działa to tylko wewnątrz serwera Next.js (trasa cron). Gdy uruchomisz zadanie z wiersza poleceń, wywołanie kończy się bez skutku, a strony pokazują nowe dane, gdy wygasną ich wpisy w pamięci podręcznej.
- `src/proxy.ts` to proxy Next.js. Odpowiada `400` na adres z błędnym kodowaniem, stosuje routing języków next-intl i odpowiada `404` na adres nieznanego auta (`/<locale>/cars/<slug>`). Zobacz „Adresy nieznanych aut” poniżej.
- Silnik kosztów działa też w przeglądarce. Gdy użytkownik zmieni założenie, strona auta i strona porównania liczą nowe wartości od razu, bez zapytania do serwera.

**Adresy nieznanych aut.** Proxy (`src/proxy.ts`) i stałe czasowe (`src/config/car-lookup.ts`) działają tak:

- Slug jest nieznany bez żadnego sprawdzania listy, gdy jest dłuższy niż 200 znaków (`MAX_CAR_SLUG_LENGTH`) albo nie pasuje do `CAR_SLUG_PATTERN`. Wzorzec dopuszcza małe litery i cyfry w grupach połączonych pojedynczymi myślnikami.
- Każdy inny slug jest sprawdzany w zbiorze slugów aktywnych aut. Każda instancja serwera czyta ten zbiór przez `getActiveCars` i trzyma go w pamięci, więc adres auta nie kosztuje zapytania.
- Dla nieznanego sluga proxy przepisuje żądanie na `/<locale>/cars`. Ta ścieżka nie ma strony, więc strona przechwytująca (catch-all) odpowiada `404` już przy pierwszym żądaniu. Przeglądarka zachowuje adres, o który prosiła.
- Zbiór jest uznawany za aktualny przez 5 minut (`ACTIVE_SLUGS_REFRESH_MS`). Potem następne żądanie zaczyna nowy odczyt, a stary zbiór odpowiada, gdy odczyt trwa.
- Po nieudanym odczycie stary zbiór zostaje w użyciu, a kolejna próba następuje po 30 sekundach (`ACTIVE_SLUGS_RETRY_MS`).
- Instancja, która nie ma jeszcze zbioru, każe żądaniu czekać na pierwszy odczyt najwyżej 5 sekund (`ACTIVE_SLUGS_READ_TIMEOUT_MS`). Wolniejszy odczyt nie jest anulowany. Jego wynik obsługuje późniejsze żądania.

Ograniczenie: dopóki instancja nie ma zbioru, proxy nie wie, które auta istnieją. Dzieje się tak, gdy pierwszy odczyt trwa dłużej niż 5 sekund albo kończy się błędem. W tym czasie adres nieznanego auta o poprawnym kształcie przechodzi dalej i odpowiada `200` zamiast `404`. Stan kończy się, gdy odczyt się powiedzie. Po nieudanym odczycie obowiązuje opóźnienie ponowienia 30 sekund, a żądania w tym czasie również przechodzą dalej. Slug o niepoprawnym kształcie nadal dostaje `404`, bo to sprawdzenie nie potrzebuje zbioru.

### 1.4 Stan w adresie URL

Założenia, okres, filtry rankingu i porównywane auta są w zapytaniu (query string) strony. Dzięki temu linki można udostępniać. Założenia i wybór aut do porównania są też kopiowane do `localStorage` (klucze `wheelwise.assumptions.v1` i `wheelwise.compare.v1`). Strona otwarta bez parametrów założeń jeden raz bierze zapisane założenia.

Parametry zapytania:

| Parametr | Strona | Znaczenie |
|---|---|---|
| `km` | wszystkie | Roczny przebieg, od 1000 do 100000. Domyślnie 15000. |
| `years` | wszystkie | Okres posiadania, liczba całkowita od 1 do 10. Domyślnie 5. |
| `age` | wszystkie | Przedział wieku kierowcy: `18-24`, `25-34`, `35-44`, `45-54`, `55-59`, `60-64`, `65-69`, `70-74`, `75+`. Domyślnie `35-44`. |
| `cov` | wszystkie | `oc` lub `oc_ac`. Domyślnie `oc_ac`. |
| `ins` | wszystkie | Własna roczna składka w PLN, od 0 do 100000. Gdy parametr jest obecny, ubezpieczenie używa tej wartości, a `age` i `cov` są ignorowane. |
| `period` | wszystkie | `month` lub `year`. Domyślnie `month`. |
| `metric` | `/rankings` | Jedna z dziewięciu miar rankingu. Domyślnie `totalCost`. |
| `make`, `segment`, `body`, `fuel`, `gear`, `pmin`, `pmax`, `q` | `/rankings` | Filtry. Filtry z listą przyjmują powtórzone parametry lub wartości rozdzielone przecinkami. |
| `limit` | `/rankings` | Liczba pokazanych wierszy, wielokrotność 10, najwyżej 1000. Domyślnie 10. |
| `cars` | `/compare` | Slugi rozdzielone przecinkami. Liczą się najwyżej trzy auta. |

Nieprawidłowa wartość wraca do wartości domyślnej. Wartości równe domyślnym nie trafiają do adresu.

Mechanizm, który utrzymuje ten stan spójnym, jest w `src/lib/state/intended-query.ts`. „Zamierzone zapytanie” (intended query) to zapytanie ostatniej zleconej nawigacji na bieżącej ścieżce, także gdy ta nawigacja jeszcze się ładuje. Reguły:

- Kontrolka zmienia zapytanie tylko przez `useQueryWriter`. Hak stosuje funkcję do zamierzonego zapytania i kieruje router do wyniku.
- Link, który niesie stan zapytania, to `LiveLink` (`src/components/features/LiveLink.tsx`) albo `PageLink`. Jego adres jest funkcją zamierzonego zapytania. Tą funkcją jest `resolveTarget` w `src/components/features/link-target.ts`, a przyjmuje ona opis celu w postaci zwykłych danych (`carry`, `metric`, `more` lub `clear`).
- Nie zapisuj do adresu URL w żaden inny sposób: bez bezpośredniego `router.push`, bez `history.replaceState`, bez `window.location`, bez `useSearchParams` dla stanu, który zmienia kontrolka.

Każda kontrolka i każdy link, który niesie stan zapytania, musi trzymać się tych reguł. W przeciwnym razie link pokazuje nieaktualny adres, gdy nawigacja się ładuje, albo kontrolka nadpisuje zmianę, która jest jeszcze w drodze.

Zapisy używają `router.replace`. Zapis dodaje wpis do historii tylko wtedy, gdy kliknięcie linku do tej samej ścieżki jeszcze się ładuje. Dlatego przycisk Wstecz nie cofa pojedynczych zmian filtrów (zobacz sekcję 12).

### 1.5 Nagłówki odpowiedzi

`next.config.ts` ustawia te nagłówki na każdej ścieżce i wyłącza `X-Powered-By`:

| Nagłówek | Wartość |
|---|---|
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `X-Frame-Options` | `DENY` |
| `Content-Security-Policy` | `frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |

Nie ma polityki dla skryptów. Polityka z `script-src` wymaga nonce dla każdego żądania. Nonce wymusza dynamiczne renderowanie każdej strony, co zaprzecza założeniom pamięci podręcznej. Powyższe dyrektywy ograniczają osadzanie w ramkach, bazę dokumentu, cele formularzy i wtyczki bez nonce.

## 2. Struktura katalogów

```
data/brands.json                     marka -> nazwa wyświetlana, klasa, utrzymanie wartości
data/fixtures/ademe-snapshot.json    zapisane wiersze ADEME (3604 wiersze, zbiór z 2026-09-14)
data/fixtures/cars.json              katalog zbudowany z migawki (489 aut)
data/fixtures/market-prices.json     przykładowe ceny rynkowe dla trybu lokalnego i bootstrapu
data/model-names.json                wyjątki od reguły wielkości liter w nazwach aut (sekcja 7.2)
data/model-images.json               zdjęcie każdego modelu auta, tworzone przez images:build (sekcja 7.6)
data/model-image-overrides.json      ręczne wybory dla images:build (sekcja 7.6)
design/DESIGN.md, design/screens/    specyfikacja projektu i zrzuty ekranu
docs/en/, docs/pl/                   dokumentacja
drizzle/                             migracje SQL wygenerowane przez drizzle-kit
messages/pl.json, messages/en.json   wszystkie teksty interfejsu
scripts/                             db-migrate, db-bootstrap, refresh, build-fixture-catalog, build-model-images
src/app/[locale]/                    strony: główna, rankings/, cars/[slug]/, compare/, methodology/, not-found, error
src/app/[locale]/design-preview/     statyczne układy projektu (wyłączone, dopóki ich nie włączysz, zobacz sekcję 10)
src/app/api/cron/daily/route.ts      trasa cron
src/components/ui/                   komponenty systemu projektowego (prezentacyjne)
src/components/layout/SiteShell.tsx  rama strony: nagłówek, stopka, miejsce na pasek porównania
src/components/features/             komponenty z logiką: rankingi, auto, porównanie, wyszukiwarka, założenia, rama
src/config/                          cost-model.ts, catalog.ts, sources.ts, site.ts, car-lookup.ts
src/db/                              schemat, klient, migracje, bootstrap, repozytoria
src/i18n/                            routing next-intl, konfiguracja żądania, pomocnicy nawigacji
src/ingest/                          uruchamianie zadania, adaptery źródeł, pomocnicy HTTP
src/lib/catalog/                     budowanie katalogu i wyszukiwanie zdjęć (model-images.ts)
src/lib/costs/                       silnik kosztów i skala zarobków
src/lib/data/                        funkcje odczytu z pamięcią podręczną
src/lib/domain/                      typy, schematy Zod, wczytywanie założeń
src/lib/state/                       stan w adresie URL i w przeglądarce
src/mocks/                           dane przykładowe używane tylko przez podgląd projektu
src/proxy.ts                         routing języków i 404 dla nieznanych aut
tests/unit/, tests/integration/      testy Vitest
tests/e2e/                           testy Playwright
tests/fixtures/                      zapisane odpowiedzi zewnętrznych źródeł
```

## 3. Tryb lokalny i tryb produkcyjny

Aplikacja wybiera bazę danych na podstawie `DATABASE_URL`.

- **Tryb produkcyjny** (`DATABASE_URL` ustawiony): aplikacja używa sterownika Neon (`drizzle-orm/neon-http`).
- **Tryb lokalny** (`DATABASE_URL` pusty lub nieustawiony): aplikacja tworzy w każdym procesie bazę PGlite w pamięci. Stosuje migracje z `drizzle/` i ładuje `data/fixtures/cars.json` oraz `data/fixtures/market-prices.json`. Zmiany danych znikają po zakończeniu procesu.
- Na Vercel w produkcji tryb lokalny jest wyłączony. Jeśli brakuje tam `DATABASE_URL` (`NODE_ENV=production` i `VERCEL=1`), pierwsze wywołanie bazy zgłasza błąd, który nazywa brakującą zmienną.

Zmienne środowiskowe:

| Nazwa | Wymagana | Cel |
|---|---|---|
| `DATABASE_URL` | Na produkcji | Ciąg połączenia Neon. Gdy pusty, aplikacja działa w trybie lokalnym. |
| `CRON_SECRET` | Na produkcji | Wspólny sekret. Vercel wysyła `Authorization: Bearer <CRON_SECRET>` do trasy cron. Bez niego trasa odpowiada `401` na każde żądanie. |
| `NEXT_PUBLIC_SITE_URL` | Tylko dla własnej domeny | Publiczny adres serwisu. Zobacz regułę poniżej. |
| `NEXT_PUBLIC_DESIGN_PREVIEW` | Nie | Wartość `1` włącza trasy `/design-preview`. |
| `VERCEL_PROJECT_PRODUCTION_URL` | Ustawia Vercel | Domena produkcyjna projektu, bez schematu. Nie ustawiaj jej sam. |

Plik `.env.example` wymienia zmienne. Skopiuj go do `.env.local`, aby ustawić wartości dla `npm run dev`, `npm run build` i `npm run start`. Next.js czyta ten plik. Skrypty uruchamiane przez `tsx` (`db:migrate`, `db:bootstrap`, `refresh`, `fixtures:build`, `images:build`) go nie czytają. Dla nich ustaw zmienną w powłoce:

```bash
DATABASE_URL="postgres://..." npm run db:migrate
```

```powershell
$env:DATABASE_URL = "postgres://..."; npm run db:migrate
```

### Reguła adresu serwisu

`src/config/site.ts` oblicza `SITE_URL`. Aplikacja używa go w linkach kanonicznych, alternatywach językowych, `metadataBase` i w nagłówku User-Agent zadania odświeżania (`WheelWise/1.0 (+<SITE_URL>/en/methodology)`). Kolejność:

1. `NEXT_PUBLIC_SITE_URL`, gdy jest ustawiony i niepusty. Musi to być bezwzględny adres `http:` lub `https:` bez ścieżki, zapytania, fragmentu, nazwy użytkownika i hasła. Końcowy ukośnik jest usuwany. Każda inna wartość przerywa build, a komunikat błędu nazywa zmienną i regułę, ale nie pokazuje wartości.
2. W przeciwnym razie `https://` plus `VERCEL_PROJECT_PRODUCTION_URL`. Wartość musi być samą nazwą hosta z opcjonalnym portem. Każda inna wartość przerywa build.
3. W przeciwnym razie `http://localhost:3000`.

Na Vercel adres nigdy nie jest `localhost`, chyba że sam tak ustawisz. Operator ustawia `NEXT_PUBLIC_SITE_URL` tylko dla własnej domeny.

## 4. Skrypty npm

| Skrypt | Co robi |
|---|---|
| `npm run dev` | Uruchamia serwer deweloperski Next.js na porcie 3000. |
| `npm run build` | Buduje aplikację (`next build`). Działa w trybie lokalnym. |
| `npm run build:vercel` | `db:migrate`, potem `db:bootstrap`, potem `next build`. To polecenie budowania z `vercel.json`. |
| `npm run start` | Uruchamia zbudowaną aplikację (`next start`). |
| `npm run lint` | Uruchamia ESLint dla całego projektu. |
| `npm run typecheck` | Uruchamia `tsc --noEmit`. |
| `npm run test` | Uruchamia testy Vitest z `tests/unit/` i `tests/integration/`. |
| `npm run test:e2e` | Uruchamia testy Playwright z `tests/e2e/`. Konfiguracja buduje i uruchamia aplikację na porcie 3000 albo na porcie z `E2E_PORT` (zobacz sekcję 11). |
| `npm run db:generate` | Uruchamia `drizzle-kit generate`. Zapisuje nową migrację SQL w `drizzle/` na podstawie zmian w `src/db/schema.ts`. Zatwierdź wygenerowane pliki. |
| `npm run db:migrate` | Stosuje migracje z `drizzle/` do bazy z `DATABASE_URL`. Zastosowane migracje są pomijane. W trybie lokalnym wypisuje `local mode: nothing to migrate`. |
| `npm run db:bootstrap` | Ładuje dane przykładowe do pustej bazy (zobacz sekcję 7). W trybie lokalnym tylko sprawdza dane przykładowe i wypisuje ich liczbę. |
| `npm run fixtures:build` | Odtwarza `data/fixtures/cars.json` z `data/fixtures/ademe-snapshot.json` i `data/brands.json`, przy stałym kursie 4,3 PLN za EUR. Wypisuje liczby aut według marki, napędu, nadwozia i powodu pominięcia. |
| `npm run images:build` | Znajduje jedno zdjęcie każdego modelu auta przez API Wikipedii i Wikimedia Commons i zapisuje `data/model-images.json`. Wymaga dostępu do sieci. Zobacz sekcję 7.6. |
| `npm run refresh` | Uruchamia codzienne zadanie jeden raz. Z `-- --dry-run` niczego nie zapisuje. Zobacz sekcję 8. |

## 5. Model domeny i model kosztów

### 5.1 Model domeny

Typy są w `src/lib/domain/types.ts`. Schematy Zod, które je sprawdzają, są w `src/lib/domain/schemas.ts`.

- **Auto** (`Car`) to jedna marka, model, nadwozie, napęd, skrzynia biegów i moc. Pola to m.in. `slug`, `make`, `model`, `variant`, `bodyType`, `segment` (od `A` do `F`), `fuelType` (`petrol`, `diesel`, `lpg`, `hybrid`, `phev`, `ev`), `transmission`, `powerKw`, `engineCc`, `brandTier`, `valueRetention`, `priceEur`, `listPricePln`, `priceObservedAt`, `priceSourceUrl`, `fuelL100` i `electricKwh100`. Nazwa wyświetlana w interfejsie to marka plus wariant.
- Zużycie: auta `petrol`, `diesel`, `lpg` i `hybrid` mają tylko `fuelL100`. Auta `ev` mają tylko `electricKwh100`. Auta `phev` mają oba. Schemat odrzuca inne kombinacje.
- **Ceny rynkowe** mają klucze `petrol`, `diesel`, `lpg` (PLN za litr) i `electricity` (PLN za kWh). Klucz `eur_pln` trzyma kurs wymiany. Silnik kosztów potrzebuje pierwszych czterech. `getMarketPrices` zgłasza błąd, gdy któregoś brakuje.
- **Założenia** to `annualMileageKm`, `ownershipYears` i `insurance`. Ubezpieczenie to szacunek (`driverAgeBand` i `coverage`) albo własna `annualPremiumPln`. Limity i wartości domyślne są w `src/lib/domain/assumptions.ts`: przebieg od 1000 do 100000 (domyślnie 15000), lata od 1 do 10 (domyślnie 5), składka od 0 do 100000, domyślny przedział wieku `35-44`, domyślny zakres `oc_ac`.

Silnik kosztów nie sprawdza swoich danych wejściowych. Wartości z niepewnego źródła (URL, `localStorage`, pola formularza) najpierw sprawdź przez `parseAssumptions` lub `assumptionsSchema`.

### 5.2 Model kosztów

`calculateCosts(car, prices, assumptions)` w `src/lib/costs/calculate.ts` zwraca koszt za cały okres posiadania, za rok i za miesiąc. Wartości nie są zaokrąglane. Koszt roczny to suma podzielona przez liczbę lat. Koszt miesięczny to suma podzielona przez 12 razy liczba lat. Koszt kilometra to suma podzielona przez przebieg razy liczbę lat.

Suma składa się z sześciu kategorii. Ceny zakupu się nie dolicza: jej miejsce zajmuje utrata wartości. Model zakłada zakup za gotówkę.

| Kategoria | Wzór słowami | Kod |
|---|---|---|
| Utrata wartości | Cena zakupu minus wartość końcowa po okresie posiadania. Procent wartości końcowej wychodzi z tabeli dla lat od 1 do 10 (82, 73, 65, 58, 52, 47, 42, 38, 34, 31 procent). Strata (100 minus wartość z tabeli) jest mnożona przez współczynnik napędu (benzyna 1,0, diesel 1,05, LPG 1,0, hybryda 0,92, hybryda plug-in 1,12, elektryczny 1,35) i przez współczynnik utrzymania wartości marki (wysokie 0,9, średnie 1,0, niskie 1,12). Potem model dodaje 0,2 punktu procentowego za każde 1000 km, o które roczny przebieg przekracza 15000, za każdy rok posiadania. Poniżej 15000 km odejmuje tyle samo. Procent wartości końcowej mieści się między 10 a 95. | `src/lib/costs/depreciation.ts` |
| Paliwo i energia | Roczny przebieg podzielony przez 100, razy (litry na 100 km razy cena paliwa, plus kWh na 100 km razy cena prądu). Auta benzynowe, hybrydy i hybrydy plug-in używają ceny benzyny. Diesel i LPG mają własne ceny. Brakująca wartość zużycia liczy się jako 0. Wynik jest mnożony przez liczbę lat. | `src/lib/costs/fuel.ts` |
| Ubezpieczenie | Przy własnej składce: składka za każdy rok. Przy szacunku: składka OC dla przedziału wieku kierowcy razy współczynnik mocy (do 74 kW 0,9, do 110 kW 1,0, do 150 kW 1,1, powyżej 150 kW 1,25). Przy zakresie `oc_ac` każdy rok dolicza też bieżącą wartość auta na początku tego roku, razy 0,025, razy współczynnik wieku (18 do 24: 2,0, 25 do 34: 1,25, od 70 lat: 1,1, pozostałe przedziały 1,0). Składka OC nie zmienia się z roku na rok. | `src/lib/costs/insurance.ts` |
| Serwis | Roczna baza według klasy marki (budżetowa 900, popularna 1200, premium 2200 PLN), razy 0,6 dla aut elektrycznych, razy większa z liczb: 1 i roczny przebieg podzielony przez 20000. | `src/lib/costs/maintenance.ts` |
| Części i eksploatacja | Roczny przebieg razy stawka za kilometr według segmentu (A 0,06, B 0,07, C 0,09, D 0,12, E 0,16, F 0,22 PLN), razy współczynnik klasy (budżetowa 0,9, popularna 1,0, premium 1,4), razy 0,9 dla aut elektrycznych. | `src/lib/costs/maintenance.ts` |
| Opłaty | Rejestracja nowego auta, 160 PLN jednorazowo, plus okresowe badania techniczne: po 149 PLN, 245 PLN dla aut na LPG. Badanie przypada na koniec roku 3, 5, 6, 7, 8 i 9. Liczy się tylko wtedy, gdy jego rok jest mniejszy niż okres posiadania. Okres 5 lat ma jedno badanie. | `src/lib/costs/fees.ts` |

**Utrzymanie** (miara rankingu) to serwis plus części plus opłaty.

Model zwraca też wartość końcową w PLN i w procentach oraz koszt kilometra.

### 5.3 Miary rankingu i filtry

`rankCars` w `src/lib/costs/ranking.ts` filtruje auta, liczy miarę i sortuje rosnąco. Remisy są sortowane według sluga. Miary to `price`, `totalCost`, `depreciation`, `maintenance`, `service`, `parts`, `fuelConsumption`, `fuelCost` i `insurance`. Miary kosztów używają wartości miesięcznej.

Miara `fuelConsumption` porządkuje litry na 100 km. Hybrydy plug-in i auta elektryczne nie mają w niej miejsca. Gdy jedynym wybranym napędem jest `ev`, miara porządkuje kWh na 100 km i auta elektryczne się pojawiają.

Filtr tekstowy dzieli zapytanie na słowa. Auto pasuje, gdy każde słowo jest częścią „marka model wariant”. Porównanie pomija wielkość liter i akcenty, które rozkładają się w normalizacji Unicode, ale nie litery takie jak `ł`.

### 5.4 Gdzie leżą parametry i jak zmienić jeden z nich

Wszystkie parametry są w `src/config/cost-model.ts` (obiekt `COST_MODEL`). Wartości bez opublikowanego źródła to szacunki skalibrowane: stawka autocasco (AC), współczynniki mocy, stawki serwisu i części oraz opłata rejestracyjna. Składki OC wynikają z danych Rankomatu za pierwsze półrocze 2026. Opłata za badanie techniczne wynika z opublikowanej opłaty regulowanej.

Aby zmienić parametr:

1. Zmień wartość w `src/config/cost-model.ts`.
2. Jeśli wartość występuje też w tekście, zmień tekst w `messages/pl.json` i w `messages/en.json`. Teksty metodologii podają opłatę rejestracyjną (160 zł), opłaty za badania (149 zł i 245 zł) oraz udziały dochodu. Notatki poziomów w `car.levels` podają udziały dochodu.
3. Uruchom `npm run test`. Testy jednostkowe w `tests/unit/costs/` zawierają wartości oczekiwane wyliczone z obecnych parametrów. Zmień wartości, których dotyczy zmiana, i sprawdź każdą nową wartość ręcznie.
4. Zmień teksty metodologii, jeśli zmienia się logika, a nie tylko liczba.

## 6. Skala zarobków

### 6.1 Kwota bazowa

`monthlyAffordabilityCost(costs, ownershipYears)` w `src/lib/costs/income.ts` podaje miesięczną kwotę, na której opiera się skala. To cena zakupu rozłożona równo na miesiące posiadania plus miesięczny koszt paliwa lub energii:

```
costs.purchasePricePln / (ownershipYears * 12) + costs.perMonth.fuel
```

- Wynik nie jest zaokrąglany, w PLN.
- Jeśli `ownershipYears` nie jest dodatnią liczbą skończoną, funkcja używa `DEFAULT_ASSUMPTIONS.ownershipYears` (5).
- Ubezpieczenie, serwis, części, opłaty i utrata wartości nie wchodzą do tej kwoty. Zostają w zestawieniu kosztów, w `CostMap.total`, w rankingach i w porównaniu.
- `calculateCosts` i `CostMap` się nie zmieniają. Funkcja czyta dwa pola `CostBreakdown`.

Funkcja jest używana w jednym miejscu: `CarCostSection` w `src/components/features/car/CarCostSection.tsx` (strona auta). Komponent przekazuje `assumptions.ownershipYears`, daje wynik do `earningsLevels` i pokazuje tę samą wartość we wstępie sekcji (`car.earningsIntroMonth`). W widoku rocznym wstęp pokazuje wartość pomnożoną przez 12 (`car.earningsIntroYear`). Strona podglądu projektu (`src/app/[locale]/design-preview/_components/CarScreen.tsx`) wywołuje ją z danymi przykładowymi.

Przykład, wyliczony funkcją dla Dacii Sandero z `data/fixtures/cars.json` (`dacia-sandero-petrol-manual-67km`), domyślnych założeń (15000 km rocznie, 5 lat) i cen z `data/fixtures/market-prices.json`:

| Wartość | Kwota (PLN) |
|---|---|
| `purchasePricePln` | 48400 |
| Cena na miesiąc, 48400 / 60 | 806,67 |
| `perMonth.fuel` | 430,62 |
| `monthlyAffordabilityCost(costs, 5)` | 1237,29 |
| `perMonth.total`, dla porównania | 1062,37 |
| Ta sama funkcja dla 3 lat | 1775,07 |
| Ta sama funkcja dla 0, `NaN` lub wartości ujemnej | 1237,29 (domyślnie 5 lat) |

Dla 1237,29 PLN granice to 8200, 6200 i 4900. Koszt paliwa zależy od cen paliw w bazie, więc na działającym serwisie liczby się różnią.

### 6.2 Przedziały

`requiredIncome(monthlyCostPln)` w tym samym pliku zwraca cztery przedziały **miesięcznego dochodu netto** (na rękę). Strona auta przekazuje jej kwotę bazową z sekcji 6.1. W kodzie parametr nazywa się `monthlyCostPln`. Każdy przedział wynika z udziału dochodu, który zajmuje ta kwota:

| Poziom (`AffordabilityLevel`) | Udział dochodu | Przedział dochodu |
|---|---|---|
| `comfortable` | do 15% | od kosztu / 0,15 |
| `reasonable` | od 15% do 20% | od kosztu / 0,20 do kosztu / 0,15 |
| `stretch` | od 20% do 25% | od kosztu / 0,25 do kosztu / 0,20 |
| `not_recommended` | ponad 25% | do kosztu / 0,25 |

Każda granica jest zaokrąglana do 100 PLN. Koszt, który nie jest liczbą dodatnią, daje zerowe granice. Dla kwoty 2000 PLN miesięcznie granice to 13300, 10000 i 8000. Widok roczny mnoży granice miesięczne przez 12 (`earningsLevels` w `src/components/features/car/car-format.ts`).

Udziały to `shareComfortable` (0,15), `shareReasonable` (0,2) i `shareStretch` (0,25) w `COST_MODEL.income`. Krok zaokrąglenia to `roundingStepPln` (100).

Progi opierają się na polskich zaleceniach: wydatki na transport powinny wynosić najwyżej 15–20% dochodu netto, a auto, które zabiera ponad 20%, jest zwykle za drogie. Inne koszty auta dochodzą do ceny i paliwa, dlatego ostatni próg to 25%. Strona metodologii podaje ten sam powód (`methodology.sections.income` w plikach tekstów).

Procenty występują też w tekstach: `car.levels.*.note` i lista dochodu w `methodology.sections.income` w obu plikach tekstów. Zmieniaj je razem z liczbami.

## 7. Katalog

### 7.1 Źródło

Katalog pochodzi z otwartego zbioru ADEME „Car Labelling”, przez jego API JSON na `data.ademe.fr`. Zbiór opisuje nowe auta sprzedawane we Francji: cenę w EUR, zużycie WLTP, nadwozie, klasę, moc, skrzynię biegów i napęd. Zapisana migawka ma 3604 wiersze 37 marek, ostatnia aktualizacja 2026-09-14. Licencja to Licence Ouverte / Open Licence 2.0. Adresy i limity są w `ADEME` w `src/config/sources.ts`.

### 7.2 Reguły budowania

`buildCatalog(rows, { eurPln, observedAt, sourceUrl, brands })` w `src/lib/catalog/build-catalog.ts` to czysta funkcja. Jej wynik jest posortowany według sluga. Reguły i tabele są w `src/config/catalog.ts`.

1. **Czyszczenie.** Funkcja naprawia tekst z błędnym kodowaniem (na przykład `CoupÃ©`), zwija spacje i przycina tekst. Wartości zbioru dopasowuje po przycięciu i zamianie na wielkie litery.
2. **Pominięte wiersze.** Funkcja sprawdza każdy wiersz w tej kolejności i liczy pierwszy powód, który pasuje: `missing-name` (pusta marka, model lub opis), `no-price` (pusta lub 0), `price-out-of-range` (nie liczba całkowita albo poza zakresem 5000 do 1000000 EUR), `no-power` (zobacz regułę 4), `unsupported-energy` (E85 i diesel plug-in), `unknown-energy`, `unknown-body`, `unknown-range`, `unknown-gearbox`, `no-consumption`.
3. **Mapowanie wartości.**

   | Pole zbioru | Wartość zbioru | Wartość WheelWise |
   |---|---|---|
   | `Energie` | `ESSENCE` | `petrol` |
   | | `GAZOLE`, `GAZ+ELEC HNR` | `diesel` |
   | | `ESS+G.P.L.` | `lpg` |
   | | `ESS+ELEC HNR` (w tym miękkie hybrydy) | `hybrid` |
   | | `ELEC+ESSENC HR` | `phev` |
   | | `ELECTRIC` | `ev` |
   | `Carrosserie` | `BERLINE` | `sedan_hatchback` (etykieta „hatchback lub sedan”) |
   | | `BREAK` | `estate` |
   | | `TS TERRAINS/CHEMINS` | `suv` |
   | | `COUPE` | `coupe` |
   | | `CABRIOLET` | `convertible` |
   | | `MONOSPACE`, `MONOSPACE COMPACT`, `MINISPACE` | `mpv` |
   | | `COMBISPACE`, `MINIBUS` | `van` |
   | `Gamme` | `ECONOMIQUE`, `INFERIEURE`, `MOYENNE INFERIEURE`, `MOYENNE SUPERIEURE`, `SUPERIEURE`, `LUXE` | segment `A`, `B`, `C`, `D`, `E`, `F` |
   | `Type_de_boite` | `MECANIQUE` | `manual` |
   | | `AUTOMATIQUE`, `VARIATION CONTINUE`, `VARIATION ELECTRIQUE` | `automatic` |

4. **Moc.** Dla aut nieelektrycznych moc to `Puissance_maximale`, poprawna od 20 do 1200 kW. Zbiór nie podaje mocy maksymalnej aut elektrycznych. Ich moc to najwyższa z wartości: `Puissance_maximale`, konie mechaniczne z opisu przeliczone na kW (razy 0,7355), liczba kW z opisu i moc znamionowa `Puissance_nominale_électrique`. Poprawny zakres dla aut elektrycznych to od 15 do 1200 kW. Dla większości aut elektrycznych wynik to moc znamionowa (ciągła), niższa od mocy szczytowej podawanej przez producenta. Interfejs tak ją oznacza. Moc jest zaokrąglana do pełnych kW.
5. **Zużycie.** Wartość to średnia minimum i maksimum ze zbioru (albo jedyna wartość, gdy jednej brakuje), zaokrąglona do jednego miejsca po przecinku. `Conso_elec_*` jest w Wh/km, więc funkcja dzieli ją przez 10, aby dostać kWh na 100 km. Dopuszczalne zakresy: od 2 do 25 l/100 km (od 0,3 do 25 dla hybryd plug-in) i od 8 do 40 kWh/100 km. Wiersz poza zakresem albo bez wymaganej wartości jest pomijany jako `no-consumption`.
6. **Grupowanie.** Jedno auto to jedna grupa wierszy o tej samej marce, modelu, nadwoziu, napędzie, skrzyni biegów i mocy. Dla aut na LPG moc nie należy do klucza grupy, bo zbiór wymienia wersję dwupaliwową dwa razy (po jednym wierszu dla każdego paliwa) z różną mocą.
7. **Wersja reprezentatywna.** Grupę reprezentuje najtańszy wiersz. Remisy rozstrzyga niższe zużycie, potem opis, potem pojemność silnika. Dla aut na LPG moc i zużycie to najwyższe wartości spośród wierszy o takim samym opisie jak wiersz reprezentatywny. Nazwa i cena należą do wersji reprezentatywnej. Wersje, które różnią się tylko napędem, pojemnością baterii, liczbą miejsc lub długością, stają się jednym autem.
8. **Przeliczenie ceny.** `listPricePln = round_to_100(priceEur x eurPln x 1.23 / 1.20)`. Funkcja zamienia francuski VAT 20% na polski VAT 23%. `eurPln` to średni kurs NBP z tabeli A. Francuska premia i kara ekologiczna (bonus i malus) nie wchodzą do ceny.
9. **Slug.** Adres strony auta. Małe litery ASCII połączone myślnikami: marka (nazwa wyświetlana), kod modelu, nadwozie, napęd, skrzynia biegów i moc w KM (koniach mechanicznych) jako `<n>km`. Nadwozie jest pomijane, gdy ma wartość `sedan_hatchback`, którą interfejs nazywa „hatchback lub sedan”. Liczba to `Math.round(powerKw * 1.35962)`, czyli ten sam współczynnik, którego interfejs używa do pokazania mocy. Jednostka `km` zostaje także w angielskich adresach. Przykłady: `renault-clio-diesel-manual-101km`, `dacia-jogger-estate-lpg-manual-101km`. Jeśli dwa auta dostają ten sam slug, najtańsze go zachowuje, a pozostałe dostają `-2`, `-3` i tak dalej. W obecnym katalogu przykładowym żaden slug nie ma takiej końcówki.
10. **Nazwa.** Wariant to opis handlowy wiersza reprezentatywnego, uczytelniony w tych krokach (`displayVariant`):
    1. Usuń powtórzoną markę (nazwę wyświetlaną i zapis ze zbioru) z początku. Dodaj nazwę modelu, gdy opis jej nie ma.
    2. Usuń każde oznaczenie mocy w nawiasie, na przykład `(101ch)`, `(94ch+24Kw)` lub `(57Kw)`. Interfejs pokazuje moc osobno w KM i hp (`POWER_MARKER_PATTERN`).
    3. Usuń słowa `Essence`, `Gazole`, `facelift` i kody skrzyń biegów (`NAME_NOISE_PATTERN`). Kod skrzyni to `BV`, po nim `MA`, `A`, `M` lub `R` i opcjonalne cyfry, na przykład `BVM6`, `BVA`, `BVR7` lub `BVMA5`. Zamień `Hybride` na `Hybrid` i `Électrique` na `Electric` (`NAME_WORD_REPLACEMENTS`).
    4. Utnij francuski opis wyposażenia po modelu. Nazwa kończy się przed pierwszym całym słowem ze stałej listy (`de`, `avec`, `et`, `pour`, `sans`, `norme`, `freins`, `système`, `moteur` i inne, zobacz `NAME_TAIL_START_PATTERN`). Gdy nazwa jest ucięta, znaki rozdzielające `/ - . , +` na końcu są usuwane. Gdy nie jest ucięta, usuwany jest tylko znak oddzielony spacją (jak w `V8 - BVA` po usunięciu kodu). Znak `+`, który jest częścią słowa, zostaje: `AMG E 53 4MATIC+` i `EQA 250+` go zachowują, a `EQA 250 +` daje `EQA 250`. Niezamknięty nawias na końcu jest usuwany zawsze. Gdy słowo z listy jest pierwszym słowem nazwy, funkcja usuwa tylko to słowo i zachowuje resztę, bo po nim następuje model: `Nouvelle i10 1.0 BVR 4PL` daje `i10 1.0 4PL`. Sprawdzenie powtarza się dla następnego pierwszego słowa. Słowa `Classe` nie ma na liście, bo jest częścią nazw modeli Mercedesa.
    5. Zastosuj regułę wielkości liter (niżej). Jeśli wynik jest pusty, nazwą jest kod modelu zapisany zwykłą pisownią.

    Reguła wielkości liter działa na każdym słowie. Znaki `-`, `/` i `.` dzielą słowo na części. Część pisana w całości wielkimi literami i dłuższa niż 3 litery dostaje wielką pierwszą literę i małe pozostałe (`CLIO` daje `Clio`). Krótsza część zostaje bez zmian (`GT`, `RS`, `C-HR`). Słowo z cyframi lub innymi znakami zostaje bez zmian (`ID.3`, `M340i`). Plik `data/model-names.json` zawiera wyjątki: słowo lub część wielkimi literami i pisownię, której trzeba użyć. Są tam prawdziwe pisownie, w których reguła się myli, na przykład `RIO` (`Rio`), `T-ROC` (`T-Roc`) oraz skróty `TFSI`, `MHEV` i `PHEV`. Aby dodać wyjątek, dopisz klucz i wartość, a potem uruchom `npm run fixtures:build`.

    Przykłady: `GIULIA 2.0 T Essence (200ch) AT8` daje `Giulia 2.0 T AT8`. `Karoq 1.5 TSI 4*2 DSG7 norme AP freins 15'' Ambition Classe A avec alt 140A famA` daje `Karoq 1.5 TSI 4*2 DSG7`.

    Auta, które różnią się tylko paliwem, skrzynią biegów lub mocą, mogą mieć tę samą nazwę. Interfejs pokazuje obok każdej nazwy nadwozie, napęd, skrzynię biegów i moc, a slug jest unikalny.
11. **Dane marki.** Marka, której nie ma w `data/brands.json`, dostaje nazwę ze zbioru zapisaną w formie „Tytułowej”, klasę `mainstream` i utrzymanie wartości `average`. Funkcja wpisuje ją do `unknownMakes`, a codzienne zadanie zgłasza ją jako błąd.

### 7.3 `data/brands.json`

Plik przypisuje marce ze zbioru jej nazwę wyświetlaną, klasę marki i utrzymanie wartości. Kluczem jest marka tak, jak zapisuje ją zbiór, po przycięciu (na przykład `B.M.W.` i `LAMBORGHIN`):

```json
"DACIA": { "displayName": "Dacia", "tier": "budget", "retention": "high" }
```

- `tier` to `budget`, `mainstream` lub `premium`. Ustawia bazę serwisu, współczynnik części i (razem z `retention`) utratę wartości.
- `retention` to `high`, `average` lub `low`. Ustawia współczynnik utraty wartości.
- `displayName` to nazwa, którą widzą użytkownicy.

Aby zmienić nazwę, klasę lub utrzymanie wartości, zmień wpis. Aby dodać markę, dodaj nowy wpis z dokładną pisownią ze zbioru. Zadanie podaje pisownię nieznanej marki na liście błędów. Zmiana trafia do bazy przy następnym zapisie katalogu (zobacz sekcję 8.4). Odtwórz dane przykładowe poleceniem `npm run fixtures:build` i zmień testy, które cytują stare wartości. Klasa i utrzymanie wartości to szacunki skalibrowane, nie dane pomiarowe.

### 7.4 Konfiguracja, migawka i dane przykładowe

- `src/config/catalog.ts` zawiera mapowania wartości, poprawne zakresy, stawki VAT, zaokrąglenie ceny, reguły mocy aut elektrycznych i wartości domyślne dla nieznanych marek. Aby obsłużyć nową wartość zbioru, dodaj ją do właściwej tabeli i odtwórz dane przykładowe.
- `data/fixtures/ademe-snapshot.json` to zapisana kopia zbioru. Jej kształt to `{ "dataUpdatedAt": "<data i czas ISO>", "rows": [ ... ] }`, a każdy wiersz ma pola z `ademeRowSchema` (`src/lib/catalog/ademe-schema.ts`). Nieznane pola są ignorowane, a puste wartości to `null`.
- `npm run fixtures:build` czyta migawkę, `data/brands.json` i (przez `src/config/catalog.ts`) `data/model-names.json`, buduje katalog przy stałym kursie 4,3 PLN za EUR i zapisuje `data/fixtures/cars.json`. Przy niezmienionych danych wejściowych wynik jest równy zatwierdzonemu plikowi. Po poleceniu uruchom `git diff`, aby to sprawdzić.
- Tryb lokalny i pierwsze wdrożenie ładują `data/fixtures/cars.json` i `data/fixtures/market-prices.json`. Przykładowe ceny rynkowe mają źródło `fixture`. Prawdziwe dane zawsze je zastępują.

### 7.5 Bootstrap przy pierwszym wdrożeniu

`npm run db:bootstrap` (`src/db/bootstrap.ts`) ładuje dwa pliki z danymi przykładowymi do bazy:

- Auta ładuje tylko wtedy, gdy tabela `cars` nie ma wierszy.
- Każdą cenę rynkową ładuje tylko wtedy, gdy brakuje jej klucza.
- Nigdy nie zmienia ani nie usuwa istniejących wierszy, więc można go bezpiecznie uruchomić ponownie.

Polecenie wypisuje `bootstrap done: <n> cars loaded, <m> market prices loaded`. Przy drugim uruchomieniu obie liczby to 0.

### 7.6 Zdjęcia modeli

Strona auta pokazuje jedno poglądowe zdjęcie modelu, a pod nim autora, licencję i link do źródła. Zdjęcia pochodzą z Wikimedia Commons. Skrypt znajduje je wcześniej, a wynik jest zatwierdzony w repozytorium. Działający serwis nie wysyła żadnych zapytań do Wikipedii ani do Commons. Przeglądarka pobiera każdy obraz z `upload.wikimedia.org`.

**Pliki.**

| Plik | Rola |
|---|---|
| `scripts/build-model-images.ts` | Skrypt uruchamiany przez `npm run images:build`. |
| `data/model-images.json` | Tworzony przez skrypt i zatwierdzany. Obiekt, który przypisuje kluczowi modelu rekord zdjęcia albo `null`, gdy model nie ma użytecznego zdjęcia. |
| `data/model-image-overrides.json` | Prowadzony ręcznie. Wybory, które zastępują automatyczne wyszukiwanie (zobacz niżej). |
| `src/lib/catalog/model-images.ts` | `modelKey(car)` i `getModelImage(car)`. Sprawdza `data/model-images.json` przez Zod przy ładowaniu modułu i nie używa sieci. |
| `src/components/ui/CarPhoto.tsx` | Komponent. Eksportuje też typ `CarPhotoData`. |
| `src/components/features/car/CarDetails.tsx` | Przekazuje `getModelImage(car)` i teksty `car.photo.*` do `CarPhoto`. |

**Klucz.** `modelKey(car)` to `toSlug(make) + "/" + toSlug(model)`, na przykład `renault/clio`. Używa nazwy wyświetlanej marki i kodu modelu ze zbioru, więc wszystkie wersje modelu mają jedno zdjęcie.

**Rekord zdjęcia (`CarPhotoData`).**

| Pole | Znaczenie |
|---|---|
| `sources` | Trzy miniatury o szerokościach 500, 960 i 1280, jako adresy `https://upload.wikimedia.org/...`. Komponent używa ich jako `srcset`. |
| `width`, `height` | Rozmiar pliku oryginalnego w pikselach. Z nich komponent bierze proporcje ramki. |
| `author` | Zwykły tekst, najwyżej 120 znaków. Pole autora z Commons bez HTML albo nazwa osoby, która wgrała plik, gdy pole jest puste. |
| `license`, `licenseUrl` | Krótka nazwa licencji, na przykład `CC BY-SA 4.0`, i jej adres (`null`, gdy Commons go nie podaje). |
| `sourceUrl` | Strona pliku na `commons.wikimedia.org`. |

**Jak działa skrypt.** Czyta `data/fixtures/cars.json` (nie bazę danych) i `data/model-image-overrides.json`. Każdy klucz modelu obsługuje po kolei:

1. Jeśli klucz ma wpis w pliku wyjątków, skrypt go używa. `{ "article": "<tytuł w angielskiej Wikipedii>" }` bierze główny obraz tego artykułu. `{ "file": "File:<nazwa w Commons>" }` bierze ten plik. `null` oznacza brak zdjęcia celowo.
2. W przeciwnym razie szuka w angielskiej Wikipedii frazy „marka model” (pięć wyników). Bierze pierwszy artykuł, którego tytuł zawiera markę i model (wielkość liter, akcenty i znaki interpunkcyjne nie mają znaczenia) i którego krótki opis nazywa samochód (automobile, car, vehicle, SUV i podobne słowa). Potem bierze główny obraz artykułu.
3. Pyta Commons o plik. Wpis dostaje wartość `null`, gdy pliku nie ma na Commons, gdy licencji nie ma na liście dozwolonych, gdy plik ma oznaczenie `NonFree`, gdy jest to SVG, gdy jego szerokość jest mniejsza niż 1280 px, gdy brakuje jednej z trzech miniatur albo gdy nie znamy autora.
4. Lista dozwolonych licencji to CC0, domena publiczna, CC BY i CC BY-SA. Limit szerokości wynika stąd, że Wikimedia podaje plik węższy niż żądana szerokość jako oryginał, a nie jako miniaturę.
5. Adresy miniatur pochodzą z odpowiedzi API. API podaje host `thumb.wikimedia.org`, a skrypt zapisuje tę samą ścieżkę z hostem `upload.wikimedia.org`.

Gdy wszystkie klucze są gotowe, skrypt zapisuje `data/model-images.json`, posortowany po kluczu, z wcięciem dwóch spacji i końcowym znakiem nowego wiersza. Błąd (sieci, HTTP lub API) zatrzymuje skrypt z kodem wyjścia 1, zanim cokolwiek zapisze, więc plik nigdy nie jest niepełny. Skrypt przestrzega zasad Wikimedia dla zautomatyzowanych klientów. Wysyła jedno zapytanie naraz, czeka co najmniej 150 ms między zapytaniami, wysyła User-Agent z adresem repozytorium, ustawia `maxlag=5` i powtarza zapytanie raz po odpowiedzi 429, odpowiedzi 5xx lub błędzie `maxlag`.

**Wyjście.** Standardowe wyjście ma jeden wiersz na model, rozdzielony tabulatorami: klucz, artykuł, plik, licencja i uwaga z powodem, gdy zdjęcia nie ma. Postęp i ostrzeżenia idą na standardowe wyjście błędów. Ostrzeżenie pojawia się, gdy wyjątek podaje klucz, którego nie ma żaden model katalogu. Aby zapisać tabelę w pliku:

```bash
npm run images:build --silent > images.tsv
```

Opcja `--silent` zapobiega temu, by npm dopisał do tabeli własny nagłówek.

**Wyjątki.** Automatyczne wyszukiwanie może wybrać złą generację albo zły model, a dla niektórych modeli niczego nie znajduje. Dodaj wpis do `data/model-image-overrides.json`, uruchom skrypt ponownie i sprawdź wynik:

```json
{
  "bmw/118": { "article": "BMW 1 Series (F70)" },
  "alfa-romeo/giulia": { "file": "File:Alfa Romeo Giulia 952 Veloce Banchise White 01.jpg" },
  "some-make/some-model": null
}
```

**Na stronie.** `CarPhoto` nie rysuje niczego, gdy model nie ma wpisu w `data/model-images.json` (model z nowszego katalogu), gdy wpis ma wartość `null` albo gdy obraz nie wczyta się w przeglądarce. Układ strony zamyka wtedy lukę. Komponent pokazuje oznaczenie „Zdjęcie poglądowe”, bo zdjęcie pokazuje model, a niekoniecznie tę samą wersję lub generację. Używa zwykłego `<img>`, a nie `next/image`, więc obrazy nie zużywają limitu obrazów planu hostingu. Teksty to `car.photo.*` w plikach tekstów. Strona metodologii wymienia Wikimedia Commons w tabeli źródeł i mówi, że zdjęcia są poglądowe.

Kroki odświeżenia zdjęć opisuje [przewodnik operatora](operations.md#57-odśwież-zdjęcia-modeli).

## 8. Pobieranie danych

### 8.1 Codzienne zadanie

`runJob('daily')` w `src/ingest/run-job.ts` uruchamia kroki z `dailySteps` (`src/ingest/jobs.ts`) jeden po drugim w tej kolejności: `exchange-rate`, `oil-bulletin`, `electricity`, `catalogue`. Krok, który zgłosi wyjątek, nie zatrzymuje pozostałych. Zadanie zapisuje wiersz w `refresh_runs`, a potem unieważnia znacznik pamięci podręcznej `catalog`, jeśli jakikolwiek krok zaktualizował dane.

Reguły statusu (`computeStatus`):

- `ok`: każdy krok jest `ok` i nie ma błędów.
- `failed`: żaden krok nie jest `ok`.
- `partial`: wszystko inne.

Krok jest `ok`, chyba że ma błędy i niczego nie zaktualizował ani nie pominął. Pojedynczy błąd w dowolnym kroku daje zadaniu status `partial`. Kolumna `summary` w `refresh_runs` zawiera `{ results, revalidated }`, gdzie `results` to lista wyników kroków z ich `notes` i `errors`.

### 8.2 Kroki

| Krok | Źródło | Co zapisuje | Sprawdzanie |
|---|---|---|---|
| `exchange-rate` | API NBP, tabela A, EUR | `eur_pln` | Kurs między 3 a 7. Data nie może być późniejsza niż o jeden dzień w przyszłości. |
| `oil-bulletin` | Weekly Oil Bulletin Komisji Europejskiej, XLSX „Prices with taxes latest prices” | `petrol`, `diesel`, `lpg` w PLN za litr | Adapter znajduje kolumny po tekście nagłówka, a wiersz po nazwie kraju `Poland`. Nagłówek waluty musi zawierać EUR, a jednostka musi być `1000 l`. Przelicza EUR za 1000 litrów kursem NBP z daty biuletynu i zaokrągla do czterech miejsc po przecinku. Poprawna cena: od 2 do 15 PLN za litr. LPG musi być tańsze niż benzyna. |
| `electricity` | Eurostat `nrg_pc_204`, Polska, gospodarstwa domowe 2500 do 4999 kWh, wszystkie podatki, PLN | `electricity` | Poprawna cena: od 0,3 do 5 PLN za kWh. Data to pierwszy dzień półrocza (S1 to 1 stycznia, S2 to 1 lipca). |
| `catalogue` | API zbioru ADEME | `cars` | Zobacz 8.3. |

Wszystkie adresy i limity są w `src/config/sources.ts`.

### 8.3 Krok katalogu i zabezpieczenia

1. Odczytuje datę aktualizacji zbioru z adresu metadanych.
2. Pobiera wszystkie wiersze (po 1000 na stronę, najwyżej 20 stron). Każdy link `next` musi zostać na `data.ademe.fr` pod `/data-fair/api/`. Liczba wierszy musi być równa zgłoszonej sumie.
3. Sprawdza każdy wiersz przez `ademeRowSchema`. Jeśli więcej niż 5% wierszy jest nieprawidłowych, krok kończy się błędem.
4. Bierze kurs EUR z bazy. Jeśli zapisany kurs pochodzi z danych przykładowych, pyta NBP o bieżący kurs.
5. Buduje katalog (sekcja 7.2).
6. Zabezpieczenia: co najmniej 1000 poprawnych wierszy, co najmniej 200 zbudowanych aut i co najmniej 50% liczby aut aktualnie aktywnych. Jeśli zabezpieczenie zadziała, krok kończy się błędem i niczego nie zapisuje.
7. Każda marka, której brakuje w `data/brands.json`, staje się wpisem błędu. Krok mimo to zapisuje katalog.
8. Zapisuje katalog przez `replaceCatalog`.

### 8.4 Wykrywanie zmian

- **Ceny rynkowe.** `saveIfNewer` (`src/ingest/market-store.ts`) pomija cenę, gdy zapisana data obserwacji jest taka sama lub późniejsza. Zapisany wiersz ze źródłem `fixture` jest zawsze zastępowany. Krok `oil-bulletin` pomija też żądanie do NBP, gdy wszystkie trzy zapisane ceny paliw są prawdziwe i co najmniej tak nowe jak biuletyn.
- **Katalog.** Krok pomija zapis („bez zmian”), gdy każde aktywne auto ma datę aktualizacji zbioru, którą API zgłasza teraz, a kurs EUR różni się od kursu, z którego wynikają zapisane ceny, o mniej niż 0,5%. Z powodu tej reguły zmiana w `data/brands.json` lub w mapowaniach trafia do bazy dopiero przy następnym zapisie, czyli z nową wersją zbioru albo przy zmianie kursu o 0,5% lub więcej. [Przewodnik operatora](operations.md) opisuje, jak wymusić zapis.
- **Wymiana katalogu.** `replaceCatalog` (`src/db/repositories.ts`) wstawia lub aktualizuje auta według sluga w porcjach po 200 i zapisuje tylko wiersze, które się zmieniły. Aut, których brakuje w nowym katalogu, ustawia na `active = false`, nigdy ich nie usuwa. Auto, które wraca, jest ponownie aktywowane. Funkcja odmawia pustego katalogu. Nie działa w transakcji, bo sterownik HTTP Neon jej nie ma.

### 8.5 HTTP, budżet czasu i próba bez zapisu

- Każde żądanie wysyła User-Agent z `USER_AGENT` i ma limit czasu 15 sekund (30 sekund dla wierszy ADEME). Po błędzie sieci lub odpowiedzi HTTP 5xx żądanie jest powtarzane raz po 500 ms. Każda inna odpowiedź niż 2xx kończy się błędem od razu. Odpowiedź JSON większa niż 1 MB albo plik XLSX większy niż 10 MB jest odrzucana.
- Zadanie ma budżet 240 sekund. Po terminie żadne żądanie się nie zaczyna. Trasa cron ustawia `maxDuration = 300`, czyli limit planu Hobby na Vercel.
- `npm run refresh -- --dry-run` uruchamia wszystkie kroki na prawdziwych źródłach i niczego nie zapisuje, nawet wiersza w `refresh_runs`. Wypisuje wartości, które by zapisał, jako notatki. Kod wyjścia to 1, gdy status to `failed`, w przeciwnym razie 0. Nieznany argument wypisuje wiersz z użyciem.

### 8.6 Jak dodać źródło

1. Dodaj adresy, zakresy sprawdzania i limity do `src/config/sources.ts`.
2. Napisz adapter w `src/ingest/sources/<nazwa>.ts`. Eksportuje on funkcję `(ctx: JobContext) => Promise<SourceResult>`. Użyj `newResult`, `addError` i `finishResult` z `src/ingest/types.ts`, `fetchJson` lub `fetchXlsx` oraz `parseExternal` z `src/ingest/http.ts`, a dla cen rynkowych `saveIfNewer`. Sprawdzaj dane wejściowe i kończ błędem bez zapisu.
3. Dodaj krok do `dailySteps` w `src/ingest/jobs.ts`.
4. Jeśli krok zapisuje nowy klucz ceny rynkowej, dodaj klucz do `MarketPriceKey` (`src/lib/domain/types.ts`), do enum `key` w `src/lib/domain/schemas.ts` oraz, jeśli silnik kosztów go potrzebuje, do `COST_KEYS` w `src/db/repositories.ts` i do `data/fixtures/market-prices.json`.
5. Zapisz odpowiedź w `tests/fixtures/` i dodaj testy integracyjne z atrapą `fetch` (zobacz sekcję 11).

## 9. Internacjonalizacja

- Języki: `pl` (domyślny) i `en`, ustawione w `src/i18n/routing.ts`. Adresy zawsze mają prefiks języka (`/pl/...`, `/en/...`). Segmenty ścieżek są angielskie w obu językach.
- Strona startowa `/` przekierowuje według domyślnego wykrywania next-intl: przeglądarka angielska trafia na `/en`, każda inna na `/pl`. Ostatni wybór jest zapamiętany w ciasteczku `NEXT_LOCALE`.
- Wszystkie teksty interfejsu są w `messages/pl.json` i `messages/en.json`. `src/i18n/request.ts` ładuje plik dla języka.
- Używaj `useTranslations()` w komponentach klienta i `getTranslations()` w komponentach serwera. Teksty używają składni ICU. Polskie liczby mnogie wymagają formy `few`.
- **Reguła zgodności kluczy.** Oba pliki muszą mieć te same klucze. Dodaj lub zmień klucz w obu plikach w tej samej zmianie. Żaden automatyczny test tego nie sprawdza. To polecenie wypisuje klucze, których brakuje po którejś stronie:

  ```bash
  node -e "const f=(o,p='')=>Object.entries(o).flatMap(([k,v])=>v&&typeof v==='object'&&!Array.isArray(v)?f(v,p+k+'.'):Array.isArray(v)?[p+k+'['+v.length+']']:[p+k]);const a=f(require('./messages/en.json')),b=f(require('./messages/pl.json'));console.log(a.filter(x=>!b.includes(x)),b.filter(x=>!a.includes(x)))"
  ```

  Dwie puste listy oznaczają, że pliki się zgadzają. Listy w tekstach metodologii muszą mieć tę samą długość w obu plikach.
- Identyfikatory kotwic sekcji metodologii różnią się w zależności od języka (`prices` i `ceny`, `power` i `moc`). Każda sekcja z kotwicą ma `otherId` dla przełącznika języka.
- Formaty liczb, walut i dat są w `src/lib/format.ts` (`pl-PL` i `en-GB`, twarda spacja przed `zł`).
- Sformułowania ustalone w projekcie („cena orientacyjna”, „niezalecane”, znak `≈`) zostają bez zmian. Zobacz sekcję 10.

## 10. System projektowy

- Specyfikacja to `design/DESIGN.md`. Jest źródłem prawdy dla tokenów, komponentów, ekranów i tekstów.
- Tokeny są w `src/app/globals.css` (blok `@theme`). Domyślna paleta Tailwind jest celowo usunięta. Komponenty są w `src/components/ui/`, a rama strony to `src/components/layout/SiteShell.tsx`. Krój pisma to Barlow (pliki w `src/components/ui/fonts/`).
- **Reguła: używaj tokenów i komponentów takimi, jakie są. Nie zmieniaj ich stylu.** Kolory, rozmiary, promienie i cienie pochodzą tylko z tokenów. Nie dodawaj wartości szesnastkowych do komponentów. Nie zmieniaj wartości tokenów, obrysu fokusu, kolejności i kolorów kategorii kosztów, znaku `≈`, sformułowań „cena orientacyjna” i „niezalecane” ani wysokości kontrolek. Jeśli ekran potrzebuje czegoś nowego, zmień razem `design/DESIGN.md` i komponenty.
- Komponenty są prezentacyjne. Teksty przychodzą jako przetłumaczone, sformatowane ciągi. Komponenty z logiką są w `src/components/features/`.
- **Nazwa dostępna przełączników porównania.** Kilka aut może mieć tę samą nazwę, więc nazwa dostępna przełącznika porównania dodaje cechy, które je rozróżniają. Ma postać `Porównaj: {nazwa}, [nadwozie,] {paliwo}, {skrzynia}, {moc}` po polsku i `Compare: ...` po angielsku. Gdy auto jest dodane, pierwsze słowo zmienia się na `W porównaniu` (`In comparison`). Nadwozie jest pomijane dla `sedan_hatchback`. `carNameWithAttributes` w `src/components/features/car/car-view.tsx` buduje część po dwukropku, a `src/components/ui/CompareToggle.tsx` ustawia `aria-label`. Wiersze rankingu i strona auta przekazują ten tekst do `CompareToggleButton`.
- **Fokus po zmianie strony.** Gdy strona zmienia się w przeglądarce, a fokus został utracony, `RouteFocus` (`src/components/features/shell/RouteFocus.tsx`) przenosi fokus klawiatury na główny nagłówek (`h1`) nowej strony albo na `main`, gdy nagłówka nie ma. Kolejny Tab zaczyna wtedy od treści strony.
- **Podgląd projektu.** Statyczne układy każdego ekranu i stanu są w `src/app/[locale]/design-preview/`. Używają danych przykładowych z `src/mocks/`. Są domyślnie wyłączone i odpowiadają `404`. Aby je zobaczyć, ustaw `NEXT_PUBLIC_DESIGN_PREVIEW=1` przed uruchomieniem serwera lub budowaniem, a potem otwórz `/pl/design-preview` lub `/en/design-preview`. Zrzuty ekranu są w `design/screens/`.

## 11. Testowanie

| Poziom | Narzędzie | Lokalizacja | Polecenie |
|---|---|---|---|
| Jednostkowe | Vitest | `tests/unit/` | `npm run test` |
| Integracyjne | Vitest, PGlite w pamięci, zapisane dane | `tests/integration/`, `tests/fixtures/` | `npm run test` |
| End-to-end | Playwright | `tests/e2e/` | `npm run test:e2e` |
| Statyczne | ESLint, TypeScript | cały projekt | `npm run lint`, `npm run typecheck` |

- Testy jednostkowe obejmują silnik kosztów, skalę zarobków, ranking, wczytywanie założeń, schematy Zod i budowanie katalogu. Zawierają dosłowne wartości oczekiwane, więc zmiana parametru wymaga zmiany testów.
- Testy integracyjne obejmują repozytoria, bootstrap, każdy adapter źródła, uruchamianie zadania i autoryzację trasy cron. Nie wykonują żadnego żądania sieciowego. Atrapa `fetch` (`tests/integration/helpers/fake-fetch.ts`) odpowiada zapisanymi plikami.
- Testy end-to-end używają dwóch projektów Playwright: `desktop` (Chromium, 1280 x 800) i `mobile` (Pixel 7). `playwright.config.ts` uruchamia aplikację poleceniem `npm run build && npm run start -- --port <port>` i czeka na ten port do 300 sekund. Używa serwera, który już działa na tym porcie, chyba że ustawiona jest zmienna `CI`. Uruchom raz `npx playwright install chromium`.
- **Port serwera testowego.** Port to wartość zmiennej środowiskowej `E2E_PORT`. Wartość domyślna to `3000`. Testy otwierają `http://localhost:<port>`. Ustaw `E2E_PORT`, gdy port 3000 jest zajęty, na przykład przez serwer deweloperski. Wartość musi być numerem portu, bo konfiguracja zamienia ją przez `Number()`.

  ```bash
  E2E_PORT=3100 npm run test:e2e
  ```

  ```powershell
  $env:E2E_PORT = "3100"; npm run test:e2e
  ```

- Testy end-to-end działają w trybie lokalnym, więc dane są takie same przy każdym uruchomieniu. Pakiet `@axe-core/playwright` jest zainstalowany do sprawdzania dostępności.
- **Zapisane dane testowe.** Odpowiedzi NBP, Oil Bulletin, Eurostat i ADEME są w `tests/fixtures/`. [tests/fixtures/README.md](../../tests/fixtures/README.md) wymienia pliki, datę każdego nagrania i adres. Aby nagrać plik ponownie, wyślij żądanie na adres i zapisz odpowiedź pod tą samą nazwą. Wartości oczekiwane w testach są dosłowne i wyliczone z tych plików, więc nowe nagranie wymaga nowych wartości oczekiwanych. Większe zestawy wierszy ADEME są wycinane z `data/fixtures/ademe-snapshot.json` podczas uruchamiania testów.
- Gdy zmieniasz migawkę lub `data/brands.json`, uruchom `npm run fixtures:build`, a potem `npm run test`. Kilka testów cytuje liczbę aut (489) i pominiętych wierszy.

## 12. Znane ograniczenia

Dane i model:

- Ceny to francuskie ceny katalogowe przeliczone na PLN. Cena u polskiego dealera może się różnić o kilka procent lub więcej. Gama modeli jest francuska: 37 marek, części sprzedawanych w Polsce brakuje, są wersje tylko francuskie, wersje E85 i diesel plug-in są pominięte.
- Zbiór jest aktualizowany mniej więcej co kwartał. Data ceny jest pokazana przy każdej cenie.
- Utrata wartości, ubezpieczenie, serwis, części i opłaty to szacunki modelu. Zużycie to wartość WLTP, która jest niższa niż w rzeczywistej jeździe, szczególnie dla hybryd plug-in.
- Auta elektryczne pokazują dla większości modeli moc znamionową (ciągłą). Hybrydy pokazują tylko moc silnika spalinowego.
- Nazwy aut to opisy ze źródła, z usuniętym oznaczeniem mocy i francuskimi słowami oraz z nazwami modeli zapisanymi zwykłą pisownią (sekcja 7.2). Reguła jest mechaniczna, więc kilka nazw może nadal zawierać francuskie lub techniczne słowo, którego reguła nie zna. Wiele nazw ma po dwa auta lub więcej, więc interfejs zawsze pokazuje obok nazwy nadwozie, napęd, skrzynię biegów i moc.
- Adresy aut zmieniły się razem z regułą sluga (sekcja 7.2). Adresy w starym formacie zwracają `404` i nie są przekierowywane. Pasek porównania po cichu usuwa z zapisanego porównania auta, których adresu nie ma w katalogu.
- Zdjęcia są poglądowe. Zdjęcie może pokazywać inną wersję lub generację modelu niż strona. Skrypt wybiera po tytule artykułu i krótkim opisie, więc człowiek musi sprawdzić wynik (sekcja 7.6). Nowy model nie ma zdjęcia, dopóki skrypt nie zostanie uruchomiony ponownie.
- Model zakłada zakup za gotówkę. Nie obejmuje kredytu, leasingu, parkingu, opłat drogowych, mandatów, mycia i przechowywania opon.
- Zmiana w `data/brands.json` lub w mapowaniach trafia do bazy dopiero przy następnym zapisie katalogu (sekcja 8.4).
- `replaceCatalog` nie jest atomowa. Jeśli zapis zawiedzie w środku, baza zawiera mieszankę starych i nowych poprawnych cen. W takim przypadku żadne auto nie jest dezaktywowane, a następne codzienne uruchomienie zapisuje katalog ponownie.
- Plik Oil Bulletin jest adresowany identyfikatorem dokumentu w `src/config/sources.ts`. Jeśli Komisja opublikuje go pod nowym identyfikatorem, krok kończy się błędem bez zapisu, a adres wymaga ręcznej zmiany.

Zachowanie w przeglądarce:

- Listy, porównanie i linki niosące zapytanie wymagają JavaScriptu. Bez niego strony pokazują powłokę ładowania. Strona „nie znaleziono” jest pusta.
- Przycisk Wstecz przeglądarki nie cofa pojedynczych zmian filtrów.
- Zapisane założenia pojawiają się chwilę po pierwszym wyświetleniu, na stronie otwartej bez parametrów założeń.
- Auto, które dodaje codzienne odświeżenie, może przez około 5 minut odpowiadać „nie znaleziono” na już działającej instancji serwera, bo instancja czyta listę slugów co 5 minut (`ACTIVE_SLUGS_REFRESH_MS`).
- Dopóki instancja serwera nie ma jeszcze listy slugów, adres nieznanego auta o poprawnym kształcie odpowiada `200` zamiast `404`. Dzieje się tak, gdy pierwszy odczyt trwa dłużej niż 5 sekund (`ACTIVE_SLUGS_READ_TIMEOUT_MS`) albo kończy się błędem. Stan kończy się, gdy odczyt się powiedzie. Po nieudanym odczycie kolejna próba następuje po 30 sekundach (`ACTIVE_SLUGS_RETRY_MS`). Zobacz sekcję 1.3.
- Marka, której brakuje w `data/brands.json`, utrzymuje codzienne zadanie w statusie `partial`, dopóki jej nie dodasz.
- Starsze przeglądarki: animacja wsuwania paneli filtrów i założeń wymaga `@starting-style`, a panele działają także bez niej. Układ używa `:has()` i ma rozwiązanie zastępcze dla przeglądarek bez niego (Firefox przed wersją 121).

Niezweryfikowane:

- Produkcja (Vercel i Neon): wywołanie Cron z sekretem, zadanie na bazie Neon, migracje na bazie Neon, `npm run build:vercel` oraz zachowanie źródeł z sieci Vercel.
- Prawdziwe telefony, Safari, Firefox i czytniki ekranu.
