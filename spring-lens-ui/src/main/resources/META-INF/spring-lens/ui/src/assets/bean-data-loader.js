export class BeanTreeBuilder {
    static _displayName(beanName) {
        const lastPart = beanName.split('.').pop() || '';
        const cleaned = lastPart.replace(/\$\$.*$/, '');
        return cleaned.split('$').pop() || '';
    }

    static _getGroupName(beanName) {
        if (beanName.startsWith('org.springframework.boot')) return 'Spring Boot Auto-Config';
        if (beanName.startsWith('org.springframework')) return 'Spring Framework';
        if (beanName.startsWith('io.micrometer')) return 'Micrometer Metrics';
        if (beanName.includes('.')) {
            const parts = beanName.split('.');
            return parts.slice(0, Math.min(3, parts.length - 1)).join('.');
        }
        return '';
    }

    static build(beans = []) {
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
                    deps: dependencies.length,
                    dependents: dependents.length,
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

        return {
            name: 'ApplicationContext',
            fullName: 'ApplicationContext',
            meta: { type: 'root', scope: 'singleton' },
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
     */
    constructor(dataUrl) {
        this.dataUrl = dataUrl;
        this.rootPromise = null;
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

    /**
     * Fetches bean definitions from the network, sets up metadata tracking maps,
     * updates toolbar metrics, and builds the D3 hierarchy root node.
     * @private
     * @returns {Promise<d3.HierarchyNode>}
     */
    async _loadBeanData() {
        try {
            let fetchUrl = this.dataUrl;
            if (fetchUrl && !fetchUrl.includes('pageSize=')) {
                fetchUrl += (fetchUrl.includes('?') ? '&' : '?') + 'pageSize=1000';
            }
            const response = await fetch(fetchUrl);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const json = await response.json();
            const { content = [] } = json;

            window.allBeansMap = new Map(content.map(bean => [bean.beanName, bean]));

            // Set counts in toolbar
            $('#beans-count').text(content.length);
            const totalDeps = content.reduce((sum, { dependencies = [] }) => sum + dependencies.length, 0);
            $('#deps-count').text(totalDeps);

            const data = BeanTreeBuilder.build(content);
            const root = d3.hierarchy(data);

            const allNodes = root.descendants();
            allNodes.forEach((node, index) => {
                node.id = index;
                node._children = node.children;
            });

            allNodes.forEach(node => {
                if (node.depth > 0) {
                    node.children = null;
                }
            });

            root.x0 = 0;
            root.y0 = 0;
            return root;
        } catch (error) {
            console.error('Error loading or processing bean graph data:', error);
            throw error;
        }
    }
}