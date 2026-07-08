-- KitPlatform 077: KIT Enterprise Platform Kernel — Phase 6 Workflow + Integration + AI (final)
-- Depends on: 076_kit_event_audit_notify.sql
-- Pilot-safe: kit_workflow + kit_integration + kit_ai tables + system seeds.
-- Completes Excel 82 kernel table target.

-- =============================================================================
-- DOMAIN: Workflow (6 tables)
-- =============================================================================

CREATE TABLE IF NOT EXISTS kit_workflow.workflow_definition (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id        UUID         REFERENCES public.tenants(id),
    workspace_id     UUID         REFERENCES kit_workspace.workspace_workspace(id),
    workflow_code    VARCHAR(80)  NOT NULL,
    workflow_name    VARCHAR(255) NOT NULL,
    entity_type      VARCHAR(50)  NOT NULL,
    description      TEXT,
    version_no       INT          NOT NULL DEFAULT 1,
    is_system        BOOLEAN      NOT NULL DEFAULT FALSE,
    settings         JSONB        NOT NULL DEFAULT '{}'::jsonb,
    status           SMALLINT     NOT NULL DEFAULT 1,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_workflow_definition_code
    ON kit_workflow.workflow_definition (
        COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid),
        workflow_code,
        version_no
    )
    WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_workflow_definition_row_version ON kit_workflow.workflow_definition;
CREATE TRIGGER trg_workflow_definition_row_version
    BEFORE UPDATE ON kit_workflow.workflow_definition
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS kit_workflow.workflow_step (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id        UUID         REFERENCES public.tenants(id),
    workflow_id      UUID         NOT NULL REFERENCES kit_workflow.workflow_definition(id),
    step_code        VARCHAR(80)  NOT NULL,
    step_name        VARCHAR(255) NOT NULL,
    step_type        VARCHAR(30)  NOT NULL DEFAULT 'approval',
    assignee_type    VARCHAR(30)  NOT NULL DEFAULT 'role',
    assignee_ref     VARCHAR(100),
    sort_order       INT          NOT NULL DEFAULT 0,
    settings         JSONB        NOT NULL DEFAULT '{}'::jsonb,
    status           SMALLINT     NOT NULL DEFAULT 1,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT ck_workflow_step_type CHECK (
        step_type IN ('start', 'approval', 'task', 'gateway', 'end')
    ),
    CONSTRAINT uq_workflow_step_code UNIQUE (workflow_id, step_code)
);

DROP TRIGGER IF EXISTS trg_workflow_step_row_version ON kit_workflow.workflow_step;
CREATE TRIGGER trg_workflow_step_row_version
    BEFORE UPDATE ON kit_workflow.workflow_step
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS kit_workflow.workflow_transition (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id        UUID         REFERENCES public.tenants(id),
    workflow_id      UUID         NOT NULL REFERENCES kit_workflow.workflow_definition(id),
    from_step_id     UUID         NOT NULL REFERENCES kit_workflow.workflow_step(id),
    to_step_id       UUID         NOT NULL REFERENCES kit_workflow.workflow_step(id),
    transition_code  VARCHAR(80)  NOT NULL,
    transition_name  VARCHAR(255) NOT NULL,
    condition_expr   TEXT,
    sort_order       INT          NOT NULL DEFAULT 0,
    status           SMALLINT     NOT NULL DEFAULT 1,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT uq_workflow_transition_code UNIQUE (workflow_id, transition_code)
);

DROP TRIGGER IF EXISTS trg_workflow_transition_row_version ON kit_workflow.workflow_transition;
CREATE TRIGGER trg_workflow_transition_row_version
    BEFORE UPDATE ON kit_workflow.workflow_transition
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS kit_workflow.workflow_instance (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id        UUID         NOT NULL REFERENCES public.tenants(id),
    workspace_id     UUID         REFERENCES kit_workspace.workspace_workspace(id),
    workflow_id      UUID         NOT NULL REFERENCES kit_workflow.workflow_definition(id),
    entity_type      VARCHAR(50)  NOT NULL,
    entity_id        UUID         NOT NULL,
    current_step_id  UUID         REFERENCES kit_workflow.workflow_step(id),
    started_by       UUID         REFERENCES public.users(id),
    started_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    completed_at     TIMESTAMPTZ,
    instance_status  VARCHAR(30)  NOT NULL DEFAULT 'running',
    metadata         JSONB        NOT NULL DEFAULT '{}'::jsonb,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT ck_workflow_instance_status CHECK (
        instance_status IN ('running', 'completed', 'cancelled', 'failed')
    )
);

