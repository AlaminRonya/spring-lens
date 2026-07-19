package com.sdlcpro.springlens.insight.support.matcher;

import com.sdlcpro.springlens.insight.support.provider.ClassNameProvider;

import java.util.Set;

public final class ClassNameMatcher<T extends ClassNameProvider> extends SimpleStringMatcher<T> {
    public ClassNameMatcher(Set<String> strings) {
        super(strings);
    }
}
