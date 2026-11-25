from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    watsonx_api_key: str = ""
    watsonx_project_id: str = ""
    watsonx_url: str = "https://us-south.ml.cloud.ibm.com"
    granite_model_id: str = "ibm/granite-13b-chat-v2"
    database_url: str = "sqlite:///./wattwise.db"
    cors_origins: str = "http://localhost:5173,http://localhost:4173"
    # Set this to protect the /orchestrate endpoints consumed by watsonx Orchestrate
    orchestrate_api_key: str = ""

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",")]

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
