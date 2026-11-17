    // Render Chart.js with Animations & Tooltips
    const ctx = document.getElementById('stockChart').getContext('2d');
    if (chartInstance) chartInstance.destroy(); // Destroy old chart if reloading
    
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
                hoverBackgroundColor: 'rgba(139, 92, 246, 0.8)', // Purple on hover
                hoverBorderColor: 'rgba(139, 92, 246, 1)'
            }]
        },
        options: {
            responsive: true,
            animation: {
                duration: 1500, // Smooth slow load
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