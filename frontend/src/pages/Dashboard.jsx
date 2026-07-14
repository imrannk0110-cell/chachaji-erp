import React, { useState, useEffect } from 'react';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import { Download, Users, Store, IndianRupee, Hammer, Search, Calendar, CalendarDays, Star, Cake, ArrowRight, MessageCircle, Wallet, TrendingUp, TrendingDown, ClipboardList, Activity, X, CheckSquare, Check, Square } from 'lucide-react';

import { festivalsData } from '../utils/festivals';
import { useLocation, useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx-js-style';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalSuppliers: 0,
    activeOrders: 0,
    revenue: 0,
    netProfit: 0,
    netGalla: 0,
    todayOrdersCount: 0,
    todayOrdersRevenue: 0,
    totalReceivables: 0,
    totalPayables: 0,
    graphData: []
  });

  const [allData, setAllData] = useState({
    orders: [],
    customers: [],
    products: [],
    daybook: []
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [activeFilter, setActiveFilter] = useState(''); // 'Deliveries Today', 'Handover Tomorrow', 'Birthdays'
  const [proactiveAlerts, setProactiveAlerts] = useState([]);
  const [festivalContext, setFestivalContext] = useState(null);

  // Delivery Modal State
  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false);
  const [deliverySelectedOrder, setDeliverySelectedOrder] = useState(null);
  const [deliverySettleType, setDeliverySettleType] = useState(''); 
  const [deliveryPartialAmount, setDeliveryPartialAmount] = useState('');

  // Handover Modal State
  const [handoverModalOpen, setHandoverModalOpen] = useState(false);
  const [handoverSelectedOrder, setHandoverSelectedOrder] = useState(null);
  const [handoverType, setHandoverType] = useState(''); 
  const [handoverRescheduleDate, setHandoverRescheduleDate] = useState('');
  const [handoverPartialText, setHandoverPartialText] = useState('');
  const [handoverPendingText, setHandoverPendingText] = useState('');
  const [deliveryRescheduleDate, setDeliveryRescheduleDate] = useState('');

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [showCompletedDeliveries, setShowCompletedDeliveries] = useState(false);
  const [showCompletedHandovers, setShowCompletedHandovers] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  // Read URL params from global header search/buttons
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const searchParam = params.get('search');
    const filterParam = params.get('filter');

    if (searchParam) {
      setSearchQuery(searchParam);
      setActiveFilter('');
      setFestivalContext(null);
      navigate('/', { replace: true }); // clear url so we don't get stuck
    } else if (filterParam) {
      setActiveFilter(filterParam);
      setSearchQuery('');
      setFestivalContext(null);
      navigate('/', { replace: true }); // clear url
    }
  }, [location.search, navigate]);

  useEffect(() => {
    Promise.all([
      fetch('/api/customers').then(res => res.json()),
      fetch('/api/suppliers').then(res => res.json()),
      fetch('/api/orders').then(res => res.json()),
      fetch('/api/products').then(res => res.json()),
      fetch('/api/daybook').then(res => res.json()),
      fetch('/api/dashboard/summary').then(res => res.json())
    ]).then(([customers, suppliers, orders, products, daybook, summary]) => {
      
      setAllData({ orders: orders || [], customers: customers || [], products: products || [], daybook: daybook || [] });

      let netProfit = 0;
      let todayOrdersCount = 0;
      let todayOrdersRevenue = 0;

      const today = new Date().toISOString().split('T')[0];

      (orders || []).forEach(o => {
          netProfit += o.net_profit || 0;
          if (o.booked_date && o.booked_date.startsWith(today)) {
              todayOrdersCount++;
              todayOrdersRevenue += o.grand_total || 0;
          }
      });

      const totalIncome = (daybook || []).filter(t => t.type.startsWith('Income')).reduce((sum, t) => sum + t.amount, 0);
      const totalExpense = (daybook || []).filter(t => t.type.startsWith('Expense')).reduce((sum, t) => sum + t.amount, 0);

      setStats({
        totalCustomers: customers.length || 0,
        totalSuppliers: suppliers.length || 0,
        activeOrders: (orders || []).filter(o => o.status !== 'Delivered').length,
        revenue: (orders || []).reduce((acc, curr) => acc + (curr.grand_total || 0), 0),
        netProfit,
        netGalla: totalIncome - totalExpense,
        todayOrdersCount,
        todayOrdersRevenue,
        totalReceivables: summary?.totalReceivables || 0,
        totalPayables: summary?.totalPayables || 0,
        graphData: summary?.graphData || []
      });

      // PROACTIVE ALERTS CALCULATION
      const todayDate = new Date();
      const todayMMDD = todayDate.toISOString().slice(5, 10);
      const alerts = [];

      // 1. Birthdays
      (customers || []).forEach(c => {
          if (c.dob && c.dob.slice(5, 10) === todayMMDD) {
              alerts.push({
                  id: `bday-${c.id}`,
                  type: 'birthday',
                  title: `🎂 Today is ${c.name}'s Birthday!`,
                  customerPhone: c.phone,
                  customerName: c.name
              });
          }
      });

      setProactiveAlerts(alerts);

    }).catch(console.error);
  }, [refreshTrigger]);

  const handleDeliveryCheckboxClick = (order) => {
      setDeliverySelectedOrder(order);
      setDeliverySettleType('');
      setDeliveryPartialAmount('');
      setDeliveryModalOpen(true);
  };

  const submitDeliverySettlement = async () => {
      if (!deliverySelectedOrder || !deliverySettleType) return;
      
      let deliveryPayment = null;
      let finalAmount = 0;
      let whatsappMessage = '';
      
      if (deliverySettleType === 'Yes') {
          finalAmount = deliverySelectedOrder.balance_due;
          deliveryPayment = { amount: finalAmount, mode: 'Cash' };
      } else if (deliverySettleType === 'Partially') {
          finalAmount = parseFloat(deliveryPartialAmount) || 0;
          deliveryPayment = { amount: finalAmount, mode: 'Cash' };
          const remaining = deliverySelectedOrder.balance_due - finalAmount;
          whatsappMessage = `Hello ${deliverySelectedOrder.customer_name},\n\nWe have received your partial payment of ₹${finalAmount}. Your remaining due balance is ₹${remaining}. Please clear it at your earliest convenience.\n\nThank you,\nChachaji Udyog`;
      } else if (deliverySettleType === 'No') {
          deliveryPayment = { amount: 0, mode: 'Cash' };
      }
      
      try {
          const res = await fetch(`/api/orders/${deliverySelectedOrder.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  status: 'Delivered',
                  manager_id: deliverySelectedOrder.manager_id,
                  handover_target_date: deliverySelectedOrder.handover_target_date,
                  delivery_date: new Date().toISOString().split('T')[0],
                  deliveryPayment: deliveryPayment,
                  workshop_done: deliverySelectedOrder.workshop_done,
                  partial_handover_note: deliverySelectedOrder.partial_handover_note
              })
          });
          const data = await res.json();
          if (data.success) {
              setDeliveryModalOpen(false);
              setRefreshTrigger(prev => prev + 1);
              if (whatsappMessage && deliverySelectedOrder.customer_phone) {
                  window.open(`https://wa.me/91${deliverySelectedOrder.customer_phone}?text=${encodeURIComponent(whatsappMessage)}`, '_blank');
              }
          }
      } catch (err) {
          console.error(err);
      }
  };

  const handleUndoDelivery = async (orderId) => {
      if (!window.confirm("Are you sure you want to undo this delivery? The status will revert to 'Ready for Trial' and related payments will be removed.")) return;
      try {
          const res = await fetch(`/api/orders/${orderId}/undo-delivery`, {
              method: 'PUT'
          });
          const data = await res.json();
          if (data.success) {
              setRefreshTrigger(prev => prev + 1);
          } else {
              alert(data.error || 'Failed to undo delivery');
          }
      } catch (err) {
          console.error(err);
      }
  };

  const handleHandoverCheckboxClick = (order) => {
      setHandoverSelectedOrder(order);
      setHandoverType('');
      setHandoverRescheduleDate('');
      setHandoverPartialText('');
      setHandoverPendingText('');
      setDeliveryRescheduleDate('');
      setHandoverModalOpen(true);
  };

  const submitHandover = async () => {
      if (!handoverSelectedOrder || !handoverType) return;

      let newStatus = 'In Workshop';
      let newTargetDate = handoverSelectedOrder.handover_target_date;
      let newWorkshopDone = false;
      let newPartialNote = handoverSelectedOrder.partial_handover_note;
      let whatsappMessage = '';

      if (handoverType === 'Yes') {
          newStatus = 'Ready for Trial';
          newWorkshopDone = true;
      } else if (handoverType === 'No') {
          newTargetDate = handoverRescheduleDate;
          whatsappMessage = `Hello ${handoverSelectedOrder.customer_name},\n\nWe apologize for the delay. Your order (${handoverSelectedOrder.id}) has been rescheduled. We will notify you once it is ready.\n\nThank you,\nChachaji Udyog`;
      } else if (handoverType === 'Partially') {
          // New Split Order Logic
          try {
              const res = await fetch(`/api/orders/${handoverSelectedOrder.id}/split`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                      itemsDoneText: handoverPartialText,
                      pendingItemsText: handoverPendingText,
                      newHandoverDate: handoverRescheduleDate,
                      newDeliveryDate: deliveryRescheduleDate
                  })
              });
              if (!res.ok) throw new Error('Failed to split order');
              
              const whatsappMessage = `Hello ${handoverSelectedOrder.customer_name},\n\nPart of your order (${handoverSelectedOrder.id}) is ready! Specifically: ${handoverPartialText}. The remaining items (${handoverPendingText}) have been rescheduled for delivery on ${deliveryRescheduleDate}.\n\nThank you,\nChachaji Udyog`;
              const waLink = `https://wa.me/91${handoverSelectedOrder.customer_phone}?text=${encodeURIComponent(whatsappMessage)}`;
              window.open(waLink, '_blank');
              
              setHandoverModalOpen(false);
              fetchDashboardData();
          } catch(err) {
              console.error(err);
              alert('Error splitting order');
          }
          return; // Skip the PUT request below
      }

      try {
          const res = await fetch(`/api/orders/${handoverSelectedOrder.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  status: newStatus,
                  manager_id: handoverSelectedOrder.manager_id,
                  handover_target_date: newTargetDate,
                  delivery_date: handoverSelectedOrder.delivery_date,
                  workshop_done: newWorkshopDone,
                  partial_handover_note: newPartialNote
              })
          });
          const data = await res.json();
          if (data.success) {
              setHandoverModalOpen(false);
              setRefreshTrigger(prev => prev + 1);
              if (whatsappMessage && handoverSelectedOrder.customer_phone) {
                  window.open(`https://wa.me/91${handoverSelectedOrder.customer_phone}?text=${encodeURIComponent(whatsappMessage)}`, '_blank');
              }
          }
      } catch (err) {
          console.error(err);
      }
  };

  const handleUndoHandover = async (orderId) => {
      if (!window.confirm("Are you sure you want to undo this handover? The order will revert to 'In Workshop'.")) return;
      try {
          const res = await fetch(`/api/orders/${orderId}/undo-handover`, {
              method: 'PUT'
          });
          const data = await res.json();
          if (data.success) {
              setRefreshTrigger(prev => prev + 1);
          } else {
              alert(data.error || 'Failed to undo handover');
          }
      } catch (err) {
          console.error(err);
      }
  };

  const handleExport = async () => {
    try {
      const res = await fetch('/api/export/master/json');
      const data = await res.json();
      
      const wb = XLSX.utils.book_new();
      
      // --- HELPER TO STYLE HEADERS ---
      const addStyledSheet = (sheetName, sheetData, headerColor = "C5A059") => {
          if (!sheetData || sheetData.length === 0) return;
          const ws = XLSX.utils.json_to_sheet(sheetData);
          
          // Apply filters
          if (ws['!ref']) ws['!autofilter'] = { ref: ws['!ref'] };
          
          // Auto-size columns
          const colWidths = Object.keys(sheetData[0] || {}).map(k => ({ wch: Math.max(k.length + 5, 15) }));
          ws['!cols'] = colWidths;

          // Style headers
          const range = XLSX.utils.decode_range(ws['!ref']);
          for (let C = range.s.c; C <= range.e.c; ++C) {
              const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
              if (!ws[cellAddress]) continue;
              ws[cellAddress].s = {
                  fill: { patternType: "solid", fgColor: { rgb: headerColor } },
                  font: { bold: true, color: { rgb: "FFFFFF" } },
                  alignment: { horizontal: "center", vertical: "center" }
              };
          }
          
          XLSX.utils.book_append_sheet(wb, ws, sheetName);
      };

      // --- 1. KARIGHAR BALANCES (WORKSHOP SUMMARY) ---
      if (data.managers && data.manager_ledger) {
          const karigharSummary = data.managers.map(m => {
              const ledger = data.manager_ledger.filter(l => l.manager_id === m.id);
              const earned = ledger.filter(l => l.transaction_type === 'Cr_Stitching').reduce((sum, l) => sum + l.amount, 0);
              const paid = ledger.filter(l => l.transaction_type === 'Dr_Advance').reduce((sum, l) => sum + l.amount, 0);
              return {
                  "ID": m.id,
                  "Floor Worker/Unit": m.name,
                  "Unit No.": m.workshop_number,
                  "Mobile": m.mobile_number,
                  "Total Earned (₹)": earned,
                  "Total Paid/Advance (₹)": paid,
                  "Net Balance Due (₹)": earned - paid,
                  "Status": m.is_active ? "Active" : "Inactive"
              };
          });
          addStyledSheet("Factory_Unit_Balances", karigharSummary, "D4AF37");
      }

      // --- 2. DAYBOOK TRANSACTIONS (CLEAN VIEW) ---
      if (data.daybook_expenses) {
          const daybookSummary = data.daybook_expenses.map(d => ({
              "Date": new Date(d.created_at).toLocaleDateString(),
              "Time": new Date(d.created_at).toLocaleTimeString(),
              "Type": d.type.replace('_', ' '),
              "Category": d.category,
              "Amount (₹)": d.amount,
              "Description": d.description || '-'
          }));
          addStyledSheet("Daybook_Transactions", daybookSummary, "10B981");
      }

      // --- 3. UNPAID ORDERS (UDHAARI DETAIL) ---
      if (data.orders && data.customers) {
          const unpaidOrders = data.orders.filter(o => o.balance_due > 0).map(o => {
              const cust = data.customers.find(c => c.id === o.customer_id) || {};
              // Format items_json into readable string
              let itemsStr = "";
              try {
                  const items = JSON.parse(o.items_json || "[]");
                  itemsStr = items.map(i => `${i.type} (${i.fabricMeters}m)`).join(", ");
              } catch(e) {}
              
              return {
                  "Order ID": o.id,
                  "Customer Name": cust.name || 'Unknown',
                  "Mobile": cust.phone || '-',
                  "Items Details": itemsStr,
                  "Grand Total (₹)": o.grand_total,
                  "Advance Paid (₹)": o.advance_paid,
                  "Balance Due (₹)": o.balance_due,
                  "Current Status": o.status,
                  "Order Date": new Date(o.created_at).toLocaleDateString()
              };
          });
          if (unpaidOrders.length > 0) addStyledSheet("Unpaid_Orders_Udhaari", unpaidOrders, "EF4444"); // Red
      }

      // --- 4. ONGOING WORKSHOP ORDERS ---
      if (data.orders && data.managers && data.customers) {
          const activeOrders = data.orders.filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled').map(o => {
              const cust = data.customers.find(c => c.id === o.customer_id) || {};
              const mgr = data.managers.find(m => m.id == o.manager_id) || {};
              // Format items
              let itemsStr = "";
              try {
                  const items = JSON.parse(o.items_json || "[]");
                  itemsStr = items.map(i => i.type).join(", ");
              } catch(e) {}
              
              return {
                  "Order ID": o.id,
                  "Customer Name": cust.name || 'Unknown',
                  "Factory Floor Assigned": mgr.name ? `${mgr.name} (Unit ${mgr.workshop_number})` : 'Unassigned',
                  "Stoves / Items": itemsStr,
                  "Status": o.status,
                  "Trial Date": o.trial_date ? new Date(o.trial_date).toLocaleDateString() : '-',
                  "Delivery Date": o.delivery_date ? new Date(o.delivery_date).toLocaleDateString() : '-'
              };
          });
          if (activeOrders.length > 0) addStyledSheet("Ongoing_Factory_Orders", activeOrders, "3B82F6"); // Blue
      }
      
      // --- 5. SUPPLIER BALANCES ---
      if (data.suppliers && data.supplier_ledger) {
          const supplierSummary = data.suppliers.map(s => {
              const ledger = data.supplier_ledger.filter(l => l.supplier_id === s.id);
              const totalCredit = ledger.filter(l => l.transaction_type === 'Cr_Purchase').reduce((sum, l) => sum + l.amount, 0);
              const totalPaid = ledger.filter(l => l.transaction_type === 'Dr_Payment').reduce((sum, l) => sum + l.amount, 0);
              const balance = s.opening_balance + totalCredit - totalPaid;
              return {
                  "Supplier ID": s.id,
                  "Supplier Name": s.name,
                  "Mobile": s.mobile,
                  "Total Purchase (₹)": totalCredit,
                  "Total Paid (₹)": totalPaid,
                  "Opening Balance (₹)": s.opening_balance,
                  "Outstanding Due (₹)": balance
              };
          });
          addStyledSheet("Supplier_Balances", supplierSummary, "8B5CF6"); // Purple
      }

      // --- 6. RAW TABLES DUMP ---
      Object.keys(data).forEach((table) => {
        if (!data[table] || data[table].length === 0) return;
        const sheetData = data[table].map(row => {
          let newRow = {};
          for (let key in row) {
            newRow[key] = (typeof row[key] === 'object' && row[key] !== null) ? JSON.stringify(row[key]) : row[key];
          }
          return newRow;
        });
        // Use a generic dark header for raw tables
        addStyledSheet(`Raw_${table}`, sheetData, "475569");
      });
      
      XLSX.writeFile(wb, `ChachajiUdyog_MasterData_${new Date().toISOString().split('T')[0]}.xlsx`);
      alert('Master Data Exported Successfully!');
    } catch (err) {
      console.error(err);
      alert('Export failed');
    }
  };

  // SEARCH LOGIC
  useEffect(() => {
      if(!searchQuery && !activeFilter) {
          setSearchResults([]);
          return;
      }

      let results = [];
      const query = searchQuery.toLowerCase();

      if (activeFilter === 'Deliveries Today') {
          const today = new Date().toISOString().split('T')[0];
          results = allData.orders.filter(o => o.delivery_date?.startsWith(today));
      } else if (activeFilter === 'Handover Tomorrow') {
          const tmrw = new Date(Date.now() + 86400000).toISOString().split('T')[0];
          results = allData.orders.filter(o => o.handover_target_date?.startsWith(tmrw));
      } else if (activeFilter === 'Birthdays') {
          const todayMMDD = new Date().toISOString().slice(5, 10); // MM-DD
          results = allData.customers.filter(c => c.dob?.slice(5, 10) === todayMMDD);
      } else if (searchQuery) {
          // Fuzzy match Orders, Customers, Products
          const matchedCustomers = allData.customers.filter(c => 
              c.name.toLowerCase().includes(query) || 
              (c.phone && c.phone.includes(query))
          );
          
          const matchedOrders = allData.orders.filter(o => 
              o.id.toLowerCase().includes(query) || 
              (o.customer_phone && o.customer_phone.includes(query))
          );
          
          const matchedProducts = allData.products.filter(p => 
              (p.sku && p.sku.toLowerCase().includes(query)) ||
              (p.name && p.name.toLowerCase().includes(query))
          );

          results = [...matchedCustomers, ...matchedOrders, ...matchedProducts];
      }

      setSearchResults(results);
  }, [searchQuery, activeFilter, allData]);

  const sendCustomerMessage = (phone, name) => {
      if(!phone) return;
      let text = '';
      if (festivalContext) {
          if (festivalContext.type === 'festival-ramzan') {
              text = `Ramzan Mubarak ${name}! May this holy month bring you peace and prosperity.\n\nWarm Wishes,\nChachaji Udyog`;
          } else if (festivalContext.type === 'festival-rush') {
              text = `Hello ${name},\n\n${festivalContext.festivalName} is just 20 days away! To ensure timely delivery, please place your gas stove orders as soon as possible.\n\nThank you,\nChachaji Udyog`;
          } else if (festivalContext.type === 'festival') {
              text = `Happy ${festivalContext.festivalName} ${name}! Wishing you joy and happiness.\n\nWarm Wishes,\nChachaji Udyog`;
          }
      } else if (activeFilter === 'Birthdays') {
          text = `Happy Birthday ${name}!! 🎂🎉\nChachaji Udyog wishes you a fantastic day! Enjoy a special discount on your next order valid for 7 days.`;
      } else {
          text = `Hello ${name},\n\nGreetings from Chachaji Udyog!`;
      }
      const url = `https://wa.me/91${phone}?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="flex justify-between items-center">
        <div>
          <p className="subtext m-0" style={{ fontSize: '0.95rem', fontWeight: '500' }}>Welcome to Chachaji Udyog Management Panel</p>
        </div>
        <div className="flex gap-3">
          <button className="btn-secondary btn-icon" onClick={() => window.open('/api/export/database', '_blank')} title="Download complete database backup for system restore" style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}>
            <Download size={14} />
            System Backup (.db)
          </button>
          <button className="btn-primary btn-icon" onClick={handleExport} style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}>
            <Download size={14} />
            Export Master Data (Excel)
          </button>
        </div>
      </div>

      {/* UNIVERSAL COMMAND SEARCH BAR */}
      <div className="card mb-4" style={{ padding: '1.25rem' }}>
         <div className="mb-4" style={{ position: 'relative' }}>
            <Search size={20} color="var(--accent-gold)" style={{ position: 'absolute', left: '16px', top: '18px' }} />
            <input 
               type="text" 
               placeholder="Universal Search: Order ID, Mobile Number, Stove SKU, Wholesaler Invoice..." 
               value={searchQuery}
               onChange={e => { setSearchQuery(e.target.value); setActiveFilter(''); setFestivalContext(null); }}
               className="w-full search-input"
               style={{ padding: '1rem 1rem 1rem 3rem', fontSize: '1.1rem', backgroundColor: 'var(--bg-color)' }}
            />
         </div>

         {/* SHORTCUT SEARCH BUTTONS */}
         <div className="flex gap-3 mb-2 flex-wrap">
            <button 
                className={`btn-secondary text-sm py-1.5 px-3 flex items-center gap-2 ${activeFilter === 'Birthdays' ? 'bg-[var(--accent-gold)] text-black' : ''}`}
                onClick={() => { setActiveFilter(prev => prev === 'Birthdays' ? '' : 'Birthdays'); setSearchQuery(''); }}
                style={{ borderRadius: '20px', border: activeFilter === 'Birthdays' ? 'none' : '1px solid var(--border-color)' }}
            >
                <Cake size={14} /> Today's Birthday
            </button>
         </div>

         {/* DYNAMIC SEARCH RESULTS LIST */}
         {(searchQuery || activeFilter) && (
            <div className="mt-4 p-4 glass-panel" style={{ maxHeight: '300px', overflowY: 'auto' }}>
               <h4 className="mb-3 text-[var(--accent-gold)]">Search Results ({searchResults.length})</h4>
               {searchResults.length === 0 ? (
                   <p className="subtext">No records found matching your query.</p>
               ) : (
                   <div className="flex flex-col gap-2">
                       {searchResults.map((res, i) => {
                           if (res.phone && !String(res.id).startsWith('ORD')) {
                               // It's a Customer (From Search or Birthday)
                               return (
                                   <div key={`c-${res.id || res.phone}`} className="flex justify-between items-center p-3 bg-[var(--surface-light)] rounded-lg border border-[var(--border-color)]">
                                       <div>
                                           <span className="font-bold text-[var(--text-primary)]">{res.name}</span>
                                           <span className="text-sm subtext ml-3">{res.phone}</span>
                                       </div>
                                       <button className="btn-secondary text-sm flex gap-2" onClick={() => sendCustomerMessage(res.phone, res.name)}>
                                          <MessageCircle size={14} color="#25D366" /> WhatsApp
                                       </button>
                                   </div>
                               );
                           } else if (res.sku || res.landing_cost !== undefined) {
                               // It's a Product
                               return (
                                   <div key={`p-${res.id}`} className="flex justify-between items-center p-3 bg-[var(--surface-light)] rounded-lg border border-[var(--border-color)]">
                                       <div>
                                           <span className="font-bold text-[var(--accent-gold)]">{res.sku || res.name}</span>
                                           <span className="text-sm subtext ml-3">{res.category || 'Product'}</span>
                                       </div>
                                       <span className="text-sm text-[var(--text-primary)]">Landing: ₹{res.landing_cost}</span>
                                   </div>
                               );
                           } else {
                               // It's an Order
                               return (
                                   <div key={`o-${res.id}`} className="flex justify-between items-center p-3 bg-[var(--surface-light)] rounded-lg border border-[var(--border-color)]">
                                       <div>
                                           <span className="font-bold text-[var(--text-primary)]">{res.id}</span>
                                           <span className="text-sm subtext ml-3">{res.customer_name} ({res.customer_phone})</span>
                                       </div>
                                       <span className={`text-sm px-2 py-1 rounded bg-[var(--bg-color)] ${res.status === 'Delivered' ? 'text-[var(--success)]' : 'text-[var(--accent-gold)]'}`}>{res.status}</span>
                                   </div>
                               );
                           }
                       })}
                   </div>
               )}
            </div>
         )}
      </div>

      {/* ROW 1: KPI COMMAND CENTER (Styled matching reference image) */}
      <div className="grid grid-cols-4 gap-6">
        <div className="card flex flex-col justify-between cursor-pointer hover:shadow-md transition-shadow" style={{ padding: '1.5rem', backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '12px' }} onClick={() => navigate('/dashboard/daybook')}>
          <div>
            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Aaj ka Galla (Net Cash)</p>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '700', margin: '0.5rem 0 0 0', color: 'var(--success)' }}>
              ₹{stats.netGalla.toLocaleString()}
            </h2>
          </div>
          <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Outward Sales & Expenses</span>
            <Wallet size={16} color="var(--success)" />
          </div>
        </div>

        <div className="card flex flex-col justify-between cursor-pointer hover:shadow-md transition-shadow" style={{ padding: '1.5rem', backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '12px' }} onClick={() => navigate('/dashboard/all-orders', { state: { filter: "Today's Orders" } })}>
          <div>
            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Today's Orders</p>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '700', margin: '0.5rem 0 0 0', color: 'var(--text-primary)' }}>
              {stats.todayOrdersCount}
            </h2>
          </div>
          <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Valued at ₹{stats.todayOrdersRevenue.toLocaleString()}</span>
            <ClipboardList size={16} color="var(--text-secondary)" />
          </div>
        </div>

        <div className="card flex flex-col justify-between cursor-pointer hover:shadow-md transition-shadow" style={{ padding: '1.5rem', backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '12px' }} onClick={() => navigate('/dashboard/customers', { state: { filter: 'Udhaari' } })}>
          <div>
            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
              {stats.totalReceivables >= 0 ? 'Sundry Debtors' : 'Customer Advances'}
            </p>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '700', margin: '0.5rem 0 0 0', color: stats.totalReceivables >= 0 ? 'var(--success)' : 'var(--accent-gold)' }}>
              ₹{Math.abs(stats.totalReceivables).toLocaleString()}
            </h2>
          </div>
          <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
              {stats.totalReceivables >= 0 ? 'Total outstanding receivables' : 'Overpaid / Advance deposits'}
            </span>
            <TrendingUp size={16} color={stats.totalReceivables >= 0 ? 'var(--success)' : 'var(--accent-gold)'} />
          </div>
        </div>

        <div className="card flex flex-col justify-between cursor-pointer hover:shadow-md transition-shadow" style={{ padding: '1.5rem', backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '12px' }} onClick={() => navigate('/dashboard/suppliers', { state: { filter: 'Dena' } })}>
          <div>
            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
              {stats.totalPayables >= 0 ? 'Sundry Creditors' : 'Supplier Advances'}
            </p>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '700', margin: '0.5rem 0 0 0', color: stats.totalPayables >= 0 ? 'var(--danger)' : 'var(--success)' }}>
              ₹{Math.abs(stats.totalPayables).toLocaleString()}
            </h2>
          </div>
          <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
              {stats.totalPayables >= 0 ? 'Total outstanding payables' : 'Advance paid to suppliers'}
            </span>
            {stats.totalPayables >= 0 ? (
              <TrendingDown size={16} color="var(--danger)" />
            ) : (
              <TrendingUp size={16} color="var(--success)" />
            )}
          </div>
        </div>
      </div>

      {/* ROW 2: ACTIONABLE LISTS */}
      <div className="grid grid-cols-2 gap-6 mt-4">
          {/* LEFT HALF: Today Deliveries */}
          <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
              <h3 className="mb-4 flex items-center gap-2 m-0 text-[var(--text-primary)]" style={{ fontSize: '1.15rem', fontWeight: '700' }}><CheckSquare size={18} color="var(--accent-gold)" /> Today Deliveries</h3>
              <div className="flex flex-col pr-1" style={{ maxHeight: '350px', overflowY: 'auto', flex: 1 }}>
                  {(() => {
                      const today = new Date().toISOString().split('T')[0];
                      const pendingDeliveries = [];
                      const completedDeliveries = [];
                      
                      allData.orders.forEach(o => {
                          const delDate = o.delivery_date?.split('T')[0];
                          if (!delDate) return;
                          
                          if (o.status === 'Delivered' && delDate === today) {
                              completedDeliveries.push(o);
                          } else if (o.status !== 'Delivered' && delDate <= today) {
                              pendingDeliveries.push(o);
                          }
                      });

                      return (
                          <>
                              {pendingDeliveries.length === 0 ? (
                                  <div className="flex flex-col items-center justify-center h-full min-h-[150px] p-6 rounded-xl border border-[var(--border-color)]" style={{ backgroundColor: 'var(--surface-light)' }}>
                                      <CheckSquare size={28} color="var(--text-secondary)" className="mb-2 opacity-50" />
                                      <p className="subtext m-0 text-sm">No pending deliveries for today.</p>
                                  </div>
                              ) : (
                                  pendingDeliveries.map(o => {
                                      const isOverdue = o.delivery_date?.split('T')[0] < today;
                                      return (
                                          <div 
                                              key={`del-${o.id}`} 
                                              className="flex justify-between items-center p-3.5 mb-3 rounded-xl border transition-all shadow-sm group hover:-translate-y-1 hover:shadow-md" 
                                              style={{ backgroundColor: isOverdue ? 'rgba(239, 68, 68, 0.08)' : 'var(--surface-light)', borderColor: isOverdue ? 'rgba(239, 68, 68, 0.4)' : 'var(--border-color)' }}
                                          >
                                             <div className="flex items-start gap-4 w-full">
                                                 <button 
                                                    onClick={() => handleDeliveryCheckboxClick(o)}
                                                    style={{ width: '22px', height: '22px', minWidth: '22px', border: '2px solid var(--accent-gold)' }}
                                                    className="mt-0.5 rounded flex items-center justify-center bg-transparent hover:bg-var(--accent-gold-dim) transition-all"
                                                 >
                                                 </button>
                                                 <div className="flex-1 flex flex-col gap-1.5">
                                                     <div className="flex justify-between items-center">
                                                         <span className="font-bold text-[var(--text-primary)] text-[14px] tracking-wide">{o.customer_name}</span>
                                                         {isOverdue && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[var(--danger)] bg-opacity-10 text-[var(--danger)] uppercase tracking-wider border border-[var(--danger)] border-opacity-20">Overdue</span>}
                                                     </div>
                                                     <div className="flex flex-wrap items-center gap-3 text-xs subtext font-medium">
                                                         <span className="px-2 py-0.5 rounded text-[var(--accent-gold)] border border-[var(--border-color)]" style={{ backgroundColor: 'var(--surface-color)' }}>{o.id}</span>
                                                         <span className="flex items-center gap-1 text-[var(--danger)]"><IndianRupee size={12}/> Due: ₹{o.balance_due}</span>
                                                         <span className="flex items-center gap-1 text-[var(--text-secondary)]"><Calendar size={12}/> {new Date(o.delivery_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                                                     </div>
                                                 </div>
                                                 <button className="flex-shrink-0 self-center ml-2 p-2 rounded-lg transition-colors text-[var(--text-secondary)] border border-[var(--border-color)] hover:border-[var(--accent-gold)] hover:bg-[var(--accent-gold)] hover:text-white" onClick={() => {
                                                     navigate('/all-orders', { state: { filter: 'All', search: o.id } });
                                                 }} title="View Order">
                                                     <ArrowRight size={14} />
                                                 </button>
                                             </div>
                                          </div>
                                      );
                                  })
                              )}

                              {/* Completed Today Section */}
                              {completedDeliveries.length > 0 && (
                                  <div className="mt-4">
                                      <button 
                                          onClick={() => setShowCompletedDeliveries(!showCompletedDeliveries)}
                                          className="flex items-center gap-2 text-sm text-[var(--accent-gold)] mb-3 w-full text-left focus:outline-none"
                                      >
                                          {showCompletedDeliveries ? '▼' : '▶'} Show Completed Today ({completedDeliveries.length})
                                      </button>
                                      
                                      {showCompletedDeliveries && completedDeliveries.map(o => (
                                          <div key={`del-comp-${o.id}`} className="flex justify-between items-center p-3.5 mb-3 rounded-xl border border-[var(--border-color)]" style={{ backgroundColor: 'var(--surface-light)' }}>
                                             <div className="flex items-start gap-4 w-full opacity-60 hover:opacity-100 transition-opacity">
                                                 <button 
                                                    onClick={() => handleUndoDelivery(o.id)}
                                                    style={{ width: '22px', height: '22px', minWidth: '22px', backgroundColor: 'var(--success)', border: 'none' }}
                                                    className="mt-0.5 rounded flex items-center justify-center"
                                                    title="Undo Delivery"
                                                 >
                                                    <Check size={12} color="#fff" strokeWidth={3} />
                                                 </button>
                                                 <div className="flex-1 flex flex-col gap-1.5" style={{ textDecoration: 'line-through' }}>
                                                     <div className="flex justify-between items-center">
                                                         <span className="font-bold text-[var(--text-primary)] text-[14px] tracking-wide">{o.customer_name}</span>
                                                     </div>
                                                     <div className="flex flex-wrap items-center gap-3 text-xs subtext font-medium">
                                                         <span className="px-2 py-0.5 rounded text-[var(--text-secondary)] border border-[var(--border-color)]">{o.id}</span>
                                                     </div>
                                                 </div>
                                             </div>
                                          </div>
                                      ))}
                                  </div>
                              )}
                          </>
                      );
                  })()}
              </div>
          </div>

          {/* RIGHT HALF: Tomorrow Handover */}
          <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
              <h3 className="mb-4 flex items-center gap-2 m-0 text-[var(--text-primary)]" style={{ fontSize: '1.15rem', fontWeight: '700' }}><Hammer size={18} color="var(--accent-gold)" /> Tomorrow Handover</h3>
              <div className="flex flex-col pr-1" style={{ maxHeight: '350px', overflowY: 'auto', flex: 1 }}>
                  {(() => {
                      const today = new Date().toISOString().split('T')[0];
                      const tmrwDate = new Date();
                      tmrwDate.setDate(tmrwDate.getDate() + 1);
                      const tmrw = tmrwDate.toISOString().split('T')[0];
                      
                      const pendingHandovers = [];
                      const completedHandovers = [];
                      
                      allData.orders.forEach(o => {
                          const handDate = o.handover_target_date?.split('T')[0];
                          if (!handDate) return;
                          
                          if (o.workshop_handover_status === 'Completed') {
                              if (handDate === today || handDate === tmrw) {
                                  completedHandovers.push(o);
                              }
                          } else {
                              if (handDate === tmrw || (handDate <= today && (o.status === 'In Workshop' || o.status === 'Ready for Trial'))) {
                                  pendingHandovers.push(o);
                              }
                          }
                      });

                      return (
                          <>
                              {pendingHandovers.length === 0 ? (
                                  <div className="flex flex-col items-center justify-center h-full min-h-[150px] p-6 rounded-xl border border-[var(--border-color)]" style={{ backgroundColor: 'var(--surface-light)' }}>
                                      <Hammer size={28} color="var(--text-secondary)" className="mb-2 opacity-50" />
                                      <p className="subtext m-0 text-sm">No workshop handovers pending.</p>
                                  </div>
                              ) : (
                                  pendingHandovers.map(o => {
                                      const isOverdue = o.handover_target_date?.split('T')[0] <= today;
                                      return (
                                          <div 
                                              key={`hand-${o.id}`} 
                                              className="flex justify-between items-center p-3.5 mb-3 rounded-xl border transition-all shadow-sm group hover:-translate-y-1 hover:shadow-md" 
                                              style={{ backgroundColor: isOverdue ? 'rgba(239, 68, 68, 0.08)' : 'var(--surface-light)', borderColor: isOverdue ? 'rgba(239, 68, 68, 0.4)' : 'var(--border-color)' }}
                                          >
                                             <div className="flex items-start gap-4 w-full">
                                                 <button 
                                                    onClick={() => handleHandoverCheckboxClick(o)}
                                                    style={{ width: '22px', height: '22px', minWidth: '22px', border: '2px solid var(--accent-gold)' }}
                                                    className="mt-0.5 rounded flex items-center justify-center bg-transparent hover:bg-var(--accent-gold-dim) transition-all"
                                                 >
                                                 </button>
                                                 <div className="flex-1 flex flex-col gap-1.5">
                                                     <div className="flex justify-between items-center">
                                                         <span className="font-bold text-[var(--text-primary)] text-[14px] tracking-wide">{o.customer_name}</span>
                                                         {isOverdue && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[var(--danger)] bg-opacity-10 text-[var(--danger)] uppercase tracking-wider border border-[var(--danger)] border-opacity-20">Overdue</span>}
                                                     </div>
                                                     <div className="flex flex-wrap items-center gap-3 text-xs subtext font-medium">
                                                         <span className="px-2 py-0.5 rounded text-[var(--accent-gold)] border border-[var(--border-color)]" style={{ backgroundColor: 'var(--surface-color)' }}>{o.id}</span>
                                                         <span className="flex items-center gap-1 text-[var(--text-secondary)]"><Calendar size={12}/> {new Date(o.handover_target_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                                                     </div>
                                                     {o.partial_handover_note && (
                                                         <div className="text-[11px] text-[var(--accent-gold)] mt-1 p-1.5 rounded flex items-center gap-1 border border-[var(--border-color)]" style={{ backgroundColor: 'var(--surface-color)' }}>
                                                             <Activity size={10} /> Partial: {o.partial_handover_note.split('\n')[0]}
                                                         </div>
                                                     )}
                                                 </div>
                                                 <button className="flex-shrink-0 self-center ml-2 p-2 rounded-lg transition-colors text-[var(--text-secondary)] border border-[var(--border-color)] hover:border-[var(--accent-gold)] hover:bg-[var(--accent-gold)] hover:text-white" onClick={() => {
                                                     navigate('/all-orders', { state: { filter: 'All', search: o.id } });
                                                 }} title="View Order">
                                                     <ArrowRight size={14} />
                                                 </button>
                                             </div>
                                          </div>
                                      );
                                  })
                              )}

                              {/* Completed Handovers Section */}
                              {completedHandovers.length > 0 && (
                                  <div className="mt-4">
                                      <button 
                                          onClick={() => setShowCompletedHandovers(!showCompletedHandovers)}
                                          className="flex items-center gap-2 text-sm text-[var(--accent-gold)] mb-3 w-full text-left focus:outline-none"
                                      >
                                          {showCompletedHandovers ? '▼' : '▶'} Show Completed Handovers ({completedHandovers.length})
                                      </button>
                                      
                                      {showCompletedHandovers && completedHandovers.map(o => (
                                          <div key={`hand-comp-${o.id}`} className="flex justify-between items-center p-3.5 mb-3 rounded-xl border border-[var(--border-color)]" style={{ backgroundColor: 'var(--surface-light)' }}>
                                             <div className="flex items-start gap-4 w-full opacity-60 hover:opacity-100 transition-opacity">
                                                 <button 
                                                    onClick={() => handleUndoHandover(o.id)}
                                                    style={{ width: '22px', height: '22px', minWidth: '22px', backgroundColor: 'var(--success)', border: 'none' }}
                                                    className="mt-0.5 rounded flex items-center justify-center"
                                                    title="Undo Handover"
                                                 >
                                                    <Check size={12} color="#fff" strokeWidth={3} />
                                                 </button>
                                                 <div className="flex-1 flex flex-col gap-1.5" style={{ textDecoration: 'line-through' }}>
                                                     <div className="flex justify-between items-center">
                                                         <span className="font-bold text-[var(--text-primary)] text-[14px] tracking-wide">{o.customer_name}</span>
                                                     </div>
                                                     <div className="flex flex-wrap items-center gap-3 text-xs subtext font-medium">
                                                         <span className="px-2 py-0.5 rounded text-[var(--text-secondary)] border border-[var(--border-color)]">{o.id}</span>
                                                     </div>
                                                 </div>
                                             </div>
                                          </div>
                                      ))}
                                  </div>
                              )}
                          </>
                      );
                  })()}
              </div>
          </div>
      </div>

      {/* ROW 3: RECENT ACTIVITY */}
      <div className="grid grid-cols-1 gap-4 mt-4 mb-6">

          {/* Activity Feed (Takes up full width now) */}
          <div className="card" style={{ padding: '1.25rem' }}>
              <h3 className="mb-3 flex items-center gap-2 text-[var(--accent-gold)] m-0" style={{ fontSize: '1.1rem' }}><Activity size={18} /> Recent Activity Feed</h3>
              <div className="flex flex-col gap-3" style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
                  {(() => {
                      const feed = [];
                      allData.orders.forEach(o => {
                          if (o.booked_date) feed.push({ type: 'order', text: `New Order Booked (${o.id}) - ${o.customer_name}`, date: new Date(o.booked_date), icon: <ClipboardList size={14} color="var(--accent-primary)" /> });
                          if (o.status === 'Delivered' && o.delivery_date) feed.push({ type: 'delivery', text: `Order Delivered (${o.id}) - ${o.customer_name}`, date: new Date(o.delivery_date), icon: <Hammer size={14} color="var(--success)" /> });
                      });
                      allData.daybook.forEach(d => {
                          if (d.amount > 0) {
                              feed.push({ type: 'finance', text: `${d.category}: ₹${d.amount}`, date: new Date(d.created_at), icon: <Wallet size={14} color={d.type.includes('Income') ? "var(--success)" : "var(--danger)"} /> });
                          }
                      });
                      
                      const sortedFeed = feed.sort((a,b) => b.date - a.date).slice(0, 12); // Show a bit more since it's full width
                      
                      return sortedFeed.length === 0 ? (
                          <p className="subtext text-sm">No recent activity.</p>
                      ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {sortedFeed.map((item, idx) => (
                                  <div key={idx} className="flex gap-3 items-start p-3 bg-[var(--surface-light)] rounded-lg border border-[var(--border-color)]">
                                      <div className="mt-1">{item.icon}</div>
                                      <div>
                                          <p className="m-0 text-sm font-medium">{item.text}</p>
                                          <p className="m-0 text-xs subtext mt-1">{item.date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      );
                  })()}
              </div>
          </div>
      </div>

      {/* PROACTIVE ALERTS (FLOATING UI) */}
      {proactiveAlerts.length > 0 && (
          <div style={{ position: 'fixed', bottom: '30px', right: '20px', zIndex: 50, display: 'flex', flexDirection: 'column', gap: '15px', width: 'calc(100vw - 40px)', maxWidth: '320px' }}>
              {proactiveAlerts.map(alert => (
                  <div key={alert.id} className="glass-panel" style={{ padding: '16px', position: 'relative', borderLeft: `4px solid ${alert.type === 'birthday' ? '#ff6b6b' : '#feca57'}`, boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                      <button 
                         onClick={() => setProactiveAlerts(prev => prev.filter(a => a.id !== alert.id))}
                         style={{ position: 'absolute', top: '10px', right: '10px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                      >
                         <X size={16} />
                      </button>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', color: '#fff', paddingRight: '20px' }}>{alert.title}</h4>
                      
                      {alert.type === 'birthday' ? (
                          <button 
                             className="btn-primary w-full text-sm mt-3 flex justify-center gap-2 py-2"
                             onClick={() => {
                                 sendCustomerMessage(alert.customerPhone, alert.customerName);
                                 setProactiveAlerts(prev => prev.filter(a => a.id !== alert.id));
                             }}
                          >
                             <MessageCircle size={16} /> Send Birthday Wish
                          </button>
                      ) : (
                          <div>
                             <p className="subtext text-sm m-0 mb-3">{alert.count} {alert.targetFaith} customers found in system.</p>
                             <button 
                                className="btn-secondary w-full text-sm flex justify-center gap-2 py-2"
                                onClick={() => {
                                    setFestivalContext(alert);
                                    setSearchQuery(alert.targetFaith);
                                    setActiveFilter('');
                                    setProactiveAlerts(prev => prev.filter(a => a.id !== alert.id));
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                             >
                                <Users size={16} /> View Customers to Message
                             </button>
                          </div>
                      )}
                  </div>
              ))}
          </div>
      )}

      {/* DELIVERY SETTLEMENT MODAL */}
      {deliveryModalOpen && deliverySelectedOrder && (
          <div className="modal-overlay">
              <div className="modal-content" style={{ maxWidth: '400px' }}>
                  <div className="modal-header">
                      <h3>Settlement: {deliverySelectedOrder.id}</h3>
                      <button className="close-btn" onClick={() => setDeliveryModalOpen(false)}><X size={20} /></button>
                  </div>
                  <div className="modal-body">
                      <p className="mb-4">Does remaining payment clear? (Due: ₹{deliverySelectedOrder.balance_due})</p>
                      
                      <div className="flex flex-wrap gap-2 mb-4">
                          <button className={`btn-${deliverySettleType === 'Yes' ? 'primary' : 'secondary'} flex-1`} onClick={() => setDeliverySettleType('Yes')}>Yes</button>
                          <button className={`btn-${deliverySettleType === 'No' ? 'primary' : 'secondary'} flex-1`} onClick={() => setDeliverySettleType('No')}>No</button>
                          <button className={`btn-${deliverySettleType === 'Partially' ? 'primary' : 'secondary'} flex-1`} onClick={() => setDeliverySettleType('Partially')}>Partially</button>
                      </div>

                      {deliverySettleType === 'Partially' && (
                          <div className="mb-4">
                              <label className="form-label">How much we receive?</label>
                              <input 
                                  type="number" 
                                  className="form-input" 
                                  value={deliveryPartialAmount}
                                  onChange={e => setDeliveryPartialAmount(e.target.value)}
                                  placeholder="Enter amount"
                              />
                          </div>
                      )}

                      <button 
                          className="btn-primary w-full" 
                          onClick={submitDeliverySettlement}
                          disabled={!deliverySettleType || (deliverySettleType === 'Partially' && !deliveryPartialAmount)}
                      >
                          Confirm Delivery
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* WORKSHOP HANDOVER MODAL */}
      {handoverModalOpen && handoverSelectedOrder && (
          <div className="modal-overlay">
              <div className="modal-content" style={{ maxWidth: '400px' }}>
                  <div className="modal-header">
                      <h3>Handover: {handoverSelectedOrder.id}</h3>
                      <button className="close-btn" onClick={() => setHandoverModalOpen(false)}><X size={20} /></button>
                  </div>
                  <div className="modal-body">
                      <p className="mb-4">All pcs is done?</p>
                      
                      <div className="flex flex-wrap gap-2 mb-4">
                          <button className={`btn-${handoverType === 'Yes' ? 'primary' : 'secondary'} flex-1`} onClick={() => setHandoverType('Yes')}>Yes</button>
                          <button className={`btn-${handoverType === 'No' ? 'primary' : 'secondary'} flex-1`} onClick={() => setHandoverType('No')}>No</button>
                          <button className={`btn-${handoverType === 'Partially' ? 'primary' : 'secondary'} flex-1`} onClick={() => setHandoverType('Partially')}>Partially</button>
                      </div>

                      {handoverType === 'No' && (
                          <div className="mb-4">
                              <label className="form-label">So when did it done!</label>
                              <input 
                                  type="date" 
                                  className="form-input" 
                                  value={handoverRescheduleDate}
                                  onChange={e => setHandoverRescheduleDate(e.target.value)}
                              />
                          </div>
                      )}

                      {handoverType === 'Partially' && (
                          <div className="mb-4 flex flex-col gap-3">
                              <div className="p-3 bg-[rgba(var(--primary-rgb),0.1)] border border-[var(--primary)] rounded-lg text-[0.85rem] mb-2">
                                  <strong>Order Split Mode:</strong> This order will be split. The items that are done will stay on the current delivery date. A new sub-order will be created for the pending items with new dates.
                              </div>
                              <div>
                                  <label className="form-label">Which items ARE done?</label>
                                  <input 
                                      type="text" 
                                      className="form-input" 
                                      value={handoverPartialText}
                                      onChange={e => setHandoverPartialText(e.target.value)}
                                      placeholder="e.g. 2 Burners, 1 Prep Table"
                                  />
                              </div>
                              <div>
                                  <label className="form-label">Which items are PENDING?</label>
                                  <input 
                                      type="text" 
                                      className="form-input" 
                                      value={handoverPendingText}
                                      onChange={e => setHandoverPendingText(e.target.value)}
                                      placeholder="e.g. 1 Exhaust Hood"
                                  />
                              </div>
                              <div className="flex flex-col gap-3">
                                <div>
                                    <label className="form-label">New Handover Date:</label>
                                    <input 
                                        type="date" 
                                        className="form-input" 
                                        value={handoverRescheduleDate}
                                        onChange={e => setHandoverRescheduleDate(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="form-label">New Delivery Date:</label>
                                    <input 
                                        type="date" 
                                        className="form-input" 
                                        value={deliveryRescheduleDate}
                                        onChange={e => setDeliveryRescheduleDate(e.target.value)}
                                    />
                                </div>
                              </div>
                          </div>
                      )}

                      <button 
                          className="btn-primary w-full" 
                          onClick={submitHandover}
                          disabled={!handoverType || (handoverType === 'No' && !handoverRescheduleDate) || (handoverType === 'Partially' && (!handoverPartialText || !handoverPendingText || !handoverRescheduleDate || !deliveryRescheduleDate))}
                      >
                          Confirm Handover
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Dashboard;
