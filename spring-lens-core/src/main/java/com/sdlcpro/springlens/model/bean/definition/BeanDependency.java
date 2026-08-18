package com.sdlcpro.springlens.model.bean.definition;

import com.sdlcpro.springlens.util.Preconditions;

import java.util.List;

public record BeanDependency(
        String contextId,
        String beanName,
        List<String> dependencies
) {
    public BeanDependency {
        Preconditions.hasText(contextId, "Context id must not be blank");
        Preconditions.hasText(beanName, "Bean name must not be blank");
        dependencies = dependencies == null ? List.of() : List.copyOf(dependencies);
    }
}
