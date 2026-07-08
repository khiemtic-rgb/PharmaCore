import type { ProcurementVatTreatment } from '@/shared/api/procurement.types';

export function defaultVatTreatmentId(treatments: ProcurementVatTreatment[]): string | undefined {
  return (
    treatments.find((t) => t.treatmentCode === 'vat_8')?.id ??
    treatments.find((t) => !t.isNotSubject && t.ratePercent > 0)?.id ??
    treatments[0]?.id
  );
}
