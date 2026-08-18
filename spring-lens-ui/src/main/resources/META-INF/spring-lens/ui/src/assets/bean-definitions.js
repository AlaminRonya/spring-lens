import { BeanTreeBuilder } from './bean-data-loader.js';
import {
    TEMPLATES,
    SCOPE_COLORS,
    ROLE_COLORS,
    SCOPE_STYLES,
    DEFAULT_SCOPE_STYLE,
    DEPENDENCY_CATEGORY_COLORS,
    NW,
    NH,
    RX,
    GAP_X,
    GAP_Y,
    ICON,
    ZOOM_SCALE_EXTENT
} from './constants.js';
import {
    getBeanCategory,
    capitalize,
    formatPercentage,
    resolveBeanMetadata,
    tbLink,
    lrLink,
    tree
} from './utils.js';

/**
 * Controller class for the Beans Definitions dashboard tab.
 * Manages view state (pagination, filters, search, sorting), renders table data via server API,
 * manages D3/Chart.js metrics, and handles detail sidebar interactivity.
 */
export default class BeanDefinitionsController {
    // Private State Fields
    _hasFetchedTableData = false;
    _searchDebounceTimer = null;

    constructor(dataLoader) {
        this.dataLoader = dataLoader;
        this.summaryData = null;

        this.activeCharts = {
            scopeChart: null,
            roleChart: null
        };

        // All beans dataset (used for overall KPIs, charts, dropdown options)
        this.allBeans = [];

        // Server-paginated data for current table view
        this.currentPageBeans = [];
        this.searchQuery = '';

        // API Pagination Metadata state
        this.paginationState = {
            totalElements: 0,
            totalPages: 1,
            pageNumber: 0,
            pageSize: 10,
            isFirstPage: true,
            isLastPage: true
        };

        this.filterCriteria = {
            contextId: '',
            beanName: '',
            scope: '',
            role: '',
            isPrimary: '',
            isLazy: ''
        };

        this.currentPage = 1; // 1-indexed UI state
        this.itemsPerPage = 10;
        this.sortColumn = '';
        this.sortDirection = 'asc';

        this.selectedBeanId = null;
        this.selectedBeanName = null;
        this.selectedContextId = null;
        this.activeSidebarTab = 'properties'; // 'properties' | 'dependencies' | 'dependents'

        this.modalGraphMode = 'tb';
        this.modalZoom = null;
        this.modalSvg = null;
        this.modalGraphRoot = null;
    }

    /**
     * Fetches summary distribution metrics from the summary API endpoint (/summary).
     */
    async fetchSummaryData() {
        try {
            const baseUrl = this.dataLoader?.dataUrl || 'http://localhost:8082/spring-lens/api/beans/definitions';
            const cleanUrl = baseUrl.split('?')[0].replace(/\/$/, '');
            const summaryUrl = cleanUrl.endsWith('/summary') ? cleanUrl : `${cleanUrl}/summary`;

            const response = await fetch(summaryUrl);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            this.summaryData = await response.json();
            this.refreshKeyPerformanceIndicators();
            this.initializeCharts();
        } catch (error) {
            console.error('Error fetching bean summary metrics:', error);
        }
    }

    /**
     * Initializes the view by loading the overall bean dataset, setting up filters,
     * building charts, fetching paginated table data, and binding event handlers.
     */
    async enter() {
        try {
            await this.dataLoader.load();
            this.allBeans = window.allBeansMap ? Array.from(window.allBeansMap.values()) : [];

            this.initializeFilterDropdowns();
            this.bindEvents();

            await Promise.all([
                this.fetchSummaryData(),
                this.fetchTableData()
            ]);

            // Select the first bean as default details if available
            const defaultBean = this.currentPageBeans[0] || this.allBeans[0];
            if (defaultBean) {
                this.selectBean(defaultBean.beanName, defaultBean.contextId);
            }
        } catch (error) {
            console.error('Error entering BeanDefinitions view:', error);
        }
    }

    /**
     * Cleans up resources (charts, timers) when transitioning away from the view.
     */
    leave() {
        this.destroyCharts();
        this.closeGraphModal();
        if (this._searchDebounceTimer) {
            clearTimeout(this._searchDebounceTimer);
        }
    }

    /**
     * Populates filter dropdowns with unique options aggregated from the dataset.
     */
    initializeFilterDropdowns() {
        const $contextDropdown = $('#def-filter-context');
        const $scopeDropdown = $('#def-filter-scope');
        const $roleDropdown = $('#def-filter-role');

        const uniqueContexts = new Set();
        const uniqueScopes = new Set();
        const uniqueRoles = new Set();

        this.allBeans.forEach(bean => {
            if (bean.contextId) uniqueContexts.add(bean.contextId);
            if (bean.scope) uniqueScopes.add(bean.scope);
            if (bean.role) uniqueRoles.add(bean.role);
        });

        if ($contextDropdown.length > 0) {
            this._populateSelectDropdown(
                $contextDropdown,
                uniqueContexts,
                'Context: All',
                contextId => contextId
            );
            $contextDropdown.val(this.filterCriteria.contextId);
        }

        this._populateSelectDropdown(
            $scopeDropdown,
            uniqueScopes,
            'Scope: All',
            scope => capitalize(scope)
        );

        this._populateSelectDropdown(
            $roleDropdown,
            uniqueRoles,
            'Role: All',
            role => capitalize(role.replace(/^ROLE_/, ''))
        );

        // Sync dropdown selectors with active filter state
        $scopeDropdown.val(this.filterCriteria.scope);
        $roleDropdown.val(this.filterCriteria.role);
        $('#def-filter-primary').val(this.filterCriteria.isPrimary);
        $('#def-filter-lazy').val(this.filterCriteria.isLazy);
        $('#def-filter-size').val(this.itemsPerPage);
        $('#def-search-input').val(this.searchQuery);
    }

