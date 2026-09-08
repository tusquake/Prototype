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

    /**
     * Projection to capture the results of the native recursive query.
     */
    interface HierarchyProjection {
        String getSubordinateId();
        boolean getCanReadTasks();
        boolean getCanWriteTasks();
    }

    /**
     * Executes a Recursive CTE to fetch the entire downline reporting tree 
     * (both direct and indirect subordinates) for a given manager.
     */
    @Query(value = """
        WITH RECURSIVE subordinate_tree AS (
            -- Anchor: Direct reports of the manager
            SELECT subordinate_id, can_read_tasks, can_write_tasks
            FROM user_hierarchy
            WHERE manager_id = :managerId
            
            UNION
            
            -- Recursive Step: Reports of the reports
            SELECT uh.subordinate_id, uh.can_read_tasks, uh.can_write_tasks
            FROM user_hierarchy uh
            INNER JOIN subordinate_tree st ON uh.manager_id = st.subordinate_id
        )
        SELECT subordinate_id AS subordinateId, 
               can_read_tasks AS canReadTasks, 
               can_write_tasks AS canWriteTasks
        FROM subordinate_tree
        """, nativeQuery = true)
    List<HierarchyProjection> findAllSubordinatesDownline(@Param("managerId") String managerId);
}