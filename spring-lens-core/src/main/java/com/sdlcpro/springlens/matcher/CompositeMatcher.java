package com.sdlcpro.springlens.matcher;

import java.util.Collections;
import java.util.LinkedList;
import java.util.List;

public final class CompositeMatcher<T> implements Matcher<T> {
    private final List<Matcher<T>> includeMatchers;
    private final List<Matcher<T>> excludeMatchers;

    public CompositeMatcher() {
        this(Collections.emptyList(), Collections.emptyList());
    }

    public CompositeMatcher(List<Matcher<T>> includeMatchers, List<Matcher<T>> excludeMatchers) {
        this.includeMatchers = new LinkedList<>();
        this.excludeMatchers = new LinkedList<>();

        if (includeMatchers != null && !includeMatchers.isEmpty()) {
            this.includeMatchers.addAll(includeMatchers);
        }

        if (excludeMatchers != null && !excludeMatchers.isEmpty()) {
            this.excludeMatchers.addAll(excludeMatchers);
        }
    }

    public void addIncludeMatcher(Matcher<T> matcher) {
        this.includeMatchers.add(matcher);
    }

    public void addExcludeMatcher(Matcher<T> matcher) {
        this.excludeMatchers.add(matcher);
    }

    @Override
    public boolean matches(T context) {
        // TODO: core business logic will be updated later
        return false;
    }
}
