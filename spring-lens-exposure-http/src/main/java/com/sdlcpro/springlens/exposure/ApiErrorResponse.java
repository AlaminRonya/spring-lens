package com.sdlcpro.springlens.exposure;

import java.time.Instant;

public record ApiErrorResponse(
    Instant timestamp,
    int status,
    String error,
    String message ){}
