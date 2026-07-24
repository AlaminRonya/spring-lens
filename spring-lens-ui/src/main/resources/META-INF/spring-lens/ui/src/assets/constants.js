// UI layout constants for Spring Lens
export const NW = 196;
export const NH = 44;
export const RX = 10;
export const GAP_X = 36;
export const GAP_Y = 80;
export const ICON = 'M10 2l8 4v8l-8 4-8-4V6l8-4z M2 6l8 4 M18 6l-8 4 M10 10v8';
export const ZOOM_SCALE_EXTENT = [0.05, 4];
export const METHOD_PILL_STYLES = {
    get: 'bg-blue-50 text-blue-700 border-blue-100',
    post: 'bg-green-50 text-green-700 border-green-100',
    put: 'bg-amber-50 text-amber-700 border-amber-100',
    delete: 'bg-red-50 text-red-700 border-red-100'
};

export const STATUS_PILL_STYLES = {
    green: 'bg-success-light text-success border-success/15',
    amber: 'bg-amber-50 text-warning border-warning/15',
    red: 'bg-red-50 text-red-600 border-red-200'
};

export const NODE_STYLES = {
    root: { fill: '#eff6ff', stroke: '#3b82f6', icon: '#3b82f6', text: '#1d4ed8' },
    leaf: { fill: '#fffbeb', stroke: '#eab308', icon: '#eab308', text: '#a16207' },
    intermediate: { fill: '#f0fdf4', stroke: '#22c55e', icon: '#22c55e', text: '#15803d' }
};

export const DEFAULT_NODE_STYLE = { fill: '#faf5ff', stroke: '#a855f7', icon: '#a855f7', text: '#7e22ce' };

export const CLASSES = {
    navActive: 'text-primary bg-primary-light border-l-2 border-primary',
    navInactive: 'text-gray-500 hover:text-gray-800 hover:bg-gray-50',
    subnavActive: 'text-primary',
    subnavInactive: 'text-gray-500 hover:text-gray-800'
};

