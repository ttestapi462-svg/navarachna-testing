-- ==============================================================================
-- Navarachna Designer Studio: Remove EmployeeCode & Designation and Add SPs
-- Target: public."Employees" & Stored Procedures
-- ==============================================================================

START TRANSACTION;

-- 1. Drop EmployeeCode and Designation columns if they exist
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'Employees' 
          AND column_name = 'EmployeeCode'
    ) THEN
        ALTER TABLE public."Employees" DROP COLUMN "EmployeeCode";
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'Employees' 
          AND column_name = 'Designation'
    ) THEN
        ALTER TABLE public."Employees" DROP COLUMN "Designation";
    END IF;
END $$;

-- 2. Drop legacy index and sequence
DROP INDEX IF EXISTS public."IX_Employees_EmployeeCode";
DROP SEQUENCE IF EXISTS public.employee_code_seq;

-- 3. Ensure indexing for performance
CREATE INDEX IF NOT EXISTS "IX_Employees_Department" ON public."Employees" ("Department");
CREATE INDEX IF NOT EXISTS "IX_Employees_Mobile" ON public."Employees" ("Mobile");
CREATE INDEX IF NOT EXISTS "IX_Employees_IsActive" ON public."Employees" ("IsActive");

COMMIT;

-- ==============================================================================
-- STORED PROCEDURE 1: sp_employees_get
-- Returns paginated employee list with search and department filtering
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.sp_employees_get(
    p_search TEXT DEFAULT NULL,
    p_department TEXT DEFAULT NULL,
    p_page INTEGER DEFAULT 1,
    p_page_size INTEGER DEFAULT 10,
    p_is_active BOOLEAN DEFAULT TRUE
)
RETURNS jsonb
LANGUAGE plpgsql
AS $function$
DECLARE
    v_page INTEGER := GREATEST(COALESCE(p_page, 1), 1);
    v_page_size INTEGER := LEAST(GREATEST(COALESCE(p_page_size, 10), 1), 100);
    v_offset INTEGER := (v_page - 1) * v_page_size;
    v_total_count BIGINT := 0;
    v_total_pages INTEGER := 0;
    v_items JSONB := '[]'::jsonb;
    v_search TEXT := NULLIF(TRIM(p_search), '');
    v_dept_arr TEXT[] := NULL;
BEGIN
    IF p_department IS NOT NULL AND TRIM(p_department) <> '' THEN
        v_dept_arr := string_to_array(TRIM(p_department), ',');
        FOR i IN 1 .. array_length(v_dept_arr, 1) LOOP
            v_dept_arr[i] := TRIM(v_dept_arr[i]);
        END LOOP;
    END IF;

    -- Count total records matching criteria
    SELECT COUNT(*) INTO v_total_count
    FROM public."Employees" e
    WHERE (p_is_active IS NULL OR e."IsActive" = p_is_active)
      AND (
          v_dept_arr IS NULL 
          OR e."Department" = ANY(v_dept_arr)
      )
      AND (
          v_search IS NULL
          OR e."FirstName" ILIKE '%' || v_search || '%'
          OR (e."LastName" IS NOT NULL AND e."LastName" ILIKE '%' || v_search || '%')
          OR e."Email" ILIKE '%' || v_search || '%'
          OR e."Mobile" ILIKE '%' || v_search || '%'
      );

    v_total_pages := CEIL(v_total_count::numeric / v_page_size)::integer;

    -- Retrieve paginated items formatted as jsonb
    SELECT COALESCE(jsonb_agg(emp_row), '[]'::jsonb) INTO v_items
    FROM (
        SELECT jsonb_build_object(
            'id', e."Id",
            'firstName', e."FirstName",
            'lastName', e."LastName",
            'email', e."Email",
            'mobile', e."Mobile",
            'panMasked', CASE 
                WHEN e."PanNumber" IS NOT NULL AND length(e."PanNumber") = 10 
                THEN substring(e."PanNumber" from 1 for 5) || '****' || substring(e."PanNumber" from 10 for 1) 
                ELSE NULL 
            END,
            'aadhaarMasked', CASE 
                WHEN e."AadhaarLast4" IS NOT NULL 
                THEN 'XXXX XXXX ' || e."AadhaarLast4" 
                ELSE NULL 
            END,
            'department', e."Department",
            'salary', e."Salary",
            'dateOfJoining', to_char(e."DateOfJoining", 'YYYY-MM-DD'),
            'isActive', e."IsActive",
            'createdAt', e."CreatedAt",
            'version', e.xmin::text::bigint,
            'documents', COALESCE((
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', d."Id",
                        'documentType', d."DocumentType",
                        'fileName', d."OriginalFileName",
                        'contentType', d."ContentType",
                        'sizeBytes', d."SizeBytes",
                        'uploadedAt', d."UploadedAt"
                    ) ORDER BY d."UploadedAt" DESC
                )
                FROM public."EmployeeDocuments" d
                WHERE d."EmployeeId" = e."Id"
            ), '[]'::jsonb)
        ) AS emp_row
        FROM public."Employees" e
        WHERE (p_is_active IS NULL OR e."IsActive" = p_is_active)
          AND (
              v_dept_arr IS NULL 
              OR e."Department" = ANY(v_dept_arr)
          )
          AND (
              v_search IS NULL
              OR e."FirstName" ILIKE '%' || v_search || '%'
              OR (e."LastName" IS NOT NULL AND e."LastName" ILIKE '%' || v_search || '%')
              OR e."Email" ILIKE '%' || v_search || '%'
              OR e."Mobile" ILIKE '%' || v_search || '%'
          )
        ORDER BY e."Id" ASC
        LIMIT v_page_size
        OFFSET v_offset
    ) sub;

    RETURN jsonb_build_object(
        'items', v_items,
        'page', v_page,
        'pageSize', v_page_size,
        'totalCount', v_total_count,
        'totalPages', v_total_pages
    );
