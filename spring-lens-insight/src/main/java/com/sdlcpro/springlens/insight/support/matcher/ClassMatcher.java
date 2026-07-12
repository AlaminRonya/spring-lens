package com.sdlcpro.springlens.insight.support.matcher;

import com.sdlcpro.springlens.insight.support.provider.ClassNameProvider;
import com.sdlcpro.springlens.insight.support.provider.StringValueProvider;

import java.util.Set;

public final class ClassMatcher<T extends ClassNameProvider> extends SimpleStringMatcher<T> {
    public ClassMatcher(Set<String> strings) {
        super(strings);
    }
}
