package com.sdlcpro.springlens.insight.http.endpoint;

import com.sdlcpro.springlens.model.http.endpoint.HandlerType;

/**
 * A functional provider interface that exposes the {@link HandlerType} of a
 * target HTTP endpoint insight tracking object.
 *
 * <p>By abstracting the handler classification behind this provider contract,
 * route-filtering and metadata processing logic is cleanly decoupled from
 * concrete endpoint models. Consumers can uniformly query whether an endpoint
 * is backed by a {@linkplain HandlerType#CONTROLLER controller},
 * {@linkplain HandlerType#FUNCTIONAL functional} handler, or an
 * {@linkplain HandlerType#UNKNOWN unknown} execution model without depending
 * on the specific model hierarchy that produced the classification.</p>
 *
 * <p>Because this interface declares exactly one abstract method, it is
 * marked as a {@link FunctionalInterface} and can be expressed as a
 * lambda expression or method reference.</p>
 *
 * @since 1.0.0
 * @see HandlerType
 */
@FunctionalInterface
public interface HandlerTypeProvider {

    /**
     * Returns the {@link HandlerType} associated with the target endpoint.
     *
     * @return the handler type classification, or {@code null} when the type
     *         cannot be determined by the provider implementation
     */
    HandlerType getHandlerType();
}
