const API_URL = '/api';
let chartInstance = null;
let currentModalType = '';
let cachedSuppliers = [];
let cachedVendors = [];
let cachedFruits = [];
let cachedStock = [];
const LOCAL_STOCK_KEY = 'batloung.localStockIncreases';
const LOCAL_PURCHASE_STATUS_KEY = 'batloung.purchasePaymentStatus';

// Switch Tabs
function switchTab(tabId, link) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('nav a').forEach(link => link.classList.remove('active'));
    
    document.getElementById(`tab-${tabId}`).classList.add('active');
    if (link) link.classList.add('active');
    else document.querySelector(`nav a[onclick^="switchTab('${tabId}'"]`)?.classList.add('active');
    
    if(tabId === 'dashboard') loadDashboard();
    if(tabId === 'suppliers') renderSuppliersTable();
    if(tabId === 'vendors') renderVendorsTable();
    if(tabId === 'inventory') renderInventoryTable();
    if(tabId === 'sales') loadSales();
    if(tabId === 'purchases') loadPurchases();
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('current-date').innerText = new Date().toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    loadDashboard();
    loadDropdowns();
    loadPurchaseDropdowns();
    document.getElementById('quantity').addEventListener('input', updateSaleTotal);
    document.getElementById('unit_price').addEventListener('input', updateSaleTotal);
});

function updateSaleTotal() {
    const quantity = Number(document.getElementById('quantity').value);
    const pricePerBox = Number(document.getElementById('unit_price').value);
    const total = quantity > 0 && pricePerBox > 0 ? quantity * pricePerBox : 0;
    document.getElementById('sale-total').innerText = `R${total.toFixed(2)}`;
}

async function loadDashboard() {
    try {
        // 1. Get Suppliers
        const supRes = await fetch(`${API_URL}/suppliers`);
        const supData = await supRes.json();
        if(Array.isArray(supData)) {
            cachedSuppliers = supData;
            document.getElementById('stat-suppliers').innerText = supData.length;
        }

        // 2. Get Vendors
        const venRes = await fetch(`${API_URL}/vendors`);
        const venData = await venRes.json();
        if(Array.isArray(venData)) {
            cachedVendors = venData;
            document.getElementById('stat-vendors').innerText = venData.length;
        }

        // 3. Get Stock
        const stockRes = await fetch(`${API_URL}/fruits/stock`);
        const stockData = await stockRes.json();
        
        if(Array.isArray(stockData)) {
            cachedStock = stockData;
            renderStockOverview();
        }
        
    } catch (error) { console.error("Dashboard load error:", error); }
}

async function loadDropdowns() {
    try {
        const frRes = await fetch(`${API_URL}/fruits`);
        const fruitData = await frRes.json();
        cachedFruits = Array.isArray(fruitData) ? fruitData : [];
        
        const venRes = await fetch(`${API_URL}/vendors`);
        const vendors = await venRes.json();

        const venSelect = document.getElementById('vendor_id');
        venSelect.innerHTML = '<option value="">Select Vendor...</option>';
        if(Array.isArray(vendors)) vendors.forEach(v => venSelect.innerHTML += `<option value="${v.vendor_id}">${v.vendor_name}</option>`);
        
        const frSelect = document.getElementById('fruit_id');
        frSelect.innerHTML = '<option value="">Select Fruit...</option>';
        if(Array.isArray(cachedFruits)) cachedFruits.forEach(f => frSelect.innerHTML += `<option value="${f.fruit_id}">${f.fruit_name}</option>`);

        const stockFruitSelect = document.getElementById('stock-increase-fruit');
        if (stockFruitSelect) {
            stockFruitSelect.innerHTML = '<option value="">Select fruit...</option>';
            if (Array.isArray(cachedFruits)) {
                cachedFruits.forEach(fruit => stockFruitSelect.add(new Option(fruit.fruit_name, fruit.fruit_id)));
            }
        }
    } catch(e) { console.error(e); }
}

