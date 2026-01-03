/**
 * Main Application Logic for Taiwan Stock Backtesting System
 * 主應用程式邏輯
 */

// PWA install prompt event
let deferredPrompt;

document.addEventListener('DOMContentLoaded', function () {
    // Set default end date to today
    document.getElementById('endDate').value = window.appData.getTodayString();

    // Initialize components
    initClock();
    initFormControls();
    initRadioButtons();
    initLeverageControls();
    initRebalanceControl();
    initAutoOptimize();
    initThemeSelector();
    initPeriodTabs();
    initMobileMenu();
    initPWA();
    updateMarketDisplay();

    // Initialize charts
    window.chartModule.initSignalChart();
    window.chartModule.initTrendChart(5); // Default 5 years

    // Apply auto theme based on market sentiment
    applyAutoTheme();

    // Set up event listeners
    setupEventListeners();
});

/**
 * Initialize mobile hamburger menu
 */
function initMobileMenu() {
    const hamburger = document.getElementById('hamburgerMenu');
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebarBackdrop');

    if (!hamburger || !sidebar || !backdrop) return;

    // Toggle sidebar
    hamburger.addEventListener('click', function () {
        this.classList.toggle('active');
        sidebar.classList.toggle('active');
        backdrop.classList.toggle('active');

        // Prevent body scroll when sidebar is open
        if (sidebar.classList.contains('active')) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    });

    // Close sidebar when clicking backdrop
    backdrop.addEventListener('click', function () {
        hamburger.classList.remove('active');
        sidebar.classList.remove('active');
        backdrop.classList.remove('active');
        document.body.style.overflow = '';
    });

    // Close sidebar when clicking run backtest (mobile)
    document.getElementById('runBacktest').addEventListener('click', function () {
        if (window.innerWidth <= 992) {
            hamburger.classList.remove('active');
            sidebar.classList.remove('active');
            backdrop.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
}

/**
 * Initialize PWA features
 */
function initPWA() {
    // Register service worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', function () {
            navigator.serviceWorker.register('/sw.js')
                .then(function (registration) {
                    console.log('ServiceWorker registered:', registration.scope);
                })
                .catch(function (error) {
                    console.log('ServiceWorker registration failed:', error);
                });
        });
    }

    // Handle install prompt
    window.addEventListener('beforeinstallprompt', function (e) {
        e.preventDefault();
        deferredPrompt = e;

        // Show install prompt after delay
        setTimeout(function () {
            showInstallPrompt();
        }, 3000);
    });

    // Install button click
    const installBtn = document.getElementById('installBtn');
    const installClose = document.getElementById('installClose');
    const installPrompt = document.getElementById('installPrompt');

    if (installBtn) {
        installBtn.addEventListener('click', function () {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then(function (choiceResult) {
                    if (choiceResult.outcome === 'accepted') {
                        console.log('User accepted install');
                    }
                    deferredPrompt = null;
                    installPrompt.style.display = 'none';
                });
            }
        });
    }

    if (installClose) {
        installClose.addEventListener('click', function () {
            installPrompt.style.display = 'none';
            // Don't show again for this session
            sessionStorage.setItem('installDismissed', 'true');
        });
    }
}

/**
 * Show PWA install prompt
 */
function showInstallPrompt() {
    const installPrompt = document.getElementById('installPrompt');
    const dismissed = sessionStorage.getItem('installDismissed');

    // Check if already installed or dismissed
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if (dismissed) return;
    if (!deferredPrompt) return;

    installPrompt.style.display = 'block';
}

/**
 * Initialize real-time clock display
 */
function initClock() {
    function updateClock() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('zh-TW', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });

        const dateString = now.toLocaleDateString('zh-TW', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });

        document.getElementById('currentTime').textContent = `${dateString} ${timeString}`;

        // Update market status
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const currentMinutes = hours * 60 + minutes;
        const day = now.getDay();

        const marketStatus = document.getElementById('marketStatus');
        const isWeekday = day >= 1 && day <= 5;
        const isMarketHours = currentMinutes >= 540 && currentMinutes <= 810;

        if (isWeekday && isMarketHours) {
            marketStatus.classList.add('open');
            marketStatus.querySelector('span:last-child').textContent = '開盤中';
        } else {
            marketStatus.classList.remove('open');
            marketStatus.querySelector('span:last-child').textContent = '休市中';
        }
    }

    updateClock();
    setInterval(updateClock, 1000);
}

