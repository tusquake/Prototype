package com.cloudkaptan.sop.controller;

import com.cloudkaptan.sop.dto.ApiResponse;
import com.cloudkaptan.sop.dto.CorporateEntityDto;
import com.cloudkaptan.sop.service.CorporateEntityService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/finsop/v1/entities")
@RequiredArgsConstructor
public class CorporateEntityController {

    private final CorporateEntityService corporateEntityService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<CorporateEntityDto>>> getAllEntities() {
        return ResponseEntity.ok(ApiResponse.success(corporateEntityService.getAllEntities()));
    }
}
