package com.sdlcpro.springlens.query;

public sealed interface Filter permits Filter.UnFilter, CompositeFilter, ConditionalFilter {
    Filter UNFILTERED = new UnFilter();

    final class UnFilter implements Filter {}
}
