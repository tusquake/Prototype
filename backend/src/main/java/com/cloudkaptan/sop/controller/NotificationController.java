package com.cloudkaptan.sop.controller;

import com.cloudkaptan.sop.dto.*;
import com.cloudkaptan.sop.service.UserNotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/finsop/v1/notifications")
@RequiredArgsConstructor
@Tag(name = "User Notifications", description = "Endpoints for real-time Server-Sent Events (SSE) notification streaming and user inbox notifications")
public class NotificationController {

    private final UserNotificationService userNotificationService;

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @Operation(summary = "Subscribe to real-time notifications (SSE)", description = "Establishes a persistent Server-Sent Events (SSE) connection to receive real-time notification alerts.")
    public SseEmitter subscribeNotifications(
            @Parameter(description = "User ID to subscribe") @RequestParam("userId") String userId) {
        return userNotificationService.subscribe(userId);
    }

    @PostMapping("/search")
    @Operation(summary = "Search user notifications", description = "Returns paginated notifications for a user. Pass userId, optional isRead filter, page and size.")
    public ResponseEntity<ApiResponse<PageResponse<UserNotificationDto>>> searchNotifications(
            @RequestBody(required = false) NotificationFilterRequest request
    ) {
        if (request == null) request = new NotificationFilterRequest();
        Pageable pageable = PageRequest.of(request.getPage(), request.getSize());
        Page<UserNotificationDto> page = userNotificationService.getNotificationsForUser(request.getUserId(), pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.from(page)));
    }

    @GetMapping("/user/{userId}/unread-count")
    @Operation(summary = "Get unread notification count", description = "Returns total count of unread notifications for a user.")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getUnreadCount(
            @Parameter(description = "User ID") @PathVariable("userId") String userId) {
        long count = userNotificationService.getUnreadCountForUser(userId);
        return ResponseEntity.ok(ApiResponse.success(Map.of("unreadCount", count)));
    }

    @PutMapping("/{id}/read")
    @Operation(summary = "Mark notification as read", description = "Marks a specific notification as read.")
    public ResponseEntity<ApiResponse<UserNotificationDto>> markAsRead(
            @Parameter(description = "Notification UUID") @PathVariable("id") UUID notificationId) {
        return ResponseEntity.ok(ApiResponse.success(userNotificationService.markAsRead(notificationId)));
    }

    @PutMapping("/user/{userId}/read-all")
    @Operation(summary = "Mark all notifications as read", description = "Marks all unread notifications for a user as read.")
    public ResponseEntity<ApiResponse<Map<String, String>>> markAllAsRead(
            @Parameter(description = "User ID") @PathVariable("userId") String userId) {
        userNotificationService.markAllAsRead(userId);
        return ResponseEntity.ok(ApiResponse.success(Map.of("message", "All notifications marked as read")));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete notification", description = "Deletes a notification record.")
    public ResponseEntity<ApiResponse<Map<String, String>>> deleteNotification(
            @Parameter(description = "Notification UUID") @PathVariable("id") UUID notificationId) {
        userNotificationService.deleteNotification(notificationId);
        return ResponseEntity.ok(ApiResponse.success(Map.of("message", "Notification deleted successfully")));
    }
}
