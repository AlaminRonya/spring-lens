import Route from './src/assets/route.js';
import DashboardController from './src/assets/dashboard-controller.js';
import BeanDefinitions from './src/assets/bean-definition-controller.js';
import BeanInstanceController from './src/assets/bean-instance-controller.js';
import {
    BeanDependencyGraphController
} from './src/assets/bean-dependency-graph-controller.js';

$(document).ready(() => {

    const host = window.location.host;
    const pathname = window.location.pathname;

    const CONTEXT_PATH = pathname.replace("/spring-lens/ui/index.html", "")
    const API_BASE_URL = host + CONTEXT_PATH + '/spring-lens/api/beans/definitions'

    const ENDPOINTS = {
        SEARCH_BEAN             : API_BASE_URL + "/find",
        GRAPH_DEPENDENCIES      : API_BASE_URL + "/dependencies",
        BEAN_DEFINITION_API_URL : API_BASE_URL,
        SUMMARY_BEAN_DEFINITION : API_BASE_URL + "/summary"
    }

    const dashboard = new DashboardController();
    const beanTimeline = new BeanInstanceController();
    const beanDefinitions = new BeanDefinitions(ENDPOINTS.BEAN_DEFINITION_API_URL, ENDPOINTS.SUMMARY_BEAN_DEFINITION);
    const beanDependencyGraph = new BeanDependencyGraphController(ENDPOINTS.GRAPH_DEPENDENCIES, ENDPOINTS.SEARCH_BEAN);

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
            'definitions': {
                template: 'bean-definitions',
                onEnter: () => beanDefinitions.enter(),
                onLeave: () => beanDefinitions.leave()
            },
            'graph': {
                template: 'bean-graph',
                onEnter: () => beanDependencyGraph.enter(),
                onLeave: () => beanDependencyGraph.leave()
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
            },
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
});