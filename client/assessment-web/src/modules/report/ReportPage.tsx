import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button, Spin, Typography, message } from 'antd';
import { fetchReport, type FullReport } from '@/shared/api/assessment.api';
import {
  annotateInsightText,
  CategoryScoreTable,
  OverallScoreHero,
} from '@/shared/score/score-display';

const { Title, Paragraph, Text } = Typography;

export function ReportPage() {
  const { id = '' } = useParams();
  const [report, setReport] = useState<FullReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchReport(id);
        if (!cancelled) setReport(data);
      } catch {
        message.error('Báo cáo chưa mở khóa hoặc session hết hạn.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="page-shell" style={{ textAlign: 'center', paddingTop: '4rem' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="page-shell">
        <Paragraph>Không tải được báo cáo.</Paragraph>
        <Link to={`/results/${id}/unlock`}>Mở khóa báo cáo</Link>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <Title level={3}>Báo cáo đánh giá</Title>

      <div className="score-card score-card-hero">
        <OverallScoreHero scorePct={report.overallPct} />
      </div>

      <div className="score-card">
        <Text strong style={{ display: 'block', marginBottom: '0.75rem' }}>
          Điểm theo nhóm năng lực
        </Text>
        <CategoryScoreTable items={report.categoryScores} />
      </div>

      {report.insights.length > 0 && (
        <div className="score-card">
          <Title level={5}>Nhận xét</Title>
          {report.insights.map((i) => (
            <Paragraph key={i.title}>
              <Text strong>{i.title}</Text>
              <br />
              {annotateInsightText(i.body)}
            </Paragraph>
          ))}
        </div>
      )}

      {report.recommendations.length > 0 && (
        <div className="score-card">
          <Title level={5}>Đề xuất cải thiện</Title>
          {report.recommendations.map((r) => (
            <Paragraph key={r.title}>
              <Text strong>{annotateInsightText(r.title)}</Text>
              {r.estimateHint && (
                <Text type="secondary"> · {annotateInsightText(r.estimateHint)}</Text>
              )}
              <br />
              {annotateInsightText(r.body)}
            </Paragraph>
          ))}
        </div>
      )}

      {report.pdf.available && report.pdf.downloadUrl && (
        <Button type="primary" href={report.pdf.downloadUrl} target="_blank" rel="noreferrer" block>
          Tải báo cáo (HTML — in ra PDF từ trình duyệt)
        </Button>
      )}

      <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
        <Link to="/thank-you">Hoàn tất</Link>
      </div>
    </div>
  );
}
