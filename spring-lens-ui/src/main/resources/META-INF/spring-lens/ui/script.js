import Route from './src/assets/route.js';
import Dashboard from './src/assets/dashboard.js';
import BeanGraph from './src/assets/bean-graph.js';
import BeanTimeline from './src/assets/bean-timeline.js';
import BeanDataLoader from './src/assets/bean-data-loader.js';
import BeanDefinitions from './src/assets/bean-definitions.js';
import RequestEndpoints from './src/assets/request-endpoints.js';
import RequestDefinitions from './src/assets/request-definitions.js';

$(document).ready(() => {

    // API Configuration
    // Extract the current full pathname
    const host = window.location.host;
    const pathname = window.location.pathname;


    const CONTEXT_PATH = pathname.replace("/spring-lens/ui/index.html", "")
    const API_BASE_URL = host + CONTEXT_PATH + '/spring-lens/api/beans/definitions'

    const ENDPOINTS = {
        BEAN_DEFINITION_API_URL: API_BASE_URL,
        SEARCH_BEAN: API_BASE_URL + "/find",
        GRAPH_DEPENDENCIES: API_BASE_URL + "/dependencies",
        SUMMARY_BEAN_DEFINITION: API_BASE_URL + "/summary"
    }

    const dataLoader = new BeanDataLoader(ENDPOINTS.BEAN_DEFINITION_API_URL);
    const lightGraphDependencies = new BeanDataLoader(ENDPOINTS.GRAPH_DEPENDENCIES);
    const beanGraph = new BeanGraph(lightGraphDependencies);
    const beanDefinitions = new BeanDefinitions(dataLoader);
    const requestDefinitions = new RequestDefinitions();
    const dashboard = new Dashboard(dataLoader);
    const requestEndpoints = new RequestEndpoints();
    const beanTimeline = new BeanTimeline();

    // Configure routes and instantiate Route
    const appRouter = new Route({
        container: '#main-content',
        defaultRoute: 'dashboard',
        routes: {
            'dashboard': {
                template: 'main-dashboard',
                onEnter: () => dashboard.enter(),
                onLeave: () => dashboard.leave()
            },
            'request': {
                template: 'http-request',
                onEnter: () => requestDefinitions.enter(),
                onLeave: () => requestDefinitions.leave()
            },
            'request-endpoint': {
                template: 'request-endpoints',
                onEnter: () => requestEndpoints.enter(),
                onLeave: () => requestEndpoints.leave()
            },
            'definitions': {
                template: 'bean-definitions',
                onEnter: () => beanDefinitions.enter(),
                onLeave: () => beanDefinitions.leave()
            },
            'graph': {
                template: 'bean-graph',
                onEnter: () => beanGraph.enter(),
                onLeave: () => beanGraph.leave()
            },
            'conditions': {
                template: 'bean-condition-reports',
                onEnter: () => beanDefinitions.enter(),
                onLeave: () => beanDefinitions.leave()
            },
            'timeline': {
                template: 'bean-timeline',
                onEnter: () => beanTimeline.enter(),
                onLeave: () => beanTimeline.leave()
            }
        }
    });

    // Start Route
    appRouter.init();

    // Theme toggle interaction handler
    $('#theme-toggle').on('click', () => {
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        document.dispatchEvent(new CustomEvent('themechanged', { detail: { theme: isDark ? 'dark' : 'light' } }));
    });

    /* ── Resize ── */
    let resizeTimer;
    $(window).on('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            beanGraph.handleResize();
        }, 200);
    });
});