package com.cloudkaptan.sop.service;

import com.cloudkaptan.sop.domain.enums.EntityCode;
import com.cloudkaptan.sop.domain.enums.TaskStatus;
import com.cloudkaptan.sop.domain.enums.UserRole;
import com.cloudkaptan.sop.dto.DashboardSummaryDto;
import com.cloudkaptan.sop.dto.TaskDto;
import com.cloudkaptan.sop.entity.CorporateEntity;
import com.cloudkaptan.sop.entity.Task;
import com.cloudkaptan.sop.entity.User;
import com.cloudkaptan.sop.repository.CorporateEntityRepository;
import com.cloudkaptan.sop.repository.TaskRepository;
import com.cloudkaptan.sop.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final CorporateEntityRepository entityRepository;
    private final TaskWorkflowService taskWorkflowService;

    @Transactional(readOnly = true)
    public DashboardSummaryDto getDashboardSummary(List<EntityCode> entities, String userId) {
        List<EntityCode> selectedEntities = (entities == null || entities.isEmpty())
            ? Arrays.asList(EntityCode.values())
            : entities;

        List<Task> allTasks = taskRepository.findTasksByEntities(selectedEntities);

        User currentUser = (userId != null && !userId.isBlank()) ? userRepository.findById(userId).orElse(null) : null;

        List<Task> tasks;
        if (currentUser != null && (currentUser.getRole() == UserRole.ADMIN || "usr-avisek-499".equals(userId) || "usr-manoj-042".equals(userId))) {
            tasks = allTasks;
        } else if (currentUser != null) {
            String targetId = currentUser.getUserId();
            String targetName = currentUser.getFullName().toLowerCase().trim();
            tasks = allTasks.stream().filter(t -> {
                boolean makerMatch = t.getMaker().getUserId().equals(targetId) || t.getMaker().getFullName().toLowerCase().contains(targetName);
                boolean checkerMatch = t.getChecker().getUserId().equals(targetId) || t.getChecker().getFullName().toLowerCase().contains(targetName);
                return makerMatch || checkerMatch;
            }).toList();
        } else {
            tasks = allTasks;
        }

        long trackedTasks = tasks.size();
        long approvedThisCycle = tasks.stream().filter(t -> t.getStatus() == TaskStatus.APPROVED).count();
        long pendingReview = tasks.stream().filter(t -> t.getStatus() == TaskStatus.PENDING_REVIEW).count();

        LocalDate today = LocalDate.now();
        List<Task> overdueTasks = tasks.stream()
            .filter(t -> t.getStatus() == TaskStatus.REJECTED || (t.getDueDate() != null && today.isAfter(t.getDueDate()) && t.getStatus() != TaskStatus.APPROVED))
            .toList();

        long overdue = overdueTasks.size();

        DashboardSummaryDto.MetricsDto metrics = DashboardSummaryDto.MetricsDto.builder()
            .trackedTasks(trackedTasks)
            .approvedThisCycle(approvedThisCycle)
            .pendingReview(pendingReview)
            .overdue(overdue)
            .build();

        List<CorporateEntity> activeEntities = entityRepository.findAll();
        List<DashboardSummaryDto.ScorecardRowDto> scorecard = activeEntities.stream()
            .filter(e -> selectedEntities.contains(e.getEntityCode()))
            .map(e -> {
                List<Task> entityTasks = tasks.stream().filter(t -> t.getEntity().getEntityCode() == e.getEntityCode()).toList();
                long total = entityTasks.size();
                long entityOverdue = entityTasks.stream()
                    .filter(t -> t.getStatus() == TaskStatus.REJECTED || (t.getDueDate() != null && today.isAfter(t.getDueDate()) && t.getStatus() != TaskStatus.APPROVED))
                    .count();
                long entityApproved = entityTasks.stream().filter(t -> t.getStatus() == TaskStatus.APPROVED).count();

                String rate = total > 0 ? Math.round(((double) entityApproved / total) * 100) + "%" : "100%";

                return DashboardSummaryDto.ScorecardRowDto.builder()
                    .entityId(e.getEntityCode())
                    .entity(e.getEntityName())
                    .totalTasks(total)
                    .overdue(entityOverdue)
                    .onTimeRate(rate)
                    .build();
            })
            .toList();

        List<TaskDto> overdueList = overdueTasks.stream()
            .map(taskWorkflowService::mapToDto)
            .toList();

        return DashboardSummaryDto.builder()
            .metrics(metrics)
            .scorecard(scorecard)
            .overdueList(overdueList)
            .build();
    }

    @Transactional(readOnly = true)
    public DashboardSummaryDto getDashboardSummary(List<EntityCode> entities) {
        return getDashboardSummary(entities, null);
    }
}
