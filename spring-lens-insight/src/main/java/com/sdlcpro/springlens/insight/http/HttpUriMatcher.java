package com.sdlcpro.springlens.insight.http;

import com.sdlcpro.springlens.matcher.Matcher;
import org.springframework.util.AntPathMatcher;

import java.util.Set;

/**
 * Matches HTTP URI paths against configured Ant-style path patterns.
 *
 * <p>The configured patterns are copied into an immutable set during
 * construction. A {@code null} or empty set produces a matcher that does not
 * match any context.</p>
 *
 * @param <T> the type of context that provides an HTTP URI
 * @since 1.0.0
 * @see HttpUriProvider
 * @see AntPathMatcher
 */
public final class HttpUriMatcher<T extends HttpUriProvider> implements Matcher<T> {

    private static final AntPathMatcher URI_MATCHER = new AntPathMatcher();

    private final Set<String> uriPatterns;

    /**
     * Creates a matcher for the supplied URI patterns.
     *
     * <p>The supplied set is defensively copied using {@link Set#copyOf(java.util.Collection)}.
     * Passing {@code null} creates a matcher with no patterns.</p>
     *
     * @param uriPatterns the Ant-style URI patterns to match; may be {@code null}
     */
    public HttpUriMatcher(Set<String> uriPatterns) {
        this.uriPatterns = uriPatterns == null ? Set.of() : Set.copyOf(uriPatterns);
    }

    /**
     * Determines whether the context's HTTP URI matches any configured pattern.
     *
     * <p>Returns {@code false} if the context or its URI is {@code null}, or if
     * no patterns are configured. Otherwise, matching is performed with Spring's
     * {@link AntPathMatcher}.</p>
     *
     * @param context the context providing the candidate HTTP URI; may be {@code null}
     * @return {@code true} when at least one configured pattern matches the URI;
     *         {@code false} otherwise
     */
    @Override
    public boolean matches(T context) {
        if (context == null || this.uriPatterns.isEmpty()) {
            return false;
        }

        String uri = context.getHttpUri();
        if (uri == null) {
            return false;
        }

        return this.uriPatterns.stream().anyMatch(pattern -> URI_MATCHER.match(pattern, uri));
    }
}
