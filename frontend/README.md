# SkiTracker — iPhone

Frontend React Native, Expo SDK 58 e TypeScript. Per ora include registrazione,
login, ripristino della sessione, logout e lettura/modifica del profilo.
La barra inferiore collega Home e Profilo; il logout si trova nel Profilo.
Non include ancora video, analisi o richiesta del ruolo istruttore.

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
- Dopo il login viene chiamato `GET /profile/me`: il backend crea il profilo
  mancante con ruolo `student` e UUID dell'utente autenticato.
- Modifica i dati e salva: viene chiamato `PATCH /profile/me` con il token.
- Chiudi e riapri l'app per verificare il ripristino della sessione.
- Effettua il logout e prova anche un secondo account.

Il backend attuale non cancella un campo quando riceve `null`.
Una data di nascita vuota viene quindi omessa e mantiene il valore precedente.

## Verifiche locali

```bash
npm run typecheck
npx expo install --check
```

Il test con utenti reali e iPhone va eseguito sul dispositivo: il solo
controllo TypeScript non verifica Supabase, database o connettività Wi-Fi.