END;
$function$;


-- ==============================================================================
-- STORED PROCEDURE 2: sp_employee_get_by_id
-- Returns single employee record by ID with associated documents
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.sp_employee_get_by_id(
    p_id INTEGER
)
RETURNS jsonb
LANGUAGE plpgsql
AS $function$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', e."Id",
        'firstName', e."FirstName",
        'lastName', e."LastName",
        'email', e."Email",
        'mobile', e."Mobile",
        'panMasked', CASE 
            WHEN e."PanNumber" IS NOT NULL AND length(e."PanNumber") = 10 
            THEN substring(e."PanNumber" from 1 for 5) || '****' || substring(e."PanNumber" from 10 for 1) 
            ELSE NULL 
        END,
        'aadhaarMasked', CASE 
            WHEN e."AadhaarLast4" IS NOT NULL 
            THEN 'XXXX XXXX ' || e."AadhaarLast4" 
            ELSE NULL 
        END,
        'department', e."Department",
        'salary', e."Salary",
        'dateOfJoining', to_char(e."DateOfJoining", 'YYYY-MM-DD'),
        'isActive', e."IsActive",
        'createdAt', e."CreatedAt",
        'version', e.xmin::text::bigint,
        'documents', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', d."Id",
                    'documentType', d."DocumentType",
                    'fileName', d."OriginalFileName",
                    'contentType', d."ContentType",
                    'sizeBytes', d."SizeBytes",
                    'uploadedAt', d."UploadedAt"
                ) ORDER BY d."UploadedAt" DESC
            )
            FROM public."EmployeeDocuments" d
            WHERE d."EmployeeId" = e."Id"
        ), '[]'::jsonb)
    ) INTO v_result
    FROM public."Employees" e
    WHERE e."Id" = p_id;

    RETURN v_result;
END;
$function$;


