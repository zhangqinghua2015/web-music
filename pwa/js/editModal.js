/**
 * 统一的基金编辑弹窗组件
 * 合并了导入编辑和已保存编辑两个弹窗的逻辑
 */
class FundEditModal {
    constructor(modalId, options = {}) {
        this.modalId = modalId;
        this.prefix = options.prefix || modalId.replace('Modal', '');
        this.isImportMode = options.isImportMode || false;
        this.onSave = options.onSave || (() => {});
        this.modal = null;
        this.fundData = null;
    }

    /**
     * 获取表单元素
     */
    getElement(field) {
        return document.getElementById(`${this.prefix}Fund${field}`);
    }

    /**
     * 获取表单值
     */
    getValue(field) {
        const el = this.getElement(field);
        return el ? el.value : '';
    }

    /**
     * 设置表单值
     */
    setValue(field, value) {
        const el = this.getElement(field);
        if (el) {
            el.value = value || '';
        }
    }

    /**
     * 显示弹窗
     */
    show(fundData) {
        this.fundData = fundData;

        // 填充表单数据
        if (this.isImportMode) {
            this.setValue('Index', fundData.index);
        } else {
            this.setValue('Id', fundData.id);
        }
        this.setValue('Name', fundData.fundName);
        this.setValue('Code', fundData.fundCode);
        this.setValue('Amount', fundData.amount);
        this.setValue('Shares', fundData.shares);
        this.setValue('NetValue', fundData.netValue);
        this.setValue('ProfitLoss', fundData.profitLoss);
        this.setValue('CostPrice', fundData.costPrice);

        // 绑定事件
        this.bindEvents();

        // 显示模态框
        this.modal = new bootstrap.Modal(document.getElementById(this.modalId));
        this.modal.show();
    }

    /**
     * 绑定表单事件
     */
    bindEvents() {
        const amountInput = this.getElement('Amount');
        const profitLossInput = this.getElement('ProfitLoss');
        const nameInput = this.getElement('Name');
        const codeInput = this.getElement('Code');

        // 金额变化时重新计算
        if (amountInput) {
            amountInput.oninput = () => this.recalculate();
        }

        // 盈亏变化时重新计算
        if (profitLossInput) {
            profitLossInput.oninput = () => this.recalculate();
        }

        // 基金名称变化时搜索代码
        if (nameInput) {
            nameInput.oninput = () => {
                const name = nameInput.value.trim();
                if (name.length > 1) {
                    this.searchByName(name);
                }
            };
        }

        // 基金代码变化时搜索名称
        if (codeInput) {
            codeInput.oninput = () => {
                const code = codeInput.value.trim();
                if (code.length === 6) {
                    this.searchByCode(code);
                }
            };
        }
    }

    /**
     * 重新计算份额和成本价
     */
    recalculate() {
        const amount = parseFloat(this.getValue('Amount'));
        const netValue = parseFloat(this.getValue('NetValue'));
        const profitLoss = parseFloat(this.getValue('ProfitLoss')) || 0;

        if (!isNaN(amount) && !isNaN(netValue) && netValue > 0) {
            const shares = amount / netValue;
            this.setValue('Shares', shares.toFixed(2));

            if (shares > 0) {
                const costPrice = (amount - profitLoss) / shares;
                this.setValue('CostPrice', costPrice.toFixed(6));
            }
        } else {
            this.setValue('Shares', '');
            this.setValue('CostPrice', '');
        }
    }

    /**
     * 根据名称搜索基金
     */
    async searchByName(name) {
        try {
            const data = await FundApi.searchFund({ name });
            if (data && data.length > 0) {
                const fundCode = data[0].code;
                this.setValue('Code', fundCode);
                this.fetchValuation(fundCode);
            }
        } catch (error) {
            console.error('查询基金代码失败:', error);
        }
    }

    /**
     * 根据代码搜索基金
     */
    async searchByCode(code) {
        try {
            const data = await FundApi.searchFund({ code });
            if (data && data.length > 0) {
                this.setValue('Name', data[0].fullName || data[0].name);
                this.fetchValuation(code);
            }
        } catch (error) {
            console.error('查询基金名称失败:', error);
        }
    }