async function loadPurchaseDropdowns() {
    try {
        const [supplierRes, fruitRes] = await Promise.all([
            fetch(`${API_URL}/suppliers`),
            fetch(`${API_URL}/fruits`)
        ]);
        const suppliers = await supplierRes.json();
        const fruits = await fruitRes.json();
        const supplierSelect = document.getElementById('purchase_supplier_id');
        const fruitSelect = document.getElementById('purchase_fruit_id');

        supplierSelect.innerHTML = '<option value="">Select supplier...</option>';
        fruitSelect.innerHTML = '<option value="">Select fruit...</option>';
        if (Array.isArray(suppliers)) {
            suppliers.forEach(supplier => supplierSelect.add(new Option(supplier.business_name, supplier.supplier_id)));
        }
        if (Array.isArray(fruits)) {
            fruits.forEach(fruit => fruitSelect.add(new Option(fruit.fruit_name, fruit.fruit_id)));
        }
    } catch (error) {
        console.error('Purchase dropdown load error:', error);
    }
}

function formatCurrency(value) {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(Number(value) || 0);
}

function formatPurchaseDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-ZA', {
        day: 'numeric', month: 'short', year: 'numeric'
    });
}

async function loadPurchases() {
    const tbody = document.getElementById('purchases-table-body');
    const count = document.getElementById('purchase-count');
    tbody.innerHTML = '<tr><td colspan="7" class="table-state">Loading purchase history…</td></tr>';
    try {
        const response = await fetch(`${API_URL}/purchases`);
        const purchases = await response.json();
        if (!response.ok) throw new Error(purchases.error || 'Unable to load purchases');

        count.textContent = `${purchases.length} ${purchases.length === 1 ? 'purchase' : 'purchases'}`;
        if (purchases.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="table-state">No purchases yet. Record a delivery above to get started.</td></tr>';
            return;
        }

        tbody.innerHTML = purchases.map(purchase => `
            <tr class="purchase-row" tabindex="0" role="button" aria-label="View purchase #${purchase.purchase_id} from ${escapeHtml(purchase.supplier_name)}" onclick="showPurchaseDetails(${purchase.purchase_id}, this)" onkeydown="if(event.key === 'Enter' || event.key === ' '){event.preventDefault(); showPurchaseDetails(${purchase.purchase_id}, this)}">
                <td><strong>#${purchase.purchase_id}</strong></td>
                <td>${escapeHtml(formatPurchaseDate(purchase.purchase_date))}</td>
                <td>${escapeHtml(purchase.supplier_name)}</td>
                <td>${Number(purchase.total_boxes)}</td>
                <td class="purchase-amount">${formatCurrency(purchase.total_amount)}</td>
                <td>${renderPurchaseStatusButton(purchase.purchase_id)}</td>
                <td class="row-hint">View details <span aria-hidden="true">↗</span></td>
            </tr>
        `).join('');
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="7" class="table-state error-state">${escapeHtml(error.message)}</td></tr>`;
    }
}

function readPurchasePaymentStatuses() {
    try {
        const statuses = JSON.parse(localStorage.getItem(LOCAL_PURCHASE_STATUS_KEY) || '{}');
        return statuses && typeof statuses === 'object' && !Array.isArray(statuses) ? statuses : {};
    } catch (error) {
        console.warn('Unable to read purchase payment statuses:', error);
        return {};
    }
}

function isPurchasePaid(purchaseId) {
    return readPurchasePaymentStatuses()[String(purchaseId)] === 'PAID';
}

function renderPurchaseStatusButton(purchaseId) {
    const paid = isPurchasePaid(purchaseId);
    const status = paid ? 'PAID' : 'UNPAID';
    return `<button type="button" class="purchase-status-button ${paid ? 'is-paid' : 'is-unpaid'}" aria-label="Mark purchase #${Number(purchaseId)} ${paid ? 'unpaid' : 'paid'}" aria-pressed="${paid}" onclick="togglePurchasePaid(${Number(purchaseId)}, event)">${status}</button>`;
}

function togglePurchasePaid(purchaseId, event) {
    event.stopPropagation();
    const statuses = readPurchasePaymentStatuses();
    const key = String(purchaseId);
    if (statuses[key] === 'PAID') delete statuses[key];
    else statuses[key] = 'PAID';
    try {
        localStorage.setItem(LOCAL_PURCHASE_STATUS_KEY, JSON.stringify(statuses));
        event.currentTarget.outerHTML = renderPurchaseStatusButton(purchaseId);
        const selectedRow = document.querySelector(`.purchase-row[aria-label^="View purchase #${Number(purchaseId)} "]`);
        const detail = document.getElementById('purchase-detail');
        if (selectedRow?.classList.contains('selected') && !detail.hidden) showPurchaseDetails(purchaseId, selectedRow);
    } catch (error) {
        console.error('Unable to save purchase status in this browser:', error);
    }
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
}

async function showPurchaseDetails(purchaseId, selectedRow) {
    const detail = document.getElementById('purchase-detail');
    document.querySelectorAll('.purchase-row').forEach(row => row.classList.remove('selected'));
    selectedRow.classList.add('selected');
    detail.hidden = false;
    detail.innerHTML = '<p class="table-state">Loading purchase details…</p>';
    try {
        const response = await fetch(`${API_URL}/purchases/${purchaseId}`);
        const purchase = await response.json();
        if (!response.ok) throw new Error(purchase.error || 'Unable to load purchase details');

        const itemRows = purchase.items.length ? purchase.items.map(item => `
            <tr>
                <td>${escapeHtml(item.fruit_name)}</td>
                <td>${escapeHtml(String(item.packaging_size).toLowerCase())}</td>
                <td>${Number(item.quantity)}</td>
                <td>${formatCurrency(item.unit_cost)}</td>
                <td>${formatCurrency(item.line_total)}</td>
            </tr>
        `).join('') : '<tr><td colspan="5" class="table-state">No item details were saved for this purchase.</td></tr>';

        detail.innerHTML = `
            <div class="detail-heading">
                <div>
                    <span class="eyebrow">Purchase detail</span>
                    <h3>Purchase #${purchase.purchase_id}</h3>
                    <p>${escapeHtml(purchase.supplier_name)} <span class="detail-divider">·</span> ${escapeHtml(formatPurchaseDate(purchase.purchase_date))}</p>
                </div>
                <div class="detail-total"><span>Total cost</span><strong>${formatCurrency(purchase.total_amount)}</strong></div>
            </div>
            <div class="purchase-detail-status"><span>Payment status</span>${renderPurchaseStatusButton(purchase.purchase_id)}</div>
            <div class="detail-contact">${purchase.contact_person ? `Supplier contact: ${escapeHtml(purchase.contact_person)}${purchase.phone ? ` · ${escapeHtml(purchase.phone)}` : ''}` : ''}</div>
            <div class="table-container detail-table-wrap">
                <table>
                    <thead><tr><th>Fruit</th><th>Size</th><th>Boxes</th><th>Cost / box</th><th>Line total</th></tr></thead>
                    <tbody>${itemRows}</tbody>
                </table>
            </div>
        `;
        detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (error) {
        detail.innerHTML = `<p class="error-state">${escapeHtml(error.message)}</p>`;
    }
}

async function loadSales() {
    const tbody = document.getElementById('sales-table-body');
    const count = document.getElementById('sale-count');
    tbody.innerHTML = '<tr><td colspan="6" class="table-state">Loading sales history…</td></tr>';
    try {
        const response = await fetch(`${API_URL}/sales`);
        const sales = await response.json();
        if (!response.ok) throw new Error(sales.error || 'Unable to load sales');

        count.textContent = `${sales.length} ${sales.length === 1 ? 'sale' : 'sales'}`;
        if (sales.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="table-state">No sales recorded yet.</td></tr>';
            return;
        }

        tbody.innerHTML = sales.map(sale => `
                <tr class="sale-row" tabindex="0" role="button" aria-label="View sale #${sale.sale_id} to ${escapeHtml(sale.vendor_name)}" onclick="showSaleDetails(${sale.sale_id}, this)" onkeydown="if(event.key === 'Enter' || event.key === ' '){event.preventDefault(); showSaleDetails(${sale.sale_id}, this)}">
                    <td><strong>#${sale.sale_id}</strong></td>
                    <td>${escapeHtml(formatPurchaseDate(sale.sale_date))}</td>
                    <td>${escapeHtml(sale.vendor_name)}</td>
                    <td>${Number(sale.total_boxes)}</td>
                    <td class="purchase-amount">${formatCurrency(sale.total_amount)}</td>
                    <td class="row-hint">View details <span aria-hidden="true">↗</span></td>
                </tr>
        `).join('');
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="6" class="table-state error-state">${escapeHtml(error.message)}</td></tr>`;
    }
}

