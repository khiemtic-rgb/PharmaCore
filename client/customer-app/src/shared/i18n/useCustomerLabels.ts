import { useTranslation } from 'react-i18next';
import {
  CONSENT_CHANNEL_LABELS,
  CONSENT_PURPOSE_LABELS,
  CUSTOMER_DRAFT_ORDER_STATUS_LABELS,
  CUSTOMER_PAYMENT_METHOD_LABELS,
  CUSTOMER_PURCHASE_STATUS_LABELS,
  CUSTOMER_RESERVATION_FULFILLMENT_LABELS,
  CUSTOMER_RESERVATION_STATUS_LABELS,
  DAY_LABELS,
  FAMILY_RELATIONSHIP_LABELS,
  HEALTH_RECORD_TYPE_LABELS,
  CARE_REMINDER_TYPE_LABELS,
  LOYALTY_TX_LABELS,
  NOTIFICATION_CATEGORY_LABELS,
} from '@/shared/api/customer-app.types';

export function useCustomerLabels() {
  const { t } = useTranslation();

  const enumLabel = (group: string, key: string | number, fallback?: string) => {
    const path = `enum.${group}.${key}`;
    const translated = t(path);
    return translated === path ? (fallback ?? String(key)) : translated;
  };

  return {
    t,
    enumLabel,
    consentChannel: (n: number) => enumLabel('consentChannel', n, CONSENT_CHANNEL_LABELS[n]),
    consentPurpose: (n: number) => enumLabel('consentPurpose', n, CONSENT_PURPOSE_LABELS[n]),
    draftOrderStatus: (n: number) => enumLabel('draftOrderStatus', n, CUSTOMER_DRAFT_ORDER_STATUS_LABELS[n]),
    purchaseStatus: (n: number) => enumLabel('purchaseStatus', n, CUSTOMER_PURCHASE_STATUS_LABELS[n]),
    paymentMethod: (n: number) => enumLabel('paymentMethod', n, CUSTOMER_PAYMENT_METHOD_LABELS[n]),
    reservationStatus: (n: number) => enumLabel('reservationStatus', n, CUSTOMER_RESERVATION_STATUS_LABELS[n]),
    reservationFulfillment: (n: number) =>
      enumLabel('reservationFulfillment', n, CUSTOMER_RESERVATION_FULFILLMENT_LABELS[n]),
    loyaltyTx: (n: number) => enumLabel('loyaltyTx', n, LOYALTY_TX_LABELS[n]),
    day: (n: number) => enumLabel('day', n, DAY_LABELS[n]),
    familyRelationship: (key: string) => enumLabel('familyRelationship', key, FAMILY_RELATIONSHIP_LABELS[key]),
    healthRecordType: (key: string) => enumLabel('healthRecordType', key, HEALTH_RECORD_TYPE_LABELS[key]),
    careReminderType: (key: string) => enumLabel('careReminderType', key, CARE_REMINDER_TYPE_LABELS[key]),
    notificationCategory: (key: string) =>
      enumLabel('notificationCategory', key, NOTIFICATION_CATEGORY_LABELS[key]),
  };
}
