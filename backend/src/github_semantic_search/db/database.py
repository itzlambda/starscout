from contextlib import contextmanager
from typing import Generator, Any
import logging
from psycopg2.pool import SimpleConnectionPool
from psycopg2.extensions import connection
from psycopg2.extras import DictCursor

from ..settings import settings
from .migrations import MigrationManager

logger = logging.getLogger(__name__)


class Database:
    def __init__(self) -> None:
        self._pool = SimpleConnectionPool(
            minconn=1,
            maxconn=10,
            dbname=settings.DB_NAME,
            user=settings.DB_USER,
            password=settings.DB_PASSWORD,
            host=settings.DB_HOST,
            port=settings.DB_PORT,
        )
        manager = MigrationManager(self._pool.getconn())
        manager.run_migrations()
        logger.info("Database connection pool initialized")

    @contextmanager
    def get_connection(self) -> Generator[connection, None, None]:
        conn = None
        try:
            conn = self._pool.getconn()
            yield conn
        except Exception as e:
            logger.error(f"Database connection error: {e}")
            raise
        finally:
            if conn:
                self._pool.putconn(conn)

    @contextmanager
    def get_cursor(self, commit: bool = False) -> Generator[DictCursor, None, None]:
        with self.get_connection() as conn:
            cursor = conn.cursor(cursor_factory=DictCursor)
            try:
                yield cursor
                if commit:
                    conn.commit()
            except Exception as e:
                conn.rollback()
                logger.error(f"Database operation error: {e}")
                raise
            finally:
                cursor.close()

    def execute_query(
        self, query: str, params: tuple[Any, ...] | None = None, commit: bool = True
    ) -> list[dict[str, Any]]:
        with self.get_cursor(commit=commit) as cursor:
            cursor.execute(query, params)
            if cursor.description:
                columns = [desc[0] for desc in cursor.description]
                return [dict(zip(columns, row)) for row in cursor.fetchall()]
            return []

    def execute_many(
        self, query: str, params_list: list[tuple[Any, ...]], commit: bool = True
    ) -> None:
        with self.get_cursor(commit=commit) as cursor:
            cursor.executemany(query, params_list)


db = Database()
