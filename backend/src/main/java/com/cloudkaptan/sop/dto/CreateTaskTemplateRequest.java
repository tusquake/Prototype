package com.cloudkaptan.sop.dto;

import com.cloudkaptan.sop.entity.RequiredDocument;
import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateTaskTemplateRequest {

    private Integer stepSequence;

    @NotBlank(message = "Task name is required")
    private String taskName;

    private String description;

    /**
     * INDEPENDENT or DEPENDENT_ON_PREVIOUS.
     */
    private String dependencyMode;

    private String priority;

    /**
     * "Target Start: Day N from SOP start"
     * Day from the SOP instance's targetStartDate when this task should begin.
     */
    @NotNull(message = "Target start day is required")
    @Min(value = 0, message = "Target start day must be 0 or greater")
    private Integer etaStartDay;

    /**
     * "Completion Deadline: By Day N from SOP start"
     * Day from the SOP instance's targetStartDate by which this task must be completed.
     */
    @NotNull(message = "Completion deadline day is required")
    @Min(value = 1, message = "Completion deadline must be at least Day 1")
    private Integer etaEndDay;

    private Integer slaHours;

    @Builder.Default
    private List<String> makerIds = new ArrayList<>();

    @Builder.Default
    private List<String> checkerIds = new ArrayList<>();

    @JsonProperty("requiredDocuments")
    @JsonAlias({"requiredDocuments", "requiredDocs", "documentCategories"})
    @Builder.Default
    private List<RequiredDocument> requiredDocuments = new ArrayList<>();

    public void setRequiredDocuments(List<Object> rawDocs) {
        if (rawDocs == null) {
            this.requiredDocuments = new ArrayList<>();
            return;
        }
        List<RequiredDocument> list = new ArrayList<>();
        for (Object item : rawDocs) {
            if (item instanceof String str) {
                if (!str.isBlank()) {
                    list.add(RequiredDocument.builder()
                    .name(str.trim())
                    .description("").build());
                }
            } else if (item instanceof RequiredDocument rd) {
                list.add(rd);
            } else if (item instanceof java.util.Map<?, ?> map) {
                String name = map.get("name") != null ? map.get("name").toString()
                        : (map.get("title") != null ? map.get("title").toString()
                        : (map.get("documentName") != null ? map.get("documentName").toString() : ""));
                String desc = map.get("description") != null ? map.get("description").toString()
                        : (map.get("desc") != null ? map.get("desc").toString()
                        : (map.get("documentDescription") != null ? map.get("documentDescription").toString() : ""));
                if (!name.isBlank()) {
                    list.add(RequiredDocument.builder().name(name.trim()).description(desc.trim()).build());
                }
            }
        }
        this.requiredDocuments = list;
    }

    public List<RequiredDocument> getRequiredDocuments() {
        return requiredDocuments != null ? requiredDocuments : new ArrayList<>();
    }
}
