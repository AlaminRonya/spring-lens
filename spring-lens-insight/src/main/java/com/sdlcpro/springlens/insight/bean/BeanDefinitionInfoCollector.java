package com.sdlcpro.springlens.insight.bean;

import com.sdlcpro.springlens.annotation.SpringLensInternalComponent;
import com.sdlcpro.springlens.insight.support.matcher.ClassNameMatcher;
import com.sdlcpro.springlens.insight.support.matcher.PackageMatcher;
import com.sdlcpro.springlens.model.bean.BeanRole;
import com.sdlcpro.springlens.model.bean.definition.BeanDefinitionInfo;
import com.sdlcpro.springlens.repository.bean.BeanDefinitionInfoRepository;
import com.sdlcpro.springlens.util.ClassInspector;
import org.springframework.beans.factory.ListableBeanFactory;
import org.springframework.beans.factory.SmartInitializingSingleton;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.beans.factory.config.ConfigurableBeanFactory;
import org.springframework.beans.factory.config.ConfigurableListableBeanFactory;
import org.springframework.beans.factory.support.AbstractBeanDefinition;
import org.springframework.context.ApplicationContext;
import org.springframework.context.ConfigurableApplicationContext;

import java.util.Arrays;
import java.util.List;

/**
 * Collects {@link BeanDefinitionInfo} from the ApplicationContext hierarchy after singletons start.
 * ConditionEvaluationReport enrichment is deferred until BeanConditionInfo exists.
 */
public final class BeanDefinitionInfoCollector implements SmartInitializingSingleton {

    private static final String LENS_PACKAGE_PREFIX = "com.sdlcpro.springlens";

    private final ApplicationContext applicationContext;
    private final BeanInfoCollectorSettings settings;
    private final BeanDefinitionInfoRepository repository;
    private final InfraBeanRoleMatcher<BeanInfoCollectionContext> infraMatcher = new InfraBeanRoleMatcher<>();
    private final PackageMatcher<BeanInfoCollectionContext> packageMatcher;
    private final ClassNameMatcher<BeanInfoCollectionContext> classNameMatcher;

    public BeanDefinitionInfoCollector(
            ApplicationContext applicationContext,
            BeanInfoCollectorSettings settings,
            BeanDefinitionInfoRepository repository) {
        this.applicationContext = applicationContext;
        this.settings = settings;
        this.repository = repository;
        this.packageMatcher = new PackageMatcher<>(settings.excludePackagePatterns());
        this.classNameMatcher = new ClassNameMatcher<>(settings.excludeClasses());
    }

    @Override
    public void afterSingletonsInstantiated() {
        ApplicationContext current = applicationContext;
        while (current != null) {
            collectFrom(current);
            current = current.getParent();
        }
    }

    private void collectFrom(ApplicationContext context) {
        if (!(context instanceof ConfigurableApplicationContext configurable)) {
            return;
        }
        ConfigurableListableBeanFactory beanFactory = configurable.getBeanFactory();
        String contextId = resolveContextId(context);
        for (String beanName : beanFactory.getBeanDefinitionNames()) {
            if (!beanFactory.containsBeanDefinition(beanName)) {
                continue;
            }
            BeanDefinition definition = beanFactory.getBeanDefinition(beanName);
            BeanInfoCollectionContext collectionContext = toCollectionContext(beanFactory, beanName, definition);
            if (shouldSkip(collectionContext)) {
                continue;
            }
            repository.save(toInfo(contextId, beanFactory, beanName, definition, collectionContext));
        }
    }

    private boolean shouldSkip(BeanInfoCollectionContext collectionContext) {
        if (!settings.includeInfraRole() && infraMatcher.matches(collectionContext)) {
            return true;
        }
        if (!settings.includeToolInternal() && isToolInternal(collectionContext)) {
            return true;
        }
        if (collectionContext.getClassName() != null && packageMatcher.matches(collectionContext)) {
            return true;
        }
        return classNameMatcher.matches(collectionContext);
    }

    private boolean isToolInternal(BeanInfoCollectionContext collectionContext) {
        String className = collectionContext.getClassName();
        if (className != null && className.startsWith(LENS_PACKAGE_PREFIX)) {
            return true;
        }
        Class<?> clazz = collectionContext.getClazz();
        return clazz != null && ClassInspector.hasAnnotation(clazz, SpringLensInternalComponent.class);
    }

    private BeanInfoCollectionContext toCollectionContext(
            ConfigurableListableBeanFactory beanFactory, String beanName, BeanDefinition definition) {
        BeanRole role = BeanRole.from(definition.getRole());
        return new BeanInfoCollectionContext(
                role,
                () -> resolveClassName(beanFactory, beanName, definition),
                () -> resolveClass(beanFactory, beanName, definition)
        );
    }

    private BeanDefinitionInfo toInfo(
            String contextId,
            ConfigurableListableBeanFactory beanFactory,
            String beanName,
            BeanDefinition definition,
            BeanInfoCollectionContext collectionContext) {
        String[] aliases = beanFactory.getAliases(beanName);
        String[] dependencies = definition.getDependsOn();
        return new BeanDefinitionInfo(
                contextId,
                beanName,
                aliases == null ? List.of() : Arrays.asList(aliases),
                collectionContext.getClassName(),
                definition.getResourceDescription(),
                definition.getDescription(),
                normalizeScope(definition.getScope()),
                lazyInit(definition),
                definition.isPrimary(),
                definition.isAutowireCandidate(),
                collectionContext.getBeanRole(),
                initMethodName(definition),
                destroyMethodName(definition),
                definition.getFactoryBeanName(),
                definition.getFactoryMethodName(),
                dependencies == null ? List.of() : Arrays.asList(dependencies),
                List.of(beanFactory.getDependentBeans(beanName))
        );
    }

    private static boolean lazyInit(BeanDefinition definition) {
        Boolean lazy = definition.isLazyInit() ? Boolean.TRUE : Boolean.FALSE;
        if (definition instanceof AbstractBeanDefinition abd && abd.getLazyInit() != null) {
            return Boolean.TRUE.equals(abd.getLazyInit());
        }
        return lazy;
    }

    private static String initMethodName(BeanDefinition definition) {
        return definition instanceof AbstractBeanDefinition abd ? abd.getInitMethodName() : null;
    }

    private static String destroyMethodName(BeanDefinition definition) {
        return definition instanceof AbstractBeanDefinition abd ? abd.getDestroyMethodName() : null;
    }

    private static String normalizeScope(String scope) {
        return scope != null && !scope.isBlank()
                ? scope
                : ConfigurableBeanFactory.SCOPE_SINGLETON;
    }

    private static String resolveContextId(ApplicationContext context) {
        String id = context.getId();
        return id != null && !id.isBlank() ? id : "application-" + Integer.toHexString(System.identityHashCode(context));
    }

    private static String resolveClassName(
            ListableBeanFactory beanFactory, String beanName, BeanDefinition definition) {
        String className = definition.getBeanClassName();
        if (className != null) {
            return className;
        }
        try {
            Class<?> type = beanFactory.getType(beanName);
            return type != null ? type.getName() : null;
        } catch (RuntimeException ex) {
            return null;
        }
    }

    private static Class<?> resolveClass(
            ListableBeanFactory beanFactory, String beanName, BeanDefinition definition) {
        try {
            if (definition instanceof AbstractBeanDefinition abd && abd.hasBeanClass()) {
                return abd.getBeanClass();
            }
            return beanFactory.getType(beanName);
        } catch (RuntimeException ex) {
            return null;
        }
    }
}
