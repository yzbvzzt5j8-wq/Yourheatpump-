import { useEffect } from 'react';
import { AppShell } from './components/AppShell';
import { useHashRoute } from './hooks/useHashRoute';
import { useCurrentJob } from './hooks/useCurrentJob';
import { seedMaterialsIfEmpty } from './db/seed';
import { HomeScreen } from './features/home/HomeScreen';
import { SurveyScreen } from './features/survey/SurveyScreen';
import { DesignScreen } from './features/design/DesignScreen';
import { HydraulicsScreen } from './features/hydraulics/HydraulicsScreen';
import { MaterialsScreen } from './features/materials/MaterialsScreen';
import { CommissioningScreen } from './features/commissioning/CommissioningScreen';
import { ReportsScreen } from './features/reports/ReportsScreen';
import { SettingsScreen } from './features/settings/SettingsScreen';
import { HelpScreen } from './features/help/HelpScreen';

export default function App() {
  const [route, navigate] = useHashRoute();
  const [currentJob, setCurrentJobId] = useCurrentJob();

  useEffect(() => {
    seedMaterialsIfEmpty();
  }, []);

  const jobId = currentJob?.id ?? null;

  function renderScreen() {
    switch (route) {
      case 'home':
        return (
          <HomeScreen
            currentJob={currentJob}
            onSelectJob={(id) => setCurrentJobId(id)}
            onNavigate={navigate}
          />
        );
      case 'survey':
        return <SurveyScreen jobId={jobId} />;
      case 'design':
        return <DesignScreen jobId={jobId} />;
      case 'hydraulics':
        return <HydraulicsScreen jobId={jobId} />;
      case 'materials':
        return <MaterialsScreen jobId={jobId} />;
      case 'commissioning':
        return <CommissioningScreen jobId={jobId} />;
      case 'reports':
        return <ReportsScreen jobId={jobId} />;
      case 'settings':
        return <SettingsScreen />;
      case 'help':
        return <HelpScreen />;
      default:
        return (
          <HomeScreen
            currentJob={currentJob}
            onSelectJob={(id) => setCurrentJobId(id)}
            onNavigate={navigate}
          />
        );
    }
  }

  return (
    <AppShell active={route} onNavigate={navigate} jobName={currentJob?.name}>
      {renderScreen()}
    </AppShell>
  );
}
