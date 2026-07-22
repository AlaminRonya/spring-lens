package com.sdlcpro.springlens.insight.http;

/**
 * A functional interface for retrieving the HTTP URI associated with a target
 * endpoint or request context.
 *
 * <p>Implementations provide URI path patterns that can be used by endpoint
 * analysis and matching components during framework scanning.</p>
 *
 * @since 1.0.0
 */
@FunctionalInterface
public interface HttpUriProvider {

    /**
     * Returns the HTTP URI path or pattern associated with the target.
     *
     * @return the HTTP URI path or pattern
     */
    String getHttpUri();

}