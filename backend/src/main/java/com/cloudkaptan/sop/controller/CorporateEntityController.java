package com.cloudkaptan.sop.controller;

import com.cloudkaptan.sop.dto.ApiResponse;
import com.cloudkaptan.sop.dto.CorporateEntityDto;
import com.cloudkaptan.sop.service.CorporateEntityService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/finsop/v1/entities")
@RequiredArgsConstructor
@Tag(name = "Corporate Entities", description = "Endpoints for retrieving active corporate entities (CK India, CK US, CK UK, CK Australia)")
public class CorporateEntityController {

    private final CorporateEntityService corporateEntityService;

    @GetMapping
    @Operation(summary = "Get all corporate entities", description = "Retrieves all active corporate entities available for SOP assignment and task context.")
    @ApiResponses({
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Successfully retrieved corporate entity list")
    })
    public ResponseEntity<ApiResponse<List<CorporateEntityDto>>> getAllEntities() {
        return ResponseEntity.ok(ApiResponse.success(corporateEntityService.getAllEntities()));
    }
}

