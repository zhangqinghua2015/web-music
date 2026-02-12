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
    },

    /**
     * 防抖函数 - 延迟执行，多次调用只执行最后一次
     */
    debounce(func, delay = 300) {
        let timeoutId;
        return function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    },

    /**
     * 节流函数 - 限制执行频率
     */
    throttle(func, delay = 300) {
        let lastCall = 0;
        let timeoutId;
        return function(...args) {
            const now = Date.now();
            const timeSinceLastCall = now - lastCall;

            clearTimeout(timeoutId);

            if (timeSinceLastCall >= delay) {
                lastCall = now;
                func.apply(this, args);
            } else {
                timeoutId = setTimeout(() => {
                    lastCall = Date.now();
                    func.apply(this, args);
                }, delay - timeSinceLastCall);
            }
        };
    },

    /**
     * 计算基金份额和成本价（合并计算逻辑）
     */
    calculateFundShares(amount, netValue, profitLoss = 0) {
        if (!amount || !netValue || netValue <= 0) {
            return { shares: null, costPrice: null };
        }

        const shares = amount / netValue;
        const costPrice = shares > 0 ? (amount - profitLoss) / shares : null;

        return {
            shares: shares,
            costPrice: costPrice
        };
    }
};

// 兼容旧代码的全局函数
function formatNumber(num) {
    return Utils.formatNumber(num);
}

function showError(message) {
    Utils.showError(message);
}