export const TEMPLATES = {
    loading: `
        <div class="flex flex-col items-center justify-center h-full gap-3 py-24">
            <span class="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent"></span>
            <span class="text-xs font-semibold text-gray-400">Loading module...</span>
        </div>
    `,
    error: (message) => `
        <div class="flex flex-col items-center justify-center h-full p-8 text-center bg-white m-6 rounded-xl border border-gray-200 shadow-sm">
            <span class="material-symbols-outlined text-red-500 text-5xl mb-4">error</span>
            <h3 class="text-lg font-bold text-gray-800 mb-1">Application Error</h3>
            <p class="text-sm text-gray-500 max-w-sm mb-2">Could not load this module. Please ensure the backend is active.</p>
            <p class="text-[10px] text-red-500 font-mono mb-4 bg-red-50/50 border border-red-100 rounded px-2 py-1 select-all">${message}</p>
            <button id="retry-load-btn" class="px-4 py-2 bg-primary hover:bg-primary/95 text-white rounded-md text-sm font-semibold transition-colors">Retry</button>
        </div>
    `,
    requestRow: ({ method, status, url, time, ip, timestamp, reqId, methodClass, statusColor }) => `
        <tr class="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors">
            <td class="px-5 py-3">
                <span class="px-2 py-0.5 rounded text-[10px] font-bold inline-block border ${METHOD_PILL_STYLES[methodClass] || 'bg-gray-50 text-gray-700 border-gray-200'}">${method}</span>
            </td>
            <td class="px-5 py-3 font-mono text-[11px] text-gray-700 dark:text-gray-200 truncate max-w-[200px]" title="${url}">${url}</td>
            <td class="px-5 py-3">
                <span class="px-2 py-0.5 rounded text-[10px] font-bold inline-block border ${STATUS_PILL_STYLES[statusColor]}">${status}</span>
            </td>
            <td class="px-5 py-3 text-gray-600 dark:text-gray-300">${time}</td>
            <td class="px-5 py-3 font-mono text-[11px] text-gray-500 dark:text-gray-400">${ip}</td>
            <td class="px-5 py-3 text-gray-600 dark:text-gray-300">${timestamp}</td>
            <td class="px-5 py-3 text-right">
                <button class="px-3 py-1 bg-primary/10 hover:bg-primary/20 text-primary rounded-md text-xs font-semibold transition-colors cursor-pointer btn-request-view animate-none" data-id="${reqId}">
                    View
                </button>
            </td>
        </tr>
    `,
    checkCircle: `<span class="material-symbols-outlined text-[18px] text-success" style="color: #22c55e; font-variation-settings: 'FILL' 1;">check_circle</span>`,
    uncheckedCircle: `<span class="material-symbols-outlined text-[18px] text-gray-300" style="color: #cbd5e1;">radio_button_unchecked</span>`,
    dashboardRow: ({ activeRowClass, beanName, color, icon, displayName, type, scopeStyle, displayScope, displayRole, primaryIcon, lazyIcon, contextId }) => `
        <tr class="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors bean-row ${activeRowClass}" data-bean-name="${beanName}">
            <td class="px-5 py-3">
                <div class="flex items-center gap-2">
                    <span class="material-symbols-outlined text-[18px]" style="color: ${color}">${icon}</span>
                    <span class="font-medium text-gray-800 dark:text-gray-100 truncate max-w-[150px]" title="${displayName}">${displayName}</span>
                </div>
            </td>
            <td class="px-5 py-3 font-mono text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-[200px]" title="${type}">${type || 'N/A'}</td>
            <td class="px-5 py-3">
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide border" style="background-color: ${scopeStyle.bg}; color: ${scopeStyle.fg}; border-color: ${scopeStyle.border};">${displayScope}</span>
            </td>
            <td class="px-5 py-3 text-gray-600 dark:text-gray-300">${displayRole}</td>
            <td class="px-5 py-3 text-center">${primaryIcon}</td>
            <td class="px-5 py-3 text-center">${lazyIcon}</td>
            <td class="px-5 py-3 font-mono text-[11px] text-gray-500 dark:text-gray-400">${contextId || 'N/A'}</td>
            <td class="px-5 py-3 text-right">
                <button class="px-3 py-1 bg-primary/10 hover:bg-primary/20 text-primary rounded-md text-xs font-semibold transition-colors cursor-pointer btn-bean-view animate-none" data-bean-name="${beanName}">
                    View
                </button>
            </td>
        </tr>
    `,
    tooltip: `
        <div id="tip" class="absolute hidden bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-lg pointer-events-none z-50 text-xs text-gray-600 dark:text-gray-300 min-w-[150px] transition-opacity duration-150">
            <div id="tip-name" class="font-bold text-gray-800 dark:text-white mb-1 font-mono text-[11px]"></div>
            <div id="tip-type" class="text-[10px] text-gray-500 mb-0.5"></div>
            <div id="tip-scope" class="text-[10px] text-gray-500 mb-0.5"></div>
            <div id="tip-meta" class="text-[10px] text-gray-500"></div>
        </div>
    `,
    dependencyItem: ({ depName, displayName, catColor }) => `
        <div class="dep-item flex items-center justify-between py-1.5 hover:bg-gray-50 px-2 rounded-md transition-colors">
            <div class="dep-item-left flex items-center gap-2 cursor-pointer def-sidebar-item-click" data-fullname="${depName}">
                <span class="w-2 h-2 rounded-full bg-${catColor}-500"></span>
                <span class="font-medium text-gray-700 font-mono text-[11px]">${displayName}</span>
            </div>
            <span class="dep-link flex items-center text-gray-400 hover:text-gray-600 cursor-pointer" data-fullname="${depName}" title="Focus in graph">
                <span class="material-symbols-outlined text-[16px]">east</span>
            </span>
        </div>
    `,
    suggestionItem: ({ fullName, displayName, type }) => `
        <div class="suggestion-item p-2 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-50 last:border-b-0" data-fullname="${fullName}">
            <strong class="text-xs font-semibold text-gray-700 block">${displayName}</strong>
            <span class="text-[10px] text-gray-400 block font-mono truncate">${type}</span>
        </div>
    `,
    contextListItem: ({ ctxId, colorClass, pct }) => `
        <div class="flex items-center gap-2">
            <span class="text-xs text-gray-600 w-16 truncate" title="${ctxId}">${ctxId}</span>
            <div class="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div class="h-full ${colorClass} rounded-full" style="width: ${pct}%"></div>
            </div>
            <span class="text-[10px] text-gray-400 font-semibold w-8 text-right">${pct}%</span>
        </div>
    `,
    chartLegendItem: ({ color, lbl, count, pctStr }) => `
        <div class="flex items-center gap-1.5 truncate">
            <div class="w-1.5 h-1.5 rounded-full flex-shrink-0" style="background-color: ${color}"></div>
            <span class="text-[10px] text-gray-500 truncate" title="${lbl}">${lbl} (${count}) · ${pctStr}</span>
        </div>
    `,
    paginationPrevBtn: ({ isDisabled }) => `
        <button class="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded btn-prev" ${isDisabled ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : 'style="cursor: pointer;"'}>
            <span class="material-symbols-outlined text-[18px]">chevron_left</span>
        </button>
    `,
    paginationNextBtn: ({ isDisabled }) => `
        <button class="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded btn-next" ${isDisabled ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : 'style="cursor: pointer;"'}>
            <span class="material-symbols-outlined text-[18px]">chevron_right</span>
        </button>
    `,
    paginationPageBtn: ({ page, isActive }) => {
        const btnClass = isActive
            ? 'text-white bg-primary font-medium'
            : 'text-gray-600 hover:bg-gray-50 font-medium';
        return `
            <button class="w-7 h-7 flex items-center justify-center rounded text-xs btn-page ${btnClass}" data-page="${page}">
                ${page}
            </button>
        `;
    },
    paginationEllipsis: `<span class="text-gray-400 mx-1">...</span>`,
    sidebarEmptyList: `<div class="text-gray-400 text-xs p-3 italic">None</div>`,
    sidebarListItem: ({ depName, dispName, catColor }) => `
        <div class="def-sidebar-item-click flex items-center justify-between py-2 hover:bg-gray-50 px-2 rounded-md transition-colors cursor-pointer" data-fullname="${depName}">
            <div class="flex items-center gap-2 min-w-0">
                <span class="w-2 h-2 rounded-full flex-shrink-0 bg-${catColor}-500"></span>
                <span class="font-medium text-gray-700 font-mono text-[11px] truncate" title="${depName}">${dispName}</span>
            </div>
            <span class="text-gray-400">
                <span class="material-symbols-outlined text-[16px]">east</span>
            </span>
        </div>
    `
};

