package com.sdlcpro.springlens.matcher;

@FunctionalInterface
public interface Matcher<T> {

    boolean matches(T context);
}
