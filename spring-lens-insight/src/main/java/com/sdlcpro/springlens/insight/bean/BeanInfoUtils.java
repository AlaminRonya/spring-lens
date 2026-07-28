package com.sdlcpro.springlens.insight.bean;

import com.sdlcpro.springlens.annotation.SpringLensInternalComponent;
import com.sdlcpro.springlens.insight.http.endpoint.ToolInternalEndpointMatcher;
import com.sdlcpro.springlens.insight.support.matcher.ClassNameMatcher;
import com.sdlcpro.springlens.insight.support.matcher.PackageMatcher;
import com.sdlcpro.springlens.matcher.CompositeMatcher;
import com.sdlcpro.springlens.model.bean.BeanRole;
import com.sdlcpro.springlens.util.ClassInspector;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.beans.factory.config.ConfigurableListableBeanFactory;

/**
 * Utility methods for inspecting Spring bean metadata, resolving runtime
 * class details, mapping Spring bean roles, and determining whether a
 * given bean is an internal SpringLens framework component.
 */
public final class BeanInfoUtils {

    private BeanInfoUtils() {
        throw new UnsupportedOperationException("The BeanInfoUtils is an utility class and cannot be instantiated");
    }

    /**
     * Resolves the runtime class of the given bean.
     *
     * @param bean the bean instance, may be null
     * @return the bean's runtime class, or null if the bean is null
     */
    public static Class<?> resolveRuntimeClass(Object bean) {
        return bean != null ? bean.getClass() : null;
    }

    /**
     * Resolves the fully qualified runtime type name of the given bean.
     *
     * @param bean the bean instance, may be null
     * @return the bean's fully qualified type name, or null if the bean is null
     */
    public static String resolveRuntimeBeanType(Object bean) {
        return bean != null ? bean.getClass().getTypeName() : null;
    }

    /**
     * Resolves the {@link BeanRole} of the given bean name using the provided bean factory.
     *
     * @param beanFactory the bean factory to resolve the bean definition from
     * @param beanName the name of the bean
     * @return the resolved bean role
     */
    public static BeanRole resolveBeanRole(ConfigurableListableBeanFactory beanFactory, String beanName) {
        return BeanRole.from(beanFactory.getBeanDefinition(beanName).getRole());
    }

    /**
     * Checks whether the given bean's class is annotated with {@link SpringLensInternalComponent}.
     *
     * @param bean the bean instance, may be null
     * @return true if the bean is a SpringLens internal component, false otherwise
     */
    public static boolean isSpringLensComponent(Object bean) {
        return bean != null && ClassInspector.hasAnnotation(bean.getClass(), SpringLensInternalComponent.class);
    }

    public static String resolveBeanScope(ConfigurableListableBeanFactory beanFactory, String beanName) {
        BeanDefinition definition = beanFactory.getBeanDefinition(beanName);
        var scope = definition.getScope();
        return scope == null || scope.isEmpty()
                ? ConfigurableListableBeanFactory.SCOPE_SINGLETON
                : scope;
    }

    public static String resolveBeanType(ConfigurableListableBeanFactory beanFactory, String beanName) {
        String beanClassName = beanFactory.getBeanDefinition(beanName).getBeanClassName();
        if (beanClassName != null) {
            return beanClassName;
        }

        Class<?> clazz = beanFactory.getType(beanName);
        if (clazz != null) {
            return clazz.getTypeName();
        }

        return null;
    }

    public static CompositeMatcher<BeanInfoCollectionContext> createCollectionMatcher(BeanInfoCollectorSettings settings) {
        var matcher = new CompositeMatcher<BeanInfoCollectionContext>();

        if (!settings.includeInfraRole()) {
            matcher.addExcludeMatcher(new InfraBeanRoleMatcher<>());
        }

        matcher.addExcludeMatcher(new ClassNameMatcher<>(settings.excludeClasses()));
        matcher.addExcludeMatcher(new PackageMatcher<>(settings.excludePackagePatterns()));

        if (!settings.includeToolInternal()) {
            matcher.addExcludeMatcher(new ToolInternalEndpointMatcher<>());
        }

        return matcher;
    }
}
