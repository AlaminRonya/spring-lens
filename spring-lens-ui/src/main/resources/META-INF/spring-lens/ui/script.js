$(document).ready(() => {

    const PAGES_DIR = './pages/'; 
    const $container = $('#main-content');
    const templateCache = {}; 
    let charts = {};

    const beansData = [
        { name: 'userService', type: 'com.app.service.UserServiceImpl', scope: 'SINGLETON', role: 'Application', primary: true, lazy: false, contextId: 'application:8080', icon: 'settings_input_component', color: 'text-primary' },
        { name: 'dataSource', type: 'com.zaxxer.hikari.HikariDataSource', scope: 'SINGLETON', role: 'Infrastructure', primary: true, lazy: false, contextId: 'application:8080', icon: 'database', color: 'text-success' },
        { name: 'securityConfig', type: 'com.app.config.SecurityConfig', scope: 'SINGLETON', role: 'Application', primary: false, lazy: true, contextId: 'application:8080', icon: 'lock', color: 'text-warning' },
        { name: 'userController', type: 'com.app.rest.UserController', scope: 'SINGLETON', role: 'Application', primary: false, lazy: false, contextId: 'application:8080', icon: 'api', color: 'text-info' },
        { name: 'userService', type: 'com.app.service.UserServiceImpl', scope: 'SINGLETON', role: 'Application', primary: true, lazy: false, contextId: 'application:8080', icon: 'settings_input_component', color: 'text-primary' },
        { name: 'securityConfig', type: 'com.app.config.SecurityConfig', scope: 'SINGLETON', role: 'Application', primary: false, lazy: true, contextId: 'application:8080', icon: 'lock', color: 'text-warning' },
        { name: 'userService', type: 'com.app.service.UserServiceImpl', scope: 'SINGLETON', role: 'Application', primary: true, lazy: false, contextId: 'application:8080', icon: 'settings_input_component', color: 'text-primary' },
        { name: 'cacheManager', type: 'org.springframework.cache.CacheManager', scope: 'SINGLETON', role: 'Support', primary: false, lazy: false, contextId: 'application:8080', icon: 'memory', color: 'text-gray-500' },
        { name: 'transactionManager', type: 'org.springframework.jdbc.datasource.DataSourceTransactionManager', scope: 'SINGLETON', role: 'Infrastructure', primary: false, lazy: false, contextId: 'application:8080', icon: 'sync_alt', color: 'text-success' },
        { name: 'taskScheduler', type: 'org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler', scope: 'SINGLETON', role: 'Support', primary: false, lazy: false, contextId: 'application:8080', icon: 'schedule', color: 'text-info' },
    ];

    const requestsData = [
        { method: 'GET', url: '/api/users?page=1', status: '200', time: '120 ms', ip: '192.168.1.10', timestamp: '10:30:15', service: 'user-service', reqId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', payload: '{\n  "page": 1,\n  "limit": 10,\n  "sort": "name",\n  "order": "asc"\n}', response: '{\n  "data": [\n    {\n      "id": 1,\n      "name": "John Doe",\n      "email": "john@example.com"\n    }\n  ],\n  "total": 100,\n  "page": 1,\n  "limit": 10\n}' },
        { method: 'POST', url: '/api/login', status: '401', time: '95 ms', ip: '192.168.1.11', timestamp: '10:30:14', service: 'auth-service', reqId: 'b2c3d4e5-f678-90ab-cdef-1234567890ab', payload: '{\n  "username": "admin@company.com",\n  "password": "••••••••••••"\n}', response: '{\n  "error": "Unauthorized",\n  "message": "Bad credentials"\n}' },
        { method: 'GET', url: '/api/products', status: '200', time: '142 ms', ip: '192.168.1.12', timestamp: '10:30:14', service: 'catalog-service', reqId: 'c3d4e5f6-7890-abcd-ef12-34567890abcd', payload: '{}', response: '{\n  "products": [\n    {\n      "id": 101,\n      "name": "Wireless Mouse",\n      "price": 29.99\n    }\n  ]\n}' },
        { method: 'POST', url: '/api/orders', status: '201', time: '210 ms', ip: '192.168.1.13', timestamp: '10:30:12', service: 'order-service', reqId: 'd4e5f678-90ab-cdef-1234-567890abcdef', payload: '{\n  "productId": 101,\n  "quantity": 2\n}', response: '{\n  "orderId": 99823,\n  "status": "processing"\n}' },
        { method: 'GET', url: '/api/categories', status: '200', time: '98 ms', ip: '192.168.1.14', timestamp: '10:30:11', service: 'catalog-service', reqId: 'e5f67890-abcd-ef12-3456-7890abcdef34', payload: '{}', response: '{\n  "categories": [\n    "Electronics",\n    "Office Supplies"\n  ]\n}' },
        { method: 'PUT', url: '/api/users/123', status: '200', time: '180 ms', ip: '192.168.1.15', timestamp: '10:30:10', service: 'user-service', reqId: 'f67890ab-cdef-1234-5678-90abcdef1234', payload: '{\n  "name": "John Smith"\n}', response: '{\n  "id": 123,\n  "name": "John Smith",\n  "email": "john@example.com"\n}' },
        { method: 'DELETE', url: '/api/users/123', status: '204', time: '76 ms', ip: '192.168.1.16', timestamp: '10:30:09', service: 'user-service', reqId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567891', payload: '{}', response: '' },
        { method: 'POST', url: '/api/checkout', status: '500', time: '620 ms', ip: '192.168.1.17', timestamp: '10:30:08', service: 'payment-service', reqId: 'b2c3d4e5-f678-90ab-cdef-1234567890ac', payload: '{\n  "cartId": "cart-8821",\n  "paymentMethod": "credit_card"\n}', response: '{\n  "error": "Internal Server Error",\n  "message": "Database connection timeout"\n}' },
        { method: 'GET', url: '/api/reports', status: '200', time: '130 ms', ip: '192.168.1.18', timestamp: '10:30:07', service: 'report-service', reqId: 'c3d4e5f6-7890-abcd-ef12-34567890abce', payload: '{}', response: '{\n  "reportId": 4022,\n  "status": "generated"\n}' },
        { method: 'POST', url: '/api/notifications', status: '202', time: '110 ms', ip: '192.168.1.19', timestamp: '10:30:06', service: 'notification-service', reqId: 'd4e5f678-90ab-cdef-1234-567890abcdeg', payload: '{\n  "userId": 1,\n  "channel": "email"\n}', response: '{\n  "status": "queued"\n}' }
    ];

    // ==========================================
    // D3.js Bean Graph Logic & State Variables
    // ==========================================
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

    let root;
    const dataPromise = (async () => {
        try {
            const res = await fetch('./assets/bean-definitions.json');
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

    const NW = 196;
    const NH = 44;
    const RX = 10;
    const GAP_X = 36;
    const GAP_Y = 80;
    const ICON = 'M10 2l8 4v8l-8 4-8-4V6l8-4z M2 6l8 4 M18 6l-8 4 M10 10v8';
    let mode = localStorage.getItem('sl-layout') || 'tb';

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
            return { fill: '#eff6ff', stroke: '#3b82f6', icon: '#3b82f6', text: '#1d4ed8' };
        }
        if (cat === 'intermediate') {
            return { fill: '#f0fdf4', stroke: '#22c55e', icon: '#22c55e', text: '#15803d' };
        }
        if (cat === 'leaf') {
            return { fill: '#fffbeb', stroke: '#eab308', icon: '#eab308', text: '#a16207' };
        }
        return { fill: '#faf5ff', stroke: '#a855f7', icon: '#a855f7', text: '#7e22ce' };
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

    let svg, gLink, gNode, zoom;

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

    function update(event, source) {
        if (!svg || !svg.node()) return;

        const dur = event?.altKey ? 2500 : 300;
        const isTB = mode === 'tb';
        const nodes = root.descendants().reverse();
        const links = root.links();
        const linkColor = '#94a3b8';

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
                return `<div class="text-gray-400 text-xs p-2">${emptyMsg}</div>`;
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
                    <div class="dep-item flex items-center justify-between py-1.5 hover:bg-gray-50 px-2 rounded-md transition-colors">
                        <div class="dep-item-left flex items-center gap-2 cursor-pointer" data-fullname="${depName}">
                            <span class="w-2 h-2 rounded-full bg-${catClass === 'blue' ? 'blue' : (catClass === 'green' ? 'green' : (catClass === 'yellow' ? 'yellow' : 'purple'))}-500"></span>
                            <span class="font-medium text-gray-700 font-mono text-[11px]">${displayName}</span>
                        </div>
                        <span class="dep-link flex items-center text-gray-400 hover:text-gray-600 cursor-pointer" data-fullname="${depName}" title="Focus in graph">
                            <span class="material-symbols-outlined text-[16px]">east</span>
                        </span>
                    </div>
                `;
            }).join('');
        };

        $('#accordion-deps-body').html(buildListHtml(deps, 'No dependencies'));
        $('#accordion-dependents-body').html(buildListHtml(dependents, 'No dependents'));
    }

    function findNodeInTree(node, fullName) {
        if (node.data.fullName === fullName) {
            return node;
        }
        const kids = node.children || node._children;
        if (kids) {
            for (const child of kids) {
                const found = findNodeInTree(child, fullName);
                if (found) return found;
            }
        }
        return null;
    }

    function focusOnBean(fullName) {
        if (!root) return;

        const targetNode = findNodeInTree(root, fullName);
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

    async function initBeanGraph() {
        svg = d3.select('#tree-svg');
        if (!svg.node()) return;

        svg.selectAll('*').remove();

        // Dynamically inject Tailwind styled floating tooltip if it doesn't exist
        if ($('#tip').length === 0) {
            $('body').append(`
                <div id="tip" class="absolute hidden bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-lg pointer-events-none z-50 text-xs text-gray-600 dark:text-gray-300 min-w-[150px] transition-opacity duration-150">
                    <div id="tip-name" class="font-bold text-gray-800 dark:text-white mb-1 font-mono text-[11px]"></div>
                    <div id="tip-type" class="text-[10px] text-gray-500 mb-0.5"></div>
                    <div id="tip-scope" class="text-[10px] text-gray-500 mb-0.5"></div>
                    <div id="tip-meta" class="text-[10px] text-gray-500"></div>
                </div>
            `);
        }

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
            .attr('fill', '#94a3b8');

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
            $('#beanGraph').html(
                `<div style="padding:20px; color:red;">❌ Failed to load bean definitions: ${e.message}</div>`
            );
            return;
        }

        /* Initial render */
        update(null, { x: 0, y: 0, x0: 0, y0: 0 });
        fitView(0);

        setMode(mode);
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

    $(document).on('click', '#btn-control-zoom-in', () => zoomBy(1.25));
    $(document).on('click', '#btn-control-zoom-out', () => zoomBy(0.8));
    $(document).on('click', '#btn-control-fit, #btn-pan-mode', () => fitView());

    $(document).on('click', '#btn-highlight-path', function () {
        isHighlightPathActive = !isHighlightPathActive;
        $(this).toggleClass('bg-primary text-white border-primary hover:bg-primary/90', isHighlightPathActive)
               .toggleClass('bg-white text-gray-700 border-gray-200 hover:bg-gray-50', !isHighlightPathActive);
        if (!isHighlightPathActive) {
            svg.selectAll('.node, .link').classed('dimmed', false).classed('highlighted', false);
        }
    });

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
                '<div class="p-2 text-gray-400 text-xs">No matching beans</div>'
            ).show();
            return;
        }

        const html = matches.map(m => `
            <div class="suggestion-item p-2 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-50 last:border-b-0" data-fullname="${m.fullName}">
                <strong class="text-xs font-semibold text-gray-700 block">${m.displayName}</strong>
                <span class="text-[10px] text-gray-400 block font-mono truncate">${m.type}</span>
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
        $(this).find('.material-symbols-outlined').toggleClass('rotate-90');
        $(this).next('.accordion-body').slideToggle(200);
    });

    function setMode(m) {
        mode = m;
        localStorage.setItem('sl-layout', m);
        $('#btn-tb').toggleClass('bg-white text-gray-800 shadow-sm', m === 'tb')
                    .toggleClass('text-gray-500 hover:text-gray-800', m !== 'tb');
        $('#btn-lr').toggleClass('bg-white text-gray-800 shadow-sm', m === 'lr')
                    .toggleClass('text-gray-500 hover:text-gray-800', m !== 'lr');
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

    // ==========================================
    // Proper Routing System Class
    // ==========================================
    class Router {
        constructor(config = {}) {
            this.routes = config.routes || {};
            this.container = $(config.container || '#main-content');
            this.pagesDir = config.pagesDir || './pages/';
            this.defaultRoute = config.defaultRoute || 'definitions';
            this.templateCache = {};
            this.activeRouteKey = null;
        }

        /**
         * Initialize Route Listeners
         */
        init() {
            $(window).on('hashchange', () => this.resolve());
            
            // Listen to links marked with .nav-link class
            $(document).on('click', '.nav-link', (e) => {
                e.preventDefault();
                const page = $(e.currentTarget).data('page');
                if (page) {
                    this.navigate(page);
                }
            });

            this.resolve();
        }

        /**
         * Programmatic navigation
         */
        navigate(routeKey) {
            window.location.hash = `#/${routeKey}`;
        }

        /**
         * Match active route and load associated template and hooks
         */
        async resolve() {
            const hash = window.location.hash || `#/${this.defaultRoute}`;
            const routeKey = hash.replace('#/', '');
            const route = this.routes[routeKey];

            if (!route) {
                this.navigate(this.defaultRoute);
                return;
            }

            // 1. Run cleanup (onLeave) hook for the previous active route
            if (this.activeRouteKey && this.routes[this.activeRouteKey]?.onLeave) {
                try {
                    this.routes[this.activeRouteKey].onLeave();
                } catch (e) {
                    console.error(`Error executing onLeave hook for route ${this.activeRouteKey}:`, e);
                }
            }

            this.activeRouteKey = routeKey;

            // 2. Render dynamic loading state
            this.container.html(`
                <div class="flex flex-col items-center justify-center h-full gap-3 py-24">
                    <span class="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent"></span>
                    <span class="text-xs font-semibold text-gray-400">Loading module...</span>
                </div>
            `);

            try {
                // 3. Load template (retrieve from cache or fetch via GET)
                let html;
                if (this.templateCache[routeKey]) {
                    html = this.templateCache[routeKey];
                } else {
                    html = await $.get(`${this.pagesDir}${route.template}.html`);
                    this.templateCache[routeKey] = html;
                }

                // 4. Inject into container and update sidebar states
                this.container.html(html);
                this.updateSidebarVisuals(routeKey);

                // 5. Run setup (onEnter) hook for the newly active route
                if (route.onEnter) {
                    route.onEnter();
                }

            } catch (error) {
                console.error(`Routing error loading template for ${routeKey}:`, error);
                this.container.html(`
                    <div class="flex flex-col items-center justify-center h-full p-8 text-center bg-white m-6 rounded-xl border border-gray-200 shadow-sm">
                        <span class="material-symbols-outlined text-red-500 text-5xl mb-4">error</span>
                        <h3 class="text-lg font-bold text-gray-800 mb-1">Application Error</h3>
                        <p class="text-sm text-gray-500 max-w-sm mb-4">Could not load this module. Please ensure the backend is active.</p>
                        <button id="retry-load-btn" class="px-4 py-2 bg-primary hover:bg-primary/95 text-white rounded-md text-sm font-semibold transition-colors">Retry</button>
                    </div>
                `);
                $('#retry-load-btn').off('click').on('click', () => this.resolve());
            }
        }

        /**
         * Manage visual sidebar selections
         */
        updateSidebarVisuals(activePage) {
            $('aside nav a').each(function() {
                const pageAttr = $(this).data('page');
                const isSubLink = $(this).parent().parent().hasClass('ml-10') || $(this).parent().hasClass('ml-10');
                
                if (pageAttr === activePage) {
                    if (isSubLink) {
                        $(this).addClass('text-primary').removeClass('text-gray-500 hover:text-gray-800');
                    } else {
                        $(this)
                            .addClass('text-primary bg-primary-light border-l-2 border-primary')
                            .removeClass('text-gray-500 hover:text-gray-800 hover:bg-gray-50');
                    }
                } else {
                    if (isSubLink) {
                        $(this).removeClass('text-primary').addClass('text-gray-500 hover:text-gray-800');
                    } else {
                        $(this)
                            .removeClass('text-primary bg-primary-light border-l-2 border-primary')
                            .addClass('text-gray-500 hover:text-gray-800 hover:bg-gray-50');
                    }
                }
            });
        }
    }

    // ==========================================
    // Instantiate and Configure Routes
    // ==========================================
    const appRouter = new Router({
        container: '#main-content',
        pagesDir: './pages/',
        defaultRoute: 'definitions',
        routes: {
            'request': {
                template: 'request',
                onEnter: () => {
                    renderRequestsTable();
                    setupRequestsListeners();
                },
                onLeave: () => {
                    $('#request-details-sidebar').hide();
                }
            },
            'definitions': {
                template: 'definitions',
                onEnter: () => {
                    renderTable();
                    initCharts();
                },
                onLeave: () => {
                    cleanupCharts();
                }
            },
            'graph': {
                template: 'graph',
                onEnter: () => {
                    initBeanGraph();
                },
                onLeave: () => {
                    $('#details-sidebar').hide();
                    if ($('#tip').length) {
                        $('#tip').removeClass('show');
                    }
                }
            },
            'conditions': {
                template: 'conditions',
                onEnter: () => {
                    renderTable();
                    initCharts();
                },
                onLeave: () => {
                    cleanupCharts();
                }
            }
        }
    });

    // Start Router
    appRouter.init();

    function cleanupCharts() {
        if (charts.scopeChart) {
            charts.scopeChart.destroy();
            charts.scopeChart = null;
        }
        if (charts.roleChart) {
            charts.roleChart.destroy();
            charts.roleChart = null;
        }
    }


    // --- Existing UI Logic ---

    function renderTable() {
        const tbody = document.getElementById('beanTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';

        beansData.forEach(bean => {
            const primaryIcon = bean.primary
                ? `<span class="material-symbols-outlined text-[18px] text-success" style="font-variation-settings: 'FILL' 1;">check_circle</span>`
                : `<span class="material-symbols-outlined text-[18px] text-gray-300">radio_button_unchecked</span>`;

            const lazyIcon = bean.lazy
                ? `<span class="material-symbols-outlined text-[18px] text-success" style="font-variation-settings: 'FILL' 1;">check_circle</span>`
                : `<span class="material-symbols-outlined text-[18px] text-gray-300">radio_button_unchecked</span>`;

            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50 cursor-pointer transition-colors';
            row.innerHTML = `
            <td class="px-5 py-3">
                <div class="flex items-center gap-2">
                    <span class="material-symbols-outlined text-[16px] ${bean.color}">${bean.icon}</span>
                    <span class="font-medium text-gray-800">${bean.name}</span>
                </div>
            </td>
            <td class="px-5 py-3 font-mono text-[11px] text-gray-500 truncate max-w-[200px]" title="${bean.type}">${bean.type}</td>
            <td class="px-5 py-3">
                <span class="px-2 py-0.5 rounded-sm bg-success-light text-success text-[10px] font-bold tracking-wide">${bean.scope}</span>
            </td>
            <td class="px-5 py-3 text-gray-600">${bean.role}</td>
            <td class="px-5 py-3 text-center">${primaryIcon}</td>
            <td class="px-5 py-3 text-center">${lazyIcon}</td>
            <td class="px-5 py-3 font-mono text-[11px] text-gray-500">${bean.contextId}</td>
            <td class="px-5 py-3 text-right">
                <button class="text-gray-400 hover:text-gray-600">
                    <span class="material-symbols-outlined text-[18px]">more_vert</span>
                </button>
            </td>
        `;
            tbody.appendChild(row);
        });
    }

    function initCharts() {
        const scopeCtx = document.getElementById('scopeChart');
        if (scopeCtx) {
            charts.scopeChart = new Chart(scopeCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Singleton', 'Prototype', 'Session', 'Request'],
                    datasets: [{
                        data: [34, 10, 8, 23],
                        backgroundColor: ['#6b46c1', '#3b82f6', '#22c55e', '#f59e0b'],
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

        const roleCtx = document.getElementById('roleChart');
        if (roleCtx) {
            charts.roleChart = new Chart(roleCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Application', 'Support', 'Infrastructure'],
                    datasets: [{
                        data: [64, 20, 16],
                        backgroundColor: ['#3b82f6', '#f59e0b', '#e2e8f0'],
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
    }

    function renderRequestsTable() {
        const tbody = document.getElementById('requestTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';

        const searchVal = $('#request-search').val()?.toLowerCase().trim() || '';
        const filterMethod = $('#request-filter-method').val() || '';
        const filterStatus = $('#request-filter-status').val() || '';
        const filterService = $('#request-filter-service').val() || '';

        const filtered = requestsData.filter(req => {
            if (searchVal && !req.url.toLowerCase().includes(searchVal) && !req.ip.includes(searchVal) && !req.reqId.includes(searchVal)) {
                return false;
            }
            if (filterMethod && req.method !== filterMethod) {
                return false;
            }
            if (filterStatus && req.status !== filterStatus) {
                return false;
            }
            if (filterService && req.service !== filterService) {
                return false;
            }
            return true;
        });

        $('#request-pagination-info').text(`Showing 1 to ${filtered.length} of ${filtered.length} requests`);

        filtered.forEach(req => {
            const methodClass = req.method.toLowerCase();
            let statusColor = "green";
            if (req.status.startsWith("4")) statusColor = "amber";
            if (req.status.startsWith("5")) statusColor = "red";

            const methodPillStyles = {
                get: 'bg-blue-50 text-blue-700 border-blue-100',
                post: 'bg-green-50 text-green-700 border-green-100',
                put: 'bg-amber-50 text-amber-700 border-amber-100',
                delete: 'bg-red-50 text-red-700 border-red-100'
            };

            const statusPillStyles = {
                green: 'bg-success-light text-success border-success/15',
                amber: 'bg-amber-50 text-warning border-warning/15',
                red: 'bg-red-50 text-red-600 border-red-200'
            };

            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50 cursor-pointer transition-colors';
            row.innerHTML = `
                <td class="px-5 py-3">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold inline-block border ${methodPillStyles[methodClass] || 'bg-gray-50 text-gray-700 border-gray-200'}">${req.method}</span>
                </td>
                <td class="px-5 py-3 font-mono text-[11px] text-gray-700 truncate max-w-[200px]" title="${req.url}">${req.url}</td>
                <td class="px-5 py-3">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold inline-block border ${statusPillStyles[statusColor]}">${req.status}</span>
                </td>
                <td class="px-5 py-3 text-gray-600">${req.time}</td>
                <td class="px-5 py-3 font-mono text-[11px] text-gray-500">${req.ip}</td>
                <td class="px-5 py-3 text-gray-600">${req.timestamp}</td>
                <td class="px-5 py-3 text-right">
                    <button class="px-3 py-1 bg-primary/10 hover:bg-primary/20 text-primary rounded-md text-xs font-semibold transition-colors cursor-pointer btn-request-view animate-none" data-id="${req.reqId}">
                        View
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    function setupRequestsListeners() {
        $('#request-search').off('input').on('input', renderRequestsTable);
        $('#request-filter-method, #request-filter-status, #request-filter-service').off('change').on('change', renderRequestsTable);
        
        $('#btn-refresh-requests').off('click').on('click', function() {
            const btn = $(this);
            btn.find('span').addClass('animate-spin');
            setTimeout(() => {
                renderRequestsTable();
                btn.find('span').removeClass('animate-spin');
            }, 550);
        });

        $(document).off('click', '.btn-request-view').on('click', '.btn-request-view', function(e) {
            e.stopPropagation();
            const id = $(this).data('id');
            const req = requestsData.find(r => r.reqId === id);
            if (!req) return;

            $('#req-detail-url').text(req.url);
            $('#req-detail-service').text(req.service);
            
            const methodClass = req.method.toLowerCase();
            let statusColor = "green";
            if (req.status.startsWith("4")) statusColor = "amber";
            if (req.status.startsWith("5")) statusColor = "red";

            const methodPillStyles = {
                get: 'bg-blue-50 text-blue-700 border-blue-100',
                post: 'bg-green-50 text-green-700 border-green-100',
                put: 'bg-amber-50 text-amber-700 border-amber-100',
                delete: 'bg-red-50 text-red-700 border-red-100'
            };

            const statusPillStyles = {
                green: 'bg-success-light text-success border-success/15',
                amber: 'bg-amber-50 text-warning border-warning/15',
                red: 'bg-red-50 text-red-600 border-red-200'
            };

            $('#req-detail-method')
                .text(req.method)
                .attr('class', `px-2 py-0.5 rounded text-[10px] font-bold inline-block border ${methodPillStyles[methodClass] || 'bg-gray-50 text-gray-700 border-gray-200'}`);

            $('#req-detail-status')
                .text(req.status)
                .attr('class', `px-2 py-0.5 rounded text-[10px] font-bold inline-block border ${statusPillStyles[statusColor]}`);

            $('#req-detail-time').text(req.time);
            $('#req-detail-ip').text(req.ip);
            $('#req-detail-timestamp').text(`May 14, 2024 ${req.timestamp} AM`);
            $('#req-detail-payload').text(req.payload);
            $('#req-detail-response').text(req.response || 'No response content');
            $('#req-detail-id').text(req.reqId);

            $('#request-details-sidebar').show();
        });

        $('#btn-close-request-sidebar').off('click').on('click', () => {
            $('#request-details-sidebar').hide();
        });

        $('#btn-copy-payload').off('click').on('click', function() {
            const code = $('#req-detail-payload').text();
            copyTextToClipboard($(this), code);
        });

        $('#btn-copy-response').off('click').on('click', function() {
            const code = $('#req-detail-response').text();
            copyTextToClipboard($(this), code);
        });
    }

    function copyTextToClipboard(btn, text) {
        navigator.clipboard.writeText(text).then(() => {
            const originalHtml = btn.html();
            btn.html('<span class="material-symbols-outlined text-[12px]">done</span> Copied');
            btn.addClass('text-success').removeClass('text-gray-500');
            setTimeout(() => {
                btn.html(originalHtml);
                btn.removeClass('text-success').addClass('text-gray-500');
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
        });
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