/**
 * Initialize theme selector
 */
function initThemeSelector() {
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            // Remove active from all
            document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            const theme = this.dataset.theme;
            applyTheme(theme);
        });
    });
}

/**
 * Apply theme to body
 */
function applyTheme(theme) {
    document.body.className = '';

    if (theme === 'auto') {
        applyAutoTheme();
    } else {
        document.body.classList.add('theme-' + theme);
    }
}

/**
 * Apply auto theme based on market sentiment
 */
function applyAutoTheme() {
    const sentiment = window.appData.getMarketSentiment();
    document.body.className = 'theme-' + sentiment;

    // Update auto button appearance
    const autoBtn = document.querySelector('.theme-btn[data-theme="auto"]');
    if (autoBtn && autoBtn.classList.contains('active')) {
        // Keep auto active but show current sentiment
    }
}

/**
 * Initialize period tabs for trend chart
 */
function initPeriodTabs() {
    document.querySelectorAll('.period-tab').forEach(tab => {
        tab.addEventListener('click', function () {
            document.querySelectorAll('.period-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');

            const period = this.dataset.period;
            const years = parseInt(period.replace('y', ''));
            window.chartModule.initTrendChart(years);
        });
    });
}

/**
 * Initialize form controls
 */
function initFormControls() {
    // Number input buttons
    document.querySelectorAll('.num-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const target = document.getElementById(this.dataset.target);
            const currentValue = parseInt(target.value) || 0;
            const min = parseInt(target.min) || 1;
            const max = parseInt(target.max) || 999;

            if (this.classList.contains('minus')) {
                target.value = Math.max(min, currentValue - 1);
            } else {
                target.value = Math.min(max, currentValue + 1);
            }

            if (this.dataset.target === 'maDays') {
                document.getElementById('maLabel').textContent = target.value;
            }
        });
    });

    // Slider values
    document.querySelectorAll('.slider').forEach(slider => {
        const valueDisplay = document.getElementById(slider.id + 'Value');
        if (valueDisplay) {
            slider.addEventListener('input', function () {
                valueDisplay.textContent = this.value + 'x';
            });
        }
    });

    // MA days input change
    document.getElementById('maDays').addEventListener('change', function () {
        document.getElementById('maLabel').textContent = this.value;
    });
}

/**
 * Initialize leverage checkbox controls
 */
function initLeverageControls() {
    const useFixedLeverage = document.getElementById('useFixedLeverage');
    const useDynamicLeverage = document.getElementById('useDynamicLeverage');
    const fixedContainer = document.getElementById('fixedLeverageContainer');
    const dynamicContainer = document.getElementById('dynamicLeverageContainer');
    const fixedSlider = document.getElementById('fixedLeverage');
    const dynamicSlider = document.getElementById('dynamicLeverage');

    useFixedLeverage.addEventListener('change', function () {
        if (this.checked) {
            fixedContainer.classList.remove('disabled');
            fixedSlider.disabled = false;
        } else {
            fixedContainer.classList.add('disabled');
            fixedSlider.disabled = true;
        }
    });

    useDynamicLeverage.addEventListener('change', function () {
        if (this.checked) {
            dynamicContainer.classList.remove('disabled');
            dynamicSlider.disabled = false;
        } else {
            dynamicContainer.classList.add('disabled');
            dynamicSlider.disabled = true;
        }
    });
}

/**
 * Initialize rebalance toggle control
 */
function initRebalanceControl() {
    const enableRebalance = document.getElementById('enableRebalance');
    const rebalancePeriodGroup = document.getElementById('rebalancePeriodGroup');

    enableRebalance.addEventListener('change', function () {
        if (this.checked) {
            rebalancePeriodGroup.classList.remove('disabled');
        } else {
            rebalancePeriodGroup.classList.add('disabled');
        }
    });
}

