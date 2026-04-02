import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { ToastProvider } from './hooks/useToast';
import { useTheme } from './hooks/useTheme';
import { AppShell } from './layout/AppShell';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { PrdEditorPage } from './pages/PrdEditorPage';
import { WireframesPage } from './pages/WireframesPage';
import { WireframeDetailPage } from './pages/WireframeDetailPage';
import { SettingsPage } from './pages/SettingsPage';
import { OnboardingWizard } from './components/OnboardingWizard';

function App() {
  useTheme();

  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const onboarded = localStorage.getItem('pm_ai_onboarded');
    if (!onboarded) setShowOnboarding(true);
  }, []);

  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<AppShell />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/prd/:id" element={<PrdEditorPage />} />
            <Route path="/wireframes" element={<WireframesPage />} />
            <Route path="/wireframes/:id" element={<WireframeDetailPage />} />
            <Route path="/templates" element={<Navigate to="/settings" replace />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <OnboardingWizard open={showOnboarding} onClose={() => setShowOnboarding(false)} />
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
