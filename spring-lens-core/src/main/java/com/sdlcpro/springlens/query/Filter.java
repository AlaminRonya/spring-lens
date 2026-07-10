package com.sdlcpro.springlens.query;

public sealed interface Filter permits UnFilter, CompositeFilter, ConditionalFilter {

    Filter UNFILTERED = UnFilter.getInstance();

}
