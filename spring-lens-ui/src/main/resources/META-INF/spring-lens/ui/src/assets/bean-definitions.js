import { BeanTreeBuilder } from './bean-data-loader.js';
import {
    TEMPLATES,
    SCOPE_COLORS,
    ROLE_COLORS,
    SCOPE_STYLES,
    DEFAULT_SCOPE_STYLE,
    DEPENDENCY_CATEGORY_COLORS
} from './constants.js';
import {
    getBeanCategory,
    nodeStyle,
    getApiUrl,
    capitalize,
    formatPercentage,
    resolveBeanMetadata
} from './utils.js';

/**
 * Controller class for the Beans Definitions dashboard tab.
 * Manages view state (pagination, filters, search, sorting), renders table data via server API,
 * manages D3/Chart.js metrics, and handles detail sidebar interactivity.
 */
export default class BeanDefinitions {

    constructor(dataLoader) {
        this.dataLoader = dataLoader;
        this.charts = {
            scopeChart: null,
            roleChart: null
        };

        // All beans dataset (used for overall KPIs, charts, dropdown options)
        this.beans = [];

        // Server-paginated data for current table view
        this.pageBeans = [];

        // API Pagination Metadata state
        this.pagination = {
            totalElements: 0,
            totalPages: 1,
            pageNumber: 0,
            pageSize: 10,
            first: true,
            last: true
        };

        this.searchQuery = '';

        this.filters = {
            contextId: '',
            beanName: '',
            scope: '',
            role: '',
            primary: '',
            lazy: ''
        };

        this.currentPage = 1; // 1-indexed representation for UI display
        this.pageSize = 10;
        this.sortBy = '';
        this.sortDir = 'asc';

        this.selectedBeanName = null;
        this.activeTab = 'properties'; // 'properties' | 'dependencies' | 'dependents'
    }

    /**
     * Initializes the view by loading overall bean dataset for metrics, setting up dropdowns,
     * building charts, fetching paginated table data from API, and registering event handlers.
     */
    async enter() {
        try {
            await this.dataLoader.load();
            if (window.allBeansMap) {
                this.beans = Array.from(window.allBeansMap.values());
            } else {
                this.beans = [];
            }

            this.initFilterDropdowns();
            this.updateKPIs();
            this.initCharts();
            this.initEvents();

            await this.fetchTableData();

            // Select the first bean as default details if available
            if (this.pageBeans.length > 0) {
                this.selectBean(this.pageBeans[0].beanName);
            } else if (this.beans.length > 0) {
                this.selectBean(this.beans[0].beanName);
            }
        } catch (error) {
            console.error('Error in BeanDefinitions enter:', error);
        }
    }

    /**
     * Handles cleaning up charts when transitioning away from the dashboard.
     */
    leave() {
        this.cleanupCharts();
    }

    /**
     * Populates filter dropdowns with unique options aggregated from the dataset.
     */
    initFilterDropdowns() {
        let $defFilterContext = $('#def-filter-context');
        let $defFilterScope = $('#def-filter-scope');
        let $defFilterRole = $('#def-filter-role');

        const contexts = new Set();
        const scopes = new Set();
        const roles = new Set();

        this.beans.forEach(bean => {
            if (bean.contextId) contexts.add(bean.contextId);
            if (bean.scope) scopes.add(bean.scope);
            if (bean.role) roles.add(bean.role);
        });

        if ($defFilterContext.length > 0) {
            this._populateDropdown(
                $defFilterContext,
                contexts,
                'Context: All',
                ctx => ctx
            );
            $defFilterContext.val(this.filters.contextId);
        }

        this._populateDropdown(
            $defFilterScope,
            scopes,
            'Scope: All',
            scope => capitalize(scope)
        );

        this._populateDropdown(
            $defFilterRole,
            roles,
            'Role: All',
            role => capitalize(role.replace(/^ROLE_/, ''))
        );

        // Sync dropdown selectors with active filter state
        $defFilterScope.val(this.filters.scope);
        $defFilterRole.val(this.filters.role);
        $('#def-filter-primary').val(this.filters.primary);
        $('#def-filter-lazy').val(this.filters.lazy);
        $('#def-filter-size').val(this.pageSize);
        $('#def-search-input').val(this.searchQuery);
    }

