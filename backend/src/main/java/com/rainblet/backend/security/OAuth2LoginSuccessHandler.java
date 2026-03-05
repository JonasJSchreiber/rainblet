package com.rainblet.backend.security;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
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

        String subject = getAttribute(oauthUser, "sub", authentication.getName());
        String email = getAttribute(oauthUser, "email", authentication.getName());
        String name = getAttribute(oauthUser, "name", email);
        String givenName = getAttribute(oauthUser, "given_name", "");
        String familyName = getAttribute(oauthUser, "family_name", "");
        String picture = getAttribute(oauthUser, "picture", "");
        String locale = getAttribute(oauthUser, "locale", "");
        boolean emailVerified = getBooleanAttribute(oauthUser, "email_verified", false);

        Map<String, Object> claims = new HashMap<>();
        claims.put("provider", "google");
        claims.put("sub", subject);
        claims.put("email", email);
        claims.put("name", name);
        claims.put("given_name", givenName);
        claims.put("family_name", familyName);
        claims.put("picture", picture);
        claims.put("locale", locale);
        claims.put("email_verified", emailVerified);

        String token = jwtService.generateToken(email, claims);

        String redirectUrl = successRedirect
                + "?token=" + URLEncoder.encode(token, StandardCharsets.UTF_8)
                + "&name=" + URLEncoder.encode(name, StandardCharsets.UTF_8)
                + "&email=" + URLEncoder.encode(email, StandardCharsets.UTF_8)
                + "&picture=" + URLEncoder.encode(picture, StandardCharsets.UTF_8)
                + "&provider=" + URLEncoder.encode("google", StandardCharsets.UTF_8);

        response.sendRedirect(redirectUrl);
    }

    private String getAttribute(OAuth2User user, String key, String fallback) {
        Object value = user.getAttributes().get(key);
        return value == null ? fallback : String.valueOf(value);
    }

    private boolean getBooleanAttribute(OAuth2User user, String key, boolean fallback) {
        Object value = user.getAttributes().get(key);
        if (value instanceof Boolean boolValue) {
            return boolValue;
        }
        if (value instanceof String stringValue) {
            return Boolean.parseBoolean(stringValue);
        }
        return fallback;
    }
}
