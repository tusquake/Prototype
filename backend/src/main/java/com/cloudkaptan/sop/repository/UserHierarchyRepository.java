package com.cloudkaptan.sop.repository;

import com.cloudkaptan.sop.domain.entity.UserHierarchy;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface UserHierarchyRepository extends JpaRepository<UserHierarchy, UUID> {

    interface HierarchyProjection {
        @Value("#{target.subordinate_id != null ? target.subordinate_id : (target.SUBORDINATE_ID != null ? target.SUBORDINATE_ID : target.subordinateId)}")
        String getSubordinateId();

        @Value("#{target.can_read_tasks != null ? target.can_read_tasks : (target.CAN_READ_TASKS != null ? target.CAN_READ_TASKS : target.canReadTasks)}")
        Boolean getCanReadTasks();

        @Value("#{target.can_write_tasks != null ? target.can_write_tasks : (target.CAN_WRITE_TASKS != null ? target.CAN_WRITE_TASKS : target.canWriteTasks)}")
        Boolean getCanWriteTasks();
    }

    @Query(value = """
        WITH RECURSIVE subordinate_tree AS (
            SELECT subordinate_id, can_read_tasks, can_write_tasks
            FROM user_hierarchy
            WHERE manager_id = :managerId
            
            UNION ALL
            
            SELECT uh.subordinate_id, uh.can_read_tasks, uh.can_write_tasks
            FROM user_hierarchy uh
            INNER JOIN subordinate_tree st ON uh.manager_id = st.subordinate_id
        )
        SELECT subordinate_id AS subordinate_id, 
               can_read_tasks AS can_read_tasks, 
               can_write_tasks AS can_write_tasks
        FROM subordinate_tree
        """, nativeQuery = true)
    List<HierarchyProjection> findAllSubordinatesDownline(@Param("managerId") String managerId);
}