CREATE INDEX IF NOT EXISTS ix_workflow_instance_entity
    ON kit_workflow.workflow_instance (tenant_id, entity_type, entity_id)
    WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_workflow_instance_row_version ON kit_workflow.workflow_instance;
CREATE TRIGGER trg_workflow_instance_row_version
    BEFORE UPDATE ON kit_workflow.workflow_instance
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS kit_workflow.workflow_task (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id        UUID         NOT NULL REFERENCES public.tenants(id),
    workspace_id     UUID         REFERENCES kit_workspace.workspace_workspace(id),
    instance_id      UUID         NOT NULL REFERENCES kit_workflow.workflow_instance(id),
    step_id          UUID         NOT NULL REFERENCES kit_workflow.workflow_step(id),
    assignee_user_id UUID         REFERENCES public.users(id),
    task_status      VARCHAR(30)  NOT NULL DEFAULT 'pending',
    due_at           TIMESTAMPTZ,
    completed_at     TIMESTAMPTZ,
    decision         VARCHAR(30),
    decision_notes   TEXT,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT ck_workflow_task_status CHECK (
        task_status IN ('pending', 'in_progress', 'completed', 'cancelled', 'skipped')
    )
);

CREATE INDEX IF NOT EXISTS ix_workflow_task_assignee
    ON kit_workflow.workflow_task (tenant_id, assignee_user_id, task_status)
    WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_workflow_task_row_version ON kit_workflow.workflow_task;
