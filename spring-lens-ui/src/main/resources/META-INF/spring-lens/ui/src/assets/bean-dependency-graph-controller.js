import {GAP_X, GAP_Y, ICON, NH, NW, RX, TEMPLATES, ZOOM_SCALE_EXTENT} from './constants.js';
import {getBeanCategory, lrLink, nodeStyle, tbLink, tree} from './utils.js';
import {BeanTreeBuilder} from './bean-tree-builder.js';
import httpClient from "./http-client.js";

export class BeanDependencyGraphController {

    constructor(dependencyGraphApi) {
        this.root = null;
        this.svg = null;
        this.gLink = null;
        this.gNode = null;
        this.zoom = null;
        this.beanDependencies = null;
        this.isHighlightPathActive = false;
        this.dependencyGraphApi = dependencyGraphApi;
        this.mode = localStorage.getItem('sl-layout') ?? 'tb';

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


        $('#btn-reload-graph').off('click').on('click', async () => {
            await this.reloadGraphData();
        });

        try {
            await this._fetchBeanDependencies();
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

        if (!window.focusBeanOnNextGraphEnter) return;

        const targetBean = window.focusBeanOnNextGraphEnter;
        window.focusBeanOnNextGraphEnter = null;
        setTimeout(() => this.focusOnBean(targetBean), 300);
    }

    async _fetchBeanDependencies() {
        this.beanDependencies = await httpClient.get(this.dependencyGraphApi);
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

        if (!circle) return;

        const circleNode = marker.append('circle');
        for (const [key, value] of Object.entries(circle)) {
            circleNode.attr(key, value);
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
        if (!window.allBeansMap) return;

        $('#beans-count').text(window.allBeansMap.size);

        let totalDeps = 0;
        for (const bean of window.allBeansMap.values()) {
            totalDeps += bean.dependencies?.length ?? 0;
        }
        $('#deps-count').text(totalDeps);
    }

    leave() {
        $('#details-sidebar').hide();
        $('#tip').removeClass('show');
    }

    /**
     * Displays the tooltip for a hovered tree node with its metadata and updates its position.
     * @param {MouseEvent} event - The triggering mouse event.
     * @param {d3.HierarchyNode} node - Hovered node object.
     */
    showTip({ pageX, pageY }, node) {
        const { data, depth, _children = [] } = node;
        const { name, meta = {} } = data;
        const { type, scope, role, deps, dependents } = meta;

        const childrenCount = _children.length;
        const shortType = type ? type.slice(type.lastIndexOf('.') + 1) : '';

        const typeLabel = shortType ? `Type: ${shortType}` : '';
        const scopeLabel = scope ? `Scope: ${scope}${role ? ` · ${role}` : ''}` : '';

        let metaText = `Leaf · depth ${depth}`;
        if (deps !== undefined) {
            metaText = `Deps: ${deps} · Dependents: ${dependents} · Children: ${childrenCount}`;
        } else if (childrenCount > 0) {
            metaText = `${childrenCount} child bean(s) · depth ${depth}`;
        }

        // Cache element lookups or execute in a single selection
        $('#tip-name').text(name);
        $('#tip-type').text(typeLabel);
        $('#tip-scope').text(scopeLabel);
        $('#tip-meta').text(metaText);

        $('#tip')
            .addClass('show')
            .css({ left: pageX + 14, top: pageY - 10 });
    }

    /**
     * Highlights the upward ancestor path and downward descendant path for a node,
     * dimming all other nodes and links in the graph.
     * @param {d3.HierarchyNode} node - The target node to highlight path for.
     */
    highlightPathForNode(node) {
        if (!this.isHighlightPathActive) return;

        // Collect all ancestor and descendant nodes in a single set
        const pathNodes = new Set([...node.ancestors(), ...node.descendants()]);

        // Single-pass node state updates using D3 .classed() function overload
        this.svg.selectAll('.node').classed({
            highlighted: targetNode => pathNodes.has(targetNode),
            dimmed: targetNode => !pathNodes.has(targetNode)
        });

        // Single-pass link state updates
        this.svg.selectAll('.link').classed({
            highlighted: ({ source, target }) => pathNodes.has(source) && pathNodes.has(target),
            dimmed: ({ source, target }) => !pathNodes.has(source) || !pathNodes.has(target)
        });
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
        if (!this.svg?.node() || !this.root) return;

        const isTB = this.mode === 'tb';
        const duration = event?.altKey ? 2500 : 300;
        const linkColor = '#94a3b8';

        const descendants = this.root.descendants();
        const nodes = descendants.slice().reverse();
        const links = this.root.links();

        let visibleCount = 0;

        // Single-pass node width calculation & visible node counter
        for (let i = 0; i < descendants.length; i++) {
            const node = descendants[i];

            // Width calculation
            const nameLength = node.data.name?.length ?? 0;
            node.width = Math.max(160, nameLength * 7.2 + 56);

            // Visibility counting without allocating extra arrays
            if (node.depth === 0 || node.parent?.children) {
                visibleCount++;
            }
        }

        this._calculateLayout(nodes, isTB);

        const transition = d3.transition().duration(duration);

        this._drawNodes(nodes, transition, isTB, source);
        this._drawLinks(links, transition, isTB, source, linkColor);

        // Store current positions for future animations
        this.root.eachBefore(node => {
            node.x0 = node.x;
            node.y0 = node.y;
        });

        $('#nodeCount strong').text(visibleCount);
    }

    _calculateLayout(nodes, isTB) {
        const maxWidth = d3.max(nodes, node => node.width) || NW;
        tree.nodeSize(isTB ? [maxWidth + GAP_X, NH + GAP_Y] : [NH + 28, maxWidth + GAP_Y]);
        tree(this.root);
    }

    _drawNodes(nodes, transition, isTB, source) {
        const $tip = $('#tip');

        // Pre-calculate position transform helpers
        const getSourcePos = ({ x, y, x0, y0 }) => {
            const posX = x0 ?? x;
            const posY = y0 ?? y;
            return isTB ? `translate(${posX},${posY})` : `translate(${posY},${posX})`;
        };

        const getNodePos = ({ x, y }) => isTB ? `translate(${x},${y})` : `translate(${y},${x})`;
        const exitPos = `translate(${isTB ? source.x : source.y},${isTB ? source.y : source.x})`;
        const initialTransform = getSourcePos(source);

        const nodeSelection = this.gNode.selectAll('g.node').data(nodes, node => node.id);

        // Create entering nodes
        const enter = nodeSelection.enter().append('g')
            .attr('class', 'node')
            .attr('cursor', 'pointer')
            .attr('transform', initialTransform)
            .attr('fill-opacity', 0)
            .on('click', (event, node) => {
                event.stopPropagation();
                node.children = node.children ? null : node._children;
                this.update(event, node);
                this.selectNode(node);
                $tip.removeClass('show');
            })
            .on('mouseenter', (event, node) => {
                this.showTip(event, node);
                this.highlightPathForNode(node);
            })
            .on('mousemove', ({ pageX, pageY }) => $tip.css({ left: pageX + 14, top: pageY - 10 }))
            .on('mouseleave', () => {
                $tip.removeClass('show');
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

        // Update merged nodes
        const mergedTransition = nodeSelection.merge(enter)
            .transition(transition)
            .attr('transform', getNodePos)
            .attr('fill-opacity', 1);

        this._updateNodeStylesAndContent(mergedTransition);

        // Animate exiting nodes
        nodeSelection.exit()
            .transition(transition)
            .remove()
            .attr('transform', exitPos)
            .attr('fill-opacity', 0);
    }

    _updateNodeStylesAndContent(selection) {
        // Single sub-element queries with cached nodeStyle evaluations
        selection.select('.node-rect')
            .attr('x', ({ width }) => -width / 2)
            .attr('width', ({ width }) => width)
            .attr('fill', node => nodeStyle(node).fill)
            .attr('stroke', node => nodeStyle(node).stroke);

        selection.select('.node-icon')
            .attr('transform', ({ width }) => `translate(${-width / 2 + 14}, -10)`);

        selection.select('.node-icon path')
            .attr('stroke', node => nodeStyle(node).icon);

        selection.select('.node-text')
            .attr('x', ({ width }) => -width / 2 + 42)
            .attr('fill', node => nodeStyle(node).text)
            .text(({ data }) => data.name);
    }

    _drawLinks(links, transition, isTB, source, linkColor) {
        const linkFn = isTB ? tbLink : lrLink;

        // Pre-compute origin path string once for all entering elements
        const origin = { x: source.x0 ?? source.x, y: source.y0 ?? source.y };
        const enterPathD = linkFn({ source: origin, target: origin });
        const exitPathD = linkFn({ source, target: source });

        const linkSelection = this.gLink.selectAll('path.link').data(links, link => link.target.id);

        // Create entering links
        const enter = linkSelection.enter().append('path')
            .attr('class', 'link')
            .attr('fill', 'none')
            .attr('stroke', linkColor)
            .attr('stroke-width', 1.5)
            .attr('marker-end', 'url(#dot)')
            .attr('d', enterPathD);

        // Animate active links
        linkSelection.merge(enter)
            .transition(transition)
            .attr('stroke', linkColor)
            .attr('d', linkFn);

        // Animate exiting links
        linkSelection.exit()
            .transition(transition)
            .remove()
            .attr('d', exitPathD);
    }

    zoomBy(factor, duration = 300) {
        if (!this.svg || !this.zoom) return;

        this.svg.transition()
            .duration(duration)
            .call(this.zoom.scaleBy, factor);
    }

    fitView(duration = 500, padding = 60, minScale = 0.15, maxScale = 1.5) {
        if (!this.svg?.node() || !this.root) return;

        const $beanGraph = $('#beanGraph');
        const width = $beanGraph.width() || 800;
        const height = $beanGraph.height() || 600;

        const nodes = this.root.descendants();
        if (nodes.length === 0) return;

        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;
        let maxNodeW = NW;

        const isTB = this.mode === 'tb';

        // Single pass to find coordinate bounds and maximum node width
        for (let i = 0; i < nodes.length; i++) {
            const { x, y, width: nodeWidth = NW } = nodes[i];
            const nx = isTB ? x : y;
            const ny = isTB ? y : x;

            if (nx < minX) minX = nx;
            if (nx > maxX) maxX = nx;
            if (ny < minY) minY = ny;
            if (ny > maxY) maxY = ny;
            if (nodeWidth > maxNodeW) maxNodeW = nodeWidth;
        }

        const graphW = (maxX - minX) + maxNodeW + padding * 2;
        const graphH = (maxY - minY) + NH + padding * 2;

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        const rawScale = Math.min(width / graphW, height / graphH);
        const scale = Math.max(minScale, Math.min(maxScale, rawScale));

        const tx = width / 2 - centerX * scale;
        const ty = height / 2 - centerY * scale;

        this.svg.transition()
            .duration(duration)
            .call(this.zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
    }

    updateZoomPercent(k) {
        $('#zoom-percent').text(`${Math.round(k * 100)}%`);
    }

    selectNode(node) {
        const { data: { name, fullName, meta: { type = 'N/A', scope = 'singleton' } = {} } } = node;

        $('#details-sidebar').show();
        $('#detail-bean-name').text(name);
        $('#detail-bean-type').text(type);

        const isDark = document.documentElement.classList.contains('dark');
        const isSingleton = scope === 'singleton';

        // Static theme dictionary lookup instead of nested ternary allocations
        const THEME_MAP = {
            dark: {
                singleton: { bg: 'rgba(126, 34, 206, 0.15)', fg: '#d8b4fe', border: 'rgba(126, 34, 206, 0.3)' },
                other: { bg: 'rgba(16, 185, 129, 0.15)', fg: '#a7f3d0', border: 'rgba(16, 185, 129, 0.3)' }
            },
            light: {
                singleton: { bg: '#f3e8ff', fg: '#7e22ce', border: '#d8b4fe' },
                other: { bg: '#ecfdf5', fg: '#047857', border: '#bbf7d0' }
            }
        };

        const modeKey = isDark ? 'dark' : 'light';
        const scopeKey = isSingleton ? 'singleton' : 'other';
        const { bg, fg, border } = THEME_MAP[modeKey][scopeKey];

        $('#detail-bean-scope').text(scope).css({
            background: bg,
            color: fg,
            borderColor: border
        });

        const beansMap = window.allBeansMap;
        const beanRecord = beansMap?.get(fullName);
        const deps = beanRecord?.dependencies ?? [];
        const dependents = beanRecord?.dependents ?? [];

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
                const depRecord = beansMap?.get(depName);
                const displayName = BeanTreeBuilder._displayName(depName);
                const cat = depRecord ? getBeanCategory({ fullName: depName, meta: { type: depRecord.type } }) : null;
                const catColor = categoryColors[cat] ?? 'blue';

                return TEMPLATES.dependencyItem({ depName, displayName, catColor });
            }).join('');
        };

        $('#accordion-deps-body').html(buildListHtml(deps, 'No dependencies'));
        $('#accordion-dependents-body').html(buildListHtml(dependents, 'No dependents'));
    }

    findNodeInTree(rootNode, fullName) {
        if (!rootNode) return null;

        const stack = [rootNode];

        while (stack.length > 0) {
            const currentNode = stack.pop();

            if (currentNode.data?.fullName === fullName) {
                return currentNode;
            }

            const children = currentNode.children || currentNode._children;
            if (children) {
                for (let i = children.length - 1; i >= 0; i--) {
                    stack.push(children[i]);
                }
            }
        }

        return null;
    }

    focusOnBean(fullName) {
        if (!this.root) return;

        const targetNode = this.findNodeInTree(this.root, fullName);
        if (!targetNode) {
            console.warn('Bean not found in active tree layout:', fullName);
            return;
        }

        // Expand collapsed parents along the upward ancestor path
        let currentNode = targetNode.parent;
        let needsUpdate = false;

        while (currentNode) {
            if (currentNode._children && !currentNode.children) {
                currentNode.children = currentNode._children;
                needsUpdate = true;
            }
            currentNode = currentNode.parent;
        }

        if (needsUpdate) {
            this.update(null, this.root);
        }

        // Measure viewport dimensions once
        const $graph = $('#beanGraph');
        const width = $graph.width() || 800;
        const height = $graph.height() || 600;

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

    setMode(layoutMode) {
        this.mode = layoutMode;
        localStorage.setItem('sl-layout', layoutMode);

        const isTopBottom = layoutMode === 'tb';
        const activeClasses = 'bg-white text-gray-800 shadow-sm';
        const inactiveClasses = 'text-gray-500 hover:text-gray-800';

        // Batch toggle button styling
        $('#btn-tb')
            .toggleClass(activeClasses, isTopBottom)
            .toggleClass(inactiveClasses, !isTopBottom);

        $('#btn-lr')
            .toggleClass(activeClasses, !isTopBottom)
            .toggleClass(inactiveClasses, isTopBottom);

        if (!this.root) return;

        // Cache previous positions before recalculating layout
        this.root.eachBefore(node => {
            node.x0 = node.x;
            node.y0 = node.y;
        });

        const { x = 0, y = 0, x0 = 0, y0 = 0 } = this.root;

        this.update(null, { x, y, x0, y0 });
        this.fitView(500);
    }


    handleResize() {
        if (!this.root) return;
        this.update(null, this.root);
        this.fitView(100);
    }

    initEvents() {
        this._bindSearchHandlers();
        this._bindClickActionRouter();
        this._bindCustomEventHandlers();
    }

    _bindSearchHandlers() {
        let searchDebounceTimer = null;
        const $searchBox = $('.search-box');
        const $suggestionsBox = $('#search-suggestions');

        $(document).on('input', '#search-input', (event) => {
            clearTimeout(searchDebounceTimer);

            searchDebounceTimer = setTimeout(() => {
                const searchQuery = event.target.value.toLowerCase().trim();

                if (!searchQuery) {
                    $suggestionsBox.hide();
                    return;
                }

                const beansMap = window.allBeansMap;
                if (!beansMap) return;

                const matches = [];
                for (const [fullName, record] of beansMap.entries()) {
                    const displayName = BeanTreeBuilder._displayName(fullName);
                    const matchesDisplay = displayName.toLowerCase().includes(searchQuery);
                    const matchesFull = fullName.toLowerCase().includes(searchQuery);

                    if (matchesDisplay || matchesFull) {
                        matches.push({ fullName, displayName, type: record.type || '' });
                        if (matches.length >= 10) break;
                    }
                }

                if (matches.length === 0) {
                    $suggestionsBox.html('<div class="p-2 text-gray-400 text-xs">No matching beans</div>').show();
                    return;
                }

                const suggestionsHtml = matches.map(match => TEMPLATES.suggestionItem(match)).join('');
                $suggestionsBox.html(suggestionsHtml).show();
            }, 150);
        });

        // Close search suggestions when clicking outside
        $(document).on('click', (event) => {
            if (!event.target.closest('.search-box')) {
                $suggestionsBox.hide();
            }
        });
    }

    /**
     * Single-pass delegated click event router for controls, tree states, and sidebar triggers.
     * @private
     */
    _bindClickActionRouter() {
        const activeHighlightClasses = 'bg-primary text-white border-primary hover:bg-primary/90';
        const inactiveHighlightClasses = 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50';

        $(document).on('click', (event) => {
            const target = event.target;
            const $target = $(target);

            // 1. Interactive Bean Navigation Links
            const $depLink = $target.closest('.suggestion-item, .dep-item-left, .dep-link');
            if ($depLink.length > 0) {
                event.stopPropagation();
                const fullName = $depLink.data('fullname');

                if ($depLink.hasClass('suggestion-item')) {
                    $('#search-input').val('');
                    $('#search-suggestions').hide();
                }

                if (fullName) this.focusOnBean(fullName);
                return;
            }

            // 2. Accordion Drawer Toggles
            const $accordionHeader = $target.closest('.accordion-header');
            if ($accordionHeader.length > 0) {
                $accordionHeader.toggleClass('open');
                $accordionHeader.find('.material-symbols-outlined').toggleClass('rotate-90');
                $accordionHeader.next('.accordion-body').slideToggle(200);
                return;
            }

            // 3. UI Action Buttons
            const $btn = $target.closest('button, [id^="btn-"]');
            if ($btn.length === 0) return;

            const btnId = $btn.attr('id');

            switch (btnId) {
                case 'btn-expand':
                    this._mutateTreeNodes(node => node.children = node._children);
                    break;

                case 'btn-collapse':
                    this._mutateTreeNodes(node => {
                        if (node.depth > 0) node.children = null;
                    });
                    break;

                case 'btn-reset':
                    this._mutateTreeNodes(node => node.children = node.depth === 0 ? node._children : null);
                    break;

                case 'btn-control-zoom-in':
                    this.zoomBy(1.25);
                    break;

                case 'btn-control-zoom-out':
                    this.zoomBy(0.8);
                    break;

                case 'btn-control-fit':
                case 'btn-pan-mode':
                    this.fitView();
                    break;

                case 'btn-highlight-path':
                    this.isHighlightPathActive = !this.isHighlightPathActive;
                    $btn.toggleClass(activeHighlightClasses, this.isHighlightPathActive)
                        .toggleClass(inactiveHighlightClasses, !this.isHighlightPathActive);

                    if (!this.isHighlightPathActive && this.svg) {
                        this.svg.selectAll('.node, .link').classed('dimmed', false).classed('highlighted', false);
                    }
                    break;

                case 'btn-close-sidebar':
                    $('#details-sidebar').hide();
                    break;

                case 'btn-tb':
                    this.setMode('tb');
                    break;

                case 'btn-lr':
                    this.setMode('lr');
                    break;
            }
        });
    }

    /**
     * Registers custom DOM events (e.g. global theme changes).
     * @private
     */
    _bindCustomEventHandlers() {
        document.addEventListener('themechanged', () => {
            if (this.root) this.update(null, this.root);
        });
    }

    /**
     * Helper to mutate node visibility state, update rendering, and re-fit view.
     * @private
     */
    _mutateTreeNodes(mutatorFn) {
        if (!this.root) return;
        this.root.eachBefore(mutatorFn);
        this.update(null, this.root);
        this.fitView();
    }

    _updateProgressBadge({ loaded = 0, total = 0, isComplete = false, hasError = false, errorMsg = '' } = {}) {
        const $badge = $('#chunk-progress-badge');
        const $dot = $('#chunk-progress-dot');
        const $text = $('#chunk-progress-text');

        if ($badge.length === 0) return;

        if (hasError) {
            $badge
                .removeClass('bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/30 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/30')
                .addClass('bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-900/30');
            $dot.removeClass('bg-amber-500 animate-pulse bg-emerald-500').addClass('bg-red-500');
            $text.html(`Failed <span class="text-[11px] opacity-85">(${errorMsg || 'Retry'})</span>`);
        } else if (isComplete) {
            $badge
                .removeClass('bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/30 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-900/30')
                .addClass('bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/30');
            $dot.removeClass('bg-amber-500 animate-pulse bg-red-500').addClass('bg-emerald-500');
            $text.text(`Loaded (${loaded})`);
        } else {
            $badge
                .removeClass('bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/30 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-900/30')
                .addClass('bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/30');
            $dot.removeClass('bg-emerald-500 bg-red-500').addClass('bg-amber-500 animate-pulse');
            $text.text(`Loading: ${loaded} / ${total}`);
        }
    }

    async reloadGraphData() {
        const $btn = $('#btn-reload-graph');
        const $icon = $btn.find('.material-symbols-outlined');
        $icon.addClass('animate-spin');

        try {
            this.root = await this.dataLoader.reload();
            this.update(null, { x: 0, y: 0, x0: 0, y0: 0 });
            this._updateToolbarCounts();
            this.fitView(0);
        } catch (error) {
            console.error('Error reloading graph data:', error);
        } finally {
            setTimeout(() => $icon.removeClass('animate-spin'), 600);
        }
    }
}