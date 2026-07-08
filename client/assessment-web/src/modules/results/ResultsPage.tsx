import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Button, Spin, Typography, message } from 'antd';
import {
  completeSubmission,
  getSubmission,
  type CompleteResult,
} from '@/shared/api/assessment.api';
import {
  annotateInsightText,
  CategoryScoreTable,
  OverallScoreHero,
} from '@/shared/score/score-display';

const { Title, Paragraph, Text } = Typography;

export function ResultsPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [result, setResult] = useState<CompleteResult | null>(
    (location.state as { result?: CompleteResult } | null)?.result ?? null,
  );
  const [loading, setLoading] = useState(!result);

  useEffect(() => {
    if (result) return;

    let cancelled = false;
    (async () => {
      try {
        const sub = await getSubmission(id);
        if (sub.status === 'lead_captured' || sub.status === 'report_ready') {
          navigate(`/report/${id}`, { replace: true });
          return;
        }
        if (sub.overallScore != null && sub.categoryScores) {
          if (!cancelled) {
            setResult({
              status: sub.status,
              overallScore: sub.overallScore,
              overallPct: sub.overallPct ?? 0,
              categoryScores: sub.categoryScores,
              previewInsights: sub.previewInsights ?? [],
              reportLocked: true,
              leadCaptureRequired: true,
            });
          }
          return;
        }
        const data = await completeSubmission(id);
        if (!cancelled) setResult(data);
      } catch {
        message.error('Không tải được kết quả.');
        navigate('/', { replace: true });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, navigate, result]);

  if (loading || !result) {
    return (
      <div className="page-shell" style={{ textAlign: 'center', paddingTop: '4rem' }}>
        <Spin size="large" tip="Đang tính điểm..." />
      </div>
    );
  }

  return (
    <div className="page-shell">
      <Title level={3}>Kết quả sơ bộ</Title>
      <Paragraph type="secondary" style={{ marginTop: '-0.25rem' }}>
        Điểm được quy đổi về thang 100 để dễ so sánh giữa các nhóm năng lực.
      </Paragraph>

      <div className="score-card score-card-hero">
        <OverallScoreHero scorePct={result.overallPct} />
      </div>

      <div className="score-card">
        <Text strong style={{ display: 'block', marginBottom: '0.75rem' }}>
          Chi tiết theo nhóm
        </Text>
        <CategoryScoreTable items={result.categoryScores} />
      </div>

      {result.previewInsights.map((insight) => (
        <div key={insight.title} className="score-card insight-card">
          <Text strong>💡 {insight.title}</Text>
          <Paragraph style={{ marginBottom: 0, marginTop: '0.35rem' }}>
            {annotateInsightText(insight.body)}
          </Paragraph>
        </div>
      ))}

      <div className="gate-box">
        <Text strong>🔒 Báo cáo đầy đủ + tệp PDF + lộ trình cải thiện</Text>
        <Paragraph style={{ margin: '0.5rem 0 1rem' }}>
          Nhập số điện thoại (SĐT) và email để nhận ngay báo cáo chi tiết dạng PDF (tài liệu tải
          về/in).
        </Paragraph>
        <Button type="primary" block onClick={() => navigate(`/results/${id}/unlock`)}>
          Nhận báo cáo chi tiết
        </Button>
      </div>

      <div style={{ marginTop: '1rem', textAlign: 'center' }}>
        <Link to="/thank-you">Bỏ qua — chỉ xem sơ bộ</Link>
      </div>
    </div>
  );
}
