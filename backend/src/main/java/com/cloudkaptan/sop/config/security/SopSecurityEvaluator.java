package com.cloudkaptan.sop.config.security;

import com.cloudkaptan.sop.entity.Sop;
import com.cloudkaptan.sop.entity.Task;
import com.cloudkaptan.sop.entity.User;
import com.cloudkaptan.sop.service.UserCategoryPermissionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component("sopSecurityEvaluator")
@RequiredArgsConstructor
public class SopSecurityEvaluator {

    private final UserCategoryPermissionService categoryPermissionService;

    /**
     * Enforce Segregation of Duties (SoD) on SOP Approval:
     * A user cannot self-approve an SOP draft they created or were assigned to create.
     */
    public void validateSopApprovalSoD(User actor, Sop sop) {
        if (actor == null || sop == null) return;
        String actorId = actor.getUserId();

        // 1. Check if actor is creator / assigned creator
        boolean isCreator = (sop.getCreatedBy() != null && actorId.equals(sop.getCreatedBy().getUserId()))
                || (sop.getAssignedCreatorId() != null && actorId.equals(sop.getAssignedCreatorId()));

        if (isCreator) {
            log.error("SoD Violation: User [{}] attempted self-approval of SOP [{}]", actorId, sop.getSopCode());
            throw new IllegalStateException("Segregation of Duties (SoD) Violation: You cannot approve an SOP draft that you created or were assigned to create.");
        }
    }

    /**
     * Enforce Segregation of Duties (SoD) on Task Review / Approval:
     * A task Maker cannot verify or approve their own submitted compliance task.
     */
    public void validateTaskReviewSoD(User actor, Task task) {
        if (actor == null || task == null) return;
        String actorId = actor.getUserId();

        // Check if actor was the Maker of the task
        boolean isMaker = (task.getMaker() != null && actorId.equals(task.getMaker().getUserId()))
                || (task.getAssignedMakerIds() != null && task.getAssignedMakerIds().contains(actorId));

        if (isMaker) {
            log.error("SoD Violation: User [{}] attempted self-verification of Task [{}]", actorId, task.getRecordNo());
            throw new IllegalStateException("Segregation of Duties (SoD) Violation: You cannot verify or approve a compliance task that you submitted as Maker.");
        }
    }
}
