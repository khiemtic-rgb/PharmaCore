import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Spin,
  Tabs,
  Tag,
  Typography,
  Upload,
  message,
} from 'antd';
import { PlusOutlined, UploadOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import {
  createCareReminder,
  createHealthRecord,
  deleteHealthRecord,
  fetchCareReminders,
  fetchFamilyMembers,
  fetchHealthRecords,
  getApiErrorMessage,
  markCareReminderDone,
  uploadHealthRecordAttachment,
} from '@/shared/api/customer-app.api';
import {
  HEALTH_RECORD_TYPE_LABELS,
  VITAL_RECORD_TYPES,
  type CareReminder,
  type FamilyMember,
  type HealthRecord,
  type HealthRecordAttachment,
} from '@/shared/api/customer-app.types';
import { BackToHomeButton } from '@/shared/components/BackToHomeButton';
import i18n from '@/shared/i18n';
import { useCustomerLabels } from '@/shared/i18n/useCustomerLabels';
import { withCustomerUploadAuth } from '@/shared/utils/upload-url';

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

async function filesToAttachments(files: UploadFile[]): Promise<HealthRecordAttachment[]> {
  const attachments: HealthRecordAttachment[] = [];
  for (const file of files) {
    const raw = file.originFileObj;
    if (!raw) continue;
    if (raw.size > MAX_ATTACHMENT_BYTES) {
      throw new Error(i18n.t('health.fileTooLarge', { name: raw.name }));
    }
    const uploaded = await uploadHealthRecordAttachment(raw);
    attachments.push({
      fileName: uploaded.fileName,
      mimeType: uploaded.mimeType,
      url: uploaded.url,
    });
  }
  return attachments;
}

function formatVitalSummary(record: HealthRecord): string | null {
  if (record.summary) return record.summary;
  try {
    const meta = JSON.parse(record.metadataJson || '{}') as Record<string, unknown>;
    if (record.recordType === 'bmi' && meta.bmi != null) {
      return `BMI ${meta.bmi}${meta.weightKg != null ? ` · ${meta.weightKg}kg` : ''}${meta.heightCm != null ? ` · ${meta.heightCm}cm` : ''}`;
    }
    if (record.recordType === 'blood_pressure' && meta.systolic != null && meta.diastolic != null) {
      return `${meta.systolic}/${meta.diastolic} mmHg`;
    }
    if (record.recordType === 'blood_glucose' && meta.value != null) {
      return `${meta.value} ${meta.unit ?? 'mmol/L'}`;
    }
  } catch {
    return null;
  }
  return null;
}

export function HealthWalletPage() {
  const { t } = useTranslation();
  const { healthRecordType } = useCustomerLabels();
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [careReminders, setCareReminders] = useState<CareReminder[]>([]);
  const [family, setFamily] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [recordModal, setRecordModal] = useState(false);
  const [vitalsModal, setVitalsModal] = useState(false);
  const [careModal, setCareModal] = useState(false);
  const [recordFiles, setRecordFiles] = useState<UploadFile[]>([]);
  const [recordForm] = Form.useForm();
  const [vitalsForm] = Form.useForm();
  const [careForm] = Form.useForm();

  const recordOptions = useMemo(
    () =>
      Object.keys(HEALTH_RECORD_TYPE_LABELS)
        .filter((value) => !VITAL_RECORD_TYPES.includes(value as (typeof VITAL_RECORD_TYPES)[number]))
        .map((value) => ({ value, label: healthRecordType(value) })),
    [healthRecordType],
  );

  const vitalOptions = useMemo(
    () =>
      VITAL_RECORD_TYPES.map((value) => ({
        value,
        label: healthRecordType(value),
      })),
    [healthRecordType],
  );

  const vitalsRecords = useMemo(
    () => records.filter((r) => VITAL_RECORD_TYPES.includes(r.recordType as (typeof VITAL_RECORD_TYPES)[number])),
    [records],
  );

  const documentRecords = useMemo(
    () => records.filter((r) => !VITAL_RECORD_TYPES.includes(r.recordType as (typeof VITAL_RECORD_TYPES)[number])),
    [records],
  );

  const familyName = (id: string | null) => {
    if (!id) return t('health.self');
    return family.find((f) => f.id === id)?.fullName ?? t('health.familyMember');
  };

  const recordTitle = (id: string | null) => {
    if (!id) return null;
    return records.find((r) => r.id === id)?.title ?? null;
  };

  const openCareFromRecord = (record: HealthRecord) => {
    careForm.setFieldsValue({
      familyMemberId: record.familyMemberId ?? undefined,
      healthRecordId: record.id,
      title: t('health.followUpTitle', { title: record.title }),
      remindAt: dayjs().add(7, 'day'),
      note: record.providerName ? t('health.facilityNote', { name: record.providerName }) : undefined,
    });
    setCareModal(true);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [recordsResult, careResult, familyResult] = await Promise.allSettled([
        fetchHealthRecords(),
        fetchCareReminders(true),
        fetchFamilyMembers(),
      ]);

      if (recordsResult.status === 'fulfilled') {
        setRecords(recordsResult.value);
      } else {
        message.error(getApiErrorMessage(recordsResult.reason, t('health.loadRecordsFailed')));
      }

      if (careResult.status === 'fulfilled') {
        setCareReminders(careResult.value.filter((c) => !c.isDone));
      } else {
        message.error(getApiErrorMessage(careResult.reason, t('health.loadCareFailed')));
      }

      if (familyResult.status === 'fulfilled') {
        setFamily(familyResult.value.filter((f) => f.status === 1));
      }
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const familyOptions = useMemo(
    () => [
      { value: undefined, label: t('health.self') },
      ...family.map((f) => ({ value: f.id, label: f.fullName })),
    ],
    [family, t],
  );

  const onCreateRecord = async () => {
    const values = await recordForm.validateFields();
    try {
      const attachments = await filesToAttachments(recordFiles);
      await createHealthRecord({
        familyMemberId: values.familyMemberId,
        recordType: values.recordType,
        title: values.title,
        summary: values.summary,
        providerName: values.providerName,
        recordedAt: (values.recordedAt as dayjs.Dayjs).toISOString(),
        attachmentsJson: JSON.stringify(attachments),
      });
      message.success(t('health.recordAdded'));
      setRecordModal(false);
      setRecordFiles([]);
      recordForm.resetFields();
      await load();
    } catch (error) {
      message.error(error instanceof Error ? error.message : getApiErrorMessage(error, t('health.saveRecordFailed')));
    }
  };

  const onCreateVital = async () => {
    const values = await vitalsForm.validateFields();
    const recordedAt = (values.recordedAt as dayjs.Dayjs).toISOString();
    let title = '';
    let summary = '';
    let metadata: Record<string, unknown> = {};

    if (values.recordType === 'bmi') {
      const heightCm = Number(values.heightCm);
      const weightKg = Number(values.weightKg);
      const heightM = heightCm / 100;
      const bmi = heightM > 0 ? Math.round((weightKg / (heightM * heightM)) * 10) / 10 : 0;
      title = `BMI ${bmi}`;
      summary = `${weightKg} kg · ${heightCm} cm`;
      metadata = { weightKg, heightCm, bmi };
    } else if (values.recordType === 'blood_pressure') {
      const systolic = Number(values.systolic);
      const diastolic = Number(values.diastolic);
      title = `HA ${systolic}/${diastolic}`;
      summary = `${systolic}/${diastolic} mmHg`;
      metadata = { systolic, diastolic, unit: 'mmHg' };
    } else {
      const value = Number(values.glucoseValue);
      const unit = values.glucoseUnit ?? 'mmol/L';
      title = `${healthRecordType('blood_glucose')} ${value}`;
      summary = `${value} ${unit}`;
      metadata = { value, unit };
    }

    try {
      await createHealthRecord({
        familyMemberId: values.familyMemberId,
        recordType: values.recordType,
        title,
        summary,
        recordedAt,
        metadataJson: JSON.stringify(metadata),
      });
      message.success(t('health.vitalSaved'));
      setVitalsModal(false);
      vitalsForm.resetFields();
      await load();
    } catch (error) {
      message.error(getApiErrorMessage(error, t('health.saveVitalFailed')));
    }
  };

  const onCreateCare = async () => {
    const values = await careForm.validateFields();
    try {
      await createCareReminder({
        familyMemberId: values.familyMemberId,
        healthRecordId: values.healthRecordId,
        reminderType: 'visit',
        title: values.title,
        note: values.note,
        remindAt: (values.remindAt as dayjs.Dayjs).toISOString(),
      });
      message.success(t('health.careAdded'));
      setCareModal(false);
      careForm.resetFields();
      await load();
    } catch (error) {
      message.error(getApiErrorMessage(error, t('health.saveCareFailed')));
    }
  };

  const onDeleteRecord = async (id: string) => {
    try {
      await deleteHealthRecord(id);
      setRecords((prev) => prev.filter((r) => r.id !== id));
      message.success(t('health.recordDeleted'));
    } catch (error) {
      message.error(getApiErrorMessage(error, t('health.deleteFailed')));
    }
  };

  const onDoneCare = async (item: CareReminder) => {
    try {
      await markCareReminderDone(item);
      setCareReminders((prev) => prev.filter((r) => r.id !== item.id));
      message.success(t('health.careDone'));
    } catch (error) {
      message.error(getApiErrorMessage(error, t('health.updateFailed')));
    }
  };

  const renderRecordCard = (item: HealthRecord) => (
    <div key={item.id} style={{ borderBottom: '1px solid #e2e8f0', padding: '12px 0' }}>
      <Space wrap style={{ marginBottom: 4 }}>
        <Tag>{healthRecordType(item.recordType)}</Tag>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {familyName(item.familyMemberId)}
        </Typography.Text>
      </Space>
      <Typography.Text strong>{item.title}</Typography.Text>
      <div>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {dayjs(item.recordedAt).format('DD/MM/YYYY')}
          {item.providerName ? ` · ${item.providerName}` : ''}
        </Typography.Text>
      </div>
      {formatVitalSummary(item) ? (
        <Typography.Paragraph style={{ marginBottom: 8 }}>{formatVitalSummary(item)}</Typography.Paragraph>
      ) : item.summary ? (
        <Typography.Paragraph style={{ marginBottom: 8 }}>{item.summary}</Typography.Paragraph>
      ) : null}
      {item.attachments.length > 0 ? (
        <Space direction="vertical" size={2} style={{ marginBottom: 8 }}>
          {item.attachments.map((att, index) => {
            const href = att.url ? withCustomerUploadAuth(att.url) : att.dataUrl;
            return href ? (
              <a key={`${item.id}-att-${index}`} href={href} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13 }}>
                📎 {att.fileName}
              </a>
            ) : (
              <Typography.Text key={`${item.id}-att-${index}`} type="secondary" style={{ fontSize: 12 }}>
                {att.fileName}
              </Typography.Text>
            );
          })}
        </Space>
      ) : null}
      <Space wrap>
        {!VITAL_RECORD_TYPES.includes(item.recordType as (typeof VITAL_RECORD_TYPES)[number]) ? (
          <Button size="small" onClick={() => openCareFromRecord(item)}>
            {t('health.followUpBtn')}
          </Button>
        ) : null}
        <Button size="small" danger onClick={() => void onDeleteRecord(item.id)}>
          {t('common.delete')}
        </Button>
      </Space>
    </div>
  );

  const vitalType = Form.useWatch('recordType', vitalsForm) ?? 'bmi';

  return (
    <div>
      <BackToHomeButton />
      <Typography.Title level={5} style={{ marginBottom: 12 }}>
        {t('health.title')}
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ fontSize: 13, marginTop: -8, marginBottom: 12 }}>
        {t('health.intro')}
      </Typography.Paragraph>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin />
        </div>
      ) : (
        <Tabs
          items={[
            {
              key: 'vitals',
              label: t('health.tabVitals'),
              children: (
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => setVitalsModal(true)}>
                    {t('health.addVital')}
                  </Button>
                  {vitalsRecords.length === 0 ? (
                    <Typography.Text type="secondary">{t('health.emptyVitals')}</Typography.Text>
                  ) : (
                    vitalsRecords.map(renderRecordCard)
                  )}
                </Space>
              ),
            },
            {
              key: 'records',
              label: t('health.tabRecords'),
              children: (
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => setRecordModal(true)}>
                    {t('health.addRecord')}
                  </Button>
                  {documentRecords.length === 0 ? (
                    <Typography.Text type="secondary">{t('health.emptyRecords')}</Typography.Text>
                  ) : (
                    documentRecords.map(renderRecordCard)
                  )}
                </Space>
              ),
            },
            {
              key: 'care',
              label: t('health.tabCare'),
              children: (
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => setCareModal(true)}>
                    {t('health.addCare')}
                  </Button>
                  {careReminders.length === 0 ? (
                    <Typography.Text type="secondary">{t('health.emptyCare')}</Typography.Text>
                  ) : (
                    careReminders.map((item) => (
                      <div key={item.id} style={{ borderBottom: '1px solid #e2e8f0', padding: '12px 0' }}>
                        <Typography.Text strong>{item.title}</Typography.Text>
                        <div>
                          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                            {dayjs(item.remindAt).format('DD/MM/YYYY HH:mm')} · {familyName(item.familyMemberId)}
                          </Typography.Text>
                        </div>
                        {item.note ? <Typography.Paragraph style={{ marginBottom: 8 }}>{item.note}</Typography.Paragraph> : null}
                        {item.healthRecordId && recordTitle(item.healthRecordId) ? (
                          <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 8 }}>
                            {t('health.recordLabel', { title: recordTitle(item.healthRecordId) })}
                          </Typography.Text>
                        ) : null}
                        <Button size="small" onClick={() => void onDoneCare(item)}>
                          {t('health.careDoneBtn')}
                        </Button>
                      </div>
                    ))
                  )}
                </Space>
              ),
            },
          ]}
        />
      )}

      <Modal title={t('health.modalAddRecord')} open={recordModal} onCancel={() => setRecordModal(false)} onOk={() => void onCreateRecord()}>
        <Form form={recordForm} layout="vertical" initialValues={{ recordType: 'prescription', recordedAt: dayjs() }}>
          <Form.Item name="familyMemberId" label={t('health.forWho')}>
            <Select allowClear options={familyOptions} placeholder={t('health.self')} />
          </Form.Item>
          <Form.Item name="recordType" label={t('health.type')} rules={[{ required: true }]}>
            <Select options={recordOptions} />
          </Form.Item>
          <Form.Item name="title" label={t('health.titleLabel')} rules={[{ required: true }]}>
            <Input placeholder={t('health.titlePlaceholder')} />
          </Form.Item>
          <Form.Item name="providerName" label={t('health.provider')}>
            <Input placeholder={t('health.providerPlaceholder')} />
          </Form.Item>
          <Form.Item name="recordedAt" label={t('health.date')} rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="summary" label={t('health.note')}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item label={t('health.attachments')}>
            <Upload
              fileList={recordFiles}
              beforeUpload={() => false}
              onChange={({ fileList }) => setRecordFiles(fileList.slice(-3))}
              maxCount={3}
              accept="image/*,.pdf"
            >
              <Button icon={<UploadOutlined />}>{t('health.chooseFile')}</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>

      <Modal title={t('health.modalAddVital')} open={vitalsModal} onCancel={() => setVitalsModal(false)} onOk={() => void onCreateVital()}>
        <Form
          form={vitalsForm}
          layout="vertical"
          initialValues={{ recordType: 'bmi', recordedAt: dayjs(), glucoseUnit: 'mmol/L' }}
        >
          <Form.Item name="familyMemberId" label={t('health.forWho')}>
            <Select allowClear options={familyOptions} placeholder={t('health.self')} />
          </Form.Item>
          <Form.Item name="recordType" label={t('health.vitalType')} rules={[{ required: true }]}>
            <Select options={vitalOptions} />
          </Form.Item>
          <Form.Item name="recordedAt" label={t('health.measureDate')} rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          {vitalType === 'bmi' ? (
            <>
              <Form.Item name="weightKg" label={t('health.weight')} rules={[{ required: true }]}>
                <InputNumber min={1} max={300} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="heightCm" label={t('health.height')} rules={[{ required: true }]}>
                <InputNumber min={50} max={250} style={{ width: '100%' }} />
              </Form.Item>
            </>
          ) : null}
          {vitalType === 'blood_pressure' ? (
            <>
              <Form.Item name="systolic" label={t('health.systolic')} rules={[{ required: true }]}>
                <InputNumber min={60} max={250} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="diastolic" label={t('health.diastolic')} rules={[{ required: true }]}>
                <InputNumber min={40} max={150} style={{ width: '100%' }} />
              </Form.Item>
            </>
          ) : null}
          {vitalType === 'blood_glucose' ? (
            <>
              <Form.Item name="glucoseValue" label={t('health.glucoseValue')} rules={[{ required: true }]}>
                <InputNumber min={1} max={40} step={0.1} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="glucoseUnit" label={t('health.unit')}>
                <Select
                  options={[
                    { value: 'mmol/L', label: 'mmol/L' },
                    { value: 'mg/dL', label: 'mg/dL' },
                  ]}
                />
              </Form.Item>
            </>
          ) : null}
        </Form>
      </Modal>

      <Modal title={t('health.modalCare')} open={careModal} onCancel={() => setCareModal(false)} onOk={() => void onCreateCare()}>
        <Form form={careForm} layout="vertical" initialValues={{ remindAt: dayjs().add(7, 'day') }}>
          <Form.Item name="familyMemberId" label={t('health.forWho')}>
            <Select allowClear options={familyOptions} placeholder={t('health.self')} />
          </Form.Item>
          <Form.Item name="healthRecordId" label={t('health.linkRecord')}>
            <Select
              allowClear
              placeholder={t('health.linkRecordPlaceholder')}
              options={documentRecords.map((r) => ({ value: r.id, label: r.title }))}
            />
          </Form.Item>
          <Form.Item name="title" label={t('health.titleLabel')} rules={[{ required: true }]}>
            <Input placeholder={t('health.careTitlePlaceholder')} />
          </Form.Item>
          <Form.Item name="remindAt" label={t('health.remindAt')} rules={[{ required: true }]}>
            <DatePicker showTime style={{ width: '100%' }} format="DD/MM/YYYY HH:mm" />
          </Form.Item>
          <Form.Item name="note" label={t('health.note')}>
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
