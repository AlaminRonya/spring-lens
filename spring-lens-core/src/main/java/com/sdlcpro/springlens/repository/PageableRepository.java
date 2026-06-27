package com.sdlcpro.springlens.repository;

import com.sdlcpro.springlens.query.Filter;
import com.sdlcpro.springlens.query.PageRequest;
import com.sdlcpro.springlens.query.PageResponse;

public interface PageableRepository<T, ID> extends Repository<T, ID> {
    PageResponse<T> findAll(PageRequest pageRequest);

    PageResponse<T> findAll(Filter filter, PageRequest pageRequest);
}
