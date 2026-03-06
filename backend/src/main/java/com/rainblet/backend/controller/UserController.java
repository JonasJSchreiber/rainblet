package com.rainblet.backend.controller;

import com.rainblet.backend.dto.UserCollectiblesRequest;
import com.rainblet.backend.dto.UserStickerRollRequest;
import com.rainblet.backend.dto.UserStickerRollResponse;
import com.rainblet.backend.dto.UserStickerSellRequest;
import com.rainblet.backend.dto.UserStickerSellResponse;
import com.rainblet.backend.dto.UserStickersResponse;
import com.rainblet.backend.dto.UserUpsertRequest;
import com.rainblet.backend.dto.UserWalletRequest;
import com.rainblet.backend.dto.UserWalletResponse;
import com.rainblet.backend.entity.User;
import com.rainblet.backend.entity.UserWallet;
import com.rainblet.backend.repository.UserRepository;
import com.rainblet.backend.service.UserCollectibleService;
import com.rainblet.backend.service.UserService;
import com.rainblet.backend.service.UserStickerService;
import com.rainblet.backend.service.UserWalletService;
import io.jsonwebtoken.Claims;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;
    private final UserService userService;
    private final UserCollectibleService userCollectibleService;
    private final UserWalletService userWalletService;
    private final UserStickerService userStickerService;

    public UserController(
            UserRepository userRepository,
            UserService userService,
            UserCollectibleService userCollectibleService,
            UserWalletService userWalletService,
            UserStickerService userStickerService
    ) {
        this.userRepository = userRepository;
        this.userService = userService;
        this.userCollectibleService = userCollectibleService;
        this.userWalletService = userWalletService;
        this.userStickerService = userStickerService;
    }

    @GetMapping
    public List<User> list() {
        return userRepository.findAll();
    }

    @GetMapping("/{id}")
    public User getById(@PathVariable Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found: " + id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public User create(@Valid @RequestBody User user) {
        user.setId(null);
        userService.ensureEmailAvailable(user.getEmail(), null);
        return userRepository.save(user);
    }

    @PutMapping("/{id}")
    public User update(@PathVariable Long id, @Valid @RequestBody User user) {
        if (!userRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found: " + id);
        }

        userService.ensureEmailAvailable(user.getEmail(), id);
        user.setId(id);
        return userRepository.save(user);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        if (!userRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found: " + id);
        }
        userRepository.deleteById(id);
    }

    @PostMapping("/sso-upsert")
    public User ssoUpsert(@RequestBody(required = false) UserUpsertRequest request, Authentication authentication) {
        if (authentication == null || !(authentication.getDetails() instanceof Claims claims)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing JWT claims for SSO upsert");
        }

        UserUpsertRequest merged = mergeFromClaims(claims, request);
        return userService.upsertFromSso(merged);
    }

    @GetMapping("/me/collectibles")
    public Map<String, List<String>> getMyCollectibles(Authentication authentication) {
        User user = userService.resolveAuthenticatedUser(authentication);
        List<String> collectibleIds = userCollectibleService.getCollectibleIdsForUser(user.getId());
        return Map.of("collectibleIds", collectibleIds);
    }

    @PutMapping("/me/collectibles")
    public Map<String, List<String>> putMyCollectibles(
            Authentication authentication,
            @RequestBody(required = false) UserCollectiblesRequest request
    ) {
        User user = userService.resolveAuthenticatedUser(authentication);
        List<String> collectibleIds = request == null ? List.of() : request.getCollectibleIds();
        List<String> persisted = userCollectibleService.replaceCollectibles(user.getId(), collectibleIds);
        return Map.of("collectibleIds", persisted);
    }

    @GetMapping("/me/stickers")
    public UserStickersResponse getMyStickers(Authentication authentication) {
        User user = userService.resolveAuthenticatedUser(authentication);
        return new UserStickersResponse(userStickerService.getStickerInventory(user.getId()));
    }

    @PostMapping("/me/stickers/roll")
    public UserStickerRollResponse rollMySticker(
            Authentication authentication,
            @RequestBody(required = false) UserStickerRollRequest request
    ) {
        if (request == null || request.getStickerId() == null || request.getStickerId().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "stickerId is required");
        }

        User user = userService.resolveAuthenticatedUser(authentication);
        return userStickerService.rollSticker(user.getId(), request.getStickerId());
    }

    @PostMapping("/me/stickers/sell")
    public UserStickerSellResponse sellMySticker(
            Authentication authentication,
            @RequestBody(required = false) UserStickerSellRequest request
    ) {
        if (request == null || request.getStickerId() == null || request.getStickerId().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "stickerId is required");
        }

        User user = userService.resolveAuthenticatedUser(authentication);
        return userStickerService.sellSticker(user.getId(), request.getStickerId());
    }

    @GetMapping("/me/wallet")
    public UserWalletResponse getMyWallet(Authentication authentication) {
        User user = userService.resolveAuthenticatedUser(authentication);
        UserWallet wallet = userWalletService.getOrCreateByUserId(user.getId());
        return new UserWalletResponse(wallet.getUserId(), wallet.getCoins(), wallet.getPoints());
    }

    @PutMapping("/me/wallet")
    public UserWalletResponse putMyWallet(
            Authentication authentication,
            @RequestBody(required = false) UserWalletRequest request
    ) {
        if (request == null || request.getCoins() == null || request.getPoints() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "coins and points are required");
        }

        User user = userService.resolveAuthenticatedUser(authentication);
        UserWallet wallet = userWalletService.upsertByUserId(user.getId(), request.getCoins(), request.getPoints());
        return new UserWalletResponse(wallet.getUserId(), wallet.getCoins(), wallet.getPoints());
    }

    private UserUpsertRequest mergeFromClaims(Claims claims, UserUpsertRequest request) {
        UserUpsertRequest source = request == null ? new UserUpsertRequest() : request;
        UserUpsertRequest merged = new UserUpsertRequest();

        merged.setSsoProvider(claimString(claims, "provider", source.getSsoProvider(), "google"));
        merged.setSsoSubject(claimString(claims, "sub", source.getSsoSubject(), null));
        merged.setEmail(claimString(claims, "email", source.getEmail(), null));
        merged.setDisplayName(claimString(claims, "name", source.getDisplayName(), null));
        merged.setGivenName(claimString(claims, "given_name", source.getGivenName(), null));
        merged.setFamilyName(claimString(claims, "family_name", source.getFamilyName(), null));
        merged.setPictureUrl(claimString(claims, "picture", source.getPictureUrl(), null));
        merged.setLocale(claimString(claims, "locale", source.getLocale(), null));
        merged.setEmailVerified(claimBoolean(claims, "email_verified", source.getEmailVerified(), Boolean.FALSE));

        return merged;
    }

    private String claimString(Claims claims, String key, String fallback, String defaultValue) {
        Object value = claims.get(key);
        if (value != null) {
            String asString = String.valueOf(value).trim();
            if (!asString.isEmpty()) {
                return asString;
            }
        }

        if (fallback != null && !fallback.trim().isEmpty()) {
            return fallback.trim();
        }

        return defaultValue;
    }

    private Boolean claimBoolean(Claims claims, String key, Boolean fallback, Boolean defaultValue) {
        Object value = claims.get(key);
        if (value instanceof Boolean bool) {
            return bool;
        }
        if (value instanceof String stringValue) {
            if ("true".equalsIgnoreCase(stringValue)) {
                return Boolean.TRUE;
            }
            if ("false".equalsIgnoreCase(stringValue)) {
                return Boolean.FALSE;
            }
        }

        if (fallback != null) {
            return fallback;
        }

        return defaultValue;
    }
}
