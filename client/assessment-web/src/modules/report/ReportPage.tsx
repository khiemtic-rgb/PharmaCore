import { useEffect, useState } from 'react';

import { Link, useParams } from 'react-router-dom';

import { Button, Spin, Typography, message } from 'antd';

import { fetchReport, fetchReportPdf, triggerPdfDownload, type FullReport } from '@/shared/api/assessment.api';

import { OverallScoreHero } from '@/shared/score/score-display';

import { ReportIntelligenceSections } from '@/modules/report/ReportIntelligenceSections';



const { Title, Paragraph } = Typography;



export function ReportPage() {

  const { id = '' } = useParams();

  const [report, setReport] = useState<FullReport | null>(null);

  const [loading, setLoading] = useState(true);

  const [downloadingPdf, setDownloadingPdf] = useState(false);



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

  async function handleDownloadPdf() {
    if (!report?.pdf.available) return;

    setDownloadingPdf(true);
    try {
      const blob = await fetchReportPdf(id);
      triggerPdfDownload(blob, `kap-bao-cao-${id}.pdf`);
      message.success('Đã tải báo cáo PDF.');
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Không tải được PDF. Vui lòng thử lại hoặc kiểm tra kết nối mạng.';
      message.error(msg);
    } finally {
      setDownloadingPdf(false);
    }
  }

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

    <div className="page-shell page-shell-report">

      <Title level={3}>Báo cáo tư vấn chuyển đổi số</Title>

      <Paragraph type="secondary">

        Phân tích AI · {report.templateCode} · dữ liệu khảo sát của bạn

      </Paragraph>



      <div className="score-card score-card-hero">

        <OverallScoreHero scorePct={report.overallPct} />

      </div>



      {report.intelligence ? (

        <ReportIntelligenceSections report={report} intelligence={report.intelligence} />

      ) : (

        <div className="score-card">

          <Paragraph>

            Báo cáo chi tiết đang được xử lý. Vui lòng tải PDF hoặc tải lại trang sau vài giây.

          </Paragraph>

        </div>

      )}



      {report.pdf.available && (

        <Button
          type="primary"
          block
          size="large"
          loading={downloadingPdf}
          onClick={() => void handleDownloadPdf()}
        >

          {downloadingPdf ? 'Đang tạo báo cáo PDF…' : 'Tải báo cáo PDF (đầy đủ)'}

        </Button>

      )}



      <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>

        <Link to="/thank-you">Hoàn tất</Link>

      </div>

    </div>

  );

}


