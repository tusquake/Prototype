package com.cloudkaptan.sop.controller;

import com.cloudkaptan.sop.dto.ApiResponse;
import com.cloudkaptan.sop.dto.UserNotificationDto;
import com.cloudkaptan.sop.service.UserNotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping(value = {"/finsop/v1/notifications", "/api/v1/notifications"})
@RequiredArgsConstructor
public class NotificationController {

    private final UserNotificationService userNotificationService;

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribeNotifications(@RequestParam("userId") String userId) {
        return userNotificationService.subscribe(userId);
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<ApiResponse<List<UserNotificationDto>>> getUserNotifications(@PathVariable("userId") String userId) {
        return ResponseEntity.ok(ApiResponse.success(userNotificationService.getNotificationsForUser(userId)));
    }

    @GetMapping("/user/{userId}/unread-count")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getUnreadCount(@PathVariable("userId") String userId) {
        long count = userNotificationService.getUnreadCountForUser(userId);
        return ResponseEntity.ok(ApiResponse.success(Map.of("unreadCount", count)));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<ApiResponse<UserNotificationDto>> markAsRead(@PathVariable("id") UUID notificationId) {
        return ResponseEntity.ok(ApiResponse.success(userNotificationService.markAsRead(notificationId)));
    }

    @PutMapping("/user/{userId}/read-all")
    public ResponseEntity<ApiResponse<Map<String, String>>> markAllAsRead(@PathVariable("userId") String userId) {
        userNotificationService.markAllAsRead(userId);
        return ResponseEntity.ok(ApiResponse.success(Map.of("message", "All notifications marked as read")));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Map<String, String>>> deleteNotification(@PathVariable("id") UUID notificationId) {
        userNotificationService.deleteNotification(notificationId);
        return ResponseEntity.ok(ApiResponse.success(Map.of("message", "Notification deleted successfully")));
    }
}
