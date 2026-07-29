package com.sdlcpro.springlens.insight.http.endpoint;

import com.sdlcpro.springlens.matcher.CompositeMatcher;
import com.sdlcpro.springlens.util.Preconditions;

import java.util.concurrent.atomic.AtomicInteger;

/**
 * Base class for {@link EndpointInfoCollector} implementations, providing shared
 * ID generation and inclusion-matching logic for discovered endpoints.
 *
 * <p>Subclasses implement {@link EndpointInfoCollector#collect}, typically wrapping each
 * candidate handler entry (e.g. a {@code RequestMappingInfo}/{@code HandlerMethod} pair)
 * in an {@link EndpointInfoContext}, filtering it via
 * {@link #isEligibleToCollectInfo(EndpointInfoContext)}, and assigning it an ID via
 * {@link #nextEndpointInfoId()} before adding it to the result list.</p>
 */
public abstract class AbstractEndpointInfoCollector implements EndpointInfoCollector {

    private final AtomicInteger idGenerator;

    private final CompositeMatcher<EndpointInfoContext> endpointInfoCollectionMatcher;

    /**
     * @param idGenerator                   shared counter for assigning unique endpoint IDs
     * @param endpointInfoCollectionMatcher matcher used to filter eligible endpoint contexts
     * @throws NullPointerException if either argument is {@code null}
     */
    protected AbstractEndpointInfoCollector(
            AtomicInteger idGenerator,
            CompositeMatcher<EndpointInfoContext> endpointInfoCollectionMatcher) {
        this.idGenerator = Preconditions.requireNonNull(idGenerator, "The value of idGenerator must not be null");
        this.endpointInfoCollectionMatcher = Preconditions.requireNonNull(
                endpointInfoCollectionMatcher, "CompositeMatcher<EndpointInfoContext> must not be null");
    }

    /**
     * Returns whether the given context is eligible for collection based on the
     * configured matcher.
     */
    protected boolean isEligibleToCollectInfo(EndpointInfoContext context) {
        return this.endpointInfoCollectionMatcher.matches(context);
    }

    /**
     * Atomically returns the next unique endpoint identifier.
     */
    protected int nextEndpointInfoId() {
        return this.idGenerator.incrementAndGet();
    }
}