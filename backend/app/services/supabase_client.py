from functools import lru_cache

from supabase import Client, create_client

from app.core.config import get_settings


@lru_cache
def get_supabase_client() -> Client:
    settings = get_settings()
    if not settings.supabase_url:
        raise RuntimeError(
            "Supabase is not configured. Set SUPABASE_URL in .env"
        )

    candidates = settings.supabase_api_key_candidates
    if not candidates:
        raise RuntimeError(
            "Supabase is not configured. Set one of SUPABASE_ROLE_KEY, SUPABASE_KEY, or SUPABASE_ANON_PUBLIC_KEY in .env"
        )

    attempted_vars: list[str] = []
    last_error: Exception | None = None
    for env_name, api_key in candidates:
        attempted_vars.append(env_name)
        try:
            return create_client(settings.supabase_url, api_key)
        except Exception as exc:
            last_error = exc

    raise RuntimeError(
        "Supabase client initialization failed for configured API key variables: "
        + ", ".join(attempted_vars)
        + f". Last error: {last_error}"
    )
