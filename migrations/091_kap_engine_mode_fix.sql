-- KitPlatform 091: KAP engine_mode + analysis trigger alignment with pipeline v3
ALTER TABLE assessment_report_artifact DROP CONSTRAINT IF EXISTS ck_assessment_report_artifact_engine;
ALTER TABLE assessment_report_artifact ADD CONSTRAINT ck_assessment_report_artifact_engine CHECK (
    engine_mode IN ('deterministic', 'hybrid', 'ai_full', 'ai_enriched', 'personalized')
);

ALTER TABLE assessment_analysis_run DROP CONSTRAINT IF EXISTS ck_assessment_analysis_run_trigger;
ALTER TABLE assessment_analysis_run ADD CONSTRAINT ck_assessment_analysis_run_trigger CHECK (
    trigger_event IN ('complete', 'lead_captured', 'manual_refresh', 'scheduled', 'report_requested')
);
