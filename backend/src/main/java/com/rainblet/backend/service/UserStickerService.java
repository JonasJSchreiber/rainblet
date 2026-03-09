package com.rainblet.backend.service;

import com.rainblet.backend.dto.UserStickerRollResponse;
import com.rainblet.backend.dto.UserStickerSellResponse;
import com.rainblet.backend.entity.Sticker;
import com.rainblet.backend.entity.UserSticker;
import com.rainblet.backend.entity.UserWallet;
import com.rainblet.backend.repository.StickerRepository;
import com.rainblet.backend.repository.UserRepository;
import com.rainblet.backend.repository.UserStickerRepository;
import com.rainblet.backend.repository.UserWalletRepository;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ThreadLocalRandom;
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
    private final UserWalletRepository userWalletRepository;
    private final JdbcTemplate jdbcTemplate;

    public UserStickerService(
            UserStickerRepository userStickerRepository,
            StickerRepository stickerRepository,
            UserRepository userRepository,
            UserWalletRepository userWalletRepository,
            JdbcTemplate jdbcTemplate
    ) {
        this.userStickerRepository = userStickerRepository;
        this.stickerRepository = stickerRepository;
        this.userRepository = userRepository;
        this.userWalletRepository = userWalletRepository;
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
    public UserStickerRollResponse rollSticker(Long userId, String rarity) {
        validateUserExists(userId);

        String normalizedRarity = normalizeRarity(rarity);
        StickerPackRule packRule = resolvePackRule(normalizedRarity);

        List<Sticker> stickers = stickerRepository.findByRarityIgnoreCaseOrderByNameAsc(normalizedRarity);
        if (stickers.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No stickers found for rarity: " + normalizedRarity);
        }

        Sticker awardedSticker = stickers.get(ThreadLocalRandom.current().nextInt(stickers.size()));
        UserWallet wallet = getOrCreateWallet(userId);

        if (wallet.getCoins() < packRule.costCoins()) {
            return new UserStickerRollResponse(
                    false,
                    false,
                    false,
                    0,
                    wallet.getCoins(),
                    wallet.getPoints(),
                    null
            );
        }

        wallet.setCoins(wallet.getCoins() - packRule.costCoins());
        userWalletRepository.save(wallet);

        UserSticker userSticker = userStickerRepository.findByUserIdAndStickerId(userId, awardedSticker.getId())
                .orElseGet(() -> {
                    UserSticker created = new UserSticker();
                    created.setUserId(userId);
                    created.setStickerId(awardedSticker.getId());
                    created.setStickerCount(0);
                    return created;
                });

        int previousCount = Math.max(0, userSticker.getStickerCount());
        int nextCount = previousCount + 1;
        userSticker.setStickerCount(nextCount);
        userStickerRepository.save(userSticker);

        return new UserStickerRollResponse(
                true,
                true,
                previousCount == 0,
                nextCount,
                wallet.getCoins(),
                wallet.getPoints(),
                awardedSticker.getId()
        );
    }

    @Transactional
    public UserStickerSellResponse sellSticker(Long userId, String stickerId) {
        validateUserExists(userId);

        Sticker sticker = stickerRepository.findById(normalizeStickerId(stickerId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Sticker not found: " + stickerId));

        int salePrice = calculateSalePrice(resolveLegacyOfferRule(sticker));

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

    private UserWallet getOrCreateWallet(Long userId) {
        return userWalletRepository.findByUserId(userId).orElseGet(() -> {
            UserWallet wallet = new UserWallet();
            wallet.setUserId(userId);
            wallet.setCoins(0);
            wallet.setPoints(0);
            return userWalletRepository.save(wallet);
        });
    }

    private StickerPackRule resolvePackRule(String rarity) {
        return switch (rarity) {
            case "common" -> new StickerPackRule(5);
            case "rare" -> new StickerPackRule(10);
            case "epic" -> new StickerPackRule(15);
            case "legendary" -> new StickerPackRule(30);
            case "chroma" -> new StickerPackRule(50);
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported rarity pack: " + rarity);
        };
    }

    private StickerOfferRule resolveLegacyOfferRule(Sticker sticker) {
        String rarity = Objects.requireNonNullElse(sticker.getRarity(), "").toLowerCase();
        return switch (rarity) {
            case "common" -> new StickerOfferRule(1, "coins", 0.2d);
            case "rare" -> new StickerOfferRule(3, "coins", 0.12d);
            case "epic" -> new StickerOfferRule(6, "coins", 0.05d);
            case "legendary" -> new StickerOfferRule(10, "score", 0.02d);
            case "chroma" -> new StickerOfferRule(14, "score", 0.01d);
            default -> throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Unsupported sticker rarity for sale: " + sticker.getRarity()
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

    private String normalizeRarity(String rarity) {
        if (rarity == null || rarity.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "rarity is required");
        }
        return rarity.trim().toLowerCase();
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

    private record StickerPackRule(int costCoins) {
    }
}

