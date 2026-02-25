/**
 * 本地 API 封装 - 替代后端 API
 */
const FundApi = {
    // CORS 代理列表（多个备用）
    CORS_PROXIES: [
        'https://api.codetabs.com/v1/proxy?quest=',
        'https://corsproxy.io/?',
        'https://api.allorigins.win/raw?url='
    ],

    /**
     * 带重试的 fetch（优化：减少重试次数，添加延迟）
     */
    async fetchWithRetry(url, maxRetries = 1) {
        for (let proxyIndex = 0; proxyIndex < this.CORS_PROXIES.length; proxyIndex++) {
            const proxy = this.CORS_PROXIES[proxyIndex];
            for (let retry = 0; retry <= maxRetries; retry++) {
                try {
                    const response = await fetch(proxy + encodeURIComponent(url));
                    if (response.ok) return response;
                } catch (e) {
                    if (retry === maxRetries && proxyIndex === this.CORS_PROXIES.length - 1) throw e;
                    // 添加重试延迟：第一次 500ms，第二次 1000ms
                    if (retry < maxRetries) {
                        await new Promise(resolve => setTimeout(resolve, 500 * (retry + 1)));
                    }
                }
            }
        }
        throw new Error('All proxies failed');
    },

    /**
     * 获取所有基金持仓
     */
    async getPositions() {
        console.log('FundApi.getPositions() 开始执行');
        const positions = await FundDB.getAllPositions();
        console.log('FundDB.getAllPositions() 返回:', positions);
        // 并行获取估值
        console.log('开始更新估值信息');
        await this.updateValuationsForList(positions);
        console.log('估值信息更新完成');
        return positions;
    },

    /**
     * 更新基金持仓
     */
    async updatePosition(fundCode, data) {
        const existing = await FundDB.getPosition(fundCode);
        if (!existing) throw new Error('基金记录不存在');

        // 检查基金代码是否被修改
        const newFundCode = data.fundCode || fundCode;
        if (newFundCode !== fundCode) {
            // 基金代码变更：删除旧记录，创建新记录
            await FundDB.deletePosition(existing.fundCode);
            const newPosition = { ...existing, ...data, fundCode: newFundCode };
            await FundDB.savePosition(newPosition);
            return newPosition;
        }

        // 基金代码未变更：正常更新
        const updated = { ...existing, ...data, fundCode };
        await FundDB.savePosition(updated);
        return updated;
    },

    /**
     * 删除基金持仓
     */
    async deletePosition(fundCode) {
        await FundDB.deletePosition(fundCode);
    },

    /**
     * 保存基金持仓列表
     */
    async savePositions(positions) {
        return await FundDB.savePositions(positions);
    },

    /**
     * 搜索基金（按名称或代码）
     */
    async searchFund(params) {
        const keyword = params.name || params.code || '';
        if (!keyword) return [];

        try {
            const url = `https://fundsuggest.eastmoney.com/FundSearch/api/FundSearchAPI.ashx?callback=&m=1&key=${encodeURIComponent(keyword)}`;
            const response = await this.fetchWithRetry(url);
            const data = await response.json();

            if (data && data.Datas) {
                return data.Datas.map(item => ({
                    code: item.CODE,
                    name: item.NAME,
                    shortName: item.SHORTNAME,
                    fullName: item.NAME,
                    type: item.FundBaseInfo?.FTYPE || ''
                }));
            }
        } catch (e) {
            console.error('搜索基金失败:', e);
        }
        return [];
    },

    /**
     * 获取基金估值（优化：添加缓存）
     */
    async getValuation(fundCode) {
        if (!fundCode) return null;

        // 检查缓存（10秒有效期）
        const cacheKey = `valuation_${fundCode}`;
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
            try {
                const { data, timestamp } = JSON.parse(cached);
                const age = Date.now() - timestamp;
                if (age < 10 * 1000) { // 10秒
                    return data;
                }
            } catch (e) {
                // 缓存解析失败，继续请求
            }
        }

        try {
            const url = `https://fundgz.1234567.com.cn/js/${fundCode}.js?rt=${Date.now()}`;
            const response = await this.fetchWithRetry(url);
            const text = await response.text();

            // 解析 JSONP: jsonpgz({...})
            const match = text.match(/jsonpgz\((.+)\)/);
            if (match) {
                const data = JSON.parse(match[1]);
                // 保存到缓存
                sessionStorage.setItem(cacheKey, JSON.stringify({
                    data: data,
                    timestamp: Date.now()
                }));
                return data;
            }
        } catch (e) {
            console.error('获取估值失败:', fundCode, e);
        }
        return null;
    },

    /**
     * 获取基金历史净值（最近几天）
     */
    async getFundHistory(fundCode) {
        if (!fundCode) return [];

        // 检查今天是否已刷新过
        const cacheKey = `history_${fundCode}_${new Date().toISOString().split('T')[0]}`;
        const cached = await FundDB.getHistoryCache(fundCode);

        if (cached.length >= 2 && sessionStorage.getItem(cacheKey)) {
            return cached;
        }

        try {
            const endDate = new Date();
            endDate.setDate(endDate.getDate() - 1);
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 20);

            const formatDate = d => d.toISOString().split('T')[0];
            const url = `https://fund.eastmoney.com/f10/F10DataApi.aspx?type=lsjz&code=${fundCode}&page=1&sdate=${formatDate(startDate)}&edate=${formatDate(endDate)}&per=10`;

            const response = await this.fetchWithRetry(url);
            const text = await response.text();

            // 解析HTML表格
            const matches = [...text.matchAll(/<td>(\d{4}-\d{2}-\d{2})<\/td><td[^>]*>([^<]+)<\/td>/g)];
            const history = matches.map(m => ({ date: m[1], netValue: parseFloat(m[2]) }));

            // 保存到缓存
            if (history.length > 0) {
                // 清除旧数据，保存新数据
                await FundDB.deleteHistoryCache(fundCode);
                await FundDB.saveHistoryCache(fundCode, history);
                sessionStorage.setItem(cacheKey, '1');
            }

            return history;
        } catch (e) {
            console.error('获取历史净值失败:', fundCode, e);
        }
        return cached.length > 0 ? cached : [];
    },

    /**
     * 批量更新估值
     */
    async updateValuationsForList(positions) {
        if (!positions || positions.length === 0) return;

        const promises = positions.map(async (pos) => {
            if (!pos.fundCode) return;

            try {
                // 并行获取估值和历史净值
                const [valuation, history] = await Promise.all([
                    this.getValuation(pos.fundCode),
                    this.getFundHistory(pos.fundCode)
                ]);

                if (valuation) {
                    pos.jzrq = valuation.jzrq;
                    pos.dwjz = valuation.dwjz;
                    pos.gsz = valuation.gsz;
                    pos.gszzl = valuation.gszzl;
                    pos.gztime = valuation.gztime;

                    if (valuation.dwjz) {
                        pos.netValue = parseFloat(valuation.dwjz);
                    }

                    // 重新计算持仓金额和盈亏金额
                    if (pos.shares && pos.netValue) {
                        pos.amount = parseFloat((pos.shares * pos.netValue).toFixed(2));
                        if (pos.costPrice) {
                            pos.profitLoss = parseFloat(((pos.netValue - pos.costPrice) * pos.shares).toFixed(2));
                        }
                    }

                    // 计算当日收益
                    if (pos.shares && valuation.gszzl) {
                        const gszzl = parseFloat(valuation.gszzl) / 100;
                        pos.dayProfit = pos.shares * pos.netValue * gszzl;
                    }
                }

                // 计算昨日收益
                if (pos.shares && history.length >= 2) {
                    const latestNetValue = history[0].netValue;
                    const previousNetValue = history[1].netValue;
                    pos.yesterdayProfit = pos.shares * (latestNetValue - previousNetValue);
                }
            } catch (e) {
                console.error('更新估值失败:', pos.fundCode, e);
            }
        });

        await Promise.all(promises);
    },

    /**
     * 获取缓存信息（兼容原接口）
     */
    async getCacheInfo() {
        const positions = await FundDB.getAllPositions();
        return {
            fundCacheSize: positions.length,
            historyCacheSize: 0
        };
    },

    /**
     * 刷新缓存（兼容原接口）
     */
    async refreshCache() {
        // 纯前端版本无需刷新缓存
        return true;
    },

    /**
     * 健康检查（兼容原接口）
     */
    async healthCheck() {
        return true;
    }
};
