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