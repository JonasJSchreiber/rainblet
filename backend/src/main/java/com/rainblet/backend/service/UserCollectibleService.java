package com.rainblet.backend.service;

import com.rainblet.backend.entity.UserCollectible;
import com.rainblet.backend.repository.CollectibleRepository;
import com.rainblet.backend.repository.UserCollectibleRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class UserCollectibleService {

    private final UserCollectibleRepository userCollectibleRepository;
    private final CollectibleRepository collectibleRepository;

    public UserCollectibleService(
            UserCollectibleRepository userCollectibleRepository,
            CollectibleRepository collectibleRepository
    ) {
        this.userCollectibleRepository = userCollectibleRepository;
        this.collectibleRepository = collectibleRepository;
    }

    @Transactional(readOnly = true)
    public List<String> getCollectibleIdsForUser(Long userId) {
        return userCollectibleRepository.findByUserId(userId).stream()
                .map(UserCollectible::getCollectibleId)
                .sorted()
                .toList();
    }

    @Transactional
    public List<String> replaceCollectibles(Long userId, List<String> collectibleIds) {
        Set<String> normalizedIds = normalizeCollectibleIds(collectibleIds);
        validateCollectibleIds(normalizedIds);

        if (normalizedIds.isEmpty()) {
            userCollectibleRepository.deleteByUserId(userId);
            return List.of();
        }

        userCollectibleRepository.deleteByUserIdAndCollectibleIdNotIn(userId, normalizedIds);

        for (String collectibleId : normalizedIds) {
            boolean exists = userCollectibleRepository.findByUserIdAndCollectibleId(userId, collectibleId).isPresent();
            if (exists) {
                continue;
            }

            UserCollectible userCollectible = new UserCollectible();
            userCollectible.setUserId(userId);
            userCollectible.setCollectibleId(collectibleId);
            userCollectible.setUnlockedAt(Instant.now());
            userCollectibleRepository.save(userCollectible);
        }

        return new ArrayList<>(normalizedIds);
    }

    private Set<String> normalizeCollectibleIds(List<String> collectibleIds) {
        if (collectibleIds == null) {
            return Set.of();
        }

        Set<String> normalized = new LinkedHashSet<>();
        for (String collectibleId : collectibleIds) {
            if (collectibleId == null) {
                continue;
            }

            String trimmed = collectibleId.trim();
            if (!trimmed.isEmpty()) {
                normalized.add(trimmed);
            }
        }

        return normalized;
    }

    private void validateCollectibleIds(Set<String> collectibleIds) {
        if (collectibleIds.isEmpty()) {
            return;
        }

        long existingCount = collectibleRepository.countByIdIn(collectibleIds);
        if (existingCount != collectibleIds.size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "One or more collectible ids are invalid");
        }
    }
}