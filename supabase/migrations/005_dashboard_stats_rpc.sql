-- Postgres RPC function for dashboard stats
-- Replaces Python-side bucketing with a single DB round trip

CREATE OR REPLACE FUNCTION dashboard_stats(
    p_org_id UUID DEFAULT NULL,
    p_user_role TEXT DEFAULT 'user',
    p_user_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    WITH filtered AS (
        SELECT overall_score
        FROM analyses
        WHERE status = 'complete'
          AND overall_score IS NOT NULL
          AND (
            p_user_role = 'admin'
            OR (p_user_role = 'manager' AND org_id = p_org_id)
            OR (org_id = p_org_id AND (created_by = p_user_id OR created_by IS NULL))
          )
    ),
    stats AS (
        SELECT
            COUNT(*)::INT AS total_calls,
            COALESCE(ROUND(AVG(overall_score))::INT, 0) AS avg_score,
            COUNT(*) FILTER (WHERE overall_score < 60)::INT AS below_60
        FROM filtered
    ),
    buckets AS (
        SELECT
            jsonb_build_array(
                jsonb_build_object('range', '0-39', 'count', COUNT(*) FILTER (WHERE overall_score < 40)),
                jsonb_build_object('range', '40-59', 'count', COUNT(*) FILTER (WHERE overall_score >= 40 AND overall_score < 60)),
                jsonb_build_object('range', '60-74', 'count', COUNT(*) FILTER (WHERE overall_score >= 60 AND overall_score < 75)),
                jsonb_build_object('range', '75-89', 'count', COUNT(*) FILTER (WHERE overall_score >= 75 AND overall_score < 90)),
                jsonb_build_object('range', '90-100', 'count', COUNT(*) FILTER (WHERE overall_score >= 90))
            ) AS distribution
        FROM filtered
    )
    SELECT json_build_object(
        'total_calls', s.total_calls,
        'avg_score', s.avg_score,
        'below_60', s.below_60,
        'score_distribution', b.distribution
    )
    INTO result
    FROM stats s, buckets b;

    RETURN result;
END;
$$;
