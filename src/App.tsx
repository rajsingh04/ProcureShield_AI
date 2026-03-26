import { useState } from 'react';
import './App.css'
import Dashboard from './pages/Dashboard';
import Home from './pages/Home';

function App() {
  const [analysisData, setAnalysisData] = useState<any>(null);

  const handleBack = () => {
    setAnalysisData(null);
  };

  return (
    <div className="App">
      {!analysisData ? (
        <Home onAnalyzeSuccess={setAnalysisData} />
      ) : (
        <Dashboard data={analysisData} onBack={handleBack} />
      )}
    </div>
  );
}

export default App