CREATE TRIGGER trg_workflow_task_row_version
    BEFORE UPDATE ON kit_workflow.workflow_task
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS kit_workflow.workflow_history (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id        UUID         NOT NULL REFERENCES public.tenants(id),
    instance_id      UUID         NOT NULL REFERENCES kit_workflow.workflow_instance(id),
    task_id          UUID         REFERENCES kit_workflow.workflow_task(id),
    step_id          UUID         REFERENCES kit_workflow.workflow_step(id),
    actor_user_id    UUID         REFERENCES public.users(id),
    action           VARCHAR(50)  NOT NULL,
    from_status      VARCHAR(30),
    to_status        VARCHAR(30),
    notes            TEXT,
    metadata         JSONB        NOT NULL DEFAULT '{}'::jsonb,
    occurred_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_workflow_history_instance
    ON kit_workflow.workflow_history (instance_id, occurred_at DESC);

-- =============================================================================
-- DOMAIN: Integration (3 remaining tables)
-- =============================================================================

CREATE TABLE IF NOT EXISTS kit_integration.integration_connector (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id        UUID         REFERENCES public.tenants(id),
    workspace_id     UUID         REFERENCES kit_workspace.workspace_workspace(id),
    connector_code   VARCHAR(80)  NOT NULL,
    connector_name   VARCHAR(255) NOT NULL,
    connector_type   VARCHAR(30)  NOT NULL,
    provider         VARCHAR(100),
    config           JSONB        NOT NULL DEFAULT '{}'::jsonb,
    credentials_ref  VARCHAR(255),
    is_system        BOOLEAN      NOT NULL DEFAULT FALSE,
    status           SMALLINT     NOT NULL DEFAULT 1,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT ck_integration_connector_type CHECK (
        connector_type IN ('webhook', 'rest', 'graphql', 'file', 'queue', 'cdp', 'erp')
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_integration_connector_code
    ON kit_integration.integration_connector (
        COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid),
        connector_code
    )
    WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_integration_connector_row_version ON kit_integration.integration_connector;
CREATE TRIGGER trg_integration_connector_row_version
    BEFORE UPDATE ON kit_integration.integration_connector
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS kit_integration.integration_api_client (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id        UUID         NOT NULL REFERENCES public.tenants(id),
    workspace_id     UUID         REFERENCES kit_workspace.workspace_workspace(id),
    client_code      VARCHAR(80)  NOT NULL,
    client_name      VARCHAR(255) NOT NULL,
    client_id        VARCHAR(120) NOT NULL,
    client_secret_hash VARCHAR(255) NOT NULL,
    scopes           TEXT[]       NOT NULL DEFAULT '{}',
    rate_limit_per_min INT,
    expires_at       TIMESTAMPTZ,
    last_used_at     TIMESTAMPTZ,
    status           SMALLINT     NOT NULL DEFAULT 1,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT uq_integration_api_client_code UNIQUE (tenant_id, client_code),
    CONSTRAINT uq_integration_api_client_id UNIQUE (tenant_id, client_id)
);

DROP TRIGGER IF EXISTS trg_integration_api_client_row_version ON kit_integration.integration_api_client;
CREATE TRIGGER trg_integration_api_client_row_version
    BEFORE UPDATE ON kit_integration.integration_api_client
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS kit_integration.integration_sync_job (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id        UUID         NOT NULL REFERENCES public.tenants(id),
    workspace_id     UUID         REFERENCES kit_workspace.workspace_workspace(id),
    connector_id     UUID         NOT NULL REFERENCES kit_integration.integration_connector(id),
    job_code         VARCHAR(80)  NOT NULL,
    job_name         VARCHAR(255) NOT NULL,
    sync_direction   VARCHAR(20)  NOT NULL DEFAULT 'outbound',
    schedule_cron    VARCHAR(100),
    last_run_at      TIMESTAMPTZ,
    next_run_at      TIMESTAMPTZ,
    last_status      VARCHAR(30),
    last_error       TEXT,
    settings         JSONB        NOT NULL DEFAULT '{}'::jsonb,
    status           SMALLINT     NOT NULL DEFAULT 1,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT uq_integration_sync_job_code UNIQUE (tenant_id, job_code),
    CONSTRAINT ck_integration_sync_direction CHECK (
        sync_direction IN ('inbound', 'outbound', 'bidirectional')
    )
);

DROP TRIGGER IF EXISTS trg_integration_sync_job_row_version ON kit_integration.integration_sync_job;
CREATE TRIGGER trg_integration_sync_job_row_version
    BEFORE UPDATE ON kit_integration.integration_sync_job
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

-- =============================================================================
-- DOMAIN: AI (5 tables)
-- =============================================================================

CREATE TABLE IF NOT EXISTS kit_ai.ai_agent (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id        UUID         REFERENCES public.tenants(id),
    workspace_id     UUID         REFERENCES kit_workspace.workspace_workspace(id),
    agent_code       VARCHAR(80)  NOT NULL,
    agent_name       VARCHAR(255) NOT NULL,
    agent_type       VARCHAR(30)  NOT NULL DEFAULT 'orchestrator',
    pack_code        VARCHAR(50),
    model_provider   VARCHAR(50),
    model_name       VARCHAR(100),
    settings         JSONB        NOT NULL DEFAULT '{}'::jsonb,
    is_system        BOOLEAN      NOT NULL DEFAULT FALSE,
    status           SMALLINT     NOT NULL DEFAULT 1,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT ck_ai_agent_type CHECK (
        agent_type IN ('orchestrator', 'copilot', 'assistant', 'classifier', 'extractor')
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_ai_agent_code
    ON kit_ai.ai_agent (
        COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid),
        agent_code
    )
    WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_ai_agent_row_version ON kit_ai.ai_agent;
CREATE TRIGGER trg_ai_agent_row_version
    BEFORE UPDATE ON kit_ai.ai_agent
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS kit_ai.ai_prompt (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id        UUID         REFERENCES public.tenants(id),
    workspace_id     UUID         REFERENCES kit_workspace.workspace_workspace(id),
    agent_id         UUID         REFERENCES kit_ai.ai_agent(id),
    prompt_code      VARCHAR(80)  NOT NULL,
    prompt_name      VARCHAR(255) NOT NULL,
    prompt_role      VARCHAR(30)  NOT NULL DEFAULT 'system',
    locale_code      VARCHAR(10)  NOT NULL DEFAULT 'vi-VN',
    prompt_text      TEXT         NOT NULL,
    variables        JSONB        NOT NULL DEFAULT '[]'::jsonb,
    version_no       INT          NOT NULL DEFAULT 1,
    is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
    status           SMALLINT     NOT NULL DEFAULT 1,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT ck_ai_prompt_role CHECK (
        prompt_role IN ('system', 'user', 'assistant', 'tool')
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_ai_prompt_code
    ON kit_ai.ai_prompt (
        COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid),
        prompt_code,
        version_no
    )
    WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_ai_prompt_row_version ON kit_ai.ai_prompt;
CREATE TRIGGER trg_ai_prompt_row_version
    BEFORE UPDATE ON kit_ai.ai_prompt
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS kit_ai.ai_conversation (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id        UUID         NOT NULL REFERENCES public.tenants(id),
    workspace_id     UUID         REFERENCES kit_workspace.workspace_workspace(id),
    agent_id         UUID         NOT NULL REFERENCES kit_ai.ai_agent(id),
    party_id         UUID         REFERENCES kit_common.party_party(id),
    customer_id      UUID         REFERENCES public.customers(id),
    user_id          UUID         REFERENCES public.users(id),
    channel          VARCHAR(30)  NOT NULL DEFAULT 'customer_app',
    session_ref      VARCHAR(120),
    title            VARCHAR(255),
    conversation_status VARCHAR(30) NOT NULL DEFAULT 'active',
    started_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    ended_at         TIMESTAMPTZ,
    metadata         JSONB        NOT NULL DEFAULT '{}'::jsonb,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT ck_ai_conversation_status CHECK (
        conversation_status IN ('active', 'closed', 'archived')
    )
);

CREATE INDEX IF NOT EXISTS ix_ai_conversation_tenant
    ON kit_ai.ai_conversation (tenant_id, started_at DESC)
    WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_ai_conversation_row_version ON kit_ai.ai_conversation;
CREATE TRIGGER trg_ai_conversation_row_version
    BEFORE UPDATE ON kit_ai.ai_conversation
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS kit_ai.ai_memory (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id        UUID         NOT NULL REFERENCES public.tenants(id),
    workspace_id     UUID         REFERENCES kit_workspace.workspace_workspace(id),
    agent_id         UUID         REFERENCES kit_ai.ai_agent(id),
    conversation_id  UUID         REFERENCES kit_ai.ai_conversation(id),
    party_id         UUID         REFERENCES kit_common.party_party(id),
    memory_type      VARCHAR(30)  NOT NULL DEFAULT 'context',
    memory_key       VARCHAR(150) NOT NULL,
    memory_value     JSONB        NOT NULL,
    expires_at       TIMESTAMPTZ,
    status           SMALLINT     NOT NULL DEFAULT 1,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT ck_ai_memory_type CHECK (
        memory_type IN ('context', 'fact', 'preference', 'knowledge', 'embedding_ref')
    )
);

CREATE INDEX IF NOT EXISTS ix_ai_memory_lookup
    ON kit_ai.ai_memory (tenant_id, memory_type, memory_key)
    WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_ai_memory_row_version ON kit_ai.ai_memory;
CREATE TRIGGER trg_ai_memory_row_version
    BEFORE UPDATE ON kit_ai.ai_memory
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS kit_ai.ai_tool (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id        UUID         REFERENCES public.tenants(id),
    workspace_id     UUID         REFERENCES kit_workspace.workspace_workspace(id),
    agent_id         UUID         REFERENCES kit_ai.ai_agent(id),
    tool_code        VARCHAR(80)  NOT NULL,
    tool_name        VARCHAR(255) NOT NULL,
    tool_type        VARCHAR(30)  NOT NULL DEFAULT 'function',
    handler_ref      VARCHAR(255) NOT NULL,
    input_schema     JSONB        NOT NULL DEFAULT '{}'::jsonb,
    output_schema    JSONB        NOT NULL DEFAULT '{}'::jsonb,
    is_enabled       BOOLEAN      NOT NULL DEFAULT TRUE,
    status           SMALLINT     NOT NULL DEFAULT 1,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT ck_ai_tool_type CHECK (
        tool_type IN ('function', 'retrieval', 'workflow', 'api')
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_ai_tool_code
    ON kit_ai.ai_tool (
        COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid),
        tool_code
    )
    WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_ai_tool_row_version ON kit_ai.ai_tool;
CREATE TRIGGER trg_ai_tool_row_version
    BEFORE UPDATE ON kit_ai.ai_tool
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

-- =============================================================================
-- SEED: system workflow — POS discount override approval
-- =============================================================================

INSERT INTO kit_workflow.workflow_definition (
    workflow_code, workflow_name, entity_type, description, version_no, is_system
)
SELECT 'pos_discount_override', 'POS Discount Override Approval', 'sales_order', 'Admin approval when staff discount exceeds policy', 1, TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM kit_workflow.workflow_definition w
    WHERE w.tenant_id IS NULL AND w.workflow_code = 'pos_discount_override' AND w.deleted_at IS NULL
);

INSERT INTO kit_workflow.workflow_step (tenant_id, workflow_id, step_code, step_name, step_type, assignee_type, assignee_ref, sort_order)
SELECT NULL, w.id, s.code, s.name, s.stype, s.atype, s.aref, s.ord
FROM kit_workflow.workflow_definition w
CROSS JOIN (
    VALUES
        ('start', 'Start', 'start', 'system', NULL, 10),
        ('manager_approve', 'Manager Approval', 'approval', 'role', 'ADMIN', 20),
        ('end', 'End', 'end', 'system', NULL, 30)
) AS s(code, name, stype, atype, aref, ord)
WHERE w.workflow_code = 'pos_discount_override' AND w.tenant_id IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM kit_workflow.workflow_step ws
      WHERE ws.workflow_id = w.id AND ws.step_code = s.code
  );

INSERT INTO kit_workflow.workflow_transition (
    tenant_id, workflow_id, from_step_id, to_step_id, transition_code, transition_name, sort_order
)
SELECT NULL, w.id, fs.id, ts.id, t.code, t.name, t.ord
FROM kit_workflow.workflow_definition w
JOIN (
    VALUES
        ('start_to_approve', 'Submit', 'start', 'manager_approve', 10),
        ('approve_to_end', 'Approve', 'manager_approve', 'end', 20)
) AS t(code, name, from_code, to_code, ord) ON TRUE
JOIN kit_workflow.workflow_step fs ON fs.workflow_id = w.id AND fs.step_code = t.from_code
JOIN kit_workflow.workflow_step ts ON ts.workflow_id = w.id AND ts.step_code = t.to_code
WHERE w.workflow_code = 'pos_discount_override' AND w.tenant_id IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM kit_workflow.workflow_transition wt
      WHERE wt.workflow_id = w.id AND wt.transition_code = t.code
  );

-- =============================================================================
-- SEED: integration connector + sync job (CDP outbox)
-- =============================================================================

INSERT INTO kit_integration.integration_connector (
    connector_code, connector_name, connector_type, provider, config, is_system
)
SELECT
    'cdp_webhook_outbox',
    'CDP Webhook Outbox',
    'cdp',
    'IntegrationOutboxWorker',
    '{"source_table":"integration_outbox","legacy":true}'::jsonb,
    TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM kit_integration.integration_connector c
    WHERE c.tenant_id IS NULL AND c.connector_code = 'cdp_webhook_outbox' AND c.deleted_at IS NULL
);

INSERT INTO kit_integration.integration_sync_job (
    tenant_id, connector_id, job_code, job_name, sync_direction, schedule_cron, settings
)
SELECT
    t.id,
    c.id,
    'cdp_outbox_publish',
    'Publish CDP outbox events',
    'outbound',
    '*/5 * * * *',
    '{"worker":"IntegrationOutboxWorker"}'::jsonb
FROM public.tenants t
CROSS JOIN kit_integration.integration_connector c
WHERE c.connector_code = 'cdp_webhook_outbox' AND c.tenant_id IS NULL
  AND t.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM kit_integration.integration_sync_job j
      WHERE j.tenant_id = t.id AND j.job_code = 'cdp_outbox_publish' AND j.deleted_at IS NULL
  );

