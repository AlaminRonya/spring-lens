import { requestsData } from './mock-data.js';

export default class Dashboard {
    constructor(dataLoader) {
        this.dataLoader = dataLoader;
        this.chart = null;
    }

    async enter() {
        let totalBeans = 0;
        let totalDeps = 0;

        let startupTime = 0;
        try {
            const root = await this.dataLoader.load();
            if (root) {
                const allBeans = Array.from(window.allBeansMap?.values() || []);
                totalBeans = allBeans.length;
                totalDeps = allBeans.reduce((sum, { dependencies = [] }) => sum + dependencies.length, 0);
                
                // Calculate simulated startup timeline duration
                startupTime = this.calculateStartupTime(allBeans);
            }
        } catch (e) {
            console.error("Error loading bean definitions for dashboard:", e);
        }

        // Set counts and metrics
        $('#db-beans-count').text(totalBeans || '-');
        $('#db-deps-count').text(totalDeps || '-');
        $('#db-requests-count').text(requestsData.length);
        $('#db-startup-time').text(`${Math.round(startupTime).toLocaleString()} ms`);

        // Latency
        const times = requestsData.map(r => parseInt(r.time) || 0);
        const avgTime = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
        $('#db-avg-time').text(`${avgTime} ms`);

        // Recent Requests
        this.renderRecentRequests();

        // Render Chart
        this.renderBreakdownChart();

        // Register refresh button action
        $('#btn-refresh-dashboard').off('click').on('click', (e) => {
            const $icon = $(e.currentTarget).find('span');
            $icon.addClass('animate-spin');
            setTimeout(() => {
                this.enter();
                $icon.removeClass('animate-spin');
            }, 600);
        });
    }

    leave() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
    }

    renderRecentRequests() {
        const $tbody = $('#db-recent-requests');
        if (!$tbody.length) return;
        $tbody.empty();

        const recent = requestsData.slice(0, 5);
        recent.forEach(req => {
            const methodClass = req.method.toLowerCase();
            const methodColor = methodClass === 'get' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                methodClass === 'post' ? 'bg-green-50 text-green-700 border-green-100' :
                                methodClass === 'put' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                'bg-red-50 text-red-600 border-red-200';

            const statusVal = parseInt(req.status) || 200;
            const statusColor = statusVal >= 500 ? 'bg-red-50 text-red-600 border-red-200' :
                                statusVal >= 400 ? 'bg-amber-50 text-warning border-warning/15' :
                                'bg-success-light text-success border-success/15';

            const rowHtml = `
                <tr class="hover:bg-gray-50 transition-colors">
                    <td class="px-6 py-3.5">
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold border ${methodColor}">${req.method}</span>
                    </td>
                    <td class="px-6 py-3.5 font-mono text-xs text-gray-700 truncate max-w-[200px]" title="${req.url}">${req.url}</td>
                    <td class="px-6 py-3.5">
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold border ${statusColor}">${req.status}</span>
                    </td>
                    <td class="px-6 py-3.5 text-xs text-gray-600">${req.time}</td>
                    <td class="px-6 py-3.5 font-mono text-[11px] text-gray-500">${req.ip}</td>
                    <td class="px-6 py-3.5 text-xs text-gray-600">${req.timestamp}</td>
                </tr>
            `;
            $tbody.append(rowHtml);
        });
    }

    renderBreakdownChart() {
        const canvas = document.getElementById('dbRequestChart');
        if (!canvas) return;

        if (this.chart) {
            this.chart.destroy();
        }

        // Calculate breakdown
        let success = 0;
        let clientErr = 0;
        let serverErr = 0;

        requestsData.forEach(r => {
            const status = parseInt(r.status) || 200;
            if (status >= 500) serverErr++;
            else if (status >= 400) clientErr++;
            else success++;
        });

        const ctx = canvas.getContext('2d');
        this.chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Success (2xx)', 'Client Error (4xx)', 'Server Error (5xx)'],
                datasets: [{
                    data: [success, clientErr, serverErr],
                    backgroundColor: ['#22c55e', '#f59e0b', '#ef4444'],
                    borderColor: '#ffffff',
                    borderWidth: 2,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            boxWidth: 8,
                            padding: 12,
                            font: {
                                family: 'Inter',
                                size: 10,
                                weight: '500'
                            },
                            color: '#64748b'
                        }
                    }
                },
                cutout: '70%'
            }
        });
    }

    calculateStartupTime(beans) {
        const solved = new Map();
        const visiting = new Set();
        const beansMap = window.allBeansMap || new Map();

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
            if (typeLower.includes('entitymanagerfactory') || typeLower.includes('localcontainerentitymanagerfactorybean')) {
                return 180 + (seedRandom(beanName) * 120);
            }
            if (typeLower.includes('datasource') || nameLower.includes('datasource')) {
                return 80 + (seedRandom(beanName) * 60);
            }
            if (typeLower.includes('connectionfactory') || nameLower.includes('connectionfactory')) {
                return 50 + (seedRandom(beanName) * 40);
            }
            if (typeLower.includes('environment') || nameLower.includes('environment') || typeLower.includes('property') || nameLower.includes('property')) {
                return 8 + (seedRandom(beanName) * 16);
            }
            return 0.5 + (seedRandom(beanName) * 2.5);
        };

        const solve = (beanName) => {
            if (solved.has(beanName)) return solved.get(beanName);
            if (visiting.has(beanName)) return { end: 11 };

            visiting.add(beanName);
            const bean = beansMap.get(beanName);
            let maxDepEnd = 5;

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
            const start = maxDepEnd + (bean && bean.dependencies && bean.dependencies.length > 0 ? 0.2 : seedRandom(beanName) * 3);
            const end = start + duration;

            const result = { end };
            visiting.delete(beanName);
            solved.set(beanName, result);
            return result;
        };

        beans.forEach(bean => solve(bean.beanName));
        const endTimes = Array.from(solved.values()).map(b => b.end);
        return endTimes.length > 0 ? Math.max(...endTimes) + 20 : 0;
    }
}
