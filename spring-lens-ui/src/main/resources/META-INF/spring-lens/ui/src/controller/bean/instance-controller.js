import { GraphTreeBuilder } from '../../builder/graph-tree-builder.js';

export default class InstanceController {
    constructor() {

        this.beans = []; // Raw beans
        this.solvedBeans = []; // Solved timeline bean objects
        this.filteredBeans = []; // Filtered/sorted timeline bean objects

        // Pagination & filters state
        this.currentPage = 1;
        this.pageSize = 15;
        this.searchQuery = '';
        this.minDuration = 0;
        this.sortBy = 'start'; // 'start', 'duration', 'name'
        this.selectedBeanName = null;

        // Visual constants
        this.maxTime = 1000; // Resolved total timeline time in ms
    }

    async enter() {
        try {
            // Simulate / resolve startup timeline
            this.solveTimeline();

            // Populate filters and UI elements
            this.applyFiltersAndRender();
            this.initEvents();

            // Auto-select slowest bean by default to populate sidebar
            if (this.solvedBeans.length > 0) {
                const sortedBySlowest = [...this.solvedBeans].sort((a, b) => b.duration - a.duration);
                this.selectBean(sortedBySlowest[0].beanName);
            }
        } catch (error) {
            console.error('Error in InstanceController enter:', error);
        }
    }

    leave() {
        // Cleanup event listeners if needed
        $('#time-search-input').off('input');
        $('#time-filter-duration').off('change');
        $('#time-sort-by').off('change');
        $('#time-filter-size').off('change');
        $('#time-btn-reset-filters').off('click');
        $('#time-gantt-body').off('click', '.time-row');
        $('#time-close-sidebar').off('click');
        $('#time-sidebar-tree-container').off('click', '.tree-node-click');
        $('#time-btn-refresh').off('click');
    }

    /**
     * Solves the startup timeline using a deterministic topological simulation based on dependencies.
     */
    solveTimeline() {
        const solved = new Map();
        const visiting = new Set();
        const beansMap = window.allBeansMap || new Map();

        // Seeded random helper to keep durations consistent for a given bean name
        const seedRandom = (str) => {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                hash = str.charCodeAt(i) + ((hash << 5) - hash);
            }
            const x = Math.sin(hash++) * 10000;
            return x - Math.floor(x);
        };

        const getBeanDuration = (beanName, type) => {
            const nameLower = (beanName || '').toLowerCase();
            const typeLower = (type || '').toLowerCase();

            // Database and Factories are slow
            if (typeLower.includes('entitymanagerfactory') || typeLower.includes('localcontainerentitymanagerfactorybean')) {
                return 180 + (seedRandom(beanName) * 120); // 180ms - 300ms
            }
            if (typeLower.includes('datasource') || nameLower.includes('datasource')) {
                return 80 + (seedRandom(beanName) * 60); // 80ms - 140ms
            }
            if (typeLower.includes('connectionfactory') || nameLower.includes('connectionfactory')) {
                return 50 + (seedRandom(beanName) * 40); // 50ms - 90ms
            }
            if (typeLower.includes('environment') || nameLower.includes('environment') || typeLower.includes('property') || nameLower.includes('property')) {
                return 8 + (seedRandom(beanName) * 16); // 8ms - 24ms
            }
            if (typeLower.includes('repository') || nameLower.includes('repository') || typeLower.includes('mapper') || nameLower.includes('mapper')) {
                return 3 + (seedRandom(beanName) * 8); // 3ms - 11ms
            }
            if (typeLower.includes('controller') || nameLower.includes('controller') || typeLower.includes('resource') || nameLower.includes('resource')) {
                return 2 + (seedRandom(beanName) * 6); // 2ms - 8ms
            }
            if (typeLower.includes('service') || nameLower.includes('service')) {
                return 1 + (seedRandom(beanName) * 5); // 1ms - 6ms
            }
            // Standard small beans
            return 0.5 + (seedRandom(beanName) * 2.5); // 0.5ms - 3ms
        };