-- =============================================================================
-- SEED: AI agent + prompts + tools (Novixa health copilot)
-- =============================================================================

INSERT INTO kit_ai.ai_agent (
    agent_code, agent_name, agent_type, pack_code, model_provider, model_name, settings, is_system
)
SELECT
    'novixa_health_copilot',
    'Novixa Health Copilot',
    'orchestrator',
    'novixa_pharmacy',
    'rules',
    'DrugKnowledgeRules',
    '{"orchestrator_class":"AiOrchestrator","policy":"NSF-AI"}'::jsonb,
    TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM kit_ai.ai_agent a
    WHERE a.tenant_id IS NULL AND a.agent_code = 'novixa_health_copilot' AND a.deleted_at IS NULL
);

INSERT INTO kit_ai.ai_prompt (agent_id, prompt_code, prompt_name, prompt_role, prompt_text, variables, version_no)
SELECT
    a.id,
    'health_copilot_system',
    'Health Copilot System Prompt',
    'system',
    'Ban la tro ly suc khoe Novixa. Khong tu van thay bac si. Tra loi ngan, ro rang, dua tren du lieu thuoc da biet.',
    '["customer_context","question"]'::jsonb,
    1
FROM kit_ai.ai_agent a
WHERE a.agent_code = 'novixa_health_copilot' AND a.tenant_id IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM kit_ai.ai_prompt p
      WHERE p.agent_id = a.id AND p.prompt_code = 'health_copilot_system' AND p.deleted_at IS NULL
  );

