package com.sdlcpro.springlens.model.bean.condition;

import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ConditionEvaluationInfoTest {

    private static final ConditionMatch MATCH =
            new ConditionMatch("OnClassCondition", true, "found required class 'javax.sql.DataSource'");

    @Test
    void shouldRejectNullSource() {
        assertThatThrownBy(() -> new ConditionEvaluationInfo(
                "application",
                null,
                ConditionOutcome.MATCHED,
                List.of(MATCH)
        ))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("The value of source must not be null");
    }

    @Test
    void shouldRejectNullOutcome() {
        assertThatThrownBy(() -> new ConditionEvaluationInfo(
                "application",
                "DataSourceAutoConfiguration",
                null,
                List.of(MATCH)
        ))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("The value of outcome must not be null");
    }

    @Test
    void shouldExposeSuppliedComponents() {
        ConditionEvaluationInfo info = new ConditionEvaluationInfo(
                "application",
                "DataSourceAutoConfiguration",
                ConditionOutcome.MATCHED,
                List.of(MATCH)
        );

        assertThat(info.contextId()).isEqualTo("application");
        assertThat(info.source()).isEqualTo("DataSourceAutoConfiguration");
        assertThat(info.outcome()).isEqualTo(ConditionOutcome.MATCHED);
        assertThat(info.matches()).containsExactly(MATCH);
    }

    @Test
    void shouldTreatNullMatchesAsEmptyList() {
        ConditionEvaluationInfo info = new ConditionEvaluationInfo(
                "application",
                "DataSourceAutoConfiguration",
                ConditionOutcome.NOT_MATCHED,
                null
        );

        assertThat(info.matches()).isNotNull().isEmpty();
    }

    @Test
    void shouldDefensivelyCopyMatches() {
        List<ConditionMatch> matches = new ArrayList<>();
        matches.add(MATCH);

        ConditionEvaluationInfo info = new ConditionEvaluationInfo(
                "application",
                "DataSourceAutoConfiguration",
                ConditionOutcome.MATCHED,
                matches
        );

        matches.add(new ConditionMatch("OnBeanCondition", false, "no bean of type 'DataSource' found"));

        assertThat(info.matches()).containsExactly(MATCH);
    }

    @Test
    void shouldExposeImmutableMatches() {
        ConditionEvaluationInfo info = new ConditionEvaluationInfo(
                "application",
                "DataSourceAutoConfiguration",
                ConditionOutcome.MATCHED,
                List.of(MATCH)
        );

        assertThatThrownBy(() -> info.matches().add(MATCH))
                .isInstanceOf(UnsupportedOperationException.class);
    }

    @Test
    void shouldRejectNullElementsInMatches() {
        List<ConditionMatch> matches = new ArrayList<>();
        matches.add(null);

        assertThatThrownBy(() -> new ConditionEvaluationInfo(
                "application",
                "DataSourceAutoConfiguration",
                ConditionOutcome.MATCHED,
                matches
        ))
                .isInstanceOf(NullPointerException.class);
    }

    @Test
    void shouldUseValueBasedEquality() {
        ConditionEvaluationInfo first = new ConditionEvaluationInfo(
                "application",
                "DataSourceAutoConfiguration",
                ConditionOutcome.MATCHED,
                List.of(MATCH)
        );

        ConditionEvaluationInfo second = new ConditionEvaluationInfo(
                "application",
                "DataSourceAutoConfiguration",
                ConditionOutcome.MATCHED,
                new ArrayList<>(List.of(MATCH))
        );

        assertThat(first).isEqualTo(second).hasSameHashCodeAs(second);
    }
}
