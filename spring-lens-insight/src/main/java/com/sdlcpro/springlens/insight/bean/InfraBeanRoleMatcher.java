package com.sdlcpro.springlens.insight.bean;

import com.sdlcpro.springlens.insight.support.matcher.BeanRoleMatcher;
import com.sdlcpro.springlens.model.bean.BeanRole;

import java.util.EnumSet;

/**
 * A specialized, type-safe {@link BeanRoleMatcher} that isolates and identifies
 * Spring internal components classified under the
 * {@link BeanRole#ROLE_INFRASTRUCTURE ROLE_INFRASTRUCTURE} profile.
 *
 * <p>This matcher hardcodes the infrastructure role boundary into an immutable,
 * single-element {@link EnumSet}, removing the need for client engines to pass
 * enum arrays on every lifecycle lookup. As a result, role tracking routines
 * across the metadata processing layer are simplified while remaining strictly
 * aligned with structures capable of exposing their operational taxonomy through
 * {@link BeanRoleProvider}.</p>
 *
 * <p>The class is declared {@code final} to close the extension branch: the
 * infrastructure-only classification is intentional and immutable, and no further
 * specialization is expected.</p>
 *
 * @param <T> the type of context being matched; must be capable of exposing its
 *            {@link BeanRole} via {@link BeanRoleProvider}
 * @since 1.0.0
 * @see BeanRoleMatcher
 * @see BeanRole#ROLE_INFRASTRUCTURE
 */
public final class InfraBeanRoleMatcher<T extends BeanRoleProvider> extends BeanRoleMatcher<T> {

    /**
     * Creates a matcher that accepts only contexts reporting the
     * {@link BeanRole#ROLE_INFRASTRUCTURE} role.
     */
    public InfraBeanRoleMatcher() {
        super(EnumSet.of(BeanRole.ROLE_INFRASTRUCTURE));
    }
}
