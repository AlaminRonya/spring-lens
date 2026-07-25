import { NW, NH, RX, GAP_X, GAP_Y, ICON, ZOOM_SCALE_EXTENT, TEMPLATES } from './constants.js';
import { css, getBeanCategory, nodeStyle, tbLink, lrLink, tree } from './utils.js';
import { BeanTreeBuilder } from './bean-data-loader.js';

export default class BeanGraph {

    constructor(dataLoader) {
        this.dataLoader = dataLoader;
        this.root = null;
        this.mode = localStorage.getItem('sl-layout') || 'tb';
        this.svg = null;
        this.gLink = null;
        this.gNode = null;
        this.zoom = null;
        this.isHighlightPathActive = false;
        
        this.initEvents();
    }

    /**
     * Entry point for the D3 Bean Graph view.
     * Sets up SVG structural elements, registers zoom/drag handlers, loads data,
     * and performs the initial draw/fit.
     */
    async enter() {
        this.svg = d3.select('#tree-svg');
        if (!this.svg.node()) return;

        this.svg.selectAll('*').remove();

        this._injectTooltip();
        const gMain = this._setupSvgContainers();
        this._setupZoom(gMain);

        try {
            this.root = await this.dataLoader.load();
            this._updateToolbarCounts();
        } catch (error) {
            $('#beanGraph').html(
                `<div class="p-5 text-red-500 font-semibold">❌ Failed to load bean definitions: ${error.message}</div>`
            );
            return;
        }

        /* Initial render */
        this.update(null, { x: 0, y: 0, x0: 0, y0: 0 });
        this.fitView(0);
        this.setMode(this.mode);

        if (window.focusBeanOnNextGraphEnter) {
            const targetBean = window.focusBeanOnNextGraphEnter;
            window.focusBeanOnNextGraphEnter = null;
            setTimeout(() => {
                this.focusOnBean(targetBean);
            }, 300);
        }
    }

    /**
     * Injects the floating HTML tooltip if it doesn't already exist in the DOM.
     * @private
     */
    _injectTooltip() {
        if ($('#tip').length === 0) {
            $('body').append(TEMPLATES.tooltip);
        }
    }

    /**
     * Appends markers (defs) and container groups to the SVG canvas.
     * @private
     * @returns {d3.Selection} The main zoomable container group.
     */
    _setupSvgContainers() {
        const gMain = this.svg.append('g').attr('id', 'g-main');

        this._createMarker('dot', {
            viewBox: '0 0 10 10',
            refX: 9,
            refY: 5,
            markerUnits: 'userSpaceOnUse',
            markerWidth: 10,
            markerHeight: 10,
            orient: 'auto',
            circle: { cx: 5, cy: 5, r: 4, fill: '#94a3b8' }
        });

        this.gLink = gMain.append('g').attr('class', 'links');
        this.gNode = gMain.append('g').attr('class', 'nodes');

        return gMain;
    }

    /**
     * Declaratively appends an SVG marker definition to the defs container.
     * @private
     * @param {string} id - Unique HTML identifier for the marker.
     * @param {Object} config - Attribute mapping config, containing nested element definitions (like circle).
     */
    _createMarker(id, config) {
        const { circle, ...markerAttrs } = config;
        const marker = this.svg.append('defs')
            .append('marker')
            .attr('id', id);

        for (const [key, value] of Object.entries(markerAttrs)) {
            marker.attr(key, value);
        }

        if (circle) {
            const circleNode = marker.append('circle');
            for (const [key, value] of Object.entries(circle)) {
                circleNode.attr(key, value);
            }
        }
    }

    /**
     * Configures the zoom behavior and registers it to the SVG canvas.
     * @private
     * @param {d3.Selection} gMain - The main container group to transform.
     */
    _setupZoom(gMain) {
        this.zoom = d3.zoom()
            .scaleExtent(ZOOM_SCALE_EXTENT)
            .on('zoom', ({ transform }) => {
                gMain.attr('transform', transform);
                this.updateZoomPercent(transform.k);
            });

        this.svg.call(this.zoom)
            .on('click', () => $('#details-sidebar').hide());
    }

