import { NH, NW, NODE_STYLES, DEFAULT_NODE_STYLE, BEAN_TYPE_RULES } from "./constants.js";

// Static style mapping dictionary for dark mode to prevent runtime object allocations
const DARK_NODE_STYLES = {
    root: { fill: 'rgba(59, 130, 246, 0.15)', stroke: '#3b82f6', icon: '#60a5fa', text: '#93c5fd' },
    context: { fill: 'rgba(99, 102, 241, 0.15)', stroke: '#6366f1', icon: '#818cf8', text: '#a5b4fc' },
    leaf: { fill: 'rgba(234, 179, 8, 0.15)', stroke: '#eab308', icon: '#facc15', text: '#fef08a' },
    intermediate: { fill: 'rgba(34, 197, 94, 0.15)', stroke: '#22c55e', icon: '#4ade80', text: '#86efac' }
};

const DEFAULT_DARK_NODE_STYLE = {
    fill: 'rgba(168, 85, 247, 0.15)',
    stroke: '#a855f7',
    icon: '#c084fc',
    text: '#e9d5ff'
};

export const css = (variableName) =>
    getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();

export function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function formatPercentage(count, total) {
    if (!total) return '0%';

    const pctVal = (count / total) * 100;

    if (pctVal > 0 && pctVal < 1) return '< 1%';
    if (pctVal > 99 && pctVal < 100) return '> 99%';

    return `${Math.round(pctVal)}%`;
}

/**
 * Resolves metadata (icon and color) for a bean based on rule keyword matches or fallback styles.
 * @param {Object|null} bean - Target bean object.
 * @returns {{ icon: string, color: string }} Icon name and hex/CSS color.
 */
export function resolveBeanMetadata(bean) {
    if (!bean) return { icon: 'extension', color: '#6b46c1' };

    const { beanName = '', type = '' } = bean;
    const lowerName = beanName.toLowerCase();
    const lowerType = type.toLowerCase();

    // Fast keyword lookup in BEAN_TYPE_RULES
    const rulesLength = BEAN_TYPE_RULES.length;
    for (let i = 0; i < rulesLength; i++) {
        const rule = BEAN_TYPE_RULES[i];
        const keywords = rule.keywords;
        const keywordsLength = keywords.length;

        for (let j = 0; j < keywordsLength; j++) {
            const keyword = keywords[j];
            if (lowerName.includes(keyword) || lowerType.includes(keyword)) {
                return { icon: rule.icon, color: rule.color };
            }
        }
    }

    // Fallback node style resolution
    const style = nodeStyle({ fullName: beanName, meta: { type } });
    return {
        icon: 'extension',
        color: style.stroke ?? '#6b46c1'
    };
}


/**
 * Categorizes a graph node or bean definition into a semantic layout type ('adapter', 'root', 'intermediate', or 'leaf').
 * @param {Object|d3.HierarchyNode|null} node - Hierarchy node or bean object.
 * @returns {string} Category label string.
 */
export function getBeanCategory(node) {
    if (!node) return 'leaf';

    const nodeData = node.data ?? node;
    const fullName = nodeData.fullName ?? '';
    const type = nodeData.meta?.type ?? '';

    if (nodeData.meta?.type === 'context') return 'context';
    if (nodeData.meta?.type === 'root') return 'root';

    const lowerName = fullName.toLowerCase();
    const lowerType = type.toLowerCase();

    // 1. Adapter check
    if (lowerName.includes('adapter') || lowerType.includes('adapter')) {
        return 'adapter';
    }

    // 2. Depth check for hierarchy tree nodes
    if (node.depth !== undefined) {
        if (node.depth <= 2) return 'root';
    } else {
        // Fallback for raw data objects using the global map
        const record = window.allBeansMap?.get(fullName);
        if (record) {
            const deps = record.dependencies;
            const dependents = record.dependents;

            if (!deps || deps.length === 0) return 'leaf';
            if (!dependents || dependents.length === 0) return 'root';
        }
    }

    // 3. Child node presence check
    const hasChildren = (node.children?.length ?? 0) > 0 || (node._children?.length ?? 0) > 0;
    return hasChildren ? 'intermediate' : 'leaf';
}

export function nodeStyle(node) {
    const isDark = document.documentElement.classList.contains('dark');
    const category = getBeanCategory(node);

    if (isDark) {
        return DARK_NODE_STYLES[category] ?? DEFAULT_DARK_NODE_STYLE;
    }

    return NODE_STYLES[category] ?? DEFAULT_NODE_STYLE;
}

export function tbLink({ source, target }) {
    const sx = source.x;
    const sy = source.y + NH / 2;
    const tx = target.x;
    const ty = target.y - NH / 2;
    const my = (sy + ty) / 2;

    return `M${sx},${sy} C${sx},${my} ${tx},${my} ${tx},${ty}`;
}

export function lrLink({ source, target }) {
    const sWidth = source.width ?? NW;
    const tWidth = target.width ?? NW;
    const sx = source.y + sWidth / 2;
    const sy = source.x;
    const tx = target.y - tWidth / 2;
    const ty = target.x;
    const mx = (sx + tx) / 2;

    return `M${sx},${sy} C${mx},${sy} ${mx},${ty} ${tx},${ty}`;
}

export const tree = d3.tree();