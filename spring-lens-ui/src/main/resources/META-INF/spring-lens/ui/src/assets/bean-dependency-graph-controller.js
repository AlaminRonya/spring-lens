import {GAP_X, GAP_Y, ICON, NH, NW, RX, TEMPLATES, ZOOM_SCALE_EXTENT} from './constants.js';
import {getBeanCategory, lrLink, nodeStyle, tbLink, tree} from './utils.js';
import {BeanGraphTreeBuilder} from './bean-graph-tree-builder.js';
import httpClient from "./http-client.js";
import beanDataStore from './bean-data-store.js';

export class BeanDependencyGraphController {

    constructor(dependencyGraphApi, findBeanApi) {
        this.root = null;
        this.svg = null;
        this.gLink = null;
        this.gNode = null;
        this.zoom = null;
        this.totalElements = 0;
        this.beanDependencies = null;
        this.accumulatedBeans = [];
        this.beanDetailsCache = new Map();
        this.selectedContextId = '';
        this.isLoadingRemaining = false;
        this.findBeanDetailsApi = findBeanApi;
        this.dependencyGraphApi = dependencyGraphApi;
        this.isHighlightPathActive = false;
        this.mode = localStorage.getItem('sl-layout') ?? 'tb';

        this.initEvents();
    }

    initEvents() {
        this._bindSearchHandlers();
        this._bindClickActionRouter();
        this._bindCustomEventHandlers();
    }

    async enter() {
        if (!this._initializeCanvas()) return;

        this._bindControls();

        const isDataLoaded = await this._loadInitialData();
        if (!isDataLoaded) return;

        this._renderInitialGraph();
        this._handlePendingBeanFocus();
    }

    _initializeCanvas() {
        this.svg = d3.select('#tree-svg');
        if (!this.svg.node()) return false;

        this.svg.selectAll('*').remove();
        this._injectTooltip();

        const mainContainer = this._setupSvgContainers();
        this._setupZoom(mainContainer);
        return true;
    }

    _bindControls() {
        $('#btn-reload-graph')
            .off('click')
            .on('click', () => this.reloadGraphData());
    }

    async reloadGraphData() {
        const $btn = $('#btn-reload-graph');
        const $icon = $btn.find('.material-symbols-outlined');
        $icon.addClass('animate-spin');

        try {
            await this._fetchBeanGraphDependencies();
            this._buildHierarchyFromDependencies();
            this.update(null, { x: 0, y: 0, x0: 0, y0: 0 });
            this._updateTotalBeanCount();
            this.fitView(0);
        } catch (error) {
            console.error('Error reloading graph data:', error);
        } finally {
            setTimeout(() => $icon.removeClass('animate-spin'), 600);
        }
    }

    async _loadInitialData() {
        try {
            await this._fetchBeanGraphDependencies();
            this._buildHierarchyFromDependencies();
            this._updateTotalBeanCount();
            return true;
        } catch (error) {
            console.error('Failed to initialize graph data:', error);
            $('#beanGraph').html(`
            <div class="p-5 text-red-500 font-semibold flex items-center gap-2">
                <span>❌ Failed to load bean definitions:</span>
                <span>${error.message}</span>
            </div>
        `);
            return false;
        }
    }

    _renderInitialGraph() {
        this.update(null, { x: 0, y: 0, x0: 0, y0: 0 });
        this.fitView(0);
        this.setMode(this.mode);
    }

    _handlePendingBeanFocus() {
        const targetBean = window.focusBeanOnNextGraphEnter;
        if (!targetBean) return;

        window.focusBeanOnNextGraphEnter = null;
        setTimeout(() => this.focusOnBean(targetBean), 300);
    }


    async fetchBeanDetails(contextId, beanName) {
        if (!contextId || !beanName || !this.findBeanDetailsApi) return null;

        const cacheKey = `${contextId}:${beanName}`;
        if (this.beanDetailsCache.has(cacheKey)) {
            return this.beanDetailsCache.get(cacheKey);
        }

        try {
            const [baseUrl] = this.findBeanDetailsApi.split('?');
            const queryParams = new URLSearchParams({ contextId, beanName });
            const requestUrl = `${baseUrl}?${queryParams.toString()}`;

            const beanDetails = await httpClient.get(requestUrl);
            if (!beanDetails) return null;

            this._updateBeanCaches(beanDetails, cacheKey);
            return beanDetails;
        } catch (error) {
            console.error(`Failed to fetch bean details for ${beanName}:`, error);
            return null;
        }
    }

