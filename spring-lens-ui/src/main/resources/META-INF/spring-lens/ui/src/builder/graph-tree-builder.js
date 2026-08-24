export class GraphTreeBuilder {

    static _displayName(beanName = '') {
        if (!beanName) return '';
        const lastPart = beanName.split('.').pop() || '';
        const cleaned = lastPart.replace(/\$\$.*$/, '');
        return cleaned.split('$').pop() || '';
    }

    static buildByContext(beanDependencies = []) {
        const groupedData = this._transformBeanDependencyData(beanDependencies);
        const contextKeys = Object.keys(groupedData);

        if (contextKeys.length === 0) {
            return {
                name: 'default',
                fullName: 'default',
                contextId: 'default',
                meta: { type: 'context', contextId: 'default' },
                children: []
            };
        }

        // Single Context: Return the context tree directly as the root
        if (contextKeys.length === 1) {
            const contextId = contextKeys[0];
            return this._buildSingleContextTree(contextId, groupedData[contextId]);
        }

        // Multiple Contexts: Group under a single top-level container root node
        const contextNodes = contextKeys.map(contextId =>
            this._buildSingleContextTree(contextId, groupedData[contextId])
        );

        return {
            name: 'Application Contexts',
            fullName: 'Application Contexts',
            contextId: 'all',
            meta: { type: 'context', contextId: 'all' },
            children: contextNodes
        };
    }

    static _buildSingleContextTree(contextId, beans = []) {
        if (!beans.length) {
            return {
                name: contextId,
                fullName: contextId,
                contextId: contextId,
                meta: { type: 'context', contextId },
                children: []
            };
        }

        const beanMap = new Map(beans.map(b => [b.name, b]));
        const beanNames = new Set(beans.map(b => b.name));
        const hasParent = new Set();

        // 1. Mark beans that are dependencies of other beans as child nodes
        for (let i = 0; i < beans.length; i++) {
            const { dependencies = [] } = beans[i];
            for (let j = 0; j < dependencies.length; j++) {
                const dep = dependencies[j];
                if (beanNames.has(dep)) {
                    hasParent.add(dep);
                }
            }
        }

        // 2. Identify top-level root beans (beans not listed as a dependency of any other bean in this context)
        let rootNames = beans
            .map(b => b.name)
            .filter(name => !hasParent.has(name));

        if (!rootNames.length) {
            rootNames = [beans[0].name]; // Circular fallback
        }

        // 3. Build tree recursively: parent bean -> child dependencies
        const buildNode = (name, visited = new Set()) => {
            const displayName = this._displayName(name);
            const beanRecord = beanMap.get(name) || {};
            const meta = {
                type: beanRecord.type || beanRecord.className || beanRecord.beanType || 'N/A',
                scope: beanRecord.scope || 'singleton',
                contextId
            };

            if (visited.has(name)) {
                return {
                    name: displayName,
                    fullName: name,
                    contextId,
                    meta: { ...meta, isCycle: true },
                    isCycle: true
                };
            }

            const nextVisited = new Set(visited).add(name);
            const rawDeps = beanRecord.dependencies || [];
            const directChildren = rawDeps.filter(dep => beanNames.has(dep));

            const node = {
                name: displayName,
                fullName: name,
                contextId,
                meta
            };

            if (directChildren.length > 0) {
                node.children = directChildren.map(child => buildNode(child, nextVisited));
            }

            return node;
        };

        return {
            name: contextId,
            fullName: contextId,
            contextId,
            meta: { type: 'context', contextId },
            children: rootNames.map(root => buildNode(root))
        };
    }

    static _transformBeanDependencyData(data) {
        if (!data) return {};

        // Case 1: Structured payload object: { contextId: "...", beans: [...] }
        if (!Array.isArray(data) && Array.isArray(data.beans)) {
            const contextId = data.contextId || 'default';
            return {
                [contextId]: data.beans.map(b => ({
                    name: b.name || b.beanName || '',
                    type: b.type || '',
                    scope: b.scope || 'singleton',
                    dependencies: b.dependencies || []
                }))
            };
        }

        // Case 2: Array of bean definitions: [{ contextId, beanName/name, dependencies }, ...]
        if (Array.isArray(data) && data.length > 0) {
            const grouped = {};
            for (let i = 0; i < data.length; i++) {
                const item = data[i];
                const contextId = item.contextId || 'default';
                if (!grouped[contextId]) {
                    grouped[contextId] = [];
                }
                grouped[contextId].push({
                    name: item.name || item.beanName || '',
                    type: item.type || '',
                    scope: item.scope || 'singleton',
                    dependencies: item.dependencies || []
                });
            }
            return grouped;
        }

        return {};
    }
}