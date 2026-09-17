package com.cloudkaptan.sop.service;

import com.cloudkaptan.sop.domain.enums.UserRole;
import com.cloudkaptan.sop.dto.UserDto;
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
        return getUsers(null);
    }

    @Transactional(readOnly = true)
    public Page<UserDto> getUsers(String role, Pageable pageable) {
        List<UserDto> all = getUsers(role);
        int start = (int) pageable.getOffset();
        if (start >= all.size()) {
            return new PageImpl<>(List.of(), pageable, all.size());
        }
        int end = Math.min(start + pageable.getPageSize(), all.size());
        return new PageImpl<>(all.subList(start, end), pageable, all.size());
    }

    @Transactional(readOnly = true)
    public List<UserDto> getUsers(String role) {
        List<User> users = userRepository.findAll();
        if (role != null && !role.isBlank()) {
            String roleUpper = role.toUpperCase().trim();
            users = users.stream()
                .filter(u -> {
                    if (u.getRole() == UserRole.ADMIN) return true;
                    if ("usr-vivek-108".equals(u.getUserId())) return true;
                    if ("MAKER".equals(roleUpper)) return u.getRole() == UserRole.MAKER;
                    if ("CHECKER".equals(roleUpper)) return u.getRole() == UserRole.CHECKER;
                    return true;
                })
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
