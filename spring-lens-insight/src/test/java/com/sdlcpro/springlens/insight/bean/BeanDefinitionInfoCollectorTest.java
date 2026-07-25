package com.sdlcpro.springlens.insight.bean;

import com.example.testapp.SampleAppBean;
import com.sdlcpro.springlens.annotation.SpringLensInternalComponent;
import com.sdlcpro.springlens.model.bean.definition.BeanDefinitionInfo;
import com.sdlcpro.springlens.repository.bean.BeanDefinitionInfoRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.beans.factory.support.RootBeanDefinition;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.support.GenericApplicationContext;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class BeanDefinitionInfoCollectorTest {

    @Mock
    private BeanDefinitionInfoRepository repository;

    @SpringLensInternalComponent
    static class LensInternalBean {
    }

    @Test
    void collectsApplicationBeanFromContext() {
        AnnotationConfigApplicationContext ctx = new AnnotationConfigApplicationContext();
        ctx.setId("child-ctx");
        ctx.register(SampleAppBean.class);
        ctx.refresh();

        BeanInfoCollectorSettings settings =
                new BeanInfoCollectorSettings(false, false, Set.of(), Set.of());
        BeanDefinitionInfoCollector collector =
                new BeanDefinitionInfoCollector(ctx, settings, repository);

        collector.afterSingletonsInstantiated();

        ArgumentCaptor<BeanDefinitionInfo> captor = ArgumentCaptor.forClass(BeanDefinitionInfo.class);
        verify(repository, atLeastOnce()).save(captor.capture());
        assertThat(captor.getAllValues())
                .extracting(BeanDefinitionInfo::beanName)
                .anyMatch(name -> name.contains("SampleAppBean") || name.equals("sampleAppBean"));
        assertThat(captor.getAllValues())
                .extracting(BeanDefinitionInfo::type)
                .anyMatch(t -> t != null && t.contains("SampleAppBean"));
        assertThat(captor.getAllValues())
                .filteredOn(info -> info.type() != null && info.type().contains("SampleAppBean"))
                .extracting(BeanDefinitionInfo::scope)
                .containsExactly("singleton");
        ctx.close();
    }

    @Test
    void skipsInfrastructureRoleWhenIncludeInfraFalse() {
        GenericApplicationContext ctx = new GenericApplicationContext();
        ctx.setId("infra-ctx");
        RootBeanDefinition bd = new RootBeanDefinition(String.class);
        bd.setRole(BeanDefinition.ROLE_INFRASTRUCTURE);
        ctx.registerBeanDefinition("infraBean", bd);
        ctx.refresh();

        BeanInfoCollectorSettings settings =
                new BeanInfoCollectorSettings(false, false, Set.of(), Set.of());
        new BeanDefinitionInfoCollector(ctx, settings, repository).afterSingletonsInstantiated();

        verify(repository, never()).save(org.mockito.ArgumentMatchers.argThat(
                info -> "infraBean".equals(info.beanName())));
        ctx.close();
    }

    @Test
    void skipsToolInternalWhenIncludeToolInternalFalse() {
        AnnotationConfigApplicationContext ctx = new AnnotationConfigApplicationContext();
        ctx.setId("tool-ctx");
        ctx.register(LensInternalBean.class);
        ctx.refresh();

        BeanInfoCollectorSettings settings =
                new BeanInfoCollectorSettings(false, false, Set.of(), Set.of());
        new BeanDefinitionInfoCollector(ctx, settings, repository).afterSingletonsInstantiated();

        verify(repository, never()).save(org.mockito.ArgumentMatchers.argThat(
                info -> info.type() != null && info.type().contains("LensInternalBean")));
        ctx.close();
    }

    @Test
    void doesNotThrowWhenClassNameUnresolvedWithExcludePackages() {
        GenericApplicationContext ctx = new GenericApplicationContext();
        ctx.setId("no-type-ctx");
        RootBeanDefinition bd = new RootBeanDefinition();
        bd.setAbstract(true);
        ctx.registerBeanDefinition("abstractBean", bd);
        ctx.refresh();

        BeanInfoCollectorSettings settings =
                new BeanInfoCollectorSettings(true, true, Set.of("com.example.**"), Set.of());
        new BeanDefinitionInfoCollector(ctx, settings, repository).afterSingletonsInstantiated();

        ctx.close();
    }

    @Test
    void walksParentContext() {
        GenericApplicationContext parent = new GenericApplicationContext();
        parent.setId("parent-ctx");
        parent.registerBeanDefinition("parentBean", new RootBeanDefinition(String.class));
        parent.refresh();

        GenericApplicationContext child = new GenericApplicationContext(parent);
        child.setId("child-ctx");
        child.registerBeanDefinition("childBean", new RootBeanDefinition(Object.class));
        child.refresh();

        BeanInfoCollectorSettings settings =
                new BeanInfoCollectorSettings(true, true, Set.of(), Set.of());
        new BeanDefinitionInfoCollector(child, settings, repository).afterSingletonsInstantiated();

        ArgumentCaptor<BeanDefinitionInfo> captor = ArgumentCaptor.forClass(BeanDefinitionInfo.class);
        verify(repository, atLeastOnce()).save(captor.capture());
        List<String> names = captor.getAllValues().stream().map(BeanDefinitionInfo::beanName).toList();
        assertThat(names).contains("parentBean", "childBean");
        child.close();
        parent.close();
    }
}
