# Systém pro přihlašování na DZŠ
Vytvořený pro Dvořákovo gymnázium.

## Motivace
- starý systém přihlašování nezvládal nápor uživatelů
- alternativní systém přes Google Forms nebyla uživatelsky přívětivý

## Řešení
> od základu systém počítá s velkým náporem v krátkém čase a prakticky nulovým využitím jindy
- serverless aplikace na platformě Firebase
- logika přihlašování plně přes Firestore rules
- jednoduché statické rozhraní pro uživatele
- čekací místnost uživatele automaticky přesune k přihlašování po začátku
- živé změny zaplněnosti akcí

## Struktura
- `/web/` - statické webové rozhraní
- `/firestore/` - dokumentace a konfigurace databáze Firestore
- `/_redirects` - definuje Google přihlášení na vlastní doméně, ve [formátu Netlify redirects](https://docs.netlify.com/routing/redirects/#syntax-for-the-redirects-file)

## Instalace
1. Vytvořte [Firebase](https://console.firebase.google.com/) projekt
2. Nastavte Firestore rules a collections podle dokumentace v `/firestore/`
3. Přidejte svůj email do pole admin v `settings/private`
4. Doplňte [Firestore konfiguraci](https://support.google.com/firebase/answer/7015592#zippy=%2Cin-this-article) v `/web/scripts/config.js`
5. Nahrajte statické soubory z `/web/` na hosting
6. Nastavte redirect z `https://PROJECT_ID.firebaseapp.com/__/auth/` na `/__/auth/` (pro hosting na [Netlify](https://www.netlify.com/) můžete použít `/_redirects`)
7. Přidejte začátek přihlašování a akce přes webové rozhraní na `/admin`