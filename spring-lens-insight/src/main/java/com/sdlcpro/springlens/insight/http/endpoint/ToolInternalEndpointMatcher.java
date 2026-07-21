package com.sdlcpro.springlens.insight.http.endpoint;

import com.sdlcpro.springlens.annotation.SpringLensEndpoint;
import com.sdlcpro.springlens.insight.support.matcher.AnnotatedClassMatcher;
import com.sdlcpro.springlens.insight.support.provider.ClassProvider;

import java.util.Set;

/**
 * Matches internal Spring Lens HTTP endpoint components.
 *
 * <p>The matcher is preconfigured for {@link SpringLensEndpoint}, allowing
 * endpoint collection to exclude framework-owned routes without requiring
 * callers to supply annotation metadata.</p>
 *
 * @param <T> the type of context being matched; it must provide a class
 * @since 1.0.0
 */
public class ToolInternalEndpointMatcher<T extends ClassProvider> extends AnnotatedClassMatcher<T> {

    /**
     * Creates a matcher that recognizes classes annotated with
     * {@link SpringLensEndpoint}.
     */
    public ToolInternalEndpointMatcher() {
        super(Set.of(SpringLensEndpoint.class));
    }
}
