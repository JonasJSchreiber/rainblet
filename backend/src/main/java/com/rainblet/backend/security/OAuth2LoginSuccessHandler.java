package com.rainblet.backend.security;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

@Component
public class OAuth2LoginSuccessHandler implements AuthenticationSuccessHandler {

    private final JwtService jwtService;
    private final String successRedirect;

    public OAuth2LoginSuccessHandler(
            JwtService jwtService,
            @Value("${app.auth.oauth2-success-redirect:http://localhost:4200}") String successRedirect
    ) {
        this.jwtService = jwtService;
        this.successRedirect = successRedirect;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication)
            throws IOException, ServletException {

        OAuth2User oauthUser = (OAuth2User) authentication.getPrincipal();
        String email = getAttribute(oauthUser, "email", authentication.getName());
        String name = getAttribute(oauthUser, "name", email);

        String token = jwtService.generateToken(
                email,
                Map.of("name", name, "email", email)
        );

        String redirectUrl = successRedirect
                + "?token=" + URLEncoder.encode(token, StandardCharsets.UTF_8)
                + "&name=" + URLEncoder.encode(name, StandardCharsets.UTF_8);

        response.sendRedirect(redirectUrl);
    }

    private String getAttribute(OAuth2User user, String key, String fallback) {
        Object value = user.getAttributes().get(key);
        return value == null ? fallback : String.valueOf(value);
    }
}
