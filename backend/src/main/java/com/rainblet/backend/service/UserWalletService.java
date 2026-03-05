package com.rainblet.backend.service;

import com.rainblet.backend.entity.UserWallet;
import com.rainblet.backend.repository.UserRepository;
import com.rainblet.backend.repository.UserWalletRepository;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class UserWalletService {

    private final UserWalletRepository userWalletRepository;
    private final UserRepository userRepository;

    public UserWalletService(UserWalletRepository userWalletRepository, UserRepository userRepository) {
        this.userWalletRepository = userWalletRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<UserWallet> list() {
        return userWalletRepository.findAll();
    }

    @Transactional(readOnly = true)
    public UserWallet getById(Long id) {
        return userWalletRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User wallet not found: " + id));
    }

    @Transactional
    public UserWallet create(UserWallet wallet) {
        if (wallet.getId() != null) {
            wallet.setId(null);
        }

        Long userId = wallet.getUserId();
        validateUserExists(userId);
        ensureNonNegative(wallet.getCoins(), wallet.getPoints());

        if (userWalletRepository.existsByUserId(userId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Wallet already exists for user: " + userId);
        }

        return userWalletRepository.save(wallet);
    }

    @Transactional
    public UserWallet update(Long id, UserWallet wallet) {
        UserWallet existing = getById(id);

        Long userId = wallet.getUserId() == null ? existing.getUserId() : wallet.getUserId();
        validateUserExists(userId);

        if (!userId.equals(existing.getUserId()) && userWalletRepository.existsByUserId(userId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Wallet already exists for user: " + userId);
        }

        int coins = wallet.getCoins();
        int points = wallet.getPoints();
        ensureNonNegative(coins, points);

        existing.setUserId(userId);
        existing.setCoins(coins);
        existing.setPoints(points);

        return userWalletRepository.save(existing);
    }

    @Transactional
    public void delete(Long id) {
        if (!userWalletRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User wallet not found: " + id);
        }

        userWalletRepository.deleteById(id);
    }

    @Transactional
    public UserWallet upsertByUserId(Long userId, int coins, int points) {
        validateUserExists(userId);
        ensureNonNegative(coins, points);

        UserWallet wallet = userWalletRepository.findByUserId(userId).orElseGet(() -> {
            UserWallet created = new UserWallet();
            created.setUserId(userId);
            created.setCoins(0);
            created.setPoints(0);
            return created;
        });

        wallet.setCoins(coins);
        wallet.setPoints(points);

        return userWalletRepository.save(wallet);
    }

    @Transactional
    public UserWallet getOrCreateByUserId(Long userId) {
        validateUserExists(userId);

        return userWalletRepository.findByUserId(userId).orElseGet(() -> {
            UserWallet wallet = new UserWallet();
            wallet.setUserId(userId);
            wallet.setCoins(0);
            wallet.setPoints(0);
            return userWalletRepository.save(wallet);
        });
    }

    private void validateUserExists(Long userId) {
        if (userId == null || !userRepository.existsById(userId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "User not found: " + userId);
        }
    }

    private void ensureNonNegative(int coins, int points) {
        if (coins < 0 || points < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Coins and points must be non-negative");
        }
    }
}