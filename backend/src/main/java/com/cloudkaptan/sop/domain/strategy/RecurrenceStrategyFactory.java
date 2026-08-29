package com.cloudkaptan.sop.domain.strategy;

import com.cloudkaptan.sop.domain.enums.SopFrequency;
import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

@Component
public class RecurrenceStrategyFactory {

    private final Map<SopFrequency, RecurrenceStrategy> strategyMap = new EnumMap<>(SopFrequency.class);

    public RecurrenceStrategyFactory(List<RecurrenceStrategy> strategies) {
        for (RecurrenceStrategy strategy : strategies) {
            strategyMap.put(strategy.getFrequency(), strategy);
        }
    }

    public RecurrenceStrategy getStrategy(SopFrequency frequency) {
        RecurrenceStrategy strategy = strategyMap.get(frequency);
        if (strategy == null) {
            throw new IllegalArgumentException("No recurrence strategy registered for frequency: " + frequency);
        }
        return strategy;
    }
}
