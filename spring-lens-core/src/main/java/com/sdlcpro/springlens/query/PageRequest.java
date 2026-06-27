package com.sdlcpro.springlens.query;

import java.io.Serializable;

public record PageRequest(int pageNumber, int pageSize, Sort sort) implements Serializable {
}
