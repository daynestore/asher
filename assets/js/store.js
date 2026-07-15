/**
 * DAYNE STORE — Core Data Engine
 * Uses localStorage for offline persistence.
 * All data is keyed under "daynestore_*"
 */

const DS = (() => {

  const KEYS = {
    products:  'daynestore_products',
    sales:     'daynestore_sales',
    customers: 'daynestore_customers',
    utang:     'daynestore_utang',
    gcash:     'daynestore_gcash',
    cashvault: 'daynestore_cashvault',
    bills:     'daynestore_bills',
    settings:  'daynestore_settings',
  };

  // ── Defaults ──
  const DEFAULTS = {
    settings: {
      storeName: 'Dayne Store',
      storeAddress: '',
      storePhone: '',
      pin: '1234',
      theme: 'light',
      currency: '₱',
      categories: ['Beverages','Snacks','Canned Goods','Personal Care','Condiments','Dairy','Frozen','Others'],
      logo: ''
    }
  };

  // ── Core Storage ──
  function get(key) {
    try {
      const raw = localStorage.getItem(KEYS[key]);
      return raw ? JSON.parse(raw) : (Array.isArray(DEFAULTS[key]) ? [] : (DEFAULTS[key] || null));
    } catch(e) { console.error('DS.get error', e); return []; }
  }

  function set(key, data) {
    try { localStorage.setItem(KEYS[key], JSON.stringify(data)); return true; }
    catch(e) { console.error('DS.set error', e); return false; }
  }

  // ── ID Generator ──
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }

  // ── Settings ──
  const settings = {
    get() {
      const stored = get('settings');
      return stored ? { ...DEFAULTS.settings, ...stored } : { ...DEFAULTS.settings };
    },
    save(data) { return set('settings', data); },
    get currency() { return settings.get().currency || '₱'; }
  };

  // ── Products ──
  const products = {
    all() { return get('products') || []; },
    save(arr) { return set('products', arr); },
    add(p) {
      const arr = products.all();
      const product = { ...p, id: uid(), createdAt: new Date().toISOString() };
      arr.push(product);
      products.save(arr);
      return product;
    },
    update(id, data) {
      const arr = products.all().map(p => p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p);
      products.save(arr);
    },
    delete(id) {
      products.save(products.all().filter(p => p.id !== id));
    },
    find(id) { return products.all().find(p => p.id === id); },
    adjustStock(id, qty, type = 'set') {
      const arr = products.all().map(p => {
        if (p.id !== id) return p;
        let stock = parseInt(p.stock) || 0;
        if      (type === 'add')      stock += qty;
        else if (type === 'subtract') stock = Math.max(0, stock - qty);
        else                          stock = qty;
        return { ...p, stock };
      });
      products.save(arr);
    },
    // Computed values
    totalInvestment() {
      return products.all().reduce((s, p) => s + ((parseFloat(p.costPrice) || 0) * (parseInt(p.stock) || 0)), 0);
    },
    totalRetailValue() {
      return products.all().reduce((s, p) => s + ((parseFloat(p.sellingPrice) || 0) * (parseInt(p.stock) || 0)), 0);
    },
    totalPotentialProfit() {
      return products.all().reduce((s, p) => {
        const margin = (parseFloat(p.sellingPrice) || 0) - (parseFloat(p.costPrice) || 0);
        return s + margin * (parseInt(p.stock) || 0);
      }, 0);
    },
    lowStock() {
      return products.all().filter(p => parseInt(p.stock) > 0 && parseInt(p.stock) <= (parseInt(p.lowStockThreshold) || 5));
    },
    outOfStock() {
      return products.all().filter(p => parseInt(p.stock) === 0);
    },
    expiringSoon(days = 7) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + days);
      return products.all().filter(p => {
        if (!p.expirationDate) return false;
        const exp = new Date(p.expirationDate);
        return exp <= cutoff && exp >= new Date();
      });
    }
  };

  // ── Sales ──
  const sales = {
    all() { return get('sales') || []; },
    save(arr) { return set('sales', arr); },
    add(s) {
      const arr = sales.all();
      const sale = { ...s, id: uid(), date: new Date().toISOString() };
      arr.push(sale);
      sales.save(arr);
      // Deduct stock
      if (s.items && Array.isArray(s.items)) {
        s.items.forEach(item => {
          products.adjustStock(item.productId, item.qty, 'subtract');
        });
      }
      // If utang, create/update utang record
      if (s.paymentMethod === 'utang' && s.customerId) {
        const cust = customers.find(s.customerId);
        if (cust) {
          utang.addTransaction(s.customerId, {
            type: 'charge',
            amount: s.total,
            note: `Sale #${sale.id.slice(-6).toUpperCase()}`,
            saleId: sale.id
          });
        }
      }
      return sale;
    },
    today() {
      const today = new Date().toDateString();
      return sales.all().filter(s => new Date(s.date).toDateString() === today);
    },
    todayTotal() {
      return sales.today().reduce((sum, s) => sum + (parseFloat(s.total) || 0), 0);
    },
    byDate(from, to) {
      return sales.all().filter(s => {
        const d = new Date(s.date);
        return d >= new Date(from) && d <= new Date(to);
      });
    },
    recent(n = 10) {
      return [...sales.all()].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, n);
    }
  };

  // ── Customers ──
  const customers = {
    all() { return get('customers') || []; },
    save(arr) { return set('customers', arr); },
    add(c) {
      const arr = customers.all();
      const cust = { ...c, id: uid(), createdAt: new Date().toISOString() };
      arr.push(cust);
      customers.save(arr);
      return cust;
    },
    update(id, data) {
      customers.save(customers.all().map(c => c.id === id ? { ...c, ...data } : c));
    },
    delete(id) { customers.save(customers.all().filter(c => c.id !== id)); },
    find(id) { return customers.all().find(c => c.id === id); }
  };

  // ── Utang ──
  const utang = {
    all() { return get('utang') || []; },
    save(arr) { return set('utang', arr); },
    addTransaction(customerId, txn) {
      const arr = utang.all();
      const record = { ...txn, id: uid(), customerId, date: new Date().toISOString() };
      arr.push(record);
      utang.save(arr);
      return record;
    },
    byCustomer(customerId) {
      return utang.all().filter(u => u.customerId === customerId);
    },
    balanceFor(customerId) {
      return utang.byCustomer(customerId).reduce((sum, u) => {
        return u.type === 'charge' ? sum + (parseFloat(u.amount) || 0)
             : sum - (parseFloat(u.amount) || 0);
      }, 0);
    },
    totalOutstanding() {
      const custs = customers.all();
      return custs.reduce((sum, c) => sum + Math.max(0, utang.balanceFor(c.id)), 0);
    },
    summarizedByCustomer() {
      return customers.all().map(c => ({
        ...c,
        balance: utang.balanceFor(c.id)
      })).filter(c => c.balance > 0);
    }
  };

  // ── GCash ──
  const gcash = {
    all() { return get('gcash') || []; },
    save(arr) { return set('gcash', arr); },
    add(entry) {
      const arr = gcash.all();
      const record = { ...entry, id: uid(), date: new Date().toISOString() };
      arr.push(record);
      gcash.save(arr);
      return record;
    },
    balance() {
      return gcash.all().reduce((sum, g) => {
        const amount = parseFloat(g.amount) || 0;
        const fee = parseFloat(g.fee) || 0;
        if (g.type === 'cash_in') return sum + amount - fee;
        if (g.type === 'cash_out') return sum - amount - fee;
        if (g.type === 'sale') return sum + amount;
        return sum;
      }, 0);
    },
    recent(n = 20) {
      return [...gcash.all()].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0,n);
    }
  };

  // ── Cash Vault ──
  const cashvault = {
    all() { return get('cashvault') || []; },
    save(arr) { return set('cashvault', arr); },
    add(entry) {
      const arr = cashvault.all();
      const record = { ...entry, id: uid(), date: new Date().toISOString() };
      arr.push(record);
      cashvault.save(arr);
      return record;
    },
    balance() {
      return cashvault.all().reduce((sum, c) => {
        const amount = parseFloat(c.amount) || 0;
        if (c.type === 'deposit' || c.type === 'cash_sale') return sum + amount;
        if (c.type === 'withdraw' || c.type === 'expense') return sum - amount;
        return sum;
      }, 0);
    },
    recent(n = 20) {
      return [...cashvault.all()].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0,n);
    }
  };

  // ── Bills ──
  const bills = {
    all() { return get('bills') || []; },
    save(arr) { return set('bills', arr); },
    add(b) {
      const arr = bills.all();
      const record = { ...b, id: uid(), createdAt: new Date().toISOString() };
      arr.push(record);
      bills.save(arr);
      return record;
    },
    update(id, data) {
      bills.save(bills.all().map(b => b.id === id ? { ...b, ...data } : b));
    },
    delete(id) { bills.save(bills.all().filter(b => b.id !== id)); },
    dueSoon(days = 7) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + days);
      return bills.all().filter(b => {
        if (!b.dueDate || b.status === 'paid') return false;
        return new Date(b.dueDate) <= cutoff;
      });
    }
  };

  // ── Backup / Restore ──
  const backup = {
    export() {
      const data = {};
      Object.keys(KEYS).forEach(k => data[k] = get(k));
      return JSON.stringify(data, null, 2);
    },
    import(jsonStr) {
      try {
        const data = JSON.parse(jsonStr);
        Object.keys(KEYS).forEach(k => {
          if (data[k] !== undefined) set(k, data[k]);
        });
        return true;
      } catch(e) { return false; }
    }
  };

  // ── Formatting Helpers ──
  const fmt = {
    currency(amount) {
      const cur = settings.get().currency || '₱';
      return `${cur}${parseFloat(amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    },
    date(iso) {
      if (!iso) return '-';
      return new Date(iso).toLocaleDateString('en-PH', { year:'numeric', month:'short', day:'numeric' });
    },
    datetime(iso) {
      if (!iso) return '-';
      return new Date(iso).toLocaleString('en-PH', { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' });
    },
    number(n) { return (parseFloat(n) || 0).toLocaleString('en-PH'); }
  };

  return { uid, get, set, settings, products, sales, customers, utang, gcash, cashvault, bills, backup, fmt };
})();
