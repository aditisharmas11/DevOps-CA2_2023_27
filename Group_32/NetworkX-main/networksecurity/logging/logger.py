import logging
import sys

logging.basicConfig(
    stream=sys.stdout,
    format="[ %(asctime)s ] %(lineno)d %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
