import React, { useState, useEffect } from 'react';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import { Download, Users, Store, IndianRupee, Hammer, Search, Calendar, CalendarDays, Star, Cake, ArrowRight, MessageCircle, Wallet, TrendingUp, TrendingDown, ClipboardList, Activity, X, CheckSquare, Check, Square } from 'lucide-react';

import { festivalsData } from '../utils/festivals';
import { useLocation, useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalSuppliers: 0,
    activeOrders: 0,
    revenue: 0,
    fabricMargin: 0,
    stitchingMargin: 0,
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

      let fabricMargin = 0;
      let stitchingMargin = 0;
      let todayOrdersCount = 0;
      let todayOrdersRevenue = 0;

      const today = new Date().toISOString().split('T')[0];

      (orders || []).forEach(o => {
          fabricMargin += (o.net_profit || 0) * 0.6; 
          stitchingMargin += (o.net_profit || 0) * 0.4;
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
        fabricMargin,
        stitchingMargin,
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

      // 2. Festivals
      festivalsData.forEach(f => {
          const fDate = new Date(f.date);
          const diffDays = Math.ceil((fDate - todayDate) / (1000 * 60 * 60 * 24));
          
          if (diffDays >= 0 && diffDays <= 30) {
              const count = (customers || []).filter(c => c.faith_tag === f.targetFaith).length;
              if (count > 0) {
                  // Special logic for Muslim festivals
                  if (f.name === 'Eid-ul-Fitr' && diffDays === 30) {
                      alerts.push({
                          id: `fest-${f.name}-30`,
                          type: 'festival-ramzan',
                          title: `🌙 Ramzan starts today! (Send Wishes)`,
                          count: count,
                          targetFaith: f.targetFaith,
                          festivalName: f.name
                      });
                  } else if ((f.name === 'Eid-ul-Fitr' || f.name === 'Eid-ul-Adha') && diffDays === 20) {
                      alerts.push({
                          id: `fest-${f.name}-20`,
                          type: 'festival-rush',
                          title: `🌙 ${f.name} in 20 days! (Order Prompt)`,
                          count: count,
                          targetFaith: f.targetFaith,
                          festivalName: f.name
                      });
                  }

                  // Normal festival logic (day of or 3 days before)
                  if (diffDays >= 0 && diffDays <= 3) {
                      alerts.push({
                          id: `fest-${f.name}-${f.date}`,
                          type: 'festival',
                          title: `✨ ${f.name} is in ${diffDays} days!`,
                          count: count,
                          targetFaith: f.targetFaith,
                          festivalName: f.name
                      });
                  }
              }
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
          whatsappMessage = `Hello ${deliverySelectedOrder.customer_name},\n\nWe have received your partial payment of ₹${finalAmount}. Your remaining due balance is ₹${remaining}. Please clear it at your earliest convenience.\n\nThank you,\nHumjoli Safa`;
      } else if (deliverySettleType === 'No') {
          deliveryPayment = { amount: 0, mode: 'Cash' };
      }
      
      try {
          const res = await fetch(`http://${window.location.hostname}:5000/api/orders/${deliverySelectedOrder.id}`, {
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
          whatsappMessage = `Hello ${handoverSelectedOrder.customer_name},\n\nWe apologize for the delay. Your order (${handoverSelectedOrder.id}) has been rescheduled. We will notify you once it is ready.\n\nThank you,\nHumjoli Safa`;
      } else if (handoverType === 'Partially') {
          // New Split Order Logic
          try {
              const res = await fetch(`http://${window.location.hostname}:5000/api/orders/${handoverSelectedOrder.id}/split`, {
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
              
              const whatsappMessage = `Hello ${handoverSelectedOrder.customer_name},\n\nPart of your order (${handoverSelectedOrder.id}) is ready! Specifically: ${handoverPartialText}. The remaining items (${handoverPendingText}) have been rescheduled for delivery on ${deliveryRescheduleDate}.\n\nThank you,\nHumjoli Safa`;
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
          const res = await fetch(`http://${window.location.hostname}:5000/api/orders/${handoverSelectedOrder.id}`, {
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

  const handleExport = async () => {
    try {
      const res = await fetch('/api/export/master');
      const data = await res.json();
      
      Object.keys(data).forEach((table) => {
        if (!data[table]) return;
        const blob = new Blob([data[table]], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `HumjoliEthnic_${table}_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      });
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
      } else if (activeFilter === 'Today Festival') {
          const todayISO = new Date().toISOString().split('T')[0];
          const todaysFestivals = festivalsData.filter(f => f.date === todayISO);
          if (todaysFestivals.length > 0) {
              const targetFaiths = todaysFestivals.map(f => f.targetFaith);
              results = allData.customers.filter(c => targetFaiths.includes(c.faith_tag));
          }
      } else if (activeFilter === 'Upcoming Festival') {
          const todayDate = new Date();
          let targetFaiths = [];
          festivalsData.forEach(f => {
              const fDate = new Date(f.date);
              const diffDays = Math.ceil((fDate - todayDate) / (1000 * 60 * 60 * 24));
              if (diffDays > 0 && diffDays <= 15) { // Upcoming in next 15 days
                  targetFaiths.push(f.targetFaith);
              }
          });
          if (targetFaiths.length > 0) {
              results = allData.customers.filter(c => targetFaiths.includes(c.faith_tag));
          }
      } else if (searchQuery) {
          // Check for Faith Tag first
          const exactFaithMatch = allData.customers.filter(c => c.faith_tag?.toLowerCase() === query);
          if (exactFaithMatch.length > 0) {
              results = exactFaithMatch;
          } else {
              // Fuzzy match Orders, Phones, SKUs
              const matchedOrders = allData.orders.filter(o => 
                  o.id.toLowerCase().includes(query) || 
                  (o.customer_phone && o.customer_phone.includes(query))
              );
              
              const matchedProducts = allData.products.filter(p => 
                  (p.sku_takano && p.sku_takano.toLowerCase().includes(query)) ||
                  (p.invoice_no && p.invoice_no.toLowerCase().includes(query))
              );

              results = [...matchedOrders, ...matchedProducts];
          }
      }

      setSearchResults(results);
  }, [searchQuery, activeFilter, allData]);

  const sendCustomerMessage = (phone, name) => {
      if(!phone) return;
      let text = '';
      if (festivalContext) {
          if (festivalContext.type === 'festival-ramzan') {
              text = `Ramzan Mubarak ${name}! May this holy month bring you peace and prosperity.\n\nWarm Wishes,\nHumjoli Ethnic`;
          } else if (festivalContext.type === 'festival-rush') {
              text = `Hello ${name},\n\n${festivalContext.festivalName} is just 20 days away! To ensure timely delivery amidst the festival rush, please place your tailoring orders as soon as possible.\n\nThank you,\nHumjoli Ethnic`;
          } else if (festivalContext.type === 'festival') {
              text = `Happy ${festivalContext.festivalName} ${name}! Wishing you joy and happiness.\n\nWarm Wishes,\nHumjoli Ethnic`;
          }
      } else if (activeFilter === 'Birthdays') {
          text = `Happy Birthday ${name}!! 🎂🎉\nHumjoli Ethnic wishes you a fantastic day! Enjoy a special 15% discount on your next tailoring order valid for 7 days.`;
      } else {
          text = `Hello ${name},\n\nGreetings from Humjoli Ethnic!`;
      }
      const url = `https://wa.me/91${phone}?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
  };

  return (
    <div>
      <div className="flex justify-between items-end mb-4">
        <div>
          <h1 className="m-0" style={{ fontSize: '1.8rem', marginBottom: '4px' }}>Dashboard Overview</h1>
          <p className="subtext m-0">Welcome to Humjoli Ethnic Management Panel</p>
        </div>
        <button className="btn-primary btn-icon" onClick={handleExport}>
          <Download size={18} />
          Export Master Data (CSV)
        </button>
      </div>

      {/* UNIVERSAL COMMAND SEARCH BAR */}
      <div className="card mb-4" style={{ padding: '1.25rem' }}>
         <div className="mb-4" style={{ position: 'relative' }}>
            <Search size={20} color="var(--accent-gold)" style={{ position: 'absolute', left: '16px', top: '18px' }} />
            <input 
               type="text" 
               placeholder="Universal Search: Order ID, Mobile Number, Takano SKU, Wholesaler Invoice..." 
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
            <button 
                className={`btn-secondary text-sm py-1.5 px-3 flex items-center gap-2 ${activeFilter === 'Today Festival' ? 'bg-[var(--accent-gold)] text-black' : ''}`}
                onClick={() => { setActiveFilter(prev => prev === 'Today Festival' ? '' : 'Today Festival'); setSearchQuery(''); }}
                style={{ borderRadius: '20px', border: activeFilter === 'Today Festival' ? 'none' : '1px solid var(--border-color)' }}
            >
                <Star size={14} /> Today Festival
            </button>
            <button 
                className={`btn-secondary text-sm py-1.5 px-3 flex items-center gap-2 ${activeFilter === 'Upcoming Festival' ? 'bg-[var(--accent-gold)] text-black' : ''}`}
                onClick={() => { setActiveFilter(prev => prev === 'Upcoming Festival' ? '' : 'Upcoming Festival'); setSearchQuery(''); }}
                style={{ borderRadius: '20px', border: activeFilter === 'Upcoming Festival' ? 'none' : '1px solid var(--border-color)' }}
            >
                <CalendarDays size={14} /> Upcoming Festival
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
                           if (res.faith_tag && !String(res.id).startsWith('ORD')) {
                               // It's a Customer (From Faith Search or Birthday)
                               return (
                                   <div key={`c-${res.id || res.phone}`} className="flex justify-between items-center p-3 bg-[var(--surface-light)] rounded-lg border border-[var(--border-color)]">
                                       <div>
                                           <span className="font-bold text-white">{res.name}</span>
                                           <span className="text-sm subtext ml-3">{res.phone}</span>
                                       </div>
                                       <button className="btn-secondary text-sm flex gap-2" onClick={() => sendCustomerMessage(res.phone, res.name)}>
                                          <MessageCircle size={14} color="#25D366" /> WhatsApp
                                       </button>
                                   </div>
                               );
                           } else if (res.sku_takano) {
                               // It's a Product
                               return (
                                   <div key={`p-${res.id}`} className="flex justify-between items-center p-3 bg-[var(--surface-light)] rounded-lg border border-[var(--border-color)]">
                                       <div>
                                           <span className="font-bold text-[var(--accent-gold)]">{res.sku_takano}</span>
                                           <span className="text-sm subtext ml-3">Invoice: {res.invoice_no} | {res.total_meters}m</span>
                                       </div>
                                       <span className="text-sm">Landing: ₹{res.landing_cost}</span>
                                   </div>
                               );
                           } else {
                               // It's an Order
                               return (
                                   <div key={`o-${res.id}`} className="flex justify-between items-center p-3 bg-[var(--surface-light)] rounded-lg border border-[var(--border-color)]">
                                       <div>
                                           <span className="font-bold text-white">{res.id}</span>
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

      {/* ROW 1: KPI COMMAND CENTER */}
      <div className="grid grid-cols-4 gap-6 mt-6">
        <div className="card flex flex-col justify-between cursor-pointer hover:scale-105 transition-transform" style={{ borderTop: '3px solid var(--accent-gold)', backgroundColor: 'rgba(255, 215, 0, 0.05)', padding: '1.25rem' }} onClick={() => navigate('/daybook')}>
          <p className="form-label" style={{ marginBottom: 0 }}>Aaj ka Galla (Net Cash)</p>
          <div className="flex items-end justify-between mt-2">
             <h2 style={{ fontSize: '1.5rem', marginBottom: 0, color: 'var(--accent-gold)' }}>₹{stats.netGalla.toLocaleString()}</h2>
             <Wallet size={20} color="var(--accent-gold)" />
          </div>
        </div>

        <div className="card flex flex-col justify-between cursor-pointer hover:scale-105 transition-transform" style={{ borderTop: '3px solid var(--text-primary)', padding: '1.25rem' }} onClick={() => navigate('/all-orders', { state: { filter: "Today's Orders" } })}>
          <p className="form-label" style={{ marginBottom: 0 }}>Today's Orders</p>
          <div className="flex items-end justify-between mt-2">
             <div>
                <h2 style={{ fontSize: '1.5rem', marginBottom: 0 }}>{stats.todayOrdersCount}</h2>
                <span className="subtext text-[10px]">Valued ₹{stats.todayOrdersRevenue.toLocaleString()}</span>
             </div>
             <ClipboardList size={20} color="var(--text-secondary)" />
          </div>
        </div>

        <div className="card flex flex-col justify-between cursor-pointer hover:scale-105 transition-transform" style={{ borderTop: '3px solid var(--success)', backgroundColor: 'rgba(37, 211, 102, 0.05)', padding: '1.25rem' }} onClick={() => navigate('/customers', { state: { filter: 'Udhaari' } })}>
          <p className="form-label" style={{ marginBottom: 0 }}>Market Udhaari (Receivables)</p>
          <div className="flex items-end justify-between mt-2">
             <h2 style={{ fontSize: '1.5rem', color: 'var(--success)', marginBottom: 0 }}>₹{stats.totalReceivables.toLocaleString()}</h2>
             <TrendingUp size={20} color="var(--success)" />
          </div>
        </div>

        <div className="card flex flex-col justify-between cursor-pointer hover:scale-105 transition-transform" style={{ borderTop: '3px solid var(--danger)', backgroundColor: 'rgba(244, 63, 94, 0.05)', padding: '1.25rem' }} onClick={() => navigate('/suppliers', { state: { filter: 'Dena' } })}>
          <p className="form-label" style={{ marginBottom: 0 }}>Market Dena (Payables)</p>
          <div className="flex items-end justify-between mt-2">
             <h2 style={{ fontSize: '1.5rem', color: 'var(--danger)', marginBottom: 0 }}>₹{stats.totalPayables.toLocaleString()}</h2>
             <TrendingDown size={20} color="var(--danger)" />
          </div>
        </div>
      </div>

      {/* ROW 2: ACTIONABLE LISTS */}
      <div className="grid grid-cols-2 gap-6 mt-4">
          {/* LEFT HALF: Today Deliveries */}
          <div className="card relative overflow-hidden" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', background: 'linear-gradient(145deg, rgba(176,132,204,0.15) 0%, rgba(20,15,25,0.9) 100%)', border: '1px solid rgba(176,132,204,0.3)', boxShadow: '0 8px 32px rgba(176,132,204,0.15)' }}>
              <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '150px', height: '150px', background: 'radial-gradient(circle, rgba(176,132,204,0.2) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(20px)', pointerEvents: 'none' }}></div>
              <h3 className="mb-4 flex items-center gap-2 m-0 relative z-10" style={{ fontSize: '1.2rem', fontWeight: '700', color: '#D0A5F0', textShadow: '0 2px 10px rgba(176,132,204,0.4)' }}><CheckSquare size={20} /> Today Deliveries</h3>
              <div className="flex flex-col pr-1 z-10" style={{ maxHeight: '350px', overflowY: 'auto', flex: 1 }}>
                  {(() => {
                      const today = new Date().toISOString().split('T')[0];
                      const todayDeliveries = allData.orders.filter(o => {
                          const delDate = o.delivery_date?.split('T')[0];
                          if (!delDate) return false;
                          if (delDate === today) return true;
                          if (delDate < today && o.status !== 'Delivered') return true;
                          return false;
                      });

                      return todayDeliveries.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full min-h-[200px] p-6 rounded-xl border" style={{ backgroundColor: 'rgba(176,132,204,0.05)', borderColor: 'rgba(176,132,204,0.2)' }}>
                              <CheckSquare size={32} color="#B084CC" className="mb-2 opacity-50" />
                              <p className="subtext m-0 text-sm">No pending deliveries for today.</p>
                          </div>
                      ) : (
                          todayDeliveries.map(o => {
                              const isOverdue = o.delivery_date?.split('T')[0] < today;
                              return (
                                  <div 
                                      key={`del-${o.id}`} 
                                      className="flex justify-between items-center p-3.5 mb-3 rounded-xl border transition-all shadow-sm group hover:-translate-y-1 hover:shadow-lg" 
                                      style={{ backgroundColor: isOverdue ? 'rgba(244, 63, 94, 0.25)' : 'rgba(20,15,25,0.6)', borderColor: isOverdue ? 'rgba(244, 63, 94, 0.8)' : 'rgba(176,132,204,0.2)', boxShadow: isOverdue ? '0 0 15px rgba(244, 63, 94, 0.25)' : 'none', backdropFilter: 'blur(5px)' }} 
                                      onMouseEnter={(e) => {if(!isOverdue) e.currentTarget.style.backgroundColor = 'rgba(176,132,204,0.1)'}} 
                                      onMouseLeave={(e) => {if(!isOverdue) e.currentTarget.style.backgroundColor = 'rgba(20,15,25,0.6)'}}
                                  >
                                     <div className="flex items-start gap-4 w-full">
                                         <button 
                                            onClick={() => o.status !== 'Delivered' && handleDeliveryCheckboxClick(o)}
                                            style={{ width: '24px', height: '24px', minWidth: '24px' }}
                                            className={`mt-0.5 rounded flex items-center justify-center border-2 transition-all ${o.status === 'Delivered' ? 'bg-[#B084CC] border-[#B084CC] scale-105 shadow-[0_0_10px_rgba(176,132,204,0.5)]' : 'border-[#B084CC] hover:bg-[rgba(176,132,204,0.2)] hover:shadow-[0_0_8px_rgba(176,132,204,0.3)]'}`}
                                         >
                                            {o.status === 'Delivered' && <Check size={14} color="#fff" strokeWidth={3} />}
                                         </button>
                                         <div className="flex-1 flex flex-col gap-1.5">
                                             <div className="flex justify-between items-center">
                                                 <span className="font-bold text-white text-[15px] tracking-wide" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>{o.customer_name}</span>
                                                 {isOverdue && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--danger)] bg-opacity-20 text-[var(--danger)] uppercase tracking-wider border border-[var(--danger)] border-opacity-30">Overdue</span>}
                                             </div>
                                             <div className="flex flex-wrap items-center gap-3 text-xs subtext font-medium">
                                                 <span className="px-2 py-0.5 rounded text-[#D0A5F0] border border-[#B084CC] border-opacity-30" style={{ backgroundColor: 'rgba(176,132,204,0.05)' }}>{o.id}</span>
                                                 <span className="flex items-center gap-1 text-[var(--danger)]"><IndianRupee size={12}/> Due: ₹{o.balance_due}</span>
                                                 <span className="flex items-center gap-1 text-[#D0A5F0]"><Calendar size={12}/> {new Date(o.delivery_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                                             </div>
                                         </div>
                                         <button className="flex-shrink-0 self-center ml-2 p-2 rounded-lg transition-colors text-[#B084CC] border border-[rgba(176,132,204,0.3)] hover:border-[#D0A5F0] hover:bg-[#B084CC] hover:text-white group-hover:shadow-[0_0_10px_rgba(176,132,204,0.3)]" style={{ backgroundColor: 'rgba(176,132,204,0.05)' }} onClick={() => {
                                             let f = 'All';
                                             if (o.status === 'Ready for Trial' || o.status === 'Ready for trial') f = 'Ready for trial';
                                             else if (o.status === 'In Workshop' || o.status === 'In workshop') f = 'In workshop';
                                             navigate('/all-orders', { state: { filter: f, search: o.id } });
                                         }} title="View Order">
                                             <ArrowRight size={16} />
                                         </button>
                                     </div>
                                  </div>
                              );
                          })
                      );
                  })()}
              </div>
          </div>

          {/* RIGHT HALF: Tomorrow Handover */}
          <div className="card relative overflow-hidden" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', background: 'linear-gradient(145deg, rgba(205,133,63,0.15) 0%, rgba(25,18,15,0.9) 100%)', border: '1px solid rgba(205,133,63,0.3)', boxShadow: '0 8px 32px rgba(205,133,63,0.15)' }}>
              <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '150px', height: '150px', background: 'radial-gradient(circle, rgba(205,133,63,0.2) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(20px)', pointerEvents: 'none' }}></div>
              <h3 className="mb-4 flex items-center gap-2 m-0 relative z-10" style={{ fontSize: '1.2rem', fontWeight: '700', color: '#F0A550', textShadow: '0 2px 10px rgba(205,133,63,0.4)' }}><Hammer size={20} /> Tomorrow Handover</h3>
              <div className="flex flex-col pr-1 z-10" style={{ maxHeight: '350px', overflowY: 'auto', flex: 1 }}>
                  {(() => {
                      const today = new Date().toISOString().split('T')[0];
                      const d = new Date(); d.setDate(d.getDate() + 1);
                      const tmrw = d.toISOString().split('T')[0];
                      
                      const tomorrowHandovers = allData.orders.filter(o => {
                          const handDate = o.handover_target_date?.split('T')[0];
                          if (!handDate) return false;
                          if (handDate === tmrw) return true;
                          if (handDate <= today && !o.workshop_done && (o.status === 'In Workshop' || o.status === 'Ready for Trial')) return true;
                          return false;
                      });

                      return tomorrowHandovers.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full min-h-[200px] p-6 rounded-xl border" style={{ backgroundColor: 'rgba(205,133,63,0.05)', borderColor: 'rgba(205,133,63,0.2)' }}>
                              <Hammer size={32} color="#CD853F" className="mb-2 opacity-50" />
                              <p className="subtext m-0 text-sm">No workshop handovers pending.</p>
                          </div>
                      ) : (
                          tomorrowHandovers.map(o => {
                              const isOverdue = o.handover_target_date?.split('T')[0] <= today;
                              return (
                                  <div 
                                      key={`hand-${o.id}`} 
                                      className="flex justify-between items-center p-3.5 mb-3 rounded-xl border transition-all shadow-sm group hover:-translate-y-1 hover:shadow-lg" 
                                      style={{ backgroundColor: isOverdue ? 'rgba(244, 63, 94, 0.25)' : 'rgba(25,18,15,0.6)', borderColor: isOverdue ? 'rgba(244, 63, 94, 0.8)' : 'rgba(205,133,63,0.2)', boxShadow: isOverdue ? '0 0 15px rgba(244, 63, 94, 0.25)' : 'none', backdropFilter: 'blur(5px)' }} 
                                      onMouseEnter={(e) => {if(!isOverdue) e.currentTarget.style.backgroundColor = 'rgba(205,133,63,0.1)'}} 
                                      onMouseLeave={(e) => {if(!isOverdue) e.currentTarget.style.backgroundColor = 'rgba(25,18,15,0.6)'}}
                                  >
                                     <div className="flex items-start gap-4 w-full">
                                         <button 
                                            onClick={() => !o.workshop_done && handleHandoverCheckboxClick(o)}
                                            style={{ width: '24px', height: '24px', minWidth: '24px' }}
                                            className={`mt-0.5 rounded flex items-center justify-center border-2 transition-all ${o.workshop_done ? 'bg-[#CD853F] border-[#CD853F] scale-105 shadow-[0_0_10px_rgba(205,133,63,0.5)]' : 'border-[#CD853F] hover:bg-[rgba(205,133,63,0.2)] hover:shadow-[0_0_8px_rgba(205,133,63,0.3)]'}`}
                                         >
                                            {Boolean(o.workshop_done) && <Check size={14} color="#fff" strokeWidth={3} />}
                                         </button>
                                         <div className="flex-1 flex flex-col gap-1.5">
                                             <div className="flex justify-between items-center">
                                                 <span className="font-bold text-white text-[15px] tracking-wide" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>{o.customer_name}</span>
                                                 {isOverdue && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--danger)] bg-opacity-20 text-[var(--danger)] uppercase tracking-wider border border-[var(--danger)] border-opacity-30">Overdue</span>}
                                             </div>
                                             <div className="flex flex-wrap items-center gap-3 text-xs subtext font-medium">
                                                 <span className="px-2 py-0.5 rounded text-[#F0A550] border border-[#CD853F] border-opacity-30" style={{ backgroundColor: 'rgba(205,133,63,0.05)' }}>{o.id}</span>
                                                 <span className="flex items-center gap-1 text-[#F0A550]"><Calendar size={12}/> {new Date(o.handover_target_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                                             </div>
                                             {o.partial_handover_note && !o.workshop_done && (
                                                 <div className="text-[11px] text-[#F0A550] mt-1 p-1.5 rounded flex items-center gap-1 border border-[#CD853F] border-opacity-30" style={{ backgroundColor: 'rgba(205,133,63,0.08)' }}>
                                                     <Activity size={10} /> Partial: {o.partial_handover_note.split('\n')[0]}
                                                 </div>
                                             )}
                                         </div>
                                         <button className="flex-shrink-0 self-center ml-2 p-2 rounded-lg transition-colors text-[#CD853F] border border-[rgba(205,133,63,0.3)] hover:border-[#F0A550] hover:bg-[#CD853F] hover:text-white group-hover:shadow-[0_0_10px_rgba(205,133,63,0.3)]" style={{ backgroundColor: 'rgba(205,133,63,0.05)' }} onClick={() => {
                                             let f = 'All';
                                             if (o.status === 'Ready for Trial' || o.status === 'Ready for trial') f = 'Ready for trial';
                                             else if (o.status === 'In Workshop' || o.status === 'In workshop') f = 'In workshop';
                                             navigate('/all-orders', { state: { filter: f, search: o.id } });
                                         }} title="View Order">
                                             <ArrowRight size={16} />
                                         </button>
                                     </div>
                                  </div>
                              );
                          })
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
          <div style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 50, display: 'flex', flexDirection: 'column', gap: '15px', width: '320px' }}>
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
                      
                      <div className="flex gap-2 mb-4">
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
                      
                      <div className="flex gap-2 mb-4">
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
                                  <label className="form-label">Which items ARE done ?</label>
                                  <input 
                                      type="text" 
                                      className="form-input" 
                                      value={handoverPartialText}
                                      onChange={e => setHandoverPartialText(e.target.value)}
                                      placeholder="e.g. 1 Pant, 1 Shirt"
                                  />
                              </div>
                              <div>
                                  <label className="form-label">Which items are PENDING ?</label>
                                  <input 
                                      type="text" 
                                      className="form-input" 
                                      value={handoverPendingText}
                                      onChange={e => setHandoverPendingText(e.target.value)}
                                      placeholder="e.g. 1 Coat"
                                  />
                              </div>
                              <div className="grid grid-cols-2 gap-3">
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
