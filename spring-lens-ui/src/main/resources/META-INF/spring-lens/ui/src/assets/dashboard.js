import {requestsData} from './mock-data.js';

export default class Dashboard {
    constructor(dataLoader) {
        this.dataLoader = dataLoader;
        this.chart = null;

        // Listen for theme changes to redraw chart
        document.addEventListener('themechanged', () => {
            if (this.chart) {
                this.renderBreakdownChart();
            }
        });
    }

    /**
     * Entry point for the dashboard view. Loads bean definitions, updates metric cards,
     * renders requests tables/charts, and binds control actions.
     */
    async enter() {
        let totalBeans = 0;
        let totalDeps = 0;
        let startupTime = 0;

        try {
            const root = await this.dataLoader.load();
            if (root) {
                const allBeans = window.allBeansMap ? Array.from(window.allBeansMap.values()) : [];
                totalBeans = allBeans.length;

                // Calculate total dependencies in a single pass
                for (let i = 0; i < totalBeans; i++) {
                    totalDeps += allBeans[i].dependencies?.length ?? 0;
                }

                startupTime = this.calculateStartupTime(allBeans);
            }
        } catch (error) {
            console.error("Error loading bean definitions for dashboard:", error);
        }

        // Calculate latency metrics
        const requestCount = requestsData.length;
        let totalLatency = 0;

        for (let i = 0; i < requestCount; i++) {
            totalLatency += parseInt(requestsData[i].time, 10) || 0;
        }

        const averageLatency = requestCount > 0 ? Math.round(totalLatency / requestCount) : 0;

        // Batch update dashboard metric cards
        $('#db-beans-count').text(totalBeans || '-');
        $('#db-deps-count').text(totalDeps || '-');
        $('#db-requests-count').text(requestCount);
        $('#db-startup-time').text(`${Math.round(startupTime).toLocaleString()} ms`);
        $('#db-avg-time').text(`${averageLatency} ms`);

        // Render components
        this.renderRecentRequests();
        this.renderBreakdownChart();

        // Bind refresh button action
        this._bindRefreshButton();
    }

    /**
     * Handles the dashboard refresh button click with UI spinner animation.
     * @private
     */
    _bindRefreshButton() {
        $('#btn-refresh-dashboard').off('click').on('click', (event) => {
            const $spinnerIcon = $(event.currentTarget).find('span');
            $spinnerIcon.addClass('animate-spin');

            setTimeout(async () => {
                await this.enter();
                $spinnerIcon.removeClass('animate-spin');
            }, 600);
        });
    }

