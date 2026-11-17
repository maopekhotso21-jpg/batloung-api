const API_URL = '/api';
let chartInstance = null;

// Switch Tabs
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('nav a').forEach(link => link.classList.remove('active'));
    
    document.getElementById(`tab-${tabId}`).classList.add('active');
    event.target.classList.add('active');
}

// Load Dashboard Data
async function loadDashboard() {
    try {
        // Load Suppliers
        const supRes = await fetch(`${API_URL}/suppliers`);
        const suppliers = await supRes.json();
        document.getElementById('stat-suppliers').innerText = suppliers.length;

        // Load Vendors & Populate Form Dropdown
        const venRes = await fetch(`${API_URL}/vendors`);
        const vendors = await venRes.json();
        document.getElementById('stat-vendors').innerText = vendors.length;
        const vendorSelect = document.getElementById('vendor_id');
        vendorSelect.innerHTML = '<option value="">Select Vendor...</option>'; // Reset options
        vendors.forEach(v => {
            vendorSelect.innerHTML += `<option value="${v.vendor_id}">${v.vendor_name}</option>`;
        });

        // Load Fruits & Populate Form Dropdown
        const fruitRes = await fetch(`${API_URL}/fruits`);
        const fruits = await fruitRes.json();
        const fruitSelect = document.getElementById('fruit_id');
        fruitSelect.innerHTML = '<option value="">Select Fruit...</option>'; // Reset options
        fruits.forEach(f => {
            fruitSelect.innerHTML += `<option value="${f.fruit_id}">${f.fruit_name}</option>`;
        });

        // Load Stock
        const stockRes = await fetch(`${API_URL}/fruits/stock`);
        const stock = await stockRes.json();
        renderStock(stock);
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// Render Stock Table & Chart
function renderStock(stock) {
    const tbody = document.getElementById('stock-body');
    tbody.innerHTML = '';
    
    let totalStock = 0;
    const chartData = {};

    stock.forEach(item => {
        totalStock += item.available_quantity;
        
        // Chart data accumulation
        if (!chartData[item.fruit_name]) chartData[item.fruit_name] = 0;
        chartData[item.fruit_name] += item.available_quantity;

        // Table rows
        const isLow = item.available_quantity < 10;
        const badge = isLow 
            ? '<span class="badge badge-danger">Low Stock</span>' 
            : '<span class="badge badge-success">In Stock</span>';

        tbody.innerHTML += `
            <tr>
                <td>${item.fruit_name}</td>
                <td>${item.packaging_size}</td>
                <td>${item.available_quantity}</td>
                <td>${badge}</td>
            </tr>
        `;
    });

    document.getElementById('stat-stock').innerText = totalStock;

    // Render Chart.js with Animations & Tooltips
    const ctx = document.getElementById('stockChart').getContext('2d');
    if (chartInstance) chartInstance.destroy(); 
    
    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(chartData),
            datasets: [{
                label: 'Total Boxes',
                data: Object.values(chartData),
                backgroundColor: 'rgba(56, 189, 248, 0.7)',
                borderColor: 'rgba(56, 189, 248, 1)',
                borderWidth: 2,
                borderRadius: 8,
                hoverBackgroundColor: 'rgba(139, 92, 246, 0.8)',
                hoverBorderColor: 'rgba(139, 92, 246, 1)'
            }]
        },
        options: {
            responsive: true,
            animation: {
                duration: 1500, 
                easing: 'easeOutQuart'
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#38bdf8',
                    bodyColor: '#f8fafc',
                    borderColor: 'rgba(56, 189, 248, 0.3)',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return ` ${context.parsed.y} Boxes in Stock`;
                        }
                    }
                }
            },
            scales: {
                y: { 
                    beginAtZero: true, 
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#94a3b8' }
                },
                x: { 
                    grid: { display: false },
                    ticks: { color: '#94a3b8' }
                }
            }
        }
    });
}

// Handle Sale Form Submission
document.getElementById('sale-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msgBox = document.getElementById('form-message');
    msgBox.innerHTML = '<span style="color:yellow;">Processing...</span>';

    const payload = {
        vendor_id: document.getElementById('vendor_id').value,
        payment_method: document.getElementById('payment_method').value,
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
            msgBox.innerHTML = `<span style="color:var(--success);">✅ Sale Recorded! Total: R${data.total_amount}</span>`;
            document.getElementById('sale-form').reset();
            loadDashboard(); // Refresh data to show updated stock
        } else {
            msgBox.innerHTML = `<span style="color:var(--danger);">❌ ${data.error}</span>`;
        }
    } catch (error) {
        msgBox.innerHTML = `<span style="color:var(--danger);">❌ Server Error.</span>`;
    }
});

// Initialize on Load
document.addEventListener('DOMContentLoaded', loadDashboard);