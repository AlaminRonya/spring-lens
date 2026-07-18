package com.sdlcpro.springlens.insight.support.matcher;

import com.sdlcpro.springlens.insight.support.delegator.AbstractConnectionDelegator;
import com.sdlcpro.springlens.insight.support.provider.ClassNameProvider;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ClassNameMatcherTest {

    @Test
    void shouldMatchWhenClassNameExistsInSetCaseFalse() {
        ClassNameProvider provider = mock(ClassNameProvider.class);

        when(provider.getClassName())
                .thenReturn("com.example.UserService");

        ClassNameMatcher<ClassNameProvider> matcher =
                new ClassNameMatcher<>(
                        Set.of("com.example.UserService")
                );

        boolean result = matcher.matches(provider);

        assertFalse(result);
    }

    @Test
    void shouldMatchWhenClassNameExistsInSetCaseTrue1() {
        ClassNameProvider provider = mock(ClassNameProvider.class);

        String className = "com.sdlcpro.springlens.insight.support." +
                "delegator.AbstractConnectionDelegator";

        when(provider.getClassName()).thenReturn(className);
        when(provider.getValue()).thenCallRealMethod();

        ClassNameMatcher<ClassNameProvider> matcher =
                new ClassNameMatcher<>(Set.of(className));

        boolean result = matcher.matches(provider);

        assertTrue(result);
    }



    @Test
    void shouldMatchExistingClassNameCaseTrue2() {
        ClassNameProvider provider = mock(ClassNameProvider.class);

        String className = AbstractConnectionDelegator.class.getName();

        when(provider.getClassName()).thenReturn(className);
        when(provider.getValue()).thenCallRealMethod();

        ClassNameMatcher<ClassNameProvider> matcher =
                new ClassNameMatcher<>(Set.of(className));

        boolean result = matcher.matches(provider);
        assertTrue(result);
    }
}