import httpx
from bs4 import BeautifulSoup
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from typing import Dict, Optional, Any
from app.core.config import settings
from app.core.logging import logger

class LegacySessionError(Exception):
    """Exception raised when session login fails or cookie is invalid."""
    pass

class UrjaClient:
    def __init__(self):
        self.client = httpx.AsyncClient(
            base_url=settings.PORTAL_URL,
            timeout=settings.TIMEOUT_SECONDS,
            follow_redirects=False # We handle redirects manually to manage session cookies and auto re-login
        )
        self.session_cookies: Dict[str, str] = {}
        
    async def close(self):
        await self.client.aclose()
        
    async def _get_csrf_token(self) -> str:
        """Fetches the login page and parses the CSRF token."""
        logger.info("Fetching login page to extract CSRF token")
        try:
            response = await self.client.get("/legacy/login")
            if response.status_code != 200:
                raise LegacySessionError(f"Failed to fetch login page, status: {response.status_code}")
                
            soup = BeautifulSoup(response.text, "html.parser")
            csrf_input = soup.find("input", {"name": "csrf_token"})
            if not csrf_input or not csrf_input.get("value"):
                raise LegacySessionError("CSRF token not found in login page HTML")
                
            token = csrf_input["value"]
            logger.info("Successfully extracted CSRF token", extra={"extra_data": {"csrf_token": token}})
            return token
        except Exception as e:
            logger.error(f"Error during CSRF token extraction: {str(e)}", exc_info=True)
            raise

    async def login(self) -> None:
        """Authenticates with the legacy portal using CSRF token."""
        logger.info("Attempting login to legacy portal", extra={"extra_data": {"url": settings.PORTAL_URL, "user": settings.PORTAL_USERNAME}})
        try:
            csrf_token = await self._get_csrf_token()
            
            payload = {
                "username": settings.PORTAL_USERNAME,
                "password": settings.PORTAL_PASSWORD,
                "csrf_token": csrf_token
            }
            
            response = await self.client.post("/legacy/login", data=payload)
            
            # Check for redirect (303/302) pointing to /legacy/meters
            if response.status_code in [302, 303]:
                # Extract session cookie
                cookies = response.cookies
                if "urja_session_id" in cookies:
                    self.session_cookies = {"urja_session_id": cookies["urja_session_id"]}
                    logger.info("Successfully authenticated. Session cookie stored.", extra={"extra_data": {"cookie_name": "urja_session_id"}})
                    return
                else:
                    raise LegacySessionError("Login responded with redirect but 'urja_session_id' cookie was missing.")
            elif response.status_code == 401:
                raise LegacySessionError("Invalid credentials provided for legacy portal login.")
            else:
                raise LegacySessionError(f"Login failed with status {response.status_code}. Response: {response.text[:200]}")
        except Exception as e:
            logger.error(f"Error during legacy login: {str(e)}", exc_info=True)
            raise

    async def _ensure_logged_in(self) -> None:
        """Ensure we have a session cookie. If not, log in."""
        if not self.session_cookies or "urja_session_id" not in self.session_cookies:
            logger.info("No active session found, initiating login")
            await self.login()

    @retry(
        stop=stop_after_attempt(settings.RETRY_ATTEMPTS),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((httpx.RequestError, LegacySessionError)),
        reraise=True
    )
    async def request_with_auth(self, method: str, url: str, **kwargs) -> httpx.Response:
        """Sends authenticated request, auto handles session expiry and re-login, and retries."""
        await self._ensure_logged_in()
        
        # Inject cookies
        cookies = kwargs.pop("cookies", {})
        cookies.update(self.session_cookies)
        
        logger.info(f"Sending authenticated request to {url}", extra={"extra_data": {"method": method, "url": url}})
        try:
            response = await self.client.request(method, url, cookies=cookies, **kwargs)
            
            # Legacy portal redirects to /legacy/login on expired/invalid sessions
            if response.status_code in [302, 303] and "/legacy/login" in response.headers.get("Location", ""):
                logger.warning("Session expired or invalid. Legacy portal redirected to login. Re-authenticating...")
                # Reset cookies and log in again
                self.session_cookies = {}
                await self.login()
                
                # Retry request with new session cookies
                cookies.update(self.session_cookies)
                response = await self.client.request(method, url, cookies=cookies, **kwargs)
                if response.status_code in [302, 303] and "/legacy/login" in response.headers.get("Location", ""):
                    raise LegacySessionError("Re-authentication completed but request was still rejected/redirected.")
            
            if response.status_code == 401:
                logger.warning("Received 401 Unauthorized. Retrying after login...")
                self.session_cookies = {}
                await self.login()
                cookies.update(self.session_cookies)
                response = await self.client.request(method, url, cookies=cookies, **kwargs)
                if response.status_code == 401:
                    raise LegacySessionError("Re-authentication completed but request returned 401 again.")
            
            # Check other bad statuses
            if response.status_code >= 500:
                logger.error(f"Legacy portal server error: {response.status_code}")
                response.raise_for_status()
                
            return response
            
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP Status Error scraping legacy portal: {str(e)}", exc_info=True)
            raise
        except httpx.RequestError as e:
            logger.error(f"Network error communicating with legacy portal: {str(e)}", exc_info=True)
            raise
        except Exception as e:
            logger.error(f"Unexpected error in scraping request: {str(e)}", exc_info=True)
            raise

    async def get_meters_html(self) -> str:
        response = await self.request_with_auth("GET", "/legacy/meters")
        return response.text

    async def get_meter_detail_html(self, meter_id: str) -> str:
        response = await self.request_with_auth("GET", f"/legacy/meters/{meter_id}")
        return response.text

    async def get_consumption_html(self, meter_id: str) -> str:
        response = await self.request_with_auth("GET", f"/legacy/meters/{meter_id}/consumption")
        return response.text

    async def get_hierarchy_html(self) -> str:
        response = await self.request_with_auth("GET", "/legacy/hierarchy")
        return response.text
