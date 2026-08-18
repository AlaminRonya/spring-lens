import { requestsData } from './mock-data.js';
import { METHOD_PILL_STYLES, STATUS_PILL_STYLES, TEMPLATES } from "./constants.js";

export default class RequestDefinitions {
    constructor() {
        this.initEvents();
    }

    enter() {
        this.renderRequestsTable();
    }

    leave() {
        $('#request-details-sidebar').hide();
    }

    renderRequestsTable() {
        const $tbody = $('#requestTableBody');
        if (!$tbody.length) return;
        $tbody.empty();

        const searchVal = $('#request-search').val()?.toLowerCase().trim();
        const filterMethod = $('#request-filter-method').val();
        const filterStatus = $('#request-filter-status').val();
        const filterService = $('#request-filter-service').val();

        const filtered = requestsData.filter(({ url, ip, reqId, method, status, service }) => {
            const matchesSearch = !searchVal ||
                url.toLowerCase().includes(searchVal) ||
                ip.includes(searchVal) ||
                reqId.includes(searchVal);

            return matchesSearch &&
                (!filterMethod || method === filterMethod) &&
                (!filterStatus || status === filterStatus) &&
                (!filterService || service === filterService);
        });

        $('#request-pagination-info').text(`Showing 1 to ${filtered.length} of ${filtered.length} requests`);

        const rowsHtml = filtered.map(req => {
            const methodClass = req.method.toLowerCase();
            const statusColor = req.status.startsWith('4') ? 'amber' : (req.status.startsWith('5') ? 'red' : 'green');

            return TEMPLATES.requestRow({
                ...req,
                methodClass,
                statusColor
            });
        }).join('');

        $tbody.html(rowsHtml);
    }

    async copyTextToClipboard($btn, text) {
        try {
            await navigator.clipboard.writeText(text);
            const originalHtml = $btn.html();

            $btn.html('<span class="material-symbols-outlined text-[12px]">done</span> Copied')
                .addClass('text-success')
                .removeClass('text-gray-500');

            setTimeout(() => {
                $btn.html(originalHtml)
                    .removeClass('text-success')
                    .addClass('text-gray-500');
            }, 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    }

    initEvents() {
        $(document).on('input', '#request-search', () => this.renderRequestsTable());
        $(document).on('change', '#request-filter-method, #request-filter-status, #request-filter-service', () => this.renderRequestsTable());

        $(document).on('click', '#btn-refresh-requests', (e) => {
            const $icon = $(e.currentTarget).find('span');
            $icon.addClass('animate-spin');
            setTimeout(() => {
                this.renderRequestsTable();
                $icon.removeClass('animate-spin');
            }, 550);
        });

        $(document).on('click', '.btn-request-view', (e) => {
            e.stopPropagation();
            const id = $(e.currentTarget).data('id');
            const req = requestsData.find(r => r.reqId === id);
            if (!req) return;

            const { url, service, method, status, time, ip, timestamp, payload, response, reqId } = req;

            const methodClass = method.toLowerCase();
            const statusColor = status.startsWith('4') ? 'amber' : (status.startsWith('5') ? 'red' : 'green');

            $('#req-detail-method')
                .text(method)
                .attr('class', `px-2 py-0.5 rounded text-[10px] font-bold inline-block border ${METHOD_PILL_STYLES[methodClass] || 'bg-gray-50 text-gray-700 border-gray-200'}`);

            $('#req-detail-status')
                .text(status)
                .attr('class', `px-2 py-0.5 rounded text-[10px] font-bold inline-block border ${STATUS_PILL_STYLES[statusColor]}`);

            const textMappings = {
                '#req-detail-url': url,
                '#req-detail-service': service,
                '#req-detail-time': time,
                '#req-detail-ip': ip,
                '#req-detail-timestamp': `May 14, 2024 ${timestamp} AM`,
                '#req-detail-payload': payload,
                '#req-detail-response': response || 'No response content',
                '#req-detail-id': reqId
            };

            Object.entries(textMappings).forEach(([selector, value]) => {
                $(selector).text(value);
            });

            $('#request-details-sidebar').show();
        });

        $(document).on('click', '#btn-close-request-sidebar', () => {
            $('#request-details-sidebar').hide();
        });

        $(document).on('click', '#btn-copy-payload', (e) => {
            const $btn = $(e.currentTarget);
            const code = $('#req-detail-payload').text();
            this.copyTextToClipboard($btn, code);
        });

        $(document).on('click', '#btn-copy-response', (e) => {
            const $btn = $(e.currentTarget);
            const code = $('#req-detail-response').text();
            this.copyTextToClipboard($btn, code);
        });
    }
}