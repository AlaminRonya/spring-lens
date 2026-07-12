package com.sdlcpro.springlens.insight.support.matcher;

import com.sdlcpro.springlens.insight.support.provider.ClassNameProvider;
import com.sdlcpro.springlens.matcher.Matcher;
import org.springframework.util.AntPathMatcher;
import org.springframework.util.CollectionUtils;

import java.util.Set;

public final class PackageMatcher<T extends ClassNameProvider> implements Matcher<T> {
    private static final AntPathMatcher PACKAGE_MATCHER = new AntPathMatcher(".");

    private final Set<String> packagePatterns;

    public PackageMatcher(Set<String> packagePatterns) {
        this.packagePatterns = packagePatterns;
    }

    @Override
    public boolean matches(T context) {
        return !CollectionUtils.isEmpty(this.packagePatterns)
                && this.packagePatterns.stream()
                .anyMatch(pattern -> pattern != null && PACKAGE_MATCHER.match(pattern, context.getClassName()));
    }
}
