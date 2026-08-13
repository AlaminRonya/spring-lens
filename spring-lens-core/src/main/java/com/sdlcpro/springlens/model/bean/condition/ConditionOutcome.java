package com.sdlcpro.springlens.model.bean.condition;

/**
 * Represents the result of a Spring auto-configuration condition check.
 *
 * <p>Produced when evaluating conditional annotations such as
 * {@code @ConditionalOnProperty} or {@code @ConditionalOnClass}.
 *
 * @since 1.0
 */

public enum ConditionOutcome {
    /** The condition was satisfied and the bean or configuration was applied. */
    MATCHED,

    /** The condition was not satisfied and the bean or configuration was skipped. */
    NOT_MATCHED
}