    leave() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
    }

    /**
     * Renders the recent HTTP requests table view for the top 5 records.
     */
    renderRecentRequests() {
        const $tbody = $('#db-recent-requests');
        if (!$tbody.length) return;

        const recentRequests = requestsData.slice(0, 5);
        if (!recentRequests.length) {
            $tbody.html(`
            <tr>
                <td colspan="6" class="px-6 py-4 text-center text-xs text-gray-400">
                    No recent requests available.
                </td>
            </tr>
        `);
            return;
        }

        const rowsHtml = recentRequests
            .map(request => this._generateRequestRowHtml(request))
            .join('');

        $tbody.html(rowsHtml);
    }

    /**
     * Generates the HTML template string for a single request row.
     * @private
     * @param {Object} request - The request data object.
     * @returns {string} Compiled HTML string.
     */
    _generateRequestRowHtml(request) {
        const { method, url, status, time, ip, timestamp } = request;

        const methodColor = this._resolveMethodBadgeStyle(method);
        const statusColor = this._resolveStatusBadgeStyle(status);

        return `
        <tr class="hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors border-b border-gray-100 dark:border-slate-800">
            <td class="px-6 py-3.5">
                <span class="px-2 py-0.5 rounded text-[10px] font-bold border ${methodColor}">${method}</span>
            </td>
            <td class="px-6 py-3.5 font-mono text-xs text-gray-700 dark:text-gray-300 truncate max-w-[200px]" title="${url}">${url}</td>
            <td class="px-6 py-3.5">
                <span class="px-2 py-0.5 rounded text-[10px] font-bold border ${statusColor}">${status}</span>
            </td>
            <td class="px-6 py-3.5 text-xs text-gray-600 dark:text-gray-400">${time}</td>
            <td class="px-6 py-3.5 font-mono text-[11px] text-gray-500 dark:text-gray-400">${ip}</td>
            <td class="px-6 py-3.5 text-xs text-gray-600 dark:text-gray-400">${timestamp}</td>
        </tr>
    `;
    }

    /**
     * Resolves color classes for HTTP request methods via dictionary lookup.
     * @private
     */
    _resolveMethodBadgeStyle(method) {
        const methodStyleMap = {
            get: 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-900/30',
            post: 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border-green-100 dark:border-green-900/30',
            put: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-100 dark:border-amber-900/30',
            delete: 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-300 border-red-200 dark:border-red-900/30'
        };

        const methodKey = method?.toLowerCase();
        return methodStyleMap[methodKey] ?? methodStyleMap.delete;
    }

    /**
     * Resolves color classes for HTTP response status codes.
     * @private
     */
    _resolveStatusBadgeStyle(status) {
        const statusCode = parseInt(status, 10) || 200;

        if (statusCode >= 500) {
            return 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/35';
        }
        if (statusCode >= 400) {
            return 'bg-amber-50 dark:bg-amber-950/20 text-warning dark:text-warning border-warning/15 dark:border-warning/30';
        }
        return 'bg-success-light dark:bg-success/10 text-success dark:text-success border-success/15 dark:border-success/30';
    }

    /**
     * Renders the HTTP requests status breakdown chart.
     */
    renderBreakdownChart() {
        const canvas = document.getElementById('dbRequestChart');
        if (!canvas) return;

        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }

        const { success, clientError, serverError } = this._calculateRequestBreakdown();
        const { borderColor, labelColor } = this._resolveChartThemeColors();

        this.chart = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: ['Success (2xx)', 'Client Error (4xx)', 'Server Error (5xx)'],
                datasets: [{
                    data: [success, clientError, serverError],
                    backgroundColor: ['#22c55e', '#f59e0b', '#ef4444'],
                    borderColor,
                    borderWidth: 2,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            boxWidth: 8,
                            padding: 12,
                            color: labelColor,
                            font: {
                                family: 'Inter',
                                size: 10,
                                weight: '500'
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Computes status code frequencies from request data in a single pass.
     * @private
     */
    _calculateRequestBreakdown() {
        let success = 0;
        let clientError = 0;
        let serverError = 0;

        const totalRequests = requestsData.length;
        for (let i = 0; i < totalRequests; i++) {
            const statusCode = parseInt(requestsData[i].status, 10) || 200;

            if (statusCode >= 500) {
                serverError++;
            } else if (statusCode >= 400) {
                clientError++;
            } else {
                success++;
            }
        }

        return { success, clientError, serverError };
    }

    /**
     * Resolves chart palette colors based on active theme mode.
     * @private
     */
    _resolveChartThemeColors() {
        const isDark = document.documentElement.classList.contains('dark');
        return {
            borderColor: isDark ? '#1e293b' : '#ffffff',
            labelColor: isDark ? '#94a3b8' : '#64748b'
        };
    }

    /**
     * Computes the total startup duration for a set of beans by resolving their dependency DAGs.
     * @param {Array<Object>} beans - Collection of bean definitions.
     * @returns {number} Estimated total startup time in milliseconds.
     */
    calculateStartupTime(beans) {
        if (!beans?.length) return 0;

        const resolvedBeans = new Map();
        const visitedNodes = new Set();
        const globalBeansMap = window.allBeansMap ?? new Map();

        const computeStringHash = (inputString) => {
            let hash = 0;
            const length = inputString.length;
            for (let i = 0; i < length; i++) {
                hash = inputString.charCodeAt(i) + ((hash << 5) - hash);
            }
            const pseudoRandomValue = Math.sin(hash) * 10000;
            return pseudoRandomValue - Math.floor(pseudoRandomValue);
        };

        const estimateBeanDuration = this._estimateBeanDuration(computeStringHash);
        const resolveDependencyGraph = this._resolveDependencyGraph(
            resolvedBeans,
            visitedNodes,
            globalBeansMap,
            estimateBeanDuration,
            computeStringHash
        );

        let maxTotalEndTime = 0;
        const beanCount = beans.length;

        for (let i = 0; i < beanCount; i++) {
            const beanName = beans[i].beanName;
            if (beanName) {
                const timing = resolveDependencyGraph(beanName);
                if (timing.end > maxTotalEndTime) {
                    maxTotalEndTime = timing.end;
                }
            }
        }

        return maxTotalEndTime > 0 ? maxTotalEndTime + 20 : 0;
    }

    _resolveDependencyGraph(resolvedBeans, visitedNodes, globalBeansMap, estimateBeanDuration, computeStringHash) {
        const resolveDependencyGraph = (beanName) => {
            // 1. Memoization check
            const cachedResult = resolvedBeans.get(beanName);
            if (cachedResult) return cachedResult;

            // 2. Cycle detection fallback
            if (visitedNodes.has(beanName)) return {end: 11};

            visitedNodes.add(beanName);

            const beanDefinition = globalBeansMap.get(beanName);
            const dependencies = beanDefinition?.dependencies;
            const depCount = dependencies?.length ?? 0;

            let maxDependencyEndTime = 5;

            // 3. Optimized dependency resolution loop
            for (let i = 0; i < depCount; i++) {
                const dependencyName = dependencies[i];
                if (globalBeansMap.has(dependencyName)) {
                    const {end} = resolveDependencyGraph(dependencyName);
                    if (end > maxDependencyEndTime) {
                        maxDependencyEndTime = end;
                    }
                }
            }

            // 4. Timing calculations
            const duration = estimateBeanDuration(beanName, beanDefinition?.type);
            const startDelay = depCount > 0 ? 0.2 : computeStringHash(beanName) * 3;
            const timingResult = {end: maxDependencyEndTime + startDelay + duration};

            // 5. Cleanup and cache
            visitedNodes.delete(beanName);
            resolvedBeans.set(beanName, timingResult);

            return timingResult;
        };
        return resolveDependencyGraph;
    }

    _estimateBeanDuration(computeStringHash) {
        const DURATION_RULES = [
            {
                matches: (type, name) => type.includes('entitymanagerfactory') || type.includes('localcontainerentitymanagerfactorybean'),
                base: 180,
                multiplier: 120
            },
            {
                matches: (type, name) => type.includes('datasource') || name.includes('datasource'),
                base: 80,
                multiplier: 60
            },
            {
                matches: (type, name) => type.includes('connectionfactory') || name.includes('connectionfactory'),
                base: 50,
                multiplier: 40
            },
            {
                matches: (type, name) => type.includes('environment') || name.includes('environment') || type.includes('property') || name.includes('property'),
                base: 8,
                multiplier: 16
            }
        ];

        return (beanName = '', beanType = '') => {
            const hash = computeStringHash(beanName);
            const nameLower = beanName.toLowerCase();
            const typeLower = beanType.toLowerCase();

            const matchedRule = DURATION_RULES.find(rule => rule.matches(typeLower, nameLower));

            if (matchedRule) {
                return matchedRule.base + (hash * matchedRule.multiplier);
            }

            return 0.5 + (hash * 2.5);
        };
    }
}
