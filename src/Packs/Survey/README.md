# Pharmacy Survey Pack

Giải pháp **khảo sát / đánh giá nhà thuốc** trên KIT Platform.

## Cấu trúc

| Thành phần | Path |
|------------|------|
| Pack metadata | `SurveyPackDefinition.cs` |
| Contracts | `AssessmentContracts.cs`, `SurveyCampaignContracts.cs` |
| Runtime | `Infrastructure/Assessment/*` |
| Campaign | `SurveyCampaignRepository.cs` |
| DI | `SurveyPackDependencyInjection.cs` |

## API

| Route | Controller |
|-------|------------|
| `GET/POST /api/survey/campaigns` | `SurveyCampaignsController` |
| `GET/POST /api/public/assessment/*` | `SurveyPublicController` (legacy route) |
| `GET /api/system/assessment/*` | `SurveyAdminController` |

Pack code: `pharmacy_survey` · DB: `pack_survey`
