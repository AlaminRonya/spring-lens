/**
 * Manages in-memory bean definition mappings
 */
class BeanDataStore {

    constructor() {
        this.beansMap = new Map();
        window.allBeansMap = this.beansMap;
    }

    setBeans(beans) {
        this.clearBeans();
        this.addBeans(beans);
    }

    addBeans(beans) {
        if (!beans) return;

        if (Array.isArray(beans)) {
            beans.forEach(bean => {
                if (bean && bean.beanName) {
                    this.beansMap.set(bean.beanName, bean);
                    if (bean.contextId) {
                        this.beansMap.set(`${bean.contextId}:${bean.beanName}`, bean);
                    }
                }
            });
        } else if (beans instanceof Map) {
            for (const [key, value] of beans.entries()) {
                this.beansMap.set(key, value);
            }
        } else if (typeof beans === 'object') {
            for (const [key, value] of Object.entries(beans)) {
                this.beansMap.set(key, value);
            }
        }

        window.allBeansMap = this.beansMap;
    }

    getBean(beanName) {
        return this.beansMap.get(beanName);
    }

    findBeanById(id) {
        if (!id) return null;
        if (this.beansMap.has(id)) {
            return this.beansMap.get(id);
        }
        for (const bean of this.beansMap.values()) {
            const uniqueId = bean.contextId ? `${bean.contextId}:${bean.beanName}` : bean.beanName;
            if (uniqueId === id || bean.beanName === id) {
                return bean;
            }
        }
        return null;
    }

    findBeanByName(beanName, contextId = null) {
        if (!beanName) return null;
        if (contextId) {
            const compositeKey = `${contextId}:${beanName}`;
            if (this.beansMap.has(compositeKey)) {
                return this.beansMap.get(compositeKey);
            }
        }
        return this.beansMap.get(beanName) || null;
    }

    getAllBeans() {
        return Array.from(new Set(this.beansMap.values()));
    }

    has(key) {
        return this.beansMap.has(key);
    }

    get size() {
        return this.beansMap.size;
    }

    values() {
        return this.beansMap.values();
    }

    clearBeans() {
        this.beansMap.clear();
        if (window.allBeansMap) {
            window.allBeansMap = this.beansMap;
        }
    }
}

const beanDataStore = new BeanDataStore();
export default beanDataStore;