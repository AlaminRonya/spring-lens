import { TEMPLATES } from './constants.js';

export default class Route {

    static STYLES = {
        sublink: {
            active: 'text-primary',
            inactive: 'text-gray-500 hover:text-gray-800'
        },
        parent: {
            active: 'text-primary bg-primary-light border-l-2 border-primary',
            inactive: 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
        }
    };

    constructor(config = {}) {
        this.routes = config.routes ?? {};
        this.container = $(config.container ?? '#main-content');
        this.pagesDir = config.pagesDir ?? './src/pages/';
        this.defaultRoute = config.defaultRoute ?? 'definitions';
        this.templateCache = new Map();
        this.activeRouteKey = null;
    }

    init() {
        $(window).on('hashchange', () => {
            this.resolve().catch((error) => console.error("Hashchange route resolution failed:", error));
        });
        this._bindNavEvents();

        this.resolve().catch((error) => console.error("Initial route resolution failed:", error));
    }

    /**
     * Binds delegated navigation and accordion menu handlers.
     * @private
     */
    _bindNavEvents() {
        $(document).on('click', '.parent-link, .nav-link', (event) => {
            event.preventDefault();
            const $target = $(event.currentTarget);
            const page = $target.data('page');
            const isParent = $target.hasClass('parent-link');

            if (!isParent) {
                if (page) this.navigate(page);
                return;
            }

            // Handle parent accordion toggle
            const $submenu = $target.next('.submenu');
            if (!$submenu.length) {
                if (page) this.navigate(page);
                return;
            }

            const isVisible = $submenu.is(':visible');
            const isAlreadyActive = this.activeRouteKey === page;

            if (isVisible && isAlreadyActive) {
                this._toggleSubmenu($submenu, $target, false);
            } else {
                if (!isVisible) {
                    this._toggleSubmenu($submenu, $target, true);
                }
                if (page) this.navigate(page);
            }
        });
    }

    /**
     * Programmatic hash navigation.
     * @param {string} routeKey
     */
    navigate(routeKey) {
        const targetHash = `#/${routeKey}`;
        if (window.location.hash === targetHash) {
            this.resolve();
            return;
        }
        window.location.hash = targetHash;
    }

    /**
     * Matches active route and loads associated template and lifecycle hooks.
     */
    async resolve() {
        const hash = window.location.hash || `#/${this.defaultRoute}`;
        const routeKey = hash.replace(/^#\/?/, '');
        const route = this.routes[routeKey];

        if (!route) {
            this.navigate(this.defaultRoute);
            return;
        }

        // 1. Run cleanup (onLeave) hook for the previous route
        if (this.activeRouteKey && this.activeRouteKey !== routeKey) {
            try {
                this.routes[this.activeRouteKey]?.onLeave?.();
            } catch (error) {
                console.error(`Error executing onLeave hook for route ${this.activeRouteKey}:`, error);
            }
        }

        const isSameRoute = this.activeRouteKey === routeKey;
        this.activeRouteKey = routeKey;

        // 2. Render route template if changed or container is empty
        if (!isSameRoute || !this.container.children().length) {
            this.container.html(TEMPLATES.loading);

            try {
                const html = await this._loadTemplate(routeKey, route.template);
                this.container.html(html);
                route.onEnter?.();
            } catch (error) {
                console.error(`Routing error loading template for ${routeKey}:`, error);
                this._renderError(error.message);
                return;
            }
        }

        this.updateSidebarVisuals(routeKey);
    }

    /**
     * Retrieves template from cache or fetches over network.
     * @private
     */
    async _loadTemplate(routeKey, templateName) {
        if (this.templateCache.has(routeKey)) {
            return this.templateCache.get(routeKey);
        }

        const url = `${this.pagesDir}${templateName}.html`;
        const html = await $.get(url);
        this.templateCache.set(routeKey, html);
        return html;
    }

    /**
     * Render routing error panel and bind retry action.
     * @private
     */
    _renderError(message) {
        this.container.html(TEMPLATES.error(message));
        this.container.find('#retry-load-btn').off('click').on('click', () => this.resolve());
    }

    /**
     * Updates visual states for navigation links and manages submenu expansion.
     * @param {string} activePage
     */
    updateSidebarVisuals(activePage) {
        const { sublink, parent } = Route.STYLES;

        $('aside nav a').each((_, element) => {
            const $link = $(element);
            const pageAttr = $link.data('page');
            const isSubLink = $link.parent().hasClass('submenu');
            const isActive = pageAttr === activePage;

            if (isSubLink) {
                $link.toggleClass(sublink.active, isActive)
                    .toggleClass(sublink.inactive, !isActive);

                if (isActive) {
                    const $submenu = $link.parent('.submenu');
                    this._toggleSubmenu($submenu, $submenu.prev('.parent-link'), true);
                }
                return;
            }

            const isParent = $link.hasClass('parent-link');
            const $submenu = isParent ? $link.next('.submenu') : $();
            const hasActiveChild = $submenu.length > 0 && $submenu.find(`[data-page="${activePage}"]`).length > 0;
            const isParentActive = isActive || hasActiveChild;

            $link.toggleClass(parent.active, isParentActive)
                .toggleClass(parent.inactive, !isParentActive);

            if (isParentActive && isParent) {
                this._toggleSubmenu($submenu, $link, true);
            }
        });

        // Auto-collapse inactive submenus
        $('.submenu').each((_, element) => {
            const $submenu = $(element);
            const hasActiveChild = $submenu.find(`[data-page="${activePage}"]`).length > 0;
            const isParentActive = $submenu.prev(`.parent-link[data-page="${activePage}"]`).length > 0;

            if (!hasActiveChild && !isParentActive) {
                this._toggleSubmenu($submenu, $submenu.prev('.parent-link'), false);
            }
        });
    }

    /**
     * Helper to slide toggle submenus and rotate chevron icons cleanly.
     * @private
     */
    _toggleSubmenu($submenu, $parentLink, shouldExpand) {
        if (!$submenu?.length) return;

        if (shouldExpand && $submenu.is(':hidden')) {
            $submenu.stop(true, true).slideDown(200);
            $parentLink.find('.chevron-icon').addClass('rotate-180');
        } else if (!shouldExpand && $submenu.is(':visible')) {
            $submenu.stop(true, true).slideUp(200);
            $parentLink.find('.chevron-icon').removeClass('rotate-180');
        }
    }
}