    /**
     * Updates the toolbar with total bean count and dependency count if definitions are loaded.
     * @private
     */
    _updateToolbarCounts() {
        if (window.allBeansMap) {
            $('#beans-count').text(window.allBeansMap.size);
            const totalDeps = Array.from(window.allBeansMap.values()).reduce(
                (acc, { dependencies = [] }) => acc + dependencies.length,
                0
            );
            $('#deps-count').text(totalDeps);
        }
    }

    leave() {
        $('#details-sidebar').hide();
        if ($('#tip').length) {
            $('#tip').removeClass('show');
        }
    }

    /**
     * Shows the hovering tooltip for a given node, updating its text content and position.
     * @param {MouseEvent} event - The mouse event trigger.
     * @param {d3.HierarchyNode} node - The hovered hierarchy node.
     */
    showTip({ pageX, pageY }, node) {
        const { data: { name, meta = {} }, depth, _children = [] } = node;
        const { type, scope, role, deps, dependents } = meta;
        const childrenCount = _children.length;

        const typeLabel = type ? `Type: ${type.split('.').pop()}` : '';
        const scopeLabel = scope ? `Scope: ${scope}${role ? ` · ${role}` : ''}` : '';

        let metaText;
        if (deps !== undefined) {
            metaText = `Deps: ${deps} · Dependents: ${dependents} · Children: ${childrenCount}`;
        } else {
            metaText = childrenCount > 0 
                ? `${childrenCount} child bean(s) · depth ${depth}` 
                : `Leaf · depth ${depth}`;
        }

        $('#tip-name').text(name);
        $('#tip-type').text(typeLabel);
        $('#tip-scope').text(scopeLabel);
        $('#tip-meta').text(metaText);
        $('#tip').addClass('show').css({ left: pageX + 14, top: pageY - 10 });
    }

    /**
     * Highlights the upward ancestor path and downward descendant path for a node,
     * dimming all other nodes and links in the graph.
     * @param {d3.HierarchyNode} node - The target node to highlight path for.
     */
    highlightPathForNode(node) {
        if (!this.isHighlightPathActive) return;

        const pathNodes = new Set(node.ancestors());
        node.descendants().forEach(descendantNode => pathNodes.add(descendantNode));

        this.svg.selectAll('.node')
            .classed('dimmed', itemNode => !pathNodes.has(itemNode))
            .classed('highlighted', itemNode => pathNodes.has(itemNode));

        this.svg.selectAll('.link')
            .classed('dimmed', link => !pathNodes.has(link.source) || !pathNodes.has(link.target))
            .classed('highlighted', link => pathNodes.has(link.source) && pathNodes.has(link.target));
    }

    /**
     * Clears any active path highlights and restores original opacity/colors.
     */
    resetPathHighlight() {
        if (!this.isHighlightPathActive) return;
        this.svg.selectAll('.node, .link')
            .classed('dimmed', false)
            .classed('highlighted', false);
    }

    /**
     * Re-renders the SVG graph nodes and links based on the current layout state.
     * @param {Event|null} event - The triggering UI event (if any).
     * @param {Object} source - The source coordinate origin/destination for transition animations.
     */
    update(event, source) {
        if (!this.svg || !this.svg.node() || !this.root) return;

        const duration = event?.altKey ? 2500 : 300;
        const isTB = this.mode === 'tb';
        const nodes = this.root.descendants().reverse();
        const links = this.root.links();
        const linkColor = '#94a3b8';

        // Calculate node widths using the existing array to avoid redundant array creation
        nodes.forEach(node => {
            const name = node.data.name || '';
            node.width = Math.max(160, name.length * 7.2 + 56);
        });

        this._calculateLayout(nodes, isTB);

        const transition = d3.transition().duration(duration);

        this._drawNodes(nodes, transition, isTB, source);
        this._drawLinks(links, transition, isTB, source, linkColor);

        // Store positions for future animations
        this.root.eachBefore(node => {
            node.x0 = node.x;
            node.y0 = node.y;
        });

        const visibleCount = this.root.descendants().filter(node => node.depth === 0 || node.parent?.children).length;
        $('#nodeCount strong').text(visibleCount);
    }

