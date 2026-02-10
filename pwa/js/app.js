/**
 * 基金应用主模块 - PWA版本
 */
(function() {
    'use strict';

    // ========== 全局状态 ==========
    window.currentDisplayMode = 'card';
    window.currentSortField = null;
    window.currentSortOrder = 'desc';
    window.importedFundsData = [];
    window.isAmountVisible = false;

    // ========== 已导入基金管理 ==========
    window.loadImportedFunds = async function() {
        console.log('loadImportedFunds 开始执行');
        const fundList = document.getElementById('importedFundList');
        fundList.innerHTML = `
            <div class="col-12 text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">加载中...</span>
                </div>
                <p class="mt-2 text-muted">正在加载基金数据...</p>
            </div>
        `;
        try {
            console.log('准备调用 FundApi.getPositions()');
            importedFundsData = await FundApi.getPositions();
            console.log('FundApi.getPositions() 返回结果:', importedFundsData);
            console.log('准备调用 renderImportedFunds()');
            renderImportedFunds();
            console.log('renderImportedFunds() 执行完成');
        } catch (error) {
            console.error('loadImportedFunds 发生错误:', error);
            showImportedFundsError('加载基金记录失败: ' + error.message);
        }
    };

    window.renderImportedFunds = function() {
        console.log('renderImportedFunds 开始执行');
        console.log('importedFundsData:', importedFundsData);
        
        const fundList = document.getElementById('importedFundList');
        const statisticsCard = document.getElementById('importedStatisticsCard');

        if (!importedFundsData || importedFundsData.length === 0) {
            console.log('没有基金数据，显示空状态');
            fundList.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="bi bi-inbox display-4 text-muted mb-3"></i>
                    <h4 class="text-muted">暂无基金记录</h4>
                    <p class="text-muted">点击"新增"或"导入"添加基金</p>
                </div>
            `;
            statisticsCard.style.display = 'none';
            return;
        }
        
        console.log('有基金数据，开始渲染');

        let sortedFunds = [...importedFundsData];
        if (currentSortField) {
            sortedFunds = sortFunds(sortedFunds, currentSortField, currentSortOrder);
        }

        fundList.innerHTML = '';

        if (currentDisplayMode === 'card') {
            sortedFunds.forEach((fund, index) => {
                fundList.appendChild(createFundCard(fund, index, true));
            });
        } else {
            fundList.appendChild(createFundListView(sortedFunds));
        }

        updateImportedStatistics(importedFundsData);
        statisticsCard.style.display = 'block';
    };

    window.showImportedFundsError = function(message) {
        document.getElementById('importedFundList').innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="bi bi-exclamation-triangle display-4 text-warning mb-3"></i>
                <h4 class="text-warning">加载失败</h4>
                <p class="text-muted">${message}</p>
                <button class="btn btn-outline-primary" onclick="loadImportedFunds()">
                    <i class="bi bi-arrow-repeat"></i> 重新加载
                </button>
            </div>
        `;
    };

    window.refreshImportedFunds = function() {
        document.getElementById('importedFundList').innerHTML = `
            <div class="col-12 text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">加载中...</span>
                </div>
                <p class="mt-2 text-muted">正在刷新基金记录...</p>
            </div>
        `;
        loadImportedFunds();
    };

    window.deleteFund = async function(id, name) {
        if (!confirm(`确定要删除基金 "${name}" 吗？`)) {
            return;
        }

        try {
            await FundApi.deletePosition(id);
            showError('基金记录删除成功');
            refreshImportedFunds();
        } catch (error) {
            showError('删除失败: ' + error.message);
        }
    };

    // ========== 新增基金 ==========
    window.showAddFundModal = function() {
        // 清空表单
        document.getElementById('savedEditFundId').value = '';
        document.getElementById('savedEditFundName').value = '';
        document.getElementById('savedEditFundCode').value = '';
        document.getElementById('savedEditFundAmount').value = '';
        document.getElementById('savedEditFundShares').value = '';
        document.getElementById('savedEditFundNetValue').value = '';
        document.getElementById('savedEditFundProfitLoss').value = '';
        document.getElementById('savedEditFundCostPrice').value = '';

        // 修改弹窗标题
        document.getElementById('savedEditFundModalLabel').textContent = '新增基金';

        // 修改保存按钮为新增逻辑
        const saveBtn = document.querySelector('#savedEditFundModal .btn-primary');
        saveBtn.onclick = saveNewFund;

        // 显示弹窗
        const modal = new bootstrap.Modal(document.getElementById('savedEditFundModal'));
        modal.show();

        // 绑定输入事件
        bindAddFundEvents();
    };

    function bindAddFundEvents() {
        const amountInput = document.getElementById('savedEditFundAmount');
        const profitLossInput = document.getElementById('savedEditFundProfitLoss');
        const nameInput = document.getElementById('savedEditFundName');
        const codeInput = document.getElementById('savedEditFundCode');

        amountInput.oninput = recalculateAddForm;
        profitLossInput.oninput = recalculateAddForm;

        nameInput.oninput = function() {
            const name = this.value.trim();
            if (name.length > 1) {
                searchFundByNameForAdd(name);
            }
        };

        codeInput.oninput = function() {
            const code = this.value.trim();
            if (code.length === 6) {
                searchFundByCodeForAdd(code);
            }
        };
    }

    function recalculateAddForm() {
        const amount = parseFloat(document.getElementById('savedEditFundAmount').value);
        const netValue = parseFloat(document.getElementById('savedEditFundNetValue').value);
        const profitLoss = parseFloat(document.getElementById('savedEditFundProfitLoss').value) || 0;

        if (!isNaN(amount) && !isNaN(netValue) && netValue > 0) {
            const shares = amount / netValue;
            document.getElementById('savedEditFundShares').value = shares.toFixed(2);
            if (shares > 0) {
                const costPrice = (amount - profitLoss) / shares;
                document.getElementById('savedEditFundCostPrice').value = costPrice.toFixed(6);
            }
        }
    }

    async function searchFundByNameForAdd(name) {
        try {
            const data = await FundApi.searchFund({ name });
            if (data && data.length > 0) {
                document.getElementById('savedEditFundCode').value = data[0].code;
                fetchValuationForAdd(data[0].code);
            }
        } catch (e) {}
    }

    async function searchFundByCodeForAdd(code) {
        try {
            const data = await FundApi.searchFund({ code });
            if (data && data.length > 0) {
                document.getElementById('savedEditFundName').value = data[0].fullName || data[0].name;
                fetchValuationForAdd(code);
            }
        } catch (e) {}
    }

    async function fetchValuationForAdd(code) {
        try {
            const valuation = await FundApi.getValuation(code);
            if (valuation && valuation.dwjz) {
                document.getElementById('savedEditFundNetValue').value = valuation.dwjz;
                recalculateAddForm();
            }
        } catch (e) {}
    }

    async function saveNewFund() {
        const name = document.getElementById('savedEditFundName').value.trim();
        const code = document.getElementById('savedEditFundCode').value.trim();
        const amount = document.getElementById('savedEditFundAmount').value;
        const shares = document.getElementById('savedEditFundShares').value;
        const profitLoss = document.getElementById('savedEditFundProfitLoss').value;
        const costPrice = document.getElementById('savedEditFundCostPrice').value;
        const netValue = document.getElementById('savedEditFundNetValue').value;

        if (!name) { showError('基金名称不能为空'); return; }
        if (!code) { showError('基金代码不能为空'); return; }
        if (!amount) { showError('持有金额不能为空'); return; }
        if (!shares) { showError('持有份额不能为空'); return; }

        const fundData = [{
            fundName: name,
            fundCode: code,
            amount: parseFloat(amount),
            shares: parseFloat(shares),
            profitLoss: parseFloat(profitLoss) || 0,
            costPrice: parseFloat(costPrice) || 0,
            netValue: parseFloat(netValue) || 0
        }];

        try {
            await FundApi.savePositions(fundData);
            showError('基金新增成功');
            bootstrap.Modal.getInstance(document.getElementById('savedEditFundModal')).hide();
            // 恢复弹窗标题和按钮
            document.getElementById('savedEditFundModalLabel').textContent = '编辑基金信息';
            document.querySelector('#savedEditFundModal .btn-primary').onclick = saveFundChanges;
            refreshImportedFunds();
        } catch (error) {
            showError('新增失败: ' + error.message);
        }
    }

    // ========== 统计信息更新 ==========
    window.updateImportedStatistics = function(fundPositions) {
        if (!fundPositions || fundPositions.length === 0) return;

        let totalAmount = 0, totalProfit = 0, totalDayProfit = 0, totalYesterdayProfit = 0;

        fundPositions.forEach(fund => {
            if (fund.amount) totalAmount += parseFloat(fund.amount);
            if (fund.profitLoss) totalProfit += parseFloat(fund.profitLoss);
            if (fund.dayProfit) totalDayProfit += parseFloat(fund.dayProfit);
            if (fund.yesterdayProfit) totalYesterdayProfit += parseFloat(fund.yesterdayProfit);
        });

        const profitRate = totalAmount > 0 ? (totalProfit / totalAmount * 100) : 0;

        document.getElementById('importedTotalAmount').textContent = isAmountVisible ? '¥' + formatNumber(totalAmount) : '****.**';
        document.getElementById('importedTotalProfit').textContent = isAmountVisible ? (totalProfit >= 0 ? '+' : '') + '¥' + formatNumber(totalProfit) : '****.**';
        document.getElementById('importedTotalProfit').className = totalProfit >= 0 ? 'profit-positive' : 'profit-negative';
        document.getElementById('importedProfitRate').textContent = (totalProfit >= 0 ? '+' : '') + formatNumber(profitRate) + '%';
        document.getElementById('importedProfitRate').className = totalProfit >= 0 ? 'profit-positive' : 'profit-negative';
        document.getElementById('importedFundCount').textContent = fundPositions.length;
        document.getElementById('importedTotalDayProfit').textContent = isAmountVisible ? (totalDayProfit >= 0 ? '+' : '') + '¥' + formatNumber(totalDayProfit) : '****.**';
        document.getElementById('importedTotalDayProfit').className = totalDayProfit >= 0 ? 'profit-positive' : 'profit-negative';
        document.getElementById('importedTotalYesterdayProfit').textContent = isAmountVisible ? (totalYesterdayProfit >= 0 ? '+' : '') + '¥' + formatNumber(totalYesterdayProfit) : '****.**';
        document.getElementById('importedTotalYesterdayProfit').className = totalYesterdayProfit >= 0 ? 'profit-positive' : 'profit-negative';
    };

    // ========== 显示方式切换 ==========
    window.switchDisplayMode = function(mode) {
        if (mode !== 'card' && mode !== 'list') return;
    
        currentDisplayMode = mode;
    
        const cardBtn = document.querySelector('button[onclick="switchDisplayMode(\'card\')"]');
        const listBtn = document.querySelector('button[onclick="switchDisplayMode(\'list\')"]');
    
        if (mode === 'card') {
            cardBtn.classList.remove('btn-outline-secondary');
            cardBtn.classList.add('btn-secondary');
            listBtn.classList.remove('btn-secondary');
            listBtn.classList.add('btn-outline-secondary');
        } else {
            listBtn.classList.remove('btn-outline-secondary');
            listBtn.classList.add('btn-secondary');
            cardBtn.classList.remove('btn-secondary');
            cardBtn.classList.add('btn-outline-secondary');
        }
    
        renderImportedFunds();
    };

    // ========== 排序 ==========
    window.sortImportedFunds = function(field) {
        if (!window.sortClickCount) window.sortClickCount = {};
        if (!window.sortClickCount[field]) window.sortClickCount[field] = 1;
        else window.sortClickCount[field]++;

        if (currentSortField === field) {
            if (window.sortClickCount[field] % 3 === 0) {
                currentSortField = null;
                currentSortOrder = 'desc';
                window.sortClickCount[field] = 0;
            } else {
                currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
            }
        } else {
            currentSortField = field;
            currentSortOrder = 'desc';
            window.sortClickCount = { [field]: 1 };
        }

        renderImportedFunds();
    };

    window.sortFunds = function(funds, field, order) {
        return funds.sort((a, b) => {
            let aValue, bValue;
            switch (field) {
                case 'amount': aValue = parseFloat(a.amount) || 0; bValue = parseFloat(b.amount) || 0; break;
                case 'profitLoss': aValue = parseFloat(a.profitLoss) || 0; bValue = parseFloat(b.profitLoss) || 0; break;
                case 'gszzl': aValue = parseFloat(a.gszzl) || 0; bValue = parseFloat(b.gszzl) || 0; break;
                case 'dayProfit': aValue = parseFloat(a.dayProfit) || 0; bValue = parseFloat(b.dayProfit) || 0; break;
                default: return 0;
            }
            return order === 'asc' ? aValue - bValue : bValue - aValue;
        });
    };

    // ========== 金额显示切换 ==========
    window.toggleAmountVisibility = function() {
        isAmountVisible = !isAmountVisible;

        const toggleBtn = document.getElementById('toggleAmountVisibility');
        if (isAmountVisible) {
            toggleBtn.innerHTML = '<i class="bi bi-eye"></i><span class="d-none d-md-inline"> 显示金额</span>';
            toggleBtn.classList.remove('btn-secondary');
            toggleBtn.classList.add('btn-outline-secondary');
        } else {
            toggleBtn.innerHTML = '<i class="bi bi-eye-slash"></i><span class="d-none d-md-inline"> 隐藏金额</span>';
            toggleBtn.classList.remove('btn-outline-secondary');
            toggleBtn.classList.add('btn-secondary');
        }

        renderImportedFunds();
    };

    // ========== 导出导入功能 ==========
    window.showExportModal = function() {
        if (!importedFundsData || importedFundsData.length === 0) {
            showError('没有可导出的基金数据');
            return;
        }

        const exportData = importedFundsData.map(fund => ({
            fundName: fund.fundName,
            fundCode: fund.fundCode,
            amount: fund.amount,
            shares: fund.shares,
            profitLoss: fund.profitLoss,
            costPrice: fund.costPrice,
            netValue: fund.netValue
        }));

        document.getElementById('exportJsonText').value = JSON.stringify(exportData, null, 2);
        new bootstrap.Modal(document.getElementById('exportModal')).show();
    };

    window.copyExportJson = function() {
        const textarea = document.getElementById('exportJsonText');
        textarea.select();
        document.execCommand('copy');
        showError('已复制到剪贴板');
    };

    window.showImportModal = function() {
        document.getElementById('importJsonText').value = '';
        new bootstrap.Modal(document.getElementById('importModal')).show();
    };

    window.confirmImportJson = async function() {
        const jsonText = document.getElementById('importJsonText').value.trim();
        if (!jsonText) {
            showError('请输入JSON数据');
            return;
        }

        let fundData;
        try {
            fundData = JSON.parse(jsonText);
        } catch (e) {
            showError('JSON格式错误');
            return;
        }

        if (!Array.isArray(fundData) || fundData.length === 0) {
            showError('数据格式错误，需要基金数组');
            return;
        }

        try {
            await FundApi.savePositions(fundData);
            showError('导入成功');
            bootstrap.Modal.getInstance(document.getElementById('importModal')).hide();
            refreshImportedFunds();
        } catch (error) {
            showError('导入失败: ' + error.message);
        }
    };

    // ========== 页面初始化 ==========
    window.addEventListener('load', async function() {
        // 初始化 IndexedDB
        try {
            await FundDB.init();
            console.log('数据库初始化成功');
            // 清理30天前的历史净值数据
            await FundDB.cleanOldHistory(30);
        } catch (error) {
            showError('数据库初始化失败: ' + error.message);
        }

        // 初始化金额显示按钮
        const toggleBtn = document.getElementById('toggleAmountVisibility');
        if (toggleBtn) {
            toggleBtn.innerHTML = '<i class="bi bi-eye-slash"></i><span class="d-none d-md-inline"> 隐藏金额</span>';
            toggleBtn.classList.add('btn-secondary');
        }

        // 加载已导入基金
        loadImportedFunds();

        // 默认卡片显示
        setTimeout(() => switchDisplayMode('card'), 100);

        // 初始化编辑弹窗
        initEditModals();
    });
})();
