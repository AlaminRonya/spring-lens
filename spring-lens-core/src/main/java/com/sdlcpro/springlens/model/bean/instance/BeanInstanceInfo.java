package com.sdlcpro.springlens.model.bean.instance;

import java.time.Instant;

/**
 * Carries metadata and telemetry information regarding a concrete Spring bean instance.
 */
public record BeanInstanceInfo(
        String contextId,
        String beanName,
        String type,
        String scope,
        Instant createdAt,
        long initDurationNanos
) {
}