package com.sdlcpro.springlens.insight.bean;

import com.sdlcpro.springlens.model.bean.BeanRole;

/**
 * A functional provider interface that exposes the {@link BeanRole} of a
 * target insight tracking object.
 *
 * <p>By abstracting the bean role behind this provider contract, metadata
 * processing logic is cleanly decoupled from concrete bean inspection
 * models. Consumers can uniformly query whether a bean serves an
 * {@linkplain BeanRole#ROLE_INFRASTRUCTURE infrastructure},
 * {@linkplain BeanRole#ROLE_APPLICATION application}, or
 * {@linkplain BeanRole#ROLE_SUPPORT support} role without depending on
 * the specific model hierarchy that produced the classification.</p>
 *
 * <p>Because this interface declares exactly one abstract method, it is
 * marked as a {@link FunctionalInterface} and can be expressed as a
 * lambda expression or method reference.</p>
 *
 * @since 1.0.0
 * @see BeanRole
 */
@FunctionalInterface
public interface BeanRoleProvider {

    /**
     * Returns the {@link BeanRole} associated with the target bean.
     *
     * @return the bean role classification; never {@code null} — implementations
     *         should return {@link BeanRole#UNKNOWN} when the role cannot be
     *         determined
     */
    BeanRole getBeanRole();
}
