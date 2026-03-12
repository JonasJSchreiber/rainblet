package com.rainblet.backend.config;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.MethodParameter;
import org.springframework.core.io.InputStreamSource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

@ControllerAdvice
public class ResponseBodyCaptureAdvice implements ResponseBodyAdvice<Object> {

    public static final String RESPONSE_BODY_ATTRIBUTE = ResponseBodyCaptureAdvice.class.getName() + ".responseBody";

    private static final Logger log = LoggerFactory.getLogger(ResponseBodyCaptureAdvice.class);
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private static final Set<String> SENSITIVE_KEYS = Set.of(
            "token",
            "accesstoken",
            "refreshtoken",
            "password"
    );

    @Override
    public boolean supports(MethodParameter returnType, Class<? extends HttpMessageConverter<?>> converterType) {
        return true;
    }

    @Override
    public Object beforeBodyWrite(
            Object body,
            MethodParameter returnType,
            MediaType selectedContentType,
            Class<? extends HttpMessageConverter<?>> selectedConverterType,
            ServerHttpRequest request,
            ServerHttpResponse response
    ) {
        if (!(request instanceof ServletServerHttpRequest servletRequest)) {
            return body;
        }

        HttpServletRequest httpServletRequest = servletRequest.getServletRequest();
        if (!httpServletRequest.getRequestURI().startsWith("/api/")) {
            return body;
        }

        if (!isCapturable(body, selectedContentType)) {
            return body;
        }

        String serialized = serialize(body);
        if (serialized == null) {
            return body;
        }

        httpServletRequest.setAttribute(RESPONSE_BODY_ATTRIBUTE, redactSensitiveValues(serialized));
        return body;
    }

    private boolean isCapturable(Object body, MediaType contentType) {
        if (body == null) {
            return false;
        }
        if (body instanceof byte[] || body instanceof Resource || body instanceof InputStreamSource
                || body instanceof StreamingResponseBody) {
            return false;
        }

        if (contentType == null) {
            return body instanceof String || body instanceof CharSequence;
        }

        if (MediaType.APPLICATION_JSON.includes(contentType)) {
            return true;
        }

        if ("application".equalsIgnoreCase(contentType.getType())
                && contentType.getSubtype() != null
                && contentType.getSubtype().toLowerCase(Locale.ROOT).contains("+json")) {
            return true;
        }

        return "text".equalsIgnoreCase(contentType.getType());
    }

    private String serialize(Object body) {
        if (body instanceof String value) {
            return value;
        }

        try {
            return OBJECT_MAPPER.writeValueAsString(body);
        } catch (JsonProcessingException ex) {
            log.debug("Unable to serialize response body for activity capture", ex);
            return null;
        }
    }

    private String redactSensitiveValues(String value) {
        try {
            JsonNode root = OBJECT_MAPPER.readTree(value.getBytes(StandardCharsets.UTF_8));
            redactNode(root);
            return OBJECT_MAPPER.writeValueAsString(root);
        } catch (Exception ex) {
            return value;
        }
    }

    private void redactNode(JsonNode node) {
        if (node instanceof ObjectNode objectNode) {
            objectNode.fieldNames().forEachRemaining(fieldName -> {
                JsonNode child = objectNode.get(fieldName);
                if (SENSITIVE_KEYS.contains(fieldName.toLowerCase(Locale.ROOT))) {
                    objectNode.put(fieldName, "***");
                    return;
                }
                redactNode(child);
            });
            return;
        }

        if (node instanceof ArrayNode arrayNode) {
            for (JsonNode child : arrayNode) {
                redactNode(child);
            }
        }
    }
}
