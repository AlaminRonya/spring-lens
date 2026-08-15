package com.sdlcpro.springlens.storage.bean.condition;

import com.sdlcpro.springlens.annotation.SpringLensInternalComponent;
import com.sdlcpro.springlens.model.bean.condition.ConditionEvaluationInfo;
import com.sdlcpro.springlens.model.bean.condition.ConditionEvaluationKey;
import com.sdlcpro.springlens.query.Filter;
import com.sdlcpro.springlens.query.PageRequest;
import com.sdlcpro.springlens.query.PageResponse;
import com.sdlcpro.springlens.repository.bean.ConditionEvaluationInfoRepository;

import java.util.List;
import java.util.Optional;

/**
 * In-memory storage implementation of {@link ConditionEvaluationInfoRepository}.
 * <p>
 * This class serves as the initial component implementation, stubbed with
 * {@link UnsupportedOperationException} for pending method implementations.
 */
@SpringLensInternalComponent
public class InMemoryConditionEvaluationInfoRepository implements ConditionEvaluationInfoRepository {


    @Override
    public void save(ConditionEvaluationInfo entity) {
        throw new UnsupportedOperationException("save is not yet implemented.");
    }

    @Override
    public List<ConditionEvaluationInfo> findAll() {
        throw new UnsupportedOperationException("findAll is not yet implemented.");
    }

    @Override
    public Optional<ConditionEvaluationInfo> findById(ConditionEvaluationKey conditionEvaluationKey) {
        throw new UnsupportedOperationException("findById is not yet implemented.");
    }

    @Override
    public void deleteById(ConditionEvaluationKey conditionEvaluationKey) {
        throw new UnsupportedOperationException("deleteById is not yet implemented.");
    }

    @Override
    public long count() {
        throw new UnsupportedOperationException("count is not yet implemented.");
    }

    @Override
    public PageResponse<ConditionEvaluationInfo> findAll(PageRequest pageRequest) {
        throw new UnsupportedOperationException("findAll with PageRequest is not yet implemented.");
    }

    @Override
    public PageResponse<ConditionEvaluationInfo> findAll(Filter filter, PageRequest pageRequest) {
        throw new UnsupportedOperationException("findAll with Filter and PageRequest is not yet implemented.");
    }
}
