package com.sdlcpro.springlens.model.bean;

/**
 * Represents the loading strategy used to initialize a Spring bean.
 */
public enum LoadingMode {

    /**
     * The bean is initialized eagerly during application context startup.
     */
    EAGER,

    /**
     * The bean is initialized lazily when it is first requested.
     */
    LAZY
}
