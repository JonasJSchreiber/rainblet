package com.rainblet.backend.config;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rainblet.backend.service.UserActivityService;
import io.jsonwebtoken.Claims;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Collections;
import java.util.Enumeration;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.lang.Nullable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class RequestLoggingInterceptor implements HandlerInterceptor {

    private static final String GREEN_CIRCLE = "\uD83D\uDFE2";
    private static final Logger log = LoggerFactory.getLogger(RequestLoggingInterceptor.class);
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private static final int RESPONSE_BODY_MAX_LENGTH = 2000;
    private static final String START_TIME_ATTRIBUTE = RequestLoggingInterceptor.class.getName() + ".startTimeNanos";
    private static final Set<String> SENSITIVE_HEADERS = Set.of(
            "authorization",
            "cookie",
            "set-cookie",
            "proxy-authorization",
            "x-api-key"
    );

    private final UserActivityService userActivityService;

    public RequestLoggingInterceptor(UserActivityService userActivityService) {
        this.userActivityService = userActivityService;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        request.setAttribute(START_TIME_ATTRIBUTE, System.nanoTime());
        String principalEmail = resolvePrincipalEmail();

        if (principalEmail != null) {
            log.info(
                    "{} {}: {} {}, headers: {}, principalEmail: {}",
                    GREEN_CIRCLE,
                    request.getMethod(),
                    request.getRequestURI(),
                    request.getQueryString() == null ? "" : request.getQueryString(),
                    headersToJson(request),
                    principalEmail
            );
        } else {
            log.info(
                    "{} {}: {} {}, headers: {}",
                    GREEN_CIRCLE,
                    request.getMethod(),
                    request.getRequestURI(),
                    request.getQueryString() == null ? "" : request.getQueryString(),
                    headersToJson(request)
            );
        }

        return true;
    }

    @Override
    public void afterCompletion(
            HttpServletRequest request,
            HttpServletResponse response,
            Object handler,
            @Nullable Exception ex
    ) {
        long durationMs = durationMillis(request);
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String responseBody = truncateResponseBody(request.getAttribute(ResponseBodyCaptureAdvice.RESPONSE_BODY_ATTRIBUTE));

        if (ex != null) {
            log.error(
                    "{} {}: {} status={} durationMs={} error={}",
                    GREEN_CIRCLE,
                    request.getMethod(),
                    request.getRequestURI(),
                    response.getStatus(),
                    durationMs,
                    ex.getClass().getSimpleName(),
                    ex
            );
            userActivityService.record(request, authentication, responseBody);
            return;
        }

        log.info(
                "{} {}: {} status={} durationMs={}",
                GREEN_CIRCLE,
                request.getMethod(),
                request.getRequestURI(),
                response.getStatus(),
                durationMs
        );

        userActivityService.record(request, authentication, responseBody);
    }

    @Nullable
    private String truncateResponseBody(@Nullable Object responseBodyAttribute) {
        if (!(responseBodyAttribute instanceof String responseBody) || !StringUtils.hasText(responseBody)) {
            return null;
        }

        if (responseBody.length() <= RESPONSE_BODY_MAX_LENGTH) {
            return responseBody;
        }

        return responseBody.substring(0, RESPONSE_BODY_MAX_LENGTH);
    }

    private String headersToJson(HttpServletRequest request) {
        try {
            return OBJECT_MAPPER.writeValueAsString(extractHeaders(request));
        } catch (JsonProcessingException e) {
            log.warn("Unable to serialize request headers to JSON", e);
            return "{}";
        }
    }

    private Map<String, String> extractHeaders(HttpServletRequest request) {
        Enumeration<String> headerNames = request.getHeaderNames();
        if (headerNames == null) {
            return Collections.emptyMap();
        }

        Map<String, String> headers = new LinkedHashMap<>();
        while (headerNames.hasMoreElements()) {
            String headerName = headerNames.nextElement();
            String headerValue = request.getHeader(headerName);
            headers.put(headerName, maskIfSensitive(headerName, headerValue));
        }
        return headers;
    }

    private String maskIfSensitive(String headerName, @Nullable String headerValue) {
        if (headerValue == null) {
            return "";
        }
        if (SENSITIVE_HEADERS.contains(headerName.toLowerCase(Locale.ROOT))) {
            return "***";
        }
        return headerValue;
    }

    @Nullable
    private String resolvePrincipalEmail() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }

        Object details = authentication.getDetails();
        if (details instanceof Claims claims) {
            Object emailClaim = claims.get("email");
            if (emailClaim != null) {
                String email = String.valueOf(emailClaim).trim();
                if (StringUtils.hasText(email)) {
                    return email;
                }
            }
        }

        Object principal = authentication.getPrincipal();
        if (principal != null) {
            String principalValue = String.valueOf(principal).trim();
            if (StringUtils.hasText(principalValue) && !"anonymousUser".equalsIgnoreCase(principalValue)) {
                return principalValue;
            }
        }

        String name = authentication.getName();
        if (StringUtils.hasText(name) && !"anonymousUser".equalsIgnoreCase(name.trim())) {
            return name.trim();
        }
        return null;
    }

    private long durationMillis(HttpServletRequest request) {
        Object startTime = request.getAttribute(START_TIME_ATTRIBUTE);
        if (startTime instanceof Long nanos) {
            return (System.nanoTime() - nanos) / 1_000_000;
        }
        return -1L;
    }
}

