import { AppShell } from './components/Layout/AppShell';
import { ToastProvider } from './hooks/useToast';

function App() {
  return (
    <ToastProvider>
      <AppShell />
    </ToastProvider>
  );
}

export default App;