    /**
     * Helper to populate a select dropdown with unique, sorted, and formatted options.
     * @private
     */
    _populateDropdown($select, values, defaultText, formatter) {
        $select.html(`<option value="">${defaultText}</option>`);
        Array.from(values).sort().forEach(val => {
            $select.append(`<option value="${val}">${formatter(val)}</option>`);
        });
    }

    /**
     * Computes and updates metrics cards (total counts, context distributions, lazy percentage).
     */
    updateKPIs() {
        if (this.beans.length === 0) return;

        this._updateTotalCountKPI();
        this._updateContextDistributionKPI();
        this._updateLazyInitKPI();
    }

    /**
     * Updates the total bean count metric.
     * Uses totalElements from API pagination metadata if available, falling back to loaded beans count.
     * @private
     */
    _updateTotalCountKPI() {
        const count = (this.pagination && typeof this.pagination.totalElements === 'number' && (this.pagination.totalElements > 0 || this._hasFetchedTableData))
            ? this.pagination.totalElements
            : (this.beans ? this.beans.length : 0);
        $('#def-total-count').text(count.toLocaleString());
    }

    /**
     * Computes and updates context distribution stats and progress bars.
     * @private
     */
    _updateContextDistributionKPI() {
        if (!this.beans || this.beans.length === 0) return;
        const total = this.beans.length;
        const contexts = {};
        this.beans.forEach(b => {
            const ctxId = b.contextId || 'unknown';
            contexts[ctxId] = (contexts[ctxId] || 0) + 1;
        });

        const contextEntries = Object.entries(contexts).sort((a, b) => b[1] - a[1]);
        $('#def-context-count').text(`${contextEntries.length} Total`);

        const colors = ['bg-primary', 'bg-blue-500', 'bg-success'];
        const contextListHtml = contextEntries.map(([ctxId, count], idx) => {
            const pct = Math.round((count / total) * 100);
            const colorClass = colors[idx] || 'bg-gray-400';
            return TEMPLATES.contextListItem({ ctxId, colorClass, pct });
        }).join('');
        $('#def-context-list').html(contextListHtml);
    }

    /**
     * Computes and updates lazy initialization percentage and progress bar.
     * @private
     */
    _updateLazyInitKPI() {
        if (!this.beans || this.beans.length === 0) return;
        const total = this.beans.length;
        const lazyCount = this.beans.filter(b => b.lazyInit).length;
        const lazyPct = Math.round((lazyCount / total) * 100);
        $('#def-lazy-percent').text(`${lazyPct}%`);
        $('#def-lazy-bar').css('width', `${lazyPct}%`);
    }

    /**
     * Initializes scope and role distribution charts with live computed frequencies.
     */
    initCharts() {
        this.cleanupCharts();
        if (this.beans.length === 0) return;

        // 1. Scope distribution
        this._initDistributionChart(
            'scopeChart',
            'scopeChart',
            '#def-scope-legend',
            bean => capitalize(bean.scope || 'unknown'),
            SCOPE_COLORS,
            '#a855f7'
        );

        // 2. Role distribution
        this._initDistributionChart(
            'roleChart',
            'roleChart',
            '#def-role-legend',
            bean => capitalize((bean.role || 'unknown').replace(/^ROLE_/, '')),
            ROLE_COLORS,
            '#cbd5e1'
        );
    }

