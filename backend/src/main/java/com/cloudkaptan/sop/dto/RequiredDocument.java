package com.cloudkaptan.sop.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Embeddable
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RequiredDocument {

    @JsonProperty("name")
    @JsonAlias({"name", "title", "documentName"})
    @Column(name = "name", length = 255)
    private String name;

    @JsonProperty("description")
    @JsonAlias({"description", "desc", "documentDescription"})
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;
}
