package com.sdlcpro.springlens.annotation;


import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marker annotation used to explicitly flag internal HTTP endpoints belonging to the Spring Lens framework.
 *  <p>When applied to a Controller type or a specific route method, it instructs the framework
 * to bypass this endpoint when collecting performance data for the user's metrics.
 * This ensures that internal framework requests (such as UI dashboard rendering or
 * lifecycle health checks) are not recorded.</p>
 */
@Target({ElementType.TYPE, ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
public @interface SpringLensEndpoint {
}
