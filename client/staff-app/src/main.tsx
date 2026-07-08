import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/App';
import { enforceLatestAppBuild } from '@/shared/pwa/app-version';
import { setupServiceWorkerUpdates } from '@/shared/pwa/sw-update';
import '@/styles/index.css';

setupServiceWorkerUpdates();
void enforceLatestAppBuild();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
