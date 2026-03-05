package com.rainblet.backend.repository;

import com.rainblet.backend.entity.UserCollectible;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserCollectibleRepository extends JpaRepository<UserCollectible, Long> {

    List<UserCollectible> findByUserId(Long userId);

    Optional<UserCollectible> findByUserIdAndCollectibleId(Long userId, String collectibleId);

    void deleteByUserId(Long userId);

    void deleteByUserIdAndCollectibleIdNotIn(Long userId, Collection<String> collectibleIds);
}