    /**
     * 获取基金估值并计算
     */
    async fetchValuation(fundCode) {
        try {
            const valuation = await FundApi.getValuation(fundCode);
            if (valuation && valuation.dwjz) {
                this.setValue('NetValue', valuation.dwjz);
                this.recalculate();
            }
        } catch (error) {
            console.error('获取基金估值失败:', error);
        }
    }

    /**
     * 验证表单
     */
    validate() {
        const name = this.getValue('Name');
        const code = this.getValue('Code');
        const amount = this.getValue('Amount');

        if (!name) {
            Utils.showError('基金名称不能为空');
            return false;
        }
        if (!code) {
            Utils.showError('基金代码不能为空');
            return false;
        }
        if (!amount) {
            Utils.showError('持有金额不能为空');
            return false;
        }
        return true;
    }

    /**
     * 获取表单数据
     */
    getFormData() {
        return {
            fundName: this.getValue('Name'),
            fundCode: this.getValue('Code'),
            amount: parseFloat(this.getValue('Amount')) || 0,
            shares: parseFloat(this.getValue('Shares')) || 0,
            netValue: parseFloat(this.getValue('NetValue')) || 0,
            profitLoss: parseFloat(this.getValue('ProfitLoss')) || 0,
            costPrice: parseFloat(this.getValue('CostPrice')) || 0
        };
    }

    /**
     * 隐藏弹窗
     */
    hide() {
        if (this.modal) {
            this.modal.hide();
        }
    }

    /**
     * 保存数据
     */
    async save() {
        if (!this.validate()) {
            return false;
        }

        const formData = this.getFormData();

        try {
            await this.onSave(formData, this.fundData);
            this.hide();
            return true;
        } catch (error) {
            Utils.showError(error.message || '保存失败');
            return false;
        }
    }
}

// 创建两个弹窗实例
let importEditModal = null;
let savedEditModal = null;

/**
 * 初始化编辑弹窗
 */
function initEditModals() {
    // 导入页面编辑弹窗
    importEditModal = new FundEditModal('importEditFundModal', {
        prefix: 'importEdit',
        isImportMode: true,
        onSave: async (formData, originalData) => {
            // 更新前端全局变量中的数据
            if (window.parsedFundPositions && window.parsedFundPositions[originalData.index]) {
                Object.assign(window.parsedFundPositions[originalData.index], formData);
                displayResults(window.parsedFundPositions);
                Utils.showSuccess('基金信息已更新');
            } else {
                throw new Error('更新失败，未找到对应的基金数据');
            }
        }
    });

    // 已保存基金编辑弹窗
    savedEditModal = new FundEditModal('savedEditFundModal', {
        prefix: 'savedEdit',
        isImportMode: false,
        onSave: async (formData, originalData) => {
            await FundApi.updatePosition(originalData.id, formData);
            refreshImportedFunds();
        }
    });
}

/**
 * 显示导入编辑表单（兼容旧代码）
 */
function showImportEditForm(index, name, code, amount, shares, netValue, profitLoss, costPrice) {
    if (!importEditModal) {
        initEditModals();
    }
    importEditModal.show({
        index,
        fundName: name,
        fundCode: code,
        amount,
        shares,
        netValue,
        profitLoss,
        costPrice
    });
}

/**
 * 显示已保存基金编辑表单（兼容旧代码）
 */
function showSavedEditForm(id, name, code, amount, shares, netValue, profitLoss, costPrice) {
    if (!savedEditModal) {
        initEditModals();
    }
    savedEditModal.show({
        id,
        fundName: name,
        fundCode: code,
        amount,
        shares,
        netValue,
        profitLoss,
        costPrice
    });
}

/**
 * 确认导入编辑（兼容旧代码）
 */
function confirmImportFundChanges() {
    if (importEditModal) {
        importEditModal.save();
    }
}

/**
 * 保存已导入基金更改（兼容旧代码）
 */
function saveFundChanges() {
    if (savedEditModal) {
        savedEditModal.save();
    }
}
