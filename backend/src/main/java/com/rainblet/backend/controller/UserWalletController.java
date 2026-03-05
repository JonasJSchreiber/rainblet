package com.rainblet.backend.controller;

import com.rainblet.backend.dto.UserWalletRequest;
import com.rainblet.backend.dto.UserWalletResponse;
import com.rainblet.backend.entity.UserWallet;
import com.rainblet.backend.service.UserWalletService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
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
@RequestMapping("/api/user-wallets")
public class UserWalletController {

    private final UserWalletService userWalletService;

    public UserWalletController(UserWalletService userWalletService) {
        this.userWalletService = userWalletService;
    }

    @GetMapping
    public List<UserWallet> list() {
        return userWalletService.list();
    }

    @GetMapping("/{id}")
    public UserWallet getById(@PathVariable Long id) {
        return userWalletService.getById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserWallet create(@Valid @RequestBody UserWalletRequest request) {
        if (request.getUserId() == null || request.getCoins() == null || request.getPoints() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "userId, coins and points are required");
        }

        UserWallet wallet = new UserWallet();
        wallet.setUserId(request.getUserId());
        wallet.setCoins(request.getCoins());
        wallet.setPoints(request.getPoints());
        return userWalletService.create(wallet);
    }

    @PutMapping("/{id}")
    public UserWallet update(@PathVariable Long id, @Valid @RequestBody UserWalletRequest request) {
        if (request.getCoins() == null || request.getPoints() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "coins and points are required");
        }

        UserWallet wallet = new UserWallet();
        wallet.setUserId(request.getUserId());
        wallet.setCoins(request.getCoins());
        wallet.setPoints(request.getPoints());

        return userWalletService.update(id, wallet);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        userWalletService.delete(id);
    }

    static UserWalletResponse toResponse(UserWallet wallet) {
        return new UserWalletResponse(wallet.getUserId(), wallet.getCoins(), wallet.getPoints());
    }
}