    /**
     * Computes the positions and dimensions of the tree layout.
     * @private
     * @param {d3.HierarchyNode[]} nodes - All hierarchy nodes.
     * @param {boolean} isTB - Whether layout direction is top-to-bottom.
     */
    _calculateLayout(nodes, isTB) {
        const maxWidth = d3.max(nodes, node => node.width) || NW;
        if (isTB) {
            tree.nodeSize([maxWidth + GAP_X, NH + GAP_Y]);
        } else {
            tree.nodeSize([NH + 28, maxWidth + GAP_Y]);
        }
        tree(this.root);
    }

    /**
     * Draws/updates SVG node elements (rect, icon, text) with transition animations.
     * @private
     * @param {d3.HierarchyNode[]} nodes - Active hierarchy nodes.
     * @param {d3.Transition} transition - D3 transition instance.
     * @param {boolean} isTB - Layout direction (top-to-bottom).
     * @param {Object} source - Animated origin/destination source coordinates.
     */
    _drawNodes(nodes, transition, isTB, source) {
        const srcPos = s => isTB
            ? `translate(${s.x0 ?? s.x},${s.y0 ?? s.y})`
            : `translate(${s.y0 ?? s.y},${s.x0 ?? s.x})`;

        const nodePos = node => isTB ? `translate(${node.x},${node.y})` : `translate(${node.y},${node.x})`;

        const nodeSelection = this.gNode.selectAll('g.node').data(nodes, node => node.id);

        const enter = nodeSelection.enter().append('g')
            .attr('class', 'node')
            .attr('cursor', 'pointer')
            .attr('transform', () => srcPos(source))
            .attr('fill-opacity', 0)
            .on('click', (event, node) => {
                event.stopPropagation();
                node.children = node.children ? null : node._children;
                this.update(event, node);
                this.selectNode(node);
                $('#tip').removeClass('show');
            })
            .on('mouseenter', (event, node) => {
                this.showTip(event, node);
                this.highlightPathForNode(node);
            })
            .on('mousemove', event => $('#tip').css({ left: event.pageX + 14, top: event.pageY - 10 }))
            .on('mouseleave', () => {
                $('#tip').removeClass('show');
                this.resetPathHighlight();
            });

        enter.append('rect')
            .attr('class', 'node-rect')
            .attr('y', -NH / 2)
            .attr('height', NH)
            .attr('rx', RX)
            .attr('stroke-width', 1.8);

        enter.append('g')
            .attr('class', 'node-icon')
            .append('path')
            .attr('d', ICON)
            .attr('stroke-width', 1.5)
            .attr('stroke-linecap', 'round')
            .attr('stroke-linejoin', 'round')
            .attr('fill', 'none');

        enter.append('text')
            .attr('class', 'node-text')
            .attr('y', 1)
            .attr('dy', '0.35em')
            .attr('font-size', 13)
            .attr('font-weight', 500)
            .attr('font-family', 'Inter, sans-serif');

        const mergedNodes = nodeSelection.merge(enter);
        const mergedTransition = mergedNodes.transition(transition)
            .attr('transform', nodePos)
            .attr('fill-opacity', 1);

        this._updateNodeStylesAndContent(mergedTransition);

        nodeSelection.exit().transition(transition).remove()
            .attr('transform', () => isTB
                ? `translate(${source.x},${source.y})`
                : `translate(${source.y},${source.x})`)
            .attr('fill-opacity', 0);
    }

    /**
     * Updates layout dimensions, styles, and text content of nodes inside a transition or selection.
     * @private
     * @param {d3.Selection|d3.Transition} selection - Target D3 selection/transition container.
     */
    _updateNodeStylesAndContent(selection) {
        selection.select('.node-rect')
            .attr('x', node => -node.width / 2)
            .attr('width', node => node.width)
            .attr('fill', node => nodeStyle(node).fill)
            .attr('stroke', node => nodeStyle(node).stroke);

        selection.select('.node-icon')
            .attr('transform', node => `translate(${-node.width / 2 + 14}, -10)`);

        selection.select('.node-icon path')
            .attr('stroke', node => nodeStyle(node).icon);

        selection.select('.node-text')
            .attr('x', node => -node.width / 2 + 42)
            .attr('fill', node => nodeStyle(node).text)
            .text(node => node.data.name);
    }

