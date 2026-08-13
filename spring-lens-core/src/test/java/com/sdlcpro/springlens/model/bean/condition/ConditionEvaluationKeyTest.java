package com.sdlcpro.springlens.model.bean.condition;

import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ConditionEvaluationKeyTest {

    @Test
    void shouldRejectNullContextId() {
        assertThatThrownBy(() -> new ConditionEvaluationKey(null, "DataSourceAutoConfiguration"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Context id must not be null");
    }

    @Test
    void shouldRejectNullSource() {
        assertThatThrownBy(() -> new ConditionEvaluationKey("application", null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Source must not be null");
    }

    @Test
    void shouldExposeSuppliedComponents() {
        ConditionEvaluationKey key = new ConditionEvaluationKey("application", "DataSourceAutoConfiguration");

        assertThat(key.contextId()).isEqualTo("application");
        assertThat(key.source()).isEqualTo("DataSourceAutoConfiguration");
    }

    @Test
    void shouldFormatToStringWithBothComponents() {
        ConditionEvaluationKey key = new ConditionEvaluationKey("application", "DataSourceAutoConfiguration");

        assertThat(key).hasToString("context-id: application, source: DataSourceAutoConfiguration");
    }

    @Test
    void shouldUseValueBasedEquality() {
        ConditionEvaluationKey first = new ConditionEvaluationKey("application", "DataSourceAutoConfiguration");
        ConditionEvaluationKey second = new ConditionEvaluationKey("application", "DataSourceAutoConfiguration");

        assertThat(first).isEqualTo(second).hasSameHashCodeAs(second);
    }

    @Test
    void shouldDistinguishKeysFromDifferentContexts() {
        ConditionEvaluationKey parent = new ConditionEvaluationKey("parent", "DataSourceAutoConfiguration");
        ConditionEvaluationKey child = new ConditionEvaluationKey("child", "DataSourceAutoConfiguration");

        assertThat(parent).isNotEqualTo(child);
    }

    @Test
    void shouldBeUsableAsMapKey() {
        Map<ConditionEvaluationKey, ConditionOutcome> outcomes = new HashMap<>();
        outcomes.put(new ConditionEvaluationKey("application", "DataSourceAutoConfiguration"), ConditionOutcome.MATCHED);

        assertThat(outcomes.get(new ConditionEvaluationKey("application", "DataSourceAutoConfiguration")))
                .isEqualTo(ConditionOutcome.MATCHED);
    }
}
