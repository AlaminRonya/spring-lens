package com.sdlcpro.springlens.insight.bean;

import java.util.Set;

import static com.sdlcpro.springlens.util.NullSafe.emptyIfNull;

public record BeanInfoCollectorSettings(
        boolean includeInfraRole,
        boolean includeToolInternal,
        Set<String> excludePackagePatterns,
        Set<String> excludeClasses
) {

    public BeanInfoCollectorSettings {
        excludePackagePatterns = emptyIfNull(excludePackagePatterns);
        excludeClasses = emptyIfNull(excludeClasses);
    }
}
