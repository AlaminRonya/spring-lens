import Route from './src/assets/route.js';
import Dashboard from './src/assets/dashboard.js';
import BeanGraph from './src/assets/bean-graph.js';
import BeanTimeline from './src/assets/bean-timeline.js';
import BeanDataLoader from './src/assets/bean-data-loader.js';
import BeanDefinitions from './src/assets/bean-definitions.js';
import RequestEndpoints from './src/assets/request-endpoints.js';
import RequestDefinitions from './src/assets/request-definitions.js';
import { getApiUrl } from './src/assets/utils.js';

$(document).ready(() => {

    const dataLoader = new BeanDataLoader(getApiUrl('/spring-lens/api/beans/definitions'));
    const beanGraph = new BeanGraph(dataLoader);
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