    /**
     * Helper to initialize a distribution chart and its corresponding HTML legend.
     * @private
     */
    _initDistributionChart(chartKey, canvasId, legendId, valueExtractor, colorsConfig, defaultColor) {
        const counts = {};
        this.beans.forEach(bean => {
            const rawVal = valueExtractor(bean) || 'unknown';
            counts[rawVal] = (counts[rawVal] || 0) + 1;
        });

        const labels = Object.keys(counts);
        const data = Object.values(counts);
        const bgColors = labels.map(lbl => colorsConfig[lbl] || defaultColor);

        const legendHtml = labels.map((lbl, idx) => {
            const count = data[idx];
            const pctStr = formatPercentage(count, this.beans.length);
            const color = bgColors[idx];
            return TEMPLATES.chartLegendItem({ color, lbl, count, pctStr });
        }).join('');
        $(legendId).html(legendHtml);

        this.charts[chartKey] = this._createDoughnutChart(
            canvasId,
            labels,
            data,
            bgColors
        );
    }

    /**
     * Helper to instantiate a pre-styled doughnut chart on a target canvas.
     * @private
     */
    _createDoughnutChart(canvasId, labels, data, colors) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        return new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: colors,
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                cutout: '70%',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: true }
                }
            }
        });
    }

    /**
     * Displays a loading spinner in the table body while fetching from API.
     */
    showTableLoading() {
        const $tbody = $('#beanTableBody');
        if ($tbody.length === 0) return;
        $tbody.html(`
            <tr>
                <td colspan="8" class="px-5 py-12 text-center text-gray-400">
                    <div class="flex flex-col items-center justify-center gap-2">
                        <span class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></span>
                        <span class="text-xs font-medium text-gray-500 dark:text-gray-400">Loading bean definitions...</span>
                    </div>
                </td>
            </tr>
        `);
    }

    /**
     * Displays an error message in the table body if API request fails.
     */
    renderTableError(message) {
        const $tbody = $('#beanTableBody');
        if ($tbody.length === 0) return;
        $tbody.html(`
            <tr>
                <td colspan="8" class="px-5 py-8 text-center text-red-500 dark:text-red-400">
                    <div class="flex items-center justify-center gap-2 text-sm font-semibold">
                        <span class="material-symbols-outlined text-lg">warning</span>
                        <span>Failed to fetch table data: ${message}</span>
                    </div>
                </td>
            </tr>
        `);
    }

    /**
     * Fetches paginated bean definitions from backend API using search, filters, sorting, and pagination query params.
     */
    async fetchTableData() {
        this.showTableLoading();

        const params = new URLSearchParams();
        params.append('pageNumber', (this.currentPage - 1).toString());
        params.append('pageSize', this.pageSize.toString());

        if (this.searchQuery) {
            params.append('search', this.searchQuery);
        }
        if (this.filters.contextId) {
            params.append('contextId', this.filters.contextId);
        }
        if (this.filters.beanName) {
            params.append('beanName', this.filters.beanName);
        }
        if (this.filters.scope) {
            params.append('scope', this.filters.scope);
        }
        if (this.filters.role) {
            params.append('role', this.filters.role);
        }
        if (this.filters.primary !== '') {
            params.append('primary', this.filters.primary);
        }
        if (this.filters.lazy !== '') {
            params.append('lazyInit', this.filters.lazy);
        }
        if (this.sortBy) {
            params.append('sortBy', this.sortBy);
        }
        if (this.sortDir) {
            params.append('sortDir', this.sortDir);
        }

        const baseUrl = getApiUrl(this.dataLoader?.dataUrl || '/spring-lens/api/beans/definitions');
        const requestUrl = `${baseUrl}?${params.toString()}`;

        try {
            const response = await fetch(requestUrl);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();

            if (data && Array.isArray(data.content)) {
                // Paginated API response metadata mapping
                this.pageBeans = data.content;
                this.pagination = {
                    totalElements: data.totalElements !== undefined ? data.totalElements : data.content.length,
                    totalPages: data.totalPages !== undefined ? data.totalPages : 1,
                    pageNumber: data.pageNumber !== undefined ? data.pageNumber : 0,
                    pageSize: data.pageSize !== undefined ? data.pageSize : this.pageSize,
                    first: data.first !== undefined ? data.first : (data.pageNumber === 0),
                    last: data.last !== undefined ? data.last : (data.pageNumber >= ((data.totalPages || 1) - 1))
                };
            } else if (Array.isArray(data)) {
                // Fallback for flat array responses
                const total = data.length;
                const totalPages = Math.max(1, Math.ceil(total / this.pageSize));
                const pageNum = Math.max(0, Math.min(this.currentPage - 1, totalPages - 1));
                this.pageBeans = data.slice(pageNum * this.pageSize, (pageNum + 1) * this.pageSize);
                this.pagination = {
                    totalElements: total,
                    totalPages: totalPages,
                    pageNumber: pageNum,
                    pageSize: this.pageSize,
                    first: pageNum === 0,
                    last: pageNum >= totalPages - 1
                };
            } else {
                this.pageBeans = [];
                this.pagination = {
                    totalElements: 0,
                    totalPages: 1,
                    pageNumber: 0,
                    pageSize: this.pageSize,
                    first: true,
                    last: true
                };
            }

            // Sync UI current page and page size directly with API response values
            this.currentPage = this.pagination.pageNumber + 1;
            this.pageSize = this.pagination.pageSize;

            // Cache fetched beans into window.allBeansMap for detail sidebar dependency lookups
            if (window.allBeansMap) {
                this.pageBeans.forEach(b => {
                    if (b.beanName && !window.allBeansMap.has(b.beanName)) {
                        window.allBeansMap.set(b.beanName, b);
                    }
                });
            }

            this._hasFetchedTableData = true;
            this.renderTable();
            this.renderPagination();
            this.updateSortHeaderIcons();
            this._updateTotalCountKPI();
        } catch (error) {
            console.error('Error fetching bean definitions table data:', error);
            this.renderTableError(error.message);
        }
    }

    /**
     * Updates visual sort direction indicators in table headers.
     */
    updateSortHeaderIcons() {
        $('.sort-icon').text('unfold_more').removeClass('text-primary font-bold');
        if (this.sortBy) {
            const $icon = $(`.sort-icon[data-col="${this.sortBy}"]`);
            if ($icon.length > 0) {
                $icon.text(this.sortDir === 'desc' ? 'arrow_downward' : 'arrow_upward')
                    .addClass('text-primary font-bold');
            }
        }
    }

    /**
     * Resolves matching semantic icons based on bean identifier text.
     */
    getBeanIcon(bean) {
        return resolveBeanMetadata(bean).icon;
    }

    getBeanColor(bean) {
        return resolveBeanMetadata(bean).color;
    }

    /**
     * Renders the bean definitions list table for the current server-returned page.
     */
    renderTable() {
        const $tbody = $('#beanTableBody');
        if ($tbody.length === 0) return;

        if (this.pageBeans.length === 0) {
            $tbody.html(`
                <tr>
                    <td colspan="8" class="px-5 py-8 text-center text-gray-400">
                        No beans found matching the active filters or search query.
                    </td>
                </tr>
            `);
            return;
        }

        const rowsHtml = this.pageBeans.map(bean => {
            const displayName = BeanTreeBuilder._displayName(bean.beanName);

            const cleanRole = (bean.role || '').replace(/^ROLE_/, '');
            const displayRole = cleanRole ? capitalize(cleanRole) : 'N/A';
            const displayScope = bean.scope ? capitalize(bean.scope) : 'N/A';

            const scopeLower = (bean.scope || '').toLowerCase();
            const scopeStyle = SCOPE_STYLES[scopeLower] || DEFAULT_SCOPE_STYLE;

            const primaryIcon = bean.primary ? TEMPLATES.checkCircle : TEMPLATES.uncheckedCircle;
            const lazyIcon = bean.lazyInit ? TEMPLATES.checkCircle : TEMPLATES.uncheckedCircle;
            const icon = this.getBeanIcon(bean);
            const color = this.getBeanColor(bean);

            const isSelected = this.selectedBeanName === bean.beanName;
            const activeRowClass = isSelected ? 'bg-primary-light/40 border-l-2 border-primary font-medium' : '';

            return TEMPLATES.dashboardRow({
                activeRowClass,
                beanName: bean.beanName,
                color,
                icon,
                displayName,
                type: bean.type,
                scopeStyle,
                displayScope,
                displayRole,
                primaryIcon,
                lazyIcon,
                contextId: bean.contextId
            });
        });

        $tbody.html(rowsHtml.join(''));
    }

    /**
     * Renders dynamic pagination navigation controls driven directly by API pagination metadata
     * (totalElements, totalPages, pageNumber, pageSize, first, last).
     */
    renderPagination() {
        const { totalElements, totalPages, pageNumber, pageSize, first, last } = this.pagination;
        const displayPage = pageNumber + 1; // 1-indexed page number for display UI

        const startIndex = totalElements === 0 ? 0 : (pageNumber * pageSize) + 1;
        const endIndex = totalElements === 0 ? 0 : Math.min((pageNumber + 1) * pageSize, totalElements);

        $('#def-pagination-info').text(`Showing ${startIndex} to ${endIndex} of ${totalElements.toLocaleString()} beans`);

        const $buttons = $('#def-pagination-buttons');
        if ($buttons.length === 0) return;

        const maxPages = Math.max(1, totalPages);
        const buttonsHtml = [];

        // Previous button (disabled if first is true)
        buttonsHtml.push(TEMPLATES.paginationPrevBtn({ isDisabled: first }));

        // Dynamic page number buttons array
        const range = this._getPaginationRange(displayPage, maxPages);
        range.forEach(p => {
            if (p === '...') {
                buttonsHtml.push(TEMPLATES.paginationEllipsis);
            } else {
                buttonsHtml.push(TEMPLATES.paginationPageBtn({ page: p, isActive: p === displayPage }));
            }
        });

        // Next button (disabled if last is true)
        buttonsHtml.push(TEMPLATES.paginationNextBtn({ isDisabled: last }));

        $buttons.html(buttonsHtml.join(''));
    }

    /**
     * Helper to compute the numeric pages and ellipses range array for pagination display.
     * @private
     */
    _getPaginationRange(currentPage, totalPages) {
        const delta = 2;
        const range = [];
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
                range.push(i);
            } else if (range[range.length - 1] !== '...') {
                range.push('...');
            }
        }
        return range;
    }

    selectBean(beanName) {
        this.selectedBeanName = beanName;

        $('.bean-row').removeClass('bg-primary-light/40 border-l-2 border-primary font-medium');
        $('.bean-row').filter(function () {
            return $(this).attr('data-bean-name') === beanName;
        }).addClass('bg-primary-light/40 border-l-2 border-primary font-medium');

        let bean = (this.pageBeans && this.pageBeans.find(b => b.beanName === beanName)) ||
            (window.allBeansMap && window.allBeansMap.get(beanName)) ||
            (this.beans && this.beans.find(b => b.beanName === beanName));

        if (!bean) return;

        $('#def-details-sidebar').show();

        this._updateSidebarDetails(bean);
        this._updateSidebarLists(bean);

        this.renderActiveTab();
    }

    /**
     * Updates the text properties and factory/init info in the details sidebar.
     * @private
     */
    _updateSidebarDetails(bean) {
        const displayName = BeanTreeBuilder._displayName(bean.beanName);
        $('#def-sidebar-name').text(displayName);
        $('#def-sidebar-type').text(bean.type || 'N/A').attr('title', bean.type || '');

        const icon = this.getBeanIcon(bean);
        const color = this.getBeanColor(bean);
        $('#def-sidebar-icon').text(icon);

        $('#def-sidebar-icon-container')
            .css({
                'background-color': `${color}10`,
                'color': color,
                'border-color': `${color}33`
            });

        const displayScope = bean.scope ? capitalize(bean.scope) : 'N/A';
        const cleanRole = (bean.role || '').replace(/^ROLE_/, '');
        const displayRole = cleanRole ? capitalize(cleanRole) : 'N/A';

        $('#def-sidebar-scope').text(displayScope);
        $('#def-sidebar-role').text(displayRole);

        $('#def-sidebar-prop-primary').text(bean.primary ? 'TRUE' : 'FALSE');
        $('#def-sidebar-prop-lazy').text(bean.lazyInit ? 'TRUE' : 'FALSE');
        $('#def-sidebar-prop-autowired').text(bean.autowireCandidate ? 'TRUE' : 'FALSE');
        $('#def-sidebar-prop-context').text(bean.contextId || 'N/A');

        $('#def-sidebar-factory-bean').text(bean.factoryBeanName || '-');
        $('#def-sidebar-factory-method').text(bean.factoryMethodName || '-');

        $('#def-sidebar-init-method').text(bean.initMethodName || '-');
        $('#def-sidebar-destroy-method').text(bean.destroyMethodName || '-');
    }

    /**
     * Renders dependency and dependent lists in the details sidebar.
     * @private
     */
    _updateSidebarLists(bean) {
        const deps = bean.dependencies || [];
        const dependents = bean.dependents || [];

        $('#def-sidebar-deps-count').text(deps.length);
        $('#def-sidebar-dependents-count').text(dependents.length);

        const buildListHtml = (names) => {
            if (names.length === 0) {
                return TEMPLATES.sidebarEmptyList;
            }

            return names.map(depName => {
                const depRecord = window.allBeansMap?.get(depName);
                const dispName = BeanTreeBuilder._displayName(depName);

                let catColor = 'blue';
                if (depRecord) {
                    const cat = getBeanCategory({ fullName: depName, meta: { type: depRecord.type } });
                    catColor = DEPENDENCY_CATEGORY_COLORS[cat] || 'blue';
                }

                return TEMPLATES.sidebarListItem({ depName, dispName, catColor });
            }).join('');
        };

        $('#def-sidebar-deps-list').html(buildListHtml(deps));
        $('#def-sidebar-dependents-list').html(buildListHtml(dependents));
    }

    /**
     * Refreshes the display of the active tab pane in the details sidebar.
     */
    renderActiveTab() {
        $('#def-sidebar-tabs button').removeClass('text-primary border-b-2 border-primary font-bold').addClass('text-gray-500 hover:text-gray-700 font-medium');
        $(`#def-tab-${this.activeTab}`).removeClass('text-gray-500 hover:text-gray-700 font-medium').addClass('text-primary border-b-2 border-primary font-bold');

        $('.tab-pane').addClass('hidden');
        $(`#def-pane-${this.activeTab}`).removeClass('hidden');
    }

    /**
     * Binds all interactivity handlers for filters, searching, header sorting, sidebar operations, and pagination.
     */
    initEvents() {
        this._bindFilterEvents();
        this._bindHeaderSortEvents();
        this._bindTableAndPaginationEvents();
        this._bindSidebarEvents();
    }

    /**
     * Binds input search, reset, and dropdown filters.
     * @private
     */
    _bindFilterEvents() {
        // Search with 300ms debounce
        let searchTimeout;
        $('#def-search-input').off('input').on('input', (e) => {
            clearTimeout(searchTimeout);
            this.searchQuery = $(e.target).val();
            this.currentPage = 1;
            searchTimeout = setTimeout(() => {
                this.fetchTableData();
            }, 300);
        });

        // Dropdown Filters (Context, Scope, Role, Primary, Lazy)
        const filterMappings = [
            { selector: '#def-filter-context', key: 'contextId' },
            { selector: '#def-filter-scope', key: 'scope' },
            { selector: '#def-filter-role', key: 'role' },
            { selector: '#def-filter-primary', key: 'primary' },
            { selector: '#def-filter-lazy', key: 'lazy' }
        ];

        filterMappings.forEach(({ selector, key }) => {
            $(selector).off('change').on('change', (e) => {
                this.filters[key] = $(e.target).val();
                this.currentPage = 1;
                this.fetchTableData();
            });
        });

        // Dropdown Page Size Filter
        $('#def-filter-size').off('change').on('change', (e) => {
            this.pageSize = parseInt($(e.target).val()) || 10;
            this.currentPage = 1;
            this.fetchTableData();
        });

        // Clear filter settings
        $('#def-btn-reset-filters').off('click').on('click', () => {
            this.searchQuery = '';
            this.filters = { contextId: '', scope: '', role: '', primary: '', lazy: '', beanName: '' };
            this.pageSize = 10;
            this.currentPage = 1;
            this.sortBy = '';
            this.sortDir = 'asc';
            this.initFilterDropdowns();
            this.fetchTableData();
        });
    }

    /**
     * Binds table header column sorting clicks.
     * @private
     */
    _bindHeaderSortEvents() {
        $('.th-sortable').off('click').on('click', (e) => {
            const col = $(e.currentTarget).data('sort');
            if (!col) return;
            if (this.sortBy === col) {
                this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
            } else {
                this.sortBy = col;
                this.sortDir = 'asc';
            }
            this.currentPage = 1;
            this.fetchTableData();
        });
    }

    /**
     * Binds table selection rows and pagination chevrons/number button events based on API pagination state.
     * @private
     */
    _bindTableAndPaginationEvents() {
        let $paginationButton = $('#def-pagination-buttons');

        // Table row click
        $('#beanTableBody').off('click', '.bean-row').on('click', '.bean-row', (e) => {
            const beanName = $(e.currentTarget).attr('data-bean-name');
            if (beanName) {
                this.selectBean(beanName);
            }
        });

        // Pagination page number click
        $paginationButton.off('click', '.btn-page').on('click', '.btn-page', (e) => {
            const targetPage = parseInt($(e.currentTarget).data('page'));
            if (!isNaN(targetPage) && targetPage !== (this.pagination.pageNumber + 1)) {
                this.currentPage = targetPage;
                this.fetchTableData();
            }
        });

        // Pagination prev click
        $paginationButton.off('click', '.btn-prev').on('click', '.btn-prev', () => {
            if (!this.pagination.first && this.pagination.pageNumber > 0) {
                this.currentPage = this.pagination.pageNumber; // Target page 1-indexed
                this.fetchTableData();
            }
        });

        // Pagination next click
        $paginationButton.off('click', '.btn-next').on('click', '.btn-next', () => {
            if (!this.pagination.last && this.pagination.pageNumber < (this.pagination.totalPages - 1)) {
                this.currentPage = this.pagination.pageNumber + 2; // Target page 1-indexed
                this.fetchTableData();
            }
        });
    }

    /**
     * Binds close buttons, tabs switches, list-item clicks, and redirection buttons in sidebar details pane.
     * @private
     */
    _bindSidebarEvents() {
        // Sidebar close
        $('#def-close-sidebar').off('click').on('click', () => {
            $('#def-details-sidebar').hide();
            this.selectedBeanName = null;
            $('.bean-row').removeClass('bg-primary-light/40 border-l-2 border-primary font-medium');
        });

        // Sidebar tabs
        $('#def-sidebar-tabs').off('click', '.tab-btn').on('click', '.tab-btn', (e) => {
            this.activeTab = $(e.currentTarget).data('tab');
            this.renderActiveTab();
        });

        // Click list link in details pane
        $('#def-sidebar-content').off('click', '.def-sidebar-item-click').on('click', '.def-sidebar-item-click', (e) => {
            const depName = $(e.currentTarget).data('fullname');
            if (depName && window.allBeansMap?.has(depName)) {
                this.selectBean(depName);
            }
        });

        // Complete graph redirect hook
        $('#def-view-graph-btn').off('click').on('click', () => {
            if (this.selectedBeanName) {
                window.focusBeanOnNextGraphEnter = this.selectedBeanName;
                window.location.hash = '#/graph';
            }
        });
    }

    /**
     * Destroys existing charts to avoid memory leaks or canvas drawing conflicts.
     */
    cleanupCharts() {
        for (const [key, chart] of Object.entries(this.charts)) {
            if (chart) {
                chart.destroy();
                this.charts[key] = null;
            }
        }
    }
}