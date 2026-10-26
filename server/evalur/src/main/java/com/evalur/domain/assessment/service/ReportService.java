package com.evalur.domain.assessment.service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Map;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import com.evalur.domain.assessment.entity.AssessmentEvaluation;
import com.evalur.domain.assessment.entity.UserAssessment;
import com.evalur.domain.assessment.repository.AssessmentEvaluationRepository;
import com.evalur.domain.user.entity.User;
import com.evalur.domain.user.repository.UserRepository;
import com.evalur.exceptions.ResourceNotFoundException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.kernel.pdf.canvas.draw.SolidLine;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.LineSeparator;
import com.itextpdf.layout.element.Paragraph;


@Service
public class ReportService {

    private final AssessmentEvaluationRepository evaluationRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    public ReportService(
            AssessmentEvaluationRepository evaluationRepository,
            UserRepository userRepository,
            ObjectMapper objectMapper) {
        this.evaluationRepository = evaluationRepository;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
    }

    public byte[] generateAssessmentPdf(Long evaluationId, Long callerOrgId) throws IOException {
        AssessmentEvaluation eval = evaluationRepository.findById(evaluationId)
                .orElseThrow(() -> new ResourceNotFoundException("AssessmentEvaluation", "id", evaluationId));

        if (callerOrgId != null) {
            UserAssessment ua = eval.getUserAssessment();
            if (ua == null || ua.getAssessment() == null || ua.getAssessment().getOrganization() == null
                    || !ua.getAssessment().getOrganization().getId().equals(callerOrgId)) {
                throw new AccessDeniedException("Organization does not own this evaluation report.");
            }
        }

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        PdfWriter writer = new PdfWriter(out);
        PdfDocument pdf = new PdfDocument(writer);
        Document document = new Document(pdf);

        // Fetch the User entity using the userId from UserAssessment
        User candidate = null;
        if (eval.getUserAssessment() != null && eval.getUserAssessment().getUserId() != null) {
            candidate = userRepository.findById(eval.getUserAssessment().getUserId()).orElse(null);
        }
        String candidateName = (candidate != null) ? candidate.getName() : "Unknown Candidate";

        // Header
        document.add(new Paragraph("Evalur Technical Assessment Report").setBold().setFontSize(22));
        
        // Candidate Info
        document.add(new Paragraph("Candidate: " + candidateName));
        String assessmentTitle = (eval.getUserAssessment() != null && eval.getUserAssessment().getAssessment() != null)
                ? eval.getUserAssessment().getAssessment().getTitle()
                : "Unknown Assessment";
        document.add(new Paragraph("Assessment: " + assessmentTitle));
        document.add(new Paragraph("Objective Score: " + eval.getObjectiveScore() + "%").setBold());
        
        document.add(new LineSeparator(new SolidLine()));

        // Logic DNA Section
        if (eval.getLogicDna() != null) {
            document.add(new Paragraph("\nLOGIC DNA TRAJECTORY").setBold());
            try {
                Map<String, Integer> metrics = objectMapper.readValue(eval.getLogicDna(), Map.class);
                metrics.forEach((trait, score) -> {
                    document.add(new Paragraph(trait + ": " + score + " / 10"));
                });
            } catch (Exception e) {
                document.add(new Paragraph("DNA metrics data is currently being processed."));
            }
        }

        // AI Feedback Section
        document.add(new Paragraph("\nAI LOGIC CONSULTANT FEEDBACK").setBold());
        document.add(new Paragraph(eval.getAiLogicFeedback() != null ? eval.getAiLogicFeedback() : "No feedback available."));

        document.close();
        return out.toByteArray();
    }

    public byte[] generateAssessmentPdf(Long evaluationId) throws IOException {
        return generateAssessmentPdf(evaluationId, null);
    }
}