/**
 * Initialize auto-optimize controls
 */
function initAutoOptimize() {
    const autoOptimize = document.getElementById('autoOptimize');
    const autoOptimizeRange = document.getElementById('autoOptimizeRange');
    const top3Results = document.getElementById('top3Results');
    const manualMaGroup = document.getElementById('manualMaGroup');

    autoOptimize.addEventListener('change', function () {
        if (this.checked) {
            autoOptimizeRange.style.display = 'block';
            manualMaGroup.style.display = 'none';
            top3Results.style.display = 'none';
        } else {
            autoOptimizeRange.style.display = 'none';
            manualMaGroup.style.display = 'block';
            top3Results.style.display = 'none';
        }
    });
}

/**
 * Populate top 3 MA results
 */
function populateTop3Results(results) {
    const top3List = document.getElementById('top3List');
    top3List.innerHTML = '';

    results.forEach((result, index) => {
        const item = document.createElement('div');
        item.className = 'top3-item' + (index === 0 ? ' selected' : '');
        item.innerHTML = `
            <span class="top3-rank rank-${result.rank}">${result.rank}</span>
            <span class="top3-ma">MA ${result.ma}</span>
            <div class="top3-stats">
                <div class="stat-row">
                    <span>總報酬:</span>
                    <span class="${result.totalReturn >= 0 ? 'positive' : 'negative'}">${result.totalReturn >= 0 ? '+' : ''}${result.totalReturn.toFixed(2)}%</span>
                </div>
                <div class="stat-row">
                    <span>平均報酬:</span>
                    <span class="${result.avgReturn >= 0 ? 'positive' : 'negative'}">${result.avgReturn >= 0 ? '+' : ''}${result.avgReturn.toFixed(2)}%</span>
                </div>
            </div>
            <input type="checkbox" class="top3-checkbox" name="selectedMA" value="${result.ma}" ${index === 0 ? 'checked' : ''}>
        `;

        // Add click handler for selection
        item.querySelector('.top3-checkbox').addEventListener('change', function () {
            // Uncheck others
            document.querySelectorAll('.top3-checkbox').forEach(cb => {
                if (cb !== this) cb.checked = false;
                cb.closest('.top3-item').classList.remove('selected');
            });
            if (this.checked) {
                item.classList.add('selected');
                document.getElementById('maLabel').textContent = this.value;
            }
        });

        top3List.appendChild(item);
    });

    document.getElementById('top3Results').style.display = 'block';
}

/**
 * Initialize radio button interactions
 */
function initRadioButtons() {
    document.querySelectorAll('.radio-item').forEach(item => {
        item.addEventListener('click', function () {
            this.closest('.radio-group').querySelectorAll('.radio-item').forEach(i => {
                i.classList.remove('active');
            });
            this.classList.add('active');
            this.querySelector('input').checked = true;
        });
    });
}

/**
 * Update market display with current data (from API or fallback)
 */
