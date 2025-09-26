import httpx
from typing import Optional, Dict, Any, List

CLADO_API_BASE_URL = "https://search.clado.ai"

async def make_clado_request(
    api_key: str,
    method: str,
    endpoint: str,
    params: Optional[Dict] = None,
    json_data: Optional[Dict] = None,
) -> Dict[str, Any]:
    """
    Centralized function to make authenticated requests to the Clado API.
    """
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    url = f"{CLADO_API_BASE_URL}{endpoint}"

    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            res = await client.request(method, url, params=params, json=json_data, headers=headers)
            res.raise_for_status()
            
            if res.status_code == 204:
                return {"status": "success", "message": "Operation successful with no content."}
            
            return res.json()
        except httpx.HTTPStatusError as e:
            error_text = e.response.text
            raise Exception(f"Clado API Error: {e.response.status_code} - {error_text}")
        except httpx.RequestError as e:
            raise Exception(f"Could not connect to Clado API at {url}: {e}")