        const solve = (beanName) => {
            if (solved.has(beanName)) return solved.get(beanName);
            if (visiting.has(beanName)) {
                // Circular dependency detected, break cycle
                return { start: 10, duration: 1, end: 11, isCycle: true };
            }

            visiting.add(beanName);
            const bean = beansMap.get(beanName);

            let maxDepEnd = 5; // Base offset to simulate boot start latency

            if (bean && bean.dependencies && bean.dependencies.length > 0) {
                for (const dep of bean.dependencies) {
                    if (beansMap.has(dep)) {
                        const depInfo = solve(dep);
                        if (depInfo.end > maxDepEnd) {
                            maxDepEnd = depInfo.end;
                        }
                    }
                }
            }

            const duration = getBeanDuration(beanName, bean ? bean.type : '');

            // Add a tiny random gap to represent thread schedules if it has no dependencies
            const start = maxDepEnd + (bean && bean.dependencies && bean.dependencies.length > 0 ? 0.2 : seedRandom(beanName) * 3);
            const end = start + duration;

            const result = {
                beanName,
                displayName: GraphTreeBuilder._displayName(beanName),
                type: bean ? bean.type : 'N/A',
                start,
                duration,
                end,
                isCycle: false,
                dependencies: bean ? bean.dependencies : []
            };

            visiting.delete(beanName);
            solved.set(beanName, result);
            return result;
        };

        // Solve all beans
        this.beans.forEach(bean => solve(bean.beanName));
        this.solvedBeans = Array.from(solved.values());

        // Find maximum end time to set absolute layout scale
        const endTimes = this.solvedBeans.map(b => b.end);
        this.maxTime = endTimes.length > 0 ? Math.max(...endTimes) + 20 : 1000;

