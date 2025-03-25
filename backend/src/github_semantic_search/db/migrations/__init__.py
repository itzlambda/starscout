import os
from psycopg2.extensions import connection
import logging
from typing import List
import re
from github_semantic_search.settings import settings

logger = logging.getLogger(__name__)


class MigrationManager:
    def __init__(self, conn: connection):
        self.conn = conn
        self._ensure_migration_table()

    def get_applied_migrations(self) -> List[int]:
        with self.conn.cursor() as cur:
            cur.execute("SELECT version FROM schema_migrations ORDER BY version")
            return [row[0] for row in cur.fetchall()]

    def _ensure_migration_table(self):
        with self.conn.cursor() as cur:
            cur.execute(
                """CREATE TABLE IF NOT EXISTS schema_migrations (
                    id SERIAL PRIMARY KEY,
                    version INTEGER UNIQUE NOT NULL,
                    name TEXT NOT NULL,
                    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
                """
            )
            self.conn.commit()

    def _get_migration_files(self) -> List[tuple]:
        migrations_dir = os.path.dirname(os.path.abspath(__file__))
        migration_files = []

        for filename in os.listdir(migrations_dir):
            if filename.endswith(".sql"):
                match = re.match(r"(\d+)_(.*).sql", filename)
                if match:
                    version = int(match.group(1))
                    name = match.group(2)
                    migration_files.append((version, name, filename))

        return sorted(migration_files)

    def run_migrations(self):
        applied_versions = set(self.get_applied_migrations())
        migration_files = self._get_migration_files()

        for version, name, filename in migration_files:
            if version not in applied_versions:
                self._apply_migration(version, name, filename)

    def _apply_migration(self, version: int, name: str, filename: str):
        logger.info(f"Applying migration {version}: {name}")

        migration_path = os.path.join(os.path.dirname(__file__), filename)
        try:
            with open(migration_path, "r") as f:
                migration_sql = f.read()

            migration_sql = migration_sql.replace(
                "$$$", str(settings.AI_EMBEDDING_VECTOR_DIMENSION)
            )

            # Ensure we're in a fresh transaction
            self.conn.rollback()

            with self.conn.cursor() as cur:
                # Apply the migration
                cur.execute(migration_sql)

                # Record the migration
                cur.execute(
                    "INSERT INTO schema_migrations (version, name) VALUES (%s, %s)",
                    (version, name),
                )

                self.conn.commit()
                logger.info(f"Successfully applied migration {version}")

        except Exception as e:
            self.conn.rollback()
            logger.error(f"Error applying migration {version}: {e}")
            raise
