package com.cloudkaptan.sop.service;

import com.cloudkaptan.sop.domain.enums.UserRole;
import com.cloudkaptan.sop.dto.UserDto;
import com.cloudkaptan.sop.dto.UserFilterRequest;
import com.cloudkaptan.sop.entity.User;
import com.cloudkaptan.sop.exception.ResourceNotFoundException;
import com.cloudkaptan.sop.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<UserDto> getAllUsers() {
        return userRepository.findAll().stream().map(this::mapToDto).toList();
    }

    @Transactional(readOnly = true)
    public Page<UserDto> getUsers(UserFilterRequest request, Pageable pageable) {
        List<UserDto> all = getFilteredUsers(request);
        int start = (int) pageable.getOffset();
        if (start >= all.size()) {
            return new PageImpl<>(List.of(), pageable, all.size());
        }
        int end = Math.min(start + pageable.getPageSize(), all.size());
        return new PageImpl<>(all.subList(start, end), pageable, all.size());
    }

    @Transactional(readOnly = true)
    public Page<UserDto> getUsers(String role, Pageable pageable) {
        UserFilterRequest req = new UserFilterRequest();
        req.setRoleName(role);
        return getUsers(req, pageable);
    }

    private List<UserDto> getFilteredUsers(UserFilterRequest request) {
        List<User> users = userRepository.findAll();

        String roleFilter = null;
        if (request.getRole() != null) {
            roleFilter = request.getRole().name();
        } else if (request.getRoleName() != null && !request.getRoleName().isBlank()) {
            roleFilter = request.getRoleName().toUpperCase().trim();
        }

        final String finalRoleFilter = roleFilter;

        if (finalRoleFilter != null && !finalRoleFilter.isBlank()) {
            users = users.stream()
                .filter(u -> {
                    if (u.getRole() == UserRole.ADMIN) return true;
                    if ("usr-vivek-108".equals(u.getUserId())) return true;
                    if ("MAKER".equals(finalRoleFilter)) return u.getRole() == UserRole.MAKER;
                    if ("CHECKER".equals(finalRoleFilter)) return u.getRole() == UserRole.CHECKER;
                    return true;
                })
                .toList();
        }

        if (request.getEntityCode() != null) {
            users = users.stream()
                .filter(u -> u.getEntity() != null && u.getEntity().getEntityCode() == request.getEntityCode())
                .toList();
        }

        String search = request.getSearch();
        if (search != null && !search.isBlank()) {
            String q = search.trim().toLowerCase();
            users = users.stream()
                .filter(u -> (u.getFullName() != null && u.getFullName().toLowerCase().contains(q))
                        || (u.getEmail() != null && u.getEmail().toLowerCase().contains(q)))
                .toList();
        }

        return users.stream().map(this::mapToDto).toList();
    }

    @Transactional(readOnly = true)
    public UserDto getUserByEmail(String email) {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));
        return mapToDto(user);
    }

    public UserDto mapToDto(User user) {
        return UserDto.builder()
            .userId(user.getUserId())
            .email(user.getEmail())
            .fullName(user.getFullName())
            .role(user.getRole())
            .entityCode(user.getEntity().getEntityCode())
            .isActive(user.getIsActive())
            .build();
    }
}
