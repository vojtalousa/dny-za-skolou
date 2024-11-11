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
- `/web/_redirects` - definuje Google přihlášení na vlastní doméně, ve [formátu Netlify redirects](https://docs.netlify.com/routing/redirects/#syntax-for-the-redirects-file)
- `/firestore/` - dokumentace a konfigurace databáze Firestore

## Instalace
1. Vytvořte [Firebase](https://console.firebase.google.com/) projekt
2. Přidejte ve Firebase webovou aplikaci 
3. Doplňte [Firebase konfiguraci](https://support.google.com/firebase/answer/7015592#zippy=%2Cin-this-article) v `/web/scripts/config.js`
4. `authDomain` v konfiguraci nastavte na vaši doménu 
5. V Firebase console aktivujte Authentication a zapněte Google přihlašování 
6. V nastavení Firebase Authentication autorizujte vaši doménu 
7. V [Google Cloud Console](https://console.cloud.google.com/auth/clients) přejděte do sekce `Google Auth Platform`, přidejte vaši doménu jako autorizovanou a ve webovém klientovi ji přidejte jako Javascript origin a redirect URI 
8. Nastavte redirect z `https://PROJECT_ID.firebaseapp.com/__/auth/` na `/__/auth/` (pro hosting na [Netlify](https://www.netlify.com/) můžete použít `/web/_redirects`)
9. V Firebase console aktivujte Firestore Database a z dokumentace `/firestore/` doplňte rules 
10. Ručně vytvořte collection `settings` a oba dokumenty v ní 
11. Přidejte svůj email do pole `admins` v `settings/private`
12. Nahrajte statické soubory z `/web/` na hosting 
13. Přidejte začátek přihlašování a seznam akcí přes webové rozhraní na `/admin`