    _updateBeanCaches(beanDetails, primaryCacheKey) {
        this.beanDetailsCache.set(primaryCacheKey, beanDetails);
        beanDataStore.addBeans([beanDetails]);
    }

    _mergeBeanDetailsIntoTree(node, details) {
        if (!node || !details) return;

        // 1. Update node metadata in place
        node.data.meta = {
            ...node.data.meta,
            ...(details.type && { type: details.type }),
            ...(details.scope && { scope: details.scope })
        };

        const dependencies = details.dependencies;
        if (!dependencies?.length) return;

        // Ensure _children backing array exists
        node._children ??= [];

        // 2. Pre-index existing children names for O(1) existence checks
        const existingChildNames = new Set();
        const existingChildren = node._children;

        for (let i = 0; i < existingChildren.length; i++) {
            const childData = existingChildren[i].data;

            if (childData?.fullName)
                existingChildNames.add(childData.fullName);

            if (childData?.name)
                existingChildNames.add(childData.name);
        }

        let hasAddedNewChild = false;
        const contextId = details.contextId ?? node.data?.contextId;

        // 3. Append missing dependency nodes
        for (let i = 0; i < dependencies.length; i++) {
            const dependencyName = dependencies[i];
            if (existingChildNames.has(dependencyName)) continue;

            const dependencyNode = this._createDynamicHierarchyChild(node, dependencyName, contextId);
            node._children.push(dependencyNode);
            existingChildNames.add(dependencyName);
            hasAddedNewChild = true;
        }

        // 4. Synchronize active visible children if node is currently expanded
        if (hasAddedNewChild && node.children) {
            node.children = node._children;
        }
    }

    _createDynamicHierarchyChild(parentNode, beanName, contextId) {
        const beanRecord = beanDataStore.findBeanByName(beanName, contextId);
        const displayName = BeanGraphTreeBuilder._displayName(beanName);

        const childData = {
            name: displayName,
            fullName: beanName,
            contextId,
            meta: {
                type: beanRecord?.type ?? 'N/A',
                scope: beanRecord?.scope ?? 'singleton',
                contextId
            }
        };

        const childNode = d3.hierarchy(childData);
        childNode.depth = parentNode.depth + 1;
        childNode.parent = parentNode;
        childNode.id = `dyn_${parentNode.id}_${beanName}`;
        childNode._children = null;
        childNode.children = null;

        return childNode;
    }

    async _fetchBeanGraphDependencies() {
        this._updateProgressBadge({ loaded: 0, total: 0, isComplete: false });

        const serverResponse = await httpClient.get(this.dependencyGraphApi);
        this.beanDependencies = serverResponse;

        const initialBeanDefinitions = Array.isArray(serverResponse)
            ? serverResponse
            : (serverResponse?.content ?? []);

        this.accumulatedBeans = [...initialBeanDefinitions];
        this.totalElements = serverResponse?.totalElements ?? initialBeanDefinitions.length;

        const hasRemainingPages = this._hasSubsequentPages(serverResponse);

        this._updateProgressBadge({
            loaded: this.accumulatedBeans.length,
            total: this.totalElements,
            isComplete: !hasRemainingPages
        });

        if (hasRemainingPages) {
            setTimeout(() => this._loadRemainingDataLazily(serverResponse), 50);
        }
    }

    _hasSubsequentPages(paginationPayload) {
        if (!paginationPayload || Array.isArray(paginationPayload)) return false;

        const { totalPages = 1, pageNumber = 0, last = true } = paginationPayload;
        return !last && pageNumber < totalPages - 1;
    }

