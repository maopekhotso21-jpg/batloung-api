const API_URL = '/api';
let chartInstance = null;
let currentModalType = '';
let cachedSuppliers = [];
let cachedVendors = [];
let cachedFruits = [];

// Switch Tabs
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('nav a').forEach(link => link.classList.remove('active'));
    
    document.getElementById(`tab-${tabId}`).classList.add('active');
    event.target.classList.add('active');
    
    if(tabId === 'dashboard') loadDashboard();
    if(tabId === 'suppliers') renderSuppliersTable();
    if(tabId === 'vendors') renderVendorsTable();
    if(tabId === 'inventory') renderInventoryTable();
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('current-date').innerText = new Date().toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    loadDashboard();
    loadDropdowns();
});

async function loadDashboard() {
    try {
        const supRes = await fetch(`${API_URL}/suppliers`);
        const supData = await supRes.json();
        if(Array.isArray(supData)) {
            cachedSuppliers = supData;
            document.getElementById('stat-suppliers').innerText = supData.length;
        }

        const venRes = await fetch(`${API_URL}/vendors`);
        const venData = await venRes.json();
        if(Array.isArray(venData)) {
            cachedVendors = venData;
            document.getElementById('stat-vendors').innerText = venData.length;
        }

        const stockRes = await fetch(`${API_URL}/fruits/stock`);
        const stockData = await stockRes.json();
        if(Array.isArray(stockData)) renderStockChart(stockData);
        
    } catch (error) { console.error(error); }
}

async function loadDropdowns() {
    try {
        const frRes = await fetch(`${API_URL}/fruits`);
        cachedFruits = await frRes.json();
        
        const venRes = await fetch(`${API_URL}/vendors`);
        const vendors = await venRes.json();

        const venSelect = document.getElementById('vendor_id');
        venSelect.innerHTML = '<option value="">Select Vendor...</option>';
        if(Array.isArray(vendors)) vendors.forEach(v => venSelect.innerHTML += `<option value="${v.vendor_id}">${v.vendor_name}</option>`);
        
        const frSelect = document.getElementById('fruit_id');
        frSelect.innerHTML = '<option value="">Select Fruit...</option>';
        if(Array.isArray(cachedFruits)) cachedFruits.forEach(f => frSelect.innerHTML += `<option value="${f.fruit_id}">${f.fruit_name}</option>`);
    } catch(e) { console.error(e); }
}

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
    tbody.innerHTML = '';
    const res = await fetch(`${API_URL}/fruits/stock`);
    const stock = await res.json();
    
    // Group by fruit
    const grouped = {};
    stock.forEach(item => {
        if(!grouped[item.fruit_name]) grouped[item.fruit_name] = { SMALL: 0, MEDIUM: 0, LARGE: 0 };
        grouped[item.fruit_name][item.packaging_size] = item.available_quantity;
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
            <div class="form-group"><label>Province</label><input type="text" id="m_prov" value="${data ? data.province : ''}" required></div>
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
            alert('Failed to save. Check console.');
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
            loadDashboard();
        } else {
            msgBox.innerHTML = `<span style="color:var(--danger);"> ${data.error}</span>`;
        }
    } catch (error) {
        msgBox.innerHTML = `<span style="color:var(--danger);"> Server Error.</span>`;
    }
});