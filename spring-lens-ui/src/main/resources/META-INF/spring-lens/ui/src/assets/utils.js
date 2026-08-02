import {NH, NW, NODE_STYLES, DEFAULT_NODE_STYLE, BEAN_TYPE_RULES} from "./constants.js";

export const css = variableName => getComputedStyle(document.documentElement)
            .getPropertyValue(variableName)
            .trim();

export function getApiUrl(path = '/spring-lens/api/beans/definitions') {
    if (path && (path.startsWith('http://') || path.startsWith('https://'))) {
        return path;
    }
    const origin = window.location.origin || `${window.location.protocol}//${window.location.host}`;
    const cleanPath = (path || '').startsWith('/') ? path : `/${path || ''}`;
    return `${origin}${cleanPath}`;
}

export function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function formatPercentage(count, total) {
    if (!total) return '0%';
    const pctVal = (count / total) * 100;
    if (pctVal > 0 && pctVal < 1) {
        return '< 1%';
    } else if (pctVal > 99 && pctVal < 100) {
        return '> 99%';
    } else {
        return Math.round(pctVal) + '%';
    }
}

export function resolveBeanMetadata(bean) {
    if (!bean) return { icon: 'extension', color: '#6b46c1' };
    const name = (bean.beanName || '').toLowerCase();
    const type = (bean.type || '').toLowerCase();

    const rule = BEAN_TYPE_RULES.find(r =>
        r.keywords.some(keyword => name.includes(keyword) || type.includes(keyword))
    );

    if (rule) {
        return { icon: rule.icon, color: rule.color };
    }

    const style = nodeStyle({ fullName: bean.beanName, meta: { type: bean.type } });
    return {
        icon: 'extension',
        color: style.stroke || '#6b46c1'
    };
}

export function getBeanCategory(node) {
    if (!node) return 'leaf';

    const { fullName = '', meta = {} } = node.data || node;
    const lowerName = fullName.toLowerCase();
    const lowerType = (meta.type || '').toLowerCase();

    if (lowerName.includes('adapter') || lowerType.includes('adapter')) {
        return 'adapter';
    }

    if (node.depth !== undefined) {
        if (node.depth <= 2) return 'root';
    } else {
        const record = window.allBeansMap?.get(fullName);
        if (record) {
            const { dependencies = [], dependents = [] } = record;
            if (dependencies.length === 0) return 'leaf';
            if (dependents.length === 0) return 'root';
        }
    }

    const hasChildren = node.children?.length > 0 || node._children?.length > 0;
    return hasChildren ? 'intermediate' : 'leaf';
}

export function nodeStyle(node) {
    const isDark = document.documentElement.classList.contains('dark');
    const category = getBeanCategory(node);
    if (isDark) {
        const darkStyles = {
            root: { fill: 'rgba(59, 130, 246, 0.15)', stroke: '#3b82f6', icon: '#60a5fa', text: '#93c5fd' },
            leaf: { fill: 'rgba(234, 179, 8, 0.15)', stroke: '#eab308', icon: '#facc15', text: '#fef08a' },
            intermediate: { fill: 'rgba(34, 197, 94, 0.15)', stroke: '#22c55e', icon: '#4ade80', text: '#86efac' }
        };
        const defaultDarkStyle = { fill: 'rgba(168, 85, 247, 0.15)', stroke: '#a855f7', icon: '#c084fc', text: '#e9d5ff' };
        return darkStyles[category] || defaultDarkStyle;
    }
    return NODE_STYLES[category] || DEFAULT_NODE_STYLE;
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