    async _loadRemainingDataLazily(firstPageData) {
        if (this.isLoadingRemaining) return;
        this.isLoadingRemaining = true;

        try {
            const { totalPages = 1, pageNumber = 0, pageSize = 20 } = firstPageData;
            const [baseApiEndpoint] = this.dependencyGraphApi.split('?');

            for (let targetPageIndex = pageNumber + 1; targetPageIndex < totalPages; targetPageIndex++) {
                const searchParams = new URLSearchParams({
                    pageNumber: targetPageIndex,
                    pageSize
                });
                const paginatedEndpointUrl = `${baseApiEndpoint}?${searchParams.toString()}`;
                const fetchedPagePayload = await httpClient.get(paginatedEndpointUrl);
                const fetchedBeanDefinitions = fetchedPagePayload?.content ?? [];

                if (fetchedBeanDefinitions.length === 0) break;

                this.accumulatedBeans.push(...fetchedBeanDefinitions);
                this._buildHierarchyFromDependencies(this.accumulatedBeans);

                this.update(null, { x: 0, y: 0, x0: 0, y0: 0 });
                this._updateTotalBeanCount();

                const isFinalPageBatch = targetPageIndex === totalPages - 1;
                this._updateProgressBadge({
                    loaded: this.accumulatedBeans.length,
                    total: this.totalElements,
                    isComplete: isFinalPageBatch
                });

                await this._yieldThreadToEventLoop(50);
            }
        } catch (networkStreamingError) {
            console.error('Error loading lazy background bean graph data:', networkStreamingError);
            this._updateProgressBadge({ hasError: true, errorMsg: networkStreamingError.message });
        } finally {
            this.isLoadingRemaining = false;
        }
    }

    _yieldThreadToEventLoop(delayDurationInMilliseconds = 50) {
        return new Promise(resolveEventLoopYield => setTimeout(resolveEventLoopYield, delayDurationInMilliseconds));
    }

    _populateContextFilter(beanDefinitions = []) {
        const $contextFilterSelectElement = $('#context-filter');
        if ($contextFilterSelectElement.length === 0) return;

        const uniqueContextIdentifiers = this._extractUniqueContextIdentifiers(beanDefinitions);
        const $filterContainerElement = $contextFilterSelectElement.parent();

        if (uniqueContextIdentifiers.length <= 1) {
            $filterContainerElement.addClass('hidden');
            return;
        }

        $filterContainerElement.removeClass('hidden');

        const renderedOptionsHtml = this._buildContextFilterOptionsHtml(
            uniqueContextIdentifiers,
            this.selectedContextId
        );

        $contextFilterSelectElement.html(renderedOptionsHtml);
    }

    _extractUniqueContextIdentifiers(beanDefinitions) {
        const uniqueContextSet = new Set();
        for (let i = 0; i < beanDefinitions.length; i++) {
            const contextIdentifier = beanDefinitions[i]?.contextId;
            if (contextIdentifier) {
                uniqueContextSet.add(contextIdentifier);
            }
        }
        return Array.from(uniqueContextSet);
    }

    _buildContextFilterOptionsHtml(uniqueContextIdentifiers, currentlySelectedContextIdentifier) {
        const isDefaultOptionSelected = !currentlySelectedContextIdentifier ? 'selected' : '';
        const defaultOptionHtml = `<option value="" ${isDefaultOptionSelected}>All Contexts (${uniqueContextIdentifiers.length})</option>`;

        const contextOptionsHtml = uniqueContextIdentifiers.map(contextIdentifier => {
            const isSelected = contextIdentifier === currentlySelectedContextIdentifier ? 'selected' : '';
            return `<option value="${contextIdentifier}" ${isSelected}>${contextIdentifier}</option>`;
        }).join('');

        return `${defaultOptionHtml}${contextOptionsHtml}`;
    }

    _buildHierarchyFromDependencies(providedBeanDefinitions = null) {
        const rawBeanDefinitions = this._resolveRawBeanDefinitions(providedBeanDefinitions);
        if (!rawBeanDefinitions || rawBeanDefinitions.length === 0) {
            this.root = null;
            return;
        }

        this._populateContextFilter(rawBeanDefinitions);

        const scopedBeanDefinitions = this._filterBeanDefinitionsByActiveContext(rawBeanDefinitions);
        this._buildAndCrossLinkBeanDependencies(scopedBeanDefinitions);

        const rawTreeHierarchyData = BeanGraphTreeBuilder.buildByContext(scopedBeanDefinitions);
        if (!rawTreeHierarchyData) {
            this.root = null;
            return;
        }

        this.root = this._createD3HierarchyRootNode(rawTreeHierarchyData);
    }

    _resolveRawBeanDefinitions(providedBeanDefinitions) {
        if (providedBeanDefinitions) {
            return providedBeanDefinitions;
        }

        if (Array.isArray(this.beanDependencies)) {
            return this.beanDependencies;
        }

        return this.beanDependencies?.content ?? [];
    }

    _filterBeanDefinitionsByActiveContext(beanDefinitions) {
        if (!this.selectedContextId) {
            return beanDefinitions;
        }

        return beanDefinitions.filter(bean => bean?.contextId === this.selectedContextId);
    }

