# Novixa Prescriber Portal (Rx-2 Phase A)

Channel UI for prescribers — separate from Admin ERP and Customer App.

## Dev

```bash
cd client/prescriber-portal
npm install
npm run dev
```

- Vite: http://localhost:5175
- API proxy → http://localhost:5290
- Auth: `POST /api/prescriber-portal/auth/otp-request|otp-verify`

## Architecture

- **Layer:** Channel (Prescriber Portal)
- **Domain:** `healthcare` — contracts in `src/KitPlatform.Application/Healthcare/`
- **Pack impl:** Pharmacy pack adapters (`Prescriber*HealthcareAdapter`)

## Routes

| Path | Screen |
|------|--------|
| `/login` | OTP login |
| `/` | Dashboard |
| `/pharmacies` | Linked pharmacies |
| `/directory` | Search & request NT link |
| `/invites` | Pending NT invitations |
| `/prescriptions` | Placeholder (signed Rx next sprint) |
