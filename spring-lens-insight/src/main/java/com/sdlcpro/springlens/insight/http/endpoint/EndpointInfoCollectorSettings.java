package com.sdlcpro.springlens.insight.http.endpoint;

import java.util.Set;

import com.sdlcpro.springlens.model.http.HttpRequestMethod;
import com.sdlcpro.springlens.model.http.endpoint.HandlerType;

/**
 * Immutable configuration settings used by endpoint information collectors.
 * <p>
 * This configuration controls which endpoints are considered during endpoint
 * discovery and collection.
 * </p>
 *
 * <ul>
 *     <li>{@code includeToolInternal} determines whether internal framework
 *     endpoints should be included.</li>
 *     <li>{@code excludeUriPatterns} defines URI path patterns to ignore.</li>
 *     <li>{@code excludeMethods} defines HTTP methods to exclude.</li>
 *     <li>{@code excludeHandlerTypes} defines handler architectures to skip.</li>
 * </ul>
 *
 * <p>
 * All collection-based properties are defensively copied during construction to
 * guarantee immutability and prevent external modifications after
 * instantiation.
 * </p>
 *
 * @param includeToolInternal whether internally exposed endpoints should be collected
 * @param excludeUriPatterns URI path patterns to ignore
 * @param excludeMethods HTTP methods to exclude
 * @param excludeHandlerTypes handler types to exclude
 */
public record EndpointInfoCollectorSettings(
        boolean includeToolInternal,
        Set<String> excludeUriPatterns,
        Set<HttpRequestMethod> excludeMethods,
        Set<HandlerType> excludeHandlerTypes
) {

    /**
     * Creates immutable collector settings.
     */
    public EndpointInfoCollectorSettings {
        excludeUriPatterns = excludeUriPatterns == null ? Set.of() : Set.copyOf(excludeUriPatterns);

        excludeMethods = excludeMethods == null ? Set.of() : Set.copyOf(excludeMethods);

        excludeHandlerTypes = excludeHandlerTypes == null ? Set.of() : Set.copyOf(excludeHandlerTypes);
    }
}