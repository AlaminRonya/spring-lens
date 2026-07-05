package com.sdlcpro.springlens.insight.support.provider;

/**
 * A functional supplier interface for extracting raw {@link String} values
 * within the Spring Lens data-extraction pipeline.
 *
 * <p>Implementations of this interface serve as the most fundamental
 * text-based value extraction strategy, enabling runtime analyzer modules
 * to systematically retrieve string representations of metadata,
 * configuration properties, or any other textual artifact from the
 * application context.</p>
 *
 * <p>Because this interface declares exactly one abstract method, it is
 * marked as a {@link FunctionalInterface} and can be expressed as a
 * lambda expression or method reference.</p>
 *
 * @since 1.0.0
 * @see ClassNameProvider
 */
@FunctionalInterface
public interface StringValueProvider {

    /**
     * Returns the extracted string value.
     *
     * @return the string value produced by this provider; may be {@code null}
     *         if no value is available
     */
    String getValue();

}