-- ==============================================================================
-- STORED PROCEDURE 3: sp_employee_create
-- Creates an employee without employeeCode and designation
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.sp_employee_create(
    p_first_name TEXT,
    p_last_name TEXT DEFAULT NULL,
    p_email TEXT DEFAULT NULL,
    p_mobile TEXT DEFAULT NULL,
    p_pan_number TEXT DEFAULT NULL,
    p_aadhaar_number TEXT DEFAULT NULL,
    p_department TEXT DEFAULT NULL,
    p_salary NUMERIC DEFAULT 0,
    p_date_of_joining DATE DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
AS $function$
DECLARE
    v_clean_email TEXT := LOWER(TRIM(p_email));
    v_clean_first TEXT := TRIM(p_first_name);
    v_clean_last TEXT := NULLIF(TRIM(p_last_name), '');
    v_clean_mobile TEXT := TRIM(p_mobile);
    v_aadhaar_last4 TEXT := NULL;
    v_new_id INTEGER;
BEGIN
    IF v_clean_email IS NULL OR v_clean_email = '' THEN
        RAISE EXCEPTION 'Email is required' USING ERRCODE = '23502';
    END IF;

    IF v_clean_first IS NULL OR v_clean_first = '' THEN
        RAISE EXCEPTION 'FirstName is required' USING ERRCODE = '23502';
    END IF;

    IF EXISTS (SELECT 1 FROM public."Employees" WHERE "Email" = v_clean_email) THEN
        RAISE EXCEPTION 'An employee with this email already exists' USING ERRCODE = '23505';
    END IF;

    IF p_aadhaar_number IS NOT NULL AND length(TRIM(p_aadhaar_number)) >= 4 THEN
        v_aadhaar_last4 := RIGHT(TRIM(p_aadhaar_number), 4);
    END IF;

    INSERT INTO public."Employees" (
        "FirstName",
        "LastName",
        "Email",
        "Mobile",
        "PanNumber",
        "AadhaarLast4",
        "Department",
        "Salary",
        "DateOfJoining",
        "IsActive",
        "CreatedAt"
    ) VALUES (
        v_clean_first,
        v_clean_last,
        v_clean_email,
        v_clean_mobile,
        NULLIF(TRIM(p_pan_number), ''),
        v_aadhaar_last4,
        TRIM(p_department),
        COALESCE(p_salary, 0),
        COALESCE(p_date_of_joining, CURRENT_DATE),
        TRUE,
        clock_timestamp()
    )
    RETURNING "Id" INTO v_new_id;

    RETURN public.sp_employee_get_by_id(v_new_id);
END;
$function$;


-- ==============================================================================
-- STORED PROCEDURE 4: sp_employee_update
-- Updates an existing employee with optimistic concurrency token verification
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.sp_employee_update(
    p_id INTEGER,
    p_first_name TEXT,
    p_last_name TEXT DEFAULT NULL,
    p_email TEXT DEFAULT NULL,
    p_mobile TEXT DEFAULT NULL,
    p_pan_number TEXT DEFAULT NULL,
    p_aadhaar_number TEXT DEFAULT NULL,
    p_department TEXT DEFAULT NULL,
    p_salary NUMERIC DEFAULT 0,
    p_date_of_joining DATE DEFAULT CURRENT_DATE,
    p_version BIGINT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
AS $function$
DECLARE
    v_clean_email TEXT := LOWER(TRIM(p_email));
    v_clean_first TEXT := TRIM(p_first_name);
    v_clean_last TEXT := NULLIF(TRIM(p_last_name), '');
    v_clean_mobile TEXT := TRIM(p_mobile);
    v_aadhaar_last4 TEXT := NULL;
    v_current_version BIGINT;
BEGIN
    -- Check employee existence and fetch current version
    SELECT e.xmin::text::bigint INTO v_current_version
    FROM public."Employees" e
    WHERE e."Id" = p_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Employee with ID % not found', p_id USING ERRCODE = 'P0002';
    END IF;

    -- Concurrency check if version is supplied
    IF p_version IS NOT NULL AND v_current_version <> p_version THEN
        RAISE EXCEPTION 'This record was modified by someone else. Reload and retry.' USING ERRCODE = '40001';
    END IF;

    -- Duplicate email check
    IF EXISTS (SELECT 1 FROM public."Employees" WHERE "Email" = v_clean_email AND "Id" <> p_id) THEN
        RAISE EXCEPTION 'Email % is already used by another employee', v_clean_email USING ERRCODE = '23505';
    END IF;

    IF p_aadhaar_number IS NOT NULL AND length(TRIM(p_aadhaar_number)) >= 4 THEN
        v_aadhaar_last4 := RIGHT(TRIM(p_aadhaar_number), 4);
    END IF;

    UPDATE public."Employees"
    SET
        "FirstName" = v_clean_first,
        "LastName" = v_clean_last,
        "Email" = v_clean_email,
        "Mobile" = v_clean_mobile,
        "PanNumber" = COALESCE(NULLIF(TRIM(p_pan_number), ''), "PanNumber"),
        "AadhaarLast4" = COALESCE(v_aadhaar_last4, "AadhaarLast4"),
        "Department" = TRIM(p_department),
        "Salary" = COALESCE(p_salary, "Salary"),
        "DateOfJoining" = COALESCE(p_date_of_joining, "DateOfJoining")
    WHERE "Id" = p_id;

    RETURN public.sp_employee_get_by_id(p_id);
END;
$function$;


-- ==============================================================================
-- STORED PROCEDURE 5: sp_employee_delete
-- Soft deletes an employee (sets IsActive = false)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.sp_employee_delete(
    p_id INTEGER
)
RETURNS boolean
LANGUAGE plpgsql
AS $function$
DECLARE
    v_rows_affected INTEGER;
BEGIN
    UPDATE public."Employees"
    SET "IsActive" = FALSE
    WHERE "Id" = p_id AND "IsActive" = TRUE;

    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    RETURN v_rows_affected > 0;
END;
$function$;
