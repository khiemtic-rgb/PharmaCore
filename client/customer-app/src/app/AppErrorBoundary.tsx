import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button, Result } from 'antd';
import i18n from '@/shared/i18n';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('KitPlatform customer app error:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f0fdfa',
            padding: 24,
          }}
        >
          <Result
            status="error"
            title={i18n.t('error.title')}
            subTitle={this.state.error.message || i18n.t('error.subtitle')}
            extra={
              <Button type="primary" onClick={() => window.location.reload()}>
                {i18n.t('error.reload')}
              </Button>
            }
          />
        </div>
      );
    }

    return this.props.children;
  }
}
