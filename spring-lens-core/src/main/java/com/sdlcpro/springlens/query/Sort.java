package com.sdlcpro.springlens.query;

import java.util.Arrays;

public class Sort {
    private static final Sort UNSORTED = new Sort();

    private final String property;
    private final Direction direction;

    private Sort() {
        this.property = null;
        this.direction = null;
    }

    private Sort(String property, Direction direction) {
        // TODO: replace by the spring-lens provided Preconditions.notBlank()
        if (property == null || property.isBlank()) {
            throw new IllegalArgumentException("You have to provide property to sort by");
        }

        this.property = property;
        this.direction = direction;
    }

    public String getProperty() {
        return property;
    }

    public Direction getDirection() {
        return direction;
    }

    public static Sort by(String property, Direction direction) {
        return new Sort(property, direction == null ? Direction.ASC : direction);
    }

    public static Sort by(String property, String direction) {
        return Sort.by(
                property,
                Arrays.stream(Direction.values()).anyMatch(e -> e.name().equalsIgnoreCase(direction))
                        ? Direction.valueOf(direction.toUpperCase()) : Direction.ASC
        );
    }

    public static Sort unsorted() {
        return UNSORTED;
    }

    public boolean isSorted() {
        return this.property != null && this.direction != null;
    }

    public enum Direction {
        ASC, DESC
    }
}
