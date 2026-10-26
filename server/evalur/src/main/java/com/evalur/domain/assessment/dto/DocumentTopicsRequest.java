package com.evalur.domain.assessment.dto;

import java.util.List;

public record DocumentTopicsRequest(
    List<String> documentIds
) {}

