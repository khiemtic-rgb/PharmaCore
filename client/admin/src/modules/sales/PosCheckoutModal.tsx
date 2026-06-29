import { useEffect, useMemo, useState } from 'react';

import { Alert, Button, Form, InputNumber, Modal, Select, Space, Switch, Tag, Tooltip, Typography, message } from 'antd';

import { MinusCircleOutlined, PlusOutlined, UserAddOutlined } from '@ant-design/icons';

import type {
  CustomerListItem,
  PosCheckoutConfirm,
  PosCheckoutPaymentLine,
  PosCustomerLoyalty,
  PosCustomerVoucher,
} from '@/shared/api/sales.types';

import { SALES_PAYMENT_METHOD_LABELS } from '@/shared/api/sales.types';

import { apiErrorMessage } from '@/shared/api/api-error';

import {

  formatDisplayMoney,

  moneyInputNumberPropsAllowZeroSuffix,

  moneyInputNumberStyle,

} from '@/shared/utils/money';

import { PosSummaryRow } from '@/modules/sales/pos-summary-ui';



const PAYMENT_METHOD_CASH = 1;
const PAYMENT_METHOD_CREDIT = 5;



type Props = {

  open: boolean;

  loading?: boolean;

  totalAmount: number;

  subtotalGross: number;

  lineDiscountTotal: number;

  orderDiscountAmount: number;

  customerId?: string;

  customers?: CustomerListItem[];

  onCustomerChange?: (customerId: string | undefined) => void;

  onQuickAddCustomer?: () => void;

  customerAllowCredit?: boolean;

  customerCreditLimit?: number | null;

  customerCurrentOutstanding?: number;

  customerLoyalty?: PosCustomerLoyalty | null;

  customerVouchers?: PosCustomerVoucher[] | null;

  onCancel: () => void;

  onConfirm: (result: PosCheckoutConfirm) => void | Promise<void>;

};



const moneyFieldProps = {

  ...moneyInputNumberPropsAllowZeroSuffix,

  style: { ...moneyInputNumberStyle, width: 200 },

} as const;



const paymentMethodOptions = Object.entries(SALES_PAYMENT_METHOD_LABELS).map(([value, label]) => ({

  value: Number(value),

  label,

}));



function defaultPayments(total: number): PosCheckoutPaymentLine[] {

  return [{ paymentMethod: PAYMENT_METHOD_CASH, amount: total }];

}



function sumCashPayments(rows: PosCheckoutPaymentLine[]): number {

  return rows

    .filter((row) => Number(row.paymentMethod) !== PAYMENT_METHOD_CREDIT)

    .reduce((sum, row) => sum + Number(row?.amount ?? 0), 0);

}



function sumCreditPaymentRows(rows: PosCheckoutPaymentLine[]): number {

  return rows

    .filter((row) => Number(row.paymentMethod) === PAYMENT_METHOD_CREDIT)

    .reduce((sum, row) => sum + Number(row?.amount ?? 0), 0);

}



function isSingleCashPayment(rows: PosCheckoutPaymentLine[]): boolean {

  return rows.length === 1 && Number(rows[0]?.paymentMethod) === PAYMENT_METHOD_CASH;

}



function amountFieldLabel(autoSplit: boolean): string {

  return autoSplit ? 'Tiền khách đưa (tự chia)' : 'Tiền khách đưa';

}



function rebalanceFirstRow(rows: PosCheckoutPaymentLine[], totalAmount: number): PosCheckoutPaymentLine[] {

  if (rows.length < 2) return rows;

  const rest = rows.slice(1).reduce((sum, row) => sum + Number(row.amount ?? 0), 0);

  const firstAmount = Math.max(0, totalAmount - rest);

  return [{ ...rows[0], amount: firstAmount }, ...rows.slice(1)];

}



