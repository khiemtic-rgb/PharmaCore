import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Spin, Typography, message } from 'antd';
import {
  completeSubmission,
  fetchTemplate,
  getSubmission,
  groupQuestionsByCategory,
  saveResponses,
  type AssessmentQuestion,
  type AssessmentTemplate,
} from '@/shared/api/assessment.api';
import { annotateInsightText } from '@/shared/score/score-display';
import { visibleQuestions } from '@/shared/survey/survey-logic';

const { Title, Text } = Typography;

function IconArrowLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M19 12H5M12 19l-7-7 7-7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconArrowRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 12h14M12 5l7 7-7 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconChart() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 20V10M10 20V4M16 20v-8M22 20H2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconSave() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M17 21v-8H7v8M7 3v5h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function SurveyPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [template, setTemplate] = useState<AssessmentTemplate | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [catIndex, setCatIndex] = useState(0);
  const [qIndex, setQIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const categories = useMemo(() => (template ? groupQuestionsByCategory(template) : []), [template]);

  const allQuestions = useMemo(() => categories.flatMap((c) => c.questions), [categories]);
  const visibleAllQuestions = useMemo(
    () => visibleQuestions(allQuestions, answers),
    [allQuestions, answers],
  );

  const visibleCategories = useMemo(
    () =>
      categories
        .map((cat) => ({
          ...cat,
          questions: visibleQuestions(cat.questions, answers),
        }))
        .filter((cat) => cat.questions.length > 0),
    [categories, answers],
  );

  const currentCat = visibleCategories[catIndex];
  const currentQuestion: AssessmentQuestion | undefined = currentCat?.questions[qIndex];
  const answeredCount = visibleAllQuestions.filter((q) => answers[q.id]).length;
  const progressPct = visibleAllQuestions.length
    ? Math.round((answeredCount / visibleAllQuestions.length) * 100)
    : 0;

  const categoryAnswered = useMemo(
    () =>
      visibleCategories.map((cat) => ({
        total: cat.questions.length,
        done: cat.questions.filter((q) => answers[q.id]).length,
      })),
    [visibleCategories, answers],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [tpl, sub] = await Promise.all([fetchTemplate(), getSubmission(id)]);
        if (cancelled) return;
        setTemplate(tpl);
        const initial: Record<string, string> = {};
        for (const [qid, resp] of Object.entries(sub.responses)) {
          if (resp.optionId) initial[qid] = resp.optionId;
          else if (resp.textValue) initial[qid] = resp.textValue;
        }
        setAnswers(initial);
        if (sub.status !== 'draft') {
          navigate(`/results/${id}`, { replace: true });
        }
      } catch {
        message.error('Không tải được khảo sát.');
        navigate('/', { replace: true });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  const persistAnswer = useCallback(
    async (questionId: string, patch: { optionId?: string; textValue?: string }) => {
      const stored = patch.optionId ?? patch.textValue ?? '';
      setAnswers((prev) => ({ ...prev, [questionId]: stored }));
      try {
        await saveResponses(id, [{ questionId, ...patch }]);
      } catch {
        message.warning('Lưu câu trả lời thất bại — thử lại.');
      }
    },
    [id],
  );

  const isLastQuestion =
    catIndex === visibleCategories.length - 1 &&
    qIndex === (currentCat?.questions.length ?? 1) - 1;

  async function goNext() {
    if (!currentCat || !currentQuestion) return;
    if (currentQuestion.required && !answers[currentQuestion.id]) {
      message.warning('Vui lòng chọn một đáp án.');
      return;
    }

    if (qIndex < currentCat.questions.length - 1) {
      setQIndex(qIndex + 1);
      return;
    }

    if (catIndex < visibleCategories.length - 1) {
      setCatIndex(catIndex + 1);
      setQIndex(0);
      return;
    }

    setSubmitting(true);
    try {
      const result = await completeSubmission(id);
      navigate(`/results/${id}`, { state: { result } });
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      message.error(msg ?? 'Chưa trả lời đủ câu bắt buộc.');
    } finally {
      setSubmitting(false);
    }
  }

  function goBack() {
    if (qIndex > 0) {
      setQIndex(qIndex - 1);
      return;
    }
    if (catIndex > 0) {
      setCatIndex(catIndex - 1);
      const prevCat = visibleCategories[catIndex - 1];
      setQIndex(prevCat ? prevCat.questions.length - 1 : 0);
    }
  }

  if (loading || !currentQuestion || !currentCat) {
    return (
      <div className="page-shell survey-page" style={{ textAlign: 'center', paddingTop: '4rem' }}>
        <Spin size="large" tip="Đang tải khảo sát..." />
      </div>
    );
  }

  const globalIndex =
    visibleCategories.slice(0, catIndex).reduce((n, c) => n + c.questions.length, 0) + qIndex + 1;

  return (
    <div className="page-shell survey-page">
      <div className="survey-top">
        <button type="button" className="survey-exit" onClick={() => navigate('/')}>
          <IconSave />
          Lưu &amp; thoát
        </button>
        <Text type="secondary" className="survey-top-meta">
          Câu {globalIndex}/{visibleAllQuestions.length}
        </Text>
      </div>

      <div className="survey-progress-wrap">
        <div className="survey-progress-labels">
          <Text type="secondary">Tiến độ hoàn thành</Text>
          <Text strong style={{ color: '#0f766e' }}>
            {progressPct}%
          </Text>
        </div>
        <div className="survey-progress-track">
          <span className="survey-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      <nav className="survey-steps" aria-label="Nhóm câu hỏi">
        {visibleCategories.map((cat, idx) => {
          const stat = categoryAnswered[idx];
          const isActive = idx === catIndex;
          const isDone = stat && stat.done === stat.total;
          return (
            <div
              key={cat.code}
              className={[
                'survey-step',
                isActive ? 'survey-step--active' : '',
                isDone ? 'survey-step--done' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span className="survey-step-num">{isDone ? '✓' : idx + 1}</span>
              <span className="survey-step-name">{cat.name}</span>
            </div>
          );
        })}
      </nav>

      <article className="survey-card">
        <div className="survey-card-meta">
          <span className="survey-badge survey-badge--category">{currentCat.name}</span>
          <span className="survey-badge survey-badge--code">Câu {currentQuestion.code}</span>
          {!currentQuestion.scorable && (
            <span className="survey-badge survey-badge--info">Không tính điểm · Hỗ trợ tư vấn</span>
          )}
        </div>

        <Title level={4} className="survey-question-title">
          {annotateInsightText(currentQuestion.title)}
        </Title>

        <div className="survey-options" role="group" aria-label="Lựa chọn trả lời">
          {currentQuestion.questionType === 'text' || currentQuestion.questionType === 'scale' ? (
            <textarea
              className="survey-text-input"
              rows={4}
              value={answers[currentQuestion.id] ?? ''}
              onChange={(e) => void persistAnswer(currentQuestion.id, { textValue: e.target.value })}
              placeholder={currentQuestion.helpText ?? 'Nhập câu trả lời...'}
            />
          ) : currentQuestion.questionType === 'multi_choice' ? (
            currentQuestion.options.map((opt) => {
              const selected = (answers[currentQuestion.id] ?? '').split(',').filter(Boolean).includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  className={['survey-option', selected ? 'survey-option--selected' : '']
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => {
                    const prev = (answers[currentQuestion.id] ?? '').split(',').filter(Boolean);
                    const next = selected ? prev.filter((id) => id !== opt.id) : [...prev, opt.id];
                    void persistAnswer(currentQuestion.id, { optionId: next[0] });
                    setAnswers((a) => ({ ...a, [currentQuestion.id]: next.join(',') }));
                  }}
                >
                  <span className="survey-option-label">{opt.label}</span>
                </button>
              );
            })
          ) : (
            currentQuestion.options.map((opt) => {
              const selected = answers[currentQuestion.id] === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={['survey-option', selected ? 'survey-option--selected' : '']
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => persistAnswer(currentQuestion.id, { optionId: opt.id })}
                >
                  <span className="survey-option-radio" aria-hidden />
                  <span className="survey-option-label">{opt.label}</span>
                </button>
              );
            })
          )}
        </div>
      </article>

      <footer className="survey-footer">
        <Button
          size="large"
          icon={<IconArrowLeft />}
          disabled={catIndex === 0 && qIndex === 0}
          onClick={goBack}
          className="survey-btn-back"
        >
          Quay lại
        </Button>
        <Button
          type="primary"
          size="large"
          loading={submitting}
          onClick={goNext}
          icon={isLastQuestion ? <IconChart /> : <IconArrowRight />}
          iconPosition="end"
          className="survey-btn-next"
        >
          {isLastQuestion ? 'Xem kết quả' : 'Tiếp theo'}
        </Button>
      </footer>
    </div>
  );
}
