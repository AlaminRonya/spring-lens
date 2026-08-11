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
export default class BeanDefinitionsController {
    // Private State Fields
    _hasFetchedTableData = false;
    _searchDebounceTimer = null;

    constructor(dataLoader) {
        this.dataLoader = dataLoader;

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

        this.selectedBeanName = null;
        this.activeSidebarTab = 'properties'; // 'properties' | 'dependencies' | 'dependents'
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
            this.refreshKeyPerformanceIndicators();
            this.initializeCharts();
            this.bindEvents();

            await this.fetchTableData();

            // Select the first bean as default details if available
            const defaultBean = this.currentPageBeans[0] || this.allBeans[0];
            if (defaultBean) {
                this.selectBean(defaultBean.beanName);
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
        if (this.allBeans.length === 0) return;

        this._updateTotalBeanCountKPI();
        this._updateContextDistributionKPI();
        this._updateLazyInitializationKPI();
    }

    _updateTotalBeanCountKPI() {
        const hasValidPagination = this.paginationState &&
            typeof this.paginationState.totalElements === 'number' &&
            (this.paginationState.totalElements > 0 || this._hasFetchedTableData);

        const totalCount = hasValidPagination
            ? this.paginationState.totalElements
            : this.allBeans.length;

        $('#def-total-count').text(totalCount.toLocaleString());
    }

    _updateContextDistributionKPI() {
        if (!this.allBeans || this.allBeans.length === 0) return;

        const totalBeans = this.allBeans.length;
        const contextCounts = {};

        this.allBeans.forEach(bean => {
            const contextId = bean.contextId || 'unknown';
            contextCounts[contextId] = (contextCounts[contextId] || 0) + 1;
        });

        const sortedContextEntries = Object.entries(contextCounts).sort((a, b) => b[1] - a[1]);
        $('#def-context-count').text(`${sortedContextEntries.length} Total`);

        const themeColors = ['bg-primary', 'bg-blue-500', 'bg-success'];
        const contextListHtml = sortedContextEntries.map(([ctxId, count], index) => {
            const percentage = Math.round((count / totalBeans) * 100);
            const colorClass = themeColors[index] || 'bg-gray-400';
            return TEMPLATES.contextListItem({ ctxId, colorClass, pct: percentage });
        }).join('');

        $('#def-context-list').html(contextListHtml);
    }

    _updateLazyInitializationKPI() {
        if (!this.allBeans || this.allBeans.length === 0) return;

        const totalBeans = this.allBeans.length;
        const lazyBeanCount = this.allBeans.filter(bean => bean.lazyInit).length;
        const lazyPercentage = Math.round((lazyBeanCount / totalBeans) * 100);

        $('#def-lazy-percent').text(`${lazyPercentage}%`);
        $('#def-lazy-bar').css('width', `${lazyPercentage}%`);
    }

    /**
     * Initializes scope and role distribution charts with live computed frequencies.
     */
    initializeCharts() {
        this.destroyCharts();
        if (this.allBeans.length === 0) return;

        // Scope distribution
        this._createDistributionChart(
            'scopeChart',
            'scopeChart',
            '#def-scope-legend',
            bean => capitalize(bean.scope || 'unknown'),
            SCOPE_COLORS,
            '#a855f7'
        );

        // Role distribution
        this._createDistributionChart(
            'roleChart',
            'roleChart',
            '#def-role-legend',
            bean => capitalize((bean.role || 'unknown').replace(/^ROLE_/, '')),
            ROLE_COLORS,
            '#cbd5e1'
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
        const baseUrl = getApiUrl(this.dataLoader?.dataUrl || '/spring-lens/api/beans/definitions');
        const requestUrl = `${baseUrl}?${queryParams.toString()}`;

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

        // Format display values
        const displayName = BeanTreeBuilder._displayName(beanName);
        const cleanRole = role?.replace(/^ROLE_/, '');
        const displayRole = cleanRole ? capitalize(cleanRole) : 'N/A';
        const displayScope = scope ? capitalize(scope) : 'N/A';

        // Style resolutions
        const scopeStyle = SCOPE_STYLES[scope?.toLowerCase()] ?? DEFAULT_SCOPE_STYLE;
        const activeRowClass = this.selectedBeanName === beanName
            ? 'bg-primary-light/40 border-l-2 border-primary font-medium'
            : '';

        return TEMPLATES.dashboardRow({
            activeRowClass,
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
     * Selects a bean, updates UI highlighting, and populates the details sidebar.
     * @param {string} beanName - Unique identifier for the target bean.
     */
    selectBean(beanName) {
        this.selectedBeanName = beanName;

        this._updateRowSelectionStyles(beanName);

        const targetBean = this._findBeanByName(beanName);
        if (!targetBean) return;

        $('#def-details-sidebar').show();

        this._populateSidebarDetails(targetBean);
        this._populateSidebarLists(targetBean);
        this.renderActiveTab();
    }

    _updateRowSelectionStyles(activeBeanName) {
        const activeClass = 'bg-primary-light/40 border-l-2 border-primary font-medium';

        $('.bean-row').each((_, element) => {
            const $row = $(element);
            const isSelected = $row.attr('data-bean-name') === activeBeanName;
            $row.toggleClass(activeClass, isSelected);
        });
    }

    _findBeanByName(beanName) {
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
                if (beanName) this.selectBean(beanName);
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
                this.selectedBeanName = null;
                $('.bean-row').removeClass('bg-primary-light/40 border-l-2 border-primary font-medium');
            },
            'view-graph': () => {
                if (this.selectedBeanName) {
                    window.focusBeanOnNextGraphEnter = this.selectedBeanName;
                    window.location.hash = '#/graph';
                }
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
}