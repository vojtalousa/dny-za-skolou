**Collection:** `events`
- ukládá seznam akcí, které jsou dostupné k přihlášení
- **Document ID**: náhodně generované

- **Fields:**
  - `capacity (number)`: maximální kapacita akce
  - `name (string)`: zobrazovaný název akce
  - `teachers (string)`: seznam učitelů, kteří akci vedou (př.: Šteglová, Kellerová M.)
  - `participants (string[])`: list emailů uživatelů aktuálně přihlášených na akci

**Collection:** `users`
- ukládá informace o přihlášených uživatelích
- **Document ID**: email uživatele
- **Fields:**
    - `email (string)`: email uživatele
    - `event_id (string)`: Document ID akce, na kterou je uživatel přihlášen

**Collection:** `settings`
- ukládá sdílená nastavení aplikace
- pro správné fungování je oba statické dokumenty nutné vytvořit ručně
- 2 statické dokumenty:
  - `private` - obsahuje informace, které můžou vidět jen adminové
    - **Fields:**
        - `admins (string[])`: seznam emailů adminů
  - `public` - obsahuje informace dostupné všem uživatelům
    - **Fields:**
        - `start_time (timestamp)`: čas, kdy bude povoleno přihlašování na akce
