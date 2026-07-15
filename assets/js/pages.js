/**
 * DAYNE STORE — Module Pages
 * All module rendering logic: Dashboard, Inventory, POS, Utang, GCash, Cash Vault, Bills, Reports, Settings
 */

const Pages = {

  // ══════════════════════════════════════════════
  // DASHBOARD
  // ══════════════════════════════════════════════
  dashboard() {
    const todaySales = DS.sales.todayTotal();
    const cashBal    = DS.cashvault.balance();
    const gcashBal   = DS.gcash.balance();
    const utangTotal = DS.utang.totalOutstanding();
    const invest     = DS.products.totalInvestment();
    const retail     = DS.products.totalRetailValue();
    const profit     = DS.products.totalPotentialProfit();
    const lowStock   = DS.products.lowStock();
    const outStock   = DS.products.outOfStock();
    const expiring   = DS.products.expiringSoon(7);
    const recent     = DS.sales.recent(8);

    el('dash-today-sales').textContent    = fmt(todaySales);
    el('dash-cash-bal').textContent       = fmt(cashBal);
    el('dash-gcash-bal').textContent      = fmt(gcashBal);
    el('dash-utang-total').textContent    = fmt(utangTotal);
    el('dash-investment').textContent     = fmt(invest);
    el('dash-retail-val').textContent     = fmt(retail);
    el('dash-gross-profit').textContent   = fmt(profit);
    el('dash-today-txns').textContent     = DS.sales.today().length + ' transactions';

    // Alerts
    el('dash-low-stock-count').textContent  = lowStock.length;
    el('dash-out-stock-count').textContent  = outStock.length;
    el('dash-expiring-count').textContent   = expiring.length;

    // Recent transactions table
    const tbody = el('dash-recent-txns');
    if (recent.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-muted" style="color:var(--color-text-muted);font-size:var(--text-sm)">No transactions yet today.</td></tr>`;
    } else {
      tbody.innerHTML = recent.map(s => `
        <tr>
          <td><span class="fw-rubik" style="font-size:var(--text-xs);color:var(--color-text-muted)">${s.id.slice(-6).toUpperCase()}</span></td>
          <td style="font-size:var(--text-sm)">${DS.fmt.datetime(s.date)}</td>
          <td><span class="badge-pill ${payBadge(s.paymentMethod)}">${payLabel(s.paymentMethod)}</span></td>
          <td class="text-money" style="font-weight:700;color:var(--color-text-primary)">${fmt(s.total)}</td>
        </tr>
      `).join('');
    }

    // Low stock list
    const lowList = el('dash-low-stock-list');
    if (lowStock.length === 0) {
      lowList.innerHTML = `<p style="color:var(--color-text-muted);font-size:var(--text-sm);text-align:center;padding:16px">All stocks are sufficient.</p>`;
    } else {
      lowList.innerHTML = lowStock.slice(0,5).map(p => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--color-border)">
          <span style="font-size:var(--text-sm);font-weight:600">${escHTML(p.name)}</span>
          <span class="badge-pill badge-warning">${p.stock} left</span>
        </div>
      `).join('');
    }

    // Expiring list
    const expList = el('dash-expiring-list');
    if (expiring.length === 0) {
      expList.innerHTML = `<p style="color:var(--color-text-muted);font-size:var(--text-sm);text-align:center;padding:16px">No items expiring soon.</p>`;
    } else {
      expList.innerHTML = expiring.slice(0,5).map(p => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--color-border)">
          <span style="font-size:var(--text-sm);font-weight:600">${escHTML(p.name)}</span>
          <span class="badge-pill badge-danger">${DS.fmt.date(p.expirationDate)}</span>
        </div>
      `).join('');
    }
  },

  // ══════════════════════════════════════════════
  // INVENTORY
  // ══════════════════════════════════════════════
  inventory() {
    Pages._renderInventoryTable();
    Pages._populateCategoryFilter();
  },
  _renderInventoryTable(filter = '', category = '') {
    const products = DS.products.all().filter(p => {
      const matchSearch = !filter || p.name.toLowerCase().includes(filter.toLowerCase()) || (p.barcode && p.barcode.includes(filter));
      const matchCat    = !category || p.category === category;
      return matchSearch && matchCat;
    });
    const tbody = el('inv-tbody');
    if (products.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9">
        <div class="empty-state">
          <div class="empty-state-icon">${ICONS.inventory}</div>
          <h5>No products found</h5>
          <p>Add your first product to get started.</p>
        </div>
      </td></tr>`;
      return;
    }
    tbody.innerHTML = products.map(p => {
      const stockCls = parseInt(p.stock) === 0 ? 'badge-danger' : parseInt(p.stock) <= (parseInt(p.lowStockThreshold)||5) ? 'badge-warning' : 'badge-success';
      return `<tr>
        <td style="font-size:var(--text-xs);color:var(--color-text-muted)">${escHTML(p.barcode||'—')}</td>
        <td style="font-weight:600">${escHTML(p.name)}</td>
        <td><span class="badge-pill badge-neutral">${escHTML(p.category||'—')}</span></td>
        <td class="text-money">${fmt(p.costPrice)}</td>
        <td class="text-money" style="color:var(--color-primary);font-weight:700">${fmt(p.sellingPrice)}</td>
        <td><span class="badge-pill ${stockCls}">${p.stock}</span></td>
        <td style="font-size:var(--text-xs)">${p.expirationDate ? DS.fmt.date(p.expirationDate) : '—'}</td>
        <td class="text-money" style="color:var(--color-text-secondary)">${fmt((parseFloat(p.sellingPrice)||0)*(parseInt(p.stock)||0))}</td>
        <td>
          <div style="display:flex;gap:6px">
            <button class="btn-icon" onclick="Pages._openInvEdit('${p.id}')" title="Edit" aria-label="Edit ${escHTML(p.name)}">${ICONS.pencil}</button>
            <button class="btn-icon" onclick="Pages._invAdjust('${p.id}')" title="Adjust Stock" aria-label="Adjust stock">${ICONS.tag}</button>
            <button class="btn-icon btn-icon-danger" onclick="Pages._invDelete('${p.id}')" title="Delete" aria-label="Delete ${escHTML(p.name)}">${ICONS.trash}</button>
          </div>
        </td>
      </tr>`;
    }).join('');
    // Summary
    el('inv-total-investment').textContent = fmt(DS.products.totalInvestment());
    el('inv-total-retail').textContent     = fmt(DS.products.totalRetailValue());
    el('inv-total-profit').textContent     = fmt(DS.products.totalPotentialProfit());
    el('inv-product-count').textContent    = products.length;
  },
  _populateCategoryFilter() {
    const cats = DS.settings.get().categories || [];
    const sel  = el('inv-cat-filter');
    if (!sel) return;
    sel.innerHTML = `<option value="">All Categories</option>` + cats.map(c => `<option value="${escHTML(c)}">${escHTML(c)}</option>`).join('');
  },
  _openInvAdd() {
    el('inv-modal-title').textContent = 'Add Product';
    el('inv-form').reset();
    el('inv-form-id').value = '';
    Pages._populateInvCategories();
    Modal.open('invModal');
    setTimeout(() => el('inv-name').focus(), 200);
  },
  _openInvEdit(id) {
    const p = DS.products.find(id);
    if (!p) return;
    el('inv-modal-title').textContent = 'Edit Product';
    el('inv-form-id').value = p.id;
    el('inv-name').value        = p.name || '';
    el('inv-barcode').value     = p.barcode || '';
    el('inv-category').value    = p.category || '';
    el('inv-cost').value        = p.costPrice || '';
    el('inv-price').value       = p.sellingPrice || '';
    el('inv-stock').value       = p.stock || 0;
    el('inv-threshold').value   = p.lowStockThreshold || 5;
    el('inv-expiry').value      = p.expirationDate || '';
    Pages._populateInvCategories(p.category);
    Modal.open('invModal');
    setTimeout(() => el('inv-name').focus(), 200);
  },
  _populateInvCategories(selected = '') {
    const cats = DS.settings.get().categories || [];
    el('inv-category').innerHTML = `<option value="">Select Category</option>` + cats.map(c => `<option value="${escHTML(c)}" ${c === selected ? 'selected' : ''}>${escHTML(c)}</option>`).join('');
  },
  _saveInvForm() {
    const id    = el('inv-form-id').value;
    const name  = el('inv-name').value.trim();
    const price = parseFloat(el('inv-price').value);
    if (!name) { el('inv-name').classList.add('is-invalid'); Toast.show('Product name is required.','error'); return; }
    if (isNaN(price) || price < 0) { el('inv-price').classList.add('is-invalid'); Toast.show('Valid selling price required.','error'); return; }
    el('inv-name').classList.remove('is-invalid');
    el('inv-price').classList.remove('is-invalid');

    const data = {
      name,
      barcode:          el('inv-barcode').value.trim(),
      category:         el('inv-category').value,
      costPrice:        parseFloat(el('inv-cost').value) || 0,
      sellingPrice:     price,
      stock:            parseInt(el('inv-stock').value) || 0,
      lowStockThreshold: parseInt(el('inv-threshold').value) || 5,
      expirationDate:   el('inv-expiry').value || ''
    };

    if (id) { DS.products.update(id, data); Toast.show('Product updated.', 'success'); }
    else    { DS.products.add(data);        Toast.show('Product added.', 'success'); }
    Modal.close('invModal');
    Pages._renderInventoryTable(el('inv-search').value, el('inv-cat-filter').value);
  },
  _invDelete(id) {
    const p = DS.products.find(id);
    Confirm.show(`Delete "${p ? p.name : 'this product'}"? This cannot be undone.`, () => {
      DS.products.delete(id);
      Pages._renderInventoryTable(el('inv-search').value, el('inv-cat-filter').value);
      Toast.show('Product deleted.', 'warning');
    }, 'Delete Product');
  },
  _invAdjust(id) {
    const p = DS.products.find(id);
    if (!p) return;
    el('adj-product-name').textContent = p.name;
    el('adj-current-stock').textContent = p.stock;
    el('adj-form-id').value = id;
    el('adj-qty').value = '';
    el('adj-type').value = 'add';
    Modal.open('adjModal');
    setTimeout(() => el('adj-qty').focus(), 200);
  },
  _saveAdjust() {
    const id  = el('adj-form-id').value;
    const qty = parseInt(el('adj-qty').value);
    const type = el('adj-type').value;
    if (isNaN(qty) || qty < 0) { Toast.show('Enter a valid quantity.','error'); return; }
    DS.products.adjustStock(id, qty, type);
    Modal.close('adjModal');
    Pages._renderInventoryTable(el('inv-search').value, el('inv-cat-filter').value);
    Toast.show('Stock adjusted.', 'success');
  },

  // ══════════════════════════════════════════════
  // POS
  // ══════════════════════════════════════════════
  pos() {
    Pages._posRenderProducts();
    Pages._posRenderCart();
    Pages._posPopulateCustomers();
  },
  _posProducts: [],
  _posCart: [],
  _posPayment: 'cash',
  _posRenderProducts(filter = '') {
    const allProducts = DS.products.all().filter(p => parseInt(p.stock) >= 0);
    Pages._posProducts = filter
      ? allProducts.filter(p => p.name.toLowerCase().includes(filter.toLowerCase()) || (p.barcode && p.barcode.includes(filter)))
      : allProducts;

    const grid = el('pos-product-grid');
    if (Pages._posProducts.length === 0) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">${ICONS.inventory}</div><h5>No products</h5><p>Add inventory first.</p></div>`;
      return;
    }
    grid.innerHTML = Pages._posProducts.map(p => {
      const outStock = parseInt(p.stock) === 0;
      return `<div class="product-card ${outStock ? 'out-of-stock' : ''}" onclick="Pages._posAddToCart('${p.id}')" role="button" tabindex="0" aria-label="Add ${escHTML(p.name)} to cart">
        ${outStock ? `<span class="product-card-stock-badge badge-pill badge-danger">Out</span>` : parseInt(p.stock) <= (parseInt(p.lowStockThreshold)||5) ? `<span class="product-card-stock-badge badge-pill badge-warning">${p.stock}</span>` : ''}
        <div class="product-card-icon">${ICONS.tag}</div>
        <div class="product-card-name">${escHTML(p.name)}</div>
        <div class="product-card-price">${fmt(p.sellingPrice)}</div>
      </div>`;
    }).join('');
  },
  _posAddToCart(productId) {
    const p = DS.products.find(productId);
    if (!p || parseInt(p.stock) === 0) return;
    const existing = Pages._posCart.find(c => c.productId === productId);
    if (existing) {
      if (existing.qty >= parseInt(p.stock)) { Toast.show('Insufficient stock.','warning'); return; }
      existing.qty++;
    } else {
      Pages._posCart.push({ productId, name: p.name, price: parseFloat(p.sellingPrice), qty: 1 });
    }
    Pages._posRenderCart();
  },
  _posRemoveFromCart(productId) {
    Pages._posCart = Pages._posCart.filter(c => c.productId !== productId);
    Pages._posRenderCart();
  },
  _posUpdateQty(productId, delta) {
    const item = Pages._posCart.find(c => c.productId === productId);
    if (!item) return;
    const p = DS.products.find(productId);
    item.qty = Math.max(1, Math.min(item.qty + delta, parseInt(p ? p.stock : 999)));
    Pages._posRenderCart();
  },
  _posRenderCart() {
    const count = Pages._posCart.reduce((s, c) => s + c.qty, 0);
    const total = Pages._posCart.reduce((s, c) => s + c.price * c.qty, 0);

    el('pos-cart-count').textContent = count;
    el('pos-grand-total').textContent = fmt(total);

    const items = el('pos-cart-items');
    if (Pages._posCart.length === 0) {
      items.innerHTML = `<div class="empty-state" style="padding:32px 16px"><div class="empty-state-icon">${ICONS.pos}</div><p>Cart is empty.<br>Tap a product to add.</p></div>`;
    } else {
      items.innerHTML = Pages._posCart.map(c => `
        <div class="cart-item">
          <div style="flex:1;min-width:0">
            <div class="cart-item-name">${escHTML(c.name)}</div>
            <div class="cart-item-price">${fmt(c.price)} each</div>
          </div>
          <div class="qty-control">
            <button class="qty-btn" onclick="Pages._posUpdateQty('${c.productId}',-1)" aria-label="Decrease qty">−</button>
            <span class="qty-num">${c.qty}</span>
            <button class="qty-btn" onclick="Pages._posUpdateQty('${c.productId}',1)" aria-label="Increase qty">+</button>
          </div>
          <button class="btn-icon btn-icon-danger" onclick="Pages._posRemoveFromCart('${c.productId}')" aria-label="Remove">${ICONS.trash}</button>
        </div>
      `).join('');
    }
  },
  _posSetPayment(method) {
    Pages._posPayment = method;
    document.querySelectorAll('.payment-tab').forEach(t => t.classList.toggle('active', t.dataset.method === method));
    el('pos-utang-customer').style.display = method === 'utang' ? 'block' : 'none';
  },
  _posPopulateCustomers() {
    const custs = DS.customers.all();
    const sel = el('pos-customer-select');
    if (!sel) return;
    sel.innerHTML = `<option value="">Select Customer</option>` + custs.map(c => `<option value="${c.id}">${escHTML(c.name)}</option>`).join('');
  },
  _posCheckout() {
    if (Pages._posCart.length === 0) { Toast.show('Cart is empty.','warning'); return; }
    const total = Pages._posCart.reduce((s, c) => s + c.price * c.qty, 0);
    const paymentMethod = Pages._posPayment;

    if (paymentMethod === 'utang') {
      const custId = el('pos-customer-select').value;
      if (!custId) { Toast.show('Select a customer for utang.','error'); return; }
      DS.sales.add({ items: [...Pages._posCart.map(c => ({ productId: c.productId, qty: c.qty, price: c.price }))], total, paymentMethod, customerId: custId });
    } else {
      const sale = DS.sales.add({ items: [...Pages._posCart.map(c => ({ productId: c.productId, qty: c.qty, price: c.price }))], total, paymentMethod });
      // Record to cashvault or gcash
      if (paymentMethod === 'cash') {
        DS.cashvault.add({ type: 'cash_sale', amount: total, note: `Sale #${sale.id.slice(-6).toUpperCase()}` });
      } else if (paymentMethod === 'gcash') {
        DS.gcash.add({ type: 'sale', amount: total, note: `Sale #${sale.id.slice(-6).toUpperCase()}` });
      }
    }

    Toast.show(`Sale completed! ${fmt(total)}`, 'success');
    Pages._posCart = [];
    Pages._posRenderCart();
    Pages._posRenderProducts(el('pos-search').value);
  },

  // ══════════════════════════════════════════════
  // UTANG
  // ══════════════════════════════════════════════
  utang() { Pages._renderUtangList(); },
  _renderUtangList(filter = '') {
    const summary = DS.utang.summarizedByCustomer().filter(c =>
      !filter || c.name.toLowerCase().includes(filter.toLowerCase())
    );
    const all = DS.customers.all().map(c => ({ ...c, balance: DS.utang.balanceFor(c.id) }));

    const tbody = el('utang-tbody');
    if (all.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state"><div class="empty-state-icon">${ICONS.utang}</div><h5>No customers</h5><p>Add a customer to track utang.</p></div></td></tr>`;
    } else {
      const filtered = filter ? all.filter(c => c.name.toLowerCase().includes(filter.toLowerCase())) : all;
      tbody.innerHTML = filtered.map(c => `
        <tr>
          <td style="font-weight:600">${escHTML(c.name)}</td>
          <td style="font-size:var(--text-xs);color:var(--color-text-muted)">${escHTML(c.phone||'—')}</td>
          <td class="text-money" style="font-weight:700;color:${c.balance > 0 ? 'var(--color-danger)' : 'var(--color-success)'}">${fmt(c.balance)}</td>
          <td>
            <div style="display:flex;gap:6px">
              <button class="btn-icon" onclick="Pages._utangViewHistory('${c.id}')" title="View History" aria-label="View history">${ICONS.chartBar}</button>
              <button class="btn-icon" onclick="Pages._utangPayment('${c.id}')" title="Record Payment" aria-label="Record payment">${ICONS.cash}</button>
              <button class="btn-icon btn-icon-danger" onclick="Pages._utangDeleteCustomer('${c.id}')" aria-label="Delete">${ICONS.trash}</button>
            </div>
          </td>
        </tr>
      `).join('');
    }
    el('utang-total-outstanding').textContent = fmt(DS.utang.totalOutstanding());
    el('utang-customer-count').textContent = DS.customers.all().length;
  },
  _openAddCustomer() {
    el('cust-form').reset();
    el('cust-form-id').value = '';
    Modal.open('custModal');
    setTimeout(() => el('cust-name').focus(), 200);
  },
  _saveCustomer() {
    const name = el('cust-name').value.trim();
    if (!name) { Toast.show('Customer name required.','error'); return; }
    const data = { name, phone: el('cust-phone').value.trim(), address: el('cust-address').value.trim() };
    DS.customers.add(data);
    Modal.close('custModal');
    Pages._renderUtangList();
    Toast.show('Customer added.', 'success');
  },
  _utangPayment(customerId) {
    const c = DS.customers.find(customerId);
    if (!c) return;
    el('pay-customer-name').textContent = c.name;
    el('pay-current-balance').textContent = fmt(DS.utang.balanceFor(customerId));
    el('pay-form-id').value = customerId;
    el('pay-amount').value = '';
    Modal.open('payModal');
    setTimeout(() => el('pay-amount').focus(), 200);
  },
  _savePayment() {
    const custId = el('pay-form-id').value;
    const amount = parseFloat(el('pay-amount').value);
    const method = el('pay-method') ? el('pay-method').value : 'cash';
    if (isNaN(amount) || amount <= 0) { Toast.show('Enter valid payment amount.','error'); return; }
    const note = el('pay-note').value.trim() || 'Payment received';
    
    DS.utang.addTransaction(custId, { type: 'payment', amount, note });
    
    const cust = DS.customers.find(custId);
    const custName = cust ? cust.name : 'Customer';
    
    if (method === 'cash') {
      DS.cashvault.add({ type: 'deposit', amount, note: `Utang payment from ${custName}` });
    } else if (method === 'gcash') {
      DS.gcash.add({ type: 'cash_in', amount, fee: 0, note: `Utang payment from ${custName}` });
    }
    
    Modal.close('payModal');
    Pages._renderUtangList();
    Toast.show(`Payment of ${fmt(amount)} recorded.`, 'success');
  },
  _utangViewHistory(customerId) {
    const c = DS.customers.find(customerId);
    if (!c) return;
    const history = DS.utang.byCustomer(customerId).sort((a,b) => new Date(b.date)-new Date(a.date));
    el('history-customer-name').textContent = c.name;
    el('history-balance').textContent = fmt(DS.utang.balanceFor(customerId));
    el('history-tbody').innerHTML = history.length === 0
      ? `<tr><td colspan="4" class="text-center py-3" style="color:var(--color-text-muted)">No transactions yet.</td></tr>`
      : history.map(t => `
        <tr>
          <td style="font-size:var(--text-xs)">${DS.fmt.datetime(t.date)}</td>
          <td><span class="badge-pill ${t.type==='charge' ? 'badge-danger' : 'badge-success'}">${t.type==='charge' ? 'Charge' : 'Payment'}</span></td>
          <td>${escHTML(t.note||'—')}</td>
          <td class="text-money" style="font-weight:700;color:${t.type==='charge' ? 'var(--color-danger)' : 'var(--color-success)'}">${fmt(t.amount)}</td>
        </tr>
      `).join('');
    Modal.open('historyModal');
  },
  _utangDeleteCustomer(id) {
    const c = DS.customers.find(id);
    Confirm.show(`Delete customer "${c ? c.name : ''}"? All their utang records will also be removed.`, () => {
      DS.customers.delete(id);
      DS.utang.save(DS.utang.all().filter(u => u.customerId !== id));
      Pages._renderUtangList();
      Toast.show('Customer deleted.','warning');
    }, 'Delete Customer');
  },

  // ══════════════════════════════════════════════
  // GCASH
  // ══════════════════════════════════════════════
  gcash() {
    el('gcash-balance').textContent = fmt(DS.gcash.balance());
    const tbody = el('gcash-tbody');
    const txns = DS.gcash.recent(30);
    if (txns.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="empty-state-icon">${ICONS.gcash}</div><h5>No GCash transactions</h5><p>Record your first GCash transaction.</p></div></td></tr>`;
    } else {
      tbody.innerHTML = txns.map(g => `
        <tr>
          <td style="font-size:var(--text-xs)">${DS.fmt.datetime(g.date)}</td>
          <td><span class="badge-pill ${gcashTypeBadge(g.type)}">${gcashTypeLabel(g.type)}</span></td>
          <td class="text-money" style="font-weight:700">${fmt(g.amount)}</td>
          <td class="text-money" style="color:var(--color-text-muted)">${fmt(g.fee||0)}</td>
          <td style="font-size:var(--text-sm)">${escHTML(g.note||'—')}</td>
        </tr>
      `).join('');
    }
  },
  _openGCashAdd() {
    el('gcash-form').reset();
    Modal.open('gcashModal');
    setTimeout(() => el('gcash-amount').focus(), 200);
  },
  _saveGCash() {
    const amount = parseFloat(el('gcash-amount').value);
    const type   = el('gcash-type').value;
    if (isNaN(amount) || amount <= 0) { Toast.show('Enter valid amount.','error'); return; }
    DS.gcash.add({ type, amount, fee: parseFloat(el('gcash-fee').value)||0, note: el('gcash-note').value.trim() });
    Modal.close('gcashModal');
    Pages.gcash();
    Toast.show('GCash transaction recorded.','success');
  },

  // ══════════════════════════════════════════════
  // CASH VAULT
  // ══════════════════════════════════════════════
  cashvault() {
    el('cv-balance').textContent = fmt(DS.cashvault.balance());
    const tbody = el('cv-tbody');
    const txns = DS.cashvault.recent(30);
    if (txns.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state"><div class="empty-state-icon">${ICONS.cash}</div><h5>No cash transactions</h5><p>Record your first cash movement.</p></div></td></tr>`;
    } else {
      tbody.innerHTML = txns.map(c => `
        <tr>
          <td style="font-size:var(--text-xs)">${DS.fmt.datetime(c.date)}</td>
          <td><span class="badge-pill ${cvTypeBadge(c.type)}">${cvTypeLabel(c.type)}</span></td>
          <td class="text-money" style="font-weight:700">${fmt(c.amount)}</td>
          <td style="font-size:var(--text-sm)">${escHTML(c.note||'—')}</td>
        </tr>
      `).join('');
    }
  },
  _openCVAdd() {
    el('cv-form').reset();
    Modal.open('cvModal');
    setTimeout(() => el('cv-amount').focus(), 200);
  },
  _saveCV() {
    const amount = parseFloat(el('cv-amount').value);
    const type   = el('cv-type').value;
    if (isNaN(amount) || amount <= 0) { Toast.show('Enter valid amount.','error'); return; }
    DS.cashvault.add({ type, amount, note: el('cv-note').value.trim() });
    Modal.close('cvModal');
    Pages.cashvault();
    Toast.show('Cash transaction recorded.','success');
  },

  // ══════════════════════════════════════════════
  // BILLS
  // ══════════════════════════════════════════════
  bills() { Pages._renderBillsTable(); },
  _renderBillsTable() {
    const allBills = DS.bills.all();
    const tbody = el('bills-tbody');
    if (allBills.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-state-icon">${ICONS.bills}</div><h5>No bills yet</h5><p>Track your recurring expenses here.</p></div></td></tr>`;
    } else {
      tbody.innerHTML = allBills.sort((a,b) => new Date(a.dueDate||0)-new Date(b.dueDate||0)).map(b => `
        <tr>
          <td style="font-weight:600">${escHTML(b.name)}</td>
          <td><span class="badge-pill badge-neutral">${escHTML(b.category||'—')}</span></td>
          <td class="text-money" style="font-weight:700">${fmt(b.amount)}</td>
          <td style="font-size:var(--text-sm)">${b.dueDate ? DS.fmt.date(b.dueDate) : '—'}</td>
          <td><span class="badge-pill ${b.status==='paid' ? 'badge-success' : 'badge-warning'}">${b.status==='paid' ? 'Paid' : 'Pending'}</span></td>
          <td>
            <div style="display:flex;gap:6px">
              ${b.status !== 'paid' ? `<button class="btn-icon" onclick="Pages._markBillPaid('${b.id}')" title="Mark Paid" aria-label="Mark as paid">${ICONS.check}</button>` : ''}
              <button class="btn-icon" onclick="Pages._openEditBill('${b.id}')" aria-label="Edit">${ICONS.pencil}</button>
              <button class="btn-icon btn-icon-danger" onclick="Pages._deleteBill('${b.id}')" aria-label="Delete">${ICONS.trash}</button>
            </div>
          </td>
        </tr>
      `).join('');
    }
    el('bills-total-pending').textContent = fmt(allBills.filter(b=>b.status!=='paid').reduce((s,b)=>s+(parseFloat(b.amount)||0),0));
    el('bills-total-paid').textContent    = fmt(allBills.filter(b=>b.status==='paid').reduce((s,b)=>s+(parseFloat(b.amount)||0),0));
  },
  _openAddBill() {
    el('bill-form').reset();
    el('bill-form-id').value = '';
    el('bill-modal-title').textContent = 'Add Bill';
    Modal.open('billModal');
    setTimeout(() => el('bill-name').focus(), 200);
  },
  _openEditBill(id) {
    const b = DS.bills.all().find(b => b.id === id);
    if (!b) return;
    el('bill-form-id').value   = b.id;
    el('bill-name').value      = b.name || '';
    el('bill-category').value  = b.category || '';
    el('bill-amount').value    = b.amount || '';
    el('bill-due').value       = b.dueDate || '';
    el('bill-status').value    = b.status || 'pending';
    el('bill-status').dispatchEvent(new Event('change'));
    el('bill-modal-title').textContent = 'Edit Bill';
    Modal.open('billModal');
  },
  _saveBill() {
    const id   = el('bill-form-id').value;
    const name = el('bill-name').value.trim();
    const amt  = parseFloat(el('bill-amount').value);
    const status = el('bill-status').value;
    const source = el('bill-source') ? el('bill-source').value : 'none';
    
    if (!name || isNaN(amt) || amt < 0) { Toast.show('Name and amount required.','error'); return; }
    
    let wasPending = true;
    if (id) {
       const oldBill = DS.bills.all().find(b => b.id === id);
       if (oldBill && oldBill.status === 'paid') wasPending = false;
    }
    
    const data = { name, category: el('bill-category').value, amount: amt, dueDate: el('bill-due').value, status };
    if (status === 'paid' && wasPending) {
       data.paidAt = new Date().toISOString();
       if (source === 'cash') {
           DS.cashvault.add({ type: 'expense', amount: amt, note: `Paid bill: ${name}` });
       } else if (source === 'gcash') {
           DS.gcash.add({ type: 'cash_out', amount: amt, fee: 0, note: `Paid bill: ${name}` });
       }
    }
    
    if (id) DS.bills.update(id, data);
    else    DS.bills.add(data);
    Modal.close('billModal');
    Pages._renderBillsTable();
    Toast.show(id ? 'Bill updated.' : 'Bill added.', 'success');
  },
  _markBillPaid(id) {
    Pages._openEditBill(id);
    el('bill-status').value = 'paid';
    el('bill-status').dispatchEvent(new Event('change'));
  },
  _deleteBill(id) {
    Confirm.show('Delete this bill?', () => {
      DS.bills.delete(id);
      Pages._renderBillsTable();
      Toast.show('Bill deleted.','warning');
    }, 'Delete Bill');
  },

  // ══════════════════════════════════════════════
  // REPORTS
  // ══════════════════════════════════════════════
  reports() { Pages._renderReports('daily'); },
  _renderReports(period = 'daily') {
    let from, to;
    const now = new Date();
    if (period === 'daily') {
      from = to = now.toISOString().split('T')[0];
    } else if (period === 'weekly') {
      const start = new Date(now); start.setDate(now.getDate() - 6);
      from = start.toISOString().split('T')[0];
      to   = now.toISOString().split('T')[0];
    } else if (period === 'monthly') {
      from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      to   = now.toISOString().split('T')[0];
    } else if (period === 'yearly') {
      from = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
      to   = now.toISOString().split('T')[0];
    } else {
      from = el('report-from').value;
      to   = el('report-to').value;
    }
    if (!from || !to) return;

    const fromDate = new Date(from + 'T00:00:00');
    const toDate   = new Date(to   + 'T23:59:59');
    const filtered = DS.sales.all().filter(s => { const d = new Date(s.date); return d >= fromDate && d <= toDate; });

    const totalSales = filtered.reduce((s,sale) => s+(parseFloat(sale.total)||0), 0);
    const cashSales  = filtered.filter(s=>s.paymentMethod==='cash').reduce((s,sale)=>s+(parseFloat(sale.total)||0),0);
    const gcashSales = filtered.filter(s=>s.paymentMethod==='gcash').reduce((s,sale)=>s+(parseFloat(sale.total)||0),0);
    const utangSales = filtered.filter(s=>s.paymentMethod==='utang').reduce((s,sale)=>s+(parseFloat(sale.total)||0),0);
    const txnCount   = filtered.length;
    const avgSale    = txnCount > 0 ? totalSales / txnCount : 0;

    el('rpt-total-sales').textContent  = fmt(totalSales);
    el('rpt-cash-sales').textContent   = fmt(cashSales);
    el('rpt-gcash-sales').textContent  = fmt(gcashSales);
    el('rpt-utang-sales').textContent  = fmt(utangSales);
    el('rpt-txn-count').textContent    = txnCount;
    el('rpt-avg-sale').textContent     = fmt(avgSale);
    el('rpt-investment').textContent   = fmt(DS.products.totalInvestment());
    el('rpt-retail-val').textContent   = fmt(DS.products.totalRetailValue());
    el('rpt-gross-profit').textContent = fmt(DS.products.totalPotentialProfit());

    // Sales breakdown table
    const tbody = el('rpt-sales-tbody');
    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="text-center" style="padding:24px;color:var(--color-text-muted)">No sales in this period.</td></tr>`;
    } else {
      tbody.innerHTML = [...filtered].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,20).map(s => `
        <tr>
          <td style="font-size:var(--text-xs);color:var(--color-text-muted)">${s.id.slice(-6).toUpperCase()}</td>
          <td style="font-size:var(--text-sm)">${DS.fmt.datetime(s.date)}</td>
          <td><span class="badge-pill ${payBadge(s.paymentMethod)}">${payLabel(s.paymentMethod)}</span></td>
          <td class="text-money" style="font-weight:700">${fmt(s.total)}</td>
        </tr>
      `).join('');
    }
  },

  // ══════════════════════════════════════════════
  // SETTINGS
  // ══════════════════════════════════════════════
  settings() {
    const s = DS.settings.get();
    el('set-store-name').value    = s.storeName   || '';
    el('set-store-addr').value    = s.storeAddress || '';
    el('set-store-phone').value   = s.storePhone   || '';
    el('set-currency').value      = s.currency     || '₱';
    el('set-categories').value    = (s.categories || []).join(', ');
    el('set-new-pin').value       = '';
    el('set-confirm-pin').value   = '';
    if (s.logo) {
      el('settings-logo-preview').src = s.logo;
      el('settings-logo-preview').style.display = 'block';
    } else {
      el('settings-logo-preview').style.display = 'none';
    }
  },
  _saveSettings() {
    const s = DS.settings.get();
    const name = el('set-store-name').value.trim();
    if (!name) { Toast.show('Store name required.','error'); return; }
    const catsRaw = el('set-categories').value.split(',').map(c=>c.trim()).filter(Boolean);
    s.storeName    = name;
    s.storeAddress = el('set-store-addr').value.trim();
    s.storePhone   = el('set-store-phone').value.trim();
    s.currency     = el('set-currency').value.trim() || '₱';
    s.categories   = catsRaw.length > 0 ? catsRaw : s.categories;
    DS.settings.save(s);
    document.getElementById('sidebarStoreName').textContent = s.storeName;
    Toast.show('Settings saved.', 'success');
  },
  _changePIN() {
    const np  = el('set-new-pin').value;
    const cnp = el('set-confirm-pin').value;
    if (!/^\d{4,6}$/.test(np)) { Toast.show('PIN must be 4-6 digits.','error'); return; }
    if (np !== cnp) { Toast.show('PINs do not match.','error'); return; }
    const s = DS.settings.get();
    s.pin = np;
    DS.settings.save(s);
    el('set-new-pin').value = '';
    el('set-confirm-pin').value = '';
    Toast.show('PIN changed successfully.', 'success');
  },
  _uploadLogo(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const s = DS.settings.get();
      s.logo = e.target.result;
      DS.settings.save(s);
      el('settings-logo-preview').src = e.target.result;
      el('settings-logo-preview').style.display = 'block';
      document.getElementById('sidebarLogoIcon').innerHTML = `<img src="${e.target.result}" alt="logo" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">`;
      Toast.show('Logo updated.', 'success');
    };
    reader.readAsDataURL(file);
  },
  _exportBackup() {
    const data = DS.backup.export();
    const blob = new Blob([data], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `daynestore_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    Toast.show('Backup exported successfully.', 'success');
  },
  _importBackup(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      Confirm.show('This will overwrite ALL existing data. Are you sure?', () => {
        const ok = DS.backup.import(e.target.result);
        if (ok) {
          Toast.show('Backup restored successfully.', 'success');
          App.renderSidebar();
          Pages.settings();
          Nav.navigate('dashboard');
        } else {
          Toast.show('Invalid backup file.', 'error');
        }
      }, 'Restore Backup');
    };
    reader.readAsText(file);
    input.value = '';
  },
  _clearAllData() {
    Confirm.show('This will permanently delete ALL store data. This cannot be undone!', () => {
      ['products','sales','customers','utang','gcash','cashvault','bills'].forEach(k => DS.set(k,[]));
      Toast.show('All data cleared.','warning');
      Nav.navigate('dashboard');
    }, 'Clear All Data');
  },
  _setReportTab(btn, period) {
    document.querySelectorAll('#page-reports .ds-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    const customRange = el('rpt-custom-range');
    if (customRange) customRange.style.display = period === 'custom' ? 'block' : 'none';
    if (period !== 'custom') Pages._renderReports(period);
  }
};

// ── Helper label/badge functions ──
function payLabel(m) {
  return m === 'cash' ? 'Cash' : m === 'gcash' ? 'GCash' : m === 'utang' ? 'Utang' : m || '—';
}
function payBadge(m) {
  return m === 'cash' ? 'badge-success' : m === 'gcash' ? 'badge-info' : m === 'utang' ? 'badge-danger' : 'badge-neutral';
}
function gcashTypeLabel(t) {
  return { cash_in:'Cash In', cash_out:'Cash Out', sale:'Sale', fee:'Fee' }[t] || t;
}
function gcashTypeBadge(t) {
  return { cash_in:'badge-success', cash_out:'badge-warning', sale:'badge-info', fee:'badge-danger' }[t] || 'badge-neutral';
}
function cvTypeLabel(t) {
  return { deposit:'Deposit', withdraw:'Withdraw', cash_sale:'Cash Sale', expense:'Expense' }[t] || t;
}
function cvTypeBadge(t) {
  return { deposit:'badge-success', cash_sale:'badge-primary', withdraw:'badge-warning', expense:'badge-danger' }[t] || 'badge-neutral';
}
