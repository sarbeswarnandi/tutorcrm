import os
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy.pool import NullPool

load_dotenv()

# Defaults to local SQLite for instant, zero-setup local execution
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_DB_PATH = os.path.join(BASE_DIR, "tutor.db").replace("\\", "/")
DEFAULT_SQLITE_URL = f"sqlite+aiosqlite:///{DEFAULT_DB_PATH}"

DATABASE_URL = os.getenv("DATABASE_URL", DEFAULT_SQLITE_URL).strip()

# Standardize PostgreSQL URLs for asyncpg (Render, Heroku, Supabase, Railway, Neon)
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

is_sqlite = DATABASE_URL.startswith("sqlite")
engine_kwargs = {"echo": False}

if is_sqlite:
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    connect_args = {
        "statement_cache_size": 0,
        "prepared_statement_name_func": lambda: "",
    }
    # asyncpg does not accept ?sslmode= in the connection string URL; parse and handle cleanly
    if "sslmode=" in DATABASE_URL or "ssl=" in DATABASE_URL:
        parsed = urlparse(DATABASE_URL)
        qparams = parse_qs(parsed.query)
        sslmode_val = qparams.pop("sslmode", [""])[0]
        ssl_val = qparams.pop("ssl", [""])[0]
        needs_ssl = sslmode_val in ("require", "verify-ca", "verify-full") or ssl_val in ("true", "1", "require")
        
        clean_query = urlencode(qparams, doseq=True)
        DATABASE_URL = urlunparse((
            parsed.scheme,
            parsed.netloc,
            parsed.path,
            parsed.params,
            clean_query,
            parsed.fragment
        ))
        if needs_ssl:
            connect_args["ssl"] = "require"

    engine_kwargs["connect_args"] = connect_args
    # Use NullPool for cloud PostgreSQL (PgBouncer and serverless friendly)
    engine_kwargs["poolclass"] = NullPool

engine = create_async_engine(DATABASE_URL, **engine_kwargs)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
