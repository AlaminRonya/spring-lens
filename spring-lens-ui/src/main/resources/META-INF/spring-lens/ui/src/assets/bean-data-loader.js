export class BeanTreeBuilder {
    static _displayName(beanName) {
        if (!beanName) return '';
        const lastPart = beanName.split('.').pop() || '';
        const cleaned = lastPart.replace(/\$\$.*$/, '');
        return cleaned.split('$').pop() || '';
    }

    static _getGroupName(beanName) {
        if (!beanName) return '';
        if (beanName.includes('.')) {
            const parts = beanName.split('.');
            return parts.slice(0, Math.min(3, parts.length - 1)).join('.');
        }
        return beanName;
    }

    /**
     * Builds hierarchical D3 tree data grouped dynamically by contextId.
     * Every single node name and structure is derived dynamically from the API JSON payload.
     */
    static buildByContext(beans = []) {
        if (!beans || beans.length === 0) {
            return {
                name: '',
                fullName: '',
                meta: { type: 'root' },
                children: []
            };
        }

        // 1. Group beans dynamically by contextId from the API response
        const contextMap = new Map();
        for (let i = 0; i < beans.length; i++) {
            const bean = beans[i];
            const ctxId = bean.contextId || 'default';
            if (!contextMap.has(ctxId)) {
                contextMap.set(ctxId, []);
            }
            contextMap.get(ctxId).push(bean);
        }

        const contextNodes = [];

        // 2. Build tree for each contextId dynamically
        for (const [contextId, contextBeans] of contextMap.entries()) {
            const map = new Map(contextBeans.map(b => [b.beanName, b]));
            const childrenOf = new Map();
            const hasParent = new Set();

            for (const { beanName, dependencies = [] } of contextBeans) {
                for (const dep of dependencies) {
                    if (!map.has(dep)) continue;
                    if (!childrenOf.has(dep)) {
                        childrenOf.set(dep, new Set());
                    }
                    childrenOf.get(dep).add(beanName);
                    hasParent.add(beanName);
                }
            }

            const roots = contextBeans
                .map(({ beanName }) => beanName)
                .filter(name => !hasParent.has(name));

            const buildNode = (beanName, visited = new Set()) => {
                const bean = map.get(beanName);
                const displayName = BeanTreeBuilder._displayName(beanName);

                if (!bean) {
                    return {
                        name: displayName,
                        fullName: beanName,
                        contextId,
                        meta: { contextId }
                    };
                }

                const {
                    type,
                    scope,
                    role,
                    factoryMethodName: factoryMethod,
                    dependencies = [],
                    dependents = []
                } = bean;

                const node = {
                    name: displayName,
                    fullName: beanName,
                    contextId,
                    meta: {
                        type,
                        scope,
                        role,
                        factoryMethod,
                        contextId,
                        deps: dependencies ? dependencies.length : 0,
                        dependents: dependents ? dependents.length : 0,
                    },
                };

                const kids = childrenOf.get(beanName);
                if (!kids || kids.size === 0) return node;

                const nv = new Set(visited).add(beanName);
                node.children = Array.from(kids).map(childName =>
                    nv.has(childName)
                        ? { name: BeanTreeBuilder._displayName(childName), fullName: childName, contextId, meta: { note: 'cycle', contextId } }
                        : buildNode(childName, nv)
                );
                return node;
            };

            const contextChildren = roots.map(rootName => buildNode(rootName));

            contextNodes.push({
                name: contextId,
                fullName: contextId,
                meta: { type: 'context', contextId },
                children: contextChildren
            });
        }

        if (contextNodes.length === 1) {
            return contextNodes[0];
        }

        const rootTitle = Array.from(contextMap.keys()).join(' / ');
        return {
            name: rootTitle,
            fullName: rootTitle,
            meta: { type: 'root' },
            children: contextNodes
        };
    }

    static build(beans = []) {
        if (!beans || beans.length === 0) {
            return {
                name: '',
                fullName: '',
                meta: { type: 'root' },
                children: []
            };
        }

        const map = new Map(beans.map(bean => [bean.beanName, bean]));
        const childrenOf = new Map();
        const hasParent = new Set();

        for (const { beanName, dependencies = [] } of beans) {
            for (const dep of dependencies) {
                if (!map.has(dep)) continue;
                if (!childrenOf.has(dep)) {
                    childrenOf.set(dep, new Set());
                }
                childrenOf.get(dep).add(beanName);
                hasParent.add(beanName);
            }
        }

        const roots = beans
            .map(({ beanName }) => beanName)
            .filter(name => !hasParent.has(name));

        const buildNode = (beanName, visited = new Set()) => {
            const bean = map.get(beanName);
            const displayName = BeanTreeBuilder._displayName(beanName);

            if (!bean) {
                return {
                    name: displayName,
                    fullName: beanName,
                    meta: {}
                };
            }

            const {
                type,
                scope,
                role,
                factoryMethodName: factoryMethod,
                dependencies = [],
                dependents = []
            } = bean;

            const node = {
                name: displayName,
                fullName: beanName,
                meta: {
                    type,
                    scope,
                    role,
                    factoryMethod,
                    deps: dependencies ? dependencies.length : 0,
                    dependents: dependents ? dependents.length : 0,
                },
            };

            const kids = childrenOf.get(beanName);
            if (!kids || kids.size === 0) return node;

            const nv = new Set(visited).add(beanName);
            node.children = Array.from(kids).map(childName =>
                nv.has(childName)
                    ? { name: BeanTreeBuilder._displayName(childName), fullName: childName, meta: { note: 'cycle' } }
                    : buildNode(childName, nv)
            );
            return node;
        };

        const grouped = new Map();
        for (const root of roots) {
            const groupName = BeanTreeBuilder._getGroupName(root);
            let group = grouped.get(groupName);
            if (!group) {
                group = {
                    name: groupName,
                    fullName: groupName,
                    meta: { type: 'group' },
                    children: []
                };
                grouped.set(groupName, group);
            }
            group.children.push(buildNode(root));
        }

        const rootTitle = Array.from(grouped.keys()).filter(Boolean).join(' / ') || beans[0]?.contextId || 'Context';
        return {
            name: rootTitle,
            fullName: rootTitle,
            meta: { type: 'root' },
            children: Array.from(grouped.values()),
        };
    }
}

