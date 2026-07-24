import { requestsData } from './mock-data.js';

export default class RequestEndpoints {
    constructor() {
        this.initEvents();
    }

    enter() {
        this.renderEndpointsTable();
    }

    leave() {
        // Cleanup if any
    }

    renderEndpointsTable() {
        const $tbody = $('#endpointTableBody');
        if (!$tbody.length) return;
        $tbody.empty();

        const searchVal = $('#endpoint-search').val()?.toLowerCase().trim();

        // Aggregate endpoints
        const endpointsMap = new Map();

        requestsData.forEach(req => {
            const urlPath = req.url.split('?')[0];
            // Normalize path (replace numeric IDs with {id})
            const normalizedPath = urlPath.split('/').map(part => {
                return /^\d+$/.test(part) ? '{id}' : part;
            }).join('/');

            const key = `${req.method}:${normalizedPath}`;
            const timeVal = parseInt(req.time) || 0;

            if (!endpointsMap.has(key)) {
                endpointsMap.set(key, {
                    method: req.method,
                    path: normalizedPath,
                    hits: 0,
                    totalTime: 0,
                    maxTime: 0,
                    service: req.service
                });
            }

            const data = endpointsMap.get(key);
            data.hits++;
            data.totalTime += timeVal;
            data.maxTime = Math.max(data.maxTime, timeVal);
        });

        // Convert map to array
        const list = Array.from(endpointsMap.values());

        // Filter list
        const filtered = list.filter(ep => {
            return !searchVal || ep.path.toLowerCase().includes(searchVal) || ep.service.toLowerCase().includes(searchVal);
        });

        // KPI calculations
        $('#ep-routes-count').text(list.length);

        // Find most active route
        let mostActive = null;
        let slowest = null;

        list.forEach(ep => {
            if (!mostActive || ep.hits > mostActive.hits) {
                mostActive = ep;
            }
            const avgTime = ep.hits ? Math.round(ep.totalTime / ep.hits) : 0;
            ep.avgTime = avgTime;
            if (!slowest || avgTime > slowest.avgTime) {
                slowest = { ...ep, avgTime };
            }
        });

        if (mostActive) {
            $('#ep-active-route').text(`${mostActive.method} ${mostActive.path} (${mostActive.hits} hits)`);
        } else {
            $('#ep-active-route').text('-');
        }

        if (slowest) {
            $('#ep-slowest-route').text(`${slowest.method} ${slowest.path} (${slowest.avgTime} ms)`);
        } else {
            $('#ep-slowest-route').text('-');
        }

        $('#endpoint-pagination-info').text(`Showing ${filtered.length} of ${filtered.length} endpoints`);

        // Render rows
        const rowsHtml = filtered.map(ep => {
            const methodClass = ep.method.toLowerCase();
            const methodColor = methodClass === 'get' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                methodClass === 'post' ? 'bg-green-50 text-green-700 border-green-100' :
                                methodClass === 'put' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                'bg-red-50 text-red-600 border-red-200';

            return `
                <tr class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td class="px-6 py-3.5">
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold border ${methodColor}">${ep.method}</span>
                    </td>
                    <td class="px-6 py-3.5 font-mono text-xs text-gray-700 dark:text-gray-100 truncate max-w-[300px]" title="${ep.path}">${ep.path}</td>
                    <td class="px-6 py-3.5 text-center text-xs font-semibold text-gray-800 dark:text-gray-100">${ep.hits}</td>
                    <td class="px-6 py-3.5 text-center text-xs text-gray-600 dark:text-gray-200">${ep.avgTime} ms</td>
                    <td class="px-6 py-3.5 text-center text-xs text-gray-600 dark:text-gray-200">${ep.maxTime} ms</td>
                    <td class="px-6 py-3.5 font-mono text-[11px] text-gray-500 dark:text-gray-300">${ep.service}</td>
                </tr>
            `;
        }).join('');

        $tbody.html(rowsHtml);
    }

    initEvents() {
        $(document).on('input', '#endpoint-search', () => this.renderEndpointsTable());
        
        $(document).on('click', '#btn-refresh-endpoints', (e) => {
            const $icon = $(e.currentTarget).find('span');
            $icon.addClass('animate-spin');
            setTimeout(() => {
                this.renderEndpointsTable();
                $icon.removeClass('animate-spin');
            }, 550);
        });
    }
}