async function updateMarketDisplay() {
    const { formatNumber, calculateSignal, fetchMarketStatus, marketData } = window.appData;
    const maDays = parseInt(document.getElementById('maDays').value) || 13;

    let latestPrice, maValue, latestDate;

    // Try to fetch real data from API
    try {
        const status = await fetchMarketStatus(maDays);
        if (status && status.success) {
            latestPrice = status.latestPrice;
            maValue = status.maValue;
            latestDate = status.latestDate;
            console.log('[Market] Real data loaded:', latestPrice, maValue);
        } else {
            throw new Error('API returned unsuccessful');
        }
    } catch (error) {
        console.warn('[Market] API failed, using fallback data:', error);
        latestPrice = marketData.latestPrice;
        maValue = marketData.ma13;
        latestDate = marketData.latestDate;
    }

    // Update date
    document.getElementById('updateTime').textContent = '更新於 ' + latestDate;

    // Update price values
    document.getElementById('latestPrice').textContent = formatNumber(latestPrice, 2);
    document.getElementById('maValue').textContent = formatNumber(maValue, 2);

    // Calculate and display price difference
    const diff = latestPrice - maValue;
    const diffElement = document.getElementById('priceDiff');
    diffElement.textContent = (diff >= 0 ? '+' : '') + formatNumber(diff, 2);
    diffElement.className = 'stat-value ' + (diff >= 0 ? 'positive' : 'negative');

    // Update signal
    const signal = calculateSignal(latestPrice, maValue);
    const signalBox = document.getElementById('signalBox');
    const signalText = document.getElementById('signalText');
    const signalReason = document.getElementById('signalReason');

    signalBox.className = 'signal-box ' + signal;

    if (signal === 'long') {
        signalBox.querySelector('.signal-icon').textContent = '📈';
        signalText.textContent = '做多';
        signalReason.textContent = `收盤價 > ${maDays}日均線`;
    } else {
        signalBox.querySelector('.signal-icon').textContent = '📉';
        signalText.textContent = '做空';
        signalReason.textContent = `收盤價 < ${maDays}日均線`;
    }
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
    document.getElementById('runBacktest').addEventListener('click', runBacktest);
    document.getElementById('toggleTrades').addEventListener('click', toggleTradesTable);
}

/**
 * Toggle trades table visibility
 */
function toggleTradesTable() {
    const btn = document.getElementById('toggleTrades');
    const tradesBody = document.getElementById('tradesBody');

    if (tradesBody.style.display === 'none') {
        tradesBody.style.display = 'block';
        btn.classList.add('expanded');
        btn.querySelector('span:first-child').textContent = '收起';
    } else {
        tradesBody.style.display = 'none';
        btn.classList.remove('expanded');
        btn.querySelector('span:first-child').textContent = '展開';
    }
}

/**
 * Run backtest simulation (with real API support)
 */
async function runBacktest() {
    const btn = document.getElementById('runBacktest');
    const resultsCard = document.getElementById('resultsCard');
    const mddCard = document.getElementById('mddCard');
    const tradesCard = document.getElementById('tradesCard');
    const autoOptimize = document.getElementById('autoOptimize');

    btn.disabled = true;
    btn.innerHTML = '<span class="btn-icon">⏳</span><span>執行中...</span>';

    try {
        // Collect parameters from form
        const params = collectBacktestParams();

        // Check if API is available
        const apiAvailable = await window.appData.checkAPIAvailable();

        if (apiAvailable && window.appData.USE_REAL_API) {
            // Use real API
            await runRealBacktest(params, autoOptimize.checked);
        } else {
            // Fallback to mock data
            console.log('Using mock data...');
            await runMockBacktest(autoOptimize.checked);
        }

    } catch (error) {
        console.error('Backtest error:', error);
        showToast('回測執行失敗：' + error.message, 'error');
    } finally {
        // Reset button
        btn.disabled = false;
        btn.innerHTML = '<span class="btn-icon">▶️</span><span>執行回測</span><div class="btn-shine"></div>';
    }
}

/**
 * Collect backtest parameters from form
 */
function collectBacktestParams() {
    return {
        startDate: document.getElementById('startDate').value,
        endDate: document.getElementById('endDate').value,
        maDays: parseInt(document.getElementById('maDays').value) || 13,
        tradeMode: document.getElementById('tradeMode').value || 'long',
        initialCapital: parseInt(document.getElementById('initialCapital').value) || 1000000,
        monthlyAdd: parseInt(document.getElementById('monthlyAdd').value) || 0,
        useFixedLeverage: document.getElementById('useFixedLeverage').checked,
        fixedLeverage: parseInt(document.getElementById('fixedLeverage').value) || 1,
        useDynamicLeverage: document.getElementById('useDynamicLeverage').checked,
        dynamicLeverage: parseInt(document.getElementById('dynamicLeverage').value) || 2,
        enableRebalance: document.getElementById('enableRebalance').checked,
        rebalancePeriod: parseInt(document.getElementById('rebalancePeriod').value) || 1,
        pointValue: parseInt(document.getElementById('pointValue').value) || 50,
        lotMode: document.getElementById('useDynamicLeverage').checked ? 'dynamic' : 'fixed',
        fixedLots: 1,
        useFee: true,
        buyFee: 35,
        sellFee: 35
    };
}

