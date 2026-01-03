/**
 * Chart Configuration for Taiwan Stock Backtesting System
 * 使用 Chart.js 繪製圖表
 */

let signalChart = null;
let mddChart = null;
let trendChart = null;

// Initialize the signal trend chart
function initSignalChart() {
    const ctx = document.getElementById('signalChart').getContext('2d');
    const { dates, signals } = window.appData.generateSignalData();

    const backgroundColors = signals.map(s =>
        s === 1 ? 'rgba(16, 185, 129, 0.8)' : 'rgba(244, 63, 94, 0.8)'
    );
    const borderColors = signals.map(s =>
        s === 1 ? 'rgb(16, 185, 129)' : 'rgb(244, 63, 94)'
    );

    signalChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dates,
            datasets: [{
                label: '多空信號',
                data: signals,
                backgroundColor: backgroundColors,
                borderColor: borderColors,
                borderWidth: 1,
                borderRadius: 2,
                barPercentage: 0.9,
                categoryPercentage: 0.95
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    titleColor: '#fff',
                    bodyColor: '#94a3b8',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    padding: 12,
                    callbacks: {
                        label: function (context) {
                            return context.raw === 1 ? '📈 建議做多' : '📉 建議做空';
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: {
                        color: '#64748b',
                        maxRotation: 45,
                        font: { size: 10 },
                        callback: function (value, index) {
                            return index % 10 === 0 ? this.getLabelForValue(value) : '';
                        }
                    }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: {
                        color: '#64748b',
                        callback: function (value) {
                            if (value === 1) return '做多';
                            if (value === -1) return '做空';
                            return '';
                        },
                        stepSize: 1
                    },
                    min: -1.5,
                    max: 1.5
                }
            },
            animation: { duration: 1000, easing: 'easeOutQuart' }
        }
    });

    return signalChart;
}

// Initialize the market trend chart (3yr/5yr/10yr)
function initTrendChart(years = 5) {
    const ctx = document.getElementById('trendChart').getContext('2d');
    const { dates, prices, maValues } = window.appData.generateTrendData(years);

    // Destroy existing chart if any
    if (trendChart) {
        trendChart.destroy();
    }

    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [
                {
                    label: '加權指數',
                    data: prices,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                    tension: 0.1,
                    pointRadius: 0,
                    borderWidth: 2
                },
                {
                    label: 'MA 均線',
                    data: maValues,
                    borderColor: '#f59e0b',
                    backgroundColor: 'transparent',
                    fill: false,
                    tension: 0.1,
                    pointRadius: 0,
                    borderWidth: 2,
                    borderDash: [5, 5]
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    titleColor: '#fff',
                    bodyColor: '#94a3b8',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    callbacks: {
                        label: function (context) {
                            const value = context.raw;
                            if (value === null) return '';
                            return context.dataset.label + ': ' + value.toFixed(2);
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: {
                        color: '#64748b',
                        maxRotation: 45,
                        font: { size: 10 },
                        callback: function (value, index, values) {
                            // Show fewer labels based on data density
                            const totalLabels = values.length;
                            const step = Math.ceil(totalLabels / 12);
                            return index % step === 0 ? this.getLabelForValue(value) : '';
                        }
                    }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: {
                        color: '#64748b',
                        callback: function (value) {
                            return value.toLocaleString();
                        }
                    }
                }
            },
            animation: { duration: 1000, easing: 'easeOutQuart' }
        }
    });

    return trendChart;
}

// Initialize the MDD chart
function initMddChart() {
    const ctx = document.getElementById('mddChart').getContext('2d');
    const { dates, mddValues } = window.appData.generateMddData();

    if (mddChart) {
        mddChart.destroy();
    }

    mddChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: '最大回撤 (%)',
                data: mddValues,
                borderColor: 'rgb(244, 63, 94)',
                backgroundColor: 'rgba(244, 63, 94, 0.1)',
                fill: true,
                tension: 0.3,
                pointRadius: 0,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { intersect: false, mode: 'index' },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    titleColor: '#fff',
                    bodyColor: '#f43f5e',
                    cornerRadius: 8,
                    callbacks: {
                        label: function (context) {
                            return '回撤: ' + context.raw.toFixed(2) + '%';
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: {
                        color: '#64748b',
                        font: { size: 10 },
                        callback: function (value, index) {
                            return index % 12 === 0 ? this.getLabelForValue(value) : '';
                        }
                    }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: {
                        color: '#64748b',
                        callback: function (value) { return value.toFixed(0) + '%'; }
                    },
                    max: 0,
                    min: -30
                }
            },
            animation: { duration: 1200, easing: 'easeOutQuart' }
        }
    });

    return mddChart;
}

// Update signal chart
function updateSignalChart() {
    if (signalChart) {
        const { dates, signals } = window.appData.generateSignalData();
        signalChart.data.labels = dates;
        signalChart.data.datasets[0].data = signals;
        signalChart.data.datasets[0].backgroundColor = signals.map(s =>
            s === 1 ? 'rgba(16, 185, 129, 0.8)' : 'rgba(244, 63, 94, 0.8)'
        );
        signalChart.update('active');
    }
}

// Update MDD chart
function updateMddChart() {
    if (mddChart) {
        const { dates, mddValues } = window.appData.generateMddData();
        mddChart.data.labels = dates;
        mddChart.data.datasets[0].data = mddValues;
        mddChart.update('active');
    }
}

// Destroy all charts
function destroyCharts() {
    if (signalChart) { signalChart.destroy(); signalChart = null; }
    if (mddChart) { mddChart.destroy(); mddChart = null; }
    if (trendChart) { trendChart.destroy(); trendChart = null; }
}

// Export chart functions
window.chartModule = {
    initSignalChart,
    initTrendChart,
    initMddChart,
    updateSignalChart,
    updateMddChart,
    destroyCharts
};
