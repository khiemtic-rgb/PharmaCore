import { Button, Typography } from 'antd';

import type { FullReport, ReportIntelligence } from '@/shared/api/assessment.api';

import { CategoryRadarChart } from '@/shared/charts/CategoryRadarChart';

import { annotateInsightText, CategoryScoreTable } from '@/shared/score/score-display';



const { Title, Paragraph, Text } = Typography;

type Props = {

  report: FullReport;

  intelligence: ReportIntelligence;

};



export function ReportIntelligenceSections({ report, intelligence }: Props) {

  const brief = intelligence.consultingBrief;
  const ai = intelligence.aiNarrative;



  return (

    <>

      {intelligence.executiveSummary && (
        <div className="score-card report-exec">
          <Title level={5}>Tóm tắt điều hành</Title>
          <Paragraph strong>{intelligence.executiveSummary.headline}</Paragraph>
          {intelligence.executiveSummary.openingContext && (
            <Paragraph><Text strong>1.1 Mở vấn đề: </Text>{annotateInsightText(intelligence.executiveSummary.openingContext)}</Paragraph>
          )}
          {intelligence.executiveSummary.analysis && (
            <Paragraph><Text strong>1.2 Phân tích: </Text>{annotateInsightText(intelligence.executiveSummary.analysis)}</Paragraph>
          )}
          {intelligence.executiveSummary.assessment && (
            <Paragraph><Text strong>1.3 Đánh giá: </Text>{annotateInsightText(intelligence.executiveSummary.assessment)}</Paragraph>
          )}
          {intelligence.executiveSummary.conclusion && (
            <Paragraph><Text strong>1.4 Kết luận: </Text>{annotateInsightText(intelligence.executiveSummary.conclusion)}</Paragraph>
          )}
          {intelligence.executiveSummary.recommendations && (
            <Paragraph><Text strong>1.5 Khuyến nghị: </Text>{annotateInsightText(intelligence.executiveSummary.recommendations)}</Paragraph>
          )}
          {!intelligence.executiveSummary.openingContext &&
            intelligence.executiveSummary.paragraphs.map((p) => (
              <Paragraph key={p.slice(0, 40)}>{annotateInsightText(p)}</Paragraph>
            ))}
        </div>
      )}

      {intelligence.executiveDashboard && (
        <div className="score-card">
          <Title level={5}>Bảng điều hành</Title>
          <Paragraph>{annotateInsightText(intelligence.executiveDashboard.aiAssessmentLine)}</Paragraph>
          <div className="benchmark-table">
            <div className="benchmark-row">
              <span>Sẵn sàng CĐS</span>
              <span>{intelligence.executiveDashboard.digitalReadinessPct.toFixed(0)}%</span>
            </div>
            <div className="benchmark-row">
              <span>Phù hợp Novixa</span>
              <span>{intelligence.executiveDashboard.novixaFitPct.toFixed(0)}%</span>
            </div>
          </div>
        </div>
      )}

      {intelligence.crossCategoryInsight && (
        <div className="score-card report-ai-insights">
          <Title level={5}>Suy luận chéo nhóm (AI)</Title>
          <Paragraph strong>{annotateInsightText(intelligence.crossCategoryInsight.headline)}</Paragraph>
          <Paragraph>{annotateInsightText(intelligence.crossCategoryInsight.analysis)}</Paragraph>
          <ul className="ai-insights-list">
            {intelligence.crossCategoryInsight.implications.map((s) => (
              <li key={s.slice(0, 30)}>{annotateInsightText(s)}</li>
            ))}
          </ul>
        </div>
      )}

      {intelligence.transformationReadiness && (
        <div className="score-card">
          <Title level={5}>Điểm chuyển đổi</Title>
          <Paragraph type="secondary">{annotateInsightText(intelligence.transformationReadiness.narrative)}</Paragraph>
          {intelligence.transformationReadiness.bars.map((bar) => (
            <div key={bar.label} className="benchmark-row">
              <span>{bar.label}</span>
              <span>{bar.pct}%</span>
            </div>
          ))}
        </div>
      )}

      {brief && (

        <>

          <div className="score-card report-diagnosis">

            <div className="report-diagnosis-header">

              <Text type="secondary">Chẩn đoán kinh doanh</Text>

              {ai && <span className="ai-narrative-badge">AI phân tích</span>}

            </div>

            <Title level={4} style={{ margin: '0.5rem 0', color: '#b91c1c' }}>

              {brief.diagnosisHeadline}

            </Title>

            <Paragraph>{annotateInsightText(brief.costOfInaction)}</Paragraph>

          </div>



          {ai && ai.personalizedInsights.length > 0 && (

            <div className="score-card report-ai-insights">

              <Title level={5}>Nhận định cá nhân hóa</Title>

              <Paragraph type="secondary">

                Phân tích dựa trên câu trả lời cụ thể của bạn

                {ai.model ? ` · ${ai.model}` : ''}.

              </Paragraph>

              <ul className="ai-insights-list">

                {ai.personalizedInsights.map((insight) => (

                  <li key={insight.slice(0, 48)}>{annotateInsightText(insight)}</li>

                ))}

              </ul>

            </div>

          )}



          <div className="score-card">

            <Title level={5}>Hệ quả nếu không hành động</Title>

            {brief.businessImpacts.map((impact) => (

              <div key={impact.title} className="insight-block insight-impact">

                <Text strong>{impact.title}</Text>

                <Paragraph style={{ margin: '0.35rem 0' }}>

                  {annotateInsightText(impact.impactStatement)}

                </Paragraph>

                <Text type="secondary" className="impact-cost">

                  Ước tính: {impact.costHint}

                </Text>

              </div>

            ))}

          </div>



          <div className="score-card report-novixa-fit">

            <Title level={5}>Novixa phù hợp với bạn</Title>

            <Paragraph type="secondary">

              Ghép phân hệ theo điểm yếu thực tế — không phải gói chung chung.

            </Paragraph>

            {brief.moduleFits.map((mod) => (

              <div key={mod.moduleName} className="module-fit-card">

                <Text strong className="module-fit-name">

                  {mod.moduleName}

                </Text>

                <Paragraph style={{ margin: '0.35rem 0' }}>{annotateInsightText(mod.painResolved)}</Paragraph>

                <Text type="secondary">30 ngày: {mod.outcome30Days}</Text>

                <br />

                <Text type="secondary">90 ngày: {mod.outcome90Days}</Text>

              </div>

            ))}

          </div>



          <div className="score-card report-roi">

            <Title level={5}>Ưu điểm khi triển khai Novixa</Title>

            <Paragraph strong>{annotateInsightText(brief.roiStory.summary)}</Paragraph>

            <div className="roi-columns">

              <div>

                <Text strong>Trước</Text>

                <ul>

                  {brief.roiStory.beforeState.map((s) => (

                    <li key={s.slice(0, 30)}>{annotateInsightText(s)}</li>

                  ))}

                </ul>

              </div>

              <div>

                <Text strong>Sau 90 ngày</Text>

                <ul>

                  {brief.roiStory.afterState.map((s) => (

                    <li key={s.slice(0, 30)}>{annotateInsightText(s)}</li>

                  ))}

                </ul>

              </div>

            </div>

          </div>



          <div className="score-card report-cta">

            <Paragraph>{annotateInsightText(brief.urgencyStatement)}</Paragraph>

            <Paragraph strong>{annotateInsightText(brief.nextStepCta)}</Paragraph>

            <Button type="primary" size="large" block href="https://novixa.vn/vi/lien-he" target="_blank" rel="noreferrer">

              Đặt lịch tư vấn 30 phút

            </Button>

          </div>

        </>

      )}



      {intelligence.opportunities && intelligence.opportunities.length > 0 && (
        <div className="score-card">
          <Title level={5}>Cơ hội cải thiện</Title>
          {intelligence.opportunities.map((opp) => (
            <div key={opp.title} className="insight-block">
              <Text strong>{opp.title}</Text>
              <Paragraph>{annotateInsightText(opp.body)}</Paragraph>
            </div>
          ))}
        </div>
      )}

      {intelligence.novixaReadiness && (
        <div className="score-card">
          <Title level={5}>Mức sẵn sàng triển khai Novixa</Title>
          <Title level={3} style={{ margin: '0.25rem 0', color: '#0d9488' }}>
            {intelligence.novixaReadiness.overallPct.toFixed(0)}%
          </Title>
          <Paragraph type="secondary">{intelligence.novixaReadiness.statusLabel}</Paragraph>
          {intelligence.novixaReadiness.dimensions.map((d) => (
            <Paragraph key={d.code}>
              {d.name}: <Text strong>{d.scorePct.toFixed(0)}%</Text>
            </Paragraph>
          ))}
        </div>
      )}

      {intelligence.roiMetrics && intelligence.roiMetrics.length > 0 && (
        <div className="score-card">
          <Title level={5}>Phân tích lợi ích khi triển khai</Title>
          {intelligence.roiMetrics.map((m) => (
            <Paragraph key={m.label}>
              <Text strong>{m.label}</Text> — {m.range}
              <br />
              <Text type="secondary">{annotateInsightText(m.description)}</Text>
            </Paragraph>
          ))}
        </div>
      )}

      {intelligence.inactionCascade && (
        <div className="score-card report-diagnosis">
          <Title level={5}>Nếu không hành động</Title>
          <Paragraph>{annotateInsightText(intelligence.inactionCascade.summary)}</Paragraph>
          {intelligence.inactionCascade.steps.map((step) => (
            <Paragraph key={`${step.horizon}-${step.outcome.slice(0, 20)}`}>
              <Text strong>{step.horizon}</Text> → {annotateInsightText(step.outcome)}
            </Paragraph>
          ))}
        </div>
      )}

      {intelligence.implementationJourney && (
        <div className="score-card">
          <Title level={5}>Nếu triển khai</Title>
          <Paragraph>{annotateInsightText(intelligence.implementationJourney.summary)}</Paragraph>
          {intelligence.implementationJourney.steps.map((step) => (
            <Paragraph key={`${step.horizon}-${step.outcome.slice(0, 20)}`}>
              <Text strong>{step.horizon}</Text> → {annotateInsightText(step.outcome)}
            </Paragraph>
          ))}
        </div>
      )}

      {intelligence.whyNovixa && intelligence.whyNovixa.rows.length > 0 && (
        <div className="score-card">
          <Title level={5}>Tại sao Novixa?</Title>
          <Paragraph>{annotateInsightText(intelligence.whyNovixa.intro)}</Paragraph>
          {intelligence.whyNovixa.rows.map((row) => (
            <Paragraph key={`${row.problem}-${row.module}`}>
              <Text strong>{row.problem}</Text> → {row.module} → {row.benefit} · KPI: {row.kpiTarget}
            </Paragraph>
          ))}
        </div>
      )}

      {intelligence.gapAnalysis && intelligence.gapAnalysis.items.length > 0 && (
        <div className="score-card">
          <Title level={5}>Phân tích khoảng cách</Title>
          <Paragraph type="secondary">{intelligence.gapAnalysis.narrative}</Paragraph>
          {intelligence.gapAnalysis.items.map((item) => (
            <Paragraph key={`${item.currentState}-${item.targetState}`}>
              <Text strong>{item.currentState}</Text> → {item.targetState} · {item.novixaModule}
            </Paragraph>
          ))}
        </div>
      )}

      {intelligence.moduleRecommendations && intelligence.moduleRecommendations.length > 0 && (
        <div className="score-card">
          <Title level={5}>Đề xuất phân hệ Novixa</Title>
          {intelligence.moduleRecommendations.map((mod) => (
            <Paragraph key={mod.moduleCode}>
              <Text strong>{mod.moduleName}</Text> {'★'.repeat(mod.stars)}
              <br />
              {annotateInsightText(mod.rationale)}
            </Paragraph>
          ))}
        </div>
      )}

      {intelligence.priorityMatrix && (
        <div className="score-card">
          <Title level={5}>Ma trận ưu tiên</Title>
          <MatrixBlock title="Ưu tiên cao" items={intelligence.priorityMatrix.highImpactHighPriority} />
          <MatrixBlock title="Thắng nhanh" items={intelligence.priorityMatrix.quickWins} />
          <MatrixBlock title="Dài hạn" items={intelligence.priorityMatrix.longTerm} />
        </div>
      )}

      {intelligence.transformationRoadmap && (
        <div className="score-card">
          <Title level={5}>Lộ trình chuyển đổi số</Title>
          <Paragraph type="secondary">{intelligence.transformationRoadmap.narrative}</Paragraph>
          {intelligence.transformationRoadmap.phases.map((p) => (
            <Paragraph key={p.phase}>
              <Text strong>Giai đoạn {p.phase}: {p.title}</Text>
              <br />
              {annotateInsightText(p.description)}
            </Paragraph>
          ))}
        </div>
      )}

      {intelligence.actionPlan && intelligence.actionPlan.items.length > 0 && (
        <div className="score-card">
          <Title level={5}>Kế hoạch hành động</Title>
          <Paragraph type="secondary">{intelligence.actionPlan.narrative}</Paragraph>
          {intelligence.actionPlan.items.map((item) => (
            <Paragraph key={item.title}>
              <Text strong>{item.title}</Text> ({item.priority}) — {item.timeline}
              <br />
              Người thực hiện: {item.owner} · Kết quả: {item.expectedOutcome}
            </Paragraph>
          ))}
        </div>
      )}

      {ai?.aiConclusion && (
        <div className="score-card report-ai-insights">
          <Title level={5}>Kết luận điều hành AI</Title>
          <Paragraph>{annotateInsightText(ai.aiConclusion)}</Paragraph>
        </div>
      )}



      {intelligence.maturity && (

        <div className="score-card report-maturity">

          <Text type="secondary">Mức trưởng thành</Text>

          <Title level={4} style={{ margin: '0.25rem 0' }}>

            Level {intelligence.maturity.level} — {intelligence.maturity.name}

          </Title>

          <Paragraph type="secondary">{intelligence.maturity.description}</Paragraph>

        </div>

      )}



      <div className="score-card">

        <Title level={5}>Biểu đồ năng lực</Title>

        <CategoryRadarChart

          categories={report.categoryScores}

          benchmark={intelligence.benchmark?.categories.map((c) => ({

            code: c.code,

            cohortMean: c.cohortMean,

          }))}

        />

      </div>



      <div className="score-card">

        <Text strong style={{ display: 'block', marginBottom: '0.75rem' }}>

          Điểm theo nhóm năng lực

        </Text>

        <CategoryScoreTable items={report.categoryScores} />

      </div>



      {intelligence.benchmark && intelligence.benchmark.categories.length > 0 && (

        <div className="score-card">

          <Title level={5}>So sánh tham chiếu</Title>

          <Paragraph type="secondary">{intelligence.benchmark.narrative}</Paragraph>

          <div className="benchmark-table">

            {intelligence.benchmark.categories.map((row) => (

              <div key={row.code} className="benchmark-row">

                <span>{row.name}</span>

                <span>{row.score.toFixed(2)}</span>

                <span>{row.cohortMean?.toFixed(2) ?? '—'}</span>

                <span className={row.delta != null && row.delta >= 0 ? 'delta-up' : 'delta-down'}>

                  {row.delta != null ? `${row.delta >= 0 ? '+' : ''}${row.delta.toFixed(2)}` : '—'}

                </span>

              </div>

            ))}

          </div>

          {intelligence.benchmark.tiers && intelligence.benchmark.tiers.length > 0 && (
            <>
              <Title level={5} style={{ marginTop: '1rem' }}>So sánh đa tầng</Title>
              <div className="benchmark-table">
                {intelligence.benchmark.tiers.map((tier) => (
                  <div key={tier.label} className="benchmark-row">
                    <span>{tier.label}</span>
                    <span>{tier.scorePct.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </>
          )}

        </div>

      )}



      {intelligence.rootCauses.length > 0 && (

        <div className="score-card">

          <Title level={5}>Nguyên nhân gốc</Title>

          {intelligence.rootCauses.map((rc) => (

            <div key={rc.code} className="insight-block insight-root">

              <Text strong>{rc.title}</Text>

              <Paragraph>{annotateInsightText(rc.body)}</Paragraph>

            </div>

          ))}

        </div>

      )}



      {intelligence.risks.length > 0 && (

        <div className="score-card">

          <Title level={5}>Rủi ro cần lưu ý</Title>

          {intelligence.risks.map((r) => (

            <div key={r.title} className="insight-block insight-risk">

              <Text strong>

                {r.title} <Text type="danger">({r.level})</Text>

              </Text>

              <Paragraph>{annotateInsightText(r.body)}</Paragraph>

            </div>

          ))}

        </div>

      )}



      {intelligence.swot && (

        <div className="score-card">

          <Title level={5}>Điểm mạnh — điểm yếu — cơ hội — rủi ro</Title>

          <SwotList title="Điểm mạnh" items={intelligence.swot.strengths} />

          <SwotList title="Điểm yếu" items={intelligence.swot.weaknesses} />

          <SwotList title="Cơ hội" items={intelligence.swot.opportunities} />

          <SwotList title="Thách thức" items={intelligence.swot.threats} />

        </div>

      )}



      {report.recommendations.length > 0 && (

        <div className="score-card">

          <Title level={5}>Lộ trình triển khai đề xuất</Title>

          {report.recommendations.map((r, idx) => (

            <Paragraph key={r.title}>

              <Text strong>

                {idx + 1}. {annotateInsightText(r.title)}

              </Text>

              {r.estimateHint && <Text type="secondary"> · {annotateInsightText(r.estimateHint)}</Text>}

              <br />

              {annotateInsightText(r.body)}

            </Paragraph>

          ))}

        </div>

      )}



      {intelligence.roadmap && (

        <div className="score-card">

          <Title level={5}>Kế hoạch 30–60–90 ngày</Title>

          <RoadmapBlock label="30 ngày" items={intelligence.roadmap.days30} />

          <RoadmapBlock label="60 ngày" items={intelligence.roadmap.days60} />

          <RoadmapBlock label="90 ngày" items={intelligence.roadmap.days90} />

        </div>

      )}



      {intelligence.kpis.length > 0 && (

        <div className="score-card">

          <Title level={5}>KPI cam kết đo lường</Title>

          {intelligence.kpis.map((k) => (

            <Paragraph key={k.name}>

              <Text strong>{k.name}</Text> — Mục tiêu: {k.target} (trong {k.deadlineDays} ngày)

            </Paragraph>

          ))}

        </div>

      )}

      <div className="score-card report-contact">
        <Title level={5}>Thông tin liên hệ</Title>
        <Paragraph type="secondary">Novixa — sản phẩm của KIT Technology</Paragraph>
        <Paragraph>
          <Text strong>Hotline:</Text>{' '}
          <a href="tel:+84984660399">0984.660.399</a>
        </Paragraph>
        <Paragraph>
          <Text strong>Email:</Text>{' '}
          <a href="mailto:khiemtic@gmail.com">khiemtic@gmail.com</a>
        </Paragraph>
        <Paragraph>
          <Text strong>Website:</Text>{' '}
          <a href="https://novixa.vn/vi/lien-he" target="_blank" rel="noreferrer">
            novixa.vn/lien-he
          </a>
        </Paragraph>
        <Paragraph>
          <Text strong>Công ty:</Text> Công ty TNHH Truyền thông và Công nghệ KIT
        </Paragraph>
        <Paragraph>
          <Text strong>Địa chỉ:</Text> KĐT Hồ Xương Rồng, P. Phan Đình Phùng, Thái Nguyên
        </Paragraph>
      </div>

    </>

  );

}



function MatrixBlock({ title, items }: { title: string; items: { title: string; body: string }[] }) {
  if (items.length === 0) return null;
  return (
    <div className="swot-block">
      <Text strong>{title}</Text>
      <ul>
        {items.map((item) => (
          <li key={item.title}>{item.title}: {annotateInsightText(item.body)}</li>
        ))}
      </ul>
    </div>
  );
}

function SwotList({ title, items }: { title: string; items: { title: string; body: string }[] }) {

  if (items.length === 0) return null;

  return (

    <div className="swot-block">

      <Text strong>{title}</Text>

      <ul>

        {items.map((item) => (

          <li key={item.title}>

            {item.title}: {annotateInsightText(item.body)}

          </li>

        ))}

      </ul>

    </div>

  );

}



function RoadmapBlock({

  label,

  items,

}: {

  label: string;

  items: { title: string; body: string }[];

}) {

  if (items.length === 0) return null;

  return (

    <div className="roadmap-block">

      <Text strong>{label}</Text>

      <ul>

        {items.map((item) => (

          <li key={item.title}>

            {item.title}: {annotateInsightText(item.body)}

          </li>

        ))}

      </ul>

    </div>

  );

}