/**
 * Run backtest using real API
 */
async function runRealBacktest(params, doOptimize) {
    const resultsCard = document.getElementById('resultsCard');
    const mddCard = document.getElementById('mddCard');
    const tradesCard = document.getElementById('tradesCard');
    const { formatCurrency, formatPercent } = window.appData;

    // Handle auto-optimization
    if (doOptimize) {
        const minMA = parseInt(document.getElementById('maMin').value) || 5;
        const maxMA = parseInt(document.getElementById('maMax').value) || 60;

        const optimizeParams = {
            ...params,
            maMin: minMA,
            maMax: maxMA
        };

        const optimizeResult = await window.appData.optimizeMAAPI(optimizeParams);

        if (optimizeResult.success && optimizeResult.top3) {
            // Convert API result format to match existing populateTop3Results
            const top3 = optimizeResult.top3.map((r, i) => ({
                rank: i + 1,
                ma: r.ma,
                totalReturn: r.totalReturn,
                avgReturn: r.avgReturn || r.totalReturn / Math.max(r.tradeCount || 1, 1)
            }));

            populateTop3Results(top3);

            // Update MA to use the best one
            params.maDays = top3[0].ma;
            document.getElementById('maLabel').textContent = top3[0].ma;
        }
    }

    // Run backtest
    const result = await window.appData.runBacktestAPI(params);

    if (!result.success) {
        throw new Error(result.error || '回測失敗');
    }

    const { results, trades, mddHistory, capitalHistory } = result;

    // Update results display
    document.getElementById('resultPeriod').textContent = results.period;
    document.getElementById('resultFinal').textContent = formatCurrency(results.finalAssets);

    const returnElement = document.getElementById('resultReturn');
    returnElement.textContent = formatPercent(results.totalReturn);
    returnElement.style.color = results.totalReturn >= 0 ? '#10b981' : '#f43f5e';

    document.getElementById('resultMDD').textContent = formatPercent(results.maxDrawdown);
    document.getElementById('resultWinRate').textContent = results.winRate + '%';
    document.getElementById('resultTrades').textContent = results.tradeCount + ' 次';

    // Show results card
    resultsCard.style.display = 'block';
    resultsCard.style.animation = 'fadeIn 0.5s ease forwards';

    // Show MDD chart with real data
    mddCard.style.display = 'block';
    mddCard.style.animation = 'fadeIn 0.5s ease forwards';
    if (mddHistory && mddHistory.dates && mddHistory.values) {
        window.chartModule.initMddChartWithData(mddHistory.dates, mddHistory.values);
    } else {
        window.chartModule.initMddChart();
    }

    // Show trades table with real data
    tradesCard.style.display = 'block';
    tradesCard.style.animation = 'fadeIn 0.5s ease forwards';
    if (trades && trades.length > 0) {
        populateTradesTable(trades);
    } else {
        document.getElementById('tradesTableBody').innerHTML =
            '<tr><td colspan="11" style="text-align:center;">無交易記錄</td></tr>';
    }

    // Update signal chart
    window.chartModule.updateSignalChart();

    // Scroll to results
    resultsCard.scrollIntoView({ behavior: 'smooth', block: 'start' });

    showToast('回測完成！', 'success');
}

/**
 * Run backtest using mock data (fallback)
 */
