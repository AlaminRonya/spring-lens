package com.sdlcpro.springlens.exposure.bean;

import com.sdlcpro.springlens.model.bean.BeanRole;
import com.sdlcpro.springlens.model.bean.definition.BeanDefinitionInfo;
import com.sdlcpro.springlens.query.PageRequest;
import com.sdlcpro.springlens.query.PageResponse;
import com.sdlcpro.springlens.repository.bean.BeanDefinitionInfoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class BeanDetailsRestControllerTest {

    private BeanDefinitionInfoRepository repository;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        this.repository = mock(BeanDefinitionInfoRepository.class);
        BeanDetailsRestController controller = new BeanDetailsRestController(repository);
        this.mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    void shouldExposePaginatedBeanMetadata() throws Exception {
        PageRequest pageRequest = new PageRequest(0, 20, com.sdlcpro.springlens.query.Sort.unsorted());
        PageResponse<BeanDefinitionInfo> pageResponse = new PageResponse<>(
                List.of(sampleBean("dataSource"), sampleBean("entityManager")),
                pageRequest,
                2
        );
        when(repository.findAll(any(PageRequest.class))).thenReturn(pageResponse);

        mockMvc.perform(get("/spring-lens/api/bean-definitions")
                        .param("page", "0")
                        .param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(2)))
                .andExpect(jsonPath("$.content[0].beanName").value("dataSource"))
                .andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.pageNumber").value(0))
                .andExpect(jsonPath("$.pageSize").value(20));
    }

    @Test
    void shouldReturnEmptyContentWhenNoBeansCollected() throws Exception {
        PageRequest pageRequest = new PageRequest(0, 20, com.sdlcpro.springlens.query.Sort.unsorted());
        PageResponse<BeanDefinitionInfo> pageResponse = new PageResponse<>(List.of(), pageRequest, 0);
        when(repository.findAll(any(PageRequest.class))).thenReturn(pageResponse);

        mockMvc.perform(get("/spring-lens/api/bean-definitions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(0)))
                .andExpect(jsonPath("$.totalElements").value(0));
    }

    private static BeanDefinitionInfo sampleBean(String beanName) {
        return new BeanDefinitionInfo(
                "application",
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
}