/**
 * Responsible for loading, parsing, and building the hierarchical structure
 * of Spring bean definitions for D3.js visualization.
 */
export default class BeanDataLoader {
    /**
     * @param {string} [dataUrl] - The endpoint/path to fetch bean definitions from.
     * @param {Object} [options] - Additional options (e.g. isSummary flag).
     */
    constructor(dataUrl, options = {}) {
        this.dataUrl = dataUrl;
        this.isSummary = options.isSummary ?? false;
        this.rootPromise = null;
        this.accumulatedBeans = [];
        this.onChunkLoaded = null;
        this.onProgress = null;
        this.isLoadingRemaining = false;
        this.totalElements = 0;
    }

    /**
     * Resets internal cache and forces a fresh reload of bean graph data.
     */
    reload() {
        this.rootPromise = null;
        this.accumulatedBeans = [];
        this.isLoadingRemaining = false;
        this.totalElements = 0;
        return this.load();
    }

    /**
     * Loads and processes the bean definitions. Caches the result so that
     * subsequent calls return the same promise.
     * @returns {Promise<d3.HierarchyNode>}
     */
    load() {
        if (!this.rootPromise) {
            this.rootPromise = this._loadBeanData();
        }
        return this.rootPromise;
    }

    _emitProgress({ isComplete = false, hasError = false, errorMsg = '' } = {}) {
        if (typeof this.onProgress === 'function') {
            this.onProgress({
                loaded: this.accumulatedBeans.length,
                total: this.totalElements || this.accumulatedBeans.length,
                isComplete,
                hasError,
                errorMsg
            });
        }
    }

    /**
     * Fetches bean definitions directly from dataUrl without appending pagination URL parameters.
     * Takes the first 500 items for immediate rendering and schedules lazy background chunking for the rest.
     * @private
     * @returns {Promise<d3.HierarchyNode>}
     */
    async _loadBeanData() {
        try {
            this._emitProgress({ isComplete: false, hasError: false });

            const response = await fetch(this.dataUrl);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            const {
                content = [],
                totalPages = 1,
                pageNumber = 0,
                last = true,
                totalElements
            } = data;

            this.totalElements = totalElements || content.length;

            // Load initial 500 items first for instant graph view
            const initialChunkSize = 500;
            const initialItems = content.slice(0, initialChunkSize);
            this.accumulatedBeans = [...initialItems];
            this._updateGlobalBeansMap(this.accumulatedBeans);

            const root = this._buildHierarchyFromBeans(this.accumulatedBeans);

            const remainingFromFirstPage = content.slice(initialChunkSize);
            const hasMoreToLoad = remainingFromFirstPage.length > 0 || (!last && pageNumber < totalPages - 1);

            this._emitProgress({ isComplete: !hasMoreToLoad });

            // Schedule lazy background loading for remaining items & API pages
            if (hasMoreToLoad) {
                setTimeout(() => {
                    this._loadRemainingDataLazily(remainingFromFirstPage, data);
                }, 50);
            }

            return root;
        } catch (error) {
            console.error('Error loading initial bean graph data:', error);
            this._emitProgress({ hasError: true, errorMsg: error.message });
            throw error;
        }
    }

