export class GraphTreeBuilder {

    static _displayName(beanName = '') {
        if (!beanName) return '';
        const lastPart = beanName.split('.').pop() || '';
        const cleaned = lastPart.replace(/\$\$.*$/, '');
        return cleaned.split('$').pop() || '';
    }

    static buildByContext(beanDependencies = []) {
        const prepareData = this._transformBeanDependencyData(beanDependencies);
        const contextId = prepareData?.contextId || 'default';
        const beans = prepareData?.beans || [];

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
            return {
                contextId: data.contextId || 'default',
                beans: data.beans.map(b => ({
                    name: b.name || b.beanName || '',
                    type: b.type || '',
                    scope: b.scope || 'singleton',
                    dependencies: b.dependencies || []
                }))
            };
        }

        // Case 2: Array of bean definitions: [{ contextId, beanName/name, dependencies }, ...]
        if (Array.isArray(data) && data.length > 0) {
            const contextId = data[0].contextId || 'default';
            return {
                contextId,
                beans: data.map(b => ({
                    name: b.name || b.beanName || '',
                    type: b.type || '',
                    scope: b.scope || 'singleton',
                    dependencies: b.dependencies || []
                }))
            };
        }

        return {};
    }
}