INSERT INTO kit_ai.ai_tool (agent_id, tool_code, tool_name, tool_type, handler_ref, input_schema)
SELECT
    a.id,
    v.code,
    v.name,
    v.ttype,
    v.handler,
    v.schema::jsonb
FROM kit_ai.ai_agent a
CROSS JOIN (
    VALUES
        ('drug_knowledge_lookup', 'Drug Knowledge Lookup', 'retrieval', 'IDrugKnowledgeQuery', '{"question":"string"}'),
        ('care_context_provider', 'Care Context Provider', 'function', 'IAiCareContextProvider', '{"customer_id":"uuid"}')
) AS v(code, name, ttype, handler, schema)
WHERE a.agent_code = 'novixa_health_copilot' AND a.tenant_id IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM kit_ai.ai_tool t
      WHERE t.agent_id = a.id AND t.tool_code = v.code AND t.deleted_at IS NULL
  );

-- =============================================================================
-- Post-apply: registry + kernel version (82/82 complete)
-- =============================================================================

UPDATE kit_core.kernel_table_registry SET registry_status = 'EXISTS', updated_at = NOW()
WHERE table_name IN (
    'workflow_definition', 'workflow_step', 'workflow_transition',
    'workflow_instance', 'workflow_task', 'workflow_history',
    'integration_connector', 'integration_api_client', 'integration_sync_job',
    'ai_agent', 'ai_prompt', 'ai_conversation', 'ai_memory', 'ai_tool'
);

UPDATE kit_core.platform_kernel_version SET
    kernel_phase = 'P6',
    last_migration = '077_kit_workflow_integration_ai',
    schema_version = 7,
    notes = 'Phase 6 complete: Workflow 6 + Integration 3 + AI 5. Excel 82/82 kernel tables implemented.',
    updated_at = NOW()
WHERE id = 1;