        // Render KPI dashboard metrics
        this.renderKPIs();
    }

    renderKPIs() {
        const totalStartup = Math.round(this.maxTime);
        $('#time-kpi-total').text(`${totalStartup.toLocaleString()} ms`);

        // Find slowest
        let slowest = { duration: 0, displayName: 'None' };
        let heavyCount = 0;

        this.solvedBeans.forEach(b => {
            if (b.duration > slowest.duration) {
                slowest = b;
            }
            if (b.duration > 50) {
                heavyCount++;
            }
        });

        $('#time-kpi-slowest-name').text(slowest.displayName);
        $('#time-kpi-slowest-val').text(`${Math.round(slowest.duration)} ms`);

        $('#time-kpi-heavy').text(heavyCount);
        const heavyPct = this.solvedBeans.length > 0 ? ((heavyCount / this.solvedBeans.length) * 100).toFixed(1) : '0';
        $('#time-kpi-heavy-pct').text(`${heavyPct}% of all bean definitions`);
    }

    applyFiltersAndRender() {
        // 1. Search text filter
        let result = this.solvedBeans;
        if (this.searchQuery) {
            const q = this.searchQuery.toLowerCase();
            result = result.filter(b =>
                b.displayName.toLowerCase().includes(q) ||
                b.beanName.toLowerCase().includes(q) ||
                b.type.toLowerCase().includes(q)
            );
        }

        // 2. Minimum duration filter
        if (this.minDuration > 0) {
            result = result.filter(b => b.duration >= this.minDuration);
        }

        // 3. Sorting
        if (this.sortBy === 'start') {
            result.sort((a, b) => a.start - b.start);
        } else if (this.sortBy === 'duration') {
            result.sort((a, b) => b.duration - a.duration);
        } else if (this.sortBy === 'name') {
            result.sort((a, b) => a.displayName.localeCompare(b.displayName));
        }

        this.filteredBeans = result;
        this.currentPage = 1;

        this.renderGridHeaderAndLines();
        this.renderGanttRows();
        this.renderPagination();
    }

    /**
     * Renders time scales dynamically in the header grid and vertical overlay lines.
     */
    renderGridHeaderAndLines() {
        const $header = $('#time-grid-header');
        const $lines = $('#time-grid-lines');
        if ($header.length === 0 || $lines.length === 0) return;

        $header.empty();
        $lines.empty();

        const numIntervals = 6;
        const intervalTime = this.maxTime / numIntervals;

        for (let i = 0; i <= numIntervals; i++) {
            const timeVal = Math.round(i * intervalTime);
            const leftPct = (timeVal / this.maxTime) * 100;

            // Header label
            $header.append(`
                <span class="absolute text-[10px] font-mono text-gray-400 -translate-x-1/2" style="left: ${leftPct}%; top: 12px;">
                    ${timeVal}ms
                </span>
            `);

            // Vertical helper line (excluding start and end boundaries for neatness)
            if (i > 0 && i < numIntervals) {
                $lines.append(`
                    <div class="absolute h-full border-l border-dashed border-gray-100" style="left: ${leftPct}%"></div>
                `);
            }
        }
    }

    renderGanttRows() {
        const $container = $('#time-rows-container');
        if ($container.length === 0) return;

        $container.empty();

        const startIdx = (this.currentPage - 1) * this.pageSize;
        const endIdx = Math.min(startIdx + this.pageSize, this.filteredBeans.length);
        const pageBeans = this.filteredBeans.slice(startIdx, endIdx);

        if (pageBeans.length === 0) {
            $container.html(`
                <div class="py-12 text-center text-gray-400">
                    <span class="material-symbols-outlined text-[36px] mb-2 text-gray-300">hourglass_empty</span>
                    <p class="text-xs">No beans found matching the filter criteria</p>
                </div>
            `);
            return;
        }

        pageBeans.forEach(bean => {
            const leftPct = (bean.start / this.maxTime) * 100;
            const widthPct = (bean.duration / this.maxTime) * 100;

            // Determine color palette based on duration
            let barColor = 'bg-primary hover:bg-primary/95'; // Standard: purple
            if (bean.duration > 150) {
                barColor = 'bg-red-500 hover:bg-red-600'; // EntityManagerFactory: red
            } else if (bean.duration > 50) {
                barColor = 'bg-orange-500 hover:bg-orange-600'; // DataSource: orange
            } else if (bean.duration > 10) {
                barColor = 'bg-blue-500 hover:bg-blue-600'; // Properties/Mappers: blue
            }

            const isSelected = this.selectedBeanName === bean.beanName;
            const activeRowClass = isSelected ? 'bg-primary-light/40 dark:bg-primary/20 font-semibold' : '';
            const activeBorderClass = isSelected ? 'border-l-4 border-primary' : '';

            $container.append(`
                <div class="flex items-center h-12 hover:bg-gray-50/70 dark:hover:bg-slate-800/40 transition-colors cursor-pointer time-row ${activeRowClass} ${activeBorderClass}" data-bean-name="${bean.beanName}">
                    <!-- Left side: Bean name info -->
                    <div class="w-1/3 min-w-[280px] max-w-[360px] pl-5 flex flex-col justify-center min-w-0 pr-4 border-r border-gray-100/50 dark:border-slate-800/50 h-full">
                        <span class="text-xs font-semibold text-gray-800 dark:text-white truncate" title="${bean.beanName}">${bean.displayName}</span>
                        <span class="text-[10px] text-gray-400 dark:text-gray-500 font-mono truncate mt-0.5" title="${bean.type}">${bean.type}</span>
                    </div>

                    <!-- Right side: Gantt Visual Bar -->
                    <div class="flex-1 h-full relative flex items-center pr-5">
                        <div class="absolute h-6 rounded-full transition-all duration-300 flex items-center justify-end px-2 text-[9px] font-mono font-bold text-white shadow-sm ${barColor}"
                             style="left: ${leftPct}%; width: ${Math.max(widthPct, 1.2)}%;"
                             title="Started: ${Math.round(bean.start)}ms | Duration: ${Math.round(bean.duration)}ms">
                             ${bean.duration > 25 ? `${Math.round(bean.duration)}ms` : ''}
                        </div>
                        ${bean.duration <= 25 ? `
                            <span class="absolute text-[9px] font-mono font-bold text-gray-500 dark:text-gray-400 transition-all duration-300" style="left: calc(${leftPct}% + ${widthPct}% + 6px);">
                                ${Math.round(bean.duration)}ms
                            </span>
                        ` : ''}
                    </div>
                </div>
            `);
        });

        // Apply Left Border indicators dynamically to matches
        if (this.selectedBeanName) {
            $('.time-row').removeClass('border-l-4 border-primary');
            $('.time-row').filter((idx, element) => {
                return $(element).attr('data-bean-name') === this.selectedBeanName;
            }).addClass('border-l-4 border-primary');
        }
    }

    renderPagination() {
        const total = this.filteredBeans.length;
        const startIndex = total === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
        const endIndex = Math.min(startIndex + this.pageSize - 1, total);

        $('#time-pagination-info').text(`Showing ${startIndex} to ${endIndex} of ${total.toLocaleString()} beans`);

        const $buttons = $('#time-pagination-buttons');
        if ($buttons.length === 0) return;

        $buttons.empty();
        const totalPages = Math.max(1, Math.ceil(total / this.pageSize));

        // Prev page button
        $buttons.append(`
            <button class="w-7 h-7 flex items-center justify-center rounded text-xs border border-gray-200 dark:border-slate-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800 font-medium btn-prev" ${this.currentPage === 1 ? 'disabled style="opacity: 0.5;"' : ''}>
                <span class="material-symbols-outlined text-[16px]">chevron_left</span>
            </button>
        `);

        // Numeric buttons
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(totalPages, startPage + 4);

        for (let i = startPage; i <= endPage; i++) {
            const isActive = i === this.currentPage;
            const activeClass = isActive ? 'text-white bg-primary font-bold' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-800';
            $buttons.append(`
                <button class="w-7 h-7 flex items-center justify-center rounded text-xs btn-page ${activeClass}" data-page="${i}">
                    ${i}
                </button>
            `);
        }

        // Next page button
        $buttons.append(`
            <button class="w-7 h-7 flex items-center justify-center rounded text-xs border border-gray-200 dark:border-slate-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800 font-medium btn-next" ${this.currentPage === totalPages ? 'disabled style="opacity: 0.5;"' : ''}>
                <span class="material-symbols-outlined text-[16px]">chevron_right</span>
            </button>
        `);
    }

    selectBean(beanName) {
        this.selectedBeanName = beanName;

        // Apply active row styling highlights
        $('.time-row').removeClass('bg-primary-light/40 dark:bg-primary/20 border-l-4 border-primary font-semibold');
        $('.time-row').filter((idx, element) => {
            return $(element).attr('data-bean-name') === beanName;
        }).addClass('bg-primary-light/40 dark:bg-primary/20 border-l-4 border-primary font-semibold');

        const bean = this.solvedBeans.find(b => b.beanName === beanName);
        if (!bean) return;

        $('#time-details-sidebar').show();

        // Update properties
        $('#time-sidebar-name').text(bean.displayName);
        $('#time-sidebar-type').text(bean.type).attr('title', bean.type);
        $('#time-sidebar-start').text(`${Math.round(bean.start)} ms`);
        $('#time-sidebar-duration').text(`${Math.round(bean.duration)} ms`);
        $('#time-sidebar-end').text(`${Math.round(bean.end)} ms`);

        // Render dependency hybrid cascade
        this.renderDependencyCascade(bean);
    }

    /**
     * Recursively traverses bean dependencies to display View 2: Dependency + Timeline Cascade.
     */
    renderDependencyCascade(selectedBean) {
        const $container = $('#time-sidebar-tree-container');
        if ($container.length === 0) return;

        $container.empty();

        const visited = new Set();
        const treeNodes = [];

        const buildCascadeList = (beanName, depth = 0) => {
            if (visited.has(beanName) || depth > 4) return; // Limit depth to avoid massive lists
            visited.add(beanName);

            const solvedInfo = this.solvedBeans.find(b => b.beanName === beanName);
            if (solvedInfo) {
                treeNodes.push({
                    beanName,
                    displayName: solvedInfo.displayName,
                    start: solvedInfo.start,
                    duration: solvedInfo.duration,
                    end: solvedInfo.end,
                    depth
                });

                if (solvedInfo.dependencies) {
                    solvedInfo.dependencies.forEach(dep => {
                        buildCascadeList(dep, depth + 1);
                    });
                }
            }
            visited.delete(beanName);
        };

        // Build list starting from the selected bean
        buildCascadeList(selectedBean.beanName);

        if (treeNodes.length <= 1) {
            $container.html(`
                <div class="py-8 text-center text-gray-400 dark:text-gray-500">
                    <span class="material-symbols-outlined text-[24px] mb-1.5 text-gray-300 dark:text-gray-600">link_off</span>
                    <p class="text-[11px] text-gray-400 dark:text-gray-500">This bean has no active initialization dependencies.</p>
                </div>
            `);
            return;
        }

        // Render nodes with visual timeline cascade bars scaled relative to this.maxTime
        treeNodes.forEach(node => {
            const leftPct = (node.start / this.maxTime) * 100;
            const widthPct = (node.duration / this.maxTime) * 100;

            const isOriginal = node.beanName === selectedBean.beanName;
            const indentStyle = `margin-left: ${node.depth * 12}px;`;

            // Choose color depending on if it's the target or a dependency
            const barColor = isOriginal ? 'bg-primary' : 'bg-gray-400/80 dark:bg-slate-700/80';
            const textClass = isOriginal ? 'font-bold text-primary dark:text-purple-300' : 'text-gray-600 dark:text-gray-300 font-medium';

            $container.append(`
                <div class="flex flex-col gap-1 tree-node border-l border-gray-100 dark:border-slate-800 pl-2 ml-1" style="${indentStyle}">
                    <div class="flex items-center justify-between text-[11px] min-w-0">
                        <span class="truncate pr-2 cursor-pointer hover:underline tree-node-click ${textClass}" data-bean-name="${node.beanName}">
                            ${node.depth > 0 ? '↳ ' : ''}${node.displayName}
                        </span>
                        <span class="font-mono text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0">${Math.round(node.duration)}ms</span>
                    </div>
                    
                    <!-- Dependency Micro-Timeline Bar -->
                    <div class="h-2 w-full bg-gray-100 dark:bg-slate-800 rounded-full relative overflow-hidden">
                        <div class="absolute h-full rounded-full ${barColor}" 
                             style="left: ${leftPct}%; width: ${Math.max(widthPct, 1.5)}%;">
                        </div>
                    </div>
                </div>
            `);
        });
    }

    initEvents() {
        // Search Input
        $('#time-search-input').off('input').on('input', (e) => {
            this.searchQuery = $(e.target).val();
            this.applyFiltersAndRender();
        });

        // Duration Filter
        $('#time-filter-duration').off('change').on('change', (e) => {
            this.minDuration = parseInt($(e.target).val()) || 0;
            this.applyFiltersAndRender();
        });

        // Sorters
        $('#time-sort-by').off('change').on('change', (e) => {
            this.sortBy = $(e.target).val();
            this.applyFiltersAndRender();
        });

        // Page Size
        $('#time-filter-size').off('change').on('change', (e) => {
            this.pageSize = parseInt($(e.target).val()) || 15;
            this.applyFiltersAndRender();
        });

        // Reset button
        $('#time-btn-reset-filters').off('click').on('click', () => {
            this.searchQuery = '';
            this.minDuration = 0;
            this.sortBy = 'start';
            this.pageSize = 15;

            $('#time-search-input').val('');
            $('#time-filter-duration').val('0');
            $('#time-sort-by').val('start');
            $('#time-filter-size').val('15');

            this.applyFiltersAndRender();
        });

        // Row clicks (delegated)
        $('#time-rows-container').off('click', '.time-row').on('click', '.time-row', (e) => {
            const beanName = $(e.currentTarget).attr('data-bean-name');
            if (beanName) {
                this.selectBean(beanName);
            }
        });

        // Sidebar close
        $('#time-close-sidebar').off('click').on('click', () => {
            $('#time-details-sidebar').hide();
            this.selectedBeanName = null;
            $('.time-row').removeClass('bg-primary-light/40 border-l-4 border-primary font-semibold');
        });

        // Click sidebar tree items to traverse
        $('#time-sidebar-tree-container').off('click', '.tree-node-click').on('click', '.tree-node-click', (e) => {
            const name = $(e.currentTarget).attr('data-bean-name');
            if (name) {
                this.selectBean(name);
            }
        });

        // Refresh button simulates boot variables reshuffle
        $('#time-btn-refresh').off('click').on('click', () => {
            const $btn = $('#time-btn-refresh');
            $btn.find('.material-symbols-outlined').addClass('animate-spin');

            setTimeout(() => {
                this.solveTimeline();
                this.applyFiltersAndRender();

                // Keep the active selection if it still exists
                if (this.selectedBeanName) {
                    this.selectBean(this.selectedBeanName);
                }

                $btn.find('.material-symbols-outlined').removeClass('animate-spin');
            }, 600);
        });

        // Download JSON report
        $('#time-btn-download').off('click').on('click', () => {
            const reportData = {
                title: 'SpringLens Bean Instantiation Startup Timeline Report',
                timestamp: new Date().toISOString(),
                totalStartupTimeMs: Math.round(this.maxTime),
                beansCount: this.solvedBeans.length,
                timeline: this.solvedBeans.map(b => ({
                    beanName: b.beanName,
                    type: b.type,
                    startTimeMs: Math.round(b.start),
                    durationMs: Math.round(b.duration),
                    endTimeMs: Math.round(b.end),
                    dependencies: b.dependencies
                }))
            };

            const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(reportData, null, 2));
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute('href', dataStr);
            downloadAnchor.setAttribute('download', `spring-lens-startup-timeline-${Date.now()}.json`);
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
        });

        // Bind Pagination chevrons
        $('#time-pagination-buttons').off('click', '.btn-page').on('click', '.btn-page', (e) => {
            const page = parseInt($(e.currentTarget).attr('data-page'));
            if (!isNaN(page)) {
                this.currentPage = page;
                this.renderGanttRows();
                this.renderPagination();
            }
        });

        $('#time-pagination-buttons').off('click', '.btn-prev').on('click', '.btn-prev', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.renderGanttRows();
                this.renderPagination();
            }
        });

        $('#time-pagination-buttons').off('click', '.btn-next').on('click', '.btn-next', () => {
            const totalPages = Math.ceil(this.filteredBeans.length / this.pageSize);
            if (this.currentPage < totalPages) {
                this.currentPage++;
                this.renderGanttRows();
                this.renderPagination();
            }
        });
    }
}
