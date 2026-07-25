package com.sdlcpro.springlens.insight.support.matcher;

import com.sdlcpro.springlens.insight.support.provider.ClassProvider;
import com.sdlcpro.springlens.matcher.Matcher;

import java.lang.annotation.Annotation;
import java.util.Set;

/**
 * Matches contexts whose supplied class declares at least one configured annotation.
 *
 * @param <T> the type of context being matched; it must provide a class
 * @since 1.0.0
 */
public class AnnotatedClassMatcher<T extends ClassProvider> implements Matcher<T> {

    private final Set<Class<? extends Annotation>> annotations;

    /**
     * Creates a matcher for the supplied annotation types.
     *
     * @param annotations annotation types that a supplied class may declare
     */
    public AnnotatedClassMatcher(Set<Class<? extends Annotation>> annotations) {
        this.annotations = Set.copyOf(annotations);
    }

    /**
     * Determines whether the context supplies a class declaring any configured annotation.
     *
     * @param context the context to inspect; may be {@code null}
     * @return {@code true} if the supplied class declares a configured annotation
     */
    @Override
    public boolean matches(T context) {
        if (context == null) {
            return false;
        }

        Class<?> targetClass = context.getClazz();
        if (targetClass == null) {
            return false;
        }

        return annotations.stream().anyMatch(targetClass::isAnnotationPresent);
    }
}
