package com.cloudkaptan.sop.exception;

import com.cloudkaptan.sop.dto.ApiErrorDetail;
import com.cloudkaptan.sop.dto.ApiResponse;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.transaction.TransactionSystemException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.async.AsyncRequestTimeoutException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.io.IOException;
import java.util.Set;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(AsyncRequestTimeoutException.class)
    public ResponseEntity<Void> handleAsyncRequestTimeout(AsyncRequestTimeoutException ex) {
        // Quietly absorb SSE streaming client timeouts (standard when client leaves page or ping lapses)
        return ResponseEntity.ok().build();
    }

    @ExceptionHandler(IOException.class)
    public ResponseEntity<Void> handleIOException(IOException ex) {
        // Quietly absorb Broken Pipe / ClientAbortException during SSE streaming
        return ResponseEntity.ok().build();
    }

    @ExceptionHandler(org.springframework.http.converter.HttpMessageNotWritableException.class)
    public ResponseEntity<Void> handleHttpMessageNotWritable(org.springframework.http.converter.HttpMessageNotWritableException ex) {
        // Quietly absorb SSE text/event-stream response conversion failures
        return ResponseEntity.ok().build();
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleDataIntegrityViolation(DataIntegrityViolationException ex) {
        Throwable rootCause = ex.getMostSpecificCause();
        String rootMsg = rootCause.getMessage() != null ? rootCause.getMessage() : ex.getMessage();
        String friendlyMsg = translateDbErrorMessage(rootMsg);
        ApiErrorDetail detail = ApiErrorDetail.builder()
            .title("Data Integrity Violation")
            .type("https://finsop.cloudkaptan.com/errors/data-integrity")
            .detail(friendlyMsg)
            .build();
        return ResponseEntity.status(HttpStatus.CONFLICT)
            .contentType(MediaType.APPLICATION_JSON)
            .body(ApiResponse.error(HttpStatus.CONFLICT, friendlyMsg, detail));
    }

    @ExceptionHandler(TransactionSystemException.class)
    public ResponseEntity<ApiResponse<Void>> handleTransactionSystem(TransactionSystemException ex) {
        Throwable realCause = ex.getApplicationException() != null ? ex.getApplicationException() : ex.getOriginalException();
        if (realCause == null) realCause = ex.getMostSpecificCause();

        // Check if the root cause is a ConstraintViolationException (Bean Validation)
        if (realCause instanceof ConstraintViolationException cve) {
            return handleConstraintViolation(cve);
        }

        // Dig for the deepest cause
        Throwable root = realCause;
        while (root != null && root.getCause() != null && root.getCause() != root) {
            root = root.getCause();
        }
        String msg = root != null && root.getMessage() != null ? root.getMessage() : "A validation error occurred during transaction processing.";
        if (msg.contains("Transaction silently rolled back")) {
            msg = "The operation failed due to a data validation error. Please verify all field values are correct and within allowed limits.";
        }
        ApiErrorDetail detail = ApiErrorDetail.builder()
            .title("Transaction Processing Error")
            .type("https://finsop.cloudkaptan.com/errors/transaction-error")
            .detail(msg.length() > 250 ? msg.substring(0, 247) + "..." : msg)
            .build();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .contentType(MediaType.APPLICATION_JSON)
            .body(ApiResponse.error(HttpStatus.BAD_REQUEST, msg.length() > 250 ? msg.substring(0, 247) + "..." : msg, detail));
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleConstraintViolation(ConstraintViolationException ex) {
        Set<ConstraintViolation<?>> violations = ex.getConstraintViolations();
        String msg;
        if (violations != null && !violations.isEmpty()) {
            msg = violations.stream()
                .map(v -> String.format("'%s' %s", v.getPropertyPath(), v.getMessage()))
                .collect(Collectors.joining("; "));
        } else {
            msg = ex.getMessage() != null ? ex.getMessage() : "Validation failed for one or more fields.";
        }
        ApiErrorDetail detail = ApiErrorDetail.builder()
            .title("Validation Error")
            .type("https://finsop.cloudkaptan.com/errors/validation")
            .detail(msg)
            .build();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .contentType(MediaType.APPLICATION_JSON)
            .body(ApiResponse.error(HttpStatus.BAD_REQUEST, msg, detail));
    }

    @ExceptionHandler(SeparationOfDutyViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleSeparationOfDutyViolation(SeparationOfDutyViolationException ex) {
        ApiErrorDetail detail = ApiErrorDetail.builder()
            .title("Separation of Duty Violation")
            .type("https://finsop.cloudkaptan.com/errors/separation-of-duty")
            .detail(ex.getMessage())
            .build();
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
            .contentType(MediaType.APPLICATION_JSON)
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
            .contentType(MediaType.APPLICATION_JSON)
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
            .contentType(MediaType.APPLICATION_JSON)
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
            .contentType(MediaType.APPLICATION_JSON)
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
            .contentType(MediaType.APPLICATION_JSON)
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
            .contentType(MediaType.APPLICATION_JSON)
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
            .contentType(MediaType.APPLICATION_JSON)
            .body(ApiResponse.error(HttpStatus.BAD_REQUEST, ex.getMessage(), detail));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGenericException(Exception ex) {
        // Unwrap to root cause for better messaging
        Throwable root = ex;
        while (root.getCause() != null && root.getCause() != root) {
            root = root.getCause();
        }
        String rootMessage = root.getMessage() != null ? root.getMessage() : "An unexpected server error occurred.";
        // Replace cryptic transaction messages
        if (rootMessage.contains("Transaction silently rolled back") || rootMessage.contains("rollback-only")) {
            rootMessage = "The operation failed due to a data validation error. Please check all input fields and try again.";
        }
        ApiErrorDetail detail = ApiErrorDetail.builder()
            .title("Internal Server Error")
            .type("https://finsop.cloudkaptan.com/errors/internal-server-error")
            .detail(rootMessage.length() > 250 ? rootMessage.substring(0, 247) + "..." : rootMessage)
            .build();
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .contentType(MediaType.APPLICATION_JSON)
            .body(ApiResponse.error(HttpStatus.INTERNAL_SERVER_ERROR, rootMessage.length() > 250 ? rootMessage.substring(0, 247) + "..." : rootMessage, detail));
    }

    /**
     * Translates raw database error messages into user-friendly descriptions.
     */
    private String translateDbErrorMessage(String rawMsg) {
        if (rawMsg == null) return "A database constraint violation occurred.";
        if (rawMsg.contains("unique constraint") || rawMsg.contains("Unique index") || rawMsg.contains("UNIQUE") || rawMsg.contains("Duplicate")) {
            return "Duplicate entry detected. A record with the same unique key already exists. " + extractColumnHint(rawMsg);
        }
        if (rawMsg.contains("not-null") || rawMsg.contains("NOT NULL") || rawMsg.contains("cannot be null")) {
            return "A required field is missing or null. " + extractColumnHint(rawMsg);
        }
        if (rawMsg.contains("too long") || rawMsg.contains("value too long") || rawMsg.contains("String data, right truncated")) {
            return "A field value exceeds the maximum allowed length. " + extractColumnHint(rawMsg);
        }
        if (rawMsg.contains("foreign key") || rawMsg.contains("Referential integrity constraint violation")) {
            return "A referenced record does not exist (foreign key violation). " + extractColumnHint(rawMsg);
        }
        return rawMsg.length() > 250 ? rawMsg.substring(0, 247) + "..." : rawMsg;
    }

    private String extractColumnHint(String rawMsg) {
        if (rawMsg.contains("column \"")) {
            int start = rawMsg.indexOf("column \"") + 8;
            int end = rawMsg.indexOf('"', start);
            if (end > start) return "(column: " + rawMsg.substring(start, end) + ")";
        }
        if (rawMsg.contains("Key (")) {
            int start = rawMsg.indexOf("Key (");
            int end = rawMsg.indexOf(')', start);
            if (end > start) return "(" + rawMsg.substring(start, end + 1) + ")";
        }
        return "";
    }
}
