package com.sdlcpro.springlens.insight.support.matcher;

import com.sdlcpro.springlens.insight.support.provider.StringValueProvider;
import com.sdlcpro.springlens.matcher.Matcher;
import org.springframework.util.CollectionUtils;

import java.util.Set;

public class SimpleStringMatcher<T extends StringValueProvider> implements Matcher<T> {
    private final Set<String> strings;

    public SimpleStringMatcher(Set<String> strings) {
        this.strings = strings;
    }

    @Override
    public boolean matches(T context) {
        return !CollectionUtils.isEmpty(this.strings)
                && strings.stream()
                .anyMatch(str -> str != null && str.equals(context.getValue()));
    }
}
