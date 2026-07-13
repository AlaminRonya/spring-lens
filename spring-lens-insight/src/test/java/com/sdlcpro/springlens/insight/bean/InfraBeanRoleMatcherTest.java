package com.sdlcpro.springlens.insight.bean;

import com.sdlcpro.springlens.model.bean.BeanRole;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class InfraBeanRoleMatcherTest {

    private final InfraBeanRoleMatcher<BeanRoleProvider> matcher = new InfraBeanRoleMatcher<>();

    @Test
    void matchesContextWithInfrastructureRole() {
        BeanRoleProvider context = () -> BeanRole.ROLE_INFRASTRUCTURE;

        assertThat(matcher.matches(context)).isTrue();
    }

    @Test
    void doesNotMatchContextWithApplicationRole() {
        BeanRoleProvider context = () -> BeanRole.ROLE_APPLICATION;

        assertThat(matcher.matches(context)).isFalse();
    }

    @Test
    void doesNotMatchContextWithSupportRole() {
        BeanRoleProvider context = () -> BeanRole.ROLE_SUPPORT;

        assertThat(matcher.matches(context)).isFalse();
    }

    @Test
    void doesNotMatchContextWithUnknownRole() {
        BeanRoleProvider context = () -> BeanRole.UNKNOWN;

        assertThat(matcher.matches(context)).isFalse();
    }

    @Test
    void doesNotMatchNullContext() {
        assertThat(matcher.matches(null)).isFalse();
    }
}
