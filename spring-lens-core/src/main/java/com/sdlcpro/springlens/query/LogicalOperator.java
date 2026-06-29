package com.sdlcpro.springlens.query;

/**
 * Represents the logical operators used to combine multiple query conditions.
 *
 * <p>These operators define how individual conditional expressions are
 * connected when constructing dynamic queries, allowing filters to be
 * evaluated using logical conjunctions or disjunctions.</p>
 */
public enum LogicalOperator {
    AND, 
    OR
}