package com.sdlcpro.springlens.model.bean.condition;

import com.sdlcpro.springlens.util.Preconditions;

/**
 * Lookup key identifying a condition evaluation within a specific application context.
 *
 * <p>Suitable for use as a {@link java.util.Map} key: equality and hash code are
 * derived from both components by the record contract.
 *
 * @param contextId the identifier of the Spring application context; must not be null
 * @param source    the source class or configuration that was evaluated; must not be null
 * @since 1.0
 */

public record ConditionEvaluationKey(String contextId, String source) {

   /**
    * Validates that both components are present.
    *
    * @throws IllegalArgumentException if {@code contextId} or {@code source} is null
    */

   public  ConditionEvaluationKey {
      Preconditions.notNull(contextId, "Context id must not be null");
      Preconditions.notNull(source, "Source must not be null");
   }

   /**
    * Returns a diagnostic representation in the form
    * {@code context-id: <contextId>, source: <source>}.
    *
    * @return the formatted key description
    */

   @Override
   public String toString() {
      return "context-id: " + this.contextId + ", source: " + this.source;
   }
}
