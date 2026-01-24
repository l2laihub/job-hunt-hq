-- Fix MTAC Documentation Project ID
-- The documentation was stored with a hardcoded ID but needs to match the actual project ID in active_projects

DO $$
DECLARE
  v_user_id uuid := '2a37edd5-f768-4b25-b2c9-e25909889ebb'::uuid;
  v_profile_id uuid := 'efdd281e-3c4a-4452-9534-1ba4b6a16b08'::uuid;
  v_actual_project_id text;
BEGIN
  -- Get the actual project ID from the active_projects array
  SELECT elem->>'id' INTO v_actual_project_id
  FROM profiles, jsonb_array_elements(profiles.active_projects) elem
  WHERE profiles.id = v_profile_id
  AND profiles.user_id = v_user_id
  AND elem->>'name' = 'MTAC Intelligence Copilot';

  IF v_actual_project_id IS NULL THEN
    RAISE NOTICE 'MTAC project not found in active_projects';
    RETURN;
  END IF;

  RAISE NOTICE 'Found actual project ID: %', v_actual_project_id;

  -- Update the documentation record to use the correct project_id
  UPDATE project_documentation
  SET project_id = v_actual_project_id
  WHERE user_id = v_user_id
  AND project_id = 'mtac-intelligence-copilot';

  IF NOT FOUND THEN
    -- If no record with hardcoded ID, check if one already exists with correct ID
    IF EXISTS (SELECT 1 FROM project_documentation WHERE user_id = v_user_id AND project_id = v_actual_project_id) THEN
      RAISE NOTICE 'Documentation already exists with correct project_id';
    ELSE
      RAISE NOTICE 'No documentation record found to update';
    END IF;
  ELSE
    RAISE NOTICE 'Updated documentation project_id to: %', v_actual_project_id;
  END IF;
END $$;
