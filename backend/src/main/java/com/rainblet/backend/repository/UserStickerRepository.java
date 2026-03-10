package com.rainblet.backend.repository;

import com.rainblet.backend.entity.UserSticker;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserStickerRepository extends JpaRepository<UserSticker, Long> {

    List<UserSticker> findByUserId(Long userId);

    Optional<UserSticker> findByUserIdAndStickerId(Long userId, String stickerId);

    Optional<UserSticker> findByUserIdAndIsAvatarTrue(Long userId);

    Optional<UserSticker> findByUserIdAndStickerIdAndStickerCountGreaterThan(Long userId, String stickerId, int minimumCount);

    @Modifying
    @Query("update UserSticker us set us.isAvatar = false where us.userId = :userId and us.isAvatar = true")
    int clearAvatarByUserId(@Param("userId") Long userId);
}
