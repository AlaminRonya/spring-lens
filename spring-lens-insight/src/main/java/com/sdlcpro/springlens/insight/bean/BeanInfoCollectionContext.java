package com.sdlcpro.springlens.insight.bean;

import com.sdlcpro.springlens.insight.support.provider.ClassNameProvider;
import com.sdlcpro.springlens.insight.support.provider.ClassProvider;
import com.sdlcpro.springlens.model.bean.BeanRole;

import java.util.function.Supplier;

/**
 * An immutable data carrier that unifies the key structural details needed
 * during runtime bean metadata collection.
 *
 * <p>By implementing {@link ClassNameProvider}, {@link ClassProvider}, and
 * {@link BeanRoleProvider}, this record offers a single consolidated context
 * object that downstream matchers and analyzers can query without coupling
 * to the specific pipeline stage that produced each piece of information.</p>
 *
 * <h3>Lazy Supplier Encapsulation</h3>
 * <p>The {@code classNameSupplier} and {@code classSupplier} parameters wrap
 * potentially expensive operations — such as reflective class loading or
 * package name parsing — inside standard {@link Supplier} hooks. The
 * underlying computation is therefore <strong>only executed</strong> when a
 * downstream consumer explicitly calls {@link #getClassName()} or
 * {@link #getClazz()}, avoiding unnecessary overhead during the initial
 * collection phase.</p>
 *
 * <p>Both supplier fields accept {@code null}; in that case the corresponding
 * accessor method returns {@code null} as a safe sentinel value.</p>
 *
 * @param role              the {@link BeanRole} classification for the target bean;
 *                          may be {@code null}
 * @param classNameSupplier a lazy supplier for the fully-qualified class name;
 *                          may be {@code null}
 * @param classSupplier     a lazy supplier for the resolved {@link Class} reference;
 *                          may be {@code null}
 * @since 1.0.0
 * @see ClassNameProvider
 * @see ClassProvider
 * @see BeanRoleProvider
 */
public record BeanInfoCollectionContext(
        BeanRole role,
        Supplier<String> classNameSupplier,
        Supplier<Class<?>> classSupplier
) implements ClassNameProvider, ClassProvider, BeanRoleProvider {

    /**
     * {@inheritDoc}
     *
     * <p>Delegates to the {@code classNameSupplier} if present; returns
     * {@code null} otherwise. The supplier is invoked on every call — if
     * caching is required, the caller should wrap the supplier in a
     * memoizing decorator.</p>
     *
     * @return the fully-qualified class name, or {@code null} if the
     *         supplier is absent
     */
    @Override
    public String getClassName() {
        return this.classNameSupplier != null ? this.classNameSupplier.get() : null;
    }

    /**
     * {@inheritDoc}
     *
     * <p>Delegates to the {@code classSupplier} if present; returns
     * {@code null} otherwise. Because class loading can be expensive,
     * this method should only be called when reflective type information
     * is actually needed.</p>
     *
     * @return the resolved {@link Class} reference, or {@code null} if the
     *         supplier is absent
     */
    @Override
    public Class<?> getClazz() {
        return this.classSupplier != null ? this.classSupplier.get() : null;
    }

    /**
     * {@inheritDoc}
     *
     * @return the {@link BeanRole} held by this context
     */
    @Override
    public BeanRole getBeanRole() {
        return this.role;
    }
}
