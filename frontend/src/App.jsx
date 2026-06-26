import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import SupplierLedger from './pages/SupplierLedger';
import NewOrder from './pages/NewOrder';
import Workshop from './pages/Workshop';
import Settings from './pages/Settings';
import Customers from './pages/Customers';
import Inventory from './pages/Inventory';
import AllOrders from './pages/AllOrders';
import Analytics from './pages/Analytics';

import Daybook from './pages/Daybook';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="new-order" element={<NewOrder />} />
          <Route path="workshop" element={<Workshop />} />
          <Route path="daybook" element={<Daybook />} />
          <Route path="customers" element={<Customers />} />
          <Route path="all-orders" element={<AllOrders />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="suppliers" element={<SupplierLedger />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
