package com.sdlcpro.springlens.storage.bean.definition;

import com.sdlcpro.springlens.annotation.SpringLensInternalComponent;
import com.sdlcpro.springlens.model.bean.BeanInfoCompositeKey;
import com.sdlcpro.springlens.model.bean.definition.BeanDefinitionInfo;
import com.sdlcpro.springlens.query.Filter;
import com.sdlcpro.springlens.query.PageRequest;
import com.sdlcpro.springlens.query.PageResponse;
import com.sdlcpro.springlens.query.QueryExecutor;
import com.sdlcpro.springlens.repository.bean.BeanDefinitionInfoRepository;
import com.sdlcpro.springlens.util.Preconditions;

import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

/**
 * In-memory implementation of {@link BeanDefinitionInfoRepository}.
 *
 * <p>Stores {@link BeanDefinitionInfo} instances in a {@link ConcurrentHashMap}
 * keyed by {@link BeanInfoCompositeKey}. Paged and filtered queries delegate to
 * {@link QueryExecutor}.</p>
 *
 * @since 1.0.0
 */
@SpringLensInternalComponent
public class InMemoryBeanDefinitionInfoRepository implements BeanDefinitionInfoRepository {
    private final QueryExecutor<BeanDefinitionInfo> queryExecutor;
    private final ConcurrentMap<BeanInfoCompositeKey, BeanDefinitionInfo> beanDefinitionInfoMap;

    public InMemoryBeanDefinitionInfoRepository() {
        this.queryExecutor = new QueryExecutor<>(BeanDefinitionInfo.class);
        this.beanDefinitionInfoMap = new ConcurrentHashMap<>();
    }

    @Override
    public PageResponse<BeanDefinitionInfo> findAll(PageRequest pageRequest) {
        return this.findAll(Filter.UNFILTERED, pageRequest);
    }

    @Override
    public PageResponse<BeanDefinitionInfo> findAll(Filter filter, PageRequest pageRequest) {
        return this.queryExecutor.execute(
                this.beanDefinitionInfoMap.values(),
                filter,
                pageRequest
        );
    }

    @Override
    public void save(BeanDefinitionInfo definitionInfo) {
        Preconditions.notNull(definitionInfo, "BeanDefinitionInfo info must not be null");
        String contextId = definitionInfo.contextId();
        String beanName = definitionInfo.beanName();
        this.beanDefinitionInfoMap.put(new BeanInfoCompositeKey(contextId, beanName), definitionInfo);
    }

    @Override
    public List<BeanDefinitionInfo> findAll() {
        return List.copyOf(this.beanDefinitionInfoMap.values());
    }

    @Override
    public Optional<BeanDefinitionInfo> findById(BeanInfoCompositeKey beanInfoCompositeKey) {
        return Optional.ofNullable(this.beanDefinitionInfoMap.get(beanInfoCompositeKey));
    }

    @Override
    public void deleteById(BeanInfoCompositeKey beanInfoCompositeKey) {
        throw new UnsupportedOperationException("Bean definitions are not allowed to remove");
    }

    @Override
    public long count() {
        return this.beanDefinitionInfoMap.size();
    }
}