    _buildAndCrossLinkBeanDependencies(beanDefinitions) {
        beanDataStore.addBeans(beanDefinitions);
        const beanCount = beanDefinitions.length;

        // Cross-link inverse dependent relationships
        for (let i = 0; i < beanCount; i++) {
            const upstreamBean = beanDefinitions[i];
            const dependencyNames = upstreamBean?.dependencies ?? [];

            for (let j = 0; j < dependencyNames.length; j++) {
                const dependencyName = dependencyNames[j];
                const targetDependencyBean = beanDataStore.findBeanByName(dependencyName);

                if (targetDependencyBean) {
                    targetDependencyBean.dependents ??= [];
                    if (!targetDependencyBean.dependents.includes(upstreamBean.beanName)) {
                        targetDependencyBean.dependents.push(upstreamBean.beanName);
                    }
                }
            }
        }
    }

    _createD3HierarchyRootNode(treeData) {
        const rootHierarchyNode = d3.hierarchy(treeData);
        const descendantNodes = rootHierarchyNode.descendants();
        const totalDescendants = descendantNodes.length;

        for (let i = 0; i < totalDescendants; i++) {
            const node = descendantNodes[i];
            node.id = i;
            node._children = node.children;

            if (node.depth > 0) {
                node.children = null;
            }
        }

        rootHierarchyNode.x0 = 0;
        rootHierarchyNode.y0 = 0;

        return rootHierarchyNode;
    }

    _updateTotalBeanCount() {
        const beanList = this.accumulatedBeans.length > 0
            ? this.accumulatedBeans
            : (Array.isArray(this.beanDependencies) ? this.beanDependencies : (this.beanDependencies?.content || []));

        const totalElements = this.totalElements || this.beanDependencies?.totalElements || beanList.length;
        $('#beans-count').text(totalElements);

        let totalDeps = 0;
        for (const bean of beanList) {
            totalDeps += bean.dependencies?.length ?? 0;
        }
        $('#deps-count').text(totalDeps);
    }

