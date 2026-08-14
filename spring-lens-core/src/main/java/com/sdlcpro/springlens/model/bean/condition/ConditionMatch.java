package com.sdlcpro.springlens.model.bean.condition;

import com.sdlcpro.springlens.util.Preconditions;

/**
 * An individual condition check performed during Spring auto-configuration.
 *
 * <p>This record is immutable and therefore safe to share across threads.
 *
 * @param condition the fully qualified name of the condition class that was
 *                  evaluated; must not be blank
 * @param matched   {@code true} if this individual condition was satisfied
 * @param message   the human-readable reason reported by the condition;
 *                  must not be blank
 * @since 1.0
 */
public record ConditionMatch(
        String condition,
        boolean matched,
        String message
) {
    /**
     * Validates that the textual components are present.
     *
     * @throws IllegalArgumentException if {@code condition} or {@code message} is blank
     */
    public ConditionMatch {
        Preconditions.hasText(condition, "The value of condition must not be blank");
        Preconditions.hasText(message, "Condition match message must not be blank");
    }
}
