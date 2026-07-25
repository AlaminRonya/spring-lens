package com.sdlcpro.springlens.storage.bean.definition;

import com.sdlcpro.springlens.annotation.SpringLensInternalComponent;
import com.sdlcpro.springlens.model.bean.BeanInfoCompositeKey;
import com.sdlcpro.springlens.model.bean.definition.BeanDefinitionInfo;
import com.sdlcpro.springlens.query.Filter;
import com.sdlcpro.springlens.query.PageRequest;
import com.sdlcpro.springlens.query.PageResponse;
import com.sdlcpro.springlens.query.QueryExecutor;
import com.sdlcpro.springlens.repository.bean.BeanDefinitionInfoRepository;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

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

    private final ConcurrentHashMap<BeanInfoCompositeKey, BeanDefinitionInfo> store =
            new ConcurrentHashMap<>();
    private final QueryExecutor<BeanDefinitionInfo> queryExecutor =
            new QueryExecutor<>(BeanDefinitionInfo.class);

    @Override
    public void save(BeanDefinitionInfo entity) {
        BeanInfoCompositeKey key = new BeanInfoCompositeKey(entity.contextId(), entity.beanName());
        store.put(key, entity);
    }

    @Override
    public List<BeanDefinitionInfo> findAll() {
        return new ArrayList<>(store.values());
    }

    @Override
    public Optional<BeanDefinitionInfo> findById(BeanInfoCompositeKey id) {
        return Optional.ofNullable(store.get(id));
    }

    @Override
    public void deleteById(BeanInfoCompositeKey id) {
        store.remove(id);
    }

    @Override
    public long count() {
        return store.size();
    }

    @Override
    public PageResponse<BeanDefinitionInfo> findAll(PageRequest pageRequest) {
        return queryExecutor.execute(store.values(), Filter.UNFILTERED, pageRequest);
    }

    @Override
    public PageResponse<BeanDefinitionInfo> findAll(Filter filter, PageRequest pageRequest) {
        return queryExecutor.execute(store.values(), filter, pageRequest);
    }
}
