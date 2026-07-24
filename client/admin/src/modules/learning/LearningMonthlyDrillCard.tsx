import { useEffect, useState } from 'react';
import { Alert, App, Button, Card, Modal, Radio, Space, Typography } from 'antd';
import { ThunderboltOutlined } from '@ant-design/icons';
import { apiErrorMessage } from '@/shared/api/api-error';
import {
  fetchMonthlyDrillStatus,
  startMonthlyDrill,
  submitMonthlyDrill,
  type LearningMonthlyDrillStatus,
} from '@/shared/api/learning.api';
import {
  mapDrillAnswersToOriginal,
  shuffleQuizForPractice,
  type ShuffledQuizQuestion,
} from '@/modules/learning/quiz-shuffle';

/** On nhanh thang — soft, khong khoa POS. */
export function LearningMonthlyDrillCard() {
  const { message } = App.useApp();
  const [status, setStatus] = useState<LearningMonthlyDrillStatus | null>(null);
  const [open, setOpen] = useState(false);
  const [questions, setQuestions] = useState<ShuffledQuizQuestion[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    try {
      setStatus(await fetchMonthlyDrillStatus());
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const onStart = async () => {
    setBusy(true);
    try {
      const started = await startMonthlyDrill();
      const shuffled = shuffleQuizForPractice(started.questions);
      setQuestions(shuffled);
      setAnswers(Array(shuffled.length).fill(-1));
      setOpen(true);
    } catch (e) {
      message.error(apiErrorMessage(e, 'Không mở được ôn tháng'));
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = async () => {
    if (answers.some((a) => a < 0)) {
      message.warning('Hãy trả lời đủ các câu');
      return;
    }
    setBusy(true);
    try {
      const mapped = mapDrillAnswersToOriginal(questions, answers);
      const result = await submitMonthlyDrill(mapped);
      setOpen(false);
      await reload();
      message.success(
        result.alreadyCompleted
          ? 'Tháng này đã ôn rồi'
          : result.passed
            ? `Ôn xong ${result.scorePct}% — tốt!`
            : `Ôn xong ${result.scorePct}% — xem lại bài đã học khi rảnh`,
      );
    } catch (e) {
      message.error(apiErrorMessage(e, 'Không nộp được ôn tháng'));
    } finally {
      setBusy(false);
    }
  };

  if (loading || !status) return null;
  if (!status.eligible && !status.completed) return null;

  return (
    <>
      <Card
        size="small"
        style={{
          borderRadius: 12,
          borderColor: status.completed ? '#b7eb8f' : '#91caff',
          background: status.completed ? '#f6ffed' : '#f0f5ff',
        }}
      >
        <Space align="start" style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space align="start">
            <ThunderboltOutlined
              style={{ color: status.completed ? '#52c41a' : '#1677ff', marginTop: 4 }}
            />
            <div>
              <Typography.Text strong>
                Ôn nhanh tháng {status.periodMonth}/{status.periodYear}
              </Typography.Text>
              <Typography.Paragraph type="secondary" style={{ margin: '4px 0 0', fontSize: 13 }}>
                {status.hint}
              </Typography.Paragraph>
              {status.completed && status.scorePct != null ? (
                <Typography.Text type="success" style={{ fontSize: 13 }}>
                  Đã ôn · {status.scorePct}%
                </Typography.Text>
              ) : null}
            </div>
          </Space>
          {!status.completed && status.eligible ? (
            <Button type="primary" loading={busy} onClick={() => void onStart()}>
              Bắt đầu
            </Button>
          ) : null}
        </Space>
      </Card>

      <Modal
        title={`Ôn nhanh ${status.periodMonth}/${status.periodYear}`}
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        width={560}
        destroyOnClose
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message="Không bắt buộc — không khóa bán hàng. Câu hỏi lấy từ bài bạn đã đạt."
        />
        <Space direction="vertical" style={{ width: '100%' }} size={16}>
          {questions.map((q, qi) => (
            <div key={q.id}>
              <Typography.Text strong>
                Câu {qi + 1}. {q.prompt}
              </Typography.Text>
              <Typography.Text
                type="secondary"
                style={{ display: 'block', fontSize: 12, marginBottom: 4 }}
              >
                {q.moduleTitle} · {q.levelCode}
              </Typography.Text>
              <Radio.Group
                style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                value={answers[qi] >= 0 ? answers[qi] : undefined}
                onChange={(e) => {
                  const next = [...answers];
                  next[qi] = e.target.value as number;
                  setAnswers(next);
                }}
              >
                {q.options.map((opt, oi) => (
                  <Radio key={oi} value={oi} style={{ whiteSpace: 'normal', height: 'auto' }}>
                    {opt}
                  </Radio>
                ))}
              </Radio.Group>
            </div>
          ))}
          <Button type="primary" block size="large" loading={busy} onClick={() => void onSubmit()}>
            Nộp ôn tháng
          </Button>
        </Space>
      </Modal>
    </>
  );
}

export default LearningMonthlyDrillCard;
