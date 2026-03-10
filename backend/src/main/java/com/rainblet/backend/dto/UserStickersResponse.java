package com.rainblet.backend.dto;

import java.util.Map;

public record UserStickersResponse(
        Map<String, Integer> stickerInventory,
        String avatarStickerId
) {
}