    /**
     * Draws/updates SVG path connection links with transition animations.
     * @private
     * @param {Object[]} links - Array of source/target hierarchy link pairs.
     * @param {d3.Transition} transition - D3 transition instance.
     * @param {boolean} isTB - Layout direction (top-to-bottom).
     * @param {Object} source - Origin/destination source coordinates.
     * @param {string} linkColor - Stroke color of the connection path.
     */
    _drawLinks(links, transition, isTB, source, linkColor) {
        const linkFn = isTB ? tbLink : lrLink;
        const linkSelection = this.gLink.selectAll('path.link').data(links, link => link.target.id);

        const enter = linkSelection.enter().append('path')
            .attr('class', 'link')
            .attr('fill', 'none')
            .attr('stroke', linkColor)
            .attr('stroke-width', 1.5)
            .attr('marker-end', 'url(#dot)')
            .attr('d', () => {
                const o = { x: source.x0 ?? source.x, y: source.y0 ?? source.y };
                return linkFn({ source: o, target: o });
            });

        linkSelection.merge(enter).transition(transition)
            .attr('stroke', linkColor)
            .attr('d', linkFn);

        linkSelection.exit().transition(transition).remove()
            .attr('d', () => linkFn({ source, target: source }));
    }

    zoomBy(factor, duration = 300) {
        if (!this.svg || !this.zoom) return;
        this.svg.transition()
            .duration(duration)
            .call(this.zoom.scaleBy, factor);
    }

