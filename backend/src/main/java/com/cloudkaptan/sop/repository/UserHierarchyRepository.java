package com.cloudkaptan.sop.repository;

import com.cloudkaptan.sop.domain.entity.UserHierarchy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface UserHierarchyRepository extends JpaRepository<UserHierarchy, UUID> {

    interface HierarchyProjection {
        String getSubordinateId();
        Boolean getCanReadTasks();
        Boolean getCanWriteTasks();
    }

    @Query(value = """
        WITH RECURSIVE subordinate_tree AS (
            SELECT subordinate_id, can_read_tasks, can_write_tasks
            FROM user_hierarchy
            WHERE manager_id = :managerId
            
            UNION
            
            SELECT uh.subordinate_id, uh.can_read_tasks, uh.can_write_tasks
            FROM user_hierarchy uh
            INNER JOIN subordinate_tree st ON uh.manager_id = st.subordinate_id
        )
        SELECT subordinate_id AS "subordinateId", 
               can_read_tasks AS "canReadTasks", 
               can_write_tasks AS "canWriteTasks"
        FROM subordinate_tree
        """, nativeQuery = true)
    List<HierarchyProjection> findAllSubordinatesDownline(@Param("managerId") String managerId);
}