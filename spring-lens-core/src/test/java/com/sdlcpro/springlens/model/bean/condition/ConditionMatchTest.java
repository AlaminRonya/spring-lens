package com.sdlcpro.springlens.model.bean.condition;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ConditionMatchTest {

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", " ", "\t"})
    void shouldRejectBlankCondition(String condition) {
        assertThatThrownBy(() -> new ConditionMatch(condition, true, "matched"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("The value of condition must not be blank");
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", " ", "\t"})
    void shouldRejectBlankMessage(String message) {
        assertThatThrownBy(() -> new ConditionMatch("OnPropertyCondition", true, message))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Condition match message must not be blank");
    }

    @Test
    void shouldExposeSuppliedComponents() {
        ConditionMatch match = new ConditionMatch(
                "OnClassCondition",
                false,
                "@ConditionalOnClass did not find required class 'javax.sql.DataSource'"
        );

        assertThat(match.condition()).isEqualTo("OnClassCondition");
        assertThat(match.matched()).isFalse();
        assertThat(match.message())
                .isEqualTo("@ConditionalOnClass did not find required class 'javax.sql.DataSource'");
    }

    @Test
    void shouldUseValueBasedEquality() {
        ConditionMatch first = new ConditionMatch("OnBeanCondition", true, "found bean 'dataSource'");
        ConditionMatch second = new ConditionMatch("OnBeanCondition", true, "found bean 'dataSource'");

        assertThat(first).isEqualTo(second).hasSameHashCodeAs(second);
    }

    @Test
    void shouldNotBeEqualWhenMatchedFlagDiffers() {
        ConditionMatch matched = new ConditionMatch("OnBeanCondition", true, "found bean 'dataSource'");
        ConditionMatch notMatched = new ConditionMatch("OnBeanCondition", false, "found bean 'dataSource'");

        assertThat(matched).isNotEqualTo(notMatched);
    }
}
