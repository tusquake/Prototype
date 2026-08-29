package com.cloudkaptan.sop.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.http.HttpStatus;

import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {

    private boolean success;
    private int statusCode;
    private String message;
    private T data;
    private ApiErrorDetail error;

    @Builder.Default
    private OffsetDateTime timestamp = OffsetDateTime.now();

    public static <T> ApiResponse<T> success(T data) {
        return ApiResponse.<T>builder()
            .success(true)
            .statusCode(HttpStatus.OK.value())
            .message("Operation completed successfully")
            .data(data)
            .timestamp(OffsetDateTime.now())
            .build();
    }

    public static <T> ApiResponse<T> success(T data, String message) {
        return ApiResponse.<T>builder()
            .success(true)
            .statusCode(HttpStatus.OK.value())
            .message(message)
            .data(data)
            .timestamp(OffsetDateTime.now())
            .build();
    }

    public static <T> ApiResponse<T> error(HttpStatus status, String message, ApiErrorDetail errorDetail) {
        return ApiResponse.<T>builder()
            .success(false)
            .statusCode(status.value())
            .message(message)
            .error(errorDetail)
            .timestamp(OffsetDateTime.now())
            .build();
    }
}
