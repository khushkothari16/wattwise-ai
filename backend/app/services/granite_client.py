"""
IBM Granite client via watsonx.ai REST API.
"""
import httpx
import json
from datetime import datetime
from typing import List, Optional
from app.core.config import settings


IAM_TOKEN_URL = "https://iam.cloud.ibm.com/identity/token"
_cached_token: Optional[str] = None
_token_expiry: float = 0.0


def _get_iam_token() -> str:
    global _cached_token, _token_expiry
    import time
    if _cached_token and time.time() < _token_expiry - 60:
        return _cached_token
    resp = httpx.post(
        IAM_TOKEN_URL,
        data={
            "grant_type": "urn:ibm:params:oauth:grant-type:apikey",
            "apikey": settings.watsonx_api_key,
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()
    _cached_token = data["access_token"]
    _token_expiry = time.time() + data.get("expires_in", 3600)
    return _cached_token


def _build_household_context(context: dict) -> str:
    return (
        f"Household: {context.get('household_name', 'My Home')}\n"
        f"Total active appliances: {context.get('active_appliances', 0)}\n"
        f"This month's consumption so far: {context.get('month_kwh', 0):.2f} kWh\n"
        f"This month's estimated bill: {context.get('currency', 'USD')} {context.get('month_cost', 0):.2f}\n"
        f"Tariff rate: {context.get('tariff_rate', 0.12)} per kWh\n"
        f"Top consuming appliances this month: {json.dumps(context.get('top_consumers', []))}\n"
        f"Recent anomalies: {json.dumps(context.get('anomalies', []))}\n"
    )


def call_granite(
    messages: List[dict],
    household_context: Optional[dict] = None,
    max_tokens: int = 800,
    temperature: float = 0.7,
) -> str:
    """Call IBM Granite via watsonx.ai. Returns assistant reply string."""
    if not settings.watsonx_api_key or settings.watsonx_api_key == "your_ibm_cloud_api_key_here":
        return _mock_response(messages)

    system_prompt = (
        "You are WattWise AI, an expert household energy advisor. "
        "Help users understand and reduce their electricity consumption. "
        "Be concise, friendly, and data-driven. Use the household context provided.\n\n"
    )
    if household_context:
        system_prompt += "HOUSEHOLD CONTEXT:\n" + _build_household_context(household_context)

    token = _get_iam_token()
    url = f"{settings.watsonx_url}/ml/v1/text/chat?version=2024-05-31"

    payload = {
        "model_id": settings.granite_model_id,
        "messages": [{"role": "system", "content": system_prompt}] + messages,
        "parameters": {
            "max_new_tokens": max_tokens,
            "temperature": temperature,
            "decoding_method": "greedy",
        },
        "project_id": settings.watsonx_project_id,
    }

    resp = httpx.post(
        url,
        json=payload,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        timeout=60,
    )
    resp.raise_for_status()
    data = resp.json()
    return data["choices"][0]["message"]["content"]


def _mock_response(messages: List[dict]) -> str:
    """Fallback mock when API key is not configured — useful for local dev."""
    last = messages[-1]["content"].lower() if messages else ""
    if "recommend" in last or "tip" in last or "save" in last:
        return (
            "Here are some energy-saving tips for your household:\n\n"
            "1. **Switch to LED lighting** — LEDs use up to 80% less energy than incandescent bulbs.\n"
            "2. **Unplug idle devices** — Standby power can account for 10% of your bill.\n"
            "3. **Set AC to 24°C** — Each degree lower increases consumption by ~6%.\n"
            "4. **Run washing machines at off-peak hours** — Typically 10 PM–6 AM.\n"
            "5. **Use a smart power strip** — Automatically cuts power to idle electronics.\n\n"
            "_Note: Connect your IBM watsonx.ai API key for personalized AI recommendations._"
        )
    return (
        "I'm WattWise AI, your household energy advisor! "
        "Ask me anything about your electricity usage, appliances, or how to reduce your bill. "
        "_(Demo mode — connect IBM watsonx.ai for full AI capabilities.)_"
    )


def generate_recommendations(household_context: dict) -> str:
    prompt = (
        "Based on this household's energy data, provide 5 specific, actionable electricity-saving "
        "recommendations. For each, include: title, description, and estimated kWh saving per month. "
        "Format as a numbered list."
    )
    return call_granite(
        [{"role": "user", "content": prompt}],
        household_context=household_context,
        max_tokens=600,
        temperature=0.5,
    )


def generate_monthly_report(household_context: dict, year: int, month: int) -> str:
    month_name = datetime(year, month, 1).strftime("%B %Y")
    prompt = (
        f"Generate a concise monthly energy report for {month_name}. "
        f"Include: total consumption summary, top energy consumers, notable patterns, "
        f"anomalies detected, and 3 actionable recommendations for next month. "
        f"Be specific with the data provided. Keep it under 400 words."
    )
    return call_granite(
        [{"role": "user", "content": prompt}],
        household_context=household_context,
        max_tokens=600,
        temperature=0.4,
    )
