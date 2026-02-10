/**
 * 工具函数模块
 */
const Utils = {
    /**
     * 格式化数字（保留2位小数，添加千分位）
     */
    formatNumber(num) {
        if (num === null || num === undefined) return '0.00';
        return parseFloat(num).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    },

    /**
     * 格式化金额（带货币符号）
     */
    formatAmount(amount, visible = true) {
        if (!visible) return '****.**';
        return '¥' + this.formatNumber(amount);
    },

    /**
     * 格式化盈亏（带正负号）
     */
    formatProfit(profit, visible = true) {
        if (!visible) return '****.**';
        if (profit === null || profit === undefined) return '--';
        const sign = profit >= 0 ? '+' : '';
        return sign + this.formatNumber(profit);
    },

    /**
     * 格式化百分比
     */
    formatPercent(value) {
        if (value === null || value === undefined) return '--';
        const sign = value >= 0 ? '+' : '';
        return sign + this.formatNumber(value) + '%';
    },

    /**
     * 获取盈亏CSS类名
     */
    getProfitClass(value) {
        if (value === null || value === undefined) return '';
        return value >= 0 ? 'profit-positive' : 'profit-negative';
    },

    /**
     * 显示错误提示
     */
    showError(message, duration = 5000) {
        const errorDiv = document.getElementById('errorMessage');
        const errorText = document.getElementById('errorText');

        if (errorDiv && errorText) {
            errorText.textContent = message;
            errorDiv.classList.remove('d-none');

            setTimeout(() => {
                errorDiv.classList.add('d-none');
            }, duration);
        } else {
            alert(message);
        }
    },

    /**
     * 显示成功提示（复用错误提示框）
     */
    showSuccess(message) {
        this.showError(message, 3000);
    },

    /**
     * 计算持有份额
     */
    calculateShares(amount, netValue) {
        if (!amount || !netValue || netValue <= 0) return null;
        return amount / netValue;
    },

    /**
     * 计算成本价
     */
    calculateCostPrice(amount, profitLoss, shares) {
        if (!amount || !shares || shares <= 0) return null;
        const loss = profitLoss || 0;
        return (amount - loss) / shares;
    }
};

// 兼容旧代码的全局函数
function formatNumber(num) {
    return Utils.formatNumber(num);
}

function showError(message) {
    Utils.showError(message);
}
