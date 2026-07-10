package com.sdlcpro.springlens.query;

import com.sdlcpro.springlens.util.Preconditions;

import java.io.Serializable;
import java.util.List;

public class PageResponse<T> implements Serializable {
    private final List<T> content;
    private final PageRequest pageRequest;
    private final long totalElements;

    public PageResponse(List<T> content, PageRequest pageRequest, long totalElements) {
        Preconditions.notNull(content, "The content must not be null");
        Preconditions.notNull(pageRequest, "PageRequest must not be null");
        Preconditions.isTrue(content.size() <= totalElements, "The content size must not be greater than totalElements");
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
