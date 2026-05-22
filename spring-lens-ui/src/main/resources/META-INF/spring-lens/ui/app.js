import $ from 'jquery';
import * as d3 from "d3";
import DataTable from 'datatables.net-dt';
import {
    createIcons,
    Menu,
    ArrowRight,
    CircleArrowDown,
    CircleArrowRight,
    Globe,
    Box,
    ZoomIn,
    ZoomOut,
    Focus,
    Plug,
    MinusSquare,
    MoveDiagonal,
    X,
    Wand,
    ChevronDown,
    Plus,
    Minus,
    Search,
    Maximize,
    Move,
    TableColumnsSplit
} from 'lucide';
import { cards } from "./request-page.js";
import MetricCard from "./matric-card.js";
import 'datatables.net-responsive-dt';
import * as echarts from 'echarts/core';
import { PieChart } from 'echarts/charts';
import {
    TitleComponent,
    TooltipComponent,
    LegendComponent,
    ToolboxComponent
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

$(document).ready(async () => {


    function loadIcons() {
        createIcons({
            icons: {
                Menu, ArrowRight, Globe, Box, TableColumnsSplit,
                ZoomOut, ZoomIn, Focus, Plug, MinusSquare, MoveDiagonal, X, Wand,
                ChevronDown, Plus, Minus, Search, Maximize, Move, CircleArrowDown, CircleArrowRight
            }
        });
    }

    loadIcons();

    const requests = [
        ['GET', '/api/users?page=1', '200', '120 ms', '192.168.1.10', '10:30:15', 'View'],
        ['POST', '/api/login', '401', '95 ms', '192.168.1.11', '10:30:14', 'View'],
        ['GET', '/api/products', '200', '142 ms', '192.168.1.12', '10:30:14', 'View'],
        ['POST', '/api/orders', '201', '210 ms', '192.168.1.13', '10:30:12', 'View'],
        ['GET', '/api/categories', '200', '98 ms', '192.168.1.14', '10:30:11', 'View'],
        ['PUT', '/api/users/123', '200', '180 ms', '192.168.1.15', '10:30:10', 'View'],
        ['DELETE', '/api/users/123', '204', '76 ms', '192.168.1.16', '10:30:09', 'View'],
        ['POST', '/api/checkout', '500', '620 ms', '192.168.1.17', '10:30:08', 'View'],
        ['GET', '/api/reports', '200', '130 ms', '192.168.1.18', '10:30:07', 'View'],
        ['POST', '/api/notifications', '202', '110 ms', '192.168.1.19', '10:30:06', 'View']
    ];

    function TableRow(row) {
        const [method, url, status, time, ip, requestTime, action] = row;
        const methodClass = method.toLowerCase();
        let statusClass = "green";

        if (status.startsWith("4")) {
            statusClass = "amber";
        }

        if (status.startsWith("5")) {
            statusClass = "red";
        }

        return `
            <tr>
                <td>
                    <span class="pill ${methodClass}">
                        ${method}
                    </span>
                </td>
    
                <td>${url}</td>
    
                <td>
                    <span class="pill ${statusClass}">
                        ${status}
                    </span>
                </td>
                <td>${time}</td>
                <td>${ip}</td>
                <td>${requestTime}</td>
                <td>
                    <button 
                        class="row-action detail-trigger"
                        data-url="${url}"
                        type="button"
                    >
                        ${action}
                    </button>
                </td>
            </tr>`;
    }

    renderRequestPage();

    function renderRequestPage() {

        loadDatatable();
        loadEChart("chart-container");
        const html = cards.map(card => MetricCard(card)).join("");
        $("#kpiCards").html(html);
        loadIcons();
    }


    function renderBeanPage() {
        loadDatatable();
        loadEChart("chart-container");
        loadIcons();
    }

    function loadDatatable() {
        const tableSelector = '#tableCards';
        if ($(tableSelector).length === 0) return;

        if (DataTable.isDataTable(tableSelector)) {
            $(tableSelector).DataTable().destroy();
            $('.filters-row .dt-search').remove();
            $('.filters-row .dt-length').remove();
        }

        let table = new DataTable(tableSelector, {
            data: requests,
            responsive: true,
            columns: [
                {
                    title: "Method",
                    render: function (data) {
                        return `
                            <span class="pill ${data.toLowerCase()}">
                                ${data}
                            </span>
                        `;
                    }
                },
                {
                    title: "URL"
                },
                {
                    title: "Status",
                    render: function (data) {
                        let color = "green";
                        if (data.startsWith("4")) {
                            color = "amber";
                        }
                        if (data.startsWith("5")) {
                            color = "red";
                        }
                        return `
                            <span class="pill ${color}">
                                ${data}
                            </span>
                        `;
                    }
                },
                {
                    title: "Time"
                },
                {
                    title: "IP"
                },
                {
                    title: "Request Time"
                },
                {
                    title: "Action",
                    render: function (data, type, row) {
                        return `
                            <button 
                                class="row-action detail-trigger"
                                data-url="${row[1]}"
                            >
                                ${data}
                            </button>
                        `;
                    }
                }
            ],
        });

        // Fit the search box, filters, and entries-per-page dropdown on the same level
        if ($('.filters-row').length) {
            // Move search box to the beginning of the filters row
            if ($('.dt-search').length) {
                $('.dt-search').prependTo('.filters-row');
                $('.dt-search input').attr('placeholder', 'Search by endpoint, IP, status or any keyword...');
            }

            // Replace More Filters button with the entries-per-page dropdown wrapper
            if ($('.dt-length').length) {
                // Update dropdown options
                let select = $('.dt-length select');
                if (select.length) {
                    select.empty();
                    select.append('<option value="10">10 entries per page</option>');
                    select.append('<option value="25">25 entries per page</option>');
                    select.append('<option value="50">50 entries per page</option>');
                    select.append('<option value="100">100 entries per page</option>');
                }

                // Hide the separate label text
                $('.dt-length label').hide();

                // Replace More Filters button
                if ($('.btn-more-filters').length) {
                    $('.btn-more-filters').replaceWith($('.dt-length'));
                } else {
                    $('.dt-length').appendTo('.filters-row');
                }
            }

            // Remove the empty DataTable layout row structure
            $('.dt-layout-row').first().remove();
        }

        // Wire up filters
        $('#method').off('change').on('change', function () {
            let val = $(this).val();
            table.column(0).search(val ? `^${val}$` : '', true, false).draw();
        });

        $('#status').off('change').on('change', function () {
            let val = $(this).val();
            table.column(2).search(val ? `^${val}$` : '', true, false).draw();
        });

        $('#services').off('change').on('change', function () {
            let val = $(this).val();
            let regex = '';
            if (val === 'auth') {
                regex = 'login';
            } else if (val === 'products') {
                regex = 'products|categories';
            } else if (val === 'orders') {
                regex = 'orders|checkout';
            } else if (val === 'cart') {
                regex = 'cart';
            } else if (val === 'billing') {
                regex = 'billing|checkout';
            }
            table.column(1).search(regex, true, false).draw();
        });
    }

    const routes = {
        "#requests": { file: "./requests.html", init: renderRequestPage },
        "#beans": { file: "./bean.html", init: renderBeanPage },
        "#bean-graph": { file: "./bean-graph.html", init: initBeanGraph }
    };

    $(document).on("click", ".nav-item, .subnav a", function (e) {
        const href = $(this).attr("href");
        const route = routes[href];

        if (route) {
            e.preventDefault();
            $("#app").load(route.file, function () {
                route.init();
            });
        }

        // Manage active visual state classes
        $(".nav-item, .nav-group, .subnav a").removeClass("active");

        if ($(this).hasClass("nav-item")) {
            const parentGroup = $(this).closest(".nav-group");
            if (parentGroup.length) {
                parentGroup.addClass("active");
            } else {
                $(this).addClass("active");
            }
        } else {
            $(this).addClass("active");
            $(this).closest(".nav-group").addClass("active");
        }
    });

    const BeanTreeBuilder = {
        _displayName(beanName) {
            const lastPart = beanName.split('.').pop() || '';
            const cleaned = lastPart.replace(/\$\$.*$/, '');
            return cleaned.split('$').pop() || '';
        },

        _getGroupName(beanName) {
            if (beanName.startsWith('org.springframework.boot')) return 'Spring Boot Auto-Config';
            if (beanName.startsWith('org.springframework')) return 'Spring Framework';
            if (beanName.startsWith('io.micrometer')) return 'Micrometer Metrics';
            if (beanName.includes('.')) {
                const parts = beanName.split('.');
                return parts.slice(0, Math.min(3, parts.length - 1)).join('.');
            }
            return '';
        },

        build(beans) {
            const map = new Map(beans.map(b => [b.beanName, b]));
            const childrenOf = new Map();
            const hasParent = new Set();

            for (const b of beans) {
                for (const dep of (b.dependencies || [])) {
                    if (!map.has(dep)) continue;
                    if (!childrenOf.has(dep)) childrenOf.set(dep, new Set());
                    childrenOf.get(dep).add(b.beanName);
                    hasParent.add(b.beanName);
                }
            }

            const roots = beans.map(b => b.beanName).filter(name => !hasParent.has(name));

            const buildNode = (beanName, visited = new Set()) => {
                const bean = map.get(beanName);
                const node = {
                    name: BeanTreeBuilder._displayName(beanName),
                    fullName: beanName,
                    meta: bean ? {
                        type: bean.type,
                        scope: bean.scope,
                        role: bean.role,
                        factoryMethod: bean.factoryMethodName,
                        deps: (bean.dependencies || []).length,
                        dependents: (bean.dependents || []).length,
                    } : {},
                };

                const kids = childrenOf.get(beanName);
                if (!kids || !kids.size) return node;

                const nv = new Set([...visited, beanName]);
                node.children = [...kids].map(c =>
                    nv.has(c)
                        ? { name: BeanTreeBuilder._displayName(c), fullName: c, meta: { note: 'cycle' } }
                        : buildNode(c, nv)
                );
                return node;
            };

            /* Group top-level beans by package to reduce root fan-out */
            const grouped = new Map();
            for (const r of roots) {
                const groupName = BeanTreeBuilder._getGroupName(r);
                if (!grouped.has(groupName)) {
                    grouped.set(groupName, {
                        name: groupName,
                        fullName: groupName,
                        meta: { type: 'group' },
                        children: []
                    });
                }
                grouped.get(groupName).children.push(buildNode(r));
            }

            return {
                name: 'ApplicationContext',
                fullName: 'ApplicationContext',
                meta: { type: 'root', scope: 'singleton' },
                children: [...grouped.values()],
            };
        },
    };

    /* ── Fetch real data ── */
    let root;
    const dataPromise = (async () => {
        try {
            const res = await fetch('./bean-definitions.json');
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }
            const json = await res.json();
            window.allBeansMap = new Map(json.beans.map(b => [b.beanName, b]));

            // Set counts in toolbar
            $('#beans-count').text(json.beans.length);
            const totalDeps = json.beans.reduce((acc, b) => acc + (b.dependencies || []).length, 0);
            $('#deps-count').text(totalDeps);

            const data = BeanTreeBuilder.build(json.beans);
            const r = d3.hierarchy(data);

            // Collapse nodes by default except root level
            r.descendants().forEach((d, i) => {
                d.id = i;
                d._children = d.children;
                if (d.depth > 0) d.children = null;
            });

            r.x0 = 0;
            r.y0 = 0;
            return r;
        } catch (e) {
            console.error('Error loading or processing bean graph data:', e);
            throw e;
        }
    })();

    /* ── Node card dimensions ── */
    const NW = 196;
    const NH = 44;
    const RX = 10;
    const GAP_X = 36;
    const GAP_Y = 80;

    /* ── Cube icon path (20×20 viewport) ── */
    const ICON = 'M10 2l8 4v8l-8 4-8-4V6l8-4z M2 6l8 4 M18 6l-8 4 M10 10v8';

    /* ── Layout mode: 'tb' = top-bottom | 'lr' = left-right ── */
    let mode = localStorage.getItem('sl-layout') || 'tb';

    /* ── CSS-var helper ── */
    const css = variableName => getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();

    function getBeanCategory(d) {
        if (!d) return 'leaf';

        const data = d.data || d;
        const name = data.fullName || '';
        const type = data.meta?.type || '';

        const lowerName = name.toLowerCase();
        const lowerType = type.toLowerCase();

        if (lowerName.includes('adapter') || lowerType.includes('adapter')) {
            return 'adapter';
        }

        if (d.depth !== undefined) {
            if (d.depth <= 2) return 'root';
        } else {
            const beanRecord = window.allBeansMap?.get(name);
            if (beanRecord) {
                const deps = beanRecord.dependencies || [];
                const dependents = beanRecord.dependents || [];
                if (deps.length === 0) return 'leaf';
                if (dependents.length === 0) return 'root';
            }
        }

        const hasChildren = d.children?.length > 0 || d._children?.length > 0;
        return hasChildren ? 'intermediate' : 'leaf';
    }

    function nodeStyle(d) {
        const cat = getBeanCategory(d);
        if (cat === 'root') {
            return {
                fill: '#eff6ff',
                stroke: '#3b82f6',
                icon: '#3b82f6',
                text: '#1d4ed8'
            };
        }
        if (cat === 'intermediate') {
            return {
                fill: '#f0fdf4',
                stroke: '#22c55e',
                icon: '#22c55e',
                text: '#15803d'
            };
        }
        if (cat === 'leaf') {
            return {
                fill: '#fffbeb',
                stroke: '#eab308',
                icon: '#eab308',
                text: '#a16207'
            };
        }
        return {
            fill: '#faf5ff',
            stroke: '#a855f7',
            icon: '#a855f7',
            text: '#7e22ce'
        };
    }

    const tree = d3.tree();

    function tbLink(d) {
        const sx = d.source.x;
        const sy = d.source.y + NH / 2;
        const tx = d.target.x;
        const ty = d.target.y - NH / 2;
        const my = (sy + ty) / 2;
        return `M${sx},${sy} C${sx},${my} ${tx},${my} ${tx},${ty}`;
    }

    function lrLink(d) {
        const sWidth = d.source.width ?? NW;
        const tWidth = d.target.width ?? NW;
        const sx = d.source.y + sWidth / 2;
        const sy = d.source.x;
        const tx = d.target.y - tWidth / 2;
        const ty = d.target.x;
        const mx = (sx + tx) / 2;
        return `M${sx},${sy} C${mx},${sy} ${mx},${ty} ${tx},${ty}`;
    }

    /* ── SVG variables ── */
    let svg;
    let gLink;
    let gNode;
    let zoom;

    /* ── Tooltip ── */
    function showTip(ev, d) {
        const m = d.data.meta || {};
        const kids = d._children?.length || 0;

        $('#tip-name').text(d.data.name);
        $('#tip-type').text(m.type ? `Type: ${m.type.split('.').pop()}` : '');
        $('#tip-scope').text(m.scope ? `Scope: ${m.scope}${m.role ? ` · ${m.role}` : ''}` : '');
        $('#tip-meta').text(
            m.deps !== undefined
                ? `Deps: ${m.deps} · Dependents: ${m.dependents} · Children: ${kids}`
                : kids ? `${kids} child bean(s) · depth ${d.depth}` : `Leaf · depth ${d.depth}`
        );
        $('#tip').addClass('show').css({ left: ev.pageX + 14, top: ev.pageY - 10 });
    }

    /* ── Path Highlighting Logic ── */
    let isHighlightPathActive = false;

    function highlightPathForNode(d) {
        if (!isHighlightPathActive) return;

        const pathNodes = new Set([...d.ancestors(), ...d.descendants()]);

        svg.selectAll('.node')
            .classed('dimmed', n => !pathNodes.has(n))
            .classed('highlighted', n => pathNodes.has(n));

        svg.selectAll('.link')
            .classed('dimmed', l => !pathNodes.has(l.source) || !pathNodes.has(l.target))
            .classed('highlighted', l => pathNodes.has(l.source) && pathNodes.has(l.target));
    }

    function resetPathHighlight() {
        if (!isHighlightPathActive) return;
        svg.selectAll('.node, .link').classed('dimmed', false).classed('highlighted', false);
    }

    /* ── Update (mode-aware) ── */
    function update(event, source) {
        if (!svg || !svg.node()) return;

        const dur = event?.altKey ? 2500 : 300;
        const isTB = mode === 'tb';
        const nodes = root.descendants().reverse();
        const links = root.links();
        const linkColor = css('--link-color') || '#94a3b8';

        // Pre-calculate dynamic widths to fit text sizes
        root.descendants().forEach(d => {
            const name = d.data.name || '';
            d.width = Math.max(160, name.length * 7.2 + 56);
        });

        const maxWidth = d3.max(nodes, d => d.width) || NW;
        if (isTB) {
            tree.nodeSize([maxWidth + GAP_X, NH + GAP_Y]);
        } else {
            tree.nodeSize([NH + 28, maxWidth + GAP_Y]);
        }
        tree(root);

        const tr = d3.transition().duration(dur);

        const srcPos = s => isTB
            ? `translate(${s.x0 ?? s.x},${s.y0 ?? s.y})`
            : `translate(${s.y0 ?? s.y},${s.x0 ?? s.x})`;

        const nodePos = d => isTB ? `translate(${d.x},${d.y})` : `translate(${d.y},${d.x})`;

        const node = gNode.selectAll('g.node').data(nodes, d => d.id);

        const enter = node.enter().append('g')
            .attr('class', 'node')
            .attr('cursor', 'pointer')
            .attr('transform', () => srcPos(source))
            .attr('fill-opacity', 0)
            .on('click', (ev, d) => {
                ev.stopPropagation();
                d.children = d.children ? null : d._children;
                update(ev, d);
                selectNode(d);
                $('#tip').removeClass('show');
            })
            .on('mouseenter', (ev, d) => {
                showTip(ev, d);
                highlightPathForNode(d);
            })
            .on('mousemove', ev => $('#tip').css({ left: ev.pageX + 14, top: ev.pageY - 10 }))
            .on('mouseleave', () => {
                $('#tip').removeClass('show');
                resetPathHighlight();
            });

        enter.append('rect')
            .attr('class', 'node-rect')
            .attr('x', d => -d.width / 2)
            .attr('y', -NH / 2)
            .attr('width', d => d.width)
            .attr('height', NH)
            .attr('rx', RX)
            .attr('stroke-width', 1.8);

        enter.append('g')
            .attr('class', 'node-icon')
            .attr('transform', d => `translate(${-d.width / 2 + 14}, -10)`)
            .append('path')
            .attr('d', ICON)
            .attr('stroke-width', 1.5)
            .attr('stroke-linecap', 'round')
            .attr('stroke-linejoin', 'round')
            .attr('fill', 'none');

        enter.append('text')
            .attr('class', 'node-text')
            .attr('x', d => -d.width / 2 + 42)
            .attr('y', 1)
            .attr('dy', '0.35em')
            .attr('font-size', 13)
            .attr('font-weight', 500)
            .attr('font-family', 'Inter, sans-serif')
            .text(d => d.data.name);

        const mergedNodes = node.merge(enter);

        mergedNodes.transition(tr)
            .attr('transform', nodePos)
            .attr('fill-opacity', 1);

        mergedNodes.select('.node-rect')
            .attr('x', d => -d.width / 2)
            .attr('width', d => d.width)
            .attr('fill', d => nodeStyle(d).fill)
            .attr('stroke', d => nodeStyle(d).stroke);

        mergedNodes.select('.node-icon')
            .attr('transform', d => `translate(${-d.width / 2 + 14}, -10)`);

        mergedNodes.select('.node-icon path')
            .attr('stroke', d => nodeStyle(d).icon);

        mergedNodes.select('.node-text')
            .attr('x', d => -d.width / 2 + 42)
            .attr('fill', d => nodeStyle(d).text);

        node.exit().transition(tr).remove()
            .attr('transform', () => isTB
                ? `translate(${source.x},${source.y})`
                : `translate(${source.y},${source.x})`)
            .attr('fill-opacity', 0);

        const linkFn = isTB ? tbLink : lrLink;
        const link = gLink.selectAll('path.link').data(links, d => d.target.id);

        const lEnter = link.enter().append('path')
            .attr('class', 'link')
            .attr('fill', 'none')
            .attr('stroke', linkColor)
            .attr('stroke-width', 1.5)
            .attr('marker-end', 'url(#dot)')
            .attr('d', () => {
                const o = { x: source.x0 ?? source.x, y: source.y0 ?? source.y };
                return linkFn({ source: o, target: o });
            });

        link.merge(lEnter).transition(tr)
            .attr('stroke', linkColor)
            .attr('d', linkFn);

        link.exit().transition(tr).remove()
            .attr('d', () => linkFn({ source, target: source }));

        root.eachBefore(d => {
            d.x0 = d.x;
            d.y0 = d.y;
        });

        const vis = root.descendants().filter(d => d.depth === 0 || d.parent?.children).length;
        $('#nodeCount strong').text(vis);
    }

    /* ── Zoom Helpers ── */
    function zoomBy(factor, duration = 300) {
        if (!svg || !zoom) return;
        svg.transition()
            .duration(duration)
            .call(zoom.scaleBy, factor);
    }

    function fitView(duration = 500) {
        if (!svg || !svg.node() || !root) return;

        const width = $('#beanGraph').width() || 800;
        const height = $('#beanGraph').height() || 600;

        const nodes = root.descendants();
        if (nodes.length === 0) return;

        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        nodes.forEach(d => {
            const nx = mode === 'tb' ? d.x : d.y;
            const ny = mode === 'tb' ? d.y : d.x;

            if (nx < minX) minX = nx;
            if (nx > maxX) maxX = nx;
            if (ny < minY) minY = ny;
            if (ny > maxY) maxY = ny;
        });

        const padding = 60;
        const maxNodeW = d3.max(nodes, d => d.width) || NW;
        const graphW = (maxX - minX) + maxNodeW + padding * 2;
        const graphH = (maxY - minY) + NH + padding * 2;

        const centerX = minX + (maxX - minX) / 2;
        const centerY = minY + (maxY - minY) / 2;

        let scale = Math.min(width / graphW, height / graphH);
        scale = Math.max(0.15, Math.min(1.5, scale));

        const tx = width / 2 - centerX * scale;
        const ty = height / 2 - centerY * scale;

        svg.transition()
            .duration(duration)
            .call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
    }

    function updateZoomPercent(k) {
        $('#zoom-percent').text(Math.round(k * 100) + '%');
    }

    /* ── Details Sidebar Controller ── */
    function selectNode(d) {
        $('#details-sidebar').show();
        $('#detail-bean-name').text(d.data.name);
        $('#detail-bean-type').text(d.data.meta?.type || 'N/A');

        const scope = d.data.meta?.scope || 'singleton';
        $('#detail-bean-scope').text(scope)
            .css({
                background: scope === 'singleton' ? '#f3e8ff' : '#ecfdf5',
                color: scope === 'singleton' ? '#7e22ce' : '#047857'
            });

        const beanRecord = window.allBeansMap?.get(d.data.fullName);
        const deps = beanRecord?.dependencies || [];
        const dependents = beanRecord?.dependents || [];

        $('#detail-deps-count').text(deps.length);
        $('#detail-dependents-count').text(dependents.length);

        const buildListHtml = (names, emptyMsg) => {
            if (names.length === 0) {
                return `<div style="color: var(--text-light); font-size: 12px; padding: 4px 8px;">${emptyMsg}</div>`;
            }
            return names.map(depName => {
                const depRecord = window.allBeansMap?.get(depName);
                const displayName = BeanTreeBuilder._displayName(depName);

                let catClass = 'blue';
                if (depRecord) {
                    const tempNode = { fullName: depName, meta: { type: depRecord.type }, children: null };
                    const cat = getBeanCategory(tempNode);
                    if (cat === 'intermediate') catClass = 'green';
                    else if (cat === 'leaf') catClass = 'yellow';
                    else if (cat === 'adapter') catClass = 'purple';
                }

                return `
                    <div class="dep-item">
                        <div class="dep-item-left" data-fullname="${depName}">
                            <span class="dot ${catClass}"></span>
                            <span>${displayName}</span>
                        </div>
                        <span class="dep-link" data-fullname="${depName}" title="Focus in graph">
                            <i data-lucide="arrow-right" style="width: 14px; height: 14px;"></i>
                        </span>
                    </div>
                `;
            }).join('');
        };

        $('#accordion-deps-body').html(buildListHtml(deps, 'No dependencies'));
        $('#accordion-dependents-body').html(buildListHtml(dependents, 'No dependents'));

        createIcons({
            icons: { ArrowRight }
        });
    }

    function focusOnBean(fullName) {
        if (!root) return;

        const targetNode = root.descendants().find(n => n.data.fullName === fullName);
        if (!targetNode) {
            console.warn('Bean not found in active tree layout:', fullName);
            return;
        }

        let curr = targetNode.parent;
        let needsUpdate = false;
        while (curr) {
            if (curr._children && !curr.children) {
                curr.children = curr._children;
                needsUpdate = true;
            }
            curr = curr.parent;
        }

        if (needsUpdate) {
            update(null, root);
        }

        const width = $('#beanGraph').width() || 800;
        const height = $('#beanGraph').height() || 600;
        const isTB = mode === 'tb';
        const targetX = isTB ? targetNode.x : targetNode.y;
        const targetY = isTB ? targetNode.y : targetNode.x;

        const tx = width / 2 - targetX * 1.2;
        const ty = height / 2 - targetY * 1.2;

        svg.transition()
            .duration(500)
            .call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(1.2));

        selectNode(targetNode);
    }

    /* ── Graph initialization function ── */
    async function initBeanGraph() {
        svg = d3.select('#tree-svg');
        if (!svg.node()) return;

        svg.selectAll('*').remove();

        // Main zoomable group
        const gMain = svg.append('g').attr('id', 'g-main');

        /* Connection dot marker */
        svg.append('defs')
            .append('marker')
            .attr('id', 'dot')
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
            .attr('fill', css('--link-color') || '#94a3b8');

        gLink = gMain.append('g').attr('class', 'links');
        gNode = gMain.append('g').attr('class', 'nodes');

        // Zoom registration
        zoom = d3.zoom()
            .scaleExtent([0.05, 4])
            .on('zoom', event => {
                gMain.attr('transform', event.transform);
                updateZoomPercent(event.transform.k);
            });

        svg.call(zoom)
            .on('click', () => $('#details-sidebar').hide());

        try {
            root = await dataPromise;
            if (window.allBeansMap) {
                $('#beans-count').text(window.allBeansMap.size);
                const totalDeps = Array.from(window.allBeansMap.values()).reduce((acc, b) => acc + (b.dependencies || []).length, 0);
                $('#deps-count').text(totalDeps);
            }
        } catch (e) {
            $('#tree-container').html(
                `<div style="padding:20px; color:red;">❌ Failed to load bean definitions: ${e.message}</div>`
            );
            return;
        }

        /* Initial render */
        update(null, { x: 0, y: 0, x0: 0, y0: 0 });
        fitView(0);

        /* Restore mode and theme styling */
        setMode(mode);
        const savedDark = localStorage.getItem('sl-theme') === 'dark';
        applyTheme(savedDark);

        loadIcons();
    }

    /* ── Delegated Button Listeners ── */
    $(document).on('click', '#btn-expand', () => {
        if (!root) return;
        root.eachBefore(d => d.children = d._children);
        update(null, root);
        fitView(500);
    });

    $(document).on('click', '#btn-collapse', () => {
        if (!root) return;
        root.eachBefore(d => {
            if (d.depth > 0) d.children = null;
        });
        update(null, root);
        fitView(500);
    });

    $(document).on('click', '#btn-reset', () => {
        if (!root) return;
        root.eachBefore(d => d.children = d.depth === 0 ? d._children : null);
        update(null, root);
        fitView(500);
    });

    /* ── Navigation zoom / fit triggers ── */
    $(document).on('click', '#btn-control-zoom-in, #btn-mini-zoom-in', () => zoomBy(1.25));
    $(document).on('click', '#btn-control-zoom-out, #btn-mini-zoom-out', () => zoomBy(0.8));
    $(document).on('click', '#btn-control-fit, #btn-pan-mode, #btn-fit', () => fitView());

    /* ── Highlight Path Trigger ── */
    $(document).on('click', '#btn-highlight-path', function () {
        isHighlightPathActive = !isHighlightPathActive;
        $(this).toggleClass('primary', isHighlightPathActive);
        if (!isHighlightPathActive) {
            svg.selectAll('.node, .link').classed('dimmed', false).classed('highlighted', false);
        }
    });

    /* ── Search Dropdown Auto-suggest ── */
    $(document).on('input', '#search-input', function () {
        const query = $(this).val().toLowerCase().trim();
        const suggestionsBox = $('#search-suggestions');

        if (!query) {
            suggestionsBox.hide();
            return;
        }

        if (!window.allBeansMap) return;

        const matches = [];
        for (const [fullName, record] of window.allBeansMap.entries()) {
            const displayName = BeanTreeBuilder._displayName(fullName);
            if (displayName.toLowerCase().includes(query) || fullName.toLowerCase().includes(query)) {
                matches.push({ fullName, displayName, type: record.type || '' });
                if (matches.length >= 10) break;
            }
        }

        if (matches.length === 0) {
            suggestionsBox.html(
                '<div style="padding: 8px 12px; font-size: 13px; color: var(--text-light);">No matching beans</div>'
            ).show();
            return;
        }

        const html = matches.map(m => `
            <div class="suggestion-item" data-fullname="${m.fullName}">
                <strong>${m.displayName}</strong>
                <span class="suggestion-type">${m.type}</span>
            </div>
        `).join('');

        suggestionsBox.html(html).show();
    });

    $(document).on('click', function (e) {
        if (!$(e.target).closest('.search-box').length) {
            $('#search-suggestions').hide();
        }
    });

    $(document).on('click', '.suggestion-item', function () {
        const fullName = $(this).data('fullname');
        $('#search-input').val('');
        $('#search-suggestions').hide();
        focusOnBean(fullName);
    });

    /* ── Sidebar interactive navigation ── */
    $(document).on('click', '.dep-item-left, .dep-link', function (e) {
        e.stopPropagation();
        const fullName = $(this).data('fullname');
        focusOnBean(fullName);
    });

    $(document).on('click', '#btn-close-sidebar', () => {
        $('#details-sidebar').hide();
    });

    $(document).on('click', '.accordion-header', function () {
        $(this).toggleClass('open');
        $(this).next('.accordion-body').slideToggle(200);
    });

    /* ── Layout toggle ── */
    function setMode(m) {
        mode = m;
        localStorage.setItem('sl-layout', m);
        $('#btn-tb').toggleClass('active', m === 'tb');
        $('#btn-lr').toggleClass('active', m === 'lr');
        if (root) {
            root.eachBefore(d => {
                d.x0 = d.x;
                d.y0 = d.y;
            });
            update(null, { x: root.x ?? 0, y: root.y ?? 0, x0: root.x0 ?? 0, y0: root.y0 ?? 0 });
            fitView(500);
        }
    }

    $(document).on('click', '#btn-tb', () => setMode('tb'));
    $(document).on('click', '#btn-lr', () => setMode('lr'));

    /* ── Theme toggle ── */
    function applyTheme(dark) {
        $('html').attr('data-theme', dark ? 'dark' : null);
        $('#ti').text(dark ? '☀️' : '🌙');
        $('#tl').text(dark ? 'Light mode' : 'Dark mode');
        if (svg && svg.node()) {
            svg.selectAll('defs marker path, defs marker circle').attr('fill', css('--link-color') || '#94a3b8');
            update(null, root);
        }
    }

    $(document).on('click', '#btn-theme', () => {
        const isDark = $('html').attr('data-theme') === 'dark';
        localStorage.setItem('sl-theme', isDark ? 'light' : 'dark');
        applyTheme(!isDark);
    });

    /* ── Details Panel Trigger and Interactions ── */
    function getDetailsHtml(method, endpoint, status, respTime, ip, time) {
        let methodClass = method.toLowerCase();
        let statusColor = "green";
        if (status.startsWith("4")) statusColor = "amber";
        if (status.startsWith("5")) statusColor = "red";

        // Determine mock payload and response based on endpoint
        let payload = "{}";
        let response = "{}";
        let service = "api-service";
        let reqId = "e5f67890-abcd-ef12-3456-7890abcdef12";

        if (endpoint.includes("login")) {
            payload = `{
  <span class="json-key">"username"</span><span class="json-punc">:</span> <span class="json-string">"admin@company.com"</span><span class="json-punc">,</span>
  <span class="json-key">"password"</span><span class="json-punc">:</span> <span class="json-string">"••••••••••••"</span>
}`;
            response = `{
  <span class="json-key">"error"</span><span class="json-punc">:</span> <span class="json-string">"Unauthorized"</span><span class="json-punc">,</span>
  <span class="json-key">"message"</span><span class="json-punc">:</span> <span class="json-string">"Bad credentials"</span>
}`;
            service = "auth-service";
            reqId = "b2c3d4e5-f678-90ab-cdef-1234567890ab";
        } else if (endpoint.includes("users")) {
            payload = `{
  <span class="json-key">"page"</span><span class="json-punc">:</span> <span class="json-number">1</span><span class="json-punc">,</span>
  <span class="json-key">"limit"</span><span class="json-punc">:</span> <span class="json-number">10</span><span class="json-punc">,</span>
  <span class="json-key">"sort"</span><span class="json-punc">:</span> <span class="json-string">"name"</span><span class="json-punc">,</span>
  <span class="json-key">"order"</span><span class="json-punc">:</span> <span class="json-string">"asc"</span>
}`;
            response = `{
  <span class="json-key">"data"</span><span class="json-punc">:</span> <span class="json-punc">[</span>
    <span class="json-punc">{</span>
      <span class="json-key">"id"</span><span class="json-punc">:</span> <span class="json-number">1</span><span class="json-punc">,</span>
      <span class="json-key">"name"</span><span class="json-punc">:</span> <span class="json-string">"John Doe"</span><span class="json-punc">,</span>
      <span class="json-key">"email"</span><span class="json-punc">:</span> <span class="json-string">"john@example.com"</span>
    <span class="json-punc">}</span>
  <span class="json-punc">]</span><span class="json-punc">,</span>
  <span class="json-key">"total"</span><span class="json-punc">:</span> <span class="json-number">100</span><span class="json-punc">,</span>
  <span class="json-key">"page"</span><span class="json-punc">:</span> <span class="json-number">1</span><span class="json-punc">,</span>
  <span class="json-key">"limit"</span><span class="json-punc">:</span> <span class="json-number">10</span>
}`;
            service = "user-service";
            reqId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
        } else if (endpoint.includes("products")) {
            payload = `{}`;
            response = `{
  <span class="json-key">"products"</span><span class="json-punc">:</span> <span class="json-punc">[</span>
    <span class="json-punc">{</span>
      <span class="json-key">"id"</span><span class="json-punc">:</span> <span class="json-number">101</span><span class="json-punc">,</span>
      <span class="json-key">"name"</span><span class="json-punc">:</span> <span class="json-string">"Wireless Mouse"</span><span class="json-punc">,</span>
      <span class="json-key">"price"</span><span class="json-punc">:</span> <span class="json-number">29.99</span>
    <span class="json-punc">}</span>
  <span class="json-punc">]</span>
}`;
            service = "catalog-service";
            reqId = "c3d4e5f6-7890-abcd-ef12-34567890abcd";
        } else if (endpoint.includes("orders")) {
            payload = `{
  <span class="json-key">"productId"</span><span class="json-punc">:</span> <span class="json-number">101</span><span class="json-punc">,</span>
  <span class="json-key">"quantity"</span><span class="json-punc">:</span> <span class="json-number">2</span>
}`;
            response = `{
  <span class="json-key">"orderId"</span><span class="json-punc">:</span> <span class="json-number">99823</span><span class="json-punc">,</span>
  <span class="json-key">"status"</span><span class="json-punc">:</span> <span class="json-string">"processing"</span>
}`;
            service = "order-service";
            reqId = "d4e5f678-90ab-cdef-1234-567890abcdef";
        } else if (endpoint.includes("categories")) {
            payload = `{}`;
            response = `{
  <span class="json-key">"categories"</span><span class="json-punc">:</span> <span class="json-punc">[</span>
    <span class="json-string">"Electronics"</span><span class="json-punc">,</span>
    <span class="json-string">"Office Supplies"</span>
  <span class="json-punc">]</span>
}`;
            service = "catalog-service";
            reqId = "e5f67890-abcd-ef12-3456-7890abcdef34";
        } else if (endpoint.includes("checkout")) {
            payload = `{
  <span class="json-key">"cartId"</span><span class="json-punc">:</span> <span class="json-string">"cart-8821"</span><span class="json-punc">,</span>
  <span class="json-key">"paymentMethod"</span><span class="json-punc">:</span> <span class="json-string">"credit_card"</span>
}`;
            response = `{
  <span class="json-key">"error"</span><span class="json-punc">:</span> <span class="json-string">"Internal Server Error"</span><span class="json-punc">,</span>
  <span class="json-key">"message"</span><span class="json-punc">:</span> <span class="json-string">"Database connection timeout"</span>
}`;
            service = "payment-service";
            reqId = "f67890ab-cdef-1234-5678-90abcdef1234";
        }

        return `
        <aside class="card details-card">
            <div class="details-head">
                <h3>Request Details</h3>
                <button class="close-x" aria-label="Close details">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-x"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>
            
            <div class="details-meta-card">
                <div class="meta-item row-method">
                    <span class="meta-label">Method</span>
                    <span class="meta-value method-val ${methodClass}">${method}</span>
                </div>
                <div class="meta-item row-endpoint">
                    <span class="meta-label">Endpoint</span>
                    <span class="meta-value endpoint-val">${endpoint}</span>
                </div>
                <div class="meta-item row-status">
                    <span class="meta-label">Status</span>
                    <span class="meta-value status-val ${statusColor}">${status}</span>
                </div>
                <div class="meta-item row-resp-time">
                    <span class="meta-label">Response Time</span>
                    <span class="meta-value">${respTime}</span>
                </div>
                <div class="meta-item row-time">
                    <span class="meta-label">Time</span>
                    <span class="meta-value">${time}</span>
                </div>
                <div class="meta-item row-ip">
                    <span class="meta-label">IP Address</span>
                    <span class="meta-value">${ip}</span>
                </div>
            </div>
            
            <div class="tabs">
                <span class="active">Details</span>
                <span class="">Headers</span>
                <span class="">Query Params</span>
                <span class="">Timeline</span>
            </div>
            
            <div class="code-section">
                <div class="code-section-header">
                    <h4>Request Payload</h4>
                    <button class="copy-btn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                        Copy
                    </button>
                </div>
                <pre class="code-box"><code>${payload}</code></pre>
            </div>
            
            <div class="code-section">
                <div class="code-section-header">
                    <h4>Response</h4>
                    <button class="copy-btn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                        Copy
                    </button>
                </div>
                <pre class="code-box"><code>${response}</code></pre>
            </div>

            <div class="additional-info">
                <h4>Additional Info</h4>
                <div class="info-grid">
                    <div class="info-row">
                        <span class="info-label">User Agent</span>
                        <span class="info-value">Mozilla/5.0 (Windows NT 10.0; Win64; x64)</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Service</span>
                        <span class="info-value">${service}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Request ID</span>
                        <span class="info-value">${reqId}</span>
                    </div>
                </div>
            </div>
        </aside>
        `;
    }

    $(document).on('click', '.detail-trigger', function (e) {
        e.preventDefault();
        const btn = $(this);
        const row = btn.closest('tr');

        let method = row.find('td:eq(0)').text().trim();
        let endpoint = row.find('td:eq(1)').text().trim();
        let status = row.find('td:eq(2)').text().trim();
        let respTime = row.find('td:eq(3)').text().trim();
        let ip = row.find('td:eq(4)').text().trim();
        let timeStr = row.find('td:eq(5)').text().trim();

        // Format the time nicely
        let fullTime = `May 14, 2024 ${timeStr}`;
        if (!timeStr.toLowerCase().includes('am') && !timeStr.toLowerCase().includes('pm')) {
            fullTime += ' AM';
        }

        const layout = btn.closest('.module-layout');
        const detailPanel = layout.find('#detailPanel');

        // Render the dynamic details panel HTML
        const detailsHtml = getDetailsHtml(method, endpoint, status, respTime, ip, fullTime);
        detailPanel.html(detailsHtml);

        // Slide it in smoothly by adding the layout class
        layout.addClass('details-open');
    });

    $(document).on('click', '.close-x', function (e) {
        e.preventDefault();
        const layout = $(this).closest('.module-layout');
        layout.removeClass('details-open');
    });

    $(document).on('click', '.copy-btn', function (e) {
        e.preventDefault();
        const btn = $(this);
        const code = btn.closest('.code-section').find('.code-box code').text();

        navigator.clipboard.writeText(code).then(() => {
            const originalHtml = btn.html();
            btn.html('✓ Copied');
            btn.css({ background: '#ecfdf5', color: '#047857', borderColor: '#a7f3d0' });
            setTimeout(() => {
                btn.html(originalHtml);
                btn.css({ background: '', color: '', borderColor: '' });
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
        });
    });

    function loadEChart(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        echarts.use([
            TitleComponent,
            TooltipComponent,
            LegendComponent,
            PieChart,
            CanvasRenderer,
            ToolboxComponent
        ]);

        // Safely dispose of any existing chart instance on this DOM element
        let myChart = echarts.getInstanceByDom(container);
        if (myChart) {
            myChart.dispose();
        }

        myChart = echarts.init(container, null, {
            renderer: 'canvas',
            useDirtyRect: false
        });

        const option = {
            color: ['#7c3aed', '#0969e8', '#16a34a', '#ff990a', '#ff3b30', '#06b6d4', '#ec4899', '#64748b'],
            tooltip: {
                trigger: 'item',
                formatter: '{b}: <strong>{c}</strong> ({d}%)',
                backgroundColor: 'rgba(255, 255, 255, 0.96)',
                borderColor: '#e2e8f0',
                borderWidth: 1,
                textStyle: {
                    color: '#1f2937',
                    fontSize: 11,
                    fontFamily: 'Inter, sans-serif'
                },
                extraCssText: 'box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); border-radius: 6px; padding: 6px 10px;'
            },
            legend: {
                orient: 'vertical',
                left: '52%',
                top: 'center',
                itemWidth: 8,
                itemHeight: 8,
                itemGap: 8,
                textStyle: {
                    fontSize: 10,
                    fontFamily: 'Inter, sans-serif',
                    color: '#64748b'
                }
            },
            series: [
                {
                    name: 'Requests by Service',
                    type: 'pie',
                    radius: ['15%', '70%'],
                    center: ['28%', '50%'],
                    roseType: 'area',
                    itemStyle: {
                        borderRadius: 5
                    },
                    label: {
                        show: false
                    },
                    labelLine: {
                        show: false
                    },
                    data: [
                        { value: 40, name: 'auth-service' },
                        { value: 38, name: 'products-service' },
                        { value: 32, name: 'orders-service' },
                        { value: 30, name: 'cart-service' },
                        { value: 28, name: 'billing-service' },
                        { value: 26, name: 'user-service' },
                        { value: 22, name: 'notification-service' },
                        { value: 18, name: 'report-service' }
                    ]
                }
            ]
        };

        if (option && typeof option === 'object') {
            myChart.setOption(option);
        }
    }

    /* ── Resize ── */
    let resizeTimer;
    $(window).on('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (root) {
                update(null, root);
                fitView(100);
            }
        }, 200);
    });
});