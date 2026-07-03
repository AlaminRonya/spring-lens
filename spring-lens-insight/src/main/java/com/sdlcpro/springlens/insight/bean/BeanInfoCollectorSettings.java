package com.sdlcpro.springlens.insight.bean;

import java.util.Collections;
import java.util.Set;

public record BeanInfoCollectorSettings(
        boolean includeInfraRole,
        boolean includeToolInternal,
        Set<String> excludePackagePatterns,
        Set<String> excludeClasses
) {

    public BeanInfoCollectorSettings {
        excludePackagePatterns = excludePackagePatterns != null ? Set.copyOf(excludePackagePatterns) : Collections.emptySet();
        excludeClasses = excludeClasses != null ? Set.copyOf(excludeClasses) : Collections.emptySet();
    }
}
