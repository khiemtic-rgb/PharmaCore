import { useLocation, useNavigate } from 'react-router-dom';
import { Button, Space } from 'antd';
import { FileTextOutlined, UserAddOutlined, UserOutlined } from '@ant-design/icons';
import { useCanLearningWrite } from '@/shared/auth/usePermission';

/**
 * Hành động phụ trong «Đào tạo» (quản lý): học cá nhân ↔ giao / nội dung bài.
 * Nhân viên (chỉ read) không thấy.
 */
export function PeopleTrainTabs() {
  const canWrite = useCanLearningWrite();
  const navigate = useNavigate();
  const path = useLocation().pathname;

  if (!canWrite) return null;

  const onLearn = path.startsWith('/people/learn') && !path.startsWith('/people/enrollments');
  const onAssign = path.startsWith('/people/enrollments');
  const onContent =
    path.startsWith('/people/content') ||
    path.startsWith('/people/programs') ||
    path.startsWith('/people/modules');

  return (
    <Space wrap size={8}>
      <Button
        type={onLearn ? 'primary' : 'default'}
        ghost={onLearn}
        icon={<UserOutlined />}
        onClick={() => navigate('/people/learn')}
        style={onLearn ? undefined : { borderColor: '#1677ff', color: '#1677ff' }}
      >
        Học của tôi
      </Button>
      <Button
        type={onAssign ? 'primary' : 'default'}
        ghost={onAssign}
        icon={<UserAddOutlined />}
        onClick={() => navigate('/people/enrollments')}
        style={onAssign ? undefined : { borderColor: '#1677ff', color: '#1677ff' }}
      >
        Giao đào tạo
      </Button>
      <Button
        type={onContent ? 'primary' : 'default'}
        ghost={onContent}
        icon={<FileTextOutlined />}
        onClick={() => navigate('/people/content')}
        style={onContent ? undefined : { borderColor: '#1677ff', color: '#1677ff' }}
      >
        Nội dung bài
      </Button>
    </Space>
  );
}
