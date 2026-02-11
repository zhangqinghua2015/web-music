/**
 * 本地数据库封装 - 使用 IndexedDB
 */
const FundDB = {
    db: null,
    DB_NAME: 'FundAppDB',
    DB_VERSION: 2,

    async init() {
        if (this.db) return;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

            request.onerror = () => reject(request.error);

            request.onsuccess = () => {
                this.db = request.result;
                console.log('IndexedDB 初始化成功');
                resolve();
            };

            request.onupgradeneeded = (e) => {
                const db = e.target.result;

                // 基金持仓表
                if (!db.objectStoreNames.contains('positions')) {
                    const store = db.createObjectStore('positions', { keyPath: 'id', autoIncrement: true });
                    store.createIndex('fundCode', 'fundCode', { unique: false });
                }

                // 基金信息缓存表
                if (!db.objectStoreNames.contains('fundInfoCache')) {
                    db.createObjectStore('fundInfoCache', { keyPath: 'code' });
                }

                // 历史净值缓存表
                if (!db.objectStoreNames.contains('historyCache')) {
                    const store = db.createObjectStore('historyCache', { keyPath: ['fundCode', 'date'] });
                    store.createIndex('fundCode', 'fundCode', { unique: false });
                }
            };
        });
    },

    // ========== 持仓操作 ==========
    async getAllPositions() {
        console.log('FundDB.getAllPositions() 开始执行');
        await this.init();
        console.log('数据库初始化完成');
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('positions', 'readonly');
            const request = tx.objectStore('positions').getAll();
            request.onsuccess = () => {
                console.log('数据库查询成功，结果:', request.result);
                resolve(request.result || []);
            };
            request.onerror = () => {
                console.error('数据库查询失败:', request.error);
                reject(request.error);
            };
        });
    },

    async savePosition(position) {
        await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('positions', 'readwrite');
            const store = tx.objectStore('positions');

            // 如果没有 id，则新增；有 id 则更新
            const request = store.put(position);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async savePositions(positions) {
        await this.init();
        const results = [];
        for (const pos of positions) {
            const id = await this.savePosition(pos);
            results.push(id);
        }
        return results;
    },

    async deletePosition(id) {
        await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('positions', 'readwrite');
            const request = tx.objectStore('positions').delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    async getPosition(id) {
        await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('positions', 'readonly');
            const request = tx.objectStore('positions').get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    // ========== 基金信息缓存 ==========
    async cacheFundInfo(fundInfo) {
        await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('fundInfoCache', 'readwrite');
            const request = tx.objectStore('fundInfoCache').put(fundInfo);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    async getFundInfo(code) {
        await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('fundInfoCache', 'readonly');
            const request = tx.objectStore('fundInfoCache').get(code);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    // ========== 历史净值缓存 ==========
    async getHistoryCache(fundCode) {
        await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('historyCache', 'readonly');
            const index = tx.objectStore('historyCache').index('fundCode');
            const request = index.getAll(fundCode);
            request.onsuccess = () => {
                const result = (request.result || []).sort((a, b) => b.date.localeCompare(a.date));
                resolve(result);
            };
            request.onerror = () => reject(request.error);
        });
    },

    async saveHistoryCache(fundCode, historyList) {
        await this.init();
        const tx = this.db.transaction('historyCache', 'readwrite');
        const store = tx.objectStore('historyCache');
        for (const item of historyList) {
            store.put({ fundCode, date: item.date, netValue: item.netValue });
        }
        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    },

    async cleanOldHistory(days = 30) {
        await this.init();
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        const cutoff = cutoffDate.toISOString().split('T')[0];

        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('historyCache', 'readwrite');
            const store = tx.objectStore('historyCache');
            const request = store.openCursor();
            request.onsuccess = (e) => {
                const cursor = e.target.result;
                if (cursor) {
                    if (cursor.value.date < cutoff) {
                        cursor.delete();
                    }
                    cursor.continue();
                }
            };
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    },

    async deleteHistoryCache(fundCode) {
        await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('historyCache', 'readwrite');
            const store = tx.objectStore('historyCache');
            const index = store.index('fundCode');
            const request = index.openCursor(fundCode);
            request.onsuccess = (e) => {
                const cursor = e.target.result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                }
            };
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }
};
