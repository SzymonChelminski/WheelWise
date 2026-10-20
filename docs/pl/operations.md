# Przewodnik operatora WheelWise

Ten przewodnik jest dla osoby, która wdraża i prowadzi WheelWise na Vercel z bazą Neon. Kod opisuje [przewodnik programisty](developer-guide.md).

**Status.** Poniższe kroki wynikają z kodu i konfiguracji repozytorium. Nie uruchomiono ich na prawdziwym koncie Vercel ani Neon. Wdrożenie produkcyjne nie zostało zweryfikowane. Po pierwszym wdrożeniu sprawdź punkty z listy na końcu sekcji 2.

## 1. Wymagania wstępne

- Konto Vercel. Plan Hobby wystarcza (jego ograniczenie opisuje sekcja 6).
- Repozytorium Git, które Vercel może zaimportować, z tym projektem.
- Baza Neon Postgres dodana przez integrację z Vercel Marketplace.
- Node.js 22 lub nowszy. `package.json` wymaga `>=22`. W ustawieniach projektu na Vercel wybierz Node.js 22.x lub nowszy.
- Na Twoim komputerze: Node.js 22 lub nowszy i npm, aby uruchamiać polecenia z sekcji 3 do 5.

Linki do dokumentacji dostawców:

- [Wdrażanie Next.js na Vercel](https://vercel.com/docs/frameworks/nextjs)
- [Zmienne środowiskowe Vercel](https://vercel.com/docs/environment-variables)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs) i [ich limity](https://vercel.com/docs/cron-jobs/usage-and-pricing)
- [Plan Vercel Hobby](https://vercel.com/docs/plans/hobby)
- [Neon w Vercel Marketplace](https://vercel.com/marketplace/neon) i [przewodnik Neon](https://neon.com/docs/guides/vercel-overview)

## 2. Pierwsze wdrożenie

1. **Utwórz projekt.** W Vercel zaimportuj repozytorium Git jako nowy projekt. Vercel wykrywa Next.js. Plik `vercel.json` ustawia resztę:

   | Ustawienie | Wartość |
   |---|---|
   | Region funkcji | `fra1` (Frankfurt) |
   | Polecenie budowania | `npm run build:vercel` |
   | Cron Job | `GET /api/cron/daily` o `0 3 * * *` (UTC) |

2. **Dodaj bazę.** W projekcie otwórz sekcję Storage, dodaj integrację Neon z Marketplace i połącz nową bazę z projektem. Wybierz region Neon blisko Frankfurtu. Plan darmowy wystarcza.

3. **Sprawdź zmienne środowiskowe.** W ustawieniach projektu otwórz Environment Variables i ustaw:

   | Nazwa | Wartość | Uwagi |
   |---|---|---|
   | `DATABASE_URL` | Ciąg połączenia Neon | Integracja zwykle tworzy zmienne połączenia. Upewnij się, że `DATABASE_URL` istnieje dla Production. Jeśli nie istnieje, dodaj ją z ciągiem połączenia z konsoli Neon. Build jej potrzebuje. |
   | `CRON_SECRET` | Długi losowy ciąg | Vercel wysyła go jako `Authorization: Bearer <CRON_SECRET>` do trasy cron. Bez niego trasa odpowiada `401` na każde żądanie, także od Vercel. Wartość utworzysz poleceniem `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. |
   | `NEXT_PUBLIC_SITE_URL` | `https://twoja-domena.example` | Tylko dla własnej domeny. Zobacz niżej. |

   Vercel stosuje zmienioną zmienną tylko do nowych wdrożeń. Po każdej zmianie wdróż projekt ponownie.

4. **Wdróż.** Polecenie budowania `npm run build:vercel` wykonuje trzy kroki:

   1. `npm run db:migrate` stosuje migracje SQL z `drizzle/` do bazy. Migracje już zastosowane są pomijane.
   2. `npm run db:bootstrap` ładuje przykładowy katalog (489 aut) i przykładowe ceny rynkowe, ale tylko do pustej bazy. Nigdy nie zmienia istniejących danych.
   3. `next build` buduje aplikację. Build czyta katalog z bazy, więc baza musi być dostępna podczas budowania.

   Jeśli na Vercel brakuje `DATABASE_URL`, build kończy się błędem, który mówi, że tryb lokalny jest wyłączony na Vercel w produkcji. Każdy build wykonuje te kroki na `DATABASE_URL` swojego środowiska, także build podglądu (preview). Jeśli chcesz, aby buildy pull requestów nie dotykały danych produkcyjnych, daj środowisku Preview własną bazę lub gałąź.

5. **Uruchom pierwsze odświeżenie ręcznie.** Po pierwszym wdrożeniu serwis pokazuje dane przykładowe: przykładowe ceny paliw i katalog z 2026-09-14 przy stałym kursie 4,30 PLN za EUR. Zadanie zastępuje przykładowe ceny rynkowe przy pierwszym uruchomieniu. Zastępuje też przykładowy katalog, chyba że zbiór ma tę samą datę, a bieżący kurs mieści się w granicach 0,5% od 4,30. Nie czekaj na harmonogram. Uruchom zadanie według sekcji 3 i przeczytaj wynik. Dobry wynik ma status `ok` lub `partial`. Zapisane podsumowanie uruchomienia (sekcja 4) pokazuje `"revalidated": true`. Potem otwórz serwis i sprawdź, czy stopka pokazuje daty cen paliw i cennika oraz datę sprawdzenia.

6. **Własna domena (opcjonalnie).** Dodaj domenę w ustawieniach projektu. Potem ustaw `NEXT_PUBLIC_SITE_URL` na adres ze schematem i bez ścieżki, na przykład `https://twoja-domena.example`, i wdróż ponownie. Reguła adresu serwisu:

   - `NEXT_PUBLIC_SITE_URL`, gdy jest ustawiony. Musi to być bezwzględny adres `http:` lub `https:` bez ścieżki, zapytania i fragmentu. Końcowy ukośnik jest usuwany. Nieprawidłowa wartość przerywa build.
   - W przeciwnym razie `https://` plus domena produkcyjna, którą Vercel nadaje projektowi (`VERCEL_PROJECT_PRODUCTION_URL`).
   - W przeciwnym razie `http://localhost:3000`.

   Adres jest używany w linkach kanonicznych, alternatywach językowych i w nagłówku User-Agent zadania. Bez własnej domeny nie musisz go ustawiać.

### Kontrole po pierwszym wdrożeniu

Tych elementów nie zweryfikowano na Neon i Vercel. Sprawdź je raz:

- [ ] Build się zakończył, a serwis otwiera się pod `/pl` i `/en`.
- [ ] Na swoim komputerze uruchom dwa razy `DATABASE_URL="<ciąg połączenia Neon>" npm run db:migrate`. Oba uruchomienia wypisują `migrations applied`.
- [ ] Uruchom dwa razy `DATABASE_URL="<ciąg połączenia Neon>" npm run db:bootstrap`. Drugie uruchomienie wypisuje `bootstrap done: 0 cars loaded, 0 market prices loaded`.
- [ ] Trasa cron odpowiada `401` bez tokena i uruchamia zadanie z tokenem (sekcja 3).
- [ ] Pierwsze uruchomienie zadania kończy się statusem `ok` lub `partial`, a krok Oil Bulletin czyta plik (adres dokumentu w `src/config/sources.ts` nie był testowany z sieci Vercel).
- [ ] Listy pokazują auta w rozsądnej kolejności. Kolejność sortowania nie była testowana w układzie porównywania tekstu (collation) Neon.
- [ ] Vercel sam uruchamia Cron Job następnego dnia. Sprawdź stronę Cron Jobs projektu i tabelę `refresh_runs`.

## 3. Zadanie cron

- **Harmonogram.** `0 3 * * *` w `vercel.json`, w UTC. To 04:00 w Polsce zimą i 05:00 latem.
- **Dokładność.** Na planie Hobby zadanie cron działa najwyżej raz dziennie, a Vercel może je uruchomić o dowolnej porze w danej godzinie (odchylenie do 59 minut). Zobacz stronę [Cron usage and pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing). Vercel uruchamia Cron Jobs tylko dla wdrożenia produkcyjnego.
- **Co wywołuje.** `GET /api/cron/daily`. Trasa odpowiada:

  | Odpowiedź | Znaczenie |
  |---|---|
  | `401` z `{}` | Brak tokena lub zły token, albo `CRON_SECRET` nie jest ustawiony. |
  | `200` z JSON | Zadanie zakończyło się ze statusem `ok` lub `partial`. |
  | `500` z JSON | Status to `failed` (każdy krok zawiódł) albo zadanie się zawiesiło. |

  Trasa nigdy nie zapamiętuje odpowiedzi. `maxDuration` to 300 sekund, limit planu Hobby. Zadanie ma własny budżet czasu 240 sekund.

### Uruchom zadanie ręcznie

Przez HTTP z tokenem:

```bash
curl -s -H "Authorization: Bearer $CRON_SECRET" https://twoja-domena.example/api/cron/daily
```

Z wiersza poleceń, na bazie Neon (zmienna musi być ustawiona w powłoce, zobacz [przewodnik programisty](developer-guide.md#3-tryb-lokalny-i-tryb-produkcyjny)):

```bash
DATABASE_URL="<ciąg połączenia Neon>" npm run refresh
```

Próba bez zapisu czyta wszystkie źródła i niczego nie zapisuje, nawet wiersza dziennika:

```bash
npm run refresh -- --dry-run
```

Bez `DATABASE_URL` prawdziwe uruchomienie zapisuje do bazy w pamięci tego procesu, która od razu znika. W takim przypadku użyj próby bez zapisu.

Wiersz poleceń nie odświeża pamięci podręcznej działającego serwisu. Strony pokazują wtedy nowe dane, gdy wygasną ich wpisy w pamięci podręcznej. Użyj wywołania HTTP, gdy chcesz, aby serwis zaktualizował się od razu.

### Odczytaj wynik

Odpowiedź HTTP ma taki kształt. Zapisane `summary` zawiera tę samą listę `results` i dodatkowe pole `revalidated`.

```json
{
  "status": "ok",
  "results": [
    {
      "source": "exchange-rate",
      "ok": true,
      "updated": 1,
      "skipped": 0,
      "errors": [],
      "notes": ["EUR/PLN 4.3775 (2026-10-09)"]
    }
  ]
}
```

Dla każdego kroku jest jeden wpis, w kolejności `exchange-rate`, `oil-bulletin`, `electricity`, `catalogue`. `updated` liczy zapisane wartości. `skipped` liczy wartości, które były już aktualne, a dla katalogu także wiersze, które pominął budowniczy katalogu. `notes` wyjaśniają, co się stało. `errors` wymienia problemy z polami `item` i `message`. Wiersz poleceń wypisuje te same informacje jako tekst. Kod wyjścia to 1 tylko dla statusu `failed`.

W zwykły dzień większość kroków zgłasza `skipped`, bo źródła publikują we własnym rytmie: ceny paliw co tydzień, katalog aut mniej więcej co kwartał, prąd co pół roku, a kurs w dni robocze.

## 4. Monitorowanie

Każde prawdziwe uruchomienie (nie próba bez zapisu) zapisuje jeden wiersz w tabeli `refresh_runs`. Przeczytasz go w edytorze SQL w konsoli Neon albo przez `psql` z ciągiem połączenia.

| Kolumna | Znaczenie |
|---|---|
| `id` | Numer uruchomienia. |
| `job` | Zawsze `daily`. |
| `started_at`, `finished_at` | Czasy. `finished_at` jest puste dla uruchomienia, które się nie zakończyło. |
| `status` | `ok`, `partial` lub `failed`. Uruchomienie, które się nie kończy (na przykład gdy Vercel zatrzyma funkcję), zachowuje domyślne `failed`. |
| `summary` | JSON `{ "results": [...], "revalidated": true|false }`. `revalidated` jest prawdą, gdy uruchomienie zaktualizowało dane wewnątrz serwera Next.js i odświeżyło pamięć podręczną. |

Ostatnie uruchomienia:

```sql
select id, status, started_at, finished_at from refresh_runs order by id desc limit 10;
```

Błędy jednego uruchomienia:

```sql
select r->>'source' as step, r->'errors' as errors
from refresh_runs, jsonb_array_elements(summary->'results') as r
where id = 42 and jsonb_array_length(r->'errors') > 0;
```

Stopka serwisu pokazuje datę ostatniego uruchomienia, które zakończyło się statusem `ok` lub `partial`.

### Statusy

- `ok`: każdy krok się zakończył i nie zgłosił błędu.
- `partial`: zgłoszono co najmniej jeden błąd albo co najmniej jeden krok zawiódł, a inny nie. Dane z pozostałych kroków są aktualne.
- `failed`: każdy krok zawiódł. Nic nie zapisano.

Krok liczy się jako nieudany tylko wtedy, gdy ma błędy i niczego nie zapisał ani nie pominął. Krok z błędami dla niektórych pozycji, ale z aktualizacjami, jest zgłaszany jako `ok` z listą błędów, a status zadania to `partial`.

### Typowe awarie

Po każdej z tych awarii zapisane dane zostają na miejscu. Serwis działa dalej z ostatnimi dobrymi wartościami.

| Komunikat w `errors` | Przyczyna | Co zrobić |
|---|---|---|
| `Make is not in data/brands.json, so it got the default tier and retention` (`item` to pisownia marki ze zbioru) | Zbiór ma nową markę. Zadanie ma status `partial` każdego dnia, dopóki jej nie dodasz. | Dodaj markę (sekcja 5.1). |
| `HTTP 404 from energy.ec.europa.eu/document/download/...` | Komisja opublikowała Oil Bulletin pod nowym identyfikatorem dokumentu. | Zmień `latestPricesUrl` (sekcja 5.3). |
| `Oil bulletin: no header row with a Euro-super 95 column`, `expected one ... column`, `unit of the ... column`, `no row for poland`, `the prices are not in EUR` | Zmienił się układ pliku Oil Bulletin. | Sekcja 5.3. |
| `... price ... is outside the valid range` lub `LPG price ... is not lower than petrol` | Wartość w źródle wygląda na błędną. Zadanie jej nie zapisuje. | Sprawdź biuletyn. Jeśli wartość jest poprawna, zmień zakres w `src/config/sources.ts`. Jeśli nie, poczekaj na kolejny biuletyn. |
| `EUR/PLN rate ... is outside the valid range 3..7` | Błędna wartość z NBP. | Sprawdź API NBP. Zmień zakres tylko wtedy, gdy rynek naprawdę się przesunął. |
| `Only ... valid rows downloaded`, `Only ... cars built`, `fewer than 50% of the ... active cars`, `... ADEME rows fail validation` | Zbiór ADEME się zmienił albo przyszedł niekompletny. Zabezpieczenia katalogu zatrzymały zapis. | Sprawdź zbiór i `notes` kroku. Stary katalog zostaje. Zobacz sekcję 5.2. |
| `ADEME rows collected ... differ from the reported total` lub `... "next" link points to a different host` | API odpowiedziało w nieoczekiwany sposób. | Uruchom próbę bez zapisu ponownie później. Jeśli się powtarza, sprawdź API. |
| `HTTP 5xx`, `Request to ... failed`, `Time budget exhausted` | Źródło nie działa albo jest wolne. | Poczekaj do następnego dnia. Jeśli się powtarza, sprawdź źródło. |

`notes` kroku katalogu zawierają `rows skipped by the builder: ...` z liczbą dla każdego powodu. Powody takie jak `no-price`, `no-consumption` i `unsupported-energy` są normalne. Liczba przy `unknown-energy`, `unknown-body`, `unknown-range` lub `unknown-gearbox` oznacza, że zbiór ma nową wartość (sekcja 5.2).

Jeśli trasa cron jest niedostępna, sprawdź dzienniki funkcji w Vercel. Trasa zapisuje `Daily job crashed: <komunikat>`, gdy zadanie zgłosi wyjątek.

## 5. Bieżąca konserwacja

### 5.1 Dodaj nową markę do `data/brands.json`

Zrób to, gdy zadanie zgłasza `Make is not in data/brands.json`.

1. Weź pisownię z `item` błędu. To marka tak, jak zapisuje ją zbiór.
2. Dodaj wpis do `data/brands.json`:

   ```json
   "ZEEKR": { "displayName": "Zeekr", "tier": "mainstream", "retention": "average" }
   ```

   `tier` to `budget`, `mainstream` lub `premium`. `retention` to `high`, `average` lub `low`. Obie wartości to szacunki, które ustawiają serwis, części i utratę wartości dla marki.
3. Uruchom `npm run fixtures:build`, potem `npm run test`. Zmień testy, które cytują stare liczby.
4. Zatwierdź zmiany i wdróż.
5. Katalog zmienia się tylko wtedy, gdy zadanie go zapisze. Jeśli zbiór ma tę samą datę, a kurs zmienił się o mniej niż 0,5%, zadanie pomija zapis. Aby zastosować nowy wpis od razu, zobacz „Wymuś zapis katalogu” poniżej.

Dopóki nie dodasz marki, jej auta pojawiają się z klasą `mainstream` i utrzymaniem wartości `average`.

### 5.2 Dodaj mapowanie dla nowej wartości zbioru

Zrób to, gdy `notes` pokazują `unknown-energy`, `unknown-body`, `unknown-range` lub `unknown-gearbox` z rosnącą liczbą.

1. Znajdź nową wartość w zbiorze (pole `Energie`, `Carrosserie`, `Gamme` lub `Type_de_boite`).
2. Dodaj ją do właściwej tabeli w `src/config/catalog.ts`: `ENERGY_TO_FUEL_TYPE`, `BODY_TYPE_MAP`, `SEGMENT_MAP` lub `TRANSMISSION_MAP`. Zapisz klucz wielkimi literami. Jeśli klasa aut ma zostać poza katalogiem, dodaj energię do `UNSUPPORTED_ENERGIES`.
3. Jeśli nowa wartość wymaga też nowego typu w aplikacji, to zmiana w kodzie. Zobacz [przewodnik programisty](developer-guide.md#7-katalog).
4. Uruchom `npm run test`, zatwierdź zmiany i wdróż. Zastosuj zmianę tak, jak opisuje „Wymuś zapis katalogu”.

### 5.3 Reaguj na zmieniony Oil Bulletin

Krok czyta plik spod `OIL_BULLETIN.latestPricesUrl` w `src/config/sources.ts`. Adres wskazuje dokument przez identyfikator, a Komisja co tydzień wymienia plik pod tym adresem.

- **Nowy identyfikator dokumentu.** Otwórz [stronę Weekly Oil Bulletin](https://energy.ec.europa.eu/data-and-analysis/weekly-oil-bulletin_en), znajdź dokument „Prices with taxes latest prices” i skopiuj jego adres pobierania. Wstaw go do `latestPricesUrl`, zatwierdź zmiany i wdróż.
- **Nowy układ.** Adapter znajduje kolumny po tekście nagłówka, a wiersz po nazwie kraju. Wzorce są w `OIL_BULLETIN` (`headers`, `country`, `unit`, `currencyHeader`). Komentarz na początku `src/ingest/sources/oil-bulletin.ts` opisuje układ, którego adapter oczekuje. Otwórz plik, porównaj i popraw wzorce. Uruchom `npm run refresh -- --dry-run`, aby sprawdzić wynik. Zapisany plik testowy to `tests/fixtures/oil-bulletin/latest-prices-with-taxes.xlsx`. Nagraj nowy i zmień wartości oczekiwane w testach.

### 5.4 Odśwież zatwierdzoną migawkę i dane przykładowe

Migawka `data/fixtures/ademe-snapshot.json` i dane przykładowe służą do trybu lokalnego, pierwszego wdrożenia i testów. Działający serwis nie używa ich po pierwszym zadaniu. Odśwież je, gdy chcesz, aby tryb lokalny i testy używały nowszego zbioru.

1. Odczytaj `dataUpdatedAt` z adresu metadanych (`ADEME.metadataUrl` w `src/config/sources.ts`).
2. Pobierz wszystkie wiersze z adresu wierszy (`ADEME.rowsUrl`) i idź za linkami `next`, aż ich nie będzie.
3. Zapisz plik jako `{ "dataUpdatedAt": "<wartość>", "rows": [ ... ] }`. Skrypt sprawdza kształt przez `ademeRowSchema`.
4. Uruchom `npm run fixtures:build`. Sprawdź wypisane liczby i listę nieznanych marek.
5. Uruchom `npm run test`. Kilka testów zawiera dosłowne wartości pochodzące z obecnej migawki (liczba aut, pominięte wiersze, ceny aut wzorcowych). Zmień je po sprawdzeniu, że nowe wartości są poprawne.
6. Jeśli katalog ma nowe modele, odśwież zdjęcia (sekcja 5.7).
7. Zatwierdź migawkę, `data/fixtures/cars.json`, pliki zdjęć i testy.

### 5.5 Wymuś zapis katalogu

Krok katalogu pomija zapis, gdy każde aktywne auto ma tę samą datę zbioru, którą zbiór zgłasza, a kurs EUR zmienił się o mniej niż 0,5%. Zmiana w `data/brands.json` lub w mapowaniach nie zmienia żadnej z tych wartości. Aby następne uruchomienie zapisało katalog, zresetuj zapisane daty cen. Wykonaj to w edytorze SQL Neon, a potem uruchom zadanie (sekcja 3):

```sql
update cars set price_observed_at = date '1970-01-01';
```

Uruchomienie odbuduje wtedy katalog i zapisze wszystkie auta ponownie z datą zbioru. Ten krok zmienia tylko kolumnę z datą, a zadanie ją przywraca.

### 5.6 Aktualizuj Next.js

`package.json` przypina `next` i `eslint-config-next` do jednej dokładnej wersji. Aby sprawdzić, czy jest nowsza wersja poprawkowa tej samej linii:

```bash
npm outdated next
```

Przeczytaj uwagi o wydaniu i ostrzeżenia bezpieczeństwa na [blogu Next.js](https://nextjs.org/blog). Aby zaktualizować:

1. Zainstaluj nową wersję obu pakietów, na przykład `npm install next@<wersja> eslint-config-next@<wersja> --save-exact`.
2. Uruchom `npm run lint`, `npm run typecheck`, `npm run test` i `npm run build`.
3. Uruchom `npm run test:e2e` (wymaga jednorazowo `npx playwright install chromium`).
4. Zatwierdź `package.json` i `package-lock.json` i wdróż.

### 5.7 Odśwież zdjęcia modeli

Strony aut pokazują jedno zdjęcie dla każdej marki i modelu. Zdjęcia nie są pobierane w czasie działania serwisu. Skrypt znajduje je na Wikimedia Commons, a wynik jest zatwierdzony w `data/model-images.json`. Model, który nie ma wpisu w tym pliku, nie pokazuje zdjęcia, a strona działa bez niego. Nowy model dostaje zdjęcie dopiero po wykonaniu poniższych kroków.

Zrób to, gdy w katalogu pojawią się nowe modele, na przykład po odświeżeniu migawki (sekcja 5.4). Skrypt czyta modele z `data/fixtures/cars.json`, a nie z bazy danych. Najpierw uruchom `npm run fixtures:build`, aby plik zawierał nowe modele.

1. Uruchom skrypt. Wywołuje on prawdziwe API Wikipedii i Wikimedia Commons, więc wymaga dostępu do sieci, a dla obecnego katalogu trwa około dwóch minut. Celowo czeka między zapytaniami. Nie uruchamiaj go w pętli. Tabela trafia do pliku, a postęp do terminala:

   ```bash
   npm run images:build --silent > images.tsv
   ```

2. Jeśli skrypt zatrzyma się z komunikatem takim jak `Network error while requesting commons.wikimedia.org` lub `commons.wikimedia.org answered 429`, żaden plik nie został zmieniony. Poczekaj i uruchom go ponownie.
3. Otwórz `images.tsv`. Każdy wiersz ma klucz modelu, artykuł z Wikipedii, plik z Commons, licencję i, gdy zdjęcia nie ma, powód. Dla każdego nowego modelu sprawdź, czy artykuł dotyczy tej samej marki i modelu oraz czy generacja jest zbliżona do auta w katalogu. Gdy nie masz pewności, otwórz stronę pliku.
4. Jeśli model ma złe zdjęcie albo żadne, dodaj wpis do `data/model-image-overrides.json` i uruchom skrypt ponownie. Wpis to `{ "article": "<tytuł w angielskiej Wikipedii>" }`, `{ "file": "File:<nazwa w Commons>" }` albo `null` dla braku zdjęcia. Format opisuje [przewodnik programisty](developer-guide.md#76-zdjęcia-modeli).
5. Uruchom `git diff data/model-images.json`. Skrypt ustala zdjęcia wszystkich modeli od nowa, więc sprawdź też zmienione wiersze modeli, których nie ruszałeś. Główny obraz artykułu w Wikipedii może się zmienić.
6. Usuń `images.tsv`. Zatwierdź `data/model-images.json` i `data/model-image-overrides.json`, a potem wdróż. Serwis czyta plik podczas budowania, więc zdjęcia pojawiają się po nowym wdrożeniu.

Skrypt przyjmuje tylko pliki z licencją CC0, domena publiczna, CC BY lub CC BY-SA, o szerokości co najmniej 1280 px. Model bez takiego pliku nie dostaje zdjęcia. Serwis pokazuje pod każdym zdjęciem autora, licencję i link do Commons. To jest podanie autorstwa, którego wymagają licencje. Zachowaj je.

## 6. Koszt utrzymania

Każda usługa używana przez projekt jest darmowa:

| Usługa | Plan | Z czego korzysta projekt |
|---|---|---|
| Vercel | Hobby | Hosting, jedno codzienne zadanie Cron, jedna funkcja z limitem 300 sekund. |
| Neon | Free | Jedna baza Postgres. Dane zajmują około 1 MB. |
| Źródła danych | Darmowe | ADEME, Komisja Europejska, NBP, Eurostat. Bez klucza i bez konta. |
| Wikimedia Commons | Darmowe | Zdjęcia modeli aut. Przeglądarka odwiedzającego pobiera je z `upload.wikimedia.org`. Serwis nie wywołuje żadnego API w czasie działania. Skrypt zdjęć używa publicznych API bez klucza. |

Limity ważne dla tego projektu:

- **Częstotliwość cron.** Plan Hobby pozwala na zadanie raz dziennie. Projekt potrzebuje dokładnie tego. Częstszy harmonogram wymaga planu płatnego.
- **Czas działania funkcji.** Trasa cron deklaruje 300 sekund, czyli limit planu Hobby. Zadanie przestaje rozpoczynać żądania po 240 sekundach.
- **Neon Free.** Dane mieszczą się z dużym zapasem. Aktualne limity sprawdź na [stronie cennika Neon](https://neon.com/pricing).
- **Warunki planu Hobby.** Plan Vercel Hobby jest przeznaczony do użytku osobistego, niekomercyjnego. Jeśli serwis zarabia (reklamy, płatne funkcje, sponsoring), potrzebujesz planu płatnego. Przeczytaj [warunki planu Hobby](https://vercel.com/docs/plans/hobby), zanim zaczniesz zarabiać na serwisie.

Zbiór ADEME ma licencję Licence Ouverte / Open Licence 2.0. Pozwala na swobodne ponowne wykorzystanie z podaniem źródła. Serwis pokazuje podanie źródła w stopce i na stronie metodologii. Zachowaj oba miejsca.

## 7. Wycofanie zmian i bezpieczeństwo danych

- **Nieudane odświeżenie nigdy nie usuwa danych.** Każdy krok sprawdza dane wejściowe, zanim cokolwiek zapisze. Przy błędzie krok zostawia zapisane dane bez zmian. Następne uruchomienie próbuje ponownie.
- **Ceny rynkowe** są zapisywane tylko wtedy, gdy data ze źródła jest nowsza od zapisanej. Stary plik nie może nadpisać nowszej ceny.
- **Katalog maleje tylko przez zabezpieczenia.** Krok odmawia zapisu mniej niż 200 aut, mniej niż 1000 poprawnych wierszy albo mniej niż połowy aktualnie aktywnych aut. `replaceCatalog` odmawia też pustej listy.
- **Auta są dezaktywowane, nie usuwane.** Gdy nowa wersja zbioru nie zawiera już auta, jego wiersz zostaje w tabeli z `active = false`. Jego strona odpowiada „nie znaleziono”. Jeśli auto wróci, następny zapis aktywuje je ponownie.
- **Zapis katalogu nie jest atomowy.** Sterownik HTTP Neon nie ma transakcji. Jeśli zapis zawiedzie w środku, baza zawiera mieszankę starych i nowych poprawnych cen. W takim przypadku żadne auto nie jest dezaktywowane, bo dezaktywacja następuje na końcu. Następne uruchomienie zapisuje katalog ponownie.
- **Wycofaj wdrożenie.** Vercel przechowuje wcześniejsze wdrożenia. W projekcie otwórz Deployments i promuj wcześniejsze wdrożenie. Baza nie jest wycofywana razem z kodem. Projekt ma na razie jedną migrację. Tworzy ona trzy tabele, a `db:migrate` pomija migracje, które są zastosowane.
- **Przywróć złe dane.** Baza nie przechowuje historii wersji katalogu. Aby odzyskać dobry katalog po złym zapisie, usuń przyczynę i zapisz katalog ponownie (sekcja 5.5). Opcje przywracania w swoim planie sprawdź w [dokumentacji Neon](https://neon.com/docs/guides/vercel-overview).
