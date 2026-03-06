package com.rainblet.backend.repository;

import com.rainblet.backend.entity.UserSticker;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserStickerRepository extends JpaRepository<UserSticker, Long> {

    List<UserSticker> findByUserId(Long userId);

    Optional<UserSticker> findByUserIdAndStickerId(Long userId, String stickerId);
}