    /**
     * Process remaining items lazily in 500-item background chunks so the UI remains fast and responsive.
     * @private
     */
    async _loadRemainingDataLazily(remainingFromFirstPage = [], firstPageData = {}) {
        if (this.isLoadingRemaining) return;
        this.isLoadingRemaining = true;

        const chunkSize = 500;

        try {
            // 1. Process remaining items from initial page payload in 500-item chunks
            if (remainingFromFirstPage.length > 0) {
                for (let i = 0; i < remainingFromFirstPage.length; i += chunkSize) {
                    const chunk = remainingFromFirstPage.slice(i, i + chunkSize);
                    this.accumulatedBeans.push(...chunk);
                    this._updateGlobalBeansMap(this.accumulatedBeans);

                    const updatedRoot = this._buildHierarchyFromBeans(this.accumulatedBeans);
                    if (typeof this.onChunkLoaded === 'function') {
                        this.onChunkLoaded(updatedRoot);
                    }
                    this._emitProgress({ isComplete: false });
                    await new Promise(res => setTimeout(res, 50));
                }
            }

            // 2. Fetch subsequent pages if any remain
            const { totalPages = 1, pageNumber = 0, last = true, pageSize = 500 } = firstPageData;
            if (!last && pageNumber < totalPages - 1) {
                const baseUrl = this.dataUrl.split('?')[0];
                const hasQuery = baseUrl.includes('?');

                for (let nextPage = pageNumber + 1; nextPage < totalPages; nextPage++) {
                    const chunkUrl = `${baseUrl}${hasQuery ? '&' : '?'}pageNumber=${nextPage}&pageSize=${pageSize}`;
                    const res = await fetch(chunkUrl);
                    if (!res.ok) {
                        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                    }

                    const pageData = await res.json();
                    const pageContent = pageData.content || [];
                    if (pageContent.length === 0) break;

                    for (let j = 0; j < pageContent.length; j += chunkSize) {
                        const chunk = pageContent.slice(j, j + chunkSize);
                        this.accumulatedBeans.push(...chunk);
                        this._updateGlobalBeansMap(this.accumulatedBeans);

                        const updatedRoot = this._buildHierarchyFromBeans(this.accumulatedBeans);
                        if (typeof this.onChunkLoaded === 'function') {
                            this.onChunkLoaded(updatedRoot);
                        }
                        this._emitProgress({ isComplete: false });
                        await new Promise(res => setTimeout(res, 50));
                    }
                }
            }

            this._emitProgress({ isComplete: true });
        } catch (err) {
            console.error('Error loading chunk background data:', err);
            this._emitProgress({ hasError: true, errorMsg: err.message });
        } finally {
            this.isLoadingRemaining = false;
        }
    }

    _updateGlobalBeansMap(beans) {
        const allBeansMap = new Map();
        let totalDeps = 0;

        for (let i = 0; i < beans.length; i++) {
            const bean = beans[i];
            allBeansMap.set(bean.beanName, bean);
            totalDeps += bean.dependencies?.length ?? 0;
        }

        window.allBeansMap = allBeansMap;
        $('#beans-count').text(beans.length);
        $('#deps-count').text(totalDeps);
    }

    _buildHierarchyFromBeans(beans) {
        const data = this.isSummary
            ? BeanTreeBuilder.buildByContext(beans)
            : BeanTreeBuilder.build(beans);

        if (!data) return null;

        const root = d3.hierarchy(data);
        const allNodes = root.descendants();
        const nodeCount = allNodes.length;

        for (let i = 0; i < nodeCount; i++) {
            const node = allNodes[i];
            node.id = i;
            node._children = node.children;

            if (node.depth > 0) {
                node.children = null;
            }
        }

        root.x0 = 0;
        root.y0 = 0;
        return root;
    }
}