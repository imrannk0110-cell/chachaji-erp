import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import SupplierLedger from './pages/SupplierLedger';
import CRM from './pages/CRM';
import POS from './pages/POS';
import Workshop from './pages/Workshop';
import Settings from './pages/Settings';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="suppliers" element={<SupplierLedger />} />
          <Route path="crm" element={<CRM />} />
          <Route path="pos" element={<POS />} />
          <Route path="workshop" element={<Workshop />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
