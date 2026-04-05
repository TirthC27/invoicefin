import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from '../frontend/LandingPage';
import AuthPage from '../frontend/AuthPage';
import './index.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
      </Routes>
    </Router>
  );
}

export default App;
