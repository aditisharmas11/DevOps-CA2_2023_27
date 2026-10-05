import os
import shutil

from networksecurity.logging.logger import logging

class S3Sync:
    def sync_folder_to_s3(self, folder, aws_bucket_url):
        if shutil.which("aws") is None:
            logging.warning("AWS CLI is not installed. Skipping S3 sync to %s", aws_bucket_url)
            return

        command = f"aws s3 sync {folder} {aws_bucket_url}"
        exit_code = os.system(command)
        if exit_code != 0:
            logging.warning("aws s3 sync returned non-zero exit code %s for folder %s", exit_code, folder)

    def sync_folder_from_s3(self, folder, aws_bucket_url):
        if shutil.which("aws") is None:
            logging.warning("AWS CLI is not installed. Skipping S3 sync from %s", aws_bucket_url)
            return

        command = f"aws s3 sync {aws_bucket_url} {folder}"
        exit_code = os.system(command)
        if exit_code != 0:
            logging.warning("aws s3 sync returned non-zero exit code %s for folder %s", exit_code, folder)
