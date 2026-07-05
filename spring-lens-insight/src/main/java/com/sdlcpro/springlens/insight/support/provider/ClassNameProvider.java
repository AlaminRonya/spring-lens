package com.sdlcpro.springlens.insight.support.provider;

/**
 * A provider interface for retrieving the fully-qualified class name of a
 * target component within the Spring Lens data-extraction pipeline.
 *
 * <p>This interface extends {@link StringValueProvider} to cleanly bridge
 * raw string value extractions with structural Java typing strategies.
 * By overriding {@link StringValueProvider#getValue()} with a
 * {@code default} implementation that delegates directly to
 * {@link #getClassName()}, consumers that operate on generic
 * {@link StringValueProvider} instances can seamlessly receive class name
 * values without additional adaptation logic.</p>
 *
 * <p>Unlike {@link StringValueProvider} and {@link ClassProvider}, this
 * interface is <strong>not</strong> a {@link FunctionalInterface} by design,
 * since it inherits the {@code getValue()} method from its parent and
 * provides a default implementation, making the contract richer than a
 * single abstract method.</p>
 *
 * @since 1.0.0
 * @see StringValueProvider
 * @see ClassProvider
 */
public interface ClassNameProvider extends StringValueProvider {

    /**
     * Returns the fully-qualified class name of the target component.
     *
     * @return the class name produced by this provider; may be {@code null}
     *         if the class name cannot be determined
     */
    String getClassName();

    /**
     * {@inheritDoc}
     *
     * <p>This default implementation delegates to {@link #getClassName()},
     * bridging the generic string value contract with the class-name-specific
     * extraction strategy.</p>
     *
     * @return the result of {@link #getClassName()}
     */
    @Override
    default String getValue() {
        return this.getClassName();
    }
}
