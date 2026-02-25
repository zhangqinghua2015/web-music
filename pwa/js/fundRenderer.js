/**
 * 基金卡片和列表渲染模块
 */
const FundRenderer = {
    /**
     * 创建基金卡片
     */
    createCard(fund, index, isImported = false, isAmountVisible = true) {
        const col = document.createElement('div');
        col.className = 'col-6 col-md-4 col-lg-3 mb-2';

        const isProfit = fund.profitLoss !== null && fund.profitLoss !== undefined && fund.profitLoss >= 0;
        const profitClass = isProfit ? 'profit-positive' : 'profit-negative';
        const headerBg = isProfit ? 'bg-danger' : 'bg-success';

        col.innerHTML = `
            <div class="card fund-card h-100 shadow-sm">
                <div class="card-header ${headerBg} text-white" style="padding: 0.5rem; font-size: 0.9rem;">
                    <div class="d-flex justify-content-between align-items-center">
                        <h6 class="mb-0" style="font-size: 0.9rem;">${fund.fundName || '未知基金'}</h6>
                        <span class="badge bg-white text-${isProfit ? 'danger' : 'success'}" style="font-size: 0.65rem; padding: 0.25rem 0.5rem;">
                            ${fund.fundCode || '----'}
                        </span>
                    </div>
                    ${isImported ? '<div style="font-size: 0.75rem; margin-top: 0.25rem;"><i class="bi bi-check-circle-fill"></i> 已导入</div>' : ''}
                </div>
                <div class="card-body" style="padding: 0.5rem;">
                    ${this.renderCardBody(fund, isImported, isAmountVisible, profitClass)}
                    ${this.renderValuationInfo(fund, isImported, isAmountVisible)}
                    ${this.renderCardButtons(fund, index, isImported)}
                </div>
            </div>
        `;

        return col;
    },

    /**
     * 渲染卡片主体内容
     */
    renderCardBody(fund, isImported, isAmountVisible, profitClass) {
        const showAmount = !isImported || isAmountVisible;

        return `
            <div class="mb-1">
                <small class="text-muted" style="font-size: 0.7rem;">持仓金额</small>
                <h6 class="mb-0" style="font-size: 0.85rem;">${showAmount ? '¥' + formatNumber(fund.amount) : '****.**'}</h6>
            </div>
            <div class="mb-1">
                <small class="text-muted" style="font-size: 0.7rem;">盈亏情况</small>
                <h6 class="${profitClass} mb-0" style="font-size: 0.85rem;">
                    ${showAmount ? this.formatProfitLoss(fund) : '****.**'}
                </h6>
            </div>
            <div class="mb-1">
                <small class="text-muted" style="font-size: 0.7rem;">昨日收益</small>
                <p class="mb-0" style="font-size: 0.85rem; ${fund.yesterdayProfit >= 0 ? 'color: #dc3545;' : 'color: #198754;'}">
                    ${showAmount ? this.formatYesterdayProfit(fund) : '****.**'}
                </p>
            </div>
            <div class="mb-1">
                <small class="text-muted" style="font-size: 0.7rem;">当前净值 (${fund.jzrq || '--'})</small>
                <p class="mb-0" style="font-size: 0.85rem;">${fund.netValue || '--'}</p>
            </div>
            <div>
                <small class="text-muted" style="font-size: 0.7rem;">持仓份额</small>
                <p class="mb-0" style="font-size: 0.85rem;">${showAmount ? (fund.shares ? formatNumber(fund.shares) : '--') : '****.**'}</p>
            </div>
        `;
    },

    /**
     * 渲染估值信息
     */
    renderValuationInfo(fund, isImported, isAmountVisible) {
        const showAmount = !isImported || isAmountVisible;

        if (fund.gsz) {
            const gszzlClass = fund.gszzl !== null ? (parseFloat(fund.gszzl) >= 0 ? 'profit-positive' : 'profit-negative') : '';
            const dayProfitClass = fund.dayProfit !== null ? (fund.dayProfit >= 0 ? 'profit-positive' : 'profit-negative') : '';

            return `
                <div style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid #dee2e6;">
                    <div class="mb-1">
                        <small class="text-muted" style="font-size: 0.7rem;">实时估值</small>
                        <p class="mb-0" style="font-size: 0.85rem; font-weight: bold;">${fund.gsz}</p>
                    </div>
                    <div class="mb-1">
                        <small class="text-muted" style="font-size: 0.7rem;">估值涨跌幅</small>
                        <p class="mb-0 ${gszzlClass}" style="font-size: 0.85rem;">
                            ${fund.gszzl !== null ? (parseFloat(fund.gszzl) >= 0 ? '+' : '') + fund.gszzl + '%' : '--'}
                        </p>
                    </div>
                    <div class="mb-1">
                        <small class="text-muted" style="font-size: 0.7rem;">当日收益</small>
                        <p class="mb-0 ${dayProfitClass}" style="font-size: 0.85rem;">
                            ${showAmount ? this.formatDayProfit(fund) : '****.**'}
                        </p>
                    </div>
                    <div>
                        <small class="text-muted" style="font-size: 0.7rem;">
                            <i class="bi bi-clock" style="font-size: 0.65rem; margin-right: 0.25rem;"></i>${fund.gztime || '--'}
                        </small>
                    </div>
                </div>
            `;
        } else if (fund.updateTime) {
            return `
                <div class="mt-2 pt-2 border-top">
                    <small class="text-muted">
                        <i class="bi bi-clock"></i> ${fund.updateTime}
                    </small>
                </div>
            `;
        }
        return '';
    },

    /**
     * 渲染卡片按钮
     */
    renderCardButtons(fund, index, isImported) {
        if (isImported) {
            return `
                <div style="margin-top: 0.5rem; display: flex; gap: 0.25rem;">
                    <button class="btn btn-xs btn-outline-primary flex-1" onclick="showSavedEditForm('${fund.fundName}', '${fund.fundCode || ''}', ${fund.amount}, ${fund.shares}, ${fund.netValue}, ${fund.profitLoss}, ${fund.costPrice})">
                        <i class="bi bi-pencil"></i> <span class="d-none d-md-inline">编辑</span>
                    </button>
                    <button class="btn btn-xs btn-outline-danger flex-1" onclick="deleteFund('${fund.fundCode}', '${fund.fundName}')">
                        <i class="bi bi-trash"></i> <span class="d-none d-md-inline">删除</span>
                    </button>
                </div>
            `;
        } else {
            return `
                <div style="margin-top: 0.5rem; display: flex; gap: 0.25rem;">
                    <button class="btn btn-xs btn-outline-primary flex-1" onclick="showImportEditForm(${index}, '${fund.fundName}', '${fund.fundCode || ''}', ${fund.amount}, ${fund.shares}, ${fund.netValue}, ${fund.profitLoss}, ${fund.costPrice})">
                        <i class="bi bi-pencil"></i> <span class="d-none d-md-inline">编辑</span>
                    </button>
                </div>
            `;
        }
    },

    /**
     * 格式化盈亏
     */
    formatProfitLoss(fund) {
        const sign = fund.profitLoss >= 0 ? '+' : '';
        let rate = 0;
        // 计算公式：profitLoss / (costPrice * shares) * 100
        const costTotal = parseFloat(fund.costPrice) * parseFloat(fund.shares);
        if (costTotal > 0) {
            rate = (parseFloat(fund.profitLoss) / costTotal) * 100;
        }
        const rateSign = rate >= 0 ? '+' : '';
        return `${sign}${formatNumber(fund.profitLoss)} (${rateSign}${formatNumber(rate)}%)`;
    },

    /**
     * 格式化昨日收益
     */
    formatYesterdayProfit(fund) {
        if (fund.yesterdayProfit === null || fund.yesterdayProfit === undefined) return '--';
        const sign = fund.yesterdayProfit >= 0 ? '+' : '';
        return sign + formatNumber(fund.yesterdayProfit);
    },

    /**
     * 格式化当日收益
     */
    formatDayProfit(fund) {
        if (fund.dayProfit === null || fund.dayProfit === undefined) return '--';
        const sign = fund.dayProfit >= 0 ? '+' : '';
        return sign + formatNumber(fund.dayProfit);
    },

    /**
     * 创建基金列表视图
     */
    createListView(fundPositions, isAmountVisible, currentSortField, currentSortOrder) {
        const container = document.createElement('div');
        container.className = 'col-12';

        const tableWrapper = document.createElement('div');
        tableWrapper.className = 'table-responsive';
        tableWrapper.style.maxHeight = 'calc(100vh - 300px)';
        tableWrapper.style.overflowY = 'auto';

        const table = document.createElement('table');
        table.className = 'table table-hover fund-table mb-0';
        table.style.minWidth = '1000px';

        table.innerHTML = `
            <thead style="position: sticky; top: 0; z-index: 10;">
                <tr>
                    <th style="min-width: 150px;">基金名称</th>
                    <th style="min-width: 80px;">代码</th>
                    <th style="min-width: 100px; cursor: pointer;" onclick="sortImportedFunds('amount')">
                        持仓金额 ${currentSortField === 'amount' ? (currentSortOrder === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th style="min-width: 120px; cursor: pointer;" onclick="sortImportedFunds('profitLoss')">
                        盈亏情况 ${currentSortField === 'profitLoss' ? (currentSortOrder === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th style="min-width: 90px;">昨日收益</th>
                    <th style="min-width: 90px;">实时估值</th>
                    <th style="min-width: 100px; cursor: pointer;" onclick="sortImportedFunds('gszzl')">
                        估值涨跌 ${currentSortField === 'gszzl' ? (currentSortOrder === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th style="min-width: 120px; cursor: pointer;" onclick="sortImportedFunds('dayProfit')">
                        当日收益 ${currentSortField === 'dayProfit' ? (currentSortOrder === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th style="min-width: 100px;">操作</th>
                </tr>
            </thead>
            <tbody>
                ${fundPositions.map(fund => this.createTableRow(fund, isAmountVisible)).join('')}
            </tbody>
        `;

        tableWrapper.appendChild(table);
        container.appendChild(tableWrapper);
        return container;
    },

    /**
     * 创建表格行
     */
    createTableRow(fund, isAmountVisible) {
        const profitClass = fund.profitLoss >= 0 ? 'profit-positive' : 'profit-negative';
        const yesterdayProfitClass = fund.yesterdayProfit >= 0 ? 'profit-positive' : 'profit-negative';
        const gszzlClass = parseFloat(fund.gszzl) >= 0 ? 'profit-positive' : 'profit-negative';
        const dayProfitClass = fund.dayProfit >= 0 ? 'profit-positive' : 'profit-negative';

        return `
            <tr>
                <td><strong>${fund.fundName || '未知基金'}</strong></td>
                <td><span class="badge bg-primary">${fund.fundCode || '----'}</span></td>
                <td>${isAmountVisible ? '¥' + formatNumber(fund.amount) : '****.**'}</td>
                <td class="${profitClass}">
                    ${isAmountVisible ? (fund.profitLoss !== null ? this.formatProfitLoss(fund) : '--') : '****.**'}
                </td>
                <td class="${yesterdayProfitClass}">
                    ${isAmountVisible ? this.formatYesterdayProfit(fund) : '****.**'}
                </td>
                <td>${fund.gsz || '--'}</td>
                <td class="${gszzlClass}">
                    ${fund.gszzl !== null ? (parseFloat(fund.gszzl) >= 0 ? '+' : '') + fund.gszzl + '%' : '--'}
                </td>
                <td class="${dayProfitClass}">
                    ${isAmountVisible ? this.formatDayProfit(fund) : '****.**'}
                </td>
                <td>
                    <div class="d-flex gap-1 justify-content-center" style="white-space: nowrap;">
                        <button class="btn btn-sm btn-outline-primary" onclick="showSavedEditForm('${fund.fundName}', '${fund.fundCode || ''}', ${fund.amount}, ${fund.shares}, ${fund.netValue}, ${fund.profitLoss}, ${fund.costPrice})">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteFund('${fund.fundCode}', '${fund.fundName}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }
};

// 兼容旧代码
function createFundCard(fund, index, isImported = false) {
    return FundRenderer.createCard(fund, index, isImported, window.isAmountVisible);
}

function createFundListView(fundPositions) {
    return FundRenderer.createListView(fundPositions, window.isAmountVisible, window.currentSortField, window.currentSortOrder);
}
