package com.rainblet.backend.service;

import com.rainblet.backend.dto.UserStickerRollResponse;
import com.rainblet.backend.dto.UserStickerSellResponse;
import com.rainblet.backend.entity.Sticker;
import com.rainblet.backend.entity.UserSticker;
import com.rainblet.backend.repository.StickerRepository;
import com.rainblet.backend.repository.UserRepository;
import com.rainblet.backend.repository.UserStickerRepository;
import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class UserStickerService {

    private final UserStickerRepository userStickerRepository;
    private final StickerRepository stickerRepository;
    private final UserRepository userRepository;
    private final JdbcTemplate jdbcTemplate;

    public UserStickerService(
            UserStickerRepository userStickerRepository,
            StickerRepository stickerRepository,
            UserRepository userRepository,
            JdbcTemplate jdbcTemplate
    ) {
        this.userStickerRepository = userStickerRepository;
        this.stickerRepository = stickerRepository;
        this.userRepository = userRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional(readOnly = true)
    public Map<String, Integer> getStickerInventory(Long userId) {
        validateUserExists(userId);

        List<UserSticker> rows = userStickerRepository.findByUserId(userId);
        Map<String, Integer> inventory = new LinkedHashMap<>();
        for (UserSticker row : rows) {
            if (row.getStickerCount() > 0) {
                inventory.put(row.getStickerId(), row.getStickerCount());
            }
        }
        return inventory;
    }

    @Transactional
    public UserStickerRollResponse rollSticker(Long userId, String stickerId) {
        validateUserExists(userId);

        Sticker sticker = stickerRepository.findById(normalizeStickerId(stickerId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Sticker not found: " + stickerId));

        StickerOfferRule rule = resolveOfferRule(sticker);

        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "CALL roll_user_sticker(?, ?, ?, ?, ?)",
                userId,
                sticker.getId(),
                rule.cost(),
                rule.currency(),
                BigDecimal.valueOf(rule.successRate())
        );

        if (rows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Sticker roll failed");
        }

        Map<String, Object> row = rows.getFirst();
        return new UserStickerRollResponse(
                asBoolean(row.get("affordable")),
                asBoolean(row.get("success")),
                asBoolean(row.get("is_new")),
                asInt(row.get("owned_count")),
                asInt(row.get("remaining_coins")),
                asInt(row.get("remaining_points"))
        );
    }

    @Transactional
    public UserStickerSellResponse sellSticker(Long userId, String stickerId) {
        validateUserExists(userId);

        Sticker sticker = stickerRepository.findById(normalizeStickerId(stickerId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Sticker not found: " + stickerId));

        int salePrice = calculateSalePrice(resolveOfferRule(sticker));

        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "CALL sell_user_sticker(?, ?, ?)",
                userId,
                sticker.getId(),
                salePrice
        );

        if (rows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Sticker sale failed");
        }

        Map<String, Object> row = rows.getFirst();
        boolean sold = asBoolean(row.get("sold"));
        return new UserStickerSellResponse(
                sold,
                asInt(row.get("remaining_count")),
                sold ? salePrice : 0,
                asInt(row.get("remaining_coins")),
                asInt(row.get("remaining_points"))
        );
    }

    private StickerOfferRule resolveOfferRule(Sticker sticker) {
        String rarity = Objects.requireNonNullElse(sticker.getRarity(), "").toLowerCase();
        return switch (rarity) {
            case "common" -> new StickerOfferRule(1, "coins", 0.2d);
            case "rare" -> new StickerOfferRule(3, "coins", 0.12d);
            case "epic" -> new StickerOfferRule(6, "coins", 0.05d);
            case "legendary" -> new StickerOfferRule(10, "score", 0.02d);
            case "chroma" -> new StickerOfferRule(14, "score", 0.01d);
            default -> throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Unsupported sticker rarity for roll: " + sticker.getRarity()
            );
        };
    }

    private int calculateSalePrice(StickerOfferRule offer) {
        double worth = offer.successRate() > 0 ? offer.cost() / offer.successRate() : 0;
        return Math.max(0, (int) Math.floor(worth * 0.4d));
    }

    private void validateUserExists(Long userId) {
        if (userId == null || !userRepository.existsById(userId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "User not found: " + userId);
        }
    }

    private String normalizeStickerId(String stickerId) {
        if (stickerId == null || stickerId.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "stickerId is required");
        }
        return stickerId.trim();
    }

    private boolean asBoolean(Object value) {
        if (value instanceof Boolean bool) {
            return bool;
        }
        if (value instanceof Number number) {
            return number.intValue() != 0;
        }
        return Boolean.parseBoolean(String.valueOf(value));
    }

    private int asInt(Object value) {
        if (value instanceof Number number) {
            return number.intValue();
        }
        return Integer.parseInt(String.valueOf(value));
    }

    private record StickerOfferRule(int cost, String currency, double successRate) {
    }
}
