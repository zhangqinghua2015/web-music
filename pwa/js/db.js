/**
 * 本地数据库封装 - 使用 IndexedDB
 */
const FundDB = {
    db: null,
    DB_NAME: 'FundAppDB',
    DB_VERSION: 3,

    async init() {
        if (this.db) return;

        // 请求持久化存储权限，防止数据被浏览器清理
        await this.requestPersistentStorage();

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
                const oldVersion = e.oldVersion;

                // 基金持仓表
                if (!db.objectStoreNames.contains('positions')) {
                    db.createObjectStore('positions', { keyPath: 'fundCode' });
                } else if (oldVersion < 3) {
                    // 从 v2 升级到 v3：改为以 fundCode 为主键
                    db.deleteObjectStore('positions');
                    db.createObjectStore('positions', { keyPath: 'fundCode' });
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

    /**
     * 请求持久化存储权限
     */
    async requestPersistentStorage() {
        if (navigator.storage && navigator.storage.persist) {
            try {
                const isPersisted = await navigator.storage.persisted();
                console.log('当前存储是否持久化:', isPersisted);

                if (!isPersisted) {
                    const result = await navigator.storage.persist();
                    console.log('请求持久化存储:', result ? '成功' : '失败');

                    if (!result) {
                        console.warn('浏览器拒绝了持久化存储请求，数据可能会被清理');
                    }
                }
            } catch (error) {
                console.warn('持久化存储 API 不支持或出错:', error);
            }
        } else {
            console.warn('浏览器不支持持久化存储 API');
        }
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
        // 确保 fundCode 存在
        if (!position.fundCode) {
            throw new Error('基金代码不能为空');
        }

        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('positions', 'readwrite');
            const store = tx.objectStore('positions');
            // 使用 put 会自动更新相同 fundCode 的记录
            const request = store.put(position);
            request.onsuccess = () => resolve(position.fundCode);
            request.onerror = () => reject(request.error);
        });
    },

    async savePositions(positions) {
        await this.init();
        const results = [];
        for (const pos of positions) {
            const fundCode = await this.savePosition(pos);
            results.push(fundCode);
        }
        return results;
    },

    async deletePosition(fundCode) {
        await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('positions', 'readwrite');
            const request = tx.objectStore('positions').delete(fundCode);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    async getPosition(fundCode) {
        await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('positions', 'readonly');
            const request = tx.objectStore('positions').get(fundCode);
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
