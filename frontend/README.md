# SkiTracker — iPhone

Frontend React Native, Expo SDK 58 e TypeScript. Per ora include registrazione,
login, ripristino della sessione, logout e lettura/modifica del profilo.
La barra inferiore collega Home, Levels, Clients e Profilo; il logout si trova nel Profilo.
La navigazione usa Expo Router, con le route in `src/app`.
Non include ancora analisi dei video.

## Configurazione

Da questa cartella esegui `npm install`. Copia `.env.example` in `.env` e
inserisci URL e chiave **publishable** del progetto Supabase.
Le variabili `EXPO_PUBLIC_` sono incluse nell'app: nessuna password del
database o chiave segreta deve essere inserita qui.

`EXPO_PUBLIC_API_URL` può restare vuoto: su rete LAN l'app usa l'host del
Mac indicato da Expo e la porta 8001. Se serve un indirizzo esplicito:

```dotenv
EXPO_PUBLIC_API_URL=http://192.168.1.20:8001
```

Usa l'indirizzo reale del Mac. `localhost` sull'iPhone indica il telefono.
Il tunnel di Expo non rende automaticamente raggiungibile il backend.

## Avvio su iPhone

1. Collega Mac e iPhone alla stessa rete Wi-Fi.
2. Installa o aggiorna Expo Go su iPhone: il progetto usa SDK 58.
3. Avvia il backend da `SkiTracker/backend`, con la sua venv attiva:

   ```bash
   python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
   ```

4. In un secondo terminale, da `SkiTracker/frontend`:

   ```bash
   npm start
   ```

5. Scansiona il QR con Fotocamera e apri Expo Go. Se richiesto, accedi
   allo stesso account Expo sul Mac (`npx expo login`) e su iPhone.
   Consenti l'accesso alla rete locale se iOS lo richiede.

Se Expo Go segnala una versione SDK non supportata, allinea l'SDK alla
versione dell'app Expo Go oppure usa una development build iOS.
`npm run ios` apre invece il simulatore e richiede Xcode.

## Prova del flusso

- Crea un account. Se la conferma email è abilitata su Supabase, conferma
  l'indirizzo nel browser e torna all'app per effettuare il login.
  Il completamento della sessione tramite deep link non è ancora incluso.
- Dopo il login viene chiamato `GET /ski_instructor/me`: il backend crea il profilo
  mancante in `ski_instructors`, con UUID dell'utente autenticato.
- Modifica i dati e salva: viene chiamato `PATCH /ski_instructor/me` con il token.
- Chiudi e riapri l'app per verificare il ripristino della sessione.
- Effettua il logout e prova anche un secondo account.

Il backend attuale non cancella un campo quando riceve `null`.
Una data di nascita vuota viene quindi omessa e mantiene il valore precedente.

## Livelli di sci

Apri **Levels** dalla barra inferiore. Ruota il cerchio in entrambe le direzioni
per passare tra L1 e L7 trascinando il dito sull’anello. Tocca il centro per
aprire il livello e usa Back per tornare al selettore.

Una sola pagina di dettaglio serve tutti i livelli. Per ora mostra segnaposto
per gli esercizi, che saranno collegati successivamente. Nome, spiegazione, obiettivo tecnico
e link video vengono caricati da `GET /level?level_number=1` (numero da 1 a 7).
Il video viene riprodotto dentro la pagina con i controlli nativi e lo schermo intero,
usando l’URL pubblico del file in Supabase Storage salvato nel database. Le tre abilità vengono caricate da
`GET /level_ability?level_id=<id>&ability_number=1` (numeri 1, 2 e 3),
usando l’ID del livello restituito dal backend. Le card mostrano solo numero
e nome e non sono cliccabili.

Dopo il passaggio a Expo Router, ferma Metro con Ctrl+C e riavvialo da questa
cartella con `npx expo start --clear`, poi apri nuovamente il QR in Expo Go.

## Verifiche locali

```bash
npm run typecheck
npx expo lint
node --experimental-strip-types --test tests/levelDial.test.mjs
npx expo install --check
```

Il test con utenti reali e iPhone va eseguito sul dispositivo: il solo
controllo TypeScript non verifica Supabase, database o connettività Wi-Fi.

## Creazione allievi

La scheda Clients permette all'istruttore di creare un allievo con dati personali,
email e password iniziale (almeno 8 caratteri). Livello e abilità sono facoltativi.
Il frontend chiama `POST /ski_customer`; il backend crea l'utente in Supabase Auth
e salva il profilo in `ski_customers` con lo stesso UUID. Non modifica la sessione
dell'istruttore e non restituisce la password. Se il salvataggio del profilo fallisce,
il backend tenta di rimuovere l'account appena creato e segnala l'eventuale errore.

Per abilitare la creazione, aggiungere `SUPABASE_SECRET_KEY` al solo `backend/.env`
e riavviare il backend. La chiave si trova in Supabase Dashboard → Settings → API Keys →
Secret keys. Non inserire questa chiave nelle variabili `EXPO_PUBLIC_`.
La password appartiene esclusivamente a Supabase Auth. L’email viene salvata anche in
`ski_customers` per la ricerca. Eseguire `backend/sql/clients_directory.sql` su Supabase
per aggiungere `email` e `profile_image_url` e recuperare le email degli account esistenti.

Le pagine dell'allievo e i collegamenti tra istruttore, allievo e lezioni saranno
aggiunti in seguito. Clients mostra una scheda cliccabile per ogni cliente, la ricerca per nome, cognome,
username ed email, e il pulsante Add client. Il dettaglio mostra i dati personali e permette
di aggiungere o cambiare la foto.

Per le foto, creare un bucket **public** chiamato `customers-images` in Supabase Storage.
Le foto del bucket sono accessibili a chi possiede il link. Il backend carica le immagini
con la propria chiave segreta; il frontend non riceve mai quella chiave.
Le immagini sono ritagliabili e opzionali, con limite di 5 MB dopo la compressione JPEG.
Se la foto non viene salvata durante la creazione, il cliente rimane creato e si può riprovare
dal suo dettaglio. Per ora tutti gli istruttori vedono la lista clienti condivisa;
il collegamento tra istruttore, cliente e lezioni sarà aggiunto successivamente.

Dal dettaglio di un cliente, Edit apre il modulo per nome, cognome, username,
data di nascita, sesso, livello e abilità. Save changes salva tramite
`PATCH /ski_customer/{id}`, riservata agli istruttori; Cancel scarta le modifiche.
I campi facoltativi possono essere svuotati. L'email di accesso resta in sola lettura.
La lista si aggiorna quando si torna alla pagina Clients.
