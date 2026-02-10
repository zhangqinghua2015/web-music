/**
 * 基金卡片和列表渲染模块
 */
const FundRenderer = {
    /**
     * 创建基金卡片
     */
    createCard(fund, index, isImported = false, isAmountVisible = true) {
        const col = document.createElement('div');
        col.className = 'col-md-6 col-lg-4 mb-4';

        const isProfit = fund.profitLoss !== null && fund.profitLoss !== undefined && fund.profitLoss >= 0;
        const profitClass = isProfit ? 'profit-positive' : 'profit-negative';
        const headerBg = isProfit ? 'bg-danger' : 'bg-success';

        col.innerHTML = `
            <div class="card fund-card h-100 shadow-sm">
                <div class="card-header ${headerBg} text-white">
                    <div class="d-flex justify-content-between align-items-center">
                        <h6 class="mb-0">${fund.fundName || '未知基金'}</h6>
                        <span class="badge bg-white text-${isProfit ? 'danger' : 'success'}">
                            ${fund.fundCode || '----'}
                        </span>
                    </div>
                    ${isImported ? '<div class="small mt-1"><i class="bi bi-check-circle-fill"></i> 已导入记录</div>' : ''}
                </div>
                <div class="card-body">
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
            <div class="mb-3">
                <small class="text-muted">持仓金额</small>
                <h5 class="mb-0">${showAmount ? '¥' + formatNumber(fund.amount) : '****.**'}</h5>
            </div>
            <div class="mb-3">
                <small class="text-muted">盈亏情况</small>
                <h5 class="${profitClass} mb-0">
                    ${showAmount ? this.formatProfitLoss(fund) : '****.**'}
                </h5>
            </div>
            <div class="mb-3">
                <small class="text-muted">昨日收益</small>
                <p class="mb-0 ${fund.yesterdayProfit >= 0 ? 'text-danger' : 'text-success'}">
                    ${showAmount ? this.formatYesterdayProfit(fund) : '****.**'}
                </p>
            </div>
            <div class="mb-3">
                <small class="text-muted">当前净值 (${fund.jzrq || '--'})</small>
                <p class="mb-0">${fund.netValue || '--'}</p>
            </div>
            <div class="mb-2">
                <small class="text-muted">持仓份额</small>
                <p class="mb-0">${showAmount ? (fund.shares ? formatNumber(fund.shares) : '--') : '****.**'}</p>
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
                <div class="mt-3 pt-3 border-top">
                    <div class="mb-1">
                        <small class="text-muted">实时估值</small>
                        <p class="mb-0 font-weight-bold">${fund.gsz}</p>
                    </div>
                    <div class="mb-1">
                        <small class="text-muted">估值涨跌幅</small>
                        <p class="mb-0 ${gszzlClass}">
                            ${fund.gszzl !== null ? (parseFloat(fund.gszzl) >= 0 ? '+' : '') + fund.gszzl + '%' : '--'}
                        </p>
                    </div>
                    <div class="mb-1">
                        <small class="text-muted">当日收益（估值）</small>
                        <p class="mb-0 ${dayProfitClass}">
                            ${showAmount ? this.formatDayProfit(fund) : '****.**'}
                        </p>
                    </div>
                    <div>
                        <small class="text-muted">
                            <i class="bi bi-clock"></i> 估值时间: ${fund.gztime || '--'}
                        </small>
                    </div>
                </div>
            `;
        } else if (fund.updateTime) {
            return `
                <div class="mt-3 pt-3 border-top">
                    <small class="text-muted">
                        <i class="bi bi-clock"></i> 更新时间: ${fund.updateTime}
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
                <div class="mt-3 d-flex gap-2">
                    <button class="btn btn-sm btn-outline-primary flex-1" onclick="showSavedEditForm(${fund.id}, '${fund.fundName}', '${fund.fundCode || ''}', ${fund.amount}, ${fund.shares}, ${fund.netValue}, ${fund.profitLoss}, ${fund.costPrice})">
                        <i class="bi bi-pencil"></i> 编辑
                    </button>
                    <button class="btn btn-sm btn-outline-danger flex-1" onclick="deleteFund(${fund.id}, '${fund.fundName}')">
                        <i class="bi bi-trash"></i> 删除
                    </button>
                </div>
            `;
        } else {
            return `
                <div class="mt-3 d-flex gap-2">
                    <button class="btn btn-sm btn-outline-primary flex-1" onclick="showImportEditForm(${index}, '${fund.fundName}', '${fund.fundCode || ''}', ${fund.amount}, ${fund.shares}, ${fund.netValue}, ${fund.profitLoss}, ${fund.costPrice})">
                        <i class="bi bi-pencil"></i> 编辑
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
        const rateSign = fund.profitLossRate >= 0 ? '+' : '';
        return `${sign}${formatNumber(fund.profitLoss)} (${rateSign}${formatNumber(fund.profitLossRate)}%)`;
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

        const table = document.createElement('table');
        table.className = 'table table-hover fund-table mb-0';
        table.style.minWidth = '1000px';

        table.innerHTML = `
            <thead>
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
                        <button class="btn btn-sm btn-outline-primary" onclick="showSavedEditForm(${fund.id}, '${fund.fundName}', '${fund.fundCode || ''}', ${fund.amount}, ${fund.shares}, ${fund.netValue}, ${fund.profitLoss}, ${fund.costPrice})">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteFund(${fund.id}, '${fund.fundName}')">
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
