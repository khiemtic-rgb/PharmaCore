import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { App, Button, Card, List, Space, Tag, Typography } from 'antd';
import { apiErrorMessage } from '@/shared/api/api-error';
import {
  fetchLearningProgram,
  type LearningProgramDetail,
} from '@/shared/api/learning.api';
import { PeoplePageHint } from '@/modules/learning/PeopleModuleIntro';
import { PeopleTrainTabs } from '@/modules/learning/PeopleTrainTabs';
import { useCanLearningWrite } from '@/shared/auth/usePermission';

export function LearningProgramDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { message } = App.useApp();
  const canWrite = useCanLearningWrite();
  const [detail, setDetail] = useState<LearningProgramDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchLearningProgram(id);
        if (!cancelled) setDetail(data);
      } catch (e) {
        message.error(apiErrorMessage(e, 'Không tải được lộ trình'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, message]);

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          alignItems: 'flex-start',
        }}
      >
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>
            Nội dung lộ trình
          </Typography.Title>
          <PeoplePageHint>
            Xem / sửa SOP và câu hỏi quiz — khác với «Học bài» (làm bài).
          </PeoplePageHint>
        </div>
        {canWrite ? <PeopleTrainTabs /> : null}
      </div>
      <Card loading={loading}>
        {detail ? (
          <>
            <Typography.Title level={4}>{detail.title}</Typography.Title>
            <Typography.Paragraph type="secondary">{detail.summary}</Typography.Paragraph>
            <List
              header="Các bài học — bấm để đọc nội dung"
              dataSource={detail.modules}
              renderItem={(m) => (
                <List.Item
                  actions={[
                    <Link key="read" to={`/people/modules/${m.id}`}>
                      <Button type="primary" size="small">
                        Xem / sửa SOP
                      </Button>
                    </Link>,
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <Space>
                        <Tag color="geekblue">{m.levelCode}</Tag>
                        {m.title}
                        <Tag>{m.durationMinutes} phút</Tag>
                        <Tag>{m.questionCount} câu hỏi</Tag>
                      </Space>
                    }
                    description={m.summary}
                  />
                </List.Item>
              )}
            />
          </>
        ) : null}
      </Card>
    </Space>
  );
}