    _injectTooltip() {
        if ($('#tip').length === 0) {
            $('body').append(TEMPLATES.tooltip);
        }
    }

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
            metaText = `Deps: ${deps} · Dependents: ${dependents}`;
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
            .css({ left: pageX + 12, top: pageY + 20 });
    }

    highlightPathForNode(node) {
        if (!this.isHighlightPathActive || !node || !this.svg) return;

        // Collect all ancestor and descendant nodes in a single set
        const pathNodes = new Set([...node.ancestors(), ...node.descendants()]);

        // Explicit D3 selection class toggling for nodes
        this.svg.selectAll('g.node')
            .classed('highlighted', targetNode => pathNodes.has(targetNode))
            .classed('dimmed', targetNode => !pathNodes.has(targetNode));

        // Explicit D3 selection class toggling for links
        this.svg.selectAll('path.link')
            .classed('highlighted', ({ source, target }) => pathNodes.has(source) && pathNodes.has(target))
            .classed('dimmed', ({ source, target }) => !pathNodes.has(source) || !pathNodes.has(target));
    }

    resetPathHighlight() {
        if (!this.svg) return;
        this.svg.selectAll('g.node, path.link')
            .classed('dimmed', false)
            .classed('highlighted', false);
    }

    update(event, source) {
        if (!this.svg?.node() || !this.root) return;

        const isTB = this.mode === 'tb';
        const duration = event?.altKey ? 4000 : 950;
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

        // Pre-calculate position transform helpers with subtle initial offset for slide-up reveal
        const getSourcePos = (node) => {
            const posX = node.x0 ?? node.parent?.x0 ?? node.parent?.x ?? node.x;
            const posY = (node.y0 ?? node.parent?.y0 ?? node.parent?.y ?? node.y) + (isTB ? 20 : 0);
            const posXOffset = isTB ? posX : posX + 20;
            return isTB ? `translate(${posX},${posY})` : `translate(${posY},${posXOffset})`;
        };

        const getNodePos = ({ x, y }) => isTB ? `translate(${x},${y})` : `translate(${y},${x})`;
        const exitPos = `translate(${isTB ? source.x : source.y},${isTB ? source.y : source.x})`;
        const initialTransform = node => getSourcePos(node);

        const nodeSelection = this.gNode.selectAll('g.node').data(nodes, node => node.id);

        // Create entering nodes
        const enter = nodeSelection.enter().append('g')
            .attr('class', 'node')
            .attr('cursor', 'pointer')
            .attr('transform', initialTransform)
            .attr('fill-opacity', 0)
            .on('click', async (event, node) => {
                event.stopPropagation();

                const contextId = node.data?.contextId || node.data?.meta?.contextId;
                const fullName = node.data?.fullName || node.data?.name;

                if (this.findBeanDetailsApi && fullName && node.data?.meta?.type !== 'context' && node.data?.meta?.type !== 'root') {
                    const details = await this.fetchBeanDetails(contextId, fullName);
                    if (details) {
                        this._mergeBeanDetailsIntoTree(node, details);
                    }
                }

                node.children = node.children ? null : node._children;
                this.update(event, node);
                this.selectNode(node);
                $tip.removeClass('show');
            })
            .on('mouseenter', (event, node) => {
                this.showTip(event, node);
                this.highlightPathForNode(node);
            })
            .on('mousemove', ({ pageX, pageY }) => $tip.css({ left: pageX + 12, top: pageY + 20 }))
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

        // Update merged nodes with staggered delay for fade-up reveal animation
        const mergedSelection = nodeSelection.merge(enter);

        mergedSelection
            .transition(transition)
            .delay((d, i) => d.depth === 0 ? 0 : Math.min(d.depth * 140 + (i % 20) * 55, 1200))
            .attr('transform', getNodePos)
            .attr('fill-opacity', 1);

        this._updateNodeStylesAndContent(mergedSelection);

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

        // Animate active links with matching staggered delay
        linkSelection.merge(enter)
            .transition(transition)
            .delay((d, i) => Math.min(d.target.depth * 140 + (i % 20) * 55, 1200))
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

    fitView(duration = 500, padding = 35, minScale = 0.4, maxScale = 1.8) {
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

        const rawScale = (Math.min(width / graphW, height / graphH)) * 1.25;
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

    async selectNode(selectedHierarchyNode) {
        this.selectedNodeRef = selectedHierarchyNode;

        if (this.isHighlightPathActive) {
            this.highlightPathForNode(selectedHierarchyNode);
        }

        const {
            name: displayName,
            fullName,
            contextId,
            meta = {}
        } = selectedHierarchyNode.data ?? {};

        const { type = 'N/A', scope = 'singleton' } = meta;

        this._openSidebarAndPopulateHeader(displayName, type, scope);

        const initialDependencies = this._resolveInitialDependencyLists(fullName, contextId);
        this._renderDependencyAccordions(initialDependencies.dependencies, initialDependencies.dependents);

        if (this._shouldFetchRemoteDetails(fullName, meta.type)) {
            await this._fetchAndApplyRemoteBeanDetails(selectedHierarchyNode, contextId, fullName);
        }
    }

    _openSidebarAndPopulateHeader(displayName, beanType, beanScope) {
        $('#details-sidebar').show();
        $('#detail-bean-name').text(displayName);
        $('#detail-bean-type').text(beanType);
        this._applySidebarScopeStyle(beanScope);
    }

    _applySidebarScopeStyle(scopeName = 'singleton') {
        const isDarkMode = document.documentElement.classList.contains('dark');
        const isSingletonScope = scopeName.toLowerCase() === 'singleton';

        const SCOPE_THEME_PALETTE = {
            dark: {
                singleton: { bg: 'rgba(126, 34, 206, 0.15)', fg: '#d8b4fe', border: 'rgba(126, 34, 206, 0.3)' },
                other: { bg: 'rgba(16, 185, 129, 0.15)', fg: '#a7f3d0', border: 'rgba(16, 185, 129, 0.3)' }
            },
                light: {
                    singleton: { bg: '#f3e8ff', fg: '#7e22ce', border: '#d8b4fe' },
                    other: { bg: '#ecfdf5', fg: '#047857', border: '#bbf7d0' }
                }
            };

        const themeKey = isDarkMode ? 'dark' : 'light';
        const scopeKey = isSingletonScope ? 'singleton' : 'other';
        const { bg, fg, border } = SCOPE_THEME_PALETTE[themeKey][scopeKey];

        $('#detail-bean-scope')
            .text(scopeName)
            .css({ background: bg, color: fg, borderColor: border });
    }

    _resolveInitialDependencyLists(fullName, contextId) {
        if (!fullName) {
            return { dependencies: [], dependents: [] };
        }

        const cachedRecord = beanDataStore.findBeanByName(fullName, contextId);

        return {
            dependencies: cachedRecord?.dependencies ?? [],
            dependents: cachedRecord?.dependents ?? []
        };
    }

    _renderDependencyAccordions(dependencyNames = [], dependentNames = []) {
        $('#detail-deps-count').text(dependencyNames.length);
        $('#detail-dependents-count').text(dependentNames.length);

        const dependencyListHtml = this._buildDependencyListItemsHtml(dependencyNames, 'No dependencies');
        const dependentListHtml = this._buildDependencyListItemsHtml(dependentNames, 'No dependents');

        $('#accordion-deps-body').html(dependencyListHtml);
        $('#accordion-dependents-body').html(dependentListHtml);
    }

    _buildDependencyListItemsHtml(beanNames, emptyFallbackMessage) {
        if (!beanNames || beanNames.length === 0) {
            return `<div class="text-gray-400 text-xs p-2">${emptyFallbackMessage}</div>`;
        }

        const templateFactory = TEMPLATES.depListItem || TEMPLATES.dependencyItem;
        const categoryColors = {
            intermediate: 'green',
            leaf: 'yellow',
            adapter: 'purple'
        };

        return beanNames.map(beanName => {
            const beanRecord = beanDataStore.findBeanByName(beanName);
            const displayName = BeanGraphTreeBuilder._displayName(beanName);
            const category = beanRecord
                ? getBeanCategory({ fullName: beanName, meta: { type: beanRecord.type } })
                : null;

            const catColor = categoryColors[category] ?? 'blue';

            return templateFactory({ depName: beanName, displayName, catColor });
        }).join('');
    }

    _shouldFetchRemoteDetails(fullName, nodeType) {
        return Boolean(
            this.findBeanDetailsApi &&
            fullName &&
            nodeType !== 'context' &&
            nodeType !== 'root'
        );
    }

    async _fetchAndApplyRemoteBeanDetails(hierarchyNode, contextId, fullName) {
        const fetchedDetails = await this.fetchBeanDetails(contextId, fullName);
        if (!fetchedDetails) return;

        if (fetchedDetails.type) {
            $('#detail-bean-type').text(fetchedDetails.type);
        }
        if (fetchedDetails.scope) {
            this._applySidebarScopeStyle(fetchedDetails.scope);
        }

        const updatedDependencies = fetchedDetails.dependencies ?? [];
        const updatedDependents = fetchedDetails.dependents ?? [];

        this._renderDependencyAccordions(updatedDependencies, updatedDependents);
        this._mergeBeanDetailsIntoTree(hierarchyNode, fetchedDetails);
    }

    findNodeInTree(rootNode, targetIdentifier) {
        if (!rootNode || !targetIdentifier) return null;

        const normalizedTargetName = this._extractTerminalBeanIdentifier(targetIdentifier);
        const traversalStack = [rootNode];

        while (traversalStack.length > 0) {
            const currentNode = traversalStack.pop();
            const currentNodeIdentifier = currentNode.data?.fullName ?? currentNode.data?.name ?? '';

            if (this._isMatchingNode(currentNodeIdentifier, targetIdentifier, normalizedTargetName)) {
                return currentNode;
            }

            const childNodes = currentNode.children ?? currentNode._children;
            if (childNodes) {
                for (let i = childNodes.length - 1; i >= 0; i--) {
                    traversalStack.push(childNodes[i]);
                }
            }
        }

        return null;
    }

    _extractTerminalBeanIdentifier(identifier) {
        return identifier.includes(':') ? identifier.split(':').pop() : identifier;
    }

    _isMatchingNode(nodeIdentifier, rawTargetIdentifier, normalizedTargetName) {
        if (!nodeIdentifier) return false;
        if (nodeIdentifier === rawTargetIdentifier) return true;

        const normalizedNodeName = this._extractTerminalBeanIdentifier(nodeIdentifier);
        return normalizedNodeName === normalizedTargetName;
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

    _bindSearchHandlers() {
        let searchDebounceTimer = null;
        const DEBOUNCE_DELAY_MS = 150;

        $(document).on('input', '#search-input', (event) => {
            clearTimeout(searchDebounceTimer);
            searchDebounceTimer = setTimeout(() => {
                this._handleSearchInput(event.target.value);
            }, DEBOUNCE_DELAY_MS);
        });

        this._bindOutsideSearchDismissal();
    }

    _handleSearchInput(rawQueryValue) {
        const $suggestionsBox = $('#search-suggestions');
        const normalizedQuery = rawQueryValue.toLowerCase().trim();

        if (!normalizedQuery || !this.root) {
            $suggestionsBox.hide().empty();
            return;
        }

        const matchingBeans = this._searchMatchingNodes(normalizedQuery, 12);
        this._renderSearchSuggestions($suggestionsBox, matchingBeans);
    }

    _searchMatchingNodes(searchQuery, maxResultsCount) {
        const matchedBeans = [];
        const visitedFullNames = new Set();
        const traversalStack = [this.root];

        while (traversalStack.length > 0 && matchedBeans.length < maxResultsCount) {
            const currentNode = traversalStack.pop();
            const nodeData = currentNode.data ?? {};
            const { fullName, meta = {} } = nodeData;
            const nodeType = meta.type ?? '';

            if (this._isSearchCandidate(fullName, nodeType, visitedFullNames)) {
                visitedFullNames.add(fullName);

                const displayName = BeanGraphTreeBuilder._displayName(fullName);
                if (this._isBeanMatchingQuery(fullName, displayName, searchQuery)) {
                    matchedBeans.push({
                        fullName,
                        displayName,
                        type: nodeType
                    });
                }
            }

            const childNodes = currentNode.children ?? currentNode._children;
            if (childNodes) {
                for (let i = childNodes.length - 1; i >= 0; i--) {
                    traversalStack.push(childNodes[i]);
                }
            }
        }

        return matchedBeans;
    }

    _isSearchCandidate(fullName, nodeType, visitedFullNames) {
        return Boolean(
            fullName &&
            !visitedFullNames.has(fullName) &&
            nodeType !== 'root' &&
            nodeType !== 'context'
        );
    }

    _isBeanMatchingQuery(fullName, displayName, searchQuery) {
        return (
            displayName.toLowerCase().includes(searchQuery) ||
            fullName.toLowerCase().includes(searchQuery)
        );
    }

    _renderSearchSuggestions($suggestionsBox, matchingBeans) {
        if (matchingBeans.length === 0) {
            $suggestionsBox
                .html('<div class="p-2 text-gray-400 text-xs">No matching beans in loaded tree</div>')
                .show();
            return;
        }

        const suggestionsHtml = matchingBeans
            .map(beanMatch => TEMPLATES.suggestionItem(beanMatch))
    .join('');

        $suggestionsBox.html(suggestionsHtml).show();
    }

    _bindOutsideSearchDismissal() {
        $(document).on('click', (event) => {
            const isClickInsideSearch = Boolean(
                event.target.closest('#search-input') ||
                event.target.closest('#search-suggestions')
            );

            if (!isClickInsideSearch) {
                $('#search-suggestions').hide();
            }
        });
    }

    _bindClickActionRouter() {
        $(document).on('click', (event) => {
            const $clickedElement = $(event.target);

            if (this._handleBeanNavigationClick($clickedElement, event)) return;
            if (this._handleAccordionToggleClick($clickedElement)) return;
            this._handleToolbarActionClick($clickedElement);
        });
    }

    _handleBeanNavigationClick($clickedElement, event) {
        const $navigationLink = $clickedElement.closest('.suggestion-item, .dep-item-left, .dep-link');
        if ($navigationLink.length === 0) return false;

        event.stopPropagation();

        if ($navigationLink.hasClass('suggestion-item')) {
            $('#search-input').val('');
            $('#search-suggestions').hide();
        }

        const targetBeanFullName = $navigationLink.data('fullname');
        if (targetBeanFullName) {
            this.focusOnBean(targetBeanFullName);
        }

        return true;
    }

    _handleAccordionToggleClick($clickedElement) {
        const $accordionHeader = $clickedElement.closest('.accordion-header');
        if ($accordionHeader.length === 0) return false;

        $accordionHeader.toggleClass('open');
        $accordionHeader.find('.material-symbols-outlined').toggleClass('rotate-90');
        $accordionHeader.next('.accordion-body').slideToggle(200);

        return true;
    }

    _handleToolbarActionClick($clickedElement) {
        const $actionButton = $clickedElement.closest('button, [id^="btn-"]');
        if ($actionButton.length === 0) return;

        const actionButtonId = $actionButton.attr('id');
        const buttonActionMap = this._getToolbarActionMap($actionButton);

        const targetActionHandler = buttonActionMap[actionButtonId];
        if (targetActionHandler) {
            targetActionHandler();
        }
    }

    _getToolbarActionMap($actionButton) {
        return {
            'btn-expand': () => this._mutateTreeNodes(node => node.children = node._children),
            'btn-collapse': () => this._mutateTreeNodes(node => { if (node.depth > 0) node.children = null; }),
            'btn-reset': () => this._mutateTreeNodes(node => node.children = node.depth === 0 ? node._children : null),
            'btn-control-zoom-in': () => this.zoomBy(1.25),
            'btn-control-zoom-out': () => this.zoomBy(0.8),
            'btn-control-fit': () => this.fitView(),
            'btn-pan-mode': () => this.fitView(),
            'btn-highlight-path': () => this._togglePathHighlightState($actionButton),
            'btn-close-sidebar': () => $('#details-sidebar').hide(),
            'btn-tb': () => this.setMode('tb'),
            'btn-lr': () => this.setMode('lr')
        };
    }

    _togglePathHighlightState($highlightButton) {
        const HIGHLIGHT_BUTTON_CLASSES = {
            active: 'bg-primary text-white border-primary hover:bg-primary/90',
            inactive: 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
        };

        this.isHighlightPathActive = !this.isHighlightPathActive;

        $highlightButton
            .toggleClass(HIGHLIGHT_BUTTON_CLASSES.active, this.isHighlightPathActive)
            .toggleClass(HIGHLIGHT_BUTTON_CLASSES.inactive, !this.isHighlightPathActive);

        if (!this.isHighlightPathActive) {
            this.resetPathHighlight();
        } else if (this.selectedNodeRef) {
            this.highlightPathForNode(this.selectedNodeRef);
        }
    }

    _bindCustomEventHandlers() {
        document.addEventListener('themechanged', () => {
            if (this.root) this.update(null, this.root);
        });

        $(document).on('change', '#context-filter', (event) => {
            this.selectedContextId = $(event.target).val();
            const beans = this.accumulatedBeans.length > 0 ? this.accumulatedBeans : null;
            this._buildHierarchyFromDependencies(beans);
            this.update(null, { x: 0, y: 0, x0: 0, y0: 0 });
            this._updateTotalBeanCount();
            this.fitView(500);
        });
    }

    _mutateTreeNodes(mutatorFn) {
        if (!this.root) return;
        this.root.eachBefore(mutatorFn);
        this.update(null, this.root);
        this.fitView();
    }

    _updateProgressBadge({ loaded = 0, total = 0, isComplete = false, hasError = false, errorMsg = '' } = {}) {
        const $badgeElement = $('#chunk-progress-badge');
        const $dotElement = $('#chunk-progress-dot');
        const $textElement = $('#chunk-progress-text');

        if ($badgeElement.length === 0) return;

        const progressState = this._resolveProgressState(hasError, isComplete);
        const configuration = this._getProgressConfiguration(progressState, { loaded, total, errorMsg });

        this._applyBadgeStyles($badgeElement, configuration.badgeClass);
        this._applyDotStyles($dotElement, configuration.dotClass);
        $textElement.html(configuration.textHtml);
    }

    _resolveProgressState(hasError, isComplete) {
        if (hasError) return 'error';
        if (isComplete) return 'complete';
        return 'loading';
    }

    _getProgressConfiguration(state, { loaded, total, errorMsg }) {
        const STATE_CONFIGURATIONS = {
            error: {
                badgeClass: 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-900/30',
                dotClass: 'bg-red-500',
                textHtml: `Failed <span class="text-[11px] opacity-85">(${errorMsg || 'Retry'})</span>`
            },
            complete: {
                badgeClass: 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/30',
                dotClass: 'bg-emerald-500',
                textHtml: `Loaded (${loaded})`
            },
            loading: {
                badgeClass: 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/30',
                dotClass: 'bg-amber-500 animate-pulse',
                textHtml: `Loading: ${loaded} / ${total}`
            }
        };

        return STATE_CONFIGURATIONS[state];
    }

    _applyBadgeStyles($badge, targetClass) {
        const ALL_BADGE_CLASSES = [
            'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/30',
            'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/30',
            'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-900/30'
        ].join(' ');

        $badge.removeClass(ALL_BADGE_CLASSES).addClass(targetClass);
    }

    _applyDotStyles($dot, targetClass) {
        const ALL_DOT_CLASSES = 'bg-amber-500 bg-emerald-500 bg-red-500 animate-pulse';
        $dot.removeClass(ALL_DOT_CLASSES).addClass(targetClass);
    }

    leave() {
        $('#details-sidebar').hide();
        $('#tip').removeClass('show');
    }
}