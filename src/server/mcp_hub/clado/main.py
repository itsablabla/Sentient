import os
from typing import Dict, Any, Optional, List

from dotenv import load_dotenv
from fastmcp import FastMCP, Context
from fastmcp.utilities.logging import configure_logging, get_logger

from . import auth, utils, prompts

# --- Standardized Logging Setup ---
configure_logging(level="INFO")
logger = get_logger(__name__)

# Load environment
ENVIRONMENT = os.getenv('ENVIRONMENT', 'dev-local')
if ENVIRONMENT == 'dev-local':
    dotenv_path = os.path.join(os.path.dirname(__file__), '..', '..', '.env')
    if os.path.exists(dotenv_path):
        load_dotenv(dotenv_path=dotenv_path)

mcp = FastMCP(
    name="CladoServer",
    instructions="Provides tools to search for and enrich LinkedIn profiles using natural language queries via the Clado API.",
)

@mcp.resource("prompt://clado-agent-system")
def get_clado_system_prompt() -> str:
    return prompts.clado_agent_system_prompt

async def _execute_tool(ctx: Context, method: str, endpoint: str, params: Optional[Dict] = None, json_data: Optional[Dict] = None) -> Dict[str, Any]:
    """Helper to handle auth and execution for all tools."""
    try:
        auth.get_user_id_from_context(ctx) # Ensures a user context exists
        api_key = auth.get_clado_api_key()
        result = await utils.make_clado_request(api_key, method, endpoint, params, json_data)
        return {"status": "success", "result": result}
    except Exception as e:
        logger.error(f"Tool execution failed for endpoint '{endpoint}': {e}", exc_info=True)
        return {"status": "failure", "error": str(e)}

# --- Tool Definitions ---

# Search API
@mcp.tool()
async def search_people(ctx: Context, query: str, limit: int = 30, companies: Optional[List[str]] = None, schools: Optional[List[str]] = None, advanced_filtering: bool = True, search_id: Optional[str]] = None, offset: int = 0) -> Dict:
    """Searches LinkedIn profiles using a natural language query."""
    params = {k: v for k, v in locals().items() if k not in ['ctx'] and v is not None}
    return await _execute_tool(ctx, "GET", "/api/search", params=params)

# Deep Research
@mcp.tool()
async def initiate_deep_research(ctx: Context, query: str, limit: int = 30, hard_filter_company_urls: Optional[List[str]] = None) -> Dict:
    """Initiates an asynchronous, comprehensive search for profiles."""
    json_data = {k: v for k, v in locals().items() if k not in ['ctx'] and v is not None}
    return await _execute_tool(ctx, "POST", "/api/search/deep_research", json_data=json_data)

@mcp.tool()
async def get_deep_research_status(ctx: Context, job_id: str, page: Optional[int] = None, page_size: Optional[int] = None) -> Dict:
    """Checks the status of a deep research job and retrieves results when complete."""
    params = {k: v for k, v in locals().items() if k not in ['ctx', 'job_id'] and v is not None}
    return await _execute_tool(ctx, "GET", f"/api/search/deep_research/{job_id}", params=params)

@mcp.tool()
async def cancel_deep_research(ctx: Context, job_id: str) -> Dict:
    """Cancels a running deep research job."""
    return await _execute_tool(ctx, "POST", f"/api/search/deep_research/{job_id}/cancel")

@mcp.tool()
async def continue_deep_research(ctx: Context, job_id: str, additional_limit: int = 30) -> Dict:
    """Continues a completed deep research job to get more results."""
    json_data = {"additional_limit": additional_limit}
    return await _execute_tool(ctx, "POST", f"/api/search/deep_research/{job_id}/more", json_data=json_data)

# Enrichment API
@mcp.tool()
async def get_contact_information(ctx: Context, linkedin_url: Optional[str] = None, email: Optional[str] = None, phone: Optional[str] = None, email_enrichment: bool = False, phone_enrichment: bool = False) -> Dict:
    """Retrieves contact information (emails, phones) for a LinkedIn profile."""
    params = {k: v for k, v in locals().items() if k not in ['ctx'] and v is not None}
    return await _execute_tool(ctx, "GET", "/api/enrich/contacts", params=params)

@mcp.tool()
async def scrape_linkedin_profile(ctx: Context, linkedin_url: str) -> Dict:
    """Scrapes the most up-to-date, comprehensive data directly from a LinkedIn profile."""
    params = {"linkedin_url": linkedin_url}
    return await _execute_tool(ctx, "GET", "/api/enrich/scrape", params=params)

@mcp.tool()
async def get_linkedin_profile_from_db(ctx: Context, linkedin_url: str) -> Dict:
    """Retrieves a LinkedIn profile from Clado's database (faster but potentially less current)."""
    params = {"linkedin_url": linkedin_url}
    return await _execute_tool(ctx, "GET", "/api/enrich/linkedin", params=params)

@mcp.tool()
async def get_post_reactions(ctx: Context, url: str, page: int = 1, reaction_type: Optional[str] = None) -> Dict:
    """Gets detailed reaction data for a specific LinkedIn post."""
    params = {k: v for k, v in locals().items() if k not in ['ctx'] and v is not None}
    return await _execute_tool(ctx, "GET", "/api/enrich/post-reactions", params=params)

# Platform API
@mcp.tool()
async def get_credits(ctx: Context) -> Dict:
    """Checks the remaining credit balance for your API key."""
    return await _execute_tool(ctx, "GET", "/api/credits")

# --- Server Execution ---
if __name__ == "__main__":
    host = os.getenv("MCP_SERVER_HOST", "127.0.0.1")
    port = int(os.getenv("MCP_SERVER_PORT", 9029))
    
    print(f"Starting Clado MCP Server on http://{host}:{port}")
    mcp.run(transport="sse", host=host, port=port)