package com.rainblet.backend.config;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class RequestLoggingInterceptor implements HandlerInterceptor {

    private static final String GREEN_CIRCLE = "\uD83D\uDFE2";
    private static final Logger log = LoggerFactory.getLogger(RequestLoggingInterceptor.class);
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private static final String START_TIME_ATTRIBUTE = RequestLoggingInterceptor.class.getName() + ".startTimeNanos";
    private static final Set<String> SENSITIVE_HEADERS = Set.of(
            "authorization",
            "cookie",
            "set-cookie",
            "proxy-authorization",
            "x-api-key"
    );

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        request.setAttribute(START_TIME_ATTRIBUTE, System.nanoTime());

        log.info(
                "{} {}: {} {}, headers: {}",
                GREEN_CIRCLE,
                request.getMethod(),
                request.getRequestURI(),
                request.getQueryString() == null ? "" : request.getQueryString(),
                headersToJson(request)
        );

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

    private long durationMillis(HttpServletRequest request) {
        Object startTime = request.getAttribute(START_TIME_ATTRIBUTE);
        if (startTime instanceof Long nanos) {
            return (System.nanoTime() - nanos) / 1_000_000;
        }
        return -1L;
    }
}