    _populateSelectDropdown($selectElement, optionsSet, defaultLabel, labelFormatter) {
        $selectElement.html(`<option value="">${defaultLabel}</option>`);
        Array.from(optionsSet).sort().forEach(value => {
            $selectElement.append(`<option value="${value}">${labelFormatter(value)}</option>`);
        });
    }

    /**
     * Computes and updates metrics cards (total counts, context distributions, lazy percentage).
     */
    refreshKeyPerformanceIndicators() {
        this._updateTotalBeanCountKPI();
        this._updateContextDistributionKPI();
        this._updateLazyInitializationKPI();
    }

    _updateTotalBeanCountKPI() {
        const totalCount = this.summaryData?.totalBeanDefinitions
            ?? (this.paginationState?.totalElements || this.allBeans.length);

        $('#def-total-count').text(totalCount.toLocaleString());
    }

    _updateContextDistributionKPI() {
        const contextDistribution = this.summaryData?.contextDistribution;
        const themeColors = ['bg-primary', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-indigo-500', 'bg-purple-500', 'bg-rose-500', 'bg-teal-500'];

        if (contextDistribution) {
            const totalBeans = this.summaryData?.totalBeanDefinitions || 1;
            const sortedContextEntries = Object.entries(contextDistribution).sort((a, b) => b[1] - a[1]);

            const contextListHtml = sortedContextEntries.map(([ctxId, count], index) => {
                const percentage = Math.round((count / totalBeans) * 100);
                const colorClass = themeColors[index % themeColors.length];
                return TEMPLATES.contextListItem({ ctxId, colorClass, pct: percentage, count });
            }).join('');

            $('#def-context-list').html(contextListHtml);
            return;
        }

        if (!this.allBeans || this.allBeans.length === 0) return;

        const totalBeans = this.allBeans.length;
        const contextCounts = {};

        this.allBeans.forEach(bean => {
            const contextId = bean.contextId || 'unknown';
            contextCounts[contextId] = (contextCounts[contextId] || 0) + 1;
        });

        const sortedContextEntries = Object.entries(contextCounts).sort((a, b) => b[1] - a[1]);
        const contextListHtml = sortedContextEntries.map(([ctxId, count], index) => {
            const percentage = Math.round((count / totalBeans) * 100);
            const colorClass = themeColors[index % themeColors.length];
            return TEMPLATES.contextListItem({ ctxId, colorClass, pct: percentage, count });
        }).join('');

        $('#def-context-list').html(contextListHtml);
    }

    _updateLazyInitializationKPI() {
        const loadingModeDist = this.summaryData?.loadingModeDistribution;
        if (loadingModeDist) {
            const totalBeans = this.summaryData?.totalBeanDefinitions
                || ((loadingModeDist.LAZY || 0) + (loadingModeDist.EAGER || 0))
                || 1;
            const lazyBeanCount = loadingModeDist.LAZY || 0;
            const lazyPercentage = Math.round((lazyBeanCount / totalBeans) * 100);

            $('#def-lazy-percent').text(`${lazyPercentage}%`);
            $('#def-lazy-bar').css('width', `${lazyPercentage}%`);
            return;
        }

        if (!this.allBeans || this.allBeans.length === 0) return;

        const totalBeans = this.allBeans.length;
        const lazyBeanCount = this.allBeans.filter(bean => bean.lazyInit).length;
        const lazyPercentage = Math.round((lazyBeanCount / totalBeans) * 100);

        $('#def-lazy-percent').text(`${lazyPercentage}%`);
        $('#def-lazy-bar').css('width', `${lazyPercentage}%`);
    }

    /**
     * Initializes scope and role distribution charts with live computed frequencies from summary API.
     */
    initializeCharts() {
        this.destroyCharts();

        // Scope distribution from summary API or fallback
        const scopeDist = this.summaryData?.scopeDistribution;
        if (scopeDist) {
            this._createChartFromDistribution(
                'scopeChart',
                'scopeChart',
                '#def-scope-legend',
                scopeDist,
                key => capitalize(key),
                SCOPE_COLORS,
                '#a855f7'
            );
        } else if (this.allBeans.length > 0) {
            this._createDistributionChart(
                'scopeChart',
                'scopeChart',
                '#def-scope-legend',
                bean => capitalize(bean.scope || 'unknown'),
                SCOPE_COLORS,
                '#a855f7'
            );
        }

        // Role distribution from summary API or fallback
        const roleDist = this.summaryData?.roleDistribution;
        if (roleDist) {
            this._createChartFromDistribution(
                'roleChart',
                'roleChart',
                '#def-role-legend',
                roleDist,
                key => capitalize(key.replace(/^ROLE_/, '')),
                ROLE_COLORS,
                '#cbd5e1'
            );
        } else if (this.allBeans.length > 0) {
            this._createDistributionChart(
                'roleChart',
                'roleChart',
                '#def-role-legend',
                bean => capitalize((bean.role || 'unknown').replace(/^ROLE_/, '')),
                ROLE_COLORS,
                '#cbd5e1'
            );
        }
    }

    _createChartFromDistribution(chartKey, canvasId, legendContainerId, distributionObj, keyFormatter, colorMap, fallbackColor) {
        const itemFrequencies = {};
        let totalCount = 0;

        for (const [rawKey, count] of Object.entries(distributionObj)) {
            const formattedKey = keyFormatter(rawKey) || 'unknown';
            itemFrequencies[formattedKey] = (itemFrequencies[formattedKey] || 0) + count;
            totalCount += count;
        }

        const chartLabels = Object.keys(itemFrequencies);
        const chartData = Object.values(itemFrequencies);
        const segmentColors = chartLabels.map(label => colorMap[label] || fallbackColor);

        const legendHtml = chartLabels.map((label, index) => {
            const count = chartData[index];
            const pctStr = formatPercentage(count, totalCount);
            const color = segmentColors[index];
            return TEMPLATES.chartLegendItem({ color, lbl: label, count, pctStr });
        }).join('');

        $(legendContainerId).html(legendHtml);

        this.activeCharts[chartKey] = this._instantiateDoughnutChart(
            canvasId,
            chartLabels,
            chartData,
            segmentColors
        );
    }

    _createDistributionChart(chartKey, canvasId, legendContainerId, valueExtractor, colorMap, fallbackColor) {
        const itemFrequencies = {};
        this.allBeans.forEach(bean => {
            const categoryKey = valueExtractor(bean) || 'unknown';
            itemFrequencies[categoryKey] = (itemFrequencies[categoryKey] || 0) + 1;
        });

        const chartLabels = Object.keys(itemFrequencies);
        const chartData = Object.values(itemFrequencies);
        const segmentColors = chartLabels.map(label => colorMap[label] || fallbackColor);

        const legendHtml = chartLabels.map((label, index) => {
            const count = chartData[index];
            const pctStr = formatPercentage(count, this.allBeans.length);
            const color = segmentColors[index];
            return TEMPLATES.chartLegendItem({ color, lbl: label, count, pctStr });
        }).join('');

        $(legendContainerId).html(legendHtml);

        this.activeCharts[chartKey] = this._instantiateDoughnutChart(
            canvasId,
            chartLabels,
            chartData,
            segmentColors
        );
    }

    _instantiateDoughnutChart(canvasId, labels, data, backgroundColor) {
        const canvasElement = document.getElementById(canvasId);
        if (!canvasElement) return null;

        return new Chart(canvasElement, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor,
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

    renderTableError(errorMessage) {
        const $tbody = $('#beanTableBody');
        if ($tbody.length === 0) return;

        $tbody.html(`
            <tr>
                <td colspan="8" class="px-5 py-8 text-center text-red-500 dark:text-red-400">
                    <div class="flex items-center justify-center gap-2 text-sm font-semibold">
                        <span class="material-symbols-outlined text-lg">warning</span>
                        <span>Failed to fetch table data: ${errorMessage}</span>
                    </div>
                </td>
            </tr>
        `);
    }

    _buildApiQueryParams() {
        const rawParams = {
            pageNumber: this.currentPage - 1,
            pageSize: this.itemsPerPage,
            search: this.searchQuery,
            contextId: this.filterCriteria.contextId,
            beanName: this.filterCriteria.beanName,
            scope: this.filterCriteria.scope,
            role: this.filterCriteria.role,
            primary: this.filterCriteria.isPrimary,
            lazyInit: this.filterCriteria.isLazy,
            sortBy: this.sortColumn,
            sortDir: this.sortDirection
        };

        const entries = Object.entries(rawParams)
            .filter(
                ([_, value]) => value !== ''
                    && value !== null
                    && value !== undefined
            );

        return new URLSearchParams(entries);
    }

    /**
     * Fetches paginated bean definitions from backend API using active filters and pagination state.
     */
    async fetchTableData() {
        this.showTableLoading();

        const queryParams = this._buildApiQueryParams();
        const baseUrl = this.dataLoader?.dataUrl;
        const separator = baseUrl.includes('?') ? '&' : '?';
        const queryString = queryParams.toString();
        const requestUrl = queryString ? `${baseUrl}${separator}${queryString}` : baseUrl;

        try {
            const response = await fetch(requestUrl);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();

            this._processPaginatedResponse(data);

            this._hasFetchedTableData = true;
            this.renderTable();
            this.renderPagination();
            this.updateSortHeaderIcons();
            this._updateTotalBeanCountKPI();
        } catch (error) {
            console.error('Error fetching bean definitions table data:', error);
            this.renderTableError(error.message);
        }
    }

    /**
     * Processes API responses (paginated objects or raw arrays) and updates component state.
     * @param {Object|Array} responseData - The API response payload.
     */
    _processPaginatedResponse(responseData) {
        const isPaginatedPayload = Array.isArray(responseData?.content);
        const isFlatArrayPayload = Array.isArray(responseData);

        if (isPaginatedPayload) {
            this._applyPaginatedPayload(responseData);
        } else if (isFlatArrayPayload) {
            this._applyFlatArrayPayload(responseData);
        } else {
            this._resetPaginationState();
        }

        // Sync UI display page (1-indexed) and items per page
        this.currentPage = this.paginationState.pageNumber + 1;
        this.itemsPerPage = this.paginationState.pageSize;

        this._cacheFetchedBeans();
    }

    _applyPaginatedPayload(data) {
        const { content, totalElements, totalPages, pageNumber, pageSize, first, last } = data;
        const computedTotalPages = totalPages ?? 1;
        const computedPageNumber = pageNumber ?? 0;

        this.currentPageBeans = content;
        this.paginationState = {
            totalElements: totalElements ?? content.length,
            totalPages: computedTotalPages,
            pageNumber: computedPageNumber,
            pageSize: pageSize ?? this.itemsPerPage,
            isFirstPage: first ?? (computedPageNumber === 0),
            isLastPage: last ?? (computedPageNumber >= computedTotalPages - 1)
        };
    }

    _applyFlatArrayPayload(items) {
        const totalElements = items.length;
        const totalPages = Math.max(1, Math.ceil(totalElements / this.itemsPerPage));
        const pageIndex = Math.max(0, Math.min(this.currentPage - 1, totalPages - 1));

        const startIndex = pageIndex * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;

        this.currentPageBeans = items.slice(startIndex, endIndex);
        this.paginationState = {
            totalElements,
            totalPages,
            pageNumber: pageIndex,
            pageSize: this.itemsPerPage,
            isFirstPage: pageIndex === 0,
            isLastPage: pageIndex >= totalPages - 1
        };
    }

    _resetPaginationState() {
        this.currentPageBeans = [];
        this.paginationState = {
            totalElements: 0,
            totalPages: 1,
            pageNumber: 0,
            pageSize: this.itemsPerPage,
            isFirstPage: true,
            isLastPage: true
        };
    }

    _cacheFetchedBeans() {
        if (!window.allBeansMap) return;

        for (const bean of this.currentPageBeans) {
            if (bean.beanName && !window.allBeansMap.has(bean.beanName)) {
                window.allBeansMap.set(bean.beanName, bean);
            }
        }
    }

    updateSortHeaderIcons() {
        $('.sort-icon').text('unfold_more').removeClass('text-primary font-bold');
        if (this.sortColumn) {
            const $sortIcon = $(`.sort-icon[data-col="${this.sortColumn}"]`);
            if ($sortIcon.length > 0) {
                const iconName = this.sortDirection === 'desc' ? 'arrow_downward' : 'arrow_upward';
                $sortIcon.text(iconName).addClass('text-primary font-bold');
            }
        }
    }

    getBeanIcon(bean) {
        return resolveBeanMetadata(bean).icon;
    }

    getBeanColor(bean) {
        return resolveBeanMetadata(bean).color;
    }

    /**
     * Renders the bean definitions list table for the current page.
     */
    renderTable() {
        const $tbody = $('#beanTableBody');
        if ($tbody.length === 0) return;

        if (this.currentPageBeans.length === 0) {
            $tbody.html(`
                <tr>
                    <td colspan="8" class="px-5 py-8 text-center text-gray-400">
                        No beans found matching the active filters or search query.
                    </td>
                </tr>
            `);
            return;
        }

        const rowsHtml = this.currentPageBeans.map(bean => this._generateTableRowHtml(bean));
        $tbody.html(rowsHtml.join(''));
    }

    _generateTableRowHtml(bean) {
        const { beanName, role, scope, type, primary, lazyInit, contextId } = bean;
        const beanId = this._getBeanUniqueId(contextId, beanName);

        // Format display values
        const displayName = BeanTreeBuilder._displayName(beanName);
        const cleanRole = role?.replace(/^ROLE_/, '');
        const displayRole = cleanRole ? capitalize(cleanRole) : 'N/A';
        const displayScope = scope ? capitalize(scope) : 'N/A';

        // Style resolutions
        const scopeStyle = SCOPE_STYLES[scope?.toLowerCase()] ?? DEFAULT_SCOPE_STYLE;
        const isSelected = this.selectedBeanId === beanId;
        const activeRowClass = isSelected
            ? 'bg-primary-light/40 border-l-2 border-primary font-medium'
            : '';

        return TEMPLATES.beanDefinitionTable({
            activeRowClass,
            beanId,
            beanName,
            displayName,
            type,
            contextId,
            color: this.getBeanColor(bean),
            icon: this.getBeanIcon(bean),
            scopeStyle,
            displayScope,
            displayRole,
            primaryIcon: primary ? TEMPLATES.checkCircle : TEMPLATES.uncheckedCircle,
            lazyIcon: lazyInit ? TEMPLATES.checkCircle : TEMPLATES.uncheckedCircle
        });
    }

    _getBeanUniqueId(contextIdOrBean, beanName) {
        if (typeof contextIdOrBean === 'object' && contextIdOrBean !== null) {
            const ctx = contextIdOrBean.contextId || 'default';
            const name = contextIdOrBean.beanName || '';
            return `${ctx}:${name}`;
        }
        const ctx = contextIdOrBean || 'default';
        return `${ctx}:${beanName || ''}`;
    }


    /**
     * Renders dynamic pagination navigation controls driven by pagination metadata.
     */
    renderPagination() {
        const { totalElements, totalPages, pageNumber, pageSize, isFirstPage, isLastPage } = this.paginationState;

        this._updatePaginationInfoText(totalElements, pageNumber, pageSize);

        const $paginationContainer = $('#def-pagination-buttons');
        if ($paginationContainer.length === 0) return;

        const activeDisplayPage = pageNumber + 1;
        const maxPages = Math.max(1, totalPages);
        const pageRange = this._calculatePaginationRange(activeDisplayPage, maxPages);

        const paginationButtonsHtml = [
            TEMPLATES.paginationPrevBtn({ isDisabled: isFirstPage }),
            ...pageRange.map(page => this._renderPaginationButton(page, activeDisplayPage)),
            TEMPLATES.paginationNextBtn({ isDisabled: isLastPage })
        ].join('');

        $paginationContainer.html(paginationButtonsHtml);
    }

    _updatePaginationInfoText(totalElements, pageNumber, pageSize) {
        const startIndex = totalElements === 0 ? 0 : (pageNumber * pageSize) + 1;
        const endIndex = Math.min((pageNumber + 1) * pageSize, totalElements);

        const infoText = `Showing ${startIndex} to ${endIndex} of ${totalElements.toLocaleString()} beans`;
        $('#def-pagination-info').text(infoText);
    }

    _renderPaginationButton(page, activeDisplayPage) {
        if (page === '...') {
            return TEMPLATES.paginationEllipsis;
        }
        return TEMPLATES.paginationPageBtn({
            page,
            isActive: page === activeDisplayPage
        });
    }

    _calculatePaginationRange(currentPage, totalPages) {
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

    /**
     * Selects a bean, updates UI highlighting using the unique bean ID (${contextId}:${beanName}),
     * and populates the details sidebar.
     * @param {string} beanName - Target bean name or unique bean ID.
     * @param {string} [contextId] - Optional context identifier for the target bean.
     */
    selectBean(beanName, contextId = null) {
        const beanId = this._getBeanUniqueId(contextId, beanName);

        this.selectedBeanId = beanId;
        this.selectedBeanName = beanName;
        this.selectedContextId = contextId;

        this._updateRowSelectionStyles(beanId);

        const targetBean = this._findBeanById(beanId) || this._findBeanByName(beanName, contextId);
        if (!targetBean) return;

        $('#def-details-sidebar').show();

        this._populateSidebarDetails(targetBean);
        this._populateSidebarLists(targetBean);
        this.renderActiveTab();
    }

    _updateRowSelectionStyles(activeBeanId) {
        const activeClass = 'bg-primary-light/40 border-l-2 border-primary font-medium';

        $('.bean-row').each((_, element) => {
            const $row = $(element);
            const rowBeanId = $row.attr('data-bean-id');
            const isSelected = rowBeanId === activeBeanId;
            $row.toggleClass(activeClass, isSelected);
        });
    }

    _findBeanById(beanId) {
        return this.currentPageBeans?.find(bean => this._getBeanUniqueId(bean) === beanId)
            ?? this.allBeans?.find(bean => this._getBeanUniqueId(bean) === beanId);
    }

    _findBeanByName(beanName, contextId = null) {
        if (contextId) {
            const pageMatch = this.currentPageBeans?.find(bean => bean.beanName === beanName && bean.contextId === contextId);
            if (pageMatch) return pageMatch;

            const allMatch = this.allBeans?.find(bean => bean.beanName === beanName && bean.contextId === contextId);
            if (allMatch) return allMatch;
        }

        return this.currentPageBeans?.find(bean => bean.beanName === beanName)
            ?? window.allBeansMap?.get(beanName)
            ?? this.allBeans?.find(bean => bean.beanName === beanName);
    }

    /**
     * Updates the text properties and factory/lifecycle info in the details sidebar.
     * @param {Object} bean - The bean definition object.
     */
    _populateSidebarDetails(bean) {
        const {
            beanName,
            type = 'N/A',
            scope,
            role,
            primary,
            lazyInit,
            autowireCandidate,
            contextId = 'N/A',
            factoryBeanName = '-',
            factoryMethodName = '-',
            initMethodName = '-',
            destroyMethodName = '-'
        } = bean;

        const displayName = BeanTreeBuilder._displayName(beanName);
        const cleanRole = role?.replace(/^ROLE_/, '');
        const displayRole = cleanRole ? capitalize(cleanRole) : 'N/A';
        const displayScope = scope ? capitalize(scope) : 'N/A';

        // Batch text updates to prevent repetitive DOM queries
        const textMap = {
            '#def-sidebar-name': displayName,
            '#def-sidebar-type': type,
            '#def-sidebar-scope': displayScope,
            '#def-sidebar-role': displayRole,
            '#def-sidebar-prop-primary': primary ? 'TRUE' : 'FALSE',
            '#def-sidebar-prop-lazy': lazyInit ? 'TRUE' : 'FALSE',
            '#def-sidebar-prop-autowired': autowireCandidate ? 'TRUE' : 'FALSE',
            '#def-sidebar-prop-context': contextId,
            '#def-sidebar-factory-bean': factoryBeanName,
            '#def-sidebar-factory-method': factoryMethodName,
            '#def-sidebar-init-method': initMethodName,
            '#def-sidebar-destroy-method': destroyMethodName
        };

        Object.entries(textMap).forEach(([selector, textValue]) => {
            $(selector).text(textValue);
        });

        $('#def-sidebar-name').attr('title', beanName);
        $('#def-sidebar-type').attr('title', type);

        this._updateSidebarIcon(bean);
    }

    _updateSidebarIcon(bean) {
        const icon = this.getBeanIcon(bean);
        const color = this.getBeanColor(bean);

        $('#def-sidebar-icon').text(icon);
        $('#def-sidebar-icon-container').css({
            backgroundColor: `${color}10`,
            color,
            borderColor: `${color}33`
        });
    }

    /**
     * Renders dependency and dependent lists in the details sidebar.
     * @param {Object} bean - The selected bean definition object.
     */
    _populateSidebarLists(bean) {
        const { dependencies = [], dependents = [] } = bean;

        $('#def-sidebar-deps-count').text(dependencies.length);
        $('#def-sidebar-dependents-count').text(dependents.length);

        $('#def-sidebar-deps-list').html(this._generateSidebarListHtml(dependencies));
        $('#def-sidebar-dependents-list').html(this._generateSidebarListHtml(dependents));
    }

    _generateSidebarListHtml(beanNames) {
        if (beanNames.length === 0) return TEMPLATES.sidebarEmptyList;

        return beanNames
            .map(depName => this._renderSidebarListItem(depName))
            .join('');
    }

    _renderSidebarListItem(dependencyName) {
        const displayName = BeanTreeBuilder._displayName(dependencyName);
        const categoryColor = this._resolveDependencyCategoryColor(dependencyName);

        return TEMPLATES.sidebarListItem({
            depName: dependencyName,
            dispName: displayName,
            catColor: categoryColor
        });
    }

    _resolveDependencyCategoryColor(dependencyName) {
        const dependencyRecord = window.allBeansMap?.get(dependencyName);
        if (!dependencyRecord) return 'blue';

        const category = getBeanCategory({
            fullName: dependencyName,
            meta: { type: dependencyRecord.type }
        });

        return DEPENDENCY_CATEGORY_COLORS[category] ?? 'blue';
    }

    /**
     * Refreshes the active tab button style and toggles visible tab pane.
     */
    renderActiveTab() {
        const activeClasses = 'text-primary border-b-2 border-primary font-bold';
        const inactiveClasses = 'text-gray-500 hover:text-gray-700 font-medium';

        $('#def-sidebar-tabs button').each((_, element) => {
            const isSelected = element.id === `def-tab-${this.activeSidebarTab}`;
            $(element)
                .toggleClass(activeClasses, isSelected)
                .toggleClass(inactiveClasses, !isSelected);
        });

        $('.tab-pane').addClass('hidden');
        $(`#def-pane-${this.activeSidebarTab}`).removeClass('hidden');
    }

    /**
     * Binds all UI interactivity handlers using centralized event delegation.
     */
    bindEvents() {
        this._bindSearchInput();
        this._bindFilterChangeEvents();
        this._bindClickActionDelegation();
        this.bindModalControls();
    }

    _bindSearchInput() {
        $('#def-search-input').off('input').on('input', (e) => {
            clearTimeout(this._searchDebounceTimer);
            this.searchQuery = e.target.value.trim();
            this.currentPage = 1;

            this._searchDebounceTimer = setTimeout(() => this.fetchTableData(), 300);
        });
    }

    _bindFilterChangeEvents() {
        const filterKeyMap = {
            '#def-filter-context': 'contextId',
            '#def-filter-scope': 'scope',
            '#def-filter-role': 'role',
            '#def-filter-primary': 'isPrimary',
            '#def-filter-lazy': 'isLazy'
        };

        // Consolidated filter change router
        const filterSelectors = Object.keys(filterKeyMap).join(', ');
        $(filterSelectors).off('change').on('change', (e) => {
            const key = filterKeyMap[`#${e.target.id}`];
            if (key) {
                this.filterCriteria[key] = e.target.value;
                this.currentPage = 1;
                this.fetchTableData();
            }
        });

        // Page size dropdown handler
        $('#def-filter-size').off('change').on('change', (e) => {
            this.itemsPerPage = parseInt(e.target.value, 10) || 10;
            this.currentPage = 1;
            this.fetchTableData();
        });
    }

    /**
     * Centralized click router using data-action attributes and element classes.
     */
    _bindClickActionDelegation() {
        // Top-level document delegation prevents re-binding on dynamic HTML updates
        $(document).off('click.beanDefs').on('click.beanDefs', '[data-action]', (e) => {
            const $target = $(e.currentTarget);
            const action = $target.data('action');

            this._handleDelegatedClick(action, $target, e);
        });
    }

    _handleDelegatedClick(action, $target, event) {
        const actionHandlers = {
            'refresh-data': async () => {
                const $icon = $target.find('.material-symbols-outlined');
                $icon.addClass('animate-spin');
                try {
                    if (this.dataLoader) {
                        this.dataLoader.rootPromise = null;
                    }
                    await this.enter();
                } catch (err) {
                    console.error('Error refreshing bean definitions:', err);
                } finally {
                    setTimeout(() => $icon.removeClass('animate-spin'), 500);
                }
            },
            'reset-filters': () => {
                this._resetFilterState();
                this.initializeFilterDropdowns();
                this.fetchTableData();
            },
            'sort-column': () => {
                const columnKey = $target.data('sort');
                if (!columnKey) return;

                this.sortDirection = (this.sortColumn === columnKey && this.sortDirection === 'asc') ? 'desc' : 'asc';
                this.sortColumn = columnKey;
                this.currentPage = 1;
                this.fetchTableData();
            },
            'select-bean': () => {
                const beanName = $target.data('bean-name');
                const contextId = $target.data('context-id');
                if (beanName) this.selectBean(beanName, contextId);
            },
            'select-dependency': () => {
                const dependencyName = $target.data('fullname');
                if (dependencyName && window.allBeansMap?.has(dependencyName)) {
                    this.selectBean(dependencyName);
                }
            },
            'change-page': () => {
                const targetPage = parseInt($target.data('page'), 10);
                if (!isNaN(targetPage) && targetPage !== this.currentPage) {
                    this.currentPage = targetPage;
                    this.fetchTableData();
                }
            },
            'prev-page': () => {
                if (!this.paginationState.isFirstPage && this.paginationState.pageNumber > 0) {
                    this.currentPage = this.paginationState.pageNumber;
                    this.fetchTableData();
                }
            },
            'next-page': () => {
                if (!this.paginationState.isLastPage && this.paginationState.pageNumber < (this.paginationState.totalPages - 1)) {
                    this.currentPage = this.paginationState.pageNumber + 2;
                    this.fetchTableData();
                }
            },
            'switch-tab': () => {
                this.activeSidebarTab = $target.data('tab');
                this.renderActiveTab();
            },
            'close-sidebar': () => {
                $('#def-details-sidebar').hide();
                this.selectedBeanId = null;
                this.selectedBeanName = null;
                this.selectedContextId = null;
                $('.bean-row').removeClass('bg-primary-light/40 border-l-2 border-primary font-medium');
            },
            'view-graph': () => {
                if (this.selectedBeanName) {
                    this.openGraphModal();
                }
            },
            'close-graph-modal': () => {
                this.closeGraphModal();
            }
        };

        const handler = actionHandlers[action];
        if (handler) {
            event.preventDefault();
            handler();
        }
    }

    _resetFilterState() {
        this.searchQuery = '';
        this.filterCriteria = {
            contextId: '',
            scope: '',
            role: '',
            isPrimary: '',
            isLazy: '',
            beanName: ''
        };
        this.itemsPerPage = 10;
        this.currentPage = 1;
        this.sortColumn = '';
        this.sortDirection = 'asc';
    }

    /**
     * Destroys existing charts to avoid memory leaks or canvas drawing conflicts.
     */
    destroyCharts() {
        for (const [key, chartInstance] of Object.entries(this.activeCharts)) {
            if (chartInstance) {
                chartInstance.destroy();
                this.activeCharts[key] = null;
            }
        }
    }

    openGraphModal() {
        if (!this.selectedBeanName) return;

        const targetBean = this._findBeanById(this.selectedBeanId) || this._findBeanByName(this.selectedBeanName, this.selectedContextId);
        if (!targetBean) return;

        $('#modal-graph-bean-name').text(BeanTreeBuilder._displayName(targetBean.beanName));
        $('#def-graph-modal').removeClass('hidden');

        $(document).off('keydown.graphModal').on('keydown.graphModal', (e) => {
            if (e.key === 'Escape') this.closeGraphModal();
        });

        $('#def-graph-modal').off('click.backdrop').on('click.backdrop', (e) => {
            if (e.target.id === 'def-graph-modal') this.closeGraphModal();
        });

        this.renderModalGraph(targetBean);
    }

    closeGraphModal() {
        $('#def-graph-modal').addClass('hidden');
        $(document).off('keydown.graphModal');
        const $tip = $('#tip');
        if ($tip.length > 0) $tip.removeClass('show');
    }

    _buildModalGraphHierarchy(targetBean) {
        const displayName = BeanTreeBuilder._displayName(targetBean.beanName);
        const children = [];

        // 1. Dependencies (Beans targetBean depends on)
        const deps = targetBean.dependencies || [];
        if (deps.length > 0) {
            deps.forEach(depName => {
                const depBean = window.allBeansMap?.get(depName);
                children.push({
                    name: BeanTreeBuilder._displayName(depName),
                    fullName: depName,
                    meta: {
                        type: depBean?.type || 'N/A',
                        scope: depBean?.scope || 'N/A',
                        role: depBean?.role || 'N/A',
                        kind: 'dependency'
                    }
                });
            });
        }

        // 2. Dependents (Beans depending on targetBean)
        const dependents = targetBean.dependents || [];
        if (dependents.length > 0) {
            dependents.forEach(depName => {
                const depBean = window.allBeansMap?.get(depName);
                children.push({
                    name: BeanTreeBuilder._displayName(depName),
                    fullName: depName,
                    meta: {
                        type: depBean?.type || 'N/A',
                        scope: depBean?.scope || 'N/A',
                        role: depBean?.role || 'N/A',
                        kind: 'dependent'
                    }
                });
            });
        }

        return {
            name: displayName,
            fullName: targetBean.beanName,
            meta: {
                type: targetBean.type || 'N/A',
                scope: targetBean.scope || 'N/A',
                role: targetBean.role || 'N/A',
                kind: 'target'
            },
            children: children.length > 0 ? children : undefined
        };
    }

    renderModalGraph(targetBean) {
        const svg = d3.select('#modal-tree-svg');
        if (!svg.node()) return;

        svg.selectAll('*').remove();

        svg.append('defs')
            .append('marker')
            .attr('id', 'modal-dot')
            .attr('viewBox', '0 0 10 10')
            .attr('refX', 9)
            .attr('refY', 5)
            .attr('markerUnits', 'userSpaceOnUse')
            .attr('markerWidth', 10)
            .attr('markerHeight', 10)
            .attr('orient', 'auto')
            .append('circle')
            .attr('cx', 5)
            .attr('cy', 5)
            .attr('r', 4)
            .attr('fill', '#94a3b8');

        const gMain = svg.append('g').attr('id', 'modal-g-main');
        const gLink = gMain.append('g').attr('class', 'links');
        const gNode = gMain.append('g').attr('class', 'nodes');

        const zoom = d3.zoom()
            .scaleExtent(ZOOM_SCALE_EXTENT || [0.05, 4])
            .on('zoom', ({ transform }) => gMain.attr('transform', transform));

        svg.call(zoom);
        this.modalZoom = zoom;
        this.modalSvg = svg;

        const rawData = this._buildModalGraphHierarchy(targetBean);
        const root = d3.hierarchy(rawData);

        this.modalGraphRoot = root;
        this.modalGraphMode = this.modalGraphMode || 'tb';

        this._drawModalTree(root, gNode, gLink, svg, zoom);
    }

    _drawModalTree(root, gNode, gLink, svg, zoom) {
        const isTB = this.modalGraphMode === 'tb';
        const descendants = root.descendants();

        descendants.forEach((node, i) => {
            node.id = i;
            const nameLen = node.data.name?.length || 0;
            node.width = Math.max(170, nameLen * 7.5 + 60);
        });

        const maxWidth = d3.max(descendants, d => d.width) || NW;
        tree.nodeSize(isTB ? [maxWidth + GAP_X, NH + GAP_Y] : [NH + 32, maxWidth + GAP_Y]);
        tree(root);

        const linkFn = isTB ? tbLink : lrLink;
        gLink.selectAll('path.link')
            .data(root.links(), d => d.target.id)
            .join('path')
            .attr('class', 'link')
            .attr('fill', 'none')
            .attr('stroke', '#94a3b8')
            .attr('stroke-width', 1.5)
            .attr('marker-end', 'url(#modal-dot)')
            .attr('d', linkFn);

        const isDark = document.documentElement.classList.contains('dark');
        const getModalNodeStyle = (node) => {
            const kind = node.data.meta?.kind;
            if (kind === 'target') {
                return isDark
                    ? { fill: 'rgba(59, 130, 246, 0.2)', stroke: '#3b82f6', icon: '#60a5fa', text: '#93c5fd' }
                    : { fill: '#eff6ff', stroke: '#3b82f6', icon: '#3b82f6', text: '#1d4ed8' };
            }
            if (kind === 'dependency') {
                return isDark
                    ? { fill: 'rgba(34, 197, 94, 0.2)', stroke: '#22c55e', icon: '#4ade80', text: '#86efac' }
                    : { fill: '#f0fdf4', stroke: '#22c55e', icon: '#22c55e', text: '#15803d' };
            }
            if (kind === 'dependent') {
                return isDark
                    ? { fill: 'rgba(168, 85, 247, 0.2)', stroke: '#a855f7', icon: '#c084fc', text: '#e9d5ff' }
                    : { fill: '#faf5ff', stroke: '#a855f7', icon: '#a855f7', text: '#7e22ce' };
            }
            return isDark
                ? { fill: 'rgba(148, 163, 184, 0.2)', stroke: '#94a3b8', icon: '#cbd5e1', text: '#f1f5f9' }
                : { fill: '#f8fafc', stroke: '#94a3b8', icon: '#64748b', text: '#334155' };
        };

        const getNodePos = ({ x, y }) => isTB ? `translate(${x},${y})` : `translate(${y},${x})`;

        const nodes = gNode.selectAll('g.node')
            .data(descendants, d => d.id)
            .join('g')
            .attr('class', 'node')
            .attr('cursor', 'pointer')
            .attr('transform', getNodePos);

        nodes.append('rect')
            .attr('class', 'node-rect')
            .attr('x', d => -d.width / 2)
            .attr('y', -NH / 2)
            .attr('width', d => d.width)
            .attr('height', NH)
            .attr('rx', RX)
            .attr('fill', d => getModalNodeStyle(d).fill)
            .attr('stroke', d => getModalNodeStyle(d).stroke)
            .attr('stroke-width', d => d.data.meta?.kind === 'target' ? 2.5 : 1.8);

        nodes.append('g')
            .attr('class', 'node-icon')
            .attr('transform', d => `translate(${-d.width / 2 + 14}, -10)`)
            .append('path')
            .attr('d', ICON)
            .attr('stroke', d => getModalNodeStyle(d).icon)
            .attr('stroke-width', 1.5)
            .attr('stroke-linecap', 'round')
            .attr('stroke-linejoin', 'round')
            .attr('fill', 'none');

        nodes.append('text')
            .attr('class', 'node-text')
            .attr('x', d => -d.width / 2 + 42)
            .attr('y', 1)
            .attr('dy', '0.35em')
            .attr('font-size', 13)
            .attr('font-weight', d => d.data.meta?.kind === 'target' ? 700 : 500)
            .attr('font-family', 'Inter, sans-serif')
            .attr('fill', d => getModalNodeStyle(d).text)
            .text(d => d.data.name);

        const $tip = $('#tip');
        if ($('#tip').length === 0) {
            $('body').append(TEMPLATES.tooltip);
        }

        nodes
            .on('click', (event, node) => {
                event.stopPropagation();
                if (node.data.fullName && node.data.fullName !== this.selectedBeanName) {
                    this.selectBean(node.data.fullName);
                    this.openGraphModal();
                }
            })
            .on('mouseenter', (event, node) => {
                const { name, fullName, meta = {} } = node.data;
                const { type, scope, role, kind } = meta;
                const typeLabel = type ? `Type: ${type.slice(type.lastIndexOf('.') + 1)}` : '';
                const scopeLabel = scope ? `Scope: ${scope}${role ? ` · ${role}` : ''}` : '';
                const kindLabel = kind ? `Role in view: ${kind.toUpperCase()}` : '';

                $('#tip-name').text(fullName || name);
                $('#tip-type').text(typeLabel);
                $('#tip-scope').text(scopeLabel);
                $('#tip-meta').text(kindLabel);
                $tip.addClass('show').css({ left: event.pageX + 14, top: event.pageY - 10 });
            })
            .on('mousemove', (event) => $tip.css({ left: event.pageX + 14, top: event.pageY - 10 }))
            .on('mouseleave', () => $tip.removeClass('show'));

        setTimeout(() => this.fitModalView(), 50);
    }

    fitModalView() {
        if (!this.modalSvg || !this.modalZoom || !this.modalGraphRoot) return;

        const container = $('#modal-graph-container');
        const width = container.width() || 800;
        const height = container.height() || 500;

        const nodes = this.modalGraphRoot.descendants();
        const isTB = this.modalGraphMode === 'tb';

        const minX = d3.min(nodes, d => isTB ? d.x - d.width / 2 : d.y - d.width / 2);
        const maxX = d3.max(nodes, d => isTB ? d.x + d.width / 2 : d.y + d.width / 2);
        const minY = d3.min(nodes, d => isTB ? d.y - NH / 2 : d.x - NH / 2);
        const maxY = d3.max(nodes, d => isTB ? d.y + NH / 2 : d.x + NH / 2);

        const graphWidth = maxX - minX || 1;
        const graphHeight = maxY - minY || 1;

        const scale = Math.min(0.9, Math.min(width / graphWidth, height / graphHeight));
        const translateX = width / 2 - ((minX + maxX) / 2) * scale;
        const translateY = height / 2 - ((minY + maxY) / 2) * scale;

        const transform = d3.zoomIdentity.translate(translateX, translateY).scale(scale);
        this.modalSvg.transition().duration(400).call(this.modalZoom.transform, transform);
    }

    bindModalControls() {
        $('#modal-btn-tb').off('click').on('click', () => {
            this.modalGraphMode = 'tb';
            $('#modal-btn-tb').addClass('bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-white shadow-sm')
                .removeClass('text-gray-500 dark:text-gray-400');
            $('#modal-btn-lr').removeClass('bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-white shadow-sm')
                .addClass('text-gray-500 dark:text-gray-400');

            if (this.modalGraphRoot && this.modalSvg) {
                const gNode = this.modalSvg.select('g.nodes');
                const gLink = this.modalSvg.select('g.links');
                this._drawModalTree(this.modalGraphRoot, gNode, gLink, this.modalSvg, this.modalZoom);
            }
        });

        $('#modal-btn-lr').off('click').on('click', () => {
            this.modalGraphMode = 'lr';
            $('#modal-btn-lr').addClass('bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-white shadow-sm')
                .removeClass('text-gray-500 dark:text-gray-400');
            $('#modal-btn-tb').removeClass('bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-white shadow-sm')
                .addClass('text-gray-500 dark:text-gray-400');

            if (this.modalGraphRoot && this.modalSvg) {
                const gNode = this.modalSvg.select('g.nodes');
                const gLink = this.modalSvg.select('g.links');
                this._drawModalTree(this.modalGraphRoot, gNode, gLink, this.modalSvg, this.modalZoom);
            }
        });

        $('#modal-btn-zoom-in').off('click').on('click', () => {
            if (this.modalSvg && this.modalZoom) {
                this.modalSvg.transition().duration(300).call(this.modalZoom.scaleBy, 1.25);
            }
        });

        $('#modal-btn-zoom-out').off('click').on('click', () => {
            if (this.modalSvg && this.modalZoom) {
                this.modalSvg.transition().duration(300).call(this.modalZoom.scaleBy, 0.8);
            }
        });

        $('#modal-btn-reset, #modal-btn-fit').off('click').on('click', () => {
            this.fitModalView();
        });
    }
}