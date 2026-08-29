package com.cloudkaptan.sop.exception;

import com.cloudkaptan.sop.dto.ApiErrorDetail;
import com.cloudkaptan.sop.dto.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(SeparationOfDutyViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleSeparationOfDutyViolation(SeparationOfDutyViolationException ex) {
        ApiErrorDetail detail = ApiErrorDetail.builder()
            .title("Separation of Duty Violation")
            .type("https://finsop.cloudkaptan.com/errors/separation-of-duty")
            .detail(ex.getMessage())
            .build();
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
            .body(ApiResponse.error(HttpStatus.FORBIDDEN, ex.getMessage(), detail));
    }

    @ExceptionHandler(IllegalStateTransitionException.class)
    public ResponseEntity<ApiResponse<Void>> handleIllegalStateTransition(IllegalStateTransitionException ex) {
        ApiErrorDetail detail = ApiErrorDetail.builder()
            .title("Illegal Task State Transition")
            .type("https://finsop.cloudkaptan.com/errors/illegal-state-transition")
            .detail(ex.getMessage())
            .build();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(ApiResponse.error(HttpStatus.BAD_REQUEST, ex.getMessage(), detail));
    }

    @ExceptionHandler(UnauthorizedTaskActionException.class)
    public ResponseEntity<ApiResponse<Void>> handleUnauthorizedTaskAction(UnauthorizedTaskActionException ex) {
        ApiErrorDetail detail = ApiErrorDetail.builder()
            .title("Unauthorized Task Action")
            .type("https://finsop.cloudkaptan.com/errors/unauthorized-action")
            .detail(ex.getMessage())
            .build();
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
            .body(ApiResponse.error(HttpStatus.FORBIDDEN, ex.getMessage(), detail));
    }

    @ExceptionHandler(ObjectOptimisticLockingFailureException.class)
    public ResponseEntity<ApiResponse<Void>> handleOptimisticLockingFailure(ObjectOptimisticLockingFailureException ex) {
        String msg = "Concurrent modification detected. Please refresh and retry.";
        ApiErrorDetail detail = ApiErrorDetail.builder()
            .title("Optimistic Locking Failure")
            .type("https://finsop.cloudkaptan.com/errors/concurrent-conflict")
            .detail(msg)
            .build();
        return ResponseEntity.status(HttpStatus.CONFLICT)
            .body(ApiResponse.error(HttpStatus.CONFLICT, msg, detail));
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleResourceNotFound(ResourceNotFoundException ex) {
        ApiErrorDetail detail = ApiErrorDetail.builder()
            .title("Resource Not Found")
            .type("https://finsop.cloudkaptan.com/errors/not-found")
            .detail(ex.getMessage())
            .build();
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(ApiResponse.error(HttpStatus.NOT_FOUND, ex.getMessage(), detail));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiResponse<Void>> handleMethodArgumentTypeMismatch(MethodArgumentTypeMismatchException ex) {
        String msg = String.format("Parameter '%s' has an invalid value '%s'. Expected enum type: %s",
            ex.getName(), ex.getValue(), ex.getRequiredType() != null ? ex.getRequiredType().getSimpleName() : "enum");
        ApiErrorDetail detail = ApiErrorDetail.builder()
            .title("Invalid Parameter Format")
            .type("https://finsop.cloudkaptan.com/errors/type-mismatch")
            .detail(msg)
            .build();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(ApiResponse.error(HttpStatus.BAD_REQUEST, msg, detail));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Void>> handleIllegalArgument(IllegalArgumentException ex) {
        ApiErrorDetail detail = ApiErrorDetail.builder()
            .title("Invalid Request Parameters")
            .type("https://finsop.cloudkaptan.com/errors/invalid-argument")
            .detail(ex.getMessage())
            .build();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(ApiResponse.error(HttpStatus.BAD_REQUEST, ex.getMessage(), detail));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGenericException(Exception ex) {
        ApiErrorDetail detail = ApiErrorDetail.builder()
            .title("Internal Server Error")
            .type("https://finsop.cloudkaptan.com/errors/internal-server-error")
            .detail(ex.getMessage() != null ? ex.getMessage() : "An unexpected server error occurred.")
            .build();
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(ApiResponse.error(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected server error occurred", detail));
    }
}
