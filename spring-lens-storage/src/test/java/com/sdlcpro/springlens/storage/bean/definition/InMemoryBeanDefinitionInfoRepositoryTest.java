package com.sdlcpro.springlens.storage.bean.definition;

import com.sdlcpro.springlens.model.bean.BeanInfoCompositeKey;
import com.sdlcpro.springlens.model.bean.BeanRole;
import com.sdlcpro.springlens.model.bean.definition.BeanDefinitionInfo;
import com.sdlcpro.springlens.query.Filters;
import com.sdlcpro.springlens.query.PageRequest;
import com.sdlcpro.springlens.query.PageResponse;
import com.sdlcpro.springlens.query.Sort;
import org.assertj.core.api.ThrowableAssert;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatException;

class InMemoryBeanDefinitionInfoRepositoryTest {

    private InMemoryBeanDefinitionInfoRepository repository;

    @BeforeEach
    void setUp() {
        repository = new InMemoryBeanDefinitionInfoRepository();
    }

    private static BeanDefinitionInfo bean(String contextId, String beanName) {
        return new BeanDefinitionInfo(
                contextId,
                beanName,
                List.of(),
                "com.example." + beanName,
                null,
                null,
                "singleton",
                false,
                false,
                true,
                BeanRole.ROLE_APPLICATION,
                null,
                null,
                null,
                null,
                List.of(),
                List.of()
        );
    }

    @Test
    void saveThenFindByIdAndCount() {
        BeanDefinitionInfo info = bean("ctx", "alpha");
        repository.save(info);

        assertThat(repository.count()).isEqualTo(1);
        assertThat(repository.findById(new BeanInfoCompositeKey("ctx", "alpha")))
                .contains(info);
        assertThat(repository.findAll()).containsExactly(info);
    }

    @Test
    void saveOverwritesSameCompositeKey() {
        repository.save(bean("ctx", "alpha"));
        BeanDefinitionInfo updated = new BeanDefinitionInfo(
                "ctx", "alpha", List.of("alias"), "com.example.Updated", null, null,
                "singleton", true, true, true, BeanRole.ROLE_APPLICATION,
                null, null, null, null, List.of(), List.of());
        repository.save(updated);

        assertThat(repository.count()).isEqualTo(1);
        assertThat(repository.findById(new BeanInfoCompositeKey("ctx", "alpha")))
                .contains(updated);
    }

    @Test
    void deleteByIdRemovesEntry() {
        repository.save(bean("ctx", "alpha"));
        assertThatException()
                .isThrownBy(() -> repository.deleteById(new BeanInfoCompositeKey("ctx", "alpha")))
                .isInstanceOf(UnsupportedOperationException.class)
                .withMessage("Bean definitions are not allowed to remove");
    }

    @Test
    void findAllWithPageRequestPaginates() {
        repository.save(bean("ctx", "a"));
        repository.save(bean("ctx", "b"));
        repository.save(bean("ctx", "c"));

        PageRequest page0 = new PageRequest(0, 2, Sort.unsorted());
        PageResponse<BeanDefinitionInfo> response = repository.findAll(page0);

        assertThat(response.getTotalElements()).isEqualTo(3);
        assertThat(response.getContent()).hasSize(2);
    }

    @Test
    void findAllWithFilterAndPageRequest() {
        repository.save(bean("ctx", "keepMe"));
        repository.save(bean("ctx", "skipMe"));

        PageRequest page = new PageRequest(0, 10, Sort.unsorted());
        PageResponse<BeanDefinitionInfo> response =
                repository.findAll(Filters.eq("beanName", "keepMe"), page);

        assertThat(response.getTotalElements()).isEqualTo(1);
        assertThat(response.getContent()).extracting(BeanDefinitionInfo::beanName)
                .containsExactly("keepMe");
    }
}
