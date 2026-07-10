package com.sdlcpro.springlens.model.http.endpoint;

/**
 * Defines the architectural execution model of a discovered HTTP endpoint.
 * <p>
 * Spring applications can expose request mappings through multiple routing
 * mechanisms, including traditional annotation-driven controllers and
 * functional routing APIs. This enumeration enables Spring Lens to classify
 * endpoint handlers consistently for telemetry collection, routing analysis,
 * and dashboard visualization.
 */
public enum HandlerType {

    /**
     * Represents a conventional annotation-driven endpoint implemented using
     * Spring MVC annotations such as {@code @Controller} or
     * {@code @RestController}.
     */
    CONTROLLER,

    /**
     * Represents a functional endpoint implemented using Spring's
     * {@code RouterFunction} and related functional routing APIs.
     */
    FUNCTIONAL,

    /**
     * Represents an endpoint whose execution model could not be determined.
     * This value acts as a safe fallback for unsupported, custom, or
     * third-party routing implementations.
     */
    UNKNOWN
}