function computeAppliedPayment(rows: PosCheckoutPaymentLine[], payableTotal: number): number {

  if (rows.length === 0) return 0;

  if (isSingleCashPayment(rows)) {

    return Math.min(Number(rows[0]?.amount ?? 0), payableTotal);

  }

  return Math.min(sumCashPayments(rows), payableTotal);

}



function normalizePaymentsForApi(

  rows: PosCheckoutPaymentLine[],

  payableTotal: number,

): PosCheckoutPaymentLine[] {

  if (rows.length === 0) return [];

  if (isSingleCashPayment(rows)) {

    const applied = computeAppliedPayment(rows, payableTotal);

    if (applied <= 0.009) return [];

    return [{ paymentMethod: PAYMENT_METHOD_CASH, amount: applied }];

  }

  return rows

    .map((row) => ({

      paymentMethod: Number(row.paymentMethod),

      amount: Number(row.amount ?? 0),

    }))

    .filter((row) => row.amount > 0.009 && row.paymentMethod !== PAYMENT_METHOD_CREDIT);

}



function roundMoney(v: number): number {

  return Math.round(v * 100) / 100;

}



function paymentsAreValid(

  rows: PosCheckoutPaymentLine[],

  payableTotal: number,

  options: { customerId?: string; allowCredit: boolean },

): boolean {

  if (payableTotal < 0.01) return true;

  if (rows.length === 0) return false;

  const cashPaid = computeAppliedPayment(rows, payableTotal);

  const creditRows = roundMoney(sumCreditPaymentRows(rows));

  if (cashPaid > payableTotal + 0.009) return false;

  if (creditRows > 0.009) {

    if (Math.abs(cashPaid + creditRows - payableTotal) > 0.01) return false;

    return Boolean(options.customerId && options.allowCredit);

  }

  if (Math.abs(cashPaid - payableTotal) < 0.01) return true;

  if (cashPaid < payableTotal - 0.009) {

    return Boolean(options.customerId && options.allowCredit);

  }

  return false;

}



function formatPoints(value: number): string {

  return Number.isInteger(value) ? value.toLocaleString('vi-VN') : value.toLocaleString('vi-VN', { maximumFractionDigits: 4 });

}



