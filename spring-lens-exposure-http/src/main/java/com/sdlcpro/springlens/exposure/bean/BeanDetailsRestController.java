package com.sdlcpro.springlens.exposure.bean;

import com.sdlcpro.springlens.exposure.ApiResponseHandler;
import com.sdlcpro.springlens.query.PageRequest;
import com.sdlcpro.springlens.query.Sort;
import com.sdlcpro.springlens.repository.bean.BeanDefinitionInfoRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST controller that exposes the bean metadata collected by Spring Lens.
 */
@RestController
@RequestMapping("/spring-lens/api/bean-definitions")
public class BeanDetailsRestController {

    private final BeanDefinitionInfoRepository beanDefinitionInfoRepository;

    /**
     * Creates a new controller backed by the given repository.
     *
     * @param beanDefinitionInfoRepository the repository holding the collected bean
     *                                     metadata; must not be {@code null}
     */
    public BeanDetailsRestController(BeanDefinitionInfoRepository beanDefinitionInfoRepository) {
        this.beanDefinitionInfoRepository = beanDefinitionInfoRepository;
    }

    /**
     * Returns a page of collected bean metadata.
     *
     * @param page      zero-based page index (defaults to {@code 0})
     * @param size      the number of records per page (defaults to {@code 20})
     * @param sortBy    optional property name to sort by
     * @param direction optional sort direction ({@code ASC} or {@code DESC}); defaults to
     *                  ascending when a {@code sortBy} property is supplied
     * @return a {@link ResponseEntity} wrapping the requested
     *         {@link com.sdlcpro.springlens.query.PageResponse page} of bean definitions
     */
    @GetMapping
    public ResponseEntity<?> getBeanDefinitions(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String direction) {
        return ApiResponseHandler.handle(() -> {
            Sort sort = (sortBy == null || sortBy.isBlank())
                    ? Sort.unsorted()
                    : Sort.by(sortBy, direction);
            PageRequest pageRequest = new PageRequest(page, size, sort);
            return beanDefinitionInfoRepository.findAll(pageRequest);
        });
    }
}
