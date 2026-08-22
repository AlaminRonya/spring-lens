export class GraphTreeBuilder {
    static _displayName(beanName) {
        if (!beanName) return '';
        const lastPart = beanName.split('.').pop() || '';
        const cleaned = lastPart.replace(/\$\$.*$/, '');
        return cleaned.split('$').pop() || '';
    }

    static buildByContext(beans = []) {
        if (!beans || beans.length === 0) {
            return GraphTreeBuilder._createEmptyRootNode();
        }

        const beansByContextMap = GraphTreeBuilder._groupBeansByContext(beans);
        const contextSubtreeNodes = [];

        for (const [contextId, contextBeans] of beansByContextMap.entries()) {
            const contextSubtree = GraphTreeBuilder._buildContextSubtree(contextId, contextBeans);
            contextSubtreeNodes.push(contextSubtree);
        }

        if (contextSubtreeNodes.length === 1) {
            return contextSubtreeNodes[0];
        }

        return GraphTreeBuilder._createCompositeRootNode(beansByContextMap, contextSubtreeNodes);
    }

    static _createEmptyRootNode() {
        return {
            name: '',
            fullName: '',
            meta: { type: 'root' },
            children: []
        };
    }

    static _groupBeansByContext(beans) {
        const contextMap = new Map();
        for (let i = 0; i < beans.length; i++) {
            const bean = beans[i];
            const contextId = bean.contextId || 'default';
            if (!contextMap.has(contextId)) {
                contextMap.set(contextId, []);
            }
            contextMap.get(contextId).push(bean);
        }
        return contextMap;
    }

    static _buildContextSubtree(contextId, contextBeans) {
        const beanMap = new Map(contextBeans.map(bean => [bean.beanName, bean]));
        const { childrenOfMap, hasParentBeanSet } = GraphTreeBuilder._buildDependencyAdjacencyGraph(contextBeans, beanMap);

        const rootBeanNames = contextBeans
            .map(({ beanName }) => beanName)
            .filter(beanName => !hasParentBeanSet.has(beanName));

        const contextChildren = rootBeanNames.map(rootBeanName =>
            GraphTreeBuilder._buildHierarchyNode(rootBeanName, contextId, beanMap, childrenOfMap, new Set())
        );

        return {
            name: contextId,
            fullName: contextId,
            meta: { type: 'context', contextId },
            children: contextChildren
        };
    }

    static _buildDependencyAdjacencyGraph(contextBeans, beanMap) {
        const childrenOfMap = new Map();
        const hasParentBeanSet = new Set();

        for (let i = 0; i < contextBeans.length; i++) {
            const { beanName, dependencies = [] } = contextBeans[i];
            for (let j = 0; j < dependencies.length; j++) {
                const dependencyName = dependencies[j];
                if (!beanMap.has(dependencyName)) continue;

                if (!childrenOfMap.has(dependencyName)) {
                    childrenOfMap.set(dependencyName, new Set());
                }
                childrenOfMap.get(dependencyName).add(beanName);
                hasParentBeanSet.add(beanName);
            }
        }

        return { childrenOfMap, hasParentBeanSet };
    }

    static _buildHierarchyNode(beanName, contextId, beanMap, childrenOfMap, visitedAncestors = new Set()) {
        const bean = beanMap.get(beanName);
        const displayName = GraphTreeBuilder._displayName(beanName);

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

        const directChildNames = childrenOfMap.get(beanName);
        if (!directChildNames || directChildNames.size === 0) {
            return node;
        }

        const nextVisitedAncestors = new Set(visitedAncestors).add(beanName);
        node.children = Array.from(directChildNames).map(childName =>
            nextVisitedAncestors.has(childName)
                ? { name: GraphTreeBuilder._displayName(childName), fullName: childName, contextId, meta: { note: 'cycle', contextId } }
                : GraphTreeBuilder._buildHierarchyNode(childName, contextId, beanMap, childrenOfMap, nextVisitedAncestors)
        );

        return node;
    }

    static _createCompositeRootNode(beansByContextMap, contextSubtreeNodes) {
        const compositeRootTitle = Array.from(beansByContextMap.keys()).join(' / ');
        return {
            name: compositeRootTitle,
            fullName: compositeRootTitle,
            meta: { type: 'root' },
            children: contextSubtreeNodes
        };
    }
}