export const BEAN_TYPE_RULES = [
    { keywords: ['datasource', 'connection'], icon: 'database', color: '#10b981' },
    { keywords: ['security', 'auth'], icon: 'lock', color: '#f59e0b' },
    { keywords: ['controller', 'rest'], icon: 'api', color: '#3b82f6' },
    { keywords: ['service'], icon: 'settings_input_component', color: '#8b5cf6' },
    { keywords: ['repository', 'dao'], icon: 'folder_open', color: '#ec4899' },
    { keywords: ['cache'], icon: 'memory', color: '#64748b' },
    { keywords: ['config', 'properties'], icon: 'settings', color: '#14b8a6' },
    { keywords: ['scheduler', 'task'], icon: 'schedule', color: '#06b6d4' },
    { keywords: ['mapper'], icon: 'transform', color: '#a855f7' },
    { keywords: ['client'], icon: 'hub', color: '#f43f5e' },
    { keywords: ['template'], icon: 'layout', color: '#3b82f6' },
    { keywords: ['filter'], icon: 'filter_list', color: '#64748b' },
    { keywords: ['converter', 'serializer'], icon: 'swap_horiz', color: '#8b5cf6' },
    { keywords: ['factory'], icon: 'factory', color: '#f59e0b' },
    { keywords: ['validator'], icon: 'verified_user', color: '#10b981' },
    { keywords: ['producer', 'consumer', 'listener'], icon: 'hearing', color: '#ec4899' }
];

export const SCOPE_COLORS = {
    'Singleton': '#6b46c1',
    'Prototype': '#3b82f6',
    'Request': '#f59e0b',
    'Session': '#22c55e',
    'Unknown': '#cbd5e1'
};

export const ROLE_COLORS = {
    'Application': '#3b82f6',
    'Support': '#f59e0b',
    'Infrastructure': '#e2e8f0',
    'Unknown': '#cbd5e1'
};

export const SCOPE_STYLES = {
    singleton: { bg: '#f3e8ff', fg: '#7e22ce', border: '#d8b4fe' },
    prototype: { bg: '#eff6ff', fg: '#1d4ed8', border: '#bfdbfe' },
    request: { bg: '#fffbeb', fg: '#b45309', border: '#fde68a' },
    session: { bg: '#f0fdf4', fg: '#15803d', border: '#bbf7d0' }
};

export const DEFAULT_SCOPE_STYLE = { bg: '#f8fafc', fg: '#475569', border: '#e2e8f0' };

export const DEPENDENCY_CATEGORY_COLORS = {
    intermediate: 'green',
    leaf: 'yellow',
    adapter: 'purple'
};