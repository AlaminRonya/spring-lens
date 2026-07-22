package com.sdlcpro.springlens.listener.http.endpoint;

import com.sdlcpro.springlens.model.http.endpoint.EndpointInfo;

/**
 * Functional callback contract for receiving collected {@link EndpointInfo}
 * domain models during framework scanning and route discovery phases.
 */
@FunctionalInterface
public interface EndpointInfoListener {
    /**
     * Callback method triggered when EndpointInfo is collected.
     *
     * @param endpointInfo the collected HTTP endpoint metadata
     */
    void onEndpointInfoCollect(EndpointInfo endpointInfo);
}