    /**
     * Rescales and pans the SVG canvas so that all nodes are visible and centered.
     * @param {number} [duration=500] - Animation duration in milliseconds.
     * @param {number} [padding=60] - Padding around the graph boundary.
     * @param {number} [minScale=0.15] - Minimum zoom scale allowed when fitting.
     * @param {number} [maxScale=1.5] - Maximum zoom scale allowed when fitting.
     */
    fitView(duration = 500, padding = 60, minScale = 0.15, maxScale = 1.5) {
        if (!this.svg || !this.svg.node() || !this.root) return;

        const width = $('#beanGraph').width() || 800;
        const height = $('#beanGraph').height() || 600;

        const nodes = this.root.descendants();
        if (nodes.length === 0) return;

        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        nodes.forEach(({ x, y }) => {
            const nx = this.mode === 'tb' ? x : y;
            const ny = this.mode === 'tb' ? y : x;

            if (nx < minX) minX = nx;
            if (nx > maxX) maxX = nx;
            if (ny < minY) minY = ny;
            if (ny > maxY) maxY = ny;
        });

        const maxNodeW = d3.max(nodes, ({ width: nodeWidth }) => nodeWidth) || NW;
        const graphW = (maxX - minX) + maxNodeW + padding * 2;
        const graphH = (maxY - minY) + NH + padding * 2;

        const centerX = minX + (maxX - minX) / 2;
        const centerY = minY + (maxY - minY) / 2;

        let scale = Math.min(width / graphW, height / graphH);
        scale = Math.max(minScale, Math.min(maxScale, scale));

        const tx = width / 2 - centerX * scale;
        const ty = height / 2 - centerY * scale;

        this.svg.transition()
            .duration(duration)
            .call(this.zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
    }

    updateZoomPercent(k) {
        $('#zoom-percent').text(Math.round(k * 100) + '%');
    }

    /**
     * Focuses on a specific node, showing the details sidebar with metadata,
     * dependency lists, and category tags.
     * @param {d3.HierarchyNode} node - The selected node.
     */
    selectNode(node) {
        const { data: { name, fullName, meta: { type = 'N/A', scope = 'singleton' } = {} } } = node;

        $('#details-sidebar').show();
        $('#detail-bean-name').text(name);
        $('#detail-bean-type').text(type);

        const isDark = document.documentElement.classList.contains('dark');
        const isSingleton = scope === 'singleton';
        const bg = isDark 
            ? (isSingleton ? 'rgba(126, 34, 206, 0.15)' : 'rgba(16, 185, 129, 0.15)') 
            : (isSingleton ? '#f3e8ff' : '#ecfdf5');
        const fg = isDark 
            ? (isSingleton ? '#d8b4fe' : '#a7f3d0') 
            : (isSingleton ? '#7e22ce' : '#047857');
        const border = isDark 
            ? (isSingleton ? 'rgba(126, 34, 206, 0.3)' : 'rgba(16, 185, 129, 0.3)') 
            : (isSingleton ? '#d8b4fe' : '#bbf7d0');

        $('#detail-bean-scope').text(scope)
            .css({
                background: bg,
                color: fg,
                'border-color': border
            });

        const beanRecord = window.allBeansMap?.get(fullName);
        const deps = beanRecord?.dependencies || [];
        const dependents = beanRecord?.dependents || [];

        $('#detail-deps-count').text(deps.length);
        $('#detail-dependents-count').text(dependents.length);

        const categoryColors = {
            intermediate: 'green',
            leaf: 'yellow',
            adapter: 'purple'
        };

        const buildListHtml = (names, emptyMsg) => {
            if (names.length === 0) {
                return `<div class="text-gray-400 text-xs p-2">${emptyMsg}</div>`;
            }

            return names.map(depName => {
                const depRecord = window.allBeansMap?.get(depName);
                const displayName = BeanTreeBuilder._displayName(depName);

                let catColor = 'blue';
                if (depRecord) {
                    const cat = getBeanCategory({ fullName: depName, meta: { type: depRecord.type } });
                    catColor = categoryColors[cat] || 'blue';
                }

                return TEMPLATES.dependencyItem({ depName, displayName, catColor });
            }).join('');
        };

        $('#accordion-deps-body').html(buildListHtml(deps, 'No dependencies'));
        $('#accordion-dependents-body').html(buildListHtml(dependents, 'No dependents'));
    }

    findNodeInTree(node, fullName) {
        if (node.data.fullName === fullName) {
            return node;
        }
        const kids = node.children || node._children;
        if (kids) {
            for (const child of kids) {
                const found = this.findNodeInTree(child, fullName);
                if (found) return found;
            }
        }
        return null;
    }

    /**
     * Focuses on a target bean definition by expanding all its parent nodes
     * (if collapsed), panning the graph, zooming in on the target node,
     * and displaying its details in the sidebar.
     * @param {string} fullName - Full identifier name of the bean definition.
     */
    focusOnBean(fullName) {
        if (!this.root) return;

        const targetNode = this.findNodeInTree(this.root, fullName);
        if (!targetNode) {
            console.warn('Bean not found in active tree layout:', fullName);
            return;
        }

        let currentNode = targetNode.parent;
        let needsUpdate = false;
        while (currentNode) {
            const { _children, children } = currentNode;
            if (_children && !children) {
                currentNode.children = _children;
                needsUpdate = true;
            }
            currentNode = currentNode.parent;
        }

        if (needsUpdate) {
            this.update(null, this.root);
        }

        const width = $('#beanGraph').width() || 800;
        const height = $('#beanGraph').height() || 600;
        const isTopBottom = this.mode === 'tb';
        
        const { x: nodeX, y: nodeY } = targetNode;
        const targetX = isTopBottom ? nodeX : nodeY;
        const targetY = isTopBottom ? nodeY : nodeX;

        const zoomScale = 1.2;
        const translateX = width / 2 - targetX * zoomScale;
        const translateY = height / 2 - targetY * zoomScale;

        this.svg.transition()
            .duration(500)
            .call(this.zoom.transform, d3.zoomIdentity.translate(translateX, translateY).scale(zoomScale));

        this.selectNode(targetNode);
    }

    /**
     * Toggles layout direction mode ('tb' for top-to-bottom or 'lr' for left-to-right),
     * persists it in localStorage, updates button styles, and redraws the graph.
     * @param {string} layoutMode - The target direction mode ('tb' or 'lr').
     */
    setMode(layoutMode) {
        this.mode = layoutMode;
        localStorage.setItem('sl-layout', layoutMode);

        const isTopBottom = layoutMode === 'tb';
        $('#btn-tb').toggleClass('bg-white text-gray-800 shadow-sm', isTopBottom)
                    .toggleClass('text-gray-500 hover:text-gray-800', !isTopBottom);
        $('#btn-lr').toggleClass('bg-white text-gray-800 shadow-sm', !isTopBottom)
                    .toggleClass('text-gray-500 hover:text-gray-800', isTopBottom);

        if (this.root) {
            this.root.eachBefore(node => {
                node.x0 = node.x;
                node.y0 = node.y;
            });
            const { x = 0, y = 0, x0 = 0, y0 = 0 } = this.root;
            this.update(null, { x, y, x0, y0 });
            this.fitView(500);
        }
    }

    /**
     * Recomputes graph positions and centers the view upon browser window resizing.
     */
    handleResize() {
        if (this.root) {
            this.update(null, this.root);
            this.fitView(100);
        }
    }

    /**
     * Binds document-level event listeners for graph controls, sidebar actions,
     * text search input/suggestions, layout modes, and collapsible drawers.
     */
    initEvents() {
        $(document).on('click', '#btn-expand', () => {
            if (!this.root) return;
            this.root.eachBefore(node => node.children = node._children);
            this.update(null, this.root);
            this.fitView(500);
        });

        $(document).on('click', '#btn-collapse', () => {
            if (!this.root) return;
            this.root.eachBefore(node => {
                if (node.depth > 0) {
                    node.children = null;
                }
            });
            this.update(null, this.root);
            this.fitView(500);
        });

        $(document).on('click', '#btn-reset', () => {
            if (!this.root) return;
            this.root.eachBefore(node => node.children = node.depth === 0 ? node._children : null);
            this.update(null, this.root);
            this.fitView(500);
        });

        $(document).on('click', '#btn-control-zoom-in', () => this.zoomBy(1.25));
        $(document).on('click', '#btn-control-zoom-out', () => this.zoomBy(0.8));
        $(document).on('click', '#btn-control-fit, #btn-pan-mode', () => this.fitView());

        $(document).on('click', '#btn-highlight-path', (event) => {
            const targetButton = $(event.currentTarget);
            this.isHighlightPathActive = !this.isHighlightPathActive;
            targetButton.toggleClass('bg-primary text-white border-primary hover:bg-primary/90', this.isHighlightPathActive)
                        .toggleClass('bg-white text-gray-700 border-gray-200 hover:bg-gray-50', !this.isHighlightPathActive);
            if (!this.isHighlightPathActive && this.svg) {
                this.svg.selectAll('.node, .link').classed('dimmed', false).classed('highlighted', false);
            }
        });

        $(document).on('input', '#search-input', (event) => {
            const searchQuery = $(event.currentTarget).val().toLowerCase().trim();
            const suggestionsBox = $('#search-suggestions');

            if (!searchQuery) {
                suggestionsBox.hide();
                return;
            }

            if (!window.allBeansMap) return;

            const matches = [];
            for (const [fullName, record] of window.allBeansMap.entries()) {
                const displayName = BeanTreeBuilder._displayName(fullName);
                if (displayName.toLowerCase().includes(searchQuery) || fullName.toLowerCase().includes(searchQuery)) {
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

            const html = matches.map(match => TEMPLATES.suggestionItem(match)).join('');
            suggestionsBox.html(html).show();
        });

        $(document).on('click', (event) => {
            if (!$(event.target).closest('.search-box').length) {
                $('#search-suggestions').hide();
            }
        });

        $(document).on('click', '.suggestion-item', (event) => {
            const fullName = $(event.currentTarget).data('fullname');
            $('#search-input').val('');
            $('#search-suggestions').hide();
            this.focusOnBean(fullName);
        });

        $(document).on('click', '.dep-item-left, .dep-link', (event) => {
            event.stopPropagation();
            const fullName = $(event.currentTarget).data('fullname');
            this.focusOnBean(fullName);
        });

        $(document).on('click', '#btn-close-sidebar', () => {
            $('#details-sidebar').hide();
        });

        $(document).on('click', '.accordion-header', (event) => {
            const header = $(event.currentTarget);
            header.toggleClass('open');
            header.find('.material-symbols-outlined').toggleClass('rotate-90');
            header.next('.accordion-body').slideToggle(200);
        });

        $(document).on('click', '#btn-tb', () => this.setMode('tb'));
        $(document).on('click', '#btn-lr', () => this.setMode('lr'));

        document.addEventListener('themechanged', () => {
            if (this.root) {
                this.update(null, this.root);
            }
        });
    }
}