async function runMockBacktest(doOptimize) {
    const resultsCard = document.getElementById('resultsCard');
    const mddCard = document.getElementById('mddCard');
    const tradesCard = document.getElementById('tradesCard');
    const { sampleBacktestResults, formatCurrency, formatPercent, generateTop3MA, generateSampleTrades } = window.appData;

    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Handle auto-optimization
    if (doOptimize) {
        const minMA = parseInt(document.getElementById('maMin').value) || 5;
        const maxMA = parseInt(document.getElementById('maMax').value) || 60;
        const top3 = generateTop3MA(minMA, maxMA);
        populateTop3Results(top3);
        document.getElementById('maLabel').textContent = top3[0].ma;
    }

    // Get selected dates
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    // Update results
    document.getElementById('resultPeriod').textContent = `${startDate} ~ ${endDate}`;
    document.getElementById('resultFinal').textContent = formatCurrency(sampleBacktestResults.finalAssets);

    const returnElement = document.getElementById('resultReturn');
    returnElement.textContent = formatPercent(sampleBacktestResults.totalReturn);
    returnElement.style.color = sampleBacktestResults.totalReturn >= 0 ? '#10b981' : '#f43f5e';

    document.getElementById('resultMDD').textContent = formatPercent(sampleBacktestResults.maxDrawdown);
    document.getElementById('resultWinRate').textContent = sampleBacktestResults.winRate + '%';
    document.getElementById('resultTrades').textContent = sampleBacktestResults.tradeCount + ' 次';

    // Show results card
    resultsCard.style.display = 'block';
    resultsCard.style.animation = 'fadeIn 0.5s ease forwards';

    // Show MDD chart
    mddCard.style.display = 'block';
    mddCard.style.animation = 'fadeIn 0.5s ease forwards';
    window.chartModule.initMddChart();

    // Show trades table
    tradesCard.style.display = 'block';
    tradesCard.style.animation = 'fadeIn 0.5s ease forwards';
    populateTradesTable(generateSampleTrades());

    // Update signal chart
    window.chartModule.updateSignalChart();

    // Scroll to results
    resultsCard.scrollIntoView({ behavior: 'smooth', block: 'start' });

    showToast('回測完成（使用模擬數據）', 'info');
}


/**
 * Populate trades table with data (including contracts and reasons)
 */
function populateTradesTable(trades) {
    const tbody = document.getElementById('tradesTableBody');
    tbody.innerHTML = '';

    trades.forEach(trade => {
        const row = document.createElement('tr');
        const pnlClass = trade.pnl >= 0 ? 'profit' : 'loss';
        const directionClass = trade.direction === 'long' ? 'direction-long' : 'direction-short';
        const directionText = trade.direction === 'long' ? '做多' : '做空';

        row.innerHTML = `
            <td>${trade.id}</td>
            <td>${trade.entryDate}</td>
            <td>${window.appData.formatNumber(parseFloat(trade.entryPrice), 2)}</td>
            <td>${trade.exitDate}</td>
            <td>${window.appData.formatNumber(parseFloat(trade.exitPrice), 2)}</td>
            <td class="${directionClass}">${directionText}</td>
            <td>${trade.contracts} 口</td>
            <td class="${pnlClass}">${trade.pnl >= 0 ? '+' : ''}${window.appData.formatNumber(trade.pnl, 0)}</td>
            <td class="${pnlClass}">${trade.returnRate >= 0 ? '+' : ''}${trade.returnRate.toFixed(2)}%</td>
            <td>${trade.holdDays} 天</td>
            <td class="reason">
                <span class="reason-tag entry">${trade.entryReason}</span>
                <span class="reason-tag exit">${trade.exitReason}</span>
            </td>
        `;

        tbody.appendChild(row);
    });
}

/**
 * Show notification toast
 */
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
        <span class="toast-message">${message}</span>
    `;

    if (!document.querySelector('.toast-styles')) {
        const style = document.createElement('style');
        style.className = 'toast-styles';
        style.textContent = `
            .toast {
                position: fixed;
                bottom: 2rem;
                right: 2rem;
                padding: 1rem 1.5rem;
                background: rgba(17, 24, 39, 0.95);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                display: flex;
                align-items: center;
                gap: 0.75rem;
                color: white;
                font-size: 0.9rem;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
                animation: slideIn 0.3s ease, fadeOut 0.3s ease 2.7s forwards;
                z-index: 1000;
            }
            .toast-success { border-color: rgba(16, 185, 129, 0.5); }
            .toast-error { border-color: rgba(244, 63, 94, 0.5); }
            @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } }
            @keyframes fadeOut { to { opacity: 0; transform: translateY(10px); } }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}
