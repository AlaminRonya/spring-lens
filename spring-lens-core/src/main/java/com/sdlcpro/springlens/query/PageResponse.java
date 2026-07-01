package com.sdlcpro.springlens.query;

import java.io.Serializable;
import java.util.List;
import java.util.Objects;

public class PageResponse<T> implements Serializable {
    private final List<T> content;
    private final PageRequest pageRequest;
    private final long totalElements;

    public PageResponse(List<T> content, PageRequest pageRequest, long totalElements) {
        // TODO: replace by the spring-lens provided Preconditions.notNull() instead of Objects.requireNonNull()
        Objects.requireNonNull(content, "Content must not be null");
        Objects.requireNonNull(pageRequest, "PageRequest must not be null");

        if (content.size() > totalElements) {
            throw new IllegalArgumentException("The value of total must be greater than content size");
        }

        this.content = content;
        this.pageRequest = pageRequest;
        this.totalElements = totalElements;
    }

    public List<T> getContent() {
        return this.content;
    }

    public int getPageNumber() {
        return this.pageRequest.pageNumber();
    }

    public int getPageSize() {
        return this.pageRequest.pageSize();
    }

    public int getTotalPages() {
        return this.getPageSize() == 0 ? 1 : (int) Math.ceil((double) totalElements / (double) this.getPageSize());
    }

    public boolean hasPrevious() {
        return this.getPageNumber() > 0;
    }

    public boolean hasNext() {
        return this.getPageNumber() + 1 < getTotalPages();
    }

    public boolean isFirst() {
        return !hasPrevious();
    }

    public boolean isLast() {
        return !hasNext();
    }

    public long getTotalElements() {
        return this.totalElements;
    }
}
