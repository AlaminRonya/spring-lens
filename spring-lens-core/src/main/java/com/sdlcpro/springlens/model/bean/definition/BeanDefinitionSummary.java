package com.sdlcpro.springlens.model.bean.definition;

import com.sdlcpro.springlens.model.bean.BeanRole;
import com.sdlcpro.springlens.model.bean.LoadingMode;
import com.sdlcpro.springlens.util.NullSafe;
import com.sdlcpro.springlens.util.Preconditions;

import java.util.Map;

import static com.sdlcpro.springlens.util.NullSafe.emptyIfNull;

/**
 * Immutable summary of bean definition metrics across Spring application
 * contexts.
 *
 * <p>The summary contains distributions of bean definitions by application
 * context, scope, role, and loading mode, together with the total number of
 * bean definitions.</p>
 *
 * @param contextDistribution distribution of bean definitions by context
 * @param scopeDistribution distribution of bean definitions by scope
 * @param roleDistribution distribution of bean definitions by role
 * @param loadingModeDistribution distribution of bean definitions by loading mode
 * @param totalBeanDefinitions total number of bean definitions
 */
public record BeanDefinitionSummary(
        Map<String, Integer> contextDistribution,
        Map<String, Integer> scopeDistribution,
        Map<BeanRole, Integer> roleDistribution,
        Map<LoadingMode, Integer> loadingModeDistribution,
        long totalBeanDefinitions
) {

    public BeanDefinitionSummary {
        contextDistribution = NullSafe.emptyIfNull(contextDistribution);
        scopeDistribution = NullSafe.emptyIfNull(scopeDistribution);
        roleDistribution = NullSafe.emptyIfNull(roleDistribution);
        loadingModeDistribution = NullSafe.emptyIfNull(loadingModeDistribution);

        Preconditions.isTrue(
                totalBeanDefinitions >= 0,
                "Total bean definition count must not be negative value"
        );
    }

    /**
     * Creates an empty bean definition summary.
     *
     * @return an empty summary with zero total bean definitions
     */
    public static BeanDefinitionSummary empty() {
        return new BeanDefinitionSummary(
                Map.of(),
                Map.of(),
                Map.of(),
                Map.of(),
                0L
        );
    }
}