async function showSaleDetails(saleId, selectedRow) {
    const detail = document.getElementById('sale-detail');
    document.querySelectorAll('.sale-row').forEach(row => row.classList.remove('selected'));
    selectedRow.classList.add('selected');
    detail.hidden = false;
    detail.innerHTML = '<p class="table-state">Loading sale details…</p>';
    try {
        const response = await fetch(`${API_URL}/sales/${saleId}`);
        const sale = await response.json();
        if (!response.ok) throw new Error(sale.error || 'Unable to load sale details');

        const itemRows = sale.items.length ? sale.items.map(item => `
            <tr>
                <td>${escapeHtml(item.fruit_name)}</td>
                <td>${escapeHtml(String(item.packaging_size).toLowerCase())}</td>
                <td>${Number(item.quantity)}</td>
                <td>${formatCurrency(item.unit_price)}</td>
                <td>${formatCurrency(item.line_total)}</td>
            </tr>
        `).join('') : '<tr><td colspan="5" class="table-state">No item details were saved for this sale.</td></tr>';
        detail.innerHTML = `
            <div class="detail-heading">
                <div>
                    <span class="eyebrow">Sale detail</span>
                    <h3>Sale #${sale.sale_id}</h3>
                    <p>${escapeHtml(sale.vendor_name)} <span class="detail-divider">·</span> ${escapeHtml(formatPurchaseDate(sale.sale_date))}</p>
                    <p>${escapeHtml(sale.phone_number || '')}${sale.location ? ` · ${escapeHtml(sale.location)}` : ''}</p>
                </div>
                <div class="detail-total"><span>Total sale</span><strong>${formatCurrency(sale.total_amount)}</strong></div>
            </div>
            <div class="table-container detail-table-wrap">
                <table>
                    <thead><tr><th>Fruit</th><th>Size</th><th>Boxes</th><th>Price / box</th><th>Line total</th></tr></thead>
                    <tbody>${itemRows}</tbody>
                </table>
            </div>
        `;
        detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (error) {
        detail.innerHTML = `<p class="error-state">${escapeHtml(error.message)}</p>`;
    }
}

function updatePurchaseTotal() {
    const quantity = Number(document.getElementById('purchase_quantity').value);
    const unitCost = Number(document.getElementById('purchase_unit_cost').value);
    const total = quantity > 0 && unitCost > 0 ? quantity * unitCost : 0;
    document.getElementById('purchase-total').textContent = formatCurrency(total);
}

document.getElementById('purchase_quantity').addEventListener('input', updatePurchaseTotal);
document.getElementById('purchase_unit_cost').addEventListener('input', updatePurchaseTotal);

async function submitPurchase(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const message = document.getElementById('purchase-form-message');
    const submitButton = form.querySelector('button[type="submit"]');
    const payload = {
        supplier_id: Number(document.getElementById('purchase_supplier_id').value),
        items: [{
            fruit_id: Number(document.getElementById('purchase_fruit_id').value),
            packaging_size: document.getElementById('purchase_packaging_size').value,
            quantity: Number(document.getElementById('purchase_quantity').value),
            unit_cost: Number(document.getElementById('purchase_unit_cost').value)
        }]
    };

    submitButton.disabled = true;
    message.textContent = 'Saving purchase…';
    message.className = 'form-message';
    try {
        const response = await fetch(`${API_URL}/purchases`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Unable to save purchase');

        message.textContent = `Purchase #${result.purchase_id} saved · ${formatCurrency(result.total_amount)}`;
        message.classList.add('success-state');
        form.reset();
        updatePurchaseTotal();
        await Promise.all([loadPurchases(), loadDashboard()]);
    } catch (error) {
        message.textContent = error.message;
        message.classList.add('error-state');
    } finally {
        submitButton.disabled = false;
    }
}

document.getElementById('purchase-form').addEventListener('submit', submitPurchase);

// Renderers
function renderSuppliersTable() {
    const tbody = document.getElementById('suppliers-table-body');
    tbody.innerHTML = '';
    cachedSuppliers.forEach(s => {
        tbody.innerHTML += `
            <tr>
                <td><strong>${s.business_name}</strong></td>
                <td>${s.contact_person}</td>
                <td>${s.phone}</td>
                <td>${s.province}</td>
                <td>
                    <button class="btn-icon" onclick="editSupplier(${s.supplier_id})">✏️</button>
                    <button class="btn-icon" onclick="deleteItem('suppliers', ${s.supplier_id})">🗑️</button>
                </td>
            </tr>
        `;
    });
}

function renderVendorsTable() {
    const tbody = document.getElementById('vendors-table-body');
    tbody.innerHTML = '';
    cachedVendors.forEach(v => {
        tbody.innerHTML += `
            <tr>
                <td><strong>${v.vendor_name}</strong></td>
                <td>${v.phone_number}</td>
                <td>${v.location}</td>
                <td>
                    <button class="btn-icon" onclick="editVendor(${v.vendor_id})">✏️</button>
                    <button class="btn-icon" onclick="deleteItem('vendors', ${v.vendor_id})">🗑️</button>
                </td>
            </tr>
        `;
    });
}

async function renderInventoryTable() {
    const tbody = document.getElementById('stock-table-body');
    tbody.innerHTML = '<tr><td colspan="4" class="table-state">Loading inventory…</td></tr>';
    try {
        const response = await fetch(`${API_URL}/fruits/stock`);
        const stock = await response.json();
        if (!response.ok || !Array.isArray(stock)) throw new Error(stock.error || 'Unable to load inventory');
        cachedStock = stock;
        renderStockOverview();
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="4" class="table-state error-state">${escapeHtml(error.message)}</td></tr>`;
    }
}

function readLocalStockIncreases() {
    try {
        const saved = JSON.parse(localStorage.getItem(LOCAL_STOCK_KEY) || '[]');
        if (Array.isArray(saved)) return saved;
        if (!saved || typeof saved !== 'object') return [];
        return Object.values(saved).map(item => ({
            ...item,
            added_at: item.added_at || null
        }));
    } catch (error) {
        console.warn('Unable to read browser-only stock increases:', error);
        return [];
    }
}

function getDisplayedStock() {
    const displayed = cachedStock.map(item => ({
        ...item,
        available_quantity: Number(item.available_quantity) || 0
    }));
    const stockByKey = new Map(displayed.map(item => [`${item.fruit_id}:${String(item.packaging_size).toUpperCase()}`, item]));

    for (const adjustment of readLocalStockIncreases()) {
        const quantity = Number(adjustment?.quantity);
        const fruitId = Number(adjustment?.fruit_id);
        const packagingSize = String(adjustment?.packaging_size || '').toUpperCase();
        if (!Number.isSafeInteger(quantity) || quantity <= 0 || !Number.isSafeInteger(fruitId) || !['SMALL', 'MEDIUM', 'LARGE'].includes(packagingSize)) continue;
        const key = `${fruitId}:${packagingSize}`;
        let item = stockByKey.get(key);
        if (!item) {
            item = {
                fruit_id: Number(adjustment.fruit_id),
                fruit_name: adjustment.fruit_name || 'Unknown fruit',
                packaging_size: adjustment.packaging_size,
                available_quantity: 0
            };
            displayed.push(item);
            stockByKey.set(key, item);
        }
        item.available_quantity += quantity;
    }
    return displayed;
}

function renderStockOverview() {
    const stock = getDisplayedStock();
    const totalBoxes = stock.reduce((total, item) => total + (Number(item.available_quantity) || 0), 0);
    const totalElement = document.getElementById('stat-stock');
    if (totalElement) totalElement.innerText = totalBoxes;
    renderStockChart(stock);
    renderStockTable(stock);
    renderStockAdditionHistory();
}

function renderStockTable(stock) {
    const tbody = document.getElementById('stock-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    const grouped = {};
    cachedFruits.forEach(fruit => {
        grouped[fruit.fruit_name] = { SMALL: 0, MEDIUM: 0, LARGE: 0 };
    });
    stock.forEach(item => {
        if(!grouped[item.fruit_name]) grouped[item.fruit_name] = { SMALL: 0, MEDIUM: 0, LARGE: 0 };
        grouped[item.fruit_name][String(item.packaging_size).toUpperCase()] = Number(item.available_quantity) || 0;
    });

    for(const [fruit, sizes] of Object.entries(grouped)) {
        const getBadge = (qty) => qty < 10 ? `<span class="badge badge-danger">${qty}</span>` : `<span class="badge badge-success">${qty}</span>`;
        tbody.innerHTML += `
            <tr>
                <td><strong>${fruit}</strong></td>
                <td>${getBadge(sizes.SMALL)}</td>
                <td>${getBadge(sizes.MEDIUM)}</td>
                <td>${getBadge(sizes.LARGE)}</td>
            </tr>
        `;
    }
}

function renderStockAdditionHistory() {
    const tbody = document.getElementById('stock-additions-table-body');
    if (!tbody) return;
    const additions = readLocalStockIncreases().slice().reverse();
    if (!additions.length) {
        tbody.innerHTML = '<tr><td colspan="4" class="table-state">No stock additions recorded yet.</td></tr>';
        return;
    }
    tbody.innerHTML = additions.map(addition => {
        const addedAt = addition.added_at ? new Date(addition.added_at) : null;
        const dateLabel = addedAt && !Number.isNaN(addedAt.getTime())
            ? addedAt.toLocaleString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
            : 'Earlier addition';
        return `<tr><td>${escapeHtml(dateLabel)}</td><td>${escapeHtml(addition.fruit_name || 'Fruit')}</td><td>${escapeHtml(String(addition.packaging_size || '').toLowerCase())}</td><td>${Number(addition.quantity) || 0}</td></tr>`;
    }).join('');
}

function openStockModal() {
    const overlay = document.getElementById('stock-modal-overlay');
    document.getElementById('stock-increase-message').textContent = '';
    document.getElementById('stock-increase-message').className = 'form-message';
    overlay.classList.add('active');
    document.getElementById('stock-increase-fruit').focus();
}

function closeStockModal() {
    document.getElementById('stock-modal-overlay').classList.remove('active');
}

document.getElementById('stock-increase-form').addEventListener('submit', event => {
    event.preventDefault();
    const fruitId = Number(document.getElementById('stock-increase-fruit').value);
    const packagingSize = document.getElementById('stock-increase-size').value;
    const quantity = Number(document.getElementById('stock-increase-quantity').value);
    const fruit = cachedFruits.find(item => Number(item.fruit_id) === fruitId);
    const message = document.getElementById('stock-increase-message');
    if (!fruit || !['SMALL', 'MEDIUM', 'LARGE'].includes(packagingSize) || !Number.isSafeInteger(quantity) || quantity <= 0) {
        message.textContent = 'Select a fruit and packaging size, then enter a whole number greater than zero.';
        message.className = 'form-message error-state';
        return;
    }

    try {
        const increases = readLocalStockIncreases();
        increases.push({
            fruit_id: fruitId,
            fruit_name: fruit.fruit_name,
            packaging_size: packagingSize,
            quantity,
            added_at: new Date().toISOString()
        });
        localStorage.setItem(LOCAL_STOCK_KEY, JSON.stringify(increases));
        event.currentTarget.reset();
        renderStockOverview();
        closeStockModal();
    } catch (error) {
        message.textContent = error.message || 'This browser could not save the stock adjustment.';
        message.className = 'form-message error-state';
    }
});

function renderStockChart(stock) {
    const ctx = document.getElementById('stockChart').getContext('2d');
    if (chartInstance) chartInstance.destroy(); 
    
    const chartData = {};
    stock.forEach(item => {
        if (!chartData[item.fruit_name]) chartData[item.fruit_name] = 0;
        chartData[item.fruit_name] += item.available_quantity;
    });

    Chart.defaults.color = '#94a3b8';
    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(chartData),
            datasets: [{
                label: 'Boxes in Stock',
                data: Object.values(chartData),
                backgroundColor: 'rgba(59, 130, 246, 0.6)',
                borderColor: '#3b82f6',
                borderWidth: 1, borderRadius: 6,
                hoverBackgroundColor: 'rgba(139, 92, 246, 0.8)'
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            animation: { duration: 1000, easing: 'easeOutQuart' },
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
                x: { grid: { display: false } }
            }
        }
    });
}

// Modal Logic
function openModal(type, data = null) {
    currentModalType = type;
    const overlay = document.getElementById('modal-overlay');
    const title = document.getElementById('modal-title');
    const fields = document.getElementById('modal-form-fields');
    
    overlay.classList.add('active');
    fields.innerHTML = '';
    document.getElementById('edit-id').value = data ? (data.supplier_id || data.vendor_id) : '';

    if(type === 'supplier') {
        title.innerText = data ? 'Edit Supplier' : 'Add New Supplier';
        fields.innerHTML = `
            <div class="form-group"><label>Business Name</label><input type="text" id="m_bname" value="${data ? data.business_name : ''}" required></div>
            <div class="form-group"><label>Contact Person</label><input type="text" id="m_contact" value="${data ? data.contact_person : ''}" required></div>
            <div class="form-group"><label>Phone</label><input type="text" id="m_phone" value="${data ? data.phone : ''}" required></div>
            <div class="form-group">
                <label>Province</label>
                <select id="m_prov" required>
                    <option value="Gauteng" ${data && data.province === 'Gauteng' ? 'selected' : ''}>Gauteng</option>
                    <option value="Free State" ${data && data.province === 'Free State' ? 'selected' : ''}>Free State</option>
                    <option value="KwaZulu-Natal" ${data && data.province === 'KwaZulu-Natal' ? 'selected' : ''}>KwaZulu-Natal</option>
                    <option value="Western Cape" ${data && data.province === 'Western Cape' ? 'selected' : ''}>Western Cape</option>
                    <option value="Eastern Cape" ${data && data.province === 'Eastern Cape' ? 'selected' : ''}>Eastern Cape</option>
                    <option value="Limpopo" ${data && data.province === 'Limpopo' ? 'selected' : ''}>Limpopo</option>
                    <option value="Mpumalanga" ${data && data.province === 'Mpumalanga' ? 'selected' : ''}>Mpumalanga</option>
                    <option value="North West" ${data && data.province === 'North West' ? 'selected' : ''}>North West</option>
                </select>
            </div>
            <div class="form-group"><label>Address</label><input type="text" id="m_addr" value="${data ? data.address : ''}" required></div>
        `;
    } else if(type === 'vendor') {
        title.innerText = data ? 'Edit Vendor' : 'Add New Vendor';
        fields.innerHTML = `
            <div class="form-group"><label>Vendor Name</label><input type="text" id="m_vname" value="${data ? data.vendor_name : ''}" required></div>
            <div class="form-group"><label>Phone</label><input type="text" id="m_vphone" value="${data ? data.phone_number : ''}" required></div>
            <div class="form-group"><label>Location</label><input type="text" id="m_vloc" value="${data ? data.location : ''}" required></div>
        `;
    }
}

function closeModal() { document.getElementById('modal-overlay').classList.remove('active'); }

function editSupplier(id) {
    const s = cachedSuppliers.find(x => x.supplier_id === id);
    if(s) openModal('supplier', s);
}

function editVendor(id) {
    const v = cachedVendors.find(x => x.vendor_id === id);
    if(v) openModal('vendor', v);
}

// Form Submissions
document.getElementById('modal-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-id').value;
    const isEdit = id !== '';
    let url = '', payload = {};

    if(currentModalType === 'supplier') {
        url = isEdit ? `${API_URL}/suppliers/${id}` : `${API_URL}/suppliers`;
        payload = {
            business_name: document.getElementById('m_bname').value,
            contact_person: document.getElementById('m_contact').value,
            phone: document.getElementById('m_phone').value,
            province: document.getElementById('m_prov').value,
            address: document.getElementById('m_addr').value
        };
    } else if(currentModalType === 'vendor') {
        url = isEdit ? `${API_URL}/vendors/${id}` : `${API_URL}/vendors`;
        payload = {
            vendor_name: document.getElementById('m_vname').value,
            phone_number: document.getElementById('m_vphone').value,
            location: document.getElementById('m_vloc').value
        };
    }

    try {
        const res = await fetch(url, {
            method: isEdit ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (res.ok) {
            closeModal();
            loadDashboard();
            if(currentModalType === 'supplier') renderSuppliersTable();
            if(currentModalType === 'vendor') { renderVendorsTable(); loadDropdowns(); }
        } else {
            const errData = await res.json();
            alert('Failed to save: ' + (errData.error || 'Check console.'));
        }
    } catch(e) { console.error(e); }
});

async function deleteItem(endpoint, id) {
    if(!confirm('Are you sure you want to delete this? This cannot be undone.')) return;
    try {
        const res = await fetch(`${API_URL}/${endpoint}/${id}`, { method: 'DELETE' });
        if(res.ok) {
            loadDashboard();
            if(endpoint === 'suppliers') renderSuppliersTable();
            if(endpoint === 'vendors') { renderVendorsTable(); loadDropdowns(); }
        } else {
            alert('Failed to delete. It might be linked to other records.');
        }
    } catch(e) { console.error(e); }
}

// Process Sale
document.getElementById('sale-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msgBox = document.getElementById('form-message');
    msgBox.innerHTML = '<span style="color:yellow;">Processing...</span>';

    const payload = {
        vendor_id: document.getElementById('vendor_id').value,
        payment_method: 'CASH',
        amount_paid: 0,
        items: [{
            fruit_id: document.getElementById('fruit_id').value,
            quantity: parseInt(document.getElementById('quantity').value),
            unit_price: parseFloat(document.getElementById('unit_price').value),
            packaging_size: document.getElementById('packaging_size').value
        }]
    };

    try {
        const response = await fetch(`${API_URL}/sales`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json();

        if (response.ok) {
            msgBox.innerHTML = `<span style="color:var(--success);"> Sale Recorded! Total: R${data.total_amount}</span>`;
            document.getElementById('sale-form').reset();
            updateSaleTotal();
            await Promise.all([loadDashboard(), loadSales()]);
        } else {
            msgBox.innerHTML = `<span style="color:var(--danger);"> ${data.error}</span>`;
        }
    } catch (error) {
        msgBox.innerHTML = `<span style="color:var(--danger);"> Server Error.</span>`;
    }
});