package com.sdlcpro.springlens.query;


/**
 * Represents the supported comparison operators used when constructing
 * dynamic query conditions.
 *
 * <p>These operators define how a field should be evaluated against a
 * supplied value, enabling the query engine to build flexible filtering
 * criteria for both database-backed and in-memory query execution.</p>
 */
public enum ConditionalOperator {
    EQUALS,
    EQUALS_IGNORE_CASE,
    NOT_EQUALS,
    GREATER_THAN,
    GREATER_THAN_OR_EQUALS,
    LESS_THAN,
    LESS_THAN_OR_EQUALS,
    CONTAINS,
    CONTAINS_IGNORE_CASE,
    STARTS_WITH,
    ENDS_WITH
}