export function PosCheckoutModal({

  open,

  loading,

  totalAmount,

  subtotalGross,

  lineDiscountTotal,

  orderDiscountAmount,

  customerId,

  customers = [],

  onCustomerChange,

  onQuickAddCustomer,

  customerAllowCredit = false,

  customerCreditLimit,

  customerCurrentOutstanding = 0,

  customerLoyalty,

  customerVouchers,

  onCancel,

  onConfirm,

}: Props) {

  const showLoyaltyPanel = Boolean(customerLoyalty?.loyaltyEnabled);

  const [selectedCustomerVoucherId, setSelectedCustomerVoucherId] = useState<string>();

  const selectedVoucher = useMemo(
    () => customerVouchers?.find((v) => v.customerVoucherId === selectedCustomerVoucherId),
    [customerVouchers, selectedCustomerVoucherId],
  );

  const voucherDiscount = selectedVoucher ? roundMoney(selectedVoucher.discountAmount) : 0;

  const orderAfterVoucher = roundMoney(Math.max(0, totalAmount - voucherDiscount));

  const maxRedeemMoney = useMemo(() => {
    if (!customerLoyalty || orderAfterVoucher <= 0) return 0;
    const capByPercent = roundMoney((orderAfterVoucher * customerLoyalty.maxRedeemPercent) / 100);
    return Math.min(customerLoyalty.maxRedeemDiscountAmount, capByPercent, orderAfterVoucher);
  }, [customerLoyalty, orderAfterVoucher]);

  const canOfferRedeem =

    showLoyaltyPanel && (customerLoyalty?.pointsBalance ?? 0) > 0 && maxRedeemMoney > 0;



  const loyaltyPointsValue =

    customerLoyalty && customerLoyalty.pointsBalance > 0

      ? customerLoyalty.pointsBalance * customerLoyalty.amountPerPoint

      : 0;



  const [redeemEnabled, setRedeemEnabled] = useState(false);

  const [redeemDiscountAmount, setRedeemDiscountAmount] = useState(0);



  const loyaltyDiscount =

    redeemEnabled && canOfferRedeem ? roundMoney(Math.max(0, redeemDiscountAmount)) : 0;

  const payableTotal = roundMoney(Math.max(0, orderAfterVoucher - loyaltyDiscount));

  const redeemPointsUsed =

    loyaltyDiscount > 0 && customerLoyalty && customerLoyalty.amountPerPoint > 0

      ? loyaltyDiscount / customerLoyalty.amountPerPoint

      : 0;



  const isFreeOrder = payableTotal < 0.01;

  const [payments, setPayments] = useState<PosCheckoutPaymentLine[]>(() => defaultPayments(payableTotal));

  const [submitting, setSubmitting] = useState(false);

  const [submitError, setSubmitError] = useState<string | null>(null);



  useEffect(() => {

    if (!open) return;

    setSubmitError(null);

    setSubmitting(false);

    setRedeemEnabled(false);

    setRedeemDiscountAmount(0);

    setSelectedCustomerVoucherId(undefined);

  }, [open, totalAmount]);



  useEffect(() => {

    if (!open) return;

    setPayments(isFreeOrder ? [] : defaultPayments(payableTotal));

  }, [isFreeOrder, open, payableTotal]);



  const singleCash = !isFreeOrder && isSingleCashPayment(payments);

  const cashTendered = singleCash ? Number(payments[0]?.amount ?? 0) : 0;

  const changeDue = singleCash && cashTendered > payableTotal + 0.009 ? cashTendered - payableTotal : 0;



  const paidTotal = useMemo(() => {

    if (isFreeOrder) return 0;

    return computeAppliedPayment(payments, payableTotal);

  }, [isFreeOrder, payableTotal, payments]);



  const explicitCredit = useMemo(

    () => roundMoney(sumCreditPaymentRows(payments)),

    [payments],

  );



  const creditAmount = useMemo(() => {

    if (isFreeOrder) return 0;

    const implicitCredit = roundMoney(Math.max(0, payableTotal - paidTotal));

    return explicitCredit > 0.009 ? explicitCredit : implicitCredit;

  }, [explicitCredit, isFreeOrder, paidTotal, payableTotal]);



  const selectedCustomer = useMemo(

    () => customers.find((c) => c.id === customerId),

    [customers, customerId],

  );



  const paymentOk = useMemo(() => {

    if (isFreeOrder) return true;

    if (creditAmount > 0.009) {

      if (!customerId) return false;

      if (!customerAllowCredit) return false;

      if (customerCreditLimit != null && customerCreditLimit > 0) {

        if (customerCurrentOutstanding + creditAmount > customerCreditLimit + 0.009) return false;

      }

    }

    return paymentsAreValid(payments, payableTotal, {

      customerId,

      allowCredit: customerAllowCredit,

    });

  }, [

    creditAmount,

    customerAllowCredit,

    customerCreditLimit,

    customerCurrentOutstanding,

    customerId,

    isFreeOrder,

    payableTotal,

    payments,

  ]);



  const busy = submitting || loading;



  const handleRedeemToggle = (checked: boolean) => {

    setSubmitError(null);

    setRedeemEnabled(checked);

    if (checked && canOfferRedeem) {

      setRedeemDiscountAmount(maxRedeemMoney);

    } else {

      setRedeemDiscountAmount(0);

    }

  };



  const handleRedeemAmountChange = (value: number | null) => {

    setSubmitError(null);

    const next = Math.max(0, Math.min(Number(value ?? 0), maxRedeemMoney));

    setRedeemDiscountAmount(next);

  };



  const updatePayment = (index: number, patch: Partial<PosCheckoutPaymentLine>) => {

    setSubmitError(null);

    setPayments((prev) => {

      const next = prev.map((row, i) => (i === index ? { ...row, ...patch } : row));

      if (next.length >= 2 && index > 0) {

        return rebalanceFirstRow(next, payableTotal);

      }

      return next;

    });

  };



  const handleAddPayment = () => {

    setSubmitError(null);

    setPayments((prev) => {

      const allocated = singleCash

        ? payableTotal

        : roundMoney(sumCashPayments(prev) + sumCreditPaymentRows(prev));

      const remaining = Math.max(0, payableTotal - allocated);

      if (prev.length === 1 && Math.abs(allocated - payableTotal) < 0.01) {

        return rebalanceFirstRow(

          [{ ...prev[0], amount: 0 }, { paymentMethod: 3, amount: 0 }],

          payableTotal,

        );

      }

      return rebalanceFirstRow([...prev, { paymentMethod: 3, amount: remaining }], payableTotal);

    });

  };



  const handleRemovePayment = (index: number) => {

    setSubmitError(null);

    setPayments((prev) => {

      const next = prev.filter((_, i) => i !== index);

      if (next.length === 0) return defaultPayments(payableTotal);

      if (next.length === 1) return [{ ...next[0], amount: payableTotal }];

      return rebalanceFirstRow(next, payableTotal);

    });

  };



  const handleSubmit = async () => {

    if (busy) return;

    setSubmitError(null);

    setSubmitting(true);



    try {

      if (isFreeOrder) {

        await Promise.resolve(

          onConfirm({

            payments: [],

            ...(selectedCustomerVoucherId ? { customerVoucherId: selectedCustomerVoucherId } : {}),

            ...(loyaltyDiscount > 0 ? { loyaltyDiscountAmount: loyaltyDiscount } : {}),

          }),

        );

        return;

      }



      const rows = payments.length > 0 ? payments : defaultPayments(payableTotal);

      if (!paymentsAreValid(rows, payableTotal, { customerId, allowCredit: customerAllowCredit })) {

        const err = creditAmount > 0.009

          ? 'Kiểm tra khách hàng và số tiền ghi nợ'

          : 'Tổng thanh toán chưa khớp số tiền khách phải trả';

        setSubmitError(err);

        message.warning(err);

        return;

      }



      await Promise.resolve(

        onConfirm({

          payments: normalizePaymentsForApi(rows, payableTotal),

          ...(selectedCustomerVoucherId ? { customerVoucherId: selectedCustomerVoucherId } : {}),

          ...(loyaltyDiscount > 0 ? { loyaltyDiscountAmount: loyaltyDiscount } : {}),

        }),

      );

    } catch (error) {

      const errMsg = apiErrorMessage(error, 'Không ghi được đơn bán');

      setSubmitError(errMsg);

      message.error(errMsg);

    } finally {

      setSubmitting(false);

    }

  };



  const blockReason = useMemo(() => {

    if (isFreeOrder || paymentOk) return null;

    if (creditAmount > 0.009) {

      if (!customerId) return 'Chọn khách hàng để ghi nợ.';

      if (!customerAllowCredit) return 'Khách hàng chưa được phép ghi nợ.';

      if (

        customerCreditLimit != null &&

        customerCreditLimit > 0 &&

        customerCurrentOutstanding + creditAmount > customerCreditLimit + 0.009

      ) {

        return `Vượt hạn mức nợ (${formatDisplayMoney(customerCreditLimit)}). Đang nợ ${formatDisplayMoney(customerCurrentOutstanding)}.`;

      }

    }

    if (singleCash && cashTendered > payableTotal + 0.009) {

      return null;

    }

    if (singleCash && cashTendered < payableTotal - 0.009 && !customerAllowCredit) {

      return `Khách cần trả ${formatDisplayMoney(payableTotal)} hoặc chọn KH được phép ghi nợ.`;

    }

    if (!singleCash && paidTotal > payableTotal + 0.009) {

      return `Tổng thu vượt ${formatDisplayMoney(payableTotal)}.`;

    }

    return `Tổng phân bổ + ghi nợ phải bằng ${formatDisplayMoney(payableTotal)} (hiện thu ${formatDisplayMoney(paidTotal)}).`;

  }, [

    cashTendered,

    creditAmount,

    customerAllowCredit,

    customerCreditLimit,

    customerCurrentOutstanding,

    customerId,

    isFreeOrder,

    paidTotal,

    payableTotal,

    paymentOk,

    singleCash,

  ]);



  const totalDiscountAmount = lineDiscountTotal + orderDiscountAmount;



  return (

    <Modal

      title="Thanh toán"

      open={open}

      onCancel={onCancel}

      footer={[

        <Button key="cancel" onClick={onCancel} disabled={busy}>

          Hủy

        </Button>,

        <Button key="ok" type="primary" loading={busy} onClick={() => void handleSubmit()}>

          Hoàn tất bán

        </Button>,

      ]}

      width={620}

      destroyOnClose

      maskClosable={false}

    >

      <Space direction="vertical" size={8} style={{ width: '100%', marginBottom: 16 }}>

        <PosSummaryRow label="Tổng tiền hàng" value={formatDisplayMoney(subtotalGross)} />

        {lineDiscountTotal > 0 && (

          <PosSummaryRow

            label="Chiết khấu sản phẩm"

            value={`−${formatDisplayMoney(lineDiscountTotal)}`}

            danger

          />

        )}

        {orderDiscountAmount > 0 && (

          <PosSummaryRow

            label="Chiết khấu đơn hàng"

            value={`−${formatDisplayMoney(orderDiscountAmount)}`}

            danger

          />

        )}

        {totalDiscountAmount > 0 && (

          <PosSummaryRow

            label="Tổng chiết khấu"

            value={`−${formatDisplayMoney(totalDiscountAmount)}`}

            danger

          />

        )}

        {voucherDiscount > 0 && (

          <PosSummaryRow

            label="Voucher"

            value={`−${formatDisplayMoney(voucherDiscount)}`}

            danger

          />

        )}

        {loyaltyDiscount > 0 && (

          <PosSummaryRow

            label="Tiền trừ tích điểm"

            value={`−${formatDisplayMoney(loyaltyDiscount)}`}

            danger

          />

        )}

        <PosSummaryRow label="Khách phải trả" value={formatDisplayMoney(payableTotal)} strong />

      </Space>



      <div style={{ marginBottom: 16 }}>

        <Typography.Text strong>Khách hàng</Typography.Text>

        <Space.Compact block style={{ width: '100%', marginTop: 8 }}>

          <Select

            allowClear

            showSearch

            optionFilterProp="label"

            placeholder="Chọn khách (bắt buộc khi ghi nợ)"

            style={{ width: onQuickAddCustomer ? 'calc(100% - 32px)' : '100%' }}

            value={customerId}

            disabled={busy || !onCustomerChange}

            options={customers.map((c) => ({

              value: c.id,

              label: `${c.customerCode} — ${c.fullName}${c.phone ? ` · ${c.phone}` : ''}`,

            }))}

            onChange={(value) => onCustomerChange?.(value)}

          />

          {onQuickAddCustomer ? (

            <Tooltip title="Thêm khách nhanh">

              <Button icon={<UserAddOutlined />} disabled={busy} onClick={onQuickAddCustomer} />

            </Tooltip>

          ) : null}

        </Space.Compact>

        {selectedCustomer ? (

          <Space size={[8, 4]} wrap style={{ marginTop: 8 }}>

            <Typography.Text type="secondary">

              {selectedCustomer.customerCode} · {selectedCustomer.fullName}

              {selectedCustomer.phone ? ` · ${selectedCustomer.phone}` : ''}

            </Typography.Text>

            {selectedCustomer.allowCredit ? (

              <Tag color="gold">Được ghi nợ</Tag>

            ) : (

              <Tag>Không ghi nợ</Tag>

            )}

            {(selectedCustomer.currentOutstanding ?? 0) > 0.009 ? (

              <Tag color="orange">

                Đang nợ {formatDisplayMoney(selectedCustomer.currentOutstanding)}

              </Tag>

            ) : null}

          </Space>

        ) : creditAmount > 0.009 ? (

          <Alert

            type="warning"

            showIcon

            style={{ marginTop: 8 }}

            message="Chọn khách hàng để ghi nợ — có thể chọn ngay tại đây, không cần quay lại màn POS."

          />

        ) : null}

      </div>



      {(customerVouchers?.length ?? 0) > 0 ? (

        <div style={{ marginBottom: 16 }}>

          <Typography.Text strong>Voucher khách</Typography.Text>

          <Select

            allowClear

            placeholder="Chọn voucher (tuỳ chọn)"

            style={{ width: '100%', marginTop: 8 }}

            value={selectedCustomerVoucherId}

            options={customerVouchers!.map((v) => ({

              value: v.customerVoucherId,

              label: `${v.voucherCode} · −${formatDisplayMoney(v.discountAmount)} (${v.voucherName})`,

            }))}

            onChange={(value) => {

              setSubmitError(null);

              setSelectedCustomerVoucherId(value);

              setRedeemEnabled(false);

              setRedeemDiscountAmount(0);

            }}

          />

        </div>

      ) : null}



      {showLoyaltyPanel && customerLoyalty ? (

        <Alert

          type="info"

          showIcon

          style={{ marginBottom: 16 }}

          message={

            customerLoyalty.pointsBalance > 0

              ? `Khách có ${formatPoints(customerLoyalty.pointsBalance)} điểm (= ${formatDisplayMoney(loyaltyPointsValue)}) · 1 điểm = ${formatDisplayMoney(customerLoyalty.amountPerPoint)}`

              : `Khách chưa có điểm tích lũy · 1 điểm = ${formatDisplayMoney(customerLoyalty.amountPerPoint)}`

          }

          description={

            <Space direction="vertical" size={12} style={{ width: '100%', marginTop: 4 }}>

              <Typography.Text type="secondary">

                {customerLoyalty.maxRedeemPercent < 100

                  ? `Trừ tối đa ${customerLoyalty.maxRedeemPercent}% đơn — giảm tối đa ${formatDisplayMoney(maxRedeemMoney)} trên đơn này`

                  : maxRedeemMoney > 0

                    ? `Có thể giảm tối đa ${formatDisplayMoney(maxRedeemMoney)} bằng điểm trên đơn này`

                    : 'Không thể đổi điểm trên đơn này'}

              </Typography.Text>



              {canOfferRedeem ? (

                <>

                  <Space align="center">

                    <Typography.Text>Trừ điểm ngay cho đơn này</Typography.Text>

                    <Switch

                      checked={redeemEnabled}

                      disabled={busy}

                      checkedChildren="Có"

                      unCheckedChildren="Không"

                      onChange={handleRedeemToggle}

                    />

                  </Space>



                  {redeemEnabled ? (

                    <Space wrap align="start">

                      <Form.Item label="Tiền trừ tích điểm" style={{ marginBottom: 0 }}>

                        <InputNumber

                          {...moneyInputNumberPropsAllowZeroSuffix}

                          min={0}

                          max={maxRedeemMoney}

                          value={redeemDiscountAmount}

                          disabled={busy}

                          onChange={handleRedeemAmountChange}

                          style={{ ...moneyInputNumberStyle, width: 180 }}

                        />

                      </Form.Item>

                      <Form.Item label="Số tiền còn lại" style={{ marginBottom: 0 }}>

                        <InputNumber

                          {...moneyInputNumberPropsAllowZeroSuffix}

                          value={payableTotal}

                          disabled

                          style={{ ...moneyInputNumberStyle, width: 180 }}

                        />

                      </Form.Item>

                    </Space>

                  ) : null}



                  {redeemEnabled && loyaltyDiscount > 0 ? (

                    <Typography.Text type="secondary">

                      Quy đổi ≈ {formatPoints(redeemPointsUsed)} điểm

                    </Typography.Text>

                  ) : null}

                </>

              ) : customerLoyalty.pointsBalance <= 0 ? (

                <Typography.Text type="secondary">

                  Mua {formatDisplayMoney(customerLoyalty.pointsPerAmount)} được +1 điểm.

                </Typography.Text>

              ) : null}

            </Space>

          }

        />

      ) : null}



      {submitError && (

        <Alert type="error" showIcon message={submitError} style={{ marginBottom: 16 }} closable onClose={() => setSubmitError(null)} />

      )}



      {isFreeOrder ? (

        <Alert

          type="success"

          showIcon

          message="Đơn 0 đ — không cần nhập thanh toán. Bấm Hoàn tất bán để ghi đơn."

        />

      ) : (

        <>

          {payments.length >= 2 && (

            <Alert

              type="info"

              showIcon

              style={{ marginBottom: 12 }}

              message="Chia nhiều hình thức: nhập số tiền các dòng sau — dòng đầu tự nhận phần còn lại."

            />

          )}



          <Form layout="vertical" requiredMark={false}>

            {payments.map((row, index) => {

              const autoSplit = index === 0 && payments.length > 1;

              return (

                <Space key={index} align="start" wrap style={{ marginBottom: 8, width: '100%' }}>

                  <Form.Item label="Hình thức" required style={{ marginBottom: 0 }}>

                    <Select

                      style={{ width: 160 }}

                      value={row.paymentMethod}

                      options={paymentMethodOptions}

                      disabled={busy}

                      onChange={(value) => updatePayment(index, { paymentMethod: value })}

                    />

                  </Form.Item>

                  <Form.Item label={amountFieldLabel(autoSplit)} style={{ marginBottom: 0 }}>

                    <InputNumber

                      {...moneyFieldProps}

                      value={row.amount}

                      disabled={busy || autoSplit}

                      onChange={(value) => updatePayment(index, { amount: Number(value ?? 0) })}

                    />

                  </Form.Item>

                  {payments.length > 1 && (

                    <Button

                      type="text"

                      danger

                      icon={<MinusCircleOutlined />}

                      disabled={busy}

                      onClick={() => handleRemovePayment(index)}

                      style={{ marginTop: 30 }}

                    />

                  )}

                </Space>

              );

            })}

          </Form>



          <Button type="dashed" block icon={<PlusOutlined />} onClick={handleAddPayment} disabled={busy}>

            Thêm hình thức thanh toán

          </Button>



          <div style={{ marginTop: 16 }}>

            <Typography.Text>

              Đã thu:{' '}

              <Typography.Text type={paymentOk ? 'success' : 'danger'} strong>

                {formatDisplayMoney(paidTotal)}

              </Typography.Text>

              {creditAmount > 0.009 ? (

                <>

                  {' '}

                  · Ghi nợ:{' '}

                  <Typography.Text strong style={{ color: '#d48806' }}>

                    {formatDisplayMoney(creditAmount)}

                  </Typography.Text>

                </>

              ) : null}

              <Typography.Text type="secondary"> / {formatDisplayMoney(payableTotal)}</Typography.Text>

            </Typography.Text>

            {changeDue > 0 && (

              <Typography.Paragraph style={{ marginTop: 8, marginBottom: 0 }}>

                Tiền thừa trả khách:{' '}

                <Typography.Text strong style={{ color: '#1677ff' }}>

                  {formatDisplayMoney(changeDue)}

                </Typography.Text>

              </Typography.Paragraph>

            )}

            {blockReason && (

              <Typography.Paragraph type="danger" style={{ marginTop: 8, marginBottom: 0 }}>

                {blockReason}

              </Typography.Paragraph>

            )}

          </div>

        </>

      )}

    </Modal>

  );

}


