import httpClient from './http-client.js';
import { BeanGraphTreeBuilder } from "./bean-graph-tree-builder.js";
import beanDataStore from './bean-data-store.js';
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

    constructor(beanDefinitionsEndpoint, beanDefinitionSummaryEndpoint) {
        this.beanDefinitionEndpoint = beanDefinitionsEndpoint;
        this.beanDefinitionSummaryEndpoint = beanDefinitionSummaryEndpoint;

        this.activeCharts = {
            scopeChart: null,
            roleChart: null
        };

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
     * Initializes the view by loading the overall bean dataset, setting up filters,
     * building charts, fetching paginated table data, and binding event handlers.
     */
    async enter() {
        try {
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
     * Fetches summary distribution metrics from the summary API endpoint (/summary).
     */
    async fetchSummaryData() {
        try {
            let beanSummary = await httpClient.get(this.beanDefinitionSummaryEndpoint);
            this.refreshBeanSummaryStatistics(beanSummary);
            this.initializeScopeAndRoleDistributionCharts(beanSummary);
        } catch (error) {
            console.error('Error fetching bean summary metrics:', error);
        }
    }

    /**
     * Computes and updates metrics cards (total counts, context distributions, lazy percentage).
     */
    refreshBeanSummaryStatistics(beanSummaryData) {
        const { contextDistribution, scopeDistribution, loadingModeDistribution, totalBeanDefinitions } = beanSummaryData;
        this._updateTotalBeanCount(totalBeanDefinitions);
        this._updateContextDistribution(contextDistribution, totalBeanDefinitions);
        this._updateScopeDistribution(scopeDistribution, loadingModeDistribution, totalBeanDefinitions);
    }

    _updateTotalBeanCount(totalBeanDefinitions) {
        $('#def-total-count').text(totalBeanDefinitions);
    }

    _updateContextDistribution(contextDistribution, totalBeanDefinitions) {
        const themeColors = ['bg-primary', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-indigo-500', 'bg-purple-500', 'bg-rose-500', 'bg-teal-500'];
        if (contextDistribution) {
            const contextListHtml = Object.entries(contextDistribution).map(([contextId, count], index) => {
                const percentage = Math.round((count / totalBeanDefinitions) * 100);
                const colorClass = themeColors[index % themeColors.length];
                return TEMPLATES.contextListItem({ contextId, colorClass, pct: percentage, count });
            }).join('');

            $('#def-context-list').html(contextListHtml);
        }
    }

    _updateScopeDistribution(scopeDistribution, loadingModeDistribution, totalBeanDefinitions) {
        if (loadingModeDistribution) {
            const lazyBeanCount = loadingModeDistribution.LAZY || 0;
            const lazyPercentage = Math.round((lazyBeanCount / totalBeanDefinitions) * 100);

            $('#def-lazy-percent').text(`${lazyPercentage}%`);
            $('#def-lazy-bar').css('width', `${lazyPercentage}%`);
        }
    }

    initializeScopeAndRoleDistributionCharts(beanSummary) {
        this.destroyCharts();
        const  {scopeDistribution, roleDistribution} = beanSummary;

        if (scopeDistribution) {
            this._createChartFromDistribution(
                'scopeChart',
                'scopeChart',
                '#def-scope-legend',
                scopeDistribution,
                key => capitalize(key),
                SCOPE_COLORS,
                '#a855f7'
            );
        }

        if (roleDistribution) {
            this._createChartFromDistribution(
                'roleChart',
                'roleChart',
                '#def-role-legend',
                roleDistribution,
                key => capitalize(key.replace(/^ROLE_/, '')),
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

        const chartTitles = Object.keys(itemFrequencies);
        const chartData = Object.values(itemFrequencies);
        const segmentColors = chartTitles.map(label => colorMap[label] || fallbackColor);

        const legendHtml = chartTitles.map((label, index) => {
            const count = chartData[index];
            const pctStr = formatPercentage(count, totalCount);
            const color = segmentColors[index];
            return TEMPLATES.chartLegendItem({ color, lbl: label, count, pctStr });
        }).join('');

        $(legendContainerId).html(legendHtml);

        this.activeCharts[chartKey] = this._instantiateDoughnutChart(
            canvasId,
            chartTitles,
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

    /**
     * Fetches paginated bean definitions from backend API using active filters and pagination state.
     */
    async fetchTableData() {
        this._loadingBeanDefinitionTable();

        const queryParams = this._buildApiQueryParams();

        try {
            const beanData = await httpClient.getWithQuery(
                this.beanDefinitionEndpoint,
                queryParams.toString()
            );

            this._hasFetchedTableData = true;
            this._uniqueContextIdDropdown(beanData)
            this._processPaginatedResponse(beanData);
            this.renderTable();
            this.renderPagination();
            this.updateSortHeaderIcons();
        } catch (error) {
            console.error('Error fetching bean definitions table data:', error);
            this.renderTableError(error.message);
        }
    }

    _uniqueContextIdDropdown(beanData) {
        const $contextDropdown = $('#bean-definition-filter-context');
        const uniqueContexts = new Set();

        Object.entries(beanData.content).forEach(([key, value]) => {
            uniqueContexts.add(value.contextId);
        })

        if ($contextDropdown.length > 0) {
            this._populateSelectDropdown(
                $contextDropdown,
                uniqueContexts,
                'Context: All',
                contextId => contextId
            );
            $contextDropdown.val(this.filterCriteria.contextId);
        }
    }

    _populateSelectDropdown($selectElement, optionsSet, defaultLabel, labelFormatter) {
        $selectElement.html(`<option value="">${defaultLabel}</option>`);
        Array.from(optionsSet).sort().forEach(value => {
            $selectElement.append(`<option value="${value}">${labelFormatter(value)}</option>`);
        });
    }

    _loadingBeanDefinitionTable() {
        const $tbody = $('#beanDefinitionTableBody');
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
            primary: this.filterCriteria.primary,
            lazyInit: this.filterCriteria.lazyInit,
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


    _processPaginatedResponse(responseData) {
        const isPaginatedPayload = Array.isArray(responseData?.content);

        if (isPaginatedPayload) {
            this._applyPaginatedPayload(responseData);
        } else {
            this._resetPaginationState();
        }

        this.currentPage = this.paginationState.pageNumber + 1;
        this.itemsPerPage = this.paginationState.pageSize;
    }

    _applyPaginatedPayload(responseData) {
        const { content, totalElements, totalPages, pageNumber, pageSize, first, last } = responseData;
        const computedTotalPages = totalPages ?? 1;
        const computedPageNumber = pageNumber ?? 0;

        this.currentPageBeans = content || [];
        beanDataStore.addBeans(this.currentPageBeans);

        this.paginationState = {
            totalElements: totalElements ?? this.currentPageBeans.length,
            totalPages: computedTotalPages,
            pageNumber: computedPageNumber,
            pageSize: pageSize ?? this.itemsPerPage,
            isFirstPage: first ?? (computedPageNumber === 0),
            isLastPage: last ?? (computedPageNumber >= computedTotalPages - 1)
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

    /**
     * Renders the bean definitions list table for the current page.
     */
    renderTable() {
        const $tbody = $('#beanDefinitionTableBody');
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

    _generateTableRowHtml(beanInformation) {
        const { beanName, role, scope, type, primary, lazyInit, contextId } = beanInformation;
        const uniqueBeanId = this._generateBeanUniqueId(contextId, beanName);

        // Format display values
        const cleanRole = role?.replace(/^ROLE_/, '');
        const displayRole = cleanRole ? capitalize(cleanRole) : 'N/A';
        const displayScope = scope ? capitalize(scope) : 'N/A';

        // Style resolutions
        const scopeStyle = SCOPE_STYLES[scope?.toLowerCase()] ?? DEFAULT_SCOPE_STYLE;
        const isSelected = this.selectedBeanId === uniqueBeanId;
        const activeRowClass = isSelected
            ? 'bg-primary-light/40 border-l-2 border-primary font-medium'
            : '';

        return TEMPLATES.beanDefinitionTable({
            activeRowClass,
            uniqueBeanId,
            beanName,
            type,
            contextId,
            color: this.getBeanColor(beanInformation),
            icon: this.getBeanIcon(beanInformation),
            scopeStyle,
            displayScope,
            displayRole,
            primaryIcon: primary ? TEMPLATES.checkCircle : TEMPLATES.uncheckedCircle,
            lazyIcon: lazyInit ? TEMPLATES.checkCircle : TEMPLATES.uncheckedCircle
        });
    }

    _generateBeanUniqueId(contextIdOrBean, beanName) {
        return `${contextIdOrBean}:${beanName}`;
    }

    /**
     * Renders dynamic pagination navigation controls driven by pagination metadata.
     */
    renderPagination() {
        const $paginationContainer = $('#bean-definition-pagination-buttons');
        if (!$paginationContainer.length) return;

        const { totalElements, totalPages, pageNumber, pageSize, isFirstPage, isLastPage } = this.paginationState;

        this._updatePaginationInfoText(totalElements, pageNumber, pageSize);

        const currentPage = pageNumber + 1;
        const maxPages = Math.max(1, totalPages);
        const pageRange = this._calculatePaginationRange(currentPage, maxPages);

        const paginationButtonsHtml = [
            TEMPLATES.paginationPrevBtn({ isDisabled: isFirstPage }),
            ...pageRange.map(page => this._renderPaginationButton(page, currentPage)),
            TEMPLATES.paginationNextBtn({ isDisabled: isLastPage })
        ].join('');

        $paginationContainer.html(paginationButtonsHtml);
    }

    _updatePaginationInfoText(totalElements, pageNumber, pageSize) {
        const $paginationInfoContainer = $('#bean-definition-pagination-info');

        if (totalElements === 0) {
            $paginationInfoContainer.text('No beans found');
            return;
        }

        const startIndex = (pageNumber * pageSize) + 1;
        const endIndex = Math.min((pageNumber + 1) * pageSize, totalElements);
        const infoText = `Showing ${startIndex} to ${endIndex} of ${totalElements.toLocaleString()} beans`;

        $paginationInfoContainer.text(infoText);
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

    _calculatePaginationRange(currentPage, totalPages, delta = 2) {
        if (totalPages <= 1) return [1];

        const left = Math.max(2, currentPage - delta);
        const right = Math.min(totalPages - 1, currentPage + delta);

        const range = [1];

        if (left > 2 ) range.push("...");
        for (let i = left; i <= right; i++) {
            range.push(i);
        }
        if (right < totalPages - 1) range.push('...');

        range.push(totalPages);
        return range;
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
        $('#bean-definition-search-input').off('input').on('input', (e) => {
            clearTimeout(this._searchDebounceTimer);
            this.searchQuery = e.target.value.trim();
            this.currentPage = 1;

            this._searchDebounceTimer = setTimeout(() => this.fetchTableData(), 300);
        });
    }

    _bindFilterChangeEvents() {
        const filterKeyMap = {
            '#bean-definition-filter-context'   : 'contextId',
            '#bean-definition-filter-scope'     : 'scope',
            '#bean-definition-filter-role'      : 'role',
            '#bean-definition-filter-primary'   : 'primary',
            '#bean-definition-filter-lazy'      : 'lazyInit'
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
        $('#bean-definition-filter-size').off('change').on('change', (e) => {
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
                    await this.enter();
                } catch (err) {
                    console.error('Error refreshing bean definitions:', err);
                } finally {
                    setTimeout(() => $icon.removeClass('animate-spin'), 500);
                }
            },
            'reset-filters': () => {
                this._resetFilterState();
                this._uniqueContextIdDropdown();
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
                if (dependencyName && beanDataStore.has(dependencyName)) {
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


    getBeanIcon(bean) {
        return resolveBeanMetadata(bean).icon;
    }

    getBeanColor(bean) {
        return resolveBeanMetadata(bean).color;
    }

    selectBean(beanName, contextId = null) {
        const beanId = this._generateBeanUniqueId(contextId, beanName);
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
        return this.currentPageBeans?.find(bean => this._generateBeanUniqueId(bean) === beanId)
            ?? beanDataStore.findBeanById(beanId)
            ?? this.allBeans?.find(bean => this._generateBeanUniqueId(bean) === beanId);
    }

    _findBeanByName(beanName, contextId = null) {
        return beanDataStore.findBeanByName(beanName, contextId)
            ?? this.currentPageBeans?.find(bean => bean.beanName === beanName)
            ?? this.allBeans?.find(bean => bean.beanName === beanName);
    }

    _populateSidebarDetails(beanInformation) {
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
        } = beanInformation;

        const displayName = beanName;
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

        this._updateSidebarIcon(beanInformation);
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
        const displayName = BeanGraphTreeBuilder._displayName(dependencyName);
        const categoryColor = this._resolveDependencyCategoryColor(dependencyName);

        return TEMPLATES.sidebarListItem({
            depName: dependencyName,
            dispName: displayName,
            catColor: categoryColor
        });
    }

    _resolveDependencyCategoryColor(dependencyName) {
        const dependencyRecord = beanDataStore.getBean(dependencyName);
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
        const $beanGraphModalContainer = $("#bean-dependency-graph-modal");
        const $beanNameModalGraphContainer = $('#modal-graph-bean-name');
        const $modalCard = $('#modal-graph-card');

        if (!this.selectedBeanName) return;

        const targetBean = this._findBeanById(this.selectedBeanId) || this._findBeanByName(this.selectedBeanName, this.selectedContextId);
        if (!targetBean) return;

        $beanNameModalGraphContainer.text(targetBean.beanName);
        
        $beanGraphModalContainer.removeClass('hidden');
        requestAnimationFrame(() => {
            $beanGraphModalContainer.removeClass('opacity-0 pointer-events-none').addClass('opacity-100');
            $modalCard.removeClass('scale-95 opacity-0').addClass('scale-100 opacity-100');
        });

        $(document).off('keydown.graphModal').on('keydown.graphModal', (e) => {
            if (e.key === 'Escape') this.closeGraphModal();
        });

        $beanGraphModalContainer.off('click.backdrop').on('click.backdrop', (e) => {
            if (e.target.id === 'bean-dependency-graph-modal' || e.target.id === 'def-graph-modal') this.closeGraphModal();
        });

        $('#btn-close-graph-modal').off('click.closeModal').on('click.closeModal', () => {
            this.closeGraphModal();
        });

        this.renderModalGraph(targetBean);
    }

    closeGraphModal() {
        const $beanGraphModalContainer = $("#bean-dependency-graph-modal");
        const $modalCard = $('#modal-graph-card');

        $beanGraphModalContainer.removeClass('opacity-100').addClass('opacity-0 pointer-events-none');
        $modalCard.removeClass('scale-100 opacity-100').addClass('scale-95 opacity-0');

        $(document).off('keydown.graphModal');
        const $tip = $('#tip');
        if ($tip.length > 0) $tip.removeClass('show');

        setTimeout(() => {
            $beanGraphModalContainer.addClass('hidden');
        }, 250);
    }

    _buildModalGraphHierarchy(targetBean) {
        const displayName = targetBean.beanName;
        const children = [];

        // 1. Dependencies (Beans targetBean depends on)
        const deps = targetBean.dependencies || [];
        if (deps.length > 0) {
            deps.forEach(depName => {
                const depBean = beanDataStore.getBean(depName);
                children.push({
                    name: BeanGraphTreeBuilder._displayName(depName),
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
                const depBean = beanDataStore.getBean(depName);
                children.push({
                    name: BeanGraphTreeBuilder._displayName(depName),
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
}