import os
from pathlib import Path

from dotenv import load_dotenv

ENV_PATH = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(ENV_PATH)


class Settings:
    database_url = os.environ["DATABASE_URL"]
    supabase_url = os.environ["SUPABASE_URL"]
    supabase_secret_key = os.getenv("SUPABASE_SECRET_KEY", "")
    supabase_publishable_key = os.getenv("SUPABASE_PUBLISHABLE_KEY", "")


settings = Settings()
