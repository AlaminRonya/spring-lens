package com.sdlcpro.springlens.insight.support.provider;

/**
 * A functional supplier interface for retrieving a {@link Class} reference
 * within the Spring Lens data-extraction pipeline.
 *
 * <p>Implementations of this interface enable runtime analyzer modules to
 * reflect on object classes, providing structural Java typing information
 * that is essential for bean introspection, dependency analysis, and
 * type-level metadata resolution.</p>
 *
 * <p>Because this interface declares exactly one abstract method, it is
 * marked as a {@link FunctionalInterface} and can be expressed as a
 * lambda expression or method reference.</p>
 *
 * @since 1.0.0
 * @see ClassNameProvider
 * @see StringValueProvider
 */
@FunctionalInterface
public interface ClassProvider {

    /**
     * Returns the {@link Class} object associated with the target component.
     *
     * @return the class reference produced by this provider; may be {@code null}
     *         if the class cannot be resolved
     */
    Class<?> getClazz();

}
