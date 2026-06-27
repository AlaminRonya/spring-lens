package com.sdlcpro.springlens.model.bean.definition;

import com.sdlcpro.springlens.model.bean.BeanRole;

import java.util.List;

public record BeanDefinitionInfo(
        String contextId,
        String beanName,
        List<String> aliases,
        String type,
        String resource,
        String description,
        String scope,
        boolean lazyInit,
        boolean primary,
        boolean autowireCandidate,
        BeanRole role,
        String initMethodName,
        String destroyMethodName,
        String factoryBeanName,
        String factoryMethodName,
        List<String> dependencies,
        List<String> dependents
) {


    public BeanDefinitionInfo {
        aliases = aliases == null ? List.of() : List.copyOf(aliases);
        dependencies = dependencies == null ? List.of() : List.copyOf(dependencies);
        dependents = dependents == null ? List.of() : List.copyOf(dependents);
    }
}
