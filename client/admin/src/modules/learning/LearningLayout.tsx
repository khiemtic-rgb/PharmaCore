import { Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCanLearningRead } from '@/shared/auth/usePermission';
import { PeopleSubNav } from '@/modules/learning/PeopleSubNav';

export function LearningLayout() {
  const navigate = useNavigate();
  const can = useCanLearningRead();

  useEffect(() => {
    if (!can) navigate('/', { replace: true });
  }, [can, navigate]);

  if (!can) return null;

  return (
    <div style={{ width: '100%', paddingBottom: 24 }}>
      <PeopleSubNav />
      <Outlet />
    </div>
  );
}
