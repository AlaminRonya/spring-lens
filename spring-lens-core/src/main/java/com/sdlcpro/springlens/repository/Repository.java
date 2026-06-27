package com.sdlcpro.springlens.repository;

import java.util.List;
import java.util.Optional;

public interface Repository<T, ID> {
    void save(T entity);

    List<T> findAll();

    Optional<T> findById(ID id);

    void deleteById(ID id);

    long count();
}
