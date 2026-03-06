package com.rainblet.backend.dto;

public record UserStickerSellResponse(
        boolean sold,
        int remainingCount,
        int salePrice,
        int remainingCoins,
        int remainingPoints
) {
}
