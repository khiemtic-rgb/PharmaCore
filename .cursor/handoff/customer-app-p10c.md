# Customer app P10c — i18n completion

## Scope

Translated remaining hardcoded Vietnamese UI strings in customer-app to `react-i18next` (`vi-VN` / `en-US`).

### Pages / components translated

| Module | File | Namespace |
|--------|------|-----------|
| Auth | `OtpLoginPage.tsx` | `auth.*` |
| Medications | `MyMedicationPage.tsx` | `medications.*` |
| Pharmacy hub | `PharmacyHubPage.tsx` | `pharmacy.*` |
| Family | `FamilyPage.tsx` | `family.*`, `enum.familyRelationship` |
| Chat | `ChatPage.tsx` | `chat.*` |
| AI Copilot | `AiHealthPage.tsx` | `ai.*` (incl. `sampleQ1`–`sampleQ3`) |
| Loyalty | `LoyaltyPage.tsx` | `loyalty.*`, `enum.loyaltyTx` |
| Addresses | `AddressesPage.tsx` | `addresses.*` |
| Receivables | `ReceivablesPage.tsx` | `receivables.*`, `enum.paymentMethod` |
| Reservations | `ReservationsPage.tsx` | `reservations.*`, `enum.reservation*` |
| Health wallet | `HealthWalletPage.tsx` | `health.*`, `enum.healthRecordType` |
| Repurchase panel | `RepurchaseSuggestionsPanel.tsx` | `repurchase.*`, `reminders.repurchase*` |
| Orders (child panels) | `DraftOrdersPage.tsx` | `orders.*`, `ordersDetail.*`, enums |
| Error boundary | `AppErrorBoundary.tsx` | `error.*` via `i18n.t()` |

### Locale files expanded

- `client/customer-app/src/shared/i18n/locales/vi-VN.json`
- `client/customer-app/src/shared/i18n/locales/en-US.json`

Added namespaces: `auth`, `medications`, `pharmacy`, `family`, `chat`, `ai`, `loyalty`, `addresses`, `receivables`, `reservations`, `health`, `repurchase`, `ordersDetail`, `error`. Also `common.delete`.

### Patterns used

- `useTranslation()` in function components; nested child components each call their own hook.
- `useCustomerLabels()` for enum labels (`familyRelationship`, `healthRecordType`, `reservationStatus`, `paymentMethod`, `loyaltyTx`, `draftOrderStatus`, `purchaseStatus`, etc.).
- Class component `AppErrorBoundary`: `import i18n from '@/shared/i18n'` + `i18n.t('error.*')`.

## Server-side / API content still Vietnamese (not changed — backend out of scope)

These appear in the UI as-is from API responses:

- **Product names**, order numbers, reservation numbers, voucher names
- **Chat messages** (`body`, `senderName`) — pharmacist/customer content
- **AI Copilot answers** (`answer`, `disclaimer`, `confidence` labels from API)
- **Notification** titles/bodies from push/in-app feed
- **Medication timeline** event labels (`ActiveMedication.timeline[].label`)
- **Repurchase** `orderLabel` from server
- **Branding** `tenantName`, `tagline` (tenant-configured; may be localized server-side later via `tenant_string_translations`)
- **Health records** user-entered `title`, `summary`, `providerName`, `notes`
- **Family member** `fullName`, `notes`
- **Staff notes** on reservations (`staffNotes`)
- **API error messages** from `getApiErrorMessage()` when server returns Vietnamese text
- **OTP success message** when server returns `res.message` (falls back to `auth.otpSent`)

## Prior P10b coverage (unchanged)

Nav, home, profile (partial), reminders panels, notifications header, orders tabs, `BackToHomeButton`, `ApiHealthBanner`, `useCustomerLabels` enum keys.

## Verify

```powershell
cd client\customer-app
npm run dev
```

Profile → Language → English; walk through login, orders, reservations, health wallet, chat, AI, family, loyalty, receivables, addresses.
