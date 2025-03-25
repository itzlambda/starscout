import logging
import sys
from datetime import datetime


# Custom formatter to mimic tracing-subscriber style
class TracingStyleFormatter(logging.Formatter):
    level_styles = {
        "DEBUG": "\033[34m",  # Blue
        "INFO": "\033[32m",  # Green
        "WARNING": "\033[33m",  # Yellow
        "ERROR": "\033[31m",  # Red
        "CRITICAL": "\033[31;1m",  # Bold Red
    }

    reset = "\033[0m"

    def format(self, record):
        # Get the appropriate color for the level
        level_color = self.level_styles.get(record.levelname, "")

        # Format timestamp similar to tracing-subscriber
        timestamp = datetime.fromtimestamp(record.created).strftime(
            "%Y-%m-%dT%H:%M:%S.%f"
        )[:-3]

        # Format level with color and padding similar to tracing
        colored_level = f"{level_color}{record.levelname.lower()}{self.reset}"

        # Include module and line number like tracing-subscriber
        source = f"{record.module}:{record.lineno}"

        # Build the final message
        return f"{timestamp} ({colored_level}) [{record.name}] {source}: {record.getMessage()}"


# Configure basic logger
console_handler = logging.StreamHandler(sys.stdout)
console_handler.setFormatter(TracingStyleFormatter())
